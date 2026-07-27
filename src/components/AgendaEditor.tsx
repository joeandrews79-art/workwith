"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addAgendaItem,
  updateAgendaItem,
  deleteAgendaItem,
  reorderAgenda,
  buildAgendaAction,
  tightenAgendaAction,
} from "@/app/actions";
import type { AgendaItemView } from "@/lib/meeting-data";

const PURPOSES = ["decision", "discussion", "information", "brainstorm"] as const;
const PURPOSE_LABEL: Record<string, string> = {
  decision: "Decision",
  discussion: "Discussion",
  information: "Info",
  brainstorm: "Brainstorm",
};

export default function AgendaEditor({
  meetingId,
  items,
  attendees,
  aiEnabled,
}: {
  meetingId: string;
  items: AgendaItemView[];
  attendees: { id: string; name: string }[];
  aiEnabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [newTopic, setNewTopic] = useState("");
  const [newPurpose, setNewPurpose] = useState<(typeof PURPOSES)[number]>("discussion");
  const [newMinutes, setNewMinutes] = useState("");

  const totalMinutes = items.reduce((s, i) => s + (i.minutes ?? 0), 0);

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  function commit(item: AgendaItemView, patch: Partial<AgendaItemView>) {
    const next = { ...item, ...patch };
    run(() =>
      updateAgendaItem(item.id, {
        topic: next.topic,
        purpose: next.purpose,
        minutes: next.minutes,
        ownerId: next.ownerId,
      }),
    );
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= items.length) return;
    const ids = items.map((i) => i.id);
    [ids[index], ids[j]] = [ids[j], ids[index]];
    run(() => reorderAgenda(meetingId, ids));
  }

  function add() {
    if (!newTopic.trim()) return setError("Give the item a topic.");
    const minutes = newMinutes ? parseInt(newMinutes, 10) : null;
    run(() => addAgendaItem(meetingId, { topic: newTopic.trim(), purpose: newPurpose, minutes, ownerId: null }));
    setNewTopic("");
    setNewMinutes("");
    setNewPurpose("discussion");
  }

  function build() {
    if (items.length > 0 && !confirm("Replace the current agenda with a fresh AI draft?")) return;
    run(() => buildAgendaAction(meetingId));
  }

  function copy() {
    const text = items
      .map((i, n) => `${n + 1}. ${i.topic}${i.minutes ? ` (${i.minutes}m)` : ""} — ${PURPOSE_LABEL[i.purpose]}${i.ownerName ? `, ${i.ownerName}` : ""}`)
      .join("\n");
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <section className="card p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Agenda</h2>
          {totalMinutes > 0 && <span className="text-xs text-stone-400">{totalMinutes} min total</span>}
        </div>
        <div className="flex items-center gap-1.5">
          {aiEnabled && (
            <>
              <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={build} disabled={pending}>
                {items.length ? "Rebuild with AI" : "Build with AI"}
              </button>
              {items.length > 0 && (
                <button className="btn btn-secondary py-1 px-2.5 text-xs" onClick={() => run(() => tightenAgendaAction(meetingId))} disabled={pending}>
                  Tighten
                </button>
              )}
            </>
          )}
          {items.length > 0 && (
            <button className="btn btn-ghost py-1 px-2.5 text-xs" onClick={copy} disabled={pending}>
              {copied ? "Copied" : "Copy"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-stone-500">
          No agenda yet. Add items below{aiEnabled ? ", or let Claude draft one" : ""}.
        </p>
      ) : (
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={item.id} className="rounded-lg border border-stone-200 p-3">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-0.5 pt-1">
                  <button className="text-stone-400 hover:text-stone-700 disabled:opacity-30" onClick={() => move(i, -1)} disabled={pending || i === 0} aria-label="Move up">▲</button>
                  <button className="text-stone-400 hover:text-stone-700 disabled:opacity-30" onClick={() => move(i, 1)} disabled={pending || i === items.length - 1} aria-label="Move down">▼</button>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    className="input py-1.5"
                    defaultValue={item.topic}
                    onBlur={(e) => e.target.value.trim() && e.target.value !== item.topic && commit(item, { topic: e.target.value.trim() })}
                    aria-label={`Topic ${i + 1}`}
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <select className="input py-1 px-2 text-xs w-auto" value={item.purpose} onChange={(e) => commit(item, { purpose: e.target.value as AgendaItemView["purpose"] })} disabled={pending} aria-label="Purpose">
                      {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        className="input py-1 px-2 text-xs w-16"
                        defaultValue={item.minutes ?? ""}
                        placeholder="min"
                        onBlur={(e) => {
                          const v = e.target.value ? parseInt(e.target.value, 10) : null;
                          if (v !== item.minutes) commit(item, { minutes: v });
                        }}
                        aria-label="Minutes"
                      />
                      <span className="text-xs text-stone-400">min</span>
                    </div>
                    <select className="input py-1 px-2 text-xs w-auto" value={item.ownerId ?? ""} onChange={(e) => commit(item, { ownerId: e.target.value || null })} disabled={pending} aria-label="Owner">
                      <option value="">No owner</option>
                      {attendees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                    <button className="btn btn-ghost py-1 px-2 text-xs text-red-700 ml-auto" onClick={() => run(() => deleteAgendaItem(item.id))} disabled={pending}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add item */}
      <div className="flex items-end gap-2 pt-2 border-t border-stone-100">
        <div className="flex-1 space-y-1">
          <label className="label text-xs" htmlFor="new-topic">Add an item</label>
          <input id="new-topic" className="input py-1.5" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} placeholder="Topic" onKeyDown={(e) => e.key === "Enter" && add()} />
        </div>
        <select className="input py-1.5 w-auto" value={newPurpose} onChange={(e) => setNewPurpose(e.target.value as (typeof PURPOSES)[number])} aria-label="New item purpose">
          {PURPOSES.map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
        </select>
        <input type="number" min={1} className="input py-1.5 w-16" value={newMinutes} onChange={(e) => setNewMinutes(e.target.value)} placeholder="min" aria-label="New item minutes" />
        <button className="btn btn-primary py-1.5" onClick={add} disabled={pending}>Add</button>
      </div>
    </section>
  );
}
