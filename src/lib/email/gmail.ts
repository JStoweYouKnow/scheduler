import { google } from "googleapis";
import { loadTeamConfig } from "../config/team";
import { authForEmail } from "../google/auth";
import { phaseAllowsEmail } from "../scheduling/approval";
import { looksLikeScheduling, mapGmailMessage } from "./parse";
import type { GmailContact, GmailDraft, GmailMessage, GmailPort, SentMail } from "./port";

export class PhaseGatedError extends Error {
  constructor(tool: string, phase: number) {
    super(
      `${tool} is disabled in phase ${phase}. External email ships in phase 3.`,
    );
    this.name = "PhaseGatedError";
  }
}

export function assertEmailAllowed(tool: string): void {
  const team = loadTeamConfig();
  if (!phaseAllowsEmail(team.phase)) {
    throw new PhaseGatedError(tool, team.phase);
  }
}

export function sharedInboxEmail(): string {
  const team = loadTeamConfig();
  if (team.sharedInbox?.email) return team.sharedInbox.email;
  const slug = team.sharedInbox?.memberSlug ?? team.members[0]?.slug;
  const member = team.members.find((item) => item.slug === slug) ?? team.members[0];
  if (!member) throw new Error("No team members configured for the shared inbox");
  return member.email;
}

export function sharedInboxLabel(): string {
  const team = loadTeamConfig();
  return process.env.GMAIL_LABEL ?? team.sharedInbox?.label ?? "scheduling";
}

function rfc822(input: { to: string; subject: string; body: string; threadId?: string }): string {
  const lines = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "Content-Type: text/plain; charset=utf-8",
    "",
    input.body,
  ];
  return Buffer.from(lines.join("\r\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createGoogleGmailPort(): GmailPort {
  return {
    async listLabeled(userEmail, label, newerThanDays = 14) {
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const listed = await gmail.users.messages.list({
        userId: "me",
        q: `label:${label} newer_than:${newerThanDays}d`,
        maxResults: 40,
      });
      const ids = listed.data.messages ?? [];
      const messages: GmailMessage[] = [];
      for (const item of ids) {
        if (!item.id) continue;
        const full = await gmail.users.messages.get({
          userId: "me",
          id: item.id,
          format: "full",
        });
        const mapped = mapGmailMessage(full.data);
        if (mapped) messages.push(mapped);
      }
      return messages;
    },

    async readThread(userEmail, threadId) {
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const thread = await gmail.users.threads.get({
        userId: "me",
        id: threadId,
        format: "full",
      });
      return (thread.data.messages ?? [])
        .map(mapGmailMessage)
        .filter((message): message is GmailMessage => message !== null);
    },

    async createDraft(userEmail, input) {
      assertEmailAllowed("draft_email");
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const res = await gmail.users.drafts.create({
        userId: "me",
        requestBody: {
          message: {
            raw: rfc822(input),
            threadId: input.threadId,
          },
        },
      });
      if (!res.data.id) throw new Error("Gmail did not return a draft id");
      return { draftId: res.data.id, threadId: res.data.message?.threadId ?? input.threadId };
    },

    async sendDraft(userEmail, draftId) {
      assertEmailAllowed("send_email");
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const res = await gmail.users.drafts.send({
        userId: "me",
        requestBody: { id: draftId },
      });
      if (!res.data.id) throw new Error("Gmail did not return a sent message id");
      return { messageId: res.data.id, threadId: res.data.threadId ?? undefined };
    },

    async sendMessage(userEmail, input) {
      assertEmailAllowed("send_email");
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const res = await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: rfc822(input),
          threadId: input.threadId,
        },
      });
      if (!res.data.id) throw new Error("Gmail did not return a sent message id");
      return { messageId: res.data.id, threadId: res.data.threadId ?? input.threadId };
    },

    async searchContacts(userEmail, query) {
      const { client } = await authForEmail(userEmail);
      const gmail = google.gmail({ version: "v1", auth: client });
      const listed = await gmail.users.messages.list({
        userId: "me",
        q: query,
        maxResults: 15,
      });
      const seen = new Map<string, GmailContact>();
      for (const item of listed.data.messages ?? []) {
        if (!item.id) continue;
        const full = await gmail.users.messages.get({
          userId: "me",
          id: item.id,
          format: "metadata",
          metadataHeaders: ["From", "To"],
        });
        const mapped = mapGmailMessage(full.data);
        if (!mapped) continue;
        if (!seen.has(mapped.from)) {
          seen.set(mapped.from, { email: mapped.from });
        }
      }
      return [...seen.values()];
    },
  };
}

export async function draftEmail(
  args: { to: string; subject: string; body: string; threadId?: string },
  gmail: GmailPort = createGoogleGmailPort(),
): Promise<GmailDraft> {
  assertEmailAllowed("draft_email");
  return gmail.createDraft(sharedInboxEmail(), args);
}

export async function sendEmail(
  args: {
    draftId?: string;
    to: string;
    subject: string;
    body: string;
    threadId?: string;
  },
  gmail: GmailPort = createGoogleGmailPort(),
): Promise<SentMail> {
  assertEmailAllowed("send_email");
  const inbox = sharedInboxEmail();
  if (args.draftId) return gmail.sendDraft(inbox, args.draftId);
  return gmail.sendMessage(inbox, args);
}

export async function readThread(
  threadId: string,
  gmail: GmailPort = createGoogleGmailPort(),
): Promise<{ messages: Array<{ from: string; snippet: string; body: string; date: string }> }> {
  assertEmailAllowed("read_thread");
  const messages = await gmail.readThread(sharedInboxEmail(), threadId);
  return {
    messages: messages.map((message) => ({
      from: message.from,
      snippet: message.snippet,
      body: message.body.slice(0, 4000),
      date: message.date.toISOString(),
    })),
  };
}

export { looksLikeScheduling };
