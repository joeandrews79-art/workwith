import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { getOrgTeams, getTeamRoster, getOrgPeople } from "@/lib/team-data";
import CreateTeamForm from "@/components/CreateTeamForm";
import TeamRosterEditor from "@/components/TeamRosterEditor";

export const dynamic = "force-dynamic";

export default async function AdminTeamsPage() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) redirect("/dashboard");

  const [teams, people] = await Promise.all([
    getOrgTeams(user!.orgId),
    getOrgPeople(user!.orgId),
  ]);
  const rosters = await Promise.all(teams.map((t) => getTeamRoster(t.id)));

  return (
    <div className="space-y-6 max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Teams</h1>
            <span className="pill bg-ink text-canvas text-[10px]">Admin mode</span>
          </div>
          <p className="text-muted mt-1">
            Create teams, move people between them, and name each team's leader. A
            person can be on more than one team, and can lead one while just being a
            member of another.
          </p>
        </div>
        <Link href="/admin" className="btn btn-secondary py-1.5 text-sm shrink-0">
          Back to admin
        </Link>
      </header>

      <CreateTeamForm />

      <div className="space-y-8">
        {teams.map((team, i) => {
          const members = rosters[i];
          const memberIds = new Set(members.map((m) => m.id));
          const candidates = people.filter((p) => !memberIds.has(p.id));
          return (
            <section key={team.id} className="space-y-2">
              <h2 className="font-semibold">{team.name}</h2>
              <TeamRosterEditor
                teamId={team.id}
                teamName={team.name}
                members={members}
                candidates={candidates}
                canDelete={teams.length > 1}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
