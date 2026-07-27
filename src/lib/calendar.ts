/**
 * Calendar date/time helpers, shared by the server loaders and the client
 * calendar UI (no "server-only" — safe on the client).
 *
 * TIMEZONE MODEL (important): a meeting's `scheduledFor` is a "floating" calendar
 * DAY, stored at UTC midnight. We therefore read the day with **UTC getters** so
 * it never shifts when a viewer is in a negative-offset timezone (e.g. Florida,
 * UTC-4/5). The time of day is a separate wall-clock **minute offset**
 * (`startMinute`), so it too is timezone-proof: 9:30 is 570, everywhere.
 *
 * Every day here is represented as a Date at UTC midnight ("day key"), and we
 * step days with setUTCDate so DST never bites.
 */

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEKDAY_NARROW = ["S", "M", "T", "W", "T", "F", "S"];
export const MONTH_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// --- Day keys (UTC-midnight Dates) -----------------------------------------

/** yyyy-mm-dd for a floating day, read via UTC getters. */
export function ymd(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Parse a yyyy-mm-dd string into a UTC-midnight Date (a day key). */
export function dayFromYmd(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

/** The viewer's LOCAL today as a UTC-midnight day key (so it lines up with meeting days). */
export function todayKey(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDays(day: Date, n: number): Date {
  const d = new Date(day);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function addMonths(day: Date, n: number): Date {
  const d = new Date(day);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d;
}

export function startOfWeek(day: Date): Date {
  // Weeks start on Sunday.
  return addDays(day, -day.getUTCDay());
}

export function startOfMonth(day: Date): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), 1));
}

export function isSameDay(a: Date, b: Date): boolean {
  return ymd(a) === ymd(b);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth();
}

/** The 6x7 grid of days covering the month `anchor` falls in (Sun-first). */
export function monthGrid(anchor: Date): Date[] {
  const first = startOfMonth(anchor);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

/** The 7 days of the week `anchor` falls in (Sun-first). */
export function weekDays(anchor: Date): Date[] {
  const start = startOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

// --- Labels ----------------------------------------------------------------

export function monthTitle(day: Date): string {
  return `${MONTH_LONG[day.getUTCMonth()]} ${day.getUTCFullYear()}`;
}

/** e.g. "Jul 27 – Aug 2, 2026" for the week containing `day`. */
export function weekTitle(day: Date): string {
  const days = weekDays(day);
  const a = days[0];
  const b = days[6];
  const aM = MONTH_LONG[a.getUTCMonth()].slice(0, 3);
  const bM = MONTH_LONG[b.getUTCMonth()].slice(0, 3);
  if (a.getUTCFullYear() !== b.getUTCFullYear()) {
    return `${aM} ${a.getUTCDate()}, ${a.getUTCFullYear()} – ${bM} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  if (a.getUTCMonth() !== b.getUTCMonth()) {
    return `${aM} ${a.getUTCDate()} – ${bM} ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
  }
  return `${aM} ${a.getUTCDate()} – ${b.getUTCDate()}, ${b.getUTCFullYear()}`;
}

/** e.g. "Monday, July 27, 2026". */
export function dayTitle(day: Date): string {
  const weekday = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day.getUTCDay()];
  return `${weekday}, ${MONTH_LONG[day.getUTCMonth()]} ${day.getUTCDate()}, ${day.getUTCFullYear()}`;
}

// --- Times (wall-clock minute offsets) -------------------------------------

/** Minutes past midnight → "9:30 AM". */
export function fmtTime(minute: number): string {
  const h24 = Math.floor(minute / 60);
  const m = minute % 60;
  const ampm = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Compact form: "9 AM", "9:30 AM". */
export function fmtTimeShort(minute: number): string {
  const m = minute % 60;
  return m === 0 ? fmtTime(minute).replace(":00", "") : fmtTime(minute);
}

/** "9:30 – 10:30 AM" when a start and duration are known. */
export function fmtTimeRange(startMinute: number, durationMin: number | null): string {
  if (durationMin == null) return fmtTime(startMinute);
  const end = Math.min(startMinute + durationMin, 24 * 60);
  return `${fmtTime(startMinute)} – ${fmtTime(end)}`;
}

/** Minutes past midnight → "HH:MM" for an <input type="time">. */
export function minuteToTimeInput(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** "HH:MM" from an <input type="time"> → minutes past midnight, or null if blank/invalid. */
export function timeInputToMinute(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** Duration presets offered in the composer / reschedule panel. */
export const DURATION_OPTIONS: { value: number; label: string }[] = [
  { value: 15, label: "15 min" },
  { value: 30, label: "30 min" },
  { value: 45, label: "45 min" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

// --- Day-timeline window (for Week/Day grids) ------------------------------

/** Hours shown on the timeline: 7am (7) through 7pm (19). */
export const DAY_START_HOUR = 7;
export const DAY_END_HOUR = 19;
export const DAY_HOURS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i,
);

export function hourLabel(hour: number): string {
  const ampm = hour < 12 ? "AM" : "PM";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12} ${ampm}`;
}
