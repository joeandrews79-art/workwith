import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import { getVisibleMembers } from "@/lib/team-data";
import { visionEnabled } from "@/lib/meeting-vision";
import { NoTeam } from "@/components/Bits";
import MeetingComposer from "@/components/MeetingComposer";

export const dynamic = "force-dynamic";

export default async function NewMeetingPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  // Attendees can be anyone in the company with a visible profile, not just the
  // active team.
  const members = await getVisibleMembers(user.orgId, user.id);
  const viewer = members.find((m) => m.id === user.id);
  const others = members.filter((m) => m.id !== user.id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Plan a meeting</h1>
          <p className="text-stone-500 mt-1">For {activeTeam.name}.</p>
        </div>
        <Link href="/meeting" className="btn btn-secondary py-1.5 text-sm shrink-0">
          Back to meetings
        </Link>
      </header>

      {!viewer ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Complete your own profile first</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Meeting prep is tuned to your profile, so you'll need to finish the
            assessment before planning one.
          </p>
          <Link href="/assessment" className="btn btn-primary">Start assessment</Link>
        </div>
      ) : (
        <MeetingComposer mode="create" viewer={viewer} others={others} visionEnabled={visionEnabled()} />
      )}
    </div>
  );
}
