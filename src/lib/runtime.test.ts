import { MemoryResearch } from "./research/memory";
import { researchPort, resetDemoPorts } from "./runtime";

beforeEach(() => {
  resetDemoPorts();
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetDemoPorts();
});

describe("researchPort selection", () => {
  it("uses seeded results in demo mode when no Tavily key is set", () => {
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("TAVILY_API_KEY", "");
    expect(researchPort()).toBeInstanceOf(MemoryResearch);
  });

  it("uses real Tavily in demo mode once a key is present", () => {
    // The hosted demo must run DEMO_MODE=1, so if demo always faked research
    // the real Tavily path would never run anywhere a judge could see it.
    vi.stubEnv("DEMO_MODE", "1");
    vi.stubEnv("TAVILY_API_KEY", "tvly-test");
    expect(researchPort()).not.toBeInstanceOf(MemoryResearch);
  });

  it("uses real Tavily outside demo mode", () => {
    vi.stubEnv("DEMO_MODE", "");
    vi.stubEnv("TAVILY_API_KEY", "tvly-test");
    expect(researchPort()).not.toBeInstanceOf(MemoryResearch);
  });
});
