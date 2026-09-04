import { eq } from "drizzle-orm";
import { loadTeamConfig } from "../config/team";
import { getDb, closeDb } from "./client";
import { teamMembers } from "./schema";

async function seed() {
  const team = loadTeamConfig();
  const db = getDb();
  for (const member of team.members) {
    const existing = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.slug, member.slug))
      .then((rows) => rows[0]);
    if (existing) {
      await db
        .update(teamMembers)
        .set({
          displayName: member.name,
          email: member.email,
          slackUserId: member.slackUserId,
          timezone: member.timezone,
        })
        .where(eq(teamMembers.id, existing.id));
      continue;
    }
    await db.insert(teamMembers).values({
      slug: member.slug,
      displayName: member.name,
      email: member.email,
      slackUserId: member.slackUserId,
      timezone: member.timezone,
    });
  }
  await closeDb();
}

void seed();
