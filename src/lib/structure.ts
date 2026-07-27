/**
 * "Structure this" (Phase 2 item 3): turn a fleeting captured thought into a
 * proposed meeting brief with Claude. The proposal (title, type, goal, suggested
 * attendees, talking points, draft agenda, outcome) becomes a Meeting the user
 * can create and edit.
 *
 * PRIVACY: this sends the thought text/detail and the team roster's NAMES and
 * TITLES to Anthropic. It does NOT send anyone's psychometric profile or
 * answers. The working-style-aware prep is computed locally by the deterministic
 * meeting engine on the resulting Meeting, not by Claude.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, ORG_CONTEXT } from "./ai";
import { MEETING_TYPES, MeetingTypeCode } from "./meeting-types";

export interface StructureInput {
  text: string;
  detail?: string | null;
  meetingTypeHint?: string | null;
  aboutName?: string | null; // the anchored team member, if any
  roster: { id: string; name: string; title: string | null }[];
}

export interface AgendaProposal {
  topic: string;
  purpose: "decision" | "discussion" | "information" | "brainstorm";
}

export interface MeetingProposal {
  title: string;
  meetingType: MeetingTypeCode;
  goal: string;
  attendeeIds: string[]; // subset of roster ids
  talkingPoints: string[];
  agenda: AgendaProposal[];
  outcome: string;
  notes: string;
}

const TYPE_CODES = MEETING_TYPES.map((t) => t.code);

const SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string", description: "A short, specific meeting title." },
    meetingType: { type: "string", enum: TYPE_CODES },
    goal: { type: "string", description: "One line: what a good outcome looks like." },
    attendeeIds: {
      type: "array",
      items: { type: "string" },
      description: "Ids chosen ONLY from the provided roster. Suggest the people who should be in the room. May be empty.",
    },
    talkingPoints: { type: "array", items: { type: "string" } },
    agenda: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          purpose: { type: "string", enum: ["decision", "discussion", "information", "brainstorm"] },
        },
        required: ["topic", "purpose"],
        additionalProperties: false,
      },
    },
    outcome: { type: "string", description: "The concrete result the meeting should end with." },
    notes: { type: "string", description: "A one-line note to the author about your framing, if useful." },
  },
  required: ["title", "meetingType", "goal", "attendeeIds", "talkingPoints", "agenda", "outcome", "notes"],
  additionalProperties: false,
} as const;

export async function structureThought(input: StructureInput): Promise<MeetingProposal> {
  if (!aiEnabled()) {
    throw new Error("AI is not configured. An admin needs to set ANTHROPIC_API_KEY.");
  }
  const client = new Anthropic();

  const rosterText = input.roster.length
    ? input.roster.map((r) => `- id=${r.id} · ${r.name}${r.title ? ` (${r.title})` : ""}`).join("\n")
    : "(no teammates available to suggest)";

  const typesText = MEETING_TYPES.map((t) => `${t.code}: ${t.label} — ${t.description}`).join("\n");

  const parts = [
    `A teammate captured this fleeting thought and wants help turning it into a well-structured meeting.`,
    ``,
    `Thought: ${input.text}`,
    input.detail ? `More detail: ${input.detail}` : "",
    input.aboutName ? `This is anchored to a specific person: ${input.aboutName}.` : "",
    input.meetingTypeHint ? `They hinted the meeting type might be: ${input.meetingTypeHint}.` : "",
    ``,
    `Meeting types to choose from (pick the best fit):\n${typesText}`,
    ``,
    `Team roster you may suggest as attendees (use the exact ids, do not invent people):\n${rosterText}`,
    ``,
    `Propose: a specific title, the best meeting type, a one-line goal, which roster ids should attend, a few concrete talking points, a short draft agenda (topic + purpose), and the concrete outcome the meeting should reach. Keep it tight and actionable. Do not use em dashes.`,
  ];

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4000,
    system: ORG_CONTEXT,
    output_config: { format: { type: "json_schema", schema: SCHEMA as unknown as Record<string, unknown> }, effort: "medium" },
    messages: [{ role: "user", content: parts.filter(Boolean).join("\n") }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const parsed = JSON.parse(raw) as MeetingProposal;

  // Guard: keep only attendee ids that are really on the roster.
  const rosterIds = new Set(input.roster.map((r) => r.id));
  parsed.attendeeIds = (parsed.attendeeIds ?? []).filter((id) => rosterIds.has(id));
  parsed.talkingPoints = parsed.talkingPoints ?? [];
  parsed.agenda = parsed.agenda ?? [];
  return parsed;
}
