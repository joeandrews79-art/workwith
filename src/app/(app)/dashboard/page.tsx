import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getTeamMemberRows, OverviewRow } from "@/lib/team-data";
import { getMyMeetings } from "@/lib/meeting-data";
import { meetingType } from "@/lib/meeting-types";
import { ymd } from "@/lib/calendar";
import { getActiveTeamContext } from "@/lib/active-team";
import TodayMeetings, { TodayMeetingItem } from "@/components/TodayMeetings";
import {
  formatDate,
  StatusPill,
  SharePill,
  StaleFlag,
  LeaderPill,
  NoTeam,
} from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { TOTAL_ITEMS } from "@/lib/ipip";

export default async function DashboardPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const [rows, myMeetings] = await Promise.all([
    getTeamMemberRows(activeTeam.id),
    getMyMeetings(user.id),
  ]);
  const canLead = isAdmin(user) || activeTeam.role === "LEADER";

  const todayItems: TodayMeetingItem[] = myMeetings.map((m) => ({
    id: m.id,
    title: m.title,
    typeLabel: meetingType(m.type).label,
    day: m.scheduledFor ? ymd(m.scheduledFor) : null,
    startMinute: m.startMinute,
    durationMin: m.durationMin,
    teamName: m.teamName,
    people: m.attendees.length,
  }));

  const total = rows.length;
  const completed = rows.filter((r) => r.status === "completed").length;
  const shared = rows.filter((r) => r.status === "completed" && r.shared).length;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const me = rows.find((r) => r.id === user.id);

  return (
    <div className="space-y-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{activeTeam.name}</h1>
            {canLead && <LeaderPill />}
          </div>
          <p className="text-muted mt-1">
            {canLead
              ? "Where your team stands on completing and sharing working-style profiles."
              : "Your team and how far along everyone is, together."}
          </p>
        </div>
        {canLead && (
          <Link href="/teams/manage" className="btn btn-secondary py-1.5 text-sm shrink-0">
            Manage team
          </Link>
        )}
      </header>

      {me && <YourStatus me={me} />}

      <TodayMeetings meetings={todayItems} />

      {canLead ? (
        <LeaderView rows={rows} total={total} completed={completed} shared={shared} pct={pct} viewerId={user.id} />
      ) : (
        <MemberView rows={rows} total={total} completed={completed} shared={shared} pct={pct} viewerId={user.id} />
      )}
    </div>
  );
}

// --- Leader / admin view: full oversight -----------------------------------

function LeaderView({
  rows,
  total,
  completed,
  shared,
  pct,
  viewerId,
}: {
  rows: OverviewRow[];
  total: number;
  completed: number;
  shared: number;
  pct: (n: number) => number;
  viewerId: string;
}) {
  const stale = rows.filter((r) => r.stale);
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Metric label="Completed" value={`${pct(completed)}%`} sub={`${completed} of ${total} · target 100%`} pct={pct(completed)} />
        <Metric label="Completed & shared" value={`${pct(shared)}%`} sub={`${shared} of ${total} visible to the team`} pct={pct(shared)} />
        <Metric label="Refresh due" value={`${stale.length}`} sub={stale.length ? "Profiles older than 12 months" : "Everyone is current"} tone={stale.length ? "warn" : "ok"} />
      </section>

      {stale.length > 0 && (
        <section className="card p-5 border-warn-border bg-warn-soft/60">
          <h2 className="font-semibold flex items-center gap-2 mb-2">
            <StaleFlag /> Annual refresh needed
          </h2>
          <p className="text-sm text-ink-soft mb-3">
            These profiles are older than 12 months. Ask them to retake the
            10-to-15 minute assessment so their profile stays accurate.
          </p>
          <ul className="flex flex-wrap gap-2">
            {stale.map((r) => (
              <li key={r.id}>
                <Link href={`/profile/${r.id}`} className="pill bg-surface border border-warn-border text-warn hover:bg-warn-soft">
                  {r.name} · last {formatDate(r.refreshedAt)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Completion by person</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <Avatar name={r.name} avatar={r.avatar} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{r.name}</span>
                  {r.teamRole === "LEADER" && <LeaderPill />}
                  {r.id === viewerId && <span className="pill bg-surface-2 text-muted text-[10px]">You</span>}
                </div>
                <div className="text-xs text-muted truncate">
                  {r.title ?? "Team member"}
                  {r.status === "completed" && ` · last refreshed ${formatDate(r.refreshedAt)}`}
                  {r.status === "in_progress" && ` · ${r.answered}/${TOTAL_ITEMS} answered`}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {r.stale && <StaleFlag />}
                {r.status === "completed" && <SharePill shared={r.shared} />}
                <StatusPill status={r.status} />
                {r.status === "completed" && (r.shared || r.id === viewerId) && (
                  <Link href={r.id === viewerId ? "/me" : `/profile/${r.id}`} className="btn btn-secondary py-1 px-2.5 text-xs hidden sm:inline-flex">
                    View
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

// --- Member view: roster + team completion, no per-person oversight --------

function MemberView({
  rows,
  total,
  completed,
  shared,
  pct,
  viewerId,
}: {
  rows: OverviewRow[];
  total: number;
  completed: number;
  shared: number;
  pct: (n: number) => number;
  viewerId: string;
}) {
  return (
    <>
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Metric label="Team completed" value={`${pct(completed)}%`} sub={`${completed} of ${total} have finished`} pct={pct(completed)} />
        <Metric label="Shared with the team" value={`${pct(shared)}%`} sub={`${shared} profiles you can open`} pct={pct(shared)} />
      </section>

      <section>
        <h2 className="font-semibold mb-1">Who's on the team</h2>
        <p className="text-sm text-muted mb-3">
          Open anyone who has shared their profile to see how they like to work.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map((r) => {
            const viewable = r.status === "completed" && (r.shared || r.id === viewerId);
            const Card = (
              <div className="card p-4 h-full flex items-start gap-3 transition-shadow hover:shadow-sm">
                <Avatar name={r.name} avatar={r.avatar} size={11} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold truncate">{r.name}</span>
                    {r.teamRole === "LEADER" && <LeaderPill />}
                    {r.id === viewerId && <span className="pill bg-surface-2 text-muted text-[10px]">You</span>}
                  </div>
                  <p className="text-sm text-muted truncate">{r.title ?? "Team member"}</p>
                  {viewable && (
                    <div className="mt-2">
                      <SharePill shared />
                    </div>
                  )}
                </div>
              </div>
            );
            return viewable ? (
              <Link key={r.id} href={r.id === viewerId ? "/me" : `/profile/${r.id}`} className="block">
                {Card}
              </Link>
            ) : (
              <div key={r.id}>{Card}</div>
            );
          })}
        </div>
      </section>
    </>
  );
}

function Avatar({ name, avatar, size = 9 }: { name: string; avatar?: string | null; size?: number }) {
  const px = `${size * 4}px`;
  if (avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar} alt={name} className="rounded-full object-cover shrink-0" style={{ width: px, height: px }} />;
  }
  return (
    <span
      className="grid place-items-center rounded-full font-bold shrink-0"
      style={{
        width: px,
        height: px,
        fontSize: size >= 11 ? "0.875rem" : "0.75rem",
        background: avatarColor(name),
        color: avatarInkColor(name),
      }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function YourStatus({ me }: { me: OverviewRow }) {
  if (me.status === "completed") {
    return (
      <section className="card p-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
        <div>
          <h2 className="font-semibold">Your profile is ready</h2>
          <p className="text-sm text-muted mt-0.5">
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
        <p className="text-sm text-ink-soft mt-0.5">
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
  const barColor = tone === "warn" ? "#ea580c" : tone === "ok" ? "#16a34a" : "var(--color-brand-600)";
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="text-3xl font-bold mt-1 tabular-nums">{value}</div>
      {pct != null && (
        <div className="h-1.5 rounded-full bg-surface-2 mt-3 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: barColor }} />
        </div>
      )}
      <div className="text-xs text-faint mt-2">{sub}</div>
    </div>
  );
}
