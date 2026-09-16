# Scheduler

Next.js on Vercel, Postgres/Supabase, NVIDIA Nemotron via Nebius Token Factory (`@ai-sdk/openai-compatible` at `https://api.tokenfactory.nebius.com/v1/`), Google Calendar + Gmail + Drive, Slack, CLI.

Every ask writes a `scheduling_request` (`proposing → awaiting_reply → confirmed → rescheduling`). Inbound mail is classified with Nano, then matched to an open request before Super acts. Conflicts go through the rules engine, not in-context reasoning. When there is no clean multi-party slot, Ultra proposes tradeoffs only. External mail is approval gated.

`config/team.yaml` people (V / J) are placeholders; `matriarch.studio` addresses are fine.

## Models

| Env | Default | Job |
| --- | --- | --- |
| `MODEL_REASONING` | `nvidia/nemotron-3-super-120b-a12b` | Tool loop, agenda, follow-up, consolidation |
| `MODEL_FAST` | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Inbox: is this scheduling mail, which request |
| `MODEL_ULTRA` | `nvidia/Nemotron-3-Ultra-550b-a55b` | Multi-party conflict write-up when no slot |

Confirm IDs in the Token Factory console. Spike tool-calling before anything else:

```bash
npx tsx scripts/spike-tools.ts
```

If Super/Nano still return `reasoning_content` with empty `content`, `src/lib/ai/nebius.ts` copies reasoning into content (and disables parallel tool calls). That is a thin wrapper, not an agent rewrite.

## Judge mode

```bash
cp .env.example .env.local
# NEBIUS_API_KEY=...
# DEMO_MODE=1
npm run dev
```

`DEMO_MODE=1` uses `MemoryCalendar`, in-memory Gmail/Drive, and an in-memory store with seeded fiction (Tubi / Sarah Chen). Postgres, Google, Slack, and Clerk are skipped even if those env vars are set. Judges only need a Nebius key.

## Phases

`phase` in `config/team.yaml` is **3**.

1. Internal availability, holds, reschedules via Slack/CLI.
2. T-1 agenda cron + post-meeting follow-up draft. Super writes the copy from the same context the templates used.
3. Shared Gmail **label** (default `scheduling`) on the connected inbox. Nano classifies → agent. `draft_email` writes a draft; `send_email` only queues approval.

## Quick start

```bash
cp .env.example .env.local
# DATABASE_URL, SCHEDULER_ADMIN_KEY, TOKEN_ENCRYPTION_KEY, NEBIUS_API_KEY
# TOKEN_ENCRYPTION_KEY: openssl rand -base64 32

# Paste supabase/migrations/0001_init.sql and 0004_memory.sql into the Supabase SQL editor
npm run seed
npm run dev
```

```bash
npm run schedule -- "set up 30 minutes with J next Tuesday afternoon"
npm run schedule -- --list
npm run inbox   # poll the shared label
npm run schedule -- --dump-memory
```

Connect Google from the dashboard, then **re-consent** so the account has Drive + `gmail.send` as well as calendar + compose. Put inbound threads in the `scheduling` label (or set `sharedInbox.label` / `GMAIL_LABEL`).

Slack: Events API → `/api/slack/events`, interactive actions → `/api/slack/actions`.

## Skills

Named prompts on the Super tool loop: `schedule`, `prep` (meeting context + Drive), `followup`, `track_project`, `stakeholder_update`.

## Memory

Tables: `projects`, `deliverables`, `people`, `memory_facts`. Nightly consolidation reads `agent_runs`, `meeting_notes`, and threads. Tools: `remember`, `recall`, `dump_memory` (Markdown under `memory/`).

## Crons

Inbox (5 min) and consolidation belong on **Nebius Serverless Jobs** (`jobs/inbox.ts`, `jobs/consolidate.ts`, `jobs/create.sh`). They hit the same Postgres. The Vercel crons file is the fallback.

| Path | When | What |
| --- | --- | --- |
| `/api/cron/agenda` | 17:00 UTC daily | Tomorrow's events → Super agenda |
| `/api/cron/followup` | 18:00 UTC daily | Ended meetings → Super follow-up |
| `/api/cron/inbox` | every 5 min (Pro) | **Fallback** label poll → Nano → Super |
| `/api/cron/consolidate` | 06:00 UTC daily | **Fallback** memory consolidation |

Hobby cron is daily-only — use `npm run inbox` until the project is on Pro or a Serverless Job.

## Tools

| Tool | Notes |
| --- | --- |
| `get_availability` / `create_event` / `update_event` | Rules engine; Ultra only if no multi-party slot |
| `lookup_contact` | Team first, then shared-inbox search |
| `get_meeting_context` | Request + notes + thread |
| `search_drive` | Prep skill |
| `create_scheduling_request` | Opens state for later mail |
| `draft_email` | Gmail draft on the shared inbox |
| `send_email` | Approval only; send happens after Approve |
| `read_thread` | Shared inbox thread |
| `remember` / `recall` / `dump_memory` | Persistent facts |

## Layout

```
config/team.yaml            # phase, members, sharedInbox.label
config/rules/*.yaml         # hours, buffers, protected blocks
src/lib/rules/engine.ts
src/lib/scheduling/         # state machine, matcher, approvals
src/lib/email/              # Gmail port, inbox poller, Nano classify
src/lib/cron/               # agenda + follow-up drafts
src/lib/ai/                 # Token Factory provider + model split
src/lib/memory/             # facts, consolidation, Markdown dump
jobs/                       # Nebius Serverless Job entrypoints
```
