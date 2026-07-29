import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("poll pages publish private-by-design social preview metadata", async () => {
  const [html, worker, shareHelper] = await Promise.all([
    readFile(new URL("../worker/html.ts", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/poll-share.ts", import.meta.url), "utf8"),
  ]);

  assert.match(html, /summary_large_image/);
  assert.match(html, /og:image:width", "1200"/);
  assert.match(html, /og:image:height", "630"/);
  assert.match(html, /noindex, nofollow/);
  assert.match(html, /formatPollOptionSummary/);
  assert.match(html, /poll\.title/);
  assert.match(html, /poll\.organizer/);
  assert.doesNotMatch(html, /poll\.(location|note|participants|myResponse)/);

  assert.match(worker, /\/opengraph-image/);
  assert.match(worker, /\/og\.png/);
  assert.match(worker, /s-maxage=3600/);
  assert.match(shareHelper, /optionStarts/);
  assert.doesNotMatch(
    shareHelper,
    /\b(location|note|email|responses|votes|voter)\b/i,
  );
});
