import { evaluateSlot, findOpenSlots } from "../rules/engine";
import { loadPersonRules } from "../rules/load";
import { requireMember } from "../config/team";
import type { TeamConfig } from "../types";
import { iso } from "../time";
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

  const slots = findOpenSlots({
    windowStart: args.windowStart,
    windowEnd: args.windowEnd,
    durationMinutes: args.durationMinutes,
    people: people.map((person) => ({
      rules: person.rules,
      calendarBusy: person.calendarBusy,
    })),
    limit: args.limit,
  });

  return {
    users: people.map((person) => person.member.slug),
    durationMinutes: args.durationMinutes,
    slots: slots.map((slot) => ({
      start: iso(slot.start),
      end: iso(slot.end),
      timezone: people[0]?.rules.timezone ?? "America/Los_Angeles",
    })),
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
