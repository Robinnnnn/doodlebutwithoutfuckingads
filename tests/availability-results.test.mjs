import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("persists three-state availability without breaking legacy yes votes", async () => {
  const [app, responseRoute, pollRoute, schema, migration] = await Promise.all([
    readFile(new URL("../app/DoodleApp.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/polls/[id]/responses/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/polls/[id]/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../drizzle/0002_wonderful_hellfire_club.sql", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(app, /type AvailabilityStatus = "yes" \| "if-needed"/);
  assert.match(app, /currentStatus === "yes"/);
  assert.match(app, /availability\[optionId\] = "if-needed"/);
  assert.match(app, /delete availability\[optionId\]/);
  assert.match(responseRoute, /body\.optionIds/);
  assert.match(responseRoute, /status: "yes"/);
  assert.match(
    responseRoute,
    /INSERT INTO votes \(response_id, option_id, status\)/,
  );
  assert.match(pollRoute, /v\.status/);
  assert.match(schema, /status: text\("status"\)\.notNull\(\)\.default\("yes"\)/);
  assert.match(migration, /ADD `status` text DEFAULT 'yes' NOT NULL/);
});

test("offers compact list and grid results only after submission, including sample data", async () => {
  const [app, styles, pollRoute, sample] = await Promise.all([
    readFile(new URL("../app/DoodleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/polls/[id]/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../lib/sample-poll.ts", import.meta.url), "utf8"),
  ]);

  assert.match(app, /showingResults = response\.submitted && !editing/);
  assert.match(app, /className="results-view-toggle"/);
  assert.match(app, /resultsView === "grid"/);
  assert.match(app, /className="availability-grid"/);
  assert.match(app, /Everyone’s availability/);
  assert.match(app, /yes · \$\{ifNeededVoters\.length\} if needed/);
  assert.match(styles, /\.availability-grid-wrap/);
  assert.match(styles, /position: sticky/);
  assert.match(styles, /\.grid-status\.if-needed/);
  assert.match(pollRoute, /samplePollParticipants/);
  assert.match(sample, /status: "if-needed" as const/);
});
