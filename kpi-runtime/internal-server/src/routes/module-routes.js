import { sendJson } from '../lib/http.js';
import { getModuleRecordPermissionKey } from '../lib/portal-data-registry.js';
import { findModuleRecord } from '../repositories/modules.js';
import { saveModuleRecord } from '../services/module-records.js';
import {
  assertOpenPermission,
  normalizeExpectedVersion,
  parseBody,
  serializePermissionKey
} from './route-context.js';

function getModuleRecordMeta(record) {
  if (!record) return null;
  return {
    moduleKey: record.module_key,
    recordKey: record.record_key,
    permissionKey: record.permission_key,
    version: record.version,
    updatedAt: record.updated_at
  };
}

function readStoredPermissionKey(record) {
  const permissionKey = String(record?.permission_key || '').trim();
  return permissionKey || '';
}

async function resolveModuleRecordPermissionKey(moduleKey, recordKey, existingRecord = null) {
  const knownPermissionKey = getModuleRecordPermissionKey(moduleKey, recordKey);
  if (knownPermissionKey) {
    return knownPermissionKey;
  }

  const loadedRecord = existingRecord || (await findModuleRecord(moduleKey, recordKey));
  return readStoredPermissionKey(loadedRecord);
}

export async function handleGetModuleRecord(context, moduleKey, recordKey) {
  const { res, auth, url } = context;
  void url;
  const record = await findModuleRecord(moduleKey, recordKey);
  if (!record) {
    sendJson(res, 404, { ok: false, error: 'not_found' });
    return;
  }

  const permissionKey = await resolveModuleRecordPermissionKey(moduleKey, recordKey, record);
  if (!permissionKey) {
    sendJson(res, 400, { ok: false, error: 'permission_key_unresolved' });
    return;
  }

  await assertOpenPermission(permissionKey, auth, 'read');
  sendJson(res, 200, {
    ok: true,
    record
  });
}

export async function handleUpsertModuleRecord(context, moduleKey, recordKey) {
  const { req, res, auth } = context;
  const body = await parseBody(req);
  void body.permissionKey;
  const existingRecord = await findModuleRecord(moduleKey, recordKey);
  const permissionKey = await resolveModuleRecordPermissionKey(moduleKey, recordKey, existingRecord);
  if (!permissionKey) {
    sendJson(res, 400, { ok: false, error: 'permission_key_unresolved' });
    return;
  }

  serializePermissionKey(permissionKey);
  await assertOpenPermission(permissionKey, auth, 'write');

  let record;
  try {
    record = await saveModuleRecord({
      moduleKey,
      recordKey,
      permissionKey,
      payload: body.payload ?? {},
      updatedByUserId: auth?.user?.id || null,
      expectedVersion: normalizeExpectedVersion(body.expectedVersion)
    });
  } catch (error) {
    if (error?.message === 'version_conflict') {
      sendJson(res, 409, {
        ok: false,
        error: 'version_conflict',
        currentRecord: getModuleRecordMeta(error.currentRecord)
      });
      return;
    }
    throw error;
  }

  sendJson(res, 200, {
    ok: true,
    record
  });
}
