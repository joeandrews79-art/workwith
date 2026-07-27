/** Server-only helpers for the working-preference questions and answers. */

import "server-only";
import { prisma } from "./db";

export interface PrefQuestionView {
  id: string;
  domain: string;
  prompt: string;
  kind: string;
  options: string[];
  helpText: string | null;
}

export async function getOrgQuestions(orgId: string): Promise<PrefQuestionView[]> {
  const rows = await prisma.prefQuestion.findMany({
    where: { orgId, active: true },
    orderBy: [{ order: "asc" }],
  });
  return rows.map((q) => ({
    id: q.id,
    domain: q.domain,
    prompt: q.prompt,
    kind: q.kind,
    options: safeArr(q.options),
    helpText: q.helpText,
  }));
}

/** Raw answers for a user, parsed, keyed by questionId. */
export async function getUserAnswers(userId: string): Promise<Record<string, unknown>> {
  const rows = await prisma.prefAnswer.findMany({ where: { userId } });
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[r.questionId] = JSON.parse(r.value);
    } catch {
      out[r.questionId] = r.value;
    }
  }
  return out;
}

export interface AnsweredPref {
  domain: string;
  prompt: string;
  display: string;
}

/** Answered preferences, formatted for read-only display on a profile. */
export async function getAnsweredPreferences(
  orgId: string,
  userId: string,
): Promise<AnsweredPref[]> {
  const [questions, answers] = await Promise.all([
    getOrgQuestions(orgId),
    getUserAnswers(userId),
  ]);
  const out: AnsweredPref[] = [];
  for (const q of questions) {
    const v = answers[q.id];
    const display = formatValue(v);
    if (display) out.push({ domain: q.domain, prompt: q.prompt, display });
  }
  return out;
}

function formatValue(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter(Boolean).join(", ");
  return String(v).trim();
}

function safeArr(s: string): string[] {
  try {
    const a = JSON.parse(s);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
