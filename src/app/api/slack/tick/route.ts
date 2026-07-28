import { runPreMeetingNudges } from "@/lib/slack/tick";
import { slackTickSecret, slackEnabled } from "@/lib/slack/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scheduled entrypoint for pre-meeting nudges. Triggered every ~15 min by a
 *  Netlify Scheduled Function (see netlify/functions/slack-tick.mts). Guarded by
 *  a shared secret so only our scheduler can run it. */
async function handle(req: Request): Promise<Response> {
  const secret = slackTickSecret();
  if (!secret) return new Response("Tick secret not set", { status: 503 });

  const url = new URL(req.url);
  const provided = req.headers.get("x-tick-secret") || url.searchParams.get("secret");
  if (provided !== secret) return new Response("Forbidden", { status: 403 });

  if (!slackEnabled()) return Response.json({ ok: false, reason: "slack_disabled" });

  const summary = await runPreMeetingNudges();
  return Response.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
