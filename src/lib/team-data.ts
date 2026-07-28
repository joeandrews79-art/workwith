/** Server-only loaders that assemble team-wide views from the database. */

import "server-only";
import { prisma } from "./db";
import { DomainCode, DOMAIN_ORDER } from "./ipip";
import { DomainScore } from "./scoring";
import { isStale } from "./profile";
import { Member } from "./team";

export type MemberStatus = "not_started" | "in_progress" | "completed";

export interface OverviewRow {
  id: string;
  name: string;
  title: string | null;
  avatar: string | null;
  role: string; // org role: ADMIN | MEMBER
  teamRole?: "LEADER" | "MEMBER"; // per-team role, set by team-scoped loaders
  status: MemberStatus;
  shared: boolean;
  refreshedAt: Date | null;
  stale: boolean;
  answered: number; // for in-progress
}

function parseDomains(json: string | null): Record<DomainCode, DomainScore> | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as Record<DomainCode, DomainScore>;
    for (const d of DOMAIN_ORDER) if (!obj[d]) return null;
    return obj;
  } catch {
    return null;
  }
}

function countAnswered(responses: string): number {
  try {
    return Object.keys(JSON.parse(responses)).length;
  } catch {
    return 0;
  }
}

type UserWithData = {
  id: string;
  name: string;
  title: string | null;
  avatar: string | null;
  role: string;
  profile: { shared: boolean; refreshedAt: Date | null } | null;
  assessments: { status: string; completedAt: Date | null; responses: string }[];
};

function toOverviewRow(u: UserWithData): OverviewRow {
  const completed = u.assessments.find((a) => a.status === "COMPLETED");
  const inProgress = u.assessments.find((a) => a.status === "IN_PROGRESS");
  let status: MemberStatus = "not_started";
  let answered = 0;
  if (completed) status = "completed";
  else if (inProgress) {
    status = "in_progress";
    answered = countAnswered(inProgress.responses);
  }
  const refreshedAt = u.profile?.refreshedAt ?? completed?.completedAt ?? null;
  return {
    id: u.id,
    name: u.name,
    title: u.title,
    avatar: u.avatar,
    role: u.role,
    status,
    shared: u.profile?.shared ?? false,
    refreshedAt,
    stale: isStale(refreshedAt),
    answered,
  };
}

/** Everyone in the org (used by the admin roster, which is org-wide). */
export async function getOrgOverview(orgId: string): Promise<OverviewRow[]> {
  const users = await prisma.user.findMany({
    where: { orgId },
    include: {
      profile: true,
      assessments: { orderBy: { startedAt: "desc" } },
    },
    orderBy: { name: "asc" },
  });
  return users.map(toOverviewRow);
}

export interface OrgTeam {
  id: string;
  name: string;
  memberCount: number;
}

/** All teams in the org with a member count. For admin team management. */
export async function getOrgTeams(orgId: string): Promise<OrgTeam[]> {
  const teams = await prisma.team.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    include: { _count: { select: { members: true } } },
  });
  return teams.map((t) => ({ id: t.id, name: t.name, memberCount: t._count.members }));
}

export interface RosterPerson {
  id: string;
  name: string;
  title: string | null;
  teamRole?: "LEADER" | "MEMBER";
}

/** Lightweight roster of one team (name/title/role), for management screens. */
export async function getTeamRoster(teamId: string): Promise<RosterPerson[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: { user: { select: { id: true, name: true, title: true } } },
  });
  return members
    .map((m) => ({
      id: m.user.id,
      name: m.user.name,
      title: m.user.title,
      teamRole: (m.role === "LEADER" ? "LEADER" : "MEMBER") as "LEADER" | "MEMBER",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Everyone in the org (id/name/title), for building an "add member" picker. */
export async function getOrgPeople(orgId: string): Promise<RosterPerson[]> {
  const users = await prisma.user.findMany({
    where: { orgId },
    select: { id: true, name: true, title: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name, title: u.title }));
}

/** Members of one specific team (the active-team scoped view). */
export async function getTeamMemberRows(teamId: string): Promise<OverviewRow[]> {
  const members = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        include: {
          profile: true,
          assessments: { orderBy: { startedAt: "desc" } },
        },
      },
    },
  });
  return members
    .map((m) => ({
      ...toOverviewRow(m.user),
      teamRole: (m.role === "LEADER" ? "LEADER" : "MEMBER") as "LEADER" | "MEMBER",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface TeamGroup {
  id: string;
  name: string;
  members: OverviewRow[];
}

export async function getTeamsOverview(orgId: string): Promise<TeamGroup[]> {
  const teams = await prisma.team.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
    include: {
      members: {
        include: {
          user: {
            include: {
              profile: true,
              assessments: { orderBy: { startedAt: "desc" } },
            },
          },
        },
      },
    },
  });
  return teams.map((t) => ({
    id: t.id,
    name: t.name,
    members: t.members
      .map((m) => toOverviewRow(m.user))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

/**
 * Members whose scores the viewer may see for team computations: completed AND
 * (shared OR the viewer themself). Unshared profiles stay out of compare,
 * discussion, and the team-average markers.
 */
export async function getVisibleMembers(
  orgId: string,
  viewerId: string,
): Promise<Member[]> {
  const users = await prisma.user.findMany({
    where: { orgId },
    include: {
      profile: true,
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { name: "asc" },
  });

  const members: Member[] = [];
  for (const u of users) {
    const completed = u.assessments[0];
    if (!completed) continue;
    const visible = u.profile?.shared || u.id === viewerId;
    if (!visible) continue;
    const domains = parseDomains(completed.domainScores);
    if (!domains) continue;
    members.push({ id: u.id, name: u.name, domains });
  }
  return members;
}

/**
 * Same visibility rule as getVisibleMembers, but scoped to a single team:
 * members of `teamId` whose profile is completed AND (shared OR the viewer).
 * This is what compare, discussion, and meeting prep read once a team is active.
 */
export async function getVisibleTeamMembers(
  teamId: string,
  viewerId: string,
): Promise<Member[]> {
  const rows = await prisma.teamMember.findMany({
    where: { teamId },
    include: {
      user: {
        include: {
          profile: true,
          assessments: {
            where: { status: "COMPLETED" },
            orderBy: { completedAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  const members: Member[] = [];
  for (const { user: u } of rows) {
    const completed = u.assessments[0];
    if (!completed) continue;
    const visible = u.profile?.shared || u.id === viewerId;
    if (!visible) continue;
    const domains = parseDomains(completed.domainScores);
    if (!domains) continue;
    members.push({ id: u.id, name: u.name, domains });
  }
  return members.sort((a, b) => a.name.localeCompare(b.name));
}
