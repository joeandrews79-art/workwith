"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { generateMyTeamRead } from "@/app/actions";
import type { TeamReadResult } from "@/lib/team-read";

export default function TeamReadCard({
  initial,
  canGenerate,
  stale,
}: {
  initial: TeamReadResult | null;
  canGenerate: boolean;
  stale: boolean;
}) {
  const [read, setRead] = useState<TeamReadResult | null>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const autoRan = useRef(false);

  function run() {
    setError(null);
    startTransition(async () => {
      const res = await generateMyTeamRead();
      if ("error" in res) setError(res.error);
      else setRead(res.read);
    });
  }

  // Fully automatic: generate the read the first time it's missing, and refresh
  // it whenever the team has changed (stale). No manual button. Runs once per
  // mount; the card is keyed by team so a switch remounts and re-evaluates.
  useEffect(() => {
    if (canGenerate && (!read || stale) && !autoRan.current) {
      autoRan.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale, canGenerate]);

  if (!read) {
    return (
      <div
        className="card p-5"
        style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
      >
        <p className="font-semibold flex items-center gap-2">
          <Spark /> {error ? "Your team read" : "Generating your team read…"}
        </p>
        <p className="text-sm text-ink-soft mt-1 max-w-xl">
          A short, personal read of where you sit in this team and how to work well given that
          position. Uses your scores and the team's averages only, no teammate is named.
        </p>
        {error && <p className="text-sm text-danger mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card p-5" style={{ borderColor: "var(--color-brand-200)" }}>
      <p className="font-semibold flex items-center gap-2">
        <Spark /> {read.headline}
      </p>
      {pending && (
        <p className="text-xs mt-1.5" style={{ color: "var(--color-brand-700)" }}>
          Your team changed. Updating your read…
        </p>
      )}
      <p className="text-sm text-ink-soft mt-2 leading-relaxed">{read.summary}</p>
      {read.tips.length > 0 && (
        <ul className="mt-4 space-y-2.5">
          {read.tips.map((t, i) => (
            <li key={i} className="flex gap-2.5 text-sm">
              <span
                className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                style={{ background: "var(--color-brand-600)" }}
                aria-hidden
              />
              <span className="leading-relaxed">
                <span className="font-medium">{t.title}.</span> {t.detail}
              </span>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <p className="text-[11px] text-faint mt-3">
        Written by Claude from your scores and the team's averages. No teammate's data was sent.
      </p>
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
