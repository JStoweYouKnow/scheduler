import type { InferSelectModel } from "drizzle-orm";
import {
  agentRuns,
  approvalRequests,
  inboundMessages,
  meetingNotes,
  memoryFacts,
  people,
  projects,
  deliverables,
  schedulingRequests,
} from "../db/schema";
import type { ProposedSlot, RequestSource, SchedulingConstraints } from "../types";

export type RequestRow = InferSelectModel<typeof schedulingRequests>;
export type ApprovalRow = InferSelectModel<typeof approvalRequests>;
export type NotesRow = InferSelectModel<typeof meetingNotes>;
export type InboundRow = InferSelectModel<typeof inboundMessages>;
export type AgentRunRow = InferSelectModel<typeof agentRuns>;
export type ProjectRow = InferSelectModel<typeof projects>;
export type DeliverableRow = InferSelectModel<typeof deliverables>;
export type PersonRow = InferSelectModel<typeof people>;
export type FactRow = InferSelectModel<typeof memoryFacts>;

export interface DemoStore {
  requests: RequestRow[];
  approvals: ApprovalRow[];
  notes: NotesRow[];
  inbound: InboundRow[];
  runs: AgentRunRow[];
  projects: ProjectRow[];
  deliverables: DeliverableRow[];
  people: PersonRow[];
  facts: FactRow[];
}

function emptyStore(): DemoStore {
  return {
    requests: [],
    approvals: [],
    notes: [],
    inbound: [],
    runs: [],
    projects: [],
    deliverables: [],
    people: [],
    facts: [],
  };
}

let store = emptyStore();

export function demoStore(): DemoStore {
  return store;
}

export function resetDemoStore(): void {
  store = emptyStore();
}

export function seedDemoMemory(): void {
  if (store.people.length > 0) return;
  const now = new Date();
  const sarah: PersonRow = {
    id: "person-sarah",
    name: "Sarah Chen",
    email: "sarah@tubi.tv",
    organization: "Tubi",
    notes: "Asked for a one-sheet before pitching.",
    createdAt: now,
    updatedAt: now,
  };
  const tubi: ProjectRow = {
    id: "project-tubi",
    name: "Tubi slate",
    status: "active",
    summary: "Intro meeting + lookbook follow-up.",
    createdAt: now,
    updatedAt: now,
  };
  store.people.push(sarah);
  store.projects.push(tubi);
  store.deliverables.push({
    id: "del-onesheet",
    projectId: tubi.id,
    title: "One-sheet",
    status: "open",
    dueAt: new Date("2026-09-22T17:00:00.000Z"),
    notes: "Send before the intro.",
    createdAt: now,
  });
  store.facts.push({
    id: "fact-1",
    kind: "preference",
    subject: "Sarah Chen",
    fact: "Prefers Tuesday or Wednesday afternoon, 30 minutes.",
    source: "seed",
    sourceId: "demo",
    projectId: tubi.id,
    personId: sarah.id,
    createdAt: now,
  });
  store.requests.push({
    id: "req-tubi",
    status: "awaiting_reply",
    title: "Tubi intro",
    durationMinutes: 30,
    counterpartyName: "Sarah Chen",
    counterpartyEmail: "sarah@tubi.tv",
    organization: "Tubi",
    isExternal: true,
    attendeeSlugs: ["v"],
    proposedSlots: [],
    confirmedSlot: null,
    constraints: { notes: "one-sheet first" },
    threadId: "thread-tubi",
    slackChannel: null,
    slackThreadTs: null,
    calendarEventId: null,
    calendarId: null,
    source: "email",
    createdBySlug: "v",
    createdAt: now,
    updatedAt: now,
  });
}

export function newId(): string {
  return crypto.randomUUID();
}

export type CreateRequestInput = {
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
};
