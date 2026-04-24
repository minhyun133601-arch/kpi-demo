import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentReadingWindowSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/reading-window.js',
    import.meta.url
  ),
  'utf8'
);

function createEquipmentReadingWindowContext() {
  const readingTimelines = new Map([
    [
      'field_01',
      {
        orderedDates: ['2026-04-01', '2026-04-04', '2026-04-07'],
        detailsByDate: new Map([
          ['2026-04-01', { value: 10 }],
          ['2026-04-04', { value: 16 }],
          ['2026-04-07', { value: 25 }],
        ]),
      },
    ],
    [
      'field_02',
      {
        orderedDates: ['2026-04-02'],
        detailsByDate: new Map([
          ['2026-04-02', { value: 3 }],
        ]),
      },
    ],
    [
      'field_03',
      {
        orderedDates: ['2026-04-01', '2026-04-05'],
        detailsByDate: new Map([
          ['2026-04-01', { value: 7 }],
        ]),
      },
    ],
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
    Set,
    Map,
    RegExp,
    Promise,
    getEquipmentReadingDetailOnDate(equipmentId, dateString) {
      return readingTimelines.get(equipmentId)?.detailsByDate?.get(dateString) || null;
    },
    getEquipmentReadingTimeline(equipmentId) {
      return readingTimelines.get(equipmentId) || {
        orderedDates: [],
        detailsByDate: new Map(),
      };
    },
    getNextDateString(dateString) {
      const date = new Date(`${dateString}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      return date.toISOString().slice(0, 10);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentReadingWindowSource, context, {
    filename: 'equipment/reading-window.js',
  });
  return context;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test('equipment reading window resolves reading values by date', () => {
  const context = createEquipmentReadingWindowContext();

  assert.equal(context.getEquipmentReadingOnDate('field_01', '2026-04-04'), 16);
  assert.equal(context.getEquipmentReadingOnDate('field_01', '2026-04-06'), null);
  assert.equal(context.getEquipmentReadingOnDate('missing', '2026-04-04'), null);
});

test('equipment reading window returns a copied reading date list', () => {
  const context = createEquipmentReadingWindowContext();

  const readingDates = toPlainJson(context.getEquipmentReadingDates('field_01'));
  assert.deepEqual(readingDates, ['2026-04-01', '2026-04-04', '2026-04-07']);

  readingDates.push('2099-01-01');
  assert.deepEqual(
    toPlainJson(context.getEquipmentReadingDates('field_01')),
    ['2026-04-01', '2026-04-04', '2026-04-07']
  );
});

test('equipment reading window expands distributed dates from start inclusive to end exclusive', () => {
  const context = createEquipmentReadingWindowContext();

  assert.deepEqual(
    toPlainJson(context.getDistributedUsageDates('2026-04-01', '2026-04-04')),
    ['2026-04-01', '2026-04-02', '2026-04-03']
  );
  assert.deepEqual(toPlainJson(context.getDistributedUsageDates('2026-04-04', '2026-04-04')), []);
});

test('equipment reading window resolves the active distributed usage window for a calendar date', () => {
  const context = createEquipmentReadingWindowContext();
  const usageWindow = toPlainJson(
    context.getEquipmentDistributedUsageWindow('field_01', '2026-04-05')
  );

  assert.deepEqual(usageWindow, {
    startDate: '2026-04-04',
    endDate: '2026-04-07',
    startReading: 16,
    endReading: 25,
    distributedDates: ['2026-04-04', '2026-04-05', '2026-04-06'],
  });
});

test('equipment reading window returns null when readings are insufficient or incomplete', () => {
  const context = createEquipmentReadingWindowContext();

  assert.equal(context.getEquipmentDistributedUsageWindow('field_02', '2026-04-02'), null);
  assert.equal(context.getEquipmentDistributedUsageWindow('field_01', '2026-04-07'), null);
  assert.equal(context.getEquipmentDistributedUsageWindow('field_03', '2026-04-03'), null);
});
