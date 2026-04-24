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

function createContext() {
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
    Map,
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    TEAM_01_01_KEY: 'team_01_01',
    GAS_PLANT_A_LNG_TEAM_KEY: 'gas_plantA_lng',
    GAS_PLANT_A_LPG_TEAM_KEY: 'gas_plantA_lpg',
    GAS_LPG_CORRECTION_EQUIPMENT_ID: 'gas_lpg_correction',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'gas_scope_plantB',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY: 'gas_scope_lng',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY: 'gas_scope_lpg',
    WASTE_PLANT_B_TEAM_KEY: 'waste_plantB',
    WASTE_PLANT_A_TEAM_KEY: 'waste_plantA',
    state: {
      currentMonth: '',
      eventsBound: false,
      store: {
        resourceType: 'electric',
        resourceDatasets: {
          electric: {
            equipmentEntries: {},
            billingSettlementEntries: {},
            teamMonthlyEntries: {},
            teamMonthlyAmountEntries: {},
          },
          waste: {
            billingSettlementEntries: {},
            teamMonthlyEntries: {},
          },
        },
      },
    },
    normalizeMonthValue,
    normalizeResourceType,
    isPlainObject,
    normalizeStore(store) {
      const nextStore = isPlainObject(store) ? cloneJson(store) : {};
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
    clearEquipmentReadingTimelineCaches() {},
    getActiveResourceDataset(store, resourceType) {
      return isPlainObject(store?.resourceDatasets?.[resourceType])
        ? store.resourceDatasets[resourceType]
        : null;
    },
    normalizeBillingSettlementEntries(entries) {
      return isPlainObject(entries) ? entries : {};
    },
    getPresetBillingSettlementEntries() {
      return {};
    },
    loadStore() {
      return cloneJson(loadedStore || this.state.store);
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue, resourceType) {
      if (resourceType !== 'waste') return null;
      return loadedStore?.resourceDatasets?.waste?.teamMonthlyEntries?.[monthValue]?.[teamKey] ?? null;
    },
    getWasteBillingSettlementScopeKeyForTeam(teamKey) {
      if (teamKey === 'waste_plantB') return 'waste_scope_buk';
      if (teamKey === 'waste_plantA') return 'waste_scope_plantA';
      return '';
    },
    getBillingSettlementEntry(monthValue, scopeKey) {
      const fields = loadedStore?.resourceDatasets?.waste?.billingSettlementEntries?.[monthValue]?.scopes?.[scopeKey]?.fields;
      return fields ? { fields } : null;
    },
    getWasteBillingSettlementManualCostFieldKeys() {
      return ['billing_amount'];
    },
    parseBillingSettlementNumericValue(value) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    },
    calculateBillingSettlementBillingAmountValue(fields) {
      const total = Number(fields?.billing_amount ?? fields?.total);
      return Number.isFinite(total) ? total : null;
    },
    __setLoadedStore(nextStore) {
      loadedStore = cloneJson(nextStore);
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

test('waste utility dataset snapshot falls back to hydrated loadStore when state store is stale', () => {
  const context = createContext();
  context.__setLoadedStore({
    resourceType: 'waste',
    resourceDatasets: {
      waste: {
        billingSettlementEntries: {
          '2026-03': {
            scopes: {
              waste_scope_buk: {
                fields: {
                  billing_amount: 700,
                },
              },
              waste_scope_plantA: {
                fields: {
                  billing_amount: 400,
                },
              },
            },
          },
        },
        teamMonthlyEntries: {
          '2026-03': {
            waste_plantB: 13,
            waste_plantA: 7,
          },
        },
      },
    },
  });

  const snapshot = context.buildWasteUtilityDatasetSnapshot();

  assert.deepEqual(Array.from(snapshot.months), ['2026-03']);
  assert.deepEqual(cloneJson(snapshot.teams['Plant B']['2026-03']), {
    usage: 13,
    cost: 700,
    costs: {
      billing_amount: 700,
      total: 700,
    },
  });
  assert.deepEqual(cloneJson(snapshot.teams['Plant A']['2026-03']), {
    usage: 7,
    cost: 400,
    costs: {
      billing_amount: 400,
      total: 400,
    },
  });
});
