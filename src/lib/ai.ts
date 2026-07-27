/**
 * Claude integration (Anthropic SDK). Used by the admin question editor to
 * suggest and refine the org's working-preference questions, and to keep them
 * aligned to the org's values and voice.
 *
 * PRIVACY NOTE: this sends question TEXT and the org context below to Anthropic.
 * It does NOT send anyone's personal answers or profile. Question authoring is
 * admin-only content, not personal data. (Analyzing individual responses with
 * Claude is a separate, opt-in step — see docs/roadmap.md.)
 *
 * Requires ANTHROPIC_API_KEY in the environment. If it is absent, aiEnabled()
 * returns false and the UI hides the assistant rather than erroring.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * The org's context. Seeded for Rise8; editable here as the org evolves.
 * This shapes every question suggestion so they fit how the team actually works.
 */
export const ORG_CONTEXT = `You are helping build a lightweight internal "working styles" tool for a company's team. The goal of the questions is to help teammates map each other's differences, priorities, and working styles so friction is understood rather than guessed at. Frame every result as a preference and a difference, never as better or worse, and never as a ranking.

Company context (Rise8):
- Rise8 is a fully remote defense technology and federal digital services company (a Service-Disabled Veteran-Owned Small Business, ~152 employees who call themselves "Risers", HQ Tampa). It builds software for critical government missions.
- Cultural north star: "outcomes in production" — mission-critical impact that reaches the end user (the operator, analyst, warfighter, or citizen), not a deployment milestone.
- Ten values: Be Bold; Do The Right Thing; Do What Works (work backwards from impact, test hypotheses); Do What is Required (do the hard things, activity over output theater); Always Be Kind (challenge directly, give feedback without unkindness); Keep it Real (own outcomes and risks); Outcomes in Production; Grit; Growth Mindset; No Unnecessary Rules (high-agency, minimal process).
- Operating norms: remote-first and async by default; directness is a valued cultural norm, not a warning sign (never treat a preference for blunt feedback as a deficit); high agency and anti-micromanagement; people think in outcomes and inputs, not tasks; a bloated survey will be resented, so keep questions tight.

Question domains to cover (each tied to how Rise8 works): 1) Communication and async preferences (real-time vs async, channels, response times, camera-on, working hours/time zone, how to be interrupted for urgent vs non-urgent). 2) Feedback style (how they give/receive feedback, how much bluntness reads as respect for them, how they want disagreement raised in a group) — the highest-value area for reducing friction here. 3) Autonomy and decision-making (how much autonomy by default, when to be looped in, handling ambiguity, escalation). 4) Priorities and motivation (what energizes them, how they connect work to the end user and mission, what "done" means to them). 5) Working style under pressure. 6) Recognition and growth. 7) Collaboration and trust in a remote setting.

Voice and format rules (firm):
- Plain, direct, honest sentences. Slightly more polished than casual, never formal or corporate.
- Write questions in the first person and situational where possible (for example "When I get a non-urgent question, I'd rather...").
- Every question must surface a preference a teammate could actually act on.
- Use Rise8 language where natural ("Risers", "outcomes in production") but do not force it.
- Do NOT use em dashes anywhere. Use periods, commas, or parentheses instead. This is a firm rule.
- Keep the set tight. Prefer multiple-choice ("single" or "multi") or a "scale" for most questions so they are fast to answer; use "text" sparingly.`;

export interface SuggestedQuestion {
  domain: string;
  prompt: string;
  kind: "single" | "multi" | "scale" | "text";
  options: string[];
  helpText: string;
  rationale: string;
}

export interface SuggestResult {
  notes: string;
  suggestions: SuggestedQuestion[];
}

const SCHEMA = {
  type: "object",
  properties: {
    notes: {
      type: "string",
      description: "A short note to the admin about what you suggested and why, or any alignment concerns.",
    },
    suggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          domain: { type: "string" },
          prompt: { type: "string" },
          kind: { type: "string", enum: ["single", "multi", "scale", "text"] },
          options: { type: "array", items: { type: "string" } },
          helpText: { type: "string" },
          rationale: { type: "string" },
        },
        required: ["domain", "prompt", "kind", "options", "helpText", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["notes", "suggestions"],
  additionalProperties: false,
} as const;

/**
 * Ask Claude to suggest or refine working-preference questions.
 * `instruction` is the admin's free-text request; `existing` is the current set
 * (so Claude avoids duplicates and can refine specific ones).
 */
export async function suggestQuestions(
  instruction: string,
  existing: { domain: string; prompt: string; kind: string; options: string[] }[],
): Promise<SuggestResult> {
  if (!aiEnabled()) {
    throw new Error("AI is not configured. Set ANTHROPIC_API_KEY in .env.");
  }
  const client = new Anthropic();

  const existingText = existing.length
    ? existing
        .map((q, i) => `${i + 1}. [${q.domain} / ${q.kind}] ${q.prompt}${q.options.length ? ` (options: ${q.options.join(", ")})` : ""}`)
        .join("\n")
    : "(none yet)";

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 8000,
    system: ORG_CONTEXT,
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> }, effort: "medium" },
    messages: [
      {
        role: "user",
        content: `Current questions:\n${existingText}\n\nAdmin request: ${instruction}\n\nReturn new or revised questions that fit the request and the company context. Do not duplicate existing questions unless the request is to revise them. For each, give a one-line rationale tying it to how Rise8 works. Keep the whole set tight.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  try {
    const parsed = JSON.parse(raw) as SuggestResult;
    return {
      notes: parsed.notes ?? "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  } catch {
    return { notes: "Could not parse the AI response. Please try again.", suggestions: [] };
  }
}
