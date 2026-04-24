import { query } from '../db/pool.js';

export async function appendAuditLog({ actorUserId, actionKey, targetType, targetKey, detail }) {
  await query(
    `insert into app_audit_log (actor_user_id, action_key, target_type, target_key, detail)
     values ($1, $2, $3, $4, $5::jsonb)`,
    [actorUserId || null, actionKey, targetType, targetKey, JSON.stringify(detail ?? {})]
  );
}

function normalizeLimit(limit, fallback = 100, max = 200) {
  const parsed = Number.parseInt(String(limit || ''), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return Math.min(parsed, max);
}

export async function listRecentLoginAuditEntries(limit = 100) {
  const safeLimit = normalizeLimit(limit);
  const result = await query(
    `select
        a.id,
        a.created_at as logged_in_at,
        u.id as user_id,
        coalesce(u.username, a.detail->>'username', '') as username,
        coalesce(u.display_name, a.detail->>'displayName', '') as display_name,
        coalesce(role_set.roles, '{}') as roles,
        coalesce(u.is_active, false) as is_active,
        coalesce(nullif(a.detail->>'ipAddress', ''), s.ip_address, '') as ip_address,
        coalesce(nullif(a.detail->>'userAgent', ''), s.user_agent, '') as user_agent,
        s.last_seen_at,
        s.expires_at,
        case
          when s.id is not null and s.expires_at > now() then true
          else false
        end as session_active
      from app_audit_log a
      left join app_users u on u.id = a.actor_user_id
      left join lateral (
        select array_agg(r.role_key order by r.role_key) as roles
        from app_user_roles r
        where r.user_id = u.id
      ) role_set on true
      left join app_sessions s
        on a.target_type = 'session'
       and s.token_hash = a.target_key
      where a.action_key = 'auth.login'
      order by a.created_at desc
      limit $1`,
    [safeLimit]
  );
  return result.rows;
}
