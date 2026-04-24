import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const runtimeStoreNormalizationSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/runtime/store-normalization.js', import.meta.url),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStoreNormalizationContext(options = {}) {
  const callLog = [];
  const resourceTypes = {
    ELECTRIC: 'electric',
    GAS: 'gas',
    WASTE: 'waste',
    PRODUCTION: 'production',
  };
  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Map,
    Set,
    PRESET_IMPORT_VERSION: 6,
    ENTRY_RESET_VERSION: 1,
    ENTRY_STATUS_BASELINE_VERSION: 3,
    EQUIPMENT_FACTOR_MIGRATION_VERSION: 2,
    TEAM_ASSIGNMENT_BASELINE_VERSION: 1,
    HISTORICAL_ENTRY_VALUE_FIX_VERSION: 4,
    STICK_METER_SPLIT_VERSION: 3,
    MANUAL_SAVE_HISTORY_LIMIT: options.manualSaveHistoryLimit ?? 2,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: resourceTypes,
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeResourceType(value) {
      const normalized = String(value ?? '').trim();
      return Object.values(resourceTypes).includes(normalized) ? normalized : resourceTypes.ELECTRIC;
    },
    normalizeEquipmentItems(items, resourceType) {
      callLog.push(['normalizeEquipmentItems', resourceType]);
      return [
        {
          id: `${resourceType}-item`,
          sourceItems: items || [],
        },
      ];
    },
    pruneEquipmentEntriesByVisibility(entries, equipmentItems) {
      callLog.push(['pruneEquipmentEntriesByVisibility']);
      return {
        kind: 'visible',
        entries,
        equipmentItems,
      };
    },
    pruneLegacyShiftedGasEntries(entries) {
      callLog.push(['pruneLegacyShiftedGasEntries']);
      return {
        kind: 'pruned',
        entries,
      };
    },
    mergeEquipmentEntriesWithPresetLocalStore(entries, presetEntries) {
      callLog.push(['mergeEquipmentEntriesWithPresetLocalStore']);
      return {
        kind: 'merged',
        entries,
        presetEntries,
      };
    },
    applyLegacyGasFebruary2025DateShift(entries) {
      callLog.push(['applyLegacyGasFebruary2025DateShift']);
      return {
        kind: 'shifted',
        entries,
      };
    },
    normalizeEquipmentEntries(entries) {
      return {
        kind: 'normalizedEntries',
        entries: entries || {},
      };
    },
    getPresetGasEntries() {
      return {
        presetGas: true,
      };
    },
    normalizeTeamAssignments(assignments, equipmentItems, resourceType) {
      return {
        kind: 'teamAssignments',
        assignments,
        equipmentItems,
        resourceType,
      };
    },
    normalizeTeamMonthlyEntries(entries, resourceType) {
      return {
        kind: 'teamMonthlyEntries',
        entries,
        resourceType,
      };
    },
    normalizeTeamMonthlyAmountEntries(entries, resourceType) {
      return {
        kind: 'teamMonthlyAmountEntries',
        entries,
        resourceType,
      };
    },
    normalizeBillingStoreSections(source, resourceType) {
      return {
        billingDocuments: {
          resourceType,
          sourceTag: source.billingTag || '',
        },
        billingSettlementEntries: {
          resourceType,
        },
      };
    },
    applyRequestedEquipmentFactorMigration(items) {
      return items.map((item) => ({
        ...item,
        migrated: true,
      }));
    },
    mergePresetEquipmentEntries(entries) {
      return {
        kind: 'presetMerged',
        entries,
      };
    },
    clearEquipmentEntriesForResetMonths(entries) {
      return {
        kind: 'resetEntries',
        entries,
      };
    },
    applyRequestedEntryStatusBaseline(entries) {
      return {
        kind: 'statusBaseline',
        entries,
      };
    },
    applyRequestedHistoricalEntryValueFixes(entries) {
      return {
        kind: 'historicalFixed',
        entries,
      };
    },
    applyRequestedStickSingleEquipmentMigration(items, entries) {
      return {
        equipmentItems: items.map((item) => ({
          ...item,
          stickMigrated: true,
        })),
        equipmentEntries: {
          kind: 'stickSplit',
          entries,
        },
      };
    },
    restoreValidationCorrectionEntries(entries) {
      return {
        kind: 'restored',
        entries,
      };
    },
    migrateLegacyStickTeamAssignments(assignments) {
      return {
        kind: 'legacyAssignments',
        assignments,
      };
    },
    extractRawResourceDataset(rawStore, resourceType) {
      return rawStore?.resourceDatasets?.[resourceType] || {};
    },
    attachResourceDatasetToStore(store, resourceType) {
      return {
        kind: 'attachedStore',
        resourceType,
        store,
      };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeStoreNormalizationSource, context, {
    filename: 'runtime/store-normalization.js',
  });
  return {
    context,
    callLog,
  };
}

test('runtime store normalization keeps newest valid manual save history entries only', () => {
  const { context } = createStoreNormalizationContext();

  const generatedEntries = Array.from({ length: 42 }, (_, index) => ({
    savedAt: new Date(Date.UTC(2026, 3, 1, 0, index)).toISOString(),
    trigger: index % 2 === 0 ? ' manual ' : '',
    resourceType: index % 3 === 0 ? 'gas' : 'electric',
    mode: index % 2 === 0 ? 'team' : '',
    contextLabel: ` 항목 ${index + 1} `,
  }));
  const history = context.normalizeManualSaveHistory([
    null,
    {
      savedAt: '',
      trigger: 'invalid',
    },
    ...generatedEntries,
  ]);

  assert.equal(history.length, 40);
  assert.deepEqual(toPlain(history[0]), {
    savedAt: generatedEntries[41].savedAt,
    trigger: 'manual',
    resourceType: 'electric',
    mode: 'equipment',
    contextLabel: '항목 42',
  });
  assert.deepEqual(toPlain(history.at(-1)), {
    savedAt: generatedEntries[2].savedAt,
    trigger: 'manual',
    resourceType: 'electric',
    mode: 'team',
    contextLabel: '항목 3',
  });
});

test('runtime store normalization builds the gas dataset through shift, merge, and visibility pruning', () => {
  const { context, callLog } = createStoreNormalizationContext();

  const dataset = context.normalizeResourceDataset(
    {
      mode: 'team',
      equipmentItems: [{ id: 'gas-original' }],
      equipmentEntries: {
        '2026-04-01': {
          values: {
            gas_original: '10',
          },
        },
      },
      teamAssignments: {
        team_01_01: ['gas-original'],
      },
      teamMonthlyEntries: {
        '2026-04': {
          total: 10,
        },
      },
      teamMonthlyAmountEntries: {
        '2026-04': {
          total: 1000,
        },
      },
      billingTag: 'gas-billing',
    },
    context.RESOURCE_TYPES.GAS
  );

  assert.equal(dataset.mode, 'team');
  assert.equal(dataset.equipmentItems[0].id, 'gas-item');
  assert.equal(dataset.equipmentEntries.kind, 'visible');
  assert.equal(dataset.equipmentEntries.entries.kind, 'pruned');
  assert.equal(dataset.teamAssignments.resourceType, 'gas');
  assert.equal(dataset.teamMonthlyEntries.resourceType, 'gas');
  assert.equal(dataset.teamMonthlyAmountEntries.resourceType, 'gas');
  assert.equal(dataset.billingDocuments.sourceTag, 'gas-billing');
  assert.deepEqual(
    callLog.map(([name]) => name),
    [
      'normalizeEquipmentItems',
      'applyLegacyGasFebruary2025DateShift',
      'mergeEquipmentEntriesWithPresetLocalStore',
      'pruneLegacyShiftedGasEntries',
      'pruneEquipmentEntriesByVisibility',
    ]
  );
});

test('runtime store normalization forces waste datasets into team mode with empty assignments', () => {
  const { context } = createStoreNormalizationContext();

  const dataset = context.normalizeResourceDataset(
    {
      mode: 'equipment',
      equipmentItems: [{ id: 'waste-original' }],
      equipmentEntries: {
        '2026-04-01': {
          values: {
            waste_original: '3',
          },
        },
      },
      teamAssignments: {
        waste_plantA: ['waste-original'],
      },
      billingTag: 'waste-billing',
    },
    context.RESOURCE_TYPES.WASTE
  );

  assert.deepEqual(toPlain(dataset), {
    mode: 'team',
    equipmentItems: [
      {
        id: 'waste-item',
        sourceItems: [
          {
            id: 'waste-original',
          },
        ],
      },
    ],
    equipmentEntries: {
      kind: 'normalizedEntries',
      entries: {
        '2026-04-01': {
          values: {
            waste_original: '3',
          },
        },
      },
    },
    teamAssignments: {},
    teamMonthlyEntries: {
      kind: 'teamMonthlyEntries',
      resourceType: 'waste',
    },
    teamMonthlyAmountEntries: {
      kind: 'teamMonthlyAmountEntries',
      resourceType: 'waste',
    },
    billingDocuments: {
      resourceType: 'waste',
      sourceTag: 'waste-billing',
    },
    billingSettlementEntries: {
      resourceType: 'waste',
    },
  });
});

test('runtime store normalization assembles all resource datasets into a normalized root store', () => {
  const { context } = createStoreNormalizationContext();

  const result = context.normalizeStore({
    resourceType: 'gas',
    manualSaveHistory: [
      {
        savedAt: '2026-04-18T10:00:00.000Z',
        trigger: 'manual',
        resourceType: 'electric',
        mode: 'equipment',
        contextLabel: '전기',
      },
    ],
    resourceDatasets: {
      electric: {
        equipmentItems: [{ id: 'electric-original' }],
      },
      gas: {
        mode: 'team',
        equipmentItems: [{ id: 'gas-original' }],
      },
      waste: {
        equipmentItems: [{ id: 'waste-original' }],
      },
      production: {
        equipmentItems: [{ id: 'production-original' }],
      },
    },
  });

  assert.equal(result.kind, 'attachedStore');
  assert.equal(result.resourceType, 'gas');
  assert.equal(result.store.resourceType, 'gas');
  assert.equal(result.store.resourceDatasets.electric.equipmentItems[0].stickMigrated, true);
  assert.equal(result.store.resourceDatasets.gas.equipmentItems[0].id, 'gas-item');
  assert.equal(result.store.resourceDatasets.waste.mode, 'team');
  assert.equal(result.store.resourceDatasets.production.equipmentItems[0].stickMigrated, true);
  assert.equal(result.store.manualSaveHistory.length, 1);
  assert.equal(result.store.presetImportVersion, 6);
  assert.equal(result.store.entryResetVersion, 1);
  assert.equal(result.store.entryStatusBaselineVersion, 3);
  assert.equal(result.store.equipmentFactorMigrationVersion, 2);
  assert.equal(result.store.teamAssignmentBaselineVersion, 1);
  assert.equal(result.store.historicalEntryValueFixVersion, 4);
  assert.equal(result.store.stickMeterSplitVersion, 3);
});
