import { classifyInboxWithNano, parseClassifyText } from "./classify";
import type { GmailMessage } from "./port";
import { EVAL_OPEN_REQUESTS, INBOX_EVAL_CASES } from "./eval-cases";
import {
  TOKEN_FACTORY_USD_PER_MILLION,
  classifyCostUsd,
  formatEvalTable,
  isClassifyCorrect,
  runInboxEval,
  summarizeEval,
} from "./eval";
import { fastModel, hasNebius, modelFastId, modelReasoningId, reasoningModel } from "../ai/models";

const message: GmailMessage = {
  id: "m1",
  threadId: "thread-abc",
  from: "sarah@tubi.tv",
  to: ["v@matriarch-studios.com"],
  subject: "Times that work next week",
  snippet: "Can we do 30 min?",
  body: "Tuesday afternoon works.",
  date: new Date("2026-09-08T17:00:00Z"),
};

describe("Nano inbox classify", () => {
  it("keeps a high-confidence heuristic match without calling the model", async () => {
    const plan = await classifyInboxWithNano(
      message,
      [
        {
          id: "req-1",
          threadId: "thread-abc",
          counterpartyEmail: "sarah@tubi.tv",
          counterpartyName: "Sarah Chen",
          organization: "Tubi",
          status: "awaiting_reply",
        },
      ],
      {
        action: "match",
        requestId: "req-1",
        reason: "thread",
        confidence: "high",
      },
    );
    expect(plan).toEqual({
      action: "match",
      requestId: "req-1",
      reason: "thread",
      confidence: "high",
    });
  });

  it("parses a match JSON object from model text", () => {
    const plan = parseClassifyText(
      '{"isScheduling":true,"action":"match","requestId":"req-tubi","reason":"email","confidence":"high"}',
      EVAL_OPEN_REQUESTS,
      { action: "open" },
      INBOX_EVAL_CASES[0]!.message,
    );
    expect(plan).toEqual({
      action: "match",
      requestId: "req-tubi",
      reason: "email",
      confidence: "high",
    });
  });
});

describe("inbox classify eval set", () => {
  it("has 30 labeled emails across ignore / match / open", () => {
    const counts = { ignore: 0, match: 0, open: 0 };
    for (const item of INBOX_EVAL_CASES) counts[item.gold.action] += 1;
    expect(INBOX_EVAL_CASES).toHaveLength(30);
    expect(counts).toEqual({ ignore: 12, match: 9, open: 9 });
  });

  it("scores match only when the request id is right", () => {
    expect(
      isClassifyCorrect(
        { action: "match", requestId: "req-tubi", reason: "email", confidence: "high" },
        { action: "match", requestId: "req-tubi" },
      ),
    ).toBe(true);
    expect(
      isClassifyCorrect(
        { action: "match", requestId: "req-j", reason: "email", confidence: "high" },
        { action: "match", requestId: "req-tubi" },
      ),
    ).toBe(false);
    expect(isClassifyCorrect({ action: "open" }, { action: "ignore", reason: "newsletter" })).toBe(false);
  });

  it("prices Nano at 1/5 the Super input list rate", () => {
    const nano = classifyCostUsd(1_000_000, 0, TOKEN_FACTORY_USD_PER_MILLION.nano);
    const sup = classifyCostUsd(1_000_000, 0, TOKEN_FACTORY_USD_PER_MILLION.super);
    expect(nano).toBeCloseTo(0.06);
    expect(sup / nano).toBeCloseTo(5);
  });

  it("summarizes accuracy, latency, and cost", () => {
    const summary = summarizeEval(
      "nano",
      INBOX_EVAL_CASES.slice(0, 2).map((item) => ({
        case: item,
        result: {
          plan: item.gold.action === "ignore" ? { action: "ignore" as const, reason: "x" } : { action: "open" as const },
          usage: { inputTokens: 100, outputTokens: 20 },
          latencyMs: 50,
          calledModel: true,
        },
      })),
      TOKEN_FACTORY_USD_PER_MILLION.nano,
    );
    expect(summary.n).toBe(2);
    expect(summary.correct).toBe(2);
    expect(summary.accuracy).toBe(1);
    expect(summary.costPerClassifyUsd).toBeGreaterThan(0);
    const table = formatEvalTable(summary, { ...summary, model: "super", costPerClassifyUsd: summary.costPerClassifyUsd * 20 });
    expect(table).toContain("20.0×");
  });
});

const live = Boolean(process.env.EVAL_INBOX && hasNebius());

describe.skipIf(!live)("inbox classify eval (live Token Factory)", () => {
  it(
    "runs Nano and Super on the 30 labeled mails",
    async () => {
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
      expect(nano.n).toBe(30);
      expect(sup.n).toBe(30);
      expect(nano.accuracy).toBeGreaterThanOrEqual(0.8);
      expect(sup.costPerClassifyUsd / nano.costPerClassifyUsd).toBeGreaterThan(1);
      console.log(`\n${formatEvalTable(nano, sup)}\n`);
    },
    300_000,
  );
});
