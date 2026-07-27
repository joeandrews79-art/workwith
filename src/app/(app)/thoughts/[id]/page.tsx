import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getMyThought } from "@/lib/thoughts";
import { getTeamRoster } from "@/lib/team-data";
import { meetingType } from "@/lib/meeting-types";
import { aiEnabled } from "@/lib/ai";
import { formatDate } from "@/components/Bits";
import StructurePanel from "@/components/StructurePanel";

export const dynamic = "force-dynamic";

export default async function ThoughtDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = (await getCurrentUser())!;
  const t = await getMyThought(id, user.id);
  if (!t) redirect("/thoughts");

  const roster = t.teamId ? await getTeamRoster(t.teamId) : [];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/thoughts" className="text-sm text-stone-500 hover:text-stone-700">← Thoughts</Link>

      <header className="card p-5">
        <p className="text-xs text-stone-400 mb-1">Captured {formatDate(t.createdAt)}</p>
        <h1 className="text-xl font-bold tracking-tight">{t.text}</h1>
        {t.detail && <p className="text-stone-600 mt-2 whitespace-pre-wrap">{t.detail}</p>}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {t.teamName && <span className="pill bg-stone-100 text-stone-500 text-[10px]">{t.teamName}</span>}
          {t.aboutName && (
            <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>
              About {t.aboutName}
            </span>
          )}
          {t.meetingType && (
            <span className="pill bg-stone-100 text-stone-500 text-[10px]">{meetingType(t.meetingType).label}</span>
          )}
        </div>
      </header>

      <StructurePanel
        thoughtId={t.id}
        initialProposal={t.proposal}
        roster={roster.map((r) => ({ id: r.id, name: r.name }))}
        planned={t.status === "planned"}
        meetingId={t.meetingId}
        aiEnabled={aiEnabled()}
      />
    </div>
  );
}
