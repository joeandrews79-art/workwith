import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTeamOverview } from "@/lib/team-data";
import { formatDate, StatusPill, SharePill, StaleFlag } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { TOTAL_ITEMS } from "@/lib/ipip";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const rows = await getTeamOverview(user.orgId);

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const shared = rows.filter((r) => r.status === "completed" && r.shared).length;
  const stale = rows.filter((r) => r.stale);
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);

  const me = rows.find((r) => r.id === user.id)!;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Team dashboard</h1>
        <p className="text-stone-500 mt-1">
          Where the team stands on completing and sharing working-style profiles.
        </p>
      </header>

      {/* Your status */}
      <YourStatus me={me} />

      {/* Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric
          label="Completed"
          value={`${pct(completed)}%`}
          sub={`${completed} of ${total} · target 100%`}
          pct={pct(completed)}
        />
        <Metric
          label="Completed & shared"
          value={`${pct(shared)}%`}
          sub={`${shared} of ${total} visible to the team`}
          pct={pct(shared)}
        />
        <Metric
          label="Refresh due"
          value={`${stale.length}`}
          sub={stale.length ? "Profiles older than 12 months" : "Everyone is current"}
          tone={stale.length ? "warn" : "ok"}
        />
      </section>

      {stale.length > 0 && (
        <section className="card p-5 border-orange-200 bg-orange-50/40">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            <StaleFlag /> Annual refresh needed
          </h2>
          <p className="text-sm text-stone-600 mb-3">
            These profiles are older than 12 months. Ask them to retake the
            10-to-15 minute assessment so their profile stays accurate.
          </p>
          <ul className="flex flex-wrap gap-2">
            {stale.map((r) => (
              <li key={r.id}>
                <Link href={`/profile/${r.id}`} className="pill bg-white border border-orange-200 text-orange-800 hover:bg-orange-100">
                  {r.name} · last {formatDate(r.refreshedAt)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Completion table */}
      <section>
        <h2 className="font-semibold mb-3">Completion by person</h2>
        <div className="card divide-y divide-stone-100 overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid place-items-center w-9 h-9 rounded-full text-xs font-bold shrink-0"
                style={{ background: avatarColor(r.name), color: avatarInkColor(r.name) }}
                aria-hidden
              >
                {initials(r.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{r.name}</span>
                  {r.role === "ADMIN" && (
                    <span className="pill bg-stone-100 text-stone-500 text-[10px]">Admin</span>
                  )}
                  {r.id === user.id && (
                    <span className="pill bg-stone-100 text-stone-500 text-[10px]">You</span>
                  )}
                </div>
                <div className="text-xs text-stone-500 truncate">
                  {r.title ?? "Team member"}
                  {r.status === "completed" && ` · last refreshed ${formatDate(r.refreshedAt)}`}
                  {r.status === "in_progress" && ` · ${r.answered}/${TOTAL_ITEMS} answered`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.stale && <StaleFlag />}
                {r.status === "completed" && <SharePill shared={r.shared} />}
                <StatusPill status={r.status} />
                {r.status === "completed" && (r.shared || r.id === user.id) && (
                  <Link href={`/profile/${r.id}`} className="btn btn-secondary py-1 px-2.5 text-xs hidden sm:inline-flex">
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function YourStatus({ me }: { me: Awaited<ReturnType<typeof getTeamOverview>>[number] }) {
  if (me.status === "completed") {
    return (
      <section className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="font-semibold">Your profile is ready</h2>
          <p className="text-sm text-stone-500 mt-0.5">
            Last refreshed {formatDate(me.refreshedAt)}.{" "}
            {me.shared ? "It is shared with your team." : "It is currently private."}
          </p>
        </div>
        <Link href="/me" className="btn btn-primary shrink-0">
          {me.shared ? "View my profile" : "Review & share"}
        </Link>
      </section>
    );
  }
  return (
    <section
      className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between"
      style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
    >
      <div>
        <h2 className="font-semibold">
          {me.status === "in_progress" ? "Pick up where you left off" : "Start your working-style profile"}
        </h2>
        <p className="text-sm text-stone-600 mt-0.5">
          {me.status === "in_progress"
            ? `You have answered ${me.answered} of ${TOTAL_ITEMS}. Your progress is saved.`
            : "About 10 to 15 minutes. Your answers save as you go."}
        </p>
      </div>
      <Link href="/assessment" className="btn btn-primary shrink-0">
        {me.status === "in_progress" ? "Resume assessment" : "Start assessment"}
      </Link>
    </section>
  );
}

function Metric({
  label,
  value,
  sub,
  pct,
  tone = "brand",
}: {
  label: string;
  value: string;
  sub: string;
  pct?: number;
  tone?: "brand" | "warn" | "ok";
}) {
  const barColor =
    tone === "warn" ? "#ea580c" : tone === "ok" ? "#16a34a" : "var(--color-brand-600)";
  return (
    <div className="card p-5">
      <div className="text-sm text-stone-500">{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-stone-100 mt-3 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      )}
      <div className="text-xs text-stone-400 mt-2">{sub}</div>
    </div>
  );
}
