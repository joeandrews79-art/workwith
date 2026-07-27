/**
 * Interpretation guide: turns a person's OWN Big Five scores into a plain,
 * warm explanation of what each level tends to mean about how they work, so
 * the numbers are understood rather than guessed at. Uses Claude.
 *
 * PRIVACY: same boundary as the coach (lib/coach.ts). Sends the signed-in
 * person's OWN domain scores only. Never sends raw item responses, and never
 * anyone else's data. Generated only when the person asks for it.
 *
 * Requires ANTHROPIC_API_KEY. If absent, interpretEnabled() is false and the
 * UI hides the feature rather than erroring.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { DomainCode, DOMAIN_ORDER, DOMAINS } from "./ipip";
import { DomainScore, bandFor } from "./scoring";
import { DOMAIN_POLES, BAND_LABEL } from "./ui";
import { ORG_CONTEXT } from "./ai";

export function interpretEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface InterpretationTrait {
  name: string;
  level: string; // Lower / Balanced / Higher
  meaning: string;
}
export interface InterpretationResult {
  intro: string;
  traits: InterpretationTrait[];
}

export interface InterpretInput {
  firstName: string;
  domains: Record<DomainCode, DomainScore>;
}

const SYSTEM = `${ORG_CONTEXT}

You are now explaining a Riser's OWN Big Five working-style results back to them in plain language, speaking directly to them ("you"). Your job is to make each score easy to understand: what this level tends to mean about how they work, so the number is understood rather than guessed at.

Rules (firm):
- Frame every trait as a preference and a difference, never as better or worse, and never as a flaw. Both ends of every trait are useful in different moments.
- Read the actual level (lower, balanced, or higher) and describe what that tends to look like day to day at work. Be concrete, not abstract.
- Balanced is a real, useful result (flexible, situational), not a lack of personality. Say so when it applies.
- Speak plainly and warmly, grounded in how Rise8 works (remote, async, direct feedback, high autonomy).
- Do NOT use em dashes anywhere. Use periods, commas, or parentheses. This is firm.
- Keep each explanation to 2 to 3 sentences.`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    intro: { type: "string", description: "1 to 2 sentences on how to read these results." },
    traits: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          level: { type: "string" },
          meaning: { type: "string" },
        },
        required: ["name", "level", "meaning"],
      },
    },
  },
  required: ["intro", "traits"],
};

function client(): Anthropic {
  if (!interpretEnabled()) throw new Error("Interpretation is not configured. Set ANTHROPIC_API_KEY.");
  return new Anthropic();
}

function firstText(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "{}";
}

function brief(input: InterpretInput): string {
  const lines = DOMAIN_ORDER.map((d) => {
    const s = input.domains[d].friendlyScore;
    return `- ${DOMAINS[d].friendly} (low = ${DOMAIN_POLES[d].low}, high = ${DOMAIN_POLES[d].high}): ${Math.round(
      s,
    )} out of 100, which reads as ${BAND_LABEL[bandFor(s)]}.`;
  });
  return `Person: ${input.firstName}. Their Big Five results on a 0 to 100 friendly scale (higher = more of the "high" pole):

${lines.join("\n")}`;
}

export async function generateInterpretation(input: InterpretInput): Promise<InterpretationResult> {
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

Write ${input.firstName}'s interpretation guide: a short intro on how to read these results, then one entry for EACH of the five traits above, in the same order, each with the trait name, its level (Lower, Balanced, or Higher), and 2 to 3 sentences on what that level tends to mean for how they work. Speak directly to them.`,
      },
    ],
  });
  const parsed = JSON.parse(firstText(response.content)) as InterpretationResult;
  return {
    intro: parsed.intro ?? "",
    traits: Array.isArray(parsed.traits) ? parsed.traits : [],
  };
}
