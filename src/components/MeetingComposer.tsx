"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Member } from "@/lib/team";
import { buildMeetingBrief } from "@/lib/meeting";
import { MEETING_TYPES, MeetingTypeCode, meetingType } from "@/lib/meeting-types";
import { createMeeting, updateMeeting } from "@/app/actions";
import MeetingBriefView from "@/components/MeetingBriefView";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { minuteToTimeInput, timeInputToMinute, DURATION_OPTIONS } from "@/lib/calendar";

export interface MeetingInitial {
  type: MeetingTypeCode;
  title: string;
  goal: string;
  scheduledFor: string; // yyyy-mm-dd or ""
  startMinute: number | null;
  durationMin: number | null;
  attendeeIds: string[];
}

export default function MeetingComposer({
  mode,
  meetingId,
  viewer,
  others,
  initial,
}: {
  mode: "create" | "edit";
  meetingId?: string;
  viewer: Member;
  others: Member[];
  initial?: MeetingInitial;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<MeetingTypeCode | "">(initial?.type ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [goal, setGoal] = useState(initial?.goal ?? "");
  const [date, setDate] = useState(initial?.scheduledFor ?? "");
  const [time, setTime] = useState(
    initial?.startMinute != null ? minuteToTimeInput(initial.startMinute) : "",
  );
  const [duration, setDuration] = useState<number>(initial?.durationMin ?? 30);
  const [selected, setSelected] = useState<Set<string>>(new Set(initial?.attendeeIds ?? []));

  const chosen = useMemo(() => others.filter((m) => selected.has(m.id)), [others, selected]);
  const brief = useMemo(
    () => (type ? buildMeetingBrief(viewer, chosen, type) : null),
    [viewer, chosen, type],
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function save() {
    setError(null);
    if (!type) return setError("Pick a meeting type.");
    if (!title.trim()) return setError("Give the meeting a title.");
    const startMinute = date && time ? timeInputToMinute(time) : null;
    const payload = {
      type,
      title: title.trim(),
      goal: goal.trim() || null,
      scheduledFor: date || null,
      startMinute,
      durationMin: startMinute != null ? duration : null,
      attendeeIds: [...selected],
    };
    startTransition(async () => {
      const res =
        mode === "edit" && meetingId
          ? await updateMeeting(meetingId, payload)
          : await createMeeting(payload);
      if ("error" in res && res.error) setError(res.error);
      else if ("id" in res && res.id) router.push(`/meeting/${res.id}`);
    });
  }

  const activeType = type ? meetingType(type) : null;

  return (
    <div className="space-y-6">
      {/* Type picker */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">What kind of meeting?</h2>
        <p className="text-sm text-stone-500 mb-4">
          The type shapes the prep, from a decision-focused leadership session to a
          listen-first customer call.
        </p>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {MEETING_TYPES.map((t) => {
            const on = type === t.code;
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                aria-pressed={on}
                className="text-left rounded-xl border p-3 transition-colors"
                style={{
                  borderColor: on ? "var(--color-brand-600)" : "#e2ddd4",
                  background: on ? "var(--color-brand-50)" : "var(--color-elevated)",
                }}
              >
                <div className="font-medium text-sm">{t.label}</div>
                <div className="text-xs text-stone-500 mt-0.5">{t.description}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Details */}
      <section className="card p-5 space-y-4">
        <div className="space-y-1.5">
          <label className="label" htmlFor="m-title">Title</label>
          <input
            id="m-title"
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly product sync"
          />
        </div>
        <div className="space-y-1.5">
          <label className="label" htmlFor="m-goal">Goal (optional)</label>
          <input
            id="m-goal"
            className="input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={activeType?.goalPlaceholder ?? "What does a good outcome look like?"}
          />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="label" htmlFor="m-date">Date (optional)</label>
            <input id="m-date" type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="label" htmlFor="m-time">Start time</label>
            <input
              id="m-time"
              type="time"
              className="input"
              value={time}
              disabled={!date}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="label" htmlFor="m-duration">Length</label>
            <select
              id="m-duration"
              className="input"
              value={duration}
              disabled={!date || !time}
              onChange={(e) => setDuration(Number(e.target.value))}
            >
              {DURATION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        {!date && (
          <p className="text-xs text-stone-400 -mt-2">Set a date to add a start time. Undated meetings show in the calendar's “Unscheduled” tray.</p>
        )}
      </section>

      {/* Attendees */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Who's in the meeting?</h2>
        <p className="text-sm text-stone-500 mb-4">
          Pick the people joining. You're included automatically. External guests
          (like a customer) don't need to be here, the type prep covers them.
        </p>
        {others.length === 0 ? (
          <p className="text-sm text-stone-500">
            No shared profiles yet to add. Once teammates share, they'll show up here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {others.map((m) => {
              const on = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className="flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1.5 text-sm transition-colors"
                  style={{
                    borderColor: on ? "var(--color-brand-600)" : "#e2ddd4",
                    background: on ? "var(--color-brand-50)" : "var(--color-elevated)",
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  <span
                    className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold"
                    style={{ background: avatarColor(m.name), color: avatarInkColor(m.name) }}
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  {m.name}
                  {on && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Live preview */}
      {brief ? (
        <section>
          <h2 className="font-semibold mb-3">Your prep</h2>
          <MeetingBriefView brief={brief} />
        </section>
      ) : (
        <p className="text-sm text-stone-500">Pick a meeting type to see your prep.</p>
      )}

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : mode === "edit" ? "Save changes" : "Save meeting"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => router.push(mode === "edit" && meetingId ? `/meeting/${meetingId}` : "/meeting")}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
