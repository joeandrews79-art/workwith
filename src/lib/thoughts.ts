/** Server-only loaders for captured Thoughts (Phase 2 item 3). Owner-scoped. */

import "server-only";
import { prisma } from "./db";
import { MeetingProposal } from "./structure";
import { MeetingTypeCode } from "./meeting-types";

export type ThoughtStatus = "captured" | "planned" | "archived";

export interface ThoughtView {
  id: string;
  text: string;
  detail: string | null;
  status: ThoughtStatus;
  teamId: string | null;
  teamName: string | null;
  aboutUserId: string | null;
  aboutName: string | null;
  meetingType: MeetingTypeCode | null;
  meetingId: string | null;
  meetingTitle: string | null;
  proposal: MeetingProposal | null; // parsed cache of "Structure this"
  createdAt: Date;
}

function parseProposal(json: string | null): MeetingProposal | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as MeetingProposal;
  } catch {
    return null;
  }
}

async function resolveNames(thoughts: {
  teamId: string | null;
  aboutUserId: string | null;
  meetingId: string | null;
}[]) {
  const teamIds = [...new Set(thoughts.map((t) => t.teamId).filter(Boolean) as string[])];
  const userIds = [...new Set(thoughts.map((t) => t.aboutUserId).filter(Boolean) as string[])];
  const meetingIds = [...new Set(thoughts.map((t) => t.meetingId).filter(Boolean) as string[])];

  const [teams, users, meetings] = await Promise.all([
    teamIds.length ? prisma.team.findMany({ where: { id: { in: teamIds } }, select: { id: true, name: true } }) : [],
    userIds.length ? prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [],
    meetingIds.length ? prisma.meeting.findMany({ where: { id: { in: meetingIds } }, select: { id: true, title: true } }) : [],
  ]);
  return {
    teamName: (id: string | null) => (id ? teams.find((t) => t.id === id)?.name ?? null : null),
    userName: (id: string | null) => (id ? users.find((u) => u.id === id)?.name ?? null : null),
    meetingTitle: (id: string | null) => (id ? meetings.find((m) => m.id === id)?.title ?? null : null),
  };
}

export async function listMyThoughts(userId: string): Promise<ThoughtView[]> {
  const rows = await prisma.thought.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  const names = await resolveNames(rows);
  return rows.map((t) => ({
    id: t.id,
    text: t.text,
    detail: t.detail,
    status: t.status as ThoughtStatus,
    teamId: t.teamId,
    teamName: names.teamName(t.teamId),
    aboutUserId: t.aboutUserId,
    aboutName: names.userName(t.aboutUserId),
    meetingType: (t.meetingType as MeetingTypeCode | null) ?? null,
    meetingId: t.meetingId,
    meetingTitle: names.meetingTitle(t.meetingId),
    proposal: parseProposal(t.structured),
    createdAt: t.createdAt,
  }));
}

export async function getMyThought(id: string, userId: string): Promise<ThoughtView | null> {
  const t = await prisma.thought.findUnique({ where: { id } });
  if (!t || t.userId !== userId) return null;
  const names = await resolveNames([t]);
  return {
    id: t.id,
    text: t.text,
    detail: t.detail,
    status: t.status as ThoughtStatus,
    teamId: t.teamId,
    teamName: names.teamName(t.teamId),
    aboutUserId: t.aboutUserId,
    aboutName: names.userName(t.aboutUserId),
    meetingType: (t.meetingType as MeetingTypeCode | null) ?? null,
    meetingId: t.meetingId,
    meetingTitle: names.meetingTitle(t.meetingId),
    proposal: parseProposal(t.structured),
    createdAt: t.createdAt,
  };
}
