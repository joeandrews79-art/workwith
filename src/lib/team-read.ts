/**
 * Team read: explains how ONE person sits relative to their team's overall
 * shape, and what that tends to mean for working together. Uses Claude.
 *
 * PRIVACY (deliberate boundary): this sends the signed-in person's OWN Big Five
 * scores PLUS the team's AGGREGATE statistics only, the per-trait team average
 * and spread and where the viewer falls against them. It never sends any other
 * individual's name or scores. No teammate is identifiable in what leaves the
 * app. Generated only when the person asks for it, cached for them alone.
 *
 * Requires ANTHROPIC_API_KEY. If absent, teamReadEnabled() is false and the UI
 * hides the feature rather than erroring.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { Band } from "./scoring";
import { RelBand } from "./team";
import { ORG_CONTEXT } from "./ai";

export function teamReadEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface TeamReadTrait {
  friendly: string;
  lowPole: string;
  highPole: string;
  you: number; // 0..100 friendly score
  band: Band; // your absolute level
  teamMean: number;
  teamMin: number;
  teamMax: number;
  rel: RelBand; // above / around / below the team
}

export interface TeamReadInput {
  firstName: string;
  teamName: string;
  teamSize: number;
  traits: TeamReadTrait[];
}

export interface TeamReadTip {
  title: string;
  detail: string;
}
export interface TeamReadResult {
  headline: string;
  summary: string;
  tips: TeamReadTip[];
}

const REL_WORD: Record<RelBand, string> = {
  above: "higher than the team average",
  around: "close to the team average",
  below: "lower than the team average",
};

const SYSTEM = `${ORG_CONTEXT}

You are now reading how ONE Riser fits with their team's overall shape, speaking directly to them ("you"). You are given that person's own Big Five working-style scores and, for each trait, the team's AGGREGATE picture only: the team average, the range across the team, and whether this person sits above, around, or below the team. You are NOT given any other individual's name or score, so never name or invent specific teammates. Refer to the group as "the team", "most of the team", or "the rest of the group".

Rules (firm):
- Focus on POSITION and DYNAMICS: where this person sits in the group and what that tends to create (they may be the anchor on structure, the quiet one in a loud room, the sceptic among optimists). Turn that into how to work well together.
- Frame every difference as a preference and a lever, never a flaw or a ranking. Being far from the team average is information, not a problem.
- Be specific and behavioral, tied to how Rise8 actually works (remote, async, direct feedback, high autonomy, outcomes in production).
- Ground everything in the numbers you were given. Do not invent traits or people.
- Do NOT use em dashes anywhere. Use periods, commas, or parentheses. This is firm.
- Keep it tight and usable.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string", description: "One line naming how this person sits in the team." },
    summary: { type: "string", description: "2 to 3 sentences on where they sit and what it creates." },
    tips: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
        },
        required: ["title", "detail"],
      },
    },
  },
  required: ["headline", "summary", "tips"],
};

function client(): Anthropic {
  if (!teamReadEnabled()) throw new Error("Team read is not configured. Set ANTHROPIC_API_KEY.");
  return new Anthropic();
}

function firstText(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "{}";
}

function brief(input: TeamReadInput): string {
  const lines = input.traits.map((t) => {
    return `- ${t.friendly} (low = ${t.lowPole}, high = ${t.highPole}): you ${Math.round(
      t.you,
    )}. Team average ${Math.round(t.teamMean)}, team range ${Math.round(t.teamMin)} to ${Math.round(
      t.teamMax,
    )}. You are ${REL_WORD[t.rel]} here.`;
  });
  return `Person: ${input.firstName}. Team: "${input.teamName}", ${input.teamSize} people with a completed, shared profile (aggregate only, no individuals named).

Scores are on a 0 to 100 friendly scale where a higher number means more of the "high" pole.

${lines.join("\n")}`;
}

export async function generateTeamRead(input: TeamReadInput): Promise<TeamReadResult> {
  const response = await client().messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2500,
    system: SYSTEM,
    output_config: {
      format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> },
      effort: "medium",
    },
    messages: [
      {
        role: "user",
        content: `${brief(input)}

Write ${input.firstName}'s team read: a one-line headline naming how they sit in this team, a 2 to 3 sentence summary of where they sit and what it tends to create, and 2 to 4 concrete tips for working well given that position. Speak directly to them.`,
      },
    ],
  });
  const parsed = JSON.parse(firstText(response.content)) as TeamReadResult;
  return {
    headline: parsed.headline ?? "",
    summary: parsed.summary ?? "",
    tips: Array.isArray(parsed.tips) ? parsed.tips : [],
  };
}
