"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setThoughtStatus, deleteThought } from "@/app/actions";

export default function ThoughtRowActions({
  id,
  status,
}: {
  id: string;
  status: "captured" | "planned" | "archived";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    setErr(null);
    startTransition(async () => {
      const res = await fn();
      if ("error" in res && res.error) setErr(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      {err && <span className="text-xs text-danger mr-1">{err}</span>}
      {status !== "archived" ? (
        <button
          className="btn btn-ghost py-1 px-2 text-xs text-muted"
          disabled={pending}
          onClick={() => run(() => setThoughtStatus(id, "archived"))}
        >
          Archive
        </button>
      ) : (
        <button
          className="btn btn-ghost py-1 px-2 text-xs text-muted"
          disabled={pending}
          onClick={() => run(() => setThoughtStatus(id, "captured"))}
        >
          Unarchive
        </button>
      )}
      <button
        className="btn btn-ghost py-1 px-2 text-xs text-danger"
        disabled={pending}
        onClick={() => {
          if (confirm("Delete this thought?")) run(() => deleteThought(id));
        }}
      >
        Delete
      </button>
    </div>
  );
}
