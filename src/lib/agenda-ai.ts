/**
 * Agenda AI (Phase 2 item 4): draft or tighten a meeting agenda with Claude.
 *
 * PRIVACY: like "Structure this", this sends only structural context, the
 * meeting title, type, goal, and attendee NAMES/TITLES, to Anthropic. It does
 * NOT send anyone's psychometric profile. The working-style prep stays local and
 * deterministic. (Deeper style-aware agendas would be a separate opt-in.)
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, ORG_CONTEXT } from "./ai";
import { MeetingTypeCode, meetingType } from "./meeting-types";

export interface AgendaDraftItem {
  topic: string;
  purpose: "decision" | "discussion" | "information" | "brainstorm";
  minutes: number;
}

const ITEM_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string" },
          purpose: { type: "string", enum: ["decision", "discussion", "information", "brainstorm"] },
          minutes: { type: "integer", description: "A realistic time-box in minutes, between 1 and 240." },
        },
        required: ["topic", "purpose", "minutes"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
} as const;

interface MeetingContext {
  title: string;
  type: MeetingTypeCode;
  goal: string | null;
  attendees: { name: string; title: string | null }[];
}

function contextBlock(ctx: MeetingContext): string {
  const t = meetingType(ctx.type);
  const who = ctx.attendees.length
    ? ctx.attendees.map((a) => `${a.name}${a.title ? ` (${a.title})` : ""}`).join(", ")
    : "(no internal attendees listed)";
  return [
    `Meeting title: ${ctx.title}`,
    `Type: ${t.label} — ${t.framing}`,
    ctx.goal ? `Goal: ${ctx.goal}` : "",
    `In the room: ${who}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function run(userContent: string): Promise<AgendaDraftItem[]> {
  if (!aiEnabled()) throw new Error("AI is not configured. An admin needs to set ANTHROPIC_API_KEY.");
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 3000,
    system: ORG_CONTEXT,
    output_config: { format: { type: "json_schema", schema: ITEM_SCHEMA as unknown as Record<string, unknown> }, effort: "medium" },
    messages: [{ role: "user", content: userContent }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  const raw = textBlock && "text" in textBlock ? textBlock.text : "{}";
  const parsed = JSON.parse(raw) as { items: AgendaDraftItem[] };
  const items = Array.isArray(parsed.items) ? parsed.items : [];
  // Clamp time-boxes to a sane range (schema can't express bounds).
  return items.map((it) => ({ ...it, minutes: Math.min(240, Math.max(1, Math.round(it.minutes || 15))) }));
}

/** Draft a fresh agenda from the meeting's shape. */
export async function buildAgenda(ctx: MeetingContext): Promise<AgendaDraftItem[]> {
  return run(
    `${contextBlock(ctx)}\n\nDraft a tight, well-sequenced agenda for this meeting. Each item needs a clear topic, a purpose (decision, discussion, information, or brainstorm), and a realistic time-box in minutes. Front-load the most important decisions. Keep it to a handful of items, not a laundry list. Match the shape to the meeting type. Do not use em dashes.`,
  );
}

/** Trim and sharpen an existing agenda. */
export async function tightenAgenda(
  ctx: MeetingContext,
  current: { topic: string; purpose: string; minutes: number | null }[],
): Promise<AgendaDraftItem[]> {
  const currentText = current.length
    ? current.map((a, i) => `${i + 1}. [${a.purpose}${a.minutes ? `, ${a.minutes}m` : ""}] ${a.topic}`).join("\n")
    : "(empty)";
  return run(
    `${contextBlock(ctx)}\n\nCurrent agenda:\n${currentText}\n\nTighten this agenda: cut or merge anything weak or redundant, sharpen each topic, make sure every item has a clear purpose and a realistic time-box, and order it so the meeting builds to its goal. Return the improved agenda. Do not use em dashes.`,
  );
}
