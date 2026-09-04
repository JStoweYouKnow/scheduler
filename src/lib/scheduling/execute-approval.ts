import { checkSlot } from "../calendar/availability";
import { createGoogleCalendarPort } from "../calendar/google";
import type { CalendarPort } from "../calendar/port";
import { loadTeamConfig, requireMember } from "../config/team";
import { createGoogleGmailPort, sendEmail } from "../email/gmail";
import type { GmailPort } from "../email/port";
import { getRequest, updateRequestStatus } from "./repo";

export async function executeApprovedAction(
  kind: string,
  payload: unknown,
  schedulingRequestId?: string | null,
  deps: { calendar?: CalendarPort; gmail?: GmailPort } = {},
): Promise<unknown> {
  if (kind === "send_email") {
    const input = payload as {
      to: string;
      subject: string;
      body: string;
      draftId?: string;
      threadId?: string;
    };
    return sendEmail(input, deps.gmail ?? createGoogleGmailPort());
  }

  if (kind === "create_external_event") {
    const input = payload as {
      users: string[];
      title: string;
      start: string;
      end: string;
      counterpartyEmail?: string;
      description?: string;
      requestId?: string;
    };
    const team = loadTeamConfig();
    const calendar = deps.calendar ?? createGoogleCalendarPort();
    const start = new Date(input.start);
    const end = new Date(input.end);
    const evaluation = await checkSlot({
      team,
      calendar,
      users: input.users,
      start,
      end,
    });
    if (!evaluation.ok) {
      return { created: false, reason: "conflict", conflicts: evaluation.conflicts };
    }
    const first = input.users[0];
    if (!first) throw new Error("Approved event is missing attendees");
    const organizer = requireMember(team, first);
    const emails = [
      ...input.users.map((user) => requireMember(team, user).email),
      ...(input.counterpartyEmail ? [input.counterpartyEmail] : []),
    ];
    const event = await calendar.createEvent(organizer.email, {
      title: input.title,
      start,
      end,
      attendeeEmails: emails,
      description: input.description,
    });
    const requestId = schedulingRequestId ?? input.requestId;
    if (requestId) {
      await updateRequestStatus(requestId, "confirmed", {
        confirmedSlot: {
          start: input.start,
          end: input.end,
          timezone: organizer.timezone,
        },
        calendarEventId: event.id,
        calendarId: event.calendarId,
      });
    }
    return { created: true, event, requestId };
  }

  if (kind === "update_external_event") {
    const requestId = schedulingRequestId;
    if (!requestId) throw new Error("Missing scheduling request for update");
    const request = await getRequest(requestId);
    if (!request?.calendarEventId) throw new Error("No calendar event to update");
    const input = payload as { start?: string; end?: string; title?: string };
    const team = loadTeamConfig();
    const organizerSlug = request.attendeeSlugs[0];
    if (!organizerSlug) throw new Error("Request has no attendees");
    const organizer = requireMember(team, organizerSlug);
    const calendar = deps.calendar ?? createGoogleCalendarPort();
    const event = await calendar.updateEvent(organizer.email, request.calendarEventId, {
      calendarId: request.calendarId ?? undefined,
      title: input.title,
      start: input.start ? new Date(input.start) : undefined,
      end: input.end ? new Date(input.end) : undefined,
    });
    if (input.start && input.end) {
      await updateRequestStatus(request.id, "confirmed", {
        confirmedSlot: {
          start: input.start,
          end: input.end,
          timezone: organizer.timezone,
        },
      });
    }
    return { updated: true, event };
  }

  throw new Error(`Unknown approval kind: ${kind}`);
}
