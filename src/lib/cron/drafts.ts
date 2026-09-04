export interface AgendaContext {
  title: string;
  when: string;
  owner: string;
  counterparty?: string | null;
  organization?: string | null;
  threadExcerpt?: string | null;
  lastNotes?: string | null;
}

export interface FollowUpContext {
  title: string;
  when: string;
  owner: string;
  counterparty?: string | null;
  notes?: string | null;
  threadExcerpt?: string | null;
}

export function composeAgenda(context: AgendaContext): string {
  const lines = [
    `Agenda — ${context.title}`,
    `When: ${context.when}`,
    `Owner: ${context.owner}`,
  ];
  if (context.counterparty) {
    lines.push(`With: ${context.counterparty}${context.organization ? ` (${context.organization})` : ""}`);
  }
  lines.push("", "Goals", "- Confirm purpose and desired outcome", "- Decisions needed tomorrow");
  if (context.lastNotes) {
    lines.push("", "From last meeting", context.lastNotes.trim());
  }
  if (context.threadExcerpt) {
    lines.push("", "From the thread", context.threadExcerpt.trim().slice(0, 1200));
  }
  lines.push("", "Follow-ups to cover", "- ");
  return lines.join("\n");
}

export function composeFollowUp(context: FollowUpContext): string {
  const greeting = context.counterparty
    ? `Hi ${context.counterparty.split(" ")[0]},`
    : "Hi,";
  const notes = context.notes?.trim() || context.threadExcerpt?.trim() || "Thanks for the time today.";
  return [
    greeting,
    "",
    `Thanks for meeting on ${context.title} (${context.when}).`,
    "",
    notes,
    "",
    "Next steps:",
    "- ",
    "",
    `Best,`,
    context.owner,
  ].join("\n");
}
