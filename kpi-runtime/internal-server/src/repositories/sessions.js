import { query } from '../db/pool.js';

export async function createSession({ tokenHash, userId, expiresAt, ipAddress, userAgent }) {
  const result = await query(
    `insert into app_sessions (token_hash, user_id, expires_at, ip_address, user_agent)
     values ($1, $2, $3, $4, $5)
     returning id, user_id, expires_at, created_at, last_seen_at`,
    [tokenHash, userId, expiresAt, ipAddress || null, userAgent || null]
  );
  return result.rows[0];
}

export async function findSession(tokenHash) {
  const result = await query(
    `select s.id, s.user_id, s.expires_at, s.created_at, s.last_seen_at,
            u.username, u.display_name, u.is_active
     from app_sessions s
     join app_users u on u.id = s.user_id
     where s.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

export async function touchSession(sessionId) {
  await query(
    'update app_sessions set last_seen_at = now() where id = $1',
    [sessionId]
  );
}

export async function deleteSession(tokenHash) {
  await query('delete from app_sessions where token_hash = $1', [tokenHash]);
}

export async function pruneExpiredSessions(referenceTime = new Date()) {
  const result = await query(
    `delete from app_sessions
     where expires_at <= $1
     returning id`,
    [referenceTime]
  );
  return result.rowCount;
}
