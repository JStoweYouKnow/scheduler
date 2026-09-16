import { summarizeApproval } from "./resolve-approval";

describe("approval summaries", () => {
  it("summarizes outbound mail", () => {
    expect(
      summarizeApproval("send_email", {
        to: "sarah@tubi.tv",
        subject: "Times",
        body: "Tuesday at 10?",
      }),
    ).toContain("sarah@tubi.tv");
  });

  it("summarizes an external hold", () => {
    expect(
      summarizeApproval("create_external_event", {
        title: "Tubi intro",
        start: "2026-09-08T17:00:00.000Z",
        counterpartyEmail: "sarah@tubi.tv",
      }),
    ).toContain("Tubi intro");
  });
});
