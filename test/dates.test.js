import assert from "node:assert/strict";
import test from "node:test";
import {
  addDays,
  dailyNotePath,
  formatDate,
  formatHelp,
  localToday,
  noteHeading,
  vaultPath,
} from "../lib/dates.js";
import { DEFAULTS, settingsFrom } from "../lib/settings.js";

const date = { y: 2026, m: 11, d: 4 };

test("names notes with valid formats only", () => {
  assert.equal(formatDate(date, "%Y-%m-%d"), "2026-11-04");
  assert.equal(formatDate(date, "%Y/%m/%d"), "2026/11/04");
  assert.equal(formatDate(date, "day"), "day");
  assert.equal(formatDate(date, "%Q"), null);
  assert.equal(formatDate(date, "%Y-%m-%d %H:%M"), null);
  assert.equal(formatDate(date, " "), null);
  assert.equal(formatDate(date, ""), null);
  assert.equal(formatDate(date, "%"), null);
});

test("pads days the way chrono does", () => {
  assert.equal(formatDate(date, "%d"), "04");
  assert.equal(formatDate(date, "%-d"), "4");
  assert.equal(formatDate(date, "%e"), " 4");
  assert.equal(formatDate(date, "%A, %B %-d, %Y"), "Wednesday, November 4, 2026");
  assert.equal(formatDate(date, "%F"), "2026-11-04");
  assert.equal(formatDate(date, "%D"), "11/04/26");
  assert.equal(formatDate(date, "%j"), "308");
  assert.equal(formatDate({ y: 2026, m: 1, d: 4 }, "%j"), "004");
});

test("rejects a padding flag on a name", () => {
  assert.equal(formatDate(date, "%-A"), null);
  assert.equal(formatDate(date, "%-F"), null);
  assert.equal(formatDate(date, "%"), null);
  assert.equal(formatDate(date, "%Y-%"), null);
});

test("counts centuries, two-digit years and ISO week-years", () => {
  assert.equal(formatDate(date, "%C"), "20");
  assert.equal(formatDate(date, "%y"), "26");
  assert.equal(formatDate(date, "%g"), "26");
  assert.equal(formatDate({ y: 2021, m: 1, d: 1 }, "%g"), "20");
  assert.equal(formatDate({ y: 2000, m: 5, d: 6 }, "%C%y"), "2000");
});

test("writes the weekday chrono numbers, Sunday included", () => {
  const sunday = { y: 2026, m: 11, d: 1 };
  assert.equal(formatDate(sunday, "%A %a"), "Sunday Sun");
  assert.equal(formatDate(sunday, "%w"), "0");
  assert.equal(formatDate(sunday, "%u"), "7");
});

test("keeps a literal percent and trims an empty name", () => {
  assert.equal(formatDate(date, "100%%"), "100%");
  assert.equal(formatDate(date, "%%%Y"), "%2026");
  assert.equal(formatDate(date, "\n"), null);
});

test("uses ISO weeks and Sunday weeks", () => {
  assert.equal(formatDate({ y: 2021, m: 1, d: 1 }, "%G-W%V"), "2020-W53");
  assert.equal(formatDate({ y: 2026, m: 1, d: 1 }, "%U"), "00");
  assert.equal(formatDate({ y: 2026, m: 1, d: 1 }, "%W"), "00");
  assert.equal(formatDate(date, "%A"), "Wednesday");
  assert.equal(formatDate(date, "%w"), "3");
  assert.equal(formatDate(date, "%u"), "3");
  assert.equal(formatDate(date, "%q"), "4");
  assert.equal(formatDate(date, "%v"), " 4-Nov-2026");
  assert.equal(formatDate(date, "%a %b"), "Wed Nov");
  assert.equal(formatDate(date, "%x"), "11/04/26");
  assert.equal(formatDate({ y: 2020, m: 12, d: 31 }, "%G-W%V-%u"), "2020-W53-4");
  assert.equal(formatDate({ y: 2026, m: 11, d: 1 }, "%U %W"), "44 43");
});

test("builds the note path and falls back when the format names nothing", () => {
  assert.equal(dailyNotePath(date, { folder: "Daily", format: "%Y-%m-%d" }), "Daily/2026-11-04.md");
  assert.equal(dailyNotePath(date, { folder: "", format: "%Y-%m-%d" }), "2026-11-04.md");
  assert.equal(dailyNotePath(date, { folder: "Journal/", format: "day" }), "Journal/day.md");
  assert.equal(dailyNotePath(date, { folder: "Journal/", format: "%Q" }), "Journal/2026-11-04.md");
  assert.equal(
    dailyNotePath(date, { folder: "Daily", format: "%Y/%m/%d" }),
    "Daily/2026/11/04.md",
  );
  assert.equal(
    dailyNotePath(date, { folder: "../Secret", format: "%Y-%m-%d" }),
    "Secret/2026-11-04.md",
  );
});

test("writes an English heading without a padded day", () => {
  assert.equal(noteHeading(date), "# Wednesday, November 4, 2026\n\n");
});

test("normalizes folder paths the way vault paths are", () => {
  assert.equal(vaultPath("Daily//2026-11-04.md"), "Daily/2026-11-04.md");
  assert.equal(vaultPath("/Daily/./2026-11-04.md"), "Daily/2026-11-04.md");
  // `..` segments are dropped, not resolved, so nothing can climb out of the vault.
  assert.equal(vaultPath("a/../../b.md"), "a/b.md");
  assert.equal(vaultPath("Daily\\Sub/2026-11-04.md"), "Daily/Sub/2026-11-04.md");
  assert.equal(
    dailyNotePath(date, { folder: "Daily\\Sub\\", format: "%Y-%m-%d" }),
    "Daily/Sub/2026-11-04.md",
  );
});

test("shifts across months and years", () => {
  assert.deepEqual(addDays(date, 0), date);
  assert.deepEqual(addDays(date, -1), { y: 2026, m: 11, d: 3 });
  assert.deepEqual(addDays(date, 1), { y: 2026, m: 11, d: 5 });
  assert.deepEqual(addDays({ y: 2024, m: 2, d: 28 }, 1), { y: 2024, m: 2, d: 29 });
  assert.deepEqual(addDays({ y: 2026, m: 12, d: 31 }, 1), { y: 2027, m: 1, d: 1 });
});

test("explains a format that is not a date", () => {
  const settings = { folder: "Journal/", format: "%Q" };
  assert.match(formatHelp(date, settings), /is not a chrono date format/);
  assert.match(formatHelp(date, settings), /Journal\/2026-11-04\.md/);
  assert.match(formatHelp(date, { folder: "Daily", format: "%Y-%m-%d" }), /Daily\/2026-11-04\.md/);
  assert.doesNotMatch(formatHelp(date, { folder: "Daily", format: "%Y-%m-%d" }), /is not a chrono/);
});

test("keeps saved settings and fills in the rest", () => {
  assert.deepEqual(settingsFrom(null), DEFAULTS);
  assert.deepEqual(settingsFrom({}), DEFAULTS);
  assert.deepEqual(settingsFrom({ folder: "Journal/", format: "day" }), {
    folder: "Journal/",
    format: "day",
  });
  assert.equal(settingsFrom({ folder: "" }).folder, "");
  assert.equal(settingsFrom({ folder: 3, format: 4 }).folder, "Daily");
  assert.equal(settingsFrom({ folder: 3, format: 4 }).format, "%Y-%m-%d");
});

test("today is the local calendar date", () => {
  const now = new Date(2026, 10, 4, 23, 30);
  assert.deepEqual(localToday(now), date);
});
