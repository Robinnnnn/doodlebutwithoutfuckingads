import assert from "node:assert/strict";
import test from "node:test";
import {
  createPollSlug,
  isPollSlug,
  POLL_SLUG_WORDS,
} from "../lib/poll-slug.ts";

test("builds readable three-word poll links", () => {
  const values = [0, 1, 2];
  let requestedSecretBytes;
  const slug = createPollSlug({
    randomIndex: () => values.shift(),
    randomBytes: (length) => {
      requestedSecretBytes = length;
      return Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7]);
    },
  });

  assert.equal(requestedSecretBytes, 8);
  assert.equal(slug, "acorn-amber-apple-AAECAwQFBgc");
  assert.equal(isPollSlug(slug), true);
});

test("accepts existing three-word links without weakening new suffix validation", () => {
  assert.equal(isPollSlug("acorn-amber-apple"), true);
  assert.equal(isPollSlug("acorn-amber-apple-AAECAwQFBgc"), true);

  assert.equal(isPollSlug("acorn-amber"), false);
  assert.equal(isPollSlug("acorn-amber-apple-too-short"), false);
  assert.equal(isPollSlug("acorn-amber-apple-AAAAAAAAAA!"), false);
});

test("requires exactly 64 random bits for the unguessable suffix", () => {
  const values = [0, 1, 2];

  assert.throws(
    () =>
      createPollSlug({
        randomIndex: () => values.shift(),
        randomBytes: () => new Uint8Array(7),
      }),
    /must provide 8 bytes/,
  );
});

test("keeps a large, clean dictionary-word address space", () => {
  assert.ok(POLL_SLUG_WORDS.length >= 200);
  assert.equal(new Set(POLL_SLUG_WORDS).size, POLL_SLUG_WORDS.length);
  assert.ok(POLL_SLUG_WORDS.every((word) => /^[a-z]+$/.test(word)));

  const addressSpace =
    POLL_SLUG_WORDS.length *
    (POLL_SLUG_WORDS.length - 1) *
    (POLL_SLUG_WORDS.length - 2);
  assert.ok(addressSpace > 8_000_000);
});
