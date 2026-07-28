import "server-only";
import { prisma } from "@/lib/db";
import { DomainCode, DOMAIN_ORDER } from "@/lib/ipip";
import { DomainScore } from "@/lib/scoring";
import { Member, workingWith } from "@/lib/team";
import { WEEKDAY_SHORT, MONTH_LONG, fmtTime } from "@/lib/calendar";
import { meetingStartInstant } from "./tz";
import { slackTimezone } from "./env";
import { dmUser } from "./client";
import { preMeetingBlocks } from "./blocks";

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

// Nudge a meeting when it starts within this many minutes. The job runs every
// ~15 min and dedupes via SlackNudge, so each meeting is nudged exactly once.
const LEAD_MAX_MIN = 45;

function whenLabel(scheduledFor: Date, startMinute: number, teamName: string): string {
  const wd = WEEKDAY_SHORT[scheduledFor.getUTCDay()];
  const mo = MONTH_LONG[scheduledFor.getUTCMonth()].slice(0, 3);
  const d = scheduledFor.getUTCDate();
  return `${wd}, ${mo} ${d} · ${fmtTime(startMinute)} · ${teamName}`;
}

/**
 * Send pre-meeting working-style DMs for meetings starting soon. Deterministic
 * and local: only shared profiles feed a recipient's read, and a recipient must
 * have opted in (linked Slack + preMeetingEnabled). Returns a run summary.
 */
export async function runPreMeetingNudges(now = new Date()): Promise<{
  windowMeetings: number;
  sent: number;
  errors: number;
}> {
  const tz = slackTimezone();
  // Meetings within a couple of days (covers tz edges); filter precisely in JS.
  const lo = new Date(now.getTime() - 2 * 864e5);
  const hi = new Date(now.getTime() + 2 * 864e5);

  const meetings = await prisma.meeting.findMany({
    where: { scheduledFor: { gte: lo, lte: hi }, startMinute: { not: null } },
    include: {
      team: { select: { name: true } },
      slackNudges: { select: { userId: true } },
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              profile: { select: { shared: true } },
              assessments: {
                where: { status: "COMPLETED" },
                orderBy: { completedAt: "desc" },
                take: 1,
                select: { domainScores: true },
              },
              slackLink: {
                select: { slackUserId: true, preMeetingEnabled: true },
              },
            },
          },
        },
      },
    },
  });

  let windowMeetings = 0;
  let sent = 0;
  let errors = 0;

  for (const m of meetings) {
    const start = meetingStartInstant(m.scheduledFor, m.startMinute, tz);
    if (!start) continue;
    const minsUntil = (start.getTime() - now.getTime()) / 60000;
    if (minsUntil <= 0 || minsUntil > LEAD_MAX_MIN) continue;
    windowMeetings++;

    // Build every attendee once: their scores, share flag, and Slack link.
    const people = m.attendees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      domains: parseDomains(a.user.assessments[0]?.domainScores ?? null),
      shared: a.user.profile?.shared ?? false,
      link: a.user.slackLink,
    }));
    const alreadyNudged = new Set(m.slackNudges.map((n) => n.userId));

    for (const recipient of people) {
      if (alreadyNudged.has(recipient.id)) continue;
      if (!recipient.link?.slackUserId || !recipient.link.preMeetingEnabled) continue;
      if (!recipient.domains) continue; // need their own scores to compare

      const me: Member = { id: recipient.id, name: recipient.name, domains: recipient.domains };
      const others = people.filter((p) => p.id !== recipient.id && p.shared && p.domains);
      if (others.length === 0) continue; // nothing to read on yet; try again next tick

      const perAttendee = others.map((o) => {
        const g = workingWith(me, { id: o.id, name: o.name, domains: o.domains! });
        return { name: o.name, topMove: g.moves[0]?.text ?? null, similar: g.moves.length === 0 };
      });

      const blocks = preMeetingBlocks({
        title: m.title,
        whenLabel: whenLabel(m.scheduledFor!, m.startMinute!, m.team.name),
        meetingId: m.id,
        perAttendee,
      });

      const res = await dmUser(recipient.link.slackUserId, {
        text: `Prep for ${m.title}`,
        blocks,
      });
      if (res.ok) {
        await prisma.slackNudge.create({ data: { meetingId: m.id, userId: recipient.id } });
        sent++;
      } else {
        errors++;
      }
    }
  }

  return { windowMeetings, sent, errors };
}
