"use client";

import { useState } from "react";
import { connectSlack, disconnectSlack, setSlackPreMeeting } from "@/app/actions";

function SlackGlyph() {
  return (
    <span
      className="grid place-items-center w-9 h-9 rounded-xl shrink-0"
      style={{ background: "var(--accent-soft)", color: "var(--accent-text)" }}
      aria-hidden
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="4" />
        <path d="M9 9h6M9 13h6M9 17h3" />
      </svg>
    </span>
  );
}

export default function SlackConnect({
  connected,
  preMeetingEnabled,
}: {
  connected: boolean;
  preMeetingEnabled: boolean;
}) {
  const [isConnected, setConnected] = useState(connected);
  const [preMeeting, setPreMeeting] = useState(preMeetingEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setBusy(true);
    setError(null);
    const res = await connectSlack();
    setBusy(false);
    if ("error" in res) setError(res.error);
    else setConnected(true);
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    const res = await disconnectSlack();
    setBusy(false);
    if ("error" in res) setError(res.error);
    else setConnected(false);
  }

  async function togglePreMeeting() {
    const next = !preMeeting;
    setPreMeeting(next);
    const res = await setSlackPreMeeting(next);
    if ("error" in res) {
      setPreMeeting(!next);
      setError(res.error);
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <SlackGlyph />
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold">Slack</h2>
          {!isConnected ? (
            <>
              <p className="text-sm text-stone-500 mt-1">
                Connect Slack to look up a teammate with <code style={{ color: "var(--accent-text)" }}>/workwith</code>{" "}
                and get a working-style read on the room before a meeting. We match your Slack
                account by your work email. Only style guidance on shared profiles is ever sent,
                never your answers.
              </p>
              <button className="btn btn-primary mt-4" onClick={connect} disabled={busy}>
                {busy ? "Connecting…" : "Connect Slack"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-stone-500 mt-1">
                Connected. Use <code style={{ color: "var(--accent-text)" }}>/workwith me</code> or{" "}
                <code style={{ color: "var(--accent-text)" }}>/workwith Priya</code> in Slack.
              </p>
              <label className="flex items-center gap-3 mt-4 cursor-pointer select-none">
                <button
                  type="button"
                  role="switch"
                  aria-checked={preMeeting}
                  onClick={togglePreMeeting}
                  className="relative w-10 h-6 rounded-full transition-colors shrink-0"
                  style={{ background: preMeeting ? "var(--accent)" : "var(--fill-3)" }}
                >
                  <span
                    className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform"
                    style={{ transform: preMeeting ? "translateX(18px)" : "translateX(2px)" }}
                  />
                </button>
                <span className="text-sm">
                  <span className="font-medium">Pre-meeting DMs.</span>{" "}
                  <span className="text-stone-500">
                    Get a short read on how to work with each attendee before a scheduled meeting.
                  </span>
                </span>
              </label>
              <button className="btn btn-ghost mt-3 py-1.5 text-sm" onClick={disconnect} disabled={busy}>
                {busy ? "…" : "Disconnect Slack"}
              </button>
            </>
          )}
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}
