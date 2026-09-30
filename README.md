# Scheduler

A scheduling agent for Matriarch. It finds open time, holds it, matches inbound mail to an open request, and drafts agendas and follow-ups. Conflicts come from the rules engine, not from the model inventing free slots. External mail is approval-gated.

`config/team.yaml` people (V / J) are placeholders; `matriarch.studio` addresses are fine.

## Key features

- Super runs a 12-step tool loop; skills are YAML in `config/skills/` (`schedule`, `prep`, `followup`, `track_project`, `stakeholder_update`)
- Nano classifies inbound mail (is this scheduling? which request?)
- Ultra writes multi-party conflict tradeoffs only when `get_availability` returns no clean slot
- Persistent memory (`projects`, `deliverables`, `people`, `memory_facts`) with remember / recall / Markdown dump
- `DEMO_MODE=1` seeds fictional calendar + Gmail so judges only need a Nebius key

## Tech stack

- **Language**: TypeScript (strict)
- **App**: Next.js 16 (App Router) on Vercel
- **Models**: NVIDIA Nemotron via Nebius Token Factory (`@ai-sdk/openai-compatible` at `https://api.tokenfactory.nebius.com/v1/`)
- **Database**: Postgres / Supabase + Drizzle (optional in demo)
- **Integrations**: Google Calendar + Gmail + Drive, Slack (optional), Clerk (optional)
- **Jobs**: Nebius Serverless Jobs for inbox + consolidation; Vercel crons as fallback

## Prerequisites

- Node.js 20+
- npm (this repo has `package-lock.json`)
- A [Token Factory](https://tokenfactory.nebius.com/project/api-keys) API key
- Postgres only if you are not using `DEMO_MODE=1`

## Judge mode

```bash
cp .env.example .env.local
# NEBIUS_API_KEY=...
# DEMO_MODE=1
npm install
npm run dev
```

Open http://localhost:3000. `DEMO_MODE=1` uses `MemoryCalendar`, in-memory Gmail/Drive, and a seeded store (Tubi / Sarah Chen). Postgres, Google, Slack, and Clerk are skipped even if those env vars are set.

## Models

| Env | Default | Job |
| --- | --- | --- |
| `MODEL_REASONING` | `nvidia/nemotron-3-super-120b-a12b` | Tool loop, agenda, follow-up, consolidation |
| `MODEL_FAST` | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | Inbox: is this scheduling mail, which request |
| `MODEL_ULTRA` | `nvidia/Nemotron-3-Ultra-550b-a55b` | Multi-party conflict write-up when no slot |

Confirm IDs in the Token Factory console. Spike tool-calling before anything else:

```bash
npm run spike
```

If Super/Nano still return `reasoning_content` with empty `content`, `src/lib/ai/nebius.ts` copies reasoning into content (and disables parallel tool calls). That is a thin wrapper, not an agent rewrite. Live spike (2026-09-15): both models returned HTTP 200 with `echo` tool calls; `content` was null and `reasoning_content` was filled.

### Inbox eval (Nano vs Super)

Nano owns the high-volume inbox path so Super is not spent classifying newsletters. Same prompt, 30 labeled emails in `src/lib/email/eval-cases.ts` (12 ignore / 9 match / 9 open), heuristic skipped. Run:

```bash
npm run eval:inbox
```

Measured 2026-09-16 against Token Factory ([list prices](https://tokenfactory.nebius.com/model-catalog.md): Nano $0.06 / $0.24 per million in/out, Super $0.30 / $0.90):

| | Nano | Super |
| --- | --- | --- |
| Model | `nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B` | `nvidia/nemotron-3-super-120b-a12b` |
| Accuracy (30 labeled) | 83% (25/30) | 97% (29/30) |
| Mean latency | 6347 ms | 2142 ms |
| p50 latency | 5812 ms | 2108 ms |
| Tokens in / out | 8537 / 10926 | 8537 / 7969 |
| Cost / classify | $0.000104 | $0.000324 |
| Super / Nano cost | | **3.1×** |

**What the numbers actually say.** Nano is 3.1× cheaper per classify, but on this set it is also *slower* (6347 ms vs 2142 ms mean) and *less accurate* (83% vs 97%). Nano's reasoning tokens are why: it emitted 10926 output tokens against Super's 7969, which eats most of the 5× input-price advantage. The absolute saving is ~$0.0002 per email, so cost is not the deciding factor at this volume — accuracy is, and Super wins it.

Nano still owns the inbox path, for a reason this eval deliberately measures *around*: the heuristic in `planInboxAction` resolves high-confidence thread matches with no model call at all, and the eval passes `skipHeuristic: true` so both models see all 30 cases. In production that heuristic absorbs most of the volume and Nano only sees what it could not resolve. If you would rather spend the accuracy budget than the credits, point `MODEL_FAST` at the Super ID — it is one env var, no code change.

Offline scoring lives in `src/lib/email/classify.test.ts`; the live run is `EVAL_INBOX=1 npm test` or `npm run eval:inbox`.

## Phases

`phase` in `config/team.yaml` is **3**.

1. Internal availability, holds, reschedules via Slack/CLI.
2. T-1 agenda cron + post-meeting follow-up draft. Super writes the copy from the same context the templates used.
3. Shared Gmail **label** (default `scheduling`) on the connected inbox. Nano classifies → agent. `draft_email` writes a draft; `send_email` only queues approval.

## Getting started (live)

```bash
cp .env.example .env.local
# DATABASE_URL, SCHEDULER_ADMIN_KEY, TOKEN_ENCRYPTION_KEY, NEBIUS_API_KEY
# TOKEN_ENCRYPTION_KEY: openssl rand -base64 32

# Paste supabase/migrations/0001_init.sql and 0004_memory.sql into the Supabase SQL editor
npm install
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

## Architecture

Every ask writes a `scheduling_request` (`proposing → awaiting_reply → confirmed → rescheduling`). Inbound mail is classified with Nano, then matched to an open request before Super acts. Conflicts go through `src/lib/rules/engine.ts`. When there is no clean multi-party slot, Ultra proposes tradeoffs only — it does not invent availability.

```
config/team.yaml            # phase, members, sharedInbox.label
config/rules/*.yaml         # hours, buffers, protected blocks
config/skills/*.yaml        # Super tool-loop skills (add a file, no TypeScript)
src/lib/rules/engine.ts
src/lib/scheduling/         # state machine, matcher, approvals
src/lib/email/              # Gmail port, inbox poller, Nano classify + eval
src/lib/cron/               # agenda + follow-up drafts
src/lib/ai/                 # Token Factory provider + model split
src/lib/memory/             # facts, consolidation, Markdown dump
jobs/                       # Nebius Serverless Job entrypoints
```

### Skills

Reusable Super prompts live in `config/skills/*.yaml` next to the rules. Drop a new YAML file to add one — no TypeScript. Schema: `name`, `title`, `priority` (lower matches first), `when` (phrases), `instructions`, and optional `default: true` for the fallback (schedule).

Shipped: `schedule`, `prep` (meeting context + Drive), `followup`, `track_project`, `stakeholder_update`.

### Memory

Tables: `projects`, `deliverables`, `people`, `memory_facts`. Nightly consolidation reads `agent_runs`, `meeting_notes`, and threads. Tools: `remember`, `recall`, `dump_memory` (Markdown under `memory/`).

### Tools

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

## Environment variables

Copy `.env.example`. Required for live: `NEBIUS_API_KEY`. Required unless `DEMO_MODE=1`: `DATABASE_URL`, `SCHEDULER_ADMIN_KEY`, `TOKEN_ENCRYPTION_KEY`.

| Variable | Required | Notes |
| --- | --- | --- |
| `NEBIUS_API_KEY` | yes | Token Factory project key |
| `DEMO_MODE` | no | `1` = in-memory calendar, Gmail, Drive, store |
| `MODEL_REASONING` / `MODEL_FAST` / `MODEL_ULTRA` | no | Defaults above |
| `DATABASE_URL` | unless demo | Supabase session or transaction pooler |
| `SCHEDULER_ADMIN_KEY` | unless demo | CLI + dashboard actions |
| `TOKEN_ENCRYPTION_KEY` | unless demo | `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` / `SECRET` / `REDIRECT_URI` | unless demo | Calendar + Gmail + Drive |
| `GMAIL_LABEL` | no | Overrides `sharedInbox.label` |
| `SLACK_BOT_TOKEN` / `SIGNING_SECRET` / `CHANNEL` | no | Approvals also live on the dashboard |
| `NEXT_PUBLIC_CLERK_*` / `CLERK_SECRET_KEY` | no | Skipped in demo |
| `CRON_SECRET` | no | Vercel cron auth |
| `APP_URL` | no | Default `http://localhost:3000` |

Get a Token Factory key: [tokenfactory.nebius.com](https://tokenfactory.nebius.com) → sign in with Google or GitHub → **API keys** → **Create**. Copy it once; it is not shown again.

## Scripts

| Command | What |
| --- | --- |
| `npm run dev` | Next.js |
| `npm test` | Vitest (live Token Factory eval skipped unless `EVAL_INBOX=1`) |
| `npm run check` | lint + typecheck + test |
| `npm run spike` | Super + Nano tool-call probe |
| `npm run eval:inbox` | 30-mail Nano vs Super classify eval |
| `npm run schedule -- "…"` | CLI agent |
| `npm run inbox` | Poll the shared label |
| `npm run memory:dump` | Write `memory/*.md` |
| `npm run job:inbox` / `job:consolidate` | Serverless Job entrypoints |
| `npm run seed` | Seed Postgres |

## Testing

```bash
npm test
npm run eval:inbox   # needs NEBIUS_API_KEY
```

`src/lib/email/classify.test.ts` covers heuristic short-circuit, JSON parse, the 30-case fixture, and scoring. The live Token Factory loop is opt-in so CI stays offline.

## Deployment

**Dashboard + Slack/Google webhooks**: Vercel (`vercel.json`). Crons:

| Path | When | What |
| --- | --- | --- |
| `/api/cron/agenda` | 17:00 UTC daily | Tomorrow's events → Super agenda |
| `/api/cron/followup` | 18:00 UTC daily | Ended meetings → Super follow-up |
| `/api/cron/inbox` | every 5 min (Pro) | **Fallback** label poll → Nano → Super |
| `/api/cron/consolidate` | 06:00 UTC daily | **Fallback** memory consolidation |

Hobby cron is daily-only — use `npm run inbox` until the project is on Pro or a Serverless Job.

**Inbox (5 min) and consolidation** belong on **Nebius Serverless Jobs** (`jobs/inbox.ts`, `jobs/consolidate.ts`, `jobs/create.sh`). They hit the same Postgres. Set `IMAGE` and run `jobs/create.sh`.

## Troubleshooting

- **`NEBIUS_API_KEY is required`**: create a project key in Token Factory and put it in `.env.local`.
- **Spike `content: null`**: expected for these reasoning models when `tool_calls` is set. The wrapper only lifts `reasoning_content` on the final turn.
- **Classify JSON buried in reasoning**: `parseJsonObject` extracts the first `{…}` block.
- **Dashboard empty in demo**: `DEMO_MODE=1` uses the in-memory store even if `DATABASE_URL` is set. Restart `npm run dev` after changing env.

## Feedback on Token Factory / Nemotron

What we hit porting a working Anthropic-based agent onto Nemotron via Token Factory. Everything here is reproducible with `npm run spike`.

**Reasoning content arrives in place of `content`.** This was the whole port, effectively. Nemotron Super and Nano both return `content: null` with the answer in `reasoning_content` whenever thinking is on. The AI SDK's OpenAI-compatible provider reads `content`, so every call looked like an empty assistant turn and the tool loop terminated with no text. [nebius.ts](src/lib/ai/nebius.ts) lifts `reasoning_content` into `content` on final turns only (lifting it when `tool_calls` is set corrupts the loop). A flag to have the API fold reasoning into `content` — or a documented note that OpenAI-compatible clients need a shim — would have saved most of a day.

**`parallel_tool_calls` is not safely supported.** Leaving it on produced malformed multi-call turns through the OpenAI-compatible path. We set it to `false` unconditionally in `transformNebiusRequestBody`. Worth documenting on the compatibility page.

**`chat_template_kwargs.enable_thinking` is undocumented on the OpenAI-compatible surface.** It works, but we found it by trial. It also needs a `transformRequestBody` hook because it is not part of the OpenAI schema — fine, but say so in the docs.

**Model IDs are inconsistently cased across one family**, which is a real papercut when the only failure signal is a 404:

```
nvidia/nemotron-3-super-120b-a12b        # all lower
nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B    # mixed, and the vendor prefix is doubled
nvidia/Nemotron-3-Ultra-550b-a55b        # mixed
```

Case-insensitive resolution, or short aliases (`nemotron-3-super`), would help.

**Nano's reasoning verbosity undercuts the small-model tier.** For a bounded classification task — "is this scheduling mail, which request" — Nano spent *more* output tokens than Super (10926 vs 7969 over 30 emails) and was ~3× slower per call. See the eval table above. A `reasoning_effort: low` knob honored on the OpenAI-compatible path, or `enable_thinking: false` actually suppressing reasoning on Nano, would make the cheap tier viable for high-volume routing, which is exactly what it should be good at.

**What worked well.** The OpenAI-compatible endpoint meant swapping providers was one file, not a rewrite — `createOpenAICompatible` plus a base URL, and the existing `ToolLoopAgent` kept working. Tool calling itself was solid once `parallel_tool_calls` was off: both Super and Nano emitted well-formed calls on the first try. And publishing the catalog as [plain markdown with prices](https://tokenfactory.nebius.com/model-catalog.md) made the cost math in `src/lib/email/eval.ts` straightforward to keep honest.

## License

MIT. See [LICENSE](LICENSE).
