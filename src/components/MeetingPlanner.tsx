"use client";

import { useMemo, useState } from "react";
import { Member } from "@/lib/team";
import { buildMeetingBrief } from "@/lib/meeting";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";

export default function MeetingPlanner({
  viewer,
  others,
}: {
  viewer: Member;
  others: Member[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const chosen = useMemo(
    () => others.filter((m) => selected.has(m.id)),
    [others, selected],
  );
  const brief = useMemo(
    () => (chosen.length ? buildMeetingBrief(viewer, chosen) : null),
    [viewer, chosen],
  );

  function toggle(id: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="space-y-6">
      {/* Participant picker */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Who's in the meeting?</h2>
        <p className="text-sm text-stone-500 mb-4">
          Pick the people joining. You're included automatically.
        </p>
        {others.length === 0 ? (
          <p className="text-sm text-stone-500">
            No shared profiles yet to add. Once teammates share, they'll show up here.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {others.map((m) => {
              const on = selected.has(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  aria-pressed={on}
                  className="flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1.5 text-sm transition-colors"
                  style={{
                    borderColor: on ? "var(--color-brand-600)" : "#e2ddd4",
                    background: on ? "var(--color-brand-50)" : "#fff",
                    fontWeight: on ? 600 : 400,
                  }}
                >
                  <span
                    className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold"
                    style={{ background: avatarColor(m.name), color: avatarInkColor(m.name) }}
                    aria-hidden
                  >
                    {initials(m.name)}
                  </span>
                  {m.name}
                  {on && <span aria-hidden>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {!brief && (
        <p className="text-sm text-stone-500">
          Select at least one participant to generate your meeting brief.
        </p>
      )}

      {brief && (
        <>
          {/* Group dynamic */}
          <section className="card p-5">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <span aria-hidden>👥</span> The room
            </h2>
            <ul className="space-y-2.5">
              {brief.groupDynamic.map((g, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-stone-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "#0891b2" }} />
                  <span className="leading-relaxed">{g}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Your play */}
          <section
            className="card p-5"
            style={{ background: "var(--color-brand-50)", borderColor: "var(--color-brand-200)" }}
          >
            <h2 className="font-semibold flex items-center gap-2 mb-1">
              <span aria-hidden>🎯</span> How to show up
            </h2>
            <p className="text-sm text-stone-500 mb-3">
              Tuned to your profile and the mix of people in this meeting.
            </p>
            <ul className="space-y-2.5">
              {brief.yourPlay.map((p, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-stone-800">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--color-brand-600)" }} />
                  <span className="leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Per-person tips */}
          <section>
            <h2 className="font-semibold mb-3">Each person</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {brief.participants.map((p) => (
                <div key={p.id} className="card p-4 flex items-start gap-3">
                  <span
                    className="grid place-items-center w-10 h-10 rounded-full text-xs font-bold shrink-0"
                    style={{ background: avatarColor(p.name), color: avatarInkColor(p.name) }}
                    aria-hidden
                  >
                    {initials(p.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{p.name}</p>
                    <p className="text-[11px] text-stone-400 mb-1">
                      Stands out on {p.topTrait.toLowerCase()}
                    </p>
                    <p className="text-sm text-stone-600 leading-relaxed">{p.tip}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
