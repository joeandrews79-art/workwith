"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { structureThoughtAction, createMeetingFromThought } from "@/app/actions";
import type { MeetingProposal } from "@/lib/structure";
import { meetingType } from "@/lib/meeting-types";

const PURPOSE_LABEL: Record<string, string> = {
  decision: "Decision",
  discussion: "Discussion",
  information: "Info",
  brainstorm: "Brainstorm",
};

export default function StructurePanel({
  thoughtId,
  initialProposal,
  roster,
  planned,
  meetingId,
  aiEnabled,
}: {
  thoughtId: string;
  initialProposal: MeetingProposal | null;
  roster: { id: string; name: string }[];
  planned: boolean;
  meetingId: string | null;
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [proposal, setProposal] = useState<MeetingProposal | null>(initialProposal);
  const [error, setError] = useState<string | null>(null);

  const nameOf = (id: string) => roster.find((r) => r.id === id)?.name ?? "Someone";

  function structure() {
    setError(null);
    startTransition(async () => {
      const res = await structureThoughtAction(thoughtId);
      if ("error" in res) setError(res.error);
      else setProposal(res.proposal);
    });
  }

  function createMeeting() {
    setError(null);
    startTransition(async () => {
      const res = await createMeetingFromThought(thoughtId);
      if ("error" in res) setError(res.error);
      else router.push(`/meeting/${res.id}`);
    });
  }

  if (planned && meetingId) {
    return (
      <div className="card p-5 text-center">
        <p className="font-semibold">This thought became a meeting</p>
        <Link href={`/meeting/${meetingId}`} className="btn btn-primary mt-3">Open the meeting</Link>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="card p-6 text-center space-y-3">
        <div>
          <p className="font-semibold">Turn this into a meeting</p>
          <p className="text-sm text-stone-500 mt-1">
            Claude drafts a title, type, goal, who to invite, talking points, and an
            agenda from your thought. You can edit everything after.
          </p>
        </div>
        {aiEnabled ? (
          <button className="btn btn-primary" onClick={structure} disabled={pending}>
            {pending ? "Structuring…" : "Structure this"}
          </button>
        ) : (
          <p className="text-sm text-stone-500">
            Structuring needs Claude. An admin needs to set ANTHROPIC_API_KEY.
          </p>
        )}
        {error && <p className="text-sm text-red-700">{error}</p>}
      </div>
    );
  }

  const t = meetingType(proposal.meetingType);
  return (
    <div className="space-y-4">
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pill text-[10px]" style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}>
            {t.label}
          </span>
          <span className="text-xs text-stone-400">Proposed meeting</span>
        </div>
        <div>
          <h3 className="text-lg font-bold">{proposal.title}</h3>
          {proposal.goal && <p className="text-stone-600 mt-0.5">{proposal.goal}</p>}
        </div>

        {proposal.attendeeIds.length > 0 && (
          <div>
            <p className="label mb-1">Suggested attendees</p>
            <p className="text-sm text-stone-700">{proposal.attendeeIds.map(nameOf).join(", ")}</p>
          </div>
        )}

        {proposal.agenda.length > 0 && (
          <div>
            <p className="label mb-1.5">Draft agenda</p>
            <ol className="space-y-1.5">
              {proposal.agenda.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-stone-400 tabular-nums">{i + 1}.</span>
                  <span className="text-stone-700">{a.topic}</span>
                  <span className="pill bg-stone-100 text-stone-500 text-[10px] shrink-0">{PURPOSE_LABEL[a.purpose] ?? a.purpose}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {proposal.talkingPoints.length > 0 && (
          <div>
            <p className="label mb-1.5">Talking points</p>
            <ul className="space-y-1.5">
              {proposal.talkingPoints.map((p, i) => (
                <li key={i} className="flex gap-2 text-sm text-stone-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {proposal.outcome && (
          <div>
            <p className="label mb-1">Desired outcome</p>
            <p className="text-sm text-stone-700">{proposal.outcome}</p>
          </div>
        )}

        {proposal.notes && <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">{proposal.notes}</p>}
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button className="btn btn-primary" onClick={createMeeting} disabled={pending}>
          {pending ? "Creating…" : "Create this meeting"}
        </button>
        <button className="btn btn-ghost" onClick={structure} disabled={pending || !aiEnabled}>
          Re-structure
        </button>
      </div>
      <p className="text-xs text-stone-400">
        Creating the meeting sets its type, title, goal, and attendees. The
        working-style prep is then computed from the attendees' profiles. You can
        edit it all on the meeting page.
      </p>
    </div>
  );
}
