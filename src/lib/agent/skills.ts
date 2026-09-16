import type { TeamConfig } from "../types";

export type SkillName =
  | "schedule"
  | "prep"
  | "followup"
  | "track_project"
  | "stakeholder_update";

export interface Skill {
  name: SkillName;
  title: string;
  instructions: string;
}

export const SKILLS: Record<SkillName, Skill> = {
  schedule: {
    name: "schedule",
    title: "Schedule",
    instructions: `Skill: schedule
Find or hold time. Call lookup_contact, then get_availability, then create_scheduling_request / create_event.
Never invent free slots. If get_availability returns conflictResolution, present those tradeoffs to the human — do not override protected time.`,
  },
  prep: {
    name: "prep",
    title: "Prep",
    instructions: `Skill: prep
Brief the owner before a meeting. Call get_meeting_context (request + notes + thread) then search_drive for related docs.
Return: purpose, last decisions, open questions, and 3 agenda bullets. Cite Drive titles when you use them.`,
  },
  followup: {
    name: "followup",
    title: "Follow-up",
    instructions: `Skill: followup
After a meeting, turn notes into next steps. Call get_meeting_context, then draft_email.
send_email only queues approval. Prefer a short numbered list of commitments with owners.`,
  },
  track_project: {
    name: "track_project",
    title: "Track project",
    instructions: `Skill: track_project
Keep projects, deliverables, and people notes durable. Use remember for facts (kind: project, person, decision, commitment, preference).
Use recall before answering "where did we leave X". Do not invent status.`,
  },
  stakeholder_update: {
    name: "stakeholder_update",
    title: "Stakeholder update",
    instructions: `Skill: stakeholder_update
Write a status note for an external party. recall project + people facts, then draft_email.
Keep it to: what shipped, what's blocked, the ask. Queue send_email for approval.`,
  },
};

const HINTS: Array<{ skill: SkillName; pattern: RegExp }> = [
  { skill: "prep", pattern: /\b(prep|brief|agenda|before the (call|meeting)|drive)\b/i },
  { skill: "followup", pattern: /\b(follow[ -]?up|recap|thanks for (the )?(time|meeting)|next steps)\b/i },
  { skill: "track_project", pattern: /\b(project|deliverable|milestone|remember|recall|status of)\b/i },
  { skill: "stakeholder_update", pattern: /\b(stakeholder|status update|update (for|to) |investor|counterparty update)\b/i },
  { skill: "schedule", pattern: /\b(schedul|hold|availability|meet|reschedul|calendar|time that works)\b/i },
];

export function selectSkill(prompt: string, explicit?: string | null): Skill {
  if (explicit && explicit in SKILLS) {
    return SKILLS[explicit as SkillName];
  }
  for (const hint of HINTS) {
    if (hint.pattern.test(prompt)) return SKILLS[hint.skill];
  }
  return SKILLS.schedule;
}

export function skillPrompt(team: TeamConfig, skill: Skill): string {
  return `${skill.instructions}

Studio: ${team.studio}. Skills on this agent: ${Object.values(SKILLS)
    .map((item) => item.name)
    .join(", ")}.`;
}
