"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createTeam } from "@/app/actions";

export default function CreateTeamForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createTeam,
    null as { error?: string; ok?: boolean; message?: string } | null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={formRef} action={action} className="card p-4 flex items-end gap-2">
      <div className="flex-1 space-y-1.5">
        <label className="label" htmlFor="team-name">New team</label>
        <input id="team-name" name="name" className="input" required placeholder="e.g. Product Team" />
      </div>
      <button className="btn btn-primary shrink-0" disabled={pending}>
        {pending ? "Creating…" : "Create team"}
      </button>
      {state?.error && (
        <p className="text-sm text-danger w-full basis-full">{state.error}</p>
      )}
    </form>
  );
}
