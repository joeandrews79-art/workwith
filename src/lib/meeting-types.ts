/**
 * Meeting types (Phase 2 item 2). A meeting's type shapes two things: the
 * "goal shape" (what a good outcome is) and how the working-style prep is
 * framed. The lens pointers below are appended, deterministically, to the
 * generated brief so a customer call reads differently from a retro.
 *
 * Pure data + copy, no scoring. Shared by server and client.
 */

export type MeetingTypeCode =
  | "internal_team"
  | "leadership"
  | "one_on_one"
  | "sales_customer"
  | "all_hands"
  | "retro";

export type GoalShape = "decide" | "align" | "explore" | "sell" | "develop" | "reflect";

export interface MeetingType {
  code: MeetingTypeCode;
  label: string;
  description: string; // one line, shown under the label in the picker
  goalShape: GoalShape;
  goalPlaceholder: string; // example goal text for the create form
  /** How the working-style prep is framed for this type. */
  framing: string;
  /** Type-specific pointers appended to the brief (deterministic). */
  lens: string[];
}

export const MEETING_TYPES: MeetingType[] = [
  {
    code: "internal_team",
    label: "Internal team sync",
    description: "A working session with your own team.",
    goalShape: "align",
    goalPlaceholder: "e.g. Align on this sprint's priorities and unblock two things",
    framing: "Keep it moving and make sure decisions and owners are clear before you leave.",
    lens: [
      "Open with the one outcome you need, so the sync doesn't drift into status updates.",
      "Close by reading back decisions and owners; in a familiar room those get assumed, not confirmed.",
    ],
  },
  {
    code: "leadership",
    label: "Leadership / strategy",
    description: "A decision-heavy session with peers or leaders.",
    goalShape: "decide",
    goalPlaceholder: "e.g. Decide whether to pull in the launch date, and what we cut if we do",
    framing: "This is about decisions and honest dissent. Surface disagreement rather than smoothing it.",
    lens: [
      "Name the actual decision and who owns the call up front; leadership rooms burn time circling it.",
      "Invite the dissent explicitly. If the room agrees too fast, ask who sees it differently before you commit.",
    ],
  },
  {
    code: "one_on_one",
    label: "1:1",
    description: "A one-on-one for feedback and development.",
    goalShape: "develop",
    goalPlaceholder: "e.g. Give Marcus feedback on the review he ran, and hear what he needs from me",
    framing: "This is their time. Lead with development and feedback, and listen more than you talk.",
    lens: [
      "Make it theirs first: start with how they're doing before your agenda.",
      "Match feedback to how they take it. Be specific, and if the topic is hard, say it plainly rather than burying it.",
      "End with one concrete thing each of you will do before the next 1:1.",
    ],
  },
  {
    code: "sales_customer",
    label: "Customer / sales call",
    description: "An external call with a customer or prospect.",
    goalShape: "sell",
    goalPlaceholder: "e.g. Understand their real problem and agree a next step",
    framing: "Read the room and listen. You have less profile data on them, so watch and adapt live.",
    lens: [
      "Listen first. Spend the early minutes understanding their problem before you pitch a solution.",
      "You likely don't have their working-style profile, so read cues live: match their pace, energy, and directness.",
      "Leave with a concrete, mutually-agreed next step, not just a good conversation.",
    ],
  },
  {
    code: "all_hands",
    label: "All-hands / broadcast",
    description: "A larger, mostly one-to-many session.",
    goalShape: "align",
    goalPlaceholder: "e.g. Get everyone aligned on the quarter's focus and why",
    framing: "This is broadcast more than discussion. Clarity and a single message matter most.",
    lens: [
      "Lead with the headline and the why; a big room remembers one message, not ten.",
      "Plan how quieter people ask questions (written / async), so it isn't only the loudest voices.",
    ],
  },
  {
    code: "retro",
    label: "Retro / review",
    description: "Looking back to learn and improve.",
    goalShape: "reflect",
    goalPlaceholder: "e.g. Pull two concrete improvements out of last sprint",
    framing: "Make it safe to be honest, then convert honesty into a couple of concrete changes.",
    lens: [
      "Set a blameless tone up front, or people will trade candor for comfort.",
      "Give steadier and more reserved folks a way in (round-robin or written notes) before open discussion.",
      "Leave with a small number of owned changes, not a long wish list.",
    ],
  },
];

const BY_CODE: Record<string, MeetingType> = Object.fromEntries(
  MEETING_TYPES.map((t) => [t.code, t]),
);

export function meetingType(code: string): MeetingType {
  return BY_CODE[code] ?? MEETING_TYPES[0];
}
