import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const billingSettlementCalculationsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-calculations.js'),
  'utf8'
);
const billingSettlementSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement.js'),
  'utf8'
);
const billingSettlementRecordsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('billing/settlement-records.js'),
  'utf8'
);

function toPlain(value) {
  return JSON.parse(JSON.stringify(value));
}

function formatLocaleNumber(value, options = {}) {
  return Number(value).toLocaleString('en-US', options);
}

function createBillingSettlementEntries(options = {}, currentMonth = '2026-04') {
  if (Object.prototype.hasOwnProperty.call(options, 'billingSettlementEntries')) {
    return options.billingSettlementEntries || {};
  }

  if (options.entry == null) {
    return {};
  }

  return {
    [currentMonth]: options.entry,
  };
}

function createBillingSettlementContext(options = {}) {
  const resourceType = options.resourceType || 'electric';
  const usageBaseValue =
    Object.prototype.hasOwnProperty.call(options, 'usageBaseValue') ? options.usageBaseValue : 10;
  const currentScopeKey = options.currentScopeKey || 'default';
  const currentMonth = options.currentMonth || '2026-04';
  const billingSettlementEntries = createBillingSettlementEntries(options, currentMonth);
  const billingSettlementFieldKeys = new Set([
    'base_charge',
    'power_charge',
    'vat',
    'electric_power_fund',
    'tv_reception_fee',
    'rounding_adjustment',
    'electricity_charge_total',
    'calorific_value',
    'billed_quantity_mj',
    'unit_price',
    'billing_amount',
    'usage_fee',
    'discount',
  ]);

  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    RegExp,
    Promise,
    DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY: 'default',
    BILLING_SETTLEMENT_SCOPE_KEYS: ['default', 'plantB', 'gas_lpg'],
    BILLING_SETTLEMENT_FIELD_KEYS: billingSettlementFieldKeys,
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
    },
    BILLING_SETTLEMENT_TOTAL_COMPONENTS: [
      { key: 'energy_charge', sign: 1 },
      { key: 'fuel_adjustment', sign: 1 },
    ],
    GAS_LPG_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS: [
      { key: 'power_charge', sign: 1 },
      { key: 'vat', sign: 1 },
    ],
    GAS_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS: [
      { key: 'power_charge', sign: 1 },
      { key: 'vat', sign: 1 },
      { key: 'rounding_adjustment', sign: -1 },
    ],
    ELECTRIC_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS: [
      { key: 'electricity_charge_total', sign: 1 },
      { key: 'base_charge', sign: 1 },
      { key: 'vat', sign: 1 },
      { key: 'electric_power_fund', sign: 1 },
      { key: 'tv_reception_fee', sign: 1 },
      { key: 'rounding_adjustment', sign: -1 },
    ],
    state: {
      currentMonth,
      store: {
        billingSettlementEntries: billingSettlementEntries,
      },
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      const normalizedValue = String(value ?? '').trim();
      return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
    },
    countPlainObjectKeys(value) {
      return context.isPlainObject(value) ? Object.keys(value).length : 0;
    },
    getCurrentResourceType() {
      return resourceType;
    },
    getCurrentBillingSettlementScope() {
      return currentScopeKey;
    },
    normalizeBillingSettlementScope(scopeKey, fallbackScope = currentScopeKey) {
      const normalizedScopeKey = String(scopeKey ?? '').trim();
      return normalizedScopeKey || fallbackScope;
    },
    normalizeResourceType(value) {
      const normalizedValue = String(value ?? '').trim();
      return normalizedValue || resourceType;
    },
    isGasBillingSettlementScope(scopeKey) {
      return scopeKey === 'gas_lpg' || options.resourceTypeByScope?.[scopeKey] === 'gas';
    },
    isWasteBillingSettlementScope(scopeKey) {
      return options.resourceTypeByScope?.[scopeKey] === 'waste';
    },
    isGasLpgBillingSettlementScope(scopeKey) {
      return scopeKey === 'gas_lpg';
    },
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'plantB',
    GAS_SETTLEMENT_SCOPE_TEAM_KEYS: options.gasSettlementScopeTeamKeys || {
      default: ['gas_team'],
    },
    TEAM_01_01_KEY: 'team_01_01',
    getDirectTeamMonthlyUsage(
      teamKey,
      monthValue = currentMonth,
      nextResourceType = resourceType
    ) {
      const key = `${teamKey}:${monthValue}:${nextResourceType}`;
      if (
        options.directTeamUsageMap &&
        Object.prototype.hasOwnProperty.call(options.directTeamUsageMap, key)
      ) {
        return options.directTeamUsageMap[key];
      }

      return usageBaseValue;
    },
    getTeamBoardMonthlyUsage(teamKey, { monthValue = currentMonth } = {}) {
      const key = `${teamKey}:${monthValue}`;
      if (
        options.teamBoardMonthlyUsageMap &&
        Object.prototype.hasOwnProperty.call(options.teamBoardMonthlyUsageMap, key)
      ) {
        return options.teamBoardMonthlyUsageMap[key];
      }

      return teamKey === 'gas_team' ? usageBaseValue : null;
    },
    calculateWasteSettlementScopeMonthlyUsage(scopeKey, monthValue = currentMonth) {
      const key = `${scopeKey}:${monthValue}`;
      if (
        options.wasteUsageBaseValueMap &&
        Object.prototype.hasOwnProperty.call(options.wasteUsageBaseValueMap, key)
      ) {
        return options.wasteUsageBaseValueMap[key];
      }

      return Object.prototype.hasOwnProperty.call(options, 'wasteUsageBaseValue')
        ? options.wasteUsageBaseValue
        : usageBaseValue;
    },
    calculateTotalPowerMonthlyUsageWindow() {
      return {
        value: Object.prototype.hasOwnProperty.call(options, 'totalPowerMonthlyUsageWindowValue')
          ? options.totalPowerMonthlyUsageWindowValue
          : usageBaseValue,
      };
    },
    roundCalculatedUsage(value) {
      return Math.round(value);
    },
    formatFixedDecimalNumber(value, digits) {
      return formatLocaleNumber(value, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    },
    formatNumber(value) {
      return formatLocaleNumber(value, {
        maximumFractionDigits: 3,
      });
    },
    formatWholeNumber(value) {
      return formatLocaleNumber(Math.round(value), {
        maximumFractionDigits: 0,
      });
    },
    getBillingSettlementFields(nextResourceType = resourceType, scopeKey = currentScopeKey) {
      if (options.fields) {
        return options.fields;
      }

      if (nextResourceType === 'gas' && scopeKey === 'gas_lpg') {
        return [
          { key: 'power_charge' },
          { key: 'vat' },
          { key: 'unit_price' },
          { key: 'billing_amount' },
        ];
      }

      if (nextResourceType === 'gas' && scopeKey !== 'gas_lpg') {
        return [
          { key: 'power_charge' },
          { key: 'vat' },
          { key: 'rounding_adjustment' },
          { key: 'calorific_value' },
          { key: 'billed_quantity_mj' },
          { key: 'unit_price' },
          { key: 'billing_amount' },
        ];
      }

      if (nextResourceType === 'electric') {
        return [
          { key: 'base_charge' },
          { key: 'vat' },
          { key: 'electric_power_fund' },
          { key: 'tv_reception_fee' },
          { key: 'rounding_adjustment' },
          { key: 'electricity_charge_total' },
          { key: 'unit_price' },
          { key: 'billing_amount' },
        ];
      }

      return [
        { key: 'usage_fee' },
        { key: 'discount' },
        { key: 'unit_price' },
        { key: 'billing_amount' },
      ];
    },
    getBillingSettlementAutoCalculatedFieldKeySet(
      nextResourceType = resourceType,
      scopeKey = currentScopeKey
    ) {
      if (options.autoCalculatedFieldKeys) {
        return new Set(options.autoCalculatedFieldKeys);
      }

      if (nextResourceType === 'gas' && scopeKey === 'gas_lpg') {
        return new Set(['unit_price', 'billing_amount']);
      }

      if (nextResourceType === 'gas' && scopeKey !== 'gas_lpg') {
        return new Set(['billed_quantity_mj', 'unit_price', 'billing_amount']);
      }

      if (nextResourceType === 'electric') {
        return new Set(['electricity_charge_total', 'unit_price', 'billing_amount']);
      }

      return new Set(['unit_price', 'billing_amount']);
    },
    getBillingSettlementZeroDefaultFieldKeys(
      nextResourceType = resourceType,
      scopeKey = currentScopeKey
    ) {
      if (options.zeroDefaultFieldKeys) {
        return [...options.zeroDefaultFieldKeys];
      }

      if (nextResourceType === 'gas' && scopeKey !== 'gas_lpg') {
        return ['vat'];
      }

      if (nextResourceType === 'electric') {
        return ['vat', 'electric_power_fund', 'tv_reception_fee', 'rounding_adjustment'];
      }

      return [];
    },
    getBillingSettlementManualFieldKeys(
      nextResourceType = resourceType,
      scopeKey = currentScopeKey
    ) {
      if (options.manualFieldKeys) {
        return [...options.manualFieldKeys];
      }

      if (nextResourceType === 'gas' && scopeKey === 'gas_lpg') {
        return ['power_charge', 'vat'];
      }

      if (nextResourceType === 'gas' && scopeKey !== 'gas_lpg') {
        return ['power_charge', 'calorific_value', 'vat'];
      }

      return ['usage_fee'];
    },
    getWasteBillingSettlementBillingAmountComponents() {
      return [
        { key: 'usage_fee', sign: 1 },
        { key: 'discount', sign: -1 },
      ];
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
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(billingSettlementCalculationsSource, context, {
    filename: 'billing/settlement-calculations.js',
  });
  vm.runInContext(billingSettlementSource, context, {
    filename: 'billing/settlement.js',
  });
  vm.runInContext(billingSettlementRecordsSource, context, {
    filename: 'billing/settlement-records.js',
  });

  return { context };
}

test('billing settlement normalizes gas rounding adjustment before storing', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'gas',
  });

  assert.equal(
    context.normalizeBillingSettlementStoredValue('rounding_adjustment', '-12', 'gas', 'default'),
    '12'
  );
});

test('billing settlement derives electricity charge total from billing amount when needed', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'electric',
  });

  const derived = context.resolveBillingSettlementElectricityChargeTotalValue({
    billing_amount: '200',
    base_charge: '50',
    vat: '10',
    electric_power_fund: '5',
    tv_reception_fee: '5',
    rounding_adjustment: '2',
  });

  assert.equal(derived, 132);
});

test('billing settlement resolves gas fields with calculated quantity, unit price, and billing amount', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'gas',
    usageBaseValue: 10,
  });

  const fields = toPlain(
    context.resolveBillingSettlementFields(
      {
        power_charge: '100',
        vat: '',
        rounding_adjustment: '-2',
        calorific_value: '43.2106',
      },
      '2026-04',
      'default'
    )
  );

  assert.deepEqual(fields, {
    power_charge: '100',
    vat: '0',
    rounding_adjustment: '2',
    calorific_value: '43.211',
    billed_quantity_mj: '432.110',
    unit_price: '10',
    billing_amount: '98',
  });
});

test('billing settlement completion state excludes calorific value when gas usage base is missing', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'gas',
    usageBaseValue: null,
    entry: {
      fields: {
        power_charge: '100',
      },
    },
  });

  const completionState = toPlain(
    context.getBillingSettlementCompletionState('2026-04', 'default')
  );

  assert.deepEqual(completionState.missingFieldKeys, []);
  assert.equal(completionState.fields.vat, '0');
});

test('billing settlement completion state keeps calorific value required when gas usage base exists', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'gas',
    usageBaseValue: 10,
    entry: null,
  });

  const completionState = toPlain(
    context.getBillingSettlementCompletionState('2026-04', 'default')
  );

  assert.deepEqual(completionState.missingFieldKeys, [
    'power_charge',
    'calorific_value',
    'vat',
  ]);
});

test('billing settlement support resolves resource scope and numeric helpers from stored entries', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'electric',
    usageBaseValue: 25,
    resourceTypeByScope: {
      gas_lpg: 'gas',
      waste_scope: 'waste',
    },
    entry: {
      fields: {
        energy_charge: '100',
        fuel_adjustment: '0',
        base_charge: '120',
      },
      completed: true,
    },
    fields: [
      { key: 'energy_charge' },
      { key: 'fuel_adjustment' },
      { key: 'base_charge' },
      { key: 'unit_price' },
    ],
    manualFieldKeys: ['energy_charge', 'fuel_adjustment', 'base_charge'],
    autoCalculatedFieldKeys: ['unit_price'],
    zeroDefaultFieldKeys: [],
  });

  assert.equal(context.getBillingSettlementResourceType('gas_lpg', 'electric'), 'gas');
  assert.equal(context.getBillingSettlementResourceType('waste_scope', 'electric'), 'waste');
  assert.equal(context.getBillingSettlementUsageBaseValue('2026-04', 'default'), 25);
  assert.equal(context.getBillingSettlementNumericField('base_charge', '2026-04', 'default'), 120);
  assert.equal(context.getBillingSettlementUnitPrice('2026-04', 'default'), 4);
  assert.equal(context.getBillingSettlementBaseCharge('2026-04'), 120);
  assert.equal(context.isBillingSettlementCompleted('2026-04', 'default'), true);
});

test('billing settlement records normalize scoped entries and expose the month range', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'electric',
    currentScopeKey: 'plantB',
    resourceTypeByScope: {
      plantB: 'electric',
    },
    billingSettlementEntries: {
      '2026-04': {
        scopes: {
          default: {
            fields: {
              base_charge: '100',
              vat: '10',
              electric_power_fund: '5',
              tv_reception_fee: '5',
              rounding_adjustment: '2',
              billing_amount: '200',
            },
          },
          plantB: {
            fields: {
              base_charge: '120',
              vat: '12',
              electric_power_fund: '6',
              tv_reception_fee: '6',
              rounding_adjustment: '3',
              billing_amount: '250',
            },
          },
        },
      },
      '2026-05': {
        fields: {
          base_charge: '90',
          vat: '9',
          electric_power_fund: '4',
          tv_reception_fee: '4',
          rounding_adjustment: '1',
          billing_amount: '180',
        },
      },
    },
  });

  const entry = toPlain(context.getBillingSettlementEntry('2026-04', 'plantB'));

  assert.deepEqual(entry.fields, {
    base_charge: '120',
    vat: '12',
    electric_power_fund: '6',
    tv_reception_fee: '6',
    rounding_adjustment: '3',
    billing_amount: '250',
  });
  assert.equal(context.getBillingSettlementAvailableMonthRangeText(), '2026-04~2026-05');
});

test('billing settlement records add and remove scoped entries through the store boundary', () => {
  const { context } = createBillingSettlementContext({
    resourceType: 'electric',
    currentScopeKey: 'plantB',
    resourceTypeByScope: {
      plantB: 'electric',
    },
    billingSettlementEntries: {},
  });

  context.setBillingSettlementEntryForScope(
    '2026-04',
    {
      fields: {
        base_charge: '100',
        vat: '10',
        electric_power_fund: '5',
        tv_reception_fee: '5',
        rounding_adjustment: '2',
        billing_amount: '200',
      },
      updatedAt: '2026-04-30T00:00:00.000Z',
    },
    'plantB'
  );

  assert.deepEqual(toPlain(context.state.store.billingSettlementEntries['2026-04']), {
    monthValue: '2026-04',
    scopes: {
      plantB: {
        fields: {
          base_charge: '100',
          vat: '10',
          electric_power_fund: '5',
          tv_reception_fee: '5',
          rounding_adjustment: '2',
          billing_amount: '200',
        },
        updatedAt: '2026-04-30T00:00:00.000Z',
      },
    },
    updatedAt: '2026-04-30T00:00:00.000Z',
  });

  context.deleteBillingSettlementEntryForScope('2026-04', 'plantB');

  assert.equal(context.state.store.billingSettlementEntries['2026-04'], undefined);
  assert.equal(context.getBillingSettlementAvailableMonthRangeText(), '');
});
