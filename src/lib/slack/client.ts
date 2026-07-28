import { slackBotToken } from "./env";

/** Minimal Slack Web API client over fetch, using the workspace bot token. */

type SlackBlock = Record<string, unknown>;

async function call<T = Record<string, unknown>>(
  method: string,
  body: Record<string, unknown>,
): Promise<T & { ok: boolean; error?: string }> {
  const token = slackBotToken();
  if (!token) return { ok: false, error: "no_bot_token" } as T & { ok: boolean; error?: string };
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as T & { ok: boolean; error?: string };
}

/** Find a Slack user id by email (needs users:read.email). Null if not found. */
export async function lookupSlackUserByEmail(email: string): Promise<string | null> {
  const r = await call<{ user?: { id: string } }>("users.lookupByEmail", { email });
  return r.ok && r.user ? r.user.id : null;
}

/** Open (or fetch) the bot's DM channel with a user. Returns the channel id. */
export async function openDm(slackUserId: string): Promise<string | null> {
  const r = await call<{ channel?: { id: string } }>("conversations.open", {
    users: slackUserId,
  });
  return r.ok && r.channel ? r.channel.id : null;
}

/** Post a message (text and/or Block Kit blocks) to a channel or user id. */
export async function postMessage(
  channel: string,
  opts: { text: string; blocks?: SlackBlock[] },
): Promise<{ ok: boolean; error?: string }> {
  return call("chat.postMessage", {
    channel,
    text: opts.text, // fallback / notification text
    ...(opts.blocks ? { blocks: opts.blocks } : {}),
  });
}

/** Convenience: DM a user by their Slack id (opens the DM, then posts). */
export async function dmUser(
  slackUserId: string,
  opts: { text: string; blocks?: SlackBlock[] },
): Promise<{ ok: boolean; error?: string }> {
  const channel = await openDm(slackUserId);
  if (!channel) return { ok: false, error: "dm_open_failed" };
  return postMessage(channel, opts);
}
