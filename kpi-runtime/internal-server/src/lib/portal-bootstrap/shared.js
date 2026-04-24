export const PORTAL_DATA_BOOTSTRAP_PATH = '/bootstrap/portal-data.js';

export function serializeJsonForScript(value) {
  return JSON.stringify(value ?? {})
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function createPermissionProbe(canAccessPermission) {
  return typeof canAccessPermission === 'function' ? canAccessPermission : async () => true;
}
