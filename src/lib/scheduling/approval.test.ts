import { isExternalEmail, requiresApproval } from "./approval";
import type { TeamConfig } from "../types";

const team: TeamConfig = {
  studio: "Matriarch",
  phase: 1,
  internalDomains: ["matriarch.studio"],
  slackChannel: "#scheduling",
  members: [],
};

describe("approval gates", () => {
  it("treats studio addresses as internal", () => {
    expect(isExternalEmail("vera@matriarch.studio", team.internalDomains)).toBe(
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
        counterpartyEmail: "vera@matriarch.studio",
        team,
      }),
    ).toBe(true);
  });
});
