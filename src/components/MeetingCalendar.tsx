"use client";

import { useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { rescheduleMeeting, deleteMeeting } from "@/app/actions";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import {
  WEEKDAY_SHORT,
  MONTH_LONG,
  ymd,
  dayFromYmd,
  todayKey,
  addDays,
  addMonths,
  monthGrid,
  weekDays,
  isSameMonth,
  monthTitle,
  weekTitle,
  dayTitle,
  fmtTime,
  fmtTimeShort,
  fmtTimeRange,
  minuteToTimeInput,
  timeInputToMinute,
  DURATION_OPTIONS,
  DAY_HOURS,
  DAY_START_HOUR,
  DAY_END_HOUR,
  hourLabel,
} from "@/lib/calendar";

export interface CalendarMeeting {
  id: string;
  title: string;
  typeCode: string;
  typeLabel: string;
  day: string | null; // yyyy-mm-dd (UTC-anchored) or null when unscheduled
  startMinute: number | null;
  durationMin: number | null;
  attendees: { id: string; name: string }[];
  canManage: boolean;
}

type ViewMode = "month" | "week" | "day";

const HOUR_PX = 48;
const WINDOW_START = DAY_START_HOUR * 60;
const TOTAL_HOURS = DAY_END_HOUR - DAY_START_HOUR + 1;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_PX;

export default function MeetingCalendar({
  meetings,
  teamName,
}: {
  meetings: CalendarMeeting[];
  teamName: string;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [anchor, setAnchor] = useState<Date>(() => todayKey());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const today = useMemo(() => todayKey(), []);
  const selected = meetings.find((m) => m.id === selectedId) ?? null;

  // Group scheduled meetings by day key for fast lookup.
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarMeeting[]>();
    for (const m of meetings) {
      if (!m.day) continue;
      const arr = map.get(m.day) ?? [];
      arr.push(m);
      map.set(m.day, arr);
    }
    for (const arr of map.values()) arr.sort(sortByTime);
    return map;
  }, [meetings]);

  const unscheduled = useMemo(() => meetings.filter((m) => !m.day), [meetings]);

  function go(dir: -1 | 1) {
    setAnchor((a) => (view === "month" ? addMonths(a, dir) : addDays(a, dir * (view === "week" ? 7 : 1))));
  }

  const title = view === "month" ? monthTitle(anchor) : view === "week" ? weekTitle(anchor) : dayTitle(anchor);

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-brand-200)" }}>
            <button className="px-2.5 py-1.5 text-sm hover:bg-[var(--color-brand-50)]" onClick={() => go(-1)} aria-label="Previous">←</button>
            <button className="px-3 py-1.5 text-sm border-x hover:bg-[var(--color-brand-50)]" style={{ borderColor: "var(--color-brand-200)" }} onClick={() => setAnchor(todayKey())}>Today</button>
            <button className="px-2.5 py-1.5 text-sm hover:bg-[var(--color-brand-50)]" onClick={() => go(1)} aria-label="Next">→</button>
          </div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-brand-200)" }}>
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-pressed={view === v}
                className="px-3 py-1.5 text-sm capitalize transition-colors"
                style={{
                  background: view === v ? "var(--color-brand-600)" : "transparent",
                  color: view === v ? "#fff" : "inherit",
                }}
              >
                {v}
              </button>
            ))}
          </div>
          <Link href="/meeting/new" className="btn btn-primary py-1.5 px-3 text-sm shrink-0">New meeting</Link>
        </div>
      </div>

      {/* Views */}
      {view === "month" && (
        <MonthView anchor={anchor} today={today} byDay={byDay} onPick={setSelectedId} />
      )}
      {view === "week" && (
        <TimelineView days={weekDays(anchor)} today={today} byDay={byDay} onPick={setSelectedId} />
      )}
      {view === "day" && (
        <TimelineView days={[anchor]} today={today} byDay={byDay} onPick={setSelectedId} single />
      )}

      {/* Unscheduled tray */}
      {unscheduled.length > 0 && (
        <UnscheduledTray meetings={unscheduled} onPick={setSelectedId} />
      )}

      {meetings.length === 0 && (
        <div className="card p-8 text-center">
          <p className="font-semibold">No meetings yet</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Plan your first one for {teamName}. Pick a type, add who's coming, and you'll
            get a prep read on how to show up.
          </p>
          <Link href="/meeting/new" className="btn btn-primary">Plan a meeting</Link>
        </div>
      )}

      {selected && <DetailModal meeting={selected} onClose={() => setSelectedId(null)} />}
    </div>
  );
}

function sortByTime(a: CalendarMeeting, b: CalendarMeeting) {
  const am = a.startMinute ?? -1;
  const bm = b.startMinute ?? -1;
  return am - bm;
}

// --- Month -----------------------------------------------------------------

function MonthView({
  anchor,
  today,
  byDay,
  onPick,
}: {
  anchor: Date;
  today: Date;
  byDay: Map<string, CalendarMeeting[]>;
  onPick: (id: string) => void;
}) {
  const cells = monthGrid(anchor);
  const todayY = ymd(today);
  return (
    <div className="card overflow-hidden p-0">
      <div className="grid grid-cols-7 border-b" style={{ borderColor: "var(--color-brand-200)" }}>
        {WEEKDAY_SHORT.map((d) => (
          <div key={d} className="px-2 py-2 text-center text-xs font-medium text-stone-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const key = ymd(day);
          const inMonth = isSameMonth(day, anchor);
          const isToday = key === todayY;
          const list = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              className="min-h-[92px] border-b border-r p-1.5 last:border-r-0"
              style={{
                borderColor: "var(--color-brand-200)",
                background: inMonth ? "transparent" : "color-mix(in srgb, var(--color-brand-50) 40%, transparent)",
                opacity: inMonth ? 1 : 0.65,
                borderRightWidth: (i + 1) % 7 === 0 ? 0 : undefined,
              }}
            >
              <div className="flex justify-end">
                <span
                  className={`grid place-items-center text-xs h-6 w-6 rounded-full ${isToday ? "font-bold" : "text-stone-500"}`}
                  style={isToday ? { background: "var(--color-brand-600)", color: "#fff" } : undefined}
                >
                  {day.getUTCDate()}
                </span>
              </div>
              <div className="mt-0.5 space-y-1">
                {list.slice(0, 3).map((m) => (
                  <MonthChip key={m.id} m={m} onPick={onPick} />
                ))}
                {list.length > 3 && (
                  <div className="text-[10px] text-stone-400 pl-1">+{list.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthChip({ m, onPick }: { m: CalendarMeeting; onPick: (id: string) => void }) {
  return (
    <button
      onClick={() => onPick(m.id)}
      className="w-full text-left rounded px-1.5 py-0.5 text-[11px] leading-tight truncate transition-colors hover:brightness-95"
      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
      title={m.title}
    >
      {m.startMinute != null && <span className="tabular-nums opacity-70 mr-1">{fmtTimeShort(m.startMinute)}</span>}
      {m.title}
    </button>
  );
}

// --- Week / Day timeline ---------------------------------------------------

function TimelineView({
  days,
  today,
  byDay,
  onPick,
  single = false,
}: {
  days: Date[];
  today: Date;
  byDay: Map<string, CalendarMeeting[]>;
  onPick: (id: string) => void;
  single?: boolean;
}) {
  const todayY = ymd(today);
  // Does any day this view have an all-day (dated, no time) meeting?
  const hasAllDay = days.some((d) => (byDay.get(ymd(d)) ?? []).some((m) => m.startMinute == null));

  return (
    <div className="card p-0 overflow-hidden">
      {/* Day headers */}
      <div className="grid border-b" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)`, borderColor: "var(--color-brand-200)" }}>
        <div />
        {days.map((d) => {
          const isToday = ymd(d) === todayY;
          return (
            <div key={ymd(d)} className="px-2 py-2 text-center border-l" style={{ borderColor: "var(--color-brand-200)" }}>
              <div className="text-[11px] text-stone-500">{WEEKDAY_SHORT[d.getUTCDay()]}</div>
              <div
                className={`mx-auto mt-0.5 grid place-items-center h-7 w-7 rounded-full text-sm ${isToday ? "font-bold" : ""}`}
                style={isToday ? { background: "var(--color-brand-600)", color: "#fff" } : undefined}
              >
                {d.getUTCDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day (dated, timeless) row */}
      {hasAllDay && (
        <div className="grid border-b" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)`, borderColor: "var(--color-brand-200)" }}>
          <div className="px-1 py-1.5 text-[10px] text-stone-400 text-right pr-2">all-day</div>
          {days.map((d) => {
            const list = (byDay.get(ymd(d)) ?? []).filter((m) => m.startMinute == null);
            return (
              <div key={ymd(d)} className="border-l p-1 space-y-1 min-h-[2rem]" style={{ borderColor: "var(--color-brand-200)" }}>
                {list.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onPick(m.id)}
                    className="w-full text-left rounded px-1.5 py-0.5 text-[11px] truncate hover:brightness-95"
                    style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                    title={m.title}
                  >
                    {m.title}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Timed grid */}
      <div className="grid" style={{ gridTemplateColumns: `3rem repeat(${days.length}, 1fr)` }}>
        {/* Hour gutter */}
        <div className="relative" style={{ height: GRID_HEIGHT }}>
          {DAY_HOURS.map((h, i) => (
            <div key={h} className="absolute right-1.5 text-[10px] text-stone-400 -translate-y-1/2" style={{ top: i * HOUR_PX }}>
              {hourLabel(h)}
            </div>
          ))}
        </div>
        {/* Day columns */}
        {days.map((d) => {
          const timed = (byDay.get(ymd(d)) ?? []).filter((m) => m.startMinute != null);
          const packed = packLanes(timed);
          return (
            <div key={ymd(d)} className="relative border-l" style={{ height: GRID_HEIGHT, borderColor: "var(--color-brand-200)" }}>
              {/* hour lines */}
              {DAY_HOURS.map((h, i) => (
                <div key={h} className="absolute inset-x-0 border-t" style={{ top: i * HOUR_PX, borderColor: "color-mix(in srgb, var(--color-brand-200) 60%, transparent)" }} />
              ))}
              {packed.map(({ m, lane, lanes }) => {
                const start = m.startMinute!;
                const dur = m.durationMin ?? 30;
                const top = Math.max(0, ((start - WINDOW_START) / 60) * HOUR_PX);
                const rawH = (dur / 60) * HOUR_PX;
                const height = Math.max(18, Math.min(rawH, GRID_HEIGHT - top));
                const widthPct = 100 / lanes;
                return (
                  <button
                    key={m.id}
                    onClick={() => onPick(m.id)}
                    className="absolute rounded-md px-1.5 py-0.5 text-left overflow-hidden text-[11px] leading-tight ring-1 hover:brightness-95 transition"
                    style={{
                      top,
                      height,
                      left: `calc(${lane * widthPct}% + 2px)`,
                      width: `calc(${widthPct}% - 4px)`,
                      background: "var(--color-brand-600)",
                      color: "#fff",
                      // @ts-expect-error ring color via CSS var
                      "--tw-ring-color": "color-mix(in srgb, #000 15%, var(--color-brand-600))",
                    }}
                    title={`${m.title} · ${fmtTimeRange(start, m.durationMin)}`}
                  >
                    <div className="font-medium truncate">{m.title}</div>
                    {height > 30 && <div className="opacity-80 tabular-nums">{fmtTime(start)}</div>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Assign overlapping meetings to side-by-side lanes (first-fit by end time). */
function packLanes(meetings: CalendarMeeting[]): { m: CalendarMeeting; lane: number; lanes: number }[] {
  const sorted = [...meetings].sort((a, b) => (a.startMinute! - b.startMinute!));
  const laneEnds: number[] = []; // end minute of last meeting in each lane
  const placed = sorted.map((m) => {
    const start = m.startMinute!;
    const end = start + (m.durationMin ?? 30);
    let lane = laneEnds.findIndex((e) => e <= start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    return { m, lane };
  });
  const lanes = Math.max(1, laneEnds.length);
  return placed.map((p) => ({ ...p, lanes }));
}

// --- Unscheduled tray ------------------------------------------------------

function UnscheduledTray({ meetings, onPick }: { meetings: CalendarMeeting[]; onPick: (id: string) => void }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-semibold text-sm">Unscheduled</h3>
        <span className="text-xs text-stone-400">{meetings.length} without a date</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {meetings.map((m) => (
          <button
            key={m.id}
            onClick={() => onPick(m.id)}
            className="rounded-full border pl-2 pr-3 py-1 text-sm flex items-center gap-2 hover:brightness-95"
            style={{ borderColor: "var(--color-brand-200)", background: "var(--color-elevated)" }}
            title={m.title}
          >
            <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>{m.typeLabel}</span>
            <span className="truncate max-w-[14rem]">{m.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Detail / reschedule modal ---------------------------------------------

function DetailModal({ meeting, onClose }: { meeting: CalendarMeeting; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [date, setDate] = useState(meeting.day ?? "");
  const [time, setTime] = useState(meeting.startMinute != null ? minuteToTimeInput(meeting.startMinute) : "");
  const [duration, setDuration] = useState<number>(meeting.durationMin ?? 30);

  function save() {
    setError(null);
    const startMinute = date && time ? timeInputToMinute(time) : null;
    startTransition(async () => {
      const res = await rescheduleMeeting(meeting.id, {
        scheduledFor: date || null,
        startMinute,
        durationMin: startMinute != null ? duration : null,
      });
      if ("error" in res && res.error) setError(res.error);
      else {
        setEditing(false);
        onClose();
        router.refresh();
      }
    });
  }

  function cancelMeeting() {
    if (!confirm(`Cancel "${meeting.title}"? This removes the meeting and its prep. This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMeeting(meeting.id);
      if ("error" in res && res.error) setError(res.error);
      else {
        onClose();
        router.refresh();
      }
    });
  }

  const when = meeting.day
    ? `${MONTH_LONG[dayFromYmd(meeting.day).getUTCMonth()]} ${dayFromYmd(meeting.day).getUTCDate()}` +
      (meeting.startMinute != null ? ` · ${fmtTimeRange(meeting.startMinute, meeting.durationMin)}` : "")
    : "No date set";

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="card w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>{meeting.typeLabel}</span>
            <h2 className="text-lg font-bold tracking-tight mt-1.5">{meeting.title}</h2>
            <p className="text-sm text-stone-500 mt-0.5">{when}</p>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-xl leading-none" aria-label="Close">×</button>
        </div>

        <div>
          <p className="label mb-1.5">In the room · {meeting.attendees.length}</p>
          <div className="flex flex-wrap gap-1.5">
            {meeting.attendees.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5 rounded-full border pl-1 pr-2.5 py-0.5 text-xs" style={{ borderColor: "var(--color-brand-200)" }} title={a.name}>
                <span className="grid place-items-center w-5 h-5 rounded-full text-[9px] font-bold" style={{ background: avatarColor(a.name), color: avatarInkColor(a.name) }} aria-hidden>
                  {initials(a.name)}
                </span>
                {a.name}
              </span>
            ))}
          </div>
        </div>

        {editing && meeting.canManage && (
          <div className="rounded-lg border p-3 space-y-3" style={{ borderColor: "var(--color-brand-200)" }}>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="label text-[11px]" htmlFor="rs-date">Date</label>
                <input id="rs-date" type="date" className="input py-1 text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="label text-[11px]" htmlFor="rs-time">Time</label>
                <input id="rs-time" type="time" className="input py-1 text-sm" value={time} disabled={!date} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="label text-[11px]" htmlFor="rs-dur">Length</label>
                <select id="rs-dur" className="input py-1 text-sm" value={duration} disabled={!date || !time} onChange={(e) => setDuration(Number(e.target.value))}>
                  {DURATION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-primary py-1 px-3 text-sm" disabled={pending} onClick={save}>{pending ? "Saving…" : "Save"}</button>
              <button className="btn btn-ghost py-1 px-3 text-sm" disabled={pending} onClick={() => setEditing(false)}>Back</button>
              {date && (
                <button className="btn btn-ghost py-1 px-3 text-sm text-stone-500" disabled={pending} onClick={() => { setDate(""); setTime(""); }}>Clear date</button>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link href={`/meeting/${meeting.id}`} className="btn btn-primary py-1.5 px-3 text-sm">Open</Link>
          {meeting.canManage && !editing && (
            <button className="btn btn-secondary py-1.5 px-3 text-sm" onClick={() => setEditing(true)}>Reschedule</button>
          )}
          {meeting.canManage && (
            <Link href={`/meeting/${meeting.id}/edit`} className="btn btn-ghost py-1.5 px-3 text-sm">Edit details</Link>
          )}
          {meeting.canManage && (
            <button className="btn btn-ghost py-1.5 px-3 text-sm text-red-700 ml-auto" disabled={pending} onClick={cancelMeeting}>
              {pending ? "…" : "Cancel meeting"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
