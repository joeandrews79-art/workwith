/**
 * Team-level logic: relative-within-team bands, pairwise comparison, and
 * discussion talking points.
 *
 * Per the product decision, team views (dashboard, compare, discussion) place
 * each person RELATIVE TO THE CURRENT TEAM, not against any external norm. So a
 * "high" here means "high for this group", and it shifts as the team changes.
 * That is intentional and honest given we have no normative sample.
 */

import { DomainCode, DOMAIN_ORDER, DOMAINS } from "./ipip";
import { DomainScore } from "./scoring";

export interface Member {
  id: string;
  name: string;
  domains: Record<DomainCode, DomainScore>; // friendlyScore is what we compare
}

export type RelBand = "below" | "around" | "above";

export interface DomainStat {
  mean: number;
  min: number;
  max: number;
  sd: number;
  spread: number; // max - min
}

function stdDev(xs: number[], mean: number): number {
  if (xs.length < 2) return 0;
  const v = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

export function teamStats(members: Member[]): Record<DomainCode, DomainStat> {
  const out = {} as Record<DomainCode, DomainStat>;
  for (const d of DOMAIN_ORDER) {
    const xs = members.map((m) => m.domains[d].friendlyScore);
    const mean = xs.reduce((a, b) => a + b, 0) / (xs.length || 1);
    out[d] = {
      mean: Math.round(mean * 10) / 10,
      min: Math.min(...xs),
      max: Math.max(...xs),
      sd: Math.round(stdDev(xs, mean) * 10) / 10,
      spread: Math.round((Math.max(...xs) - Math.min(...xs)) * 10) / 10,
    };
  }
  return out;
}

/** A person's band relative to the team on one domain. */
export function relBand(score: number, stat: DomainStat): RelBand {
  const threshold = Math.max(6, stat.sd * 0.6);
  if (score > stat.mean + threshold) return "above";
  if (score < stat.mean - threshold) return "below";
  return "around";
}

// Plain-language pole descriptors for compare/discussion copy.
const POLE: Record<DomainCode, { high: string; low: string; talk: string }> = {
  E: {
    high: "leans social and outward, thinking out loud",
    low: "leans focused and reserved, processing before speaking",
    talk: "when to meet live versus work async, and how much group time each of you needs",
  },
  A: {
    high: "leans warm and consensus-seeking",
    low: "leans direct and outcome-first",
    talk: "how blunt to be with each other, and how openly you challenge a decision",
  },
  C: {
    high: "leans structured and plan-driven",
    low: "leans flexible and works in bursts",
    talk: "how much upfront planning versus room to adapt a project really needs",
  },
  N: {
    high: "stays calm and even under pressure",
    low: "feels pressure early and reads stress in the room",
    talk: "how you each want to handle high-pressure moments and last-minute changes",
  },
  O: {
    high: "leans exploratory and open to rethinking things",
    low: "leans practical and trusts what already works",
    talk: "how much to experiment versus stick with a proven approach",
  },
};

export interface Difference {
  domain: DomainCode;
  friendlyLabel: string;
  gap: number;
  higher: string; // member name
  lower: string; // member name
  talkingPoint: string;
}

export function compareMembers(a: Member, b: Member): Difference[] {
  const diffs: Difference[] = DOMAIN_ORDER.map((d) => {
    const sa = a.domains[d].friendlyScore;
    const sb = b.domains[d].friendlyScore;
    const higher = sa >= sb ? a : b;
    const lower = sa >= sb ? b : a;
    const gap = Math.round(Math.abs(sa - sb) * 10) / 10;
    const talkingPoint = `${higher.name} ${POLE[d].high}, while ${lower.name} ${POLE[d].low}. Worth discussing: ${POLE[d].talk}.`;
    return {
      domain: d,
      friendlyLabel: DOMAINS[d].friendly,
      gap,
      higher: higher.name,
      lower: lower.name,
      talkingPoint,
    };
  });
  return diffs.sort((x, y) => y.gap - x.gap);
}

export interface DiscussionPoint {
  title: string;
  detail: string;
}

/** Team-session talking points from the spread of profiles across the group. */
export function discussionPoints(members: Member[]): DiscussionPoint[] {
  if (members.length < 2) return [];
  const stats = teamStats(members);
  const points: DiscussionPoint[] = [];

  // Widest-spread domains: where the team differs most, best conversations.
  const ranked = [...DOMAIN_ORDER].sort((a, b) => stats[b].spread - stats[a].spread);

  for (const d of ranked.slice(0, 3)) {
    const st = stats[d];
    if (st.spread < 12) continue; // not enough divergence to be worth a topic
    const highs = members
      .filter((m) => relBand(m.domains[d].friendlyScore, st) === "above")
      .map((m) => m.name);
    const lows = members
      .filter((m) => relBand(m.domains[d].friendlyScore, st) === "below")
      .map((m) => m.name);
    const detailParts: string[] = [];
    if (highs.length) detailParts.push(`${highs.join(", ")} ${POLE[d].high}`);
    if (lows.length) detailParts.push(`${lows.join(", ")} ${POLE[d].low}`);
    points.push({
      title: `${DOMAINS[d].friendly}: your team spans a wide range here`,
      detail:
        (detailParts.join("; ") || "The team is split on this.") +
        `. As a group, agree on ${POLE[d].talk}.`,
    });
  }

  // Consensus note: a domain where everyone clusters can be a shared strength.
  const tightest = [...DOMAIN_ORDER].sort((a, b) => stats[a].spread - stats[b].spread)[0];
  if (stats[tightest].spread <= 10) {
    const dir = stats[tightest].mean >= 55 ? "high" : stats[tightest].mean <= 45 ? "low" : "mid";
    if (dir !== "mid") {
      points.push({
        title: `Shared ground: the team clusters on ${DOMAINS[tightest].friendly}`,
        detail: `Most of you land close together here (${dir === "high" ? POLE[tightest].high : POLE[tightest].low}). Name it as a shared strength, and watch for the blind spot it can create.`,
      });
    }
  }

  if (points.length === 0) {
    points.push({
      title: "A well-balanced group",
      detail:
        "Your profiles are fairly close across the board. Use the session to compare specific working preferences (meetings, feedback, planning) rather than big trait gaps.",
    });
  }

  return points;
}
