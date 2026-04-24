import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const equipmentReadingTimelineSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('equipment/reading-timeline.js'),
  'utf8'
);

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createEquipmentReadingTimelineContext() {
  const adjustmentValues = new Map([
    ['field_01|2026-04-02', 1.25],
    ['field_13|2026-04-02', 0],
  ]);

  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Map,
    Set,
    RegExp,
    Promise,
    STICK_FIELD_ID: 'field_13',
    STICK_READING_WRAP_BASE: 10000,
    ENTRY_VALUE_CORRECTIONS: {
      '2026-04-02': {
        field_01: '16.25',
      },
    },
    equipmentReadingTimelineCache: new Map(),
    equipmentValidationReadingTimelineCache: new Map(),
    state: {
      store: {
        equipmentEntries: {
          '2026-04-01': {
            values: {
              field_01: '10',
              field_13: '9998',
            },
          },
          '2026-04-02': {
            values: {
              field_01: '15',
              field_13: '3',
            },
          },
          '2026-04-03': {
            values: {
              field_01: '20.50',
            },
          },
        },
      },
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    normalizeEntryValue(value) {
      return String(value ?? '').trim();
    },
    getEntryFractionDigits(value) {
      const normalizedValue = String(value || '').trim();
      const fraction = normalizedValue.split('.')[1] || '';
      return fraction.length;
    },
    applyEquipmentReadingAdjustment(equipmentId, rawValue, dateString) {
      return rawValue + (adjustmentValues.get(`${equipmentId}|${dateString}`) || 0);
    },
    getAdjacentValidationRecordedEquipmentReading(equipmentId, dateString, offset) {
      if (equipmentId === 'field_13' && dateString === '2026-04-02' && offset === -1) {
        return {
          value: 10002,
        };
      }

      return null;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentReadingTimelineSource, context, {
    filename: 'equipment/reading-timeline.js',
  });
  return context;
}

test('equipment reading timeline resolves stored details and latest fraction digits', () => {
  const context = createEquipmentReadingTimelineContext();

  assert.deepEqual(toPlainValue(context.getStoredEquipmentReadingDetailOnDate('field_01', '2026-04-03')), {
    rawValue: '20.50',
    value: 20.5,
  });
  assert.equal(context.getStoredEquipmentReadingDetailOnDate('field_01', '2026-04-04'), null);
  assert.equal(context.getLatestRecordedEquipmentFractionDigits('field_01'), 2);
  assert.equal(context.getLatestRecordedEquipmentFractionDigits('missing'), 0);
});

test('equipment reading timeline unwraps stick meter values with the configured wrap base', () => {
  const context = createEquipmentReadingTimelineContext();

  assert.equal(context.isStickReadingWrapEquipment('field_13'), true);
  assert.equal(context.isStickReadingWrapEquipment('field_01'), false);
  assert.equal(context.unwrapEquipmentReadingValue('field_13', 3, 10002), 10003);
  assert.equal(context.unwrapEquipmentReadingValue('field_01', 3, 10002), 3);
});

test('equipment reading timeline caches resolved reading timelines with adjustments and wrap handling', () => {
  const context = createEquipmentReadingTimelineContext();

  const timeline = context.getEquipmentReadingTimeline('field_13');
  const electricTimeline = context.getEquipmentReadingTimeline('field_01');

  assert.deepEqual(toPlainValue(timeline.orderedDates), ['2026-04-01', '2026-04-02']);
  assert.deepEqual(toPlainValue(context.getEquipmentReadingDetailOnDate('field_13', '2026-04-02')), {
    rawValue: '3',
    value: 10003,
    fractionDigits: 0,
  });
  assert.deepEqual(toPlainValue(electricTimeline.detailsByDate.get('2026-04-02')), {
    rawValue: '15',
    value: 16.25,
    fractionDigits: 0,
  });
  assert.equal(context.equipmentReadingTimelineCache.size, 2);

  context.clearEquipmentReadingTimelineCaches();
  assert.equal(context.equipmentReadingTimelineCache.size, 0);
  assert.equal(context.equipmentValidationReadingTimelineCache.size, 0);
});

test('equipment reading timeline resolves validation correction values and validation timeline entries', () => {
  const context = createEquipmentReadingTimelineContext();

  assert.equal(context.getValidationCorrectedEntryRawValue('field_01', '2026-04-01'), '');
  assert.equal(context.getValidationCorrectedEntryRawValue('field_01', '2026-04-02'), '16.25');

  const validationTimeline = context.getValidationReadingTimeline('field_01');
  assert.deepEqual(toPlainValue(validationTimeline.detailsByDate.get('2026-04-02')), {
    rawValue: '16.25',
    value: 17.5,
    fractionDigits: 2,
  });
});

test('equipment reading timeline prefers current raw values when requested for validation details', () => {
  const context = createEquipmentReadingTimelineContext();

  assert.deepEqual(
    toPlainValue(
      context.getValidationReadingDetailOnDate('field_01', '2026-04-02', {
        currentRawValue: '17.75',
        preferCurrentRawValue: true,
      })
    ),
    {
      rawValue: '17.75',
      value: 19,
      fractionDigits: 2,
    }
  );
  assert.deepEqual(
    toPlainValue(
      context.getValidationReadingDetailOnDate('field_13', '2026-04-02', {
        currentRawValue: '3',
        preferCurrentRawValue: true,
      })
    ),
    {
      rawValue: '3',
      value: 10003,
      fractionDigits: 0,
    }
  );
});
