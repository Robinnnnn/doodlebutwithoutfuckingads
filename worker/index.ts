import { enforceRateLimit, type RateLimitBinding } from "../lib/rate-limit";
import { handleCreatePoll } from "./create-poll";
import { renderAppHtml } from "./html";
import { getPollData, handleReadPoll } from "./read-poll";
import { handleSaveResponse } from "./save-response";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  POLL_CREATE_RATE_LIMITER?: RateLimitBinding;
  POLL_READ_RATE_LIMITER?: RateLimitBinding;
  POLL_RESPONSE_RATE_LIMITER?: RateLimitBinding;
}

function pollIdFromPath(pathname: string, suffix = "") {
  const pattern = suffix
    ? new RegExp(`^/api/polls/([^/]+)/${suffix}$`)
    : /^\/(?:api\/polls|p)\/([^/]+)\/?$/;
  const match = pathname.match(pattern);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]).slice(0, 100);
  } catch {
    return null;
  }
}

function pagePollId(pathname: string) {
  const match = pathname.match(/^\/p\/([^/]+)\/?$/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).slice(0, 100);
  } catch {
    return null;
  }
}

async function rateLimitApiRequest(request: Request, env: Env, pathname: string) {
  const method = request.method.toUpperCase();
  const rule =
    method === "POST" && pathname === "/api/polls"
      ? {
          binding: env.POLL_CREATE_RATE_LIMITER,
          scope: "poll-create",
        }
      : method === "GET" && /^\/api\/polls\/[^/]+\/?$/.test(pathname)
        ? {
            binding: env.POLL_READ_RATE_LIMITER,
            scope: "poll-read",
          }
        : method === "POST" &&
            /^\/api\/polls\/[^/]+\/responses$/.test(pathname)
          ? {
              binding: env.POLL_RESPONSE_RATE_LIMITER,
              scope: "poll-response",
            }
          : null;

  if (!rule) return null;
  return enforceRateLimit({ ...rule, request });
}

async function servePollPage(
  request: Request,
  env: Env,
  pollId: string,
) {
  try {
    const poll = await getPollData(env.DB, pollId);
    return renderAppHtml({
      request,
      env,
      poll,
      pollId,
      missing: !poll,
    });
  } catch {
    return renderAppHtml({
      request,
      env,
      pollId,
      missing: true,
    });
  }
}

const worker: ExportedHandler<Env> = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (url.hostname === "www.doodlebutwithoutfuckingads.com") {
      url.hostname = "doodlebutwithoutfuckingads.com";
      return Response.redirect(url, 308);
    }

    const rateLimited = await rateLimitApiRequest(request, env, pathname);
    if (rateLimited) return rateLimited;

    if (request.method === "POST" && pathname === "/api/polls") {
      return handleCreatePoll(request, env.DB);
    }

    if (request.method === "GET") {
      const apiPollId = pollIdFromPath(pathname);
      if (apiPollId && pathname.startsWith("/api/")) {
        return handleReadPoll(request, env.DB, apiPollId);
      }
    }

    if (request.method === "POST") {
      const responsePollId = pollIdFromPath(pathname, "responses");
      if (responsePollId) {
        return handleSaveResponse(request, env.DB, responsePollId);
      }
    }

    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Not found." }, { status: 404 });
    }

    if (
      (request.method === "GET" || request.method === "HEAD") &&
      /^\/p\/[^/]+\/opengraph-image$/.test(pathname)
    ) {
      const image = await env.ASSETS.fetch(
        new Request(new URL("/og.png", request.url), request),
      );
      const headers = new Headers(image.headers);
      headers.set(
        "cache-control",
        "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      );
      return new Response(image.body, { status: image.status, headers });
    }

    if (request.method === "GET" && (pathname === "/" || pathname === "")) {
      const legacyPollId = url.searchParams.get("poll")?.slice(0, 100);
      if (legacyPollId) return servePollPage(request, env, legacyPollId);
      return renderAppHtml({ request, env });
    }

    if (
      request.method === "GET" &&
      (pathname === "/sample" || pathname === "/sample/")
    ) {
      return servePollPage(request, env, "sample");
    }

    if (request.method === "GET") {
      const pollId = pagePollId(pathname);
      if (pollId) return servePollPage(request, env, pollId);
    }

    return env.ASSETS.fetch(request);
  },
};

export default worker;
