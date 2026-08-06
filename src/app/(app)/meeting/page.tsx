import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import { getMyMeetings } from "@/lib/meeting-data";
import { prisma } from "@/lib/db";
import { meetingType } from "@/lib/meeting-types";
import { NoTeam } from "@/components/Bits";
import { ymd } from "@/lib/calendar";
import MeetingCalendar, { CalendarMeeting } from "@/components/MeetingCalendar";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  // The calendar shows every meeting you're an attendee of, across all your
  // teams. Managing (reschedule/cancel) stays with the creator or the team's
  // leader/admin, so compute the set of teams you lead once.
  const admin = isAdmin(user);
  const [meetings, ledTeams] = await Promise.all([
    getMyMeetings(user.id),
    prisma.teamMember.findMany({
      where: { userId: user.id, role: "LEADER" },
      select: { teamId: true },
    }),
  ]);
  const ledSet = new Set(ledTeams.map((t) => t.teamId));

  const calendarMeetings: CalendarMeeting[] = meetings.map((m) => ({
    id: m.id,
    title: m.title,
    typeCode: m.type,
    typeLabel: meetingType(m.type).label,
    teamName: m.teamName,
    day: m.scheduledFor ? ymd(m.scheduledFor) : null,
    startMinute: m.startMinute,
    durationMin: m.durationMin,
    attendees: m.attendees,
    canManage: m.createdById === user.id || admin || ledSet.has(m.teamId),
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
        <p className="text-muted mt-1">
          Every meeting you're in, across your teams, on one calendar. New meetings are
          planned for {activeTeam.name}.
        </p>
      </header>

      <MeetingCalendar meetings={calendarMeetings} teamName={activeTeam.name} />
    </div>
  );
}
