import { google, type calendar_v3 } from "googleapis";
import { authForEmail, exchangeGoogleCode, googleAuthUrl } from "../google/auth";
import type { BusyInterval } from "../types";
import type { CalendarEvent, CalendarPort } from "./port";

export { exchangeGoogleCode, googleAuthUrl };

function toBusy(items: calendar_v3.Schema$TimePeriod[] | undefined): BusyInterval[] {
  return (items ?? []).flatMap((item) => {
    if (!item.start || !item.end) return [];
    return [
      {
        start: new Date(item.start),
        end: new Date(item.end),
        source: "calendar" as const,
        label: "Busy",
      },
    ];
  });
}

export function createGoogleCalendarPort(): CalendarPort {
  return {
    async freeBusy(userEmail, windowStart, windowEnd) {
      const { client } = await authForEmail(userEmail);
      const calendar = google.calendar({ version: "v3", auth: client });
      const res = await calendar.freebusy.query({
        requestBody: {
          timeMin: windowStart.toISOString(),
          timeMax: windowEnd.toISOString(),
          items: [{ id: userEmail }, { id: "primary" }],
        },
      });
      const calendars = res.data.calendars ?? {};
      return Object.values(calendars).flatMap((cal) => toBusy(cal.busy));
    },

    async createEvent(userEmail, input) {
      const { client, calendarId } = await authForEmail(userEmail);
      const calendar = google.calendar({ version: "v3", auth: client });
      const res = await calendar.events.insert({
        calendarId: input.calendarId ?? calendarId,
        sendUpdates: "all",
        requestBody: {
          summary: input.title,
          description: input.description,
          start: { dateTime: input.start.toISOString() },
          end: { dateTime: input.end.toISOString() },
          attendees: input.attendeeEmails.map((email) => ({ email })),
        },
      });
      return mapEvent(res.data, input.calendarId ?? calendarId);
    },

    async updateEvent(userEmail, eventId, input) {
      const { client, calendarId } = await authForEmail(userEmail);
      const calendar = google.calendar({ version: "v3", auth: client });
      const target = input.calendarId ?? calendarId;
      const res = await calendar.events.patch({
        calendarId: target,
        eventId,
        sendUpdates: "all",
        requestBody: {
          summary: input.title,
          description: input.description,
          start: input.start ? { dateTime: input.start.toISOString() } : undefined,
          end: input.end ? { dateTime: input.end.toISOString() } : undefined,
          attendees: input.attendeeEmails?.map((email) => ({ email })),
        },
      });
      return mapEvent(res.data, target);
    },

    async listEvents(userEmail, windowStart, windowEnd) {
      const { client, calendarId } = await authForEmail(userEmail);
      const calendar = google.calendar({ version: "v3", auth: client });
      const res = await calendar.events.list({
        calendarId,
        timeMin: windowStart.toISOString(),
        timeMax: windowEnd.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
      });
      return (res.data.items ?? []).map((item) => mapEvent(item, calendarId));
    },
  };
}

function mapEvent(event: calendar_v3.Schema$Event, calendarId: string): CalendarEvent {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !start || !end) {
    throw new Error("Calendar event is missing id or times");
  }
  return {
    id: event.id,
    calendarId,
    htmlLink: event.htmlLink ?? undefined,
    start,
    end,
    title: event.summary ?? "(untitled)",
  };
}
