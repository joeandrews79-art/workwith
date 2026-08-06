"use client";

import { useState } from "react";
import { DomainCode, DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DomainStat, RelBand, relBand } from "@/lib/team";
import { DOMAIN_COLOR, DOMAIN_POLES, initials, avatarColor, avatarInkColor } from "@/lib/ui";

export interface SpectrumMember {
  id: string;
  name: string;
  isViewer: boolean;
  scores: Record<DomainCode, number>; // friendlyScore per domain
}

type View = "spectrum" | "map";

function tint(hex: string, pct: number) {
  return `color-mix(in srgb, ${hex} ${pct}%, transparent)`;
}

export default function TeamSpectrum({
  members,
  stats,
  discussion,
}: {
  members: SpectrumMember[];
  stats: Record<DomainCode, DomainStat>;
  discussion: { title: string; detail: string }[];
}) {
  const [view, setView] = useState<View>("spectrum");
  const viewer = members.find((m) => m.isViewer) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: "var(--color-brand-200)" }}>
          {(["spectrum", "map"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{
                background: view === v ? "var(--color-brand-600)" : "transparent",
                color: view === v ? "#fff" : "inherit",
              }}
            >
              {v === "spectrum" ? "Trait spectrum" : "Two-trait map"}
            </button>
          ))}
        </div>
        <Legend />
      </div>

      {view === "spectrum" ? (
        <SpectrumView members={members} stats={stats} />
      ) : (
        <MapView members={members} />
      )}

      {viewer && <WhereYouStand viewer={viewer} stats={stats} />}

      {discussion.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold">Team patterns worth talking about</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {discussion.map((p, i) => (
              <div key={i} className="card p-4">
                <p className="font-medium text-sm">{p.title}</p>
                <p className="text-sm text-muted mt-1 leading-relaxed">{p.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
      <span className="flex items-center gap-1.5">
        <span className="w-3 h-3 rounded-full" style={{ background: "var(--color-brand-600)", boxShadow: "0 0 0 2px var(--color-brand-100)" }} />You
      </span>
      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-faint" />Teammate</span>
      <span className="flex items-center gap-1.5"><span className="inline-block w-0.5 h-3.5 bg-muted" />Team average</span>
      <span className="flex items-center gap-1.5"><span className="w-5 h-3 rounded-sm bg-fill-3" />Team spread</span>
    </div>
  );
}

// --- Spectrum ---------------------------------------------------------------

function SpectrumView({ members, stats }: { members: SpectrumMember[]; stats: Record<DomainCode, DomainStat> }) {
  return (
    <div className="card p-5 space-y-5">
      {DOMAIN_ORDER.map((d) => {
        const st = stats[d];
        const color = DOMAIN_COLOR[d];
        const poles = DOMAIN_POLES[d];
        return (
          <div key={d}>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="font-medium text-sm">{DOMAINS[d].friendly}</span>
              <span className="text-[11px] text-faint">{poles.low} — {poles.high}</span>
            </div>
            <div
              className="relative h-7 rounded-md"
              style={{ background: "var(--color-elevated)", border: "0.5px solid var(--color-border, #e2ddd4)" }}
            >
              <div
                className="absolute inset-y-0 rounded"
                style={{ left: `${st.min}%`, width: `${Math.max(st.max - st.min, 0)}%`, background: tint(color, 16) }}
              />
              <div
                className="absolute -inset-y-1 w-0.5"
                style={{ left: `${st.mean}%`, background: "var(--color-muted, #6b7280)", transform: "translateX(-1px)" }}
                title={`Team average ${Math.round(st.mean)}`}
              />
              {members.map((m) => {
                const v = m.scores[d];
                return (
                  <SpectrumDot
                    key={m.id}
                    left={v}
                    label={m.isViewer ? "You" : m.name}
                    score={Math.round(v)}
                    size={m.isViewer ? 16 : 11}
                    background={m.isViewer ? "var(--color-brand-600)" : "var(--faint)"}
                    ring={m.isViewer ? "0 0 0 3px var(--color-brand-100)" : undefined}
                    border={m.isViewer ? undefined : "1.5px solid var(--color-elevated)"}
                    z={m.isViewer ? 3 : 2}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SpectrumDot({
  left,
  label,
  score,
  size,
  background,
  ring,
  border,
  z,
}: {
  left: number;
  label: string;
  score: number;
  size: number;
  background: string;
  ring?: string;
  border?: string;
  z: number;
}) {
  return (
    <span
      className="group absolute top-1/2 hover:z-30"
      style={{ left: `${left}%`, transform: "translate(-50%,-50%)", zIndex: z }}
    >
      <span
        className="block rounded-full"
        style={{ width: size, height: size, background, boxShadow: ring, border }}
      />
      <span
        className="pointer-events-none absolute left-1/2 bottom-full mb-1.5 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "var(--ink)", color: "var(--canvas)", zIndex: 40 }}
      >
        {label} · {score}
      </span>
    </span>
  );
}

// --- Two-trait map ----------------------------------------------------------

function MapView({ members }: { members: SpectrumMember[] }) {
  const [x, setX] = useState<DomainCode>("E");
  const [y, setY] = useState<DomainCode>("C");
  const S = 360;
  const P = 40;
  const px = (v: number) => P + (v / 100) * (S - 2 * P);
  const py = (v: number) => S - P - (v / 100) * (S - 2 * P);

  return (
    <div className="card p-5">
      <div className="flex flex-wrap gap-3 mb-4">
        <label className="text-sm flex items-center gap-2">
          <span className="text-muted">Across</span>
          <select className="input py-1 text-sm w-auto" value={x} onChange={(e) => setX(e.target.value as DomainCode)}>
            {DOMAIN_ORDER.map((d) => <option key={d} value={d}>{DOMAINS[d].friendly}</option>)}
          </select>
        </label>
        <label className="text-sm flex items-center gap-2">
          <span className="text-muted">Up</span>
          <select className="input py-1 text-sm w-auto" value={y} onChange={(e) => setY(e.target.value as DomainCode)}>
            {DOMAIN_ORDER.map((d) => <option key={d} value={d}>{DOMAINS[d].friendly}</option>)}
          </select>
        </label>
      </div>
      <div className="mx-auto" style={{ maxWidth: S }}>
        <svg viewBox={`0 0 ${S} ${S}`} width="100%" role="img" aria-label={`Map of ${DOMAINS[x].friendly} across versus ${DOMAINS[y].friendly} up, with teammates plotted`}>
          <line x1={px(50)} y1={P} x2={px(50)} y2={S - P} stroke="var(--color-border, #e2ddd4)" />
          <line x1={P} y1={py(50)} x2={S - P} y2={py(50)} stroke="var(--color-border, #e2ddd4)" />
          <line x1={P} y1={P} x2={P} y2={S - P} stroke="var(--color-border, #e2ddd4)" strokeWidth={0.75} />
          <line x1={P} y1={S - P} x2={S - P} y2={S - P} stroke="var(--color-border, #e2ddd4)" strokeWidth={0.75} />
          <text x={S - P} y={S - P + 16} textAnchor="end" fontSize="11" fill="var(--color-muted, #6b7280)">{DOMAIN_POLES[x].high}</text>
          <text x={P} y={S - P + 16} textAnchor="start" fontSize="11" fill="var(--color-muted, #6b7280)">{DOMAIN_POLES[x].low}</text>
          <text x={14} y={P + (S - 2 * P) * 0.25} textAnchor="middle" fontSize="11" fill="var(--color-muted, #6b7280)" transform={`rotate(-90 14 ${P + (S - 2 * P) * 0.25})`}>{DOMAIN_POLES[y].high}</text>
          <text x={14} y={P + (S - 2 * P) * 0.75} textAnchor="middle" fontSize="11" fill="var(--color-muted, #6b7280)" transform={`rotate(-90 14 ${P + (S - 2 * P) * 0.75})`}>{DOMAIN_POLES[y].low}</text>
          {members.map((m) => {
            const cx = px(m.scores[x]);
            const cy = py(m.scores[y]);
            return (
              <g key={m.id}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={m.isViewer ? 9 : 6}
                  fill={m.isViewer ? "var(--color-brand-600)" : "var(--faint)"}
                  stroke={m.isViewer ? "var(--color-brand-100)" : "var(--color-elevated)"}
                  strokeWidth={m.isViewer ? 3 : 1.5}
                >
                  <title>{m.isViewer ? "You" : m.name}: {DOMAINS[x].friendly} {Math.round(m.scores[x])}, {DOMAINS[y].friendly} {Math.round(m.scores[y])}</title>
                </circle>
                <text x={cx} y={cy - (m.isViewer ? 14 : 11)} textAnchor="middle" fontSize="10" fill="var(--color-muted, #6b7280)">
                  {m.isViewer ? "You" : m.name.split(/\s+/)[0]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// --- Where you stand (deterministic) ---------------------------------------

const REL_COPY: Record<Exclude<RelBand, "around">, { verb: string; tone: string }> = {
  above: { verb: "higher than most of the team", tone: "var(--color-brand-700)" },
  below: { verb: "lower than most of the team", tone: "var(--color-brand-700)" },
};

function WhereYouStand({ viewer, stats }: { viewer: SpectrumMember; stats: Record<DomainCode, DomainStat> }) {
  const standouts = DOMAIN_ORDER.map((d) => ({ d, band: relBand(viewer.scores[d], stats[d]) })).filter(
    (r) => r.band !== "around",
  ) as { d: DomainCode; band: "above" | "below" }[];

  return (
    <div className="card p-5">
      <h2 className="font-semibold mb-1">Where you sit</h2>
      {standouts.length === 0 ? (
        <p className="text-sm text-muted">
          You land close to the team average on every trait. You're a steady middle across the board,
          which can make you a natural bridge between the more extreme styles.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted mb-3">
            The traits where you stand apart from your team, and what that tends to mean at work.
          </p>
          <ul className="space-y-2.5">
            {standouts.map(({ d, band }) => {
              const poles = DOMAIN_POLES[d];
              const leaning = band === "above" ? poles.high : poles.low;
              return (
                <li key={d} className="flex items-start gap-2.5 text-sm">
                  <span
                    className="mt-1 shrink-0 w-2 h-2 rounded-full"
                    style={{ background: DOMAIN_COLOR[d] }}
                    aria-hidden
                  />
                  <span className="leading-relaxed">
                    <span className="font-medium">{DOMAINS[d].friendly}:</span> you're{" "}
                    <span style={{ color: REL_COPY[band].tone, fontWeight: 500 }}>{REL_COPY[band].verb}</span>{" "}
                    — more {leaning.toLowerCase()}. Worth noticing when the group leans the other way.
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
