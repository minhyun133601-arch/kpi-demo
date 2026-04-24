import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeBootstrapSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/bootstrap.js'),
  'utf8'
);

const ELEMENT_TARGET_KEYS = [
  'electricResourceBtn',
  'gasResourceBtn',
  'wasteResourceBtn',
  'productionResourceBtn',
  'equipmentModeBtn',
  'teamModeBtn',
  'saveEntryBtn',
  'teamSaveBtn',
  'calendarDisplayModeToggleBtn',
  'clearCardSelectionBtn',
  'yearPicker',
  'monthPicker',
  'prevMonthBtn',
  'nextMonthBtn',
  'entryForm',
  'deleteEntryBtn',
  'equipmentOrderToggleBtn',
  'equipmentAddToggleBtn',
  'quickEntryToggleBtn',
  'equipmentFullscreenToggleBtn',
  'teamFullscreenToggleBtn',
  'equipmentFieldsSection',
  'fieldsGrid',
  'equipmentOrderList',
  'addEquipmentItemBtn',
  'equipmentItemNameInput',
  'equipmentItemFactorInput',
  'quickEntryTextarea',
  'quickEntryCompleteBtn',
  'teamTotalsGrid',
  'teamBoards',
  'entryCompleteCheckbox',
  'teamSettlementBtn',
  'teamSettlementAttachBtn',
  'teamSettlementPreviewBtn',
  'teamSettlementOpenBtn',
  'teamSettlementCompleteBtn',
  'teamSettlementFields',
  'billingDocumentPreviewOpenBtn',
  'billingDocumentPreviewCloseBtn',
  'billingDocumentPreviewModal',
];

const NOOP_HANDLER_NAMES = [
  'handleCalendarDisplayModeToggleClick',
  'handleClearCardSelectionClick',
  'handlePeriodChange',
  'handleSave',
  'handleClearCurrentEntry',
  'toggleEquipmentOrderMenu',
  'toggleEquipmentAddMenu',
  'toggleQuickEntryMenu',
  'handleFormFullscreenToggleClick',
  'handleEquipmentSectionDragScrollStart',
  'handleEquipmentFieldGridClick',
  'handleEquipmentFieldGridDoubleClick',
  'handleEquipmentFieldInput',
  'handleEquipmentFieldValueChange',
  'handleEquipmentFieldKeydown',
  'handleEquipmentFieldCardDragStart',
  'handleEquipmentFieldCardDragOver',
  'handleEquipmentFieldCardDrop',
  'handleEquipmentFieldCardDragEnd',
  'handleEquipmentOrderDragStart',
  'handleEquipmentOrderDragOver',
  'handleEquipmentOrderDrop',
  'handleEquipmentOrderDragEnd',
  'handleAddEquipmentItem',
  'handleEquipmentItemInputKeydown',
  'handleQuickEntryTextareaKeydown',
  'handleQuickEntryCompleteClick',
  'handleTeamBoardClick',
  'handleTeamDirectUsageDisplayDoubleClick',
  'handleTeamDirectUsageInput',
  'handleTeamDirectAmountInput',
  'handleTeamDirectUsageChange',
  'handleTeamDirectAmountChange',
  'handleTeamDirectUsageKeydown',
  'handleTeamDirectAmountKeydown',
  'handleTeamDirectUsageFocusOut',
  'handleEntryCompleteCheckboxChange',
  'handleTeamSettlementClick',
  'handleTeamSettlementAttachClick',
  'handleTeamSettlementPreviewClick',
  'handleTeamSettlementOpenClick',
  'handleTeamSettlementCompleteClick',
  'handleTeamSettlementFieldClick',
  'handleTeamSettlementFieldInput',
  'handleBillingDocumentPreviewOpenClick',
  'handleBillingDocumentPreviewCloseClick',
  'handleBillingDocumentPreviewModalClick',
  'handleDocumentClick',
  'handleDocumentFullscreenChange',
  'handleGlobalKeydown',
  'handleGuardedNativeDragStart',
  'handleEquipmentSectionDragScrollMove',
  'handleEquipmentSectionDragScrollEnd',
];

function createListenerTarget(name) {
  const listeners = new Map();
  return {
    name,
    listeners,
    addEventListener(type, handler, options) {
      const capture = options === true || Boolean(options?.capture);
      const registrations = listeners.get(type) || [];
      registrations.push({ handler, capture });
      listeners.set(type, registrations);
    },
    removeEventListener(type, handler, options) {
      const capture = options === true || Boolean(options?.capture);
      const registrations = listeners.get(type) || [];
      listeners.set(
        type,
        registrations.filter(
          (registration) =>
            registration.handler !== handler || registration.capture !== capture
        )
      );
    },
    getHandlers(type) {
      return (listeners.get(type) || []).map(({ handler }) => handler);
    },
    getListenerCount() {
      return [...listeners.values()].reduce((sum, registrations) => sum + registrations.length, 0);
    },
  };
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimeBootstrapContext(options = {}) {
  const calls = {
    resolveElements: 0,
    assertMountReady: 0,
    setCurrentMode: [],
    renderEquipmentFieldInputs: 0,
    setupPeriodControls: 0,
    restorePersistedBillingDocumentDirectoryHandle: 0,
    syncEquipmentAddMenu: 0,
    syncQuickEntryMenu: 0,
    renderModeUI: 0,
    applyMonth: [],
    persistStore: [],
    handleMonthStep: [],
    applyResourceType: [],
    applyMode: [],
    performManualSave: [],
    registerRuntimeCleanup: [],
  };
  const mountDocument = createListenerTarget('document');
  const windowTarget = createListenerTarget('window');
  const loadStoreValue = options.loadStoreValue || {
    resourceType: 'electric',
    mode: 'equipment',
  };
  const state = {
    eventsBound: false,
    store: null,
  };
  const elements = Object.fromEntries(
    ELEMENT_TARGET_KEYS.map((key) => [key, createListenerTarget(key)])
  );

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
    Promise,
    RegExp,
    state,
    elements,
    document: mountDocument,
    window: windowTarget,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    resolveElements() {
      calls.resolveElements += 1;
    },
    assertMountReady() {
      calls.assertMountReady += 1;
    },
    loadStore() {
      return loadStoreValue;
    },
    resolveInitialMode() {
      return options.initialMode || 'team';
    },
    setCurrentMode(mode) {
      calls.setCurrentMode.push(mode);
      context.state.store.mode = mode;
    },
    renderEquipmentFieldInputs() {
      calls.renderEquipmentFieldInputs += 1;
    },
    setupPeriodControls() {
      calls.setupPeriodControls += 1;
    },
    restorePersistedBillingDocumentDirectoryHandle() {
      calls.restorePersistedBillingDocumentDirectoryHandle += 1;
      return Promise.resolve();
    },
    syncEquipmentAddMenu() {
      calls.syncEquipmentAddMenu += 1;
    },
    syncQuickEntryMenu() {
      calls.syncQuickEntryMenu += 1;
    },
    renderModeUI() {
      calls.renderModeUI += 1;
    },
    today() {
      return options.today || new Date('2026-04-21T00:00:00Z');
    },
    getMonthValue(value) {
      const date = value instanceof Date ? value : new Date(value);
      const monthValue = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
      return monthValue;
    },
    applyMonth(monthValue) {
      calls.applyMonth.push(monthValue);
    },
    persistStore(payload) {
      calls.persistStore.push(payload);
    },
    getMountDocument() {
      return mountDocument;
    },
    registerRuntimeCleanup(callback) {
      calls.registerRuntimeCleanup.push(callback);
    },
    handleMonthStep(direction) {
      calls.handleMonthStep.push(direction);
    },
    applyResourceType(resourceType) {
      calls.applyResourceType.push(resourceType);
      return Promise.resolve();
    },
    applyMode(mode) {
      calls.applyMode.push(mode);
      return Promise.resolve();
    },
    performManualSave(payload) {
      calls.performManualSave.push(payload);
      return Promise.resolve();
    },
    isDirty() {
      return options.isDirty ? options.isDirty() : false;
    },
  };

  NOOP_HANDLER_NAMES.forEach((name) => {
    context[name] = () => {};
  });

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeBootstrapSource, context, {
    filename: 'runtime/bootstrap.js',
  });

  return {
    context,
    calls,
    elements,
    mountDocument,
    windowTarget,
  };
}

test('runtime bootstrap init orchestrates store load and initial month apply', () => {
  const { context, calls } = createRuntimeBootstrapContext();
  const bindEventsStubCalls = [];

  context.bindEvents = () => {
    bindEventsStubCalls.push(true);
  };

  context.init();

  assert.equal(calls.resolveElements, 1);
  assert.equal(calls.assertMountReady, 1);
  assert.equal(context.state.store.resourceType, 'electric');
  assert.deepEqual(calls.setCurrentMode, ['team']);
  assert.equal(calls.renderEquipmentFieldInputs, 1);
  assert.equal(calls.setupPeriodControls, 1);
  assert.equal(bindEventsStubCalls.length, 1);
  assert.equal(calls.restorePersistedBillingDocumentDirectoryHandle, 1);
  assert.equal(calls.syncEquipmentAddMenu, 1);
  assert.equal(calls.syncQuickEntryMenu, 1);
  assert.equal(calls.renderModeUI, 1);
  assert.deepEqual(calls.applyMonth, ['2026-04']);
  assert.deepEqual(toPlainJson(calls.persistStore), [{ skipLocalFileWrite: true }]);
});

test('runtime bootstrap bindEvents wires listeners once and registers cleanup handlers', () => {
  const { context, calls, elements, mountDocument, windowTarget } = createRuntimeBootstrapContext();

  context.bindEvents();

  assert.equal(context.state.eventsBound, true);
  assert.equal(elements.gasResourceBtn.getHandlers('click').length, 1);
  assert.equal(elements.equipmentModeBtn.getHandlers('click').length, 1);
  assert.equal(elements.entryForm.getHandlers('submit').length, 1);
  assert.equal(elements.fieldsGrid.getHandlers('dragover').length, 1);
  assert.equal(elements.teamSettlementFields.getHandlers('input').length, 2);
  assert.equal(mountDocument.getHandlers('click').length, 1);
  assert.equal(mountDocument.getHandlers('keydown').length, 1);
  assert.equal(mountDocument.getHandlers('pointermove').length, 1);
  assert.equal(windowTarget.getHandlers('beforeunload').length, 1);
  assert.equal(calls.registerRuntimeCleanup.length, 8);

  const listenerCountSnapshot = {
    gas: elements.gasResourceBtn.getListenerCount(),
    fieldsGrid: elements.fieldsGrid.getListenerCount(),
    mountDocument: mountDocument.getListenerCount(),
    window: windowTarget.getListenerCount(),
  };

  context.bindEvents();

  assert.deepEqual(
    {
      gas: elements.gasResourceBtn.getListenerCount(),
      fieldsGrid: elements.fieldsGrid.getListenerCount(),
      mountDocument: mountDocument.getListenerCount(),
      window: windowTarget.getListenerCount(),
    },
    listenerCountSnapshot
  );
});

test('runtime bootstrap beforeunload guard blocks only when the store is dirty', () => {
  let dirty = false;
  const { context, windowTarget } = createRuntimeBootstrapContext({
    isDirty: () => dirty,
  });

  context.bindEvents();

  const beforeUnload = windowTarget.getHandlers('beforeunload')[0];
  assert.equal(typeof beforeUnload, 'function');

  const cleanEvent = {
    defaultPrevented: false,
    returnValue: undefined,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  beforeUnload(cleanEvent);
  assert.equal(cleanEvent.defaultPrevented, false);
  assert.equal(cleanEvent.returnValue, undefined);

  dirty = true;
  const dirtyEvent = {
    defaultPrevented: false,
    returnValue: undefined,
    preventDefault() {
      this.defaultPrevented = true;
    },
  };
  beforeUnload(dirtyEvent);
  assert.equal(dirtyEvent.defaultPrevented, true);
  assert.equal(dirtyEvent.returnValue, '');
});

test('runtime bootstrap click handlers delegate to resource, mode, and save actions', async () => {
  const { context, calls, elements } = createRuntimeBootstrapContext();

  context.bindEvents();

  await elements.gasResourceBtn.getHandlers('click')[0]();
  await elements.teamModeBtn.getHandlers('click')[0]();
  await elements.saveEntryBtn.getHandlers('click')[0]();

  assert.deepEqual(calls.applyResourceType, ['gas']);
  assert.deepEqual(calls.applyMode, ['team']);
  assert.deepEqual(toPlainJson(calls.performManualSave), [{ trigger: 'button' }]);
});
