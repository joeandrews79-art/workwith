"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PRESENTATION_ORDER } from "@/lib/ipip";
import { Responses } from "@/lib/scoring";
import { saveProgress, completeAssessment } from "@/app/actions";

const OPTIONS = [
  { v: 1, label: "Very inaccurate" },
  { v: 2, label: "Moderately inaccurate" },
  { v: 3, label: "Neither" },
  { v: 4, label: "Moderately accurate" },
  { v: 5, label: "Very accurate" },
];

function statement(text: string): string {
  return "I " + text.charAt(0).toLowerCase() + text.slice(1);
}

export default function Assessment({
  assessmentId,
  initialResponses,
}: {
  assessmentId: string;
  initialResponses: Responses;
}) {
  const router = useRouter();
  const items = PRESENTATION_ORDER;
  const total = items.length;

  const [responses, setResponses] = useState<Responses>(initialResponses);
  const firstUnanswered = useMemo(() => {
    const i = items.findIndex((it) => !initialResponses[it.id]);
    return i === -1 ? total - 1 : i;
  }, [items, initialResponses, total]);
  const [idx, setIdx] = useState(firstUnanswered);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const answeredCount = useMemo(
    () => items.filter((it) => responses[it.id]).length,
    [items, responses],
  );
  const allAnswered = answeredCount === total;

  // --- Autosave (debounced) ---
  const latest = useRef(responses);
  latest.current = responses;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async () => {
    setSaving("saving");
    const res = await saveProgress(assessmentId, latest.current);
    setSaving(res && "ok" in res ? "saved" : "idle");
  }, [assessmentId]);

  const scheduleSave = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 700);
  }, [flush]);

  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);

  const answer = useCallback(
    (value: number) => {
      const item = items[idx];
      setResponses((r) => ({ ...r, [item.id]: value }));
      setSaving("idle");
      scheduleSave();
      // auto-advance
      if (idx < total - 1) {
        setTimeout(() => setIdx((i) => Math.min(i + 1, total - 1)), 160);
      }
    },
    [idx, items, total, scheduleSave],
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (reviewing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "5") answer(Number(e.key));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(total - 1, i + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, total, reviewing]);

  async function onFinish() {
    setSubmitting(true);
    setError(null);
    if (timer.current) clearTimeout(timer.current);
    await saveProgress(assessmentId, latest.current);
    const res = await completeAssessment(assessmentId, latest.current);
    if (res && "error" in res && res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }
    router.push("/me?new=1");
  }

  const item = items[idx];
  const current = responses[item.id];
  const pct = Math.round((answeredCount / total) * 100);

  // --- Review / finish screen ---
  if (reviewing || (allAnswered && idx === total - 1 && current)) {
    return (
      <div className="max-w-xl mx-auto">
        <ProgressHeader answeredCount={answeredCount} total={total} pct={pct} saving={saving} />
        <div className="card p-6 sm:p-8 text-center mt-4">
          <div
            className="mx-auto w-12 h-12 rounded-full grid place-items-center mb-4 text-white"
            style={{ background: "#16a34a" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-xl font-bold">All {total} statements answered</h2>
          <p className="text-stone-500 mt-2">
            Finish to generate your working-style profile. You can review and
            lightly edit the wording before you share it.
          </p>
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-4">
              {error}
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center mt-6">
            <button
              className="btn btn-secondary"
              onClick={() => {
                setReviewing(false);
                setIdx(0);
              }}
            >
              Review my answers
            </button>
            <button className="btn btn-primary" onClick={onFinish} disabled={submitting}>
              {submitting ? "Generating…" : "Finish & see my profile"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <ProgressHeader answeredCount={answeredCount} total={total} pct={pct} saving={saving} />

      <div className="card p-6 sm:p-8 mt-4">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">
          Statement {idx + 1} of {total}
        </p>
        <fieldset>
          <legend className="text-lg sm:text-xl font-semibold leading-snug mb-1">
            {statement(item.text)}
          </legend>
          <p className="text-sm text-stone-400 mb-5">
            How accurately does this describe you, generally?
          </p>
          <div className="grid gap-2">
            {OPTIONS.map((o) => {
              const selected = current === o.v;
              return (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => answer(o.v)}
                  aria-pressed={selected}
                  className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                  style={{
                    borderColor: selected ? "var(--color-brand-600)" : "var(--color-border)",
                    background: selected ? "var(--color-brand-50)" : "var(--color-elevated)",
                  }}
                >
                  <span
                    className="grid place-items-center w-6 h-6 rounded-full border text-xs font-bold shrink-0"
                    style={{
                      borderColor: selected ? "var(--color-brand-600)" : "var(--color-border)",
                      background: selected ? "var(--color-brand-600)" : "transparent",
                      color: selected ? "#0a0f1e" : "var(--color-muted)",
                    }}
                  >
                    {o.v}
                  </span>
                  <span className={selected ? "font-semibold" : ""}>{o.label}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="flex items-center justify-between mt-6">
          <button
            className="btn btn-ghost"
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
          >
            ← Previous
          </button>
          {allAnswered ? (
            <button className="btn btn-primary" onClick={() => setReviewing(true)}>
              Review & finish
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
              disabled={idx === total - 1}
            >
              Next →
            </button>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-stone-400 mt-4">
        Tip: press keys 1 to 5 to answer, or use the arrow keys to move.
      </p>
    </div>
  );
}

function ProgressHeader({
  answeredCount,
  total,
  pct,
  saving,
}: {
  answeredCount: number;
  total: number;
  pct: number;
  saving: "idle" | "saving" | "saved";
}) {
  return (
    <div className="sticky top-14 z-10 bg-paper/95 backdrop-blur py-3" style={{ background: "var(--color-paper)" }}>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="font-medium">
          {answeredCount} of {total} answered
        </span>
        <span className="text-xs text-stone-400">
          {saving === "saving" ? "Saving…" : saving === "saved" ? "Progress saved" : `${pct}%`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--color-brand-600)" }}
        />
      </div>
    </div>
  );
}
