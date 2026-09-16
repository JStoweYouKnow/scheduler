create extension if not exists pgcrypto;

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  display_name text not null,
  email text not null unique,
  slack_user_id text,
  timezone text not null default 'America/Los_Angeles',
  created_at timestamptz not null default now()
);

create table if not exists google_accounts (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references team_members(id) on delete cascade,
  google_email text not null,
  refresh_token_enc text not null,
  access_token_enc text,
  token_expiry timestamptz,
  scopes text[] not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists google_accounts_member_idx on google_accounts (team_member_id);

create table if not exists scheduling_requests (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'proposing'
    check (status in ('proposing', 'awaiting_reply', 'confirmed', 'rescheduling', 'cancelled')),
  title text not null,
  duration_minutes integer not null default 30,
  counterparty_name text,
  counterparty_email text,
  organization text,
  is_external boolean not null default false,
  attendee_slugs text[] not null,
  proposed_slots jsonb not null default '[]'::jsonb,
  confirmed_slot jsonb,
  constraints jsonb not null default '{}'::jsonb,
  thread_id text,
  slack_channel text,
  slack_thread_ts text,
  calendar_event_id text,
  calendar_id text,
  source text not null default 'cli',
  created_by_slug text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists scheduling_requests_status_idx on scheduling_requests (status);
create index if not exists scheduling_requests_thread_idx on scheduling_requests (thread_id);
create index if not exists scheduling_requests_counterparty_idx on scheduling_requests (counterparty_email);

create table if not exists inbound_messages (
  id uuid primary key default gen_random_uuid(),
  scheduling_request_id uuid references scheduling_requests(id) on delete set null,
  provider text not null,
  external_id text not null,
  thread_id text,
  from_address text,
  subject text,
  snippet text,
  received_at timestamptz not null,
  matched boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index if not exists inbound_messages_provider_ext_idx
  on inbound_messages (provider, external_id);
create index if not exists inbound_messages_thread_idx on inbound_messages (thread_id);

create table if not exists approval_requests (
  id uuid primary key default gen_random_uuid(),
  scheduling_request_id uuid references scheduling_requests(id) on delete cascade,
  kind text not null,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  slack_channel text,
  slack_message_ts text,
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists approval_requests_status_idx on approval_requests (status);

create table if not exists meeting_notes (
  id uuid primary key default gen_random_uuid(),
  scheduling_request_id uuid references scheduling_requests(id) on delete set null,
  calendar_event_id text,
  notes text,
  agenda_draft text,
  follow_up_draft text,
  created_at timestamptz not null default now()
);

create index if not exists meeting_notes_event_idx on meeting_notes (calendar_event_id);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  prompt text not null,
  result_text text,
  scheduling_request_id uuid references scheduling_requests(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table team_members enable row level security;
alter table google_accounts enable row level security;
alter table scheduling_requests enable row level security;
alter table inbound_messages enable row level security;
alter table approval_requests enable row level security;
alter table meeting_notes enable row level security;
alter table agent_runs enable row level security;

insert into team_members (slug, display_name, email, timezone)
values
  ('v', 'V', 'v@matriarch-studios.com', 'America/Los_Angeles'),
  ('j', 'J', 'j@matriarch-studios.com', 'America/Los_Angeles')
on conflict (slug) do update
set display_name = excluded.display_name,
    email = excluded.email,
    timezone = excluded.timezone;
