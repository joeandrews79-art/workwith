import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { listMyThoughts, ThoughtView } from "@/lib/thoughts";
import { meetingType } from "@/lib/meeting-types";
import { formatDate } from "@/components/Bits";
import CaptureButton from "@/components/CaptureButton";
import ThoughtRowActions from "@/components/ThoughtRowActions";

export const dynamic = "force-dynamic";

const STATUS_ORDER = { captured: 0, planned: 1, archived: 2 } as const;

export default async function ThoughtsPage() {
  const user = (await getCurrentUser())!;
  const thoughts = await listMyThoughts(user.id);
  const sorted = [...thoughts].sort(
    (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || +b.createdAt - +a.createdAt,
  );

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Thoughts</h1>
          <p className="text-stone-500 mt-1">
            Jot a fleeting idea, then turn it into a structured meeting when you're
            ready. Only you can see these until they become a meeting.
          </p>
        </div>
        <div className="shrink-0">
          <CaptureButton variant="inline" label="Capture" />
        </div>
      </header>

      {sorted.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="font-semibold">Nothing captured yet</p>
          <p className="text-sm text-stone-500 mt-1 mb-4">
            Next time you think "I need to talk to someone about this," capture it
            here in one line and structure it later.
          </p>
          <CaptureButton variant="inline" label="Capture a thought" />
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <ThoughtCard key={t.id} t={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function ThoughtCard({ t }: { t: ThoughtView }) {
  const archived = t.status === "archived";
  return (
    <div className={`card p-4 ${archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t.text}</p>
          {t.detail && <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{t.detail}</p>}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {t.teamName && <span className="pill bg-stone-100 text-stone-500 text-[10px]">{t.teamName}</span>}
            {t.aboutName && (
              <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>
                About {t.aboutName}
              </span>
            )}
            {t.meetingType && (
              <span className="pill bg-stone-100 text-stone-500 text-[10px]">{meetingType(t.meetingType).label}</span>
            )}
            <span className="text-[11px] text-stone-400">{formatDate(t.createdAt)}</span>
          </div>
        </div>
        <ThoughtRowActions id={t.id} status={t.status} />
      </div>

      <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
        {t.status === "planned" && t.meetingId ? (
          <p className="text-sm text-stone-600">
            Planned as{" "}
            <Link href={`/meeting/${t.meetingId}`} className="font-medium" style={{ color: "var(--color-brand-700)" }}>
              {t.meetingTitle ?? "a meeting"}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            {t.proposal ? "Structured and ready to become a meeting." : "Not structured yet."}
          </p>
        )}
        <Link href={`/thoughts/${t.id}`} className="btn btn-primary py-1.5 px-3 text-sm shrink-0">
          {t.status === "planned" ? "Open" : t.proposal ? "Review & create" : "Structure this"}
        </Link>
      </div>
    </div>
  );
}
