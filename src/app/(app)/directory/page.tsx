import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getTeamsOverview } from "@/lib/team-data";
import { StatusPill, SharePill, StaleFlag } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

export default async function DirectoryPage() {
  const user = (await getCurrentUser())!;
  const teams = await getTeamsOverview(user.orgId);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-stone-500 mt-1">
            Open anyone's shared profile to see how they work.
          </p>
        </div>
        <Link href="/compare" className="btn btn-secondary shrink-0">
          Compare two people
        </Link>
      </header>

      {teams.map((team) => (
        <section key={team.id}>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="font-semibold">{team.name}</h2>
            <span className="text-sm text-stone-400">{team.members.length} people</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {team.members.map((m) => {
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
                      {m.id === user.id && (
                        <span className="pill bg-stone-100 text-stone-500 text-[10px]">You</span>
                      )}
                    </div>
                    <p className="text-sm text-stone-500 truncate">{m.title ?? "Team member"}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      <StatusPill status={m.status} />
                      {m.status === "completed" && <SharePill shared={m.shared} />}
                      {m.stale && <StaleFlag />}
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
        </section>
      ))}
    </div>
  );
}
