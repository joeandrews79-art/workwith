import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getActiveTeamContext, canLeadTeam } from "@/lib/active-team";
import { listTeamMeetings } from "@/lib/meeting-data";
import { meetingType } from "@/lib/meeting-types";
import { NoTeam } from "@/components/Bits";
import { ymd } from "@/lib/calendar";
import MeetingCalendar, { CalendarMeeting } from "@/components/MeetingCalendar";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const [meetings, viewerCanLead] = await Promise.all([
    listTeamMeetings(activeTeam.id),
    canLeadTeam(user.id, activeTeam.id, isAdmin(user)),
  ]);

  const calendarMeetings: CalendarMeeting[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    typeCode: m.type,
    typeLabel: meetingType(m.type).label,
    day: m.scheduledFor ? ymd(m.scheduledFor) : null,
    startMinute: m.startMinute,
    durationMin: m.durationMin,
    attendees: m.attendees,
    canManage: m.createdById === user.id || viewerCanLead,
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
        <p className="text-stone-500 mt-1">
          Plan meetings for {activeTeam.name} and run them off a shared calendar, with
          working-style prep tuned to the room and the meeting's purpose.
        </p>
      </header>

      <MeetingCalendar meetings={calendarMeetings} teamName={activeTeam.name} />
    </div>
  );
}
