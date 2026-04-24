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

const layoutPath = await findFile(repoRoot, 'KPI.work.history.view.layout.js');
assert.ok(layoutPath, 'work history layout source is missing');

const templatesPath = path.join(path.dirname(layoutPath), 'layout', 'templates.js');
const layoutSource = await fs.readFile(layoutPath, 'utf8');
const templatesSource = await fs.readFile(templatesPath, 'utf8');
const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createContext() {
  const history = {
    TEAM_KEYS: ['team1part1', 'team1part2', 'team2', 'team3', 'team4'],
    TeamInfo: {
      team1part1: { name: 'Line Alpha', class: 'team1part1' },
      team1part2: { name: 'Line Beta', class: 'team1part2' },
      team2: { name: 'Line Gamma', class: 'team2' },
      team3: { name: 'Line Delta', class: 'team3' },
      team4: { name: 'Facility Support', class: 'team4' }
    },
    RECORD_CATEGORY_OPTIONS: ['monthly'],
    RECORD_CATEGORY_GROUP_ORDER: ['report'],
    RECORD_CATEGORY_GROUPS: {
      report: { label: 'Report', categories: ['monthly'] }
    },
    state: {
      currentTeam: 'overview',
      currentCategoryFilter: '',
      currentKeyword: ''
    },
    WORK_HISTORY_ATTACHMENT_ACCEPT: '.pdf,.png,.jpg',
    escapeHtml(value) {
      return String(value ?? '');
    },
    escapeAttribute(value) {
      return String(value ?? '');
    },
    getElement() {
      return null;
    },
    queryAll() {
      return [];
    },
    setShadowHost() {},
    getRecordCategoryOptionsForGroup() {
      return ['monthly'];
    },
    view: {}
  };

  const context = {
    console,
    window: null,
    document: {},
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date
  };
  context.window = context;
  context.globalThis = context;
  context.KpiWorkHistory = history;
  vm.createContext(context);
  vm.runInContext(layoutSource, context, { filename: 'KPI.work.history.view.layout.js' });
  vm.runInContext(templatesSource, context, { filename: 'layout/templates.js' });
  return context;
}

test('work history layout templates registry exposes shell and modal builders', () => {
  const context = createContext();
  const view = context.KpiWorkHistory.view;

  assert.equal(typeof view.buildShellHtml, 'function');
  assert.equal(typeof view.buildRecordModal, 'function');
  assert.equal(typeof view.buildDeleteModal, 'function');
  assert.equal(typeof view.getTeamIconSvg, 'function');
  assert.equal(typeof view.getSectionIconSvg, 'function');

  const shellHtml = view.buildShellHtml();
  assert.match(shellHtml, /history-main-content/);
  assert.match(shellHtml, /overview-records/);
  assert.match(shellHtml, /recordModal/);
  assert.match(shellHtml, /deleteModal/);
});

test('kpi html loads work history layout templates between layout and render', () => {
  const layoutIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.view.layout.js?v=248');
  const templatesIndex = kpiHtml.indexOf('runtime/work/history/layout/templates.js?v=248');
  const renderIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.view.render.js?v=233');

  assert.ok(layoutIndex >= 0, 'work history layout loader is missing');
  assert.ok(templatesIndex > layoutIndex, 'work history layout templates must load after layout.js');
  assert.ok(renderIndex > templatesIndex, 'work history render must load after layout templates');
});
