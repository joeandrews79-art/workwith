/**
 * Narrative generator: turns Big Five domain scores into plain, approachable
 * "how I work" language. Fully deterministic and local. No AI service is
 * called, so no profile data ever leaves the app.
 *
 * Design (see docs/scoring.md):
 *   - Each domain is placed in a band (low / moderate / high) using its
 *     FRIENDLY score (Neuroticism is read as "Emotional steadiness").
 *   - Every band carries hand-written copy fragments mapped to the five
 *     "How to work with me" sections. Distinctive traits (non-moderate) drive
 *     the copy; balanced traits stay quiet so the profile reads like a person,
 *     not a readout.
 *   - The summary is written in the third person (for the directory header);
 *     the five sections are written in the first person (the person's voice).
 *
 * All copy is original to this project. It intentionally avoids the archetype
 * names, wording, and framing of any proprietary instrument.
 */

import { DomainCode, DOMAIN_ORDER, DOMAINS } from "./ipip";
import { Band, bandFor, DomainScore } from "./scoring";

export type SectionKey =
  | "communication"
  | "decisions"
  | "feedback"
  | "priorities"
  | "frustrations";

export const SECTION_LABELS: Record<SectionKey, string> = {
  communication: "How I like to communicate",
  decisions: "How I make decisions",
  feedback: "How I like to receive feedback",
  priorities: "What I prioritize",
  frustrations: "What frustrates me",
};

export interface Narrative {
  summary: string;
  sections: Record<SectionKey, string>;
  /** Advice to the person on flexing their OWN style (Cloverleaf-style coaching). */
  selfCoaching: string[];
}

type Fragment = Partial<Record<SectionKey | "summary" | "selfTip", string>>;

const COPY: Record<DomainCode, Record<Band, Fragment>> = {
  E: {
    high: {
      summary: "draws energy from people and thinks out loud",
      communication:
        "I do my best thinking out loud, so I like to talk things through in real time. Expect me to be quick to call, message, or pull people together.",
      priorities:
        "I care about momentum and keeping people connected, and I will usually push to get the right folks in the room.",
      frustrations:
        "Long stretches of silence with no interaction wear on me.",
      selfTip:
        "You fill a silence quickly. Leave deliberate space for quieter colleagues to weigh in before you land a view.",
    },
    moderate: {
      communication:
        "I move comfortably between talking things through and working solo, depending on the task.",
    },
    low: {
      summary: "recharges through focus and processes before speaking",
      communication:
        "I process internally before I speak, so give me a beat to think. I often prefer a written note or a small conversation over a big group thread.",
      priorities: "I protect focused time and tend to go deep rather than wide.",
      frustrations:
        "Back-to-back meetings and a constant stream of pings drain me and eat into real work.",
      selfTip:
        "Your best thinking often stays in your head. Share your reasoning a little earlier so others are not left guessing.",
    },
  },
  A: {
    high: {
      summary: "leads with cooperation and reads the room",
      communication:
        "I keep things warm and try to hear people out before I land on a view.",
      decisions:
        "I weigh how a decision lands on the people involved, not just the outcome on paper.",
      feedback:
        "Give me feedback kindly and in private. Blunt or public criticism lands harder on me than you might expect.",
      priorities:
        "Trust and a healthy team matter to me, and I will spend real effort to protect them.",
      frustrations:
        "Needless conflict, point-scoring, and steamrolling people frustrate me.",
      selfTip:
        "You work to keep everyone comfortable. Practice saying the hard thing plainly when a decision genuinely needs it.",
    },
    moderate: {
      communication:
        "I try to be straight with people while keeping things constructive.",
    },
    low: {
      summary: "is direct and outcome-first",
      communication:
        "I am blunt and to the point. If I disagree I will say so plainly, and I do not take a good debate personally.",
      decisions:
        "I decide on the merits and am comfortable making the unpopular call.",
      feedback:
        "Be direct with me. Skip the cushioning and tell me what is wrong. I would rather hear it straight.",
      priorities:
        "I care about getting to the right answer more than keeping everyone comfortable.",
      frustrations:
        "Vagueness, talking around a problem, and decisions made just to avoid friction frustrate me.",
      selfTip:
        "Your directness saves time but can land as harsh. A line of context or warmth before the critique goes a long way.",
    },
  },
  C: {
    high: {
      summary: "is organized, reliable, and pushes work to done",
      decisions: "I like a plan, clear owners, and a deadline before we move.",
      feedback: "Tie feedback to specifics and a next step, and I will act on it fast.",
      priorities:
        "I prioritize following through and hitting commitments. If I said I would do it, it will get done.",
      frustrations:
        "Missed deadlines, sloppy handoffs, and moving without a plan frustrate me.",
      selfTip:
        "You hold a high bar. Flag when a rough draft is fine so you are not applying final-polish standards to early work.",
    },
    moderate: {
      priorities: "I balance planning with staying flexible when plans change.",
    },
    low: {
      summary: "stays flexible and works in bursts",
      decisions:
        "I would rather keep options open than lock a rigid plan too early.",
      feedback: "Point feedback at the big picture rather than process nitpicks.",
      priorities:
        "I prioritize adaptability and can shift quickly when the situation changes.",
      frustrations:
        "Heavy process, rigid checklists, and micromanagement slow me down.",
      selfTip:
        "You move fast and loose. Put key dates and owners in writing so structured colleagues can rely on you.",
    },
  },
  N: {
    // Friendly direction: high = steady/calm, low = feels pressure more.
    high: {
      summary: "stays calm and even under pressure",
      decisions:
        "I keep a level head when things get tense and can decide under stress.",
      feedback: "You can be candid with me. I take feedback in stride.",
      frustrations:
        "Manufactured urgency and panic over things that are not really emergencies frustrate me.",
      selfTip:
        "Your calm is steadying, but others may read it as not caring. Show a little urgency so people know a thing matters to you too.",
    },
    moderate: {
      feedback: "Straightforward, specific feedback works fine for me.",
    },
    low: {
      summary: "feels things intensely and senses pressure early",
      communication: "A heads-up before big changes helps me a lot.",
      decisions:
        "Under real pressure I do better with a moment to think than an on-the-spot demand.",
      feedback:
        "Frame feedback constructively and give me the context. Surprise criticism can rattle me.",
      frustrations:
        "Chaos, last-minute fire drills, and high-stakes surprises stress me out.",
      selfTip:
        "You register stress early. Name it out loud so colleagues can give you the heads-up and space you do your best work with.",
    },
  },
  O: {
    high: {
      summary: "is curious and drawn to new ideas",
      decisions:
        "I like to explore options and question how things are usually done.",
      priorities:
        "I prioritize new ideas and improving the approach, not just running the current one.",
      frustrations:
        "Doing something a certain way only because it has always been done that way frustrates me.",
      selfTip:
        "You generate ideas fast. Slow down enough to bring practical colleagues along with a clear 'why now'.",
    },
    moderate: {
      decisions: "I am open to new ideas, but I want them grounded in something real.",
    },
    low: {
      summary: "is practical and trusts what already works",
      decisions:
        "I trust proven approaches and want to see the concrete case before changing course.",
      priorities: "I prioritize practicality and consistency over novelty.",
      frustrations:
        "Change for its own sake, and half-baked ideas with no plan, frustrate me.",
      selfTip:
        "You protect what works. Give a new idea a genuine hearing before deciding it is a distraction.",
    },
  },
};

const SECTION_FALLBACK: Record<SectionKey, string> = {
  communication:
    "I adapt how I communicate to the situation and the people involved.",
  decisions:
    "I try to weigh the facts and the people, then commit once the picture is clear.",
  feedback: "Clear, specific, and timely feedback works well for me.",
  priorities: "I try to keep the important work moving and the team in good shape.",
  frustrations: "Unclear expectations and avoidable rework frustrate me.",
};

interface DomainRead {
  domain: DomainCode;
  band: Band;
  strength: number; // distance from the neutral midpoint
}

function reads(domains: Record<DomainCode, DomainScore>): DomainRead[] {
  return DOMAIN_ORDER.map((d) => {
    const friendly = domains[d].friendlyScore;
    return { domain: d, band: bandFor(friendly), strength: Math.abs(friendly - 50) };
  });
}

export function buildNarrative(
  name: string,
  domains: Record<DomainCode, DomainScore>,
): Narrative {
  const rd = reads(domains);

  // --- Summary: the two or three most distinctive traits, third person. ---
  const distinctive = rd
    .filter((r) => r.band !== "moderate" && COPY[r.domain][r.band].summary)
    .sort((a, b) => b.strength - a.strength);
  const first = name.trim().split(/\s+/)[0] || name;

  let summary: string;
  if (distinctive.length === 0) {
    summary = `${first} sits in a balanced range across the working-style traits, without a strong pull in any single direction. That tends to make for a steady, adaptable teammate.`;
  } else {
    const clauses = distinctive
      .slice(0, 3)
      .map((r) => COPY[r.domain][r.band].summary as string);
    const joined =
      clauses.length === 1
        ? clauses[0]
        : clauses.slice(0, -1).join(", ") + ", and " + clauses[clauses.length - 1];
    summary = `${first} ${joined}.`;
  }

  // --- Sections: top contributing distinctive domains per section. ---
  const sections = {} as Record<SectionKey, string>;
  const sectionKeys: SectionKey[] = [
    "communication",
    "decisions",
    "feedback",
    "priorities",
    "frustrations",
  ];
  for (const key of sectionKeys) {
    const contributors = rd
      .filter((r) => COPY[r.domain][r.band][key] && r.band !== "moderate")
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2)
      .map((r) => COPY[r.domain][r.band][key] as string);

    if (contributors.length === 0) {
      // fall back to a moderate fragment if one exists, else a generic line
      const moderateFrag = rd
        .map((r) => COPY[r.domain][r.band][key])
        .find((t): t is string => Boolean(t));
      sections[key] = moderateFrag ?? SECTION_FALLBACK[key];
    } else {
      sections[key] = contributors.join(" ");
    }
  }

  // --- Self-coaching: flex tips from the most distinctive traits. ---
  const selfCoaching = rd
    .filter((r) => r.band !== "moderate" && COPY[r.domain][r.band].selfTip)
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 3)
    .map((r) => COPY[r.domain][r.band].selfTip as string);
  if (selfCoaching.length === 0) {
    selfCoaching.push(
      "Your style is well balanced. Watch for moments where a situation needs you to lean deliberately one way, and flex on purpose.",
    );
  }

  return { summary, sections, selfCoaching };
}

/** Merge a user's edits over the generated narrative (edits win when present). */
export function resolveNarrative(
  generated: Narrative,
  edited: Partial<Narrative> | null,
): Narrative {
  if (!edited) return generated;
  return {
    summary: edited.summary?.trim() || generated.summary,
    sections: {
      communication: edited.sections?.communication?.trim() || generated.sections.communication,
      decisions: edited.sections?.decisions?.trim() || generated.sections.decisions,
      feedback: edited.sections?.feedback?.trim() || generated.sections.feedback,
      priorities: edited.sections?.priorities?.trim() || generated.sections.priorities,
      frustrations: edited.sections?.frustrations?.trim() || generated.sections.frustrations,
    },
    selfCoaching:
      edited.selfCoaching && edited.selfCoaching.length
        ? edited.selfCoaching
        : generated.selfCoaching,
  };
}

export { DOMAINS };
