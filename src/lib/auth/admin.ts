import { NextRequest } from "next/server";

export function isAuthorized(request: NextRequest): boolean {
  const expected = process.env.SCHEDULER_ADMIN_KEY;
  if (!expected) return false;
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7) : null;
  const query = request.nextUrl.searchParams.get("key");
  const provided = bearer ?? query ?? request.headers.get("x-admin-key");
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
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
