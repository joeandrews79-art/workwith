"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { logoutAction } from "@/app/actions";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import ThemePicker from "@/components/ThemePicker";

export default function AccountMenu({
  name,
  email,
  isAdmin,
  openUp = false,
  showName = false,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  openUp?: boolean; // open the menu upward (for the bottom-of-sidebar placement)
  showName?: boolean; // show the name in the trigger (sidebar), so it reads as the account button
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const inAdmin = pathname.startsWith("/admin");

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          showName
            ? "w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-stone-100"
            : "flex items-center gap-1.5 rounded-full pl-0.5 pr-1 py-0.5 hover:bg-stone-100"
        }
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span
          className="grid place-items-center w-8 h-8 rounded-full text-xs font-bold shrink-0"
          style={{ background: avatarColor(name), color: avatarInkColor(name) }}
          aria-hidden
        >
          {initials(name)}
        </span>
        {showName && (
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-sm font-medium truncate leading-tight">{name}</span>
            <span className="block text-[11px] text-stone-500 leading-tight">Account · sign out</span>
          </span>
        )}
        {isAdmin && inAdmin && !showName && (
          <span className="pill bg-stone-800 text-white text-[10px] hidden sm:inline-flex">Admin mode</span>
        )}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-stone-400 shrink-0" aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className={`card absolute right-0 w-60 p-1.5 shadow-lg z-30 ${openUp ? "bottom-full mb-2" : "mt-2"}`}
        >
          <div className="px-3 py-2">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-stone-500 truncate">{email}</p>
          </div>
          <div className="h-px bg-stone-100 my-1" />

          {isAdmin && (
            <button
              role="menuitem"
              onClick={() => go(inAdmin ? "/dashboard" : "/admin")}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium hover:bg-stone-100 flex items-center gap-2"
              style={{ color: "var(--color-brand-700)" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3m13-5v3a2 2 0 0 1-2 2h-3" />
              </svg>
              {inAdmin ? "Switch to member view" : "Switch to admin"}
            </button>
          )}

          <Link
            role="menuitem"
            href="/me"
            className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-100 flex items-center gap-2 text-stone-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            My profile
          </Link>

          <div className="h-px bg-stone-100 my-1" />
          <ThemePicker />
          <div className="h-px bg-stone-100 my-1" />
          <form action={logoutAction}>
            <button
              role="menuitem"
              type="submit"
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-stone-100 flex items-center gap-2 text-stone-700"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
