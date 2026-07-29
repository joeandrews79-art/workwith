/**
 * Coach: turns a person's OWN Big Five profile into concrete, actionable
 * coaching for flexing and growing their working style. Uses Claude.
 *
 * PRIVACY: unlike the admin question assistant (lib/ai.ts), this DOES send the
 * signed-in person's own profile to Anthropic: their domain/facet SCORES, their
 * generated "how I work" narrative, and their own working-preference answers.
 * It never sends raw item-by-item responses, and it never sends anyone else's
 * data. Coaching is generated only when the person asks for it (a button/press),
 * and the result is theirs alone. It is not shared with the team.
 *
 * Requires ANTHROPIC_API_KEY. If absent, coachEnabled() is false and the UI
 * hides the feature rather than erroring.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DomainCode, DOMAIN_ORDER, DOMAINS, FACETS } from "./ipip";
import { DomainScore, FacetScore, bandFor } from "./scoring";
import { Narrative } from "./narrative";
import { ORG_CONTEXT } from "./ai";

export function coachEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface CoachStrength {
  title: string;
  detail: string;
}
export interface CoachEdge {
  title: string;
  why: string;
  experiments: string[];
}
export interface CoachingPlan {
  headline: string;
  strengths: CoachStrength[];
  growthEdges: CoachEdge[];
}

export interface CoachAnswer {
  advice: string;
  suggestions: string[];
}

export interface PrefBrief {
  prompt: string;
  answer: string;
}

/** An upcoming meeting the coach can tailor experiments to. Deliberately NOT
 *  the title or goal (which could be sensitive): only the type, who's in it by
 *  first name, and roughly when. */
export interface CoachMeeting {
  typeLabel: string;
  withNames: string[];
  whenLabel: string;
}

/** Where the person sits on their active team, per trait. AGGREGATE ONLY (team
 *  average + the viewer's position), matching the team read's privacy boundary:
 *  no teammate is ever named. Null when they have no team to compare against. */
export interface CoachTeamTrait {
  friendly: string;
  you: number;
  teamMean: number;
  rel: string; // "above" | "around" | "below" the team
}
export interface CoachTeam {
  teamName: string;
  size: number;
  traits: CoachTeamTrait[];
}

interface CoachInput {
  firstName: string;
  domains: Record<DomainCode, DomainScore>;
  facets: FacetScore[];
  narrative: Narrative | null;
  prefs: PrefBrief[];
  meetings: CoachMeeting[];
  team: CoachTeam | null;
}

/* ---- Per-team caching --------------------------------------------------
   The plan is team-aware, so it is cached per active team (keyed by team id,
   or "_none" when the person has no team). Weekly refresh keeps each current.
------------------------------------------------------------------------- */
export interface CoachEntry {
  plan: CoachingPlan;
  at: string; // ISO timestamp
}
export type CoachStore = Record<string, CoachEntry>;

/** Parse the stored coaching blob into a per-team map. The old single-plan
 *  format (a bare CoachingPlan) is discarded so it regenerates per team. */
export function parseCoachStore(json: string | null): CoachStore {
  if (!json) return {};
  try {
    const obj = JSON.parse(json) as Record<string, unknown>;
    if (obj && typeof obj === "object" && ("headline" in obj || "growthEdges" in obj)) return {};
    return (obj as CoachStore) ?? {};
  } catch {
    return {};
  }
}

const COACH_SYSTEM = `${ORG_CONTEXT}

You are now acting as a warm, sharp working-style coach for ONE Riser, speaking directly to them ("you"). You are given that person's own Big Five working-style profile, the plain-language narrative it generated, and their stated working preferences. Your job is to help them work better with the grain of who they are and flex deliberately where it will help.

Coaching rules (firm):
- Frame everything as a preference and a lever, never as a flaw, deficit, or ranking. A strong trait and its opposite are both useful in different moments.
- Be specific and behavioral. Every growth edge must come with concrete experiments the person could actually try this week, tied to real Rise8 situations (remote and async work, direct feedback, high autonomy, outcomes in production).
- If they have upcoming meetings listed, tie at least one experiment to a specific one, naming its type and who is in it (for example "in your 1:1 with Priya this week, try..."). Make it timely and real. If they have no meetings listed, keep the experiments general and do NOT invent meetings or names.
- If their position on their team is provided, use where they sit relative to the group (the anchor on structure, the quiet one in a loud room, the sceptic among optimists) to shape the advice toward working well in THAT team. Use the aggregate position only, and never name or invent a specific teammate. If no team position is provided, do not reference a team.
- Ground each point in their actual scores and their own words. Do not invent traits they do not have.
- Speak plainly and directly, a little warmer than casual, never corporate or therapeutic.
- Do NOT use em dashes anywhere. Use periods, commas, or parentheses. This is firm.
- Keep it tight and usable. Quality over volume.`;

const PLAN_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description:
        "One warm, specific sentence naming this person's signature working style, addressed to them.",
    },
    strengths: {
      type: "array",
      description: "2 to 3 signature strengths to lean into.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short strength name." },
          detail: {
            type: "string",
            description:
              "1 to 2 sentences on how this shows up and how to use it on purpose.",
          },
        },
        required: ["title", "detail"],
        additionalProperties: false,
      },
    },
    growthEdges: {
      type: "array",
      description:
        "Exactly 3 growth edges: places where flexing away from their default would help them or the team.",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short name for the edge." },
          why: {
            type: "string",
            description:
              "1 to 2 sentences: why this is an edge for them, tied to their scores, framed as a lever not a flaw.",
          },
          experiments: {
            type: "array",
            description: "1 to 3 concrete things to try this week.",
            items: { type: "string" },
          },
        },
        required: ["title", "why", "experiments"],
        additionalProperties: false,
      },
    },
  },
  required: ["headline", "strengths", "growthEdges"],
  additionalProperties: false,
} as const;

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    advice: {
      type: "string",
      description:
        "2 to 4 sentences of direct, grounded advice for the situation, addressed to the person and tied to their profile.",
    },
    suggestions: {
      type: "array",
      description: "2 to 4 concrete next actions they could take.",
      items: { type: "string" },
    },
  },
  required: ["advice", "suggestions"],
  additionalProperties: false,
} as const;

/** Build the grounded, plain-text brief of this person's profile. */
function profileBrief(input: CoachInput): string {
  const { firstName, domains, facets, narrative, prefs, meetings, team } = input;

  const domainLines = DOMAIN_ORDER.map((d) => {
    const s = domains[d];
    const band = bandFor(s.friendlyScore);
    return `- ${DOMAINS[d].friendly} (${DOMAINS[d].trait}): ${Math.round(
      s.friendlyScore,
    )}/100, ${band}`;
  }).join("\n");

  const standout = facets
    .filter((f) => FACETS[f.domain]?.[f.facet] && (f.score >= 70 || f.score <= 30))
    .sort((a, b) => Math.abs(b.score - 50) - Math.abs(a.score - 50))
    .slice(0, 6)
    .map(
      (f) =>
        `- ${f.score >= 70 ? "High" : "Low"} ${FACETS[f.domain][f.facet]} (${Math.round(
          f.score,
        )}/100)`,
    )
    .join("\n");

  let narrativeText = "";
  if (narrative) {
    const sec = narrative.sections;
    narrativeText = `\nHow they describe their own working style:
Summary: ${narrative.summary}
Communication: ${sec.communication}
Decisions: ${sec.decisions}
Feedback: ${sec.feedback}
Priorities: ${sec.priorities}
Frustrations: ${sec.frustrations}`;
  }

  const prefText = prefs.length
    ? "\nTheir stated working preferences:\n" +
      prefs.map((p) => `- ${p.prompt} ${p.answer}`).join("\n")
    : "";

  const meetingText = meetings.length
    ? "\nTheir upcoming meetings this week (tie at least one experiment to one of these; use only what is stated):\n" +
      meetings
        .map(
          (m) =>
            `- ${m.whenLabel}: ${m.typeLabel}${
              m.withNames.length ? " with " + m.withNames.join(", ") : ""
            }`,
        )
        .join("\n")
    : "\nThey have no meetings scheduled this week, so keep the experiments general to their work.";

  const teamText = team
    ? `\nWhere they sit on their team "${team.teamName}" (${team.size} people, aggregate only, no teammate named):\n` +
      team.traits
        .map(
          (t) =>
            `- ${t.friendly}: you ${Math.round(t.you)}, team average ${Math.round(
              t.teamMean,
            )}, you sit ${t.rel} the team.`,
        )
        .join("\n")
    : "\nThey have no team with enough shared profiles to compare, so do not reference team position.";

  return `Person: ${firstName}

Scores are 0 to 100 in the FRIENDLY direction, so higher is more of the friendly label (for Emotional steadiness, higher means calmer under pressure). Bands: low is under 40, high is over 60, otherwise moderate.

Working-style traits:
${domainLines}

Standout facets (scores are in the direction of the facet name, e.g. high Anxiety means more anxious, high Self-Discipline means more disciplined):
${standout || "- None strongly one way or the other."}
${narrativeText}${prefText}${teamText}${meetingText}`;
}

function client(): Anthropic {
  if (!coachEnabled()) {
    throw new Error("Coaching is not configured. Set ANTHROPIC_API_KEY.");
  }
  return new Anthropic();
}

function firstText(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "{}";
}

/** Generate a full coaching plan from the person's own profile. */
export async function generateCoaching(input: CoachInput): Promise<CoachingPlan> {
  const response = await client().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system: COACH_SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: PLAN_SCHEMA as unknown as Record<string, unknown> },
      effort: "medium",
    },
    messages: [
      {
        role: "user",
        content: `${profileBrief(input)}

Write ${input.firstName}'s coaching plan: a one-line headline, 2 to 3 strengths to lean into, and exactly 3 growth edges, each with 1 to 3 concrete experiments to try this week. Speak directly to them.`,
      },
    ],
  });

  const parsed = JSON.parse(firstText(response.content)) as CoachingPlan;
  return {
    headline: parsed.headline ?? "",
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    growthEdges: Array.isArray(parsed.growthEdges) ? parsed.growthEdges : [],
  };
}

/** Answer a specific situation the person is facing, grounded in their profile. */
export async function askCoach(
  input: CoachInput & { question: string },
): Promise<CoachAnswer> {
  const response = await client().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2000,
    system: COACH_SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: ANSWER_SCHEMA as unknown as Record<string, unknown> },
      effort: "medium",
    },
    messages: [
      {
        role: "user",
        content: `${profileBrief(input)}

${input.firstName} is asking their coach about this situation:
"${input.question}"

Give direct, grounded advice tied to their working style, plus concrete next actions. Speak to them.`,
      },
    ],
  });

  const parsed = JSON.parse(firstText(response.content)) as CoachAnswer;
  return {
    advice: parsed.advice ?? "",
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
  };
}
