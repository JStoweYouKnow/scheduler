import { loadTeamConfig } from "../config/team";
import { phaseAllowsInbox, requiresApproval } from "../scheduling/approval";
import { matchInboundToRequest } from "../scheduling/match-thread";
import {
  attachThread,
  createRequest,
  listOpenRequests,
  patchInbound,
  recordInbound,
} from "../scheduling/repo";
import { looksLikeScheduling } from "./parse";
import type { GmailMessage, GmailPort } from "./port";
import { sharedInboxEmail, sharedInboxLabel } from "./gmail";

export type InboxPlan =
  | { action: "ignore"; reason: string }
  | { action: "match"; requestId: string; reason: string; confidence: string }
  | { action: "open" };

export function planInboxAction(
  message: GmailMessage,
  openRequests: Array<{
    id: string;
    threadId: string | null;
    counterpartyEmail: string | null;
    counterpartyName: string | null;
    organization: string | null;
    status: string;
  }>,
): InboxPlan {
  const match = matchInboundToRequest(
    {
      threadId: message.threadId,
      fromAddress: message.from,
      subject: message.subject,
      snippet: `${message.snippet} ${message.body}`,
    },
    openRequests,
  );
  if (match) {
    return {
      action: "match",
      requestId: match.requestId,
      reason: match.reason,
      confidence: match.confidence,
    };
  }
  if (!looksLikeScheduling(message)) {
    return { action: "ignore", reason: "not_scheduling" };
  }
  return { action: "open" };
}

export function inboundAgentPrompt(args: {
  message: GmailMessage;
  requestId: string;
  matchReason: string;
}): string {
  return [
    "An inbound scheduling email was matched to an open request. Decide the next action.",
    `Request: ${args.requestId}`,
    `Match: ${args.matchReason}`,
    `From: ${args.message.from}`,
    `Subject: ${args.message.subject}`,
    `Thread: ${args.message.threadId}`,
    "",
    args.message.body.slice(0, 4000) || args.message.snippet,
    "",
    "If they proposed or accepted times, check get_availability then create_event or draft_email a reply.",
    "Never send_email without going through the approval tool. Prefer draft_email first.",
  ].join("\n");
}

export async function processInbox(args: {
  gmail: GmailPort;
  onMatched?: (prompt: string, requestId: string) => Promise<void>;
}): Promise<{ seen: number; matched: number; opened: number; ignored: number }> {
  const team = loadTeamConfig();
  if (!phaseAllowsInbox(team.phase)) {
    return { seen: 0, matched: 0, opened: 0, ignored: 0 };
  }

  const inbox = sharedInboxEmail();
  const label = sharedInboxLabel();
  const messages = await args.gmail.listLabeled(inbox, label, 14);
  const open = (await listOpenRequests()).map((request) => ({
    id: request.id,
    threadId: request.threadId,
    counterpartyEmail: request.counterpartyEmail,
    counterpartyName: request.counterpartyName,
    organization: request.organization,
    status: request.status,
  }));
  let matched = 0;
  let opened = 0;
  let ignored = 0;

  for (const message of messages) {
    const recorded = await recordInbound({
      provider: "gmail",
      externalId: message.id,
      threadId: message.threadId,
      fromAddress: message.from,
      subject: message.subject,
      snippet: message.snippet,
      receivedAt: message.date,
      matched: false,
    });
    if (!recorded.created) continue;

    const plan = planInboxAction(message, open);
    if (plan.action === "ignore") {
      ignored += 1;
      continue;
    }

    if (plan.action === "open") {
      const isExternal = requiresApproval({
        isExternal: true,
        counterpartyEmail: message.from,
        team,
      });
      const ownerSlug = team.sharedInbox?.memberSlug ?? team.members[0]?.slug;
      if (!ownerSlug) throw new Error("No team member to own inbound requests");
      const request = await createRequest({
        title: message.subject || `Scheduling with ${message.from}`,
        durationMinutes: 30,
        attendeeSlugs: [ownerSlug],
        counterpartyEmail: message.from,
        isExternal,
        source: "email",
        constraints: { notes: message.snippet },
      });
      await attachThread(request.id, message.threadId);
      await patchInbound(recorded.row.id, {
        schedulingRequestId: request.id,
        matched: true,
      });
      opened += 1;
      open.push({
        id: request.id,
        threadId: message.threadId,
        counterpartyEmail: message.from,
        counterpartyName: null,
        organization: null,
        status: "proposing",
      });
      if (args.onMatched) {
        await args.onMatched(
          inboundAgentPrompt({
            message,
            requestId: request.id,
            matchReason: "opened",
          }),
          request.id,
        );
      }
      continue;
    }

    await attachThread(plan.requestId, message.threadId);
    await patchInbound(recorded.row.id, {
      schedulingRequestId: plan.requestId,
      matched: true,
    });
    matched += 1;
    if (args.onMatched) {
      await args.onMatched(
        inboundAgentPrompt({
          message,
          requestId: plan.requestId,
          matchReason: plan.reason,
        }),
        plan.requestId,
      );
    }
  }

  return { seen: messages.length, matched, opened, ignored };
}
