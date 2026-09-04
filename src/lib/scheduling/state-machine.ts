import {
  SCHEDULING_STATUSES,
  type SchedulingStatus,
} from "../types";

const TRANSITIONS: Record<SchedulingStatus, SchedulingStatus[]> = {
  proposing: ["awaiting_reply", "confirmed", "cancelled"],
  awaiting_reply: ["confirmed", "rescheduling", "cancelled", "proposing"],
  confirmed: ["rescheduling", "cancelled"],
  rescheduling: ["proposing", "awaiting_reply", "confirmed", "cancelled"],
  cancelled: [],
};

export class IllegalTransitionError extends Error {
  constructor(
    readonly from: SchedulingStatus,
    readonly to: SchedulingStatus,
  ) {
    super(`Cannot move scheduling request from ${from} to ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function assertTransition(
  from: SchedulingStatus,
  to: SchedulingStatus,
): void {
  if (from === to) return;
  if (!TRANSITIONS[from].includes(to)) {
    throw new IllegalTransitionError(from, to);
  }
}

export function canTransition(
  from: SchedulingStatus,
  to: SchedulingStatus,
): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function isSchedulingStatus(value: string): value is SchedulingStatus {
  return (SCHEDULING_STATUSES as readonly string[]).includes(value);
}

export function nextStatusAfterProposal(hasExternalParty: boolean): SchedulingStatus {
  return hasExternalParty ? "awaiting_reply" : "proposing";
}
