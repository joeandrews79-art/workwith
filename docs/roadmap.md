# Roadmap & upgrade paths

What's built, and what's deliberately staged next. Ordered by how much
foundation each item needs.

## ⭐ NEXT SESSION (before Phase 3): calendar import + calendar view (owner, 2026-07-27)

**Constraint / why:** for **CUI (Controlled Unclassified Information)** security
reasons we **cannot** connect WorkWith directly to a work calendar (no Google /
Microsoft OAuth or API sync). So we need a fast manual way to get planned
meetings INTO the Meetings tab, plus a calendar-style view to run them.

**1. Image upload → analyze → create the meeting.**
- Add an "upload a meeting" option: drop in a screenshot / photo of a calendar
  event or invite; **Claude (vision)** reads it and extracts the details (title,
  date, start time, duration or end, attendees it can match to the team roster,
  best-guess meeting type), then pre-fills / creates the Meeting for review.
- Reuses the existing Meeting object + `MeetingComposer`; the new piece is a
  vision call (Anthropic SDK supports image input) returning the same shape as
  "Structure this" (see `lib/structure.ts` for the pattern).
- ⚠️ **PRIVACY / COMPLIANCE FLAG:** the premise is CUI, yet uploading a calendar
  image sends that content to Anthropic. Only OK if the meeting metadata itself
  (title / time / attendees) is **not** CUI. Confirm with owner before building;
  always keep a plain manual-entry path; add clear consent copy; never send
  anything that could be CUI to the API.

**2. Meetings tab as a day / week calendar view.**
- Turn (or toggle) the Meetings list into a **daily / weekly calendar grid** with
  meetings laid out on a timeline by their scheduled time.
- **Cancel** from the grid, and **move / reschedule** by dragging or editing the
  time.
- **SCHEMA NOTE:** `Meeting.scheduledFor` is currently a date-only `DateTime`. A
  timeline needs a real **start time + duration** (add `startAt` / `durationMin`
  or a start/end pair). Do this first.

**Open questions to settle when we build:** calendar view replaces the list or
toggles with it? day + week (+ month?) views? drag-to-move vs edit-a-time-field
first? which fields the image analysis returns and how it matches attendees to
the roster? plus the CUI confirmation above.

## Shipped (local prototype)

- Big Five assessment (IPIP-NEO-120), autosave/resume, mobile-friendly.
- Deterministic profile: summary, *How to work with me*, *Coaching for you*,
  30-facet breakdown; user-editable wording.
- Team directory, teams, completion dashboard, 12-month refresh flag.
- Compare (biggest differences + 1:1 talking points).
- Meeting prep (group dynamic + advice tuned to you).
- Discussion mode (team-session talking points).
- Auth, admin invites, add/remove admins, member↔admin view switch.
- Theme picker (4 palettes). Privacy: share toggle, export, delete.

## Near-term follow-ups (small)

- **Enforce `mustReset`.** Invited users get `mustReset = true`, but the app does
  not yet force a password change on first login. Add a set-password gate. (The
  flag and field already exist.)
- **Dark mode.** The theme system is variable-driven; a proper dark theme needs a
  pass over the components that still use fixed light grays / white inline
  backgrounds so contrast holds. Deferred so we don't ship a half-dark UI.
- **Team-scoped views.** Teams exist in the data model; the dashboard/compare
  currently span the whole org. Add a team filter.

## Political-items decision (needs your call)

The Openness *Liberalism* facet in the IPIP-NEO-120 includes overtly political
items ("Tend to vote for liberal/conservative political candidates", "Believe we
should be tough on crime"). For a workplace tool these can feel invasive. The
tool already keeps the *narrative* apolitical, but the four items are still asked.
Options:
1. Keep all 120 for instrument fidelity (current).
2. Drop the Liberalism facet (scores 5 facets under Openness instead of 6).
3. Substitute 4 alternative public-domain Openness items (changes the exact
   standardized inventory).

## Phase 2 — Meeting-transcript analysis & adaptive profiles (needs a decision)

The requested upgrade: ingest meeting transcripts, learn each person's real
communication patterns, and give suggestions both to teammates (how to
communicate with this person) and to the person themselves (how to improve their
own style).

**Why it is staged, not silently switched on:** transcript analysis needs a
language model. Sending transcript text (and by extension what people said, and
about whom) to an AI provider **crosses the "no third-party data" line** the tool
holds today. That is a genuine privacy and trust decision for the team to make
explicitly, not a default.

**How it is architected to slot in cleanly:**

- A `CommsInsightProvider` seam (to be added) sits alongside the deterministic
  engine. The Big Five profile stays the base layer; transcript-derived signals
  become an *overlay* that adjusts the "how to communicate" guidance.
- Options when you decide to turn it on:
  - **Self-hosted / on-device model** to keep data in-house (most private).
  - **A vetted AI provider under a data-processing agreement**, with transcripts
    redacted and never used for training.
- Consent: every participant opts in before their transcripts are analyzed; opt
  out at any time; delete removes derived signals too.

Until that decision, meeting prep and all profiles run purely on the
self-report Big Five, fully local.

## Phase 3 — Production hosting

See the README "From local prototype to a hosted app with logins": Supabase
Postgres + Supabase Auth + Netlify/Vercel + Postgres RLS. The data and auth seams
are already isolated for this.
