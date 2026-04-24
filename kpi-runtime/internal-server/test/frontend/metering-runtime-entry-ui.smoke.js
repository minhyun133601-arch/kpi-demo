import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeEntryUiSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/entry-ui.js'),
  'utf8'
);

function createClassList(initialNames = []) {
  const names = new Set(initialNames);
  return {
    add(...nextNames) {
      nextNames.forEach((name) => names.add(String(name)));
    },
    remove(...nextNames) {
      nextNames.forEach((name) => names.delete(String(name)));
    },
    toggle(name, force) {
      const normalizedName = String(name);
      if (force === undefined) {
        if (names.has(normalizedName)) {
          names.delete(normalizedName);
          return false;
        }

        names.add(normalizedName);
        return true;
      }

      if (force) {
        names.add(normalizedName);
        return true;
      }

      names.delete(normalizedName);
      return false;
    },
    contains(name) {
      return names.has(String(name));
    },
  };
}

function createMockTextElement() {
  return {
    textContent: '',
  };
}

function createMockInput(fieldKey) {
  return {
    dataset: {
      fieldKey,
      lastValue: '',
    },
    value: '',
    placeholder: '',
    readOnly: false,
  };
}

function createMockCard(fieldKey) {
  const restChip = {
    classList: createClassList(['is-hidden']),
  };
  return {
    dataset: {
      fieldKey,
    },
    classList: createClassList(['is-inactive', 'is-rest-equal']),
    querySelector(selector) {
      if (selector === `[data-field-rest-key="${fieldKey}"]`) {
        return restChip;
      }
      return null;
    },
    __restChip: restChip,
  };
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimeEntryUiContext(options = {}) {
  const calls = {
    confirmSafeMove: [],
    renderCalendar: 0,
    clearEquipmentLocalAutosaveTimer: 0,
    loadEntryToForm: [],
    syncSelectedDateHeaderStatus: [],
    renderTeamMode: 0,
    setCurrentEntryDayStatus: [],
    updateDirtyState: 0,
    updateActionState: 0,
    renderEquipmentFieldInputs: 0,
    loadEquipmentEntry: [],
    syncEquipmentUsageLabels: 0,
    syncAutoCalculatedEquipmentInputs: 0,
    syncEquipmentReadingValidationStates: 0,
    syncEquipmentCardMetaVisibility: [],
  };
  const state = {
    selectedDate: options.selectedDate || '',
    selectedCalendarDates: [...(options.selectedCalendarDates || [])],
    calendarSelectionAnchorDate: options.calendarSelectionAnchorDate || '',
    currentMonth: options.currentMonth || '2026-04',
    cleanStatusText: '',
    loadedSnapshot: '',
  };
  const elements = {
    selectedDateTitle: createMockTextElement(),
    selectedDateSub: createMockTextElement(),
  };
  const equipmentItems = new Map(
    (options.equipmentItems || []).map((item) => [item.id, item])
  );
  const equipmentInputs = options.equipmentInputs || [];
  const equipmentCards = new Map(
    (options.equipmentCards || []).map((card) => [card.dataset.fieldKey, card])
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
    elements,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    confirmSafeMove(message) {
      calls.confirmSafeMove.push(message);
      return options.confirmSafeMove ?? true;
    },
    renderCalendar() {
      calls.renderCalendar += 1;
    },
    clearEquipmentLocalAutosaveTimer() {
      calls.clearEquipmentLocalAutosaveTimer += 1;
    },
    getCurrentEntry() {
      return options.currentEntry || null;
    },
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getTeamModeMonthTitle(monthValue) {
      return `team:${monthValue}`;
    },
    getSelectedDateDescription(mode) {
      return `desc:${mode}`;
    },
    syncSelectedDateHeaderStatus(payload) {
      calls.syncSelectedDateHeaderStatus.push(payload);
    },
    getSelectedCalendarDateKeys() {
      return [...(options.selectedCalendarDateKeys || state.selectedCalendarDates)];
    },
    formatFullDate(value) {
      return `full:${value}`;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    setCurrentEntryDayStatus(status) {
      calls.setCurrentEntryDayStatus.push(status);
    },
    createFormSnapshot() {
      return options.formSnapshot || 'snapshot:form';
    },
    updateDirtyState() {
      calls.updateDirtyState += 1;
    },
    updateActionState() {
      calls.updateActionState += 1;
    },
    renderEquipmentFieldInputs() {
      calls.renderEquipmentFieldInputs += 1;
    },
    getEntryDayStatus(entry) {
      return entry?.dayStatus || '';
    },
    formatUpdatedAt(value) {
      return `updated:${value}`;
    },
    syncEquipmentUsageLabels() {
      calls.syncEquipmentUsageLabels += 1;
    },
    syncEquipmentReadingValidationStates() {
      calls.syncEquipmentReadingValidationStates += 1;
    },
    getEquipmentInputs() {
      return equipmentInputs;
    },
    getEquipmentItem(fieldKey) {
      return equipmentItems.get(fieldKey) || null;
    },
    isAutoCalculatedEquipment(equipment) {
      return Boolean(equipment?.autoCalculated);
    },
    calculateOtherCalendarDailyUsage(dateString) {
      return options.derivedUsageByDate?.[dateString] ?? null;
    },
    formatEquipmentInputDisplay(value) {
      return value === null || value === undefined || value === '' ? '' : `fmt:${value}`;
    },
    isGasResourceType() {
      return options.isGasResourceType === true;
    },
    getAdjacentStoredEquipmentReadingDetail(fieldKey) {
      return options.previousStoredReadings?.[fieldKey] || null;
    },
    getValidationReadingDetailOnDate(fieldKey) {
      return options.validationDetails?.[fieldKey] || null;
    },
    getAdjacentRecordedEquipmentReading(fieldKey) {
      return options.previousRecordedReadings?.[fieldKey] || null;
    },
    normalizeEntryValue(value) {
      return String(value ?? '').trim();
    },
    getEquipmentFieldCard(fieldKey) {
      return equipmentCards.get(fieldKey) || null;
    },
    getEffectiveEquipmentFieldInactive(fieldKey) {
      return Boolean(options.inactiveFieldKeys?.includes(fieldKey));
    },
    syncEquipmentCardMetaVisibility(card) {
      calls.syncEquipmentCardMetaVisibility.push(card?.dataset.fieldKey || '');
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeEntryUiSource, context, {
    filename: 'runtime/entry-ui.js',
  });

  return {
    context,
    calls,
    state,
    elements,
  };
}

test('runtime entry ui clears the selected date after safe confirmation', () => {
  const { context, calls, state } = createRuntimeEntryUiContext({
    selectedDate: '2026-04-12',
    selectedCalendarDates: ['2026-04-12'],
    calendarSelectionAnchorDate: '2026-04-12',
  });

  context.loadEntryToForm = (entry) => {
    calls.loadEntryToForm.push(entry);
  };

  context.selectDate('');

  assert.equal(state.selectedDate, '');
  assert.deepEqual(toPlainJson(state.selectedCalendarDates), []);
  assert.equal(state.calendarSelectionAnchorDate, '');
  assert.equal(calls.clearEquipmentLocalAutosaveTimer, 1);
  assert.deepEqual(calls.loadEntryToForm, [null]);
  assert.equal(calls.renderCalendar, 1);
});

test('runtime entry ui applies a new selected date and loads the current entry', () => {
  const currentEntry = {
    values: { eq_01: '11' },
  };
  const { context, calls, state } = createRuntimeEntryUiContext({
    currentEntry,
  });

  context.loadEntryToForm = (entry) => {
    calls.loadEntryToForm.push(entry);
  };

  context.selectDate('2026-04-15', {
    selectionDates: ['2026-04-15', '2026-04-16'],
    selectionAnchorDate: '2026-04-15',
  });

  assert.equal(state.selectedDate, '2026-04-15');
  assert.deepEqual(toPlainJson(state.selectedCalendarDates), ['2026-04-15', '2026-04-16']);
  assert.equal(state.calendarSelectionAnchorDate, '2026-04-15');
  assert.equal(calls.clearEquipmentLocalAutosaveTimer, 1);
  assert.deepEqual(calls.loadEntryToForm, [currentEntry]);
  assert.equal(calls.renderCalendar, 1);
});

test('runtime entry ui renders selected date presentation for team and equipment modes', () => {
  const teamContext = createRuntimeEntryUiContext({
    currentMode: 'team',
    currentMonth: '2026-04',
  });
  teamContext.context.syncSelectedDatePresentation();
  assert.equal(teamContext.elements.selectedDateTitle.textContent, 'team:2026-04');
  assert.equal(teamContext.elements.selectedDateSub.textContent, 'desc:team');
  assert.deepEqual(toPlainJson(teamContext.calls.syncSelectedDateHeaderStatus), [[]]);

  const equipmentContext = createRuntimeEntryUiContext({
    currentMode: 'equipment',
    selectedDate: '2026-04-20',
    selectedCalendarDates: ['2026-04-20', '2026-04-21'],
  });
  equipmentContext.context.syncSelectedDatePresentation();
  assert.equal(equipmentContext.elements.selectedDateTitle.textContent, 'full:2026-04-20 외 1일');
  assert.equal(
    equipmentContext.elements.selectedDateSub.textContent,
    '날짜 2일 선택 · desc:equipment'
  );
  assert.deepEqual(equipmentContext.calls.syncSelectedDateHeaderStatus, [undefined]);
});

test('runtime entry ui loads team and equipment entries into the form state', () => {
  const teamContext = createRuntimeEntryUiContext({
    currentMode: 'team',
    formSnapshot: 'snapshot:team',
  });
  teamContext.context.syncSelectedDatePresentation = () => {};
  teamContext.context.loadEntryToForm({ values: { eq_01: '1' } });
  assert.equal(teamContext.calls.renderTeamMode, 1);
  assert.deepEqual(teamContext.calls.setCurrentEntryDayStatus, ['']);
  assert.equal(teamContext.state.cleanStatusText, '팀 배정은 즉시 저장됩니다.');
  assert.equal(teamContext.state.loadedSnapshot, 'snapshot:team');
  assert.equal(teamContext.calls.updateDirtyState, 1);
  assert.equal(teamContext.calls.updateActionState, 1);

  const equipmentEntry = {
    values: { eq_01: '5' },
    dayStatus: 'complete',
    updatedAt: '2026-04-20T12:00:00Z',
  };
  const equipmentContext = createRuntimeEntryUiContext({
    currentMode: 'equipment',
    formSnapshot: 'snapshot:equipment',
  });
  equipmentContext.context.syncSelectedDatePresentation = () => {};
  equipmentContext.context.loadEquipmentEntry = (entry) => {
    equipmentContext.calls.loadEquipmentEntry.push(entry);
  };
  equipmentContext.context.syncAutoCalculatedEquipmentInputs = () => {
    equipmentContext.calls.syncAutoCalculatedEquipmentInputs += 1;
  };
  equipmentContext.context.loadEntryToForm(equipmentEntry);
  assert.equal(equipmentContext.calls.renderEquipmentFieldInputs, 1);
  assert.deepEqual(equipmentContext.calls.loadEquipmentEntry, [equipmentEntry]);
  assert.deepEqual(equipmentContext.calls.setCurrentEntryDayStatus, ['complete']);
  assert.equal(
    equipmentContext.state.cleanStatusText,
    '마지막 저장 updated:2026-04-20T12:00:00Z'
  );
  assert.equal(equipmentContext.state.loadedSnapshot, 'snapshot:equipment');
  assert.equal(equipmentContext.calls.syncEquipmentUsageLabels, 1);
  assert.equal(equipmentContext.calls.syncAutoCalculatedEquipmentInputs, 1);
  assert.equal(equipmentContext.calls.syncEquipmentReadingValidationStates, 1);
  assert.equal(equipmentContext.calls.updateDirtyState, 1);
  assert.equal(equipmentContext.calls.updateActionState, 1);
});

test('runtime entry ui syncs equipment placeholders, auto-calculated values, and rest indicators', () => {
  const manualInput = createMockInput('eq_manual');
  const autoInput = createMockInput('eq_auto');
  const inactiveInput = createMockInput('eq_inactive');
  const manualCard = createMockCard('eq_manual');
  const autoCard = createMockCard('eq_auto');
  const inactiveCard = createMockCard('eq_inactive');
  const { context, calls } = createRuntimeEntryUiContext({
    selectedDate: '2026-04-19',
    equipmentItems: [
      { id: 'eq_manual', autoCalculated: false },
      { id: 'eq_auto', autoCalculated: true },
      { id: 'eq_inactive', autoCalculated: false },
    ],
    equipmentInputs: [manualInput, autoInput, inactiveInput],
    equipmentCards: [manualCard, autoCard, inactiveCard],
    derivedUsageByDate: {
      '2026-04-19': 7.5,
    },
    previousStoredReadings: {
      eq_manual: { rawValue: 42 },
    },
    validationDetails: {
      eq_manual: { value: 42 },
    },
    previousRecordedReadings: {
      eq_manual: { value: 42 },
    },
    inactiveFieldKeys: ['eq_inactive'],
  });

  context.loadEquipmentEntry({
    values: {
      eq_manual: '41',
      eq_auto: '99',
      eq_inactive: '',
    },
  });

  assert.equal(manualInput.value, 'fmt:41');
  assert.equal(manualInput.dataset.lastValue, 'fmt:41');
  assert.equal(manualInput.placeholder, '이전 fmt:42');
  assert.equal(autoInput.value, 'fmt:7.5');
  assert.equal(autoInput.dataset.lastValue, '');
  assert.equal(autoInput.readOnly, true);
  assert.equal(autoInput.placeholder, '자동 계산');

  context.syncEquipmentRestIndicators();

  assert.equal(manualCard.__restChip.classList.contains('is-hidden'), false);
  assert.equal(autoCard.__restChip.classList.contains('is-hidden'), true);
  assert.equal(inactiveCard.__restChip.classList.contains('is-hidden'), false);
  assert.deepEqual(calls.syncEquipmentCardMetaVisibility, ['eq_manual', 'eq_auto', 'eq_inactive']);
});
