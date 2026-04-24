import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const billingDocumentsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/documents.js'),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBillingDocumentMergeContext(options = {}) {
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
    state: {
      currentMonth: options.currentMonth ?? '2026-04',
      store: {
        billingDocuments: {},
      },
    },
    DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY: 'default',
    BILLING_SETTLEMENT_SCOPE_KEYS: ['default', 'gas_lpg'],
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      return String(value ?? '').trim();
    },
    normalizeBillingSettlementScope(value) {
      return String(value || 'default').trim() || 'default';
    },
    getCurrentBillingSettlementScope() {
      return options.scopeKey ?? 'default';
    },
    getCurrentResourceType() {
      return options.resourceType ?? 'electric';
    },
    supportsScopedBillingSettlement(resourceType = options.resourceType ?? 'electric') {
      return resourceType === 'gas';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
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
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingDocumentsSource, context, {
    filename: 'billing/documents.js',
  });

  return {
    context,
  };
}

test('billing document merge prefers current leaf records for non-scoped resources', () => {
  const { context } = createBillingDocumentMergeContext({
    resourceType: 'electric',
  });

  const merged = context.mergeBillingDocumentsWithPresetLocalStore(
    {
      '2026-04': {
        fileName: 'current.pdf',
        relativePath: 'electric-billing-documents/current.pdf',
        mimeType: 'application/pdf',
      },
    },
    {
      '2026-04': {
        fileName: 'preset.pdf',
        relativePath: 'electric-billing-documents/preset.pdf',
        mimeType: 'application/pdf',
      },
    },
    'electric'
  );

  assert.deepEqual(toPlain(merged), {
    '2026-04': {
      monthValue: '2026-04',
      fileName: '2026-04-electric.pdf',
      relativePath: 'electric-billing-documents/current.pdf',
      mimeType: 'application/pdf',
      savedAt: '',
      base64Data: '',
      documentId: '',
      previewUrl: '',
      downloadUrl: '',
      savedToLocalDirectory: true,
    },
  });
});

test('billing document merge preserves preset scopes and overrides current scopes selectively', () => {
  const { context } = createBillingDocumentMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingDocumentsWithPresetLocalStore(
    {
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
    {
      '2026-04': {
        monthValue: '2026-04',
        scopes: {
          default: {
            fileName: 'preset-default.pdf',
            relativePath: 'gas-billing-documents/preset-default.pdf',
            mimeType: 'application/pdf',
          },
          gas_lpg: {
            fileName: 'preset-lpg.pdf',
            relativePath: 'gas-billing-documents/preset-lpg.pdf',
            mimeType: 'application/pdf',
          },
        },
      },
    },
    'gas'
  );

  assert.deepEqual(toPlain(merged), {
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
  });
});

test('billing document merge keeps months that exist only in preset entries', () => {
  const { context } = createBillingDocumentMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingDocumentsWithPresetLocalStore(
    {},
    {
      '2026-03': {
        monthValue: '2026-03',
        scopes: {
          default: {
            fileName: 'preset-default.pdf',
            relativePath: 'gas-billing-documents/preset-default.pdf',
            mimeType: 'application/pdf',
          },
        },
      },
    },
    'gas'
  );

  assert.equal(merged['2026-03']?.fileName, '2026-03-gas.pdf');
});
