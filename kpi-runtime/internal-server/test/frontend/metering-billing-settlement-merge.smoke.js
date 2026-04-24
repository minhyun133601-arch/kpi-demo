import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const billingSettlementCalculationsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-calculations.js'),
  'utf8'
);
const billingSettlementRecordsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-records.js'),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function createBillingSettlementMergeContext(options = {}) {
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
      GAS: 'gas',
      WASTE: 'waste',
    },
    state: {
      currentMonth: options.currentMonth ?? '2026-04',
      store: {
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
  vm.runInContext(billingSettlementCalculationsSource, context, {
    filename: 'billing/settlement-calculations.js',
  });
  vm.runInContext(billingSettlementRecordsSource, context, {
    filename: 'billing/settlement-records.js',
  });

  return {
    context,
  };
}

test('billing settlement merge preserves preset scopes and overrides current scopes selectively', () => {
  const { context } = createBillingSettlementMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingSettlementEntriesWithPresetLocalStore(
    {
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
    {
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
    }
  );

  assert.deepEqual(toPlain(merged), {
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
  });
});

test('billing settlement merge keeps preset-only months', () => {
  const { context } = createBillingSettlementMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingSettlementEntriesWithPresetLocalStore(
    {},
    {
      '2026-03': {
        fields: {
          usage_fee: '80',
        },
        completed: true,
        updatedAt: '2026-03-01T09:00:00.000Z',
      },
    }
  );

  assert.deepEqual(toPlain(merged), {
    '2026-03': {
      fields: {
        usage_fee: '80',
      },
      completed: true,
      updatedAt: '2026-03-01T09:00:00.000Z',
    },
  });
});

test('billing settlement merge ignores blank current field values', () => {
  const { context } = createBillingSettlementMergeContext({
    resourceType: 'gas',
  });

  const merged = context.mergeBillingSettlementEntriesWithPresetLocalStore(
    {
      '2026-04': {
        fields: {
          usage_fee: '',
          billing_amount: '300',
        },
        completed: false,
        updatedAt: '2026-04-21T09:00:00.000Z',
      },
    },
    {
      '2026-04': {
        fields: {
          usage_fee: '100',
          vat: '10',
        },
        completed: true,
        updatedAt: '2026-04-01T09:00:00.000Z',
      },
    }
  );

  assert.deepEqual(toPlain(merged), {
    '2026-04': {
      monthValue: '2026-04',
      fields: {
        usage_fee: '100',
        vat: '10',
        billing_amount: '300',
      },
      completed: false,
      updatedAt: '2026-04-21T09:00:00.000Z',
    },
  });
});
