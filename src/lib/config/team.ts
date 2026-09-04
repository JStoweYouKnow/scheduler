import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { SharedInboxConfig, TeamConfig, TeamMemberConfig } from "../types";

interface RawTeamConfig {
  studio: string;
  phase: number;
  internalDomains: string[];
  slackChannel: string;
  sharedInbox?: SharedInboxConfig;
  members: Array<{
    slug: string;
    name: string;
    email: string;
    slackUserId?: string;
    timezone: string;
  }>;
}

let cached: TeamConfig | undefined;

export function loadTeamConfig(root = process.cwd()): TeamConfig {
  if (cached) return cached;
  const raw = parseYaml(
    readFileSync(join(root, "config", "team.yaml"), "utf8"),
  ) as RawTeamConfig;
  if (raw.phase !== 1 && raw.phase !== 2 && raw.phase !== 3) {
    throw new Error(`Invalid scheduler phase: ${raw.phase}`);
  }
  cached = {
    studio: raw.studio,
    phase: raw.phase,
    internalDomains: raw.internalDomains,
    slackChannel: raw.slackChannel,
    sharedInbox: raw.sharedInbox,
    members: raw.members.map(
      (member): TeamMemberConfig => ({
        slug: member.slug,
        name: member.name,
        email: member.email,
        slackUserId: member.slackUserId,
        timezone: member.timezone,
      }),
    ),
  };
  return cached;
}

export function resetTeamConfigCache(): void {
  cached = undefined;
}

export function findMember(
  team: TeamConfig,
  hint: string,
): TeamMemberConfig | undefined {
  const needle = hint.trim().toLowerCase();
  return team.members.find(
    (member) =>
      member.slug.toLowerCase() === needle ||
      member.name.toLowerCase() === needle ||
      member.email.toLowerCase() === needle ||
      member.slackUserId === hint,
  );
}

export function requireMember(team: TeamConfig, hint: string): TeamMemberConfig {
  const member = findMember(team, hint);
  if (!member) {
    throw new Error(`Unknown team member: ${hint}`);
  }
  return member;
}
