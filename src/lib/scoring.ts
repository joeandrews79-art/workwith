/**
 * Scoring engine for the IPIP-NEO-120.
 *
 * How it works (also documented in docs/scoring.md):
 *   1. Each item is answered 1..5 (Very Inaccurate .. Very Accurate).
 *   2. Negatively-keyed ("minus") items are reverse-scored: v -> 6 - v.
 *      After this step every item points in the trait-positive direction.
 *   3. A facet score is the mean of its 4 items (1..5).
 *   4. A domain score is the mean of its 24 items (1..5).
 *   5. Means are rescaled to 0..100 as (mean - 1) / 4 * 100 for display.
 *   6. Neuroticism is ALSO exposed as its inverse, "Emotional steadiness"
 *      (friendlyScore = 100 - trait score), because that is the intuitive
 *      workplace framing. Raw trait scores are always retained.
 *
 * No population norms are used. Bands here are relative to the response scale
 * itself, NOT to any normative sample. This is a self-report reflection tool,
 * not a validated clinical or hiring assessment.
 */

import { DomainCode, DOMAIN_ORDER, ITEMS } from "./ipip";

export type Responses = Record<string, number>; // itemId -> 1..5

export interface DomainScore {
  domain: DomainCode;
  mean: number; // 1..5 in raw trait direction
  traitScore: number; // 0..100 raw trait direction
  friendlyScore: number; // 0..100 in the friendly/plain direction (N inverted)
}

export interface FacetScore {
  domain: DomainCode;
  facet: number; // 1..6
  mean: number; // 1..5 raw trait direction
  score: number; // 0..100 raw trait direction
}

export interface ScoreResult {
  answeredCount: number;
  totalCount: number;
  complete: boolean;
  domains: Record<DomainCode, DomainScore>;
  facets: FacetScore[];
}

export type Band = "low" | "moderate" | "high";

const NEEDS_INVERT: Record<DomainCode, boolean> = {
  E: false,
  A: false,
  C: false,
  N: true,
  O: false,
};

function to100(mean: number): number {
  return Math.round(((mean - 1) / 4) * 1000) / 10; // one decimal
}

/** Reverse-key a raw 1..5 answer if the item is negatively keyed. */
export function effectiveValue(rawValue: number, keyed: "plus" | "minus"): number {
  return keyed === "minus" ? 6 - rawValue : rawValue;
}

export function scoreAssessment(responses: Responses): ScoreResult {
  const domainSums: Record<string, { sum: number; n: number }> = {};
  const facetSums: Record<string, { sum: number; n: number }> = {};
  let answered = 0;

  for (const item of ITEMS) {
    const raw = responses[item.id];
    if (raw == null || raw < 1 || raw > 5) continue;
    answered++;
    const eff = effectiveValue(raw, item.keyed);
    const dKey = item.domain;
    const fKey = `${item.domain}${item.facet}`;
    (domainSums[dKey] ??= { sum: 0, n: 0 });
    (facetSums[fKey] ??= { sum: 0, n: 0 });
    domainSums[dKey].sum += eff;
    domainSums[dKey].n += 1;
    facetSums[fKey].sum += eff;
    facetSums[fKey].n += 1;
  }

  const domains = {} as Record<DomainCode, DomainScore>;
  for (const d of DOMAIN_ORDER) {
    const agg = domainSums[d];
    const mean = agg && agg.n > 0 ? agg.sum / agg.n : 3; // neutral fallback
    const traitScore = to100(mean);
    const friendlyScore = NEEDS_INVERT[d]
      ? Math.round((100 - traitScore) * 10) / 10
      : traitScore;
    domains[d] = { domain: d, mean, traitScore, friendlyScore };
  }

  const facets: FacetScore[] = [];
  for (const d of DOMAIN_ORDER) {
    for (let f = 1; f <= 6; f++) {
      const agg = facetSums[`${d}${f}`];
      const mean = agg && agg.n > 0 ? agg.sum / agg.n : 3;
      facets.push({ domain: d, facet: f, mean, score: to100(mean) });
    }
  }

  return {
    answeredCount: answered,
    totalCount: ITEMS.length,
    complete: answered === ITEMS.length,
    domains,
    facets,
  };
}

/** Absolute band, used for a person's OWN self-contained narrative. */
export function bandFor(score100: number): Band {
  if (score100 < 40) return "low";
  if (score100 > 60) return "high";
  return "moderate";
}

/** Compact serializable form we persist on a completed assessment. */
export function serializeScores(result: ScoreResult) {
  const domainScores: Record<string, DomainScore> = {};
  for (const d of DOMAIN_ORDER) domainScores[d] = result.domains[d];
  return {
    domainScores,
    facetScores: result.facets,
  };
}
