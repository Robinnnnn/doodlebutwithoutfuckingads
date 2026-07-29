import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("persists three-state availability without breaking legacy yes votes", async () => {
  const [app, responseHandler, pollHandler, schema, migration] =
    await Promise.all([
      readFile(new URL("../src/app.js", import.meta.url), "utf8"),
      readFile(new URL("../worker/save-response.ts", import.meta.url), "utf8"),
      readFile(new URL("../worker/read-poll.ts", import.meta.url), "utf8"),
      readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
      readFile(
        new URL("../drizzle/0002_wonderful_hellfire_club.sql", import.meta.url),
        "utf8",
      ),
    ]);

  assert.match(app, /current === "yes"/);
  assert.match(
    app,
    /pollState\.response\.availability\[optionId\] = "if-needed"/,
  );
  assert.match(app, /delete pollState\.response\.availability\[optionId\]/);
  assert.match(responseHandler, /body\.optionIds/);
  assert.match(responseHandler, /status: "yes"/);
  assert.match(
    responseHandler,
    /INSERT INTO votes \(response_id, option_id, status\)/,
  );
  assert.match(pollHandler, /v\.status/);
  assert.match(schema, /status: text\("status"\)\.notNull\(\)\.default\("yes"\)/);
  assert.match(migration, /ADD `status` text DEFAULT 'yes' NOT NULL/);
});

test("offers compact list and grid results only after submission", async () => {
  const [app, styles, pollHandler, sample] = await Promise.all([
    readFile(new URL("../src/app.js", import.meta.url), "utf8"),
    readFile(new URL("../src/styles.css", import.meta.url), "utf8"),
    readFile(new URL("../worker/read-poll.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/sample-poll.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /response\.submitted && !pollState\.editing/);
  assert.match(app, /class="results-view-toggle"/);
  assert.match(app, /pollState\.resultsView === "grid"/);
  assert.match(app, /class="availability-grid"/);
  assert.match(app, /Everyone’s availability/);
  assert.match(app, /yes · \$\{ifNeededVoters\.length\} if needed/);
  assert.match(styles, /\.availability-grid-wrap/);
  assert.match(styles, /position: sticky/);
  assert.match(styles, /\.grid-status\.if-needed/);
  assert.match(styles, /background: #ffe5dc/);
  assert.match(
    styles,
    /\.availability-grid thead th:first-child,[\s\S]*max-width: 108px;/,
  );
  assert.match(pollHandler, /samplePollParticipants/);
  assert.doesNotMatch(pollHandler, /DELETE FROM/);
  assert.doesNotMatch(pollHandler, /INSERT INTO polls/);
  assert.match(sample, /status: "if-needed" as const/);
});
