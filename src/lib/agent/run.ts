import { ToolLoopAgent, isStepCount, tool } from "ai";
import { loadTeamConfig } from "../config/team";
import { hasPersistence } from "../env";
import { reasoningModel } from "../ai/models";
import { systemPrompt } from "./prompt";
import { selectSkill, skillPrompt } from "./skills";
import { buildToolHandlers, toolInputSchemas } from "./tools";
import { recordAgentRun } from "../scheduling/repo";
import { calendarPort, drivePort, gmailPort } from "../runtime";
import type { CalendarPort } from "../calendar/port";
import type { GmailPort } from "../email/port";
import type { DrivePort } from "../drive/port";
import type { RequestSource } from "../types";

export interface AgentRunInput {
  prompt: string;
  source: RequestSource;
  slackChannel?: string;
  slackThreadTs?: string;
  calendar?: CalendarPort;
  gmail?: GmailPort;
  drive?: DrivePort;
  schedulingRequestId?: string;
  skill?: string;
}

export interface AgentRunResult {
  text: string;
  steps: number;
  skill: string;
}

function createAgent(
  calendar?: CalendarPort,
  gmail?: GmailPort,
  drive?: DrivePort,
  skillInstructions?: string,
) {
  const team = loadTeamConfig();
  const handlers = buildToolHandlers(
    calendar ?? calendarPort(),
    gmail ?? gmailPort(),
    drive ?? drivePort(),
  );
  const base = systemPrompt(team);
  return new ToolLoopAgent({
    model: reasoningModel(),
    temperature: 0.6,
    instructions: skillInstructions ? `${base}\n\n${skillInstructions}` : base,
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
          "Create a calendar event after the rules engine clears the slot. External counterparties go to dashboard approval.",
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
      search_drive: tool({
        description: "Search Drive for prep docs related to a meeting or project.",
        inputSchema: toolInputSchemas.search_drive,
        execute: handlers.search_drive,
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
        description: "Queue an outbound email for dashboard approval. Gated until phase 3.",
        inputSchema: toolInputSchemas.send_email,
        execute: handlers.send_email,
      }),
      read_thread: tool({
        description: "Read a Gmail thread. Gated until phase 3.",
        inputSchema: toolInputSchemas.read_thread,
        execute: handlers.read_thread,
      }),
      remember: tool({
        description: "Persist a durable fact about a person, project, decision, or commitment.",
        inputSchema: toolInputSchemas.remember,
        execute: handlers.remember,
      }),
      recall: tool({
        description: "Search durable memory facts.",
        inputSchema: toolInputSchemas.recall,
        execute: handlers.recall,
      }),
      dump_memory: tool({
        description: "Write people, projects, and facts to Markdown files the studio owns.",
        inputSchema: toolInputSchemas.dump_memory,
        execute: handlers.dump_memory,
      }),
    },
  });
}

export async function runSchedulerAgent(
  input: AgentRunInput,
): Promise<AgentRunResult> {
  const team = loadTeamConfig();
  const skill = selectSkill(input.prompt, input.skill);
  const agent = createAgent(
    input.calendar,
    input.gmail,
    input.drive,
    skillPrompt(team, skill),
  );
  const result = await agent.generate({
    prompt: input.prompt,
  });

  if (hasPersistence()) {
    await recordAgentRun({
      source: input.source,
      prompt: input.prompt,
      resultText: result.text,
      schedulingRequestId: input.schedulingRequestId,
    });
  }

  return {
    text: result.text,
    steps: result.steps.length,
    skill: skill.name,
  };
}
