/**
 * Timezone math for the pre-meeting job.
 *
 * WorkWith stores a meeting's day as `scheduledFor` (UTC midnight, read via UTC
 * getters) and its start as `startMinute` (wall-clock minutes past midnight, no
 * zone). To decide when a meeting actually starts as a real instant, we
 * interpret that wall-clock time in the workspace's timezone.
 */

/** Offset (minutes) such that local = utc + offset, for `tz` at instant `utc`. */
function tzOffsetMinutes(utc: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const p: Record<string, string> = {};
  for (const part of dtf.formatToParts(utc)) p[part.type] = part.value;
  const asUTC = Date.UTC(
    Number(p.year),
    Number(p.month) - 1,
    Number(p.day),
    Number(p.hour),
    Number(p.minute),
    Number(p.second),
  );
  return (asUTC - utc.getTime()) / 60000;
}

/**
 * Convert a wall-clock time in `tz` to a UTC instant.
 * `y`/`m`/`d` are the calendar date (m = 1..12); `minutes` is minutes past
 * midnight. Handles DST with a one-pass refinement at the offset boundary.
 */
export function zonedWallTimeToUtc(
  y: number,
  m: number,
  d: number,
  minutes: number,
  tz: string,
): Date {
  const hh = Math.floor(minutes / 60);
  const mm = minutes % 60;
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off1 = tzOffsetMinutes(guess, tz);
  let utc = new Date(guess.getTime() - off1 * 60000);
  const off2 = tzOffsetMinutes(utc, tz);
  if (off2 !== off1) utc = new Date(guess.getTime() - off2 * 60000);
  return utc;
}

/** The real start instant of a meeting, or null if it has no set time. */
export function meetingStartInstant(
  scheduledFor: Date | null,
  startMinute: number | null,
  tz: string,
): Date | null {
  if (!scheduledFor || startMinute == null) return null;
  // scheduledFor is a UTC-midnight day anchor; read the date via UTC getters.
  return zonedWallTimeToUtc(
    scheduledFor.getUTCFullYear(),
    scheduledFor.getUTCMonth() + 1,
    scheduledFor.getUTCDate(),
    startMinute,
    tz,
  );
}
