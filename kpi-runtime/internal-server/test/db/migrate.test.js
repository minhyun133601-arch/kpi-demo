import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveAppliedMigrationId } from '../../src/db/migrate.js';

test('resolveAppliedMigrationId prefers canonical id when already applied', () => {
  const appliedMigrationIds = new Set(['003_session_and_access_indexes.sql']);
  assert.equal(
    resolveAppliedMigrationId('003_session_and_access_indexes.sql', appliedMigrationIds),
    '003_session_and_access_indexes.sql'
  );
});

test('resolveAppliedMigrationId accepts legacy aliases for renamed migrations', () => {
  const appliedMigrationIds = new Set([
    '002_session_and_access_indexes.sql',
    '003_util_production_daily_tables.sql',
  ]);

  assert.equal(
    resolveAppliedMigrationId('003_session_and_access_indexes.sql', appliedMigrationIds),
    '002_session_and_access_indexes.sql'
  );
  assert.equal(
    resolveAppliedMigrationId('004_util_production_daily_tables.sql', appliedMigrationIds),
    '003_util_production_daily_tables.sql'
  );
});

test('resolveAppliedMigrationId returns null for unapplied migrations', () => {
  const appliedMigrationIds = new Set(['001_initial_foundation.sql']);
  assert.equal(resolveAppliedMigrationId('003_session_and_access_indexes.sql', appliedMigrationIds), null);
});
