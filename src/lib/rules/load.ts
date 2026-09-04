import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import type { PersonRules, Weekday, WorkingHours } from "../types";

interface RawPersonRules {
  timezone: string;
  priority: number;
  bufferMinutes: number;
  workingHours: Partial<Record<Weekday, WorkingHours>>;
  protectedBlocks: PersonRules["protectedBlocks"];
}

const cache = new Map<string, PersonRules>();

export function loadPersonRules(
  slug: string,
  root = process.cwd(),
): PersonRules {
  const cached = cache.get(slug);
  if (cached) return cached;

  const specific = join(root, "config", "rules", `${slug}.yaml`);
  const fallback = join(root, "config", "rules", "default.yaml");
  const path = existsSync(specific) ? specific : fallback;
  if (!existsSync(path)) {
    throw new Error(`Missing rules file for ${slug} and no default.yaml`);
  }

  const raw = parseYaml(readFileSync(path, "utf8")) as RawPersonRules;
  const rules: PersonRules = {
    slug,
    timezone: raw.timezone,
    priority: raw.priority,
    bufferMinutes: raw.bufferMinutes,
    workingHours: raw.workingHours ?? {},
    protectedBlocks: raw.protectedBlocks ?? [],
  };
  cache.set(slug, rules);
  return rules;
}

export function resetRulesCache(): void {
  cache.clear();
}
