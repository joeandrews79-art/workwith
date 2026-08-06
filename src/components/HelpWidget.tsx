"use client";

import { useState, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { askHelp } from "@/app/actions";
import { GUIDE_SECTIONS } from "@/lib/guide-content";

export default function HelpWidget({ aiEnabled, isAdmin }: { aiEnabled: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = GUIDE_SECTIONS.filter((s) => isAdmin || !s.adminOnly);

  function ask() {
    setError(null);
    setAnswer(null);
    startTransition(async () => {
      const res = await askHelp(question);
      if ("error" in res) setError(res.error);
      else setAnswer(res.answer);
    });
  }

  if (!mounted) return null;

  return createPortal(
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close help" : "Open help"}
        className="fixed bottom-5 right-5 z-50 grid place-items-center w-12 h-12 rounded-full bg-accent text-on-accent shadow-lg transition-transform hover:scale-105"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        ) : (
          <span className="text-xl font-bold">?</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className="fixed bottom-20 right-5 z-50 w-[min(92vw,380px)] rounded-2xl border shadow-xl flex flex-col overflow-hidden"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)", maxHeight: "min(72vh, 620px)" }}
            role="dialog"
            aria-label="Help"
          >
            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "var(--color-border)" }}>
              <p className="font-semibold">Help</p>
              <Link href="/guide" onClick={() => setOpen(false)} className="text-xs" style={{ color: "var(--color-brand-700)" }}>
                Open full guide →
              </Link>
            </div>

            <div className="overflow-y-auto p-4 space-y-4">
              {aiEnabled && (
                <div>
                  <p className="label mb-1.5">Ask about WorkWith</p>
                  <textarea
                    className="input min-h-[60px] text-sm"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="e.g. How do I share my profile?"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) ask();
                    }}
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button className="btn btn-primary py-1.5 px-3 text-sm" disabled={pending || question.trim().length < 3} onClick={ask}>
                      {pending ? "Thinking…" : "Ask"}
                    </button>
                    <span className="text-[11px] text-faint">Answers come from the guide. No profiles are sent.</span>
                  </div>
                  {error && <p className="text-sm text-danger mt-2">{error}</p>}
                  {answer && (
                    <div className="mt-3 rounded-lg p-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ background: "var(--color-elevated)", color: "var(--color-ink, inherit)" }}>
                      {answer}
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="label mb-1.5">Browse topics</p>
                <ul className="space-y-0.5">
                  {links.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/guide#${s.id}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-md px-2 py-1.5 text-sm hover:bg-[var(--color-brand-50)] transition-colors"
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body,
  );
}
