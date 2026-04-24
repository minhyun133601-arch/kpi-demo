import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const chargeSupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/charge-support.js',
    import.meta.url
  ),
  'utf8'
);

function createChargeSupportContext() {
  let currentResourceType = 'electric';
  let billingCompleted = true;

  const assignedByTeam = {
    team_04: ['shared_a', 'plain_a'],
    team_05: ['shared_a', 'shared_b', 'plain_b'],
    team_06: ['plain_c'],
  };

  const calendarSelectionByTeam = {
    team_04: ['plain_a', 'shared_compressor'],
    team_05: ['plain_b'],
    team_06: ['plain_c'],
  };

  const monthlyUsageByEquipment = {
    shared_a: 10,
    shared_b: 30,
    plain_a: 5,
    plain_b: 8,
    plain_c: 11,
  };

  const variableChargeByEquipment = {
    shared_a: 100,
    shared_b: 300,
    plain_a: 50,
    plain_b: 80,
    plain_c: 110,
  };

  const baseChargeByEquipment = {
    shared_a: 40,
    shared_b: 160,
    plain_a: 20,
    plain_b: 35,
    plain_c: 45,
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
    },
    SHARED_COMPRESSOR_SETTLEMENT_START_MONTH: '2026-04',
    SHARED_COMPRESSOR_SETTLEMENT_RATIOS: {
      team_04: 0.25,
      team_05: 0.75,
    },
    SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM: {
      team_04: ['shared_a'],
      team_05: ['shared_a', 'shared_b'],
    },
    SHARED_COMPRESSOR_SETTLEMENT_SOURCE_ID_SET: new Set(['shared_a', 'shared_b']),
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_compressor',
    getTeamCalendarSelection(teamKey) {
      return [...(calendarSelectionByTeam[teamKey] || [])];
    },
    getTeamAssignedEquipmentIds(teamKey) {
      return [...(assignedByTeam[teamKey] || [])];
    },
    normalizeMonthValue(value) {
      const normalizedValue = String(value || '').trim();
      return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
    },
    compareMonthValues(left, right) {
      return String(left || '').localeCompare(String(right || ''));
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isSharedCompressorVirtualEquipmentId(equipmentId) {
      return equipmentId === 'shared_compressor';
    },
    sumFiniteValues(values) {
      const numericValues = values.filter((value) => Number.isFinite(value));
      if (!numericValues.length) {
        return null;
      }

      return numericValues.reduce((sum, value) => sum + value, 0);
    },
    calculateEquipmentMonthlyUsage(equipmentId) {
      const value = monthlyUsageByEquipment[equipmentId];
      return {
        value: Number.isFinite(value) ? value : null,
      };
    },
    calculateEquipmentVariableCharge(equipmentId) {
      const value = variableChargeByEquipment[equipmentId];
      return Number.isFinite(value) ? value : null;
    },
    calculateEquipmentBaseChargeAllocation(equipmentId) {
      const value = baseChargeByEquipment[equipmentId];
      return Number.isFinite(value) ? value : null;
    },
    formatSettlementAmount(value) {
      return String(Math.round(value));
    },
    formatWholeNumber(value) {
      return String(Math.round(value));
    },
    formatUsageShare(value) {
      return `${(value * 100).toFixed(1)}%`;
    },
    isBillingSettlementCompleted() {
      return billingCompleted;
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
  vm.runInContext(chargeSupportSource, context, {
    filename: 'metering-team-overview-charge-support.js',
  });
  return context;
}

test('charge-support applies shared compressor settlement only after the configured electric start month', () => {
  const context = createChargeSupportContext();

  assert.equal(context.shouldApplySharedCompressorSettlement('2026-04'), true);
  assert.equal(context.shouldApplySharedCompressorSettlement('2026-03'), false);

  context.__setResourceType('gas');
  assert.equal(context.shouldApplySharedCompressorSettlement('2026-04'), false);
});

test('charge-support filters shared compressor source equipment and preserves teams without a ratio', () => {
  const context = createChargeSupportContext();

  assert.deepEqual(
    context.getTeamChargeEquipmentIds('team_04', { selectionOnly: true }),
    ['plain_a', 'shared_compressor']
  );
  assert.deepEqual(
    context.getTeamChargeEquipmentIdsExcludingSharedCompressor('team_04'),
    ['plain_a']
  );
  assert.deepEqual(
    context.getTeamChargeEquipmentIdsExcludingSharedCompressor('team_06'),
    ['plain_c']
  );
});

test('charge-support dedupes shared sources and calculates shared totals with detail text', () => {
  const context = createChargeSupportContext();

  assert.deepEqual(
    Array.from(context.getSharedCompressorSettlementSourceIds()),
    ['shared_a', 'shared_b']
  );
  assert.equal(context.calculateSharedCompressorSettlementUsageSum(), 40);
  assert.equal(context.calculateSharedCompressorSettlementVariableChargeSum(), 400);
  assert.equal(context.calculateSharedCompressorSettlementBaseChargeSum(), 200);
  assert.equal(context.calculateTeamSharedCompressorSettlementUsage('team_04'), 10);
  assert.equal(context.calculateTeamSharedCompressorSettlementCharge('team_04'), 150);
  assert.equal(
    context.getTeamSharedCompressorSettlementChargeText('team_04'),
    '금액 150'
  );
  assert.match(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /Compressor 380V \+ Compressor 합계 40 x 배분 25.0% = 10/
  );
  assert.match(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /사용량요금 100/
  );
  assert.match(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /기본요금 배분 50/
  );
  assert.match(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /최종 금액 150/
  );
});

test('charge-support respects shared compressor selection when selectionOnly is enabled', () => {
  const context = createChargeSupportContext();

  assert.equal(
    context.calculateTeamSharedCompressorSettlementUsage('team_04', '2026-04', {
      selectionOnly: true,
    }),
    10
  );
  assert.equal(
    context.calculateTeamSharedCompressorSettlementUsage('team_05', '2026-04', {
      selectionOnly: true,
    }),
    null
  );
  assert.equal(
    context.calculateTeamSharedCompressorSettlementCharge('team_05', '2026-04', {
      selectionOnly: true,
    }),
    null
  );
});

test('charge-support adds apportioned shared charges to team equipment sums', () => {
  const context = createChargeSupportContext();

  assert.equal(context.calculateTeamEquipmentVariableChargeSum('team_04'), 150);
  assert.equal(context.calculateTeamBaseChargeAllocationSum('team_04'), 70);
  assert.equal(
    context.calculateTeamEquipmentVariableChargeSum('team_05', '2026-04', {
      selectionOnly: true,
    }),
    80
  );
  assert.equal(
    context.calculateTeamBaseChargeAllocationSum('team_05', '2026-04', {
      selectionOnly: true,
    }),
    35
  );

  context.__setBillingCompleted(false);
  assert.match(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /Compressor 380V \+ Compressor 합계 40 x 배분 25.0% = 10/
  );
  assert.doesNotMatch(
    context.getTeamSharedCompressorSettlementDetailText('team_04'),
    /최종 금액/
  );
});
