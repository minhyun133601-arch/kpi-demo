-- purpose: initialize baseline auth, permission, document, and session tables for the KPI demo runtime.
-- rollback_note: treat this as forward-only on shared environments; recover by restoring a pre-migration database snapshot instead of dropping live baseline tables.
-- recovery_note: after fixing the underlying failure, rerun `npm run db:migrate`; the statements in this file are idempotent.

create extension if not exists pgcrypto;

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_user_roles (
  user_id uuid not null references app_users(id) on delete cascade,
  role_key text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, role_key)
);

create table if not exists app_user_sheet_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references app_users(id) on delete cascade,
  permission_key text not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, permission_key)
);

create table if not exists app_sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references app_users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ip_address text,
  user_agent text
);

create table if not exists app_module_records (
  id uuid primary key default gen_random_uuid(),
  module_key text not null,
  record_key text not null,
  permission_key text not null,
  payload jsonb not null default '{}'::jsonb,
  version integer not null default 1,
  updated_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_key, record_key)
);

create index if not exists idx_app_module_records_permission_key
  on app_module_records(permission_key);

create index if not exists idx_app_module_records_payload_gin
  on app_module_records
  using gin(payload);

create table if not exists app_documents (
  id uuid primary key default gen_random_uuid(),
  permission_key text not null,
  owner_domain text not null,
  owner_key text not null,
  file_category text not null,
  original_name text not null,
  stored_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  storage_rel_path text not null,
  metadata jsonb not null default '{}'::jsonb,
  uploaded_by_user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_app_documents_permission_key
  on app_documents(permission_key);

create index if not exists idx_app_documents_owner
  on app_documents(owner_domain, owner_key);

create table if not exists app_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references app_users(id) on delete set null,
  action_key text not null,
  target_type text not null,
  target_key text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
