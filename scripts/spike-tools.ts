#!/usr/bin/env npx tsx
/**
 * Day-one spike: does Token Factory Nemotron return tool_calls,
 * or only reasoning_content with empty content (NemoClaw #3279)?
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const base = "https://api.tokenfactory.nebius.com/v1";
const key = process.env.NEBIUS_API_KEY;
const models = [
  process.env.MODEL_REASONING ?? "nvidia/nemotron-3-super-120b-a12b",
  process.env.MODEL_FAST ?? "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
];

if (!key) {
  console.error("NEBIUS_API_KEY is required");
  process.exit(1);
}

const tools = [
  {
    type: "function",
    function: {
      name: "echo",
      description: "Echo text back",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
];

async function probe(model: string) {
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "Call echo with text hello" }],
      tools,
      tool_choice: "auto",
      max_tokens: 512,
    }),
  });
  const json = (await res.json()) as {
    error?: { message?: string };
    choices?: Array<{
      message?: {
        content?: string | null;
        reasoning_content?: string | null;
        reasoning?: string | null;
        tool_calls?: unknown;
      };
    }>;
  };
  const msg = json.choices?.[0]?.message;
  console.log(JSON.stringify({
    model,
    status: res.status,
    error: json.error?.message,
    content: msg?.content ?? null,
    reasoning_content: msg?.reasoning_content ?? msg?.reasoning ?? null,
    tool_calls: msg?.tool_calls ?? null,
  }, null, 2));
}

async function main() {
  for (const model of models) await probe(model);
}

void main();
