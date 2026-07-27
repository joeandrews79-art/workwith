/** Server-only loaders for saved Meetings (Phase 2 item 2). */

import "server-only";
import { prisma } from "./db";
import { DomainCode, DOMAIN_ORDER } from "./ipip";
import { DomainScore } from "./scoring";
import { Member } from "./team";
import { MeetingTypeCode } from "./meeting-types";

function parseDomains(json: string | null): Record<DomainCode, DomainScore> | null {
  if (!json) return null;
  try {
    const obj = JSON.parse(json) as Record<DomainCode, DomainScore>;
    for (const d of DOMAIN_ORDER) if (!obj[d]) return null;
    return obj;
  } catch {
    return null;
  }
}

export interface MeetingSummary {
  id: string;
  type: MeetingTypeCode;
  title: string;
  scheduledFor: Date | null;
  createdAt: Date;
  createdById: string;
  attendees: { id: string; name: string }[];
}

/** All saved meetings for a team, most recent first. */
export async function listTeamMeetings(teamId: string): Promise<MeetingSummary[]> {
  const rows = await prisma.meeting.findMany({
    where: { teamId },
    orderBy: [{ scheduledFor: "desc" }, { createdAt: "desc" }],
    include: { attendees: { include: { user: { select: { id: true, name: true } } } } },
  });
  return rows.map((m) => ({
    id: m.id,
    type: m.type as MeetingTypeCode,
    title: m.title,
    scheduledFor: m.scheduledFor,
    createdAt: m.createdAt,
    createdById: m.createdById,
    attendees: m.attendees.map((a) => ({ id: a.user.id, name: a.user.name })),
  }));
}

export interface AgendaItemView {
  id: string;
  order: number;
  topic: string;
  purpose: "decision" | "discussion" | "information" | "brainstorm";
  minutes: number | null;
  ownerId: string | null;
  ownerName: string | null;
}

export interface MeetingDetail {
  id: string;
  teamId: string;
  type: MeetingTypeCode;
  title: string;
  goal: string | null;
  scheduledFor: Date | null;
  createdById: string;
  createdByName: string;
  attendees: { id: string; name: string; title: string | null; hasProfile: boolean }[];
  agenda: AgendaItemView[];
  /** Current viewer as a Member (their scores), if they've completed a profile. */
  viewerMember: Member | null;
  /** Other attendees, excluding the viewer, whose profiles are visible. */
  otherMembers: Member[];
}

/**
 * Load one meeting for a viewer. The brief is recomputed by the caller from
 * viewerMember + otherMembers, so it always reflects current profiles. Profile
 * visibility still applies: only shared (or the viewer's own) profiles feed the
 * brief; unshared attendees still appear in the roster, just without a read.
 */
export async function getMeetingDetail(
  meetingId: string,
  viewerId: string,
): Promise<MeetingDetail | null> {
  const m = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: {
      createdBy: { select: { name: true } },
      agenda: { orderBy: { order: "asc" } },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              title: true,
              profile: { select: { shared: true } },
              assessments: {
                where: { status: "COMPLETED" },
                orderBy: { completedAt: "desc" },
                take: 1,
                select: { domainScores: true },
              },
            },
          },
        },
      },
    },
  });
  if (!m) return null;

  // The viewer's own scores (for first-person advice), even if not an attendee.
  const viewer = await prisma.user.findUnique({
    where: { id: viewerId },
    select: {
      id: true,
      name: true,
      assessments: {
        where: { status: "COMPLETED" },
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { domainScores: true },
      },
    },
  });
  const viewerDomains = parseDomains(viewer?.assessments[0]?.domainScores ?? null);
  const viewerMember: Member | null =
    viewer && viewerDomains ? { id: viewer.id, name: viewer.name, domains: viewerDomains } : null;

  const attendees = m.attendees.map((a) => {
    const domains = parseDomains(a.user.assessments[0]?.domainScores ?? null);
    return {
      id: a.user.id,
      name: a.user.name,
      title: a.user.title,
      hasProfile: !!domains,
      shared: a.user.profile?.shared ?? false,
      domains,
    };
  });

  const otherMembers: Member[] = attendees
    .filter((a) => a.id !== viewerId && a.domains && (a.shared || a.id === viewerId))
    .map((a) => ({ id: a.id, name: a.name, domains: a.domains! }));

  const nameById = new Map(attendees.map((a) => [a.id, a.name] as const));
  const agenda: AgendaItemView[] = m.agenda.map((a) => ({
    id: a.id,
    order: a.order,
    topic: a.topic,
    purpose: a.purpose as AgendaItemView["purpose"],
    minutes: a.minutes,
    ownerId: a.ownerId,
    ownerName: a.ownerId ? nameById.get(a.ownerId) ?? null : null,
  }));

  return {
    id: m.id,
    teamId: m.teamId,
    type: m.type as MeetingTypeCode,
    title: m.title,
    goal: m.goal,
    scheduledFor: m.scheduledFor,
    createdById: m.createdById,
    createdByName: m.createdBy.name,
    attendees: attendees.map((a) => ({ id: a.id, name: a.name, title: a.title, hasProfile: a.hasProfile })),
    agenda,
    viewerMember,
    otherMembers,
  };
}
