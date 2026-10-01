import { MemoryCalendar } from "./calendar/memory";
import { createGoogleCalendarPort } from "./calendar/google";
import type { CalendarPort } from "./calendar/port";
import { MemoryGmail } from "./email/memory";
import { createGoogleGmailPort } from "./email/gmail";
import type { GmailPort } from "./email/port";
import { MemoryDrive } from "./drive/memory";
import { createGoogleDrivePort } from "./drive/google";
import type { DrivePort } from "./drive/port";
import { MemoryResearch } from "./research/memory";
import { createTavilyResearchPort, hasTavily } from "./research/tavily";
import type { ResearchPort } from "./research/port";
import { isDemoMode } from "./env";
import { seedDemoPorts } from "./demo/seed";
import { seedDemoMemory } from "./demo/store";

let demoCalendar: MemoryCalendar | undefined;
let demoGmail: MemoryGmail | undefined;
let demoDrive: MemoryDrive | undefined;
let demoResearch: MemoryResearch | undefined;

export function demoCalendarPort(): MemoryCalendar {
  if (!demoCalendar) {
    const seeded = seedDemoPorts();
    seedDemoMemory();
    demoCalendar = seeded.calendar;
    demoGmail = seeded.gmail;
    demoDrive = seeded.drive;
    demoResearch = seeded.research;
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

export function demoResearchPort(): MemoryResearch {
  demoCalendarPort();
  return demoResearch!;
}

export function resetDemoPorts(): void {
  demoCalendar = undefined;
  demoGmail = undefined;
  demoDrive = undefined;
  demoResearch = undefined;
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

export function researchPort(): ResearchPort {
  // Demo mode exists to skip the integrations that need OAuth or infrastructure
  // — Google, Postgres, Slack, Clerk. Tavily needs only a key, so when one is
  // present we use the real thing even in demo: otherwise the hosted demo (which
  // must run DEMO_MODE=1) could never exercise real research. Without a key we
  // fall back to seeded results, so judges still see the prep skill work.
  if (isDemoMode() && !hasTavily()) return demoResearchPort();
  return createTavilyResearchPort();
}
