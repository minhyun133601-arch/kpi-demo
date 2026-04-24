import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildPayloadByRecordKey,
  createMeteringAuthorityState,
  normalizeSharedStoreMeta,
  resolveExpectedRecordVersions,
} from '../../src/services/metering-authority/state.js';

test('createMeteringAuthorityState keeps legacy store when split records do not exist', () => {
  const state = createMeteringAuthorityState([
    {
      module_key: 'util_metering',
      record_key: 'shared_store_v1',
      permission_key: 'util_metering_app',
      version: 3,
      updated_at: '2026-04-18T00:00:00.000Z',
      payload: {
        resourceType: 'gas',
        manualSaveHistory: [{ savedAt: '2026-04-01T00:00:00.000Z' }],
      },
    },
  ]);

  assert.equal(state.hasSplit, false);
  assert.equal(state.store.resourceType, 'gas');
  assert.equal(state.meta.version, 3);
});

test('createMeteringAuthorityState merges split records and legacy fallbacks', () => {
  const state = createMeteringAuthorityState([
    {
      module_key: 'util_metering',
      record_key: 'shared_store_v1',
      permission_key: 'util_metering_app',
      version: 2,
      updated_at: '2026-04-18T00:00:00.000Z',
      payload: {
        mode: 'legacy-electric',
        resourceDatasets: {
          production: { mode: 'legacy-production' },
        },
      },
    },
    {
      module_key: 'util_metering',
      record_key: 'ui_state_v1',
      permission_key: 'util_metering_app',
      version: 1,
      updated_at: '2026-04-18T01:00:00.000Z',
      payload: {
        resourceType: 'waste',
        manualSaveHistory: [{ savedAt: '2026-04-18T01:00:00.000Z' }],
      },
    },
    {
      module_key: 'util_metering',
      record_key: 'electric_v1',
      permission_key: 'util_metering_app',
      version: 4,
      updated_at: '2026-04-18T02:00:00.000Z',
      payload: {
        mode: 'split-electric',
      },
    },
  ]);

  assert.equal(state.hasSplit, true);
  assert.equal(state.store.resourceType, 'waste');
  assert.equal(state.store.resourceDatasets.electric.mode, 'split-electric');
  assert.equal(state.store.resourceDatasets.production.mode, 'legacy-production');
  assert.equal(state.meta.recordVersions.electric_v1, 4);
});

test('metering helpers normalize payload and expected versions', () => {
  const payloadByRecordKey = buildPayloadByRecordKey({
    resourceType: 'gas',
    manualSaveHistory: ['entry'],
    resourceDatasets: {
      gas: { mode: 'gas-mode' },
    },
    mode: 'electric-mode',
  });
  const meta = normalizeSharedStoreMeta({
    moduleKey: 'util_metering',
    recordKey: 'authority_bundle_v1',
    permissionKey: 'util_metering_app',
    version: 4,
    updatedAt: '2026-04-18T00:00:00.000Z',
    recordVersions: {
      electric_v1: 4,
    },
  });

  assert.equal(payloadByRecordKey.ui_state_v1.resourceType, 'gas');
  assert.equal(payloadByRecordKey.electric_v1.mode, 'electric-mode');
  assert.equal(payloadByRecordKey.gas_v1.mode, 'gas-mode');
  assert.equal(meta.version, 4);
  assert.deepEqual(resolveExpectedRecordVersions(null, 7), { shared_store_v1: 7 });
});
