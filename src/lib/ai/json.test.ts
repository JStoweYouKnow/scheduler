import { parseJsonObject } from "./json";

describe("parseJsonObject", () => {
  it("reads a fenced object", () => {
    expect(parseJsonObject<{ a: number }>("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("reads an object buried in prose", () => {
    expect(parseJsonObject<{ ok: boolean }>("Sure.\n{\"ok\":true}\nDone.")).toEqual({
      ok: true,
    });
  });
});
