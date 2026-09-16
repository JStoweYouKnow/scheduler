import { emailAllowed } from "./allowlist";

describe("emailAllowed", () => {
  it("accepts studio teammates and internal domains", () => {
    expect(emailAllowed("v@matriarch-studios.com")).toBe(true);
    expect(emailAllowed("j@matriarch.studio")).toBe(true);
  });

  it("rejects outside addresses", () => {
    expect(emailAllowed("someone@gmail.com")).toBe(false);
  });
});
