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

const corePath = await findFile(repoRoot, 'KPI.work.history.core.js');
assert.ok(corePath, 'work history core source is missing');

const historyDir = path.dirname(corePath);
const coreSourcePaths = [
  corePath,
  path.join(historyDir, 'KPI.work.history.core.records.js'),
  path.join(historyDir, 'KPI.work.history.core.storage.js'),
];

const coreSources = await Promise.all(
  coreSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createEscapingElement() {
  return {
    _textContent: '',
    _innerHTML: '',
    set textContent(value) {
      const text = String(value ?? '');
      this._textContent = text;
      this._innerHTML = text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    },
    get textContent() {
      return this._textContent;
    },
    get innerHTML() {
      return this._innerHTML;
    },
  };
}

function createContext() {
  const localStore = new Map();
  const context = {
    console,
    window: null,
    document: {
      createElement() {
        return createEscapingElement();
      },
    },
    localStorage: {
      getItem(key) {
        return localStore.has(key) ? localStore.get(key) : null;
      },
      setItem(key, value) {
        localStore.set(key, String(value));
      },
      removeItem(key) {
        localStore.delete(key);
      },
    },
    PortalData: {
      work_history_records: {
        meta: {
          moduleKey: 'legacy',
          moduleName: 'Legacy',
          version: 0,
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
        teams: {
          team1part1: [
            {
              team: 'team1part1',
              startDate: '2026-04-01',
              endDate: '2026-04-01',
              categoryGroup: 'report',
              workContent: 'Alpha task',
              attachments: [
                {
                  attachmentType: 'report',
                  originalName: 'report.pdf',
                  storedName: 'report.pdf',
                  url: '/attachments/report.pdf',
                  previewUrl: '/attachments/report.pdf',
                  downloadUrl: '/attachments/report.pdf',
                },
              ],
            },
          ],
          team1part2: [],
          team2: [],
          team3: [],
          team4: [],
        },
      },
    },
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    JSON,
    Promise,
    Math,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  coreSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });

  return context;
}

test('work history core split files expose normalized payload and storage hooks together', () => {
  const context = createContext();
  const history = context.KpiWorkHistory;
  const payload = history.getPayload();

  assert.equal(typeof history.normalizePayload, 'function');
  assert.equal(typeof history.getPayload, 'function');
  assert.equal(typeof history.savePayload, 'function');
  assert.equal(typeof history.waitForPendingSave, 'function');
  assert.equal(typeof history.buildExportScript, 'function');
  assert.equal(typeof history.getRecordCategoryGroupLabel, 'function');
  assert.equal(typeof history.getRecordAttachment, 'function');

  assert.equal(payload.meta.moduleKey, 'work_history_records');
  assert.equal(payload.teams.team1part1.length, 1);
  assert.equal(payload.teams.team1part1[0].categoryGroup, 'report');
  assert.equal(payload.teams.team1part1[0].attachments.length, 1);
  assert.equal(payload.teams.team1part1[0].reportAttachment.originalName, 'report.pdf');
  assert.match(history.buildExportScript(payload), /window\.PortalData\.work_history_records/);
});

test('kpi html loads work history core split files before layout bootstrap', () => {
  const coreIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.core.js?v=217');
  const recordsIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.core.records.js?v=1');
  const storageIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.core.storage.js?v=1');
  const layoutIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.view.layout.js?v=248');

  assert.ok(coreIndex >= 0, 'work history core loader is missing');
  assert.ok(recordsIndex > coreIndex, 'work history core records must load after core.js');
  assert.ok(storageIndex > recordsIndex, 'work history core storage must load after core records');
  assert.ok(layoutIndex > storageIndex, 'work history layout must load after core split files');
});
