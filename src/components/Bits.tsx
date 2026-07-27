import { MemberStatus } from "@/lib/team-data";

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function StatusPill({ status }: { status: MemberStatus }) {
  const map: Record<MemberStatus, { label: string; cls: string }> = {
    completed: { label: "Completed", cls: "bg-green-50 text-green-700" },
    in_progress: { label: "In progress", cls: "bg-amber-50 text-amber-700" },
    not_started: { label: "Not started", cls: "bg-stone-100 text-stone-500" },
  };
  const s = map[status];
  return <span className={`pill ${s.cls}`}>{s.label}</span>;
}

export function SharePill({ shared }: { shared: boolean }) {
  return shared ? (
    <span className="pill bg-brand-50 text-brand-700" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>
      Shared
    </span>
  ) : (
    <span className="pill bg-stone-100 text-stone-500">Private</span>
  );
}

/** Shown on team-scoped pages when the viewer belongs to no team yet. */
export function NoTeam() {
  return (
    <div className="card p-8 text-center max-w-md mx-auto mt-8">
      <p className="font-semibold">You're not on a team yet</p>
      <p className="text-sm text-stone-500 mt-1">
        Ask an admin to add you to a team. Once you're on one, your dashboard and
        team views will appear here.
      </p>
    </div>
  );
}

/** A small "Leader" tag for someone who leads the team being viewed. */
export function LeaderPill() {
  return (
    <span
      className="pill text-[10px]"
      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
      title="Leads this team"
    >
      Leader
    </span>
  );
}

export function StaleFlag() {
  return (
    <span className="pill bg-orange-50 text-orange-700" title="Older than 12 months">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
        <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      </svg>
      Refresh due
    </span>
  );
}
