import { generateText, type LanguageModel } from "ai";
import { hasNebius, fastModel } from "../ai/models";
import { parseJsonObject } from "../ai/json";
import { looksLikeScheduling } from "./parse";
import type { GmailMessage } from "./port";

export type NanoInboxPlan =
  | { action: "ignore"; reason: string }
  | { action: "match"; requestId: string; reason: string; confidence: string }
  | { action: "open" };

export type OpenRequestLite = {
  id: string;
  threadId: string | null;
  counterpartyEmail: string | null;
  counterpartyName: string | null;
  organization: string | null;
  status: string;
};

export type ClassifyUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ClassifyResult = {
  plan: NanoInboxPlan;
  usage: ClassifyUsage;
  latencyMs: number;
  calledModel: boolean;
};

const inboxSchemaHint = `{
  "isScheduling": boolean,
  "action": "ignore" | "match" | "open",
  "requestId": string | null,
  "reason": string,
  "confidence": "high" | "medium" | "low"
}`;

export function classifyPrompt(
  message: GmailMessage,
  openRequests: OpenRequestLite[],
  heuristic: NanoInboxPlan,
): string {
  return [
    "Classify inbound mail for a scheduling agent.",
    "Return JSON only:",
    inboxSchemaHint,
    "Match requestId only if it is in the open request list.",
    `Heuristic: ${JSON.stringify(heuristic)}`,
    `Open requests: ${JSON.stringify(openRequests)}`,
    `From: ${message.from}`,
    `Subject: ${message.subject}`,
    `Body: ${(message.body || message.snippet).slice(0, 2000)}`,
  ].join("\n");
}

export function parseClassifyText(
  text: string,
  openRequests: OpenRequestLite[],
  heuristic: NanoInboxPlan,
  message: GmailMessage,
): NanoInboxPlan {
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

export async function classifyInbox(args: {
  message: GmailMessage;
  openRequests: OpenRequestLite[];
  heuristic: NanoInboxPlan;
  model: LanguageModel;
  skipHeuristic?: boolean;
}): Promise<ClassifyResult> {
  if (
    !args.skipHeuristic &&
    args.heuristic.action === "match" &&
    args.heuristic.confidence === "high"
  ) {
    return {
      plan: args.heuristic,
      usage: { inputTokens: 0, outputTokens: 0 },
      latencyMs: 0,
      calledModel: false,
    };
  }

  const started = performance.now();
  const { text, usage } = await generateText({
    model: args.model,
    temperature: 0.2,
    maxOutputTokens: 512,
    prompt: classifyPrompt(args.message, args.openRequests, args.heuristic),
  });
  return {
    plan: parseClassifyText(text, args.openRequests, args.heuristic, args.message),
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
    },
    latencyMs: performance.now() - started,
    calledModel: true,
  };
}

export async function classifyInboxWithNano(
  message: GmailMessage,
  openRequests: OpenRequestLite[],
  heuristic: NanoInboxPlan,
): Promise<NanoInboxPlan> {
  if (heuristic.action === "match" && heuristic.confidence === "high") {
    return heuristic;
  }
  if (!hasNebius()) return heuristic;
  const result = await classifyInbox({
    message,
    openRequests,
    heuristic,
    model: fastModel(),
  });
  return result.plan;
}
