import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const [teamOverviewSummarySource, teamOverviewBoardSupportSource] = await Promise.all([
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/team-overview/summary.js',
      import.meta.url
    ),
    'utf8'
  ),
  fs.readFile(
    new URL(
      '../../../../utility/apps/metering/team-overview/board-support.js',
      import.meta.url
    ),
    'utf8'
  ),
]);

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
    title: '',
    textContent: '',
    innerHTML: '',
    append(...nodes) {
      nodes.flat().forEach((node) => {
        this.children.push(node);
      });
    },
    appendChild(node) {
      this.children.push(node);
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

function findChildByDataset(element, key, expectedValue) {
  return (element?.children || []).find((child) => child?.dataset?.[key] === expectedValue) || null;
}

function createTeamOverviewContext() {
  let currentResourceType = 'electric';
  let selectedTeamKeys = [];
  let electricOtherCostDescriptors = [
    { label: '기타전기1', value: 120, selectionId: 'electric_other_1' },
    { label: '기타전기2', value: 180, selectionId: 'electric_other_2' },
  ];
  let gasOtherCostDescriptors = [
    { label: '기타가스1', value: 90, selectionId: 'gas_other_1' },
  ];

  const teamGroupsByResource = {
    electric: [
      { key: 'total_power', label: 'Plant A총량', iconKey: 'power' },
      { key: 'plantB_power', label: 'Plant B총량', iconKey: 'power' },
      { key: 'team_02', label: 'Line Gamma', iconKey: 'equipment' },
      { key: 'team_03', label: 'Line Delta', iconKey: 'equipment' },
    ],
    gas: [
      { key: 'team_01_02', label: 'Line Beta', iconKey: 'gas' },
      { key: 'gas_a', label: '가스A', iconKey: 'gas' },
      { key: 'gas_b', label: '가스B', iconKey: 'gas' },
    ],
    waste: [
      { key: 'waste_a', label: '폐수A', iconKey: 'waste' },
      { key: 'waste_b', label: '폐수B', iconKey: 'waste' },
    ],
    production: [
      { key: 'production_a', label: '생산A', iconKey: 'production' },
    ],
  };

  const directTeamUsageMap = {
    'team_01_01:2026-04:electric': 40,
    'plantB_power:2026-04:electric': 56,
  };

  const boardMonthlyUsageMap = {
    'team_02:2026-04:false:electric': 25,
    'team_03:2026-04:false:electric': 35,
    'gas_a:2026-04:true:gas': 15,
    'gas_b:2026-04:true:gas': 15,
    'gas_a:2026-04:false:gas': 15,
    'gas_b:2026-04:false:gas': 15,
    'waste_a:2026-04:true:waste': 12,
    'waste_b:2026-04:true:waste': 8,
  };

  const teamAmountMap = {
    'team_02:2026-04': 320,
    'team_03:2026-04': 210,
  };

  const teamCalendarSelections = {
    'plantB_power:2026-04': ['buk_1'],
    'electric_other_cost:2026-04': ['electric_other_1'],
    'gas_other_cost:2026-04': [],
  };

  const gasSourceUsageMap = {
    gas_source_1: 7.2,
    gas_source_2: 8.1,
  };

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
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    TOTAL_POWER_TEAM_KEY: 'total_power',
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    TEAM_01_01_KEY: 'team_01_01',
    ELECTRIC_OTHER_COST_TEAM_KEY: 'electric_other_cost',
    GAS_OTHER_COST_TEAM_KEY: 'gas_other_cost',
    ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS: [
      'total_power',
      'plantB_power',
      'team_02',
      'team_03',
    ],
    ELECTRIC_TOTAL_SUMMARY_TEAM_KEYS: ['total_power', 'plantB_power'],
    GAS_OVERVIEW_TEAM_KEYS: ['gas_a', 'gas_b'],
    WASTE_OVERVIEW_TEAM_KEYS: ['waste_a', 'waste_b'],
    GAS_CORRECTION_SOURCE_IDS: ['gas_source_1', 'gas_source_2'],
    state: {
      currentMonth: '2026-04',
    },
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
    },
    getCurrentResourceType() {
      return currentResourceType;
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
      const source = teamGroupsByResource[currentResourceType] || [];
      return source.find((team) => team.key === teamKey) || null;
    },
    getTeamDisplayLabel(teamOrKey) {
      const team =
        typeof teamOrKey === 'string'
          ? context.getTeamGroup(teamOrKey)
          : teamOrKey && typeof teamOrKey === 'object'
            ? teamOrKey
            : null;
      return team?.label || '';
    },
    supportsDirectTeamMonthlyUsage(teamKey, resourceType = currentResourceType) {
      return (
        resourceType === 'electric' &&
        ['team_01_01', 'plantB_power'].includes(String(teamKey || ''))
      );
    },
    getDirectTeamMonthlyUsage(teamKey, monthValue, resourceType) {
      return directTeamUsageMap[`${teamKey}:${monthValue}:${resourceType}`] ?? null;
    },
    getTeamBoardMonthlyUsage(teamKey, options = {}) {
      const monthValue = options.monthValue || context.state.currentMonth;
      const selectionOnly = options.selectionOnly === true;
      return (
        boardMonthlyUsageMap[
          `${teamKey}:${monthValue}:${selectionOnly}:${currentResourceType}`
        ] ?? null
      );
    },
    getTotalPowerCardMonthlyUsage() {
      return 100;
    },
    calculateUsageShare(usage, totalUsage) {
      if (!Number.isFinite(usage) || !Number.isFinite(totalUsage) || totalUsage === 0) {
        return null;
      }

      return usage / totalUsage;
    },
    getTotalPowerCardChargePool() {
      return 1000;
    },
    getBillingSettlementEntry(monthValue, scopeKey) {
      if (monthValue === '2026-04' && scopeKey === 'plantB') {
        return {
          fields: {
            electricityChargeTotal: 550,
          },
        };
      }

      return null;
    },
    resolveBillingSettlementElectricityChargeTotalValue(fields = {}) {
      const numericValue = Number(fields.electricityChargeTotal);
      return Number.isFinite(numericValue) ? numericValue : null;
    },
    getBillingSettlementNumericField(fieldKey, monthValue, scopeKey) {
      if (
        fieldKey === 'base_charge' &&
        monthValue === '2026-04' &&
        scopeKey === 'plantB'
      ) {
        return 50;
      }

      return null;
    },
    sumFiniteValues(values = []) {
      const finiteValues = values.filter((value) => Number.isFinite(value));
      return finiteValues.length
        ? finiteValues.reduce((sum, value) => sum + value, 0)
        : null;
    },
    calculateTeamAmount(teamKey, monthValue) {
      return teamAmountMap[`${teamKey}:${monthValue}`] ?? null;
    },
    isPowerReactiveTeamKey(teamKey) {
      return teamKey === 'team_03';
    },
    calculateElectricManageDisplayAmount() {
      return 222;
    },
    formatSettlementAmount(value) {
      return `amt:${Math.round(Number(value))}`;
    },
    getElectricTeamModeOverallMonthlyUsage() {
      return 140;
    },
    getCurrentOverallUsageLabel() {
      return '총사용량';
    },
    formatUsageShare(value) {
      return `share:${Math.round(Number(value) * 100)}%`;
    },
    createIconLabel(labelText, iconKey, options = {}) {
      const element = createMockElement(options.containerTag || 'div');
      element.textContent = String(labelText || '');
      element.iconKey = iconKey;
      element.options = options;
      return element;
    },
    formatDailyUsage(value) {
      return `usage:${Math.round(Number(value) || 0)}`;
    },
    getWasteOverviewTeamAmountText(teamKey) {
      return `waste-amount:${teamKey}`;
    },
    getGasOverviewTeamAmountText(teamKey) {
      return `gas-amount:${teamKey}`;
    },
    getWasteTeamAmountDetailText(teamKey) {
      return `waste-detail:${teamKey}`;
    },
    getGasTeamAmountDetailText(teamKey) {
      return `gas-detail:${teamKey}`;
    },
    getTeamContextDetailText(teamKey) {
      return `context:${teamKey}`;
    },
    getTeamUsageShareText(teamKey, totalUsage) {
      return `team-share:${teamKey}:${totalUsage}`;
    },
    calculateWasteOverallMonthlyUsage() {
      return 80;
    },
    getTeamModeOverallMonthlyUsage() {
      return 30;
    },
    getCurrentTeamGroups() {
      return teamGroupsByResource[currentResourceType] || [];
    },
    getSelectedTeamKeys() {
      return [...selectedTeamKeys];
    },
    getTeamAssignedChipDisplayUsage(equipmentId) {
      return gasSourceUsageMap[equipmentId] ?? null;
    },
    getTeamCalendarSelection(teamKey, monthValue = context.state.currentMonth) {
      return teamCalendarSelections[`${teamKey}:${monthValue}`] || [];
    },
    getPlantBTotalCardToggleDescriptors() {
      return [
        {
          selectionId: 'buk_1',
          label: 'Plant BA',
          usageText: 'usage:11',
          chargeText: 'amt:77',
          detailText: 'detail:buk_1',
          iconKey: 'power',
        },
        {
          selectionId: 'buk_2',
          label: 'Plant BB',
          usageText: 'usage:9',
          chargeText: '',
          detailText: 'detail:buk_2',
          iconKey: 'power',
        },
      ];
    },
    getPlantBTotalCardDescriptorDetailText(item) {
      return `detail-extra:${item.selectionId}`;
    },
    getPlantBTotalCardDescriptorShareText(item) {
      return item.selectionId === 'buk_1' ? 'share:buk_1' : '';
    },
    getElectricOtherCostDescriptors() {
      return electricOtherCostDescriptors;
    },
    getElectricOtherCostAmountText() {
      return 'amt-text:electric';
    },
    getElectricOtherCostDetailText() {
      return 'detail:electric';
    },
    calculateElectricOtherCostAmount() {
      return electricOtherCostDescriptors.reduce((sum, item) => sum + Number(item.value || 0), 0);
    },
    getGasOtherCostDescriptors() {
      return gasOtherCostDescriptors;
    },
    getGasOtherCostAmountText() {
      return 'amt-text:gas';
    },
    getGasOtherCostDetailText() {
      return 'detail:gas';
    },
    calculateGasOtherCostAmount() {
      return gasOtherCostDescriptors.reduce((sum, item) => sum + Number(item.value || 0), 0);
    },
    __setResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setSelectedTeamKeys(nextTeamKeys = []) {
      selectedTeamKeys = [...nextTeamKeys];
    },
    __setElectricOtherCostDescriptors(nextDescriptors = []) {
      electricOtherCostDescriptors = [...nextDescriptors];
    },
    __setGasOtherCostDescriptors(nextDescriptors = []) {
      gasOtherCostDescriptors = [...nextDescriptors];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamOverviewSummarySource, context, {
    filename: 'team-overview/summary.js',
  });
  vm.runInContext(teamOverviewBoardSupportSource, context, {
    filename: 'team-overview/board-support.js',
  });
  return context;
}

test('team overview summary resolves amount, share, and ordered team helpers', () => {
  const context = createTeamOverviewContext();

  assert.equal(context.getTeamBoardDisplayLabel('total_power'), 'Plant A 전력 총량');
  assert.equal(context.calculateElectricOverviewTeamAmount('team_01_01', '2026-04'), 600);
  assert.equal(context.getElectricOverviewTeamAmountText('team_02', '2026-04'), '금액 amt:320');
  assert.equal(
    context.getElectricOverviewTeamShareText('team_02', '2026-04'),
    'Plant A 전력 share:25%'
  );

  context.__setSelectedTeamKeys([]);
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(context.getOrderedTeamGroupsForBoardRender().map((team) => team.key))
    ),
    ['total_power', 'plantB_power']
  );

  context.__setResourceType('gas');
  context.__setSelectedTeamKeys(['gas_a']);
  assert.equal(context.getGasOverviewTeamShareText('gas_a', '2026-04'), '가스 총사용량 share:50%');
  assert.deepEqual(
    JSON.parse(
      JSON.stringify(context.getOrderedTeamGroupsForBoardRender().map((team) => team.key))
    ),
    ['gas_a']
  );
});

test('team overview selector builds active buttons and meta text for resource layouts', () => {
  const context = createTeamOverviewContext();
  const electricGrid = context.createTeamOverviewSelectorElement(new Set(['team_02']));
  const electricButton = findChildByDataset(electricGrid, 'totalTeamSelector', 'team_02');

  assert.equal(electricGrid.children.length, 4);
  assert.ok(electricButton);
  assert.equal(electricButton.classList.contains('is-active'), true);
  assert.equal(electricButton.attributes['aria-pressed'], 'true');
  assert.match(electricButton.children[1].textContent, /usage:25/);
  assert.equal(electricButton.children[2].children.length, 2);

  context.__setResourceType('gas');
  const gasGrid = context.createTeamOverviewSelectorElement(new Set(['gas_a']));
  const gasButton = findChildByDataset(gasGrid, 'totalTeamSelector', 'gas_a');

  assert.equal(gasGrid.children.length, 2);
  assert.ok(gasButton);
  assert.equal(gasButton.classList.contains('is-gas-team'), true);
  assert.equal(gasButton.classList.contains('is-active'), true);
});

test('team overview board support renders gas lng note and plantB toggle list', () => {
  const context = createTeamOverviewContext();
  context.__setResourceType('gas');

  const gasLngCard = context.createGasLngReferenceSelectorCard();
  assert.equal(gasLngCard.tagName, 'ARTICLE');
  assert.match(gasLngCard.children[1].textContent, /usage:15/);
  assert.equal(gasLngCard.children[2].children.length, 2);

  context.__setResourceType('electric');
  const plantBList = context.createPlantBTotalCardToggleListElement('2026-04');
  assert.equal(plantBList.children.length, 2);
  assert.equal(plantBList.children[0].classList.contains('is-active'), true);
  assert.equal(plantBList.children[0].children[0].attributes['aria-pressed'], 'true');
  assert.equal(plantBList.children[1].children[0].attributes['aria-pressed'], 'false');
});

test('team overview board support renders other-cost boards for electric and gas', () => {
  const context = createTeamOverviewContext();

  const electricBoard = context.createElectricOtherCostBoardElement('2026-04');
  assert.equal(electricBoard.children.length, 2);
  assert.match(electricBoard.children[0].children[1].children[0].textContent, /amt:300/);
  assert.equal(electricBoard.children[1].children.length, 2);

  context.__setResourceType('gas');
  context.__setGasOtherCostDescriptors([]);
  const gasBoard = context.createGasOtherCostBoardElement('2026-04');
  assert.equal(gasBoard.children.length, 2);
  assert.equal(gasBoard.children[1].children.length, 1);
  assert.equal(gasBoard.children[1].children[0].tagName, 'P');
});
