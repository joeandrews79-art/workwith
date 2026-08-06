"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { brainstormMeetings, createThought, createMeetingFromIdea, BrainstormedIdea } from "@/app/actions";

export default function BrainstormMeetings() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [ideas, setIdeas] = useState<BrainstormedIdea[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<Set<number>>(new Set());
  const [busyIdx, setBusyIdx] = useState<number | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const res = await brainstormMeetings(prompt);
      if ("error" in res) setError(res.error);
      else {
        setIdeas(res.ideas);
        setCaptured(new Set());
      }
    });
  }

  function capture(idx: number) {
    const idea = ideas![idx];
    setError(null);
    setBusyIdx(idx);
    startTransition(async () => {
      const res = await createThought({ text: idea.title, detail: idea.goal || null, meetingType: idea.meetingType });
      setBusyIdx(null);
      if ("error" in res && res.error) setError(res.error);
      else {
        setCaptured((s) => new Set(s).add(idx));
        router.refresh();
      }
    });
  }

  function create(idx: number) {
    const idea = ideas![idx];
    setError(null);
    setBusyIdx(idx);
    startTransition(async () => {
      const res = await createMeetingFromIdea({
        title: idea.title,
        meetingType: idea.meetingType,
        goal: idea.goal || null,
        attendeeIds: idea.attendeeIds,
      });
      setBusyIdx(null);
      if ("error" in res) setError(res.error);
      else router.push(`/meeting/${res.id}`);
    });
  }

  return (
    <section className="card p-5" style={{ borderColor: "var(--color-brand-200)" }}>
      <h2 className="font-semibold flex items-center gap-2"><Spark /> Brainstorm meetings</h2>
      <p className="text-sm text-muted mt-0.5 mb-3">
        Not sure what meeting you need? Describe what you're trying to move forward and Claude will
        suggest a few concrete meetings you could run.
      </p>
      <textarea
        className="input min-h-[70px]"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="e.g. We keep slipping on the launch and no one owns the timeline."
      />
      <div className="flex items-center gap-3 mt-3">
        <button className="btn btn-primary" disabled={pending || prompt.trim().length < 5} onClick={generate}>
          {pending && !ideas ? "Thinking…" : ideas ? "Regenerate" : "Suggest meetings"}
        </button>
        <span className="text-[11px] text-faint">Sends your prompt and teammate names to Claude. No profiles are sent.</span>
      </div>

      {error && <p className="text-sm text-danger mt-3">{error}</p>}

      {ideas && ideas.length > 0 && (
        <div className="mt-4 space-y-3">
          {ideas.map((idea, i) => (
            <div key={i} className="rounded-xl border p-4" style={{ borderColor: "#e2ddd4" }}>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{idea.title}</span>
                <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>{idea.meetingTypeLabel}</span>
              </div>
              {idea.goal && <p className="text-sm text-ink-soft mt-1">{idea.goal}</p>}
              {idea.why && <p className="text-xs text-faint mt-1">{idea.why}</p>}
              {idea.attendeeNames.length > 0 && (
                <p className="text-xs text-muted mt-2">Suggested: {idea.attendeeNames.join(", ")}</p>
              )}
              <div className="flex items-center gap-2 mt-3">
                <button
                  className="btn btn-secondary py-1 px-3 text-sm"
                  disabled={pending || captured.has(i)}
                  onClick={() => capture(i)}
                >
                  {captured.has(i) ? "Captured ✓" : busyIdx === i ? "…" : "Capture as thought"}
                </button>
                <button
                  className="btn btn-primary py-1 px-3 text-sm"
                  disabled={pending}
                  onClick={() => create(i)}
                >
                  {busyIdx === i ? "…" : "Create meeting"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ideas && ideas.length === 0 && (
        <p className="text-sm text-muted mt-3">No ideas came back. Try describing the situation a little differently.</p>
      )}
    </section>
  );
}

function Spark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-600)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}
