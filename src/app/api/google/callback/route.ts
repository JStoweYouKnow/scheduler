import { NextRequest } from "next/server";
import { exchangeGoogleCode } from "@/lib/calendar/google";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const slug = request.nextUrl.searchParams.get("state");
  if (!code || !slug) {
    return Response.json({ error: "Missing code or state" }, { status: 400 });
  }
  try {
    await exchangeGoogleCode(code, slug);
    return Response.redirect(new URL("/?connected=1", request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "OAuth failed";
    return Response.json({ error: message }, { status: 500 });
  }
}
