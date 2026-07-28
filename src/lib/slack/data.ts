import { prisma } from "@/lib/db";
import { getVisibleMembers } from "@/lib/team-data";
import type { Member } from "@/lib/team";

/** Slack link CRUD + the resolvers the slash command and tick job need. */

export async function getSlackLinkByUser(userId: string) {
  return prisma.slackLink.findUnique({ where: { userId } });
}

/** Resolve an inbound Slack user id to the linked WorkWith user. */
export async function getUserBySlackId(slackUserId: string) {
  const link = await prisma.slackLink.findFirst({
    where: { slackUserId },
    include: { user: { select: { id: true, name: true, orgId: true, email: true } } },
  });
  return link?.user ?? null;
}

export async function upsertSlackLink(
  userId: string,
  slackUserId: string,
  slackTeamId?: string | null,
) {
  return prisma.slackLink.upsert({
    where: { userId },
    create: { userId, slackUserId, slackTeamId: slackTeamId ?? null },
    update: { slackUserId, slackTeamId: slackTeamId ?? null },
  });
}

export async function deleteSlackLink(userId: string) {
  await prisma.slackLink.deleteMany({ where: { userId } });
}

export async function setSlackPrefs(
  userId: string,
  prefs: { preMeetingEnabled?: boolean; coachingEnabled?: boolean },
) {
  return prisma.slackLink.update({ where: { userId }, data: prefs });
}

/** The caller as a Member plus everyone they can see (org-wide, shared-gated),
 *  for the `/workwith` command. Viewer is present only if they have a profile. */
export async function getCommandContext(userId: string, orgId: string) {
  const members = await getVisibleMembers(orgId, userId);
  const viewer = members.find((m) => m.id === userId) ?? null;
  const teammates = members.filter((m) => m.id !== userId);
  return { viewer, teammates };
}

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Match a free-text name (from slash-command text) to one teammate.
 * Handles a raw name, a first name, or a Slack mention token `<@U123|display>`.
 * Returns the single best match, or null with the candidate list for a hint.
 */
export function matchTeammate(
  query: string,
  teammates: Member[],
): { match: Member | null; candidates: Member[] } {
  // Strip a Slack mention token down to its display part, if present.
  const mention = query.match(/^<@[^|>]+\|?([^>]*)>$/);
  const q = norm(mention ? mention[1] : query).replace(/^@/, "");
  if (!q) return { match: null, candidates: teammates };

  const exact = teammates.filter((t) => norm(t.name) === q);
  if (exact.length === 1) return { match: exact[0], candidates: [] };

  const firstName = teammates.filter((t) => norm(t.name.split(/\s+/)[0]) === q);
  if (firstName.length === 1) return { match: firstName[0], candidates: [] };

  const contains = teammates.filter((t) => norm(t.name).includes(q));
  if (contains.length === 1) return { match: contains[0], candidates: [] };

  // Ambiguous or none: surface the plausible candidates for a helpful reply.
  const pool = firstName.length ? firstName : contains.length ? contains : teammates;
  return { match: null, candidates: pool };
}
