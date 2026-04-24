import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const assignedListSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/assigned-list.js',
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
    title: '',
    value: '',
    readOnly: false,
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

function findDescendant(node, predicate) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  if (predicate(node)) {
    return node;
  }

  for (const child of node.children || []) {
    const match = findDescendant(child, predicate);
    if (match) {
      return match;
    }
  }

  return null;
}

function createAssignedListContext() {
  let lastSortedIds = [];

  const teamGroups = {
    total_power: { key: 'total_power', label: 'Plant A 총량', iconKey: 'power' },
    plantB_power: { key: 'plantB_power', label: 'Plant B 총량', iconKey: 'power' },
    team_direct: { key: 'team_direct', label: '직접 입력팀', iconKey: 'direct' },
    team_general: { key: 'team_general', label: '일반팀', iconKey: 'equipment' },
    team_01_01: { key: 'team_01_01', label: 'Line Alpha', iconKey: 'drying' },
  };

  const equipmentById = {
    eq_a: { id: 'eq_a', label: 'dryer' },
    eq_b: { id: 'eq_b', label: 'boiler' },
    eq_hidden: { id: 'eq_hidden', label: 'hidden' },
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
    TOTAL_POWER_TEAM_KEY: 'total_power',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    TEAM_01_01_KEY: 'team_01_01',
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_compressor',
    SHARED_COMPRESSOR_VIRTUAL_LABEL: '공용 콤프레샤',
    state: {
      currentMonth: '2026-04',
    },
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
    },
    getCurrentResourceType() {
      return 'electric';
    },
    isElectricResourceType(resourceType = 'electric') {
      return resourceType === 'electric';
    },
    isGasResourceType(resourceType = 'electric') {
      return resourceType === 'gas';
    },
    getTeamGroup(teamKey) {
      return teamGroups[teamKey] || null;
    },
    getTeamDisplayLabel(teamOrKey) {
      if (typeof teamOrKey === 'string') {
        return teamGroups[teamOrKey]?.label || '';
      }
      return teamOrKey?.label || '';
    },
    canEditDirectTeamMonthlyUsage(teamKey) {
      return ['team_direct', 'team_01_01'].includes(String(teamKey || ''));
    },
    canEditDirectTeamMonthlyAmount() {
      return false;
    },
    getDirectTeamMonthlyUsageInputValue() {
      return '40';
    },
    getDirectTeamMonthlyAmountInputValue() {
      return '150';
    },
    supportsDirectTeamMonthlyAmount(teamKey) {
      return teamKey === 'team_direct';
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return ['team_direct', 'team_01_01'].includes(String(teamKey || ''));
    },
    getTeamAssignedEquipmentIds(teamKey) {
      if (teamKey === 'total_power') {
        return ['eq_hidden', 'eq_b', 'eq_a'];
      }
      if (teamKey === 'team_general') {
        return ['eq_a'];
      }
      return [];
    },
    shouldHideSharedCompressorSourceEquipmentForTeam(_teamKey, equipmentId) {
      return equipmentId === 'eq_hidden';
    },
    getEquipmentItem(equipmentId) {
      return equipmentById[equipmentId] || null;
    },
    getEquipmentDisplayLabel(equipmentOrLabel) {
      if (equipmentOrLabel && typeof equipmentOrLabel === 'object') {
        return equipmentOrLabel.label || '';
      }
      return String(equipmentOrLabel || '');
    },
    getResourceDuplicateBadgeIconKeyForEquipment() {
      return '';
    },
    getTeamAssignedChipUsageText(equipmentId) {
      return `usage:${equipmentId}`;
    },
    getTeamAssignedChipChargeText(equipmentId) {
      return `amt:${equipmentId}`;
    },
    getTeamAssignedChipDetailText(equipmentId) {
      return `detail:${equipmentId}`;
    },
    getDirectTeamUsageChipDescriptor(teamKey) {
      if (teamKey === 'total_power') {
        return {
          id: 'direct_total_power',
          selectionId: 'direct_total_power',
          label: '직입 총량',
          iconKey: 'power',
          usageText: 'usage:40',
          chargeText: 'amt:40',
          detailText: 'detail:direct_total_power',
          removable: false,
          isDirectTeamUsage: true,
          teamKey: 'team_01_01',
          sourceTeamKey: 'total_power',
        };
      }

      if (teamKey === 'team_01_01') {
        return {
          id: 'direct_team_01_01',
          selectionId: 'direct_team_01_01',
          label: 'Line Alpha',
          iconKey: 'drying',
          usageText: 'usage:40',
          chargeText: 'amt:40',
          detailText: 'detail:team_01_01',
          removable: false,
          isDirectTeamUsage: true,
          teamKey: 'team_01_01',
          sourceTeamKey: 'team_01_01',
        };
      }

      return null;
    },
    shouldApplySharedCompressorSettlement() {
      return true;
    },
    getSharedCompressorSettlementRatio() {
      return 0.5;
    },
    getSharedCompressorSettlementSourceIds() {
      return ['shared_source_1'];
    },
    formatDailyUsage(value) {
      return `usage:${Number(value)}`;
    },
    calculateTeamSharedCompressorSettlementUsage() {
      return 12;
    },
    getTeamSharedCompressorSettlementChargeText() {
      return 'amt:12';
    },
    getTeamSharedCompressorSettlementDetailText() {
      return 'shared-detail';
    },
    sortTotalPowerCardChipDescriptors(descriptors = []) {
      lastSortedIds = descriptors.map((item) => item.id);
      return [...descriptors].sort((left, right) => String(left.id).localeCompare(String(right.id)));
    },
    createPlantBTotalCardToggleListElement(monthValue) {
      const element = createMockElement('div');
      element.className = 'plantB-toggle-list';
      element.dataset.plantBToggleList = monthValue;
      return element;
    },
    getTeamCalendarSelection(teamKey) {
      if (teamKey === 'team_general') {
        return ['eq_a'];
      }
      return [];
    },
    shouldShowTeamAssignedChipShare(teamKey) {
      return teamKey === 'team_general';
    },
    getTotalPowerCardDescriptorShareText(item) {
      return `share:tp:${item.id}`;
    },
    getPlantBTotalCardDescriptorShareText(item) {
      return `share:bk:${item.id}`;
    },
    getTotalPowerCardDescriptorChargeText(item) {
      return `charge:tp:${item.id}`;
    },
    getPlantBTotalCardDescriptorChargeText(item) {
      return `charge:bk:${item.id}`;
    },
    getTotalPowerCardDescriptorDetailText(item) {
      return `detail:tp:${item.id}`;
    },
    getPlantBTotalCardDescriptorDetailText(item) {
      return `detail:bk:${item.id}`;
    },
    createIconLabel(label, _iconKey, options = {}) {
      const element = createMockElement(options.containerTag || 'span');
      element.className = options.containerClass || '';
      element.textContent = String(label || '');
      return element;
    },
    isElectricTotalSummaryTeamKey(teamKey) {
      return ['total_power', 'plantB_power'].includes(String(teamKey || ''));
    },
    getTeamAssignedChipShareText(_teamKey, selectionId) {
      return selectionId === 'eq_a' ? 'share:50%' : '';
    },
    getTeamAssignedChipShareDetailText(_teamKey, selectionId) {
      return selectionId === 'eq_a' ? 'share-detail:eq_a' : '';
    },
    __getLastSortedIds() {
      return [...lastSortedIds];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(assignedListSource, context, {
    filename: 'team-overview/assigned-list.js',
  });
  return context;
}

test('assigned list direct metric field honors editability rules', () => {
  const context = createAssignedListContext();

  assert.equal(context.isDirectTeamUsageBoardEditable(context.TEAM_01_01_KEY, 'gas'), false);
  assert.equal(context.isDirectTeamUsageBoardEditable('team_direct', 'electric'), true);

  const usageField = context.createDirectTeamMetricFieldElement('team_direct', 'usage');
  const usageInput = findDescendant(
    usageField,
    (node) => node?.dataset?.teamDirectUsageInput === 'team_direct'
  );
  assert.equal(usageInput?.readOnly, false);
  assert.equal(usageInput?.value, '40');

  const amountField = context.createDirectTeamMetricFieldElement('team_direct', 'amount');
  const amountInput = findDescendant(
    amountField,
    (node) => node?.dataset?.teamDirectAmountInput === 'team_direct'
  );
  const hint = findDescendant(
    amountField,
    (node) => node?.className === 'team-direct-usage-hint'
  );

  assert.equal(amountField.classList.contains('is-readonly'), true);
  assert.equal(amountInput?.readOnly, true);
  assert.equal(amountInput?.title, '수정은 Plant B 정산에서');
  assert.equal(hint?.textContent, '수정은 Plant B 정산에서');
});

test('assigned list composes shared compressor and total-power chip descriptors', () => {
  const context = createAssignedListContext();

  const sharedDescriptor = context.getTeamSharedCompressorChipDescriptor('team_general', '2026-04');
  assert.equal(sharedDescriptor?.id, 'shared_compressor');
  assert.equal(sharedDescriptor?.selectionId, 'shared_compressor');
  assert.equal(sharedDescriptor?.label, '공용 콤프레샤');
  assert.equal(sharedDescriptor?.iconKey, 'equipment');
  assert.equal(sharedDescriptor?.usageText, 'usage:12');
  assert.equal(sharedDescriptor?.chargeText, 'amt:12');
  assert.equal(sharedDescriptor?.detailText, 'shared-detail');
  assert.equal(sharedDescriptor?.removable, false);

  const descriptors = context.getTeamAssignedChipDescriptors(context.TOTAL_POWER_TEAM_KEY, '2026-04');
  assert.deepEqual(context.__getLastSortedIds(), [
    'eq_b',
    'eq_a',
    'direct_total_power',
    'shared_compressor',
  ]);
  assert.deepEqual(
    descriptors.map((item) => item.id),
    ['direct_total_power', 'eq_a', 'eq_b', 'shared_compressor']
  );
  assert.equal(descriptors.some((item) => item.id === 'eq_hidden'), false);
});

test('assigned list returns plantB toggle list or direct-entry stack by branch', () => {
  const context = createAssignedListContext();

  const plantBList = context.createTeamAssignedListElement(
    context.getTeamGroup(context.PLANT_B_POWER_TEAM_KEY)
  );
  assert.equal(plantBList.dataset.plantBToggleList, '2026-04');

  const directEntryStack = context.createTeamAssignedListElement(context.getTeamGroup('team_direct'));
  assert.equal(directEntryStack.className, 'team-direct-entry-stack');
  assert.equal(directEntryStack.children.length, 2);
  assert.ok(
    findDescendant(
      directEntryStack,
      (node) => node?.dataset?.teamDirectUsageInput === 'team_direct'
    )
  );
  assert.ok(
    findDescendant(
      directEntryStack,
      (node) => node?.dataset?.teamDirectAmountInput === 'team_direct'
    )
  );
});

test('assigned list renders direct chips and removable toggle chips', () => {
  const context = createAssignedListContext();

  const directList = context.createTeamAssignedListElement(context.getTeamGroup(context.TEAM_01_01_KEY));
  const directChip = findDescendant(
    directList,
    (node) => node?.dataset?.directTeamUsageChip === context.TEAM_01_01_KEY
  );
  const directDisplay = findDescendant(
    directChip,
    (node) => node?.dataset?.directTeamUsageDisplay === context.TEAM_01_01_KEY
  );
  const directValue = findDescendant(
    directChip,
    (node) => node?.dataset?.directTeamUsageValue === context.TEAM_01_01_KEY
  );

  assert.equal(directChip.classList.contains('team-assigned-chip-direct'), true);
  assert.equal(directDisplay?.attributes?.role, 'button');
  assert.equal(directValue?.textContent, 'usage:40');

  const normalList = context.createTeamAssignedListElement(context.getTeamGroup('team_general'));
  const removeButton = findDescendant(
    normalList,
    (node) => node?.dataset?.removeTeamEquipment === 'eq_a'
  );
  const toggleButton = findDescendant(
    normalList,
    (node) =>
      node?.tagName === 'BUTTON' &&
      node?.dataset?.toggleTeamCalendarEquipment === 'eq_a'
  );
  const shareValue = findDescendant(
    toggleButton,
    (node) => node?.className === 'team-assigned-chip-share'
  );

  assert.ok(removeButton);
  assert.equal(toggleButton?.attributes?.['aria-pressed'], 'true');
  assert.match(toggleButton?.title || '', /share-detail:eq_a/);
  assert.equal(shareValue?.textContent, 'share:50%');
});
