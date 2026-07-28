# Slack setup (Phase 0 + 1)

This is the one-time setup only a person with Slack admin access can do. Once
these values are in the environment, WorkWith's Slack features turn on by
themselves. It is a **single-workspace** app: it lives in one Slack workspace and
uses one bot token (no public app-directory review needed).

## 1. Create the Slack app

1. Go to https://api.slack.com/apps and click **Create New App → From scratch**.
2. Name it **WorkWith**, pick your workspace, create.

## 2. Add the bot scopes

Left sidebar → **OAuth & Permissions → Scopes → Bot Token Scopes**. Add:

- `commands` — the `/workwith` slash command
- `chat:write` — send messages
- `im:write` — open a DM channel with a user
- `users:read` and `users:read.email` — match a WorkWith user to their Slack account by email

## 3. Add the slash command

Left sidebar → **Slash Commands → Create New Command**:

- Command: `/workwith`
- Request URL: `https://workwith8.netlify.app/api/slack/commands`
- Short description: `Look up a teammate's working style`
- Usage hint: `me | <teammate first name>`

Save.

## 4. Install to the workspace and copy the tokens

1. **OAuth & Permissions → Install to Workspace**, approve.
2. Copy the **Bot User OAuth Token** (starts with `xoxb-`) → this is `SLACK_BOT_TOKEN`.
3. **Basic Information → App Credentials → Signing Secret** → this is `SLACK_SIGNING_SECRET`.

## 5. Set the environment variables

In **Netlify → Site settings → Environment variables** (and your local `.env` if
testing locally), set:

| Variable | Value |
|---|---|
| `SLACK_BOT_TOKEN` | the `xoxb-…` token from step 4 |
| `SLACK_SIGNING_SECRET` | the signing secret from step 4 |
| `SLACK_TICK_SECRET` | any long random string (e.g. `openssl rand -base64 32`) |
| `SLACK_DEFAULT_TZ` | the timezone your meeting times are in, e.g. `America/New_York` |
| `APP_URL` | `https://workwith8.netlify.app` |

Redeploy so the functions pick up the new variables.

## 6. Apply the database change

Two new tables (`SlackLink`, `SlackNudge`) were added. Apply them to the
database once, from a machine with `DATABASE_URL`/`DIRECT_URL` set to production:

```
npx prisma db push
```

This is **additive** (new tables only) and does not touch existing data.

## 7. Try it

1. In WorkWith, open **My profile**. A **Slack** card appears at the bottom.
   Click **Connect Slack** (it matches your Slack account by your work email).
2. In Slack, run `/workwith me` (your own summary) and `/workwith <a teammate's
   first name>` (how to work with them). Replies are private to you.
3. **Pre-meeting DMs:** the scheduled function (`netlify/functions/slack-tick.mts`)
   runs every 15 minutes. When a meeting on the WorkWith calendar with a set
   start time is ~10 to 45 minutes away, each connected attendee who left
   pre-meeting DMs on gets a short read on how to work with the others. To test
   without waiting, hit the endpoint yourself:
   ```
   curl -H "x-tick-secret: <your SLACK_TICK_SECRET>" https://workwith8.netlify.app/api/slack/tick
   ```

## Notes on privacy

- Nothing is sent to Slack for a user who has not connected their account.
- Only **shared** profiles feed a teammate read, exactly like the in-app Coach.
- The content is derived working-style guidance, never raw assessment answers,
  and none of it goes to Anthropic (the relational and meeting reads are
  computed locally).

## What is NOT included yet (later phases)

Weekly personal coaching DMs, an App Home tab, a manager digest, and onboarding
nudges are Phase 2 and 3 (see docs/slack-integration-plan.md). This setup covers
the `/workwith` command and the pre-meeting nudge.
