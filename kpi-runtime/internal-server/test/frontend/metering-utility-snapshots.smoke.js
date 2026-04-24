import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const [utilitySnapshotCoreSource, utilitySnapshotsSource] = await Promise.all([
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/runtime/utility-snapshot-core.js',
      import.meta.url
    ),
    'utf8'
  ),
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/runtime/utility-snapshots.js',
      import.meta.url
    ),
    'utf8'
  ),
]);

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createUtilitySnapshotsContext() {
  let currentResourceType = 'electric';
  let clearTimelineCacheCount = 0;
  let loadedStore = null;
  const isPlainObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
  const normalizeResourceType = (value) => {
    const normalized = String(value ?? '').trim();
    return ['electric', 'gas', 'waste', 'production'].includes(normalized)
      ? normalized
      : 'electric';
  };
  const normalizeMonthValue = (value) => {
    const match = /^(\d{4})-(\d{2})/.exec(String(value ?? '').trim());
    return match ? `${match[1]}-${match[2]}` : '';
  };

  const presetBillingSettlementEntries = {
    '2026-02': {
      fields: {
        preset: 1,
      },
    },
  };

  const gasEquipmentUsageById = {
    gas_field_03: 4.1,
    gas_field_04: 5.2,
    gas_lpg_correction: 3.5,
    gas_field_06: 8.8,
  };

  const gasDirectUsageByKey = {
    'team_01_01:2026-03:gas': 11.4,
    'waste_buk:2026-03:waste': 12.6,
    'waste_plantA:2026-03:waste': 7.4,
  };

  const gasBoardUsageByKey = {
    'gas_team_lng:2026-03:false': 4.2,
  };

  const electricUsageByKey = {
    '2026-01:team_01_01': 10.2,
    '2026-01:team_01_02': 20.4,
    '2026-01:team_02': 30.6,
    '2026-01:team_03': 40.8,
    '2026-02:team_01_01': 50.1,
    '2026-02:team_01_02': 60.2,
    '2026-02:team_02': 70.3,
    '2026-02:team_03': 80.4,
  };

  const electricCostByKey = {
    '2026-01:team_01_01': 101.2,
    '2026-01:team_01_02': 202.2,
    '2026-01:team_02': 303.2,
    '2026-01:team_03': 404.2,
    '2026-02:team_01_01': 505.2,
    '2026-02:team_01_02': 606.2,
    '2026-02:team_02': 707.2,
    '2026-02:team_03': 808.2,
  };

  const billingNumericFields = {
    'power_charge:2026-03:gas_scope_plantB': 550.4,
    'power_charge:2026-03:gas_scope_lpg': 330.7,
    'billing_amount:2026-03:waste_scope_buk': 700,
    'billing_amount:2026-03:waste_scope_plantA': 400,
  };

  const billingUnitPrices = {
    '2026-03:gas_scope_lng': 10,
    '2026-03:waste_scope_buk': 12.3,
    '2026-03:waste_scope_plantA': 11.1,
  };

  const billingEntries = {
    '2026-03:waste_scope_buk': {
      fields: {
        transport: 200,
        disposal: 500,
      },
    },
    '2026-03:waste_scope_plantA': {
      fields: {
        transport: 100,
        disposal: 300,
      },
    },
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
    TEAM_01_01_KEY: 'team_01_01',
    GAS_PLANT_A_LNG_TEAM_KEY: 'gas_team_lng',
    GAS_PLANT_A_LPG_TEAM_KEY: 'gas_team_lpg',
    GAS_LPG_CORRECTION_EQUIPMENT_ID: 'gas_lpg_correction',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'gas_scope_plantB',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY: 'gas_scope_lng',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY: 'gas_scope_lpg',
    WASTE_PLANT_B_TEAM_KEY: 'waste_buk',
    WASTE_PLANT_A_TEAM_KEY: 'waste_plantA',
    WASTE_OVERVIEW_TEAM_KEYS: ['waste_buk', 'waste_plantA'],
    state: {
      currentMonth: '2026-01',
      eventsBound: false,
      store: {
        resourceType: 'electric',
        resourceDatasets: {},
        equipmentEntries: {},
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
        billingSettlementEntries: {},
      },
    },
    normalizeMonthValue,
    normalizeResourceType,
    normalizeStore(store) {
      const nextStore = isPlainObject(store) ? store : {};
      if (!isPlainObject(nextStore.resourceDatasets)) {
        nextStore.resourceDatasets = {};
      }
      return nextStore;
    },
    attachResourceDatasetToStore(store, resourceType) {
      if (!isPlainObject(store.resourceDatasets)) {
        store.resourceDatasets = {};
      }
      store.resourceType = normalizeResourceType(resourceType);
      if (!isPlainObject(store.resourceDatasets[store.resourceType])) {
        store.resourceDatasets[store.resourceType] = {};
      }
      const dataset = store.resourceDatasets[store.resourceType];
      store.equipmentEntries = isPlainObject(dataset.equipmentEntries)
        ? dataset.equipmentEntries
        : {};
      store.teamMonthlyEntries = isPlainObject(dataset.teamMonthlyEntries)
        ? dataset.teamMonthlyEntries
        : {};
      store.teamMonthlyAmountEntries = isPlainObject(dataset.teamMonthlyAmountEntries)
        ? dataset.teamMonthlyAmountEntries
        : {};
      store.billingSettlementEntries = isPlainObject(dataset.billingSettlementEntries)
        ? dataset.billingSettlementEntries
        : {};
      return store;
    },
    clearEquipmentReadingTimelineCaches() {
      clearTimelineCacheCount += 1;
    },
    getActiveResourceDataset(store, resourceType) {
      return isPlainObject(store?.resourceDatasets?.[resourceType])
        ? store.resourceDatasets[resourceType]
        : null;
    },
    normalizeBillingSettlementEntries(entries) {
      return isPlainObject(entries) ? entries : {};
    },
    getPresetBillingSettlementEntries() {
      return presetBillingSettlementEntries;
    },
    isPlainObject,
    loadStore() {
      return cloneJson(loadedStore || this.state.store);
    },
    getTeamAssignedChipDisplayUsage(equipmentId) {
      return gasEquipmentUsageById[equipmentId] ?? null;
    },
    getBillingSettlementNumericField(fieldKey, monthValue, scopeKey) {
      return billingNumericFields[`${fieldKey}:${monthValue}:${scopeKey}`] ?? null;
    },
    getBillingSettlementUnitPrice(monthValue, scopeKey) {
      return billingUnitPrices[`${monthValue}:${scopeKey}`] ?? null;
    },
    getBillingSettlementScopeDefinitions(resourceType) {
      if (resourceType !== 'gas') {
        return [];
      }

      return [
        { key: 'gas_scope_plantB', shortLabel: 'buk' },
        { key: 'gas_scope_lng', shortLabel: 'lng' },
        { key: 'gas_scope_lpg', shortLabel: 'lpg' },
      ];
    },
    getWasteBillingSettlementTeamKeyForScope(scopeKey) {
      if (scopeKey === 'waste_scope_buk') {
        return 'waste_buk';
      }

      if (scopeKey === 'waste_scope_plantA') {
        return 'waste_plantA';
      }

      return '';
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue, resourceType) {
      return gasDirectUsageByKey[`${teamKey}:${monthValue}:${resourceType}`] ?? null;
    },
    getWasteBillingSettlementScopeKeyForTeam(teamKey) {
      if (teamKey === 'waste_buk') {
        return 'waste_scope_buk';
      }

      if (teamKey === 'waste_plantA') {
        return 'waste_scope_plantA';
      }

      return '';
    },
    formatSettlementAmount(value) {
      return `amt:${Math.round(Number(value))}`;
    },
    getBillingSettlementFields() {
      return [
        { key: 'transport', label: 'transport' },
        { key: 'disposal', label: 'disposal' },
      ];
    },
    getBillingSettlementEntry(monthValue, scopeKey) {
      return billingEntries[`${monthValue}:${scopeKey}`] ?? null;
    },
    getTeamDisplayLabel(teamKey) {
      return `label:${teamKey}`;
    },
    getWasteBillingSettlementManualCostFieldKeys() {
      return ['transport', 'disposal'];
    },
    parseBillingSettlementNumericValue(value) {
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : null;
    },
    formatNumber(value) {
      return `num:${Number(value).toFixed(1)}`;
    },
    formatWholeNumber(value) {
      return `whole:${Math.round(Number(value))}`;
    },
    calculateBillingSettlementBillingAmountValue(rawFields) {
      return ['transport', 'disposal'].reduce((sum, fieldKey) => {
        const numericValue = Number(rawFields?.[fieldKey] ?? 0);
        return sum + (Number.isFinite(numericValue) ? numericValue : 0);
      }, 0);
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isWasteResourceType(resourceType = currentResourceType) {
      return resourceType === 'waste';
    },
    getTeamBoardMonthlyUsage(teamKey, options = {}) {
      return (
        gasBoardUsageByKey[`${teamKey}:${options.monthValue}:${options.selectionOnly === true}`] ??
        null
      );
    },
    getGasOtherCostDescriptors() {
      return [];
    },
    getTeamMonthlyUsage(teamKey) {
      return electricUsageByKey[`${context.state.currentMonth}:${teamKey}`] ?? null;
    },
    calculateTeamAmount(teamKey, monthValue) {
      return electricCostByKey[`${monthValue}:${teamKey}`] ?? null;
    },
    hasStoredTeamMonthlyUsageOverride() {
      return false;
    },
    __setCurrentResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
    __setLoadedStore(nextStore) {
      loadedStore = cloneJson(nextStore);
    },
    __getClearTimelineCacheCount() {
      return clearTimelineCacheCount;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(utilitySnapshotCoreSource, context, {
    filename: 'runtime/utility-snapshot-core.js',
  });
  vm.runInContext(utilitySnapshotsSource, context, {
    filename: 'runtime/utility-snapshots.js',
  });
  return context;
}

test('utility snapshot core detaches store state and restores it after callback', () => {
  const context = createUtilitySnapshotsContext();
  const originalStore = {
    resourceType: 'electric',
    resourceDatasets: {
      electric: {
        equipmentEntries: {},
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
        billingSettlementEntries: {},
      },
    },
  };

  context.state.store = originalStore;
  context.state.currentMonth = '2026-01';
  context.__setLoadedStore(originalStore);

  const result = context.withDetachedResourceSnapshot('electric', '2026-02', (clonedStore) => ({
    sameReference: clonedStore === originalStore,
    monthValue: context.state.currentMonth,
    billingSettlementEntries: cloneJson(clonedStore.billingSettlementEntries),
  }));

  assert.equal(result.sameReference, false);
  assert.equal(result.monthValue, '2026-02');
  assert.deepEqual(result.billingSettlementEntries, {
    '2026-02': {
      fields: {
        preset: 1,
      },
    },
  });
  assert.equal(context.state.store, originalStore);
  assert.equal(context.state.currentMonth, '2026-01');
  assert.equal(context.__getClearTimelineCacheCount(), 2);
});

test('utility snapshot core exposes gas and waste overview helpers', () => {
  const context = createUtilitySnapshotsContext();

  context.__setCurrentResourceType('gas');
  assert.equal(context.calculateGasTeamDisplayAmount('gas_team_lng', '2026-03'), 42);
  assert.match(
    context.getGasTeamAmountDetailText('gas_team_lng', '2026-03'),
    /num:10\.0 x .*whole:4 = amt:42/
  );

  context.__setCurrentResourceType('waste');
  assert.equal(context.calculateWasteOverallMonthlyAmount('2026-03'), 1100);
  assert.match(context.getWasteOverallAmountDetailText('2026-03'), /amt:1100/);
  assert.match(context.getWasteTeamAmountDetailText('waste_buk', '2026-03'), /transport amt:200/);
});

test('utility snapshots build electric monthly and dataset snapshots from detached stores', () => {
  const context = createUtilitySnapshotsContext();
  const store = {
    resourceType: 'electric',
    resourceDatasets: {
      electric: {
        equipmentEntries: {
          '2026-01-01': { values: { field_a: '10' } },
        },
        billingSettlementEntries: {
          '2026-02': { fields: { total: 1 } },
        },
        teamMonthlyEntries: {
          '2026-01': { team_01_01: 10 },
        },
        teamMonthlyAmountEntries: {
          '2026-02': { team_01_01: 505 },
        },
      },
    },
  };

  const monthSnapshot = context.buildElectricMonthlyTeamSnapshot('2026-02', store);
  assert.equal(monthSnapshot.monthValue, '2026-02');
  assert.deepEqual(cloneJson(monthSnapshot.teams.team_01_01), {
    usage: 50,
    cost: 505,
  });

  const datasetSnapshot = context.buildElectricUtilityDatasetSnapshot(store);
  assert.deepEqual(Array.from(datasetSnapshot.months), ['2026-01', '2026-02']);
  assert.deepEqual(cloneJson(datasetSnapshot.teams.team_03['2026-01']), {
    usage: 41,
    cost: 404,
  });
  assert.deepEqual(cloneJson(datasetSnapshot.teams.team_02['2026-02']), {
    usage: 70,
    cost: 707,
  });
});

test('utility snapshots build gas and waste dataset snapshots with rounded totals', () => {
  const context = createUtilitySnapshotsContext();

  const gasStore = {
    resourceType: 'gas',
    resourceDatasets: {
      gas: {
        equipmentEntries: {
          '2026-03-01': { values: { gas_field_03: '4' } },
        },
        billingSettlementEntries: {
          '2026-03': { fields: { power_charge: 1 } },
        },
        teamMonthlyEntries: {
          '2026-03': { team_01_01: 11 },
        },
        teamMonthlyAmountEntries: {},
      },
    },
  };

  const gasSnapshot = context.buildGasUtilityDatasetSnapshot(gasStore);
  assert.deepEqual(Array.from(gasSnapshot.months), ['2026-03']);
  assert.deepEqual(cloneJson(gasSnapshot.teams['Line Alpha (LNG)']['2026-03']), {
    usage: 11,
    cost: 550,
  });
  assert.deepEqual(cloneJson(gasSnapshot.teams['Line Beta (LNG)']['2026-03']), {
    usage: 9,
    cost: 93,
  });
  assert.deepEqual(cloneJson(gasSnapshot.teams['Line Beta (LPG)']['2026-03']), {
    usage: 4,
    cost: 331,
  });

  const wasteStore = {
    resourceType: 'waste',
    resourceDatasets: {
      waste: {
        billingSettlementEntries: {
          '2026-03': { fields: { total: 1 } },
        },
        teamMonthlyEntries: {
          '2026-03': { waste_buk: 13, waste_plantA: 7 },
        },
      },
    },
  };

  const wasteSnapshot = context.buildWasteUtilityDatasetSnapshot(wasteStore);
  assert.deepEqual(Array.from(wasteSnapshot.months), ['2026-03']);
  assert.deepEqual(cloneJson(wasteSnapshot.teams['Plant B']['2026-03']), {
    usage: 13,
    cost: 700,
    costs: {
      transport: 200,
      disposal: 500,
      total: 700,
    },
  });
  assert.deepEqual(cloneJson(wasteSnapshot.teams['Plant A']['2026-03']), {
    usage: 7,
    cost: 400,
    costs: {
      transport: 100,
      disposal: 300,
      total: 400,
    },
  });
});
