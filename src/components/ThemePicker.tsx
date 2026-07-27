"use client";

import { useEffect, useState } from "react";

const THEMES = [
  { id: "indigo", label: "Indigo", swatch: "#4f46e5", paper: "#edeaf3" },
  { id: "slate", label: "Slate", swatch: "#2563eb", paper: "#e9edf3" },
  { id: "sage", label: "Sage", swatch: "#0d9488", paper: "#e7eee9" },
  { id: "warm", label: "Warm", swatch: "#ea580c", paper: "#f1ece4" },
];

export const THEME_STORAGE_KEY = "workwith-theme";

export default function ThemePicker() {
  const [active, setActive] = useState("indigo");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "indigo";
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
