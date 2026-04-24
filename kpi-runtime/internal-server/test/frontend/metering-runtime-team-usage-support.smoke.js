import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const teamUsageSupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/team-usage-support.js',
    import.meta.url
  ),
  'utf8'
);

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createTeamUsageSupportContext() {
  let currentResourceType = 'gas';
  let selectedTeamKeys = ['team_a'];

  const equipmentMonthlyUsageMap = {
    gas_total: 120,
    gas_lpg: 10,
    gas_lng: 50,
    eq_share: 80,
    eq_other: 20,
    eq_normal: 40,
  };

  const displayedMonthlyUsageMap = {
    eq_share: 80,
    eq_other: 20,
  };

  const teamChargeIdsMap = {
    'team_a:false': ['eq_share', 'eq_other'],
    'team_a:true': ['eq_share'],
    'team_b:false': ['gas_lpg'],
    'team_b:true': ['gas_lpg'],
    'team_c:false': ['gas_lng'],
    'team_c:true': ['gas_lng'],
  };

  const sharedUsageMap = {
    'team_a:false': 20,
    'team_a:true': 15,
    'team_b:false': null,
    'team_b:true': 30,
    'team_c:false': null,
    'team_c:true': null,
  };

  const teamCalendarSelections = {
    team_a: ['eq_share', 'shared_virtual'],
    team_b: ['gas_lpg', 'shared_virtual'],
    team_c: ['gas_lng'],
  };

  const teamCalendarSelectableIds = {
    team_a: ['eq_share', 'eq_other', 'shared_virtual'],
    team_b: ['gas_lpg', 'shared_virtual'],
    team_c: ['gas_lng'],
  };

  const directTeamUsageMap = {
    direct_team: 33,
  };

  const teamLabels = {
    team_a: 'A팀',
    team_b: 'B팀',
    team_c: 'C팀',
    direct_team: '직접 입력팀',
    total_power: '총량팀',
    reactive_power: '무효전력팀',
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
    GAS_TOTAL_USAGE_EQUIPMENT_ID: 'gas_total',
    GAS_LPG_CORRECTION_EQUIPMENT_ID: 'gas_lpg',
    GAS_LPG_CORRECTION_USAGE_FACTOR: 1.5,
    GAS_CORRECTION_TARGET_IDS: new Set(['gas_lng']),
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_virtual',
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    calculateGasCorrectionFactorForMonth() {
      return 1.2;
    },
    calculateEquipmentMonthlyUsage(equipmentId) {
      return {
        value: equipmentMonthlyUsageMap[equipmentId] ?? null,
      };
    },
    calculateDisplayedEquipmentMonthlyUsage(equipmentId) {
      return {
        value: displayedMonthlyUsageMap[equipmentId] ?? equipmentMonthlyUsageMap[equipmentId] ?? null,
      };
    },
    formatDailyUsage(value) {
      return Number.isFinite(value) ? `사용량 ${Number(value)}` : '-';
    },
    formatEquipmentUsage(equipmentId) {
      return `설비사용량 ${equipmentId}`;
    },
    getEquipmentUsageChargeText(equipmentId, monthValue = '2026-04') {
      return `금액 ${equipmentId}@${monthValue}`;
    },
    getEquipmentUsageDetailText(equipmentId) {
      return `상세 ${equipmentId}`;
    },
    formatWholeNumber(value) {
      return String(Math.round(Number(value)));
    },
    formatNumber(value) {
      return String(Number(value));
    },
    isPowerActiveTeamKey(teamKey) {
      return teamKey === 'total_power';
    },
    isPowerReactiveTeamKey(teamKey) {
      return teamKey === 'reactive_power';
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getTeamCalendarSelection(teamKey) {
      return [...(teamCalendarSelections[teamKey] || [])];
    },
    getTeamCalendarSelectableIds(teamKey) {
      return [...(teamCalendarSelectableIds[teamKey] || [])];
    },
    calculateTeamSharedCompressorSettlementUsage(
      teamKey,
      _monthValue = '2026-04',
      options = {}
    ) {
      return sharedUsageMap[`${teamKey}:${options.selectionOnly === true}`] ?? null;
    },
    calculateUsageShare(value, totalValue) {
      if (!Number.isFinite(value) || !Number.isFinite(totalValue) || totalValue <= 0) {
        return null;
      }

      return value / totalValue;
    },
    formatUsageShare(value) {
      return `${Math.round(Number(value) * 100)}%`;
    },
    getTeamDisplayLabel(teamOrKey) {
      if (typeof teamOrKey === 'string') {
        return teamLabels[teamOrKey] || '';
      }

      return teamLabels[teamOrKey?.key] || '';
    },
    getTeamChargeEquipmentIdsExcludingSharedCompressor(
      teamKey,
      _monthValue = '2026-04',
      options = {}
    ) {
      return [...(teamChargeIdsMap[`${teamKey}:${options.selectionOnly === true}`] || [])];
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'direct_team';
    },
    getDirectTeamMonthlyUsage(teamKey) {
      return directTeamUsageMap[teamKey] ?? null;
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'gas');
    },
    __setSelectedTeamKeys(nextTeamKeys = []) {
      selectedTeamKeys = [...nextTeamKeys];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamUsageSupportSource, context, {
    filename: 'runtime/team-usage-support.js',
  });
  return context;
}

test('runtime team usage support resolves gas display factors and corrected monthly usage', () => {
  const context = createTeamUsageSupportContext();

  assert.equal(context.getGasTeamDisplayUsageFactor('gas_total'), 1);
  assert.equal(context.getGasTeamDisplayUsageFactor('gas_lpg'), 1.5);
  assert.equal(context.getGasTeamDisplayUsageFactor('gas_lng'), 1.2);
  assert.equal(context.getGasTeamDisplayUsageFactor('eq_normal'), null);

  assert.equal(context.getCorrectedEquipmentMonthlyUsage('gas_lpg'), 15);
  assert.equal(context.getCorrectedEquipmentMonthlyUsage('eq_normal'), 40);
  assert.equal(context.getTeamAssignedChipDisplayUsage('gas_lng'), 60);
});

test('runtime team usage support formats gas display chip usage charge and detail text', () => {
  const context = createTeamUsageSupportContext();

  assert.equal(context.isGasTeamDisplayUsageEquipment('gas_lng'), true);
  assert.equal(context.getTeamAssignedChipUsageText('gas_lng'), '사용량 60');
  assert.equal(context.getTeamAssignedChipChargeText('gas_lng'), '(사용량)');
  assert.equal(
    context.getTeamAssignedChipDetailText('gas_lng'),
    '상세 gas_lng\n팀별 표시 사용량 50 x 1.2 = 60'
  );

  assert.equal(context.getTeamAssignedChipUsageText('eq_normal'), '설비사용량 eq_normal');
  assert.equal(context.getTeamAssignedChipChargeText('eq_normal'), '금액 eq_normal@2026-04');
  assert.equal(context.getTeamAssignedChipDetailText('eq_normal'), '상세 eq_normal');
});

test('runtime team usage support derives selectable team share usage totals and detail text', () => {
  const context = createTeamUsageSupportContext();

  assert.equal(context.shouldShowTeamAssignedChipShare('team_a'), true);
  assert.equal(context.shouldShowTeamAssignedChipShare('total_power'), false);
  assert.equal(context.shouldShowTeamAssignedChipShare('reactive_power'), false);

  assert.equal(
    context.getTeamAssignedChipShareUsageValue('team_a', 'eq_share', { selectionOnly: true }),
    80
  );
  assert.equal(
    context.getTeamAssignedChipShareUsageValue('team_a', 'shared_virtual', { selectionOnly: true }),
    15
  );
  assert.equal(context.getTeamAssignedChipShareTotalUsage('team_a', { selectionOnly: true }), 95);
  assert.equal(
    context.getTeamAssignedChipShareText('team_a', 'eq_share', { selectionOnly: true }),
    '팀 기준 84%'
  );
  assert.equal(
    context.getTeamAssignedChipShareDetailText('team_a', 'eq_share', { selectionOnly: true }),
    'A팀 합계 사용량 95 중 사용량 80 = 84%'
  );
});

test('runtime team usage support resolves team monthly usage for direct and shared-compressor branches', () => {
  const context = createTeamUsageSupportContext();

  assert.equal(context.getTeamMonthlyUsage('direct_team'), 33);
  assert.equal(context.getTeamMonthlyUsage('team_a'), 120);
  assert.equal(context.getTeamCorrectedMonthlyUsage('team_b', { selectionOnly: true }), 45);
  assert.equal(context.getTeamCorrectedMonthlyUsage('team_c', { selectionOnly: true }), 50);
});

test('runtime team usage support builds selected-team corrected summary info with gas factor label', () => {
  const context = createTeamUsageSupportContext();
  context.__setSelectedTeamKeys(['team_b', 'team_c']);

  assert.deepEqual(toPlainValue(context.getSelectedTeamCorrectedSummaryInfo()), {
    value: 95,
    label: '선택 팀 2개 보정 사용량 (LPG x 1.5)',
  });
});
