import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { TeamConfig } from "../types";

export interface Skill {
  name: string;
  title: string;
  instructions: string;
  when: string[];
  default: boolean;
  priority: number;
}

interface RawSkill {
  name?: string;
  title?: string;
  instructions?: string;
  when?: unknown;
  default?: boolean;
  priority?: number;
}

const caches = new Map<string, Skill[]>();

function skillsDir(root: string): string {
  return join(root, "config", "skills");
}

function phrasePattern(phrase: string): RegExp {
  const escaped = phrase.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\W)${escaped}(?:\\W|$)`, "i");
}

function parseSkillFile(path: string, fallbackName: string): Skill {
  const raw = parseYaml(readFileSync(path, "utf8")) as RawSkill | null;
  if (!raw || typeof raw !== "object") {
    throw new Error(`Invalid skill YAML: ${path}`);
  }
  const name = (raw.name?.trim() || fallbackName).toLowerCase();
  const instructions = raw.instructions?.trim();
  if (!instructions) {
    throw new Error(`Skill ${name} is missing instructions`);
  }
  const when = Array.isArray(raw.when)
    ? raw.when.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
  return {
    name,
    title: raw.title?.trim() || name,
    instructions,
    when,
    default: Boolean(raw.default),
    priority: typeof raw.priority === "number" ? raw.priority : 100,
  };
}

export function loadSkills(root = process.cwd()): Skill[] {
  const hit = caches.get(root);
  if (hit) return hit;
  const dir = skillsDir(root);
  if (!existsSync(dir)) {
    throw new Error(`Missing skills directory: ${dir}`);
  }
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".yaml") || file.endsWith(".yml"))
    .sort();
  if (files.length === 0) {
    throw new Error(`No skill YAML files in ${dir}`);
  }
  const loaded = files.map((file) =>
    parseSkillFile(join(dir, file), file.replace(/\.ya?ml$/i, "")),
  );
  const names = new Set<string>();
  for (const skill of loaded) {
    if (names.has(skill.name)) {
      throw new Error(`Duplicate skill name: ${skill.name}`);
    }
    names.add(skill.name);
  }
  loaded.sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
  caches.set(root, loaded);
  return loaded;
}

export function resetSkillsCache(): void {
  caches.clear();
}

export function getSkills(root = process.cwd()): Record<string, Skill> {
  return Object.fromEntries(loadSkills(root).map((skill) => [skill.name, skill]));
}

function defaultSkill(skills: Skill[]): Skill {
  return skills.find((skill) => skill.default) ?? skills[0]!;
}

export function selectSkill(
  prompt: string,
  explicit?: string | null,
  root = process.cwd(),
): Skill {
  const skills = loadSkills(root);
  const byName = getSkills(root);
  if (explicit) {
    const named = byName[explicit.trim().toLowerCase()];
    if (named) return named;
  }
  for (const skill of skills) {
    if (skill.when.some((phrase) => phrasePattern(phrase).test(prompt))) {
      return skill;
    }
  }
  return defaultSkill(skills);
}

export function skillPrompt(team: TeamConfig, skill: Skill, root = process.cwd()): string {
  const names = loadSkills(root)
    .map((item) => item.name)
    .join(", ");
  return `Skill: ${skill.name}
${skill.instructions}

Studio: ${team.studio}. Skills on this agent: ${names}.`;
}
