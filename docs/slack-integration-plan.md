# WorkWith + Slack — integration plan

_Drafted 2026-07-28. Research-backed (Cloverleaf, Crystal, Matter, Officevibe, Polly, Donut, Assembly, Bonusly, Leapsome, Culture Amp) plus a Slack API build review. Not started; this is the plan to review before any build._

## 1. Why Slack at all

Today WorkWith is a place you have to remember to visit. Every competitor that has made this category sticky did it by pushing the insight into the flow of work instead of waiting for a visit. Slack (and Teams and email) is that delivery layer. The content WorkWith already computes is exactly what belongs there: how to work with a specific teammate, a pre-meeting read on the room, a personal coaching nudge.

The strategic point: WorkWith does not need new insight to win here. It needs to deliver the insight it already has at the moment it is useful.

## 2. How the market uses Slack (what the research found)

### Cloverleaf (closest competitor)
- **Daily coaching DMs** from the app, cadence user-set (weekdays, or Mon and Thu) at a chosen time. Each nudge mixes tips about yourself and tips about the specific teammates you work with most. Per-tip actions: rate, save, share, reflect.
- **`/cloverleaf @teammate [topic]`** slash command returns that person's communication style, conflict triggers, and motivators instantly and privately, optionally narrowed to a topic.
- **Smart Prompts**: conversational coaching that, when it references a person, personalizes the answer from that person's profile.
- **Feedback requests** phrased to land well for the specific recipient.
- **Calendar / pre-meeting awareness**: reads your calendar and surfaces coaching about upcoming meetings and their attendees. (Confirmed as an email digest in their docs; Slack pre-meeting DM is marketed but not doc-confirmed. So it is a real gap we can win.)
- **Onboarding nudges** on a staggered schedule (1, 3, 5, 10, 30 days) prompting people to finish the assessment, set a focus, connect a calendar.
- **Install**: an org admin enables Slack for the org (this only grants permission), then each user connects individually. The user's Slack email must match their app email.

### The recurring patterns across all the tools, ranked
1. **Slash command opens a guided response or modal** — the universal "do a thing" primitive (Crystal, Matter, Polly, Assembly, Bonusly).
2. **Bot-delivered personalized DM** — the private channel for nudges, surveys, notifications (everyone).
3. **Act inline without leaving Slack** — answer the survey or take the action in the message itself.
4. **Scheduled / recurring automated prompt** — the app initiates on a cadence (Matter "Feedback Friday", Officevibe weekly pulse, Donut matches).
5. **Reminders / nudges** to boost completion.
6. **Channel post** for social visibility (recognition tools).
7. **Just-in-time coaching keyed to a person** — surface an insight about `@someone` right when you are about to interact with them. Strongest in Crystal, and the clearest wedge for a working-styles tool.
8. **App Home tab** as a light dashboard; deep analytics stay on the web.

### The two takeaways for WorkWith
- **Crystal is our template for the slash command**: one command to view a colleague's style, one to coach me on interacting with them. WorkWith's Big Five facets map straight onto this, and we already built the relational engine (`workingWith`).
- **The pre-meeting nudge is the differentiator.** Nobody in recognition-land does it, Cloverleaf only firmly ships it as email, and WorkWith already has the meeting object, the calendar, the attendee list, and the deterministic brief. This is our wedge.

## 3. What WorkWith should build (mapped to engines we already have)

Everything below reuses code that exists today. Nothing here requires a new insight engine.

| Slack feature | Reuses | AI? | Privacy |
|---|---|---|---|
| `/workwith @teammate` → their style + how to work with them | `workingWith()` (deterministic) | No | Shared profiles only; reply is private (ephemeral) |
| `/workwith me` → your one-liner + traits | existing profile/narrative | No | Your own data |
| **Pre-meeting nudge DM** → brief + how to work with each attendee | `getMeetingDetail`, `buildMeetingBrief`, `workingWith` | No | Shared profiles only; DM to that attendee |
| Weekly coaching DM (cadence + time user-set) | narrative self-coaching, or the AI `coaching` plan | Optional | Your own data only |
| App Home tab (your one-liner, today's meetings, quick lookup) | dashboard + `getMyMeetings` | No | Your own data |
| Manager weekly digest (completion %, refresh-due, not-yet-shared) | existing dashboard stats | No | Aggregate + status, no profile content |
| Onboarding nudges (finish + share your assessment) | assessment status | No | Status only |

Note: the relational, meeting, and digest content is all **deterministic and local**. Delivering it via Slack sends it only to Slack, and only ever derived working-style advice about **shared** profiles, never raw assessment answers and never anyone's private profile. Nothing new goes to Anthropic.

## 4. Recommended phasing

### Phase 0 — Foundation (required before anything ships)
- A Slack app (start as a **single-workspace app**: a static bot token in env, no public OAuth flow, no app-directory review — see decision D1).
- Signature-verified inbound endpoints (App Router route handlers): `/api/slack/commands`, `/api/slack/interactivity`, `/api/slack/events`.
- **User linking**: match Slack email to WorkWith email, confirmed by the user (a "Connect Slack" action in the app or from Slack). Store `slackUserId` + notification prefs per user.
- New tables: `SlackWorkspace` (per org: workspace id, bot token, default timezone), `SlackLink` (userId ↔ slackUserId + prefs). RLS-scoped, link/unlink audit-logged, same posture as the rest of WorkWith's PII.
- A scheduler for timed sends (see decision D3).

### Phase 1 — The wedge (highest value, deterministic)
- **`/workwith @teammate`** → private, instant relational guide (`workingWith`). Optional `[topic]` later.
- **`/workwith me`** → your summary.
- **Pre-meeting nudge**: a scheduled job runs every ~15 min, finds meetings starting soon (from `getMyMeetings`), and DMs each attendee the brief plus a short "how to work with" read on each other attendee. Deterministic, opt-in, per-user on/off.

This phase alone proves the "flow of work" value and is mostly wiring over engines that already work.

### Phase 2 — Habit
- **Weekly (or 2x/week) coaching DM**, cadence and send-time user-configurable (the Cloverleaf pattern). Default to deterministic nudges rotating through the person's own coaching so there is no per-send AI cost; offer an AI-written tip as an option.
- **App Home tab**: your one-liner, today's meetings with a "Prep" button, a "look up a teammate" entry.

### Phase 3 — Team and manager surface
- **Weekly leader digest** (DM or a chosen channel): completion %, refresh-due, who has not shared yet.
- **Onboarding nudges** to finish and share the assessment, staggered.
- **New-teammate intro card** posted to a team channel when someone shares (shared content only).

## 5. Technical shape (grounded in Slack's current API)

- **Endpoints**: three App Router route handlers. Every inbound request is verified with HMAC-SHA256 over the **raw body** using the signing secret, rejecting anything older than 5 minutes (replay protection). This is non-negotiable and standard.
- **The 3-second rule**: Slack expects a 200 within 3 seconds. On a serverless host (Netlify) we ack immediately, then do the real work (DB reads, message build) and post the result to the interaction's `response_url` or via `chat.postMessage`. Long or bulk sends must be a queued background job, never inline in the handler.
- **Sending a DM**: `conversations.open` then `chat.postMessage` with a Block Kit message, using the bot token. Scopes needed: `commands`, `chat:write`, `im:write`, `users:read`, `users:read.email`, plus `chat:write.public` if we post to channels.
- **Scheduling**: WorkWith has no cron today. Recommended: a secured internal route (`/api/slack/tick`) triggered every ~15 min by **Netlify Scheduled Functions** (co-located with the app) or Supabase `pg_cron` via `pg_net`. The job computes content at send time, so we do not use Slack's `chat.scheduleMessage` except where a fixed message is wanted.
- **Timezone detail**: meeting times are stored as wall-clock minutes with no timezone (by design). The pre-meeting job needs the workspace timezone to know when "30 minutes before" is. Store a default timezone on `SlackWorkspace`, or read each linked user's Slack timezone. Small but must be handled.
- **App Home**: `views.publish` with a `{ type: "home" }` view, refreshed on the `app_home_opened` event.
- **Rate limits**: `chat.postMessage` is ~1/sec sustained. A big fan-out (a whole org at once) is a throttled background job, the same resumable pattern already noted for email sends.

## 6. Privacy and consent model (must hold)

1. **Two-level opt-in**: an admin connects the workspace; each user links their own account and controls cadence and can opt out. No content reaches Slack for a user who has not linked.
2. **Only derived advice, never raw answers.** The relational and meeting content is computed style guidance, not assessment responses.
3. **Only shared profiles** feed any teammate-directed content, exactly like Compare and the in-app Coach. Private profiles never leave.
4. **DMs are private**; channel posts (Phase 3) carry only shared, non-sensitive content (status, an intro the person chose to share).
5. **Audit** link/unlink and any channel post, consistent with WorkWith's existing audit posture.
6. Nothing new is sent to Anthropic. The Slack layer is deterministic; the only AI is the existing, already-consented personal coaching.

## 7. Decisions needed before building

- **D1 — Scope of install.** Single-workspace app (one org, static token, fastest, no Slack review) to prove value now, or distributed/public app (per-workspace OAuth, app-directory review, needed only when other companies install it). Recommendation: single-workspace first, store tokens per-org so distributing later is an upgrade, not a rewrite.
- **D2 — First feature set.** Recommendation: ship Phase 1 (the slash command + the pre-meeting nudge) as the MVP. It is the wedge and it is mostly wiring.
- **D3 — Scheduler.** Netlify Scheduled Functions (same host, simplest) vs Supabase `pg_cron`. Recommendation: Netlify Scheduled Functions.
- **D4 — Delivery channels.** Slack only for v1, or design the notifier so Teams and email can slot in later (Cloverleaf offers all three). Recommendation: build behind a small `Notifier` seam so Slack is the first of several, but ship Slack only.

## 8. Rough effort

- Phase 0 (foundation) plus Phase 1 (slash command + pre-meeting nudge) is the first real milestone. It is the bulk of the plumbing plus two features that mostly reuse existing engines.
- Phases 2 and 3 are additive and each smaller than Phase 0+1.
- Biggest engineering care points: the signature verification, the ack-fast-then-defer pattern, the timezone handling for pre-meeting timing, and throttled bulk sends.
