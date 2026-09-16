import { MemoryCalendar } from "../calendar/memory";
import { MemoryGmail } from "../email/memory";
import { resetTeamConfigCache } from "../config/team";
import { executeApprovedAction } from "./execute-approval";

vi.mock("./repo", () => ({
  getRequest: vi.fn(),
  updateRequestStatus: vi.fn(),
}));

describe("approval execution", () => {
  beforeEach(() => {
    resetTeamConfigCache();
  });

  it("sends a queued email only after approval", async () => {
    const gmail = new MemoryGmail();
    const draft = await gmail.createDraft("v@matriarch-studios.com", {
      to: "sarah@tubi.tv",
      subject: "Times",
      body: "Tuesday at 10?",
    });
    const result = await executeApprovedAction(
      "send_email",
      {
        to: "sarah@tubi.tv",
        subject: "Times",
        body: "Tuesday at 10?",
        draftId: draft.draftId,
      },
      "req-1",
      { gmail },
    );
    expect(result).toMatchObject({ messageId: "msg_1" });
    expect(gmail.sent).toHaveLength(1);
  });

  it("creates the external hold after Slack approval", async () => {
    const calendar = new MemoryCalendar();
    const { updateRequestStatus } = await import("./repo");
    const result = (await executeApprovedAction(
      "create_external_event",
      {
        users: ["v"],
        title: "Tubi intro",
        start: "2026-09-08T17:00:00.000Z",
        end: "2026-09-08T17:30:00.000Z",
        counterpartyEmail: "sarah@tubi.tv",
        requestId: "req-1",
      },
      "req-1",
      { calendar },
    )) as { created: boolean; event: { title: string } };
    expect(result.created).toBe(true);
    expect(result.event.title).toBe("Tubi intro");
    expect(updateRequestStatus).toHaveBeenCalled();
  });
});
