import { createHmac, timingSafeEqual } from "node:crypto";

export function verifySlackSignature(args: {
  signingSecret: string;
  signature: string | null;
  timestamp: string | null;
  rawBody: string;
}): boolean {
  const { signingSecret, signature, timestamp, rawBody } = args;
  if (!signature || !timestamp) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (Number.isNaN(age) || age > 60 * 5) return false;
  const base = `v0:${timestamp}:${rawBody}`;
  const digest = `v0=${createHmac("sha256", signingSecret).update(base).digest("hex")}`;
  const a = Buffer.from(digest);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
