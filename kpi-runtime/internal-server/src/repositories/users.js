import { query, withTransaction } from '../db/pool.js';

export async function ownerExists() {
  const result = await query(`
    select 1
    from app_user_roles
    where role_key = 'owner'
    limit 1
  `);
  return result.rowCount > 0;
}

export async function findUserByUsername(username) {
  const result = await query(
    `select id, username, display_name, password_hash, is_active, created_at, updated_at
     from app_users
     where username = $1`,
    [username]
  );
  return result.rows[0] || null;
}

export async function findUserById(userId) {
  const result = await query(
    `select id, username, display_name, is_active, created_at, updated_at
     from app_users
     where id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function findUserProfileById(userId) {
  const result = await query(
    `select
        u.id,
        u.username,
        u.display_name,
        u.is_active,
        u.created_at,
        u.updated_at,
        coalesce(role_set.roles, '{}') as roles,
        coalesce(permission_set.permissions, '[]'::json) as permissions
      from app_users u
      left join lateral (
        select array_agg(r.role_key order by r.role_key) as roles
        from app_user_roles r
        where r.user_id = u.id
      ) role_set on true
      left join lateral (
        select json_agg(
          json_build_object(
            'id', p.id,
            'permission_key', p.permission_key,
            'can_read', p.can_read,
            'can_write', p.can_write,
            'expires_at', p.expires_at,
            'created_at', p.created_at,
            'updated_at', p.updated_at
          )
          order by p.permission_key
        ) as permissions
        from app_user_sheet_permissions p
        where p.user_id = u.id
      ) permission_set on true
      where u.id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function listUsers() {
  const result = await query(`
    select u.id, u.username, u.display_name, u.is_active, u.created_at, u.updated_at,
      coalesce(array_agg(r.role_key order by r.role_key) filter (where r.role_key is not null), '{}') as roles,
      exists (
        select 1
        from app_sessions s
        where s.user_id = u.id
          and s.expires_at > now()
      ) as session_active,
      coalesce(
        (
          select max(s.last_seen_at)
          from app_sessions s
          where s.user_id = u.id
            and s.expires_at > now()
        ),
        (
          select max(a.created_at)
          from app_audit_log a
          where a.actor_user_id = u.id
            and a.action_key = 'auth.login'
        )
      ) as last_access_at
    from app_users u
    left join app_user_roles r on r.user_id = u.id
    group by u.id
    order by u.username
  `);
  return result.rows;
}

export async function createUser({ username, displayName, passwordHash }) {
  const result = await query(
    `insert into app_users (username, display_name, password_hash)
     values ($1, $2, $3)
     returning id, username, display_name, is_active, created_at, updated_at`,
    [username, displayName, passwordHash]
  );
  return result.rows[0];
}

export async function updateUserPasswordHash(userId, passwordHash) {
  const result = await query(
    `update app_users
     set password_hash = $2,
         updated_at = now()
     where id = $1
     returning id, username, display_name, is_active, created_at, updated_at`,
    [userId, passwordHash]
  );
  return result.rows[0] || null;
}

export async function deleteUserById(userId) {
  const result = await query(
    `delete from app_users
     where id = $1
     returning id, username, display_name, is_active, created_at, updated_at`,
    [userId]
  );
  return result.rows[0] || null;
}

export async function replaceUserRoles(userId, roles) {
  await withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [String(userId)]);
    await client.query('delete from app_user_roles where user_id = $1', [userId]);
    for (const roleKey of roles) {
      await client.query(
        'insert into app_user_roles (user_id, role_key) values ($1, $2)',
        [userId, roleKey]
      );
    }
  });
}

export async function getUserRoles(userId) {
  const result = await query(
    'select role_key from app_user_roles where user_id = $1 order by role_key',
    [userId]
  );
  return result.rows.map((row) => row.role_key);
}

export async function listUserPermissions(userId) {
  const result = await query(
    `select id, permission_key, can_read, can_write, expires_at, created_at, updated_at
     from app_user_sheet_permissions
     where user_id = $1
     order by permission_key`,
    [userId]
  );
  return result.rows;
}

export async function upsertUserPermission(userId, permission) {
  const result = await query(
    `insert into app_user_sheet_permissions
      (user_id, permission_key, can_read, can_write, expires_at)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, permission_key)
     do update set
      can_read = excluded.can_read,
      can_write = excluded.can_write,
      expires_at = excluded.expires_at,
      updated_at = now()
     returning id, permission_key, can_read, can_write, expires_at, created_at, updated_at`,
    [
      userId,
      permission.permissionKey,
      permission.canRead,
      permission.canWrite,
      permission.expiresAt || null
    ]
  );
  return result.rows[0];
}

export async function getPermissionForUser(userId, permissionKey) {
  const result = await query(
    `select permission_key, can_read, can_write, expires_at
     from app_user_sheet_permissions
     where user_id = $1 and permission_key = $2`,
    [userId, permissionKey]
  );
  return result.rows[0] || null;
}
