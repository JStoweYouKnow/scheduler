# Hackathon submission notes

NVIDIA x Nebius Global AI Hackathon — **Personal AI track**.

This project existed before the Submission Period. This file states what was
already there and what was built for the hackathon, mapped to files so judges
can verify against the git history.

## What existed before (commit `7c5a252`, Sept 3, 2026)

A scheduling agent for a two-person studio, "phases 1–3" as described in the
README of that commit:

| Area | Files | Notes |
| --- | --- | --- |
| Tool-loop agent | `src/lib/agent/run.ts`, `prompt.ts`, `tools.ts` | Ran `anthropic/claude-sonnet-5` via Vercel AI Gateway. Nine tools. |
| Rules engine | `src/lib/rules/`, `config/rules/*.yaml` | Working hours, buffers, protected blocks. Deterministic, no model. |
| Scheduling state machine | `src/lib/scheduling/` (state-machine, match-thread, approval, execute-approval, repo) | `proposing → awaiting_reply → confirmed → rescheduling` |
| Google Calendar + Gmail ports | `src/lib/calendar/`, `src/lib/email/` | Real ports plus in-memory test doubles |
| Slack approval gating | `src/lib/slack/`, `src/app/api/slack/*` | External holds and outbound mail require Approve |
| Crons | `vercel.json`, `src/lib/cron/`, `src/app/api/cron/{agenda,followup,inbox}` | Agenda and follow-up were **string templates**, not model calls |
| Database | `supabase/migrations/0001_init.sql`, `src/lib/db/schema.ts` | 7 tables: team_members, google_accounts, scheduling_requests, inbound_messages, approval_requests, meeting_notes, agent_runs |
| CLI + dashboard | `cli/schedule.ts`, `src/components/dashboard.tsx` | Basic |

No NVIDIA model, no Nebius, no persistent memory, no skills, no demo mode.

## What was built during the Submission Period (Sept 2026)

Everything below is new. Where a pre-existing file is listed, the change is
described.

### 1. Port to NVIDIA Nemotron on Nebius Token Factory

| Files | What |
| --- | --- |
| `src/lib/ai/models.ts` | `@ai-sdk/openai-compatible` provider pointed at `https://api.tokenfactory.nebius.com/v1/`. Three model tiers via `MODEL_REASONING` / `MODEL_FAST` / `MODEL_ULTRA`. |
| `src/lib/ai/nebius.ts` | Thin wrapper for Token Factory quirks: lifts `reasoning_content` into `content` when `content` is empty and there are no tool calls; disables parallel tool calls; sets `chat_template_kwargs.enable_thinking`. |
| `src/lib/ai/nebius.test.ts` | Tests for the wrapper. |
| `scripts/spike-tools.ts` | Live tool-calling smoke test against Super and Nano. Run this first. |
| `src/lib/agent/run.ts` (changed) | Hardcoded Anthropic model replaced by `reasoningModel()`. Skill selection wired in. |
| `src/lib/env.ts`, `.env.example` (changed) | `AI_GATEWAY_API_KEY` / `ANTHROPIC_API_KEY` removed; `NEBIUS_API_KEY`, `MODEL_*`, `DEMO_MODE` added. |

### 2. Model split (Nano / Super / Ultra)

| Files | What |
| --- | --- |
| `src/lib/email/classify.ts` (+ test) | **Nano**: is this scheduling mail, and which open request does it belong to. Replaces heuristic-only matching in the inbox poller. `src/lib/email/inbox.ts` changed to call it. |
| `src/lib/agent/run.ts` | **Super**: the tool loop. |
| `src/lib/cron/drafts.ts` (changed), `src/lib/cron/agenda.ts` (changed) | **Super**: agenda and follow-up drafts are now model-written from the same context the templates used. Templates kept as fallback when no key is set. |
| `src/lib/ai/conflicts.ts` | **Ultra**: called only when the rules engine finds no clean multi-party slot; proposes human tradeoffs, never invents availability. `src/lib/calendar/availability.ts` changed to surface `conflictResolution`. |
| `src/lib/ai/json.ts` (+ test) | JSON extraction for structured Nano/Super output. |

### 3. Persistent memory

| Files | What |
| --- | --- |
| `supabase/migrations/0004_memory.sql`, `src/lib/db/schema.ts` (changed) | New tables: `projects`, `deliverables`, `people`, `memory_facts`. |
| `src/lib/memory/repo.ts` (+ test) | Upsert/recall for projects, people, facts. |
| `src/lib/memory/consolidate.ts` | Nightly consolidation: reads `agent_runs`, `meeting_notes`, and inbound threads; Super extracts durable facts. |
| `src/lib/memory/dump.ts` | Writes memory to Markdown under `memory/` — the user's data in files they own. |
| `src/lib/agent/tools.ts` (changed) | New tools: `remember`, `recall`, `dump_memory`, `search_drive`. |
| `src/app/api/memory/route.ts`, `src/app/api/cron/consolidate/route.ts` | Memory API and Vercel fallback cron. |
| `cli/schedule.ts` (changed) | `--dump-memory`. |

### 4. Skills

| Files | What |
| --- | --- |
| `src/lib/agent/skills.ts` (+ test) | Five named skills with their own instructions: `schedule`, `prep`, `followup`, `track_project`, `stakeholder_update`. Selected explicitly or by prompt hints. |
| `src/lib/agent/prompt.ts` (changed) | System prompt composes the active skill. |
| `src/lib/drive/{port,google,memory}.ts` | Google Drive port for the `prep` skill. |

### 5. Nebius Serverless Jobs

| Files | What |
| --- | --- |
| `jobs/inbox.ts` | Inbox poll (5 min) — Nano classify → Super agent. |
| `jobs/consolidate.ts` | Nightly memory consolidation. |
| `jobs/Dockerfile`, `jobs/create.sh` | Container image and `nebius ai job create` commands. Same Postgres as the Vercel app. Vercel crons in `vercel.json` remain as fallback. |

### 6. Judge mode

| Files | What |
| --- | --- |
| `src/lib/demo/{mode,seed,store}.ts`, `src/lib/runtime.ts` | `DEMO_MODE=1` swaps Google/Postgres/Slack/Clerk for in-memory ports and a seeded fictional production. Judges need only `NEBIUS_API_KEY`. |
| `src/lib/scheduling/demo-repo.ts` | In-memory scheduling repo. |
| `src/lib/scheduling/resolve-approval.ts` (+ test), `src/app/api/approvals/route.ts` | Approvals resolvable from the dashboard, not only Slack. |

### 7. Dashboard, auth, housekeeping

| Files | What |
| --- | --- |
| `src/components/*`, `src/app/layout.tsx`, `globals.css` | Sidebar shell, theme, approval and memory views. |
| `src/lib/auth/{clerk,allowlist}.ts`, `src/proxy.ts`, `src/app/sign-in`, `sign-up` | Clerk auth with an email allowlist for the hosted instance. Skipped in demo mode. |
| `LICENSE`, `package.json` | MIT. |
| `config/team.yaml`, migrations `0002`, `0003` | Placeholder member names. |

### 8. Counterparty research (Tavily)

| Files | What |
| --- | --- |
| `src/lib/research/port.ts` | Types, the untrusted-text note, snippet sanitizer, result cap. |
| `src/lib/research/tavily.ts` | Tavily `/search` wrapper. Bearer auth, 15s timeout, never requests `include_raw_content`. Returns `available:false` instead of throwing, so a failed lookup degrades the brief rather than failing the loop. |
| `src/lib/research/memory.ts` | In-memory double; seeded in `DEMO_MODE` so judges see research without a Tavily key. |
| `src/lib/research/research.test.ts` | 13 tests: request shaping, response normalising, graceful degradation, and a tool-boundary test asserting hostile web text is defanged. |
| `src/lib/agent/tools.ts`, `run.ts` (changed) | New `research` tool, threaded through `buildToolHandlers`. |
| `config/skills/prep.yaml` (changed) | `prep` now runs context → Drive → research, and carries the untrusted-text rule. |
| `src/lib/runtime.ts`, `demo/seed.ts`, `env.ts`, `setup.ts`, `.env.example` (changed) | Port selection, demo seed, env plumbing, setup check. |

Web text enters the context of an agent holding tools that write calendar
events and queue outbound mail, so it is treated as data and never as
instruction: snippets only, delimiter markup stripped, capped length, five
results max, and an explicit untrusted note on every result.

## Nebius / NVIDIA usage summary

- **Models:** Nemotron 3 Nano (classification), Nemotron 3 Super (tool loop, drafts, consolidation), Nemotron 3 Ultra (conflict tradeoffs). All served by Nebius Token Factory through its OpenAI-compatible API.
- **Nebius Serverless Jobs:** always-on inbox poll and nightly memory consolidation.
- **Tavily:** counterparty research inside the `prep` skill — the one input that isn't in our own calendar, inbox, or Drive.
- **Vercel:** dashboard, Google/Slack webhooks, fallback crons.

## Feedback on Token Factory / Nemotron

Written up in full in the README's [Feedback section](./README.md#feedback-on-token-factory--nemotron). In short:

- **`reasoning_content` in place of `content`** was the entire cost of the port. OpenAI-compatible clients see an empty assistant turn; [src/lib/ai/nebius.ts](src/lib/ai/nebius.ts) shims it.
- **`parallel_tool_calls` had to be forced off** to get well-formed tool calls through the compatible path.
- **`chat_template_kwargs.enable_thinking`** works but is undocumented on that surface.
- **Model IDs are inconsistently cased** within one family, and a typo only shows up as a 404.
- **Nano out-spent Super on output tokens** for a bounded classification task (10926 vs 7969 over 30 emails) and ran ~3× slower, which undercuts the cheap-tier story. A respected `reasoning_effort: low` would fix it.
- **The OpenAI-compatible endpoint was the thing that worked**: provider swap in one file, `ToolLoopAgent` untouched.
