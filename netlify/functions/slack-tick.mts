// Scheduled trigger for WorkWith's pre-meeting Slack nudges. Runs every 15
// minutes and calls the app's guarded tick endpoint, which computes and sends
// any due DMs. Keeping the logic in the Next route (not here) means it shares
// the app's Prisma client and libs. Requires SLACK_TICK_SECRET (and the URL)
// in the Netlify environment.
export default async function handler() {
  const base = process.env.APP_URL || process.env.URL; // URL is set by Netlify
  const secret = process.env.SLACK_TICK_SECRET;
  if (!base || !secret) {
    console.log("slack-tick: missing APP_URL/URL or SLACK_TICK_SECRET; skipping");
    return;
  }
  try {
    const res = await fetch(`${base}/api/slack/tick`, {
      method: "POST",
      headers: { "x-tick-secret": secret },
    });
    console.log("slack-tick:", res.status, await res.text());
  } catch (err) {
    console.error("slack-tick failed", err);
  }
}

export const config = {
  schedule: "*/15 * * * *",
};
