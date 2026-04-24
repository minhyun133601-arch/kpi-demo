import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const equipmentNormalizationSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('equipment/normalization.js'),
  'utf8'
);

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEquipmentNormalizationContext(options = {}) {
  const presetEntries = options.presetEntries || {};
  const context = {
    console,
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
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    DEFAULT_EQUIPMENT_ITEMS: Object.freeze([
      Object.freeze({ id: 'field_01', label: 'base-electric', factor: 1 }),
    ]),
    DEFAULT_WASTE_EQUIPMENT_ITEMS: Object.freeze([]),
    DEFAULT_PRODUCTION_EQUIPMENT_ITEMS: Object.freeze([]),
    DEFAULT_GAS_EQUIPMENT_ITEMS: Object.freeze([
      Object.freeze({
        id: 'gas_meter',
        label: 'main-gas',
        factor: 1,
        decimalDigits: 0,
        visibleFromMonth: '',
        hiddenFromDate: '',
      }),
    ]),
    DEFAULT_ELECTRIC_EQUIPMENT_ITEM_BY_ID: new Map([
      ['field_01', { id: 'field_01', label: 'base-electric', factor: 1 }],
    ]),
    OTHER_EQUIPMENT_DEFAULT_ID: 'field_28',
    CLEARED_ENTRY_MONTH_PREFIXES: ['2025-02'],
    STICK_FIELD_ID: 'field_13',
    STICK_FIELD_LABEL: 'stick',
    LEGACY_STICK_FIELD_IDS: [
      'field_13',
      'field_stick_2024_04_to_2025_06',
      'field_stick_after_2025_08',
    ],
    HISTORICAL_ENTRY_VALUE_FIXES: Object.freeze({
      '2025-03-02': Object.freeze({
        field_01: '55',
      }),
    }),
    ENTRY_VALUE_CORRECTIONS: Object.freeze({
      '2025-03-03': Object.freeze({
        field_01: '9',
      }),
    }),
    normalizeResourceType(value) {
      if (value === 'gas') return 'gas';
      if (value === 'waste') return 'waste';
      if (value === 'production') return 'production';
      return 'electric';
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
    normalizeEquipmentFieldStatus(value) {
      return String(value ?? '').trim();
    },
    normalizeEquipmentFieldDayStatus(value) {
      return String(value ?? '').trim();
    },
    normalizeUsageFactor(value, fallback = 1) {
      const normalized = Number(value);
      return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
    },
    normalizeEquipmentDecimalDigits(value, fallback = 0) {
      if (value == null) {
        return fallback;
      }
      const normalized = Number(value);
      return Number.isInteger(normalized) && normalized >= 0 ? normalized : fallback;
    },
    normalizeEquipmentReadingAdjustmentValue(value, fallback = 0) {
      const normalized = Number(value);
      return Number.isFinite(normalized) ? normalized : fallback;
    },
    normalizeEquipmentReadingAdjustmentStartDate(value) {
      const normalized = String(value ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
    },
    looksLikeBrokenKoreanText(value) {
      return /\?/.test(String(value ?? ''));
    },
    getDefaultUsageFactorByLabel() {
      return 1;
    },
    isOtherEquipment(item) {
      return item?.id === 'field_28';
    },
    normalizeEquipmentFactorLabel(value) {
      return String(value ?? '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getEntryDayStatus(entry) {
      if (String(entry?.dayStatus || '').trim()) {
        return String(entry.dayStatus).trim();
      }
      return entry?.completed ? 'completed' : '';
    },
    hasEntryData(entry) {
      return (
        Object.keys(entry?.values || {}).length > 0 ||
        Object.keys(entry?.statuses || {}).length > 0 ||
        String(entry?.dayStatus || '').trim() !== ''
      );
    },
    getPresetEquipmentEntries() {
      return presetEntries;
    },
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
    },
    getEquipmentHiddenFromDate(item) {
      const normalized = String(item?.hiddenFromDate ?? '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : '';
    },
    compareMonthValues(firstValue, secondValue) {
      if (firstValue === secondValue) {
        return 0;
      }
      return firstValue < secondValue ? -1 : 1;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentNormalizationSource, context, {
    filename: 'equipment/normalization.js',
  });
  return context;
}

test('equipment normalization adds the default other equipment item for electric datasets', () => {
  const context = createEquipmentNormalizationContext();

  const normalizedItems = context.normalizeEquipmentItems(
    [{ id: 'field_01', label: 'base-electric', factor: 1 }],
    'electric'
  );

  assert.deepEqual(
    normalizedItems.map((item) => item.id),
    ['field_01', 'field_28']
  );
});

test('equipment normalization keeps gas items aligned with the default gas definitions', () => {
  const context = createEquipmentNormalizationContext();

  const normalizedItems = context.normalizeEquipmentItems(
    [
      {
        id: 'gas_meter',
        label: 'main-gas',
        factor: 3,
        decimalDigits: 2,
        visibleFromMonth: '2025-03',
      },
    ],
    'gas'
  );

  assert.equal(normalizedItems.length, 1);
  assert.equal(normalizedItems[0].id, 'gas_meter');
  assert.equal(normalizedItems[0].factor, 3);
  assert.equal(normalizedItems[0].decimalDigits, 2);
  assert.equal(normalizedItems[0].visibleFromMonth, '2025-03');
});

test('equipment normalization collapses legacy stick fields into the current stick id', () => {
  const context = createEquipmentNormalizationContext();

  const result = context.applyRequestedStickSingleEquipmentMigration(
    [
      { id: 'field_stick_2024_04_to_2025_06', label: 'legacy-stick-1', factor: 1 },
      { id: 'field_stick_after_2025_08', label: 'legacy-stick-2', factor: 1 },
    ],
    {
      '2025-03-01': {
        values: {
          field_stick_2024_04_to_2025_06: '11',
          field_stick_after_2025_08: '12',
        },
        statuses: {
          field_stick_after_2025_08: 'rest',
        },
        fieldDayStatuses: {
          field_stick_after_2025_08: 'hold',
        },
      },
    }
  );

  assert.deepEqual(
    result.equipmentItems.map((item) => item.id),
    ['field_13']
  );
  assert.deepEqual(toPlainJson(result.equipmentEntries['2025-03-01'].values), {
    field_13: '12',
  });
  assert.deepEqual(toPlainJson(result.equipmentEntries['2025-03-01'].statuses), {
    field_13: 'rest',
  });
  assert.deepEqual(toPlainJson(result.equipmentEntries['2025-03-01'].fieldDayStatuses), {
    field_13: 'hold',
  });
});

test('equipment normalization resets targeted months and normalizes entry payloads', () => {
  const context = createEquipmentNormalizationContext();

  const clearedEntries = context.clearEquipmentEntriesForResetMonths({
    '2025-01-30': { values: { field_01: '1' } },
    '2025-02-01': { values: { field_01: '2' } },
  });
  const normalizedEntries = context.normalizeEquipmentEntries({
    '2025-03-01': {
      values: {
        ' field_01 ': ' 7 ',
        field_empty: ' ',
      },
      statuses: {
        field_01: 'ok',
        field_empty: '',
      },
      dayStatus: 'completed',
      updatedAt: '2025-03-01T01:00:00.000Z',
    },
    invalid: {
      values: {
        field_01: '9',
      },
    },
  });

  assert.deepEqual(Object.keys(clearedEntries), ['2025-01-30']);
  assert.deepEqual(toPlainJson(normalizedEntries), {
    '2025-03-01': {
      values: {
        field_01: '7',
      },
      statuses: {
        field_01: 'ok',
      },
      fieldDayStatuses: {},
      dayStatus: 'completed',
      completed: true,
      updatedAt: '2025-03-01T01:00:00.000Z',
    },
  });
});

test('equipment normalization applies historical fixes and restores corrected preset values', () => {
  const context = createEquipmentNormalizationContext({
    presetEntries: {
      '2025-03-03': {
        values: {
          field_01: '11',
        },
      },
    },
  });

  const fixedEntries = context.applyRequestedHistoricalEntryValueFixes({
    '2025-03-02': {
      values: {
        field_01: '3',
      },
    },
  });
  const restoredEntries = context.restoreValidationCorrectionEntries({
    '2025-03-03': {
      values: {
        field_01: '9',
      },
    },
  });

  assert.equal(fixedEntries['2025-03-02'].values.field_01, '55');
  assert.equal(restoredEntries['2025-03-03'].values.field_01, '11');
});

test('equipment normalization prunes values outside visible ranges and hidden dates', () => {
  const context = createEquipmentNormalizationContext();

  const prunedEntries = context.pruneEquipmentEntriesByVisibility(
    {
      '2025-03-15': {
        values: {
          field_01: '1',
          field_02: '2',
        },
        statuses: {
          field_01: 'ok',
          field_02: 'hold',
        },
      },
      '2025-05-02': {
        values: {
          field_01: '3',
          field_02: '4',
        },
        statuses: {
          field_01: 'ok',
          field_02: 'hold',
        },
      },
    },
    [
      { id: 'field_01', visibleFromMonth: '2025-04' },
      { id: 'field_02', hiddenFromDate: '2025-05-01' },
    ]
  );

  assert.deepEqual(toPlainJson(prunedEntries['2025-03-15'].values), {
    field_02: '2',
  });
  assert.deepEqual(toPlainJson(prunedEntries['2025-05-02'].values), {
    field_01: '3',
  });
});
