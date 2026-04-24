import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const calendarRuntimeSources = await Promise.all([
  fs.readFile(
    new URL('../../../../utility/apps/metering/calendar/day-status.js', import.meta.url),
    'utf8'
  ),
  fs.readFile(
    new URL('../../../../utility/apps/metering/calendar/runtime.js', import.meta.url),
    'utf8'
  ),
]);

function parseDateString(dateString) {
  const [year, month, day] = String(dateString || '')
    .split('-')
    .map((value) => Number(value));
  return new Date(year, (month || 1) - 1, day || 1);
}

function formatDate(date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function getNextDateString(dateString) {
  const nextDate = parseDateString(dateString);
  nextDate.setDate(nextDate.getDate() + 1);
  return formatDate(nextDate);
}

function createCalendarContext() {
  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    ENTRY_DAY_STATUS_ORDER: ['', 'completed', 'holiday'],
    ENTRY_DAY_STATUS_META: {
      completed: { label: '완료', calendarClassName: 'is-completed' },
      holiday: { label: '휴무', calendarClassName: 'is-holiday' },
    },
    state: {
      currentMonth: '2026-04',
      selectedDate: '',
      selectedCalendarDates: [],
      calendarSelectionAnchorDate: '',
      store: {
        equipmentEntries: {},
      },
      cleanStatusText: '',
    },
    elements: {
      entryStatusWrap: { dataset: {} },
      entryCompleteCheckbox: {
        checked: false,
        indeterminate: false,
      },
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeMonthValue(value) {
      return String(value ?? '').trim();
    },
    parseDateString,
    formatDate,
    getNextDateString,
    isFutureDate() {
      return false;
    },
    hasEntryValue(entry) {
      return Boolean(Object.keys(entry?.values || {}).length);
    },
    hasEntryData(entry) {
      return Boolean(Object.keys(entry?.values || {}).length || entry?.dayStatus || entry?.completed);
    },
    getCurrentEquipmentReadingValidationIssues() {
      return [];
    },
    updateDirtyState() {},
    updateActionState() {},
    isDirty() {
      return false;
    },
    saveEquipmentEntryDraftToLocalStore() {},
    loadEntryToForm() {},
    getCurrentEntry() {
      return null;
    },
    renderSummary() {},
    renderTeamMode() {},
    renderCalendar() {},
    selectDate() {},
    syncCalendarPopupWindow() {},
    getEquipmentItem() {
      return null;
    },
    isOtherEquipment() {
      return false;
    },
    getEquipmentUsageFactor() {
      return 1;
    },
    getEquipmentDistributedUsageWindow() {
      return null;
    },
    isUsageCalculationExcludedEquipment() {
      return false;
    },
    getDefaultCalendarTrackedEquipmentIds() {
      return [];
    },
    getEquipmentSummaryIds() {
      return [];
    },
    getStoredEquipmentReadingValidationIssues() {
      return [];
    },
    getEquipmentReadingValidationSummaryText() {
      return '';
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  ['calendar/day-status.js', 'calendar/runtime.js'].forEach((filename, index) => {
    vm.runInContext(calendarRuntimeSources[index], context, {
      filename,
    });
  });
  return context;
}

test('calendar runtime normalizes day status and syncs the checkbox state', () => {
  const context = createCalendarContext();

  assert.equal(context.normalizeEntryDayStatus(' rain '), 'holiday');
  assert.equal(context.getEntryDayStatus({ completed: true }), 'completed');

  context.setCurrentEntryDayStatus('completed');

  assert.equal(context.getCurrentEntryDayStatus(), 'completed');
  assert.equal(context.elements.entryCompleteCheckbox.checked, true);
  assert.equal(context.elements.entryCompleteCheckbox.indeterminate, false);
});

test('calendar runtime infers auto-holiday gaps between completed dates', () => {
  const context = createCalendarContext();
  context.state.store.equipmentEntries = {
    '2026-04-01': { completed: true },
    '2026-04-03': { dayStatus: 'completed' },
  };

  assert.deepEqual([...context.getAutoHolidayDateSet('2026-04')], ['2026-04-02']);
  assert.equal(context.getResolvedEntryDayStatus(null, '2026-04-02'), 'holiday');
});

test('calendar runtime keeps ordered month selections and supports range or toggle selection', () => {
  const context = createCalendarContext();
  context.state.selectedDate = '2026-04-02';
  context.state.selectedCalendarDates = ['2026-04-01', '2026-04-05'];

  assert.deepEqual(context.getSelectedCalendarDateKeys(), [
    '2026-04-01',
    '2026-04-02',
    '2026-04-05',
  ]);

  context.state.selectedDate = '2026-04-02';
  context.state.selectedCalendarDates = ['2026-04-02'];
  context.state.calendarSelectionAnchorDate = '2026-04-02';

  assert.deepEqual(context.resolveCalendarDateSelection('2026-04-04', { shiftKey: true }), [
    '2026-04-02',
    '2026-04-03',
    '2026-04-04',
  ]);

  assert.deepEqual(context.resolveCalendarDateSelection('2026-04-03', { ctrlKey: true }), [
    '2026-04-02',
    '2026-04-03',
  ]);
});

test('calendar runtime stores and clears day status entries without leaving empty records', () => {
  const context = createCalendarContext();

  context.setStoredEntryDayStatus('2026-04-10', 'completed', {
    updatedAt: '2026-04-10T00:00:00.000Z',
  });

  const storedEntry = context.state.store.equipmentEntries['2026-04-10'];
  assert.ok(storedEntry);
  assert.equal(storedEntry.dayStatus, 'completed');
  assert.equal(storedEntry.completed, true);
  assert.equal(storedEntry.updatedAt, '2026-04-10T00:00:00.000Z');
  assert.deepEqual(Object.keys(storedEntry.values), []);
  assert.deepEqual(Object.keys(storedEntry.statuses), []);
  assert.deepEqual(Object.keys(storedEntry.fieldDayStatuses), []);

  context.setStoredEntryDayStatus('2026-04-10', '', {
    updatedAt: '2026-04-10T00:00:00.000Z',
  });

  assert.equal(Object.hasOwn(context.state.store.equipmentEntries, '2026-04-10'), false);
});
