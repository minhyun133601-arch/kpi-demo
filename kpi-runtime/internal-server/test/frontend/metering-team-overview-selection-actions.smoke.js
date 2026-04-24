import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const selectionActionsSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/selection-actions.js',
    import.meta.url
  ),
  'utf8'
);

function createSelectionActionsContext() {
  let currentResourceType = 'electric';
  let currentTeamGroups = [
    { key: 'team_total' },
    { key: 'team_a' },
    { key: 'team_b' },
    { key: 'gas_a' },
  ];
  let orderedTeamGroups = [
    { key: 'team_total' },
    { key: 'team_a' },
    { key: 'team_b' },
  ];
  let resolveCardMultiSelectionResult = ['team_b', 'team_total'];

  const records = {
    syncSelectedDatePresentationCalls: 0,
    renderTeamModeCalls: 0,
    renderCalendarCalls: 0,
    renderSummaryCalls: 0,
  };

  const state = {
    currentMonth: '2026-04',
    selectedTeamKey: '',
    selectedTeamKeys: ['team_total', 'gas_a', 'missing_team'],
    teamSelectionAnchorKey: '',
    teamCalendarSelections: {
      team_total: ['eq_1', 'shared_virtual'],
      team_a: ['eq_2'],
    },
    store: {
      equipmentItems: [
        { id: 'eq_1' },
        { id: 'source_1' },
        { id: 'source_2' },
        { id: 'eq_2' },
        { id: 'eq_3' },
      ],
    },
  };

  const selectableIdsByTeam = {
    team_total: ['eq_1', 'shared_virtual'],
    team_a: ['eq_2', 'eq_3'],
    team_b: ['eq_3'],
    gas_a: ['gas_eq_1'],
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
    ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS: ['team_total', 'team_a', 'team_b'],
    GAS_OVERVIEW_TEAM_KEYS: ['gas_a', 'gas_b'],
    SHARED_COMPRESSOR_VIRTUAL_ID: 'shared_virtual',
    state,
    hasTeamGroup(teamKey) {
      return currentTeamGroups.some((team) => team.key === teamKey);
    },
    getTeamCalendarSelectableIds(teamKey) {
      return [...(selectableIdsByTeam[teamKey] || [])];
    },
    getTeamCalendarSelection(teamKey) {
      return Array.isArray(state.teamCalendarSelections[teamKey])
        ? [...state.teamCalendarSelections[teamKey]]
        : [];
    },
    syncSelectedDatePresentation() {
      records.syncSelectedDatePresentationCalls += 1;
    },
    renderTeamMode() {
      records.renderTeamModeCalls += 1;
    },
    renderCalendar() {
      records.renderCalendarCalls += 1;
    },
    renderSummary() {
      records.renderSummaryCalls += 1;
    },
    getCurrentTeamGroups() {
      return [...currentTeamGroups];
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return resourceType === 'electric';
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isSharedCompressorVirtualEquipmentId(equipmentId) {
      return equipmentId === 'shared_virtual';
    },
    getSharedCompressorSettlementSourceIds() {
      return ['source_1', 'source_2'];
    },
    getOrderedTeamGroupsForBoardRender() {
      return [...orderedTeamGroups];
    },
    resolveCardMultiSelection() {
      return [...resolveCardMultiSelectionResult];
    },
    __records: records,
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setCurrentTeamGroups(nextGroups = []) {
      currentTeamGroups = [...nextGroups];
    },
    __setOrderedTeamGroups(nextGroups = []) {
      orderedTeamGroups = [...nextGroups];
    },
    __setResolveCardMultiSelectionResult(nextSelection = []) {
      resolveCardMultiSelectionResult = [...nextSelection];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(selectionActionsSource, context, {
    filename: 'team-overview/selection-actions.js',
  });
  return context;
}

test('selection actions getSelectedTeamKeys filters selection by current resource and current groups', () => {
  const context = createSelectionActionsContext();

  assert.equal(context.getSelectedTeamKeys().join(','), 'team_total');

  context.state.selectedTeamKeys = ['gas_a', 'team_a'];
  context.__setResourceType('gas');
  assert.equal(context.getSelectedTeamKeys().join(','), 'gas_a');
});

test('selection actions getSelectedTeamCalendarEquipmentIds expands shared virtual ids in equipment order', () => {
  const context = createSelectionActionsContext();

  assert.equal(context.getSelectedTeamCalendarEquipmentIds().join(','), 'eq_1,source_1,source_2');
});

test('selection actions select team calendar and toggle equipment selection while keeping rerender pipeline', () => {
  const context = createSelectionActionsContext();

  context.selectTeamCalendar('team_a');
  assert.equal(context.state.selectedTeamKey, 'team_a');
  assert.equal(context.state.selectedTeamKeys.join(','), 'team_a');
  assert.equal(context.state.teamSelectionAnchorKey, 'team_a');
  assert.equal(context.state.teamCalendarSelections.team_a.join(','), 'eq_2');

  context.selectTeamCalendar('team_b', { selectAll: true });
  assert.equal(context.state.teamCalendarSelections.team_b.join(','), 'eq_3');

  context.state.selectedTeamKeys = ['team_total'];
  context.toggleTeamCalendarEquipmentSelection('team_a', 'eq_3');
  assert.equal(context.state.selectedTeamKey, 'team_a');
  assert.equal(context.state.teamSelectionAnchorKey, 'team_a');
  assert.equal(context.state.selectedTeamKeys.join(','), 'team_total,team_a');
  assert.equal(context.state.teamCalendarSelections.team_a.join(','), 'eq_2,eq_3');
  assert.equal(context.__records.syncSelectedDatePresentationCalls >= 3, true);
  assert.equal(context.__records.renderTeamModeCalls >= 3, true);
  assert.equal(context.__records.renderCalendarCalls >= 3, true);
  assert.equal(context.__records.renderSummaryCalls >= 3, true);
});

test('selection actions update selected teams respects electric guard and hydrates missing calendar selection', () => {
  const context = createSelectionActionsContext();

  context.updateSelectedTeams('gas_a', { shiftKey: true });
  assert.equal(context.state.selectedTeamKey, '');

  delete context.state.teamCalendarSelections.team_b;
  context.__setResolveCardMultiSelectionResult(['team_b']);
  context.updateSelectedTeams('team_b', { shiftKey: true });

  assert.equal(context.state.selectedTeamKeys.join(','), 'team_b');
  assert.equal(context.state.selectedTeamKey, 'team_b');
  assert.equal(context.state.teamSelectionAnchorKey, 'team_b');
  assert.equal(context.state.teamCalendarSelections.team_b.join(','), 'eq_3');
});
