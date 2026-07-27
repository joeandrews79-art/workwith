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

// --- Auth -------------------------------------------------------------------

export async function loginAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const user = await verifyCredentials(email, password);
  if (!user) return { error: "That email and password did not match." };
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
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
      // Re-taking clears prior edits so the narrative reflects the new scores.
      editedNarrative: null,
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
