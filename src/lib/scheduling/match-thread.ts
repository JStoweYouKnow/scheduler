export interface OpenRequestMatch {
  id: string;
  threadId: string | null;
  counterpartyEmail: string | null;
  counterpartyName: string | null;
  organization: string | null;
  status: string;
}

export interface InboundMessage {
  threadId?: string | null;
  fromAddress?: string | null;
  subject?: string | null;
  snippet?: string | null;
}

export interface MatchResult {
  requestId: string;
  reason: "thread" | "email" | "name" | "organization";
  confidence: "high" | "medium" | "low";
}

function normalize(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

export function matchInboundToRequest(
  message: InboundMessage,
  openRequests: OpenRequestMatch[],
): MatchResult | null {
  const open = openRequests.filter(
    (request) => request.status !== "confirmed" && request.status !== "cancelled",
  );

  if (message.threadId) {
    const byThread = open.find((request) => request.threadId === message.threadId);
    if (byThread) {
      return { requestId: byThread.id, reason: "thread", confidence: "high" };
    }
  }

  const from = normalize(message.fromAddress);
  if (from) {
    const byEmail = open.find(
      (request) => normalize(request.counterpartyEmail) === from,
    );
    if (byEmail) {
      return { requestId: byEmail.id, reason: "email", confidence: "high" };
    }
  }

  const haystack = `${normalize(message.subject)} ${normalize(message.snippet)}`;
  const nameHits = open.filter((request) => {
    const name = normalize(request.counterpartyName);
    return name.length >= 3 && haystack.includes(name);
  });
  if (nameHits.length === 1 && nameHits[0]) {
    return { requestId: nameHits[0].id, reason: "name", confidence: "medium" };
  }

  const orgHits = open.filter((request) => {
    const org = normalize(request.organization);
    return org.length >= 3 && haystack.includes(org);
  });
  if (orgHits.length === 1 && orgHits[0]) {
    return {
      requestId: orgHits[0].id,
      reason: "organization",
      confidence: "low",
    };
  }

  return null;
}
