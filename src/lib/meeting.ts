/**
 * Meeting prep: given the people in an upcoming meeting, read the group's
 * communication dynamic and give the viewer tailored advice on how to show up,
 * accounting for their own strengths and blind spots.
 *
 * Fully deterministic, computed from Big Five profiles. No transcripts are
 * used here (that is the flagged Phase 2 upgrade). See docs/roadmap.md.
 */

import { DomainCode, DOMAIN_ORDER, DOMAINS } from "./ipip";
import { Member, teamStats } from "./team";
import { MeetingTypeCode, meetingType } from "./meeting-types";

export interface ParticipantRead {
  id: string;
  name: string;
  topTrait: string; // friendly label of their most distinctive trait
  tip: string; // how to communicate with them
}

export interface TypeLens {
  label: string;
  framing: string;
  pointers: string[];
}

export interface MeetingBrief {
  participants: ParticipantRead[];
  groupDynamic: string[];
  yourPlay: string[];
  lens?: TypeLens; // type-specific framing, when a meeting type is set
}

function mostDistinctive(m: Member): DomainCode {
  return [...DOMAIN_ORDER].sort(
    (a, b) =>
      Math.abs(m.domains[b].friendlyScore - 50) -
      Math.abs(m.domains[a].friendlyScore - 50),
  )[0];
}

// How to communicate WITH a person, by their strongest pole.
const COMM_TIP: Record<DomainCode, { high: string; low: string }> = {
  E: {
    high: "Give them room to think out loud; expect fast, verbal energy.",
    low: "Send context ahead and give them a beat; don't force on-the-spot answers.",
  },
  A: {
    high: "Keep it warm and collaborative; acknowledge people before the ask.",
    low: "Be direct and get to the point; they respect candor over cushioning.",
  },
  C: {
    high: "Come with a clear agenda, owners, and next steps.",
    low: "Go light on process; focus on the goal, not the checklist.",
  },
  N: {
    high: "They stay level under pressure; you can be candid and matter-of-fact.",
    low: "Flag hard topics early and avoid surprise pressure; give them room to think.",
  },
  O: {
    high: "Bring the big picture and stay open to riffing on new angles.",
    low: "Lead with the practical case and proven upside, not novelty.",
  },
};

function pole(m: Member, d: DomainCode): "high" | "low" {
  return m.domains[d].friendlyScore >= 50 ? "high" : "low";
}

export function buildMeetingBrief(
  viewer: Member,
  others: Member[],
  type?: MeetingTypeCode,
): MeetingBrief {
  const participants: ParticipantRead[] = others.map((m) => {
    const d = mostDistinctive(m);
    return {
      id: m.id,
      name: m.name,
      topTrait: DOMAINS[d].friendly,
      tip: COMM_TIP[d][pole(m, d)],
    };
  });

  const group = [viewer, ...others];
  const stats = teamStats(group);

  // --- Group dynamic: strongest tilts + widest split. ---
  const groupDynamic: string[] = [];
  const tilts = [...DOMAIN_ORDER]
    .map((d) => ({ d, dist: Math.abs(stats[d].mean - 50) }))
    .sort((a, b) => b.dist - a.dist);

  for (const { d, dist } of tilts.slice(0, 2)) {
    if (dist < 12) continue;
    const hi = stats[d].mean >= 50;
    groupDynamic.push(GROUP_TILT[d][hi ? "high" : "low"]);
  }
  // widest spread -> a likely friction point
  const widest = [...DOMAIN_ORDER].sort((a, b) => stats[b].spread - stats[a].spread)[0];
  if (stats[widest].spread >= 25) {
    groupDynamic.push(
      `The room is split on ${DOMAINS[widest].friendly.toLowerCase()}, so expect some friction there. Name it early rather than letting it simmer.`,
    );
  }
  if (groupDynamic.length === 0) {
    groupDynamic.push(
      "This is a fairly balanced room with no single dominant style. Set a clear purpose up front and it should flow well.",
    );
  }

  // --- Your play: where the viewer diverges most from the room. ---
  const yourPlay: string[] = [];
  const divergence = DOMAIN_ORDER.map((d) => ({
    d,
    diff: viewer.domains[d].friendlyScore - stats[d].mean,
  })).sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  for (const { d, diff } of divergence.slice(0, 2)) {
    if (Math.abs(diff) < 10) continue;
    yourPlay.push(YOUR_PLAY[d][diff > 0 ? "aboveRoom" : "belowRoom"]);
  }
  // Leverage the viewer's single biggest strength as a contribution.
  const strength = mostDistinctive(viewer);
  yourPlay.push(STRENGTH_PLAY[strength][pole(viewer, strength)]);

  const lens: TypeLens | undefined = type
    ? (() => {
        const t = meetingType(type);
        return { label: t.label, framing: t.framing, pointers: t.lens };
      })()
    : undefined;

  return { participants, groupDynamic, yourPlay, lens };
}

const GROUP_TILT: Record<DomainCode, { high: string; low: string }> = {
  E: {
    high: "High-energy, talkative room. A lot will get said out loud, so make sure quieter points and quieter people still get airtime.",
    low: "This is a reserved, heads-down room. Don't mistake quiet for disengagement; give people space and consider sharing material ahead of time.",
  },
  A: {
    high: "Warm, consensus-leaning room. People will work to keep things pleasant, so watch that real disagreement doesn't get smoothed over.",
    low: "Direct, frank room. Expect blunt debate and challenge; don't read candor as conflict, and get to the point.",
  },
  C: {
    high: "Planning-heavy room. Decisions will want structure, clear owners, and next steps, so come prepared.",
    low: "Fast, improvisational room. It will move quickly and loosely; capture the decisions and owners so nothing slips.",
  },
  N: {
    high: "Steady, even-keeled room. It can absorb pressure and candor well, so you can be straightforward.",
    low: "This room feels pressure. Keep the temperature down, avoid surprise curveballs, and give people time on hard calls.",
  },
  O: {
    high: "Idea-hungry room. Expect lots of new angles and 'what ifs'; keep an eye on the clock so it converges on a decision.",
    low: "Practical, proven-first room. New ideas will need a concrete case; lead with the real-world upside.",
  },
};

const YOUR_PLAY: Record<DomainCode, { aboveRoom: string; belowRoom: string }> = {
  E: {
    aboveRoom:
      "You bring more verbal energy than this room. You will fill silences fast, so consciously draw others out and leave gaps.",
    belowRoom:
      "This room is more talkative than you. Plan to make your key points early, or send your thinking in writing beforehand so it lands.",
  },
  A: {
    aboveRoom:
      "You lead with more warmth than this room. Here you can get to your point faster and not over-soften the message.",
    belowRoom:
      "This room is warmer than your default. Add a little context and acknowledgment before the critique so it lands well.",
  },
  C: {
    aboveRoom:
      "You want more structure than this room. Bring your agenda, but hold it loosely so you don't stall a fast-moving group.",
    belowRoom:
      "This room wants more structure than you naturally bring. Show up with a crisp agenda and clear asks.",
  },
  N: {
    aboveRoom:
      "You stay calmer than this room. Your steadiness is useful, but show enough urgency that people know the topic matters to you.",
    belowRoom:
      "This room is steadier than you under pressure. Prepare thoroughly so you are not caught flat-footed; you do your best with a moment to think.",
  },
  O: {
    aboveRoom:
      "You bring more new ideas than this room. Ground them in the practical case and a clear 'why now' so they don't get waved off.",
    belowRoom:
      "This room floats more ideas than you naturally would. Stay open and resist shutting new angles down before they are explored.",
  },
};

const STRENGTH_PLAY: Record<DomainCode, { high: string; low: string }> = {
  E: {
    high: "Lean on your ease with people to keep the energy up and the conversation moving.",
    low: "Lean on your focus: come with a couple of well-formed points that cut through the noise.",
  },
  A: {
    high: "Lean on your read of the room to surface tension people are avoiding and keep trust intact.",
    low: "Lean on your candor to name the real issue when everyone else is talking around it.",
  },
  C: {
    high: "Lean on your organization to leave the meeting with clear owners and next steps.",
    low: "Lean on your flexibility to keep the group unstuck when a plan needs to change on the fly.",
  },
  N: {
    high: "Lean on your calm to steady the room when the stakes rise.",
    low: "Lean on your sensitivity to pressure to spot when the group is pushing too hard, too fast.",
  },
  O: {
    high: "Lean on your ideas to open up options the group hasn't considered.",
    low: "Lean on your practicality to pressure-test ideas against what will actually work.",
  },
};
