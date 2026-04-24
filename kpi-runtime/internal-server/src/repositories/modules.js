import { query, withTransaction } from '../db/pool.js';

export async function findModuleRecord(moduleKey, recordKey) {
  const result = await query(
    `select id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id
     from app_module_records
     where module_key = $1 and record_key = $2`,
    [moduleKey, recordKey]
  );
  return result.rows[0] || null;
}

export async function listModuleRecordsByModuleKey(moduleKey) {
  const result = await query(
    `select id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id
     from app_module_records
     where module_key = $1
     order by record_key asc`,
    [moduleKey]
  );
  return result.rows;
}

export async function upsertModuleRecord({
  moduleKey,
  recordKey,
  permissionKey,
  payload,
  updatedByUserId,
  expectedVersion
}) {
  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${moduleKey}:${recordKey}`
    ]);

    const currentResult = await client.query(
      `select id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id
       from app_module_records
       where module_key = $1 and record_key = $2
       for update`,
      [moduleKey, recordKey]
    );
    const currentRecord = currentResult.rows[0] || null;
    const currentVersion = Number.isInteger(currentRecord?.version) ? currentRecord.version : 0;

    if (Number.isInteger(expectedVersion) && expectedVersion >= 0 && currentVersion !== expectedVersion) {
      const error = new Error('version_conflict');
      error.currentRecord = currentRecord;
      error.currentVersion = currentVersion;
      throw error;
    }

    const result = currentRecord
      ? await client.query(
          `update app_module_records
           set permission_key = $3,
               payload = $4::jsonb,
               updated_by_user_id = $5,
               version = version + 1,
               updated_at = now()
           where module_key = $1 and record_key = $2
           returning id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id`,
          [moduleKey, recordKey, permissionKey, JSON.stringify(payload ?? {}), updatedByUserId || null]
        )
      : await client.query(
          `insert into app_module_records
            (module_key, record_key, permission_key, payload, updated_by_user_id)
           values ($1, $2, $3, $4::jsonb, $5)
           returning id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id`,
          [moduleKey, recordKey, permissionKey, JSON.stringify(payload ?? {}), updatedByUserId || null]
        );
    return result.rows[0];
  });
}

export async function deleteModuleRecord({
  moduleKey,
  recordKey,
  expectedVersion
}) {
  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      `${moduleKey}:${recordKey}`
    ]);

    const currentResult = await client.query(
      `select id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id
       from app_module_records
       where module_key = $1 and record_key = $2
       for update`,
      [moduleKey, recordKey]
    );
    const currentRecord = currentResult.rows[0] || null;
    const currentVersion = Number.isInteger(currentRecord?.version) ? currentRecord.version : 0;

    if (Number.isInteger(expectedVersion) && expectedVersion >= 0 && currentVersion !== expectedVersion) {
      const error = new Error('version_conflict');
      error.currentRecord = currentRecord;
      error.currentVersion = currentVersion;
      throw error;
    }

    if (!currentRecord) {
      return null;
    }

    const result = await client.query(
      `delete from app_module_records
       where module_key = $1 and record_key = $2
       returning id, module_key, record_key, permission_key, payload, version, created_at, updated_at, updated_by_user_id`,
      [moduleKey, recordKey]
    );

    return result.rows[0] || null;
  });
}
