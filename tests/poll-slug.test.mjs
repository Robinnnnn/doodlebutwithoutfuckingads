import assert from "node:assert/strict";
import test from "node:test";
import {
  createPollSlug,
  isPollSlug,
  POLL_SLUG_WORDS,
} from "../lib/poll-slug.ts";

test("builds readable three-word poll links", () => {
  const values = [0, 1, 2];
  const slug = createPollSlug(() => values.shift());

  assert.equal(slug, "acorn-amber-apple");
  assert.equal(isPollSlug(slug), true);
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
