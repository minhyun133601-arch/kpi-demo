import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const usageCalculationSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/usage-calculation.js',
    import.meta.url
  ),
  'utf8'
);

function shiftDate(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function createUsageCalculationContext() {
  const equipmentItems = new Map([
    ['electric_01', { id: 'electric_01', kind: 'meter' }],
    ['excluded_01', { id: 'excluded_01', kind: 'meter' }],
    ['other_01', { id: 'other_01', kind: 'other' }],
    ['gas_total', { id: 'gas_total', kind: 'meter' }],
    ['gas_source_1', { id: 'gas_source_1', kind: 'meter' }],
    ['gas_source_2', { id: 'gas_source_2', kind: 'meter' }],
  ]);

  const distributedWindows = new Map([
    [
      'electric_01:2026-04-01',
      {
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        startReading: 10,
        endReading: 18,
        distributedDates: ['2026-04-01', '2026-04-02'],
      },
    ],
    [
      'electric_01:2026-04-02',
      {
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        startReading: 10,
        endReading: 18,
        distributedDates: ['2026-04-01', '2026-04-02'],
      },
    ],
    [
      'excluded_01:2026-04-01',
      {
        startDate: '2026-04-01',
        endDate: '2026-04-03',
        startReading: 20,
        endReading: 26,
        distributedDates: ['2026-04-01', '2026-04-02'],
      },
    ],
  ]);

  const gasRecentWindows = new Map([
    [
      'gas_total:2026-04-10',
      {
        startDate: '2026-04-09',
        endDate: '2026-04-10',
        startReading: 100,
        endReading: 150,
        distributedDates: ['2026-04-10'],
      },
    ],
    [
      'gas_source_1:2026-04-10',
      {
        startDate: '2026-04-09',
        endDate: '2026-04-10',
        startReading: 50,
        endReading: 80,
        distributedDates: ['2026-04-10'],
      },
    ],
    [
      'gas_source_2:2026-04-10',
      {
        startDate: '2026-04-09',
        endDate: '2026-04-10',
        startReading: 40,
        endReading: 60,
        distributedDates: ['2026-04-10'],
      },
    ],
  ]);

  const gasMonthlyBoundaryWindows = new Map([
    [
      'gas_total:2026-04',
      {
        startDate: '2026-04-01',
        endDate: '2026-05-01',
        startReading: 200,
        endReading: 260,
      },
    ],
    [
      'gas_source_1:2026-04',
      {
        startDate: '2026-04-01',
        endDate: '2026-05-01',
        startReading: 70,
        endReading: 100,
      },
    ],
    [
      'gas_source_2:2026-04',
      {
        startDate: '2026-04-01',
        endDate: '2026-05-01',
        startReading: 10,
        endReading: 30,
      },
    ],
  ]);

  let currentResourceType = 'electric';
  const excludedDates = new Set();

  function calculateMonthlyUsageFromDailyResolver(resolveUsage, monthValue = '2026-04') {
    const monthDates = {
      '2026-04': ['2026-04-01', '2026-04-02'],
    };
    const dates = monthDates[monthValue] || [];
    let totalValue = 0;
    let totalDifference = 0;
    let startDate = '';
    let endDate = '';
    let daysCount = 0;

    dates.forEach((dateString) => {
      const usage = resolveUsage(dateString);
      if (!Number.isFinite(usage?.value) || !Number.isFinite(usage?.difference)) {
        return;
      }

      totalValue += usage.value;
      totalDifference += usage.difference;
      startDate ||= usage.startDate || dateString;
      endDate = usage.endDate || shiftDate(dateString, 1);
      daysCount += 1;
    });

    return {
      value: daysCount ? totalValue : null,
      difference: daysCount ? totalDifference : null,
      startDate,
      endDate,
      startReading: null,
      endReading: null,
      daysCount,
    };
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
    GAS_TOTAL_USAGE_EQUIPMENT_ID: 'gas_total',
    GAS_CORRECTION_SOURCE_IDS: ['gas_source_1', 'gas_source_2'],
    getEquipmentUsageFactor(equipmentId) {
      return equipmentId === 'electric_01' ? 2 : 1.5;
    },
    getEquipmentItem(equipmentId) {
      return equipmentItems.get(equipmentId) || null;
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isOtherEquipment(equipment) {
      return equipment?.kind === 'other';
    },
    createOtherDailyUsageResult(dateString) {
      return {
        value: 7,
        difference: 7,
        factor: 1,
        startDate: dateString,
        endDate: shiftDate(dateString, 1),
        startReading: null,
        endReading: null,
      };
    },
    createOtherCalendarDailyUsageResult(dateString) {
      return {
        value: 11,
        difference: 11,
        factor: 1,
        startDate: dateString,
        endDate: shiftDate(dateString, 1),
        startReading: null,
        endReading: null,
      };
    },
    getGasRecentUsageWindow(equipmentId, dateString) {
      return gasRecentWindows.get(`${equipmentId}:${dateString}`) || null;
    },
    getEquipmentDistributedUsageWindow(equipmentId, dateString) {
      return distributedWindows.get(`${equipmentId}:${dateString}`) || null;
    },
    getNextDateString(dateString) {
      return shiftDate(dateString, 1);
    },
    isUsageCalculationExcludedEquipment(equipment) {
      return equipment?.id === 'excluded_01';
    },
    shouldExcludeEquipmentUsageOnDate(equipmentId, dateString) {
      return excludedDates.has(`${equipmentId}:${dateString}`);
    },
    getTeamUsagePeriod(monthValue) {
      return monthValue === '2026-04'
        ? {
            startDate: '2026-04-01',
            endDate: '2026-05-01',
          }
        : null;
    },
    calculateMonthlyUsageFromDailyResolver,
    calculateOtherMonthlyUsage() {
      return 30;
    },
    getGasMonthlyBoundaryUsageWindow(equipmentId, monthValue) {
      return gasMonthlyBoundaryWindows.get(`${equipmentId}:${monthValue}`) || null;
    },
    normalizeMonthValue(value) {
      const normalizedValue = String(value || '').trim();
      return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
    },
    __setResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
    __setExcludedUsageDate(equipmentId, dateString, enabled = true) {
      const key = `${equipmentId}:${dateString}`;
      if (enabled) {
        excludedDates.add(key);
        return;
      }
      excludedDates.delete(key);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(usageCalculationSource, context, {
    filename: 'equipment/usage-calculation.js',
  });
  return context;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

test('usage calculation resolves usage factor from override or resource type', () => {
  const context = createUsageCalculationContext();

  assert.equal(context.getResolvedEquipmentUsageFactor('electric_01'), 2);
  assert.equal(context.getResolvedEquipmentUsageFactor('electric_01', 4), 4);
  context.__setResourceType('gas');
  assert.equal(context.getResolvedEquipmentUsageFactor('electric_01'), 1);
});

test('usage calculation resolves electric daily usage and excluded branches', () => {
  const context = createUsageCalculationContext();

  assert.deepEqual(
    toPlainJson(context.calculateEquipmentDailyUsageBase('electric_01', '2026-04-01')),
    {
      value: 8,
      difference: 4,
      factor: 2,
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      startReading: 10,
      endReading: 18,
    }
  );
  assert.equal(
    context.calculateEquipmentDailyUsageBase('excluded_01', '2026-04-01').value,
    null
  );
  assert.equal(
    context.calculateEquipmentDailyUsageBase('excluded_01', '2026-04-01', { includeExcludedUsage: true }).value,
    4.5
  );
  context.__setExcludedUsageDate('electric_01', '2026-04-02', true);
  assert.equal(context.calculateEquipmentDailyUsageBase('electric_01', '2026-04-02').value, null);
});

test('usage calculation resolves calendar daily usage and other-equipment branch', () => {
  const context = createUsageCalculationContext();

  assert.deepEqual(
    toPlainJson(context.calculateEquipmentCalendarDailyUsageBase('electric_01', '2026-04-01')),
    {
      value: 16,
      difference: 8,
      factor: 2,
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      startReading: 10,
      endReading: 18,
    }
  );
  assert.deepEqual(
    toPlainJson(context.calculateEquipmentCalendarDailyUsageBase('other_01', '2026-04-01')),
    {
      value: 11,
      difference: 11,
      factor: 1,
      startDate: '2026-04-01',
      endDate: '2026-04-02',
      startReading: null,
      endReading: null,
    }
  );
});

test('usage calculation resolves gas correction factor for daily and calendar modes', () => {
  const context = createUsageCalculationContext();
  context.__setResourceType('gas');

  assert.equal(context.calculateGasCorrectionFactorForDate('2026-04-10'), 1);
  assert.equal(
    context.calculateGasCorrectionFactorForDate('2026-04-10', { calendarMode: true }),
    1
  );
  context.__setResourceType('electric');
  assert.equal(context.calculateGasCorrectionFactorForDate('2026-04-10'), null);
});

test('usage calculation resolves monthly usage base and monthly gas correction factor', () => {
  const context = createUsageCalculationContext();

  assert.deepEqual(
    toPlainJson(context.calculateEquipmentMonthlyUsageBase('electric_01', { monthValue: '2026-04' })),
    {
      value: 16,
      difference: 8,
      factor: 2,
      startDate: '2026-04-01',
      endDate: '2026-04-03',
      startReading: null,
      endReading: null,
      daysCount: 2,
    }
  );

  context.__setResourceType('gas');
  assert.deepEqual(
    toPlainJson(context.calculateEquipmentMonthlyUsageBase('gas_total', { monthValue: '2026-04' })),
    {
      value: 60,
      difference: 60,
      factor: 1,
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      startReading: 200,
      endReading: 260,
      daysCount: 1,
    }
  );
  assert.equal(context.calculateGasCorrectionFactorForMonth('2026-04'), 1.2);
});
