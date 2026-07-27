import { getCurrentUser } from "@/lib/auth";
import { getVisibleMembers } from "@/lib/team-data";
import { discussionPoints, teamStats } from "@/lib/team";
import { DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DOMAIN_COLOR } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function DiscussionPage() {
  const user = (await getCurrentUser())!;
  const members = await getVisibleMembers(user.orgId, user.id);
  const points = discussionPoints(members);
  const stats = members.length >= 2 ? teamStats(members) : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Discussion mode</h1>
        <p className="text-stone-500 mt-1">
          Talking points for a team session, drawn from the spread of profiles
          across everyone who has shared. Based on {members.length}{" "}
          {members.length === 1 ? "profile" : "profiles"}.
        </p>
      </header>

      {members.length < 2 ? (
        <p className="text-sm text-stone-500">
          Once at least two people have shared their profiles, this page will
          generate talking points for your next team session.
        </p>
      ) : (
        <>
          {/* Team spread */}
          {stats && (
            <section className="card p-5">
              <h2 className="font-semibold mb-4">Where your team sits</h2>
              <div className="space-y-4">
                {DOMAIN_ORDER.map((d) => (
                  <div key={d}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium">{DOMAINS[d].friendly}</span>
                      <span className="text-xs text-stone-400">
                        range {Math.round(stats[d].min)}–{Math.round(stats[d].max)}
                      </span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-stone-100">
                      {/* spread band */}
                      <div
                        className="absolute inset-y-0 rounded-full opacity-25"
                        style={{
                          left: `${stats[d].min}%`,
                          width: `${Math.max(2, stats[d].max - stats[d].min)}%`,
                          background: DOMAIN_COLOR[d],
                        }}
                      />
                      {/* mean marker */}
                      <div
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
                        style={{ left: `${stats[d].mean}%`, background: DOMAIN_COLOR[d] }}
                        title={`Team average ${Math.round(stats[d].mean)}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-stone-400 mt-4">
                Shaded band shows the full range across the team; the dot is the
                team average. Wider bands are where you differ most.
              </p>
            </section>
          )}

          {/* Talking points */}
          <section>
            <h2 className="font-semibold mb-3">Suggested talking points</h2>
            <div className="space-y-3">
              {points.map((p, i) => (
                <div key={i} className="card p-5">
                  <h3 className="font-semibold text-[15px] mb-1.5">{p.title}</h3>
                  <p className="text-sm text-stone-600 leading-relaxed">{p.detail}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-stone-400 mt-4">
              Use these to open a conversation, not to box anyone in. The goal is
              shared understanding, not labels.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
