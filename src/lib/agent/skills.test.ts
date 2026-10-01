import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TeamConfig } from "../types";
import { getSkills, resetSkillsCache, selectSkill, skillPrompt } from "./skills";

beforeEach(() => {
  resetSkillsCache();
});

describe("skills", () => {
  it("loads YAML from config/skills", () => {
    const skills = getSkills();
    expect(Object.keys(skills).sort()).toEqual([
      "followup",
      "prep",
      "schedule",
      "stakeholder_update",
      "track_project",
    ]);
  });

  it("routes prep language to the prep skill", () => {
    expect(selectSkill("prep me for the Tubi call, pull Drive").name).toBe("prep");
  });

  it("routes research language to the prep skill", () => {
    expect(selectSkill("research Tubi before Tuesday").name).toBe("prep");
    expect(selectSkill("who is Sarah Chen").name).toBe("prep");
  });

  it("honors an explicit skill name", () => {
    expect(selectSkill("hello", "track_project").name).toBe("track_project");
  });

  it("defaults to schedule", () => {
    expect(selectSkill("what can you do").name).toBe("schedule");
  });

  it("lists YAML skills in the system prompt", () => {
    const skill = selectSkill("hold 30 minutes with J");
    const team = { studio: "Matriarch" } as TeamConfig;
    const text = skillPrompt(team, skill);
    expect(text).toContain("Skill: schedule");
    expect(text).toContain("prep");
  });

  it("picks up a new YAML file without TypeScript", () => {
    const root = mkdtempSync(join(tmpdir(), "skills-"));
    mkdirSync(join(root, "config", "skills"), { recursive: true });
    writeFileSync(
      join(root, "config", "skills", "schedule.yaml"),
      "name: schedule\ndefault: true\ninstructions: Hold time.\n",
    );
    writeFileSync(
      join(root, "config", "skills", "debrief.yaml"),
      "name: debrief\npriority: 5\nwhen:\n  - debrief\ninstructions: Capture the debrief.\n",
    );
    expect(selectSkill("debrief the Tubi call", null, root).name).toBe("debrief");
  });
});
