import { ToolLoopAgent, isStepCount, tool } from "ai";
import { loadTeamConfig } from "../config/team";
import { getDb } from "../db/client";
import { agentRuns } from "../db/schema";
import { hasDatabase } from "../env";
import { systemPrompt } from "./prompt";
import { buildToolHandlers, toolInputSchemas } from "./tools";
import type { CalendarPort } from "../calendar/port";
import type { GmailPort } from "../email/port";
import type { RequestSource } from "../types";

export interface AgentRunInput {
  prompt: string;
  source: RequestSource;
  slackChannel?: string;
  slackThreadTs?: string;
  calendar?: CalendarPort;
  gmail?: GmailPort;
  schedulingRequestId?: string;
}

export interface AgentRunResult {
  text: string;
  steps: number;
}

function createAgent(calendar?: CalendarPort, gmail?: GmailPort) {
  const team = loadTeamConfig();
  const handlers = buildToolHandlers(calendar, gmail);
  return new ToolLoopAgent({
    model: "anthropic/claude-sonnet-5",
    instructions: systemPrompt(team),
    stopWhen: isStepCount(12),
    tools: {
      get_availability: tool({
        description:
          "Find open slots for one or more team members. Always use this instead of guessing conflicts.",
        inputSchema: toolInputSchemas.get_availability,
        execute: handlers.get_availability,
      }),
      create_event: tool({
        description:
          "Create a calendar event after the rules engine clears the slot. External counterparties go to Slack approval.",
        inputSchema: toolInputSchemas.create_event,
        execute: handlers.create_event,
      }),
      update_event: tool({
        description: "Reschedule or retitle an existing request's calendar event.",
        inputSchema: toolInputSchemas.update_event,
        execute: handlers.update_event,
      }),
      lookup_contact: tool({
        description: "Resolve a name or email to an internal teammate.",
        inputSchema: toolInputSchemas.lookup_contact,
        execute: handlers.lookup_contact,
      }),
      get_meeting_context: tool({
        description: "Pull request state and any stored notes/agenda for a meeting.",
        inputSchema: toolInputSchemas.get_meeting_context,
        execute: handlers.get_meeting_context,
      }),
      create_scheduling_request: tool({
        description:
          "Open a scheduling_request so later inbound mail/Slack can attach to it.",
        inputSchema: toolInputSchemas.create_scheduling_request,
        execute: handlers.create_scheduling_request,
      }),
      draft_email: tool({
        description: "Draft an email. Gated until phase 3.",
        inputSchema: toolInputSchemas.draft_email,
        execute: handlers.draft_email,
      }),
      send_email: tool({
        description: "Queue an outbound email for Slack approval. Gated until phase 3.",
        inputSchema: toolInputSchemas.send_email,
        execute: handlers.send_email,
      }),
      read_thread: tool({
        description: "Read a Gmail thread. Gated until phase 3.",
        inputSchema: toolInputSchemas.read_thread,
        execute: handlers.read_thread,
      }),
    },
  });
}

export async function runSchedulerAgent(
  input: AgentRunInput,
): Promise<AgentRunResult> {
  const agent = createAgent(input.calendar, input.gmail);
  const result = await agent.generate({
    prompt: input.prompt,
  });

  if (hasDatabase()) {
    await getDb().insert(agentRuns).values({
      source: input.source,
      prompt: input.prompt,
      resultText: result.text,
      schedulingRequestId: input.schedulingRequestId,
    });
  }

  return {
    text: result.text,
    steps: result.steps.length,
  };
}
