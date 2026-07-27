import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import { listTeamMeetings } from "@/lib/meeting-data";
import { meetingType } from "@/lib/meeting-types";
import { formatDate, NoTeam } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function MeetingsPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const meetings = await listTeamMeetings(activeTeam.id);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meetings</h1>
          <p className="text-stone-500 mt-1">
            Plan a meeting for {activeTeam.name} and get working-style prep tuned to
            the room and the meeting's purpose.
          </p>
        </div>
        <Link href="/meeting/new" className="btn btn-primary shrink-0">
          New meeting
        </Link>
      </header>

      {meetings.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">No meetings yet</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Plan your first one. Pick a type, add who's coming, and you'll get a
            prep read on how to show up.
          </p>
          <Link href="/meeting/new" className="btn btn-primary">Plan a meeting</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings.map((m) => {
            const t = meetingType(m.type);
            return (
              <Link key={m.id} href={`/meeting/${m.id}`} className="card p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{m.title}</span>
                    <span
                      className="pill text-[10px]"
                      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                    >
                      {t.label}
                    </span>
                  </div>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {m.scheduledFor ? formatDate(m.scheduledFor) : "No date set"} ·{" "}
                    {m.attendees.length} {m.attendees.length === 1 ? "person" : "people"}
                  </div>
                </div>
                <div className="flex -space-x-2 shrink-0">
                  {m.attendees.slice(0, 5).map((a) => (
                    <span
                      key={a.id}
                      className="grid place-items-center w-8 h-8 rounded-full text-[10px] font-bold ring-2"
                      style={{ background: avatarColor(a.name), color: avatarInkColor(a.name), boxShadow: "0 0 0 2px var(--color-surface)" }}
                      title={a.name}
                      aria-hidden
                    >
                      {initials(a.name)}
                    </span>
                  ))}
                  {m.attendees.length > 5 && (
                    <span className="grid place-items-center w-8 h-8 rounded-full text-[10px] font-bold bg-stone-100 text-stone-500">
                      +{m.attendees.length - 5}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
