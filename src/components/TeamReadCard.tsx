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

  // The team changed since this read was written. Refresh it automatically,
  // once, so the user always sees an up-to-date read without lifting a finger.
  useEffect(() => {
    if (stale && read && canGenerate && !autoRan.current) {
      autoRan.current = true;
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stale, canGenerate]);

  const updating = stale && pending;

  if (!read) {
    return (
      <div
        className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
        style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
      >
        <div>
          <p className="font-semibold flex items-center gap-2">
            <Spark /> Your team read
          </p>
          <p className="text-sm text-stone-600 mt-1 max-w-xl">
            A short, personal read of where you sit in this team and how to work well given that
            position. Uses your scores and the team's averages only, no teammate is named.
          </p>
          {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
        </div>
        <button className="btn btn-primary shrink-0" disabled={pending || !canGenerate} onClick={run}>
          {pending ? "Reading…" : "Generate"}
        </button>
      </div>
    );
  }

  return (
    <div className="card p-5" style={{ borderColor: "var(--color-brand-200)" }}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold flex items-center gap-2">
          <Spark /> {read.headline}
        </p>
        <button className="btn btn-ghost py-1 px-2 text-xs shrink-0" disabled={pending} onClick={run}>
          {pending ? "…" : "Refresh"}
        </button>
      </div>
      {stale && (
        <p className="text-xs mt-1.5" style={{ color: "var(--color-brand-700)" }}>
          {updating
            ? "Your team changed. Updating your read…"
            : "Your team has changed since this was written. Refresh for an up-to-date read."}
        </p>
      )}
      <p className="text-sm text-stone-600 mt-2 leading-relaxed">{read.summary}</p>
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
      {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      <p className="text-[11px] text-stone-400 mt-3">
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
