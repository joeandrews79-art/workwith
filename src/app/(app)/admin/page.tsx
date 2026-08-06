import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getOrgOverview, getOrgTeams } from "@/lib/team-data";
import { StatusPill } from "@/components/Bits";
import { initials, avatarColor, avatarInkColor } from "@/lib/ui";
import InviteForm from "@/components/InviteForm";
import RoleToggle from "@/components/RoleToggle";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/dashboard");

  const rows = await getOrgOverview(user!.orgId);

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
            <span className="pill bg-ink text-canvas text-[10px]">Admin mode</span>
          </div>
          <p className="text-muted mt-1">Manage who's on the team.</p>
        </div>
        <Link href="/me" className="btn btn-secondary py-1.5 text-sm shrink-0">
          Switch to member view
        </Link>
      </header>

      <Link href="/admin/teams" className="card p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
        <div>
          <p className="font-semibold text-sm">Teams</p>
          <p className="text-sm text-muted">Create teams, move people between them, and name each team's leader.</p>
        </div>
        <span className="text-faint" aria-hidden>→</span>
      </Link>

      <Link href="/admin/questions" className="card p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
        <div>
          <p className="font-semibold text-sm">Working-preference questions</p>
          <p className="text-sm text-muted">Edit the quick "how I work" questions your team answers. Claude can help you write them.</p>
        </div>
        <span className="text-faint" aria-hidden>→</span>
      </Link>

      <InviteForm teams={await getOrgTeams(user!.orgId)} />

      <section>
        <h2 className="font-semibold mb-3">Members · {rows.length}</h2>
        <div className="card divide-y divide-line overflow-hidden">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className="grid place-items-center w-9 h-9 rounded-full text-xs font-bold shrink-0"
                style={{ background: avatarColor(r.name), color: avatarInkColor(r.name) }}
                aria-hidden
              >
                {initials(r.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{r.name}</span>
                  {r.role === "ADMIN" && (
                    <span
                      className="pill text-[10px]"
                      style={{ background: "var(--color-brand-50)", color: "var(--color-brand-700)" }}
                    >
                      Admin
                    </span>
                  )}
                  {r.id === user!.id && (
                    <span className="pill bg-surface-2 text-muted text-[10px]">You</span>
                  )}
                </div>
                <div className="text-xs text-muted truncate">{r.title ?? "Team member"}</div>
              </div>
              <div className="hidden sm:block">
                <StatusPill status={r.status} />
              </div>
              <RoleToggle userId={r.id} role={r.role} isSelf={r.id === user!.id} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
