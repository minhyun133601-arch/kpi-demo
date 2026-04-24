import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const boardInteractionsSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/board-interactions.js',
    import.meta.url
  ),
  'utf8'
);

function createMockElement(tagName = 'div') {
  return {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    attributes: {},
    hidden: false,
    value: '',
    className: '',
    appendChild(node) {
      this.children.push(node);
      return node;
    },
    querySelector(selector) {
      if (selector === '[data-team-direct-usage-input]') {
        return this.children.find((child) => child?.dataset?.teamDirectUsageInput) || null;
      }
      return null;
    },
    closest() {
      return null;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    focus() {
      this.wasFocused = true;
    },
    setSelectionRange(start, end) {
      this.selectionRange = [start, end];
    },
    blur() {
      this.wasBlurred = true;
    },
    matches(selector) {
      if (selector === '[data-team-direct-usage-input]') {
        return Boolean(this.dataset.teamDirectUsageInput);
      }
      if (selector === '[data-team-direct-amount-input]') {
        return Boolean(this.dataset.teamDirectAmountInput);
      }
      return false;
    },
  };
}

function createClosestTarget(matchMap = {}) {
  return {
    closest(selector) {
      return matchMap[selector] || null;
    },
  };
}

function createEvent(target, overrides = {}) {
  return {
    target,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...overrides,
  };
}

function createBoardInteractionsContext() {
  const records = {
    selectedTeams: [],
    selectedCalendars: [],
    directUsageUpdates: [],
    directAmountUpdates: [],
    persistCalls: 0,
    renderEquipmentCalls: 0,
    renderTeamModeCalls: 0,
    renderCalendarCalls: 0,
    renderSummaryCalls: 0,
    syncSelectedDatePresentationCalls: 0,
    updateDirtyStateCalls: 0,
    updateActionStateCalls: 0,
  };

  const state = {
    currentMonth: '2026-04',
    cleanStatusText: '',
    openTeamPickerKey: '',
    teamPickerSelections: {},
    teamCalendarSelections: {},
    loadedSnapshot: null,
    store: {
      equipmentItems: [{ id: 'eq_1' }, { id: 'eq_2' }, { id: 'eq_3' }],
      teamAssignments: {
        team_a: ['eq_1'],
        team_b: ['eq_2'],
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
    TEAM_GROUPS: [{ key: 'team_a' }, { key: 'team_b' }],
    state,
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
    },
    window: {
      setTimeout(callback) {
        callback();
        return 1;
      },
    },
    selectTeamCalendar(teamKey) {
      records.selectedCalendars.push(teamKey);
    },
    updateSelectedTeams(teamKey, event) {
      records.selectedTeams.push({ teamKey, defaultPrevented: Boolean(event?.defaultPrevented) });
    },
    toggleTeamCalendarEquipmentSelection(teamKey, selectionId) {
      records.toggleTeamCalendarEquipmentSelection = { teamKey, selectionId };
    },
    canEditDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'team_direct';
    },
    getDirectTeamMonthlyUsageInputValue() {
      return '120';
    },
    getTeamDisplayLabel(teamKey) {
      return `team:${teamKey}`;
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'team_direct';
    },
    formatWholeNumber(value) {
      return `whole:${value}`;
    },
    setDirectTeamMonthlyUsage(teamKey, value) {
      records.directUsageUpdates.push({ teamKey, value });
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
    syncSelectedDatePresentation() {
      records.syncSelectedDatePresentationCalls += 1;
    },
    updateDirtyState() {
      records.updateDirtyStateCalls += 1;
    },
    updateActionState() {
      records.updateActionStateCalls += 1;
    },
    supportsDirectTeamMonthlyAmount(teamKey) {
      return teamKey === 'team_direct';
    },
    formatSettlementAmount(value) {
      return `amt:${value}`;
    },
    setDirectTeamMonthlyAmount(teamKey, value) {
      records.directAmountUpdates.push({ teamKey, value });
    },
    getAvailableEquipmentOptionsForTeam(teamKey) {
      if (teamKey === 'team_a') {
        return [{ id: 'eq_2' }, { id: 'eq_3' }];
      }
      return [];
    },
    getTeamPickerSelections(teamKey) {
      return Array.isArray(state.teamPickerSelections[teamKey]) ? state.teamPickerSelections[teamKey] : [];
    },
    getTeamAssignedEquipmentIds(teamKey) {
      return [...(state.store.teamAssignments[teamKey] || [])];
    },
    isTeamAssignableEquipment() {
      return true;
    },
    getEquipmentItem(equipmentId) {
      return { id: equipmentId };
    },
    getSelectedTeamKeys() {
      return ['team_a'];
    },
    getTeamCalendarSelectableIds() {
      return ['eq_1', 'eq_2', 'eq_3'];
    },
    persistStore() {
      records.persistCalls += 1;
    },
    renderEquipmentFieldInputs() {
      records.renderEquipmentCalls += 1;
    },
    createFormSnapshot() {
      return { kind: 'snapshot' };
    },
    __records: records,
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(boardInteractionsSource, context, {
    filename: 'team-overview/board-interactions.js',
  });
  return context;
}

test('board interactions route picker toggle, calendar selector, and board selection clicks', () => {
  const context = createBoardInteractionsContext();

  const toggleButton = { dataset: { toggleTeamPicker: 'team_a' } };
  const toggleEvent = createEvent(
    createClosestTarget({
      '[data-toggle-team-picker]': toggleButton,
    })
  );
  context.handleTeamBoardClick(toggleEvent);
  assert.equal(context.state.openTeamPickerKey, 'team_a');
  assert.equal(Array.isArray(context.state.teamPickerSelections.team_a), true);
  assert.equal(context.state.teamPickerSelections.team_a.length, 0);
  assert.equal(toggleEvent.defaultPrevented, true);
  assert.equal(toggleEvent.propagationStopped, true);

  const selectorButton = { dataset: { totalTeamSelector: 'team_b' } };
  const selectorEvent = createEvent(
    createClosestTarget({
      '[data-total-team-selector]': selectorButton,
    })
  );
  context.handleTeamBoardClick(selectorEvent);
  assert.deepEqual(context.__records.selectedCalendars, ['team_b']);

  const board = { dataset: { teamBoardKey: 'team_b' } };
  const boardEvent = createEvent(
    createClosestTarget({
      '[data-team-board-key]': board,
    })
  );
  context.handleTeamBoardClick(boardEvent);
  assert.equal(context.__records.selectedTeams.length, 1);
  assert.equal(context.__records.selectedTeams[0].teamKey, 'team_b');

  const ignoredEvent = createEvent(
    createClosestTarget({
      '.team-direct-usage': {},
      '[data-team-board-key]': board,
    })
  );
  context.handleTeamBoardClick(ignoredEvent);
  assert.equal(context.__records.selectedTeams.length, 1);
});

test('board interactions open direct-usage chip editing and commit sanitized usage input', () => {
  const context = createBoardInteractionsContext();
  const chip = createMockElement('div');
  chip.dataset.directTeamUsageChip = 'team_direct';
  const display = createMockElement('div');
  display.dataset.directTeamUsageDisplay = 'team_direct';
  display.closest = (selector) => (selector === '[data-direct-team-usage-chip]' ? chip : null);

  const openEvent = createEvent(
    createClosestTarget({
      '[data-direct-team-usage-display]': display,
    })
  );
  context.handleTeamDirectUsageDisplayDoubleClick(openEvent);

  const input = chip.children[0];
  assert.ok(input);
  assert.equal(display.hidden, true);
  assert.equal(input.dataset.teamDirectUsageInput, 'team_direct');
  assert.equal(input.dataset.teamDirectUsageSurface, 'chip');
  assert.equal(input.wasFocused, true);
  assert.deepEqual(input.selectionRange, [0, 3]);

  input.value = '12a3';
  const inputEvent = createEvent(input);
  input.closest = (selector) => (selector === '[data-team-direct-usage-input]' ? input : null);
  context.handleTeamDirectUsageInput(inputEvent);
  assert.equal(input.value, '123');

  context.handleTeamDirectUsageChange(createEvent(input));
  assert.equal(input.value, 'whole:123');
  assert.equal(context.state.cleanStatusText, '팀별 월 사용량을 수정했습니다. 저장해 주세요.');
  assert.equal(context.__records.directUsageUpdates.length, 1);
  assert.equal(context.__records.directUsageUpdates[0].teamKey, 'team_direct');
  assert.equal(context.__records.directUsageUpdates[0].value, '123');
  assert.equal(context.__records.renderTeamModeCalls > 0, true);
  assert.equal(context.__records.renderSummaryCalls > 0, true);

  const keydownEvent = createEvent(input, { key: 'Escape' });
  context.handleTeamDirectUsageKeydown(keydownEvent);
  assert.equal(keydownEvent.defaultPrevented, true);
});

test('board interactions sanitize and commit direct amount input', () => {
  const context = createBoardInteractionsContext();
  const input = createMockElement('input');
  input.dataset.teamDirectAmountInput = 'team_direct';
  input.closest = (selector) => (selector === '[data-team-direct-amount-input]' ? input : null);

  input.value = '4x5';
  context.handleTeamDirectAmountInput(createEvent(input));
  assert.equal(input.value, '45');

  context.handleTeamDirectAmountChange(createEvent(input));
  assert.equal(input.value, 'amt:45');
  assert.equal(context.state.cleanStatusText, '팀별 월 금액을 수정했습니다. 저장해 주세요.');
  assert.equal(context.__records.directAmountUpdates.length, 1);
  assert.equal(context.__records.directAmountUpdates[0].teamKey, 'team_direct');
  assert.equal(context.__records.directAmountUpdates[0].value, '45');

  const keydownEvent = createEvent(input, { key: 'Enter' });
  context.handleTeamDirectAmountKeydown(keydownEvent);
  assert.equal(keydownEvent.defaultPrevented, true);
  assert.equal(input.wasBlurred, true);
});

test('board interactions manage picker selections, assignment completion, and removal', () => {
  const context = createBoardInteractionsContext();

  context.toggleTeamPicker('team_a');
  assert.equal(context.state.openTeamPickerKey, 'team_a');
  assert.equal(Array.isArray(context.state.teamPickerSelections.team_a), true);
  assert.equal(context.state.teamPickerSelections.team_a.length, 0);

  context.toggleTeamEquipmentSelection('team_a', 'eq_2');
  assert.equal(context.state.teamPickerSelections.team_a.join(','), 'eq_2');

  context.addSelectedEquipmentToTeam('team_a');
  assert.equal(context.state.store.teamAssignments.team_a.join(','), 'eq_1,eq_2');
  assert.equal(context.state.store.teamAssignments.team_b.length, 0);
  assert.equal(context.state.openTeamPickerKey, '');
  assert.equal(context.state.teamCalendarSelections.team_a.join(','), 'eq_1,eq_2,eq_3');
  assert.equal(context.__records.persistCalls, 1);
  assert.equal(context.__records.renderEquipmentCalls, 1);
  assert.equal(context.__records.renderCalendarCalls, 1);
  assert.deepEqual(context.state.loadedSnapshot, { kind: 'snapshot' });

  context.removeEquipmentFromTeam('team_a', 'eq_2');
  assert.equal(context.state.store.teamAssignments.team_a.join(','), 'eq_1');
  assert.equal(context.__records.persistCalls, 2);
  assert.equal(context.__records.renderEquipmentCalls, 2);
});
