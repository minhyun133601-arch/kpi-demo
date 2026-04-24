import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const entrySelectionSupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/entry-selection-support.js',
    import.meta.url
  ),
  'utf8'
);

function createClassList(initialNames = []) {
  const names = new Set(initialNames);
  return {
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

function createMockTextElement(initialNames = ['is-hidden']) {
  return {
    textContent: '',
    classList: createClassList(initialNames),
  };
}

function createEntrySelectionSupportContext() {
  const equipmentItems = [
    { id: 'eq_1', label: '설비 1', hidden: false, other: false, excluded: false },
    { id: 'eq_2', label: '설비 2', hidden: false, other: false, excluded: false },
    { id: 'eq_other', label: '기타', hidden: false, other: true, excluded: false },
    { id: 'eq_hidden', label: '숨김', hidden: true, other: false, excluded: false },
    { id: 'eq_excluded', label: '제외', hidden: false, other: false, excluded: true },
  ];
  const equipmentMap = Object.fromEntries(equipmentItems.map((item) => [item.id, item]));

  let supportsTeamMode = true;
  let currentResourceType = 'electric';
  let selectedTeamKeys = [];
  let selectedEquipmentIds = [];
  let teamCalendarSelectionMap = {
    team_a: ['eq_1'],
    team_direct: ['eq_1', 'eq_2'],
  };
  let teamAssignedIdsMap = {
    team_a: ['eq_1', 'eq_2'],
    team_direct: ['eq_1', 'eq_2'],
  };
  let equipmentInputs = [
    { dataset: { fieldKey: 'eq_1' }, value: '10' },
    { dataset: { fieldKey: 'eq_hidden' }, value: '20' },
    { dataset: { fieldKey: 'eq_2' }, value: '   ' },
  ];
  let validationIssues = [];

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
    RegExp,
    Promise,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_HERO_DESCRIPTIONS: {
      electric: '전기 설명',
      gas: '가스 설명',
    },
    state: {
      currentMonth: '2026-04',
      selectedDate: '2026-04-12',
      store: {
        mode: 'team',
        equipmentEntries: {
          '2026-04-01': { values: { eq_1: '12' } },
          '2026-04-12': { values: { eq_1: '15' }, status: 'draft' },
          '2026-04-20': { values: {}, dayStatus: 'completed' },
          '2026-04-30': { values: { eq_1: '22' } },
        },
        equipmentItems: [...equipmentItems],
      },
    },
    elements: {
      equipmentItemCount: createMockTextElement([]),
      selectedDateEquipmentCount: createMockTextElement(['is-hidden']),
      selectedDateError: createMockTextElement(['is-hidden']),
    },
    supportsTeamModeForCurrentResource() {
      return supportsTeamMode;
    },
    getEntryDayStatus(entry) {
      return entry?.dayStatus || '';
    },
    hasEntryStatus(entry) {
      return Boolean(entry?.status);
    },
    isFutureDate(dateString) {
      return dateString === '2026-04-30';
    },
    today() {
      return new Date('2026-04-18T00:00:00Z');
    },
    getMonthValue(value) {
      const date = value instanceof Date ? value : new Date(value);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    },
    formatDate(value) {
      const date = value instanceof Date ? value : new Date(value);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    },
    normalizeResourceType(value) {
      return String(value || '').trim().toLowerCase();
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getTeamGroup(teamKey) {
      return { key: teamKey, label: teamKey === 'team_direct' ? '직입팀' : 'A팀' };
    },
    getTeamDisplayLabel(team) {
      return team?.label || '';
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'team_direct';
    },
    getTeamAssignedEquipmentIds(teamKey) {
      return [...(teamAssignedIdsMap[teamKey] || [])];
    },
    getTeamCalendarSelection(teamKey) {
      return [...(teamCalendarSelectionMap[teamKey] || [])];
    },
    isUsageCalculationExcludedEquipment(equipment) {
      return Boolean(equipment?.excluded);
    },
    getSelectedEquipmentIds() {
      return [...selectedEquipmentIds];
    },
    isGasResourceType() {
      return currentResourceType === 'gas';
    },
    getEquipmentItem(equipmentId) {
      return equipmentMap[equipmentId] || null;
    },
    isOtherEquipment(equipment) {
      return Boolean(equipment?.other);
    },
    getEquipmentDisplayLabel(equipment) {
      return equipment?.label || '';
    },
    getEquipmentInputs() {
      return [...equipmentInputs];
    },
    isHiddenEquipmentFieldCard(equipment) {
      return Boolean(equipment?.hidden);
    },
    normalizeEntryValue(value) {
      return String(value || '').trim();
    },
    getCurrentEquipmentReadingValidationIssues() {
      return [...validationIssues];
    },
    getEquipmentReadingValidationSummaryText(issues) {
      return issues.join(', ');
    },
    formatEquipmentItemCountText(count) {
      return `등록된 설비 ${count}개`;
    },
    __setSupportsTeamMode(nextValue) {
      supportsTeamMode = nextValue === true;
    },
    __setResourceType(nextType) {
      currentResourceType = String(nextType || 'electric');
    },
    __setSelectedTeamKeys(nextKeys = []) {
      selectedTeamKeys = [...nextKeys];
    },
    __setSelectedEquipmentIds(nextIds = []) {
      selectedEquipmentIds = [...nextIds];
    },
    __setTeamCalendarSelectionMap(nextMap) {
      teamCalendarSelectionMap = { ...nextMap };
    },
    __setTeamAssignedIdsMap(nextMap) {
      teamAssignedIdsMap = { ...nextMap };
    },
    __setEquipmentInputs(nextInputs = []) {
      equipmentInputs = [...nextInputs];
    },
    __setValidationIssues(nextIssues = []) {
      validationIssues = [...nextIssues];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(entrySelectionSupportSource, context, {
    filename: 'runtime/entry-selection-support.js',
  });
  return context;
}

test('entry selection support resolves current mode and entry helpers', () => {
  const context = createEntrySelectionSupportContext();

  assert.equal(context.getCurrentMode(), 'team');
  context.__setSupportsTeamMode(false);
  assert.equal(context.getCurrentMode(), 'equipment');
  assert.deepEqual(context.getCurrentEntry(), { values: { eq_1: '15' }, status: 'draft' });
  assert.equal(context.hasEntryValue({ values: { eq_1: '  ', eq_2: '3' } }), true);
  assert.equal(context.hasEntryValue({ values: { eq_1: '  ' } }), false);
  assert.equal(context.hasEntryData({ values: {}, dayStatus: 'completed' }), true);
  assert.equal(context.hasCalendarDraftHighlight({ values: { eq_1: '9' } }), true);
  assert.equal(context.hasCurrentMonthFirstDayEntryValue(), true);
});

test('entry selection support derives latest entry dates and available month end', () => {
  const context = createEntrySelectionSupportContext();

  assert.equal(context.getLatestEntryDateInMonth('2026-04'), '2026-04-20');
  assert.equal(context.getLatestAvailableDate('2026-04'), '2026-04-18');
  assert.equal(context.getLatestAvailableDate('2026-02'), '2026-02-28');
});

test('entry selection support builds hero and selected date descriptions', () => {
  const context = createEntrySelectionSupportContext();

  assert.equal(context.getHeroDescription('equipment'), '전기 설명');
  assert.equal(context.getHeroDescription('team'), '');

  context.__setSelectedTeamKeys(['team_direct']);
  assert.equal(context.getSelectedDateDescription('team'), '직입팀 월 사용량 직접 입력 기준입니다.');

  context.__setSelectedTeamKeys(['team_a']);
  assert.equal(context.getSelectedDateDescription('team'), 'A팀 설비 1개 기준입니다.');

  context.__setSelectedEquipmentIds(['eq_other']);
  assert.equal(context.getSelectedDateDescription('equipment'), '기타 사용량 기준입니다.');

  context.__setSelectedEquipmentIds(['eq_1', 'eq_2']);
  assert.equal(context.getSelectedDateDescription('equipment'), '선택 설비 2개 합산 기준입니다.');
});

test('entry selection support counts selected date inputs and renders equipment counters', () => {
  const context = createEntrySelectionSupportContext();

  context.__setSupportsTeamMode(false);
  assert.equal(context.getSelectedDateEnteredEquipmentCount(), 1);

  context.renderEquipmentItemCount();

  assert.equal(context.elements.equipmentItemCount.textContent, '등록된 설비 4개');
  assert.equal(context.elements.selectedDateEquipmentCount.textContent, '입력 1개');
  assert.equal(context.elements.selectedDateEquipmentCount.classList.contains('is-hidden'), false);
});

test('entry selection support syncs selected date error header text', () => {
  const context = createEntrySelectionSupportContext();

  context.__setSupportsTeamMode(false);
  context.__setValidationIssues(['첫번째 경고', '두번째 경고']);

  assert.equal(
    context.getSelectedDateErrorText(context.getCurrentEquipmentReadingValidationIssues()),
    '첫번째 경고, 두번째 경고'
  );

  context.syncSelectedDateHeaderStatus();

  assert.equal(context.elements.selectedDateError.textContent, '첫번째 경고, 두번째 경고');
  assert.equal(context.elements.selectedDateError.classList.contains('is-hidden'), false);
});
