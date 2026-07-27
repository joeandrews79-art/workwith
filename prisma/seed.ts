/**
 * Seed data: a fictional 8-person leadership team so the whole tool can be
 * seen working end to end. All people and scores here are invented; no real
 * personal data is used.
 *
 * It demonstrates every dashboard state:
 *   - completed + shared profiles (the common case)
 *   - a completed-but-NOT-shared profile (Dana)
 *   - a STALE profile older than 12 months, which trips the refresh flag (Tom)
 *   - an in-progress assessment (Alex)
 *   - an admin who has not started yet (Joe) -> shows the "start" journey
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ITEMS, DomainCode } from "../src/lib/ipip";
import { scoreAssessment, serializeScores, Responses } from "../src/lib/scoring";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "workwith-demo";
const ADMIN_PASSWORD = "workwith-admin";

// Effective per-item target means (1..5) for a low / mid / high trait.
const LEVEL = { low: 1.9, mid: 3.0, high: 4.3 } as const;
type Level = keyof typeof LEVEL;

// Targets are expressed in RAW trait direction (N high = more neurotic).
type Targets = Record<DomainCode, Level>;

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/** Build a full 120-item response set that lands near the target levels. */
function responsesFor(targets: Targets): Responses {
  const r: Responses = {};
  for (const item of ITEMS) {
    const target = LEVEL[targets[item.domain]];
    // Reverse the target for negatively-keyed items so the trait lands right.
    const base = item.keyed === "plus" ? target : 6 - target;
    const jitter = (Math.random() - 0.5) * 1.2;
    r[item.id] = Math.min(5, Math.max(1, Math.round(base + jitter)));
  }
  return r;
}

interface Person {
  name: string;
  email: string;
  title: string;
  role: "ADMIN" | "MEMBER";
  targets: Targets;
  shared: boolean;
  completedDaysAgo: number;
  inProgress?: boolean; // only partially answered, not completed
  notStarted?: boolean; // no assessment at all
}

// Targets in raw trait direction: N high = feels pressure; N low = steady.
const TEAM: Person[] = [
  {
    name: "Maya Chen",
    email: "maya@workwith.demo",
    title: "Head of Product",
    role: "MEMBER",
    targets: { E: "high", A: "high", C: "mid", N: "mid", O: "high" },
    shared: true,
    completedDaysAgo: 40,
  },
  {
    name: "Marcus Bell",
    email: "marcus@workwith.demo",
    title: "Head of Engineering",
    role: "MEMBER",
    targets: { E: "low", A: "low", C: "high", N: "low", O: "mid" },
    shared: true,
    completedDaysAgo: 55,
  },
  {
    name: "Priya Nair",
    email: "priya@workwith.demo",
    title: "Head of Operations",
    role: "MEMBER",
    targets: { E: "mid", A: "high", C: "high", N: "low", O: "low" },
    shared: true,
    completedDaysAgo: 20,
  },
  {
    name: "Tom Alvarez",
    email: "tom@workwith.demo",
    title: "Head of Sales",
    role: "MEMBER",
    targets: { E: "high", A: "mid", C: "low", N: "mid", O: "high" },
    shared: true,
    completedDaysAgo: 420, // > 12 months -> stale, triggers refresh flag
  },
  {
    name: "Dana Weiss",
    email: "dana@workwith.demo",
    title: "Head of Finance",
    role: "MEMBER",
    targets: { E: "mid", A: "low", C: "high", N: "low", O: "low" },
    shared: false, // completed but kept private
    completedDaysAgo: 30,
  },
  {
    name: "Sam Okafor",
    email: "sam@workwith.demo",
    title: "Head of People",
    role: "MEMBER",
    targets: { E: "high", A: "high", C: "mid", N: "high", O: "mid" },
    shared: true,
    completedDaysAgo: 12,
  },
  {
    name: "Alex Rivera",
    email: "alex@workwith.demo",
    title: "Head of Marketing",
    role: "MEMBER",
    targets: { E: "high", A: "mid", C: "mid", N: "mid", O: "high" },
    shared: false,
    completedDaysAgo: 0,
    inProgress: true,
  },
  {
    name: "Joe Andrews",
    email: "joeandrews79@gmail.com",
    title: "Founder",
    role: "ADMIN",
    targets: { E: "mid", A: "mid", C: "high", N: "low", O: "high" },
    shared: false,
    completedDaysAgo: 0,
    notStarted: true,
  },
];

async function main() {
  console.log("Resetting demo data...");
  await prisma.prefAnswer.deleteMany();
  await prisma.prefQuestion.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  const org = await prisma.organization.create({
    data: { name: "WorkWith Demo Co" },
  });

  const team = await prisma.team.create({
    data: { orgId: org.id, name: "Leadership Team" },
  });

  // Rise8-tailored working-preference questions (admins can edit these).
  const RISE8_QUESTIONS: {
    domain: string;
    prompt: string;
    kind: string;
    options: string[];
    helpText?: string;
  }[] = [
    { domain: "Communication", kind: "single", prompt: "When I get a non-urgent question, I'd rather...", options: ["Get a Slack message and reply when I can", "Hop on a quick call", "Let it wait for a scheduled sync"] },
    { domain: "Communication", kind: "single", prompt: "For something genuinely urgent, the fastest way to reach me is...", options: ["Slack DM", "Phone call or text", "Tag me in the channel", "Grab time on my calendar"] },
    { domain: "Communication", kind: "scale", prompt: "How much do I lean async versus real-time by default?", options: ["Mostly async", "A balance", "Mostly real-time"] },
    { domain: "Communication", kind: "single", prompt: "On video calls I default to...", options: ["Camera on", "Camera off is fine", "Depends on the meeting"] },
    { domain: "Communication", kind: "text", prompt: "My working hours and time zone, so people know when to expect me:", options: [] },
    { domain: "Feedback", kind: "scale", prompt: "How direct do I like feedback? At Rise8, blunt reads as respect, so be honest here.", options: ["Softened and gentle", "A balance", "Straight and blunt"] },
    { domain: "Feedback", kind: "single", prompt: "The best way to give me critical feedback is...", options: ["Direct and in the moment", "A quick private DM or call", "In writing so I can process it first"] },
    { domain: "Feedback", kind: "single", prompt: "When I disagree in a group, I tend to...", options: ["Say it directly in the room", "Raise it, but carefully", "Take it offline afterward"] },
    { domain: "Autonomy", kind: "scale", prompt: "By default I want...", options: ["Clear direction and check-ins", "A balance", "Full autonomy, trust me with the result"] },
    { domain: "Autonomy", kind: "single", prompt: "Loop me in when...", options: ["Only if something is blocked or off track", "At key milestones", "Often, I like to stay close"] },
    { domain: "Priorities", kind: "multi", prompt: "What energizes me most at work:", options: ["Shipping outcomes to real users", "Solving hard problems", "Working closely with the team", "Owning something end to end", "Learning something new"] },
    { domain: "Priorities", kind: "text", prompt: "What \"done\" means to me on a piece of work:", options: [] },
    { domain: "Under pressure", kind: "single", prompt: "Under a tight deadline, what helps me most is...", options: ["Fewer meetings and heads-down time", "A clear call on what to drop", "A teammate to pair with", "Space and trust"] },
    { domain: "Recognition", kind: "single", prompt: "I prefer recognition that is...", options: ["Public, a shout-out in a channel", "Private, a direct note", "Either is fine"] },
    { domain: "Remote collaboration", kind: "text", prompt: "One thing that makes remote work well for me, or breaks it:", options: [] },
  ];
  for (let i = 0; i < RISE8_QUESTIONS.length; i++) {
    const q = RISE8_QUESTIONS[i];
    await prisma.prefQuestion.create({
      data: {
        orgId: org.id,
        domain: q.domain,
        prompt: q.prompt,
        kind: q.kind,
        options: JSON.stringify(q.options),
        helpText: q.helpText ?? null,
        order: i,
      },
    });
  }

  for (const p of TEAM) {
    const passwordHash = await bcrypt.hash(
      p.role === "ADMIN" ? ADMIN_PASSWORD : DEMO_PASSWORD,
      10,
    );
    const user = await prisma.user.create({
      data: {
        orgId: org.id,
        email: p.email.toLowerCase(),
        name: p.name,
        title: p.title,
        role: p.role,
        passwordHash,
        mustReset: false,
        // Established members have finished onboarding; the not-started / in-progress
        // folks (and the admin) still see the first-run wizard.
        onboardedAt: p.notStarted || p.inProgress ? null : daysAgo(p.completedDaysAgo),
      },
    });

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: user.id },
    });

    if (p.notStarted) {
      console.log(`  ${p.name}: not started`);
      continue;
    }

    if (p.inProgress) {
      // Answer roughly the first 60 items only.
      const responses = responsesFor(p.targets);
      const partial: Responses = {};
      ITEMS.slice(0, 60).forEach((it) => (partial[it.id] = responses[it.id]));
      await prisma.assessment.create({
        data: {
          userId: user.id,
          status: "IN_PROGRESS",
          responses: JSON.stringify(partial),
          startedAt: daysAgo(2),
        },
      });
      console.log(`  ${p.name}: in progress (60/120)`);
      continue;
    }

    const responses = responsesFor(p.targets);
    const result = scoreAssessment(responses);
    const { domainScores, facetScores } = serializeScores(result);
    const completedAt = daysAgo(p.completedDaysAgo);

    const assessment = await prisma.assessment.create({
      data: {
        userId: user.id,
        status: "COMPLETED",
        responses: JSON.stringify(responses),
        domainScores: JSON.stringify(domainScores),
        facetScores: JSON.stringify(facetScores),
        startedAt: daysAgo(p.completedDaysAgo + 1),
        completedAt,
      },
    });

    await prisma.profile.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        shared: p.shared,
        refreshedAt: completedAt,
      },
    });
    console.log(
      `  ${p.name}: completed ${p.completedDaysAgo}d ago, shared=${p.shared}`,
    );
  }

  console.log("\nSeed complete.");
  console.log(`  Admin login:  joeandrews79@gmail.com / ${ADMIN_PASSWORD}`);
  console.log(`  Member login: any @workwith.demo email / ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
