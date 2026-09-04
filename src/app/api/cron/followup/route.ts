import { NextRequest } from "next/server";
import { runFollowUpCron } from "@/lib/cron/agenda";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runFollowUpCron();
  return Response.json(result);
}
