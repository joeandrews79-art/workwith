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
  role: string;
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
    role: u.role,
    status,
    shared: u.profile?.shared ?? false,
    refreshedAt,
    stale: isStale(refreshedAt),
    answered,
  };
}

export async function getTeamOverview(orgId: string): Promise<OverviewRow[]> {
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
