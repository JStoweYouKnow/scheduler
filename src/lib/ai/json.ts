export function parseJsonObject<T>(text: string): T {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const raw = (fenced?.[1] ?? trimmed).trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < start) {
    throw new Error("Model did not return a JSON object");
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}
