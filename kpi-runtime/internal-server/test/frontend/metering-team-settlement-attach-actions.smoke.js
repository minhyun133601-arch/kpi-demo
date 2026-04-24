import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const teamSettlementAttachActionsSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('team-settlement/attach-actions.js'),
  'utf8'
);

function createClassList(initialTokens = []) {
  const tokens = new Set(initialTokens);
  return {
    add(...nextTokens) {
      nextTokens.forEach((token) => tokens.add(token));
    },
    contains(token) {
      return tokens.has(token);
    },
    toArray() {
      return [...tokens];
    },
  };
}

function createFocusableElement() {
  return {
    focusCount: 0,
    focus() {
      this.focusCount += 1;
    },
  };
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createTeamSettlementAttachActionsContext(options = {}) {
  const calls = {
    alerts: [],
    confirms: [],
    syncEquipmentFullscreenUI: 0,
    closeBillingDocumentPreview: 0,
    deleteBillingDocumentStorage: [],
    deleteBillingDocumentForScope: [],
    persistStore: [],
    updateDirtyState: 0,
    renderTeamMode: 0,
    requestBillingDocumentFile: 0,
    uploads: [],
    setBillingDocumentForScope: [],
    setBillingSettlementEntryForScope: [],
    promptBillingDocumentDirectoryHandle: [],
    timeouts: [],
  };
  const attachButton = createFocusableElement();
  const saveStatus = {
    textContent: '',
    classList: createClassList(),
  };
  const state = {
    currentMonth: options.currentMonth ?? '2026-04',
    isTeamSettlementPanelOpen: false,
    isBillingDocumentUploading: false,
    loadedSnapshot: null,
    cleanStatusText: '',
  };
  const existingSettlementEntry = options.existingSettlementEntry ?? null;
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
    MODES: {
      TEAM: 'team',
    },
    elements: {
      teamSettlementAttachBtn: attachButton,
      saveStatus,
    },
    getCurrentMode() {
      return options.currentMode ?? 'team';
    },
    supportsBillingSettlementForCurrentResource() {
      return options.supportsSettlement ?? true;
    },
    getCurrentResourceType() {
      return options.resourceType ?? 'gas';
    },
    supportsBillingDocumentForResource() {
      return options.supportsBillingDocument ?? true;
    },
    normalizeMonthValue(value) {
      return options.normalizedMonthValue ?? (value ? String(value) : '');
    },
    getCurrentBillingSettlementScope() {
      return options.scopeKey ?? 'scope:gas';
    },
    getBillingSettlementScopeTitle() {
      return options.scopeTitle ?? 'Plant B 정산';
    },
    isElectricResourceType(resourceType) {
      return (resourceType || options.resourceType || 'gas') === 'electric';
    },
    calculateTotalPowerMonthlyUsage() {
      if (Object.prototype.hasOwnProperty.call(options, 'totalPowerMonthlyUsage')) {
        return options.totalPowerMonthlyUsage;
      }
      return 100;
    },
    syncEquipmentFullscreenUI() {
      calls.syncEquipmentFullscreenUI += 1;
    },
    closeBillingDocumentPreview() {
      calls.closeBillingDocumentPreview += 1;
    },
    getBillingDocumentForMonth() {
      return options.existingBillingDocument ?? null;
    },
    async deleteBillingDocumentStorage(document, resourceType) {
      calls.deleteBillingDocumentStorage.push({ document, resourceType });
    },
    deleteBillingDocumentForScope(monthValue, scopeKey, resourceType) {
      calls.deleteBillingDocumentForScope.push({ monthValue, scopeKey, resourceType });
    },
    persistStore(payload) {
      calls.persistStore.push(toPlainJson(payload));
    },
    createFormSnapshot() {
      return options.snapshotValue ?? { snapshot: true };
    },
    getBillingDocumentLabel(monthValue, resourceType, scopeKey) {
      return `${resourceType}:${scopeKey}:${monthValue}`;
    },
    updateDirtyState() {
      calls.updateDirtyState += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    async requestBillingDocumentFile() {
      calls.requestBillingDocumentFile += 1;
      return options.selectedFile ?? null;
    },
    async uploadBillingDocument(file, monthValue, scopeKey) {
      calls.uploads.push({ file, monthValue, scopeKey });
      if (options.uploadError) {
        throw options.uploadError;
      }
      return options.uploadedDocument ?? { fileName: 'uploaded.pdf', savedToLocalDirectory: true };
    },
    normalizeBillingDocument(monthValue, document, resourceType, scopeKey) {
      return {
        ...document,
        normalizedMonthValue: monthValue,
        normalizedResourceType: resourceType,
        normalizedScopeKey: scopeKey,
      };
    },
    setBillingDocumentForScope(monthValue, document, scopeKey, resourceType) {
      calls.setBillingDocumentForScope.push({ monthValue, document, scopeKey, resourceType });
    },
    getBillingSettlementEntry() {
      return existingSettlementEntry;
    },
    setBillingSettlementEntryForScope(monthValue, entry, scopeKey) {
      calls.setBillingSettlementEntryForScope.push({ monthValue, entry, scopeKey });
    },
    supportsSharedServerPersistence() {
      return options.supportsSharedServerPersistence ?? true;
    },
    focusTeamSettlementPrimaryInput() {
      calls.timeouts.push('focus-primary');
    },
    async promptBillingDocumentDirectoryHandle(resourceType) {
      calls.promptBillingDocumentDirectoryHandle.push(resourceType);
      if (options.directoryError) {
        throw options.directoryError;
      }
      return options.directoryHandle ?? null;
    },
    getBillingDocumentDirectoryName(resourceType) {
      return resourceType === 'electric' ? '전기 청구서' : '가스 청구서';
    },
    window: {
      alert(message) {
        calls.alerts.push(String(message));
      },
      confirm(message) {
        calls.confirms.push(String(message));
        return options.confirmResult ?? true;
      },
      setTimeout(handler, delay) {
        calls.timeouts.push(delay);
        handler();
        return 1;
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamSettlementAttachActionsSource, context, {
    filename: 'team-settlement/attach-actions.js',
  });

  return {
    context,
    calls,
    state,
    attachButton,
    saveStatus,
  };
}

test('team settlement attach actions require a valid month before opening attach flow', async () => {
  const { context, calls, state } = createTeamSettlementAttachActionsContext({
    normalizedMonthValue: '',
  });

  await context.handleTeamSettlementAttachClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.deepEqual(calls.alerts, ['기입 년월을 먼저 선택해 주세요.']);
  assert.equal(calls.syncEquipmentFullscreenUI, 1);
});

test('team settlement attach actions require total power for electric settlement', async () => {
  const { context, calls, state } = createTeamSettlementAttachActionsContext({
    resourceType: 'electric',
    totalPowerMonthlyUsage: null,
  });

  await context.handleTeamSettlementAttachClick();

  assert.equal(state.isTeamSettlementPanelOpen, false);
  assert.deepEqual(calls.alerts, ['전력총량이 계산되어야 정산을 열 수 있습니다.']);
  assert.equal(calls.syncEquipmentFullscreenUI, 1);
});

test('team settlement attach actions delete an existing billing document and refocus attach', async () => {
  const existingBillingDocument = { fileName: 'gas.pdf' };
  const { context, calls, state, attachButton } = createTeamSettlementAttachActionsContext({
    existingBillingDocument,
    resourceType: 'gas',
    scopeKey: 'scope:gas',
  });

  await context.handleTeamSettlementAttachClick();

  assert.equal(state.isTeamSettlementPanelOpen, true);
  assert.deepEqual(calls.confirms, ['"gas.pdf" 첨부를 삭제할까요?']);
  assert.deepEqual(calls.deleteBillingDocumentStorage, [
    { document: existingBillingDocument, resourceType: 'gas' },
  ]);
  assert.deepEqual(calls.deleteBillingDocumentForScope, [
    { monthValue: '2026-04', scopeKey: 'scope:gas', resourceType: 'gas' },
  ]);
  assert.deepEqual(calls.persistStore, [{ skipLocalFileWrite: true }]);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(state.cleanStatusText, 'gas:scope:gas:2026-04 첨부 삭제 완료');
  assert.equal(state.isBillingDocumentUploading, false);
  assert.equal(calls.syncEquipmentFullscreenUI, 2);
  assert.equal(attachButton.focusCount, 1);
});

test('team settlement attach actions stop when existing document deletion is cancelled', async () => {
  const { context, calls, state } = createTeamSettlementAttachActionsContext({
    existingBillingDocument: { fileName: 'gas.pdf' },
    confirmResult: false,
  });

  await context.handleTeamSettlementAttachClick();

  assert.equal(state.isTeamSettlementPanelOpen, true);
  assert.deepEqual(calls.deleteBillingDocumentStorage, []);
  assert.deepEqual(calls.persistStore, []);
  assert.equal(calls.syncEquipmentFullscreenUI, 1);
});

test('team settlement attach actions upload a billing document and clear completion state', async () => {
  const selectedFile = { name: 'upload.pdf' };
  const uploadedDocument = {
    fileName: 'uploaded.pdf',
    savedToLocalDirectory: false,
  };
  const existingSettlementEntry = {
    monthValue: '2026-04',
    fields: { billing_amount: '1000' },
    completed: true,
  };
  const { context, calls, state } = createTeamSettlementAttachActionsContext({
    selectedFile,
    uploadedDocument,
    existingSettlementEntry,
    supportsSharedServerPersistence: false,
  });

  await context.handleTeamSettlementAttachClick();

  assert.equal(state.isTeamSettlementPanelOpen, true);
  assert.equal(calls.requestBillingDocumentFile, 1);
  assert.deepEqual(calls.uploads, [
    { file: selectedFile, monthValue: '2026-04', scopeKey: 'scope:gas' },
  ]);
  assert.deepEqual(calls.setBillingDocumentForScope, [
    {
      monthValue: '2026-04',
      document: {
        fileName: 'uploaded.pdf',
        savedToLocalDirectory: false,
        normalizedMonthValue: '2026-04',
        normalizedResourceType: 'gas',
        normalizedScopeKey: 'scope:gas',
      },
      scopeKey: 'scope:gas',
      resourceType: 'gas',
    },
  ]);
  assert.equal(calls.setBillingSettlementEntryForScope.length, 1);
  assert.equal(calls.setBillingSettlementEntryForScope[0].entry.completed, false);
  assert.deepEqual(calls.persistStore, [{ skipLocalFileWrite: true }]);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(state.cleanStatusText, 'gas:scope:gas:2026-04 저장 완료 (청구서 폴더 선택 필요)');
  assert.equal(state.isBillingDocumentUploading, false);
  assert.equal(calls.syncEquipmentFullscreenUI, 2);
  assert.deepEqual(calls.timeouts, ['focus-primary']);
});

test('team settlement attach actions alert on pdf-only validation failure', async () => {
  const { context, calls, saveStatus } = createTeamSettlementAttachActionsContext({
    selectedFile: { name: 'upload.png' },
    uploadError: new Error('billing_document_pdf_only'),
  });

  await context.handleTeamSettlementAttachClick();

  assert.deepEqual(calls.alerts, ['PDF 파일만 첨부할 수 있습니다.']);
  assert.equal(saveStatus.textContent, '');
  assert.equal(calls.syncEquipmentFullscreenUI, 2);
});

test('team settlement attach actions connect a billing document directory and refocus attach', async () => {
  const { context, calls, state, attachButton } = createTeamSettlementAttachActionsContext({
    directoryHandle: { kind: 'directory' },
    resourceType: 'electric',
  });

  await context.handleTeamSettlementDirectoryConnectClick();

  assert.deepEqual(calls.promptBillingDocumentDirectoryHandle, ['electric']);
  assert.deepEqual(calls.persistStore, [{ skipLocalFileWrite: true }]);
  assert.equal(calls.updateDirtyState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(state.cleanStatusText, '전기 청구서 폴더 연결 완료');
  assert.equal(attachButton.focusCount, 1);
  assert.deepEqual(calls.timeouts, [0]);
});

test('team settlement attach actions alert when directory connection fails', async () => {
  const { context, calls, saveStatus } = createTeamSettlementAttachActionsContext({
    directoryError: new Error('directory_connect_failed'),
  });

  await context.handleTeamSettlementDirectoryConnectClick();

  assert.deepEqual(calls.alerts, ['청구서 폴더 연결에 실패했습니다. 다시 시도해 주세요.']);
  assert.equal(saveStatus.textContent, '청구서 폴더 연결에 실패했습니다. 다시 시도해 주세요.');
  assert.deepEqual(saveStatus.classList.toArray().sort(), ['is-dirty', 'is-error']);
});
