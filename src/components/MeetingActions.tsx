"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteMeeting } from "@/app/actions";

export default function MeetingActions({
  meetingId,
  title,
}: {
  meetingId: string;
  title: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function remove() {
    if (!confirm(`Delete "${title}"? This can't be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteMeeting(meetingId);
      if ("error" in res && res.error) setError(res.error);
      else router.push("/meeting");
    });
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-red-700">{error}</span>}
      <button
        className="btn btn-secondary py-1.5 px-3 text-sm"
        onClick={() => router.push(`/meeting/${meetingId}/edit`)}
        disabled={pending}
      >
        Edit
      </button>
      <button
        className="btn btn-ghost py-1.5 px-3 text-sm text-red-700"
        onClick={remove}
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
    </div>
  );
}
