"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Member } from "@/lib/team";
import { buildMeetingBrief } from "@/lib/meeting";
import { MEETING_TYPES, MeetingTypeCode, meetingType } from "@/lib/meeting-types";
import { createMeeting, updateMeeting, extractMeetingFromScreenshot } from "@/app/actions";
import MeetingBriefView from "@/components/MeetingBriefView";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { minuteToTimeInput, timeInputToMinute, DURATION_OPTIONS } from "@/lib/calendar";

async function fileToResizedJpeg(file: File, maxDim = 1500, quality = 0.85): Promise<string> {
  const dataUrl: string = await new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.onerror = () => rej(new Error("Could not read that file."));
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("Could not open that image."));
    i.src = dataUrl;
  });
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1];
}

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
  visionEnabled = false,
}: {
  mode: "create" | "edit";
  meetingId?: string;
  viewer: Member;
  others: Member[];
  initial?: MeetingInitial;
  visionEnabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importNote, setImportNote] = useState<string | null>(null);

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

  async function importFromScreenshot(file: File) {
    setImportError(null);
    setImportNote(null);
    if (!file.type.startsWith("image/")) {
      setImportError("Please choose an image file.");
      return;
    }
    setImporting(true);
    try {
      const imageBase64 = await fileToResizedJpeg(file);
      const res = await extractMeetingFromScreenshot({ imageBase64, mediaType: "image/jpeg" });
      if ("error" in res) {
        setImportError(res.error);
        return;
      }
      const p = res.prefill;
      if (!p.isMeeting) {
        setImportError("That didn't look like a meeting screenshot. Try another, or just fill it in below.");
        return;
      }
      if (p.type) setType(p.type as MeetingTypeCode);
      if (p.title) setTitle(p.title);
      if (p.goal) setGoal(p.goal);
      setDate(p.date || "");
      setTime(p.startMinute != null ? minuteToTimeInput(p.startMinute) : "");
      if (p.durationMin != null) setDuration(p.durationMin);
      const known = new Set(others.map((o) => o.id));
      setSelected(new Set(p.attendeeIds.filter((id) => known.has(id))));
      const bits = ["Pulled the details from your screenshot. Review everything below before saving."];
      if (p.otherAttendees.length) {
        bits.push(`Not on your team (add manually if needed): ${p.otherAttendees.join(", ")}.`);
      }
      setImportNote(bits.join(" "));
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not read that screenshot.");
    } finally {
      setImporting(false);
    }
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
      {/* Screenshot import (create only) */}
      {visionEnabled && mode === "create" && (
        <section className="card p-5" style={{ borderColor: "var(--color-brand-200)" }}>
          <h2 className="font-semibold mb-1 flex items-center gap-2"><Spark /> Start from a screenshot</h2>
          <p className="text-sm text-stone-500 mb-3">
            Have a calendar invite? Drop in a screenshot and Claude will read the title, date,
            time, and attendees to pre-fill this for you.
          </p>
          <label
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed py-6 px-4 text-center cursor-pointer transition-colors hover:bg-[var(--color-brand-50)]"
            style={{ borderColor: "var(--color-brand-200)" }}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFromScreenshot(f);
                e.target.value = "";
              }}
            />
            <span className="text-sm font-medium">{importing ? "Reading your screenshot…" : "Upload a screenshot"}</span>
            <span className="text-xs text-stone-400">PNG or JPG of a calendar event or invite</span>
          </label>
          <p
            className="text-xs mt-3 rounded-lg px-3 py-2"
            style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
          >
            Heads up: the image is sent to Claude to read the details. Don't upload anything
            sensitive, restricted, or CUI. Everything it fills in is yours to review and edit before saving.
          </p>
          {importError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-2">{importError}</p>
          )}
          {importNote && (
            <p className="text-sm mt-2 rounded-lg px-3 py-2" style={{ background: "rgba(34,197,94,0.12)", color: "#166534" }}>{importNote}</p>
          )}
        </section>
      )}

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

function Spark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
