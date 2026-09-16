import type { CalendarEvent, CalendarPort } from "../calendar/port";
import { loadTeamConfig } from "../config/team";
import { sharedInboxEmail } from "../email/gmail";
import type { GmailPort } from "../email/port";
import { calendarPort, gmailPort } from "../runtime";
import { phaseAllowsAgenda, phaseAllowsEmail } from "../scheduling/approval";
import {
  findRequestByCalendarEvent,
  findRequestsByCounterparty,
  notesForEvent,
  notesForRequest,
  saveNotes,
} from "../scheduling/repo";
import { approvalBlocks, postSlackMessage } from "../slack/client";
import { createApproval } from "../scheduling/repo";
import { localDayBounds } from "../time";
import { composeAgendaDraft, composeFollowUpDraft } from "./drafts";

export interface AgendaDeps {
  calendar?: CalendarPort;
  gmail?: GmailPort;
}

function teamTimezone(): string {
  const team = loadTeamConfig();
  return team.members[0]?.timezone ?? "America/Los_Angeles";
}

async function threadExcerpt(gmail: GmailPort | undefined, threadId: string | null) {
  if (!gmail || !threadId) return null;
  try {
    const messages = await gmail.readThread(sharedInboxEmail(), threadId);
    return messages
      .slice(-3)
      .map((message) => `${message.from}: ${message.body || message.snippet}`)
      .join("\n")
      .slice(0, 1500);
  } catch {
    return null;
  }
}

async function lastNotesForEvent(event: CalendarEvent) {
  const direct = await notesForEvent(event.id);
  const fromEvent = direct.find((note) => note.notes)?.notes;
  if (fromEvent) return fromEvent;
  const request = await findRequestByCalendarEvent(event.id);
  if (request?.counterpartyEmail) {
    const prior = await findRequestsByCounterparty(request.counterpartyEmail);
    for (const item of prior) {
      if (item.id === request.id) continue;
      const notes = await notesForRequest(item.id);
      const found = notes.find((note) => note.notes)?.notes;
      if (found) return found;
    }
  }
  return direct.find((note) => note.agendaDraft)?.agendaDraft ?? null;
}

export async function runAgendaCron(
  now = new Date(),
  deps: AgendaDeps = {},
): Promise<{ drafted: number }> {
  const team = loadTeamConfig();
  if (!phaseAllowsAgenda(team.phase)) {
    return { drafted: 0 };
  }

  const { start, end } = localDayBounds(now, teamTimezone(), 1);
  const calendar = deps.calendar ?? calendarPort();
  const gmail = deps.gmail ?? (phaseAllowsEmail(team.phase) ? gmailPort() : undefined);
  let drafted = 0;

  for (const member of team.members) {
    const events = await calendar.listEvents(member.email, start, end);
    for (const event of events) {
      const existing = await notesForEvent(event.id);
      if (existing.some((note) => note.agendaDraft)) continue;
      const request = await findRequestByCalendarEvent(event.id);
      const excerpt = await threadExcerpt(gmail, request?.threadId ?? null);
      const lastNotes = await lastNotesForEvent(event);
      const agenda = await composeAgendaDraft({
        title: event.title,
        when: `${event.start} → ${event.end}`,
        owner: member.name,
        counterparty: request?.counterpartyName ?? request?.counterpartyEmail,
        organization: request?.organization,
        threadExcerpt: excerpt,
        lastNotes,
      });
      await saveNotes({
        schedulingRequestId: request?.id,
        calendarEventId: event.id,
        agendaDraft: agenda,
      });
      await postSlackMessage({
        channel: process.env.SLACK_CHANNEL ?? team.slackChannel,
        text: agenda,
      });
      drafted += 1;
    }
  }

  return { drafted };
}

export async function runFollowUpCron(
  now = new Date(),
  deps: AgendaDeps = {},
): Promise<{ drafted: number }> {
  const team = loadTeamConfig();
  if (!phaseAllowsAgenda(team.phase)) {
    return { drafted: 0 };
  }

  const { start } = localDayBounds(now, teamTimezone(), 0);
  const calendar = deps.calendar ?? calendarPort();
  const gmail = deps.gmail ?? (phaseAllowsEmail(team.phase) ? gmailPort() : undefined);
  let drafted = 0;

  for (const member of team.members) {
    const events = await calendar.listEvents(member.email, start, now);
    for (const event of events) {
      if (new Date(event.end) > now) continue;
      const existing = await notesForEvent(event.id);
      if (existing.some((note) => note.followUpDraft)) continue;
      const request = await findRequestByCalendarEvent(event.id);
      const excerpt = await threadExcerpt(gmail, request?.threadId ?? null);
      const notes = existing.find((note) => note.notes)?.notes ?? excerpt;
      const followUp = await composeFollowUpDraft({
        title: event.title,
        when: `${event.start} → ${event.end}`,
        owner: member.name,
        counterparty: request?.counterpartyName ?? request?.counterpartyEmail,
        notes,
        threadExcerpt: excerpt,
      });
      await saveNotes({
        schedulingRequestId: request?.id,
        calendarEventId: event.id,
        followUpDraft: followUp,
      });
      const channel = process.env.SLACK_CHANNEL ?? team.slackChannel;
      if (phaseAllowsEmail(team.phase) && request?.isExternal && request.counterpartyEmail && gmail) {
        const draft = await gmail.createDraft(sharedInboxEmail(), {
          to: request.counterpartyEmail,
          subject: `Follow-up: ${event.title}`,
          body: followUp,
          threadId: request.threadId ?? undefined,
        });
        const approval = await createApproval({
          schedulingRequestId: request.id,
          kind: "send_email",
          payload: {
            to: request.counterpartyEmail,
            subject: `Follow-up: ${event.title}`,
            body: followUp,
            draftId: draft.draftId,
            threadId: request.threadId,
          },
        });
        await postSlackMessage({
          channel,
          text: `Follow-up draft for ${event.title}`,
          blocks: approvalBlocks({
            approvalId: approval.id,
            summary: `Follow-up to ${request.counterpartyEmail}\n\n${followUp.slice(0, 500)}`,
          }),
        });
      } else {
        await postSlackMessage({ channel, text: followUp });
      }
      drafted += 1;
    }
  }

  return { drafted };
}
