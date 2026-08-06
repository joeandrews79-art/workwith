"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions";

/**
 * First-run setup. A short, step-by-step walk-through so a new person knows
 * exactly what to do: take the assessment, review and share, then done.
 */
export default function WelcomeWizard({
  firstName,
  hasAssessment,
  isShared,
}: {
  firstName: string;
  hasAssessment: boolean;
  isShared: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const steps = [
    {
      key: "assess",
      title: "Take your working-style assessment",
      body: "About 10 to 15 minutes, and it saves as you go. This is what builds your profile.",
      done: hasAssessment,
      cta: hasAssessment ? null : { label: "Start assessment", href: "/assessment" },
    },
    {
      key: "review",
      title: "Review and edit your profile",
      body: "We write a plain-language summary and a \"how to work with me\" section. Tweak any wording that doesn't sound like you.",
      done: hasAssessment,
      cta: hasAssessment ? { label: "Open my profile", href: "/me" } : null,
    },
    {
      key: "share",
      title: "Share it with your team",
      body: "Flip the share toggle on your profile so teammates can see how you work. You control this and can turn it off anytime.",
      done: isShared,
      cta: hasAssessment && !isShared ? { label: "Review & share", href: "/me" } : null,
    },
  ];

  const [intro, setIntro] = useState(true);

  function finish() {
    startTransition(async () => {
      await completeOnboarding();
      router.push("/dashboard");
    });
  }

  if (intro) {
    return (
      <div className="card p-7 text-center">
        <h1 className="text-2xl font-bold">Welcome, {firstName}</h1>
        <p className="text-ink-soft mt-3 leading-relaxed">
          WorkWith helps your team understand how each of you works best, so
          friction gets understood instead of guessed at. Setup takes about 15
          minutes and it's three quick steps.
        </p>
        <div className="text-left text-sm text-muted mt-5 space-y-2">
          <p>1. Take a short assessment.</p>
          <p>2. Review the profile it writes for you.</p>
          <p>3. Share it with your team.</p>
        </div>
        <button className="btn btn-primary w-full mt-6" onClick={() => setIntro(false)}>
          Let's set up
        </button>
        <button className="btn btn-ghost w-full mt-1 text-sm" onClick={finish} disabled={pending}>
          Skip for now
        </button>
      </div>
    );
  }

  const allDone = hasAssessment && isShared;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Get set up</h1>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={s.key} className="card p-4 flex items-start gap-3">
            <span
              className="grid place-items-center w-7 h-7 rounded-full text-sm font-bold shrink-0 mt-0.5"
              style={
                s.done
                  ? { background: "#16a34a", color: "#fff" }
                  : { background: "var(--color-brand-50)", color: "var(--color-brand-700)" }
              }
              aria-hidden
            >
              {s.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">{s.title}</p>
              <p className="text-sm text-muted mt-0.5">{s.body}</p>
              {s.cta && (
                <Link href={s.cta.href} className="btn btn-secondary py-1.5 text-sm mt-2">
                  {s.cta.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="pt-1">
        <button className="btn btn-primary w-full" onClick={finish} disabled={pending}>
          {pending ? "Finishing…" : allDone ? "Finish setup" : "Go to my dashboard"}
        </button>
        <p className="text-center text-xs text-faint mt-2">
          You can always come back to any of these from the app.
        </p>
      </div>
    </div>
  );
}
