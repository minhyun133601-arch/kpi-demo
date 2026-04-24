import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentQuickEntryUiSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/quick-entry-ui.js', import.meta.url),
  'utf8'
);
const equipmentQuickEntrySource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/quick-entry.js', import.meta.url),
  'utf8'
);

function createClassList(initialTokens = []) {
  const tokens = new Set(initialTokens);
  return {
    add(...nextTokens) {
      nextTokens.forEach((token) => tokens.add(token));
    },
    remove(...nextTokens) {
      nextTokens.forEach((token) => tokens.delete(token));
    },
    toggle(token, force) {
      if (typeof force === 'boolean') {
        if (force) {
          tokens.add(token);
        } else {
          tokens.delete(token);
        }
        return force;
      }

      if (tokens.has(token)) {
        tokens.delete(token);
        return false;
      }

      tokens.add(token);
      return true;
    },
    contains(token) {
      return tokens.has(token);
    },
  };
}

function createElementStub(overrides = {}) {
  const attributes = new Map();
  return {
    className: '',
    textContent: '',
    value: '',
    innerHTML: '',
    parentNode: null,
    dataset: {},
    style: {},
    children: [],
    classList: createClassList(),
    focusCalls: 0,
    selectCalls: 0,
    focus() {
      this.focusCalls += 1;
    },
    select() {
      this.selectCalls += 1;
    },
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: 320,
        height: 240,
      };
    },
    ...overrides,
  };
}

function createEquipmentFieldCardStub(fieldKey) {
  return {
    dataset: {
      fieldKey,
    },
    classList: createClassList(),
    scrollCalls: 0,
    scrollIntoView() {
      this.scrollCalls += 1;
    },
    offsetWidth: 120,
  };
}

function createQuickEntryContext(options = {}) {
  const portalRoot = createElementStub();
  const quickEntryWrap = createElementStub();
  const quickEntryMenu = createElementStub({
    offsetWidth: 320,
    offsetHeight: 240,
  });
  const quickEntryResultList = createElementStub();
  const quickEntryTextarea = createElementStub();
  const quickEntryToggleBtn = createElementStub();
  const equipmentOrderHead = createElementStub();
  const equipmentOrderList = createElementStub();
  const quickEntryCounter = createElementStub();
  const quickEntryCounterFraction = createElementStub();
  const fieldCard = createEquipmentFieldCardStub('field-a');
  const resultNodes = [];

  quickEntryWrap.appendChild(quickEntryMenu);
  Object.defineProperty(quickEntryResultList, 'innerHTML', {
    get() {
      return '';
    },
    set() {
      resultNodes.length = 0;
    },
  });
  quickEntryResultList.appendChild = (child) => {
    child.parentNode = quickEntryResultList;
    resultNodes.push(child);
    return child;
  };

  const equipmentInputs = options.equipmentInputs || [
    {
      dataset: { fieldKey: 'field-a' },
      value: '',
    },
    {
      dataset: { fieldKey: 'field-b' },
      value: '44',
    },
  ];

  const equipmentItems =
    options.equipmentItems || {
      'field-a': { id: 'field-a', label: '설비 A' },
      'field-b': { id: 'field-b', label: '설비 B' },
    };

  const resourceDatasets = options.resourceDatasets || {
    electric: {
      equipmentItems: Object.values(equipmentItems),
      equipmentEntries: {},
    },
    gas: {
      equipmentItems: [{ id: 'gas-a', label: '가스 A' }],
      equipmentEntries: {
        '2026-04-18': {
          values: {
            'gas-a': '77',
          },
        },
      },
    },
  };

  let mountHostStateValue = false;
  let equipmentAddResetCalls = 0;
  let equipmentAddSyncCalls = 0;
  let equipmentManageSyncCalls = 0;
  let equipmentOrderSyncCalls = 0;
  let equipmentOrderDragClearCalls = 0;
  let quickEntryRestSyncCalls = 0;
  let quickEntryValidationSyncCalls = 0;
  let dirtyStateCalls = 0;
  let actionStateCalls = 0;
  let autosaveCalls = 0;

  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    document: {
      createElement() {
        return createElementStub();
      },
    },
    window: {
      innerWidth: 1440,
      innerHeight: 900,
      setTimeout(handler) {
        if (typeof handler === 'function') {
          handler();
        }
        return 1;
      },
    },
    QUICK_ENTRY_RESULT_LIMIT: 5,
    QUICK_ENTRY_HIGHLIGHT_DURATION: 1200,
    EQUIPMENT_INPUT_FRACTION_DIGITS: 2,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
    },
    state: {
      selectedDate: '2026-04-18',
      quickEntryResults: [],
      openQuickEntryMenu: false,
      openEquipmentAddMenu: true,
      openEquipmentManageKey: 'field-b',
      openEquipmentOrderMenu: true,
      store: {
        resourceDatasets,
      },
    },
    elements: {
      quickEntryWrap,
      quickEntryToggleBtn,
      quickEntryMenu,
      quickEntryTextarea,
      quickEntryCompleteBtn: createElementStub(),
      quickEntryResultList,
      quickEntryCounter,
      quickEntryCounterFraction,
      equipmentOrderHead,
      equipmentOrderList,
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getMountPortalRoot() {
      return portalRoot;
    },
    toggleMountHostStateClass(className, isActive) {
      mountHostStateValue = className === 'is-quick-entry-active' ? isActive : mountHostStateValue;
    },
    getActiveResourceDataset(store, resourceType) {
      return store?.resourceDatasets?.[resourceType] || null;
    },
    getEquipmentVisibilityContextDate() {
      return context.state.selectedDate;
    },
    isSummaryOnlyEquipment() {
      return false;
    },
    isAutoCalculatedEquipment(item) {
      return Boolean(item?.isAutoCalculated);
    },
    isHiddenEquipmentFieldCard(item) {
      return Boolean(item?.isHidden);
    },
    normalizeEntryValue(value) {
      return String(value || '').trim();
    },
    getTabNavigableEquipmentInputs() {
      return equipmentInputs;
    },
    getEquipmentItem(fieldKey) {
      return equipmentItems[fieldKey] || null;
    },
    isGasResourceType() {
      return Boolean(options.isGasResourceType);
    },
    resetEquipmentAddDraft() {
      equipmentAddResetCalls += 1;
    },
    syncEquipmentAddMenu() {
      equipmentAddSyncCalls += 1;
    },
    syncEquipmentManageMenus() {
      equipmentManageSyncCalls += 1;
    },
    clearEquipmentOrderDragState() {
      equipmentOrderDragClearCalls += 1;
    },
    syncEquipmentOrderMenu() {
      equipmentOrderSyncCalls += 1;
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    sanitizeEquipmentInputValue(value) {
      const numeric = Number.parseFloat(String(value || '').trim());
      return Number.isFinite(numeric) ? String(numeric) : '';
    },
    formatEquipmentInputDisplayByDecimalDigits(value) {
      return String(value);
    },
    getEquipmentDecimalDigits() {
      return 1;
    },
    getValidationReadingDetailOnDate(fieldKey, _date, optionsForField = {}) {
      const numeric = Number.parseFloat(optionsForField.currentRawValue);
      return Number.isFinite(numeric)
        ? {
            value: numeric,
            fractionDigits: 1,
          }
        : null;
    },
    getEquipmentDisplayLabel(equipment) {
      return equipment.label;
    },
    getAdjacentRecordedEquipmentReadingDetail(fieldKey) {
      const references = options.references || {
        'field-a': { value: 10, fractionDigits: 1 },
        'field-b': { value: 90, fractionDigits: 1 },
      };
      return references[fieldKey] || null;
    },
    getEquipmentReadingValidationIssuesForDate(entry) {
      const rawValue = entry?.values?.['field-a'];
      if (rawValue === '12.5') {
        return [{ message: '검침 범위를 다시 확인하세요.' }];
      }
      return [];
    },
    syncEquipmentRestIndicators() {
      quickEntryRestSyncCalls += 1;
    },
    syncEquipmentReadingValidationStates() {
      quickEntryValidationSyncCalls += 1;
    },
    updateDirtyState() {
      dirtyStateCalls += 1;
    },
    updateActionState() {
      actionStateCalls += 1;
    },
    scheduleEquipmentLocalAutosave() {
      autosaveCalls += 1;
    },
    getEquipmentFieldCard(fieldKey) {
      return fieldKey === 'field-a' ? fieldCard : null;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentQuickEntryUiSource, context, {
    filename: 'equipment/quick-entry-ui.js',
  });
  vm.runInContext(equipmentQuickEntrySource, context, {
    filename: 'equipment/quick-entry.js',
  });

  return {
    context,
    portalRoot,
    quickEntryWrap,
    quickEntryMenu,
    quickEntryTextarea,
    quickEntryToggleBtn,
    quickEntryResultList,
    quickEntryCounter,
    quickEntryCounterFraction,
    resultNodes,
    fieldCard,
    getMountHostStateValue() {
      return mountHostStateValue;
    },
    getEquipmentAddResetCalls() {
      return equipmentAddResetCalls;
    },
    getEquipmentAddSyncCalls() {
      return equipmentAddSyncCalls;
    },
    getEquipmentManageSyncCalls() {
      return equipmentManageSyncCalls;
    },
    getEquipmentOrderSyncCalls() {
      return equipmentOrderSyncCalls;
    },
    getEquipmentOrderDragClearCalls() {
      return equipmentOrderDragClearCalls;
    },
    getQuickEntryRestSyncCalls() {
      return quickEntryRestSyncCalls;
    },
    getQuickEntryValidationSyncCalls() {
      return quickEntryValidationSyncCalls;
    },
    getDirtyStateCalls() {
      return dirtyStateCalls;
    },
    getActionStateCalls() {
      return actionStateCalls;
    },
    getAutosaveCalls() {
      return autosaveCalls;
    },
  };
}

test('quick-entry ui opens the menu and closes competing equipment menus first', () => {
  const {
    context,
    portalRoot,
    quickEntryMenu,
    quickEntryTextarea,
    getMountHostStateValue,
    getEquipmentAddResetCalls,
    getEquipmentAddSyncCalls,
    getEquipmentManageSyncCalls,
    getEquipmentOrderSyncCalls,
    getEquipmentOrderDragClearCalls,
  } = createQuickEntryContext();

  context.toggleQuickEntryMenu();

  assert.equal(context.state.openQuickEntryMenu, true);
  assert.equal(context.state.openEquipmentAddMenu, false);
  assert.equal(context.state.openEquipmentManageKey, '');
  assert.equal(context.state.openEquipmentOrderMenu, false);
  assert.equal(getEquipmentAddResetCalls(), 1);
  assert.equal(getEquipmentAddSyncCalls(), 1);
  assert.equal(getEquipmentManageSyncCalls(), 1);
  assert.equal(getEquipmentOrderDragClearCalls(), 1);
  assert.equal(getEquipmentOrderSyncCalls(), 1);
  assert.equal(quickEntryMenu.parentNode, portalRoot);
  assert.equal(quickEntryTextarea.focusCalls, 1);
  assert.equal(quickEntryTextarea.selectCalls, 1);
  assert.equal(getMountHostStateValue(), true);
});

test('quick-entry ui counter merges current inputs with the other resource dataset', () => {
  const { context, quickEntryCounter, quickEntryCounterFraction } = createQuickEntryContext();

  context.syncQuickEntryCounter();

  assert.equal(quickEntryCounterFraction.textContent, '2/3');
  assert.equal(quickEntryCounter.classList.contains('is-complete'), false);
});

test('quick-entry matching picks the closest candidate and applies the formatted value', () => {
  const { context } = createQuickEntryContext({
    equipmentInputs: [
      {
        dataset: { fieldKey: 'field-a' },
        value: '',
      },
      {
        dataset: { fieldKey: 'field-b' },
        value: '',
      },
    ],
  });

  const result = context.applyQuickEntryValue('12.5');

  assert.equal(result.ok, true);
  assert.equal(result.kind, 'warning');
  assert.equal(result.fieldKey, 'field-a');
  assert.equal(result.message.includes('설비 A 12.5 기입'), true);
});

test('quick-entry processing keeps unmatched lines and triggers the save-refresh pipeline', () => {
  const {
    context,
    quickEntryTextarea,
    resultNodes,
    fieldCard,
    getQuickEntryRestSyncCalls,
    getQuickEntryValidationSyncCalls,
    getDirtyStateCalls,
    getActionStateCalls,
    getAutosaveCalls,
  } = createQuickEntryContext();

  quickEntryTextarea.value = '12.5\nbad';

  context.processQuickEntryTextarea();

  assert.equal(quickEntryTextarea.value, 'bad');
  assert.equal(resultNodes.length, 2);
  assert.equal(context.state.quickEntryResults.length, 2);
  assert.equal(getQuickEntryRestSyncCalls(), 1);
  assert.equal(getQuickEntryValidationSyncCalls(), 1);
  assert.equal(getDirtyStateCalls(), 1);
  assert.equal(getActionStateCalls(), 1);
  assert.equal(getAutosaveCalls(), 1);
  assert.equal(fieldCard.scrollCalls, 1);
  assert.equal(quickEntryTextarea.focusCalls, 1);
});
