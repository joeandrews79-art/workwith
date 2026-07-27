/**
 * Active-team resolution for the multi-team foundation (Phase 2).
 *
 * A person can belong to several teams. Every team view (dashboard, directory,
 * compare, discussion, meeting prep) is scoped to whichever team is "active".
 * The active team is remembered in a cookie and always validated against the
 * user's real memberships, so a stale or hand-edited cookie can never leak
 * another team into view.
 */

import "server-only";
import { cookies } from "next/headers";
import { prisma } from "./db";

const ACTIVE_TEAM_COOKIE = "workwith_active_team";

export type TeamRole = "LEADER" | "MEMBER";

export interface TeamRef {
  id: string;
  name: string;
  role: TeamRole; // this user's role on this team
}

/** Teams this user belongs to, alphabetical, with their per-team role. */
export async function getUserTeams(userId: string): Promise<TeamRef[]> {
  const memberships = await prisma.teamMember.findMany({
    where: { userId },
    include: { team: { select: { id: true, name: true } } },
  });
  return memberships
    .map((m) => ({
      id: m.team.id,
      name: m.team.name,
      role: (m.role === "LEADER" ? "LEADER" : "MEMBER") as TeamRole,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Can this viewer see the leader-level view / manage this team? True for org
 * admins (any team) and for the team's own leaders. Oversight only — it never
 * unlocks another person's private profile content, which stays share-gated.
 */
export async function canLeadTeam(
  userId: string,
  teamId: string,
  isOrgAdmin: boolean,
): Promise<boolean> {
  if (isOrgAdmin) return true;
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId } },
    select: { role: true },
  });
  return m?.role === "LEADER";
}

export interface ActiveTeamContext {
  teams: TeamRef[];
  activeTeamId: string | null;
  activeTeam: TeamRef | null;
}

/**
 * Resolve the user's teams and their active team in one pass. The active team
 * is the cookie's team if the user is still a member of it, otherwise their
 * first team, otherwise null (they are on no team yet).
 */
export async function getActiveTeamContext(userId: string): Promise<ActiveTeamContext> {
  const teams = await getUserTeams(userId);
  if (teams.length === 0) {
    return { teams, activeTeamId: null, activeTeam: null };
  }
  const jar = await cookies();
  const cookieId = jar.get(ACTIVE_TEAM_COOKIE)?.value;
  const active = (cookieId && teams.find((t) => t.id === cookieId)) || teams[0];
  return { teams, activeTeamId: active.id, activeTeam: active };
}

/** Just the resolved active team id (or null). Convenience for page loaders. */
export async function getActiveTeamId(userId: string): Promise<string | null> {
  return (await getActiveTeamContext(userId)).activeTeamId;
}

/**
 * Set the active team cookie. Caller (a server action) must confirm the user is
 * a member of teamId first. A one-year cookie; it is only ever read after being
 * re-validated against live memberships, so a long life is safe.
 */
export async function writeActiveTeamCookie(teamId: string): Promise<void> {
  const jar = await cookies();
  jar.set(ACTIVE_TEAM_COOKIE, teamId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}
