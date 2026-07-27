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
import { ITEMS, DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { scoreAssessment, serializeScores, Responses, bandFor } from "@/lib/scoring";
import { Narrative } from "@/lib/narrative";
import { suggestQuestions } from "@/lib/ai";
import { assembleProfile } from "@/lib/profile";
import { getAnsweredPreferences } from "@/lib/prefs";
import { writeActiveTeamCookie, getActiveTeamId, canLeadTeam, getActiveTeamContext } from "@/lib/active-team";
import { MEETING_TYPES } from "@/lib/meeting-types";
import { getTeamRoster, getVisibleTeamMembers } from "@/lib/team-data";
import { teamStats, relBand } from "@/lib/team";
import { DOMAIN_POLES } from "@/lib/ui";
import { structureThought, MeetingProposal } from "@/lib/structure";
import { buildAgenda, tightenAgenda } from "@/lib/agenda-ai";
import { MeetingTypeCode } from "@/lib/meeting-types";
import {
  coachEnabled,
  generateCoaching,
  askCoach,
  CoachingPlan,
  CoachAnswer,
} from "@/lib/coach";
import { generateTeamRead, teamReadEnabled, TeamReadResult, TeamReadTrait } from "@/lib/team-read";
import { generateInterpretation, interpretEnabled, InterpretationResult } from "@/lib/interpret";

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
      // Re-taking clears prior edits and all AI-cached reads so they reflect the new scores.
      editedNarrative: null,
      coaching: null,
      coachingAt: null,
      interpretation: null,
      interpretationAt: null,
      teamRead: null,
      teamReadAt: null,
      teamReadTeamId: null,
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

// --- Meetings (Phase 2 item 2) ---------------------------------------------

const meetingInputSchema = z.object({
  type: z.enum(MEETING_TYPES.map((t) => t.code) as [string, ...string[]]),
  title: z.string().trim().min(1).max(200),
  goal: z.string().trim().max(500).optional().nullable(),
  scheduledFor: z.string().trim().optional().nullable(), // ISO date (yyyy-mm-dd) or empty
  startMinute: z.number().int().min(0).max(1439).optional().nullable(), // wall-clock minutes past midnight
  durationMin: z.number().int().min(5).max(1440).optional().nullable(),
  attendeeIds: z.array(z.string()).max(50),
});
type MeetingInput = z.infer<typeof meetingInputSchema>;

function parseScheduledFor(v: string | null | undefined): Date | null {
  if (!v) return null;
  // yyyy-mm-dd → UTC midnight, so the day is stored floating (see lib/calendar.ts).
  const d = new Date(`${v}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

/** A time only means something with a date; drop it (and duration) when undated. */
function normalizeTime(
  scheduledFor: Date | null,
  startMinute: number | null | undefined,
  durationMin: number | null | undefined,
): { startMinute: number | null; durationMin: number | null } {
  if (!scheduledFor || startMinute == null) return { startMinute: null, durationMin: null };
  return { startMinute, durationMin: durationMin ?? 30 };
}

/** Keep only attendee ids that are real members of the team, plus the creator. */
async function resolveAttendees(teamId: string, creatorId: string, ids: string[]) {
  const wanted = new Set([creatorId, ...ids]);
  const members = await prisma.teamMember.findMany({
    where: { teamId, userId: { in: [...wanted] } },
    select: { userId: true },
  });
  return members.map((m) => m.userId);
}

export async function createMeeting(input: MeetingInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = meetingInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Please add a meeting type and a title." };

  const teamId = await getActiveTeamId(user.id);
  if (!teamId) return { error: "Join a team before planning a meeting." };

  const attendeeIds = await resolveAttendees(teamId, user.id, parsed.data.attendeeIds);
  const scheduledFor = parseScheduledFor(parsed.data.scheduledFor);
  const time = normalizeTime(scheduledFor, parsed.data.startMinute, parsed.data.durationMin);
  const meeting = await prisma.meeting.create({
    data: {
      teamId,
      type: parsed.data.type,
      title: parsed.data.title,
      goal: parsed.data.goal || null,
      scheduledFor,
      startMinute: time.startMinute,
      durationMin: time.durationMin,
      createdById: user.id,
      attendees: { create: attendeeIds.map((userId) => ({ userId })) },
    },
  });
  revalidatePath("/meeting");
  return { ok: true, id: meeting.id };
}

/** Only the creator or a team leader/admin may edit or delete a meeting. */
async function canManageMeeting(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  meetingId: string,
) {
  const m = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { team: { select: { orgId: true } } },
  });
  if (!m || m.team.orgId !== user.orgId) return null;
  if (m.createdById === user.id) return m;
  return (await canLeadTeam(user.id, m.teamId, isAdmin(user))) ? m : null;
}

export async function updateMeeting(id: string, input: MeetingInput) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = meetingInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Please add a meeting type and a title." };
  const meeting = await canManageMeeting(user, id);
  if (!meeting) return { error: "You can't edit this meeting." };

  const attendeeIds = await resolveAttendees(meeting.teamId, meeting.createdById, parsed.data.attendeeIds);
  const scheduledFor = parseScheduledFor(parsed.data.scheduledFor);
  const time = normalizeTime(scheduledFor, parsed.data.startMinute, parsed.data.durationMin);
  await prisma.$transaction([
    prisma.meetingAttendee.deleteMany({ where: { meetingId: id } }),
    prisma.meeting.update({
      where: { id },
      data: {
        type: parsed.data.type,
        title: parsed.data.title,
        goal: parsed.data.goal || null,
        scheduledFor,
        startMinute: time.startMinute,
        durationMin: time.durationMin,
        attendees: { create: attendeeIds.map((userId) => ({ userId })) },
      },
    }),
  ]);
  revalidatePath("/meeting");
  revalidatePath(`/meeting/${id}`);
  return { ok: true, id };
}

export async function deleteMeeting(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, id))) return { error: "You can't delete this meeting." };
  await prisma.meeting.delete({ where: { id } });
  revalidatePath("/meeting");
  return { ok: true };
}

const rescheduleSchema = z.object({
  scheduledFor: z.string().trim().optional().nullable(), // yyyy-mm-dd or empty
  startMinute: z.number().int().min(0).max(1439).optional().nullable(),
  durationMin: z.number().int().min(5).max(1440).optional().nullable(),
});

/** Lightweight move/reschedule from the calendar: just date + time, no re-editing the whole meeting. */
export async function rescheduleMeeting(id: string, input: z.infer<typeof rescheduleSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, id))) return { error: "You can't reschedule this meeting." };
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "That date or time didn't look right." };

  const scheduledFor = parseScheduledFor(parsed.data.scheduledFor);
  const time = normalizeTime(scheduledFor, parsed.data.startMinute, parsed.data.durationMin);
  await prisma.meeting.update({
    where: { id },
    data: { scheduledFor, startMinute: time.startMinute, durationMin: time.durationMin },
  });
  revalidatePath("/meeting");
  revalidatePath(`/meeting/${id}`);
  return { ok: true };
}

// --- Agenda (Phase 2 item 4) -----------------------------------------------

const agendaItemSchema = z.object({
  topic: z.string().trim().min(1).max(300),
  purpose: z.enum(["decision", "discussion", "information", "brainstorm"]),
  minutes: z.number().int().min(1).max(240).nullable().optional(),
  ownerId: z.string().nullable().optional(),
});

/** Load an agenda item and confirm the caller can manage its meeting. */
async function manageableAgendaItem(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  itemId: string,
) {
  const item = await prisma.agendaItem.findUnique({ where: { id: itemId } });
  if (!item) return null;
  return (await canManageMeeting(user, item.meetingId)) ? item : null;
}

/** Gather the structural context the agenda AI needs (no profiles). */
async function meetingAiContext(meetingId: string) {
  const m = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: { attendees: { include: { user: { select: { name: true, title: true } } } } },
  });
  if (!m) return null;
  return {
    title: m.title,
    type: m.type as MeetingTypeCode,
    goal: m.goal,
    attendees: m.attendees.map((a) => ({ name: a.user.name, title: a.user.title })),
  };
}

export async function addAgendaItem(meetingId: string, input: z.infer<typeof agendaItemSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, meetingId))) return { error: "You can't edit this agenda." };
  const parsed = agendaItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Give the item a topic." };
  const last = await prisma.agendaItem.findFirst({
    where: { meetingId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.agendaItem.create({
    data: {
      meetingId,
      order: (last?.order ?? -1) + 1,
      topic: parsed.data.topic,
      purpose: parsed.data.purpose,
      minutes: parsed.data.minutes ?? null,
      ownerId: parsed.data.ownerId || null,
    },
  });
  revalidatePath(`/meeting/${meetingId}`);
  return { ok: true };
}

export async function updateAgendaItem(itemId: string, input: z.infer<typeof agendaItemSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const item = await manageableAgendaItem(user, itemId);
  if (!item) return { error: "You can't edit this agenda." };
  const parsed = agendaItemSchema.safeParse(input);
  if (!parsed.success) return { error: "Give the item a topic." };
  await prisma.agendaItem.update({
    where: { id: itemId },
    data: {
      topic: parsed.data.topic,
      purpose: parsed.data.purpose,
      minutes: parsed.data.minutes ?? null,
      ownerId: parsed.data.ownerId || null,
    },
  });
  revalidatePath(`/meeting/${item.meetingId}`);
  return { ok: true };
}

export async function deleteAgendaItem(itemId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const item = await manageableAgendaItem(user, itemId);
  if (!item) return { error: "You can't edit this agenda." };
  await prisma.agendaItem.delete({ where: { id: itemId } });
  revalidatePath(`/meeting/${item.meetingId}`);
  return { ok: true };
}

export async function reorderAgenda(meetingId: string, orderedIds: string[]) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, meetingId))) return { error: "You can't edit this agenda." };
  const items = await prisma.agendaItem.findMany({ where: { meetingId }, select: { id: true } });
  const owned = new Set(items.map((i) => i.id));
  await prisma.$transaction(
    orderedIds
      .filter((id) => owned.has(id))
      .map((id, i) => prisma.agendaItem.update({ where: { id }, data: { order: i } })),
  );
  revalidatePath(`/meeting/${meetingId}`);
  return { ok: true };
}

async function replaceAgenda(meetingId: string, items: { topic: string; purpose: string; minutes: number }[]) {
  await prisma.$transaction([
    prisma.agendaItem.deleteMany({ where: { meetingId } }),
    ...items.map((it, i) =>
      prisma.agendaItem.create({
        data: { meetingId, order: i, topic: it.topic, purpose: it.purpose, minutes: it.minutes },
      }),
    ),
  ]);
}

export async function buildAgendaAction(meetingId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, meetingId))) return { error: "You can't edit this agenda." };
  const ctx = await meetingAiContext(meetingId);
  if (!ctx) return { error: "Meeting not found." };
  try {
    const items = await buildAgenda(ctx);
    await replaceAgenda(meetingId, items);
    revalidatePath(`/meeting/${meetingId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not build the agenda." };
  }
}

export async function tightenAgendaAction(meetingId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await canManageMeeting(user, meetingId))) return { error: "You can't edit this agenda." };
  const ctx = await meetingAiContext(meetingId);
  if (!ctx) return { error: "Meeting not found." };
  const current = await prisma.agendaItem.findMany({
    where: { meetingId },
    orderBy: { order: "asc" },
    select: { topic: true, purpose: true, minutes: true },
  });
  if (current.length === 0) return { error: "Add or build an agenda first." };
  try {
    const items = await tightenAgenda(ctx, current);
    await replaceAgenda(meetingId, items);
    revalidatePath(`/meeting/${meetingId}`);
    return { ok: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not tighten the agenda." };
  }
}

// --- Thought capture (Phase 2 item 3) --------------------------------------

/** Context for the quick-capture form: the active team and who's on it. */
export async function getThoughtCaptureContext() {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." as const };
  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return { ok: true as const, teamId: null, teamName: null, members: [] };
  const roster = await getTeamRoster(activeTeam.id);
  return {
    ok: true as const,
    teamId: activeTeam.id,
    teamName: activeTeam.name,
    members: roster.filter((m) => m.id !== user.id).map((m) => ({ id: m.id, name: m.name })),
  };
}

const thoughtInputSchema = z.object({
  text: z.string().trim().min(1).max(300),
  detail: z.string().trim().max(2000).optional().nullable(),
  teamId: z.string().optional().nullable(),
  aboutUserId: z.string().optional().nullable(),
  meetingType: z.enum(MEETING_TYPES.map((t) => t.code) as [string, ...string[]]).optional().nullable(),
});

export async function createThought(input: z.infer<typeof thoughtInputSchema>) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const parsed = thoughtInputSchema.safeParse(input);
  if (!parsed.success) return { error: "Jot down at least a line before saving." };

  // Validate the optional team + anchored person belong to the user's world.
  let teamId = parsed.data.teamId || (await getActiveTeamId(user.id));
  if (teamId) {
    const member = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: user.id } },
      select: { id: true },
    });
    if (!member) teamId = null; // don't pin to a team you're not on
  }
  let aboutUserId = parsed.data.aboutUserId || null;
  if (aboutUserId && teamId) {
    const onTeam = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: aboutUserId } },
      select: { id: true },
    });
    if (!onTeam) aboutUserId = null;
  } else {
    aboutUserId = null;
  }

  await prisma.thought.create({
    data: {
      userId: user.id,
      text: parsed.data.text,
      detail: parsed.data.detail || null,
      teamId,
      aboutUserId,
      meetingType: parsed.data.meetingType || null,
    },
  });
  revalidatePath("/thoughts");
  return { ok: true };
}

async function myThought(userId: string, id: string) {
  const t = await prisma.thought.findUnique({ where: { id } });
  return t && t.userId === userId ? t : null;
}

export async function setThoughtStatus(id: string, status: "captured" | "archived") {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await myThought(user.id, id))) return { error: "Not your thought." };
  await prisma.thought.update({ where: { id }, data: { status } });
  revalidatePath("/thoughts");
  return { ok: true };
}

export async function deleteThought(id: string) {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!(await myThought(user.id, id))) return { error: "Not your thought." };
  await prisma.thought.delete({ where: { id } });
  revalidatePath("/thoughts");
  return { ok: true };
}

/** Ask Claude to turn a captured thought into a proposed meeting brief. */
export async function structureThoughtAction(
  id: string,
): Promise<{ ok: true; proposal: MeetingProposal } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const t = await myThought(user.id, id);
  if (!t) return { error: "Not your thought." };

  // Roster to suggest attendees from: the thought's team (or the active team).
  const teamId = t.teamId || (await getActiveTeamId(user.id));
  const roster = teamId ? await getTeamRoster(teamId) : [];
  const aboutName = t.aboutUserId
    ? (await prisma.user.findUnique({ where: { id: t.aboutUserId }, select: { name: true } }))?.name ?? null
    : null;

  try {
    const proposal = await structureThought({
      text: t.text,
      detail: t.detail,
      meetingTypeHint: t.meetingType,
      aboutName,
      roster: roster.map((r) => ({ id: r.id, name: r.name, title: r.title })),
    });
    await prisma.thought.update({ where: { id }, data: { structured: JSON.stringify(proposal) } });
    revalidatePath(`/thoughts/${id}`);
    return { ok: true, proposal };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not structure this thought." };
  }
}

/** Create a real Meeting from a thought's cached proposal, and link them. */
export async function createMeetingFromThought(
  id: string,
): Promise<{ ok: true; id: string } | { error: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  const t = await myThought(user.id, id);
  if (!t) return { error: "Not your thought." };
  if (!t.structured) return { error: "Structure this thought first." };

  let proposal: MeetingProposal;
  try {
    proposal = JSON.parse(t.structured) as MeetingProposal;
  } catch {
    return { error: "The saved proposal is unreadable. Structure it again." };
  }

  const teamId = t.teamId || (await getActiveTeamId(user.id));
  if (!teamId) return { error: "Join a team before turning this into a meeting." };
  const onTeam = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId, userId: user.id } },
    select: { id: true },
  });
  if (!onTeam) return { error: "You're not on that team anymore." };

  const attendeeIds = await resolveAttendees(teamId, user.id, proposal.attendeeIds ?? []);
  const meeting = await prisma.meeting.create({
    data: {
      teamId,
      type: proposal.meetingType,
      title: proposal.title,
      goal: proposal.goal || null,
      createdById: user.id,
      attendees: { create: attendeeIds.map((userId) => ({ userId })) },
      // Carry the proposed agenda straight onto the meeting.
      agenda: {
        create: (proposal.agenda ?? []).map((a, i) => ({
          order: i,
          topic: a.topic,
          purpose: a.purpose,
        })),
      },
    },
  });
  await prisma.thought.update({
    where: { id },
    data: { status: "planned", meetingId: meeting.id },
  });
  revalidatePath("/thoughts");
  revalidatePath("/meeting");
  return { ok: true, id: meeting.id };
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

/** Generate (or refresh) my team read, grounded in aggregate team stats only. */
export async function generateMyTeamRead(): Promise<
  { ok: true; read: TeamReadResult; teamId: string } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!teamReadEnabled())
    return { error: "This is not turned on. An admin needs to set ANTHROPIC_API_KEY." };

  const { activeTeam } = await getActiveTeamContext(user.id);
  if (!activeTeam) return { error: "Join a team first." };

  const members = await getVisibleTeamMembers(activeTeam.id, user.id);
  if (members.length < 2)
    return { error: "The team needs at least two completed, shared profiles first." };
  const viewer = members.find((m) => m.id === user.id);
  if (!viewer) return { error: "Complete your own assessment first so we can place you on the team." };

  const stats = teamStats(members);
  const traits: TeamReadTrait[] = DOMAIN_ORDER.map((d) => {
    const you = viewer.domains[d].friendlyScore;
    const st = stats[d];
    return {
      friendly: DOMAINS[d].friendly,
      lowPole: DOMAIN_POLES[d].low,
      highPole: DOMAIN_POLES[d].high,
      you,
      band: bandFor(you),
      teamMean: st.mean,
      teamMin: st.min,
      teamMax: st.max,
      rel: relBand(you, st),
    };
  });

  try {
    const read = await generateTeamRead({
      firstName: user.name.trim().split(/\s+/)[0] || user.name,
      teamName: activeTeam.name,
      teamSize: members.length,
      traits,
    });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { teamRead: JSON.stringify(read), teamReadAt: new Date(), teamReadTeamId: activeTeam.id },
    });
    revalidatePath("/team-map");
    return { ok: true, read, teamId: activeTeam.id };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The request failed." };
  }
}

/** Generate (or refresh) a plain-language read of MY own scores. */
export async function generateMyInterpretation(): Promise<
  { ok: true; interpretation: InterpretationResult } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not signed in." };
  if (!interpretEnabled())
    return { error: "This is not turned on. An admin needs to set ANTHROPIC_API_KEY." };

  const profile = await assembleProfile(user.id);
  if (!profile || !profile.domains)
    return { error: "Complete your assessment first so there's something to interpret." };

  try {
    const interpretation = await generateInterpretation({
      firstName: user.name.trim().split(/\s+/)[0] || user.name,
      domains: profile.domains,
    });
    await prisma.profile.update({
      where: { userId: user.id },
      data: { interpretation: JSON.stringify(interpretation), interpretationAt: new Date() },
    });
    revalidatePath("/me");
    revalidatePath("/report");
    return { ok: true, interpretation };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "The request failed." };
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
