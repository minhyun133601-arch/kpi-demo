import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const teamSettlementFormActionsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('team-settlement/form-actions.js'),
  'utf8'
);

function createClassList(initialTokens = []) {
  const tokens = new Set(initialTokens);
  return {
    add(...nextTokens) {
      nextTokens.forEach((token) => tokens.add(String(token)));
    },
    remove(...nextTokens) {
      nextTokens.forEach((token) => tokens.delete(String(token)));
    },
    toggle(token, force) {
      const normalizedToken = String(token);
      if (force === true) {
        tokens.add(normalizedToken);
        return true;
      }
      if (force === false) {
        tokens.delete(normalizedToken);
        return false;
      }
      if (tokens.has(normalizedToken)) {
        tokens.delete(normalizedToken);
        return false;
      }
      tokens.add(normalizedToken);
      return true;
    },
    contains(token) {
      return tokens.has(String(token));
    },
  };
}

function createMockInput(fieldKey, value = '') {
  return {
    dataset: {
      billingSettlementField: fieldKey,
    },
    value,
    closest(selector) {
      if (selector === 'input[data-billing-settlement-field]') {
        return this;
      }
      return null;
    },
  };
}

function createMockButton(datasetKey, datasetValue, initialTokens = []) {
  return {
    dataset: {
      [datasetKey]: datasetValue,
    },
    attributes: {},
    classList: createClassList(initialTokens),
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
    closest(selector) {
      if (selector === 'button[data-billing-settlement-formula-toggle]') {
        return Object.prototype.hasOwnProperty.call(this.dataset, 'billingSettlementFormulaToggle')
          ? this
          : null;
      }
      if (selector === '[data-team-settlement-scope-toggle]') {
        return Object.prototype.hasOwnProperty.call(this.dataset, 'teamSettlementScopeToggle')
          ? this
          : null;
      }
      return null;
    },
  };
}

function createMockPanel(fieldKey, initialTokens = ['is-hidden']) {
  return {
    dataset: {
      billingSettlementFormula: fieldKey,
    },
    classList: createClassList(initialTokens),
  };
}

function createTeamSettlementFieldsContainer(options = {}) {
  const formulas = options.formulas || {};
  const formulaButtons = options.formulaButtons || [];
  const scopeToggles = options.scopeToggles || [];
  const autoCalculatedInputs = options.autoCalculatedInputs || {};

  return {
    contains(node) {
      return (
        Object.values(formulas).includes(node) ||
        formulaButtons.includes(node) ||
        scopeToggles.includes(node)
      );
    },
    querySelector(selector) {
      const formulaMatch = selector.match(/^\[data-billing-settlement-formula="([^"]+)"\]$/);
      if (formulaMatch) {
        return formulas[formulaMatch[1]] || null;
      }

      const autoInputMatch = selector.match(
        /^input\[data-billing-settlement-field="([^"]+)"\]$/
      );
      if (autoInputMatch) {
        return autoCalculatedInputs[autoInputMatch[1]] || null;
      }

      return null;
    },
    querySelectorAll(selector) {
      if (selector === '[data-billing-settlement-formula]') {
        return Object.values(formulas);
      }
      if (selector === '[data-billing-settlement-formula-toggle]') {
        return formulaButtons;
      }
      return [];
    },
  };
}

function createTeamSettlementFormActionsContext(options = {}) {
  const calls = {
    alerts: [],
    setBillingSettlementEntryForScope: [],
    deleteBillingSettlementEntryForScope: [],
    updateDirtyState: 0,
    renderTeamTotals: 0,
    renderTeamBoards: 0,
    syncTeamSettlementCompletionButtonState: 0,
    renderTeamMode: 0,
    focusTeamSettlementPrimaryInput: 0,
  };
  const entries = {
    ...(options.entries || {}),
  };
  const state = {
    currentMonth: options.currentMonth ?? '2026-04',
    activeTeamSettlementScope: options.activeTeamSettlementScope ?? 'scope:gas',
    cleanStatusText: '',
  };
  const formulaPanel = createMockPanel('billing_amount');
  const otherFormulaPanel = createMockPanel('vat', []);
  const formulaToggle = createMockButton(
    'billingSettlementFormulaToggle',
    'billing_amount'
  );
  const otherFormulaToggle = createMockButton(
    'billingSettlementFormulaToggle',
    'vat',
    ['is-open']
  );
  otherFormulaToggle.setAttribute('aria-expanded', 'true');
  const scopeToggle = createMockButton('teamSettlementScopeToggle', 'scope:electric');
  const autoCalculatedInput = createMockInput('unit_price', '');
  const teamSettlementFields = createTeamSettlementFieldsContainer({
    formulas: {
      billing_amount: formulaPanel,
      vat: otherFormulaPanel,
    },
    formulaButtons: [formulaToggle, otherFormulaToggle],
    scopeToggles: [scopeToggle],
    autoCalculatedInputs: {
      unit_price: autoCalculatedInput,
    },
  });

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
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    BILLING_SETTLEMENT_FIELD_KEYS: new Set(['power_charge', 'vat', 'unit_price', 'billing_amount']),
    elements: {
      teamSettlementFields,
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      return options.normalizedMonthValue ?? (value ? String(value) : '');
    },
    getCurrentBillingSettlementScope() {
      return state.activeTeamSettlementScope;
    },
    normalizeBillingSettlementScope(scopeKey) {
      return String(scopeKey ?? '').trim();
    },
    getCurrentResourceType() {
      return options.resourceType || 'gas';
    },
    getBillingSettlementResourceType() {
      return options.resourceType || 'gas';
    },
    getBillingSettlementAutoCalculatedFieldKeySet() {
      return new Set(options.autoCalculatedFieldKeys || ['unit_price']);
    },
    getBillingSettlementZeroDefaultFieldKeys() {
      return [...(options.zeroDefaultFieldKeys || ['vat'])];
    },
    getBillingSettlementEntry(monthValue, scopeKey) {
      return entries[`${monthValue}:${scopeKey}`] || null;
    },
    normalizeBillingSettlementStoredValue(_fieldKey, value) {
      return String(value ?? '').trim();
    },
    resolveBillingSettlementFields(nextRawFields) {
      if (typeof options.resolveFields === 'function') {
        return options.resolveFields(nextRawFields);
      }
      return { ...nextRawFields, unit_price: nextRawFields.power_charge ? 'auto:unit' : '' };
    },
    setBillingSettlementEntryForScope(monthValue, entry, scopeKey) {
      calls.setBillingSettlementEntryForScope.push({ monthValue, entry, scopeKey });
      entries[`${monthValue}:${scopeKey}`] = entry;
    },
    deleteBillingSettlementEntryForScope(monthValue, scopeKey) {
      calls.deleteBillingSettlementEntryForScope.push({ monthValue, scopeKey });
      delete entries[`${monthValue}:${scopeKey}`];
    },
    updateDirtyState() {
      calls.updateDirtyState += 1;
    },
    formatBillingSettlementFieldDisplayValue(fieldKey, value, _resourceType, _scopeKey, isAuto) {
      return `${isAuto ? 'auto' : 'fmt'}:${fieldKey}:${value}`;
    },
    renderTeamTotals() {
      calls.renderTeamTotals += 1;
    },
    renderTeamBoards() {
      calls.renderTeamBoards += 1;
    },
    syncTeamSettlementCompletionButtonState() {
      calls.syncTeamSettlementCompletionButtonState += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    focusTeamSettlementPrimaryInput() {
      calls.focusTeamSettlementPrimaryInput += 1;
    },
    getBillingSettlementFields() {
      return options.fields || [
        { key: 'power_charge', label: '사용요금' },
        { key: 'vat', label: '부가세' },
      ];
    },
    getCurrentMode() {
      return options.currentMode || 'team';
    },
    getBillingSettlementCompletionState() {
      return (
        options.completionState || {
          entry: { fields: { power_charge: '100' }, completed: false },
          missingFieldKeys: [],
          fields: { power_charge: '100' },
        }
      );
    },
    window: {
      alert(message) {
        calls.alerts.push(String(message));
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamSettlementFormActionsSource, context, {
    filename: 'team-settlement/form-actions.js',
  });

  return {
    context,
    calls,
    state,
    entries,
    formulaPanel,
    otherFormulaPanel,
    formulaToggle,
    otherFormulaToggle,
    scopeToggle,
    autoCalculatedInput,
  };
}

test('team settlement form actions update manual input and derived auto-calculated fields', () => {
  const { context, calls, state, autoCalculatedInput } = createTeamSettlementFormActionsContext({
    entries: {
      '2026-04:scope:gas': {
        fields: { vat: '1' },
        completed: true,
      },
    },
  });
  const input = createMockInput('power_charge', '123');

  context.handleTeamSettlementFieldInput({ target: input });

  assert.equal(calls.setBillingSettlementEntryForScope.length, 1);
  assert.equal(calls.deleteBillingSettlementEntryForScope.length, 0);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamTotals, 1);
  assert.equal(calls.renderTeamBoards, 1);
  assert.equal(calls.syncTeamSettlementCompletionButtonState, 1);
  assert.equal(state.cleanStatusText, '정산 값을 수정했습니다. 저장해 주세요.');
  assert.equal(input.value, 'fmt:power_charge:123');
  assert.equal(autoCalculatedInput.value, 'auto:unit_price:auto:unit');
  assert.equal(calls.setBillingSettlementEntryForScope[0].entry.completed, false);
});

test('team settlement form actions preserve auto-calculated inputs as read-only display values', () => {
  const { context } = createTeamSettlementFormActionsContext({
    entries: {
      '2026-04:scope:gas': {
        fields: { unit_price: '777' },
      },
    },
  });
  const input = createMockInput('unit_price', 'manual');

  context.handleTeamSettlementFieldInput({ target: input });

  assert.equal(input.value, '777');
});

test('team settlement form actions delete empty entries when no fields remain', () => {
  const { context, calls } = createTeamSettlementFormActionsContext({
    entries: {
      '2026-04:scope:gas': {
        fields: { power_charge: '9' },
      },
    },
    resolveFields() {
      return {};
    },
  });
  const input = createMockInput('power_charge', '');

  context.handleTeamSettlementFieldInput({ target: input });

  assert.equal(calls.setBillingSettlementEntryForScope.length, 0);
  assert.deepEqual(calls.deleteBillingSettlementEntryForScope, [
    { monthValue: '2026-04', scopeKey: 'scope:gas' },
  ]);
  assert.equal(input.value, '');
});

test('team settlement form actions switch scope from the field header toggle', () => {
  const { context, calls, state, scopeToggle } = createTeamSettlementFormActionsContext();

  context.handleTeamSettlementFieldClick({
    target: scopeToggle,
    preventDefault() {},
  });

  assert.equal(state.activeTeamSettlementScope, 'scope:electric');
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(calls.focusTeamSettlementPrimaryInput, 1);
});

test('team settlement form actions toggle one formula panel at a time', () => {
  const { context, formulaPanel, otherFormulaPanel, formulaToggle, otherFormulaToggle } =
    createTeamSettlementFormActionsContext();

  context.handleTeamSettlementFieldClick({
    target: formulaToggle,
    preventDefault() {},
  });

  assert.equal(formulaPanel.classList.contains('is-hidden'), false);
  assert.equal(otherFormulaPanel.classList.contains('is-hidden'), true);
  assert.equal(formulaToggle.classList.contains('is-open'), true);
  assert.equal(formulaToggle.getAttribute('aria-expanded'), 'true');
  assert.equal(otherFormulaToggle.classList.contains('is-open'), false);
  assert.equal(otherFormulaToggle.getAttribute('aria-expanded'), 'false');
});

test('team settlement form actions alert when completion is attempted without settlement fields', () => {
  const { context, calls } = createTeamSettlementFormActionsContext({
    completionState: {
      entry: { fields: {} },
      missingFieldKeys: [],
      fields: {},
    },
  });

  context.handleTeamSettlementCompleteClick();

  assert.deepEqual(calls.alerts, ['정산값을 먼저 입력해 주세요']);
});

test('team settlement form actions alert with missing labels before completing', () => {
  const { context, calls } = createTeamSettlementFormActionsContext({
    completionState: {
      entry: { fields: { power_charge: '100' }, completed: false },
      missingFieldKeys: ['vat'],
      fields: { power_charge: '100' },
    },
  });

  context.handleTeamSettlementCompleteClick();

  assert.deepEqual(calls.alerts, ['다음 정산 항목을 확인해 주세요.\n부가세']);
  assert.equal(calls.setBillingSettlementEntryForScope.length, 0);
});

test('team settlement form actions mark settlement complete and rerender the team mode', () => {
  const { context, calls, state } = createTeamSettlementFormActionsContext({
    completionState: {
      entry: { fields: { power_charge: '100' }, completed: false },
      missingFieldKeys: [],
      fields: { power_charge: '100', unit_price: '25' },
    },
  });

  context.handleTeamSettlementCompleteClick();

  assert.equal(calls.setBillingSettlementEntryForScope.length, 1);
  assert.equal(calls.setBillingSettlementEntryForScope[0].entry.completed, true);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(state.cleanStatusText, '정산 완료 상태를 반영했습니다. 저장해 주세요.');
});

test('team settlement form actions clear completion and rerender the team mode', () => {
  const { context, calls, state } = createTeamSettlementFormActionsContext({
    completionState: {
      entry: { fields: { power_charge: '100' }, completed: true },
      missingFieldKeys: [],
      fields: { power_charge: '100' },
    },
  });

  context.handleTeamSettlementCompleteClick();

  assert.equal(calls.setBillingSettlementEntryForScope.length, 1);
  assert.equal(calls.setBillingSettlementEntryForScope[0].entry.completed, false);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(state.cleanStatusText, '정산 완료 해제를 반영했습니다. 저장해 주세요.');
});
