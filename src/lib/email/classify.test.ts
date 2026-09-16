import { classifyInboxWithNano } from "./classify";
import type { GmailMessage } from "./port";

const message: GmailMessage = {
  id: "m1",
  threadId: "thread-abc",
  from: "sarah@tubi.tv",
  to: ["v@matriarch-studios.com"],
  subject: "Times that work next week",
  snippet: "Can we do 30 min?",
  body: "Tuesday afternoon works.",
  date: new Date("2026-09-08T17:00:00Z"),
};

describe("Nano inbox classify", () => {
  it("keeps a high-confidence heuristic match without calling the model", async () => {
    const plan = await classifyInboxWithNano(
      message,
      [
        {
          id: "req-1",
          threadId: "thread-abc",
          counterpartyEmail: "sarah@tubi.tv",
          counterpartyName: "Sarah Chen",
          organization: "Tubi",
          status: "awaiting_reply",
        },
      ],
      {
        action: "match",
        requestId: "req-1",
        reason: "thread",
        confidence: "high",
      },
    );
    expect(plan).toEqual({
      action: "match",
      requestId: "req-1",
      reason: "thread",
      confidence: "high",
    });
  });
});
