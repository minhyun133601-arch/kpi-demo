import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const resourceStateSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/resource-state.js',
    import.meta.url
  ),
  'utf8'
);

function createResourceStateContext() {
  const defaultElectricItems = [{ id: 'electric-default', label: 'Electric Default' }];
  const defaultGasItems = [{ id: 'gas-default', label: 'Gas Default' }];
  const defaultWasteItems = [{ id: 'waste-default', label: 'Waste Default' }];
  const defaultProductionItems = [{ id: 'production-default', label: 'Production Default' }];
  let currentResourceType = 'electric';
  let supportsTeamMode = true;

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
    DEFAULT_EQUIPMENT_ITEMS: defaultElectricItems,
    DEFAULT_GAS_EQUIPMENT_ITEMS: defaultGasItems,
    DEFAULT_WASTE_EQUIPMENT_ITEMS: defaultWasteItems,
    DEFAULT_PRODUCTION_EQUIPMENT_ITEMS: defaultProductionItems,
    state: {
      store: {
        resourceType: 'electric',
        resourceDatasets: {},
        mode: 'equipment',
        equipmentItems: [],
        equipmentEntries: {},
        teamAssignments: {},
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
        billingDocuments: {},
        billingSettlementEntries: {},
      },
    },
    normalizeResourceType(value) {
      return String(value ?? '').trim() || 'electric';
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return String(resourceType) === 'electric';
    },
    isGasResourceType(resourceType = currentResourceType) {
      return String(resourceType) === 'gas';
    },
    isWasteResourceType(resourceType = currentResourceType) {
      return String(resourceType) === 'waste';
    },
    isProductionResourceType(resourceType = currentResourceType) {
      return String(resourceType) === 'production';
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    supportsTeamModeForCurrentResource() {
      return supportsTeamMode;
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    __setCurrentResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
    __setSupportsTeamMode(nextValue) {
      supportsTeamMode = Boolean(nextValue);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(resourceStateSource, context, {
    filename: 'runtime/resource-state.js',
  });
  return context;
}

test('resource state creates cloned default datasets with resource-specific mode', () => {
  const context = createResourceStateContext();

  const wasteDataset = context.createDefaultResourceDataset('waste');
  const electricDataset = context.createDefaultResourceDataset('electric');

  assert.equal(wasteDataset.mode, 'team');
  assert.equal(electricDataset.mode, 'equipment');
  assert.notEqual(wasteDataset.equipmentItems[0], context.DEFAULT_WASTE_EQUIPMENT_ITEMS[0]);
  wasteDataset.equipmentItems[0].label = 'Changed';
  assert.equal(context.DEFAULT_WASTE_EQUIPMENT_ITEMS[0].label, 'Waste Default');
});

test('resource state extracts nested datasets and falls back to legacy electric root fields', () => {
  const context = createResourceStateContext();

  const nestedDataset = context.extractRawResourceDataset(
    {
      resourceDatasets: {
        gas: {
          equipmentEntries: { '2026-04-01': { values: { gas: '11' } } },
        },
      },
    },
    'gas'
  );
  assert.equal(nestedDataset.equipmentEntries['2026-04-01'].values.gas, '11');

  const legacyElectricDataset = context.extractRawResourceDataset(
    {
      mode: 'team',
      equipmentItems: [{ id: 'legacy-electric' }],
      equipmentEntries: { '2026-04-01': { values: { electric: '22' } } },
      teamAssignments: { team_01: ['legacy-electric'] },
      presetImportVersion: 9,
      stickMeterSplitVersion: 3,
    },
    'electric'
  );

  assert.equal(legacyElectricDataset.mode, 'team');
  assert.equal(legacyElectricDataset.equipmentItems[0].id, 'legacy-electric');
  assert.equal(legacyElectricDataset.presetImportVersion, 9);
  assert.equal(legacyElectricDataset.stickMeterSplitVersion, 3);
});

test('resource state sync mirrors top-level store fields into the active dataset', () => {
  const context = createResourceStateContext();
  const store = {
    resourceType: 'gas',
    mode: 'equipment',
    equipmentItems: [{ id: 'gas-a' }],
    equipmentEntries: { '2026-04-02': { values: { 'gas-a': '44' } } },
    teamAssignments: { gas_team: ['gas-a'] },
    teamMonthlyEntries: { '2026-04': { gas_team: 44 } },
    teamMonthlyAmountEntries: { '2026-04': { gas_team: 4400 } },
    billingDocuments: { '2026-04': { fileName: 'gas.pdf' } },
    billingSettlementEntries: { '2026-04': { completed: true } },
    resourceDatasets: {},
  };

  const dataset = context.syncActiveResourceDatasetToStore(store);

  assert.equal(store.resourceDatasets.gas, dataset);
  assert.equal(dataset.equipmentItems, store.equipmentItems);
  assert.equal(dataset.teamAssignments, store.teamAssignments);
  assert.equal(dataset.billingDocuments, store.billingDocuments);
});

test('resource state attaches dataset fields back to the store and updates active mode/items', () => {
  const context = createResourceStateContext();
  context.__setCurrentResourceType('electric');
  context.state.store = {
    resourceType: 'electric',
    mode: 'equipment',
    equipmentItems: [],
    equipmentEntries: {},
    teamAssignments: {},
    teamMonthlyEntries: {},
    teamMonthlyAmountEntries: {},
    billingDocuments: {},
    billingSettlementEntries: {},
    resourceDatasets: {
      electric: {
        mode: 'team',
        equipmentItems: [{ id: 'field-a' }],
        equipmentEntries: { '2026-04-03': { values: { 'field-a': '55' } } },
        teamAssignments: { team_01: ['field-a'] },
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
        billingDocuments: {},
        billingSettlementEntries: {},
      },
    },
  };

  const attachedStore = context.attachResourceDatasetToStore(context.state.store, 'electric');
  assert.equal(attachedStore.mode, 'team');
  assert.equal(attachedStore.equipmentItems[0].id, 'field-a');

  context.__setSupportsTeamMode(false);
  context.setCurrentMode('team');
  assert.equal(context.state.store.mode, 'equipment');
  assert.equal(context.state.store.resourceDatasets.electric.mode, 'equipment');

  context.setCurrentEquipmentItems([{ id: 'field-b' }]);
  assert.equal(context.state.store.resourceDatasets.electric.equipmentItems[0].id, 'field-b');

  context.state.store.resourceDatasets.electric.equipmentEntries = {
    '2026-04-04': { values: { 'field-b': '77' } },
  };
  const presetEntries = context.getElectricPresetEntriesForStore(context.state.store);
  assert.equal(presetEntries['2026-04-04'].values['field-b'], '77');
});
