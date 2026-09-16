create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'active',
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists deliverables (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  status text not null default 'open',
  due_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists deliverables_project_idx on deliverables (project_id);

create table if not exists people (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique,
  organization text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memory_facts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  subject text not null,
  fact text not null,
  source text,
  source_id text,
  project_id uuid references projects(id) on delete set null,
  person_id uuid references people(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists memory_facts_subject_idx on memory_facts (subject);
create index if not exists memory_facts_kind_idx on memory_facts (kind);

alter table projects enable row level security;
alter table deliverables enable row level security;
alter table people enable row level security;
alter table memory_facts enable row level security;
