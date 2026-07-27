import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import { getVisibleTeamMembers } from "@/lib/team-data";
import { teamStats, discussionPoints } from "@/lib/team";
import { DOMAIN_ORDER } from "@/lib/ipip";
import { NoTeam } from "@/components/Bits";
import TeamSpectrum, { SpectrumMember } from "@/components/TeamSpectrum";

export const dynamic = "force-dynamic";

export default async function TeamMapPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const members = await getVisibleTeamMembers(activeTeam.id, user.id);

  const header = (
    <header>
      <h1 className="text-2xl font-bold tracking-tight">Team map</h1>
      <p className="text-stone-500 mt-1">
        Where everyone on {activeTeam.name} lands across the Big Five, and where you sit in the mix.
      </p>
    </header>
  );

  if (members.length < 2) {
    return (
      <div className="space-y-6">
        {header}
        <div className="card p-8 text-center">
          <p className="font-semibold">Not enough profiles yet</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            The map needs at least two completed, shared profiles on this team. Once more
            teammates finish and share their assessment, they'll appear here.
          </p>
          <Link href="/directory" className="btn btn-primary">See who's completed</Link>
        </div>
      </div>
    );
  }

  const spectrumMembers: SpectrumMember[] = members.map((m) => ({
    id: m.id,
    name: m.name,
    isViewer: m.id === user.id,
    scores: Object.fromEntries(
      DOMAIN_ORDER.map((d) => [d, m.domains[d].friendlyScore]),
    ) as SpectrumMember["scores"],
  }));

  const stats = teamStats(members);
  const discussion = discussionPoints(members);
  const hasViewer = spectrumMembers.some((m) => m.isViewer);

  return (
    <div className="space-y-6">
      {header}
      {!hasViewer && (
        <div className="card p-4 flex items-center justify-between gap-4" style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}>
          <p className="text-sm text-stone-600">
            Finish your own assessment to see yourself on the map and how you compare to the team.
          </p>
          <Link href="/assessment" className="btn btn-primary py-1.5 px-3 text-sm shrink-0">Start assessment</Link>
        </div>
      )}
      <TeamSpectrum members={spectrumMembers} stats={stats} discussion={discussion} />
    </div>
  );
}
