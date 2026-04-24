import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const teamOverviewRenderSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/render.js',
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

function appendInto(parent, node) {
  if (!node) {
    return;
  }

  if (node.isFragment) {
    node.children.forEach((child) => appendInto(parent, child));
    return;
  }

  parent.children.push(node);
}

function createMockElement(tagName = 'div', options = {}) {
  const classList = createClassList();
  let innerHtml = '';
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    attributes: {},
    style: {},
    title: '',
    textContent: '',
    disabled: false,
    isFragment: options.isFragment === true,
    append(...nodes) {
      nodes.flat().forEach((node) => appendInto(this, node));
    },
    appendChild(node) {
      appendInto(this, node);
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

  Object.defineProperty(element, 'innerHTML', {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value ?? '');
      element.children = [];
    },
  });

  return element;
}

function createTeamOverviewRenderContext() {
  let currentResourceType = 'electric';
  let selectedTeamKeys = ['team_02'];
  let orderedTeamGroups = [
    { key: 'total_power', label: '전력총량', iconKey: 'power' },
  ];
  let equipmentItems = [{ id: 'eq-1' }];

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
    Set,
    TOTAL_POWER_TEAM_KEY: 'total_power',
    state: {
      currentMonth: '2026-04',
      openTeamPickerKey: '',
      store: {
        equipmentItems,
      },
      teamPickerSelections: {},
    },
    elements: {
      teamTotalsGrid: createMockElement('div'),
      teamBoards: createMockElement('div'),
    },
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
      createDocumentFragment() {
        return createMockElement('#fragment', { isFragment: true });
      },
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return resourceType === 'electric';
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isWasteResourceType(resourceType = currentResourceType) {
      return resourceType === 'waste';
    },
    isProductionResourceType(resourceType = currentResourceType) {
      return resourceType === 'production';
    },
    getTeamGroup(teamKey) {
      if (teamKey === 'total_power') {
        return { key: 'total_power', label: '전력총량', iconKey: 'power' };
      }

      if (teamKey === 'team_02') {
        return { key: 'team_02', label: 'Line Gamma', iconKey: 'equipment' };
      }

      return { key: String(teamKey || ''), label: `team:${teamKey}`, iconKey: 'equipment' };
    },
    getTeamModeOverallMonthlyUsage() {
      return 120;
    },
    getAvailableEquipmentOptionsForTeam(teamKey) {
      return teamKey === 'total_power' || teamKey === 'team_02'
        ? [{ id: `${teamKey}_a` }]
        : [];
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getCurrentOverallUsageLabel() {
      return '총사용량';
    },
    formatDailyUsage(value) {
      return `usage:${Math.round(Number(value) || 0)}`;
    },
    calculateWasteOverallMonthlyAmount() {
      return 470;
    },
    getElectricTeamModeOverallAmountText() {
      return '금액 amt:910';
    },
    getElectricTeamModeOverallAmountDetailText() {
      return 'detail:electric-total';
    },
    getWasteOverallAmountDetailText() {
      return 'detail:waste-total';
    },
    formatSettlementAmount(value) {
      return `amt:${Math.round(Number(value) || 0)}`;
    },
    createTeamOverviewSelectorElement(selectedTeamKeySet = new Set()) {
      const element = createMockElement('div');
      element.dataset.teamOverviewSelector = JSON.stringify([...selectedTeamKeySet]);
      return element;
    },
    createTeamAssignedListElement(team) {
      const element = createMockElement('div');
      element.dataset.assignedListFor = team?.key || '';
      return element;
    },
    getOrderedTeamGroupsForBoardRender() {
      return [...orderedTeamGroups];
    },
    shouldHideStandaloneTeamBoard() {
      return false;
    },
    supportsDirectTeamMonthlyUsage() {
      return false;
    },
    getTeamBoardMonthlyUsage(teamKey) {
      return teamKey === 'total_power' ? 75 : 25;
    },
    getTeamUsageShareText(teamKey) {
      return `share:${teamKey}`;
    },
    isPowerActiveTeamKey(teamKey) {
      return teamKey === 'total_power';
    },
    isPowerPlantBTeamKey() {
      return false;
    },
    isPowerReactiveTeamKey() {
      return false;
    },
    getTeamBoardDisplayLabel(team) {
      return team?.label || '';
    },
    createIconLabel(labelText, iconKey, options = {}) {
      const element = createMockElement(options.containerTag || 'div');
      element.textContent = String(labelText || '');
      element.iconKey = iconKey;
      return element;
    },
    getTeamContextText(teamKey) {
      return `context:${teamKey}`;
    },
    getTeamContextDetailText(teamKey) {
      return `detail:${teamKey}`;
    },
    getTotalPowerCardAmountText() {
      return 'amount:total';
    },
    getTeamAmountText(teamKey) {
      return `amount:${teamKey}`;
    },
    getTeamAmountDetailText(teamKey) {
      return `amount-detail:${teamKey}`;
    },
    createElectricOtherCostBoardElement() {
      const element = createMockElement('section');
      element.dataset.boardType = 'electric-other-cost';
      return element;
    },
    createGasOtherCostBoardElement() {
      const element = createMockElement('section');
      element.dataset.boardType = 'gas-other-cost';
      return element;
    },
    createTeamPickerElement(team) {
      const element = createMockElement('div');
      element.dataset.teamPickerFor = team?.key || '';
      return element;
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setSelectedTeamKeys(nextTeamKeys = []) {
      selectedTeamKeys = [...nextTeamKeys];
    },
    __setOrderedTeamGroups(nextGroups = []) {
      orderedTeamGroups = [...nextGroups];
    },
    __setEquipmentItems(nextItems = []) {
      equipmentItems = [...nextItems];
      context.state.store.equipmentItems = equipmentItems;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamOverviewRenderSource, context, {
    filename: 'team-overview/render.js',
  });
  return context;
}

test('team overview render builds electric totals card with selector toolbar', () => {
  const context = createTeamOverviewRenderContext();

  context.renderTeamTotals();

  assert.equal(context.elements.teamTotalsGrid.children.length, 1);
  const totalCard = context.elements.teamTotalsGrid.children[0];
  assert.equal(totalCard.classList.contains('is-static'), true);
  assert.equal(totalCard.children.length, 3);
  assert.equal(totalCard.children[1].className, 'team-total-selector-toolbar');
  assert.equal(totalCard.children[1].children[0].dataset.teamTotalReturnHost, 'true');
  assert.equal(totalCard.children[2].dataset.teamOverviewSelector, '["team_02"]');
  assert.equal(totalCard.children[0].children[1].children[1].textContent, '금액 amt:910');
  assert.equal(totalCard.children[0].children[1].children[1].title, 'detail:electric-total');
});

test('team overview render shows non-waste empty state when there are no equipment items', () => {
  const context = createTeamOverviewRenderContext();
  context.__setEquipmentItems([]);

  context.renderTeamBoards();

  assert.equal(context.elements.teamBoards.children.length, 1);
  assert.equal(context.elements.teamBoards.children[0].className, 'team-empty-state');
  assert.match(context.elements.teamBoards.children[0].innerHTML, /설비 없음/);
});

test('team overview render appends electric team boards and other-cost board', () => {
  const context = createTeamOverviewRenderContext();
  context.__setEquipmentItems([{ id: 'eq-1' }]);
  context.__setSelectedTeamKeys(['total_power']);
  context.__setOrderedTeamGroups([
    { key: 'total_power', label: '전력총량', iconKey: 'power' },
  ]);

  context.renderTeamBoards();

  assert.equal(context.elements.teamBoards.children.length, 2);
  const teamBoard = context.elements.teamBoards.children[0];
  assert.equal(teamBoard.dataset.teamBoardKey, 'total_power');
  assert.equal(teamBoard.classList.contains('is-selected'), true);
  assert.equal(teamBoard.classList.contains('is-power-total'), true);
  assert.equal(teamBoard.children[1].dataset.assignedListFor, 'total_power');
  assert.equal(context.elements.teamBoards.children[1].dataset.boardType, 'electric-other-cost');
});

test('team overview render keeps gas other-cost board visible without team selection', () => {
  const context = createTeamOverviewRenderContext();
  context.__setResourceType('gas');
  context.__setEquipmentItems([{ id: 'gas-eq-1' }]);
  context.__setSelectedTeamKeys([]);
  context.__setOrderedTeamGroups([]);

  context.renderTeamBoards();

  assert.equal(context.elements.teamBoards.children.length, 1);
  assert.equal(context.elements.teamBoards.children[0].dataset.boardType, 'gas-other-cost');
});
