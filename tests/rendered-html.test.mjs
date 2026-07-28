import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships doodlebutwithoutfuckingads instead of the starter preview", async () => {
  const [app, layout, styles, packageJson] = await Promise.all([
    readFile(new URL("../app/DoodleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(app, /Find a time\./);
  assert.match(app, /Skip the circus\./);
  assert.match(app, /No sign-up/);
  assert.match(app, /Create & get the link/);
  assert.match(app, /No email gate\. No account\./);
  assert.match(
    layout,
    /doodlebutwithoutfuckingads — find a time, skip the circus/,
  );
  assert.match(layout, /\/og\.png/);
  assert.match(styles, /\.option-card\.selected/);
  assert.match(packageJson, /"name": "doodlebutwithoutfuckingads"/);

  const combined = `${app}\n${layout}\n${styles}\n${packageJson}`;
  assert.doesNotMatch(
    combined,
    /codex-preview|react-loading-skeleton|Your site is taking shape/i,
  );
});
