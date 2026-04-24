import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const visibilityScopeSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/visibility-scope.js',
    import.meta.url
  ),
  'utf8'
);

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeEquipmentFactorLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '');
}

function createVisibilityScopeContext() {
  let currentResourceType = 'electric';
  const latestEntryDates = {
    '2026-04': '2026-04-12',
  };
  const latestAvailableDates = {
    '2026-04': '2026-04-30',
    '2026-05': '2026-05-31',
  };

  const state = {
    currentMonth: '2026-04',
    selectedDate: '',
    store: {
      equipmentItems: [
        { id: 'normal_01', label: '일반 설비' },
        { id: 'active_default', label: '활성 기본' },
        { id: 'reactive_label', label: '무효전력' },
        { id: 'excluded_default', label: '제외 기본' },
        { id: 'summary_only_default', label: '숨김 합계' },
        { id: 'field_16', label: '특수 설비' },
        { id: 'explicit_visible', label: '명시 월', visibleFromMonth: '2026-05' },
        { id: 'hidden_date', label: '숨김 날짜', hiddenFromDate: '2026-04-10' },
        { id: 'other_equipment', label: '기타' },
        { id: 'total_summary', label: '유효전력의 합' },
        { id: 'reactive_summary', label: '무효전력의 합' },
      ],
      equipmentEntries: {
        '2026-03-28': {
          values: {
            field_16: '',
          },
        },
        '2026-04-01': {
          values: {
            field_16: '12.5',
          },
        },
        '2026-04-12': {
          values: {
            field_16: '13.0',
          },
        },
      },
    },
  };

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
    Map,
    Set,
    RegExp,
    Promise,
    state,
    ACTIVE_POWER_DEFAULT_IDS: new Set(['active_default']),
    ACTIVE_POWER_LABEL_KEYS: new Set([normalizeEquipmentFactorLabel('유효전력')]),
    REACTIVE_POWER_DEFAULT_IDS: new Set(['reactive_default']),
    REACTIVE_POWER_LABEL_KEYS: new Set([normalizeEquipmentFactorLabel('무효전력')]),
    REACTIVE_USAGE_EXCLUDED_DEFAULT_IDS: new Set(['excluded_default']),
    REACTIVE_USAGE_EXCLUDED_LABEL_KEYS: new Set([normalizeEquipmentFactorLabel('계산 제외')]),
    SUMMARY_ONLY_DEFAULT_IDS: new Set(['summary_only_default']),
    SUMMARY_ONLY_LABEL_KEYS: new Set([normalizeEquipmentFactorLabel('숨김 합계')]),
    normalizeEquipmentFactorLabel,
    normalizeEntryValue(value) {
      if (value === null || value === undefined) {
        return '';
      }
      return String(value).trim();
    },
    normalizeMonthValue(value) {
      const normalizedValue = String(value || '').trim();
      return /^\d{4}-\d{2}$/.test(normalizedValue) ? normalizedValue : '';
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    compareMonthValues(left, right) {
      return String(left || '').localeCompare(String(right || ''));
    },
    getLatestEntryDateInMonth(monthValue) {
      return latestEntryDates[String(monthValue || '')] || '';
    },
    getLatestAvailableDate(monthValue) {
      return latestAvailableDates[String(monthValue || '')] || '';
    },
    isOtherEquipment(equipment) {
      return normalizeEquipmentFactorLabel(equipment?.label) === normalizeEquipmentFactorLabel('기타');
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isWasteResourceType(resourceType = currentResourceType) {
      return resourceType === 'waste';
    },
    getConfiguredTotalPowerEquipmentIds() {
      return ['configured_total_a', 'configured_total_b'];
    },
    __setCurrentResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setSelectedDate(nextDateString) {
      state.selectedDate = String(nextDateString || '');
    },
    __setCurrentMonth(nextMonthValue) {
      state.currentMonth = String(nextMonthValue || '');
    },
    __setLatestEntryDate(monthValue, dateString) {
      latestEntryDates[String(monthValue || '')] = String(dateString || '');
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(visibilityScopeSource, context, {
    filename: 'equipment/visibility-scope.js',
  });
  return context;
}

test('equipment visibility scope classifies active reactive excluded and summary-only equipment', () => {
  const context = createVisibilityScopeContext();

  assert.equal(context.isActivePowerEquipment({ id: 'active_default', label: '임의 설비' }), true);
  assert.equal(context.isActivePowerEquipment({ id: 'normal_01', label: '유효전력' }), true);
  assert.equal(context.isReactivePowerEquipment({ id: 'reactive_label', label: '무효전력' }), true);
  assert.equal(
    context.isUsageCalculationExcludedEquipment({ id: 'excluded_default', label: '임의 설비' }),
    true
  );
  assert.equal(
    context.isSummaryOnlyEquipment({ id: 'summary_only_default', label: '임의 설비' }),
    true
  );
  assert.equal(context.isTotalPowerSummaryEquipment({ label: '유효전력의 합' }), true);
  assert.equal(context.isReactiveSummaryEquipment({ label: '무효전력의 합' }), true);
  assert.equal(context.isActivePowerEquipment({ id: 'normal_01', label: '일반 설비' }), false);
});

test('equipment visibility scope resolves first-recorded and visible or hidden timing fields', () => {
  const context = createVisibilityScopeContext();
  const field16 = context.state.store.equipmentItems.find((item) => item.id === 'field_16');
  const explicitVisible = context.state.store.equipmentItems.find(
    (item) => item.id === 'explicit_visible'
  );
  const hiddenDate = context.state.store.equipmentItems.find((item) => item.id === 'hidden_date');

  assert.equal(context.getEquipmentFirstRecordedMonth('field_16'), '2026-04');
  assert.equal(context.getEquipmentVisibleFromMonth(field16), '2026-04');
  assert.equal(context.getEquipmentVisibleFromMonth(explicitVisible), '2026-05');
  assert.equal(context.getEquipmentHiddenFromDate(hiddenDate), '2026-04-10');
  assert.equal(
    context.getEquipmentHiddenFromDate({ id: 'invalid_hidden', hiddenFromDate: '2026/04/10' }),
    ''
  );
});

test('equipment visibility scope hides cards by month boundary hidden date and summary-only flags', () => {
  const context = createVisibilityScopeContext();
  const field16 = context.state.store.equipmentItems.find((item) => item.id === 'field_16');
  const hiddenDate = context.state.store.equipmentItems.find((item) => item.id === 'hidden_date');
  const summaryOnly = context.state.store.equipmentItems.find(
    (item) => item.id === 'summary_only_default'
  );

  assert.equal(context.shouldHideEquipmentFieldBeforeFirstRecordedMonth(field16, '2026-03'), true);
  assert.equal(context.shouldHideEquipmentFieldBeforeFirstRecordedMonth(field16, '2026-04'), false);
  assert.equal(context.shouldHideEquipmentFieldOnOrAfterHiddenDate(hiddenDate, '2026-04-09'), false);
  assert.equal(context.shouldHideEquipmentFieldOnOrAfterHiddenDate(hiddenDate, '2026-04-10'), true);
  assert.equal(context.isHiddenEquipmentFieldCard(summaryOnly, '2026-04-01'), true);

  context.__setCurrentMonth('2026-03');
  assert.equal(context.isHiddenEquipmentFieldCard(field16, '2026-03-31'), true);

  context.__setCurrentMonth('2026-04');
  assert.equal(context.isHiddenEquipmentFieldCard(field16, '2026-04-12'), false);
});

test('equipment visibility scope resolves context dates and summary id filters', () => {
  const context = createVisibilityScopeContext();

  assert.equal(context.getEquipmentVisibilityContextDate('2026-04-08'), '2026-04-08');
  assert.equal(context.getEquipmentVisibilityContextDate(), '2026-04-12');

  context.__setLatestEntryDate('2026-05', '');
  context.__setCurrentMonth('2026-05');
  context.__setSelectedDate('');
  assert.equal(context.getEquipmentVisibilityContextDate(), '2026-05-31');

  assert.deepEqual(toPlainValue(context.getAllEquipmentIds()), [
    'normal_01',
    'active_default',
    'reactive_label',
    'excluded_default',
    'summary_only_default',
    'field_16',
    'explicit_visible',
    'hidden_date',
    'other_equipment',
    'total_summary',
    'reactive_summary',
  ]);
  assert.deepEqual(toPlainValue(context.getEquipmentSummaryIds()), [
    'normal_01',
    'excluded_default',
    'field_16',
    'explicit_visible',
    'hidden_date',
    'total_summary',
    'reactive_summary',
  ]);
});

test('equipment visibility scope routes usage-share and tracked-id sets by resource type', () => {
  const context = createVisibilityScopeContext();

  assert.equal(context.isExcludedFromEquipmentSummary({ id: 'active_default', label: '활성 기본' }), true);
  assert.equal(context.isExcludedFromEquipmentSummary({ id: 'other_equipment', label: '기타' }), true);
  assert.equal(context.isEquipmentUsageShareTarget({ id: 'normal_01', label: '일반 설비' }), true);
  assert.equal(context.isEquipmentUsageShareTarget({ id: 'active_default', label: '활성 기본' }), false);
  assert.equal(context.isEquipmentUsageShareTarget({ id: 'other_equipment', label: '기타' }), true);

  assert.deepEqual(toPlainValue(context.getGasOverallTrackedEquipmentIds()), []);
  assert.deepEqual(toPlainValue(context.getDefaultCalendarTrackedEquipmentIds()), [
    'configured_total_a',
    'configured_total_b',
  ]);

  context.__setCurrentResourceType('gas');
  assert.deepEqual(
    toPlainValue(context.getGasOverallTrackedEquipmentIds()),
    toPlainValue(context.getAllEquipmentIds())
  );
  assert.deepEqual(
    toPlainValue(context.getDefaultCalendarTrackedEquipmentIds()),
    toPlainValue(context.getAllEquipmentIds())
  );

  context.__setCurrentResourceType('waste');
  assert.deepEqual(toPlainValue(context.getDefaultCalendarTrackedEquipmentIds()), []);
});
