import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const pickerSupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/picker-support.js',
    import.meta.url
  ),
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
    replace(nextNames = []) {
      names.clear();
      nextNames
        .filter(Boolean)
        .map((name) => String(name))
        .forEach((name) => names.add(name));
    },
    toArray() {
      return [...names];
    },
  };
}

function createMockElement(tagName = 'div') {
  const classList = createClassList();
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    attributes: {},
    style: {},
    textContent: '',
    disabled: false,
    append(...nodes) {
      nodes.flat().forEach((node) => {
        if (node === null || node === undefined) {
          return;
        }
        this.children.push(node);
      });
    },
    appendChild(node) {
      if (node !== null && node !== undefined) {
        this.children.push(node);
      }
      return node;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    classList,
  };

  Object.defineProperty(element, 'className', {
    get() {
      return classList.toArray().join(' ');
    },
    set(value) {
      classList.replace(String(value || '').split(/\s+/).filter(Boolean));
    },
  });

  return element;
}

function createPickerSupportContext() {
  let currentResourceType = 'electric';
  let selectedTeamKeys = [];
  let currentTeamGroups = [
    { key: 'team_a', label: 'A팀', iconKey: 'dryer' },
    { key: 'team_b', label: 'B팀', iconKey: 'dryer' },
    { key: 'empty_team', label: '빈팀', iconKey: 'dryer' },
    { key: 'team_01_01', label: 'Line Alpha', iconKey: 'drying' },
  ];
  let editableDirectTeamKeys = new Set(['team_01_01']);
  let directTeamUsageMap = {
    'team_01_01:2026-04': 42,
  };

  const availableEquipmentMap = {
    team_a: [
      { id: 'eq_1', label: '설비 1' },
      { id: 'eq_2', label: '설비 2' },
    ],
    empty_team: [],
  };

  const teamGroups = {
    team_01_01: { key: 'team_01_01', label: 'Line Alpha', iconKey: 'drying' },
  };

  const state = {
    currentMonth: '2026-04',
    openTeamPickerKey: 'team_a',
    teamPickerSelections: {
      team_a: ['eq_1', 'eq_3'],
      invalid_team: ['ghost'],
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
    Set,
    RegExp,
    Promise,
    TEAM_01_01_KEY: 'team_01_01',
    TOTAL_POWER_TEAM_KEY: 'total_power',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_compressor',
    state,
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
    },
    getCurrentTeamGroups() {
      return [...currentTeamGroups];
    },
    getAvailableEquipmentOptionsForTeam(teamKey) {
      return [...(availableEquipmentMap[teamKey] || [])];
    },
    createIconLabel(labelText, iconKey, options = {}) {
      const element = createMockElement(options.containerTag || 'div');
      element.textContent = String(labelText || '');
      element.iconKey = iconKey;
      element.options = options;
      return element;
    },
    getEquipmentDisplayLabel(item) {
      return item?.label || '';
    },
    getResourceDuplicateBadgeIconKeyForEquipment() {
      return '';
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return resourceType === 'electric';
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getTeamGroup(teamKey) {
      return teamGroups[teamKey] || null;
    },
    getTeamAmountText(teamKey, _options = {}, monthValue = state.currentMonth) {
      return `amount:${teamKey}:${monthValue}`;
    },
    canEditDirectTeamMonthlyUsage(teamKey) {
      return editableDirectTeamKeys.has(String(teamKey || ''));
    },
    formatDailyUsage(value) {
      return `usage:${Math.round(Number(value) || 0)}`;
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue = state.currentMonth) {
      return directTeamUsageMap[`${teamKey}:${monthValue}`] ?? null;
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setSelectedTeamKeys(nextTeamKeys = []) {
      selectedTeamKeys = [...nextTeamKeys];
    },
    __setCurrentTeamGroups(nextGroups = []) {
      currentTeamGroups = [...nextGroups];
    },
    __setEditableDirectTeamKeys(nextTeamKeys = []) {
      editableDirectTeamKeys = new Set(nextTeamKeys);
    },
    __setDirectTeamUsageMap(nextUsageMap = {}) {
      directTeamUsageMap = { ...nextUsageMap };
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(pickerSupportSource, context, {
    filename: 'team-overview/picker-support.js',
  });
  return context;
}

test('picker support sync clears invalid open picker and filters unavailable selections', () => {
  const context = createPickerSupportContext();

  context.syncOpenTeamPickerSelectionState();
  assert.equal(context.state.openTeamPickerKey, 'team_a');
  assert.equal(context.state.teamPickerSelections.team_a.join(','), 'eq_1');

  context.state.openTeamPickerKey = 'invalid_team';
  context.syncOpenTeamPickerSelectionState([{ key: 'team_a' }]);
  assert.equal(context.state.openTeamPickerKey, '');
});

test('picker support renders picker options, selection state, and empty fallback', () => {
  const context = createPickerSupportContext();

  context.state.teamPickerSelections.team_a = ['eq_1'];
  const picker = context.createTeamPickerElement({
    key: 'team_a',
    iconKey: 'dryer',
  });

  assert.equal(picker.className, 'team-picker');
  assert.equal(picker.children[0].className, 'team-picker-head');
  assert.equal(picker.children[0].children[0].textContent, '1개 선택');
  assert.equal(picker.children[0].children[1].disabled, false);
  assert.equal(picker.children[1].dataset.teamKey, 'team_a');
  assert.equal(picker.children[1].dataset.pickTeamEquipment, 'eq_1');
  assert.equal(picker.children[1].classList.contains('is-selected'), true);
  assert.equal(picker.children[1].children[0].textContent, '설비 1');

  const emptyPicker = context.createTeamPickerElement({
    key: 'empty_team',
    iconKey: 'dryer',
  });
  assert.equal(emptyPicker.children[1].className, 'team-picker-empty');
  assert.equal(emptyPicker.children[1].textContent, '없음');
  assert.equal(emptyPicker.children[0].children[1].disabled, true);
});

test('picker support resolves direct team usage chip metadata only for electric summary teams', () => {
  const context = createPickerSupportContext();

  assert.equal(context.shouldHideStandaloneTeamBoard('team_01_01'), true);
  context.__setSelectedTeamKeys(['team_01_01']);
  assert.equal(context.shouldHideStandaloneTeamBoard('team_01_01'), false);
  assert.equal(context.resolveElectricSummaryDirectTeamKey('total_power'), 'team_01_01');
  assert.equal(context.resolveElectricSummaryDirectTeamKey('plantB_power'), 'team_01_01');
  assert.equal(context.resolveElectricSummaryDirectTeamKey('team_a'), '');

  const descriptor = context.getDirectTeamUsageChipDescriptor('plantB_power', '2026-04');
  assert.equal(descriptor?.id, 'direct_usage_team_01_01');
  assert.equal(descriptor?.label, 'Line Alpha');
  assert.equal(descriptor?.iconKey, 'drying');
  assert.equal(descriptor?.usageText, 'usage:42');
  assert.equal(descriptor?.chargeText, 'amount:team_01_01:2026-04');
  assert.equal(descriptor?.detailText, '더블클릭해 월 사용량 수정');
  assert.equal(descriptor?.teamKey, 'team_01_01');
  assert.equal(descriptor?.sourceTeamKey, 'plantB_power');

  context.__setResourceType('gas');
  assert.equal(context.resolveElectricSummaryDirectTeamKey('plantB_power'), '');
  assert.equal(context.getDirectTeamUsageChipDescriptor('plantB_power', '2026-04'), null);
});

test('picker support exposes shared-compressor predicate and picker selection fallback', () => {
  const context = createPickerSupportContext();

  assert.equal(context.isSharedCompressorVirtualEquipmentId('shared_compressor'), true);
  assert.equal(context.isSharedCompressorVirtualEquipmentId('eq_1'), false);
  assert.equal(context.getTeamPickerSelections('team_a').join(','), 'eq_1,eq_3');
  assert.equal(Array.isArray(context.getTeamPickerSelections('missing_team')), true);
  assert.equal(context.getTeamPickerSelections('missing_team').length, 0);
});
