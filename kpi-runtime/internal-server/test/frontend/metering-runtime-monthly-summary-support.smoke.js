import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const monthlySummarySupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/monthly-summary-support.js',
    import.meta.url
  ),
  'utf8'
);

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createMonthlySummarySupportContext() {
  let currentResourceType = 'electric';
  let currentMode = 'equipment';
  let selectedTeamKeys = [];
  let selectedEquipmentIds = [];
  let activeCardSelection = false;

  const equipmentItems = {
    share_eq: { id: 'share_eq', label: '설비A', shareTarget: true },
    other_eq: { id: 'other_eq', label: '설비B', shareTarget: true },
    hidden_eq: { id: 'hidden_eq', label: '숨김설비', shareTarget: false },
    gas_lpg: { id: 'gas_lpg', label: 'LPG', shareTarget: true },
    gas_eq: { id: 'gas_eq', label: 'LNG', shareTarget: true },
    gas_share: { id: 'gas_share', label: '가스설비', shareTarget: true },
  };

  const equipmentMonthlyUsageMap = {
    share_eq: 25,
    other_eq: 15,
    gas_total: 300,
    gas_lpg: 80,
    gas_eq: 220,
    gas_share: 40,
  };

  const displayedMonthlyUsageMap = {
    reactive_eq_1: 10,
    reactive_eq_2: 20,
  };

  const directTeamUsageMap = {
    'direct_electric:2026-04:electric': 40,
    'gas_direct:2026-04:gas': 30,
  };

  const teamMonthlyUsageMap = {
    team_a: 40,
    team_b: 60,
    team_shared: 50,
  };

  const teamAssignedShareTotalUsageMap = {
    'gas_team:false': 88,
    'gas_team:true': 66,
    'gas_lng_team:false': 60,
    'gas_lng_team:true': 60,
    'team_03:false': 70,
    'team_03:true': 70,
    'team_04:false': 80,
    'team_04:true': 80,
  };

  const teamAssignedEquipmentIdsMap = {
    power_reactive: ['reactive_eq_1', 'reactive_eq_2'],
  };

  const teamCalendarSelectionMap = {
    power_reactive: ['reactive_eq_2'],
  };

  const teamLabels = {
    team_a: 'A팀',
    team_b: 'B팀',
    team_shared: '공용팀',
    gas_team: '가스팀',
  };

  const dateReadingMap = {
    'field_24|2026-04-01': null,
    'field_24|2026-05-01': null,
    'power_a|2026-04-01': 10,
    'power_b|2026-04-01': 5,
    'power_a|2026-05-01': 20,
    'power_b|2026-05-01': 10,
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
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
    },
    TOTAL_POWER_TEAM_KEY: 'total_power',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    TEAM_01_01_KEY: 'team_01_01',
    GAS_TOTAL_USAGE_EQUIPMENT_ID: 'gas_total',
    GAS_LPG_CORRECTION_EQUIPMENT_ID: 'gas_lpg',
    GAS_PLANT_A_LNG_TEAM_KEY: 'gas_lng_team',
    TOTAL_POWER_USAGE_FACTOR: 2,
    normalizeMonthValue(value) {
      return /^\d{4}-\d{2}$/.test(String(value || '')) ? String(value) : '';
    },
    shiftMonthValue(monthValue, offset) {
      const [yearText, monthText] = String(monthValue).split('-');
      const year = Number(yearText);
      const monthIndex = Number(monthText) - 1 + Number(offset || 0);
      const date = new Date(Date.UTC(year, monthIndex, 1));
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    },
    getEquipmentReadingOnDate(equipmentId, dateString) {
      return dateReadingMap[`${equipmentId}|${dateString}`] ?? null;
    },
    getConfiguredTotalPowerEquipmentIds() {
      return ['power_a', 'power_b'];
    },
    formatWholeNumber(value) {
      return String(Math.round(Number(value)));
    },
    formatUsageShare(value) {
      return `${Math.round(Number(value) * 100)}%`;
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return resourceType === 'electric';
    },
    getEquipmentItem(equipmentId) {
      return equipmentItems[equipmentId] || null;
    },
    isEquipmentUsageShareTarget(equipment) {
      return Boolean(equipment?.shareTarget);
    },
    calculateEquipmentMonthlyUsage(equipmentId) {
      return {
        value: equipmentMonthlyUsageMap[equipmentId] ?? null,
      };
    },
    getCurrentOverallMonthlyUsage() {
      return currentResourceType === 'gas' ? 300 : 100;
    },
    getCurrentOverallUsageLabel() {
      return currentResourceType === 'gas' ? '가스 총사용량' : '전력총량';
    },
    getTotalPowerCardMonthlyUsage() {
      return 200;
    },
    getPlantBTotalCardMonthlyUsage() {
      return 55;
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'direct_electric';
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue = '2026-04', resourceType = currentResourceType) {
      return directTeamUsageMap[`${teamKey}:${monthValue}:${resourceType}`] ?? null;
    },
    getTeamCalendarSelection(teamKey) {
      return [...(teamCalendarSelectionMap[teamKey] || [])];
    },
    getTeamAssignedEquipmentIds(teamKey) {
      return [...(teamAssignedEquipmentIdsMap[teamKey] || [])];
    },
    calculateDisplayedEquipmentMonthlyUsage(equipmentId) {
      return {
        value: displayedMonthlyUsageMap[equipmentId] ?? null,
      };
    },
    getTeamAssignedChipShareTotalUsage(teamKey, options = {}) {
      return teamAssignedShareTotalUsageMap[`${teamKey}:${options.selectionOnly === true}`] ?? null;
    },
    getTeamMonthlyUsage(teamKey) {
      return teamMonthlyUsageMap[teamKey] ?? null;
    },
    calculateEquipmentGroupMonthlyUsage(equipmentIds = []) {
      const values = equipmentIds
        .map((equipmentId) => equipmentMonthlyUsageMap[equipmentId] ?? null)
        .filter((value) => Number.isFinite(value));
      return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
    },
    getGasOverallTrackedEquipmentIds() {
      return ['gas_total', 'gas_lpg', 'gas_eq'];
    },
    getTeamAssignedChipDisplayUsage(equipmentId) {
      if (equipmentId === 'gas_lpg') {
        return 100;
      }

      if (equipmentId === 'gas_eq') {
        return 120;
      }

      return null;
    },
    getDirectTeamMonthlyUsageTeamKeys(resourceType) {
      return resourceType === 'gas' ? ['gas_direct'] : [];
    },
    getCurrentMode() {
      return currentMode;
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getDefaultCalendarTrackedEquipmentIds() {
      return ['default_eq'];
    },
    getSelectedTeamCalendarEquipmentIds() {
      return ['team_sel_eq_1', 'team_sel_eq_2'];
    },
    getSelectedEquipmentIds() {
      return [...selectedEquipmentIds];
    },
    hasActiveCardSelection() {
      return activeCardSelection;
    },
    getTeamDisplayLabel(teamKey) {
      return teamLabels[teamKey] || '';
    },
    getEquipmentDisplayLabel(item) {
      return item?.label || '';
    },
    getCurrentTeamGroups() {
      return [
        { key: 'total_power' },
        { key: 'team_a' },
        { key: 'team_b' },
      ];
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setCurrentMode(nextMode) {
      currentMode = String(nextMode || 'equipment');
    },
    __setSelectedTeamKeys(nextTeamKeys = []) {
      selectedTeamKeys = [...nextTeamKeys];
    },
    __setSelectedEquipmentIds(nextEquipmentIds = []) {
      selectedEquipmentIds = [...nextEquipmentIds];
    },
    __setActiveCardSelection(enabled) {
      activeCardSelection = Boolean(enabled);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(monthlySummarySupportSource, context, {
    filename: 'runtime/monthly-summary-support.js',
  });
  return context;
}

test('runtime monthly summary support resolves sums and total power monthly usage window', () => {
  const context = createMonthlySummarySupportContext();

  assert.equal(context.sumFiniteValues([1, Number.NaN, 4, null]), 5);
  assert.deepEqual(
    toPlainValue(context.calculateTotalPowerMonthlyUsageWindow('2026-04')),
    {
      value: 30,
      difference: 15,
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      startReading: 15,
      endReading: 30,
    }
  );
  assert.equal(context.calculateTotalPowerMonthlyUsage(), 30);
});

test('runtime monthly summary support resolves power team predicates and equipment share text', () => {
  const context = createMonthlySummarySupportContext();

  assert.equal(context.isPowerActiveTeamKey('total_power'), true);
  assert.equal(context.isPowerPlantBTeamKey('plantB_power'), true);
  assert.equal(context.isPowerReactiveTeamKey('power_reactive'), true);
  assert.equal(context.isElectricOnlyTeamKey('power_reactive'), true);
  assert.equal(context.formatDailyUsage(12.6), '13');
  assert.equal(context.getEquipmentUsageShareText('share_eq', 100), '전력총량 25%');
  assert.equal(context.getEquipmentUsageShareText('hidden_eq', 100), '');

  context.__setResourceType('gas');
  assert.equal(context.getEquipmentUsageShareText('gas_share', 200), '가스 총사용량 20%');
});

test('runtime monthly summary support resolves team board monthly usage and usage share text branches', () => {
  const context = createMonthlySummarySupportContext();

  assert.equal(context.getTeamBoardMonthlyUsage('total_power'), 200);
  assert.equal(context.getTeamBoardMonthlyUsage('plantB_power'), 55);
  assert.equal(context.getTeamBoardMonthlyUsage('direct_electric'), 40);
  assert.equal(context.getTeamBoardMonthlyUsage('power_reactive'), 30);
  assert.equal(context.getTeamBoardMonthlyUsage('power_reactive', { selectionOnly: true }), 20);
  assert.equal(context.getTeamBoardMonthlyUsage('team_shared'), 50);
  assert.equal(context.getTeamUsageShareText('team_shared', 100), '전력총량 50%');
  assert.equal(context.getTeamUsageShareText('power_reactive', 100), '');
  assert.equal(context.getTeamUsageShareText('team_01_01', 100), '');

  context.__setResourceType('gas');
  assert.equal(context.getTeamBoardMonthlyUsage('gas_team', { selectionOnly: true }), 66);
});

test('runtime monthly summary support resolves gas monthly summary calculations and labels', () => {
  const context = createMonthlySummarySupportContext();
  context.__setResourceType('gas');

  assert.equal(context.calculateGasOverallMonthlyUsage(), 600);
  assert.equal(context.calculateGasRawLpgMonthlyUsage(), 80);
  assert.equal(context.calculateGasRawLngMonthlyUsage(), 520);
  assert.equal(context.calculateGasTeamDisplayTotalMonthlyUsage(), 250);
  assert.equal(context.calculateGasTeamDisplayLpgMonthlyUsage(), 100);
  assert.equal(context.calculateGasTeamDisplayLngMonthlyUsage(), 210);
  assert.deepEqual(toPlainValue(context.getGasStandaloneSummaryInfo()), {
    value: 80,
    label: 'LPG',
  });
  assert.deepEqual(toPlainValue(context.getGasTeamModeSummaryInfo()), {
    value: 250,
    label: '가스 총사용량',
  });
});

test('runtime monthly summary support resolves calendar tracked ids and focused monthly summary info', () => {
  const context = createMonthlySummarySupportContext();

  assert.deepEqual(toPlainValue(context.getCalendarTrackedEquipmentIds()), ['default_eq']);

  context.__setSelectedEquipmentIds(['share_eq', 'other_eq']);
  assert.deepEqual(toPlainValue(context.getCalendarTrackedEquipmentIds()), ['share_eq', 'other_eq']);

  context.__setCurrentMode('team');
  context.__setSelectedTeamKeys(['team_a']);
  assert.deepEqual(toPlainValue(context.getCalendarTrackedEquipmentIds()), ['team_sel_eq_1', 'team_sel_eq_2']);

  context.__setActiveCardSelection(true);
  context.__setSelectedTeamKeys(['team_a', 'team_b']);
  assert.deepEqual(toPlainValue(context.getMonthlyFocusedSummaryInfo()), {
    value: 100,
    label: '선택 팀 2개',
    highlightKey: 'equipment',
  });

  context.__setCurrentMode('equipment');
  context.__setSelectedEquipmentIds(['share_eq']);
  assert.deepEqual(toPlainValue(context.getMonthlyFocusedSummaryInfo()), {
    value: 25,
    label: '설비A 합계',
    highlightKey: 'equipment',
  });

  assert.equal(context.getOverallTeamMonthlyUsage(), 100);
  assert.deepEqual(toPlainValue(context.getCurrentMonthlySummaryInfo()), {
    value: 100,
    label: '전력총량',
  });
});
