import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clerkAppOptions, clerkConfigured } from "@/lib/auth/clerk";
import { isDemoMode } from "@/lib/demo/mode";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/cron(.*)",
  "/api/google/callback(.*)",
  "/api/slack(.*)",
]);

const options = clerkAppOptions();

export default clerkConfigured() && !isDemoMode()
  ? clerkMiddleware(async (auth, req) => {
      if (isPublicRoute(req)) return;
      if (!req.nextUrl.pathname.startsWith("/api")) {
        await auth.protect();
      }
    }, options)
  : function proxy() {
      return NextResponse.next();
    };

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/(.*)",
  ],
};
