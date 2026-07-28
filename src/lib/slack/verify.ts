import crypto from "crypto";

/**
 * Verify an inbound Slack request signature.
 *
 * Slack signs every request: basestring = `v0:{timestamp}:{rawBody}`, signed
 * with HMAC-SHA256 using the app signing secret, compared against the
 * `x-slack-signature` header. The body MUST be the raw, unparsed text.
 *
 * Rejects requests older than 5 minutes (replay protection) and uses a
 * constant-time compare. Returns true only when everything checks out.
 */
export function verifySlackSignature(opts: {
  signingSecret: string;
  rawBody: string;
  timestamp: string | null;
  signature: string | null;
  now?: number; // ms, injectable for tests
}): boolean {
  const { signingSecret, rawBody, timestamp, signature } = opts;
  if (!signingSecret || !timestamp || !signature) return false;

  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  const nowSec = Math.floor((opts.now ?? Date.now()) / 1000);
  if (Math.abs(nowSec - ts) > 60 * 5) return false; // >5 min old → reject

  const basestring = `v0:${timestamp}:${rawBody}`;
  const expected =
    "v0=" + crypto.createHmac("sha256", signingSecret).update(basestring).digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
