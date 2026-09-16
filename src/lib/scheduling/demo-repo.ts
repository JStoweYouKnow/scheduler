import { assertTransition, isSchedulingStatus } from "./state-machine";
import type { ProposedSlot, SchedulingStatus } from "../types";
import {
  demoStore,
  newId,
  seedDemoMemory,
  type ApprovalRow,
  type CreateRequestInput,
  type InboundRow,
  type NotesRow,
  type RequestRow,
} from "../demo/store";

function store() {
  seedDemoMemory();
  return demoStore();
}

export async function createRequest(input: CreateRequestInput): Promise<RequestRow> {
  const now = new Date();
  const row: RequestRow = {
    id: newId(),
    status: "proposing",
    title: input.title,
    durationMinutes: input.durationMinutes,
    counterpartyName: input.counterpartyName ?? null,
    counterpartyEmail: input.counterpartyEmail ?? null,
    organization: input.organization ?? null,
    isExternal: input.isExternal,
    attendeeSlugs: input.attendeeSlugs,
    proposedSlots: input.proposedSlots ?? [],
    confirmedSlot: null,
    constraints: input.constraints ?? {},
    threadId: null,
    slackChannel: input.slackChannel ?? null,
    slackThreadTs: input.slackThreadTs ?? null,
    calendarEventId: null,
    calendarId: null,
    source: input.source,
    createdBySlug: input.createdBySlug ?? null,
    createdAt: now,
    updatedAt: now,
  };
  store().requests.unshift(row);
  return row;
}

export async function getRequest(id: string): Promise<RequestRow | null> {
  return store().requests.find((row) => row.id === id) ?? null;
}

export async function listOpenRequests(): Promise<RequestRow[]> {
  return store().requests.filter((row) =>
    ["proposing", "awaiting_reply", "rescheduling"].includes(row.status),
  );
}

export async function listRecentRequests(limit = 20): Promise<RequestRow[]> {
  return store().requests.slice(0, limit);
}

export async function updateRequestStatus(
  id: string,
  to: SchedulingStatus,
  patch: Partial<{
    proposedSlots: ProposedSlot[];
    confirmedSlot: ProposedSlot | null;
    threadId: string | null;
    calendarEventId: string | null;
    calendarId: string | null;
    slackChannel: string | null;
    slackThreadTs: string | null;
  }> = {},
): Promise<RequestRow | undefined> {
  const existing = await getRequest(id);
  if (!existing) throw new Error(`Scheduling request ${id} not found`);
  if (!isSchedulingStatus(existing.status)) {
    throw new Error(`Corrupt status on ${id}: ${existing.status}`);
  }
  assertTransition(existing.status, to);
  Object.assign(existing, patch, { status: to, updatedAt: new Date() });
  return existing;
}

export async function createApproval(args: {
  schedulingRequestId?: string;
  kind: string;
  payload: unknown;
  slackChannel?: string;
  slackMessageTs?: string;
}): Promise<ApprovalRow> {
  const row: ApprovalRow = {
    id: newId(),
    schedulingRequestId: args.schedulingRequestId ?? null,
    kind: args.kind,
    payload: args.payload,
    status: "pending",
    slackChannel: args.slackChannel ?? null,
    slackMessageTs: args.slackMessageTs ?? null,
    decidedBy: null,
    decidedAt: null,
    createdAt: new Date(),
  };
  store().approvals.unshift(row);
  return row;
}

export async function listPendingApprovals(limit = 50): Promise<ApprovalRow[]> {
  return store()
    .approvals.filter((row) => row.status === "pending")
    .slice(0, limit);
}

export async function decideApproval(
  id: string,
  decision: "approved" | "rejected",
  decidedBy: string,
): Promise<ApprovalRow | null> {
  const row = store().approvals.find((item) => item.id === id && item.status === "pending");
  if (!row) return null;
  row.status = decision;
  row.decidedBy = decidedBy;
  row.decidedAt = new Date();
  return row;
}

export async function getApproval(id: string): Promise<ApprovalRow | null> {
  return store().approvals.find((row) => row.id === id) ?? null;
}

export async function saveNotes(args: {
  schedulingRequestId?: string;
  calendarEventId?: string;
  notes?: string;
  agendaDraft?: string;
  followUpDraft?: string;
}): Promise<NotesRow> {
  const row: NotesRow = {
    id: newId(),
    schedulingRequestId: args.schedulingRequestId ?? null,
    calendarEventId: args.calendarEventId ?? null,
    notes: args.notes ?? null,
    agendaDraft: args.agendaDraft ?? null,
    followUpDraft: args.followUpDraft ?? null,
    createdAt: new Date(),
  };
  store().notes.unshift(row);
  return row;
}

export async function notesForEvent(calendarEventId: string): Promise<NotesRow[]> {
  return store().notes.filter((row) => row.calendarEventId === calendarEventId);
}

export async function notesForRequest(requestId: string): Promise<NotesRow[]> {
  return store().notes.filter((row) => row.schedulingRequestId === requestId);
}

export async function findRequestByCalendarEvent(calendarEventId: string): Promise<RequestRow | null> {
  return store().requests.find((row) => row.calendarEventId === calendarEventId) ?? null;
}

export async function findRequestsByCounterparty(email: string): Promise<RequestRow[]> {
  return store().requests.filter((row) => row.counterpartyEmail === email);
}

export async function findInbound(provider: string, externalId: string): Promise<InboundRow | null> {
  return (
    store().inbound.find(
      (row) => row.provider === provider && row.externalId === externalId,
    ) ?? null
  );
}

export async function recordInbound(args: {
  provider: string;
  externalId: string;
  threadId?: string;
  fromAddress?: string;
  subject?: string;
  snippet?: string;
  receivedAt: Date;
  schedulingRequestId?: string;
  matched: boolean;
}): Promise<{ row: InboundRow; created: boolean }> {
  const existing = await findInbound(args.provider, args.externalId);
  if (existing) return { row: existing, created: false };
  const row: InboundRow = {
    id: newId(),
    schedulingRequestId: args.schedulingRequestId ?? null,
    provider: args.provider,
    externalId: args.externalId,
    threadId: args.threadId ?? null,
    fromAddress: args.fromAddress ?? null,
    subject: args.subject ?? null,
    snippet: args.snippet ?? null,
    receivedAt: args.receivedAt,
    matched: args.matched,
    createdAt: new Date(),
  };
  store().inbound.unshift(row);
  return { row, created: true };
}

export async function patchInbound(
  id: string,
  patch: { schedulingRequestId?: string; matched?: boolean },
): Promise<InboundRow | undefined> {
  const row = store().inbound.find((item) => item.id === id);
  if (!row) return undefined;
  if (patch.schedulingRequestId !== undefined) row.schedulingRequestId = patch.schedulingRequestId;
  if (patch.matched !== undefined) row.matched = patch.matched;
  return row;
}

export async function attachThread(requestId: string, threadId: string): Promise<RequestRow | undefined> {
  const existing = await getRequest(requestId);
  if (!existing) throw new Error(`Scheduling request ${requestId} not found`);
  existing.threadId = threadId;
  existing.updatedAt = new Date();
  return existing;
}

export async function recordAgentRun(input: {
  source: string;
  prompt: string;
  resultText?: string;
  schedulingRequestId?: string;
}): Promise<void> {
  store().runs.unshift({
    id: newId(),
    source: input.source,
    prompt: input.prompt,
    resultText: input.resultText ?? null,
    schedulingRequestId: input.schedulingRequestId ?? null,
    createdAt: new Date(),
  });
}
