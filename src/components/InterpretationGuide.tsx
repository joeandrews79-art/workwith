"use client";

import { useState, useTransition } from "react";
import { generateMyInterpretation } from "@/app/actions";
import type { InterpretationResult } from "@/lib/interpret";

const LEVEL_STYLE: Record<string, string> = {
  Higher: "var(--color-brand-700)",
  Lower: "var(--color-brand-700)",
  Balanced: "var(--color-muted)",
};

export default function InterpretationGuide({ initial }: { initial: InterpretationResult | null }) {
  const [guide, setGuide] = useState<InterpretationResult | null>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateMyInterpretation();
      if ("error" in res) setError(res.error);
      else setGuide(res.interpretation);
    });
  }

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold flex items-center gap-2"><Spark /> What your scores mean</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            A plain-language read of each trait, so your results are clear, not just numbers.
          </p>
        </div>
        {guide && (
          <button className="btn btn-ghost py-1 px-2 text-xs shrink-0" disabled={pending} onClick={run}>
            {pending ? "…" : "Refresh"}
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 mt-3">{error}</p>}

      {!guide ? (
        <div className="mt-4">
          <button className="btn btn-primary" disabled={pending} onClick={run}>
            {pending ? "Writing…" : "Explain my scores"}
          </button>
          <p className="text-[11px] text-stone-400 mt-2">
            Written by Claude from your own scores only. Nothing about anyone else is sent.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          {guide.intro && <p className="text-sm text-stone-600 leading-relaxed">{guide.intro}</p>}
          <ul className="mt-3 space-y-3">
            {guide.traits.map((t, i) => (
              <li key={i} className="border-t border-stone-100 pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  <span
                    className="pill text-[10px]"
                    style={{ background: "var(--color-brand-50)", color: LEVEL_STYLE[t.level] ?? "var(--color-brand-700)" }}
                  >
                    {t.level}
                  </span>
                </div>
                <p className="text-sm text-stone-600 mt-1 leading-relaxed">{t.meaning}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-stone-400 mt-3">Written by Claude from your own scores.</p>
        </div>
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
