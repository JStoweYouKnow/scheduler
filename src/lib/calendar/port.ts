import type { BusyInterval } from "../types";

export interface CalendarEventInput {
  title: string;
  start: Date;
  end: Date;
  attendeeEmails: string[];
  description?: string;
  calendarId?: string;
}

export interface CalendarEvent {
  id: string;
  calendarId: string;
  htmlLink?: string;
  start: string;
  end: string;
  title: string;
}

export interface CalendarPort {
  freeBusy(
    userEmail: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<BusyInterval[]>;
  createEvent(userEmail: string, input: CalendarEventInput): Promise<CalendarEvent>;
  updateEvent(
    userEmail: string,
    eventId: string,
    input: Partial<CalendarEventInput> & { calendarId?: string },
  ): Promise<CalendarEvent>;
  listEvents(
    userEmail: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<CalendarEvent[]>;
}
