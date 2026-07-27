/** Display-only constants shared by server and client components. */

import { DomainCode } from "./ipip";
import { Band } from "./scoring";

export const DOMAIN_COLOR: Record<DomainCode, string> = {
  E: "#ea580c", // social energy — orange
  A: "#16a34a", // collaboration — green
  C: "#2563eb", // structure & drive — blue
  N: "#0891b2", // emotional steadiness — cyan
  O: "#9333ea", // openness to change — purple
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
