import { MemoryCalendar } from "./calendar/memory";
import { createGoogleCalendarPort } from "./calendar/google";
import type { CalendarPort } from "./calendar/port";
import { MemoryGmail } from "./email/memory";
import { createGoogleGmailPort } from "./email/gmail";
import type { GmailPort } from "./email/port";
import { MemoryDrive } from "./drive/memory";
import { createGoogleDrivePort } from "./drive/google";
import type { DrivePort } from "./drive/port";
import { isDemoMode } from "./env";
import { seedDemoPorts } from "./demo/seed";
import { seedDemoMemory } from "./demo/store";

let demoCalendar: MemoryCalendar | undefined;
let demoGmail: MemoryGmail | undefined;
let demoDrive: MemoryDrive | undefined;

export function demoCalendarPort(): MemoryCalendar {
  if (!demoCalendar) {
    const seeded = seedDemoPorts();
    seedDemoMemory();
    demoCalendar = seeded.calendar;
    demoGmail = seeded.gmail;
    demoDrive = seeded.drive;
  }
  return demoCalendar;
}

export function demoGmailPort(): MemoryGmail {
  demoCalendarPort();
  return demoGmail!;
}

export function demoDrivePort(): MemoryDrive {
  demoCalendarPort();
  return demoDrive!;
}

export function resetDemoPorts(): void {
  demoCalendar = undefined;
  demoGmail = undefined;
  demoDrive = undefined;
}

export function calendarPort(): CalendarPort {
  return isDemoMode() ? demoCalendarPort() : createGoogleCalendarPort();
}

export function gmailPort(): GmailPort {
  return isDemoMode() ? demoGmailPort() : createGoogleGmailPort();
}

export function drivePort(): DrivePort {
  return isDemoMode() ? demoDrivePort() : createGoogleDrivePort();
}
