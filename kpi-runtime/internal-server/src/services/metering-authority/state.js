import {
  ELECTRIC_DATASET_META_KEYS,
  METERING_AUTHORITY_RECORD_KEYS,
  METERING_AUTHORITY_UI_STATE_RECORD_KEY,
  METERING_LEGACY_SHARED_STORE_RECORD_KEY,
  METERING_MODULE_KEY,
  METERING_PERMISSION_KEY,
  RESOURCE_RECORD_KEY_BY_TYPE,
  RESOURCE_TYPES,
} from './constants.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

function normalizeResourceType(value) {
  return RESOURCE_TYPES.includes(normalizeText(value)) ? normalizeText(value) : 'electric';
}

export function normalizeSharedStoreMeta(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const version = Number.parseInt(String(value.version ?? ''), 10);
  if (!Number.isInteger(version) || version < 0) {
    return null;
  }

  const recordVersions = isPlainObject(value.recordVersions)
    ? Object.fromEntries(
        Object.entries(value.recordVersions)
          .map(([recordKey, rawVersion]) => {
            const normalizedRecordKey = normalizeText(recordKey);
            const normalizedVersion = Number.parseInt(String(rawVersion ?? ''), 10);
            if (!normalizedRecordKey || !Number.isInteger(normalizedVersion) || normalizedVersion < 0) {
              return null;
            }
            return [normalizedRecordKey, normalizedVersion];
          })
          .filter(Boolean)
      )
    : null;

  return {
    moduleKey: normalizeText(value.moduleKey),
    recordKey: normalizeText(value.recordKey),
    permissionKey: normalizeText(value.permissionKey),
    version,
    updatedAt: normalizeText(value.updatedAt),
    recordVersions,
  };
}

function mapRecordsByKey(records) {
  return new Map(
    (Array.isArray(records) ? records : [])
      .map((record) => [normalizeText(record?.record_key), record])
      .filter(([recordKey]) => recordKey)
  );
}

function hasSplitAuthorityRecords(recordsByKey) {
  return METERING_AUTHORITY_RECORD_KEYS.some((recordKey) => recordsByKey.has(recordKey));
}

function getLatestUpdatedAt(recordsByKey, recordKeys = [...recordsByKey.keys()]) {
  return recordKeys
    .map((recordKey) => recordsByKey.get(recordKey))
    .filter(Boolean)
    .map((record) => normalizeText(record?.updated_at))
    .filter(Boolean)
    .sort()
    .at(-1) || '';
}

function buildCompositeMeta(recordsByKey) {
  const recordVersions = Object.fromEntries(
    METERING_AUTHORITY_RECORD_KEYS.map((recordKey) => [
      recordKey,
      Number.isInteger(recordsByKey.get(recordKey)?.version) ? recordsByKey.get(recordKey).version : 0,
    ])
  );
  return {
    moduleKey: METERING_MODULE_KEY,
    recordKey: 'authority_bundle_v1',
    permissionKey: METERING_PERMISSION_KEY,
    version: Math.max(0, ...Object.values(recordVersions)),
    updatedAt: getLatestUpdatedAt(recordsByKey, METERING_AUTHORITY_RECORD_KEYS),
    recordVersions,
  };
}

function buildLegacyMeta(record) {
  return {
    moduleKey: METERING_MODULE_KEY,
    recordKey: METERING_LEGACY_SHARED_STORE_RECORD_KEY,
    permissionKey: normalizeText(record?.permission_key) || METERING_PERMISSION_KEY,
    version: Number.isInteger(record?.version) ? record.version : 0,
    updatedAt: normalizeText(record?.updated_at),
    recordVersions: {
      [METERING_LEGACY_SHARED_STORE_RECORD_KEY]: Number.isInteger(record?.version) ? record.version : 0,
    },
  };
}

function extractRawResourceDataset(rawStore, resourceType) {
  if (!isPlainObject(rawStore)) {
    return {};
  }

  const normalizedType = normalizeResourceType(resourceType);
  const rawDatasets = isPlainObject(rawStore.resourceDatasets) ? rawStore.resourceDatasets : null;
  if (rawDatasets && isPlainObject(rawDatasets[normalizedType])) {
    return rawDatasets[normalizedType];
  }

  if (normalizedType === 'electric') {
    return {
      mode: rawStore.mode,
      equipmentItems: rawStore.equipmentItems,
      equipmentEntries: rawStore.equipmentEntries,
      teamAssignments: rawStore.teamAssignments,
      teamMonthlyEntries: rawStore.teamMonthlyEntries,
      teamMonthlyAmountEntries: rawStore.teamMonthlyAmountEntries,
      billingDocuments: rawStore.billingDocuments,
      billingSettlementEntries: rawStore.billingSettlementEntries,
      presetImportVersion: rawStore.presetImportVersion,
      entryResetVersion: rawStore.entryResetVersion,
      entryStatusBaselineVersion: rawStore.entryStatusBaselineVersion,
      equipmentFactorMigrationVersion: rawStore.equipmentFactorMigrationVersion,
      teamAssignmentBaselineVersion: rawStore.teamAssignmentBaselineVersion,
      historicalEntryValueFixVersion: rawStore.historicalEntryValueFixVersion,
      stickMeterSplitVersion: rawStore.stickMeterSplitVersion,
    };
  }

  return {};
}

function extractUiState(rawStore) {
  return {
    resourceType: normalizeResourceType(rawStore?.resourceType),
    manualSaveHistory: Array.isArray(rawStore?.manualSaveHistory) ? cloneJson(rawStore.manualSaveHistory) : [],
  };
}

function buildResourcePayload(rawStore, resourceType) {
  const payload = cloneJson(extractRawResourceDataset(rawStore, resourceType));
  if (resourceType === 'electric') {
    ELECTRIC_DATASET_META_KEYS.forEach((key) => {
      if (rawStore?.[key] !== undefined && payload[key] === undefined) {
        payload[key] = rawStore[key];
      }
    });
  }
  return isPlainObject(payload) ? payload : {};
}

export function buildPayloadByRecordKey(rawStore) {
  return {
    [METERING_AUTHORITY_UI_STATE_RECORD_KEY]: extractUiState(rawStore),
    [RESOURCE_RECORD_KEY_BY_TYPE.electric]: buildResourcePayload(rawStore, 'electric'),
    [RESOURCE_RECORD_KEY_BY_TYPE.gas]: buildResourcePayload(rawStore, 'gas'),
    [RESOURCE_RECORD_KEY_BY_TYPE.waste]: buildResourcePayload(rawStore, 'waste'),
    [RESOURCE_RECORD_KEY_BY_TYPE.production]: buildResourcePayload(rawStore, 'production'),
  };
}

function buildStoreFromSplitRecords(recordsByKey) {
  const legacyRecord = recordsByKey.get(METERING_LEGACY_SHARED_STORE_RECORD_KEY) || null;
  const legacyStore = isPlainObject(legacyRecord?.payload) ? legacyRecord.payload : {};
  const uiStateRecord = recordsByKey.get(METERING_AUTHORITY_UI_STATE_RECORD_KEY) || null;
  const uiState = isPlainObject(uiStateRecord?.payload)
    ? uiStateRecord.payload
    : extractUiState(legacyStore);

  return {
    resourceType: normalizeResourceType(uiState.resourceType),
    manualSaveHistory: Array.isArray(uiState.manualSaveHistory)
      ? cloneJson(uiState.manualSaveHistory)
      : extractUiState(legacyStore).manualSaveHistory,
    resourceDatasets: Object.fromEntries(
      RESOURCE_TYPES.map((resourceType) => {
        const recordKey = RESOURCE_RECORD_KEY_BY_TYPE[resourceType];
        const recordPayload = recordsByKey.get(recordKey)?.payload;
        const fallbackPayload = extractRawResourceDataset(legacyStore, resourceType);
        return [resourceType, cloneJson(isPlainObject(recordPayload) ? recordPayload : fallbackPayload)];
      })
    ),
  };
}

export function createMeteringAuthorityState(records) {
  const recordsByKey = mapRecordsByKey(records);
  const legacyRecord = recordsByKey.get(METERING_LEGACY_SHARED_STORE_RECORD_KEY) || null;
  const hasSplit = hasSplitAuthorityRecords(recordsByKey);

  if (!hasSplit && legacyRecord) {
    return {
      hasSplit,
      legacyRecord,
      records,
      recordsByKey,
      store: cloneJson(isPlainObject(legacyRecord.payload) ? legacyRecord.payload : {}),
      meta: buildLegacyMeta(legacyRecord),
    };
  }

  if (!hasSplit && !legacyRecord) {
    return {
      hasSplit,
      legacyRecord: null,
      records,
      recordsByKey,
      store: null,
      meta: null,
    };
  }

  return {
    hasSplit,
    legacyRecord,
    records,
    recordsByKey,
    store: buildStoreFromSplitRecords(recordsByKey),
    meta: buildCompositeMeta(recordsByKey),
  };
}

export function getAuditActionKeyForRecordVersion(version) {
  return Number(version) <= 1 ? 'module.record.create' : 'module.record.update';
}

export function resolveExpectedRecordVersions(expectedRecordVersions, expectedVersion) {
  if (isPlainObject(expectedRecordVersions)) {
    const normalizedEntries = Object.entries(expectedRecordVersions)
      .map(([recordKey, rawVersion]) => {
        const normalizedRecordKey = normalizeText(recordKey);
        const normalizedVersion = Number.parseInt(String(rawVersion ?? ''), 10);
        if (!normalizedRecordKey || !Number.isInteger(normalizedVersion) || normalizedVersion < 0) {
          return null;
        }
        return [normalizedRecordKey, normalizedVersion];
      })
      .filter(Boolean);
    if (normalizedEntries.length) {
      return Object.fromEntries(normalizedEntries);
    }
  }

  const normalizedLegacyVersion = Number.parseInt(String(expectedVersion ?? ''), 10);
  if (Number.isInteger(normalizedLegacyVersion) && normalizedLegacyVersion >= 0) {
    return {
      [METERING_LEGACY_SHARED_STORE_RECORD_KEY]: normalizedLegacyVersion,
    };
  }

  return null;
}
