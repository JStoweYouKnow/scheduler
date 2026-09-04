import { WEEKDAYS, type TimeOfDay, type Weekday } from "./types";

export function parseTimeOfDay(value: string): TimeOfDay {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid time of day: ${value}`);
  }
  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
  };
}

export function weekdayInTimezone(date: Date, timeZone: string): Weekday {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone,
  }).format(date);
  const map: Record<string, Weekday> = {
    Sun: "sun",
    Mon: "mon",
    Tue: "tue",
    Wed: "wed",
    Thu: "thu",
    Fri: "fri",
    Sat: "sat",
  };
  const key = map[weekday];
  if (!key) {
    throw new Error(`Unknown weekday label: ${weekday}`);
  }
  return key;
}

export function zonedDate(
  date: Date,
  timeZone: string,
  time: TimeOfDay,
): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return fromZonedParts(year, month, day, time.hour, time.minute, timeZone);
}

export function fromZonedParts(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offset = tzOffsetMs(new Date(utcGuess), timeZone);
  const instant = new Date(utcGuess - offset);
  const adjust = tzOffsetMs(instant, timeZone) - offset;
  return new Date(instant.getTime() - adjust);
}

function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  const asUTC = Date.UTC(
    read("year"),
    read("month") - 1,
    read("day"),
    read("hour") === 24 ? 0 : read("hour"),
    read("minute"),
    read("second"),
  );
  return asUTC - date.getTime();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

export function intervalsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

export function expandDays(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const last = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()),
  );
  while (cursor <= last) {
    days.push(new Date(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function weekdayFromUtcDate(date: Date): Weekday {
  const index = date.getUTCDay();
  const day = WEEKDAYS[index];
  if (!day) {
    throw new Error(`Invalid weekday index: ${index}`);
  }
  return day;
}

export function iso(date: Date): string {
  return date.toISOString();
}

export interface CalendarDay {
  year: number;
  month: number;
  day: number;
}

export function calendarDayInZone(date: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  return { year, month, day };
}

export function addCalendarDays(day: CalendarDay, count: number): CalendarDay {
  const utc = new Date(Date.UTC(day.year, day.month - 1, day.day + count));
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

export function calendarDayKey(day: CalendarDay): number {
  return day.year * 10_000 + day.month * 100 + day.day;
}

export function localDayBounds(
  now: Date,
  timeZone: string,
  dayOffset = 0,
): { start: Date; end: Date } {
  const day = addCalendarDays(calendarDayInZone(now, timeZone), dayOffset);
  const start = fromZonedParts(day.year, day.month, day.day, 0, 0, timeZone);
  const next = addCalendarDays(day, 1);
  const end = fromZonedParts(next.year, next.month, next.day, 0, 0, timeZone);
  return { start, end };
}

export function eachCalendarDay(
  start: Date,
  end: Date,
  timeZone: string,
): CalendarDay[] {
  const days: CalendarDay[] = [];
  let cursor = calendarDayInZone(start, timeZone);
  const last = calendarDayInZone(end, timeZone);
  while (calendarDayKey(cursor) <= calendarDayKey(last)) {
    days.push(cursor);
    cursor = addCalendarDays(cursor, 1);
  }
  return days;
}
