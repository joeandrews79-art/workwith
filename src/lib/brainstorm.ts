/**
 * Brainstorm meetings: help a user turn a rough intention ("we keep missing
 * deadlines", "I want to align on Q3") into a few concrete meeting ideas they
 * can capture or create. Uses Claude. Lives under the Thoughts tab.
 *
 * PRIVACY: sends only the user's prompt and the team roster's NAMES/TITLES to
 * Anthropic (same boundary as "Structure this"). It does NOT send anyone's
 * psychometric profile. The working-style-aware prep is added later, locally,
 * on whatever meeting the user actually creates.
 *
 * Requires ANTHROPIC_API_KEY. If absent, brainstormEnabled() is false and the
 * UI hides the feature rather than erroring.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, ORG_CONTEXT } from "./ai";
import { MEETING_TYPES, MeetingTypeCode } from "./meeting-types";

export function brainstormEnabled(): boolean {
  return aiEnabled();
}

export interface MeetingIdea {
  title: string;
  meetingType: MeetingTypeCode;
  goal: string;
  why: string;
  attendeeIds: string[];
}

const TYPE_CODES = MEETING_TYPES.map((t) => t.code);

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", description: "A short, specific meeting title." },
          meetingType: { type: "string", enum: TYPE_CODES },
          goal: { type: "string", description: "One line: what a good outcome looks like." },
          why: { type: "string", description: "One line: why this meeting helps with what they described." },
          attendeeIds: {
            type: "array",
            items: { type: "string" },
            description: "Roster ids who should be in the room. Use exact ids, never invent people. May be empty.",
          },
        },
        required: ["title", "meetingType", "goal", "why", "attendeeIds"],
      },
    },
  },
  required: ["ideas"],
} as const;

export interface BrainstormInput {
  prompt: string;
  roster: { id: string; name: string; title: string | null }[];
}

export async function generateMeetingIdeas(input: BrainstormInput): Promise<MeetingIdea[]> {
  if (!brainstormEnabled()) {
    throw new Error("AI is not configured. An admin needs to set ANTHROPIC_API_KEY.");
  }
  const client = new Anthropic();

  const rosterText = input.roster.length
    ? input.roster.map((r) => `- id=${r.id} · ${r.name}${r.title ? ` (${r.title})` : ""}`).join("\n")
    : "(no teammates available to suggest)";
  const typesText = MEETING_TYPES.map((t) => `${t.code}: ${t.label} — ${t.description}`).join("\n");

  const prompt = [
    `A teammate is thinking about meetings they might want to run. Here is what is on their mind:`,
    ``,
    `"${input.prompt}"`,
    ``,
    `Propose 3 to 4 DISTINCT, concrete meeting ideas that would help. Make them genuinely different from each other (different angle, scope, or set of people), not slight rewordings. Each idea needs a specific title, the best-fit meeting type, a one-line goal, a one-line reason it helps, and which roster ids should attend.`,
    ``,
    `Meeting types to choose from:\n${typesText}`,
    ``,
    `Team roster you may suggest as attendees (use the exact ids, do not invent people):\n${rosterText}`,
    ``,
    `Keep each idea tight and actionable. Do not use em dashes.`,
  ].join("\n");

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2500,
    system: ORG_CONTEXT,
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> }, effort: "medium" },
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const parsed = JSON.parse(raw) as { ideas?: MeetingIdea[] };
  const rosterIds = new Set(input.roster.map((r) => r.id));

  return (parsed.ideas ?? []).map((idea) => ({
    title: idea.title ?? "",
    meetingType: idea.meetingType,
    goal: idea.goal ?? "",
    why: idea.why ?? "",
    attendeeIds: (idea.attendeeIds ?? []).filter((id) => rosterIds.has(id)),
  }));
}
