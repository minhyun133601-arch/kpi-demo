import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const gasBoundaryReadingSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/gas-boundary-reading.js',
    import.meta.url
  ),
  'utf8'
);

function createGasBoundaryReadingContext() {
  const equipmentTimelines = new Map([
    [
      'field_01',
      {
        orderedDates: ['2026-04-01', '2026-04-10', '2026-05-01', '2026-05-15'],
        detailsByDate: new Map([
          ['2026-04-01', { rawValue: 90, value: 95, fractionDigits: 0 }],
          ['2026-04-10', { rawValue: 120, value: 125, fractionDigits: 0 }],
          ['2026-05-01', { rawValue: 170, value: 172, fractionDigits: 0 }],
          ['2026-05-15', { rawValue: 210, value: 212, fractionDigits: 0 }],
        ]),
      },
    ],
    [
      'field_02',
      {
        orderedDates: ['2026-04-02', '2026-05-02'],
        detailsByDate: new Map([
          ['2026-04-02', { rawValue: 40, value: 40, fractionDigits: 0 }],
          ['2026-05-02', { rawValue: 80, value: 80, fractionDigits: 0 }],
        ]),
      },
    ],
    [
      'field_missing_end',
      {
        orderedDates: ['2026-04-03'],
        detailsByDate: new Map([
          ['2026-04-03', { rawValue: 12, value: 12, fractionDigits: 0 }],
        ]),
      },
    ],
  ]);

  const readingAdjustments = new Map([
    ['field_01:2026-04-01', 5],
    ['field_01:2026-05-01', 2],
  ]);

  let currentResourceType = 'gas';

  function normalizeMonthValue(value) {
    const normalizedValue = String(value || '').trim();
    return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
  }

  function shiftMonthValue(monthValue, offset) {
    const normalizedMonth = normalizeMonthValue(monthValue);
    if (!normalizedMonth || !Number.isInteger(offset)) {
      return '';
    }

    const [yearText, monthText] = normalizedMonth.split('-');
    const date = new Date(Date.UTC(Number(yearText), Number(monthText) - 1 + offset, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }

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
    state: {
      currentMonth: '2026-04',
    },
    GAS_MONTHLY_BOUNDARY_READING_OVERRIDES: {
      '2026-04': {
        field_01: {
          startReading: 100,
          endReading: 180,
        },
        field_02: {
          endReading: 85,
        },
      },
    },
    normalizeMonthValue,
    shiftMonthValue,
    getEquipmentReadingTimeline(equipmentId) {
      return equipmentTimelines.get(equipmentId) || {
        orderedDates: [],
        detailsByDate: new Map(),
      };
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    countPlainObjectKeys(value) {
      return value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).length : 0;
    },
    getEffectiveEquipmentReadingAdjustmentValue(equipmentId, dateString) {
      return readingAdjustments.get(`${equipmentId}:${dateString}`) ?? 0;
    },
    formatShortDate(dateString) {
      return String(dateString || '').slice(5);
    },
    formatWholeNumber(value) {
      return String(Math.round(Number(value)));
    },
    __setResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(gasBoundaryReadingSource, context, {
    filename: 'equipment/gas-boundary-reading.js',
  });
  return context;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test('gas boundary reading returns the first recorded detail within a month', () => {
  const context = createGasBoundaryReadingContext();

  assert.deepEqual(
    toPlainJson(context.getFirstRecordedEquipmentReadingDetailInMonth('field_01', '2026-04')),
    {
      dateString: '2026-04-01',
      rawValue: 90,
      value: 95,
      fractionDigits: 0,
    }
  );
  assert.equal(context.getFirstRecordedEquipmentReadingDetailInMonth('field_01', 'bad-month'), null);
  assert.equal(context.getFirstRecordedEquipmentReadingDetailInMonth('missing', '2026-04'), null);
});

test('gas boundary reading detects monthly override presence only for gas months with config', () => {
  const context = createGasBoundaryReadingContext();

  assert.equal(context.hasGasMonthlyBoundaryReadingOverrideForMonth('2026-04'), true);
  assert.equal(context.hasGasMonthlyBoundaryReadingOverrideForMonth('2026-05'), false);
  context.__setResourceType('electric');
  assert.equal(context.hasGasMonthlyBoundaryReadingOverrideForMonth('2026-04'), false);
});

test('gas boundary reading resolves override display meta with stored and adjusted readings', () => {
  const context = createGasBoundaryReadingContext();

  assert.deepEqual(
    toPlainJson(context.getGasMonthlyBoundaryOverrideDisplayMeta('field_01', '2026-04')),
    {
      monthValue: '2026-04',
      equipmentId: 'field_01',
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      hasStartOverride: true,
      hasEndOverride: true,
      startAdjustmentValue: 5,
      endAdjustmentValue: 2,
      storedStartRawReading: 90,
      storedStartAdjustedReading: 95,
      storedEndRawReading: 170,
      storedEndAdjustedReading: 172,
      overrideStartAdjustedReading: 100,
      overrideEndAdjustedReading: 180,
      overrideStartRawReading: 95,
      overrideEndRawReading: 178,
    }
  );
  assert.equal(context.getGasMonthlyBoundaryOverrideDisplayMeta('field_missing_end', '2026-04'), null);
});

test('gas boundary reading builds detail and badge text from override meta', () => {
  const context = createGasBoundaryReadingContext();

  const detailText = context.getGasMonthlyBoundaryOverrideDetailText('field_01', '2026-04');
  assert.match(detailText, /04-01/);
  assert.match(detailText, /95/);
  assert.match(detailText, /90/);
  assert.match(detailText, /178/);
  assert.match(detailText, /170/);
  assert.match(detailText, /2026-04/);

  const badgeText = context.getGasMonthlyBoundaryOverrideBadgeText('field_02', '2026-04');
  assert.match(badgeText, /85/);
  assert.match(badgeText, /80/);
});

test('gas boundary reading resolves monthly usage windows with boundary overrides', () => {
  const context = createGasBoundaryReadingContext();

  assert.deepEqual(
    toPlainJson(context.getGasMonthlyBoundaryUsageWindow('field_01', '2026-04')),
    {
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      startReading: 100,
      endReading: 180,
    }
  );
  assert.deepEqual(
    toPlainJson(context.getGasMonthlyBoundaryUsageWindow('field_02', '2026-04')),
    {
      startDate: '2026-04-02',
      endDate: '2026-05-02',
      startReading: 40,
      endReading: 85,
    }
  );
  context.__setResourceType('electric');
  assert.equal(context.getGasMonthlyBoundaryUsageWindow('field_01', '2026-04'), null);
});
