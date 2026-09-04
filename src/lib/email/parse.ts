import type { gmail_v1 } from "googleapis";
import type { GmailMessage } from "./port";

export function decodeBase64Url(data: string): string {
  const padded = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function headerValue(
  headers: gmail_v1.Schema$MessagePartHeader[] | undefined,
  name: string,
): string {
  const match = headers?.find(
    (header) => header.name?.toLowerCase() === name.toLowerCase(),
  );
  return match?.value ?? "";
}

export function extractAddresses(value: string): string[] {
  return value
    .split(",")
    .map((part) => {
      const angle = /<([^>]+)>/.exec(part);
      return (angle?.[1] ?? part).trim().toLowerCase();
    })
    .filter((address) => address.includes("@"));
}

export function displayName(fromHeader: string): string | undefined {
  const cleaned = fromHeader.replace(/<[^>]+>/, "").replace(/"/g, "").trim();
  return cleaned.length > 0 && !cleaned.includes("@") ? cleaned : undefined;
}

function walkParts(part: gmail_v1.Schema$MessagePart | undefined): string {
  if (!part) return "";
  if (part.mimeType === "text/plain" && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = walkParts(child);
    if (found) return found;
  }
  if (part.body?.data) return decodeBase64Url(part.body.data);
  return "";
}

export function mapGmailMessage(message: gmail_v1.Schema$Message): GmailMessage | null {
  if (!message.id || !message.threadId) return null;
  const headers = message.payload?.headers;
  const from = headerValue(headers, "From");
  const fromEmail = extractAddresses(from)[0] ?? from;
  const dateHeader = headerValue(headers, "Date");
  const internal = message.internalDate ? Number(message.internalDate) : Date.parse(dateHeader);
  return {
    id: message.id,
    threadId: message.threadId,
    from: fromEmail,
    to: extractAddresses(headerValue(headers, "To")),
    subject: headerValue(headers, "Subject"),
    snippet: message.snippet ?? "",
    body: walkParts(message.payload).trim(),
    date: new Date(Number.isFinite(internal) ? internal : Date.now()),
  };
}

const SCHEDULING_HINT =
  /\b(meet|meeting|schedule|availability|available|calendar|times? that work|reschedul|catch up|hold a time)\b/i;
const IGNORE_SENDERS = /(noreply|no-reply|mailer-daemon|notifications)@/i;

export function looksLikeScheduling(message: {
  from: string;
  subject: string;
  snippet: string;
  body?: string;
}): boolean {
  if (IGNORE_SENDERS.test(message.from)) return false;
  const haystack = `${message.subject} ${message.snippet} ${message.body ?? ""}`;
  return SCHEDULING_HINT.test(haystack);
}
