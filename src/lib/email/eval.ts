import type { LanguageModel } from "ai";
import { planInboxAction } from "./inbox";
import {
  classifyInbox,
  type ClassifyResult,
  type NanoInboxPlan,
} from "./classify";
import {
  EVAL_OPEN_REQUESTS,
  INBOX_EVAL_CASES,
  type InboxEvalCase,
  type InboxGold,
} from "./eval-cases";

/** Token Factory list prices, USD per million tokens. https://tokenfactory.nebius.com/model-catalog.md */
export const TOKEN_FACTORY_USD_PER_MILLION = {
  nano: { input: 0.06, output: 0.24 },
  super: { input: 0.3, output: 0.9 },
} as const;

export type PriceTier = keyof typeof TOKEN_FACTORY_USD_PER_MILLION;

export function classifyCostUsd(
  inputTokens: number,
  outputTokens: number,
  prices: { input: number; output: number },
): number {
  return (inputTokens / 1_000_000) * prices.input + (outputTokens / 1_000_000) * prices.output;
}

export function isClassifyCorrect(plan: NanoInboxPlan, gold: InboxGold): boolean {
  if (plan.action !== gold.action) return false;
  if (gold.action === "match" && plan.action === "match") {
    return plan.requestId === gold.requestId;
  }
  return true;
}

export type EvalRow = {
  id: string;
  gold: InboxGold["action"];
  predicted: NanoInboxPlan["action"];
  correct: boolean;
  latencyMs: number;
  inputTokens: number;
  outputTokens: number;
  calledModel: boolean;
};

export type EvalSummary = {
  model: string;
  n: number;
  correct: number;
  accuracy: number;
  meanLatencyMs: number;
  p50LatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  costPerClassifyUsd: number;
  modelCalls: number;
  rows: EvalRow[];
};

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export function summarizeEval(
  model: string,
  results: Array<{ case: InboxEvalCase; result: ClassifyResult }>,
  prices: { input: number; output: number },
): EvalSummary {
  const rows: EvalRow[] = results.map(({ case: item, result }) => ({
    id: item.id,
    gold: item.gold.action,
    predicted: result.plan.action,
    correct: isClassifyCorrect(result.plan, item.gold),
    latencyMs: result.latencyMs,
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
    calledModel: result.calledModel,
  }));
  const latencies = rows.map((row) => row.latencyMs).sort((a, b) => a - b);
  const inputTokens = rows.reduce((sum, row) => sum + row.inputTokens, 0);
  const outputTokens = rows.reduce((sum, row) => sum + row.outputTokens, 0);
  const costUsd = classifyCostUsd(inputTokens, outputTokens, prices);
  const correct = rows.filter((row) => row.correct).length;
  return {
    model,
    n: rows.length,
    correct,
    accuracy: rows.length === 0 ? 0 : correct / rows.length,
    meanLatencyMs: latencies.reduce((sum, ms) => sum + ms, 0) / (latencies.length || 1),
    p50LatencyMs: percentile(latencies, 0.5),
    inputTokens,
    outputTokens,
    costUsd,
    costPerClassifyUsd: rows.length === 0 ? 0 : costUsd / rows.length,
    modelCalls: rows.filter((row) => row.calledModel).length,
    rows,
  };
}

export async function runInboxEval(args: {
  model: LanguageModel;
  modelId: string;
  prices: { input: number; output: number };
  skipHeuristic?: boolean;
}): Promise<EvalSummary> {
  const results: Array<{ case: InboxEvalCase; result: ClassifyResult }> = [];
  for (const item of INBOX_EVAL_CASES) {
    const heuristic = planInboxAction(item.message, EVAL_OPEN_REQUESTS);
    const result = await classifyInbox({
      message: item.message,
      openRequests: EVAL_OPEN_REQUESTS,
      heuristic,
      model: args.model,
      skipHeuristic: args.skipHeuristic ?? true,
    });
    results.push({ case: item, result });
  }
  return summarizeEval(args.modelId, results, args.prices);
}

export function formatEvalTable(nano: EvalSummary, sup: EvalSummary): string {
  const costRatio = nano.costPerClassifyUsd > 0 ? sup.costPerClassifyUsd / nano.costPerClassifyUsd : 0;
  const pct = (value: number) => `${(value * 100).toFixed(0)}%`;
  const usd = (value: number) => `$${value.toFixed(6)}`;
  const ms = (value: number) => `${Math.round(value)} ms`;
  return [
    `| | Nano | Super |`,
    `| --- | --- | --- |`,
    `| Model | \`${nano.model}\` | \`${sup.model}\` |`,
    `| Accuracy (${nano.n} labeled) | ${pct(nano.accuracy)} (${nano.correct}/${nano.n}) | ${pct(sup.accuracy)} (${sup.correct}/${sup.n}) |`,
    `| Mean latency | ${ms(nano.meanLatencyMs)} | ${ms(sup.meanLatencyMs)} |`,
    `| p50 latency | ${ms(nano.p50LatencyMs)} | ${ms(sup.p50LatencyMs)} |`,
    `| Tokens in / out | ${nano.inputTokens} / ${nano.outputTokens} | ${sup.inputTokens} / ${sup.outputTokens} |`,
    `| Cost / classify | ${usd(nano.costPerClassifyUsd)} | ${usd(sup.costPerClassifyUsd)} |`,
    `| Super / Nano cost | | **${costRatio.toFixed(1)}×** |`,
  ].join("\n");
}
