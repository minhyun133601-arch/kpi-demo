import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { closePool } from '../db/pool.js';
import { ensureDir } from '../lib/fs.js';
import { deleteModuleRecord, findModuleRecord } from '../repositories/modules.js';
import { loadUtilProductionDailyState } from '../services/util-production-daily.js';

const LEGACY_MODULE_KEY = 'portal_data';
const LEGACY_RECORD_KEY = 'util_production_daily';
const backupDir = path.join(config.storageRoot, 'migration-backups');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
  };
}

function countStateEntries(state) {
  const teams = Array.isArray(state?.teams) ? state.teams : [];
  return teams.reduce((count, team) => {
    const entries = Array.isArray(team?.entries) ? team.entries : [];
    return count + entries.length;
  }, 0);
}

function countStateArchives(state) {
  return Array.isArray(state?.archives) ? state.archives.length : 0;
}

async function writeBackupSnapshot(record) {
  await ensureDir(backupDir);
  const filePath = path.join(
    backupDir,
    `cleanup-util-production-daily-legacy-v${record.version || 0}-${Date.now()}.json`
  );

  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        moduleKey: record.module_key,
        recordKey: record.record_key,
        version: record.version,
        updatedAt: record.updated_at,
        payload: record.payload,
      },
      null,
      2
    ),
    'utf8'
  );

  return filePath;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [legacyRecord, structuredState] = await Promise.all([
    findModuleRecord(LEGACY_MODULE_KEY, LEGACY_RECORD_KEY),
    loadUtilProductionDailyState(),
  ]);

  const report = {
    write: options.write,
    legacyRecordPresent: Boolean(legacyRecord),
    legacyVersion: legacyRecord?.version || 0,
    structuredSource: structuredState?.source || 'none',
    structuredVersion: structuredState?.meta?.version || 0,
    structuredEntryCount: countStateEntries(structuredState?.state),
    structuredArchiveCount: countStateArchives(structuredState?.state),
    safeToDelete: Boolean(legacyRecord) && structuredState?.source === 'structured_table',
  };

  if (!options.write) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!legacyRecord) {
    console.log(
      JSON.stringify(
        {
          ...report,
          skipped: true,
          reason: 'legacy_record_not_found',
        },
        null,
        2
      )
    );
    return;
  }

  if (structuredState?.source !== 'structured_table') {
    throw new Error('structured_state_not_ready');
  }

  const backupPath = await writeBackupSnapshot(legacyRecord);
  const deletedRecord = await deleteModuleRecord({
    moduleKey: LEGACY_MODULE_KEY,
    recordKey: LEGACY_RECORD_KEY,
    expectedVersion: legacyRecord.version,
  });
  const [postLegacyRecord, postStructuredState] = await Promise.all([
    findModuleRecord(LEGACY_MODULE_KEY, LEGACY_RECORD_KEY),
    loadUtilProductionDailyState(),
  ]);

  console.log(
    JSON.stringify(
      {
        ...report,
        backupPath,
        deleted: Boolean(deletedRecord),
        postDeleteLegacyRecordPresent: Boolean(postLegacyRecord),
        postDeleteStructuredSource: postStructuredState?.source || 'none',
        postDeleteStructuredVersion: postStructuredState?.meta?.version || 0,
        postDeleteStructuredEntryCount: countStateEntries(postStructuredState?.state),
        postDeleteStructuredArchiveCount: countStateArchives(postStructuredState?.state),
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
