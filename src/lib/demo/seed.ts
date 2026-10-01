import { MemoryCalendar } from "../calendar/memory";
import { MemoryGmail } from "../email/memory";
import { MemoryDrive } from "../drive/memory";
import { MemoryResearch } from "../research/memory";
import { addMinutes } from "../time";

export function seedDemoPorts() {
  const calendar = new MemoryCalendar();
  const gmail = new MemoryGmail();
  const drive = new MemoryDrive();
  const research = new MemoryResearch();

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

  // Seeded so the prep skill's web research works in judge mode without a
  // Tavily key. Fictional, like the rest of the demo production.
  research.seed(
    [
      {
        title: "Tubi orders four unscripted originals for 2027 slate",
        url: "https://example.com/tubi-unscripted-slate",
        snippet:
          "The free streamer is leaning into low-cost unscripted, with a stated preference for packages that arrive with a lookbook and a named showrunner.",
        publishedDate: "2026-09-12",
      },
      {
        title: "Sarah Chen promoted to VP, Unscripted Originals at Tubi",
        url: "https://example.com/sarah-chen-vp",
        snippet:
          "Chen moves up from Director, and now controls greenlights under $2M. She has said publicly that she passes on anything without a one-sheet.",
        publishedDate: "2026-08-28",
      },
    ],
    "Tubi is buying unscripted for its 2027 slate; Sarah Chen is the decision-maker under $2M and expects a one-sheet up front.",
  );

  return { calendar, gmail, drive, research };
}
