import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentItemEditingSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/item-editing.js', import.meta.url),
  'utf8'
);

function createEditingContext(options = {}) {
  const itemsById = {
    'field-a': {
      id: 'field-a',
      label: '설비 A',
      factor: options.factor ?? 11,
      decimalDigits: options.decimalDigits ?? 1,
      readingAdjustmentValue: options.readingAdjustmentValue ?? 0,
      readingAdjustmentStartDate: options.readingAdjustmentStartDate ?? '',
      autoCalculated: false,
    },
    'field-b': {
      id: 'field-b',
      label: '설비 B',
      factor: 9,
      decimalDigits: 0,
      readingAdjustmentValue: 0,
      readingAdjustmentStartDate: '',
      autoCalculated: false,
    },
  };
  const alerts = [];
  const confirms = [];
  const promptCalls = [];
  const renderCalls = [];
  const removeCalls = [];
  const setStatusCalls = [];
  const restoreCalls = [];
  const persistedCalls = [];
  const promptQueue = [...(options.promptQueue || [])];
  const confirmQueue = [...(options.confirmQueue || [true])];
  let snapshotCalls = 0;
  let updateDirtyStateCalls = 0;
  let updateActionStateCalls = 0;
  let manageMenuSyncCalls = 0;

  const formData = {
    values: {
      'field-a': '10',
      'field-b': '20',
    },
    statuses: {
      'field-a': 'ok',
      'field-b': 'ok',
    },
  };

  const context = vm.createContext({
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Object,
    Array,
    RegExp,
    EQUIPMENT_INPUT_FRACTION_DIGITS: 2,
    state: {
      selectedDate: options.selectedDate ?? '2026-04-18',
      openEquipmentManageKey: 'field-a',
      cleanStatusText: '',
      loadedSnapshot: null,
      store: {
        equipmentItems: Object.values(itemsById),
      },
    },
    window: {
      alert(message) {
        alerts.push(message);
      },
      confirm(message) {
        confirms.push(message);
        return confirmQueue.length ? confirmQueue.shift() : true;
      },
      prompt(message, defaultValue) {
        promptCalls.push({ message, defaultValue });
        return promptQueue.length ? promptQueue.shift() : null;
      },
    },
    getEquipmentItem(fieldKey) {
      return itemsById[fieldKey] || null;
    },
    isAutoCalculatedEquipment(item) {
      return Boolean(item?.autoCalculated);
    },
    syncEquipmentManageMenus() {
      manageMenuSyncCalls += 1;
      renderCalls.push('syncEquipmentManageMenus');
    },
    getEquipmentStatusCarryUntilDate() {
      return {
        restUntilDate: '2026-04-30',
        hiddenFromDate: '2026-04-19',
      };
    },
    formatShortDate(value) {
      return value;
    },
    getEquipmentDisplayLabel(value) {
      if (typeof value === 'string') {
        return value.trim();
      }
      return String(value?.label || '').trim();
    },
    isDirty() {
      return Boolean(options.isDirty);
    },
    readEquipmentFormData() {
      return JSON.parse(JSON.stringify(formData));
    },
    getCurrentEntryDayStatus() {
      return 'working';
    },
    removeEquipmentFieldFromEntries(fieldKey, config) {
      removeCalls.push({
        fieldKey,
        removeSelectedDate: config.shouldRemoveDate('2026-04-18'),
        removeFutureDate: config.shouldRemoveDate('2026-04-19'),
      });
    },
    setStoredEquipmentFieldStatus(date, fieldKey, status, meta) {
      setStatusCalls.push({ date, fieldKey, status, meta });
    },
    persistStore() {
      persistedCalls.push(true);
    },
    renderEquipmentFieldInputs() {
      renderCalls.push('renderEquipmentFieldInputs');
    },
    restoreEquipmentFormData(nextFormData, dayStatus) {
      restoreCalls.push({ nextFormData, dayStatus });
    },
    renderCalendar() {
      renderCalls.push('renderCalendar');
    },
    renderSummary() {
      renderCalls.push('renderSummary');
    },
    renderTeamMode() {
      renderCalls.push('renderTeamMode');
    },
    createFormSnapshot() {
      snapshotCalls += 1;
      return { snapshot: snapshotCalls };
    },
    updateDirtyState() {
      updateDirtyStateCalls += 1;
      renderCalls.push('updateDirtyState');
    },
    updateActionState() {
      updateActionStateCalls += 1;
      renderCalls.push('updateActionState');
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    hasEquipmentLabelConflict(label) {
      return label === options.conflictLabel;
    },
    getDefaultUsageFactorByLabel(label) {
      return options.defaultFactors?.[label] ?? 1;
    },
    normalizeUsageFactor(value, defaultValue) {
      return value == null ? defaultValue : value;
    },
    getUsageFactorLabel() {
      return '사용배수';
    },
    canManageEquipmentDecimalDigits(item) {
      return !item?.autoCalculated;
    },
    getEquipmentDecimalDigits(fieldKey) {
      return itemsById[fieldKey]?.decimalDigits ?? 0;
    },
    normalizeEquipmentDecimalDigits(value, fallback) {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isInteger(parsed) || parsed < 0 || parsed > 2) {
        return fallback;
      }
      return parsed;
    },
    getEquipmentReadingAdjustment(item) {
      if (!item) {
        return null;
      }
      const value = Number(item.readingAdjustmentValue || 0);
      const startDate = item.readingAdjustmentStartDate || '';
      return value && startDate ? { value, startDate } : null;
    },
    normalizeEquipmentReadingAdjustmentStartDate(value) {
      const normalizedValue = String(value || '').trim();
      return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
    },
    getEquipmentVisibilityContextDate() {
      return '2026-04-01';
    },
    formatDate(value) {
      return value;
    },
    today() {
      return '2026-04-20';
    },
  });

  vm.runInContext(equipmentItemEditingSource, context);

  return {
    context,
    alerts,
    confirms,
    promptCalls,
    renderCalls,
    removeCalls,
    setStatusCalls,
    restoreCalls,
    persistedCalls,
    itemsById,
    get updateDirtyStateCalls() {
      return updateDirtyStateCalls;
    },
    get updateActionStateCalls() {
      return updateActionStateCalls;
    },
    get manageMenuSyncCalls() {
      return manageMenuSyncCalls;
    },
  };
}

test('equipment item delete smoke removes future entries and refreshes state once', () => {
  const harness = createEditingContext();

  harness.context.handleDeleteEquipmentItem('field-a');

  assert.equal(harness.context.state.openEquipmentManageKey, '');
  assert.equal(harness.manageMenuSyncCalls, 1);
  assert.equal(harness.itemsById['field-a'].hiddenFromDate, '2026-04-19');
  assert.deepEqual(harness.removeCalls, [
    {
      fieldKey: 'field-a',
      removeSelectedDate: true,
      removeFutureDate: true,
    },
  ]);
  assert.equal(harness.setStatusCalls[0].date, '2026-04-18');
  assert.equal(harness.setStatusCalls[0].fieldKey, 'field-a');
  assert.equal(harness.setStatusCalls[0].status, 'inactive');
  assert.match(harness.setStatusCalls[0].meta.updatedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(harness.restoreCalls[0].nextFormData.values['field-a'], undefined);
  assert.equal(harness.restoreCalls[0].nextFormData.statuses['field-a'], undefined);
  assert.deepEqual(harness.renderCalls, [
    'syncEquipmentManageMenus',
    'renderEquipmentFieldInputs',
    'renderCalendar',
    'renderSummary',
    'renderTeamMode',
    'updateDirtyState',
    'updateActionState',
  ]);
  assert.equal(harness.persistedCalls.length, 1);
  assert.equal(harness.updateDirtyStateCalls, 1);
  assert.equal(harness.updateActionStateCalls, 1);
  assert.deepEqual(harness.context.state.loadedSnapshot, { snapshot: 1 });
});

test('equipment item rename smoke preserves user override rules and refreshes form data', () => {
  const harness = createEditingContext({
    promptQueue: ['새 설비'],
    defaultFactors: {
      '설비 A': 11,
      '새 설비': 13,
    },
  });

  harness.context.handleRenameEquipmentItem('field-a');

  assert.equal(harness.itemsById['field-a'].label, '새 설비');
  assert.equal(harness.itemsById['field-a'].factor, 13);
  assert.equal(harness.context.state.cleanStatusText, '설비명을 수정했습니다.');
  assert.equal(harness.promptCalls[0].defaultValue, '설비 A');
  assert.equal(harness.persistedCalls.length, 1);
  assert.equal(harness.updateDirtyStateCalls, 1);
  assert.equal(harness.updateActionStateCalls, 0);
});

test('equipment factor smoke updates numeric factor after menu close', () => {
  const harness = createEditingContext({
    promptQueue: ['1.5'],
    defaultFactors: {
      '설비 A': 11,
    },
  });

  harness.context.handleUpdateEquipmentFactor('field-a');

  assert.equal(harness.itemsById['field-a'].factor, 1.5);
  assert.equal(harness.context.state.cleanStatusText, '설비 사용배수를 수정했습니다.');
  assert.equal(harness.promptCalls[0].defaultValue, '11');
  assert.equal(harness.persistedCalls.length, 1);
  assert.equal(harness.updateDirtyStateCalls, 1);
});

test('equipment decimal digit smoke keeps decimal configuration in the editing path', () => {
  const harness = createEditingContext({
    promptQueue: ['2'],
  });

  harness.context.handleUpdateEquipmentDecimalDigits('field-a');

  assert.equal(harness.itemsById['field-a'].decimalDigits, 2);
  assert.equal(harness.context.state.cleanStatusText, '설비 소수점 자리를 수정했습니다.');
  assert.equal(harness.promptCalls[0].defaultValue, '1');
  assert.equal(harness.persistedCalls.length, 1);
  assert.equal(harness.updateDirtyStateCalls, 1);
});

test('equipment reading adjustment smoke covers set and clear flows with action refresh', () => {
  const harness = createEditingContext({
    promptQueue: ['1000', '2026-04-01', ''],
  });

  harness.context.handleUpdateEquipmentReadingAdjustment('field-a');
  assert.equal(harness.itemsById['field-a'].readingAdjustmentValue, 1000);
  assert.equal(harness.itemsById['field-a'].readingAdjustmentStartDate, '2026-04-01');
  assert.equal(harness.promptCalls[1].defaultValue, '2026-04-18');

  harness.context.handleUpdateEquipmentReadingAdjustment('field-a');
  assert.equal(harness.itemsById['field-a'].readingAdjustmentValue, 0);
  assert.equal(harness.itemsById['field-a'].readingAdjustmentStartDate, '');
  assert.equal(harness.context.state.cleanStatusText, '설비 보정을 해제했습니다.');
  assert.equal(harness.persistedCalls.length, 2);
  assert.equal(harness.updateDirtyStateCalls, 2);
  assert.equal(harness.updateActionStateCalls, 2);
  assert.deepEqual(harness.alerts, []);
});
