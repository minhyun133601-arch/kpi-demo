-- purpose: add complementary access-path indexes for roles, permissions, sessions, and audit-log filters.
-- rollback_note: if rollback is required, drop the indexes from this file individually only after confirming they are not serving current plans.
-- recovery_note: this file is safe to rerun with `npm run db:migrate`; all statements use `if not exists`.

create index if not exists idx_app_sessions_expires_at
  on app_sessions(expires_at);

create index if not exists idx_app_sessions_user_id
  on app_sessions(user_id);

create index if not exists idx_app_user_roles_role_key
  on app_user_roles(role_key);

create index if not exists idx_app_user_sheet_permissions_permission_key
  on app_user_sheet_permissions(permission_key);

create index if not exists idx_app_user_sheet_permissions_user_expires
  on app_user_sheet_permissions(user_id, expires_at);

create index if not exists idx_app_audit_log_created_at
  on app_audit_log(created_at desc);

create index if not exists idx_app_audit_log_actor_created
  on app_audit_log(actor_user_id, created_at desc);

create index if not exists idx_app_audit_log_target
  on app_audit_log(target_type, target_key);
