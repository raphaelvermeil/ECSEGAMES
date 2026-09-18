import type { EventCategory, ScheduleEvent } from "@/lib/events";

export const CATEGORIES: EventCategory[] = [
  "Competition",
  "Meals",
  "Administration",
  "Custom",
];

// Short description max length — enforced by both the live counter and
// validation in EventFormModal.
export const SHORT_DESCRIPTION_MAX = 80;

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  Competition: "#ffd23f",
  Meals: "#ff7b54",
  Administration: "#4cc9f0",
  Custom: "#c77dff",
};

// Neutral inactive-chip border — fixed, not category-tinted.
export const INACTIVE_CHIP_BORDER = "rgba(127,148,130,.3)";

export function categoryColor(category: EventCategory): string {
  return CATEGORY_COLORS[category];
}

// Adds an alpha channel to a "#rrggbb" hex colour.
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const WD_UPPER = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const WD_TITLE = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MO_UPPER = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];
const MO_TITLE = [
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
const MO_FULL = [
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

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// Every date here is rendered in the Games' own timezone rather than the
// machine's. These formatters run during server rendering as well as in the
// browser, and a server in UTC and a reader in Montreal would otherwise
// disagree on every time — and even on which day an event belongs to — and
// React would refuse to hydrate the mismatch.
export const GAMES_TZ = "America/Toronto";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: GAMES_TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

interface ZonedParts {
  year: number;
  month: number; // 0-based, like Date#getMonth
  day: number;
  weekday: number; // 0 = Sunday, like Date#getDay
  hour: number;
  minute: number;
}

// The calendar fields of an instant as seen in GAMES_TZ.
export function zonedParts(d: Date): ZonedParts {
  const p: Record<string, string> = {};
  for (const { type, value } of partsFormatter.formatToParts(d)) {
    p[type] = value;
  }
  return {
    year: Number(p.year),
    month: Number(p.month) - 1,
    day: Number(p.day),
    weekday: WEEKDAY_INDEX[p.weekday.slice(0, 3)] ?? 0,
    hour: Number(p.hour) % 24,
    minute: Number(p.minute),
  };
}

// The instant at the given GAMES_TZ wall-clock time — the inverse of
// zonedParts, for building a start time from a form's day and time fields.
export function zonedDate(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = Date.UTC(year, month, day, hour, minute);
  const p = zonedParts(new Date(guess));
  const asIfUTC = Date.UTC(p.year, p.month, p.day, p.hour, p.minute);
  return new Date(guess - (asIfUTC - guess));
}

// "15:00" — 24-hour Games-local time.
export function formatTime(d: Date): string {
  const p = zonedParts(d);
  return `${pad2(p.hour)}:${pad2(p.minute)}`;
}

// "FRI 25" — day-tab label.
export function formatDayLabel(d: Date): string {
  const p = zonedParts(d);
  return `${WD_UPPER[p.weekday]} ${p.day}`;
}

// "SAT 26 SEP" — upcoming-rail sticky group header.
export function formatRailGroupLabel(d: Date): string {
  const p = zonedParts(d);
  return `${WD_UPPER[p.weekday]} ${p.day} ${MO_UPPER[p.month]}`;
}

// "Fri 25 Sep 2026" — single-day event detail date line.
export function formatModalDate(d: Date): string {
  const p = zonedParts(d);
  return `${WD_TITLE[p.weekday]} ${p.day} ${MO_TITLE[p.month]} ${p.year}`;
}

// "Fri 25 – Sun 27 Sep 2026" — ongoing event detail date line. The start
// keeps its own month when the range crosses one ("Wed 30 Sep – Thu 1 Oct").
export function formatModalDateRange(start: Date, end: Date): string {
  const s = zonedParts(start);
  const e = zonedParts(end);
  const startMonth = s.month === e.month ? "" : ` ${MO_TITLE[s.month]}`;
  return `${WD_TITLE[s.weekday]} ${s.day}${startMonth} – ${WD_TITLE[e.weekday]} ${e.day} ${MO_TITLE[e.month]} ${e.year}`;
}

// "Fri 25 – Sun 27 September" — mobile schedule banner subtitle.
export function formatBannerDateRange(start: Date, end: Date): string {
  const s = zonedParts(start);
  const e = zonedParts(end);
  return `${WD_TITLE[s.weekday]} ${s.day} – ${WD_TITLE[e.weekday]} ${e.day} ${MO_FULL[e.month]}`;
}

// "3 Aug 2026, 14:22" — event detail footer ("Created by"/"Last edited by").
export function formatFooterTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = zonedParts(d);
  return `${p.day} ${MO_TITLE[p.month]} ${p.year}, ${formatTime(d)}`;
}

// Games-timezone Y-M-D key, used to group events by day.
export function dateKey(d: Date): string {
  const p = zonedParts(d);
  return `${p.year}-${pad2(p.month + 1)}-${pad2(p.day)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// An event "runs all weekend" (goes in the ongoing strip, not a day tab or
// the upcoming rail) when it lasts a full day or more. Length rather than
// calendar days, so a night event that crosses midnight still sits under
// the evening it starts on.
export function isOngoing(e: ScheduleEvent): boolean {
  return +new Date(e.endsAt) - +new Date(e.startsAt) >= DAY_MS;
}

export interface DayBucket {
  key: string;
  date: Date;
  events: ScheduleEvent[];
}

// Buckets non-ongoing events by calendar day, chronologically — one bucket
// per day tab.
export function buildDayBuckets(events: ScheduleEvent[]): DayBucket[] {
  const map = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    if (isOngoing(e)) continue;
    const key = dateKey(new Date(e.startsAt));
    const bucket = map.get(key);
    if (bucket) bucket.push(e);
    else map.set(key, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, evts]) => ({
      key,
      date: new Date(evts[0].startsAt),
      events: evts.sort(
        (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
      ),
    }));
}

export interface RailGroup {
  key: string;
  label: string;
  events: ScheduleEvent[];
}

// Groups non-ongoing events at or after `now`, chronologically, under
// sticky date headers for the upcoming rail.
export function buildRailGroups(
  events: ScheduleEvent[],
  now: Date,
): RailGroup[] {
  const map = new Map<string, ScheduleEvent[]>();
  for (const e of events) {
    if (isOngoing(e)) continue;
    if (new Date(e.startsAt) < now) continue;
    const key = dateKey(new Date(e.startsAt));
    const group = map.get(key);
    if (group) group.push(e);
    else map.set(key, [e]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, evts]) => ({
      key,
      label: formatRailGroupLabel(new Date(evts[0].startsAt)),
      events: evts.sort(
        (a, b) => +new Date(a.startsAt) - +new Date(b.startsAt),
      ),
    }));
}
