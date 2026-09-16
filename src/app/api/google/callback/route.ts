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
    console.error("Google OAuth callback failed", { slug, message });
    return new Response(
      `<!doctype html><html><body style="font-family:system-ui;padding:2rem;max-width:36rem">
        <p>Google connect failed for <strong>${escapeHtml(slug)}</strong>.</p>
        <p>${escapeHtml(message)}</p>
        <p><a href="/">Back to Scheduler</a></p>
      </body></html>`,
      { status: 500, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
