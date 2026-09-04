import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { googleAuthUrl } from "@/lib/calendar/google";
import { requireMember, loadTeamConfig } from "@/lib/config/team";

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return unauthorized();
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) {
    return Response.json({ error: "slug is required" }, { status: 400 });
  }
  requireMember(loadTeamConfig(), slug);
  return Response.redirect(googleAuthUrl(slug));
}
