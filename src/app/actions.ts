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
import { writeActiveTeamCookie } from "@/lib/active-team";
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

  // Which team(s) the person joins. The form sends one or more `teamIds`;
  // fall back to the inviting admin's team(s), then the org's first team.
  let teamIds = formData.getAll("teamIds").map(String).filter(Boolean);
  if (teamIds.length) {
    const owned = await prisma.team.findMany({
      where: { id: { in: teamIds }, orgId: admin!.orgId },
      select: { id: true },
    });
    teamIds = owned.map((t) => t.id); // drop anything not in this org
  }
  if (!teamIds.length) {
    const adminTeams = await prisma.teamMember.findMany({
      where: { userId: admin!.id },
      select: { teamId: true },
    });
    teamIds = adminTeams.length
      ? adminTeams.map((t) => t.teamId)
      : (await prisma.team.findMany({ where: { orgId: admin!.orgId }, select: { id: true }, take: 1 })).map((t) => t.id);
  }
  if (!teamIds.length)
    return { error: "Create a team first, then invite people into it." };

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

  for (const teamId of teamIds) {
    await prisma.teamMember.create({ data: { teamId, userId: user.id } });
  }

  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/admin");
  revalidatePath("/admin/teams");
  return {
    ok: true,
    message: `${name} added${asAdmin ? " as an admin" : ""}. Share their temporary password securely.`,
  };
}

// --- Teams (multi-team foundation) -----------------------------------------

/** Switch which team the current user is viewing. */
export async function setActiveTeam(teamId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const membership = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
  });
  if (!membership) return { error: "You're not on that team." };
  await writeActiveTeamCookie(teamId);
  revalidatePath("/dashboard");
  revalidatePath("/directory");
  revalidatePath("/compare");
  revalidatePath("/discussion");
  revalidatePath("/meeting");
  return { ok: true };
}

/** Guard that a team belongs to the user's org, returns it or null. */
async function orgTeam(orgId: string, teamId: string) {
  return prisma.team.findFirst({ where: { id: teamId, orgId } });
}

/**
 * May this user manage this team's roster? Org admins can manage any team in
 * their org; a team's own leaders can manage that team. Returns the team (for
 * reuse) or null if not allowed.
 */
async function manageableTeam(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  teamId: string,
) {
  const team = await orgTeam(user.orgId, teamId);
  if (!team) return null;
  if (isAdmin(user)) return team;
  const m = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
    select: { role: true },
  });
  return m?.role === "LEADER" ? team : null;
}

export async function createTeam(_prev: unknown, formData: FormData) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Give the team a name." };
  const dup = await prisma.team.findFirst({
    where: { orgId: admin!.orgId, name: { equals: name, mode: "insensitive" } },
  });
  if (dup) return { error: "A team with that name already exists." };
  await prisma.team.create({ data: { orgId: admin!.orgId, name } });
  revalidatePath("/admin/teams");
  return { ok: true, message: `Created "${name}".` };
}

export async function renameTeam(teamId: string, name: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the team a name." };
  if (!(await manageableTeam(user, teamId)))
    return { error: "You can't manage that team." };
  await prisma.team.update({ where: { id: teamId }, data: { name: trimmed } });
  revalidatePath("/admin/teams");
  revalidatePath("/teams/manage");
  revalidatePath("/directory");
  return { ok: true };
}

/** Create/delete are org-wide operations, so they stay admin-only. */
export async function deleteTeam(teamId: string) {
  const admin = await getCurrentUser();
  if (!isAdmin(admin)) return { error: "Admins only." };
  if (!(await orgTeam(admin!.orgId, teamId))) return { error: "Unknown team." };
  const count = await prisma.team.count({ where: { orgId: admin!.orgId } });
  if (count <= 1)
    return { error: "You can't delete the only team. Create another first." };
  // Membership rows cascade; people keep their account and any other teams.
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/admin/teams");
  revalidatePath("/directory");
  return { ok: true };
}

export async function addTeamMember(teamId: string, userId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await manageableTeam(user, teamId)))
    return { error: "You can't manage that team." };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.orgId !== user.orgId)
    return { error: "That person isn't in your organization." };
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId, userId } },
    create: { teamId, userId },
    update: {},
  });
  revalidatePath("/admin/teams");
  revalidatePath("/teams/manage");
  revalidatePath("/directory");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function removeTeamMember(teamId: string, userId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await manageableTeam(user, teamId)))
    return { error: "You can't manage that team." };
  await prisma.teamMember.deleteMany({ where: { teamId, userId } });
  revalidatePath("/admin/teams");
  revalidatePath("/teams/manage");
  revalidatePath("/directory");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Set a member's per-team role (leader vs member). Managers of the team only. */
export async function setTeamRole(
  teamId: string,
  userId: string,
  role: "LEADER" | "MEMBER",
) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await manageableTeam(user, teamId)))
    return { error: "You can't manage that team." };
  const updated = await prisma.teamMember.updateMany({
    where: { teamId, userId },
    data: { role },
  });
  if (updated.count === 0)
    return { error: "That person isn't on this team." };
  revalidatePath("/admin/teams");
  revalidatePath("/teams/manage");
  revalidatePath("/dashboard");
  return { ok: true };
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
