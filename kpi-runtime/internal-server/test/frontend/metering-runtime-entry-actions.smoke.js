import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeEntryActionsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/entry-actions.js'),
  'utf8'
);

function createMockInput(fieldKey, value = '') {
  return {
    dataset: {
      fieldKey,
      lastValue: value,
    },
    value,
    placeholder: '',
  };
}

function createRuntimeEntryActionsContext(options = {}) {
  const calls = {
    clearEquipmentLocalAutosaveTimer: 0,
    setCurrentEntryDayStatus: [],
    syncAutoCalculatedEquipmentInputs: 0,
    syncEquipmentRestIndicators: 0,
    syncEquipmentReadingValidationStates: 0,
    persistStore: [],
    loadEntryToForm: [],
    renderCalendar: 0,
    renderSummary: 0,
    renderTeamMode: 0,
    confirm: [],
  };
  const equipmentInputs = options.equipmentInputs || [
    createMockInput('field_01', '12'),
    createMockInput('field_02', '24'),
  ];
  const state = {
    selectedDate: options.selectedDate || '2026-04-01',
    cleanStatusText: '',
    store: {
      equipmentEntries: {
        ...(options.equipmentEntries || {}),
      },
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
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getEquipmentInputs() {
      return equipmentInputs;
    },
    getEquipmentInputPlaceholder(fieldKey) {
      return `placeholder:${fieldKey}`;
    },
    setCurrentEntryDayStatus(status) {
      calls.setCurrentEntryDayStatus.push(status);
    },
    syncAutoCalculatedEquipmentInputs() {
      calls.syncAutoCalculatedEquipmentInputs += 1;
    },
    syncEquipmentRestIndicators() {
      calls.syncEquipmentRestIndicators += 1;
    },
    syncEquipmentReadingValidationStates() {
      calls.syncEquipmentReadingValidationStates += 1;
    },
    readEquipmentFormData() {
      return options.formData || { values: {} };
    },
    getCurrentEntryDayStatus() {
      return options.currentEntryDayStatus || '';
    },
    clearEquipmentLocalAutosaveTimer() {
      calls.clearEquipmentLocalAutosaveTimer += 1;
    },
    persistStore(payload) {
      calls.persistStore.push(payload ?? null);
    },
    loadEntryToForm(entry) {
      calls.loadEntryToForm.push(entry);
    },
    renderCalendar() {
      calls.renderCalendar += 1;
    },
    renderSummary() {
      calls.renderSummary += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    window: {
      confirm(message) {
        calls.confirm.push(message);
        return options.confirmResult ?? true;
      },
    },
  };

  if (!state.store.equipmentEntries[state.selectedDate] && options.storedEntry) {
    state.store.equipmentEntries[state.selectedDate] = options.storedEntry;
  }

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeEntryActionsSource, context, {
    filename: 'runtime/entry-actions.js',
  });

  return {
    context,
    calls,
    state,
    equipmentInputs,
  };
}

test('runtime entry actions resets the equipment form and syncs derived UI state', () => {
  const { context, calls, equipmentInputs } = createRuntimeEntryActionsContext();

  context.resetEquipmentForm();

  assert.deepEqual(
    equipmentInputs.map((input) => ({
      value: input.value,
      lastValue: input.dataset.lastValue,
      placeholder: input.placeholder,
    })),
    [
      { value: '', lastValue: '', placeholder: 'placeholder:field_01' },
      { value: '', lastValue: '', placeholder: 'placeholder:field_02' },
    ]
  );
  assert.deepEqual(calls.setCurrentEntryDayStatus, ['']);
  assert.equal(calls.syncAutoCalculatedEquipmentInputs, 1);
  assert.equal(calls.syncEquipmentRestIndicators, 1);
  assert.equal(calls.syncEquipmentReadingValidationStates, 1);
});

test('runtime entry actions detects whether the current equipment form has any input', () => {
  const withValues = createRuntimeEntryActionsContext({
    formData: { values: { field_01: '12' } },
  });
  assert.equal(withValues.context.equipmentHasAnyInput(), true);

  const withDayStatus = createRuntimeEntryActionsContext({
    formData: { values: {} },
    currentEntryDayStatus: 'done',
  });
  assert.equal(withDayStatus.context.equipmentHasAnyInput(), true);

  const empty = createRuntimeEntryActionsContext({
    formData: { values: {} },
    currentEntryDayStatus: '',
  });
  assert.equal(empty.context.equipmentHasAnyInput(), false);
});

test('runtime entry actions clears the current entry and refreshes dependent views', () => {
  const { context, calls, state } = createRuntimeEntryActionsContext({
    storedEntry: {
      values: { field_01: '12' },
    },
  });

  context.handleClearCurrentEntry();

  assert.equal(state.store.equipmentEntries['2026-04-01'], undefined);
  assert.equal(state.cleanStatusText, '선택한 날짜 입력을 삭제했습니다.');
  assert.equal(calls.clearEquipmentLocalAutosaveTimer, 1);
  assert.deepEqual(calls.confirm, ['삭제하시겠습니까?']);
  assert.deepEqual(calls.persistStore, [null]);
  assert.deepEqual(calls.loadEntryToForm, [null]);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderSummary, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.deepEqual(calls.setCurrentEntryDayStatus, ['', '']);
});

test('runtime entry actions does not clear when nothing is stored and the form is empty', () => {
  const { context, calls, state } = createRuntimeEntryActionsContext({
    equipmentEntries: {},
    formData: { values: {} },
    currentEntryDayStatus: '',
  });

  context.handleClearCurrentEntry();

  assert.equal(calls.clearEquipmentLocalAutosaveTimer, 0);
  assert.deepEqual(calls.confirm, []);
  assert.deepEqual(calls.persistStore, []);
  assert.equal(state.cleanStatusText, '');
});
