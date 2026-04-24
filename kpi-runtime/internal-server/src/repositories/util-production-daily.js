import { query, withTransaction } from '../db/pool.js';

export const UTIL_PRODUCTION_STATE_TABLE = 'util_production_daily_state';
export const UTIL_PRODUCTION_ENTRY_TABLE = 'util_production_daily_entries';
export const UTIL_PRODUCTION_ARCHIVE_TABLE = 'util_production_daily_archives';
export const UTIL_PRODUCTION_STATE_KEY = 'default';

export async function listUtilProductionDailyEntries() {
  const result = await query(
    `select
        id,
        dedupe_key,
        production_date,
        team_name,
        line_name,
        product_name,
        amount,
        moisture_excluded_yield,
        equipment_capa,
        equipment_utilization,
        source_archive_id,
        source_fingerprint,
        source_file_name,
        created_at,
        updated_at
      from ${UTIL_PRODUCTION_ENTRY_TABLE}
      order by production_date asc, team_name asc, line_name asc, product_name asc, amount asc`
  );
  return result.rows;
}

export async function listUtilProductionDailyArchives() {
  const result = await query(
    `select
        id,
        file_name,
        byte_size,
        mime_type,
        last_modified,
        saved_at,
        folder_name,
        fingerprint,
        document_id,
        storage,
        preview_url,
        download_url,
        created_at,
        updated_at
      from ${UTIL_PRODUCTION_ARCHIVE_TABLE}
      order by saved_at desc, file_name asc`
  );
  return result.rows;
}

export async function findUtilProductionDailyStateRow() {
  const result = await query(
    `select
        state_key,
        period_start_day,
        version,
        updated_by_user_id,
        created_at,
        updated_at
      from ${UTIL_PRODUCTION_STATE_TABLE}
      where state_key = $1`,
    [UTIL_PRODUCTION_STATE_KEY]
  );
  return result.rows[0] || null;
}

export async function replaceUtilProductionDailyState({
  periodStartDay,
  entries,
  archives,
  updatedByUserId,
}) {
  return withTransaction(async (client) => {
    await client.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [
      'util_production_daily:state_bundle_v1',
    ]);

    const currentStateResult = await client.query(
      `select state_key, period_start_day, version, updated_by_user_id, created_at, updated_at
         from ${UTIL_PRODUCTION_STATE_TABLE}
        where state_key = $1
        for update`,
      [UTIL_PRODUCTION_STATE_KEY]
    );
    const currentStateRow = currentStateResult.rows[0] || null;

    const nextStateResult = currentStateRow
      ? await client.query(
          `update ${UTIL_PRODUCTION_STATE_TABLE}
              set period_start_day = $2,
                  updated_by_user_id = $3,
                  version = version + 1,
                  updated_at = now()
            where state_key = $1
            returning state_key, period_start_day, version, updated_by_user_id, created_at, updated_at`,
          [UTIL_PRODUCTION_STATE_KEY, periodStartDay, updatedByUserId || null]
        )
      : await client.query(
          `insert into ${UTIL_PRODUCTION_STATE_TABLE}
              (state_key, period_start_day, updated_by_user_id)
           values ($1, $2, $3)
           returning state_key, period_start_day, version, updated_by_user_id, created_at, updated_at`,
          [UTIL_PRODUCTION_STATE_KEY, periodStartDay, updatedByUserId || null]
        );

    await client.query(`delete from ${UTIL_PRODUCTION_ENTRY_TABLE}`);
    await client.query(`delete from ${UTIL_PRODUCTION_ARCHIVE_TABLE}`);

    for (const entry of Array.isArray(entries) ? entries : []) {
      await client.query(
        `insert into ${UTIL_PRODUCTION_ENTRY_TABLE}
            (dedupe_key, production_date, team_name, line_name, product_name, amount, moisture_excluded_yield,
             equipment_capa, equipment_utilization, source_archive_id, source_fingerprint, source_file_name)
         values
            ($1, $2, $3, $4, $5, $6::numeric, $7::numeric, $8::numeric, $9::numeric, $10, $11, $12)`,
        [
          entry.dedupeKey,
          entry.date,
          entry.teamName,
          entry.lineName,
          entry.productName,
          entry.amount,
          entry.moistureExcludedYield,
          entry.equipmentCapa,
          entry.equipmentUtilization,
          entry.sourceArchiveId,
          entry.sourceFingerprint,
          entry.sourceFileName,
        ]
      );
    }

    for (const archive of Array.isArray(archives) ? archives : []) {
      await client.query(
        `insert into ${UTIL_PRODUCTION_ARCHIVE_TABLE}
            (id, file_name, byte_size, mime_type, last_modified, saved_at, folder_name,
             fingerprint, document_id, storage, preview_url, download_url)
         values
            ($1, $2, $3, $4, $5, $6::timestamptz, $7, $8, $9, $10, $11, $12)`,
        [
          archive.id,
          archive.fileName,
          archive.size,
          archive.mimeType,
          archive.lastModified,
          archive.savedAt,
          archive.folderName,
          archive.fingerprint,
          archive.documentId,
          archive.storage,
          archive.previewUrl,
          archive.downloadUrl,
        ]
      );
    }

    const entryResult = await client.query(
      `select
          id,
          dedupe_key,
          production_date,
          team_name,
          line_name,
          product_name,
          amount,
          moisture_excluded_yield,
          equipment_capa,
          equipment_utilization,
          source_archive_id,
          source_fingerprint,
          source_file_name,
          created_at,
          updated_at
        from ${UTIL_PRODUCTION_ENTRY_TABLE}
        order by production_date asc, team_name asc, line_name asc, product_name asc, amount asc`
    );
    const archiveResult = await client.query(
      `select
          id,
          file_name,
          byte_size,
          mime_type,
          last_modified,
          saved_at,
          folder_name,
          fingerprint,
          document_id,
          storage,
          preview_url,
          download_url,
          created_at,
          updated_at
        from ${UTIL_PRODUCTION_ARCHIVE_TABLE}
        order by saved_at desc, file_name asc`
    );

    return {
      stateRow: nextStateResult.rows[0] || null,
      entryRows: entryResult.rows,
      archiveRows: archiveResult.rows,
    };
  });
}
