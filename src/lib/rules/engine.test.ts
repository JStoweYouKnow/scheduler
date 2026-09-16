import { MemoryCalendar } from "../calendar/memory";
import { evaluateSlot, findOpenSlots } from "./engine";
import { loadPersonRules, resetRulesCache } from "./load";
import { fromZonedParts } from "../time";
import type { BusyInterval, PersonRules } from "../types";

function inboxRules(): PersonRules {
  return loadPersonRules("v", process.cwd());
}

function cofounderRules(): PersonRules {
  return loadPersonRules("j", process.cwd());
}

function tuesdayMorning(): { start: Date; end: Date } {
  return {
    start: fromZonedParts(2026, 9, 8, 10, 0, "America/Los_Angeles"),
    end: fromZonedParts(2026, 9, 8, 10, 30, "America/Los_Angeles"),
  };
}

beforeEach(() => {
  resetRulesCache();
});

describe("rules engine", () => {
  it("accepts a weekday slot inside working hours", () => {
    const slot = tuesdayMorning();
    const result = evaluateSlot(slot, [
      { rules: inboxRules(), calendarBusy: [] },
      { rules: cofounderRules(), calendarBusy: [] },
    ]);
    expect(result.ok).toBe(true);
  });

  it("rejects lunch as a protected block", () => {
    const slot = {
      start: fromZonedParts(2026, 9, 8, 12, 0, "America/Los_Angeles"),
      end: fromZonedParts(2026, 9, 8, 12, 30, "America/Los_Angeles"),
    };
    const result = evaluateSlot(slot, [{ rules: inboxRules(), calendarBusy: [] }]);
    expect(result.ok).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.source === "protected")).toBe(
      true,
    );
  });

  it("rejects Friday deep-work for V", () => {
    const slot = {
      start: fromZonedParts(2026, 9, 11, 14, 30, "America/Los_Angeles"),
      end: fromZonedParts(2026, 9, 11, 15, 0, "America/Los_Angeles"),
    };
    const result = evaluateSlot(slot, [{ rules: inboxRules(), calendarBusy: [] }]);
    expect(result.ok).toBe(false);
    expect(result.conflicts[0]?.label).toBe("Deep work");
  });

  it("applies buffer minutes around calendar busy", () => {
    const busy: BusyInterval[] = [
      {
        start: fromZonedParts(2026, 9, 8, 10, 30, "America/Los_Angeles"),
        end: fromZonedParts(2026, 9, 8, 11, 0, "America/Los_Angeles"),
        source: "calendar",
        label: "Standup",
      },
    ];
    const slot = tuesdayMorning();
    const result = evaluateSlot(slot, [{ rules: inboxRules(), calendarBusy: busy }]);
    expect(result.ok).toBe(false);
    expect(result.conflicts.some((conflict) => conflict.source === "buffer")).toBe(true);
  });

  it("skips weekends", () => {
    const slot = {
      start: fromZonedParts(2026, 9, 12, 10, 0, "America/Los_Angeles"),
      end: fromZonedParts(2026, 9, 12, 10, 30, "America/Los_Angeles"),
    };
    const result = evaluateSlot(slot, [{ rules: inboxRules(), calendarBusy: [] }]);
    expect(result.ok).toBe(false);
    expect(result.conflicts[0]?.source).toBe("outside_hours");
  });

  it("finds open slots inside the window", () => {
    const windowStart = fromZonedParts(2026, 9, 8, 9, 0, "America/Los_Angeles");
    const windowEnd = fromZonedParts(2026, 9, 8, 18, 0, "America/Los_Angeles");
    const slots = findOpenSlots({
      windowStart,
      windowEnd,
      durationMinutes: 30,
      people: [
        { rules: inboxRules(), calendarBusy: [] },
        { rules: cofounderRules(), calendarBusy: [] },
      ],
      limit: 3,
    });

    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0]?.start.getTime()).toBeGreaterThanOrEqual(windowStart.getTime());
  });

  it("memory calendar records created events as busy", async () => {
    const calendar = new MemoryCalendar();
    await calendar.createEvent("v@matriarch-studios.com", {
      title: "Hold",
      start: fromZonedParts(2026, 9, 8, 11, 0, "America/Los_Angeles"),
      end: fromZonedParts(2026, 9, 8, 11, 30, "America/Los_Angeles"),
      attendeeEmails: ["j@matriarch-studios.com"],
    });
    const busy = await calendar.freeBusy("v@matriarch-studios.com");
    expect(busy).toHaveLength(1);
  });
});
