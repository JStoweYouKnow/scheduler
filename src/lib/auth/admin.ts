import { auth, currentUser } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { emailAllowed } from "./allowlist";
import { clerkConfigured } from "./clerk";
import { isDemoMode } from "../demo/mode";

export function hasAdminKey(request: NextRequest): boolean {
  const expected = process.env.SCHEDULER_ADMIN_KEY;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query = request.nextUrl.searchParams.get("key");
  const provided = bearer ?? query ?? request.headers.get("x-admin-key");
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

export { emailAllowed };

export async function isAuthorized(request: NextRequest): Promise<boolean> {
  if (isDemoMode()) return true;
  if (hasAdminKey(request)) return true;
  if (!clerkConfigured()) return false;
  const { isAuthenticated } = await auth();
  if (!isAuthenticated) return false;
  const user = await currentUser();
  const emails =
    user?.emailAddresses.map((item) => item.emailAddress).filter(Boolean) ?? [];
  return emails.some((email) => emailAllowed(email));
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function unauthorized(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
