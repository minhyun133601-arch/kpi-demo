import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const teamMonthlyRuntimeSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('team-monthly/runtime.js'),
  'utf8'
);
const billingDocumentsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/documents.js'),
  'utf8'
);
const billingSettlementCalculationsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-calculations.js'),
  'utf8'
);
const billingSettlementRecordsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-records.js'),
  'utf8'
);
const billingStoreNormalizationSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/store-normalization.js'),
  'utf8'
);
const runtimeStoreMergeSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/store-merge.js'),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimeStoreMergeContext(options = {}) {
  const billingSettlementFieldKeys = new Set([
    'usage_fee',
    'discount',
    'vat',
    'billing_amount',
    'calorific_value',
  ]);
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
    Promise,
    RegExp,
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
    DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS_BY_RESOURCE: {
      electric: ['team_main', 'alias_main'],
      gas: ['default', 'gas_lpg'],
      waste: ['waste_team'],
      production: ['prod_team'],
    },
    DIRECT_TEAM_MONTHLY_AMOUNT_TEAM_KEYS_BY_RESOURCE: {
      electric: ['team_main', 'alias_main'],
      gas: ['default', 'gas_lpg'],
      waste: ['waste_team'],
      production: ['prod_team'],
    },
    DIRECT_TEAM_MONTHLY_STORAGE_KEY_ALIASES_BY_RESOURCE: {
      electric: {
        alias_main: 'team_main',
      },
    },
    TEAM_01_01_KEY: 'team_main',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    BILLING_SETTLEMENT_FIELD_KEYS: billingSettlementFieldKeys,
    DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY: 'default',
    BILLING_SETTLEMENT_SCOPE_KEYS: ['default', 'gas_lpg'],
    state: {
      currentMonth: options.currentMonth ?? '2026-04',
      store: {
        billingDocuments: {},
        billingSettlementEntries: {},
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
      },
    },
    getCurrentResourceType() {
      return options.resourceType ?? 'electric';
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      return String(value ?? '').trim();
    },
    normalizeResourceType(value) {
      const normalizedValue = String(value || '').trim().toLowerCase();
      return normalizedValue || 'electric';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    roundCalculatedUsage(value) {
      return Math.round(Number(value) * 100) / 100;
    },
    isElectricResourceType(resourceType = options.resourceType ?? 'electric') {
      return String(resourceType || '').trim().toLowerCase() === 'electric';
    },
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
    },
    normalizeBillingSettlementScope(value, fallback = 'default') {
      const normalizedValue = String(value || '').trim();
      return normalizedValue || fallback;
    },
    getCurrentBillingSettlementScope() {
      return options.scopeKey ?? 'default';
    },
    supportsScopedBillingSettlement(resourceType = options.resourceType ?? 'electric') {
      return resourceType === 'gas';
    },
    buildBillingDocumentFileName(
      monthValue,
      sourceFileName = '',
      _mimeType = '',
      resourceType = 'electric',
      scopeKey = ''
    ) {
      const normalizedScopeKey = String(scopeKey || '').trim();
      const scopeSuffix =
        normalizedScopeKey && normalizedScopeKey !== 'default' ? `-${normalizedScopeKey}` : '';
      const extension =
        String(sourceFileName || '').trim().match(/\.[a-z0-9]{1,8}$/i)?.[0]?.toLowerCase() || '.pdf';
      return `${monthValue}-${resourceType}${scopeSuffix}${extension}`;
    },
    getBillingDocumentFileNameFromPath(relativePath = '') {
      return String(relativePath || '').trim().split('/').pop() || '';
    },
    normalizeBillingDocumentRelativePath(relativePath = '', fileName = '', resourceType = 'electric') {
      const normalizedPath = String(relativePath || '').trim();
      return normalizedPath || `${resourceType}-billing-documents/${fileName}`;
    },
    getBillingSettlementResourceType() {
      return options.resourceType ?? 'electric';
    },
    buildWasteBillingSettlementFallbackEntry(monthValue, scopeKey) {
      return {
        monthValue,
        scopeKey,
        fields: {},
        completed: false,
        updatedAt: '',
      };
    },
    resolveBillingSettlementFields(fields) {
      return fields;
    },
    mergeEquipmentItemsWithPresetLocalStore(currentItems, presetItems) {
      return [...(Array.isArray(presetItems) ? presetItems : []), ...(Array.isArray(currentItems) ? currentItems : [])];
    },
    mergeEquipmentEntriesWithPresetLocalStore(currentEntries, presetEntries) {
      return {
        ...(context.isPlainObject(presetEntries) ? presetEntries : {}),
        ...(context.isPlainObject(currentEntries) ? currentEntries : {}),
      };
    },
    extractRawResourceDataset(rawStore, resourceType) {
      if (!context.isPlainObject(rawStore)) {
        return {};
      }

      const datasets = context.isPlainObject(rawStore.resourceDatasets)
        ? rawStore.resourceDatasets
        : {};
      return context.isPlainObject(datasets[resourceType]) ? datasets[resourceType] : {};
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamMonthlyRuntimeSource, context, {
    filename: 'team-monthly/runtime.js',
  });
  vm.runInContext(billingDocumentsSource, context, {
    filename: 'billing/documents.js',
  });
  vm.runInContext(billingSettlementCalculationsSource, context, {
    filename: 'billing/settlement-calculations.js',
  });
  vm.runInContext(billingSettlementRecordsSource, context, {
    filename: 'billing/settlement-records.js',
  });
  vm.runInContext(billingStoreNormalizationSource, context, {
    filename: 'billing/store-normalization.js',
  });
  vm.runInContext(runtimeStoreMergeSource, context, {
    filename: 'runtime/store-merge.js',
  });

  return { context };
}

test('runtime store merge normalizes team monthly aliases and keeps direct storage keys preferred', () => {
  const { context } = createRuntimeStoreMergeContext({
    resourceType: 'electric',
  });

  const normalized = context.normalizeTeamMonthlyEntries(
    {
      '2026-04': {
        alias_main: '12.5',
        team_main: '20',
        invalid_team: '99',
      },
    },
    'electric'
  );

  assert.deepEqual(toPlain(normalized), {
    '2026-04': {
      team_main: 20,
    },
  });
});

test('runtime store merge combines dataset and top-level team and billing sections', () => {
  const { context } = createRuntimeStoreMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeCurrentStoreWithPresetLocalStore(
    {
      resourceType: 'gas',
      teamAssignments: {
        main: ['A', 'B'],
      },
      teamMonthlyEntries: {
        '2026-04': {
          default: 200,
        },
      },
      teamMonthlyAmountEntries: {
        '2026-04': {
          default: 5000,
        },
      },
      billingDocuments: {
        '2026-04': {
          monthValue: '2026-04',
          scopes: {
            gas_lpg: {
              fileName: 'current-lpg.pdf',
              relativePath: 'gas-billing-documents/current-lpg.pdf',
              mimeType: 'application/pdf',
            },
          },
        },
      },
      billingSettlementEntries: {
        '2026-04': {
          monthValue: '2026-04',
          scopes: {
            gas_lpg: {
              monthValue: '2026-04',
              fields: {
                usage_fee: '150',
                billing_amount: '200',
              },
              completed: false,
              updatedAt: '2026-04-21T09:00:00.000Z',
            },
          },
        },
      },
      resourceDatasets: {
        gas: {
          mode: 'team',
          equipmentItems: [{ id: 'current-gas' }],
          equipmentEntries: { '2026-04-01': { values: { a: 1 } } },
          teamAssignments: {
            main: ['A', 'B'],
          },
          teamMonthlyEntries: {
            '2026-04': {
              default: 200,
            },
          },
          teamMonthlyAmountEntries: {
            '2026-04': {
              default: 5000,
            },
          },
          billingDocuments: {
            '2026-04': {
              monthValue: '2026-04',
              scopes: {
                gas_lpg: {
                  fileName: 'current-lpg.pdf',
                  relativePath: 'gas-billing-documents/current-lpg.pdf',
                  mimeType: 'application/pdf',
                },
              },
            },
          },
          billingSettlementEntries: {
            '2026-04': {
              monthValue: '2026-04',
              scopes: {
                gas_lpg: {
                  monthValue: '2026-04',
                  fields: {
                    usage_fee: '150',
                    billing_amount: '200',
                  },
                  completed: false,
                  updatedAt: '2026-04-21T09:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    {
      resourceType: 'electric',
      teamAssignments: {
        main: ['preset-only'],
      },
      teamMonthlyEntries: {
        '2026-03': {
          default: 100,
        },
      },
      teamMonthlyAmountEntries: {
        '2026-03': {
          default: 3000,
        },
      },
      billingDocuments: {
        '2026-04': {
          monthValue: '2026-04',
          scopes: {
            default: {
              fileName: 'preset-default.pdf',
              relativePath: 'gas-billing-documents/preset-default.pdf',
              mimeType: 'application/pdf',
            },
          },
        },
      },
      billingSettlementEntries: {
        '2026-04': {
          monthValue: '2026-04',
          scopes: {
            default: {
              monthValue: '2026-04',
              fields: {
                usage_fee: '100',
                vat: '10',
              },
              completed: true,
              updatedAt: '2026-04-01T09:00:00.000Z',
            },
          },
        },
      },
      resourceDatasets: {
        gas: {
          mode: 'equipment',
          equipmentItems: [{ id: 'preset-gas' }],
          equipmentEntries: { '2026-03-01': { values: { a: 0 } } },
          teamAssignments: {
            main: ['preset-only'],
          },
          teamMonthlyEntries: {
            '2026-03': {
              default: 100,
            },
          },
          teamMonthlyAmountEntries: {
            '2026-03': {
              default: 3000,
            },
          },
          billingDocuments: {
            '2026-04': {
              monthValue: '2026-04',
              scopes: {
                default: {
                  fileName: 'preset-default.pdf',
                  relativePath: 'gas-billing-documents/preset-default.pdf',
                  mimeType: 'application/pdf',
                },
              },
            },
          },
          billingSettlementEntries: {
            '2026-04': {
              monthValue: '2026-04',
              scopes: {
                default: {
                  monthValue: '2026-04',
                  fields: {
                    usage_fee: '100',
                    vat: '10',
                  },
                  completed: true,
                  updatedAt: '2026-04-01T09:00:00.000Z',
                },
              },
            },
          },
        },
      },
    }
  );

  assert.equal(merged.resourceType, 'gas');
  assert.equal(merged.resourceDatasets.gas.mode, 'team');
  assert.deepEqual(toPlain(merged.teamAssignments), {
    main: ['A', 'B'],
  });
  assert.deepEqual(toPlain(merged.teamMonthlyEntries), {
    '2026-03': {
      default: 100,
    },
    '2026-04': {
      default: 200,
    },
  });
  assert.deepEqual(toPlain(merged.teamMonthlyAmountEntries), {
    '2026-03': {
      default: 3000,
    },
    '2026-04': {
      default: 5000,
    },
  });
  assert.deepEqual(toPlain(merged.resourceDatasets.gas.teamAssignments), {
    main: ['A', 'B'],
  });
  assert.equal(
    merged.resourceDatasets.gas.billingDocuments['2026-04']?.scopes?.default?.relativePath,
    'gas-billing-documents/preset-default.pdf'
  );
  assert.equal(
    merged.resourceDatasets.gas.billingDocuments['2026-04']?.scopes?.gas_lpg?.relativePath,
    'gas-billing-documents/current-lpg.pdf'
  );
  assert.equal(
    merged.resourceDatasets.gas.billingSettlementEntries['2026-04']?.scopes?.default?.fields?.vat,
    '10'
  );
  assert.equal(
    merged.resourceDatasets.gas.billingSettlementEntries['2026-04']?.scopes?.gas_lpg?.fields?.billing_amount,
    '200'
  );
});
