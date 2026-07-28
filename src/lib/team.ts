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

/* ---------------------------------------------------------------------------
   Relational coaching: "how do I work with <person>?"
   Deterministic and local (no AI, nothing leaves the app). Reuses the shared
   profile data already visible on Compare, and turns the biggest style gaps
   into advice directed at the viewer.
--------------------------------------------------------------------------- */

// Directed advice per domain, from the VIEWER's side. `theyHigh` = the other
// person sits higher on this trait than the viewer; `theyLow` = lower. {n} is
// the other person's first name.
const ADVICE: Record<DomainCode, { theyHigh: string; theyLow: string }> = {
  E: {
    theyHigh:
      "{n} thinks out loud and gets energy from live back-and-forth, while you do your best thinking with some quiet first. Give {n} a quick reaction in the moment so they are not left guessing, then ask for time to follow up once you have sat with it.",
    theyLow:
      "{n} processes before speaking and can find nonstop live discussion draining, while you think by talking. Send a note or agenda ahead so {n} can prepare, and leave real silence in the room for their take instead of filling it.",
  },
  A: {
    theyHigh:
      "{n} weighs how a decision lands on people and leans toward consensus, while you lead with the outcome. Say the warm part out loud before the blunt part, and frame a hard call as a shared problem rather than a verdict.",
    theyLow:
      "{n} is direct and outcome-first and will tell you straight, while you read the room more. Take their bluntness as respect, not friction, and give them your real position in one plain sentence before you add the nuance.",
  },
  C: {
    theyHigh:
      "{n} likes a plan and clear next steps, while you work in bursts and adapt as you go. Put the plan in writing and flag changes early, so your flexibility does not read as unreliability to them.",
    theyLow:
      "{n} works flexibly and can feel boxed in by heavy process, while you want the plan pinned down. Agree on the few things that truly must be fixed, and leave the rest open so they have room to move.",
  },
  N: {
    theyHigh:
      "{n} stays even under pressure, while you read stress early and feel it. Do not mistake their calm for not caring, and name it plainly when a deadline or conflict is getting to you so they can adjust.",
    theyLow:
      "{n} feels pressure early and reads stress in the room, while you stay level. Give them a heads-up before big changes and a little more reassurance under a tight deadline, since what feels routine to you may not to them.",
  },
  O: {
    theyHigh:
      "{n} likes to explore new approaches and rethink things, while you trust what already works. Hear the new idea out before you weigh the risk, and ask them to pressure-test it against the proven path rather than shutting it down.",
    theyLow:
      "{n} trusts proven methods and can find constant experimenting unsettling, while you like to try new angles. Bring a change with a clear reason and a small first step, so it feels like a considered move and not churn.",
  },
};

export interface RelationalMove {
  trait: string;
  text: string;
}

export interface RelationalGuide {
  otherName: string;
  headline: string;
  read: string;
  moves: RelationalMove[];
  commonGround: string | null;
}

/** Advice for the viewer on working with one teammate, from their style gaps. */
export function workingWith(viewer: Member, other: Member): RelationalGuide {
  const first = other.name.trim().split(/\s+/)[0];
  const diffs = compareMembers(viewer, other); // sorted widest gap first

  const significant = diffs.filter((d) => d.gap >= 8);
  const top = (significant.length ? significant : []).slice(0, 3);

  const moves: RelationalMove[] = top.map((d) => {
    const otherHigher =
      other.domains[d.domain].friendlyScore > viewer.domains[d.domain].friendlyScore;
    const text = (otherHigher ? ADVICE[d.domain].theyHigh : ADVICE[d.domain].theyLow).replace(
      /\{n\}/g,
      first,
    );
    return { trait: d.friendlyLabel, text };
  });

  // Common ground: the trait where you sit closest, if it is genuinely close.
  const closest = diffs[diffs.length - 1];
  const commonGround =
    closest && closest.gap <= 10
      ? `You land close together on ${closest.friendlyLabel.toLowerCase()}, which is easy shared ground.`
      : null;

  let headline: string;
  let read: string;
  if (moves.length === 0) {
    headline = `You and ${first} work in pretty similar ways.`;
    read =
      "Your styles line up across the board, so friction is unlikely to come from how you each work. The thing to watch is the blind spot two similar people can share, so invite a different view on the calls that matter.";
  } else {
    const t1 = top[0].friendlyLabel.toLowerCase();
    const t2 = top[1]?.friendlyLabel.toLowerCase();
    headline = `The biggest gap between you and ${first} is ${t1}.`;
    read =
      `Where you two are furthest apart is ${t1}${t2 ? ` and ${t2}` : ""}. ` +
      `That is not a problem, it just tells you where a little translation goes a long way.` +
      (commonGround ? ` ${commonGround}` : "");
  }

  return { otherName: other.name, headline, read, moves, commonGround };
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
