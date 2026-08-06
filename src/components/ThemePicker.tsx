"use client";

import { useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "workwith-theme";

type Brand = "studio" | "signal";
type Mode = "light" | "dark";

const BRANDS: { id: Brand; label: string; blurb: string; accent: string; paper: string; darkPaper: string }[] = [
  { id: "studio", label: "Studio", blurb: "Warm and human", accent: "#b23a5b", paper: "#f3efe9", darkPaper: "#17131b" },
  { id: "signal", label: "Signal", blurb: "Crisp and modern", accent: "#4f46e5", paper: "#eef1f6", darkPaper: "#0b0f18" },
];

function parse(theme: string): { brand: Brand; mode: Mode } {
  const brand: Brand = theme.startsWith("signal") ? "signal" : "studio";
  const mode: Mode = theme.endsWith("dark") ? "dark" : "light";
  return { brand, mode };
}

export default function ThemePicker() {
  const [theme, setTheme] = useState("studio-light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "studio-light";
    setTheme(current);
  }, []);

  function apply(next: string) {
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    setTheme(next);
  }

  const { brand: activeBrand, mode: activeMode } = parse(theme);

  return (
    <div className="px-3 py-2">
      <p className="text-[11px] font-semibold text-faint uppercase tracking-wide mb-2">
        Appearance
      </p>

      <div className="flex flex-col gap-1.5">
        {BRANDS.map((b) => {
          const on = activeBrand === b.id;
          const swatchPaper = activeMode === "dark" ? b.darkPaper : b.paper;
          return (
            <button
              key={b.id}
              onClick={() => apply(`${b.id}-${activeMode}`)}
              aria-pressed={on}
              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors"
              style={{
                background: on ? "var(--accent-soft)" : "transparent",
                boxShadow: on ? `inset 0 0 0 1px ${b.accent}` : "inset 0 0 0 1px var(--color-border)",
              }}
            >
              <span
                className="relative w-6 h-6 rounded-full shrink-0"
                style={{ background: swatchPaper, boxShadow: "inset 0 0 0 1px rgba(0,0,0,.08)" }}
              >
                <span className="absolute inset-0 m-auto w-3 h-3 rounded-full" style={{ background: b.accent }} />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight" style={{ color: on ? "var(--accent-text)" : "var(--color-ink)" }}>
                  {b.label}
                </span>
                <span className="block text-[11px] leading-tight text-faint">{b.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Light / dark for the active brand */}
      <div className="mt-2 flex items-center gap-1 rounded-lg p-0.5" style={{ background: "var(--surface-2)" }}>
        {(["light", "dark"] as Mode[]).map((m) => {
          const on = activeMode === m;
          return (
            <button
              key={m}
              onClick={() => apply(`${activeBrand}-${m}`)}
              aria-pressed={on}
              className="flex-1 rounded-md py-1 text-[12px] font-semibold capitalize transition-colors"
              style={{
                background: on ? "var(--surface)" : "transparent",
                color: on ? "var(--color-ink)" : "var(--color-muted)",
                boxShadow: on ? "var(--shadow-card)" : "none",
              }}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}
