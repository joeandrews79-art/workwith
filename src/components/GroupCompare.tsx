"use client";

import { useMemo, useState } from "react";
import { Member, teamStats, compareMembers, discussionPoints } from "@/lib/team";
import { DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DOMAIN_COLOR, DOMAIN_POLES, initials, avatarColor, avatarInkColor } from "@/lib/ui";
import { SpectrumDot } from "@/components/TeamSpectrum";

const PALETTE = ["#4f46e5", "#ea580c", "#0d9488", "#db2777", "#ca8a04", "#16a34a", "#7c3aed", "#dc2626"];

export default function GroupCompare({
  members,
  viewerId,
}: {
  members: Member[];
  viewerId: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(members.some((m) => m.id === viewerId) ? [viewerId] : []),
  );

  const chosen = useMemo(() => members.filter((m) => selected.has(m.id)), [members, selected]);
  const colorOf = useMemo(() => {
    const map = new Map<string, string>();
    chosen.forEach((m, i) => map.set(m.id, PALETTE[i % PALETTE.length]));
    return map;
  }, [chosen]);

  const stats = useMemo(() => (chosen.length >= 2 ? teamStats(chosen) : null), [chosen]);

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
      {/* People picker */}
      <section className="card p-5">
        <h2 className="font-semibold mb-1">Who do you want to compare?</h2>
        <p className="text-sm text-stone-500 mb-4">Pick two or more people with a shared profile.</p>
        <div className="flex flex-wrap gap-2">
          {members.map((m) => {
            const on = selected.has(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                aria-pressed={on}
                className="flex items-center gap-2 rounded-full border pl-1.5 pr-3 py-1.5 text-sm transition-colors"
                style={{
                  borderColor: on ? "var(--color-brand-600)" : "#e2ddd4",
                  background: on ? "var(--color-brand-50)" : "var(--color-elevated)",
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
                {m.id === viewerId ? "You" : m.name}
                {on && <span aria-hidden>✓</span>}
              </button>
            );
          })}
        </div>
      </section>

      {chosen.length < 2 ? (
        <p className="text-sm text-stone-500">Pick at least two people to see the comparison.</p>
      ) : (
        <>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {chosen.map((m) => (
              <span key={m.id} className="flex items-center gap-1.5 text-sm font-medium">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: colorOf.get(m.id) }} />
                {m.id === viewerId ? "You" : m.name}
              </span>
            ))}
          </div>

          {/* Spectrum */}
          <section className="card p-5 space-y-5">
            <h2 className="font-semibold">Side by side</h2>
            {DOMAIN_ORDER.map((d) => {
              const st = stats![d];
              const poles = DOMAIN_POLES[d];
              return (
                <div key={d}>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span className="font-medium text-sm">{DOMAINS[d].friendly}</span>
                    <span className="text-[11px] text-stone-400">{poles.low} — {poles.high}</span>
                  </div>
                  <div className="relative h-7 rounded-md" style={{ background: "var(--color-elevated)", border: "0.5px solid var(--color-border)" }}>
                    <div
                      className="absolute inset-y-0 rounded bg-stone-200/70"
                      style={{ left: `${st.min}%`, width: `${Math.max(st.max - st.min, 0)}%` }}
                    />
                    {chosen.map((m) => {
                      const v = m.domains[d].friendlyScore;
                      return (
                        <SpectrumDot
                          key={m.id}
                          left={v}
                          label={m.id === viewerId ? "You" : m.name}
                          score={Math.round(v)}
                          size={14}
                          background={colorOf.get(m.id)!}
                          border="2px solid var(--color-elevated)"
                          z={2}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </section>

          {chosen.length === 2 ? (
            <PairDifferences a={chosen[0]} b={chosen[1]} />
          ) : (
            <GroupDifferences members={chosen} />
          )}
        </>
      )}
    </div>
  );
}

function PairDifferences({ a, b }: { a: Member; b: Member }) {
  const top = compareMembers(a, b).slice(0, 3);
  return (
    <section>
      <h2 className="font-semibold mb-3">Biggest differences to talk about</h2>
      <div className="space-y-3">
        {top.map((d) => (
          <div key={d.domain} className="card p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: DOMAIN_COLOR[d.domain] }} />
              <h3 className="font-semibold text-sm">{d.friendlyLabel}</h3>
              <span className="text-xs text-stone-400 ml-auto">{Math.round(d.gap)} points apart</span>
            </div>
            <p className="text-sm text-stone-600 leading-relaxed">{d.talkingPoint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function GroupDifferences({ members }: { members: Member[] }) {
  const points = discussionPoints(members);
  return (
    <section>
      <h2 className="font-semibold mb-3">Where this group differs most</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {points.map((p, i) => (
          <div key={i} className="card p-4">
            <p className="font-medium text-sm">{p.title}</p>
            <p className="text-sm text-stone-500 mt-1 leading-relaxed">{p.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
