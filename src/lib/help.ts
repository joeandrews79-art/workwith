/**
 * In-app help assistant: answers how-to questions about WorkWith, grounded ONLY
 * in the user guide (lib/guide-content.ts). Uses Claude.
 *
 * PRIVACY: sends the user's question plus the (non-personal) guide text. It does
 * NOT send anyone's profile or scores. Admin-only guide sections are included
 * only for admins.
 *
 * Requires ANTHROPIC_API_KEY. If absent, helpEnabled() is false and the panel
 * falls back to quick links and the full guide.
 */

import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled } from "./ai";
import { guideText } from "./guide-content";

export function helpEnabled(): boolean {
  return aiEnabled();
}

export async function answerHelpQuestion(question: string, includeAdmin: boolean): Promise<string> {
  if (!helpEnabled()) throw new Error("Help assistant is not configured. Set ANTHROPIC_API_KEY.");
  const client = new Anthropic();

  const system = `You are the friendly help assistant for WorkWith, an internal tool that helps a team understand how each person works best (built on the public-domain Big Five). Answer the user's how-to question using ONLY the guide below. Be concise and practical: a sentence or two, then short numbered steps when the answer is a procedure. If the guide does not cover it, say so plainly and suggest they open the full guide or ask their admin. Do not invent features. Speak directly to the user ("you"). Do not use em dashes.

USER GUIDE:
${guideText(includeAdmin)}`;

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 800,
    system,
    messages: [{ role: "user", content: question }],
  });
  const block = response.content.find((b) => b.type === "text");
  return block && "text" in block ? block.text : "Sorry, I could not answer that. Try the full guide.";
}
