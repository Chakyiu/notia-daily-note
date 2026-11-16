/**
 * Dates for daily notes, formatted the way chrono formats a `NaiveDate`.
 * A format that is invalid, asks for a time, or names nothing produces
 * no name, and the note falls back to `%Y-%m-%d`.
 */

const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Indexed by JavaScript's `Date#getDay`, Sunday first. */
const LONG_WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** @typedef {{ y: number, m: number, d: number }} CalendarDate */
/** @typedef {"zero" | "space" | "none"} Pad */

export const DEFAULT_FORMAT = "%Y-%m-%d";

/** @param {Date} [now] @returns {CalendarDate} */
export function localToday(now = new Date()) {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

/**
 * `date` shifted by whole days. `offset` may be negative.
 * @param {CalendarDate} date
 * @param {number} offset
 * @returns {CalendarDate}
 */
export function addDays(date, offset) {
  const next = new Date(date.y, date.m - 1, date.d + offset);
  return { y: next.getFullYear(), m: next.getMonth() + 1, d: next.getDate() };
}

/**
 * `date` in `format`, or `null` when the format cannot name a date.
 * @param {CalendarDate} date
 * @param {string} format
 * @returns {string | null}
 */
export function formatDate(date, format) {
  let out = "";
  for (let i = 0; i < format.length; ) {
    if (format[i] !== "%") {
      out += format[i];
      i += 1;
      continue;
    }
    i += 1;
    if (i >= format.length) return null;
    /** @type {Pad | null} */
    let padOverride = null;
    const flag = format[i];
    if (flag === "-" || flag === "_" || flag === "0") {
      padOverride = flag === "-" ? "none" : flag === "_" ? "space" : "zero";
      i += 1;
      if (i >= format.length) return null;
    } else if (flag === "#") {
      return null;
    }
    const spec = format[i];
    i += 1;
    const piece = pieceFor(date, spec, padOverride ?? defaultPad(spec));
    if (!piece) return null;
    if (padOverride && !piece.numeric) return null;
    out += piece.text;
  }
  return out.trim() ? out : null;
}

/**
 * The note for `date`. An unusable name format falls back to `%Y-%m-%d`.
 * The path is normalized the way Notia's vault paths are: `..` cannot escape.
 * @param {CalendarDate} date
 * @param {{ folder: string, format: string }} settings
 */
export function dailyNotePath(date, settings) {
  const name = formatDate(date, settings.format) ?? formatDate(date, DEFAULT_FORMAT) ?? "";
  return vaultPath(`${settings.folder}/${name}.md`);
}

/** The heading written into a note the first time it is created. @param {CalendarDate} date */
export function noteHeading(date) {
  const title = formatDate(date, "%A, %B %-d, %Y") ?? "";
  return `# ${title}\n\n`;
}

/**
 * The help under the name field. It shows the note today's format produces,
 * or says the format cannot name a date.
 * @param {CalendarDate} date
 * @param {{ folder: string, format: string }} settings
 */
export function formatHelp(date, settings) {
  const path = dailyNotePath(date, settings);
  if (formatDate(date, settings.format)) {
    return `A chrono date format, like %Y-%m-%d. Today's note is ${path}.`;
  }
  return `This is not a chrono date format, like %Y-%m-%d, so today's note is ${path}.`;
}

/** @param {string} path */
export function vaultPath(path) {
  return String(path)
    .replaceAll("\\", "/")
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .join("/");
}

/** Sunday is 0. @param {CalendarDate} date */
function weekday(date) {
  return new Date(date.y, date.m - 1, date.d).getDay();
}

/** Day of the year, from 1. @param {CalendarDate} date */
function ordinal(date) {
  const start = Date.UTC(date.y, 0, 1);
  const current = Date.UTC(date.y, date.m - 1, date.d);
  return Math.round((current - start) / 86400000) + 1;
}

/**
 * ISO week-numbering year and week.
 * @param {CalendarDate} date
 */
function isoWeek(date) {
  const utc = Date.UTC(date.y, date.m - 1, date.d);
  const day = new Date(utc).getUTCDay() || 7;
  const thursday = utc + (4 - day) * 86400000;
  const year = new Date(thursday).getUTCFullYear();
  const week = Math.floor((thursday - Date.UTC(year, 0, 1)) / 86400000 / 7) + 1;
  return { year, week };
}

/**
 * Chrono's week count. `fromSunday` is `%U`; otherwise the week starts Monday (`%W`).
 * @param {CalendarDate} date
 * @param {boolean} fromSunday
 */
function weeksFrom(date, fromSunday) {
  const day = weekday(date);
  const since = fromSunday ? day : (day + 6) % 7;
  return Math.floor((ordinal(date) - since + 6) / 7);
}

/** @param {string} spec @returns {Pad} */
function defaultPad(spec) {
  if (spec === "e") return "space";
  if (spec === "w" || spec === "u" || spec === "q") return "none";
  return "zero";
}

/**
 * @param {CalendarDate} date
 * @param {string} spec
 * @param {Pad} pad
 * @returns {{ text: string, numeric: boolean } | null}
 */
function pieceFor(date, spec, pad) {
  const { y: year, m: month, d: day } = date;
  switch (spec) {
    case "Y":
      return { text: padYear(year), numeric: true };
    case "G":
      return { text: padYear(isoWeek(date).year), numeric: true };
    case "C":
      return { text: padTwo(Math.floor(year / 100), pad), numeric: true };
    case "y":
      return { text: padTwo(positiveMod(year, 100), pad), numeric: true };
    case "g":
      return { text: padTwo(positiveMod(isoWeek(date).year, 100), pad), numeric: true };
    case "m":
      return { text: padTwo(month, pad), numeric: true };
    case "d":
    case "e":
      return { text: padTwo(day, pad), numeric: true };
    case "j":
      return { text: padWidth(ordinal(date), 3, pad), numeric: true };
    case "U":
      return { text: padTwo(weeksFrom(date, true), pad), numeric: true };
    case "W":
      return { text: padTwo(weeksFrom(date, false), pad), numeric: true };
    case "V":
      return { text: padTwo(isoWeek(date).week, pad), numeric: true };
    case "q":
      return { text: String(Math.floor((month - 1) / 3) + 1), numeric: true };
    case "w":
      return { text: String(weekday(date)), numeric: true };
    case "u":
      return { text: String(weekday(date) || 7), numeric: true };
    case "B":
      return { text: LONG_MONTHS[month - 1], numeric: false };
    case "b":
    case "h":
      return { text: SHORT_MONTHS[month - 1], numeric: false };
    case "A":
      return { text: LONG_WEEKDAYS[weekday(date)], numeric: false };
    case "a":
      return { text: SHORT_WEEKDAYS[weekday(date)], numeric: false };
    case "n":
      return { text: "\n", numeric: false };
    case "t":
      return { text: "\t", numeric: false };
    case "%":
      return { text: "%", numeric: false };
    case "D":
    case "x":
      return {
        text: `${padTwo(month, "zero")}/${padTwo(day, "zero")}/${padTwo(positiveMod(year, 100), "zero")}`,
        numeric: false,
      };
    case "F":
      return {
        text: `${padYear(year)}-${padTwo(month, "zero")}-${padTwo(day, "zero")}`,
        numeric: false,
      };
    case "v":
      return {
        text: `${padTwo(day, "space")}-${SHORT_MONTHS[month - 1]}-${padYear(year)}`,
        numeric: false,
      };
    default:
      return null;
  }
}

/** Years 1000–9999 are four digits even with `%-Y`, as chrono writes them. @param {number} year */
function padYear(year) {
  if (year >= 1000 && year <= 9999) return String(year);
  const sign = year < 0 ? "-" : year >= 10000 ? "+" : "";
  return sign + String(Math.abs(year)).padStart(4, "0");
}

/** @param {number} value @param {Pad} pad */
function padTwo(value, pad) {
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  if (tens === 0 && pad === "none") return String(ones);
  if (tens === 0 && pad === "space") return ` ${ones}`;
  return `${tens}${ones}`;
}

/** @param {number} value @param {number} width @param {Pad} pad */
function padWidth(value, width, pad) {
  const text = String(value);
  if (pad === "none") return text;
  return text.padStart(width, pad === "space" ? " " : "0");
}

/** @param {number} value @param {number} divisor */
function positiveMod(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}
