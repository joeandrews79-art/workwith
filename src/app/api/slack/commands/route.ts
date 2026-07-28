import { verifySlackSignature } from "@/lib/slack/verify";
import { slackSigningSecret, slackEnabled } from "@/lib/slack/env";
import { getUserBySlackId, getCommandContext, matchTeammate } from "@/lib/slack/data";
import { relationalGuideBlocks, profileSummaryBlocks, appBaseUrl } from "@/lib/slack/blocks";
import { workingWith } from "@/lib/team";
import { assembleProfile } from "@/lib/profile";
import { DOMAIN_ORDER, DOMAINS } from "@/lib/ipip";
import { DOMAIN_POLES } from "@/lib/ui";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Block = Record<string, unknown>;

function ephemeral(text: string, blocks?: Block[]) {
  return Response.json({
    response_type: "ephemeral",
    text,
    ...(blocks ? { blocks } : {}),
  });
}

export async function POST(req: Request) {
  if (!slackEnabled()) return new Response("Slack not configured", { status: 503 });

  const raw = await req.text();
  const ok = verifySlackSignature({
    signingSecret: slackSigningSecret()!,
    rawBody: raw,
    timestamp: req.headers.get("x-slack-request-timestamp"),
    signature: req.headers.get("x-slack-signature"),
  });
  if (!ok) return new Response("Bad signature", { status: 401 });

  const form = new URLSearchParams(raw);
  const slackUserId = form.get("user_id") || "";
  const text = (form.get("text") || "").trim();

  const user = await getUserBySlackId(slackUserId);
  if (!user) {
    return ephemeral(
      `Connect Slack first: open WorkWith, go to your profile, and click *Connect Slack*. ${appBaseUrl()}/me`,
    );
  }

  // `/workwith me` → your own working style.
  if (!text || text.toLowerCase() === "me") {
    const profile = await assembleProfile(user.id);
    if (!profile?.domains) {
      return ephemeral(
        `You haven't finished your working-style assessment yet. Take it here: ${appBaseUrl()}/assessment`,
      );
    }
    const traits = DOMAIN_ORDER.map((d) => ({
      label: DOMAINS[d].friendly,
      score: profile.domains![d].friendlyScore,
      poleLow: DOMAIN_POLES[d].low,
      poleHigh: DOMAIN_POLES[d].high,
    }));
    return ephemeral(
      "Your working style",
      profileSummaryBlocks({
        name: user.name,
        oneLiner: profile.narrative?.summary ?? null,
        traits,
      }),
    );
  }

  // `/workwith <name>` → how to work with that teammate.
  const { viewer, teammates } = await getCommandContext(user.id, user.orgId);
  if (!viewer) {
    return ephemeral(
      `Finish your own assessment first so we can compare styles: ${appBaseUrl()}/assessment`,
    );
  }
  const { match, candidates } = matchTeammate(text, teammates);
  if (!match) {
    if (candidates.length === 0) {
      return ephemeral(
        `No teammates with shared profiles yet. Ask them to share, then try again.`,
      );
    }
    const names = candidates.slice(0, 8).map((c) => `\`${c.name.split(/\s+/)[0]}\``).join(", ");
    return ephemeral(
      `Couldn't tell who you meant. Try one of: ${names}. For example: \`/workwith ${candidates[0].name.split(/\s+/)[0]}\``,
    );
  }

  const guide = workingWith(viewer, match);
  return ephemeral(`Working with ${guide.otherName}`, relationalGuideBlocks(guide));
}
