import { getCurrentUser } from "@/lib/auth";
import { getVisibleTeamMembers } from "@/lib/team-data";
import { getActiveTeamContext } from "@/lib/active-team";
import { NoTeam } from "@/components/Bits";
import GroupCompare from "@/components/GroupCompare";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;
  const members = await getVisibleTeamMembers(activeTeam.id, user.id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Compare</h1>
        <p className="text-stone-500 mt-1">
          Pick any two or more people to see where your styles differ, with talking points
          for a 1:1 or a group.
        </p>
      </header>

      {members.length < 2 ? (
        <p className="text-sm text-stone-500">
          You need at least two completed, shared profiles to compare.
        </p>
      ) : (
        <GroupCompare members={members} viewerId={user.id} />
      )}
    </div>
  );
}
