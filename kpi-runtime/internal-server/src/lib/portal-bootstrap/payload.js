import {
  CURRENT_PORTAL_DATA_RECORDS,
  getModuleRecordPermissionKey,
  WORK_RUNTIME_BOOTSTRAP_RECORDS,
} from '../portal-data-registry.js';

function resolveRecordPermissionKey(record) {
  const knownPermissionKey = getModuleRecordPermissionKey(record?.module_key, record?.record_key);
  return String(knownPermissionKey || record?.permission_key || '').trim();
}

export async function splitReadableModuleRecords(records, auth, permissionProbe) {
  const source = Array.isArray(records) ? records : [];
  const readable = [];
  const blocked = [];

  for (const record of source) {
    const permissionKey = resolveRecordPermissionKey(record);
    if (!permissionKey) {
      blocked.push({
        moduleKey: record?.module_key || '',
        recordKey: record?.record_key || '',
        reason: 'permission_key_unresolved',
      });
      continue;
    }

    const canRead = await permissionProbe(auth?.user, permissionKey, 'read');
    if (!canRead) {
      blocked.push({
        moduleKey: record?.module_key || '',
        recordKey: record?.record_key || '',
        permissionKey,
      });
      continue;
    }

    readable.push(
      permissionKey === record?.permission_key
        ? record
        : {
            ...record,
            permission_key: permissionKey,
          }
    );
  }

  return { readable, blocked };
}

export function buildPortalDataBootstrapPayload(records, workRuntimeRecords = [], options = {}) {
  const recordMap = new Map(records.map((record) => [record.record_key, record]));
  const workRuntimeRecordMap = new Map(workRuntimeRecords.map((record) => [record.record_key, record]));
  const knownPortalRecordKeys =
    options.knownPortalRecordKeys instanceof Set
      ? options.knownPortalRecordKeys
      : new Set(records.map((record) => record.record_key));
  const knownWorkRuntimeRecordKeys =
    options.knownWorkRuntimeRecordKeys instanceof Set
      ? options.knownWorkRuntimeRecordKeys
      : new Set(workRuntimeRecords.map((record) => record.record_key));
  const portalData = {};
  const importedMeta = [];
  const missing = [];

  for (const recordDef of CURRENT_PORTAL_DATA_RECORDS) {
    const loaded = recordMap.get(recordDef.recordKey);
    if (!loaded) {
      if (!knownPortalRecordKeys.has(recordDef.recordKey)) {
        missing.push(recordDef.recordKey);
      }
      continue;
    }

    portalData[recordDef.sourceKey] = loaded.payload ?? null;
    importedMeta.push({
      moduleKey: loaded.module_key,
      recordKey: loaded.record_key,
      permissionKey: loaded.permission_key,
      version: loaded.version,
      updatedAt: loaded.updated_at,
    });
  }

  for (const recordDef of WORK_RUNTIME_BOOTSTRAP_RECORDS) {
    const loaded = workRuntimeRecordMap.get(recordDef.recordKey);
    if (!loaded) {
      if (!knownWorkRuntimeRecordKeys.has(recordDef.recordKey)) {
        missing.push(recordDef.recordKey);
      }
      continue;
    }

    portalData[recordDef.sourceKey] = loaded.payload ?? null;
    importedMeta.push({
      moduleKey: loaded.module_key,
      recordKey: loaded.record_key,
      permissionKey: loaded.permission_key,
      version: loaded.version,
      updatedAt: loaded.updated_at,
    });
  }

  if (portalData.audit_regulation && !portalData.audit_legal_facility) {
    portalData.audit_legal_facility = portalData.audit_regulation;
  }

  return {
    portalData,
    importedMeta,
    missing,
  };
}
