import { canTransition, IllegalTransitionError, assertTransition } from "./state-machine";

describe("scheduling state machine", () => {
  it("allows proposing → awaiting_reply → confirmed", () => {
    expect(canTransition("proposing", "awaiting_reply")).toBe(true);
    expect(canTransition("awaiting_reply", "confirmed")).toBe(true);
  });

  it("allows confirmed → rescheduling → proposing", () => {
    expect(canTransition("confirmed", "rescheduling")).toBe(true);
    expect(canTransition("rescheduling", "proposing")).toBe(true);
  });

  it("blocks cancelled from leaving the terminal state", () => {
    expect(canTransition("cancelled", "proposing")).toBe(false);
    expect(() => assertTransition("cancelled", "confirmed")).toThrow(
      IllegalTransitionError,
    );
  });

  it("blocks confirmed → proposing without rescheduling", () => {
    expect(canTransition("confirmed", "proposing")).toBe(false);
  });
});
