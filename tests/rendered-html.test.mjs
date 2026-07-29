import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import test from "node:test";

test("ships the scheduler as HTML, CSS, and vanilla JavaScript", async () => {
  const [app, html, styles, packageJson, worker, wrangler] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
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
  assert.match(app, /Create Poll/);
  assert.match(app, /iconArrowUpRight/);
  assert.doesNotMatch(app, /[↗→←]/);
  assert.match(app, /class="text-link desktop-sample-link"/);
  assert.match(app, /bullshit 😇[\s\S]*class="mobile-sample-link"/);
  assert.match(app, /Copy poll link \$\{iconCopy\}/);
  assert.match(app, /Event name <span class="required-marker">\*<\/span>/);
  assert.match(app, /Your name <span class="required-marker">\*<\/span>/);
  assert.match(app, /No emails\. No accounts\./);
  assert.match(html, /<!--APP_META-->/);
  assert.match(html, /<!--APP_BOOTSTRAP-->/);
  assert.match(html, /type="module" src="\/src\/app\.js"/);
  assert.match(styles, /\.option-card\.selected/);
  assert.match(styles, /\.desktop-sample-link\s*\{\s*display: none;/);
  assert.match(styles, /\.mobile-sample-link\s*\{\s*display: inline;/);
  assert.match(styles, /\.create-nav\s*\{\s*justify-content: center;/);
  assert.match(styles, /\.poll-nav\s*\{\s*height: auto;[\s\S]*flex-direction: column;/);
  assert.match(packageJson, /"name": "doodlebutwithoutfuckingads"/);
  assert.doesNotMatch(packageJson, /"next"|"react"|"react-dom"|"vinext"/);
  assert.match(worker, /www\.doodlebutwithoutfuckingads\.com/);
  assert.match(worker, /Response\.redirect\(url, 308\)/);
  assert.match(worker, /rateLimitApiRequest/);
  assert.match(worker, /POLL_CREATE_RATE_LIMITER/);
  assert.match(worker, /POLL_READ_RATE_LIMITER/);
  assert.match(worker, /POLL_RESPONSE_RATE_LIMITER/);
  assert.match(worker, /servePollPage/);
  assert.match(wrangler, /"run_worker_first": true/);

  const combined = `${app}\n${html}\n${styles}\n${packageJson}\n${worker}`;
  assert.doesNotMatch(
    combined,
    /codex-preview|react-loading-skeleton|Your site is taking shape/i,
  );
});

test("keeps the production frontend intentionally tiny", async () => {
  const assetDirectory = new URL("../dist/client/assets/", import.meta.url);
  const files = await readdir(assetDirectory);
  const scripts = files.filter((file) => file.endsWith(".js"));
  const styles = files.filter((file) => file.endsWith(".css"));

  assert.equal(scripts.length, 1);
  assert.equal(styles.length, 1);

  const scriptBytes = (await stat(new URL(scripts[0], assetDirectory))).size;
  const styleBytes = (await stat(new URL(styles[0], assetDirectory))).size;
  assert.ok(scriptBytes < 40_000, `frontend script is ${scriptBytes} bytes`);
  assert.ok(styleBytes < 35_000, `stylesheet is ${styleBytes} bytes`);
});
