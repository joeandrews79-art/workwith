import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { canLeadTeam } from "@/lib/active-team";
import { prisma } from "@/lib/db";
import { getMeetingDetail } from "@/lib/meeting-data";
import { meetingType } from "@/lib/meeting-types";
import { buildMeetingBrief } from "@/lib/meeting";
import { formatDate } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import MeetingBriefView from "@/components/MeetingBriefView";
import MeetingActions from "@/components/MeetingActions";

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

  const canManage =
    detail.createdById === user.id ||
    (await canLeadTeam(user.id, detail.teamId, isAdmin(user)));

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

      {brief ? (
        <MeetingBriefView brief={brief} />
      ) : (
        <>
          <section
            className="card p-5"
            style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span aria-hidden>🧭</span>
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
