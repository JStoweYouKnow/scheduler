import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { dumpMemoryMarkdown } from "@/lib/memory/dump";
import { listAllFacts, listPeople, listProjects } from "@/lib/memory/repo";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  const [facts, people, projects] = await Promise.all([
    listAllFacts(),
    listPeople(),
    listProjects(),
  ]);
  return Response.json({ facts, people, projects });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  const result = await dumpMemoryMarkdown();
  return Response.json(result);
}
