"use client";

import { useState } from "react";
import Link from "next/link";
import { generateMyCoaching, askMyCoach } from "@/app/actions";
import type { CoachingPlan, CoachAnswer } from "@/lib/coach";
import { workingWith, type Member } from "@/lib/team";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
      style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function NumberBadge({ n }: { n: number }) {
  return (
    <span
      className="mt-0.5 grid place-items-center w-5 h-5 rounded-full shrink-0 text-[11px] font-bold"
      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
    >
      {n}
    </span>
  );
}

/* ---- Relational: how do I work with a teammate? ------------------------- */
function WorkingWith({ viewer, teammates }: { viewer: Member; teammates: Member[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = teammates.find((t) => t.id === selectedId) ?? null;
  const guide = selected ? workingWith(viewer, selected) : null;

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold">Working with a teammate</h2>
      <p className="text-sm text-stone-500 mt-1">
        Pick someone on your team to see where your styles differ, and a few concrete
        things to try. Built from their shared profile, right here, nothing sent anywhere.
      </p>

      <div className="mt-4 flex flex-wrap gap-2" role="list">
        {teammates.map((t) => {
          const on = t.id === selectedId;
          return (
            <button
              key={t.id}
              role="listitem"
              onClick={() => setSelectedId(on ? null : t.id)}
              aria-pressed={on}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-medium transition-colors"
              style={{
                background: on ? "var(--accent-soft)" : "var(--surface-2)",
                color: on ? "var(--accent-soft-text)" : "var(--color-ink)",
                boxShadow: on ? "inset 0 0 0 1px var(--accent-border)" : "inset 0 0 0 1px var(--color-border)",
              }}
            >
              <span
                className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold"
                style={{ background: avatarColor(t.name), color: avatarInkColor(t.name) }}
                aria-hidden
              >
                {initials(t.name)}
              </span>
              {t.name.split(/\s+/)[0]}
            </button>
          );
        })}
      </div>

      {guide && (
        <div className="mt-5 pt-5 border-t border-stone-100">
          <p className="text-lg font-semibold leading-snug">{guide.headline}</p>
          <p className="text-sm text-stone-600 mt-2 leading-relaxed">{guide.read}</p>

          {guide.moves.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wide text-stone-400 mb-3">
                Try these
              </h3>
              <ul className="space-y-3">
                {guide.moves.map((m, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <NumberBadge n={i + 1} />
                    <span className="text-sm leading-relaxed">
                      <span className="font-semibold">{m.trait}. </span>
                      <span className="text-stone-600">{m.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/compare" className="btn btn-secondary py-1.5 text-sm">
              Compare in detail
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---- Self coaching plan (AI) -------------------------------------------- */
function GrowthEdge({ edge }: { edge: CoachingPlan["growthEdges"][number] }) {
  const [open, setOpen] = useState(false);
  const count = edge.experiments.length;
  return (
    <div className="card p-5">
      <p className="font-semibold">{edge.title}</p>
      <p className="text-sm text-stone-500 mt-1 leading-relaxed">{edge.why}</p>
      {count > 0 && (
        <>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--accent-text)" }}
          >
            {open ? "Hide experiments" : `Show ${count} thing${count > 1 ? "s" : ""} to try this week`}
            <Chevron open={open} />
          </button>
          {open && (
            <ul className="mt-3 space-y-2">
              {edge.experiments.map((x, j) => (
                <li key={j} className="flex items-start gap-2.5 text-sm">
                  <NumberBadge n={j + 1} />
                  <span className="leading-relaxed">{x}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function Coach({
  hasProfile,
  enabled,
  initialPlan,
  generatedAt,
  viewer,
  teammates,
}: {
  hasProfile: boolean;
  enabled: boolean;
  initialPlan: CoachingPlan | null;
  generatedAt: string | null;
  viewer: Member | null;
  teammates: Member[];
}) {
  const [plan, setPlan] = useState<CoachingPlan | null>(initialPlan);
  const [when, setWhen] = useState<string | null>(generatedAt);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<CoachAnswer | null>(null);
  const [askError, setAskError] = useState<string | null>(null);

  if (!hasProfile) {
    return (
      <div className="card p-8 text-center">
        <h2 className="text-lg font-bold">Your coach needs your profile first</h2>
        <p className="text-stone-500 mt-2 max-w-md mx-auto">
          Take the 10-to-15 minute working-style assessment. Your coach uses it to
          give advice that actually fits how you work.
        </p>
        <Link href="/assessment" className="btn btn-primary mt-6">
          Start assessment
        </Link>
      </div>
    );
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    const res = await generateMyCoaching();
    setGenerating(false);
    if ("error" in res) setError(res.error);
    else {
      setPlan(res.plan);
      setWhen(new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }));
    }
  }

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setAsking(true);
    setAskError(null);
    setAnswer(null);
    const res = await askMyCoach(question);
    setAsking(false);
    if ("error" in res) setAskError(res.error);
    else setAnswer(res.answer);
  }

  return (
    <div className="space-y-6">
      {/* Relational front door — deterministic, always available */}
      {viewer && teammates.length > 0 && (
        <WorkingWith viewer={viewer} teammates={teammates} />
      )}

      {/* Your own working style (AI) */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold">Your working style</h2>

        {!enabled ? (
          <div className="card p-5">
            <p className="text-sm text-stone-500">
              Personal coaching on your own profile uses Claude. An admin needs to set{" "}
              <code style={{ color: "var(--accent-text)" }}>ANTHROPIC_API_KEY</code> in
              the app environment to switch it on. Working with a teammate, above, works
              without it.
            </p>
          </div>
        ) : !plan ? (
          <div className="card p-8 text-center">
            <div
              className="inline-grid place-items-center w-12 h-12 rounded-2xl mb-4"
              style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
            >
              <SparkIcon />
            </div>
            <h3 className="text-lg font-bold">Get your personal coaching plan</h3>
            <p className="text-stone-500 mt-2 max-w-md mx-auto">
              Your coach reads your working-style profile and gives you strengths to
              lean into and a few concrete experiments to try this week.
            </p>
            <button className="btn btn-primary mt-6" onClick={generate} disabled={generating}>
              {generating ? "Your coach is thinking…" : "Generate my plan"}
            </button>
            {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
          </div>
        ) : (
          <>
            <div className="card p-6">
              <div className="flex items-start gap-3">
                <span
                  className="inline-grid place-items-center w-9 h-9 rounded-xl shrink-0"
                  style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                >
                  <SparkIcon />
                </span>
                <div>
                  <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">
                    In a sentence
                  </p>
                  <p className="text-lg font-semibold leading-snug mt-1">{plan.headline}</p>
                </div>
              </div>
            </div>

            {plan.strengths.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-stone-400 mb-3">
                  Lean into these
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {plan.strengths.map((s, i) => (
                    <div key={i} className="card p-4">
                      <p className="font-semibold text-sm">{s.title}</p>
                      <p className="text-sm text-stone-500 mt-1 leading-relaxed">{s.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {plan.growthEdges.length > 0 && (
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wide text-stone-400 mb-3">
                  Growth edges to try
                </h3>
                <div className="space-y-3">
                  {plan.growthEdges.map((edge, i) => (
                    <GrowthEdge key={i} edge={edge} />
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
              <p className="text-xs text-stone-400">
                {when ? `Generated ${when}. ` : ""}Grounded in your own profile. Private to you.
              </p>
              <button className="btn btn-secondary py-1.5 text-sm" onClick={generate} disabled={generating}>
                {generating ? "Thinking…" : "Regenerate"}
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
          </>
        )}
      </section>

      {/* Ask your coach (AI) */}
      {enabled && (
        <section className="card p-5">
          <h2 className="font-bold">Ask your coach</h2>
          <p className="text-sm text-stone-500 mt-1">
            Describe a real situation. For example: &ldquo;I keep clashing with a
            teammate who wants everything decided in a meeting,&rdquo; or &ldquo;I want
            to delegate more but struggle to let go.&rdquo;
          </p>
          <form onSubmit={ask} className="mt-3 space-y-3">
            <textarea
              className="input"
              rows={3}
              maxLength={1000}
              placeholder="What's on your mind at work?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary" disabled={asking || question.trim().length < 5}>
                {asking ? "Thinking…" : "Ask"}
              </button>
            </div>
          </form>
          {askError && <p className="text-sm text-red-400 mt-1">{askError}</p>}
          {answer && (
            <div className="mt-2 rounded-xl p-4" style={{ background: "var(--color-elevated)" }}>
              <p className="text-sm leading-relaxed">{answer.advice}</p>
              {answer.suggestions.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {answer.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <span
                        className="mt-0.5 grid place-items-center w-5 h-5 rounded-full shrink-0"
                        style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
