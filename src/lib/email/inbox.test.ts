import { looksLikeScheduling } from "./parse";
import { inboundAgentPrompt, planInboxAction } from "./inbox";
import type { GmailMessage } from "./port";

const sarah: GmailMessage = {
  id: "m1",
  threadId: "thread-abc",
  from: "sarah@tubi.tv",
  to: ["v@matriarch-studios.com"],
  subject: "Times that work next week",
  snippet: "Can we do 30 min?",
  body: "Tuesday or Wednesday afternoon works for a meeting.",
  date: new Date("2026-09-08T17:00:00Z"),
};

const newsletter: GmailMessage = {
  id: "m2",
  threadId: "thread-news",
  from: "noreply@deals.com",
  to: ["v@matriarch-studios.com"],
  subject: "Your weekly digest",
  snippet: "Deals inside",
  body: "Unsubscribe anytime",
  date: new Date("2026-09-08T17:00:00Z"),
};

const open = [
  {
    id: "req-1",
    threadId: "thread-abc",
    counterpartyEmail: "sarah@tubi.tv",
    counterpartyName: "Sarah Chen",
    organization: "Tubi",
    status: "awaiting_reply",
  },
];

describe("inbox matching", () => {
  it("matches a reply on an existing thread", () => {
    expect(planInboxAction(sarah, open)).toEqual({
      action: "match",
      requestId: "req-1",
      reason: "thread",
      confidence: "high",
    });
  });

  it("opens a request for a new scheduling email", () => {
    expect(planInboxAction({ ...sarah, threadId: "thread-new" }, [])).toEqual({
      action: "open",
    });
  });

  it("ignores newsletters", () => {
    expect(looksLikeScheduling(newsletter)).toBe(false);
    expect(planInboxAction(newsletter, open).action).toBe("ignore");
  });

  it("builds an agent prompt that keeps the request id", () => {
    const prompt = inboundAgentPrompt({
      message: sarah,
      requestId: "req-1",
      matchReason: "thread",
    });
    expect(prompt).toContain("req-1");
    expect(prompt).toContain("thread-abc");
    expect(prompt).toContain("draft_email");
  });
});
