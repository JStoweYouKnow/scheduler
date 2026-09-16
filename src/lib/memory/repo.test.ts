import { rememberFact, recallFacts } from "./repo";
import { resetDemoStore } from "../demo/store";

describe("memory remember/recall", () => {
  beforeEach(() => {
    process.env.DEMO_MODE = "1";
    delete process.env.DATABASE_URL;
    resetDemoStore();
  });

  it("stores a fact and finds it", async () => {
    await rememberFact({
      kind: "preference",
      subject: "Sarah Chen",
      fact: "Prefers afternoon slots",
    });
    const hits = await recallFacts("afternoon");
    expect(hits.some((fact) => fact.fact.includes("afternoon"))).toBe(true);
  });
});
