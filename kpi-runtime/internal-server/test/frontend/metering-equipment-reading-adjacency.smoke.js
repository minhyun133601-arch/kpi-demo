import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentReadingAdjacencySource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/reading-adjacency.js',
    import.meta.url
  ),
  'utf8'
);

function createEquipmentReadingAdjacencyContext() {
  const mainTimelines = new Map([
    [
      'field_01',
      {
        orderedDates: ['2026-04-01', '2026-04-05', '2026-04-09'],
        detailsByDate: new Map([
          ['2026-04-01', { rawValue: '10', value: 10, fractionDigits: 0 }],
          ['2026-04-05', { rawValue: '15.5', value: 15.5, fractionDigits: 1 }],
          ['2026-04-09', { rawValue: '22', value: 22, fractionDigits: 0 }],
        ]),
      },
    ],
    [
      'field_02',
      {
        orderedDates: ['2026-04-03'],
        detailsByDate: new Map([
          ['2026-04-03', { rawValue: '8', value: 8, fractionDigits: 0 }],
        ]),
      },
    ],
  ]);

  const validationTimelines = new Map([
    [
      'field_01',
      {
        orderedDates: ['2026-04-02', '2026-04-06'],
        detailsByDate: new Map([
          ['2026-04-02', { rawValue: '11', value: 11, fractionDigits: 0 }],
          ['2026-04-06', { rawValue: '17', value: 17, fractionDigits: 0 }],
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
    getEquipmentReadingTimeline(equipmentId) {
      return mainTimelines.get(equipmentId) || {
        orderedDates: [],
        detailsByDate: new Map(),
      };
    },
    getValidationReadingTimeline(equipmentId) {
      return validationTimelines.get(equipmentId) || {
        orderedDates: [],
        detailsByDate: new Map(),
      };
    },
    getEquipmentReadingDetailOnDate(equipmentId, dateString) {
      return mainTimelines.get(equipmentId)?.detailsByDate?.get(dateString) || null;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentReadingAdjacencySource, context, {
    filename: 'equipment/reading-adjacency.js',
  });
  return context;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test('equipment reading adjacency finds previous and next detail in a timeline', () => {
  const context = createEquipmentReadingAdjacencyContext();
  const timeline = context.getEquipmentReadingTimeline('field_01');

  assert.deepEqual(
    toPlainJson(context.findAdjacentEquipmentReadingDetailInTimeline(timeline, '2026-04-06', -1)),
    {
      dateString: '2026-04-05',
      rawValue: '15.5',
      value: 15.5,
      fractionDigits: 1,
    }
  );
  assert.deepEqual(
    toPlainJson(context.findAdjacentEquipmentReadingDetailInTimeline(timeline, '2026-04-06', 1)),
    {
      dateString: '2026-04-09',
      rawValue: '22',
      value: 22,
      fractionDigits: 0,
    }
  );
});

test('equipment reading adjacency resolves stored and recorded neighbor wrappers', () => {
  const context = createEquipmentReadingAdjacencyContext();

  assert.deepEqual(
    toPlainJson(context.getAdjacentRecordedEquipmentReading('field_01', '2026-04-06', -1)),
    {
      dateString: '2026-04-05',
      value: 15.5,
    }
  );
  assert.deepEqual(
    toPlainJson(context.getAdjacentStoredEquipmentReadingDetail('field_01', '2026-04-06', 1)),
    {
      dateString: '2026-04-09',
      rawValue: '22',
      value: 22,
      fractionDigits: 0,
    }
  );
  assert.equal(context.getAdjacentRecordedEquipmentReading('field_02', '2026-04-03', -1), null);
});

test('equipment reading adjacency uses the validation timeline for validation neighbors', () => {
  const context = createEquipmentReadingAdjacencyContext();

  assert.deepEqual(
    toPlainJson(context.getAdjacentValidationRecordedEquipmentReading('field_01', '2026-04-05', -1)),
    {
      dateString: '2026-04-02',
      rawValue: '11',
      value: 11,
      fractionDigits: 0,
    }
  );
  assert.deepEqual(
    toPlainJson(context.getAdjacentRecordedEquipmentReadingDetail('field_01', '2026-04-04', 1)),
    {
      dateString: '2026-04-05',
      rawValue: '15.5',
      value: 15.5,
      fractionDigits: 1,
    }
  );
});

test('equipment reading adjacency resolves the gas recent usage window from the previous reading', () => {
  const context = createEquipmentReadingAdjacencyContext();

  assert.deepEqual(
    toPlainJson(context.getGasRecentUsageWindow('field_01', '2026-04-09')),
    {
      startDate: '2026-04-05',
      endDate: '2026-04-09',
      startReading: 15.5,
      endReading: 22,
      distributedDates: ['2026-04-09'],
    }
  );
});

test('equipment reading adjacency returns null when current or previous readings are missing', () => {
  const context = createEquipmentReadingAdjacencyContext();

  assert.equal(context.getGasRecentUsageWindow('field_02', '2026-04-03'), null);
  assert.equal(context.getGasRecentUsageWindow('field_01', '2026-04-02'), null);
  assert.equal(context.getGasRecentUsageWindow('missing', '2026-04-09'), null);
});
