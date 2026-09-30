/**
 * Relative-date grounding.
 *
 * The model has no reliable sense of "now": left alone it resolves "next
 * Tuesday" against its training cutoff and confirms meetings in the past.
 * `systemPrompt` carries the current time into context; these guards make the
 * tool layer refuse a stale timestamp even when the model ignores it. Same
 * principle as the rules engine — the model proposes, the tools decide.
 */
import { iso } from "../time";

export type GuardFailure = {
  ok: false;
  reason: "invalid_timestamp" | "window_in_past" | "start_in_past";
  message: string;
  now: string;
};

export type InstantGuard = { ok: true; date: Date } | GuardFailure;

export type WindowGuard =
  | { ok: true; windowStart: Date; windowEnd: Date; clampedToNow: boolean }
  | GuardFailure;

export type EventGuard = { ok: true; start: Date; end: Date } | GuardFailure;

function parsed(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function fail(
  reason: GuardFailure["reason"],
  message: string,
  now: Date,
): GuardFailure {
  return { ok: false, reason, message, now: iso(now) };
}

/** A single instant that must parse and be in the future. */
export function guardFutureInstant(
  value: string,
  now: Date = new Date(),
): InstantGuard {
  const date = parsed(value);
  if (!date) {
    return fail(
      "invalid_timestamp",
      `Could not parse "${value}" as an ISO timestamp.`,
      now,
    );
  }
  if (date <= now) {
    return fail(
      "start_in_past",
      `${iso(date)} is in the past. The current time is ${iso(now)} — re-resolve the requested day from it and try again.`,
      now,
    );
  }
  return { ok: true, date };
}

/**
 * A search window. A window that has partly elapsed is clamped forward to
 * now rather than rejected, so "this afternoon" still works at 2pm.
 */
export function guardWindow(
  windowStart: string,
  windowEnd: string,
  now: Date = new Date(),
): WindowGuard {
  const start = parsed(windowStart);
  const end = parsed(windowEnd);
  if (!start || !end) {
    return fail(
      "invalid_timestamp",
      `Could not parse windowStart ("${windowStart}") and windowEnd ("${windowEnd}") as ISO timestamps.`,
      now,
    );
  }
  if (end <= start) {
    return fail(
      "invalid_timestamp",
      "windowEnd must be after windowStart.",
      now,
    );
  }
  if (end <= now) {
    return fail(
      "window_in_past",
      `That window ended ${iso(end)}, before the current time ${iso(now)}. Re-resolve the requested day from the current time — "next <weekday>" means the next one after today — then search again.`,
      now,
    );
  }
  const clampedToNow = start < now;
  return {
    ok: true,
    windowStart: clampedToNow ? now : start,
    windowEnd: end,
    clampedToNow,
  };
}

/** A concrete slot about to be written to a calendar. Never clamped. */
export function guardEvent(
  startValue: string,
  endValue: string,
  now: Date = new Date(),
): EventGuard {
  const start = guardFutureInstant(startValue, now);
  if (!start.ok) return start;
  const end = parsed(endValue);
  if (!end) {
    return fail(
      "invalid_timestamp",
      `Could not parse "${endValue}" as an ISO timestamp.`,
      now,
    );
  }
  if (end <= start.date) {
    return fail("invalid_timestamp", "end must be after start.", now);
  }
  return { ok: true, start: start.date, end };
}
