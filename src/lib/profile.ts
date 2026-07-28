/**
 * Profile service: turns stored assessment scores into the resolved,
 * shareable profile (scores + narrative + edits), and owns the annual-refresh
 * rule. Server-only; pure data assembly, no rendering.
 */

import "server-only";
import { prisma } from "./db";
import { DomainCode, DOMAIN_ORDER } from "./ipip";
import { DomainScore, FacetScore } from "./scoring";
import { buildNarrative, Narrative, resolveNarrative } from "./narrative";

export const STALE_MONTHS = 12;

export function isStale(refreshedAt: Date | null | undefined): boolean {
  if (!refreshedAt) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - STALE_MONTHS);
  return refreshedAt < cutoff;
}

export function monthsSince(date: Date): number {
  const now = new Date();
  return (
    (now.getFullYear() - date.getFullYear()) * 12 +
    (now.getMonth() - date.getMonth())
  );
}

function parseDomains(json: string | null): Record<DomainCode, DomainScore> | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as Record<DomainCode, DomainScore>;
    // basic shape check
    for (const d of DOMAIN_ORDER) if (!obj[d]) return null;
    return obj;
  } catch {
    return null;
  }
}

function parseFacets(json: string | null): FacetScore[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as FacetScore[];
  } catch {
    return [];
  }
}

export interface AssembledProfile {
  userId: string;
  name: string;
  title: string | null;
  avatar: string | null;
  shared: boolean;
  refreshedAt: Date | null;
  stale: boolean;
  domains: Record<DomainCode, DomainScore> | null;
  facets: FacetScore[];
  narrative: Narrative | null;
  edited: boolean; // whether the user has customized the narrative
}

/** Assemble one user's full profile from the DB. */
export async function assembleProfile(userId: string): Promise<AssembledProfile | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
  if (!user) return null;

  const assessment =
    (user.profile?.assessmentId &&
      (await prisma.assessment.findUnique({
        where: { id: user.profile.assessmentId },
      }))) ||
    (await prisma.assessment.findFirst({
      where: { userId, status: "COMPLETED" },
      orderBy: { completedAt: "desc" },
    }));

  const domains = parseDomains(assessment?.domainScores ?? null);
  const facets = parseFacets(assessment?.facetScores ?? null);

  let narrative: Narrative | null = null;
  let edited = false;
  if (domains) {
    const generated = buildNarrative(user.name, domains);
    let editedNarrative: Partial<Narrative> | null = null;
    if (user.profile?.editedNarrative) {
      try {
        editedNarrative = JSON.parse(user.profile.editedNarrative);
        edited = true;
      } catch {
        editedNarrative = null;
      }
    }
    narrative = resolveNarrative(generated, editedNarrative);
  }

  const refreshedAt = user.profile?.refreshedAt ?? assessment?.completedAt ?? null;

  return {
    userId: user.id,
    name: user.name,
    title: user.title,
    avatar: user.avatar,
    shared: user.profile?.shared ?? false,
    refreshedAt,
    stale: isStale(refreshedAt),
    domains,
    facets,
    narrative,
    edited,
  };
}
