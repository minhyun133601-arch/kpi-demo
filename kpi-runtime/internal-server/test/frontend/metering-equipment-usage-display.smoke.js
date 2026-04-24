import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const usageDisplaySource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/usage-display.js',
    import.meta.url
  ),
  'utf8'
);

function createUsageDisplayContext() {
  const equipmentItems = new Map([
    ['electric_01', { id: 'electric_01', kind: 'meter' }],
    ['excluded_01', { id: 'excluded_01', kind: 'meter' }],
    ['other_01', { id: 'other_01', kind: 'other' }],
    ['gas_01', { id: 'gas_01', kind: 'meter' }],
    ['no_data_01', { id: 'no_data_01', kind: 'meter' }],
    ['reactive_summary', { id: 'reactive_summary', kind: 'summary' }],
  ]);

  let currentResourceType = 'electric';
  let billingCompleted = true;

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
    },
    calculateEquipmentDailyUsageBase(equipmentId) {
      if (equipmentId !== 'electric_01') {
        return {
          value: null,
          difference: null,
          factor: 1,
          startDate: '',
          endDate: '',
          startReading: null,
          endReading: null,
        };
      }

      return {
        value: 10,
        difference: 5,
        factor: 2,
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        startReading: 10,
        endReading: 15,
      };
    },
    calculateEquipmentCalendarDailyUsageBase(equipmentId) {
      if (equipmentId !== 'electric_01') {
        return {
          value: null,
          difference: null,
          factor: 1,
          startDate: '',
          endDate: '',
          startReading: null,
          endReading: null,
        };
      }

      return {
        value: 12,
        difference: 6,
        factor: 2,
        startDate: '2026-04-01',
        endDate: '2026-04-02',
        startReading: 20,
        endReading: 26,
      };
    },
    calculateEquipmentMonthlyUsageBase(equipmentId, options = {}) {
      if (equipmentId === 'excluded_01') {
        if (!options.includeExcludedUsage) {
          return {
            value: null,
            difference: null,
            factor: 1,
            startDate: '2026-04-01',
            endDate: '2026-05-01',
            startReading: null,
            endReading: null,
            daysCount: 0,
          };
        }

        return {
          value: 15,
          difference: 15,
          factor: 1,
          startDate: '2026-04-01',
          endDate: '2026-05-01',
          startReading: 0,
          endReading: 15,
          daysCount: 1,
        };
      }

      if (equipmentId === 'electric_01') {
        return {
          value: 20,
          difference: 10,
          factor: 2,
          startDate: '2026-04-01',
          endDate: '2026-05-01',
          startReading: 100,
          endReading: 110,
          daysCount: 2,
        };
      }

      if (equipmentId === 'other_01') {
        return {
          value: 30,
          difference: 30,
          factor: 1,
          startDate: '2026-04-01',
          endDate: '2026-05-01',
          startReading: null,
          endReading: null,
          daysCount: 1,
        };
      }

      if (equipmentId === 'gas_01') {
        return {
          value: 40,
          difference: 40,
          factor: 1,
          startDate: '2026-04-01',
          endDate: '2026-05-01',
          startReading: 10,
          endReading: 50,
          daysCount: 1,
        };
      }

      return {
        value: null,
        difference: null,
        factor: 1,
        startDate: '2026-04-01',
        endDate: '2026-05-01',
        startReading: null,
        endReading: null,
        daysCount: 0,
      };
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isGasCorrectionTargetEquipment(equipmentId) {
      return equipmentId === 'electric_01';
    },
    calculateGasCorrectionFactorForMonth() {
      return 1.5;
    },
    getEquipmentItem(equipmentId) {
      return equipmentItems.get(equipmentId) || null;
    },
    isUsageCalculationExcludedEquipment(equipment) {
      return equipment?.id === 'excluded_01';
    },
    isOtherEquipment(equipment) {
      return equipment?.kind === 'other';
    },
    calculateTotalPowerMonthlyUsage() {
      return 100;
    },
    calculateEquipmentGroupMonthlyUsage(equipmentIds) {
      const key = JSON.stringify(equipmentIds);
      if (key === JSON.stringify(['summary_group'])) {
        return 70;
      }
      if (key === JSON.stringify(['calendar_group'])) {
        return 90;
      }
      return null;
    },
    getEquipmentSummaryIds() {
      return ['summary_group'];
    },
    calculateOtherMonthlyUsage() {
      return 30;
    },
    getDefaultCalendarTrackedEquipmentIds() {
      return ['calendar_group'];
    },
    formatWholeNumber(value) {
      return String(Math.round(value));
    },
    formatShortDate(value) {
      return value;
    },
    formatNumber(value) {
      if (!Number.isFinite(value)) {
        return '';
      }
      if (Number.isInteger(value)) {
        return String(value);
      }
      return String(value);
    },
    getGasMonthlyBoundaryOverrideDetailText(equipmentId) {
      return equipmentId === 'gas_01' ? '경계보정 detail' : '';
    },
    isEquipmentUsageShareTarget(equipment) {
      return equipment?.id !== 'reactive_summary';
    },
    calculateTotalPowerMonthlyUsageWindow() {
      return { value: 50 };
    },
    getBillingSettlementBaseCharge() {
      return 100;
    },
    calculateUsageShare(usage, totalUsage) {
      if (!Number.isFinite(usage) || !Number.isFinite(totalUsage) || totalUsage <= 0) {
        return null;
      }
      return usage / totalUsage;
    },
    getBillingSettlementUnitPrice() {
      return 3;
    },
    isBillingSettlementCompleted() {
      return billingCompleted;
    },
    isReactiveSummaryEquipment(equipment) {
      return equipment?.id === 'reactive_summary';
    },
    isReactivePowerEquipment() {
      return false;
    },
    formatUsageShare(value) {
      return `${(value * 100).toFixed(1)}%`;
    },
    __setResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
    __setBillingCompleted(nextValue) {
      billingCompleted = Boolean(nextValue);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(usageDisplaySource, context, {
    filename: 'metering-equipment-usage-display.js',
  });
  return context;
}

test('usage-display applies gas correction wrappers for equipment usage', () => {
  const context = createUsageDisplayContext();

  const dailyUsage = context.calculateEquipmentDailyUsage('electric_01', '2026-04-01');
  const calendarDailyUsage = context.calculateEquipmentCalendarDailyUsage('electric_01', '2026-04-01');
  const monthlyUsage = context.calculateEquipmentMonthlyUsage('electric_01');

  assert.equal(dailyUsage.value, 7.5);
  assert.equal(dailyUsage.difference, 5);
  assert.equal(dailyUsage.factor, 1.5);
  assert.equal(dailyUsage.gasCorrectionFactor, 1.5);

  assert.equal(calendarDailyUsage.value, 9);
  assert.equal(calendarDailyUsage.difference, 6);
  assert.equal(calendarDailyUsage.factor, 1.5);

  assert.equal(monthlyUsage.value, 15);
  assert.equal(monthlyUsage.difference, 10);
  assert.equal(monthlyUsage.factor, 1.5);
});

test('usage-display keeps excluded usage visible and formats empty usage safely', () => {
  const context = createUsageDisplayContext();

  assert.equal(context.calculateDisplayedEquipmentMonthlyUsage('excluded_01').value, 15);
  assert.equal(context.formatEquipmentUsage('excluded_01'), '15');
  assert.equal(context.formatEquipmentUsage('no_data_01'), '-');
});

test('usage-display renders other and gas usage detail text', () => {
  const context = createUsageDisplayContext();

  const otherDetailText = context.getEquipmentUsageDetailText('other_01');
  assert.match(otherDetailText, /전력총량 월 합계 100/);
  assert.match(otherDetailText, /기타 30/);
  assert.match(otherDetailText, /최종 금액 150/);

  context.__setResourceType('gas');
  const gasDetailText = context.getEquipmentUsageDetailText('gas_01');
  assert.match(gasDetailText, /2026-04-01 ~ 2026-05-01/);
  assert.match(gasDetailText, /일별 차이 합계 40 = 40/);
  assert.match(gasDetailText, /경계보정 detail/);
});

test('usage-display returns the missing-reading message when monthly usage is unavailable', () => {
  const context = createUsageDisplayContext();

  assert.equal(
    context.getEquipmentUsageDetailText('no_data_01'),
    '해당 월의 일별 차이를 계산할 검침값이 부족합니다.'
  );
});

test('usage-display calculates settlement charges and hides details when billing is incomplete', () => {
  const context = createUsageDisplayContext();

  assert.equal(context.calculateEquipmentBaseChargeAllocation('electric_01'), 30);
  assert.equal(context.calculateEquipmentVariableCharge('electric_01'), 45);
  assert.equal(context.calculateEquipmentUsageCharge('electric_01'), 75);
  assert.equal(context.getEquipmentUsageChargeText('electric_01'), '금액 75');
  assert.match(
    context.getEquipmentUsageChargeDetailText('electric_01'),
    /사용량요금 15 x 단가 3 = 45/
  );
  assert.match(
    context.getEquipmentUsageChargeDetailText('electric_01'),
    /기본요금 배분 30.0% x 100 = 30/
  );
  assert.match(
    context.getEquipmentUsageChargeDetailText('electric_01'),
    /최종 금액 75/
  );
  assert.equal(context.calculateEquipmentUsageCharge('reactive_summary'), null);

  context.__setBillingCompleted(false);
  assert.equal(context.getEquipmentUsageChargeDetailText('electric_01'), '');
});
