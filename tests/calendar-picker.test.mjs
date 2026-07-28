import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calendarDays,
  localDateKey,
  monthKeyForDate,
  optionAtDefaultTime,
  shiftMonth,
} from "../lib/calendar.ts";

test("builds stable calendar months and default-time options", () => {
  const july = new Date(2026, 6, 14, 12);

  assert.equal(localDateKey(july), "2026-07-14");
  assert.equal(monthKeyForDate(july), "2026-07-01");
  assert.equal(shiftMonth("2026-07-01", 1), "2026-08-01");
  assert.equal(shiftMonth("2026-01-01", -1), "2025-12-01");
  assert.equal(optionAtDefaultTime("2026-07-30"), "2026-07-30T18:00");
  assert.equal(
    optionAtDefaultTime("2026-07-30", true),
    "2026-07-30T00:00",
  );
});

test("renders a complete six-week calendar grid", () => {
  const days = calendarDays("2026-07-01");

  assert.equal(days.length, 42);
  assert.equal(days[0].date.getDay(), 0);
  assert.equal(days.at(-1).date.getDay(), 6);
  assert.ok(
    days.some(
      (day) => day.key === "2026-07-01" && day.inCurrentMonth,
    ),
  );
});

test("ships future-only multi-date selection with existing dates marked", async () => {
  const [app, styles] = await Promise.all([
    readFile(new URL("../app/DoodleApp.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(app, /className="calendar-picker"/);
  assert.match(app, /disabled=\{unavailable \|\| existing\}/);
  assert.match(app, /className="calendar-key-existing"/);
  assert.match(app, /calendarSelection\.length/);
  assert.match(app, /optionAtDefaultTime/);
  assert.match(app, /New dates start at 6:00 PM\./);
  assert.match(styles, /\.calendar-days button\.existing/);
  assert.match(styles, /\.calendar-days button\.selected/);
  assert.match(
    styles,
    /\.calendar-days button:not\(:disabled\):not\(\.selected\):hover/,
  );
  assert.doesNotMatch(styles, /button\.outside-month\s*\{\s*color:/);
  assert.match(styles, /\.calendar-picker-footer/);
});
