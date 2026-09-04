import { NextRequest } from "next/server";
import { runSchedulerAgent } from "@/lib/agent/run";
import { processInbox } from "@/lib/email/inbox";
import { createGoogleGmailPort } from "@/lib/email/gmail";
import { postSlackMessage } from "@/lib/slack/client";
import { loadTeamConfig } from "@/lib/config/team";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? process.env.SCHEDULER_ADMIN_KEY;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const team = loadTeamConfig();
  const stats = await processInbox({
    gmail: createGoogleGmailPort(),
    onMatched: async (prompt, requestId) => {
      const result = await runSchedulerAgent({
        prompt,
        source: "email",
        schedulingRequestId: requestId,
      });
      await postSlackMessage({
        channel: process.env.SLACK_CHANNEL ?? team.slackChannel,
        text: result.text,
      });
    },
  });

  return Response.json(stats);
}
