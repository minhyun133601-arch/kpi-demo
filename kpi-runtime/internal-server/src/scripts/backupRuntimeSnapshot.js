import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { closePool, query } from '../db/pool.js';

const SNAPSHOT_TABLES = Object.freeze([
  'app_schema_migrations',
  'app_users',
  'app_user_roles',
  'app_user_sheet_permissions',
  'app_sessions',
  'app_module_records',
  'app_documents',
  'util_production_daily_state',
  'util_production_daily_entries',
  'util_production_daily_archives',
  'app_audit_log'
]);

function makeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function tableExists(tableName) {
  const result = await query('select to_regclass($1) as table_name', [tableName]);
  return Boolean(result.rows[0]?.table_name);
}

async function loadTableRows(tableName) {
  const result = await query(`select * from ${tableName}`);
  return result.rows;
}

async function main() {
  const timestamp = makeTimestamp();
  const backupRoot = path.join(config.storageRoot, 'backups', 'runtime-snapshots');
  const snapshotPath = path.join(backupRoot, `runtime-snapshot-${timestamp}.json`);

  await fs.mkdir(backupRoot, { recursive: true });

  const tables = {};
  for (const tableName of SNAPSHOT_TABLES) {
    const exists = await tableExists(tableName);
    if (!exists) {
      tables[tableName] = {
        exists: false,
        rowCount: 0,
        rows: []
      };
      continue;
    }

    const rows = await loadTableRows(tableName);
    tables[tableName] = {
      exists: true,
      rowCount: rows.length,
      rows
    };
  }

  const payload = {
    ok: true,
    createdAt: new Date().toISOString(),
    snapshotPath,
    databaseUrl: config.databaseUrl,
    tables
  };

  await fs.writeFile(snapshotPath, JSON.stringify(payload, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        snapshotPath,
        tableSummary: Object.fromEntries(
          Object.entries(tables).map(([tableName, table]) => [
            tableName,
            {
              exists: table.exists,
              rowCount: table.rowCount
            }
          ])
        )
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
          error: error.message
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
