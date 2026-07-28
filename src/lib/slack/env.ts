/** Slack configuration, read from env. Single-workspace MVP: one bot token and
 *  one signing secret for the connected workspace. See docs/slack-setup.md. */

export function slackBotToken(): string | null {
  return process.env.SLACK_BOT_TOKEN || null;
}

export function slackSigningSecret(): string | null {
  return process.env.SLACK_SIGNING_SECRET || null;
}

/** Shared secret guarding the scheduled tick endpoint (see /api/slack/tick). */
export function slackTickSecret(): string | null {
  return process.env.SLACK_TICK_SECRET || null;
}

/** IANA timezone the workspace's meeting times are in. Meeting start times are
 *  stored as wall-clock minutes with no zone (by design), so the pre-meeting
 *  job needs this to know when "30 minutes before" actually is. */
export function slackTimezone(): string {
  return process.env.SLACK_DEFAULT_TZ || "America/New_York";
}

/** Slack features are live only when a bot token and signing secret are set. */
export function slackEnabled(): boolean {
  return Boolean(slackBotToken() && slackSigningSecret());
}
