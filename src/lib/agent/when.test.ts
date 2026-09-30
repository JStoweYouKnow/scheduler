import { guardEvent, guardFutureInstant, guardWindow } from "./when";

const now = new Date("2026-09-30T17:00:00.000Z");

describe("guardWindow", () => {
  it("rejects a window that ended before now", () => {
    const result = guardWindow(
      "2025-08-19T12:00:00-07:00",
      "2025-08-19T18:00:00-07:00",
      now,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("window_in_past");
    // The model needs the real "now" handed back to it to self-correct.
    expect(result.now).toBe("2026-09-30T17:00:00.000Z");
    expect(result.message).toContain("2026-09-30T17:00:00.000Z");
  });

  it("clamps a partly-elapsed window forward to now", () => {
    const result = guardWindow(
      "2026-09-30T08:00:00.000Z",
      "2026-09-30T23:00:00.000Z",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.clampedToNow).toBe(true);
    expect(result.windowStart.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(result.windowEnd.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });

  it("passes a fully future window through untouched", () => {
    const result = guardWindow(
      "2026-10-06T19:00:00.000Z",
      "2026-10-06T23:00:00.000Z",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.clampedToNow).toBe(false);
    expect(result.windowStart.toISOString()).toBe("2026-10-06T19:00:00.000Z");
  });

  it("rejects unparseable and inverted windows", () => {
    expect(guardWindow("not-a-date", "2026-10-06T23:00:00Z", now).ok).toBe(false);
    const inverted = guardWindow(
      "2026-10-06T23:00:00Z",
      "2026-10-06T19:00:00Z",
      now,
    );
    if (inverted.ok) throw new Error("expected failure");
    expect(inverted.reason).toBe("invalid_timestamp");
  });
});

describe("guardEvent", () => {
  it("refuses to write an event in the past", () => {
    const result = guardEvent(
      "2025-09-02T20:30:00.000Z",
      "2025-09-02T21:00:00.000Z",
      now,
    );
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.reason).toBe("start_in_past");
  });

  it("does not clamp — a concrete slot is accepted or rejected", () => {
    const result = guardEvent(
      "2026-10-06T19:00:00.000Z",
      "2026-10-06T19:30:00.000Z",
      now,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("expected success");
    expect(result.start.toISOString()).toBe("2026-10-06T19:00:00.000Z");
    expect(result.end.toISOString()).toBe("2026-10-06T19:30:00.000Z");
  });

  it("rejects an end at or before the start", () => {
    expect(
      guardEvent("2026-10-06T19:00:00Z", "2026-10-06T19:00:00Z", now).ok,
    ).toBe(false);
  });
});

describe("guardFutureInstant", () => {
  it("rejects the past and accepts the future", () => {
    expect(guardFutureInstant("2025-01-01T00:00:00Z", now).ok).toBe(false);
    expect(guardFutureInstant("2026-10-01T00:00:00Z", now).ok).toBe(true);
  });

  it("treats exactly now as past", () => {
    expect(guardFutureInstant(now.toISOString(), now).ok).toBe(false);
  });
});
