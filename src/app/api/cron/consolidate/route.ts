import { NextRequest } from "next/server";
import { consolidateMemory } from "@/lib/memory/consolidate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET ?? process.env.SCHEDULER_ADMIN_KEY;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await consolidateMemory();
  return Response.json(result);
}
