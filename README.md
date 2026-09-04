# Scheduler

Next.js on Vercel, Postgres/Supabase, Anthropic via the Vercel AI Gateway, Google Calendar + Gmail, Slack, CLI.

Every ask writes a `scheduling_request` (`proposing → awaiting_reply → confirmed → rescheduling`). Inbound mail is matched to an open request before the model acts. Conflicts go through the rules engine, not in-context reasoning. External mail is Slack-approval gated.

## Phases

`phase` in `config/team.yaml` is **3**.

1. Internal availability, holds, reschedules via Slack/CLI.
2. T-1 agenda cron + post-meeting follow-up draft (Slack). Uses local studio timezone, prior notes, and thread excerpts.
3. Shared Gmail **label** (default `scheduling`) on the connected inbox. Match → agent. `draft_email` writes a draft; `send_email` only queues a Slack card. Approve to send.

## Quick start

```bash
cp .env.example .env.local
# DATABASE_URL, SCHEDULER_ADMIN_KEY, TOKEN_ENCRYPTION_KEY, AI_GATEWAY_API_KEY
# TOKEN_ENCRYPTION_KEY: openssl rand -base64 32

# Paste supabase/migrations/0001_init.sql into the Supabase SQL editor
npm run seed
npm run dev
```

```bash
npm run schedule -- "set up 30 minutes with cofounder next Tuesday afternoon"
npm run schedule -- --list
npm run inbox   # poll the shared label
```

Connect Google from the dashboard, then **re-consent** so the account has `gmail.send` as well as calendar + compose. Put inbound threads in the `scheduling` label (or set `sharedInbox.label` / `GMAIL_LABEL`). Prefer that label on a shared mailbox, not the whole personal inbox.

Slack: Events API → `/api/slack/events`, interactive actions → `/api/slack/actions`.

## Crons

| Path | When | What |
| --- | --- | --- |
| `/api/cron/agenda` | 17:00 UTC daily | Tomorrow's events → Slack agenda |
| `/api/cron/followup` | 18:00 UTC daily | Ended meetings → follow-up draft; external ones get a Gmail draft + Slack approve |
| `/api/cron/inbox` | every 5 min (Pro) | Label poll → match/open request → agent |

Hobby cron is daily-only — use `npm run inbox` until the project is on Pro.

## Tools

| Tool | Notes |
| --- | --- |
| `get_availability` / `create_event` / `update_event` | Rules engine; external holds need Slack approval |
| `lookup_contact` | Team first, then shared-inbox search |
| `get_meeting_context` | Request + notes + thread |
| `create_scheduling_request` | Opens state for later mail |
| `draft_email` | Gmail draft on the shared inbox |
| `send_email` | Slack approval only; send happens after Approve |
| `read_thread` | Shared inbox thread |

## Layout

```
config/team.yaml            # phase, members, sharedInbox.label
config/rules/*.yaml         # hours, buffers, protected blocks
src/lib/rules/engine.ts
src/lib/scheduling/         # state machine, matcher, approvals
src/lib/email/              # Gmail port, inbox poller
src/lib/cron/               # agenda + follow-up drafts
```
