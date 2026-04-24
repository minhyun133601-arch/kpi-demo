import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const monthlyUsageCoreSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/monthly-usage-core.js'),
  'utf8'
);

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function getMapValue(map, key) {
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : null;
}

function createMonthlyUsageCoreContext() {
  let gasMode = false;

  const equipmentDailyUsageMap = {
    'total_a|2026-04-01': 12,
    'total_b|2026-04-01': 8,
    'equip_a|2026-04-01': 5,
  };
  const equipmentCalendarDailyUsageMap = {
    'total_a|2026-04-01': 15,
    'total_b|2026-04-01': 10,
    'equip_a|2026-04-01': 2,
  };
  const equipmentMonthlyUsageMap = {
    total_a: 70,
    total_b: 30,
    equip_a: 30,
    equip_b: 20,
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
    Map,
    Set,
    RegExp,
    Promise,
    state: {
      currentMonth: '2026-04',
      store: {
        equipmentEntries: {
          '2026-04-01': {
            dayStatus: 'completed',
          },
        },
      },
    },
    normalizeMonthValue(value) {
      const normalized = String(value ?? '').trim();
      return /^\d{4}-\d{2}$/.test(normalized) ? normalized : '';
    },
    today() {
      return new Date('2026-04-15T00:00:00Z');
    },
    getMonthValue(value) {
      const date = value instanceof Date ? value : new Date(value);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },
    formatDate(value) {
      const date = value instanceof Date ? value : new Date(value);
      return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0'),
      ].join('-');
    },
    getNextDateString(dateString) {
      const date = new Date(`${dateString}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      return date.toISOString().slice(0, 10);
    },
    calculateEquipmentDailyUsage(equipmentId, dateString) {
      return {
        value: getMapValue(equipmentDailyUsageMap, `${equipmentId}|${dateString}`),
      };
    },
    calculateEquipmentCalendarDailyUsage(equipmentId, dateString) {
      return {
        value: getMapValue(equipmentCalendarDailyUsageMap, `${equipmentId}|${dateString}`),
      };
    },
    calculateEquipmentMonthlyUsage(equipmentId) {
      return {
        value: getMapValue(equipmentMonthlyUsageMap, equipmentId),
      };
    },
    getDefaultCalendarTrackedEquipmentIds() {
      return ['total_a', 'total_b'];
    },
    getEquipmentSummaryIds() {
      return ['equip_a'];
    },
    calculateTotalPowerMonthlyUsage() {
      return 100;
    },
    getResolvedEntryDayStatus(entry) {
      return entry?.dayStatus || '';
    },
    isGasResourceType() {
      return gasMode;
    },
    __setGasMode(nextGasMode) {
      gasMode = Boolean(nextGasMode);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(monthlyUsageCoreSource, context, {
    filename: 'runtime/monthly-usage-core.js',
  });
  return context;
}

test('runtime monthly usage core resolves usage periods and month date ranges', () => {
  const context = createMonthlyUsageCoreContext();

  assert.deepEqual(toPlainValue(context.getTeamUsagePeriod('2026-04')), {
    startDate: '2026-04-01',
    endDate: '2026-04-15',
    isCurrentMonth: true,
  });
  assert.deepEqual(toPlainValue(context.getTeamUsagePeriod('2026-03')), {
    startDate: '2026-03-01',
    endDate: '2026-04-01',
    isCurrentMonth: false,
  });
  assert.equal(context.getTeamUsagePeriodText(), '');
  assert.equal(context.hasUsageAllocatedDayStatus('2026-04-01'), true);
  assert.equal(context.hasUsageAllocatedDayStatus('2026-04-02'), false);
  assert.equal(context.shouldExcludeEquipmentUsageOnDate('field_01', '2026-04-01'), false);
  assert.equal(context.getMonthDateStrings('2026-04').length, 30);
  assert.deepEqual(toPlainValue(context.getMonthDateStrings('2026-04').slice(0, 3)), [
    '2026-04-01',
    '2026-04-02',
    '2026-04-03',
  ]);
});

test('runtime monthly usage core aggregates equipment and other-usage values', () => {
  const context = createMonthlyUsageCoreContext();

  assert.deepEqual(
    toPlainValue(
      context.calculateMonthlyUsageFromDailyResolver((dateString) => {
        if (dateString === '2026-04-01') {
          return {
            value: 4,
            difference: 4,
            startDate: '2026-04-01',
            endDate: '2026-04-02',
          };
        }
        if (dateString === '2026-04-03') {
          return {
            value: 6,
            difference: 3,
            startDate: '2026-04-03',
            endDate: '2026-04-04',
          };
        }
        return {
          value: null,
          difference: null,
        };
      })
    ),
    {
      value: 10,
      difference: 7,
      startDate: '2026-04-01',
      endDate: '2026-04-04',
      startReading: null,
      endReading: null,
      daysCount: 2,
    }
  );

  assert.equal(context.calculateEquipmentGroupDailyUsage(['total_a', 'total_b'], '2026-04-01'), 20);
  assert.equal(
    context.calculateEquipmentGroupCalendarDailyUsage(['total_a', 'total_b'], '2026-04-01'),
    25
  );
  assert.equal(context.calculateEquipmentGroupMonthlyUsage(['equip_a', 'equip_b']), 50);
  assert.equal(context.calculateOtherDailyUsage('2026-04-01'), 15);
  assert.equal(context.calculateOtherCalendarDailyUsage('2026-04-01'), 23);
  assert.equal(context.calculateOtherMonthlyUsage(), 70);
  assert.deepEqual(toPlainValue(context.createOtherDailyUsageResult('2026-04-01')), {
    value: 15,
    difference: 15,
    factor: 1,
    startDate: '2026-04-01',
    endDate: '2026-04-02',
    startReading: null,
    endReading: null,
  });

  context.__setGasMode(true);
  assert.equal(context.calculateOtherDailyUsage('2026-04-01'), null);
  assert.equal(context.calculateOtherCalendarDailyUsage('2026-04-01'), null);
  assert.equal(context.calculateOtherMonthlyUsage(), null);
});
