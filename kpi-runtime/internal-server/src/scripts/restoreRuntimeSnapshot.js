import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';
import { closePool, withClient } from '../db/pool.js';

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

const TRUNCATE_ORDER = Object.freeze([
  'app_audit_log',
  'util_production_daily_entries',
  'util_production_daily_archives',
  'util_production_daily_state',
  'app_documents',
  'app_module_records',
  'app_sessions',
  'app_user_sheet_permissions',
  'app_user_roles',
  'app_users',
  'app_schema_migrations'
]);

const INSERT_ORDER = Object.freeze([
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

function readArg(name) {
  const prefix = `--${name}=`;
  const entry = process.argv.slice(2).find((value) => value.startsWith(prefix));
  return entry ? entry.slice(prefix.length).trim() : '';
}

function hasFlag(name) {
  return process.argv.slice(2).includes(`--${name}`);
}

async function resolveSnapshotPath() {
  const explicitPath = readArg('snapshot');
  if (explicitPath) {
    return path.isAbsolute(explicitPath)
      ? explicitPath
      : path.resolve(config.projectRoot, explicitPath);
  }

  const snapshotRoot = path.join(config.storageRoot, 'backups', 'runtime-snapshots');
  const entries = await fs.readdir(snapshotRoot, { withFileTypes: true }).catch(() => []);
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const fullPath = path.join(snapshotRoot, entry.name);
    const stat = await fs.stat(fullPath);
    candidates.push({
      fullPath,
      mtimeMs: stat.mtimeMs
    });
  }
  candidates.sort((left, right) => right.mtimeMs - left.mtimeMs);
  if (!candidates.length) {
    throw new Error('snapshot_not_found');
  }
  return candidates[0].fullPath;
}

async function loadSnapshot(snapshotPath) {
  const raw = await fs.readFile(snapshotPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!parsed?.tables || typeof parsed.tables !== 'object') {
    throw new Error('invalid_snapshot');
  }
  return parsed;
}

async function tableExists(client, tableName) {
  const result = await client.query('select to_regclass($1) as table_name', [tableName]);
  return Boolean(result.rows[0]?.table_name);
}

async function getColumnInfo(client, tableName) {
  const result = await client.query(
    `select column_name, data_type, udt_name
     from information_schema.columns
     where table_schema = 'public' and table_name = $1
     order by ordinal_position`,
    [tableName]
  );
  return result.rows.map((row) => ({
    name: row.column_name,
    isJson: row.data_type === 'json' || row.data_type === 'jsonb' || row.udt_name === 'jsonb'
  }));
}

async function getCurrentRowCount(client, tableName) {
  const result = await client.query(`select count(*)::int as count from ${tableName}`);
  return result.rows[0]?.count || 0;
}

function coerceSnapshotValue(column, value) {
  if (typeof value === 'undefined') return null;
  if (value === null) return null;
  if (column.isJson) return JSON.stringify(value);
  return value;
}

async function insertTableRows(client, tableName, rows, columns) {
  if (!rows.length) return;
  const columnNames = columns.map((column) => column.name);
  const placeholderSql = columns
    .map((column, index) => (column.isJson ? `$${index + 1}::jsonb` : `$${index + 1}`))
    .join(', ');
  const insertSql = `insert into ${tableName} (${columnNames.join(', ')}) values (${placeholderSql})`;

  for (const row of rows) {
    const values = columns.map((column) => coerceSnapshotValue(column, row[column.name]));
    await client.query(insertSql, values);
  }
}

async function buildPlan(client, snapshot) {
  const tableSummary = {};
  const columnInfo = {};

  for (const tableName of SNAPSHOT_TABLES) {
    const exists = await tableExists(client, tableName);
    const snapshotTable = snapshot.tables[tableName] || { exists: false, rows: [] };
    const currentRowCount = exists ? await getCurrentRowCount(client, tableName) : 0;
    const rows = Array.isArray(snapshotTable.rows) ? snapshotTable.rows : [];
    tableSummary[tableName] = {
      exists,
      currentRowCount,
      snapshotRowCount: snapshotTable.exists === false ? 0 : rows.length
    };
    columnInfo[tableName] = exists ? await getColumnInfo(client, tableName) : [];
  }

  return {
    tableSummary,
    columnInfo,
    truncateOrder: TRUNCATE_ORDER.filter((tableName) => tableSummary[tableName]?.exists),
    insertOrder: INSERT_ORDER.filter((tableName) => tableSummary[tableName]?.exists)
  };
}

async function resetSequences(client, tableName, columns) {
  for (const column of columns) {
    const result = await client.query('select pg_get_serial_sequence($1, $2) as sequence_name', [tableName, column.name]);
    const sequenceName = result.rows[0]?.sequence_name;
    if (!sequenceName) continue;
    await client.query(
      `select setval($1, coalesce((select max(${column.name}) from ${tableName}), 1), true)`,
      [sequenceName]
    );
  }
}

async function executeRestore(client, snapshot, plan) {
  await client.query('begin');
  try {
    for (const tableName of plan.truncateOrder) {
      await client.query(`truncate table ${tableName}`);
    }

    for (const tableName of plan.insertOrder) {
      const snapshotTable = snapshot.tables[tableName] || { rows: [] };
      const rows = Array.isArray(snapshotTable.rows) ? snapshotTable.rows : [];
      const columns = plan.columnInfo[tableName] || [];
      await insertTableRows(client, tableName, rows, columns);
      await resetSequences(client, tableName, columns);
    }

    await client.query('commit');
  } catch (error) {
    await client.query('rollback');
    throw error;
  }
}

async function main() {
  const planOnly = hasFlag('plan');
  const dryRun = hasFlag('dry-run');
  const force = hasFlag('force');
  const snapshotPath = await resolveSnapshotPath();
  const snapshot = await loadSnapshot(snapshotPath);

  if (!planOnly && !dryRun && !force) {
    throw new Error('force_required');
  }

  const result = await withClient(async (client) => {
    const plan = await buildPlan(client, snapshot);

    if (!planOnly && !dryRun) {
      await executeRestore(client, snapshot, plan);
    }

    return {
      ok: true,
      mode: planOnly ? 'plan' : dryRun ? 'dry-run' : 'restore',
      snapshotPath,
      createdAt: snapshot.createdAt || null,
      tableSummary: plan.tableSummary,
      truncateOrder: plan.truncateOrder,
      insertOrder: plan.insertOrder
    };
  });

  console.log(JSON.stringify(result, null, 2));
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
