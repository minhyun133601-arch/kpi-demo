import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const totalPowerCardSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/total-power-card.js',
    import.meta.url
  ),
  'utf8'
);

function createTotalPowerContext() {
  const equipmentUsageMap = {
    eq_1: 20,
    eq_2: 30,
  };

  const activeSelectionIds = new Set(['sel_1']);

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
    TOTAL_POWER_TEAM_KEY: 'total_power',
    TEAM_01_01_KEY: 'team_01_01',
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_compressor',
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
    },
    state: {
      currentMonth: '2026-04',
    },
    TOTAL_POWER_CARD_PREFERRED_LABEL_ORDER_MAP: {
      dryer: 1,
      boiler: 2,
    },
    normalizeEquipmentFactorLabel(value) {
      return String(value || '').trim().toLowerCase();
    },
    isElectricResourceType() {
      return true;
    },
    getTeamAssignedChipDescriptors() {
      return [
        {
          id: 'eq_1',
          selectionId: 'sel_1',
          label: 'dryer',
        },
        {
          id: 'eq_2',
          selectionId: 'sel_2',
          label: 'boiler',
        },
      ];
    },
    calculateTotalPowerMonthlyUsageWindow() {
      return {
        value: 50,
      };
    },
    getBillingSettlementEntry() {
      return {
        fields: {
          electricityChargeTotal: 80,
        },
      };
    },
    resolveBillingSettlementElectricityChargeTotalValue(fields = {}) {
      return Number(fields.electricityChargeTotal);
    },
    getBillingSettlementBaseCharge() {
      return 20;
    },
    sumFiniteValues(values = []) {
      const finiteValues = values.filter((value) => Number.isFinite(value));
      return finiteValues.reduce((sum, value) => sum + value, 0);
    },
    calculateUsageShare(usage, totalUsage) {
      if (!Number.isFinite(usage) || !Number.isFinite(totalUsage) || totalUsage === 0) {
        return null;
      }

      return usage / totalUsage;
    },
    formatSettlementAmount(value) {
      return `amt:${Math.round(Number(value) || 0)}`;
    },
    getPlantBTotalCardAmountValue() {
      return 30;
    },
    getElectricOtherCostDescriptors() {
      return [{ selectionId: 'other_1', value: 5 }];
    },
    calculateElectricOtherCostAmount() {
      return 5;
    },
    isTeamCalendarSelectionActive(_teamKey, selectionId) {
      return activeSelectionIds.has(selectionId);
    },
    getDirectTeamMonthlyUsage(teamKey) {
      if (teamKey === 'team_01_01') {
        return 12;
      }

      return null;
    },
    calculateDisplayedEquipmentMonthlyUsage(equipmentId) {
      return {
        value: equipmentUsageMap[equipmentId] ?? null,
      };
    },
    formatUsageShare(value) {
      return `share:${Math.round(Number(value) * 100)}%`;
    },
    formatWholeNumber(value) {
      return `whole:${Math.round(Number(value) || 0)}`;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(totalPowerCardSource, context, {
    filename: 'team-overview/total-power-card.js',
  });
  return context;
}

test('team overview total power sorts chip descriptors by preferred label order', () => {
  const context = createTotalPowerContext();

  const sorted = context.sortTotalPowerCardChipDescriptors([
    { label: 'boiler' },
    { label: 'dryer' },
    { label: 'unknown' },
  ]);

  assert.deepEqual(sorted.map((item) => item.label), ['dryer', 'boiler', 'unknown']);
});

test('team overview total power prorates selection-only amount from usage share', () => {
  const context = createTotalPowerContext();

  assert.equal(context.getTotalPowerCardMonthlyUsage('2026-04'), 50);
  assert.equal(context.getTotalPowerCardMonthlyUsage('2026-04', { selectionOnly: true }), 20);
  assert.equal(context.getTotalPowerCardAmountValue('2026-04', { selectionOnly: true }), 40);
  assert.equal(
    context.getTotalPowerCardAmountText('2026-04', { selectionOnly: true }),
    '금액 amt:40'
  );
});

test('team overview total power builds overall electric amount text and detail', () => {
  const context = createTotalPowerContext();

  assert.equal(context.getElectricTeamModeOverallAmountValue('2026-04'), 135);
  assert.equal(context.getElectricTeamModeOverallAmountText('2026-04'), '총액 amt:135');
  assert.equal(
    context.getElectricTeamModeOverallAmountDetailText('2026-04'),
    'Plant B amt:30\nPlant A amt:100\n그 외 비용 amt:5\n합계 amt:135'
  );
});

test('team overview total power builds descriptor share, charge, and detail text', () => {
  const context = createTotalPowerContext();
  const descriptor = {
    id: 'eq_1',
    selectionId: 'sel_1',
    label: 'dryer',
  };

  assert.equal(
    context.getTotalPowerCardDescriptorShareText(descriptor, '2026-04', { selectionOnly: true }),
    '전력총량 share:40%'
  );
  assert.equal(
    context.getTotalPowerCardDescriptorChargeText(descriptor, '2026-04', { selectionOnly: true }),
    '금액 amt:40'
  );
  assert.equal(
    context.getTotalPowerCardDescriptorDetailText(descriptor, '2026-04', { selectionOnly: true }),
    '전력총량 whole:50 중 whole:20 = share:40%\n전기요금계+기본요금 amt:100 x share:40% = amt:40'
  );
});
