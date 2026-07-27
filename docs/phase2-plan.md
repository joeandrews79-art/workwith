# WorkWith — Phase 2 plan (meetings, thought capture, multi-team)

Status: planning. Captured 2026-07-27 from Joe's asks. Nothing here is built yet.

Phase 1 (live) turns a person's working style into a shareable profile, a team
view, a meeting-prep read, and a personal Coach. Phase 2 turns WorkWith from a
"know your team" tool into a "run better meetings with your team" tool.

The unifying idea: a **Meeting** becomes a real object in the app. A meeting has
a **type**, a **team**, **attendees**, an **agenda**, and the **working-style
prep** we already generate. **Thought capture** is how meetings get started, and
the **agenda helper** is how they get made productive.

---

## 1. Multiple teams per user (foundation — build first)

> **STATUS: BUILT 2026-07-27** (branch `feat/multi-team-roles`, verified in an
> isolated preview against the demo org). Scope grew during the session: Joe
> asked for **role-differentiated dashboards**, so the foundation now includes a
> **per-team role** (`TeamMember.role` = LEADER | MEMBER) — a person can lead one
> team and be a plain member of another.
> - Active-team **switcher** in the sidebar (cookie-remembered, always
>   re-validated against real memberships).
> - Dashboard, Team directory, Compare, Discussion, Meeting prep all scope to the
>   active team.
> - **Role-aware dashboard:** org admins + team leaders see full oversight
>   (per-person completion status, refresh-due nudges, "Manage team"); plain
>   members see roster + team completion/shared % and can open *shared* profiles
>   only. Private profile content stays share-gated regardless of role.
> - **Team management:** org admins at `/admin/teams` (create/rename/delete, move
>   people, set leaders); team leaders at `/teams/manage` (their team only, no
>   delete). Invite flow picks the team(s) a person joins.
> - Not yet deployed to prod — awaiting Joe's go-ahead to merge to `main`.

**Why:** A person is on more than one team (e.g., a leadership team AND their own
people-ops team), and those meetings are not the same. Everything else in Phase 2
(meeting types, prep, agendas) should be scoped to the right team.

**Good news:** the data model already supports this. `User` ↔ `TeamMember` ↔
`Team` is already many-to-many. What is missing is the UX and the scoping. Today
most views are scoped to the whole **org**, and invites just dump people into the
admin's team(s).

**Work:**
- An **active-team switcher** in the sidebar (remembers your last team).
- Scope Dashboard, Team directory, Compare, and Discussion to the **active team**
  instead of the whole org.
- **Team management** for admins: create/rename teams, add/remove members per
  team, and (new) a per-team admin/owner so a team lead manages their own team.
- Invites and "add member" let you pick which team(s) the person joins.
- Meeting prep and the future Meeting object are always tied to a team.

**Touch points:** `team-data.ts` (already has `getTeamsOverview`), `AppShell`
(switcher), invite flow in `actions.ts`, dashboard/directory/compare/meeting pages.

**Note:** this is the largest structural change. Do it first so meeting types,
thought capture, and agendas all hang off the right team from day one.

---

## 2. Meeting types

**Why:** advice and agendas for an internal team sync, a leadership strategy
session, and a customer/sales call should be shaped very differently.

**Types to start with:** `internal_team`, `leadership`, `one_on_one`,
`sales_customer` (external/customer-facing), `all_hands`, `retro`. Extensible.

Each type carries a small config: its **goal shape** (decide vs align vs explore
vs sell vs develop), a default **agenda template**, and how the **working-style
prep** is framed (e.g., a customer call emphasizes reading the room and listening;
a leadership session emphasizes decisions and dissent; a 1:1 emphasizes feedback
and development).

**Work:** add a `MeetingType` config (code + copy + template), a type picker in
meeting prep, and pass the type into the prep + agenda AI prompts.

---

## 3. Thought capture

**Why (Joe's example):** "I'm prepping for a meeting and I just had a thought, I
need to discuss this, can you help me structure the meeting." Thoughts are
fleeting. Capture them in one tap, then turn them into structured meetings.

**Flow:**
- A global **quick-capture** (a "+ Capture" button in the sidebar / a mobile FAB):
  jot a thought (one line + optional detail). Optionally tag a team, a meeting
  type, or people it involves.
- A **Thoughts inbox** page: your captured thoughts, each with a "Structure this"
  action.
- **Structure this** hands the thought to Claude, which proposes a meeting brief:
  the real goal, who should be in the room (suggested from the team, working-style
  aware), a draft agenda, key talking points, and the desired outcome. That draft
  becomes a **Meeting** you can edit.

**Data:** new `Thought { userId, text, detail?, teamId?, meetingType?, status:
captured|planned|archived, createdAt }`, optionally linked to a `Meeting`.

**Privacy:** thoughts are personal by default (only you see them). If a thought
becomes a shared meeting, only then does it surface to attendees. Be explicit
about this, same posture as the Coach (your data stays yours until you share it).

---

## 4. Agenda add / helper

**Why:** meetings without agendas are a common productivity killer. Make the good
path the easy path.

**Flow:**
- Every Meeting has an **agenda**: ordered items, each with a topic, a purpose
  (decision / discussion / information / brainstorm), an optional time-box, and an
  owner.
- **Add/edit/reorder** items by hand (drag and drop).
- **"Build me an agenda"**: Claude drafts an agenda from the meeting's goal, type,
  and attendees' working styles. Working-style aware, e.g. add an async pre-read
  for people who prefer async, time-box tightly for high-structure folks, and put
  explicit decision points in leadership meetings.
- **"Tighten this agenda"**: Claude trims and sharpens an existing agenda.
- Agenda is shareable/exportable (send to attendees before the meeting).

**Data:** `Meeting { id, teamId, type, title, goal, createdBy, scheduledFor? }`
with `AgendaItem[] { meetingId, order, topic, purpose, minutes?, ownerId? }`.

---

## 5. ⚠️ REMINDER — customize the Coach and the feedback model

**Joe asked to make sure this is addressed in Phase 2.**

Today the Coach and the admin question assistant use a **hardcoded Rise8**
`ORG_CONTEXT` in `src/lib/ai.ts` (values, voice, "blunt reads as respect," no
em dashes). For WorkWith to fit any org, and to tune coaching to how a team
actually gives feedback, this needs to become **configurable**:

- **Org-level:** admins edit their org's context (values, voice, norms, how direct
  feedback should read). This is also the unlock for multi-tenant / selling
  WorkWith beyond Rise8.
- **Feedback model:** the profile's "how I like to receive feedback" framing and
  any future peer-feedback feature should respect an org/team feedback-culture
  setting (blunt vs gentle, in the moment vs written), not a Rise8 hardcode.
- **Per-user Coach preferences:** let a person tune their coaching (how direct they
  want it, what to focus on: e.g. delegation, async, conflict).

Track this alongside the Phase 2 work, since meeting prep and agenda AI will also
read from the same org context and should be tunable in one place.

---

## Suggested build order

1. **Multiple teams** (foundation: switcher + team-scoped views + team admin).
2. **Meeting object + meeting types** (persist prep as a saved Meeting).
3. **Thought capture** (quick capture → "structure this" → Meeting draft).
4. **Agenda helper** (manual + AI, working-style aware, shareable).
5. **Configurable Coach + feedback model** (org context editor, per-user coach
   prefs) — also the multi-tenant unlock.

## Cross-cutting
- **Permissions:** team admins/owners vs org admins; who can see whose thoughts and
  meetings.
- **Privacy:** thoughts and coaching stay personal until shared; agendas/meetings
  are team-visible once created. Keep the "your data stays yours" posture.
- **AI cost/latency:** more Claude calls (structure-a-thought, build-an-agenda).
  Cache generated artifacts on the record, generate on explicit user action.
