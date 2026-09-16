import { desc, eq, ilike, or } from "drizzle-orm";
import { getDb } from "../db/client";
import { deliverables, memoryFacts, people, projects } from "../db/schema";
import { isDemoMode } from "../demo/mode";
import { demoStore, newId, seedDemoMemory, type FactRow } from "../demo/store";

function persistInMemory(): boolean {
  return isDemoMode();
}

export async function rememberFact(input: {
  kind: string;
  subject: string;
  fact: string;
  source?: string;
  sourceId?: string;
  projectId?: string;
  personId?: string;
}): Promise<FactRow> {
  if (persistInMemory()) {
    seedDemoMemory();
    const row: FactRow = {
      id: newId(),
      kind: input.kind,
      subject: input.subject,
      fact: input.fact,
      source: input.source ?? "remember",
      sourceId: input.sourceId ?? null,
      projectId: input.projectId ?? null,
      personId: input.personId ?? null,
      createdAt: new Date(),
    };
    demoStore().facts.unshift(row);
    return row;
  }
  const db = getDb();
  const [row] = await db
    .insert(memoryFacts)
    .values({
      kind: input.kind,
      subject: input.subject,
      fact: input.fact,
      source: input.source ?? "remember",
      sourceId: input.sourceId,
      projectId: input.projectId,
      personId: input.personId,
    })
    .returning();
  if (!row) throw new Error("Failed to remember fact");
  return row;
}

export async function recallFacts(query: string, limit = 8): Promise<FactRow[]> {
  const needle = query.trim().toLowerCase();
  if (persistInMemory()) {
    seedDemoMemory();
    return demoStore()
      .facts.filter((fact) => {
        const hay = `${fact.kind} ${fact.subject} ${fact.fact}`.toLowerCase();
        return !needle || hay.includes(needle);
      })
      .slice(0, limit);
  }
  const db = getDb();
  if (!needle) {
    return db.select().from(memoryFacts).orderBy(desc(memoryFacts.createdAt)).limit(limit);
  }
  const pattern = `%${query}%`;
  return db
    .select()
    .from(memoryFacts)
    .where(
      or(
        ilike(memoryFacts.subject, pattern),
        ilike(memoryFacts.fact, pattern),
        ilike(memoryFacts.kind, pattern),
      ),
    )
    .orderBy(desc(memoryFacts.createdAt))
    .limit(limit);
}

export async function listProjects() {
  if (persistInMemory()) {
    seedDemoMemory();
    return demoStore().projects;
  }
  return getDb().select().from(projects).orderBy(desc(projects.updatedAt));
}

export async function listPeople() {
  if (persistInMemory()) {
    seedDemoMemory();
    return demoStore().people;
  }
  return getDb().select().from(people).orderBy(desc(people.updatedAt));
}

export async function listDeliverables() {
  if (persistInMemory()) {
    seedDemoMemory();
    return demoStore().deliverables;
  }
  return getDb().select().from(deliverables).orderBy(desc(deliverables.createdAt));
}

export async function listAllFacts() {
  if (persistInMemory()) {
    seedDemoMemory();
    return demoStore().facts;
  }
  return getDb().select().from(memoryFacts).orderBy(desc(memoryFacts.createdAt)).limit(200);
}

export async function upsertPerson(input: {
  name: string;
  email?: string;
  organization?: string;
  notes?: string;
}) {
  if (persistInMemory()) {
    seedDemoMemory();
    const existing = demoStore().people.find(
      (person) =>
        person.email?.toLowerCase() === input.email?.toLowerCase() ||
        person.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (existing) {
      existing.notes = input.notes ?? existing.notes;
      existing.organization = input.organization ?? existing.organization;
      existing.updatedAt = new Date();
      return existing;
    }
    const row = {
      id: newId(),
      name: input.name,
      email: input.email ?? null,
      organization: input.organization ?? null,
      notes: input.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoStore().people.push(row);
    return row;
  }
  const db = getDb();
  if (input.email) {
    const [existing] = await db.select().from(people).where(eq(people.email, input.email));
    if (existing) {
      const [row] = await db
        .update(people)
        .set({
          name: input.name,
          organization: input.organization ?? existing.organization,
          notes: input.notes ?? existing.notes,
          updatedAt: new Date(),
        })
        .where(eq(people.id, existing.id))
        .returning();
      return row;
    }
  }
  const [row] = await db
    .insert(people)
    .values({
      name: input.name,
      email: input.email,
      organization: input.organization,
      notes: input.notes,
    })
    .returning();
  return row;
}

export async function upsertProject(input: { name: string; summary?: string; status?: string }) {
  if (persistInMemory()) {
    seedDemoMemory();
    const existing = demoStore().projects.find(
      (project) => project.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (existing) {
      existing.summary = input.summary ?? existing.summary;
      existing.status = input.status ?? existing.status;
      existing.updatedAt = new Date();
      return existing;
    }
    const row = {
      id: newId(),
      name: input.name,
      status: input.status ?? "active",
      summary: input.summary ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    demoStore().projects.push(row);
    return row;
  }
  const db = getDb();
  const [existing] = await db.select().from(projects).where(eq(projects.name, input.name));
  if (existing) {
    const [row] = await db
      .update(projects)
      .set({
        summary: input.summary ?? existing.summary,
        status: input.status ?? existing.status,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, existing.id))
      .returning();
    return row;
  }
  const [row] = await db
    .insert(projects)
    .values({
      name: input.name,
      summary: input.summary,
      status: input.status ?? "active",
    })
    .returning();
  return row;
}
