import { generateText } from "ai";
import { hasNebius, ultraModel } from "./models";
import type { Conflict } from "../types";

export async function resolveMultiPartyConflict(input: {
  users: string[];
  windowStart: string;
  windowEnd: string;
  durationMinutes: number;
  conflicts: Conflict[];
}): Promise<{ recommendation: string; tradeoffs: string[] } | null> {
  if (input.users.length < 2) return null;
  if (!hasNebius()) return null;
  const { text } = await generateText({
    model: ultraModel(),
    temperature: 0.3,
    prompt: [
      "The rules engine found no clean slot. You must not invent availability.",
      "Given the conflict list, recommend which human tradeoff to offer (drop an attendee, move a protected block, widen the window).",
      "Return plain text: first line is the recommendation, then up to 4 bullet tradeoffs.",
      `Users: ${input.users.join(", ")}`,
      `Window: ${input.windowStart} → ${input.windowEnd}`,
      `Duration: ${input.durationMinutes}m`,
      `Conflicts: ${JSON.stringify(input.conflicts.slice(0, 24))}`,
    ].join("\n"),
  });
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const recommendation = lines[0] ?? text.trim();
  const tradeoffs = lines.slice(1).map((line) => line.replace(/^[-*]\s*/, ""));
  return { recommendation, tradeoffs };
}
