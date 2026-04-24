-- purpose: add operational indexes that keep session, audit, permission, and document lookups predictable under authenticated runtime load.
-- rollback_note: if an index introduces a confirmed query-plan regression, drop only the affected index after checking that no later migration depends on it.
-- recovery_note: restore the pre-migration snapshot for full rollback, or rerun `npm run db:migrate` after fixing permissions or lock contention.

create index if not exists idx_app_sessions_user_id
  on app_sessions(user_id);

create index if not exists idx_app_sessions_expires_at
  on app_sessions(expires_at);

create index if not exists idx_app_sessions_last_seen_at
  on app_sessions(last_seen_at);

create index if not exists idx_app_audit_log_actor_user_id
  on app_audit_log(actor_user_id);

create index if not exists idx_app_audit_log_created_at
  on app_audit_log(created_at desc);

create index if not exists idx_app_user_sheet_permissions_expires_at
  on app_user_sheet_permissions(expires_at);

create index if not exists idx_app_documents_uploaded_by_user_id
  on app_documents(uploaded_by_user_id);
