import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeStorePresetsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/store-presets.js'),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimeStorePresetsContext(options = {}) {
  const context = {
    console,
    Date,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    Map,
    Set,
    LEGACY_GAS_2025_02_SHIFT_CUTOFF_UPDATED_AT:
      options.shiftCutoffUpdatedAt ?? '2025-03-05T00:00:00.000Z',
    LEGACY_GAS_2025_02_DATE_SHIFT_MAP:
      options.shiftMap ??
      new Map([
        ['2025-02-28', '2025-03-01'],
      ]),
    LEGACY_SHIFTED_GAS_ENTRY_START_DATE:
      options.shiftStartDate ?? '2025-02-01',
    LEGACY_SHIFTED_GAS_ENTRY_END_DATE:
      options.shiftEndDate ?? '2025-03-31',
    GAS_METER_ITEM_DEFINITIONS:
      options.gasMeterItemDefinitions ??
      Object.freeze([
        Object.freeze({ id: 'gas_meter_main' }),
        Object.freeze({ id: 'gas_meter_sub' }),
      ]),
    GAS_CORRECTION_TARGET_IDS:
      options.gasCorrectionTargetIds ?? new Set(['gas_meter_main']),
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      const normalized = String(value ?? '').trim();
      return /^\d{4}-\d{2}$/.test(normalized) ? normalized : '';
    },
    normalizeEntryValue(value) {
      return String(value ?? '').trim();
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    isGasResourceType() {
      return options.isGasResourceType ?? true;
    },
    getNextDateString(dateString) {
      const date = new Date(`${dateString}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      return date.toISOString().slice(0, 10);
    },
    normalizeStore(store) {
      return {
        kind: 'normalized-store',
        store,
      };
    },
    createDefaultResourceDataset(resourceType) {
      return {
        resourceType,
      };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeStorePresetsSource, context, {
    filename: 'runtime/store-presets.js',
  });
  return context;
}

test('runtime store presets shift and prune legacy gas entries conservatively', () => {
  const context = createRuntimeStorePresetsContext();

  const shiftedEntries = context.applyLegacyGasFebruary2025DateShift({
    '2025-02-28': {
      values: {
        gas_meter_main: '100',
      },
      updatedAt: '2025-03-01T10:00:00.000Z',
    },
    '2025-03-01': {
      values: {
        gas_meter_main: '90',
      },
      updatedAt: '2025-03-01T09:00:00.000Z',
    },
    '2025-03-02': {
      values: {
        gas_meter_main: '100',
      },
      updatedAt: '2025-03-02T10:00:00.000Z',
    },
  });

  assert.deepEqual(toPlain(shiftedEntries['2025-03-01'].values), {
    gas_meter_main: '100',
  });
  assert.equal(shiftedEntries['2025-02-28'], undefined);

  const prunedEntries = context.pruneLegacyShiftedGasEntries({
    '2025-03-01': {
      values: {
        gas_meter_main: '100',
      },
    },
    '2025-03-02': {
      values: {
        gas_meter_main: '100',
      },
    },
    '2025-03-03': {
      values: {
        gas_meter_main: '110',
      },
    },
  });

  assert.equal(prunedEntries['2025-03-01'], undefined);
  assert.deepEqual(toPlain(prunedEntries['2025-03-02'].values), {
    gas_meter_main: '100',
  });
});

test('runtime store presets merge entry density and item metadata from preset local store', () => {
  const context = createRuntimeStorePresetsContext();

  const mergedEntries = context.mergeEquipmentEntriesWithPresetLocalStore(
    {
      '2026-04-01': {
        values: {
          gas_meter_main: '120',
        },
        updatedAt: '2026-04-01T09:00:00.000Z',
      },
      '2026-04-02': {
        values: {
          gas_meter_main: '121',
          gas_meter_sub: '5',
        },
        updatedAt: '2026-04-02T09:00:00.000Z',
      },
    },
    {
      '2026-04-01': {
        values: {
          gas_meter_main: '120',
          gas_meter_sub: '4',
        },
        updatedAt: '2026-04-01T08:00:00.000Z',
      },
      '2026-04-03': {
        values: {
          gas_meter_main: '130',
        },
        updatedAt: '2026-04-03T09:00:00.000Z',
      },
    }
  );

  assert.deepEqual(toPlain(mergedEntries['2026-04-01'].values), {
    gas_meter_main: '120',
    gas_meter_sub: '4',
  });
  assert.deepEqual(toPlain(mergedEntries['2026-04-02'].values), {
    gas_meter_main: '121',
    gas_meter_sub: '5',
  });
  assert.deepEqual(toPlain(mergedEntries['2026-04-03'].values), {
    gas_meter_main: '130',
  });

  const mergedItems = context.mergeEquipmentItemsWithPresetLocalStore(
    [
      {
        id: 'field_01',
        label: 'current',
        factor: 2,
        visibleFromMonth: '2026-04',
      },
    ],
    [
      {
        id: 'field_01',
        label: 'preset',
        factor: 1,
        hiddenFromDate: '2026-04-01',
      },
      {
        id: 'field_02',
        label: 'preset-only',
        factor: 3,
      },
    ]
  );

  assert.equal(mergedItems.length, 2);
  assert.deepEqual(toPlain(mergedItems[0]), {
    id: 'field_01',
    label: 'current',
    factor: 2,
    visibleFromMonth: '2026-04',
    hiddenFromDate: '2026-04-01',
  });
  assert.deepEqual(toPlain(mergedItems[1]), {
    id: 'field_02',
    label: 'preset-only',
    factor: 3,
  });
});

test('runtime store presets expose gas correction predicate and default store factory', () => {
  const context = createRuntimeStorePresetsContext();

  assert.equal(context.isGasCorrectionTargetEquipment('gas_meter_main'), true);
  assert.equal(context.isGasCorrectionTargetEquipment('field_01'), false);

  const defaultStore = context.createDefaultStore();
  assert.deepEqual(toPlain(defaultStore), {
    kind: 'normalized-store',
    store: {
      resourceType: 'electric',
      resourceDatasets: {
        electric: {
          resourceType: 'electric',
        },
        gas: {
          resourceType: 'gas',
        },
        waste: {
          resourceType: 'waste',
        },
        production: {
          resourceType: 'production',
        },
      },
    },
  });
});
