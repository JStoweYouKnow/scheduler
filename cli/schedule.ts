#!/usr/bin/env npx tsx
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const prompt = process.argv.slice(2).join(" ").trim();
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const key = process.env.SCHEDULER_ADMIN_KEY;

if (!key) {
  console.error("SCHEDULER_ADMIN_KEY is required");
  process.exit(1);
}

async function main() {
  if (!prompt || prompt === "--help") {
    console.log(`Usage:
  npm run schedule -- "set up 30 min with cofounder next Tuesday"
  npm run schedule -- --list
  npm run schedule -- --inbox`);
    return;
  }

  if (prompt === "--inbox") {
    const secret = process.env.CRON_SECRET ?? key;
    const res = await fetch(`${appUrl}/api/cron/inbox`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (prompt === "--list") {
    const res = await fetch(`${appUrl}/api/requests`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const res = await fetch(`${appUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt, source: "cli" }),
  });
  const data = (await res.json()) as { text?: string; error?: string };
  if (!res.ok) {
    console.error(data.error ?? res.statusText);
    process.exit(1);
  }
  console.log(data.text);
}

void main();
