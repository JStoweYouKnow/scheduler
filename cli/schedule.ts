#!/usr/bin/env npx tsx
import { config } from "dotenv";

config({ path: ".env.local" });
config();

const prompt = process.argv.slice(2).join(" ").trim();
const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const key = process.env.SCHEDULER_ADMIN_KEY;
const demo = process.env.DEMO_MODE === "1" || process.env.DEMO_MODE === "true";

if (!key && !demo) {
  console.error("SCHEDULER_ADMIN_KEY is required");
  process.exit(1);
}

function authHeaders(extra: Record<string, string> = {}): HeadersInit {
  return key ? { Authorization: `Bearer ${key}`, ...extra } : extra;
}

async function main() {
  if (!prompt || prompt === "--help") {
    console.log(`Usage:
  npm run schedule -- "set up 30 min with J next Tuesday"
  npm run schedule -- --list
  npm run schedule -- --approvals
  npm run schedule -- --approve <id>
  npm run schedule -- --reject <id>
  npm run schedule -- --inbox
  npm run schedule -- --dump-memory
  npm run schedule -- --consolidate`);
    return;
  }

  if (prompt === "--inbox") {
    const secret = process.env.CRON_SECRET ?? key;
    const res = await fetch(`${appUrl}/api/cron/inbox`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (prompt === "--dump-memory") {
    const res = await fetch(`${appUrl}/api/memory`, {
      method: "POST",
      headers: key ? { Authorization: `Bearer ${key}` } : {},
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (prompt === "--consolidate") {
    const secret = process.env.CRON_SECRET ?? key;
    const res = await fetch(`${appUrl}/api/cron/consolidate`, {
      headers: secret ? { Authorization: `Bearer ${secret}` } : {},
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (prompt === "--approvals") {
    const res = await fetch(`${appUrl}/api/approvals`, {
      headers: authHeaders(),
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const [flag, id] = prompt.split(/\s+/, 2);
  if (flag === "--approve" || flag === "--reject") {
    if (!id) {
      console.error("approval id is required");
      process.exit(1);
    }
    const res = await fetch(`${appUrl}/api/approvals`, {
      method: "POST",
      headers: authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        id,
        decision: flag === "--approve" ? "approved" : "rejected",
      }),
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    if (!res.ok) process.exit(1);
    return;
  }

  if (prompt === "--list") {
    const res = await fetch(`${appUrl}/api/requests`, {
      headers: authHeaders(),
    });
    const data = (await res.json()) as unknown;
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  const res = await fetch(`${appUrl}/api/agent/run`, {
    method: "POST",
    headers: authHeaders({ "Content-Type": "application/json" }),
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
