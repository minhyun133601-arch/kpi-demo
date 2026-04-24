import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withClient } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.join(__dirname, 'migrations');
const LEGACY_MIGRATION_ID_ALIASES = new Map([
  ['003_session_and_access_indexes.sql', ['002_session_and_access_indexes.sql']],
  ['004_util_production_daily_tables.sql', ['003_util_production_daily_tables.sql']],
]);

export { LEGACY_MIGRATION_ID_ALIASES };

export function resolveAppliedMigrationId(fileName, appliedMigrationIds) {
  if (appliedMigrationIds.has(fileName)) {
    return fileName;
  }

  const legacyIds = LEGACY_MIGRATION_ID_ALIASES.get(fileName) || [];
  for (const legacyId of legacyIds) {
    if (appliedMigrationIds.has(legacyId)) {
      return legacyId;
    }
  }

  return null;
}

export async function runMigrations() {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  const migrationFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();

  return withClient(async (client) => {
    await client.query(`
      create table if not exists app_schema_migrations (
        id text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    const appliedMigrationIds = new Set(
      (await client.query('select id from app_schema_migrations')).rows
        .map((row) => String(row.id || '').trim())
        .filter(Boolean)
    );
    const applied = [];
    const adopted = [];

    for (const fileName of migrationFiles) {
      const knownAppliedId = resolveAppliedMigrationId(fileName, appliedMigrationIds);
      if (knownAppliedId) {
        if (knownAppliedId !== fileName) {
          await client.query(
            'insert into app_schema_migrations (id) values ($1) on conflict do nothing',
            [fileName]
          );
          appliedMigrationIds.add(fileName);
          adopted.push({ legacyId: knownAppliedId, canonicalId: fileName });
        }
        continue;
      }

      const sql = await fs.readFile(path.join(migrationsDir, fileName), 'utf8');
      await client.query('begin');
      try {
        await client.query(sql);
        await client.query('insert into app_schema_migrations (id) values ($1)', [fileName]);
        await client.query('commit');
        appliedMigrationIds.add(fileName);
        applied.push(fileName);
      } catch (error) {
        await client.query('rollback');
        throw error;
      }
    }

    return { applied, adopted };
  });
}
