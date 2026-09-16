import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { runSchedulerAgent } from "@/lib/agent/run";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  const body = (await request.json()) as {
    prompt?: string;
    source?: "cli" | "slack" | "email";
    slackChannel?: string;
    slackThreadTs?: string;
    skill?: string;
  };
  if (!body.prompt?.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }
  try {
    const result = await runSchedulerAgent({
      prompt: body.prompt,
      source: body.source ?? "cli",
      slackChannel: body.slackChannel,
      slackThreadTs: body.slackThreadTs,
      skill: body.skill,
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Agent failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
