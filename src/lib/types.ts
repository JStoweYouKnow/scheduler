export const SCHEDULING_STATUSES = [
  "proposing",
  "awaiting_reply",
  "confirmed",
  "rescheduling",
  "cancelled",
] as const;

export type SchedulingStatus = (typeof SCHEDULING_STATUSES)[number];

export const REQUEST_SOURCES = ["cli", "slack", "email"] as const;
export type RequestSource = (typeof REQUEST_SOURCES)[number];

export const WEEKDAYS = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export interface TimeOfDay {
  hour: number;
  minute: number;
}

export interface WorkingHours {
  start: string;
  end: string;
}

export interface ProtectedBlock {
  days: Weekday[];
  start: string;
  end: string;
  label: string;
}

export interface PersonRules {
  slug: string;
  timezone: string;
  priority: number;
  bufferMinutes: number;
  workingHours: Partial<Record<Weekday, WorkingHours>>;
  protectedBlocks: ProtectedBlock[];
}

export interface BusyInterval {
  start: Date;
  end: Date;
  source: "calendar" | "protected" | "buffer" | "outside_hours";
  label?: string;
}

export interface Slot {
  start: Date;
  end: Date;
}

export interface ProposedSlot {
  start: string;
  end: string;
  timezone: string;
}

export interface SchedulingConstraints {
  windowStart?: string;
  windowEnd?: string;
  preferredDays?: Weekday[];
  notes?: string;
}

export interface Conflict {
  user: string;
  source: BusyInterval["source"];
  label?: string;
  start: string;
  end: string;
}

export interface SlotEvaluation {
  ok: boolean;
  conflicts: Conflict[];
}

export interface TeamMemberConfig {
  slug: string;
  name: string;
  email: string;
  slackUserId?: string;
  timezone: string;
}

export interface SharedInboxConfig {
  memberSlug: string;
  email?: string;
  label: string;
}

export interface TeamConfig {
  studio: string;
  phase: 1 | 2 | 3;
  internalDomains: string[];
  slackChannel: string;
  members: TeamMemberConfig[];
  sharedInbox?: SharedInboxConfig;
}

export interface ApprovalKind {
  kind: "send_email" | "create_external_event" | "update_external_event";
}
