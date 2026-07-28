import type { RelationalGuide } from "@/lib/team";

/** Block Kit message builders. Kept small and text-first so messages read well
 *  in a DM. All content here is derived working-style guidance (never raw
 *  answers), and only ever about shared profiles. */

type Block = Record<string, unknown>;

export function appBaseUrl(): string {
  return process.env.APP_URL || "https://workwith8.netlify.app";
}

function section(text: string): Block {
  return { type: "section", text: { type: "mrkdwn", text } };
}
function context(text: string): Block {
  return { type: "context", elements: [{ type: "mrkdwn", text }] };
}
function linkButton(text: string, url: string): Block {
  return {
    type: "actions",
    elements: [{ type: "button", text: { type: "plain_text", text }, url }],
  };
}

/** `/workwith @teammate` → the relational guide, private to the caller. */
export function relationalGuideBlocks(guide: RelationalGuide): Block[] {
  const blocks: Block[] = [
    { type: "header", text: { type: "plain_text", text: `Working with ${guide.otherName}` } },
    section(`*${guide.headline}*\n${guide.read}`),
  ];
  if (guide.moves.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push(section("*Try these*"));
    for (const m of guide.moves) {
      blocks.push(section(`• *${m.trait}.* ${m.text}`));
    }
  }
  blocks.push(context("Built from their shared profile. Private to you."));
  blocks.push(linkButton("Open in WorkWith", `${appBaseUrl()}/coach`));
  return blocks;
}

/** `/workwith me` → your one-liner and where you sit on the five traits. */
export function profileSummaryBlocks(opts: {
  name: string;
  oneLiner: string | null;
  traits: { label: string; score: number; poleLow: string; poleHigh: string }[];
}): Block[] {
  const blocks: Block[] = [
    { type: "header", text: { type: "plain_text", text: "Your working style" } },
  ];
  if (opts.oneLiner) blocks.push(section(opts.oneLiner));
  if (opts.traits.length > 0) {
    blocks.push({
      type: "section",
      fields: opts.traits.map((t) => ({
        type: "mrkdwn",
        text: `*${t.label}* · ${Math.round(t.score)}\n${t.poleLow} → ${t.poleHigh}`,
      })),
    });
  }
  blocks.push(context("Your own profile. Private to you."));
  blocks.push(linkButton("Open my profile", `${appBaseUrl()}/me`));
  return blocks;
}

/** Pre-meeting DM: how to work with each other attendee, plus a link to prep. */
export function preMeetingBlocks(opts: {
  title: string;
  whenLabel: string; // e.g. "Today at 1:00 PM · Leadership Team"
  meetingId: string;
  perAttendee: { name: string; topMove: string | null; similar: boolean }[];
}): Block[] {
  const blocks: Block[] = [
    { type: "header", text: { type: "plain_text", text: `Prep: ${opts.title}` } },
    context(opts.whenLabel),
  ];
  const withReads = opts.perAttendee.filter((a) => a.topMove || a.similar);
  if (withReads.length > 0) {
    blocks.push(section("*Working with who's in the room*"));
    for (const a of withReads) {
      if (a.topMove) blocks.push(section(`*${a.name}.* ${a.topMove}`));
      else blocks.push(section(`*${a.name}.* You two work in similar ways, so friction is unlikely to come from style.`));
    }
  } else {
    blocks.push(section("Once the other attendees share their profiles, you'll get a read on how to work with each of them here."));
  }
  blocks.push(context("Working-style reads on shared profiles. Private to you."));
  blocks.push(linkButton("Open full prep", `${appBaseUrl()}/meeting/${opts.meetingId}`));
  return blocks;
}
