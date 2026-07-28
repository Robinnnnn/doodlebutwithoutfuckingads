import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("ships doodlebutwithoutfuckingads instead of the starter preview", async () => {
  const [app, layout, styles, packageJson, worker, wrangler] = await Promise.all([
    readFile(new URL("../app/DoodleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  ]);

  assert.match(app, /Find a time\./);
  assert.match(app, /Skip the circus\./);
  assert.match(
    app,
    /<b>doodle<\/b><b>butwithout<\/b><strong>fucking<\/strong><span>ads<\/span><i>\.<\/i><em>com<\/em>/,
  );
  assert.doesNotMatch(app, /New poll/);
  assert.match(app, /Create Poll/);
  assert.match(app, /function IconArrowUpRight/);
  assert.match(app, /<IconArrowUpRight \/>/);
  assert.doesNotMatch(app, /[↗→←]/);
  assert.match(app, /className="text-link desktop-sample-link"/);
  assert.match(app, /bullshit 😇\{" "\}[\s\S]*className="mobile-sample-link"/);
  assert.match(app, /Copy poll link\s*<IconCopy \/>/);
  assert.doesNotMatch(app, /landing-footer/);
  assert.match(app, /Event name <span className="required-marker">\*<\/span>/);
  assert.match(app, /Your name <span className="required-marker">\*<\/span>/);
  assert.doesNotMatch(app, /className="optional"/);
  assert.match(app, /No emails\. No\s+accounts\./);
  assert.match(
    layout,
    /doodlebutwithoutfuckingads — find a time, skip the circus/,
  );
  assert.match(layout, /\/og\.png/);
  assert.match(styles, /\.option-card\.selected/);
  assert.match(styles, /\.desktop-sample-link\s*\{\s*display: none;/);
  assert.match(styles, /\.mobile-sample-link\s*\{\s*display: inline;/);
  assert.match(styles, /\.create-nav\s*\{\s*justify-content: center;/);
  assert.match(styles, /\.poll-nav\s*\{\s*height: auto;[\s\S]*flex-direction: column;/);
  assert.match(packageJson, /"name": "doodlebutwithoutfuckingads"/);
  assert.match(worker, /www\.doodlebutwithoutfuckingads\.com/);
  assert.match(worker, /Response\.redirect\(url, 308\)/);
  assert.match(worker, /rateLimitApiRequest/);
  assert.match(worker, /pathname === "\/api\/polls"/);
  assert.match(worker, /POLL_CREATE_RATE_LIMITER/);
  assert.match(worker, /POLL_READ_RATE_LIMITER/);
  assert.match(worker, /POLL_RESPONSE_RATE_LIMITER/);
  assert.match(wrangler, /"pattern": "doodlebutwithoutfuckingads\.com"/);
  assert.match(wrangler, /"pattern": "www\.doodlebutwithoutfuckingads\.com"/);

  const combined = `${app}\n${layout}\n${styles}\n${packageJson}\n${worker}\n${wrangler}`;
  assert.doesNotMatch(
    combined,
    /codex-preview|react-loading-skeleton|Your site is taking shape/i,
  );
});
