import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../../config.js';
import { closePool } from '../../db/pool.js';
import { ensureDir } from '../../lib/fs.js';
import { findModuleRecord } from '../../repositories/modules.js';
import {
  loadUtilProductionDailyState,
  saveUtilProductionDailyState,
} from '../../services/util-production-daily.js';

const LEGACY_MODULE_KEY = 'portal_data';
const LEGACY_RECORD_KEY = 'util_production_daily';
const backupDir = path.join(config.storageRoot, 'migration-backups');

function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
    overwrite: argv.includes('--overwrite'),
  };
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
    `util-production-daily-legacy-v${record.version || 0}-${Date.now()}.json`
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
  const [legacyRecord, currentState] = await Promise.all([
    findModuleRecord(LEGACY_MODULE_KEY, LEGACY_RECORD_KEY),
    loadUtilProductionDailyState(),
  ]);

  const legacyPayload = isPlainObject(legacyRecord?.payload) ? legacyRecord.payload : null;
  const currentSource = currentState?.source || 'none';
  const structuredAlreadyActive = currentSource === 'structured_table';
  const report = {
    write: options.write,
    overwrite: options.overwrite,
    legacyRecordPresent: Boolean(legacyRecord),
    legacyVersion: legacyRecord?.version || 0,
    legacyEntryCount: countStateEntries(legacyPayload),
    legacyArchiveCount: countStateArchives(legacyPayload),
    currentSource,
    currentVersion: currentState?.meta?.version || 0,
    currentEntryCount: countStateEntries(currentState?.state),
    currentArchiveCount: countStateArchives(currentState?.state),
  };

  if (!legacyPayload) {
    throw new Error('legacy_util_production_daily_not_found');
  }

  if (structuredAlreadyActive && !options.overwrite) {
    if (!options.write) {
      console.log(
        JSON.stringify(
          {
            ...report,
            skipped: true,
            reason: 'structured_state_already_exists',
          },
          null,
          2
        )
      );
      return;
    }
    throw new Error('structured_state_already_exists');
  }

  if (!options.write) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  const backupPath = await writeBackupSnapshot(legacyRecord);
  const saved = await saveUtilProductionDailyState({
    state: legacyPayload,
    updatedByUserId: null,
  });

  console.log(
    JSON.stringify(
      {
        ...report,
        backupPath,
        savedSource: saved.source,
        savedVersion: saved.meta?.version || 0,
        savedEntryCount: countStateEntries(saved.state),
        savedArchiveCount: countStateArchives(saved.state),
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
