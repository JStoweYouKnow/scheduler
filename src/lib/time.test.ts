import { fromZonedParts, localDayBounds } from "./time";

describe("local day bounds", () => {
  it("uses the studio timezone, not UTC midnight", () => {
    const now = fromZonedParts(2026, 9, 8, 22, 0, "America/Los_Angeles");
    const tomorrow = localDayBounds(now, "America/Los_Angeles", 1);
    expect(tomorrow.start.toISOString()).toBe(
      fromZonedParts(2026, 9, 9, 0, 0, "America/Los_Angeles").toISOString(),
    );
    expect(tomorrow.end.toISOString()).toBe(
      fromZonedParts(2026, 9, 10, 0, 0, "America/Los_Angeles").toISOString(),
    );
  });
});
