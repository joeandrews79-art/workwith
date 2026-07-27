"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteMember } from "@/app/actions";

export default function InviteForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    inviteMember,
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
    <form ref={formRef} action={action} className="card p-5 space-y-4">
      <h2 className="font-semibold">Invite a team member</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" className="input" required placeholder="Jordan Lee" />
        </div>
        <div className="space-y-1.5">
          <label className="label" htmlFor="title">Title (optional)</label>
          <input id="title" name="title" className="input" placeholder="Head of Design" />
        </div>
        <div className="space-y-1.5">
          <label className="label" htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" className="input" required placeholder="jordan@company.com" />
        </div>
        <div className="space-y-1.5">
          <label className="label" htmlFor="password">Temporary password</label>
          <input id="password" name="password" className="input" required minLength={8} placeholder="At least 8 characters" />
        </div>
      </div>

      <label className="flex items-center gap-2.5 text-sm text-stone-700 cursor-pointer select-none">
        <input type="checkbox" name="role" value="ADMIN" className="w-4 h-4 accent-current" style={{ accentColor: "var(--color-brand-600)" }} />
        Make this person an admin (can manage members and settings)
      </label>

      {state?.error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.ok && state.message && (
        <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </button>
        <p className="text-xs text-stone-400">
          They'll be asked to change the temporary password on first sign-in.
        </p>
      </div>
    </form>
  );
}
