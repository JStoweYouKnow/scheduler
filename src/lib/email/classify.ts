import { generateText } from "ai";
import { hasNebius, fastModel } from "../ai/models";
import { parseJsonObject } from "../ai/json";
import { looksLikeScheduling } from "./parse";
import type { GmailMessage } from "./port";

export type NanoInboxPlan =
  | { action: "ignore"; reason: string }
  | { action: "match"; requestId: string; reason: string; confidence: string }
  | { action: "open" };

const inboxSchemaHint = `{
  "isScheduling": boolean,
  "action": "ignore" | "match" | "open",
  "requestId": string | null,
  "reason": string,
  "confidence": "high" | "medium" | "low"
}`;

export async function classifyInboxWithNano(
  message: GmailMessage,
  openRequests: Array<{
    id: string;
    threadId: string | null;
    counterpartyEmail: string | null;
    counterpartyName: string | null;
    organization: string | null;
    status: string;
  }>,
  heuristic: NanoInboxPlan,
): Promise<NanoInboxPlan> {
  if (heuristic.action === "match" && heuristic.confidence === "high") {
    return heuristic;
  }
  if (!hasNebius()) return heuristic;

  const { text } = await generateText({
    model: fastModel(),
    temperature: 0.2,
    prompt: [
      "Classify inbound mail for a scheduling agent.",
      "Return JSON only:",
      inboxSchemaHint,
      "Match requestId only if it is in the open request list.",
      `Heuristic: ${JSON.stringify(heuristic)}`,
      `Open requests: ${JSON.stringify(openRequests)}`,
      `From: ${message.from}`,
      `Subject: ${message.subject}`,
      `Body: ${(message.body || message.snippet).slice(0, 2000)}`,
    ].join("\n"),
  });

  try {
    const parsed = parseJsonObject<{
      isScheduling?: boolean;
      action?: NanoInboxPlan["action"];
      requestId?: string | null;
      reason?: string;
      confidence?: "high" | "medium" | "low";
    }>(text);
    if (parsed.action === "match" && parsed.requestId) {
      const exists = openRequests.some((request) => request.id === parsed.requestId);
      if (!exists) return heuristic;
      return {
        action: "match",
        requestId: parsed.requestId,
        reason: parsed.reason ?? "nano",
        confidence: parsed.confidence ?? "medium",
      };
    }
    if (parsed.action === "ignore" || parsed.isScheduling === false) {
      return { action: "ignore", reason: parsed.reason ?? "not_scheduling" };
    }
    if (parsed.action === "open" || parsed.isScheduling) {
      return { action: "open" };
    }
  } catch {
    if (!looksLikeScheduling(message) && heuristic.action === "ignore") return heuristic;
  }
  return heuristic;
}
