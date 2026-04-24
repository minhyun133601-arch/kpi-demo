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

function createBillingDocumentMutationsContext(options = {}) {
  const state = {
    currentMonth: options.currentMonth ?? '2026-04',
    store: {
      billingDocuments: toPlain(options.initialBillingDocuments || {}),
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
    Promise,
    RegExp,
    state,
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
    buildBillingDocumentFileName() {
      return 'unused.pdf';
    },
    getBillingDocumentFileNameFromPath(relativePath = '') {
      return String(relativePath).split('/').pop() || '';
    },
    normalizeBillingDocumentRelativePath(relativePath = '') {
      return String(relativePath || '').trim();
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingDocumentsSource, context, {
    filename: 'billing/documents.js',
  });

  return {
    context,
    state,
  };
}

test('billing document mutations store a leaf month record for non-scoped resources', () => {
  const { context, state } = createBillingDocumentMutationsContext({
    resourceType: 'electric',
  });

  context.setBillingDocumentForScope(
    '2026-04',
    {
      fileName: 'electric.pdf',
      relativePath: 'electric-billing-documents/electric.pdf',
      mimeType: 'application/pdf',
    },
    'default',
    'electric'
  );

  assert.deepEqual(toPlain(state.store.billingDocuments), {
    '2026-04': {
      fileName: 'electric.pdf',
      relativePath: 'electric-billing-documents/electric.pdf',
      mimeType: 'application/pdf',
    },
  });
});

test('billing document mutations store a scoped month record for scoped resources', () => {
  const { context, state } = createBillingDocumentMutationsContext({
    resourceType: 'gas',
  });

  context.setBillingDocumentForScope(
    '2026-04',
    {
      fileName: 'lpg.pdf',
      relativePath: 'gas-billing-documents/lpg.pdf',
      mimeType: 'application/pdf',
    },
    'gas_lpg',
    'gas'
  );

  assert.deepEqual(toPlain(state.store.billingDocuments), {
    '2026-04': {
      monthValue: '2026-04',
      scopes: {
        gas_lpg: {
          fileName: 'lpg.pdf',
          relativePath: 'gas-billing-documents/lpg.pdf',
          mimeType: 'application/pdf',
        },
      },
    },
  });
});

test('billing document mutations delete one scope and preserve the month record', () => {
  const { context, state } = createBillingDocumentMutationsContext({
    resourceType: 'gas',
    initialBillingDocuments: {
      '2026-04': {
        monthValue: '2026-04',
        scopes: {
          default: {
            fileName: 'default.pdf',
            relativePath: 'gas-billing-documents/default.pdf',
            mimeType: 'application/pdf',
          },
          gas_lpg: {
            fileName: 'lpg.pdf',
            relativePath: 'gas-billing-documents/lpg.pdf',
            mimeType: 'application/pdf',
          },
        },
      },
    },
  });

  context.deleteBillingDocumentForScope('2026-04', 'default', 'gas');

  assert.deepEqual(toPlain(state.store.billingDocuments), {
    '2026-04': {
      monthValue: '2026-04',
      scopes: {
        gas_lpg: {
          fileName: 'lpg.pdf',
          relativePath: 'gas-billing-documents/lpg.pdf',
          mimeType: 'application/pdf',
        },
      },
    },
  });
});

test('billing document mutations delete the month when the last scope is removed', () => {
  const { context, state } = createBillingDocumentMutationsContext({
    resourceType: 'electric',
    initialBillingDocuments: {
      '2026-04': {
        fileName: 'electric.pdf',
        relativePath: 'electric-billing-documents/electric.pdf',
        mimeType: 'application/pdf',
      },
    },
  });

  context.deleteBillingDocumentForScope('2026-04', 'default', 'electric');

  assert.deepEqual(toPlain(state.store.billingDocuments), {});
});
