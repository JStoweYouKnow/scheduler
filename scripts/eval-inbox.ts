#!/usr/bin/env npx tsx
/**
 * Tiny inbox-classify eval: 30 labeled mails, Nano vs Super.
 * Usage: npm run eval:inbox
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { hasNebius, fastModel, reasoningModel, modelFastId, modelReasoningId } = await import(
    "../src/lib/ai/models"
  );
  if (!hasNebius()) {
    console.error("NEBIUS_API_KEY is required");
    process.exit(1);
  }
  const { TOKEN_FACTORY_USD_PER_MILLION, formatEvalTable, runInboxEval } = await import(
    "../src/lib/email/eval"
  );
  const { INBOX_EVAL_CASES } = await import("../src/lib/email/eval-cases");
  const ignore = INBOX_EVAL_CASES.filter((item) => item.gold.action === "ignore").length;

  console.log(`Evaluating ${INBOX_EVAL_CASES.length} labeled emails (skip heuristic)…`);
  const nano = await runInboxEval({
    model: fastModel(),
    modelId: modelFastId(),
    prices: TOKEN_FACTORY_USD_PER_MILLION.nano,
    skipHeuristic: true,
  });
  const sup = await runInboxEval({
    model: reasoningModel(),
    modelId: modelReasoningId(),
    prices: TOKEN_FACTORY_USD_PER_MILLION.super,
    skipHeuristic: true,
  });

  const costRatio = nano.costPerClassifyUsd > 0 ? sup.costPerClassifyUsd / nano.costPerClassifyUsd : 0;
  const nanoShare = ignore / INBOX_EVAL_CASES.length;

  console.log("");
  console.log(formatEvalTable(nano, sup));
  console.log("");
  console.log(
    `Nano handles ${(nanoShare * 100).toFixed(0)}% of this set as ignore (no Super tool loop). Cost ratio Super/Nano = ${costRatio.toFixed(1)}×.`,
  );
  const misses = (rows: typeof nano.rows) =>
    rows.filter((row) => !row.correct).map((row) => `${row.id}:${row.gold}→${row.predicted}`);
  if (nano.correct < nano.n) console.log("Nano misses:", misses(nano.rows).join(", ") || "none");
  if (sup.correct < sup.n) console.log("Super misses:", misses(sup.rows).join(", ") || "none");
}

void main();
