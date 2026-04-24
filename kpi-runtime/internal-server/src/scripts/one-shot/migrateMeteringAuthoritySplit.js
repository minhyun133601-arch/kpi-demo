import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config.js';
import { closePool } from '../../db/pool.js';
import { ensureDir } from '../../lib/fs.js';
import {
  METERING_AUTHORITY_RECORD_KEYS,
  METERING_LEGACY_SHARED_STORE_RECORD_KEY,
  listMeteringModuleRecords,
} from '../../repositories/metering-authority.js';
import { loadMeteringAuthorityStore, saveMeteringAuthorityStore } from '../../services/metering-authority.js';

const backupDir = path.join(config.storageRoot, 'migration-backups');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    overwrite: argv.includes('--overwrite'),
  };
}

function normalizeText(value) {
  return String(value || '').trim();
}

function mapRecordsByKey(records) {
  return new Map(
    (Array.isArray(records) ? records : [])
      .map((record) => [normalizeText(record?.record_key), record])
      .filter(([recordKey]) => recordKey)
  );
}

async function writeBackupSnapshot(records) {
  await ensureDir(backupDir);
  const safeRecords = Array.isArray(records) ? records : [];
  const versionLabel = safeRecords.length
    ? safeRecords
        .map((record) => `${record.record_key}-v${record.version}`)
        .sort()
        .join('__')
    : 'empty';
  const filePath = path.join(
    backupDir,
    `metering-authority-split-${versionLabel}-${Date.now()}.json`
  );

  await fs.writeFile(
    filePath,
    JSON.stringify(
      safeRecords.map((record) => ({
        exportedAt: new Date().toISOString(),
        moduleKey: record.module_key,
        recordKey: record.record_key,
        version: record.version,
        updatedAt: record.updated_at,
        payload: record.payload,
      })),
      null,
      2
    ),
    'utf8'
  );

  return filePath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [records, authorityState] = await Promise.all([
    listMeteringModuleRecords(),
    loadMeteringAuthorityStore(),
  ]);

  if (!authorityState) {
    throw new Error('metering_authority_not_found');
  }

  const recordsByKey = mapRecordsByKey(records);
  const legacyRecord = recordsByKey.get(METERING_LEGACY_SHARED_STORE_RECORD_KEY) || null;
  const existingSplitRecordKeys = METERING_AUTHORITY_RECORD_KEYS.filter((recordKey) => recordsByKey.has(recordKey));
  const sourceRecordVersions =
    authorityState.meta?.recordVersions ||
    (legacyRecord
      ? { [METERING_LEGACY_SHARED_STORE_RECORD_KEY]: legacyRecord.version }
      : null);

  const report = {
    write: options.write,
    overwrite: options.overwrite,
    sourceMode: existingSplitRecordKeys.length ? 'split_or_hybrid' : 'legacy_only',
    sourceVersion: authorityState.meta?.version || 0,
    sourceRecordVersions,
    legacyRecordPresent: Boolean(legacyRecord),
    existingSplitRecordKeys,
    targetRecordKeys: METERING_AUTHORITY_RECORD_KEYS,
  };

  if (!options.write) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const backupPath = await writeBackupSnapshot(records);
  const savedState = await saveMeteringAuthorityStore({
    store: authorityState.store,
    updatedByUserId: null,
    expectedRecordVersions: options.overwrite ? null : sourceRecordVersions,
  });

  console.log(
    JSON.stringify(
      {
        ...report,
        backupPath,
        savedVersion: savedState.meta?.version || 0,
        savedRecordVersions: savedState.meta?.recordVersions || null,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error.message,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
