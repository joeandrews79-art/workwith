"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "daylight", label: "Daylight (light)", swatch: "#2563eb", paper: "#f6f8fb" },
  { id: "midnight", label: "Midnight", swatch: "#3b82f6", paper: "#0a0f1e" },
  { id: "graphite", label: "Graphite", swatch: "#4f8bd6", paper: "#0d1117" },
  { id: "teal", label: "Deep teal", swatch: "#14b8a6", paper: "#08120f" },
  { id: "ember", label: "Crimson", swatch: "#ef4444", paper: "#150c0d" },
];

export const THEME_STORAGE_KEY = "workwith-theme";

export default function ThemePicker() {
  const [active, setActive] = useState("daylight");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "daylight";
    setActive(current);
  }, []);

  function pick(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch {}
    setActive(id);
  }

  return (
    <div className="px-3 py-2">
      <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-wide mb-2">
        Appearance
      </p>
      <div className="flex items-center gap-2">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => pick(t.id)}
            title={t.label}
            aria-label={`${t.label} theme`}
            aria-pressed={active === t.id}
            className="relative w-8 h-8 rounded-full border transition-transform hover:scale-105"
            style={{
              background: t.paper,
              borderColor: active === t.id ? t.swatch : "var(--color-border)",
              boxShadow: active === t.id ? `0 0 0 2px ${t.swatch}` : "none",
            }}
          >
            <span
              className="absolute inset-0 m-auto w-3.5 h-3.5 rounded-full"
              style={{ background: t.swatch }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
