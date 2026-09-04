import { NextRequest } from "next/server";
import { runSchedulerAgent } from "@/lib/agent/run";
import { verifySlackSignature } from "@/lib/slack/verify";
import { postSlackMessage } from "@/lib/slack/client";
import { loadTeamConfig } from "@/lib/config/team";

export const runtime = "nodejs";
export const maxDuration = 60;

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

  const payload = JSON.parse(rawBody) as {
    type?: string;
    challenge?: string;
    event?: {
      type: string;
      text?: string;
      user?: string;
      channel?: string;
      ts?: string;
      thread_ts?: string;
      bot_id?: string;
    };
  };

  if (payload.type === "url_verification") {
    return Response.json({ challenge: payload.challenge });
  }

  const event = payload.event;
  if (!event || event.bot_id) {
    return Response.json({ ok: true });
  }
  if (event.type !== "app_mention" && event.type !== "message") {
    return Response.json({ ok: true });
  }

  const text = (event.text ?? "").replace(/<@[A-Z0-9]+>/g, "").trim();
  if (!text) return Response.json({ ok: true });

  const result = await runSchedulerAgent({
    prompt: text,
    source: "slack",
    slackChannel: event.channel,
    slackThreadTs: event.thread_ts ?? event.ts,
  });

  const team = loadTeamConfig();
  await postSlackMessage({
    channel: event.channel ?? process.env.SLACK_CHANNEL ?? team.slackChannel,
    threadTs: event.thread_ts ?? event.ts,
    text: result.text,
  });

  return Response.json({ ok: true });
}
