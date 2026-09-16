import { MemoryCalendar } from "../calendar/memory";
import { MemoryGmail } from "../email/memory";
import { MemoryDrive } from "../drive/memory";
import { addMinutes } from "../time";

export function seedDemoPorts() {
  const calendar = new MemoryCalendar();
  const gmail = new MemoryGmail();
  const drive = new MemoryDrive();

  const tuesdayTen = new Date("2026-09-22T17:00:00.000Z");
  calendar.setBusy("v@matriarch-studios.com", [
    {
      start: tuesdayTen,
      end: addMinutes(tuesdayTen, 60),
      source: "calendar",
      label: "Internal standup",
    },
  ]);
  calendar.setBusy("j@matriarch-studios.com", [
    {
      start: new Date("2026-09-23T21:00:00.000Z"),
      end: new Date("2026-09-23T23:00:00.000Z"),
      source: "calendar",
      label: "Edit bay",
    },
  ]);

  gmail.seed([
    {
      id: "msg-sarah-1",
      threadId: "thread-tubi",
      from: "sarah@tubi.tv",
      to: ["v@matriarch-studios.com"],
      subject: "Times that work next week",
      snippet: "Can we do 30 min on the slate?",
      body: "Tuesday or Wednesday afternoon works for a meeting about the one-sheet.",
      date: new Date("2026-09-15T17:00:00.000Z"),
    },
    {
      id: "msg-news",
      threadId: "thread-news",
      from: "noreply@deals.com",
      to: ["v@matriarch-studios.com"],
      subject: "Your weekly digest",
      snippet: "Deals inside",
      body: "Unsubscribe anytime",
      date: new Date("2026-09-15T18:00:00.000Z"),
    },
  ]);

  drive.seed([
    {
      id: "doc-onesheet",
      name: "Tubi one-sheet (draft)",
      mimeType: "application/vnd.google-apps.document",
      webViewLink: "https://docs.google.com/document/d/demo-onesheet",
      snippet: "Half-hour pitch. They asked for a lookbook after the last call.",
    },
  ]);

  return { calendar, gmail, drive };
}
