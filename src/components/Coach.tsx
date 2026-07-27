"use client";

import { useState } from "react";
import Link from "next/link";
import { generateMyCoaching, askMyCoach } from "@/app/actions";
import type { CoachingPlan, CoachAnswer } from "@/lib/coach";

function SparkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
    </svg>
  );
}

export default function Coach({
  hasProfile,
  enabled,
  initialPlan,
  generatedAt,
}: {
  hasProfile: boolean;
  enabled: boolean;
  initialPlan: CoachingPlan | null;
  generatedAt: string | null;
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

  if (!enabled) {
    return (
      <div className="card p-6">
        <h2 className="font-bold">Coaching isn&apos;t turned on yet</h2>
        <p className="text-stone-500 text-sm mt-2">
          The coach uses Claude to turn your profile into personal advice. An admin
          needs to set <code className="text-brand-700">ANTHROPIC_API_KEY</code> in
          the app environment to switch it on.
        </p>
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
      {/* Empty state: no plan yet */}
      {!plan && (
        <div className="card p-8 text-center">
          <div
            className="inline-grid place-items-center w-12 h-12 rounded-2xl mb-4"
            style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
          >
            <SparkIcon />
          </div>
          <h2 className="text-lg font-bold">Get your personal coaching plan</h2>
          <p className="text-stone-500 mt-2 max-w-md mx-auto">
            Your coach reads your working-style profile and gives you strengths to
            lean into and a few concrete experiments to try this week.
          </p>
          <button className="btn btn-primary mt-6" onClick={generate} disabled={generating}>
            {generating ? "Your coach is thinking…" : "Generate my plan"}
          </button>
          {error && <p className="text-sm text-red-400 mt-3">{error}</p>}
        </div>
      )}

      {/* The plan */}
      {plan && (
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
                  Your working style
                </p>
                <p className="text-lg font-semibold leading-snug mt-1">{plan.headline}</p>
              </div>
            </div>
          </div>

          {plan.strengths.length > 0 && (
            <section>
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
            </section>
          )}

          {plan.growthEdges.length > 0 && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wide text-stone-400 mb-3">
                Growth edges to try
              </h3>
              <div className="space-y-3">
                {plan.growthEdges.map((edge, i) => (
                  <div key={i} className="card p-5">
                    <p className="font-semibold">{edge.title}</p>
                    <p className="text-sm text-stone-500 mt-1 leading-relaxed">{edge.why}</p>
                    {edge.experiments.length > 0 && (
                      <ul className="mt-3 space-y-2">
                        {edge.experiments.map((x, j) => (
                          <li key={j} className="flex items-start gap-2.5 text-sm">
                            <span
                              className="mt-0.5 grid place-items-center w-5 h-5 rounded-full shrink-0 text-[11px] font-bold"
                              style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                            >
                              {j + 1}
                            </span>
                            <span className="leading-relaxed">{x}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>
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

      {/* Ask your coach */}
      <section className="card p-5">
        <h3 className="font-bold">Ask your coach</h3>
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
    </div>
  );
}
