import type { TeamConfig } from "../types";
import { systemPrompt } from "./prompt";

const team = {
  studio: "Matriarch",
  phase: 3,
  internalDomains: ["matriarch-studios.com"],
  members: [
    {
      slug: "v",
      name: "V",
      email: "v@matriarch-studios.com",
      timezone: "America/Los_Angeles",
    },
    {
      slug: "j",
      name: "J",
      email: "j@matriarch-studios.com",
      timezone: "America/New_York",
    },
  ],
} as TeamConfig;

describe("systemPrompt", () => {
  const now = new Date("2026-09-30T17:00:00.000Z");

  it("grounds the model in the current UTC instant", () => {
    expect(systemPrompt(team, now)).toContain("2026-09-30T17:00:00.000Z");
  });

  it("gives each member's local wall clock and weekday", () => {
    const text = systemPrompt(team, now);
    // 17:00 UTC is 10:00 in LA and 13:00 in NY, both Wednesday.
    expect(text).toContain("America/Los_Angeles: Wednesday, Sep 30, 2026, 10:00");
    expect(text).toContain("America/New_York: Wednesday, Sep 30, 2026, 13:00");
  });

  it("tells the model its own sense of the date is unusable", () => {
    const text = systemPrompt(team, now);
    expect(text).toContain("your own sense of the date is stale");
    expect(text).toMatch(/Next <weekday>|next occurrence strictly after today/);
  });

  it("defaults to the real clock", () => {
    const before = Date.now();
    const text = systemPrompt(team);
    const stamped = /UTC: (\S+)/.exec(text)?.[1];
    expect(stamped).toBeTruthy();
    expect(new Date(stamped!).getTime()).toBeGreaterThanOrEqual(before - 1000);
  });
});
