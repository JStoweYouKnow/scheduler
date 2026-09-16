import { isExternalEmail, requiresApproval } from "./approval";
import type { TeamConfig } from "../types";

const team: TeamConfig = {
  studio: "Matriarch",
  phase: 1,
  internalDomains: ["matriarch-studios.com"],
  slackChannel: "#scheduling",
  members: [],
};

describe("approval gates", () => {
  it("treats studio addresses as internal", () => {
    expect(isExternalEmail("v@matriarch-studios.com", team.internalDomains)).toBe(
      false,
    );
  });

  it("treats platform contacts as external", () => {
    expect(isExternalEmail("sarah@tubi.tv", team.internalDomains)).toBe(true);
  });

  it("requires approval for any flagged external request", () => {
    expect(
      requiresApproval({
        isExternal: true,
        counterpartyEmail: "v@matriarch-studios.com",
        team,
      }),
    ).toBe(true);
  });
});
