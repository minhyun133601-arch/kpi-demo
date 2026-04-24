import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const monthControlsSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/calendar/month-controls.js',
    import.meta.url
  ),
  'utf8'
);

function createSelectLikeElement() {
  return {
    innerHTML: '',
    value: '',
    querySelector(selector) {
      const match = /option\[value="([^"]+)"\]/.exec(String(selector || ''));
      if (!match) {
        return null;
      }

      return this.innerHTML.includes(`value="${match[1]}"`) ? { value: match[1] } : null;
    },
  };
}

function createMonthControlsContext() {
  let currentResourceType = 'electric';
  const selectedDates = [];
  let summaryRenderCount = 0;

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
    FIXED_MIN_SELECTABLE_MONTH: '2024-01',
    FIXED_MAX_SELECTABLE_MONTH: '2026-12',
    GAS_CORRECTION_MONTH_HINTS: {
      '2026-03': '가스 보정 힌트',
    },
    state: {
      currentMonth: '2026-03',
      openTeamPickerKey: 'team_a',
      teamPickerSelections: {
        team_a: ['eq-1'],
      },
      store: {
        equipmentEntries: {
          '2026-03-03': { values: { eq: '10' } },
          '2026-02-01': { values: { eq: '9' } },
        },
      },
    },
    elements: {
      yearPicker: createSelectLikeElement(),
      monthPicker: createSelectLikeElement(),
      prevMonthBtn: { disabled: false },
      nextMonthBtn: { disabled: false },
      monthTitle: { textContent: '' },
      calendarHint: { textContent: '' },
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getPresetEquipmentEntries() {
      return {
        '2026-01-15': { values: { eq: '7' } },
        '2026-03-01': { values: { eq: '8' } },
      };
    },
    getPresetGasEntries() {
      return {
        '2025-11-01': { values: { gas: '4' } },
      };
    },
    getMonthValue(date) {
      return [
        String(date.getFullYear()).padStart(4, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
      ].join('-');
    },
    today() {
      return new Date('2026-04-15T00:00:00.000Z');
    },
    formatMonthTitle(monthValue) {
      return `title:${monthValue}`;
    },
    closeBillingDocumentPreview() {},
    getLatestEntryDateInMonth(monthValue) {
      if (monthValue === '2026-03') {
        return '2026-03-03';
      }
      return '';
    },
    getLatestAvailableDate(monthValue) {
      return `${monthValue}-01`;
    },
    selectDate(dateString, options = {}) {
      selectedDates.push({ dateString, options });
    },
    renderSummary() {
      summaryRenderCount += 1;
    },
    __setCurrentResourceType(nextResourceType) {
      currentResourceType = nextResourceType;
    },
    __getSelectedDates() {
      return [...selectedDates];
    },
    __getSummaryRenderCount() {
      return summaryRenderCount;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(monthControlsSource, context, {
    filename: 'calendar/month-controls.js',
  });
  return context;
}

test('month controls shift months and clamp selectable range', () => {
  const context = createMonthControlsContext();

  assert.equal(context.shiftMonthValue('2026-03', 1), '2026-04');
  assert.equal(context.shiftMonthValue('2026-03', -2), '2026-01');
  assert.equal(context.getAdjacentMonthValue('2024-01', -1), '');
  assert.equal(context.getAdjacentMonthValue('2026-04', 1), '');
  assert.equal(context.isSelectableMonth('2024-01'), true);
  assert.equal(context.isSelectableMonth('2027-01'), false);
});

test('month controls discover selectable months from active and preset entries', () => {
  const context = createMonthControlsContext();

  assert.deepEqual(Array.from(context.getSelectableMonthValues('electric')), [
    '2026-01',
    '2026-02',
    '2026-03',
  ]);

  context.__setCurrentResourceType('gas');
  assert.deepEqual(Array.from(context.getSelectableMonthValues('gas')), [
    '2025-11',
    '2026-02',
    '2026-03',
  ]);
});

test('month controls populate selects and sync navigation buttons', () => {
  const context = createMonthControlsContext();

  context.setupPeriodControls();
  assert.ok(context.elements.yearPicker.innerHTML.includes('2026'));
  assert.ok(context.elements.yearPicker.innerHTML.includes('2024'));

  context.populateMonthOptions(2024, '03');
  assert.ok(context.elements.monthPicker.innerHTML.includes('value="01"'));
  assert.equal(context.elements.monthPicker.value, '03');

  context.state.currentMonth = '2024-01';
  context.syncMonthNavigation();
  assert.equal(context.elements.prevMonthBtn.disabled, true);
  assert.equal(context.elements.nextMonthBtn.disabled, false);
});

test('month controls apply month and update header, hint, and selected date', () => {
  const context = createMonthControlsContext();
  context.__setCurrentResourceType('gas');

  context.applyMonth('2026-03');

  assert.equal(context.state.currentMonth, '2026-03');
  assert.equal(context.state.openTeamPickerKey, '');
  assert.deepEqual(Object.keys(context.state.teamPickerSelections), []);
  assert.equal(context.elements.monthTitle.textContent, 'title:2026-03');
  assert.equal(context.elements.calendarHint.textContent, '가스 보정 힌트');
  assert.equal(context.__getSummaryRenderCount(), 1);
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.__getSelectedDates())),
    [
    {
      dateString: '2026-03-03',
      options: { skipDirtyCheck: true },
    },
    ]
  );
});
