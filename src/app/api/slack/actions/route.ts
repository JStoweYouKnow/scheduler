import { NextRequest } from "next/server";
import { verifySlackSignature } from "@/lib/slack/verify";
import { getApproval } from "@/lib/scheduling/repo";
import { resolveApproval } from "@/lib/scheduling/resolve-approval";
import { postSlackMessage } from "@/lib/slack/client";

export const runtime = "nodejs";

interface SlackActionPayload {
  user?: { username?: string; id?: string };
  actions?: Array<{ action_id?: string; value?: string }>;
  channel?: { id?: string };
  message?: { ts?: string };
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) {
    return Response.json({ error: "Slack is not configured" }, { status: 501 });
  }
  const ok = verifySlackSignature({
    signingSecret: secret,
    signature: request.headers.get("x-slack-signature"),
    timestamp: request.headers.get("x-slack-request-timestamp"),
    rawBody,
  });
  if (!ok) {
    return Response.json({ error: "Invalid Slack signature" }, { status: 401 });
  }

  const params = new URLSearchParams(rawBody);
  const payload = JSON.parse(params.get("payload") ?? "{}") as SlackActionPayload;
  const action = payload.actions?.[0];
  if (!action?.value || !action.action_id) {
    return Response.json({ ok: true });
  }

  const decision = action.action_id === "approve_send" ? "approved" : "rejected";
  const decidedBy = payload.user?.username ?? payload.user?.id ?? "unknown";
  let result: unknown = null;
  try {
    ({ result } = await resolveApproval(action.value, decision, decidedBy));
  } catch {
    return Response.json({ error: "Approval not found" }, { status: 404 });
  }

  const stored = await getApproval(action.value);
  await postSlackMessage({
    channel:
      payload.channel?.id ??
      stored?.slackChannel ??
      process.env.SLACK_CHANNEL ??
      "#scheduling",
    threadTs: payload.message?.ts,
    text: `${decision === "approved" ? "Approved" : "Rejected"} by ${decidedBy}`,
  });

  return Response.json({ ok: true, result });
}
