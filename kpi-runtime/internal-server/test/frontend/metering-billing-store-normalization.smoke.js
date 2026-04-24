import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

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

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBillingStoreNormalizationContext(options = {}) {
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
    BILLING_SETTLEMENT_FIELD_KEYS: billingSettlementFieldKeys,
    DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY: 'default',
    BILLING_SETTLEMENT_SCOPE_KEYS: ['default', 'gas_lpg'],
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    state: {
      currentMonth: options.currentMonth ?? '2026-04',
      store: {
        billingDocuments: {},
        billingSettlementEntries: {},
      },
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
    },
    getCurrentResourceType() {
      return options.resourceType ?? 'gas';
    },
    getCurrentBillingSettlementScope() {
      return options.scopeKey ?? 'default';
    },
    normalizeBillingSettlementScope(value, fallback = 'default') {
      const normalizedValue = String(value || '').trim();
      return normalizedValue || fallback;
    },
    supportsScopedBillingSettlement(resourceType = options.resourceType ?? 'gas') {
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
      return options.resourceType ?? 'gas';
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
  };

  context.globalThis = context;
  vm.createContext(context);
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

  return {
    context,
  };
}

test('billing store normalization normalizes document and settlement sections together', () => {
  const { context } = createBillingStoreNormalizationContext({
    resourceType: 'gas',
  });

  const normalized = context.normalizeBillingStoreSections(
    {
      billingDocuments: {
        '2026-04': {
          monthValue: '2026-04',
          scopes: {
            default: {
              fileName: 'gas-default.pdf',
              relativePath: 'gas-billing-documents/gas-default.pdf',
              mimeType: 'application/pdf',
            },
          },
        },
      },
      billingSettlementEntries: {
        '2026-04': {
          fields: {
            usage_fee: '100',
            vat: '10',
          },
          completed: true,
          updatedAt: '2026-04-01T09:00:00.000Z',
        },
      },
    },
    'gas'
  );

  assert.deepEqual(toPlain(normalized), {
    billingDocuments: {
      '2026-04': {
        monthValue: '2026-04',
        fileName: '2026-04-gas.pdf',
        relativePath: 'gas-billing-documents/gas-default.pdf',
        mimeType: 'application/pdf',
        savedAt: '',
        base64Data: '',
        documentId: '',
        previewUrl: '',
        downloadUrl: '',
        savedToLocalDirectory: true,
      },
    },
    billingSettlementEntries: {
      '2026-04': {
        monthValue: '2026-04',
        fields: {
          usage_fee: '100',
          vat: '10',
        },
        completed: true,
        updatedAt: '2026-04-01T09:00:00.000Z',
      },
    },
  });
});

test('billing store normalization merges resource billing sections selectively', () => {
  const { context } = createBillingStoreNormalizationContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingResourceStoreSections(
    {
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
    {
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
            gas_lpg: {
              monthValue: '2026-04',
              fields: {
                usage_fee: '120',
                discount: '5',
              },
              completed: true,
              updatedAt: '2026-04-10T09:00:00.000Z',
            },
          },
        },
      },
    },
    'gas'
  );

  assert.deepEqual(toPlain(merged), {
    billingDocuments: {
      '2026-04': {
        monthValue: '2026-04',
        scopes: {
          default: {
            monthValue: '2026-04',
            fileName: '2026-04-gas.pdf',
            relativePath: 'gas-billing-documents/preset-default.pdf',
            mimeType: 'application/pdf',
            savedAt: '',
            base64Data: '',
            documentId: '',
            previewUrl: '',
            downloadUrl: '',
            savedToLocalDirectory: true,
          },
          gas_lpg: {
            monthValue: '2026-04',
            fileName: '2026-04-gas-gas_lpg.pdf',
            relativePath: 'gas-billing-documents/current-lpg.pdf',
            mimeType: 'application/pdf',
            savedAt: '',
            base64Data: '',
            documentId: '',
            previewUrl: '',
            downloadUrl: '',
            savedToLocalDirectory: true,
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
          gas_lpg: {
            monthValue: '2026-04',
            fields: {
              usage_fee: '150',
              discount: '5',
              billing_amount: '200',
            },
            completed: false,
            updatedAt: '2026-04-21T09:00:00.000Z',
          },
        },
        updatedAt: '2026-04-21T09:00:00.000Z',
      },
    },
  });
});
