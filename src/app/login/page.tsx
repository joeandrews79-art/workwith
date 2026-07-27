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
              className="inline-grid place-items-center w-9 h-9 rounded-xl text-white"
              style={{ background: "var(--color-brand-600)" }}
              aria-hidden
            >
              W
            </span>
            <span>WorkWith</span>
          </div>
          <p className="text-sm text-stone-500 mt-2">
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
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {state.error}
            </p>
          )}

          <button type="submit" className="btn btn-primary w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-5 text-xs text-stone-500 leading-relaxed card p-4 bg-stone-50">
          <p className="font-semibold text-stone-600 mb-1">Demo logins</p>
          <p>Admin: joeandrews79@gmail.com / workwith-admin</p>
          <p>Member: maya@workwith.demo / workwith-demo</p>
        </div>

        <p className="mt-5 text-[11px] text-stone-400 text-center leading-relaxed">
          WorkWith is a self-report reflection tool based on the public-domain
          Big Five (IPIP-NEO-120). It is not a clinical, diagnostic, or hiring
          assessment.
        </p>
      </div>
    </main>
  );
}
