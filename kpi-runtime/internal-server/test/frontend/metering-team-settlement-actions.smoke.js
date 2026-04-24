import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const teamSettlementActionsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('team-settlement/actions.js'),
  'utf8'
);

function createFocusableElement() {
  return {
    focusCount: 0,
    focus() {
      this.focusCount += 1;
    },
  };
}

function createTeamSettlementActionsContext(options = {}) {
  const calls = {
    alerts: [],
    syncEquipmentFullscreenUI: 0,
    renderTeamMode: 0,
    timeouts: [],
  };
  const editableField = createFocusableElement();
  const attachButton = createFocusableElement();
  const teamSettlementBtn = createFocusableElement();
  const state = {
    currentMonth: options.currentMonth ?? '2026-04',
    isTeamSettlementPanelOpen: Boolean(options.isTeamSettlementPanelOpen),
  };
  const hasTotalPowerMonthlyUsage = Object.prototype.hasOwnProperty.call(
    options,
    'totalPowerMonthlyUsage'
  );
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
    elements: {
      teamSettlementFields: {
        querySelector(selector) {
          if (selector === 'input[data-billing-settlement-field]:not([readonly])') {
            return options.hasEditableField === false ? null : editableField;
          }
          return null;
        },
      },
      teamSettlementAttachBtn: attachButton,
      teamSettlementBtn,
    },
    getCurrentMode() {
      return options.currentMode || 'team';
    },
    supportsBillingSettlementForCurrentResource() {
      return options.supportsSettlement ?? true;
    },
    normalizeMonthValue(value) {
      return options.normalizedMonthValue ?? (value ? String(value) : '');
    },
    isElectricResourceType() {
      return options.resourceType !== 'gas';
    },
    calculateTotalPowerMonthlyUsage() {
      return hasTotalPowerMonthlyUsage ? options.totalPowerMonthlyUsage : 100;
    },
    syncEquipmentFullscreenUI() {
      calls.syncEquipmentFullscreenUI += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    window: {
      alert(message) {
        calls.alerts.push(String(message));
      },
      setTimeout(handler, delay) {
        calls.timeouts.push(delay);
        handler();
        return 1;
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamSettlementActionsSource, context, {
    filename: 'team-settlement/actions.js',
  });

  return {
    context,
    calls,
    state,
    editableField,
    attachButton,
    teamSettlementBtn,
  };
}

test('team settlement actions exits when settlement is not available', async () => {
  const { context, calls, state } = createTeamSettlementActionsContext({
    supportsSettlement: false,
  });

  await context.handleTeamSettlementClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.equal(calls.renderTeamMode, 0);
  assert.deepEqual(calls.alerts, []);
});

test('team settlement actions require a valid month before opening the panel', async () => {
  const { context, calls, state } = createTeamSettlementActionsContext({
    normalizedMonthValue: '',
  });

  await context.handleTeamSettlementClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.deepEqual(calls.alerts, ['기입 년월을 먼저 선택해 주세요.']);
  assert.equal(calls.syncEquipmentFullscreenUI, 1);
});

test('team settlement actions require total power for electric settlement', async () => {
  const { context, calls, state } = createTeamSettlementActionsContext({
    resourceType: 'electric',
    totalPowerMonthlyUsage: null,
  });

  await context.handleTeamSettlementClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.deepEqual(calls.alerts, ['전력총량이 계산되어야 정산을 열 수 있습니다.']);
  assert.equal(calls.syncEquipmentFullscreenUI, 1);
});

test('team settlement actions open the panel and focus the first editable field', async () => {
  const { context, calls, state, editableField, attachButton } = createTeamSettlementActionsContext();

  await context.handleTeamSettlementClick();

  assert.equal(state.isTeamSettlementPanelOpen, true);
  assert.equal(calls.renderTeamMode, 1);
  assert.deepEqual(calls.timeouts, [0]);
  assert.equal(editableField.focusCount, 1);
  assert.equal(attachButton.focusCount, 0);
});

test('team settlement actions close the panel and focus the settlement toggle button', async () => {
  const { context, calls, state, teamSettlementBtn } = createTeamSettlementActionsContext({
    isTeamSettlementPanelOpen: true,
  });

  await context.handleTeamSettlementClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(teamSettlementBtn.focusCount, 1);
});

test('team settlement actions fall back to the attach button when no editable field exists', () => {
  const { context, calls, editableField, attachButton } = createTeamSettlementActionsContext({
    hasEditableField: false,
  });

  context.focusTeamSettlementPrimaryInput();

  assert.deepEqual(calls.timeouts, [0]);
  assert.equal(editableField.focusCount, 0);
  assert.equal(attachButton.focusCount, 1);
});
