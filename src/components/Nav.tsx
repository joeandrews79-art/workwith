"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AccountMenu from "@/components/AccountMenu";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/directory", label: "Team" },
  { href: "/meeting", label: "Meeting prep" },
  { href: "/compare", label: "Compare" },
  { href: "/discussion", label: "Discussion" },
  { href: "/me", label: "My profile" },
];

export default function Nav({
  name,
  email,
  isAdmin,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin" }] : LINKS;

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
            <span
              className="inline-grid place-items-center w-7 h-7 rounded-lg text-white text-sm"
              style={{ background: "var(--color-brand-600)" }}
              aria-hidden
            >
              W
            </span>
            <span className="hidden sm:inline">WorkWith</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active(l.href)
                    ? "bg-brand-50 text-brand-700"
                    : "text-stone-600 hover:bg-stone-100"
                }`}
                style={active(l.href) ? { background: "var(--color-brand-50)", color: "var(--color-brand-700)" } : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <AccountMenu name={name} email={email} isAdmin={isAdmin} />
            <button
              className="md:hidden btn btn-ghost py-1.5"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="md:hidden pb-3 grid gap-1" aria-label="Mobile">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${
                  active(l.href) ? "text-brand-700" : "text-stone-700 hover:bg-stone-100"
                }`}
                style={active(l.href) ? { background: "var(--color-brand-50)", color: "var(--color-brand-700)" } : undefined}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
