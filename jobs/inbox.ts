#!/usr/bin/env npx tsx
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { processInbox } = await import("../src/lib/email/inbox");
  const { runSchedulerAgent } = await import("../src/lib/agent/run");
  const { gmailPort } = await import("../src/lib/runtime");
  const stats = await processInbox({
    gmail: gmailPort(),
    onMatched: async (prompt, requestId) => {
      await runSchedulerAgent({
        prompt,
        source: "email",
        schedulingRequestId: requestId,
      });
    },
  });
  console.log(JSON.stringify(stats));
}

void main();
