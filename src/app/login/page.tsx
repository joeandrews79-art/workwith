"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, null as { error?: string } | null);

  return (
    <main className="min-h-screen grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <span
              className="inline-grid place-items-center w-9 h-9 rounded-xl bg-accent text-on-accent"
              aria-hidden
            >
              W
            </span>
            <span>WorkWith</span>
          </div>
          <p className="text-sm text-muted mt-2">
            Understand how your team works, on purpose.
          </p>
        </div>

        <form action={action} className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="label" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              placeholder="you@company.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              placeholder="••••••••"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-danger bg-danger-soft border border-danger-border rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-faint text-center leading-relaxed">
          WorkWith is a self-report reflection tool based on the public-domain
          Big Five (IPIP-NEO-120). It is not a clinical, diagnostic, or hiring
          assessment.
        </p>
      </div>
    </main>
  );
}
