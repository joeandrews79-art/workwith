/**
 * Provision a CLEAN, real Rise8 organization + an admin account for Joe.
 *
 * This is deliberately SEPARATE from prisma/seed.ts (which wipes everything and
 * builds the fictional demo org). This script is ADDITIVE and IDEMPOTENT: it
 * never deletes, and re-running it will not duplicate the org, team, questions,
 * or user. It leaves the "WorkWith Demo Co" demo data untouched.
 *
 * Run:  npx tsx prisma/provision-rise8.ts
 *
 * On first run it prints a one-time temporary password for the admin. Joe logs
 * in with it and is forced to set his own password immediately (mustReset).
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

const ORG_NAME = "Rise8";
const TEAM_NAME = "Rise8 Leadership";
const ADMIN_EMAIL = "jandrews@rise8.us";
const ADMIN_NAME = "Joe Andrews";

// The same Rise8-tailored working-preference questions the demo org ships with.
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

async function main() {
  // 1. Organization (find or create).
  let org = await prisma.organization.findFirst({ where: { name: ORG_NAME } });
  if (!org) {
    org = await prisma.organization.create({ data: { name: ORG_NAME } });
    console.log(`Created organization "${ORG_NAME}" (${org.id})`);
  } else {
    console.log(`Organization "${ORG_NAME}" already exists (${org.id})`);
  }

  // 2. Team (find or create).
  let team = await prisma.team.findFirst({ where: { orgId: org.id, name: TEAM_NAME } });
  if (!team) {
    team = await prisma.team.create({ data: { orgId: org.id, name: TEAM_NAME } });
    console.log(`Created team "${TEAM_NAME}" (${team.id})`);
  } else {
    console.log(`Team "${TEAM_NAME}" already exists (${team.id})`);
  }

  // 3. Working-preference questions (only seed if the org has none yet).
  const existingQ = await prisma.prefQuestion.count({ where: { orgId: org.id } });
  if (existingQ === 0) {
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
    console.log(`Seeded ${RISE8_QUESTIONS.length} working-preference questions`);
  } else {
    console.log(`Org already has ${existingQ} preference questions, leaving them alone`);
  }

  // 4. Admin user (find or create). Never overwrite an existing password.
  const email = ADMIN_EMAIL.toLowerCase();
  let admin = await prisma.user.findUnique({ where: { email } });
  let tempPassword: string | null = null;

  if (!admin) {
    tempPassword = randomBytes(9).toString("base64url"); // ~12 chars, one-time
    admin = await prisma.user.create({
      data: {
        orgId: org.id,
        email,
        name: ADMIN_NAME,
        role: "ADMIN",
        passwordHash: await bcrypt.hash(tempPassword, 10),
        mustReset: true,
      },
    });
    console.log(`Created ADMIN user ${email} (${admin.id})`);
  } else {
    // Make sure an existing account is an admin in the Rise8 org.
    if (admin.orgId !== org.id || admin.role !== "ADMIN") {
      admin = await prisma.user.update({
        where: { id: admin.id },
        data: { orgId: org.id, role: "ADMIN" },
      });
      console.log(`Updated ${email} to ADMIN in Rise8 (password left unchanged)`);
    } else {
      console.log(`Admin ${email} already set up (password left unchanged)`);
    }
  }

  // 5. Team membership (idempotent).
  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: admin.id } },
    create: { teamId: team.id, userId: admin.id },
    update: {},
  });

  console.log("\n=== Rise8 provisioning complete ===");
  console.log(`Org:   ${ORG_NAME} (${org.id})`);
  console.log(`Team:  ${TEAM_NAME}`);
  console.log(`Admin: ${email} (role ADMIN)`);
  if (tempPassword) {
    console.log(`\nONE-TIME TEMPORARY PASSWORD for ${email}:`);
    console.log(`\n    ${tempPassword}\n`);
    console.log("Joe: sign in with this, you will be forced to set your own password immediately.");
  } else {
    console.log("\nNo new password generated (account already existed).");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
