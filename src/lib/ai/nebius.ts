/**
 * Thin Token Factory wrapper.
 *
 * NemoClaw #3279 (May 2026): Nemotron on Nebius returned reasoning_content with
 * empty content, and some tool calls 400'd through the OpenAI-compatible path.
 * If that still happens, copy reasoning into content (when there are no
 * tool_calls) and strip parallel_tool_calls. Live check: `npx tsx scripts/spike-tools.ts`.
 */

export const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1/";

type ChatMessage = {
  content?: string | null;
  reasoning_content?: string | null;
  reasoning?: string | null;
  tool_calls?: unknown;
};

type ChatCompletionBody = {
  choices?: Array<{ message?: ChatMessage }>;
};

export function liftReasoningContent<T>(payload: T): T {
  if (!payload || typeof payload !== "object") return payload;
  const body = payload as ChatCompletionBody;
  const message = body.choices?.[0]?.message;
  if (!message) return payload;
  if (message.tool_calls) return payload;
  const content = message.content;
  const reasoning = message.reasoning_content ?? message.reasoning;
  if (
    (content === undefined || content === null || content === "") &&
    typeof reasoning === "string" &&
    reasoning.length > 0
  ) {
    message.content = reasoning;
  }
  return payload;
}

export function transformNebiusRequestBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...body, parallel_tool_calls: false };
  const existing =
    next.chat_template_kwargs && typeof next.chat_template_kwargs === "object"
      ? (next.chat_template_kwargs as Record<string, unknown>)
      : {};
  next.chat_template_kwargs = { enable_thinking: true, ...existing };
  return next;
}

export async function nebiusFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const response = await fetch(input, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return response;
  const payload: unknown = await response.json();
  return new Response(JSON.stringify(liftReasoningContent(payload)), {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
