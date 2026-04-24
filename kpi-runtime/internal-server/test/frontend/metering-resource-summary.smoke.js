import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const [resourceMetaSource, resourceSummarySource] = await Promise.all([
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/runtime/resource-meta.js',
      import.meta.url
    ),
    'utf8'
  ),
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/runtime/resource-summary.js',
      import.meta.url
    ),
    'utf8'
  ),
]);

function createResourceSummaryContext() {
  let currentMode = 'equipment';
  let directTeamUsageMap = {
    'team_01_01:electric': 30,
  };

  const context = {
    console,
    Date,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    TEAM_01_01_KEY: 'team_01_01',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    GAS_PLANT_A_LNG_TEAM_KEY: 'gas_team_lng',
    GAS_PLANT_A_LPG_TEAM_KEY: 'gas_team_lpg',
    GAS_LPG_CORRECTION_EQUIPMENT_ID: 'gas_lpg_correction',
    GAS_LPG_CORRECTION_USAGE_FACTOR: 1.25,
    GAS_CORRECTION_TARGET_IDS: new Set(['gas_target_1']),
    RESOURCE_DISPLAY_META: {
      electric: {
        eyebrow: '전기 리소스',
        title: '전기 제목',
        teamEntrySectionTitle: '전기 팀 입력',
        teamSummaryLabel: '전기 팀 합계',
        teamMonthTitleSuffix: '전기',
        equipmentListLabel: '전기 설비 목록',
        equipmentEmptyTitle: '전기 설비 없음',
        equipmentItemLabel: '설비',
        billingDocumentDirectory: 'electric-docs',
      },
      gas: {
        eyebrow: '가스 리소스',
        title: '가스 제목',
        teamEntrySectionTitle: '가스 팀 입력',
        teamSummaryLabel: '가스 팀 합계',
        teamMonthTitleSuffix: '가스',
        equipmentListLabel: '가스 검침 목록',
        equipmentEmptyTitle: '가스 항목 없음',
        equipmentItemLabel: '검침 항목',
        billingDocumentDirectory: 'gas-docs',
      },
      waste: {
        eyebrow: '폐수 리소스',
        title: '폐수 제목',
        teamEntrySectionTitle: '폐수 팀 입력',
        teamSummaryLabel: '폐수 팀 합계',
        teamMonthTitleSuffix: '폐수',
        equipmentListLabel: '폐수 목록',
        equipmentEmptyTitle: '폐수 항목 없음',
        equipmentItemLabel: '폐수 항목',
        billingDocumentDirectory: '',
      },
      production: {
        eyebrow: '생산 리소스',
        title: '생산 제목',
        teamEntrySectionTitle: '생산 팀 입력',
        teamSummaryLabel: '생산 팀 합계',
        teamMonthTitleSuffix: '생산',
        equipmentListLabel: '생산 목록',
        equipmentEmptyTitle: '생산 항목 없음',
        equipmentItemLabel: '생산 항목',
        billingDocumentDirectory: 'production-docs',
      },
    },
    BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE: {
      electric: [],
      gas: [],
      waste: [],
      production: [],
    },
    TEAM_GROUPS: [
      { key: 'team_01_01', label: 'Line Alpha' },
      { key: 'plantB_power', label: 'Plant B 전력' },
      { key: 'team_02', label: 'Line Gamma' },
    ],
    GAS_TEAM_GROUPS: [
      { key: 'team_01_01', label: 'Line Alpha' },
      { key: 'gas_team_lng', label: 'Plant A LNG' },
      { key: 'gas_team_lpg', label: 'Plant A LPG' },
    ],
    WASTE_TEAM_GROUPS: [
      { key: 'waste_a', label: 'Plant B' },
      { key: 'waste_b', label: 'Plant A' },
    ],
    state: {
      currentMonth: '2026-04',
      activeTeamSettlementScope: '',
      store: {
        resourceType: 'electric',
      },
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    isElectricOnlyTeamKey() {
      return false;
    },
    getTeamGroup(teamKey) {
      const resourceType = context.getCurrentResourceType();
      const source =
        resourceType === 'gas'
          ? context.GAS_TEAM_GROUPS
          : resourceType === 'waste'
            ? context.WASTE_TEAM_GROUPS
            : context.TEAM_GROUPS;
      return source.find((team) => team.key === teamKey) || null;
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'team_01_01';
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue, resourceType) {
      return directTeamUsageMap[`${teamKey}:${resourceType}`] ?? 0;
    },
    calculateTotalPowerMonthlyUsage() {
      return 100;
    },
    calculateEquipmentGroupMonthlyUsage(equipmentIds = []) {
      return equipmentIds.length * 10;
    },
    getEquipmentSummaryIds() {
      return ['eq-1', 'eq-2', 'eq-3', 'eq-4'];
    },
    getAllEquipmentIds() {
      return ['all-1', 'all-2', 'all-3'];
    },
    calculateGasOverallMonthlyUsage() {
      return 210;
    },
    calculateWasteOverallMonthlyUsage() {
      return 310;
    },
    calculateGasTeamDisplayTotalMonthlyUsage() {
      return 220;
    },
    formatNumber(value) {
      return Number(value).toFixed(2);
    },
    formatMonthTitle(monthValue) {
      return `[${monthValue}]`;
    },
    getCurrentMode() {
      return currentMode;
    },
    formatUsageFactor(value) {
      return `factor:${value}`;
    },
    calculateGasCorrectionFactorForMonth() {
      return 1.5;
    },
    __setCurrentMode(nextMode) {
      currentMode = nextMode;
    },
    __setResourceType(nextResourceType) {
      this.state.store.resourceType = nextResourceType;
    },
    __setDirectTeamUsage(nextMap) {
      directTeamUsageMap = { ...nextMap };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(resourceMetaSource, context, {
    filename: 'runtime/resource-meta.js',
  });
  vm.runInContext(resourceSummarySource, context, {
    filename: 'runtime/resource-summary.js',
  });
  return context;
}

test('resource summary resolves overall monthly usage by resource type', () => {
  const context = createResourceSummaryContext();

  assert.equal(context.getElectricDirectTeamMonthlyUsage(), 30);
  assert.equal(context.getElectricTeamModeOverallMonthlyUsage(), 130);
  assert.equal(context.getElectricTeamModeEquipmentSummaryUsage(), 70);

  context.__setResourceType('gas');
  assert.equal(context.getCurrentOverallMonthlyUsage(), 210);
  assert.equal(context.getTeamModeOverallMonthlyUsage(), 220);

  context.__setResourceType('waste');
  assert.equal(context.getCurrentOverallMonthlyUsage(), 310);
  assert.equal(context.getTeamModeOverallMonthlyUsage(), 310);

  context.__setResourceType('production');
  assert.equal(context.getCurrentOverallMonthlyUsage(), 30);
  assert.equal(context.getTeamModeOverallMonthlyUsage(), 30);
});

test('resource summary resolves team labels and context text', () => {
  const context = createResourceSummaryContext();

  assert.equal(context.getTeamDisplayLabel('team_01_01'), 'Line Alpha');
  assert.ok(context.getTeamContextText('team_01_01', 'electric').length > 0);
  assert.equal(context.getTeamContextText('plantB_power', 'electric'), '');

  const gasDirectContext = context.getTeamContextText('team_01_01', 'gas');
  assert.equal(gasDirectContext, '');

  const gasLpgDetail = context.getTeamContextDetailText('gas_team_lpg', 'gas');
  assert.ok(gasLpgDetail.includes('1.25'));

  const gasLngDetail = context.getTeamContextDetailText('gas_team_lng', 'gas');
  assert.ok(gasLngDetail.length > 0);
});

test('resource summary exposes resource header and section labels', () => {
  const context = createResourceSummaryContext();

  assert.equal(context.getResourceEyebrowText('gas'), '가스 리소스');
  assert.equal(context.getResourceTitleText('waste'), '폐수 제목');

  context.__setResourceType('gas');
  context.__setCurrentMode('team');
  assert.equal(context.getTeamModeEntrySectionTitle(), '가스 팀 입력');
  assert.equal(context.getTeamModeSummaryLabel(), '가스 팀 합계');
  assert.equal(context.getTeamModeMonthTitle('2026-04'), '[2026-04] 가스');
  assert.equal(context.getEntrySectionTitle(), '가스 팀 입력');
  assert.equal(context.getEquipmentListLabelText(), '가스 검침 목록');
  assert.ok(context.getUsageFactorLabel().length > 0);
});

test('resource summary formats gas manage factor helper text', () => {
  const context = createResourceSummaryContext();
  context.__setResourceType('gas');

  const lpgText = context.getGasManageUsageFactorText('gas_lpg_correction');
  assert.ok(lpgText.includes('1.25'));

  const targetText = context.getGasManageUsageFactorText('gas_target_1');
  assert.ok(targetText.includes('1.50'));

  const noneText = context.getGasManageUsageFactorText('unrelated');
  assert.equal(noneText, '');

  const buttonText = context.getEquipmentManageFactorButtonText({
    id: 'gas_target_1',
    factor: 2.5,
  });
  assert.ok(buttonText.includes('factor:2.5'));
  assert.ok(buttonText.includes('1.50'));
});
