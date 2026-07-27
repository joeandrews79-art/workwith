# WorkWith

An internal tool that maps how each member of a team works, so friction is
understood rather than guessed at. Everyone completes a short behavioral
profile, shares it, and the team can compare styles, prep for meetings, and
refresh annually.

> WorkWith is a **self-report reflection tool** built on the public-domain Big
> Five. It is **not** a clinical, diagnostic, or hiring assessment.

---

## Behavioral framework

WorkWith uses the **Big Five** model, measured with the **IPIP-NEO-120**, a
120-item public-domain inventory (30 facets, six per trait).

- **Source:** International Personality Item Pool, <https://ipip.ori.org/> (public domain).
- **Inventory:** Johnson, J. A. (2014). *Measuring thirty facets of the Five
  Factor Model with a 120-item public domain inventory: Development of the
  IPIP-NEO-120.* Journal of Research in Personality, 51, 78-89.
- Item text and keying live in `data/ipip-neo-120.json` (also `src/lib/ipip-neo-120.json`).

The five traits are shown in plain, friendly language rather than clinical terms:

| Trait (scientific) | Shown as | Higher means |
| --- | --- | --- |
| Extraversion | Social energy | Outgoing, expressive |
| Agreeableness | Collaboration style | Warm, accommodating |
| Conscientiousness | Structure & drive | Structured, driven |
| Neuroticism *(inverted)* | Emotional steadiness | Calm, steady under pressure |
| Openness | Openness to change | Curious, inventive |

**We deliberately do not reproduce any proprietary instrument** (DISC, Insights
Discovery, CliftonStrengths, PrinciplesYou, 16 Types, Enneagram): no borrowed
items, archetype names, or report wording. All narrative copy is original.

See [`docs/scoring.md`](docs/scoring.md) for the exact item-to-trait mapping and
how the narrative is generated.

---

## Features

- **Assessment** — 120 IPIP items, mobile-friendly, autosaves, resumable, ~10-15 min.
- **Profile** — an auto-generated, readable "how I work" summary plus a
  *How to work with me* section (communication, decisions, feedback, priorities,
  frustrations), a private *Coaching for you* section, and a 30-facet breakdown.
  You can lightly edit the wording before sharing.
- **Team directory** — everyone grouped by team, with completion status; open any
  shared profile.
- **Meeting prep** — add the people in an upcoming meeting to read the group's
  communication dynamic and get advice tuned to *your* profile and the mix.
- **Compare** — pick two people, see the biggest differences and 1:1 talking points.
- **Completion dashboard** — % completed and % shared toward 100%, each person's
  last-refreshed date, and an automatic flag when a profile is older than 12 months.
- **Discussion mode** — team-session talking points from the spread of profiles.
- **Teams & roles** — assign people to teams; admins invite members, promote or
  demote admins, and switch between the member and admin views without logging out.
- **Privacy controls** — per-person share toggle, JSON export, and hard delete.

---

## Run it locally

Prerequisites: Node 18+ (built on Node 24).

```bash
cd workwith
cp .env.example .env      # then set SESSION_SECRET (see the file)
npm run setup             # installs deps, creates the SQLite DB, seeds demo data
npm run dev               # http://localhost:3000
```

`npm run setup` is a one-time convenience for `npm install && prisma db push &&
npm run seed`. After that, just `npm run dev`.

### Demo logins (from the seed)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `joeandrews79@gmail.com` | `workwith-admin` |
| Member | any `@workwith.demo` email (e.g. `maya@workwith.demo`) | `workwith-demo` |

The seed creates an 8-person "Leadership Team" showing every state: shared
profiles, a private one (Dana), a stale one that trips the refresh flag (Tom),
an in-progress one (Alex), and an admin who hasn't started (Joe).

Reset demo data anytime with `npm run db:reset`.

---

## Tech

- **Next.js (App Router) + TypeScript + Tailwind v4**
- **Prisma + SQLite** locally (see below for the Postgres/Supabase swap)
- **Auth:** email + password (bcrypt) with a signed httpOnly session cookie (`jose`)
- **Scoring & narrative:** fully deterministic and local. No profile data is ever
  sent to a third party.

Key files:

```
src/lib/ipip.ts        IPIP items + trait/facet metadata
src/lib/scoring.ts     reverse-keying and domain/facet scoring
src/lib/narrative.ts   deterministic "how I work" + self-coaching generator
src/lib/team.ts        relative-within-team bands, compare, discussion
src/lib/meeting.ts     meeting-prep brief
src/lib/auth.ts        auth (the documented production seam)
prisma/schema.prisma   data model
prisma/seed.ts         demo team
```

---

## From local prototype to a hosted app with logins

The app is built to move to production without a rewrite. See
[`docs/roadmap.md`](docs/roadmap.md) for the full path. In short:

1. **Database → Supabase Postgres.** Change `datasource.provider` in
   `prisma/schema.prisma` from `sqlite` to `postgresql`, set `DATABASE_URL` to
   your Supabase connection string, and run `prisma db push`. The String-typed
   JSON columns and String enums port cleanly (optionally promote them to Postgres
   `Json`/`enum`).
2. **Auth → Supabase Auth.** The entire auth surface is isolated in
   `src/lib/auth.ts`. Swap `verifyCredentials` / `createSession` /
   `getSessionUserId` for Supabase Auth; the rest of the app only depends on
   `getCurrentUser` / `requireUser`.
3. **Hosting → Netlify/Vercel.** Connect the repo for deploy-on-push. Set
   `DATABASE_URL` and `SESSION_SECRET` (and later Supabase keys) as environment
   variables. Never commit secrets.
4. **Row-level security.** Add Postgres RLS policies so data access is enforced at
   the database, not just the app layer.

---

## Privacy

- Personal data stays in this app; nothing is sent to a third-party service.
- Each person controls whether their profile is shared.
- Everyone can export (`/api/export`) or permanently delete their own data.
- Narratives are generated locally and deterministically, by design.
