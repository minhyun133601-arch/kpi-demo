import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const teamMonthlyRuntimeSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/team-monthly/runtime.js', import.meta.url),
  'utf8'
);

function createTeamMonthlyContext() {
  const mirroredDataset = {};
  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    TEAM_01_01_KEY: 'team_01_01',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    WASTE_PLANT_B_TEAM_KEY: 'waste_plantB',
    DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS_BY_RESOURCE: {
      electric: ['team_01_01', 'team_02'],
      waste: ['waste_plantB'],
    },
    DIRECT_TEAM_MONTHLY_AMOUNT_TEAM_KEYS_BY_RESOURCE: {
      electric: ['team_02', 'plantB_power'],
      waste: ['waste_plantB'],
    },
    DIRECT_TEAM_MONTHLY_STORAGE_KEY_ALIASES_BY_RESOURCE: {
      electric: {
        team_01_01: 'plantB_power',
      },
    },
    DIRECT_TEAM_MONTHLY_USAGE_KPI_TEAM_NAMES: {
      electric: {
        plantB_power: 'Plant B 전력',
      },
    },
    state: {
      currentMonth: '2026-04',
      store: {
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
      },
    },
    getCurrentResourceType() {
      return 'electric';
    },
    normalizeResourceType(value) {
      return String(value ?? '').trim();
    },
    isElectricResourceType(resourceType = 'electric') {
      return String(resourceType) === 'electric';
    },
    normalizeMonthValue(value) {
      return String(value ?? '').trim();
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    roundCalculatedUsage(value) {
      return Math.round(Number(value) * 1000) / 1000;
    },
    formatWholeNumber(value) {
      return String(Math.round(Number(value)));
    },
    formatSettlementAmount(value) {
      return String(Math.round(Number(value)));
    },
    syncActiveResourceDatasetToStore() {
      return mirroredDataset;
    },
    getCurrentBillingSettlementScope() {
      return 'waste_plantB';
    },
    getWasteBillingSettlementTeamKeyForScope(scopeKey) {
      return scopeKey === 'waste_plantB' ? 'waste_plantB' : '';
    },
    getWasteBillingSettlementManualCostFieldKeys() {
      return ['water', 'labor'];
    },
    resolveBillingSettlementFields(fields) {
      return { ...fields };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamMonthlyRuntimeSource, context, {
    filename: 'team-monthly/runtime.js',
  });

  return {
    context,
    mirroredDataset,
  };
}

test('team monthly runtime resolves support, aliases, and editability', () => {
  const { context } = createTeamMonthlyContext();

  assert.equal(context.supportsDirectTeamMonthlyUsage('team_01_01', 'electric'), true);
  assert.equal(context.supportsDirectTeamMonthlyAmount('plantB_power', 'electric'), false);
  assert.equal(context.getDirectTeamMonthlyStorageKey('team_01_01', 'electric'), 'plantB_power');
  assert.equal(context.canEditDirectTeamMonthlyUsage('team_01_01', 'electric'), false);
  assert.equal(context.getDirectTeamMonthlyUsageKpiTeamName('team_01_01', 'electric'), 'Plant B 전력');
});

test('team monthly runtime stores usage entries and mirrors the active dataset', () => {
  const { context, mirroredDataset } = createTeamMonthlyContext();

  context.setDirectTeamMonthlyUsage('team_01_01', '12.345', '2026-04', 'electric');

  assert.equal(context.getStoredTeamMonthlyUsage('team_01_01', '2026-04', 'electric'), 12.345);
  assert.equal(context.getDirectTeamMonthlyUsage('team_01_01', '2026-04', 'electric'), 12.345);
  assert.equal(context.getDirectTeamMonthlyUsageInputValue('team_01_01', '2026-04', 'electric'), '12');
  assert.equal(context.state.store.teamMonthlyEntries['2026-04'].plantB_power, 12.345);
  assert.equal(mirroredDataset.teamMonthlyEntries['2026-04'].plantB_power, 12.345);
});

test('team monthly runtime stores amount entries and mirrors the active dataset', () => {
  const { context, mirroredDataset } = createTeamMonthlyContext();

  context.setDirectTeamMonthlyAmount('team_02', '1234.7', '2026-04', 'electric');

  assert.equal(context.getStoredTeamMonthlyAmount('team_02', '2026-04', 'electric'), 1235);
  assert.equal(context.getDirectTeamMonthlyAmount('team_02', '2026-04', 'electric'), 1235);
  assert.equal(context.getDirectTeamMonthlyAmountInputValue('team_02', '2026-04', 'electric'), '1235');
  assert.equal(context.state.store.teamMonthlyAmountEntries['2026-04'].team_02, 1235);
  assert.equal(mirroredDataset.teamMonthlyAmountEntries['2026-04'].team_02, 1235);
});

test('team monthly runtime builds waste billing fallback entries from portal-like rows', () => {
  const { context } = createTeamMonthlyContext();

  context.findWastePortalMonthRow = () => ({
    cost: '2500',
    costs: {
      water: '1200',
      labor: '300',
    },
  });

  const fallbackEntry = context.buildWasteBillingSettlementFallbackEntry('2026-04', 'waste_plantB');

  assert.ok(fallbackEntry);
  assert.equal(fallbackEntry.monthValue, '2026-04');
  assert.equal(fallbackEntry.completed, false);
  assert.equal(fallbackEntry.fields.water, '1200');
  assert.equal(fallbackEntry.fields.labor, '300');
  assert.equal(fallbackEntry.fields.billing_amount, '2500');
});
