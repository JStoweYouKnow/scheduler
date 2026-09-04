import { matchInboundToRequest } from "./match-thread";

const open = [
  {
    id: "req-1",
    threadId: "thread-abc",
    counterpartyEmail: "sarah@tubi.tv",
    counterpartyName: "Sarah Chen",
    organization: "Tubi",
    status: "awaiting_reply",
  },
  {
    id: "req-2",
    threadId: null,
    counterpartyEmail: "alex@netflix.com",
    counterpartyName: "Alex",
    organization: "Netflix",
    status: "proposing",
  },
];

describe("inbox matching", () => {
  it("matches an existing Gmail thread first", () => {
    const match = matchInboundToRequest({ threadId: "thread-abc" }, open);
    expect(match).toEqual({
      requestId: "req-1",
      reason: "thread",
      confidence: "high",
    });
  });

  it("matches counterparty email when thread is new", () => {
    const match = matchInboundToRequest(
      { fromAddress: "alex@netflix.com", subject: "Re: time" },
      open,
    );
    expect(match?.requestId).toBe("req-2");
    expect(match?.reason).toBe("email");
  });

  it("falls back to a unique name in the subject", () => {
    const match = matchInboundToRequest(
      { subject: "Times that work for Sarah Chen" },
      open,
    );
    expect(match?.requestId).toBe("req-1");
    expect(match?.confidence).toBe("medium");
  });

  it("ignores confirmed and cancelled requests", () => {
    const match = matchInboundToRequest(
      { fromAddress: "done@x.com" },
      [
        {
          id: "done",
          threadId: null,
          counterpartyEmail: "done@x.com",
          counterpartyName: "Done",
          organization: null,
          status: "confirmed",
        },
      ],
    );
    expect(match).toBeNull();
  });
});
