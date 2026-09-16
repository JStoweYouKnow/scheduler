import { selectSkill, SKILLS } from "./skills";

describe("skills", () => {
  it("routes prep language to the prep skill", () => {
    expect(selectSkill("prep me for the Tubi call, pull Drive").name).toBe("prep");
  });

  it("honors an explicit skill name", () => {
    expect(selectSkill("hello", "track_project")).toBe(SKILLS.track_project);
  });

  it("defaults to schedule", () => {
    expect(selectSkill("what can you do").name).toBe("schedule");
  });
});
