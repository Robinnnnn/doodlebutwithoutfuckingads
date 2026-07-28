import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("poll pages publish private-by-design social preview metadata", async () => {
  const [page, image, shareHelper] = await Promise.all([
    readFile(new URL("../app/p/[id]/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/p/[id]/opengraph-image.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/poll-share.ts", import.meta.url), "utf8"),
  ]);

  assert.match(page, /export async function generateMetadata/);
  assert.match(page, /summary_large_image/);
  assert.match(page, /width: 1200/);
  assert.match(page, /height: 630/);
  assert.match(page, /robots: poll \? undefined : \{ index: false, follow: false \}/);

  assert.match(image, /ImageResponse/);
  assert.match(image, /doodle/);
  assert.match(image, /butwithout/);
  assert.match(image, /fucking/);
  assert.match(image, />ads<\/span>/);
  assert.match(image, />\.<\/span>/);
  assert.match(image, />com<\/span>/);
  assert.match(image, /Open the poll/);
  assert.match(image, /s-maxage=3600/);

  assert.match(
    shareHelper,
    /SELECT title, organizer, timezone FROM polls WHERE id = \?/,
  );
  assert.match(shareHelper, /SELECT starts_at/);
  assert.doesNotMatch(
    shareHelper,
    /\b(location|note|email|responses|votes|voter)\b/i,
  );
});
