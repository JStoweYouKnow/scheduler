import { desc } from "drizzle-orm";
import { generateText } from "ai";
import { getDb } from "../db/client";
import { agentRuns, inboundMessages, meetingNotes } from "../db/schema";
import { isDemoMode } from "../demo/mode";
import { demoStore, seedDemoMemory } from "../demo/store";
import { hasNebius, reasoningModel } from "../ai/models";
import { parseJsonObject } from "../ai/json";
import { rememberFact, upsertPerson, upsertProject } from "./repo";

interface ExtractedFact {
  kind: string;
  subject: string;
  fact: string;
  personName?: string;
  personEmail?: string;
  organization?: string;
  projectName?: string;
}

async function sourceBlobs(): Promise<Array<{ source: string; sourceId: string; text: string }>> {
  if (isDemoMode()) {
    seedDemoMemory();
    const store = demoStore();
    return [
      ...store.runs.map((run) => ({
        source: "agent_run",
        sourceId: run.id,
        text: `${run.prompt}\n${run.resultText ?? ""}`,
      })),
      ...store.notes.map((note) => ({
        source: "meeting_notes",
        sourceId: note.id,
        text: [note.notes, note.agendaDraft, note.followUpDraft].filter(Boolean).join("\n"),
      })),
      ...store.inbound.map((row) => ({
        source: "thread",
        sourceId: row.id,
        text: `${row.fromAddress ?? ""} ${row.subject ?? ""} ${row.snippet ?? ""}`,
      })),
    ];
  }

  const db = getDb();
  const [runs, notes, inbound] = await Promise.all([
    db.select().from(agentRuns).orderBy(desc(agentRuns.createdAt)).limit(40),
    db.select().from(meetingNotes).orderBy(desc(meetingNotes.createdAt)).limit(40),
    db.select().from(inboundMessages).orderBy(desc(inboundMessages.createdAt)).limit(40),
  ]);
  return [
    ...runs.map((run) => ({
      source: "agent_run",
      sourceId: run.id,
      text: `${run.prompt}\n${run.resultText ?? ""}`,
    })),
    ...notes.map((note) => ({
      source: "meeting_notes",
      sourceId: note.id,
      text: [note.notes, note.agendaDraft, note.followUpDraft].filter(Boolean).join("\n"),
    })),
    ...inbound.map((row) => ({
      source: "thread",
      sourceId: row.id,
      text: `${row.fromAddress ?? ""} ${row.subject ?? ""} ${row.snippet ?? ""}`,
    })),
  ];
}

export async function consolidateMemory(): Promise<{ facts: number }> {
  const blobs = await sourceBlobs();
  const corpus = blobs
    .map((blob) => `[${blob.source} ${blob.sourceId}]\n${blob.text}`)
    .join("\n\n")
    .slice(0, 12000);
  if (!corpus.trim()) return { facts: 0 };
  if (!hasNebius()) return { facts: 0 };

  const { text } = await generateText({
    model: reasoningModel(),
    temperature: 0.3,
    prompt: [
      "Extract durable scheduling/studio facts from the logs.",
      "Return JSON: {\"facts\":[{\"kind\":\"person|project|decision|commitment|preference\",\"subject\":\"...\",\"fact\":\"...\",\"personName\":\"optional\",\"personEmail\":\"optional\",\"organization\":\"optional\",\"projectName\":\"optional\"}]}",
      "Skip ephemeral slot proposals. Max 12 facts.",
      "",
      corpus,
    ].join("\n"),
  });
  const parsed = parseJsonObject<{ facts?: ExtractedFact[] }>(text);
  const facts = parsed.facts ?? [];
  let written = 0;
  for (const fact of facts) {
    if (!fact.subject || !fact.fact) continue;
    let personId: string | undefined;
    let projectId: string | undefined;
    if (fact.personName || fact.personEmail) {
      const person = await upsertPerson({
        name: fact.personName ?? fact.subject,
        email: fact.personEmail,
        organization: fact.organization,
      });
      personId = person?.id;
    }
    if (fact.projectName) {
      const project = await upsertProject({ name: fact.projectName });
      projectId = project?.id;
    }
    await rememberFact({
      kind: fact.kind || "note",
      subject: fact.subject,
      fact: fact.fact,
      source: "consolidation",
      personId,
      projectId,
    });
    written += 1;
  }
  return { facts: written };
}
