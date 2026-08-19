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

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// "15:00" — 24-hour local time.
export function formatTime(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// "FRI 25" — day-tab label.
export function formatDayLabel(d: Date): string {
  return `${WD_UPPER[d.getDay()]} ${d.getDate()}`;
}

// "SAT 26 SEP" — upcoming-rail sticky group header.
export function formatRailGroupLabel(d: Date): string {
  return `${WD_UPPER[d.getDay()]} ${d.getDate()} ${MO_UPPER[d.getMonth()]}`;
}

// "Fri 25 Sep 2026" — single-day event detail date line.
export function formatModalDate(d: Date): string {
  return `${WD_TITLE[d.getDay()]} ${d.getDate()} ${MO_TITLE[d.getMonth()]} ${d.getFullYear()}`;
}

// "Fri 25 – Sun 27 Sep 2026" — ongoing event detail date line.
export function formatModalDateRange(start: Date, end: Date): string {
  return `${WD_TITLE[start.getDay()]} ${start.getDate()} – ${WD_TITLE[end.getDay()]} ${end.getDate()} ${MO_TITLE[end.getMonth()]} ${end.getFullYear()}`;
}

// "3 Aug 2026, 14:22" — event detail footer ("Created by"/"Last edited by").
export function formatFooterTimestamp(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MO_TITLE[d.getMonth()]} ${d.getFullYear()}, ${formatTime(d)}`;
}

// Local-timezone Y-M-D key, used both to group events by day and to decide
// whether an event spans more than one calendar day.
export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// An event "runs all weekend" (goes in the ongoing strip, not a day tab or
// the upcoming rail) when its start and end fall on different calendar days.
export function isOngoing(e: ScheduleEvent): boolean {
  return dateKey(new Date(e.startsAt)) !== dateKey(new Date(e.endsAt));
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
