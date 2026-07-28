/** Display-only constants shared by server and client components. */

import { DomainCode } from "./ipip";
import { Band } from "./scoring";

/** Trait colours resolve to per-theme CSS variables (defined in globals.css),
 *  so the palette shifts with the active brand (warm for Studio, cool for
 *  Signal). Safe because every consumer applies these via inline `style`. */
export const DOMAIN_COLOR: Record<DomainCode, string> = {
  E: "var(--trait-e)", // social energy
  A: "var(--trait-a)", // collaboration
  C: "var(--trait-c)", // structure & drive
  N: "var(--trait-n)", // emotional steadiness
  O: "var(--trait-o)", // openness to change
};

export const BAND_LABEL: Record<Band, string> = {
  low: "Lower",
  moderate: "Balanced",
  high: "Higher",
};

/** A pole descriptor for the friendly scale ends, used under trait bars. */
export const DOMAIN_POLES: Record<DomainCode, { low: string; high: string }> = {
  E: { low: "Reserved, focused", high: "Outgoing, expressive" },
  A: { low: "Direct, frank", high: "Warm, accommodating" },
  C: { low: "Flexible, spontaneous", high: "Structured, driven" },
  N: { low: "Feels pressure", high: "Calm, steady" },
  O: { low: "Practical, proven", high: "Curious, inventive" },
};

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Stable pastel avatar color from a name. */
export function avatarColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 45% 88%)`;
}
export function avatarInkColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return `hsl(${h} 55% 32%)`;
}
