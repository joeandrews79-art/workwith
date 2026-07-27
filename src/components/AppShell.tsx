"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AccountMenu from "@/components/AccountMenu";

type IconKey =
  | "dashboard"
  | "team"
  | "meeting"
  | "compare"
  | "discussion"
  | "me"
  | "admin";

function Icon({ name }: { name: IconKey }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "dashboard":
      return <svg {...common}><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>;
    case "team":
      return <svg {...common}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "meeting":
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case "compare":
      return <svg {...common}><path d="M12 3v18M5 8l-3 3 3 3M19 8l3 3-3 3" /></svg>;
    case "discussion":
      return <svg {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
    case "me":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></svg>;
    case "admin":
      return <svg {...common}><path d="M12 2 4 6v6c0 5 3.4 7.7 8 9 4.6-1.3 8-4 8-9V6z" /></svg>;
  }
}

const BASE: { href: string; label: string; icon: IconKey }[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/directory", label: "Team", icon: "team" },
  { href: "/meeting", label: "Meeting prep", icon: "meeting" },
  { href: "/compare", label: "Compare", icon: "compare" },
  { href: "/discussion", label: "Discussion", icon: "discussion" },
  { href: "/me", label: "My profile", icon: "me" },
];

export default function AppShell({
  name,
  email,
  isAdmin,
  children,
}: {
  name: string;
  email: string;
  isAdmin: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = isAdmin ? [...BASE, { href: "/admin", label: "Admin", icon: "admin" as IconKey }] : BASE;

  useEffect(() => setOpen(false), [pathname]);

  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const NavLinks = () => (
    <nav className="flex-1 px-3 py-2 space-y-0.5" aria-label="Primary">
      {links.map((l) => {
        const on = active(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={
              on
                ? { background: "var(--color-brand-50)", color: "var(--color-brand-700)" }
                : { color: "#57534e" }
            }
          >
            <Icon name={l.icon} />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight px-5 h-14 shrink-0">
      <span className="inline-grid place-items-center w-7 h-7 rounded-lg text-white text-sm" style={{ background: "var(--color-brand-600)" }} aria-hidden>W</span>
      <span>WorkWith</span>
    </Link>
  );

  return (
    <div className="min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-stone-200 bg-white/70 backdrop-blur z-20">
        <Brand />
        <NavLinks />
        <div className="border-t border-stone-100 p-3">
          <AccountMenu name={name} email={email} isAdmin={isAdmin} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between h-14 px-3 border-b border-stone-200 bg-white/90 backdrop-blur">
        <button className="btn btn-ghost py-1.5 px-2" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 font-bold">
          <span className="inline-grid place-items-center w-7 h-7 rounded-lg text-white text-sm" style={{ background: "var(--color-brand-600)" }} aria-hidden>W</span>
          WorkWith
        </Link>
        <AccountMenu name={name} email={email} isAdmin={isAdmin} />
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-64 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button className="btn btn-ghost py-1.5 px-2" onClick={() => setOpen(false)} aria-label="Close menu">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <NavLinks />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="md:pl-60">
        <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-8 text-[11px] text-stone-400 leading-relaxed">
          WorkWith is a self-report reflection tool built on the public-domain Big
          Five (IPIP-NEO-120, Goldberg / Johnson 2014). It is not a clinical,
          diagnostic, or hiring assessment. Your responses stay in this app and are
          never sent to a third party.
        </footer>
      </div>
    </div>
  );
}
