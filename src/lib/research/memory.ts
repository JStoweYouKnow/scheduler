import {
  clampResults,
  sanitizeSnippet,
  UNTRUSTED_NOTE,
  type ResearchPort,
  type ResearchResponse,
  type ResearchResult,
} from "./port";

/**
 * In-memory research double. Used by tests and by DEMO_MODE so judges can run
 * the prep skill end to end with only a Nebius key.
 */
export class MemoryResearch implements ResearchPort {
  results: ResearchResult[] = [];
  answer?: string;
  calls: string[] = [];

  seed(results: ResearchResult[], answer?: string): void {
    this.results = [...results];
    this.answer = answer;
  }

  async search(query: string, options?: { maxResults?: number }): Promise<ResearchResponse> {
    this.calls.push(query);
    const needle = query.toLowerCase();
    const terms = needle.split(/\s+/).filter((term) => term.length > 2);
    const matched = this.results.filter((result) => {
      const haystack = `${result.title} ${result.snippet}`.toLowerCase();
      return terms.length === 0 || terms.some((term) => haystack.includes(term));
    });
    const findings: ResearchResponse = {
      available: true,
      query,
      results: (matched.length > 0 ? matched : this.results)
        .slice(0, clampResults(options?.maxResults))
        .map((result) => ({ ...result, snippet: sanitizeSnippet(result.snippet) })),
      note: UNTRUSTED_NOTE,
    };
    if (this.answer) findings.answer = this.answer;
    return findings;
  }
}
