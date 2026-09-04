import {
  addCalendarDays,
  addMinutes,
  eachCalendarDay,
  fromZonedParts,
  intervalsOverlap,
  iso,
  parseTimeOfDay,
  weekdayInTimezone,
} from "../time";
import type {
  BusyInterval,
  Conflict,
  PersonRules,
  Slot,
  SlotEvaluation,
} from "../types";

const STEP_MINUTES = 15;

export function expandRuleBlocks(
  rules: PersonRules,
  windowStart: Date,
  windowEnd: Date,
): BusyInterval[] {
  const blocks: BusyInterval[] = [];

  for (const calendarDay of eachCalendarDay(windowStart, windowEnd, rules.timezone)) {
    const noon = fromZonedParts(
      calendarDay.year,
      calendarDay.month,
      calendarDay.day,
      12,
      0,
      rules.timezone,
    );
    const day = weekdayInTimezone(noon, rules.timezone);
    const hours = rules.workingHours[day];
    const dayStart = fromZonedParts(
      calendarDay.year,
      calendarDay.month,
      calendarDay.day,
      0,
      0,
      rules.timezone,
    );
    const next = addCalendarDays(calendarDay, 1);
    const nextDay = fromZonedParts(next.year, next.month, next.day, 0, 0, rules.timezone);

    if (!hours) {
      blocks.push({
        start: dayStart,
        end: nextDay,
        source: "outside_hours",
        label: "Non-working day",
      });
    } else {
      const workStart = fromZonedParts(
        calendarDay.year,
        calendarDay.month,
        calendarDay.day,
        parseTimeOfDay(hours.start).hour,
        parseTimeOfDay(hours.start).minute,
        rules.timezone,
      );
      const workEnd = fromZonedParts(
        calendarDay.year,
        calendarDay.month,
        calendarDay.day,
        parseTimeOfDay(hours.end).hour,
        parseTimeOfDay(hours.end).minute,
        rules.timezone,
      );
      if (dayStart < workStart) {
        blocks.push({
          start: dayStart,
          end: workStart,
          source: "outside_hours",
          label: "Before working hours",
        });
      }
      if (workEnd < nextDay) {
        blocks.push({
          start: workEnd,
          end: nextDay,
          source: "outside_hours",
          label: "After working hours",
        });
      }
    }

    for (const block of rules.protectedBlocks) {
      if (!block.days.includes(day)) continue;
      const start = parseTimeOfDay(block.start);
      const end = parseTimeOfDay(block.end);
      blocks.push({
        start: fromZonedParts(
          calendarDay.year,
          calendarDay.month,
          calendarDay.day,
          start.hour,
          start.minute,
          rules.timezone,
        ),
        end: fromZonedParts(
          calendarDay.year,
          calendarDay.month,
          calendarDay.day,
          end.hour,
          end.minute,
          rules.timezone,
        ),
        source: "protected",
        label: block.label,
      });
    }
  }

  return blocks.filter((block) =>
    intervalsOverlap(block.start, block.end, windowStart, windowEnd),
  );
}

export function withBuffers(
  calendarBusy: BusyInterval[],
  bufferMinutes: number,
): BusyInterval[] {
  if (bufferMinutes <= 0) return calendarBusy;
  return calendarBusy.flatMap((busy) => {
    const buffered: BusyInterval[] = [busy];
    if (busy.source === "calendar") {
      buffered.push({
        start: addMinutes(busy.start, -bufferMinutes),
        end: busy.start,
        source: "buffer",
        label: `${bufferMinutes}m buffer before`,
      });
      buffered.push({
        start: busy.end,
        end: addMinutes(busy.end, bufferMinutes),
        source: "buffer",
        label: `${bufferMinutes}m buffer after`,
      });
    }
    return buffered;
  });
}

export function evaluateSlotForPerson(
  slot: Slot,
  rules: PersonRules,
  calendarBusy: BusyInterval[],
): SlotEvaluation {
  const windowStart = addMinutes(slot.start, -rules.bufferMinutes);
  const windowEnd = addMinutes(slot.end, rules.bufferMinutes);
  const ruleBusy = expandRuleBlocks(rules, windowStart, windowEnd);
  const busy = [...withBuffers(calendarBusy, rules.bufferMinutes), ...ruleBusy];
  const conflicts: Conflict[] = [];

  for (const interval of busy) {
    if (intervalsOverlap(slot.start, slot.end, interval.start, interval.end)) {
      conflicts.push({
        user: rules.slug,
        source: interval.source,
        label: interval.label,
        start: iso(interval.start),
        end: iso(interval.end),
      });
    }
  }

  return { ok: conflicts.length === 0, conflicts };
}

export function evaluateSlot(
  slot: Slot,
  people: Array<{ rules: PersonRules; calendarBusy: BusyInterval[] }>,
): SlotEvaluation {
  const evaluations = people.map((person) =>
    evaluateSlotForPerson(slot, person.rules, person.calendarBusy),
  );
  return {
    ok: evaluations.every((evaluation) => evaluation.ok),
    conflicts: evaluations.flatMap((evaluation) => evaluation.conflicts),
  };
}

export function findOpenSlots(args: {
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  people: Array<{ rules: PersonRules; calendarBusy: BusyInterval[] }>;
  limit?: number;
}): Slot[] {
  const { windowStart, windowEnd, durationMinutes, people, limit = 8 } = args;
  const slots: Slot[] = [];
  let cursor = snapUp(windowStart, STEP_MINUTES);

  while (addMinutes(cursor, durationMinutes) <= windowEnd && slots.length < limit) {
    const slot = { start: cursor, end: addMinutes(cursor, durationMinutes) };
    const result = evaluateSlot(slot, people);
    if (result.ok) {
      slots.push(slot);
    }
    cursor = addMinutes(cursor, STEP_MINUTES);
  }

  return slots;
}

function snapUp(date: Date, minutes: number): Date {
  const ms = minutes * 60_000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

export function highestPriority(people: PersonRules[]): PersonRules | undefined {
  return [...people].sort((a, b) => b.priority - a.priority)[0];
}
