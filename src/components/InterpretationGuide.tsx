"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateMyInterpretation } from "@/app/actions";
import type { InterpretationResult } from "@/lib/interpret";

const LEVEL_STYLE: Record<string, string> = {
  Higher: "var(--color-brand-700)",
  Lower: "var(--color-brand-700)",
  Balanced: "var(--color-muted)",
};

export default function InterpretationGuide({ initial }: { initial: InterpretationResult | null }) {
  const [guide, setGuide] = useState<InterpretationResult | null>(initial);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateMyInterpretation();
      if ("error" in res) setError(res.error);
      else setGuide(res.interpretation);
    });
  }

  // Fully automatic: write the read the first time it's missing. A retake
  // clears it, so it regenerates itself on the next visit.
  useEffect(() => {
    if (!guide && !autoRan.current) {
      autoRan.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="card p-5">
      <div>
        <h2 className="font-semibold flex items-center gap-2"><Spark /> What your scores mean</h2>
        <p className="text-sm text-muted mt-0.5">
          A plain-language read of each trait, so your results are clear, not just numbers.
        </p>
      </div>

      {error && <p className="text-sm text-danger mt-3">{error}</p>}

      {!guide ? (
        <div className="mt-4">
          <p className="text-sm text-muted">
            {error ? "" : "Writing your read…"}
          </p>
          <p className="text-[11px] text-faint mt-2">
            Written by Claude from your own scores only. Nothing about anyone else is sent.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          {guide.intro && <p className="text-sm text-ink-soft leading-relaxed">{guide.intro}</p>}
          <ul className="mt-3 space-y-3">
            {guide.traits.map((t, i) => (
              <li key={i} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{t.name}</span>
                  <span
                    className="pill text-[10px]"
                    style={{ background: "var(--color-brand-50)", color: LEVEL_STYLE[t.level] ?? "var(--color-brand-700)" }}
                  >
                    {t.level}
                  </span>
                </div>
                <p className="text-sm text-ink-soft mt-1 leading-relaxed">{t.meaning}</p>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-faint mt-3">Written by Claude from your own scores.</p>
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
