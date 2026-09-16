import { evaluateSlot, findOpenSlots } from "../rules/engine";
import { loadPersonRules } from "../rules/load";
import { requireMember } from "../config/team";
import type { Conflict, TeamConfig } from "../types";
import { addMinutes, iso } from "../time";
import type { CalendarPort } from "./port";

export async function getAvailability(args: {
  team: TeamConfig;
  calendar: CalendarPort;
  users: string[];
  windowStart: Date;
  windowEnd: Date;
  durationMinutes: number;
  limit?: number;
}) {
  const people = await Promise.all(
    args.users.map(async (hint) => {
      const member = requireMember(args.team, hint);
      const rules = loadPersonRules(member.slug);
      const calendarBusy = await args.calendar.freeBusy(
        member.email,
        args.windowStart,
        args.windowEnd,
      );
      return { member, rules, calendarBusy };
    }),
  );

  const enginePeople = people.map((person) => ({
    rules: person.rules,
    calendarBusy: person.calendarBusy,
  }));
  const slots = findOpenSlots({
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    durationMinutes: args.durationMinutes,
    people: enginePeople,
    limit: args.limit,
  });

  const conflicts: Conflict[] = [];
  if (slots.length === 0) {
    let cursor = args.windowStart;
    for (let i = 0; i < 6 && addMinutes(cursor, args.durationMinutes) <= args.windowEnd; i += 1) {
      const evaluation = evaluateSlot(
        { start: cursor, end: addMinutes(cursor, args.durationMinutes) },
        enginePeople,
      );
      conflicts.push(...evaluation.conflicts);
      cursor = addMinutes(cursor, 60);
    }
  }

  return {
    users: people.map((person) => person.member.slug),
    durationMinutes: args.durationMinutes,
    slots: slots.map((slot) => ({
      start: iso(slot.start),
      end: iso(slot.end),
      timezone: people[0]?.rules.timezone ?? "America/Los_Angeles",
    })),
    conflicts,
  };
}

export async function checkSlot(args: {
  team: TeamConfig;
  calendar: CalendarPort;
  users: string[];
  start: Date;
  end: Date;
}) {
  const people = await Promise.all(
    args.users.map(async (hint) => {
      const member = requireMember(args.team, hint);
      const rules = loadPersonRules(member.slug);
      const calendarBusy = await args.calendar.freeBusy(
        member.email,
        args.start,
        args.end,
      );
      return { rules, calendarBusy };
    }),
  );
  return evaluateSlot({ start: args.start, end: args.end }, people);
}
