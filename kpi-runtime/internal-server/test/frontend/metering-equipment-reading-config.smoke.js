import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentReadingConfigSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/reading-config.js',
    import.meta.url
  ),
  'utf8'
);

function createEquipmentReadingConfigContext() {
  let currentResourceType = 'electric';
  const equipmentById = new Map([
    [
      'field_01',
      {
        id: 'field_01',
        label: '일반 설비',
        factor: '2.5',
        decimalDigits: '2',
        readingAdjustmentValue: '4.5',
        readingAdjustmentStartDate: '2026-04-03',
      },
    ],
    [
      'field_02',
      {
        id: 'field_02',
        label: '기타',
        factor: '9',
        decimalDigits: '3',
        readingAdjustmentValue: '0',
        readingAdjustmentStartDate: '2026-04-01',
      },
    ],
    [
      'field_03',
      {
        id: 'field_03',
        label: '기본 팩터 설비',
        factor: '',
        decimalDigits: '',
        readingAdjustmentValue: '',
        readingAdjustmentStartDate: '',
      },
    ],
  ]);

  const latestRecordedDigits = {
    field_01: 1,
    field_02: 2,
    field_03: 4,
  };

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
    RegExp,
    Promise,
    DEFAULT_USAGE_FACTOR: 1,
    normalizeText(value) {
      return String(value || '').trim();
    },
    parseDateString(value) {
      return new Date(`${value}T00:00:00Z`);
    },
    formatDate(date) {
      if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return '';
      }
      return date.toISOString().slice(0, 10);
    },
    getEquipmentItem(equipmentId) {
      return equipmentById.get(equipmentId) || null;
    },
    isAutoCalculatedEquipment(equipment) {
      return equipment?.label === '기타';
    },
    normalizeUsageFactor(value, fallback = 1) {
      const parsedValue = Number.parseFloat(String(value || '').replace(/,/g, '').trim());
      return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallback;
    },
    getDefaultUsageFactorByLabel(label) {
      return label === '기본 팩터 설비' ? 1.75 : 1;
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    getLatestRecordedEquipmentFractionDigits(equipmentId) {
      return latestRecordedDigits[equipmentId] ?? 0;
    },
    normalizeEquipmentDecimalDigits(value, fallback = null) {
      if (value === '' || value === null || value === undefined) {
        return fallback;
      }
      const parsedValue = Number.parseInt(String(value).trim(), 10);
      if (!Number.isInteger(parsedValue)) {
        return fallback;
      }
      return Math.min(Math.max(parsedValue, 0), 3);
    },
    formatNumber(value) {
      return Number(value).toFixed(2).replace(/\.00$/, '');
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentReadingConfigSource, context, {
    filename: 'equipment/reading-config.js',
  });
  return context;
}

test('equipment reading config normalizes adjustment value and validates start date', () => {
  const context = createEquipmentReadingConfigContext();

  assert.equal(context.normalizeEquipmentReadingAdjustmentValue('1,234.5', 0), 1234.5);
  assert.equal(context.normalizeEquipmentReadingAdjustmentValue('', 7), 7);
  assert.equal(context.normalizeEquipmentReadingAdjustmentStartDate('2026-04-03'), '2026-04-03');
  assert.equal(context.normalizeEquipmentReadingAdjustmentStartDate('2026-02-30'), '');
});

test('equipment reading config resolves reading adjustment object only for valid non-zero values', () => {
  const context = createEquipmentReadingConfigContext();
  const adjustment = context.getEquipmentReadingAdjustment(context.getEquipmentItem('field_01'));

  assert.equal(adjustment?.startDate, '2026-04-03');
  assert.equal(adjustment?.value, 4.5);
  assert.equal(context.getEquipmentReadingAdjustment(context.getEquipmentItem('field_02')), null);
  assert.equal(context.getEquipmentReadingAdjustment(null), null);
});

test('equipment reading config applies adjustment value only on and after start date', () => {
  const context = createEquipmentReadingConfigContext();

  assert.equal(context.getEffectiveEquipmentReadingAdjustmentValue('field_01', '2026-04-02'), 0);
  assert.equal(context.getEffectiveEquipmentReadingAdjustmentValue('field_01', '2026-04-03'), 4.5);
  assert.equal(context.applyEquipmentReadingAdjustment('field_01', 10, '2026-04-04'), 14.5);
});

test('equipment reading config resolves usage factor and decimal digits across rules and resource fallback', () => {
  const context = createEquipmentReadingConfigContext();

  assert.equal(context.getEquipmentUsageFactor('missing'), 1);
  assert.equal(context.getEquipmentUsageFactor('field_02'), 1);
  assert.equal(context.getEquipmentUsageFactor('field_03'), 1.75);
  assert.equal(context.getEquipmentDecimalDigits('field_01'), 2);
  assert.equal(context.getEquipmentDecimalDigits('field_03'), 4);

  context.__setResourceType('gas');
  assert.equal(context.getEquipmentDecimalDigits('field_03'), 0);
});

test('equipment reading config formats usage factor and decimal digit label', () => {
  const context = createEquipmentReadingConfigContext();

  assert.equal(context.formatUsageFactor('2.50'), '2.50');
  assert.equal(context.formatEquipmentDecimalDigitsLabel('field_01'), '소수점 2자리');
});
