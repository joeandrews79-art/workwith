"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setPassword } from "@/app/actions";

export default function SetPasswordForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    setPassword,
    null as { error?: string; ok?: boolean } | null,
  );

  useEffect(() => {
    if (state?.ok) router.push("/welcome");
  }, [state, router]);

  return (
    <form action={action} className="card p-6 space-y-4">
      <div className="space-y-1.5">
        <label className="label" htmlFor="password">New password</label>
        <input id="password" name="password" type="password" className="input" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
      </div>
      <div className="space-y-1.5">
        <label className="label" htmlFor="confirm">Confirm password</label>
        <input id="confirm" name="confirm" type="password" className="input" required minLength={8} autoComplete="new-password" placeholder="Type it again" />
      </div>
      {state?.error && (
        <p className="text-sm text-danger bg-danger-soft border border-danger-border rounded-lg px-3 py-2">{state.error}</p>
      )}
      <button className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save password and continue"}
      </button>
    </form>
  );
}
