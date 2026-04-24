import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

async function findFile(startDir, basename) {
  const entries = await fs.readdir(startDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(startDir, entry.name);
    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, basename);
      if (nested) return nested;
      continue;
    }
    if (entry.name === basename) return fullPath;
  }
  return null;
}

const actionsPath = await findFile(repoRoot, 'KPI.work.history.view.actions.js');
assert.ok(actionsPath, 'work history actions shell source is missing');

const historyDir = path.dirname(actionsPath);
const splitSourcePaths = [
  actionsPath,
  path.join(historyDir, 'KPI.work.history.view.actions.search.js'),
  path.join(historyDir, 'KPI.work.history.view.actions.record.js'),
  path.join(historyDir, 'KPI.work.history.view.actions.document.js'),
  path.join(historyDir, 'KPI.work.history.view.js'),
];

const splitSources = await Promise.all(
  splitSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

function createContext() {
  const history = {
    TEAM_KEYS: ['team1part1'],
    TeamInfo: {
      team1part1: { name: 'Line Alpha', desc: 'Dry', class: 'team1part1' },
    },
    OVERVIEW_KEY: 'overview',
    DATA_KEY: 'work-history',
    state: {},
    loadData() {},
    queryAll() {
      return [];
    },
    getElement() {
      return null;
    },
    getPayload() {
      return { teams: {} };
    },
    normalizeRecordCategory(value) {
      return String(value || '').trim();
    },
    normalizeRecordCategoryGroup(value) {
      return String(value || '').trim();
    },
    normalizePayload(payload) {
      return payload;
    },
    normalizeCost(value) {
      return Number(value || 0);
    },
    normalizeAssignees(value) {
      return Array.isArray(value) ? value : [];
    },
    cloneJson(value) {
      return JSON.parse(JSON.stringify(value));
    },
    isAllowedRecordCategory() {
      return true;
    },
    isKpiRecord() {
      return false;
    },
    ATTACHMENT_SLOT_KEYS: ['billing', 'report'],
    ATTACHMENT_SLOT_META: {
      billing: { label: 'Billing' },
      report: { label: 'Report' },
    },
    WORK_HISTORY_ATTACHMENT_MAX_BYTES: 10 * 1024 * 1024,
    getRecordAttachment() {
      return null;
    },
    flattenAttachmentSlots() {
      return [];
    },
    validateWorkHistoryAttachment() {
      return '';
    },
    uploadPendingAttachments() {
      return Promise.resolve([]);
    },
    deleteAttachmentsFromServer() {
      return Promise.resolve();
    },
    savePayload() {
      return Promise.resolve();
    },
    saveNow() {
      return Promise.resolve();
    },
    getRecordRuntimeConfig() {
      return {};
    },
    buildExportScript() {
      return '';
    },
    view: {
      OVERVIEW_KEY: 'overview',
      ensureShadowMount() {},
      renderCurrentView() {},
      getShadowRoot() {
        return null;
      },
      syncViewportLayout() {},
      updateTitleState() {},
      initDateFilterLimits() {},
      syncActiveTabUi() {},
      todayInputValue() {
        return '2026-04-23';
      },
      minInputValue() {
        return '2024-01-01';
      },
    },
  };

  const context = {
    console,
    window: null,
    document: {
      addEventListener() {},
      body: { style: {} },
    },
    Blob,
    URL,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    JSON,
  };
  context.window = context;
  context.globalThis = context;
  context.KpiWorkHistory = history;
  context.alert = () => {};
  context.setLastModified = () => {};
  vm.createContext(context);

  splitSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });

  return context;
}

test('work history split action files expose view and history hooks after bootstrap', () => {
  const context = createContext();
  const history = context.KpiWorkHistory;
  const view = history.view;

  assert.equal(typeof view.bindEvents, 'function');
  assert.equal(typeof view.switchTab, 'function');
  assert.equal(typeof view.searchByKeyword, 'function');
  assert.equal(typeof view.openRecordModal, 'function');
  assert.equal(typeof view.saveRecord, 'function');
  assert.equal(typeof view.performPrimarySave, 'function');
  assert.equal(typeof view.downloadBackupSnapshot, 'function');
  assert.equal(typeof view.closeOverlays, 'function');

  assert.equal(history.switchTab, view.switchTab);
  assert.equal(history.openRecordModal, view.openRecordModal);
  assert.equal(history.saveRecord, view.saveRecord);
  assert.equal(history.performPrimarySave, view.performPrimarySave);
  assert.equal(history.downloadBackupSnapshot, view.downloadBackupSnapshot);
  assert.equal(history.closeOverlays, view.closeOverlays);
});
