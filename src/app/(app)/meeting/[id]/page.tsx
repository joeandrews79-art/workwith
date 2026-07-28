import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { canLeadTeam } from "@/lib/active-team";
import { prisma } from "@/lib/db";
import { getMeetingDetail, AgendaItemView } from "@/lib/meeting-data";
import { meetingType } from "@/lib/meeting-types";
import { buildMeetingBrief } from "@/lib/meeting";
import { formatDate } from "@/components/Bits";
import { fmtTimeRange } from "@/lib/calendar";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { aiEnabled } from "@/lib/ai";
import MeetingBriefView from "@/components/MeetingBriefView";
import MeetingActions from "@/components/MeetingActions";
import AgendaEditor from "@/components/AgendaEditor";

export const dynamic = "force-dynamic";

export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const detail = await getMeetingDetail(id, user.id);
  if (!detail) redirect("/meeting");

  // Team-visibility: you must be on the meeting's team (or an org admin) to view.
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: detail.teamId, userId: user.id } },
    select: { id: true },
  });
  if (!membership && !isAdmin(user)) redirect("/meeting");

  const isCreator = detail.createdById === user.id;
  const canManage =
    isCreator || (await canLeadTeam(user.id, detail.teamId, isAdmin(user)));

  const t = meetingType(detail.type);
  const brief = detail.viewerMember
    ? buildMeetingBrief(detail.viewerMember, detail.otherMembers, detail.type)
    : null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/meeting" className="text-sm text-stone-500 hover:text-stone-700">← Meetings</Link>
        {canManage && <MeetingActions meetingId={detail.id} title={detail.title} />}
      </div>

      <header className="card p-5">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span
            className="pill text-[10px]"
            style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
          >
            {t.label}
          </span>
          <span className="text-xs text-stone-400">
            {detail.scheduledFor ? formatDate(detail.scheduledFor) : "No date set"}
            {detail.scheduledFor && detail.startMinute != null && (
              <> · {fmtTimeRange(detail.startMinute, detail.durationMin)}</>
            )}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{detail.title}</h1>
        {detail.goal && <p className="text-stone-600 mt-1">{detail.goal}</p>}

        <div className="mt-4">
          <p className="label mb-2">In the room · {detail.attendees.length}</p>
          <div className="flex flex-wrap gap-2">
            {detail.attendees.map((a) => (
              <span
                key={a.id}
                className="flex items-center gap-1.5 rounded-full border border-stone-200 pl-1 pr-2.5 py-1 text-sm"
                title={a.hasProfile ? undefined : "No profile yet"}
              >
                <span
                  className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold"
                  style={{ background: avatarColor(a.name), color: avatarInkColor(a.name) }}
                  aria-hidden
                >
                  {initials(a.name)}
                </span>
                {a.name}
                {a.id === detail.createdById && <span className="text-[10px] text-stone-400">· organizer</span>}
              </span>
            ))}
          </div>
        </div>
      </header>

      {isCreator ? (
        <AgendaEditor
          meetingId={detail.id}
          items={detail.agenda}
          attendees={detail.attendees.map((a) => ({ id: a.id, name: a.name }))}
          aiEnabled={aiEnabled()}
        />
      ) : (
        detail.agenda.length > 0 && <AgendaReadOnly items={detail.agenda} />
      )}

      {brief ? (
        <MeetingBriefView brief={brief} />
      ) : (
        <>
          <section
            className="card p-5"
            style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: "var(--accent-text)" }}><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></svg>
              <h2 className="font-semibold">{t.label}</h2>
            </div>
            <p className="text-sm text-stone-600 mb-3">{t.framing}</p>
            <ul className="space-y-2.5">
              {t.lens.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-stone-800">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} />
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </section>
          <div className="card p-6 text-center">
            <p className="font-semibold">Complete your profile for personalized prep</p>
            <p className="text-sm text-stone-500 mt-1 mb-4">
              Finish the assessment and this meeting will also show how the room
              reads and how you specifically should show up.
            </p>
            <Link href="/assessment" className="btn btn-primary">Start assessment</Link>
          </div>
        </>
      )}
    </div>
  );
}

const PURPOSE_LABEL: Record<string, string> = {
  decision: "Decision",
  discussion: "Discussion",
  information: "Info",
  brainstorm: "Brainstorm",
};

function AgendaReadOnly({ items }: { items: AgendaItemView[] }) {
  const total = items.reduce((s, i) => s + (i.minutes ?? 0), 0);
  return (
    <section className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-semibold">Agenda</h2>
        {total > 0 && <span className="text-xs text-stone-400">{total} min total</span>}
      </div>
      <ol className="space-y-2">
        {items.map((a, i) => (
          <li key={a.id} className="flex items-start gap-2 text-sm">
            <span className="text-stone-400 tabular-nums">{i + 1}.</span>
            <span className="text-stone-700 flex-1">{a.topic}</span>
            {a.minutes ? <span className="text-xs text-stone-400 shrink-0">{a.minutes}m</span> : null}
            <span className="pill bg-stone-100 text-stone-500 text-[10px] shrink-0">{PURPOSE_LABEL[a.purpose] ?? a.purpose}</span>
            {a.ownerName && <span className="text-[11px] text-stone-400 shrink-0">{a.ownerName}</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
