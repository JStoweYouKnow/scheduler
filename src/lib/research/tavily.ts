/**
 * Tavily search port. Thin wrapper: POST /search, normalise, sanitise.
 *
 * Deliberately does not request `include_raw_content` — snippets are enough
 * for a meeting brief, and whole-page text is a much larger prompt-injection
 * surface for an agent that can write calendar events and queue mail.
 */
import {
  clampResults,
  sanitizeSnippet,
  UNTRUSTED_NOTE,
  type ResearchOptions,
  type ResearchPort,
  type ResearchResponse,
  type ResearchResult,
} from "./port";

export const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const TIMEOUT_MS = 15_000;

export function hasTavily(): boolean {
  return Boolean(process.env.TAVILY_API_KEY?.trim());
}

type TavilyRawResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
  published_date?: unknown;
};

type TavilyRawResponse = {
  answer?: unknown;
  results?: unknown;
};

export function buildTavilyRequest(query: string, options?: ResearchOptions) {
  const body: Record<string, unknown> = {
    query,
    search_depth: "basic",
    topic: options?.topic ?? "general",
    max_results: clampResults(options?.maxResults),
    include_answer: "basic",
    include_raw_content: false,
  };
  if (options?.recency) body.time_range = options.recency;
  return body;
}

export function normalizeTavilyResponse(
  query: string,
  payload: unknown,
): ResearchResponse {
  const raw = (payload ?? {}) as TavilyRawResponse;
  const rows = Array.isArray(raw.results) ? raw.results : [];
  const results: ResearchResult[] = rows.flatMap((row) => {
    const item = (row ?? {}) as TavilyRawResult;
    const url = typeof item.url === "string" ? item.url : "";
    const title = typeof item.title === "string" ? item.title : "";
    if (!url) return [];
    const result: ResearchResult = {
      title: sanitizeSnippet(title, 200) || url,
      url,
      snippet:
        typeof item.content === "string" ? sanitizeSnippet(item.content) : "",
    };
    if (typeof item.published_date === "string" && item.published_date) {
      result.publishedDate = item.published_date;
    }
    if (typeof item.score === "number") result.score = item.score;
    return [result];
  });

  const findings: ResearchResponse = {
    available: true,
    query,
    results,
    note: UNTRUSTED_NOTE,
  };
  if (typeof raw.answer === "string" && raw.answer.trim()) {
    findings.answer = sanitizeSnippet(raw.answer, 800);
  }
  return findings;
}

export function createTavilyResearchPort(): ResearchPort {
  return {
    async search(query, options): Promise<ResearchResponse> {
      const key = process.env.TAVILY_API_KEY?.trim();
      if (!key) {
        return {
          available: false,
          reason:
            "TAVILY_API_KEY is not set — skip web research and brief from Drive and thread context instead.",
        };
      }
      if (!query.trim()) {
        return { available: false, reason: "Empty research query." };
      }
      try {
        const response = await fetch(TAVILY_SEARCH_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(buildTavilyRequest(query, options)),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          return {
            available: false,
            reason: `Tavily returned ${response.status}. ${sanitizeSnippet(detail, 200)}`.trim(),
          };
        }
        return normalizeTavilyResponse(query, await response.json());
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Tavily request failed";
        // Never throw into the tool loop — a failed lookup degrades the brief,
        // it does not fail the meeting prep.
        return { available: false, reason: sanitizeSnippet(message, 200) };
      }
    },
  };
}
