"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  isAdmin,
  verifyCredentials,
} from "@/lib/auth";
import { ITEMS } from "@/lib/ipip";
import { scoreAssessment, serializeScores, Responses } from "@/lib/scoring";
import { Narrative } from "@/lib/narrative";
import { suggestQuestions } from "@/lib/ai";
import { assembleProfile } from "@/lib/profile";
import { getAnsweredPreferences } from "@/lib/prefs";
import {
  coachEnabled,
  generateCoaching,
  askCoach,
  CoachingPlan,
  CoachAnswer,
} from "@/lib/coach";

// --- Auth -------------------------------------------------------------------

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(email, password);
  if (!user) return { error: "That email and password did not match." };
  await createSession(user.id);
  redirect("/"); // root routes to set-password / welcome / dashboard as needed
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

/** First-login (or self-service) password change. Clears the mustReset flag. */
export async function setPassword(_prev: unknown, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8) return { error: "Use at least 8 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), mustReset: false },
  });
  return { ok: true };
}

/** Mark the first-run setup wizard as finished. */
export async function completeOnboarding() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardedAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { ok: true };
}

// --- Assessment -------------------------------------------------------------

const responsesSchema = z.record(z.string(), z.number().int().min(1).max(5));

/** Start a fresh assessment (used for the annual retake). */
export async function startRetake() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  // Clear any dangling in-progress attempts, then start clean.
  await prisma.assessment.deleteMany({
    where: { userId: user.id, status: "IN_PROGRESS" },
  });
  await prisma.assessment.create({
    data: { userId: user.id, status: "IN_PROGRESS" },
  });
  revalidatePath("/assessment");
  return { ok: true };
}

export async function saveProgress(assessmentId: string, responses: Responses) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = responsesSchema.safeParse(responses);
  if (!parsed.success) return { error: "Invalid responses." };
  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment || assessment.userId !== user.id)
    return { error: "Not your assessment." };
  await prisma.assessment.update({
    where: { id: assessmentId },
    data: { responses: JSON.stringify(parsed.data) },
  });
  return { ok: true };
}

export async function completeAssessment(assessmentId: string, responses: Responses) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = responsesSchema.safeParse(responses);
  if (!parsed.success) return { error: "Invalid responses." };

  const answered = ITEMS.filter((i) => parsed.data[i.id]).length;
  if (answered < ITEMS.length)
    return { error: `Please answer all ${ITEMS.length} statements first.` };

  const assessment = await prisma.assessment.findUnique({ where: { id: assessmentId } });
  if (!assessment || assessment.userId !== user.id)
    return { error: "Not your assessment." };

  const result = scoreAssessment(parsed.data);
  const { domainScores, facetScores } = serializeScores(result);
  const completedAt = new Date();

  await prisma.assessment.update({
    where: { id: assessmentId },
    data: {
      status: "COMPLETED",
      responses: JSON.stringify(parsed.data),
      domainScores: JSON.stringify(domainScores),
      facetScores: JSON.stringify(facetScores),
      completedAt,
    },
  });

  await prisma.profile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      assessmentId,
      refreshedAt: completedAt,
      shared: false,
    },
    update: {
      assessmentId,
      refreshedAt: completedAt,
      // Re-taking clears prior edits and coaching so both reflect the new scores.
      editedNarrative: null,
      coaching: null,
      coachingAt: null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/me");
  return { ok: true };
}

// --- Profile ----------------------------------------------------------------

export async function saveNarrative(edited: Narrative) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  await prisma.profile.update({
    where: { userId: user.id },
    data: { editedNarrative: JSON.stringify(edited) },
  });
  revalidatePath("/me");
  revalidatePath(`/profile/${user.id}`);
  return { ok: true };
}

export async function resetNarrative() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  await prisma.profile.update({
    where: { userId: user.id },
    data: { editedNarrative: null },
  });
  revalidatePath("/me");
  return { ok: true };
}

export async function setShared(shared: boolean) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  await prisma.profile.update({
    where: { userId: user.id },
    data: { shared },
  });
  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/me");
  return { ok: true };
}

/** Privacy: delete all of my assessment + profile data (keeps the login). */
export async function deleteMyProfileData() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  await prisma.profile.deleteMany({ where: { userId: user.id } });
  await prisma.assessment.deleteMany({ where: { userId: user.id } });
  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/me");
  return { ok: true };
}

// --- Admin: invite a team member -------------------------------------------

export async function inviteMember(_prev: unknown, formData: FormData) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").toLowerCase().trim();
  const title = String(formData.get("title") ?? "").trim() || null;
  const tempPassword = String(formData.get("password") ?? "").trim();
  const asAdmin = formData.get("role") === "ADMIN";

  if (!name || !email) return { error: "Name and email are required." };
  if (tempPassword.length < 8)
    return { error: "Temporary password must be at least 8 characters." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Someone with that email already exists." };

  const user = await prisma.user.create({
    data: {
      orgId: admin!.orgId,
      email,
      name,
      title,
      role: asAdmin ? "ADMIN" : "MEMBER",
      passwordHash: await hashPassword(tempPassword),
      mustReset: true,
    },
  });

  // Add every new person to the same team(s) as the inviting admin, so they
  // show up in the directory. Falls back to the org's first team.
  const adminTeams = await prisma.teamMember.findMany({
    where: { userId: admin!.id },
    select: { teamId: true },
  });
  const teamIds = adminTeams.length
    ? adminTeams.map((t) => t.teamId)
    : (await prisma.team.findMany({ where: { orgId: admin!.orgId }, select: { id: true }, take: 1 })).map((t) => t.id);
  for (const teamId of teamIds) {
    await prisma.teamMember.create({ data: { teamId, userId: user.id } });
  }

  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/admin");
  return {
    ok: true,
    message: `${name} added${asAdmin ? " as an admin" : ""}. Share their temporary password securely.`,
  };
}

// --- Working preferences (Rise8-tailored, answered by everyone) -------------

const prefAnswersSchema = z.array(
  z.object({ questionId: z.string(), value: z.string() }),
);

export async function savePrefAnswers(
  answers: { questionId: string; value: string }[],
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = prefAnswersSchema.safeParse(answers);
  if (!parsed.success) return { error: "Invalid answers." };
  for (const a of parsed.data) {
    await prisma.prefAnswer.upsert({
      where: { userId_questionId: { userId: user.id, questionId: a.questionId } },
      create: { userId: user.id, questionId: a.questionId, value: a.value },
      update: { value: a.value },
    });
  }
  revalidatePath("/me");
  return { ok: true };
}

// --- Admin: manage the working-preference questions ------------------------

export async function upsertQuestion(input: {
  id?: string;
  domain: string;
  prompt: string;
  kind: string;
  options: string[];
  helpText?: string;
}) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };
  const data = {
    domain: input.domain.trim(),
    prompt: input.prompt.trim(),
    kind: input.kind,
    options: JSON.stringify(input.options ?? []),
    helpText: input.helpText?.trim() || null,
  };
  if (!data.prompt) return { error: "The question text is required." };
  if (input.id) {
    await prisma.prefQuestion.update({ where: { id: input.id }, data });
  } else {
    const count = await prisma.prefQuestion.count({ where: { orgId: admin!.orgId } });
    await prisma.prefQuestion.create({
      data: { ...data, orgId: admin!.orgId, order: count },
    });
  }
  revalidatePath("/admin/questions");
  revalidatePath("/assessment");
  return { ok: true };
}

export async function deleteQuestion(id: string) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };
  await prisma.prefQuestion.deleteMany({ where: { id, orgId: admin!.orgId } });
  revalidatePath("/admin/questions");
  return { ok: true };
}

/** Ask Claude to suggest or refine questions (admin-only, no personal data). */
export async function aiSuggestQuestions(instruction: string) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };
  const existing = await prisma.prefQuestion.findMany({
    where: { orgId: admin!.orgId },
    orderBy: { order: "asc" },
  });
  try {
    const result = await suggestQuestions(
      instruction,
      existing.map((q) => ({
        domain: q.domain,
        prompt: q.prompt,
        kind: q.kind,
        options: JSON.parse(q.options || "[]"),
      })),
    );
    return { ok: true, ...result };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "AI request failed." };
  }
}

// --- Coach (AI, grounded in the person's OWN profile) ----------------------

/**
 * Assemble the signed-in person's own profile into the shape the coach needs.
 * Returns null if they have not completed the assessment yet.
 */
async function myCoachInput(userId: string, orgId: string, name: string) {
  const profile = await assembleProfile(userId);
  if (!profile || !profile.domains) return null;
  const prefs = await getAnsweredPreferences(orgId, userId);
  return {
    firstName: name.trim().split(/\s+/)[0] || name,
    domains: profile.domains,
    facets: profile.facets,
    narrative: profile.narrative,
    prefs: prefs.map((p) => ({ prompt: p.prompt, answer: p.display })),
  };
}

/** Generate (or refresh) my coaching plan and cache it on my profile. */
export async function generateMyCoaching(): Promise<
  { ok: true; plan: CoachingPlan } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!coachEnabled())
    return { error: "Coaching is not turned on. An admin needs to set ANTHROPIC_API_KEY." };

  const input = await myCoachInput(user.id, user.orgId, user.name);
  if (!input)
    return { error: "Complete your assessment first so your coach has something to work with." };

  try {
    const plan = await generateCoaching(input);
    await prisma.profile.update({
      where: { userId: user.id },
      data: { coaching: JSON.stringify(plan), coachingAt: new Date() },
    });
    revalidatePath("/coach");
    return { ok: true, plan };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Coaching request failed." };
  }
}

/** Ask the coach about a specific situation, grounded in my profile. */
export async function askMyCoach(
  question: string,
): Promise<{ ok: true; answer: CoachAnswer } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!coachEnabled())
    return { error: "Coaching is not turned on. An admin needs to set ANTHROPIC_API_KEY." };

  const q = question.trim();
  if (q.length < 5) return { error: "Tell your coach a little more about the situation." };
  if (q.length > 1000) return { error: "Please keep it under 1000 characters." };

  const input = await myCoachInput(user.id, user.orgId, user.name);
  if (!input)
    return { error: "Complete your assessment first so your coach has something to work with." };

  try {
    const answer = await askCoach({ ...input, question: q });
    return { ok: true, answer };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Coaching request failed." };
  }
}

/** Promote a member to admin or demote an admin to member. */
export async function setRole(userId: string, role: "ADMIN" | "MEMBER") {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.orgId !== admin!.orgId)
    return { error: "That person isn't on your team." };

  // Guard against removing the last admin (which would lock everyone out of admin).
  if (role === "MEMBER" && target.role === "ADMIN") {
    const adminCount = await prisma.user.count({
      where: { orgId: admin!.orgId, role: "ADMIN" },
    });
    if (adminCount <= 1)
      return { error: "You can't remove the last admin. Promote someone else first." };
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  revalidatePath("/admin");
  return { ok: true };
}
