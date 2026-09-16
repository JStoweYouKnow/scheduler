import { emailFromIdToken } from "./auth";

function fakeIdToken(payload: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none" })}.${encode(payload)}.sig`;
}

describe("emailFromIdToken", () => {
  it("reads email from the JWT payload", () => {
    expect(emailFromIdToken(fakeIdToken({ email: "v@matriarch-studios.com" }))).toBe(
      "v@matriarch-studios.com",
    );
  });

  it("returns undefined for missing or invalid tokens", () => {
    expect(emailFromIdToken(undefined)).toBeUndefined();
    expect(emailFromIdToken("not-a-jwt")).toBeUndefined();
    expect(emailFromIdToken(fakeIdToken({ sub: "123" }))).toBeUndefined();
  });
});
