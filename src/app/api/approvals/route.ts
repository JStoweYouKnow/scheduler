import { NextRequest } from "next/server";
import { isAuthorized, unauthorized } from "@/lib/auth/admin";
import { hasPersistence } from "@/lib/env";
import { listPendingApprovals } from "@/lib/scheduling/repo";
import {
  resolveApproval,
  summarizeApproval,
} from "@/lib/scheduling/resolve-approval";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  if (!hasPersistence()) {
    return Response.json({ approvals: [] });
  }
  const rows = await listPendingApprovals();
  return Response.json({
    approvals: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      summary: summarizeApproval(row.kind, row.payload),
      schedulingRequestId: row.schedulingRequestId,
      createdAt: row.createdAt,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return unauthorized();
  const body = (await request.json()) as {
    id?: string;
    decision?: "approved" | "rejected";
  };
  if (!body.id || (body.decision !== "approved" && body.decision !== "rejected")) {
    return Response.json({ error: "id and decision are required" }, { status: 400 });
  }
  try {
    const { approval, result } = await resolveApproval(
      body.id,
      body.decision,
      "dashboard",
    );
    return Response.json({
      ok: true,
      decision: approval.status,
      result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Approval failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
