import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));
const sharedSource = await fs.readFile(path.join(repoRoot, 'team-report/runtime/work/KPI.work.shared.js'), 'utf8');
const analyticsSource = await fs.readFile(path.join(repoRoot, 'utility/runtime/util/analytics/KPI.util.analytics.js'), 'utf8');
const workCssSource = await fs.readFile(path.join(repoRoot, 'kpi-runtime/app/styles/work/work.css'), 'utf8');

function createClassList() {
  const classes = new Set();
  return {
    add(token) {
      classes.add(token);
    },
    remove(token) {
      classes.delete(token);
    },
    contains(token) {
      return classes.has(token);
    },
  };
}

function createContext(fetchImpl) {
  const statusElement = {
    textContent: '',
    title: '',
    classList: createClassList(),
    getAttribute(name) {
      return name === 'data-work-save-status' ? 'work_demo' : '';
    },
  };
  const context = {
    console: {
      ...console,
      warn() {},
    },
    Date,
    JSON,
    Math,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    localStorage: {
      setItem() {},
      getItem() {
        return null;
      },
    },
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '[data-work-save-status]' ? [statusElement] : [];
      },
    },
    window: null,
    PortalData: {},
    __KPI_SERVER_RUNTIME_CONFIG__: {
      work: {
        enabled: true,
        apiBase: '/api',
        moduleKey: 'portal_data',
        records: {
          work_demo: {
            recordKey: 'work_demo',
            permissionKey: 'work.demo',
            readEnabled: true,
            writeEnabled: true,
          },
        },
      },
    },
    KpiRuntime: {
      canUseServerWrite(writeEnabled) {
        return writeEnabled === true;
      },
    },
    fetch: fetchImpl,
    setTimeout(callback) {
      callback();
      return 1;
    },
    clearTimeout() {},
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(sharedSource, context, { filename: 'KPI.work.shared.js' });
  vm.runInContext(analyticsSource, context, { filename: 'KPI.util.analytics.js' });
  return { context, statusElement };
}

test('work save status badge tracks pending, saved, and failed autosave states', async () => {
  const { context, statusElement } = createContext(async () => ({
    ok: true,
    async json() {
      return { record: { payload: { weeks: [], saved: true } } };
    },
  }));

  const idleBadge = context.renderWorkSaveStatusBadge('work_demo');
  assert.match(idleBadge, /data-work-save-status="work_demo"/);
  assert.equal(context.getWorkSaveStatusText('work_demo'), '');
  assert.doesNotMatch(idleBadge, /자동 저장 대기|서버 저장 대기/);

  const saved = await context.saveWorkData('work_demo', { weeks: [] });

  assert.equal(saved, true);
  assert.match(statusElement.textContent, /서버 저장됨/);
  assert.equal(statusElement.classList.contains('is-saved'), true);
});

test('work save status marks failed saves without reporting success', async () => {
  const { context, statusElement } = createContext(async () => ({
    ok: false,
    async json() {
      return {};
    },
  }));

  const saved = await context.saveWorkData('work_demo', { weeks: [] });

  assert.equal(saved, false);
  assert.match(statusElement.textContent, /서버 저장 실패/);
  assert.equal(statusElement.classList.contains('is-failed'), true);
});

test('work css defines autosave status states', () => {
  assert.match(workCssSource, /\.work-save-status\.is-pending/);
  assert.match(workCssSource, /\.work-save-status\.is-saved/);
  assert.match(workCssSource, /\.work-save-status\.is-failed/);
  assert.match(workCssSource, /\.work-save-status\.is-blocked/);
  assert.match(workCssSource, /\.work-save-status\.is-idle:empty/);
});
