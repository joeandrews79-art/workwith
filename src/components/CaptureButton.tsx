"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createThought, getThoughtCaptureContext } from "@/app/actions";
import { MEETING_TYPES } from "@/lib/meeting-types";

interface CaptureContext {
  teamId: string | null;
  teamName: string | null;
  members: { id: string; name: string }[];
}

/**
 * Quick-capture a thought for meeting planning. Renders its own trigger and a
 * modal. Reused as the sidebar "+ Capture" and as the per-person entry from
 * Discussion mode (pass presetAboutUserId/Name).
 */
export default function CaptureButton({
  variant = "sidebar",
  presetAboutUserId,
  presetAboutName,
  label,
}: {
  variant?: "sidebar" | "inline";
  presetAboutUserId?: string;
  presetAboutName?: string;
  label?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [ctx, setCtx] = useState<CaptureContext | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [about, setAbout] = useState(presetAboutUserId ?? "");
  const [type, setType] = useState("");

  useEffect(() => {
    if (!open) return;
    setSaved(false);
    setError(null);
    getThoughtCaptureContext().then((res) => {
      if ("ok" in res) setCtx({ teamId: res.teamId ?? null, teamName: res.teamName ?? null, members: res.members ?? [] });
    });
  }, [open]);

  function reset() {
    setText("");
    setDetail("");
    setAbout(presetAboutUserId ?? "");
    setType("");
    setSaved(false);
    setError(null);
  }

  function save() {
    setError(null);
    if (!text.trim()) return setError("Jot down at least a line.");
    startTransition(async () => {
      const res = await createThought({
        text: text.trim(),
        detail: detail.trim() || null,
        teamId: ctx?.teamId ?? null,
        aboutUserId: about || null,
        meetingType: type || null,
      });
      if ("error" in res && res.error) setError(res.error);
      else {
        setSaved(true);
        router.refresh();
      }
    });
  }

  return (
    <>
      {variant === "sidebar" ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: "var(--color-brand-600)", color: "#fff" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          {label ?? "Capture a thought"}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} className="btn btn-secondary py-1.5 px-3 text-sm">
          {label ?? "Capture a thought"}
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} aria-hidden />
          <div className="card relative w-full sm:max-w-lg p-5 space-y-4 rounded-b-none sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            {saved ? (
              <div className="text-center py-4 space-y-3">
                <p className="font-semibold">Captured</p>
                <p className="text-sm text-stone-500">
                  It's private, in your Thoughts inbox. Turn it into a meeting whenever you're ready.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Link href="/thoughts" className="btn btn-primary" onClick={() => setOpen(false)}>
                    Go to Thoughts
                  </Link>
                  <button className="btn btn-secondary" onClick={reset}>Capture another</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold">Capture a thought</h2>
                  <button className="btn btn-ghost py-1 px-2" onClick={() => setOpen(false)} aria-label="Close">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                <p className="text-xs text-stone-500 -mt-2">
                  {ctx?.teamName ? `For ${ctx.teamName}. ` : ""}Only you can see this until it becomes a meeting.
                </p>

                <div className="space-y-1.5">
                  <label className="label" htmlFor="c-text">Your thought</label>
                  <input
                    id="c-text"
                    className="input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="e.g. Need to talk to Marcus about how we run reviews"
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="label" htmlFor="c-detail">More detail (optional)</label>
                  <textarea
                    id="c-detail"
                    className="input min-h-20"
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    placeholder="Anything you'd want to remember when you plan this."
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="label" htmlFor="c-about">About someone (optional)</label>
                    <select id="c-about" className="input" value={about} onChange={(e) => setAbout(e.target.value)}>
                      <option value="">No one in particular</option>
                      {presetAboutUserId && presetAboutName && !ctx?.members.some((m) => m.id === presetAboutUserId) && (
                        <option value={presetAboutUserId}>{presetAboutName}</option>
                      )}
                      {ctx?.members.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="label" htmlFor="c-type">Meeting type (optional)</label>
                    <select id="c-type" className="input" value={type} onChange={(e) => setType(e.target.value)}>
                      <option value="">Not sure yet</option>
                      {MEETING_TYPES.map((t) => (
                        <option key={t.code} value={t.code}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
                )}

                <div className="flex items-center gap-2">
                  <button className="btn btn-primary" onClick={save} disabled={pending}>
                    {pending ? "Saving…" : "Capture"}
                  </button>
                  <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
