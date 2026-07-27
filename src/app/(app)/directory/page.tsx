import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTeamMemberRows } from "@/lib/team-data";
import { getActiveTeamContext } from "@/lib/active-team";
import { StatusPill, SharePill, StaleFlag, LeaderPill, NoTeam } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

export default async function DirectoryPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const members = await getTeamMemberRows(activeTeam.id);
  const canLead = activeTeam.role === "LEADER" || user.role === "ADMIN";

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{activeTeam.name}</h1>
            <span className="text-sm text-stone-400">{members.length} people</span>
          </div>
          <p className="text-stone-500 mt-1">
            Open anyone's shared profile to see how they work.
          </p>
        </div>
        <Link href="/compare" className="btn btn-secondary shrink-0">
          Compare two people
        </Link>
      </header>

      <div className="grid sm:grid-cols-2 gap-3">
        {members.map((m) => {
          const viewable = m.status === "completed" && (m.shared || m.id === user.id);
          const Card = (
            <div className="card p-4 h-full flex items-start gap-3 transition-shadow hover:shadow-sm">
              <span
                className="grid place-items-center w-11 h-11 rounded-full text-sm font-bold shrink-0"
                style={{ background: avatarColor(m.name), color: avatarInkColor(m.name) }}
                aria-hidden
              >
                {initials(m.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">{m.name}</span>
                  {m.teamRole === "LEADER" && <LeaderPill />}
                  {m.id === user.id && (
                    <span className="pill bg-stone-100 text-stone-500 text-[10px]">You</span>
                  )}
                </div>
                <p className="text-sm text-stone-500 truncate">{m.title ?? "Team member"}</p>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {/* Members see share state (so they know what they can open);
                      per-person completion status stays a leader-level detail. */}
                  {m.status === "completed" && <SharePill shared={m.shared} />}
                  {canLead && m.status !== "completed" && <StatusPill status={m.status} />}
                  {canLead && m.stale && <StaleFlag />}
                </div>
              </div>
            </div>
          );
          return viewable ? (
            <Link key={m.id} href={m.id === user.id ? "/me" : `/profile/${m.id}`} className="block">
              {Card}
            </Link>
          ) : (
            <div key={m.id} className="opacity-90">
              {Card}
            </div>
          );
        })}
      </div>
    </div>
  );
}
