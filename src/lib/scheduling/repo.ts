import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../db/client";
import {
  agentRuns,
  approvalRequests,
  inboundMessages,
  meetingNotes,
  schedulingRequests,
} from "../db/schema";
import { hasDatabase, isDemoMode } from "../env";
import { assertTransition, isSchedulingStatus } from "./state-machine";
import type {
  ProposedSlot,
  RequestSource,
  SchedulingConstraints,
  SchedulingStatus,
} from "../types";
import * as demoRepo from "./demo-repo";

function demoing(): boolean {
  return isDemoMode();
}

export interface CreateRequestInput {
  title: string;
  durationMinutes: number;
  attendeeSlugs: string[];
  counterpartyName?: string;
  counterpartyEmail?: string;
  organization?: string;
  isExternal: boolean;
  constraints?: SchedulingConstraints;
  proposedSlots?: ProposedSlot[];
  source: RequestSource;
  createdBySlug?: string;
  slackChannel?: string;
  slackThreadTs?: string;
}

export async function createRequest(input: CreateRequestInput) {
  if (demoing()) return demoRepo.createRequest(input);
  const db = getDb();
  const [row] = await db
    .insert(schedulingRequests)
    .values({
      title: input.title,
      durationMinutes: input.durationMinutes,
      attendeeSlugs: input.attendeeSlugs,
      counterpartyName: input.counterpartyName,
      counterpartyEmail: input.counterpartyEmail,
      organization: input.organization,
      isExternal: input.isExternal,
      constraints: input.constraints ?? {},
      proposedSlots: input.proposedSlots ?? [],
      source: input.source,
      createdBySlug: input.createdBySlug,
      slackChannel: input.slackChannel,
      slackThreadTs: input.slackThreadTs,
      status: "proposing",
    })
    .returning();
  if (!row) throw new Error("Failed to create scheduling request");
  return row;
}

export async function getRequest(id: string) {
  if (demoing()) return demoRepo.getRequest(id);
  const db = getDb();
  const [row] = await db
    .select()
    .from(schedulingRequests)
    .where(eq(schedulingRequests.id, id));
  return row ?? null;
}

export async function listOpenRequests() {
  if (demoing()) return demoRepo.listOpenRequests();
  const db = getDb();
  return db
    .select()
    .from(schedulingRequests)
    .where(
      inArray(schedulingRequests.status, [
        "proposing",
        "awaiting_reply",
        "rescheduling",
      ]),
    )
    .orderBy(desc(schedulingRequests.createdAt));
}

export async function listRecentRequests(limit = 20) {
  if (demoing()) return demoRepo.listRecentRequests(limit);
  const db = getDb();
  return db
    .select()
    .from(schedulingRequests)
    .orderBy(desc(schedulingRequests.createdAt))
    .limit(limit);
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
) {
  if (demoing()) return demoRepo.updateRequestStatus(id, to, patch);
  const existing = await getRequest(id);
  if (!existing) throw new Error(`Scheduling request ${id} not found`);
  if (!isSchedulingStatus(existing.status)) {
    throw new Error(`Corrupt status on ${id}: ${existing.status}`);
  }
  assertTransition(existing.status, to);
  const db = getDb();
  const [row] = await db
    .update(schedulingRequests)
    .set({
      status: to,
      updatedAt: new Date(),
      ...patch,
    })
    .where(eq(schedulingRequests.id, id))
    .returning();
  return row;
}

export async function createApproval(args: {
  schedulingRequestId?: string;
  kind: string;
  payload: unknown;
  slackChannel?: string;
  slackMessageTs?: string;
}) {
  if (demoing()) return demoRepo.createApproval(args);
  const db = getDb();
  const [row] = await db
    .insert(approvalRequests)
    .values({
      schedulingRequestId: args.schedulingRequestId,
      kind: args.kind,
      payload: args.payload,
      slackChannel: args.slackChannel,
      slackMessageTs: args.slackMessageTs,
    })
    .returning();
  if (!row) throw new Error("Failed to create approval");
  return row;
}

export async function listPendingApprovals(limit = 50) {
  if (demoing()) return demoRepo.listPendingApprovals(limit);
  const db = getDb();
  return db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.status, "pending"))
    .orderBy(desc(approvalRequests.createdAt))
    .limit(limit);
}

export async function decideApproval(
  id: string,
  decision: "approved" | "rejected",
  decidedBy: string,
) {
  if (demoing()) return demoRepo.decideApproval(id, decision, decidedBy);
  const db = getDb();
  const [row] = await db
    .update(approvalRequests)
    .set({
      status: decision,
      decidedBy,
      decidedAt: new Date(),
    })
    .where(
      and(eq(approvalRequests.id, id), eq(approvalRequests.status, "pending")),
    )
    .returning();
  return row ?? null;
}

export async function getApproval(id: string) {
  if (demoing()) return demoRepo.getApproval(id);
  const db = getDb();
  const [row] = await db
    .select()
    .from(approvalRequests)
    .where(eq(approvalRequests.id, id));
  return row ?? null;
}

export async function saveNotes(args: {
  schedulingRequestId?: string;
  calendarEventId?: string;
  notes?: string;
  agendaDraft?: string;
  followUpDraft?: string;
}) {
  if (demoing()) return demoRepo.saveNotes(args);
  const db = getDb();
  const [row] = await db.insert(meetingNotes).values(args).returning();
  return row;
}

export async function notesForEvent(calendarEventId: string) {
  if (demoing()) return demoRepo.notesForEvent(calendarEventId);
  const db = getDb();
  return db
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.calendarEventId, calendarEventId))
    .orderBy(desc(meetingNotes.createdAt));
}

export async function notesForRequest(requestId: string) {
  if (demoing()) return demoRepo.notesForRequest(requestId);
  const db = getDb();
  return db
    .select()
    .from(meetingNotes)
    .where(eq(meetingNotes.schedulingRequestId, requestId))
    .orderBy(desc(meetingNotes.createdAt));
}

export async function findRequestByCalendarEvent(calendarEventId: string) {
  if (demoing()) return demoRepo.findRequestByCalendarEvent(calendarEventId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(schedulingRequests)
    .where(eq(schedulingRequests.calendarEventId, calendarEventId));
  return row ?? null;
}

export async function findRequestsByCounterparty(email: string) {
  if (demoing()) return demoRepo.findRequestsByCounterparty(email);
  const db = getDb();
  return db
    .select()
    .from(schedulingRequests)
    .where(eq(schedulingRequests.counterpartyEmail, email))
    .orderBy(desc(schedulingRequests.createdAt));
}

export async function findInbound(provider: string, externalId: string) {
  if (demoing()) return demoRepo.findInbound(provider, externalId);
  const db = getDb();
  const [row] = await db
    .select()
    .from(inboundMessages)
    .where(
      and(
        eq(inboundMessages.provider, provider),
        eq(inboundMessages.externalId, externalId),
      ),
    );
  return row ?? null;
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
}) {
  if (demoing()) return demoRepo.recordInbound(args);
  const existing = await findInbound(args.provider, args.externalId);
  if (existing) return { row: existing, created: false };
  const db = getDb();
  const [row] = await db.insert(inboundMessages).values(args).returning();
  if (!row) throw new Error("Failed to record inbound message");
  return { row, created: true };
}

export async function patchInbound(
  id: string,
  patch: { schedulingRequestId?: string; matched?: boolean },
) {
  if (demoing()) return demoRepo.patchInbound(id, patch);
  const db = getDb();
  const [row] = await db
    .update(inboundMessages)
    .set(patch)
    .where(eq(inboundMessages.id, id))
    .returning();
  return row;
}

export async function attachThread(requestId: string, threadId: string) {
  if (demoing()) return demoRepo.attachThread(requestId, threadId);
  const existing = await getRequest(requestId);
  if (!existing) throw new Error(`Scheduling request ${requestId} not found`);
  const db = getDb();
  const [row] = await db
    .update(schedulingRequests)
    .set({ threadId, updatedAt: new Date() })
    .where(eq(schedulingRequests.id, requestId))
    .returning();
  return row;
}

export async function recordAgentRun(input: {
  source: string;
  prompt: string;
  resultText?: string;
  schedulingRequestId?: string;
}): Promise<void> {
  if (demoing()) {
    await demoRepo.recordAgentRun(input);
    return;
  }
  if (!hasDatabase()) return;
  await getDb().insert(agentRuns).values({
    source: input.source,
    prompt: input.prompt,
    resultText: input.resultText,
    schedulingRequestId: input.schedulingRequestId,
  });
}
