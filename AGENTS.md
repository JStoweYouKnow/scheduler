# Scheduler

Scheduling agent (phase 3). Keep wrappers thin; put logic in `src/lib`.

- Conflicts go through `src/lib/rules/engine.ts`. Do not let the model invent availability.
- Every user-facing ask should create or update a `scheduling_request`.
- Inbound Gmail is matched before the agent runs (`src/lib/email/inbox.ts`).
- `send_email` only creates an approval. Live send is `executeApprovedAction`.
- Agent loop: `ToolLoopAgent` from `ai`, Nemotron Super via `@ai-sdk/openai-compatible` + `NEBIUS_API_KEY`. Nano classifies inbound mail. Ultra only for multi-party conflicts with no clean slot.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
