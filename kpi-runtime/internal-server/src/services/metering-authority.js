import { appendAuditLog } from '../repositories/audit-log.js';
import { listMeteringModuleRecords, saveMeteringAuthorityRecordPayloads } from '../repositories/metering-authority.js';
import {
  METERING_AUTHORITY_RECORD_KEYS,
  METERING_AUTHORITY_UI_STATE_RECORD_KEY,
  METERING_LEGACY_SHARED_STORE_RECORD_KEY,
  METERING_MODULE_KEY,
  METERING_PERMISSION_KEY,
  RESOURCE_RECORD_KEY_BY_TYPE,
  RESOURCE_TYPES,
} from './metering-authority/constants.js';
import {
  buildPayloadByRecordKey,
  createMeteringAuthorityState,
  getAuditActionKeyForRecordVersion,
  normalizeSharedStoreMeta,
  resolveExpectedRecordVersions,
} from './metering-authority/state.js';

export {
  METERING_AUTHORITY_RECORD_KEYS,
  METERING_AUTHORITY_UI_STATE_RECORD_KEY,
  METERING_LEGACY_SHARED_STORE_RECORD_KEY,
  METERING_MODULE_KEY,
  RESOURCE_RECORD_KEY_BY_TYPE,
  RESOURCE_TYPES,
  buildPayloadByRecordKey,
};

export async function loadMeteringAuthorityStore() {
  const records = await listMeteringModuleRecords();
  const state = createMeteringAuthorityState(records);
  return state.store ? state : null;
}

export async function saveMeteringAuthorityStore({
  store,
  updatedByUserId,
  expectedRecordVersions,
  expectedVersion,
}) {
  const normalizedExpectedRecordVersions = resolveExpectedRecordVersions(
    expectedRecordVersions,
    expectedVersion
  );

  try {
    const result = await saveMeteringAuthorityRecordPayloads({
      payloadByRecordKey: buildPayloadByRecordKey(store),
      permissionKey: METERING_PERMISSION_KEY,
      updatedByUserId,
      expectedRecordVersions: normalizedExpectedRecordVersions,
    });
    const nextState = createMeteringAuthorityState(result.currentRecords);

    if (updatedByUserId) {
      await Promise.all(
        result.savedRecords.map((record) =>
          appendAuditLog({
            actorUserId: updatedByUserId,
            actionKey: getAuditActionKeyForRecordVersion(record.version),
            targetType: 'module_record',
            targetKey: `${record.module_key}:${record.record_key}`,
            detail: {
              moduleKey: record.module_key,
              recordKey: record.record_key,
              permissionKey: record.permission_key,
              version: record.version,
            },
          })
        )
      );
    }

    return {
      ...nextState,
      meta: normalizeSharedStoreMeta(nextState.meta),
    };
  } catch (error) {
    if (error?.message === 'version_conflict') {
      const conflictState = createMeteringAuthorityState(error.currentRecords || []);
      error.currentMeta = normalizeSharedStoreMeta(conflictState.meta);
    }
    throw error;
  }
}
