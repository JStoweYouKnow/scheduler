import { z } from "zod";
import { checkSlot, getAvailability } from "../calendar/availability";
import type { CalendarPort } from "../calendar/port";
import { findMember, loadTeamConfig, requireMember } from "../config/team";
import { approvalBlocks, postSlackMessage } from "../slack/client";
import { phaseAllowsEmail, requiresApproval } from "../scheduling/approval";
import {
  createApproval,
  createRequest,
  findRequestByCalendarEvent,
  getRequest,
  listOpenRequests,
  notesForEvent,
  notesForRequest,
  updateRequestStatus,
} from "../scheduling/repo";
import { draftEmail, readThread, sharedInboxEmail } from "../email/gmail";
import type { GmailPort } from "../email/port";
import type { DrivePort } from "../drive/port";
import { calendarPort, drivePort, gmailPort } from "../runtime";
import { resolveMultiPartyConflict } from "../ai/conflicts";
import { dumpMemoryMarkdown } from "../memory/dump";
import { recallFacts, rememberFact } from "../memory/repo";

const usersSchema = z.array(z.string()).min(1);

function isExternalCounterparty(
  email: string | undefined,
  organization: string | undefined,
): boolean {
  const team = loadTeamConfig();
  return requiresApproval({
    isExternal: Boolean(organization && !email),
    counterpartyEmail: email,
    team,
  });
}

export function buildToolHandlers(
  calendar: CalendarPort = calendarPort(),
  gmail: GmailPort = gmailPort(),
  drive: DrivePort = drivePort(),
) {
  return {
    async get_availability(input: {
      users: string[];
      windowStart: string;
      windowEnd: string;
      durationMinutes: number;
    }) {
      const team = loadTeamConfig();
      const result = await getAvailability({
        team,
        calendar,
        users: input.users,
        windowStart: new Date(input.windowStart),
        windowEnd: new Date(input.windowEnd),
        durationMinutes: input.durationMinutes,
      });
      if (result.slots.length === 0 && input.users.length >= 2) {
        const conflictResolution = await resolveMultiPartyConflict({
          users: result.users,
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          durationMinutes: input.durationMinutes,
          conflicts: result.conflicts,
        });
        return { ...result, conflictResolution };
      }
      return result;
    },

    async create_event(input: {
      users: string[];
      title: string;
      start: string;
      end: string;
      counterpartyName?: string;
      counterpartyEmail?: string;
      organization?: string;
      description?: string;
      requestId?: string;
    }) {
      const team = loadTeamConfig();
      const users = usersSchema.parse(input.users);
      const start = new Date(input.start);
      const end = new Date(input.end);
      const evaluation = await checkSlot({
        team,
        calendar,
        users,
        start,
        end,
      });
      if (!evaluation.ok) {
        return {
          created: false,
          reason: "conflict",
          conflicts: evaluation.conflicts,
        };
      }

      const isExternal = isExternalCounterparty(
        input.counterpartyEmail,
        input.organization,
      );

      let request = input.requestId ? await getRequest(input.requestId) : null;
      if (!request) {
        request = await createRequest({
          title: input.title,
          durationMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
          attendeeSlugs: users.map((user) => requireMember(team, user).slug),
          counterpartyName: input.counterpartyName,
          counterpartyEmail: input.counterpartyEmail,
          organization: input.organization,
          isExternal,
          source: "cli",
        });
      }

      if (isExternal) {
        const approval = await createApproval({
          schedulingRequestId: request.id,
          kind: "create_external_event",
          payload: input,
        });
        const channel = process.env.SLACK_CHANNEL ?? team.slackChannel;
        await postSlackMessage({
          channel,
          text: `Approve external hold: ${input.title} with ${input.counterpartyName ?? input.counterpartyEmail}`,
          blocks: approvalBlocks({
            approvalId: approval.id,
            summary: `${input.title}\n${input.start} → ${input.end}\n${input.counterpartyName ?? ""} ${input.counterpartyEmail ?? ""}`,
          }),
        });
        const first = users[0];
        await updateRequestStatus(request.id, "awaiting_reply", {
          proposedSlots: [
            {
              start: input.start,
              end: input.end,
              timezone: first ? requireMember(team, first).timezone : team.members[0]?.timezone ?? "America/Los_Angeles",
            },
          ],
        });
        return {
          created: false,
          pendingApproval: true,
          approvalId: approval.id,
          requestId: request.id,
        };
      }

      const first = users[0];
      if (!first) throw new Error("At least one attendee is required");
      const organizer = requireMember(team, first);
      const attendeeEmails = users.map((user) => requireMember(team, user).email);
      const event = await calendar.createEvent(organizer.email, {
        title: input.title,
        start,
        end,
        attendeeEmails,
        description: input.description,
      });
      await updateRequestStatus(request.id, "confirmed", {
        confirmedSlot: {
          start: input.start,
          end: input.end,
          timezone: organizer.timezone,
        },
        calendarEventId: event.id,
        calendarId: event.calendarId,
      });
      return {
        created: true,
        requestId: request.id,
        event,
      };
    },

    async update_event(input: {
      requestId: string;
      start?: string;
      end?: string;
      title?: string;
    }) {
      const team = loadTeamConfig();
      const request = await getRequest(input.requestId);
      if (!request) throw new Error("Scheduling request not found");
      if (!request.calendarEventId) {
        throw new Error("Request has no calendar event to update");
      }
      const organizerSlug = request.attendeeSlugs[0];
      if (!organizerSlug) throw new Error("Request has no attendees");
      const organizer = requireMember(team, organizerSlug);

      if (input.start && input.end) {
        const evaluation = await checkSlot({
          team,
          calendar,
          users: request.attendeeSlugs,
          start: new Date(input.start),
          end: new Date(input.end),
        });
        if (!evaluation.ok) {
          return { updated: false, reason: "conflict", conflicts: evaluation.conflicts };
        }
      }

      const event = await calendar.updateEvent(
        organizer.email,
        request.calendarEventId,
        {
          calendarId: request.calendarId ?? undefined,
          title: input.title,
          start: input.start ? new Date(input.start) : undefined,
          end: input.end ? new Date(input.end) : undefined,
        },
      );
      await updateRequestStatus(request.id, "confirmed", {
        confirmedSlot:
          input.start && input.end
            ? {
                start: input.start,
                end: input.end,
                timezone: organizer.timezone,
              }
            : request.confirmedSlot,
      });
      return { updated: true, event };
    },

    async lookup_contact(input: { query: string }) {
      const team = loadTeamConfig();
      const member = findMember(team, input.query);
      if (member) {
        return { kind: "internal" as const, member };
      }
      if (!phaseAllowsEmail(team.phase)) {
        return {
          kind: "unknown" as const,
          query: input.query,
          hint: "External contacts are resolved in phase 3 via the shared inbox.",
        };
      }
      const contacts = await gmail.searchContacts(sharedInboxEmail(), input.query);
      if (contacts[0]) {
        return { kind: "external" as const, contact: contacts[0], matches: contacts };
      }
      return {
        kind: "unknown" as const,
        query: input.query,
        hint: "No match in the team list or shared inbox.",
      };
    },

    async get_meeting_context(input: {
      requestId?: string;
      calendarEventId?: string;
    }) {
      const request = input.requestId
        ? await getRequest(input.requestId)
        : input.calendarEventId
          ? await findRequestByCalendarEvent(input.calendarEventId)
          : null;
      const notes = input.calendarEventId
        ? await notesForEvent(input.calendarEventId)
        : request
          ? await notesForRequest(request.id)
          : [];
      let thread: Awaited<ReturnType<typeof readThread>> | null = null;
      if (request?.threadId && phaseAllowsEmail(loadTeamConfig().phase)) {
        try {
          thread = await readThread(request.threadId, gmail);
        } catch {
          thread = null;
        }
      }
      if (!request && !input.calendarEventId && !input.requestId) {
        return { openRequests: await listOpenRequests() };
      }
      return { request, notes, thread };
    },

    async draft_email(input: {
      to: string;
      subject: string;
      body: string;
      threadId?: string;
    }) {
      const team = loadTeamConfig();
      if (!phaseAllowsEmail(team.phase)) {
        return {
          drafted: false,
          gated: true,
          message: "draft_email is phase 3. Stay on Slack/CLI for internal scheduling.",
        };
      }
      return draftEmail(input, gmail);
    },

    async send_email(input: {
      to: string;
      subject: string;
      body: string;
      draftId?: string;
    }) {
      const team = loadTeamConfig();
      if (!phaseAllowsEmail(team.phase)) {
        return {
          sent: false,
          gated: true,
          message: "send_email is phase 3 and always approval-gated.",
        };
      }
      const approval = await createApproval({
        kind: "send_email",
        payload: input,
      });
      const channel = process.env.SLACK_CHANNEL ?? team.slackChannel;
      await postSlackMessage({
        channel,
        text: `Approve outbound email to ${input.to}`,
        blocks: approvalBlocks({
          approvalId: approval.id,
          summary: `To: ${input.to}\nSubject: ${input.subject}\n\n${input.body.slice(0, 500)}`,
        }),
      });
      return {
        sent: false,
        pendingApproval: true,
        approvalId: approval.id,
        nextStep: "Approve on the dashboard or CLI (--approve <id>).",
      };
    },

    async read_thread(input: { threadId: string }) {
      const team = loadTeamConfig();
      if (!phaseAllowsEmail(team.phase)) {
        return {
          gated: true,
          message: "read_thread is phase 3 (shared inbox).",
        };
      }
      return readThread(input.threadId, gmail);
    },

    async search_drive(input: { query: string; limit?: number }) {
      return drive.search(input.query, input.limit ?? 5);
    },

    async remember(input: {
      kind: string;
      subject: string;
      fact: string;
    }) {
      return rememberFact(input);
    },

    async recall(input: { query: string }) {
      return recallFacts(input.query);
    },

    async dump_memory() {
      return dumpMemoryMarkdown();
    },

    async create_scheduling_request(input: {
      title: string;
      users: string[];
      durationMinutes: number;
      counterpartyName?: string;
      counterpartyEmail?: string;
      organization?: string;
      windowStart?: string;
      windowEnd?: string;
      notes?: string;
    }) {
      const team = loadTeamConfig();
      const isExternal = isExternalCounterparty(
        input.counterpartyEmail,
        input.organization,
      );
      return createRequest({
        title: input.title,
        durationMinutes: input.durationMinutes,
        attendeeSlugs: input.users.map((user) => requireMember(team, user).slug),
        counterpartyName: input.counterpartyName,
        counterpartyEmail: input.counterpartyEmail,
        organization: input.organization,
        isExternal,
        constraints: {
          windowStart: input.windowStart,
          windowEnd: input.windowEnd,
          notes: input.notes,
        },
        source: "cli",
      });
    },
  };
}

export const toolInputSchemas = {
  get_availability: z.object({
    users: z.array(z.string()).min(1),
    windowStart: z.string().describe("ISO timestamp"),
    windowEnd: z.string().describe("ISO timestamp"),
    durationMinutes: z.number().int().positive().default(30),
  }),
  create_event: z.object({
    users: z.array(z.string()).min(1),
    title: z.string(),
    start: z.string(),
    end: z.string(),
    counterpartyName: z.string().optional(),
    counterpartyEmail: z.string().optional(),
    organization: z.string().optional(),
    description: z.string().optional(),
    requestId: z.string().optional(),
  }),
  update_event: z.object({
    requestId: z.string(),
    start: z.string().optional(),
    end: z.string().optional(),
    title: z.string().optional(),
  }),
  lookup_contact: z.object({
    query: z.string(),
  }),
  get_meeting_context: z.object({
    requestId: z.string().optional(),
    calendarEventId: z.string().optional(),
  }),
  draft_email: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    threadId: z.string().optional(),
  }),
  send_email: z.object({
    to: z.string(),
    subject: z.string(),
    body: z.string(),
    draftId: z.string().optional(),
  }),
  read_thread: z.object({
    threadId: z.string(),
  }),
  create_scheduling_request: z.object({
    title: z.string(),
    users: z.array(z.string()).min(1),
    durationMinutes: z.number().int().positive().default(30),
    counterpartyName: z.string().optional(),
    counterpartyEmail: z.string().optional(),
    organization: z.string().optional(),
    windowStart: z.string().optional(),
    windowEnd: z.string().optional(),
    notes: z.string().optional(),
  }),
  search_drive: z.object({
    query: z.string(),
    limit: z.number().int().positive().optional(),
  }),
  remember: z.object({
    kind: z.string().describe("person | project | decision | commitment | preference"),
    subject: z.string(),
    fact: z.string(),
  }),
  recall: z.object({
    query: z.string(),
  }),
  dump_memory: z.object({}),
};
