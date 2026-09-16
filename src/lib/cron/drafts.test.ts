import { composeAgenda, composeFollowUp } from "./drafts";

describe("agenda and follow-up drafts", () => {
  it("includes thread history and last meeting notes in the agenda", () => {
    const agenda = composeAgenda({
      title: "Tubi intro",
      when: "Tue 10:00–10:30 PT",
      owner: "V",
      counterparty: "Sarah Chen",
      organization: "Tubi",
      threadExcerpt: "Sarah: next week works if we can do 30 min.",
      lastNotes: "They wanted a one-sheet before pitching.",
    });
    expect(agenda).toContain("Sarah Chen");
    expect(agenda).toContain("Tubi");
    expect(agenda).toContain("one-sheet");
    expect(agenda).toContain("next week works");
  });

  it("writes a follow-up that can be sent after approval", () => {
    const followUp = composeFollowUp({
      title: "Tubi intro",
      when: "Tue 10:00",
      owner: "V",
      counterparty: "Sarah Chen",
      notes: "Walked the slate. They asked for a lookbook.",
    });
    expect(followUp.startsWith("Hi Sarah")).toBe(true);
    expect(followUp).toContain("lookbook");
    expect(followUp).toContain("V");
  });
});
