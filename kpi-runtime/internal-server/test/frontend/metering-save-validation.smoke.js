import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const savePersistenceSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/save/persistence.js', import.meta.url),
  'utf8'
);
const saveStoreSyncSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/save/store-sync.js', import.meta.url),
  'utf8'
);
const saveShortcutsSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/save/shortcuts.js', import.meta.url),
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
    values() {
      return [...tokens];
    },
  };
}

function createElementStub(overrides = {}) {
  const attributes = new Map();
  return {
    textContent: '',
    title: '',
    disabled: false,
    value: '',
    classList: createClassList(),
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    querySelectorAll() {
      return [];
    },
    ...overrides,
  };
}

function createWindowStub(eventLog) {
  class FakeCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  const windowStub = {
    __LOCAL_APP_STORE__: null,
    __PRESET_ELECTRIC_ENTRIES__: null,
    clearTimeout() {},
    setTimeout(handler) {
      if (typeof handler === 'function') {
        handler();
      }
      return 1;
    },
    fetch(...args) {
      if (typeof windowStub.__fetchImpl === 'function') {
        return windowStub.__fetchImpl(...args);
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          meta: {
            version: 1,
            recordVersions: {},
          },
        }),
      });
    },
    dispatchEvent(event) {
      eventLog.push({
        target: 'window',
        type: event.type,
        detail: event.detail,
      });
      return true;
    },
  };

  windowStub.parent = windowStub;
  windowStub.top = windowStub;

  return {
    windowStub,
    FakeCustomEvent,
  };
}

function setBinding(context, bindingName, value) {
  context[`__override_${bindingName}`] = value;
  vm.runInContext(`${bindingName} = globalThis.__override_${bindingName};`, context);
}

function createSaveValidationContext(options = {}) {
  const eventLog = [];
  const { windowStub, FakeCustomEvent } = createWindowStub(eventLog);

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
    window: windowStub,
    CustomEvent: FakeCustomEvent,
    equipmentLocalAutosaveTimer: 0,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    ENABLE_SHARED_SERVER_WRITE: true,
    RESOURCE_TOGGLE_ORDER: ['electric', 'gas', 'waste', 'production'],
    sharedServerPersistenceState: {
      writeChain: Promise.resolve(),
      lastErrorMessage: '',
      meta: null,
      conflictMeta: null,
    },
    state: {
      currentMonth: '2026-04',
      selectedDate: '2026-04-18',
      openQuickEntryMenu: false,
      loadedSnapshot: 'snapshot-before',
      cleanStatusText: '초기 상태',
      store: {
        equipmentEntries: {},
        manualSaveHistory: [],
        teamAssignments: {},
        teamMonthlyEntries: {},
        teamMonthlyAmountEntries: {},
      },
    },
    elements: {
      saveStatus: createElementStub(),
      saveEntryBtn: createElementStub(),
      teamSaveBtn: createElementStub(),
      quickEntryToggleBtn: createElementStub(),
      entryCompleteCheckbox: createElementStub(),
      deleteEntryBtn: createElementStub(),
      teamSettlementPreviewBtn: createElementStub(),
      fieldsGrid: createElementStub({
        querySelectorAll() {
          return [];
        },
      }),
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    normalizeMonthValue(value) {
      return String(value || '').trim();
    },
    normalizeManualSaveHistory(value) {
      return value;
    },
    getEventTarget(event) {
      return event?.target || null;
    },
    isBillingDocumentPreviewOpen() {
      return false;
    },
    closeBillingDocumentPreview() {},
    getCurrentResourceType() {
      return 'electric';
    },
    applyResourceType() {},
    handleMonthStep() {},
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getCurrentEquipmentReadingValidationIssues() {
      return [];
    },
    clearEquipmentFieldValidationSuppression() {},
    clearQuickEntryFieldValidationSuppression() {},
    syncSelectedDateHeaderStatus() {},
    renderEquipmentItemCount() {},
    syncQuickEntryMenu() {},
    resetQuickEntryDraft() {},
    getEquipmentInputs() {
      return [];
    },
    getEquipmentItem(fieldKey) {
      return fieldKey ? { id: fieldKey } : null;
    },
    isAutoCalculatedEquipment() {
      return false;
    },
    getEquipmentInputPlaceholder() {
      return '';
    },
    syncEquipmentFieldDayStatusIndicators() {},
    syncEquipmentRestIndicators() {},
    syncEquipmentUsageLabels() {},
    syncAutoCalculatedEquipmentInputs() {},
    syncEquipmentReadingValidationStates() {},
    renderCalendar() {},
    renderSummary() {},
    renderTeamMode() {},
    finalizeEquipmentInputDisplays() {},
    autofillInactiveEquipmentInputsOnComplete() {},
    getCurrentEntryDayStatus() {
      return '';
    },
    loadEquipmentEntry() {},
    setCurrentEntryDayStatus() {},
    normalizeEntryValue(value) {
      return String(value || '').trim();
    },
    hasEntryData(entry) {
      return Boolean(Object.keys(entry?.values || {}).length || entry?.dayStatus);
    },
    formatUpdatedAt() {
      return '표시시간';
    },
    getCurrentEntry() {
      return null;
    },
    getBillingDocumentForMonth() {
      return null;
    },
    getBillingSettlementEntry() {
      return null;
    },
    getCurrentResourceLabel() {
      return '전기';
    },
    getPresetSharedStoreMeta() {
      return {
        version: 3,
        recordVersions: {
          electric: 2,
        },
      };
    },
    rememberSharedStoreMeta(meta) {
      context.sharedServerPersistenceState.meta = meta || null;
      return context.sharedServerPersistenceState.meta;
    },
    getSharedStoreEndpoint() {
      return '/api/shared-store';
    },
    supportsSharedServerPersistence() {
      return true;
    },
    syncActiveResourceDatasetToStore() {},
    clearEquipmentReadingTimelineCaches() {},
    getElectricPresetEntriesForStore() {
      return {};
    },
    queueSharedStoreWrite() {},
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(savePersistenceSource, context, {
    filename: 'save/persistence.js',
  });
  vm.runInContext(saveStoreSyncSource, context, {
    filename: 'save/store-sync.js',
  });
  vm.runInContext(saveShortcutsSource, context, {
    filename: 'save/shortcuts.js',
  });
  context.__eventLog = eventLog;
  return context;
}

test('updateDirtyState shows validation summary and error classes', () => {
  const context = createSaveValidationContext();
  let headerIssues = [];

  setBinding(context, 'getCurrentEquipmentReadingValidationIssues', () => [
    { fieldKey: 'field_1', message: '첫 번째 오류' },
    { fieldKey: 'field_2', message: '두 번째 오류' },
  ]);
  setBinding(context, 'syncSelectedDateHeaderStatus', (issues) => {
    headerIssues = issues;
  });

  context.updateDirtyState();

  assert.equal(context.elements.saveStatus.textContent, '첫 번째 오류 외 1건');
  assert.equal(context.elements.saveStatus.classList.contains('is-dirty'), true);
  assert.equal(context.elements.saveStatus.classList.contains('is-error'), true);
  assert.equal(headerIssues.length, 2);
});

test('updateActionState disables save button while validation issues exist', () => {
  const context = createSaveValidationContext();

  setBinding(context, 'isDirty', () => true);
  setBinding(context, 'getCurrentEquipmentReadingValidationIssues', () => [
    { fieldKey: 'field_1', message: '오류' },
  ]);

  context.updateActionState();

  assert.equal(context.elements.saveEntryBtn.disabled, true);
  assert.equal(context.elements.saveEntryBtn.title, '오류를 먼저 확인해 주세요.');
  assert.equal(context.elements.teamSaveBtn.disabled, true);
  assert.equal(context.elements.quickEntryToggleBtn.disabled, false);
  assert.equal(context.elements.entryCompleteCheckbox.disabled, false);
  assert.equal(context.elements.deleteEntryBtn.disabled, false);
});

test('updateActionState syncs the quick-entry menu without recursive state refresh', () => {
  const context = createSaveValidationContext();
  const syncCalls = [];

  setBinding(context, 'isDirty', () => true);
  setBinding(context, 'syncQuickEntryMenu', (options = {}) => {
    syncCalls.push({ ...options });
  });

  context.updateActionState();

  assert.deepEqual(syncCalls, [{ skipStateRefresh: true }]);
});

test('saveCurrentEquipmentEntry persists entry, snapshot, and update event', () => {
  const context = createSaveValidationContext();
  let syncCalls = 0;
  let clearTimelineCalls = 0;
  let queuedSharedWrites = 0;

  setBinding(context, 'readEquipmentFormData', () => ({
    values: { field_1: '12.5' },
    statuses: { field_1: 'ok' },
    fieldDayStatuses: {},
  }));
  setBinding(context, 'getCurrentEntryDayStatus', () => 'completed');
  setBinding(context, 'createFormSnapshot', () => 'snapshot-after-save');
  setBinding(context, 'syncActiveResourceDatasetToStore', () => {
    syncCalls += 1;
  });
  setBinding(context, 'clearEquipmentReadingTimelineCaches', () => {
    clearTimelineCalls += 1;
  });
  setBinding(context, 'getElectricPresetEntriesForStore', () => ({
    preset: true,
  }));
  setBinding(context, 'queueSharedStoreWrite', () => {
    queuedSharedWrites += 1;
    context.sharedServerPersistenceState.writeChain = Promise.resolve();
  });

  const didSave = context.saveCurrentEquipmentEntry();

  assert.equal(didSave, true);
  assert.equal(syncCalls, 1);
  assert.equal(clearTimelineCalls, 1);
  assert.equal(queuedSharedWrites, 1);
  assert.equal(context.state.loadedSnapshot, 'snapshot-after-save');
  assert.deepEqual(context.state.store.equipmentEntries['2026-04-18'].values, { field_1: '12.5' });
  assert.equal(context.state.store.equipmentEntries['2026-04-18'].completed, true);
  assert.deepEqual(context.window.__LOCAL_APP_STORE__.equipmentEntries['2026-04-18'].values, {
    field_1: '12.5',
  });
  assert.equal(context.__eventLog.length, 1);
  assert.equal(context.__eventLog[0].type, 'kpi:metering-store-updated');
  assert.equal(context.elements.saveStatus.textContent, '마지막 저장 표시시간');
});

test('createFormSnapshot tracks popup drafts across electric and gas together', () => {
  const context = createSaveValidationContext();

  setBinding(context, 'getQuickEntryPopupSnapshotEntries', () => [
    {
      resourceType: 'electric',
      entry: {
        values: { field_1: '12.5' },
        statuses: {},
        fieldDayStatuses: {},
        dayStatus: 'completed',
      },
    },
    {
      resourceType: 'gas',
      entry: {
        values: { gas_a: '77' },
        statuses: {},
        fieldDayStatuses: {},
        dayStatus: '',
      },
    },
  ]);

  const snapshot = JSON.parse(context.createFormSnapshot());

  assert.equal(snapshot.selectedDate, '2026-04-18');
  assert.deepEqual(snapshot.quickEntryPopupEntries, [
    {
      resourceType: 'electric',
      entry: {
        values: { field_1: '12.5' },
        statuses: {},
        fieldDayStatuses: {},
        dayStatus: 'completed',
      },
    },
    {
      resourceType: 'gas',
      entry: {
        values: { gas_a: '77' },
        statuses: {},
        fieldDayStatuses: {},
        dayStatus: '',
      },
    },
  ]);
});

test('performManualSave reports unsupported shared persistence as an error', async () => {
  const context = createSaveValidationContext();
  let dirtyCalls = 0;
  let actionCalls = 0;

  setBinding(context, 'saveCurrentEquipmentEntry', () => true);
  setBinding(context, 'supportsSharedServerPersistence', () => false);
  setBinding(context, 'updateDirtyState', () => {
    dirtyCalls += 1;
  });
  setBinding(context, 'updateActionState', () => {
    actionCalls += 1;
  });

  const didSave = await context.performManualSave({ trigger: 'button' });

  assert.equal(didSave, false);
  assert.equal(dirtyCalls, 1);
  assert.equal(actionCalls, 1);
  assert.equal(context.sharedServerPersistenceState.lastErrorMessage.length > 0, true);
  assert.equal(
    context.elements.saveStatus.textContent,
    context.sharedServerPersistenceState.lastErrorMessage
  );
  assert.equal(context.elements.saveStatus.classList.contains('is-error'), true);
});

test('performManualSave appends manual save history on successful save', async () => {
  const context = createSaveValidationContext();
  const persistCalls = [];
  let dirtyCalls = 0;
  let actionCalls = 0;

  setBinding(context, 'saveCurrentEquipmentEntry', () => true);
  setBinding(context, 'supportsSharedServerPersistence', () => true);
  setBinding(context, 'waitForQueuedPersistence', async () => {});
  setBinding(context, 'persistStore', (options = {}) => {
    persistCalls.push(options);
  });
  setBinding(context, 'createFormSnapshot', () => 'snapshot-after-manual-save');
  setBinding(context, 'getManualSaveContextLabel', () => '전기 2026-04-18 설비별');
  setBinding(context, 'getCurrentResourceType', () => 'electric');
  setBinding(context, 'updateDirtyState', () => {
    dirtyCalls += 1;
  });
  setBinding(context, 'updateActionState', () => {
    actionCalls += 1;
  });

  const didSave = await context.performManualSave({ trigger: 'shortcut' });

  assert.equal(didSave, true);
  assert.equal(persistCalls.length, 1);
  assert.equal(context.state.loadedSnapshot, 'snapshot-after-manual-save');
  assert.equal(context.state.store.manualSaveHistory.length, 1);
  assert.equal(context.state.store.manualSaveHistory[0].trigger, 'shortcut');
  assert.equal(context.state.store.manualSaveHistory[0].contextLabel, '전기 2026-04-18 설비별');
  assert.equal(dirtyCalls, 1);
  assert.equal(actionCalls, 1);
});

test('performManualSave syncs pending team drafts before persisting team mode', async () => {
  const context = createSaveValidationContext({
    currentMode: 'team',
  });
  const helperCalls = [];
  const persistCalls = [];

  setBinding(context, 'syncPendingMeteringDraftInputs', (options = {}) => {
    helperCalls.push({ ...options });
    return true;
  });
  setBinding(context, 'supportsSharedServerPersistence', () => true);
  setBinding(context, 'waitForQueuedPersistence', async () => {});
  setBinding(context, 'persistStore', (options = {}) => {
    persistCalls.push({ ...options });
  });
  setBinding(context, 'createFormSnapshot', () => 'snapshot-after-team-save');
  setBinding(context, 'getManualSaveContextLabel', () => 'team 2026-04 context');
  setBinding(context, 'getCurrentResourceType', () => 'gas');
  setBinding(context, 'updateDirtyState', () => {});
  setBinding(context, 'updateActionState', () => {});

  const didSave = await context.performManualSave({ trigger: 'button' });

  assert.equal(didSave, true);
  assert.deepEqual(helperCalls, [{}]);
  assert.equal(persistCalls.length, 2);
  assert.equal(context.state.loadedSnapshot, 'snapshot-after-team-save');
  assert.equal(context.state.store.manualSaveHistory[0].mode, 'team');
  assert.equal(context.state.store.manualSaveHistory[0].contextLabel, 'team 2026-04 context');
});

test('writeStorePayloadToSharedServer sends shared-store version metadata and remembers the response meta', async () => {
  const context = createSaveValidationContext();
  let fetchRequest = null;

  context.sharedServerPersistenceState.meta = {
    version: 7,
    recordVersions: {
      electric: 4,
    },
  };
  context.window.__fetchImpl = async (url, init = {}) => {
    fetchRequest = {
      url,
      init: {
        ...init,
        headers: JSON.parse(JSON.stringify(init.headers || {})),
        body: JSON.parse(init.body || '{}'),
      },
    };
    return {
      ok: true,
      status: 200,
      json: async () => ({
        ok: true,
        meta: {
          version: 8,
          recordVersions: {
            electric: 5,
          },
        },
      }),
    };
  };

  const didWrite = await context.writeStorePayloadToSharedServer({
    equipmentEntries: {
      '2026-04-18': {
        values: {
          field_1: '12.5',
        },
      },
    },
  });

  assert.equal(didWrite, true);
  assert.equal(fetchRequest.url, '/api/shared-store');
  assert.equal(fetchRequest.init.method, 'PUT');
  assert.equal(fetchRequest.init.body.expectedVersion, 7);
  assert.deepEqual(fetchRequest.init.body.expectedRecordVersions, {
    electric: 4,
  });
  assert.equal(context.sharedServerPersistenceState.conflictMeta, null);
  assert.deepEqual(context.sharedServerPersistenceState.meta, {
    version: 8,
    recordVersions: {
      electric: 5,
    },
  });
});

test('queueSharedStoreWrite records a shared-store conflict message without breaking the write chain', async () => {
  const context = createSaveValidationContext();

  setBinding(context, 'writeStoreToSharedServer', async () => {
    throw new Error('shared_store_version_conflict');
  });

  context.queueSharedStoreWrite();
  await context.sharedServerPersistenceState.writeChain;

  assert.equal(
    context.sharedServerPersistenceState.lastErrorMessage,
    '중앙 서버 버전 충돌로 저장이 보류되었습니다. 새로고침 후 최신 내용을 확인해 주세요.'
  );
});

test('handleGlobalKeydown closes billing preview on Escape before other shortcuts', () => {
  const context = createSaveValidationContext();
  let closeCalls = 0;

  setBinding(context, 'isBillingDocumentPreviewOpen', () => true);
  setBinding(context, 'closeBillingDocumentPreview', () => {
    closeCalls += 1;
  });

  const event = {
    key: 'Escape',
    preventDefaultCalled: false,
    stopPropagationCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
    stopPropagation() {
      this.stopPropagationCalled = true;
    },
  };

  context.handleGlobalKeydown(event);

  assert.equal(closeCalls, 1);
  assert.equal(event.preventDefaultCalled, true);
  assert.equal(event.stopPropagationCalled, true);
});

test('handleGlobalKeydown routes Ctrl+S to manual save', () => {
  const context = createSaveValidationContext();
  const triggers = [];

  setBinding(context, 'performManualSave', (options = {}) => {
    triggers.push(options.trigger || '');
    return Promise.resolve(true);
  });

  const event = {
    key: 's',
    code: 'KeyS',
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    preventDefaultCalled: false,
    stopPropagationCalled: false,
    preventDefault() {
      this.preventDefaultCalled = true;
    },
    stopPropagation() {
      this.stopPropagationCalled = true;
    },
  };

  context.handleGlobalKeydown(event);

  assert.deepEqual(triggers, ['shortcut']);
  assert.equal(event.preventDefaultCalled, true);
  assert.equal(event.stopPropagationCalled, true);
});
