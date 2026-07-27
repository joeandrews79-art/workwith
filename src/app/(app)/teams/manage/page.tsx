import Link from "next/link";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getActiveTeamContext } from "@/lib/active-team";
import { getTeamRoster, getOrgPeople } from "@/lib/team-data";
import { NoTeam } from "@/components/Bits";
import TeamRosterEditor from "@/components/TeamRosterEditor";

export const dynamic = "force-dynamic";

/**
 * Team leaders manage the team they're currently viewing. Org admins can also
 * use this, though they get the org-wide view at /admin/teams. The page always
 * acts on the ACTIVE team, so switching teams in the sidebar switches what you
 * manage here.
 */
export default async function ManageTeamPage() {
  const user = (await getCurrentUser())!;
  const { activeTeam, teams } = await getActiveTeamContext(user.id);
  if (!activeTeam) return <NoTeam />;

  const orgAdmin = isAdmin(user);
  const canLead = orgAdmin || activeTeam.role === "LEADER";
  const ledTeams = teams.filter((t) => t.role === "LEADER");

  if (!canLead) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Manage team</h1>
        <div className="card p-6">
          <p className="font-semibold">You don't lead {activeTeam.name}</p>
          <p className="text-sm text-stone-500 mt-1">
            You can only manage teams you lead.{" "}
            {ledTeams.length
              ? "Switch to one of the teams you lead using the team switcher in the sidebar:"
              : "You don't lead any team yet. Ask an admin if you should."}
          </p>
          {ledTeams.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {ledTeams.map((t) => (
                <li key={t.id} className="pill bg-stone-100 text-stone-600">{t.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  const [members, people] = await Promise.all([
    getTeamRoster(activeTeam.id),
    getOrgPeople(user.orgId),
  ]);
  const memberIds = new Set(members.map((m) => m.id));
  const candidates = people.filter((p) => !memberIds.has(p.id));

  return (
    <div className="max-w-2xl space-y-4">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage {activeTeam.name}</h1>
          <p className="text-stone-500 mt-1">
            Add or remove people, rename the team, and choose who leads it.
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-secondary py-1.5 text-sm shrink-0">
          Back to dashboard
        </Link>
      </header>

      <TeamRosterEditor
        teamId={activeTeam.id}
        teamName={activeTeam.name}
        members={members}
        candidates={candidates}
        canDelete={false}
      />

      <p className="text-xs text-stone-400">
        Managing another team? Switch teams with the picker at the top of the
        sidebar.
      </p>
    </div>
  );
}
