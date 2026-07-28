/**
 * The WorkWith user guide, as structured data. Rendered on /guide and also fed
 * to the in-app help assistant (lib/help.ts) as grounding, so both stay in sync.
 * Sections flagged adminOnly are hidden from non-admins.
 */

export interface GuideSection {
  id: string;
  title: string;
  adminOnly?: boolean;
  intro: string;
  steps?: string[];
  tips?: string[];
}

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "getting-started",
    title: "Getting started",
    intro:
      "WorkWith helps your team understand how each of you works best, so friction is understood instead of guessed at. It is built on the public-domain Big Five, not a hiring or clinical test.",
    steps: [
      "Sign in with the email and temporary password your admin shared.",
      "On your first login you are asked to set your own password. Pick something only you know.",
      "A short welcome walks you through the basics. You can follow it or skip it.",
      "Your first real step is taking the assessment, which is what creates your profile.",
    ],
  },
  {
    id: "assessment",
    title: "Taking your assessment",
    intro:
      "The assessment is 120 short statements about how you generally work. It takes about 10 to 15 minutes and creates your working-style profile.",
    steps: [
      "Open 'My profile' and choose to start the assessment, or use the assessment link.",
      "For each statement, pick how accurately it describes you, from Very inaccurate to Very accurate. You can also press keys 1 to 5.",
      "Answer honestly about how you generally are, not how you would like to be.",
      "Your progress saves automatically. The top right shows 'Progress saved' as you go, and your answers are also backed up in your browser, so a refresh will not lose them.",
      "When all 120 are answered, choose Finish to generate your profile. You land on your profile, where you can review the wording.",
    ],
    tips: [
      "You can leave and come back. It resumes where you left off.",
      "Once a year the app flags your profile as due for a refresh so it stays accurate. Retaking replaces your old answers.",
    ],
  },
  {
    id: "profile",
    title: "Your profile",
    intro:
      "Your profile turns your answers into a plain-language read of how you work: a summary, a 'how to work with me' section, your five Big Five traits, and 30 detailed facets.",
    steps: [
      "Open 'My profile' from the sidebar.",
      "Read your summary and the 'how to work with me' sections. Use 'Personalize wording' to lightly edit any phrasing that does not sound like you.",
      "Use the share toggle at the top to share your profile with your team. This is the switch that lets teammates see it and that feeds the Team map, Compare, and meeting reads.",
      "Use 'PDF report' to save a clean, printable copy. It uses your browser's print-to-PDF, so nothing leaves the app.",
      "Use 'What your scores mean' to get a plain-language explanation of each of your traits.",
    ],
    tips: [
      "If a profile is not shared, it stays private to you. Teammates see your name but not your read.",
    ],
  },
  {
    id: "coach",
    title: "Coach",
    intro:
      "Coach turns your own profile into concrete coaching: strengths to lean into, growth edges with weekly experiments, and answers to specific situations you are facing.",
    steps: [
      "Open 'Coach' from the sidebar.",
      "Generate your coaching plan to see strengths and growth edges tuned to your scores.",
      "Use the 'Ask your coach' box to describe a real situation and get advice grounded in how you work.",
    ],
    tips: ["Coach only ever uses your own profile. It never sends anyone else's data."],
  },
  {
    id: "team-map",
    title: "Team map",
    intro:
      "The Team map shows where everyone on your team lands across the Big Five, and where you sit in the mix.",
    steps: [
      "Open 'Team map' from the sidebar.",
      "In 'Trait spectrum', each trait is a line from one style to the other. Every teammate is a dot, you are highlighted, the team average is marked, and the shaded band shows the team's spread. Hover a dot to see who it is.",
      "Switch to 'Two-trait map' to plot any two traits against each other.",
      "Read 'Where you sit' to see the traits where you stand apart from the team.",
      "Use 'Your team read' for an AI summary of how you fit the team and how to work with that. It uses your scores and the team's averages only, and never names a teammate.",
    ],
    tips: ["Only teammates who have completed and shared their profile appear here."],
  },
  {
    id: "compare",
    title: "Compare",
    intro:
      "Compare shows where any group of people differ most, with talking points for a 1:1 or a group.",
    steps: [
      "Open 'Compare' from the sidebar.",
      "Pick two or more people. Everyone you pick is plotted together on the five traits, color-coded.",
      "With exactly two people, you get the biggest differences and talking points for a 1:1.",
      "With three or more, you get the traits where the group differs most.",
    ],
  },
  {
    id: "meetings",
    title: "Meetings and the calendar",
    intro:
      "The Meetings tab is a calendar of every meeting you are in, across all your teams. Plan a meeting to get working-style prep tuned to the room.",
    steps: [
      "Open 'Meetings' to see your Month, Week, or Day calendar. Undated meetings sit in an 'Unscheduled' tray.",
      "Choose 'New meeting'. Pick a meeting type, add a title, an optional goal, and a date, start time, and length.",
      "Add attendees. Anyone in your company with a shared profile can be added, not just your own team.",
      "Save. Click any meeting on the calendar to open it, reschedule it, or cancel it.",
    ],
    tips: [
      "Every attendee sees the meeting on their own calendar automatically.",
      "Today's meetings also appear at the top of your Dashboard so you can prep.",
    ],
  },
  {
    id: "meeting-prep",
    title: "Meeting prep and the read on the room",
    intro:
      "Open any meeting to see prep built from the attendees' profiles: a per-person read, the room's dynamic, and how you specifically should show up.",
    steps: [
      "Open a meeting from the calendar.",
      "'Each person' shows every attendee's standout trait and a tip for working with them.",
      "'The room' describes the group's overall tilt and where people split.",
      "'How to show up' is tuned to your own profile and the mix of people.",
      "The meeting's creator can add an agenda, by hand or with the 'Build with AI' helper.",
    ],
    tips: [
      "Only attendees who have shared their profile feed the read. Others still appear in the roster.",
      "Only the person who created the meeting can edit its agenda.",
    ],
  },
  {
    id: "screenshot-import",
    title: "Add a meeting from a screenshot",
    intro:
      "On 'Plan a meeting' you can drop in a screenshot of a calendar invite and let Claude read the details to pre-fill the form.",
    steps: [
      "Open 'New meeting'.",
      "In 'Start from a screenshot', drag an image onto the box or click to upload a PNG or JPG of a calendar event.",
      "Claude reads the title, date, time, and attendees and fills in the form. Review everything, then save.",
    ],
    tips: [
      "The image is sent to Claude to read it. Do not upload anything sensitive or restricted.",
      "Nothing is saved automatically. You always review before saving.",
    ],
  },
  {
    id: "thoughts",
    title: "Thoughts and brainstorming meetings",
    intro:
      "Thoughts is your private space to capture fleeting ideas and turn them into meetings. It also includes an AI brainstorm to help you figure out which meetings to run.",
    steps: [
      "Use '+ Capture a thought' in the sidebar to jot a one-line idea any time.",
      "In 'Brainstorm meetings', describe what you are trying to move forward. Claude suggests a few concrete meeting ideas.",
      "For any idea, choose 'Capture as thought' to save it to your inbox, or 'Create meeting' to jump into a pre-filled meeting.",
      "For a captured thought, use 'Structure this' to have Claude draft a full meeting from it.",
    ],
    tips: ["Thoughts are private to you until you turn one into a meeting."],
  },
  {
    id: "dashboard",
    title: "Your dashboard",
    intro:
      "The Dashboard is your home base: your profile status, today's meetings, and how far along your team is.",
    steps: [
      "Today's meetings are listed near the top with a link into each one to prep.",
      "The cards show how much of your team has completed and shared their profile.",
      "If your own profile is due for its yearly refresh, you are prompted here.",
    ],
  },
  {
    id: "directory",
    title: "The team directory",
    intro: "The Team page lists everyone on your team and lets you open anyone who has shared their profile.",
    steps: [
      "Open 'Team' from the sidebar.",
      "Click anyone with a shared profile to see how they like to work.",
      "Use 'Compare people' to jump into a side-by-side comparison.",
    ],
  },
  {
    id: "account",
    title: "Your account and themes",
    intro: "Manage your login and the look of the app from the account menu.",
    steps: [
      "Open the account menu at the bottom of the sidebar.",
      "Change your password there whenever you like.",
      "Pick a theme, including a light 'Daylight' option and several dark ones.",
      "If you have more than one team, use the team switcher near the top of the sidebar to change which team you are viewing.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and your data",
    intro:
      "Your raw answers stay in the app. The AI features you choose to run send only your own scores, never anyone else's.",
    steps: [
      "Sharing is opt-in. Your profile is private until you turn the share toggle on.",
      "Coach and 'What your scores mean' send only your own scores to Claude.",
      "The Team read sends your scores plus the team's averages only. No teammate is named.",
      "Brainstorm, agenda building, and screenshot reading send text or an image you provide, never anyone's psychometric profile.",
    ],
  },
  {
    id: "admin-invite",
    title: "Adding people (admin)",
    adminOnly: true,
    intro: "Admins add teammates from the Admin section. Each person gets a temporary password and sets their own on first login.",
    steps: [
      "Open 'Admin' from the sidebar.",
      "In the invite form, enter the person's name and work email, an optional title, a temporary password you make up (at least 8 characters), their role (Member or Admin), and which team they join.",
      "Save, then share that temporary password with them securely.",
      "They sign in, set their own password, take the assessment, and share their profile to appear across the app.",
    ],
    tips: ["A Member can view and take part; an Admin can also invite people and manage teams and settings."],
  },
  {
    id: "admin-teams",
    title: "Managing teams (admin)",
    adminOnly: true,
    intro: "Admins create and organize teams under Admin, then Teams.",
    steps: [
      "Open 'Admin', then 'Teams'.",
      "Create a team, rename it, or delete one.",
      "Move people between teams, and set a team's leader.",
      "A person can lead one team and be a plain member of another.",
    ],
  },
  {
    id: "admin-questions",
    title: "Working-preference questions (admin)",
    adminOnly: true,
    intro:
      "Alongside the fixed Big Five, admins can manage a set of short 'working preferences' questions (channels, feedback style, and so on) that show on each profile.",
    steps: [
      "Open 'Admin', then the questions editor.",
      "Add, edit, or remove questions. Claude can help you word them to fit how your team works.",
      "These answers are shown on profiles as-is and are not psychometrically scored.",
    ],
  },
];

/** Plain-text version of the guide for the help assistant's grounding. */
export function guideText(includeAdmin: boolean): string {
  return GUIDE_SECTIONS.filter((s) => includeAdmin || !s.adminOnly)
    .map((s) => {
      const steps = s.steps?.map((t, i) => `${i + 1}. ${t}`).join("\n") ?? "";
      const tips = s.tips?.map((t) => `- ${t}`).join("\n") ?? "";
      return `## ${s.title}\n${s.intro}\n${steps}${tips ? `\nTips:\n${tips}` : ""}`;
    })
    .join("\n\n");
}
