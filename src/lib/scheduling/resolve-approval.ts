import { executeApprovedAction } from "./execute-approval";
import { decideApproval } from "./repo";

export async function resolveApproval(
  id: string,
  decision: "approved" | "rejected",
  decidedBy: string,
): Promise<{ approval: NonNullable<Awaited<ReturnType<typeof decideApproval>>>; result: unknown }> {
  const approval = await decideApproval(id, decision, decidedBy);
  if (!approval) {
    throw new Error("Approval not found or already decided");
  }
  if (decision !== "approved") {
    return { approval, result: { rejected: true } };
  }
  const result = await executeApprovedAction(
    approval.kind,
    approval.payload,
    approval.schedulingRequestId,
  );
  return { approval, result };
}

export function summarizeApproval(kind: string, payload: unknown): string {
  if (!payload || typeof payload !== "object") return kind;
  const data = payload as Record<string, unknown>;
  if (kind === "send_email") {
    const to = typeof data.to === "string" ? data.to : "unknown";
    const subject = typeof data.subject === "string" ? data.subject : "";
    const body = typeof data.body === "string" ? data.body : "";
    return `To: ${to}\nSubject: ${subject}\n\n${body.slice(0, 500)}`;
  }
  if (kind === "create_external_event" || kind === "update_external_event") {
    const title = typeof data.title === "string" ? data.title : kind;
    const start = typeof data.start === "string" ? data.start : "";
    const email =
      typeof data.counterpartyEmail === "string" ? data.counterpartyEmail : "";
    return [title, email, start].filter(Boolean).join(" · ");
  }
  return kind;
}
