import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { ProposedSlot, SchedulingConstraints } from "../types";

export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email").notNull().unique(),
  slackUserId: text("slack_user_id"),
  timezone: text("timezone").notNull().default("America/Los_Angeles"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const googleAccounts = pgTable("google_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamMemberId: uuid("team_member_id")
    .notNull()
    .references(() => teamMembers.id, { onDelete: "cascade" }),
  googleEmail: text("google_email").notNull(),
  refreshTokenEnc: text("refresh_token_enc").notNull(),
  accessTokenEnc: text("access_token_enc"),
  tokenExpiry: timestamp("token_expiry", { withTimezone: true }),
  scopes: text("scopes").array().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schedulingRequests = pgTable("scheduling_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: text("status").notNull().default("proposing"),
  title: text("title").notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(30),
  counterpartyName: text("counterparty_name"),
  counterpartyEmail: text("counterparty_email"),
  organization: text("organization"),
  isExternal: boolean("is_external").notNull().default(false),
  attendeeSlugs: text("attendee_slugs").array().notNull(),
  proposedSlots: jsonb("proposed_slots")
    .$type<ProposedSlot[]>()
    .notNull()
    .default([]),
  confirmedSlot: jsonb("confirmed_slot").$type<ProposedSlot | null>(),
  constraints: jsonb("constraints")
    .$type<SchedulingConstraints>()
    .notNull()
    .default({}),
  threadId: text("thread_id"),
  slackChannel: text("slack_channel"),
  slackThreadTs: text("slack_thread_ts"),
  calendarEventId: text("calendar_event_id"),
  calendarId: text("calendar_id"),
  source: text("source").notNull().default("cli"),
  createdBySlug: text("created_by_slug"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const inboundMessages = pgTable("inbound_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  schedulingRequestId: uuid("scheduling_request_id").references(
    () => schedulingRequests.id,
    { onDelete: "set null" },
  ),
  provider: text("provider").notNull(),
  externalId: text("external_id").notNull(),
  threadId: text("thread_id"),
  fromAddress: text("from_address"),
  subject: text("subject"),
  snippet: text("snippet"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull(),
  matched: boolean("matched").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  schedulingRequestId: uuid("scheduling_request_id").references(
    () => schedulingRequests.id,
    { onDelete: "cascade" },
  ),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("pending"),
  slackChannel: text("slack_channel"),
  slackMessageTs: text("slack_message_ts"),
  decidedBy: text("decided_by"),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const meetingNotes = pgTable("meeting_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schedulingRequestId: uuid("scheduling_request_id").references(
    () => schedulingRequests.id,
    { onDelete: "set null" },
  ),
  calendarEventId: text("calendar_event_id"),
  notes: text("notes"),
  agendaDraft: text("agenda_draft"),
  followUpDraft: text("follow_up_draft"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const agentRuns = pgTable("agent_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  prompt: text("prompt").notNull(),
  resultText: text("result_text"),
  schedulingRequestId: uuid("scheduling_request_id").references(
    () => schedulingRequests.id,
    { onDelete: "set null" },
  ),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
