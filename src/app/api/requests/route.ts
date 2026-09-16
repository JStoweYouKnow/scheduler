import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { hasPersistence } from "@/lib/env";
import { listRecentRequests } from "@/lib/scheduling/repo";

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  if (!hasPersistence()) {
    return Response.json({ requests: [], setup: true });
  }
  const requests = await listRecentRequests();
  return Response.json({ requests });
}
