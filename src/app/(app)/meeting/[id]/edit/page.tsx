import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { canLeadTeam, getActiveTeamContext } from "@/lib/active-team";
import { getVisibleMembers } from "@/lib/team-data";
import { getMeetingDetail } from "@/lib/meeting-data";
import { NoTeam } from "@/components/Bits";
import MeetingComposer from "@/components/MeetingComposer";

export const dynamic = "force-dynamic";

export default async function EditMeetingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const detail = await getMeetingDetail(id, user.id);
  if (!detail) redirect("/meeting");

  const canManage =
    detail.createdById === user.id ||
    (await canLeadTeam(user.id, detail.teamId, isAdmin(user)));
  if (!canManage) redirect(`/meeting/${id}`);

  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  // Attendees can be anyone in the company with a visible profile.
  const members = await getVisibleMembers(user.orgId, user.id);
  const viewer = members.find((m) => m.id === user.id);
  const others = members.filter((m) => m.id !== user.id);

  const scheduledFor = detail.scheduledFor
    ? detail.scheduledFor.toISOString().slice(0, 10)
    : "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Edit meeting</h1>
        <Link href={`/meeting/${id}`} className="btn btn-secondary py-1.5 text-sm shrink-0">
          Back
        </Link>
      </header>

      {!viewer ? (
        <div className="card p-6 text-center">
          <p className="font-semibold">Complete your own profile first</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Meeting prep is tuned to your profile, so finish the assessment to edit
            with the live preview.
          </p>
          <Link href="/assessment" className="btn btn-primary">Start assessment</Link>
        </div>
      ) : (
        <MeetingComposer
          mode="edit"
          meetingId={detail.id}
          viewer={viewer}
          others={others}
          initial={{
            type: detail.type,
            title: detail.title,
            goal: detail.goal ?? "",
            scheduledFor,
            startMinute: detail.startMinute,
            durationMin: detail.durationMin,
            attendeeIds: detail.attendees.map((a) => a.id).filter((aid) => aid !== user.id),
          }}
        />
      )}
    </div>
  );
}
