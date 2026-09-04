import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { hasDatabase } from "@/lib/env";
import { listRecentRequests } from "@/lib/scheduling/repo";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  if (!hasDatabase()) {
    return Response.json({ requests: [], setup: true });
  }
  const requests = await listRecentRequests();
  return Response.json({ requests });
}
