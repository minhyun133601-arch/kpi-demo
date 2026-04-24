import { config } from '../config.js';
import { hashPassword, randomToken, sha256, verifyPassword } from '../lib/crypto.js';
import { parseCookies } from '../lib/http.js';
import { PERMISSION_KEYS } from '../lib/permission-registry.js';
import { appendAuditLog } from '../repositories/audit-log.js';
import { createSession, deleteSession, findSession, touchSession } from '../repositories/sessions.js';
import {
  createUser,
  findUserProfileById,
  findUserByUsername,
  getPermissionForUser,
  ownerExists,
  replaceUserRoles,
  upsertUserPermission
} from '../repositories/users.js';

const ADMIN_ROLES = new Set(['owner', 'admin']);
const OWNER_ROLE = 'owner';
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/;

function normalizeUsername(input) {
  const value = String(input || '').trim();
  if (!value) {
    throw new Error('username_and_password_required');
  }
  if (!USERNAME_PATTERN.test(value)) {
    throw new Error('invalid_username_format');
  }
  return value;
}

function normalizeRoles(inputRoles) {
  const allowed = new Set(['owner', 'admin', 'sheet_editor', 'viewer']);
  const roles = Array.isArray(inputRoles) ? inputRoles : [];
  const cleaned = roles
    .map((role) => String(role || '').trim().toLowerCase())
    .filter((role) => allowed.has(role));
  return [...new Set(cleaned)];
}

function isViewerOnlyRoleSet(roles) {
  return Array.isArray(roles) && roles.length === 1 && roles[0] === 'viewer';
}

async function grantDefaultViewerReadPermissions(userId) {
  const permissionKeys = Object.values(PERMISSION_KEYS);
  for (const permissionKey of permissionKeys) {
    await upsertUserPermission(userId, {
      permissionKey,
      canRead: true,
      canWrite: false,
      expiresAt: null
    });
  }
}

export async function getBootstrapStatus() {
  return {
    ownerExists: await ownerExists()
  };
}

export async function bootstrapOwner({ username, displayName, password }) {
  if (!username || !password) {
    throw new Error('username_and_password_required');
  }
  if (await ownerExists()) {
    throw new Error('owner_already_exists');
  }

  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const user = await createUser({ username: normalizedUsername, displayName, passwordHash });
  await replaceUserRoles(user.id, ['owner']);
  await appendAuditLog({
    actorUserId: user.id,
    actionKey: 'owner.bootstrap',
    targetType: 'user',
    targetKey: user.id,
    detail: { username: user.username }
  });
  return user;
}

export async function createManagedUser({ actorUserId, username, displayName, password, roles }) {
  if (!username || !password) {
    throw new Error('username_and_password_required');
  }

  const normalizedUsername = normalizeUsername(username);
  const passwordHash = await hashPassword(password);
  const user = await createUser({ username: normalizedUsername, displayName, passwordHash });
  const normalizedRoles = normalizeRoles(roles);
  const assignedRoles = normalizedRoles.length ? normalizedRoles : ['viewer'];
  await replaceUserRoles(user.id, assignedRoles);
  if (isViewerOnlyRoleSet(assignedRoles)) {
    await grantDefaultViewerReadPermissions(user.id);
  }
  await appendAuditLog({
    actorUserId,
    actionKey: 'user.create',
    targetType: 'user',
    targetKey: user.id,
    detail: { username: user.username, roles: assignedRoles }
  });
  return user;
}

export async function setUserPermission({ actorUserId, userId, permissionKey, canRead, canWrite, expiresAt }) {
  const permission = await upsertUserPermission(userId, {
    permissionKey,
    canRead: Boolean(canRead),
    canWrite: Boolean(canWrite),
    expiresAt: expiresAt || null
  });
  await appendAuditLog({
    actorUserId,
    actionKey: 'permission.upsert',
    targetType: 'sheet_permission',
    targetKey: `${userId}:${permissionKey}`,
    detail: {
      canRead: permission.can_read,
      canWrite: permission.can_write,
      expiresAt: permission.expires_at
    }
  });
  return permission;
}

export async function login({ username, password, ipAddress, userAgent }) {
  const user = await findUserByUsername(username);
  if (!user || !user.is_active) {
    throw new Error('invalid_credentials');
  }

  const valid = await verifyPassword(password, user.password_hash);
  if (!valid) {
    throw new Error('invalid_credentials');
  }

  const rawToken = randomToken(32);
  const tokenHash = sha256(`${rawToken}:${config.cookieSecret}`);
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);
  await createSession({
    tokenHash,
    userId: user.id,
    expiresAt,
    ipAddress,
    userAgent
  });

  await appendAuditLog({
    actorUserId: user.id,
    actionKey: 'auth.login',
    targetType: 'session',
    targetKey: tokenHash,
    detail: {
      username: user.username,
      displayName: user.display_name,
      ipAddress: ipAddress || '',
      userAgent: userAgent || ''
    }
  });

  return {
    rawToken,
    expiresAt,
    user: await buildUserProfile(user.id)
  };
}

export async function logout(rawToken) {
  if (!rawToken) return;
  const tokenHash = sha256(`${rawToken}:${config.cookieSecret}`);
  await deleteSession(tokenHash);
}

export async function getAuthContext(req) {
  const cookies = parseCookies(req);
  const rawToken = cookies[config.cookieName];
  if (!rawToken) return null;

  const tokenHash = sha256(`${rawToken}:${config.cookieSecret}`);
  const session = await findSession(tokenHash);
  if (!session || !session.is_active) {
    return null;
  }

  const expiresAt = new Date(session.expires_at);
  if (expiresAt.getTime() <= Date.now()) {
    await deleteSession(tokenHash);
    return null;
  }

  await touchSession(session.id);

  return {
    sessionId: session.id,
    rawToken,
    tokenHash,
    user: await buildUserProfile(session.user_id)
  };
}

export async function buildUserProfile(userId) {
  const userProfile = await findUserProfileById(userId);
  if (!userProfile) return null;
  return {
    ...userProfile,
    roles: Array.isArray(userProfile.roles) ? userProfile.roles : [],
    permissions: Array.isArray(userProfile.permissions) ? userProfile.permissions : []
  };
}

export function isAdminRole(user) {
  return Array.isArray(user?.roles) && user.roles.some((role) => ADMIN_ROLES.has(role));
}

export function isOwnerRole(user) {
  return Array.isArray(user?.roles) && user.roles.includes(OWNER_ROLE);
}

export async function assertCanAccessPermission(user, permissionKey, mode = 'read') {
  if (!user?.id) {
    throw new Error('unauthorized');
  }
  if (isAdminRole(user)) return true;

  const permission = await getPermissionForUser(user.id, permissionKey);
  if (!permission) {
    throw new Error('forbidden');
  }

  if (permission.expires_at && new Date(permission.expires_at).getTime() <= Date.now()) {
    throw new Error('forbidden');
  }

  if (mode === 'write' && !permission.can_write) {
    throw new Error('forbidden');
  }
  if (mode === 'read' && !permission.can_read && !permission.can_write) {
    throw new Error('forbidden');
  }

  return true;
}
