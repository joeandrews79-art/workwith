import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { assembleProfile } from "@/lib/profile";
import { coachEnabled, parseCoachStore, type CoachingPlan } from "@/lib/coach";
import { getActiveTeamContext } from "@/lib/active-team";
import { getVisibleTeamMembers } from "@/lib/team-data";
import type { Member } from "@/lib/team";
import { formatDate } from "@/components/Bits";
import Coach from "@/components/Coach";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const user = (await getCurrentUser())!;
  const profile = await assembleProfile(user.id);
  const hasProfile = Boolean(profile && profile.domains);

  // Teammates with visible profiles, for the "how do I work with…" front door.
  // Deterministic and local, so this works even without an AI key.
  let viewerMember: Member | null = null;
  let teammates: Member[] = [];
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (activeTeam && hasProfile) {
    const members = await getVisibleTeamMembers(activeTeam.id, user.id);
    viewerMember = members.find((m) => m.id === user.id) ?? null;
    teammates = members.filter((m) => m.id !== user.id);
  }

  // Coaching is team-aware, so it's cached per active team (keyed by team id).
  const teamKey = activeTeam?.id ?? "_none";
  let initialPlan: CoachingPlan | null = null;
  let generatedAt: string | null = null;
  let stale = false; // older than a week → refresh (picks up team + this week's meetings)
  if (hasProfile) {
    const row = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { coaching: true },
    });
    const entry = parseCoachStore(row?.coaching ?? null)[teamKey];
    if (entry) {
      initialPlan = entry.plan;
      generatedAt = formatDate(new Date(entry.at));
      const WEEK = 7 * 24 * 60 * 60 * 1000;
      stale = Date.now() - Date.parse(entry.at) > WEEK;
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Coach</h1>
        <p className="text-stone-500 mt-1">
          Personal, practical advice for working with the grain of who you are, and
          flexing on purpose where it helps.
        </p>
      </header>

      <Coach
        key={teamKey}
        hasProfile={hasProfile}
        enabled={coachEnabled()}
        initialPlan={initialPlan}
        generatedAt={generatedAt}
        stale={stale}
        viewer={viewerMember}
        teammates={teammates}
      />
    </div>
  );
}
