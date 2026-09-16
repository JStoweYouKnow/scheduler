#!/usr/bin/env npx tsx
import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { consolidateMemory } = await import("../src/lib/memory/consolidate");
  const result = await consolidateMemory();
  console.log(JSON.stringify(result));
}

void main();
