import { config } from '../config.js';
import { buildCookie, readJsonBody } from '../lib/http.js';
import { assertCanAccessPermission, isAdminRole, isOwnerRole } from '../services/auth.js';

export function normalizeText(value) {
  return String(value || '').trim();
}

export function normalizeExpectedVersion(value) {
  if (value === null || typeof value === 'undefined' || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

export async function parseBody(req) {
  return readJsonBody(req, config.maxJsonBodyBytes);
}

export function requireAuth(auth) {
  if (!config.authEnabled) return true;
  if (!auth?.user) {
    throw new Error('unauthorized');
  }
  return true;
}

export function requireAdmin(auth) {
  if (!config.authEnabled) return true;
  requireAuth(auth);
  if (!isAdminRole(auth.user)) {
    throw new Error('forbidden');
  }
  return true;
}

export function requireOwner(auth) {
  if (!config.authEnabled) return true;
  requireAuth(auth);
  if (!isOwnerRole(auth.user)) {
    throw new Error('forbidden');
  }
  return true;
}

export function serializePermissionKey(input) {
  const value = normalizeText(input);
  if (!value) {
    throw new Error('permission_key_required');
  }
  return value;
}

export async function canAccessPermission(user, permissionKey, accessType) {
  const normalizedPermissionKey = serializePermissionKey(permissionKey);
  if (!config.authEnabled) return true;
  try {
    await assertCanAccessPermission(user, normalizedPermissionKey, accessType);
    return true;
  } catch {
    return false;
  }
}

export async function assertOpenPermission(permissionKey, auth, accessType = 'read') {
  const normalizedPermissionKey = serializePermissionKey(permissionKey);
  if (!config.authEnabled) return true;
  await assertCanAccessPermission(auth?.user, normalizedPermissionKey, accessType);
  return true;
}

export function writeAuthCookie(res, rawToken, expiresAt) {
  res.setHeader(
    'Set-Cookie',
    buildCookie(config.cookieName, rawToken, {
      path: '/',
      sameSite: 'Lax',
      maxAge: Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
    })
  );
}

export function clearAuthCookie(res) {
  res.setHeader(
    'Set-Cookie',
    buildCookie(config.cookieName, '', {
      path: '/',
      sameSite: 'Lax',
      maxAge: 0
    })
  );
}

export function sendRedirect(res, location) {
  res.writeHead(302, {
    Location: location
  });
  res.end();
}

export function normalizeNextPath(input) {
  const value = normalizeText(input);
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }
  return value;
}

export function serializeServerUrlPath(pathname) {
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}
