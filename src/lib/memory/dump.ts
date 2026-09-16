import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { listAllFacts, listDeliverables, listPeople, listProjects } from "./repo";

export function memoryDumpDir(root = process.cwd()): string {
  return process.env.MEMORY_DUMP_DIR?.trim() || join(root, "memory");
}

export async function dumpMemoryMarkdown(root = process.cwd()): Promise<{ dir: string; files: string[] }> {
  const dir = memoryDumpDir(root);
  await mkdir(dir, { recursive: true });
  const [projectRows, peopleRows, factRows, deliverableRows] = await Promise.all([
    listProjects(),
    listPeople(),
    listAllFacts(),
    listDeliverables(),
  ]);

  const projects = [
    "# Projects",
    "",
    ...projectRows.flatMap((project) => {
      const items = deliverableRows.filter((item) => item.projectId === project.id);
      return [
        `## ${project.name}`,
        "",
        `- Status: ${project.status}`,
        project.summary ? `- Summary: ${project.summary}` : null,
        ...items.map((item) => `- Deliverable: ${item.title} (${item.status})`),
        "",
      ].filter((line): line is string => line !== null);
    }),
  ].join("\n");

  const people = [
    "# People",
    "",
    ...peopleRows.flatMap((person) => [
      `## ${person.name}`,
      "",
      person.email ? `- Email: ${person.email}` : null,
      person.organization ? `- Organization: ${person.organization}` : null,
      person.notes ? `- Notes: ${person.notes}` : null,
      "",
    ]),
  ]
    .filter((line): line is string => line !== null)
    .join("\n");

  const facts = [
    "# Memory facts",
    "",
    ...factRows.map(
      (fact) => `- **${fact.kind}** / ${fact.subject}: ${fact.fact}${fact.source ? ` (${fact.source})` : ""}`,
    ),
    "",
  ].join("\n");

  const files = ["projects.md", "people.md", "facts.md"];
  await writeFile(join(dir, "projects.md"), projects, "utf8");
  await writeFile(join(dir, "people.md"), people, "utf8");
  await writeFile(join(dir, "facts.md"), facts, "utf8");
  return { dir, files };
}
