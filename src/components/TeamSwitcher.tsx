"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { setActiveTeam } from "@/app/actions";

interface TeamRef {
  id: string;
  name: string;
}

/**
 * The active-team switcher in the sidebar. Shows the current team and, when the
 * user belongs to more than one, lets them switch. Switching sets a cookie
 * (server action) and refreshes so every team-scoped view re-resolves.
 */
export default function TeamSwitcher({
  teams,
  activeTeamId,
}: {
  teams: TeamRef[];
  activeTeamId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  if (teams.length === 0) return null;

  const active =
    teams.find((t) => t.id === (optimisticId ?? activeTeamId)) ?? teams[0];
  const canSwitch = teams.length > 1;

  function choose(id: string) {
    setOpen(false);
    if (id === active.id) return;
    // Show the new team immediately; the server action's layout revalidation
    // re-renders the page content in a single round trip (no extra refresh).
    setOptimisticId(id);
    startTransition(async () => {
      const res = await setActiveTeam(id);
      if (res && "error" in res) setOptimisticId(null); // revert on failure
    });
  }

  return (
    <div className="relative px-2 pt-2" ref={ref}>
      <button
        onClick={() => canSwitch && setOpen((o) => !o)}
        disabled={!canSwitch || pending}
        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors"
        style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)", cursor: canSwitch ? "pointer" : "default" }}
        aria-haspopup={canSwitch ? "menu" : undefined}
        aria-expanded={canSwitch ? open : undefined}
        aria-label={canSwitch ? "Switch team" : `Current team: ${active.name}`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0" aria-hidden>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] uppercase tracking-wide opacity-70 leading-none">Team</span>
          <span className="block text-sm font-semibold truncate leading-tight">{active.name}</span>
        </span>
        {canSwitch && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 opacity-60" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        )}
      </button>

      {open && canSwitch && (
        <div role="menu" className="card absolute left-2 right-2 mt-1 p-1.5 shadow-lg z-30">
          <p className="px-3 pt-1 pb-1.5 text-[11px] uppercase tracking-wide text-faint">Your teams</p>
          {teams.map((t) => {
            const on = t.id === active.id;
            return (
              <button
                key={t.id}
                role="menuitem"
                onClick={() => choose(t.id)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-2 flex items-center gap-2"
                style={on ? { color: "var(--color-brand-700)", fontWeight: 600 } : { color: "var(--color-muted)" }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0" style={{ opacity: on ? 1 : 0 }} aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
