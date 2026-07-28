import assert from "node:assert/strict";
import test from "node:test";
import {
  createRateLimitKey,
  enforceRateLimit,
} from "../lib/rate-limit.ts";

const requestFrom = (ip, extraHeaders = {}) =>
  new Request("https://example.com/api/polls", {
    headers: {
      ...(ip ? { "cf-connecting-ip": ip } : {}),
      ...extraHeaders,
    },
  });

test("builds a stable, scoped key without retaining the client IP", async () => {
  const request = requestFrom("203.0.113.9");
  const createKey = await createRateLimitKey(request, "poll-create");
  const secondCreateKey = await createRateLimitKey(request, "poll-create");
  const readKey = await createRateLimitKey(request, "poll-read");

  assert.equal(createKey, secondCreateKey);
  assert.match(createKey, /^poll-create:[a-f0-9]{64}$/);
  assert.doesNotMatch(createKey, /203\.0\.113\.9/);
  assert.notEqual(createKey, readKey);
});

test("ignores spoofable forwarded headers when Cloudflare's header is absent", async () => {
  const request = requestFrom(null, {
    "x-forwarded-for": "203.0.113.9",
    "x-real-ip": "203.0.113.9",
  });

  assert.equal(await createRateLimitKey(request, "poll-create"), null);
});

test("allows local requests when the Cloudflare binding or client key is absent", async () => {
  let calls = 0;
  const binding = {
    async limit() {
      calls += 1;
      return { success: false };
    },
  };

  assert.equal(
    await enforceRateLimit({
      request: requestFrom("203.0.113.9"),
      scope: "poll-create",
    }),
    null,
  );
  assert.equal(
    await enforceRateLimit({
      binding,
      request: requestFrom(null),
      scope: "poll-create",
    }),
    null,
  );
  assert.equal(calls, 0);
});

test("returns a clear 429 response with retry guidance", async () => {
  const binding = {
    async limit() {
      return { success: false };
    },
  };

  const response = await enforceRateLimit({
    binding,
    request: requestFrom("203.0.113.9"),
    scope: "poll-response",
  });

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("Retry-After"), "60");
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    error: "Too many requests. Please wait a minute and try again.",
    retryAfter: 60,
  });
});

test("fails open when the Cloudflare limiter is unavailable", async () => {
  const warning = console.warn;
  console.warn = () => {};

  try {
    const response = await enforceRateLimit({
      binding: {
        async limit() {
          throw new Error("binding unavailable");
        },
      },
      request: requestFrom("203.0.113.9"),
      scope: "poll-read",
    });

    assert.equal(response, null);
  } finally {
    console.warn = warning;
  }
});
