import type { BusyInterval } from "../types";
import type { CalendarEvent, CalendarEventInput, CalendarPort } from "./port";

interface StoredEvent extends CalendarEvent {
  attendeeEmails: string[];
  owner: string;
}

export class MemoryCalendar implements CalendarPort {
  private events: StoredEvent[] = [];
  private busy: Record<string, BusyInterval[]> = {};

  setBusy(email: string, intervals: BusyInterval[]): void {
    this.busy[email] = intervals;
  }

  async freeBusy(userEmail: string): Promise<BusyInterval[]> {
    const fromCalendar = this.events
      .filter(
        (event) =>
          event.owner === userEmail || event.attendeeEmails.includes(userEmail),
      )
      .map((event) => ({
        start: new Date(event.start),
        end: new Date(event.end),
        source: "calendar" as const,
        label: event.title,
      }));
    return [...(this.busy[userEmail] ?? []), ...fromCalendar];
  }

  async createEvent(userEmail: string, input: CalendarEventInput): Promise<CalendarEvent> {
    const event: StoredEvent = {
      id: `evt_${this.events.length + 1}`,
      calendarId: input.calendarId ?? "primary",
      htmlLink: "https://calendar.google.com/local",
      start: input.start.toISOString(),
      end: input.end.toISOString(),
      title: input.title,
      attendeeEmails: input.attendeeEmails,
      owner: userEmail,
    };
    this.events.push(event);
    return event;
  }

  async updateEvent(
    userEmail: string,
    eventId: string,
    input: Partial<CalendarEventInput> & { calendarId?: string },
  ): Promise<CalendarEvent> {
    const event = this.events.find((item) => item.id === eventId && item.owner === userEmail);
    if (!event) {
      throw new Error(`Event ${eventId} not found for ${userEmail}`);
    }
    if (input.title) event.title = input.title;
    if (input.start) event.start = input.start.toISOString();
    if (input.end) event.end = input.end.toISOString();
    if (input.attendeeEmails) event.attendeeEmails = input.attendeeEmails;
    if (input.calendarId) event.calendarId = input.calendarId;
    return event;
  }

  async listEvents(
    userEmail: string,
    windowStart: Date,
    windowEnd: Date,
  ): Promise<CalendarEvent[]> {
    return this.events.filter((event) => {
      const start = new Date(event.start);
      return (
        (event.owner === userEmail || event.attendeeEmails.includes(userEmail)) &&
        start >= windowStart &&
        start <= windowEnd
      );
    });
  }
}
