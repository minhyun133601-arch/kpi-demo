-- purpose: create the structured authority tables for util production daily state, entries, and source archives.
-- rollback_note: if no cutover data has been accepted, drop the util_production_daily_* tables; otherwise restore the pre-cutover snapshot instead of destructive rollback.
-- recovery_note: restore the latest runtime snapshot if data must be rewound, then rerun `npm run db:migrate` and `npm run migrate:util-production-daily -- --write` as needed.

create table if not exists util_production_daily_state (
  state_key text primary key,
  period_start_day integer not null default 1,
  version integer not null default 1,
  updated_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists util_production_daily_entries (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  production_date date not null,
  team_name text not null,
  line_name text not null default '',
  product_name text not null default '',
  amount numeric not null,
  moisture_excluded_yield numeric null,
  equipment_capa numeric null,
  equipment_utilization numeric null,
  source_archive_id text null,
  source_fingerprint text null,
  source_file_name text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_util_production_daily_entries_date
  on util_production_daily_entries(production_date);

create index if not exists idx_util_production_daily_entries_team
  on util_production_daily_entries(team_name);

create index if not exists idx_util_production_daily_entries_source_archive
  on util_production_daily_entries(source_archive_id);

create index if not exists idx_util_production_daily_entries_source_fingerprint
  on util_production_daily_entries(source_fingerprint);

create table if not exists util_production_daily_archives (
  id text primary key,
  file_name text not null,
  byte_size bigint not null default 0,
  mime_type text not null default 'application/octet-stream',
  last_modified bigint not null default 0,
  saved_at timestamptz not null default now(),
  folder_name text not null default 'default',
  fingerprint text not null default '',
  document_id text not null default '',
  storage text not null default 'server',
  preview_url text not null default '',
  download_url text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_util_production_daily_archives_saved_at
  on util_production_daily_archives(saved_at desc);

create index if not exists idx_util_production_daily_archives_fingerprint
  on util_production_daily_archives(fingerprint);

insert into util_production_daily_state (state_key, period_start_day)
values ('default', 1)
on conflict (state_key) do nothing;
