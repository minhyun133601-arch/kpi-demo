import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const selectionSupportSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/selection-support.js',
    import.meta.url
  ),
  'utf8'
);

function createSelectionSupportContext() {
  let currentResourceType = 'electric';
  let currentTeamGroups = [
    { key: 'team_a', label: 'A팀', iconKey: 'dryer' },
    { key: 'team_hidden', label: '숨김팀', iconKey: 'dryer' },
    { key: 'team_04', label: 'Facility Support', iconKey: 'dryer' },
    { key: 'gas_team', label: '가스팀', iconKey: 'gas' },
    { key: 'team_fixed', label: '고정팀', iconKey: 'gas' },
  ];

  const equipmentItems = [
    { id: 'eq_normal', label: '일반설비' },
    { id: 'eq_hidden', label: '숨김설비' },
    { id: 'eq_reactive', label: '무효전력' },
    { id: 'eq_auto_other', label: '자동기타' },
    { id: 'eq_auto_non_other', label: '자동일반' },
    { id: 'eq_shared_source', label: '공용원본' },
    { id: 'eq_fixed', label: '고정설비' },
    { id: 'eq_forced', label: '강제설비' },
  ];

  const equipmentById = Object.fromEntries(equipmentItems.map((item) => [item.id, item]));
  const autoCalculatedIds = new Set(['eq_auto_other', 'eq_auto_non_other']);
  const otherEquipmentIds = new Set(['eq_auto_other']);
  const hiddenEquipmentIds = new Set(['eq_hidden']);
  const reactiveEquipmentIds = new Set(['eq_reactive']);
  const hiddenStandaloneTeamKeys = new Set(['team_hidden']);

  const state = {
    currentMonth: '2026-04',
    selectedTeamKey: 'missing_team',
    selectedTeamKeys: ['team_a', 'team_hidden'],
    teamSelectionAnchorKey: 'team_hidden',
    teamCalendarSelections: {
      team_a: ['eq_normal', 'eq_shared_source', 'ghost'],
      team_hidden: ['eq_hidden'],
    },
    store: {
      equipmentItems: [...equipmentItems],
      teamAssignments: {
        team_a: [
          'eq_normal',
          'eq_hidden',
          'eq_reactive',
          'eq_auto_other',
          'eq_auto_non_other',
          'ghost',
          'eq_shared_source',
        ],
        team_04: ['eq_auto_other', 'eq_auto_non_other'],
        gas_team: ['eq_normal'],
        team_hidden: ['eq_hidden'],
        team_fixed: ['eq_fixed'],
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
    Set,
    RegExp,
    Promise,
    GAS_FIXED_TEAM_EQUIPMENT_IDS: {
      team_fixed: ['eq_fixed', 'missing_fixed'],
    },
    GAS_TEAM_FORCED_ASSIGNMENTS: {
      eq_forced: 'gas_team',
    },
    SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM: {
      team_a: ['eq_shared_source'],
    },
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_virtual',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    PLANT_B_TOTAL_SELECTION_ID: 'buk_total',
    ELECTRIC_OTHER_COST_TEAM_KEY: 'electric_other_cost',
    GAS_OTHER_COST_TEAM_KEY: 'gas_other_cost',
    state,
    getCurrentTeamGroups() {
      return [...currentTeamGroups];
    },
    getSelectedTeamKeys() {
      return Array.isArray(state.selectedTeamKeys) ? [...state.selectedTeamKeys] : [];
    },
    getEquipmentItem(equipmentId) {
      return equipmentById[equipmentId] || null;
    },
    isHiddenEquipmentFieldCard(equipment) {
      return hiddenEquipmentIds.has(equipment?.id);
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isReactiveSummaryEquipment(equipment) {
      return reactiveEquipmentIds.has(equipment?.id);
    },
    isReactivePowerEquipment() {
      return false;
    },
    isAutoCalculatedEquipment(equipment) {
      return autoCalculatedIds.has(equipment?.id);
    },
    isOtherEquipment(equipment) {
      return otherEquipmentIds.has(equipment?.id);
    },
    shouldApplySharedCompressorSettlement() {
      return true;
    },
    getElectricOtherCostDescriptors() {
      return [{ selectionId: 'electric_other_1' }, { selectionId: '' }];
    },
    getGasOtherCostDescriptors() {
      return [{ selectionId: 'gas_other_1' }];
    },
    getTeamSharedCompressorChipDescriptor(teamKey) {
      return teamKey === 'team_a' ? { id: 'shared-chip' } : null;
    },
    shouldHideStandaloneTeamBoard(teamKey) {
      return hiddenStandaloneTeamKeys.has(String(teamKey || ''));
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setCurrentTeamGroups(nextGroups = []) {
      currentTeamGroups = [...nextGroups];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(selectionSupportSource, context, {
    filename: 'team-overview/selection-support.js',
  });
  return context;
}

test('selection support resolves default team key and team lookup helpers', () => {
  const context = createSelectionSupportContext();

  assert.equal(context.getDefaultSelectedTeamKey(), 'team_a');
  assert.equal(context.hasTeamGroup('team_a'), true);
  assert.equal(context.hasTeamGroup('missing_team'), false);
  assert.equal(context.getTeamGroup('team_04')?.label, 'Facility Support');
  assert.equal(context.getTeamGroup('missing_team'), null);
});

test('selection support filters assigned equipment for electric and gas rules', () => {
  const context = createSelectionSupportContext();

  assert.equal(context.isTeamAssignableEquipment(context.getEquipmentItem('eq_reactive'), 'team_a'), false);
  assert.equal(
    context.isTeamAssignableEquipment(context.getEquipmentItem('eq_reactive'), 'power_reactive'),
    true
  );
  assert.equal(context.getTeamAssignedEquipmentIds('team_a').join(','), 'eq_normal,eq_shared_source');
  assert.equal(context.getTeamAssignedEquipmentIds('team_04').join(','), 'eq_auto_other');

  context.__setResourceType('gas');
  assert.equal(context.getTeamAssignedEquipmentIds('team_fixed').join(','), 'eq_fixed');
  assert.equal(context.getTeamAssignedEquipmentIds('gas_team').join(','), 'eq_forced,eq_normal');
});

test('selection support derives selectable ids and normalizes legacy shared selections', () => {
  const context = createSelectionSupportContext();

  assert.equal(context.getTeamCalendarSelectableIds('team_a').join(','), 'eq_normal,shared_virtual');
  assert.equal(
    context.normalizeTeamCalendarSelectionIds('team_a', ['eq_normal', 'eq_shared_source', 'ghost']).join(','),
    'eq_normal,shared_virtual'
  );
  assert.equal(context.getTeamCalendarSelectableIds('plantB_power').join(','), 'buk_total');
  assert.equal(context.getTeamCalendarSelectableIds('electric_other_cost').join(','), 'electric_other_1');

  context.__setResourceType('gas');
  assert.equal(context.getTeamCalendarSelectableIds('gas_other_cost').join(','), 'gas_other_1');
});

test('selection support sync clears invalid and hidden team state while preserving active selections', () => {
  const context = createSelectionSupportContext();

  context.syncTeamCalendarSelectionState();

  assert.equal(context.state.selectedTeamKey, '');
  assert.equal(context.state.selectedTeamKeys.join(','), 'team_a');
  assert.equal(context.state.teamSelectionAnchorKey, '');
  assert.equal(context.state.teamCalendarSelections.team_a.join(','), 'eq_normal,shared_virtual');
  assert.equal(context.getTeamCalendarSelection('team_a').join(','), 'eq_normal,shared_virtual');
  assert.equal(context.isTeamCalendarSelectionActive('team_a', 'shared_virtual'), true);
  assert.equal(context.isTeamCalendarSelectionActive('team_a', 'ghost'), false);
});
