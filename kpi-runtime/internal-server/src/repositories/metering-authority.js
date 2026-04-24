import { withTransaction } from '../db/pool.js';
import { listModuleRecordsByModuleKey } from './modules.js';

export const METERING_MODULE_KEY = 'util_metering';
export const METERING_LEGACY_SHARED_STORE_RECORD_KEY = 'shared_store_v1';
export const METERING_AUTHORITY_UI_STATE_RECORD_KEY = 'ui_state_v1';
export const METERING_AUTHORITY_RECORD_KEYS = Object.freeze([
  METERING_AUTHORITY_UI_STATE_RECORD_KEY,
  'electric_v1',
  'gas_v1',
  'waste_v1',
  'production_v1',
]);

function normalizeText(value) {
  return String(value || '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeExpectedRecordVersions(value) {
  if (!isPlainObject(value)) {
    return null;
  }

  const normalizedEntries = Object.entries(value)
    .map(([recordKey, versionValue]) => {
      const normalizedRecordKey = normalizeText(recordKey);
      const normalizedVersion = Number.parseInt(String(versionValue ?? ''), 10);
      if (!normalizedRecordKey || !Number.isInteger(normalizedVersion) || normalizedVersion < 0) {
        return null;
      }
      return [normalizedRecordKey, normalizedVersion];
    })
    .filter(Boolean);

  return normalizedEntries.length ? Object.fromEntries(normalizedEntries) : null;
}

function mapRowsByRecordKey(rows) {
  return new Map(
    (Array.isArray(rows) ? rows : []).map((row) => [normalizeText(row?.record_key), row]).filter(([key]) => key)
  );
}

function buildSelectRecordKeys(expectedRecordVersions, payloadByRecordKey) {
  const targetRecordKeys = Object.keys(isPlainObject(payloadByRecordKey) ? payloadByRecordKey : {}).map(normalizeText);
  const expectedRecordKeys = Object.keys(isPlainObject(expectedRecordVersions) ? expectedRecordVersions : {}).map(
    normalizeText
  );

  return [...new Set([...METERING_AUTHORITY_RECORD_KEYS, ...targetRecordKeys, ...expectedRecordKeys])].filter(Boolean);
}

async function insertModuleRecord(client, { recordKey, permissionKey, payload, updatedByUserId }) {
  const result = await client.query(
    `insert into app_module_records
      (module_key, record_key, permission_key, payload, updated_by_user_id)
     values ($1, $2, $3, $4::jsonb, $5)
     returning id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id`,
    [
      METERING_MODULE_KEY,
      recordKey,
      permissionKey,
      JSON.stringify(payload ?? {}),
      updatedByUserId || null,
    ]
  );
  return result.rows[0] || null;
}

async function updateModuleRecord(client, { recordKey, permissionKey, payload, updatedByUserId }) {
  const result = await client.query(
    `update app_module_records
       set permission_key = $3,
           payload = $4::jsonb,
           updated_by_user_id = $5,
           version = version + 1,
           updated_at = now()
     where module_key = $1 and record_key = $2
     returning id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id`,
    [
      METERING_MODULE_KEY,
      recordKey,
      permissionKey,
      JSON.stringify(payload ?? {}),
      updatedByUserId || null,
    ]
  );
  return result.rows[0] || null;
}

export async function listMeteringModuleRecords() {
  return listModuleRecordsByModuleKey(METERING_MODULE_KEY);
}

export async function saveMeteringAuthorityRecordPayloads({
  payloadByRecordKey,
  permissionKey,
  updatedByUserId,
  expectedRecordVersions,
}) {
  const normalizedExpectedRecordVersions = normalizeExpectedRecordVersions(expectedRecordVersions);
  const normalizedPayloadByRecordKey = Object.fromEntries(
    Object.entries(isPlainObject(payloadByRecordKey) ? payloadByRecordKey : {})
      .map(([recordKey, payload]) => [normalizeText(recordKey), isPlainObject(payload) ? payload : {}])
      .filter(([recordKey]) => recordKey && METERING_AUTHORITY_RECORD_KEYS.includes(recordKey))
  );

  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${METERING_MODULE_KEY}:authority_bundle_v1`,
    ]);

    const selectRecordKeys = buildSelectRecordKeys(
      normalizedExpectedRecordVersions,
      normalizedPayloadByRecordKey
    );
    const currentResult = await client.query(
      `select id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id
         from app_module_records
        where module_key = $1 and record_key = any($2::text[])
        for update`,
      [METERING_MODULE_KEY, selectRecordKeys]
    );
    const currentRows = currentResult.rows;
    const currentByRecordKey = mapRowsByRecordKey(currentRows);

    if (normalizedExpectedRecordVersions) {
      for (const [recordKey, expectedVersion] of Object.entries(normalizedExpectedRecordVersions)) {
        const currentVersion = Number.isInteger(currentByRecordKey.get(recordKey)?.version)
          ? currentByRecordKey.get(recordKey).version
          : 0;
        if (currentVersion !== expectedVersion) {
          const error = new Error('version_conflict');
          error.currentRecords = currentRows;
          throw error;
        }
      }
    }

    const savedRecords = [];
    for (const recordKey of METERING_AUTHORITY_RECORD_KEYS) {
      const payload = normalizedPayloadByRecordKey[recordKey] ?? {};
      const currentRecord = currentByRecordKey.get(recordKey) || null;
      const nextPayloadJson = JSON.stringify(payload ?? {});
      const currentPayloadJson = currentRecord ? JSON.stringify(currentRecord.payload ?? {}) : '';
      const shouldSkipUpdate =
        currentRecord &&
        normalizeText(currentRecord.permission_key) === normalizeText(permissionKey) &&
        currentPayloadJson === nextPayloadJson;

      if (shouldSkipUpdate) {
        continue;
      }

      const savedRecord = currentRecord
        ? await updateModuleRecord(client, {
            recordKey,
            permissionKey,
            payload,
            updatedByUserId,
          })
        : await insertModuleRecord(client, {
            recordKey,
            permissionKey,
            payload,
            updatedByUserId,
          });

      if (savedRecord) {
        currentByRecordKey.set(recordKey, savedRecord);
        savedRecords.push(savedRecord);
      }
    }

    return {
      currentRecords: [...currentByRecordKey.values()],
      savedRecords,
    };
  });
}
