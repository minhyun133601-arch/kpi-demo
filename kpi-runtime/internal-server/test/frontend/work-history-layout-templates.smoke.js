import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(fileURLToPath(new URL('../../../../', import.meta.url)));

const layoutPath = path.join(repoRoot, 'team-report', 'runtime', 'work', 'history', 'KPI.work.history.view.layout.js');
const workspaceCopyPath = path.join(repoRoot, 'team-report', 'runtime', 'work', 'history', 'layout', 'workspace-copy.js');
const formattersPath = path.join(repoRoot, 'team-report', 'runtime', 'work', 'history', 'layout', 'formatters.js');
const templatesPath = path.join(repoRoot, 'team-report', 'runtime', 'work', 'history', 'layout', 'templates.js');
const layoutSource = await fs.readFile(layoutPath, 'utf8');
const workspaceCopySource = await fs.readFile(workspaceCopyPath, 'utf8');
const formattersSource = await fs.readFile(formattersPath, 'utf8');
const templatesSource = await fs.readFile(templatesPath, 'utf8');
const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createContext(options = {}) {
  const state = {
    currentTeam: 'overview',
    currentCategoryFilter: '',
    currentKeyword: '',
    ...(options.state || {}),
  };
  const history = {
    TEAM_KEYS: ['team1part1', 'team1part2', 'team2', 'team3', 'team4'],
    TeamInfo: {
      team1part1: { name: 'Team 1-A', class: 'team1part1' },
      team1part2: { name: 'Team 1-B', class: 'team1part2' },
      team2: { name: 'Team 2', class: 'team2' },
      team3: { name: 'Team 3', class: 'team3' },
      team4: { name: 'Team 4', class: 'team4' }
    },
    RECORD_CATEGORY_OPTIONS: ['monthly'],
    RECORD_CATEGORY_GROUP_ORDER: ['report'],
    RECORD_CATEGORY_GROUPS: {
      report: { label: 'Report', categories: ['monthly'] }
    },
    state,
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
    getFixedCategoryFilter() {
      return options.fixedCategoryFilter || '';
    },
    isProductionReportWorkspace() {
      return options.isProductionReportWorkspace === true;
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
  vm.runInContext(workspaceCopySource, context, { filename: 'layout/workspace-copy.js' });
  vm.runInContext(formattersSource, context, { filename: 'layout/formatters.js' });
  vm.runInContext(templatesSource, context, { filename: 'layout/templates.js' });
  return context;
}

test('work history layout templates registry exposes shell and modal builders', () => {
  const context = createContext();
  const view = context.KpiWorkHistory.view;

  assert.equal(typeof view.buildShellHtml, 'function');
  assert.equal(typeof view.buildPageHeader, 'function');
  assert.equal(typeof view.buildRecordModal, 'function');
  assert.equal(typeof view.buildDeleteModal, 'function');
  assert.equal(typeof view.getTeamIconSvg, 'function');
  assert.equal(typeof view.getSectionIconSvg, 'function');

  const shellHtml = view.buildShellHtml();
  const pageHeaderHtml = view.buildPageHeader();
  assert.match(pageHeaderHtml, /history-page-head/);
  assert.match(pageHeaderHtml, /data-role="current-date"/);
  assert.match(pageHeaderHtml, /id="history-title"/);
  assert.match(pageHeaderHtml, /id="history-subtitle"/);
  assert.match(shellHtml, /history-main-content/);
  assert.match(shellHtml, /history-page-head/);
  assert.match(shellHtml, /overview-records/);
  assert.match(shellHtml, /recordModal/);
  assert.match(shellHtml, /deleteModal/);
});

test('kpi html loads work history layout templates between layout and render', () => {
  const layoutIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.view.layout.js?v=250');
  const workspaceCopyIndex = kpiHtml.indexOf('runtime/work/history/layout/workspace-copy.js?v=1');
  const formattersIndex = kpiHtml.indexOf('runtime/work/history/layout/formatters.js?v=1');
  const templatesIndex = kpiHtml.indexOf('runtime/work/history/layout/templates.js?v=249');
  const renderIndex = kpiHtml.indexOf('runtime/work/history/KPI.work.history.view.render.js?v=234');

  assert.ok(layoutIndex >= 0, 'work history layout loader is missing');
  assert.ok(workspaceCopyIndex > layoutIndex, 'work history workspace copy must load after layout.js');
  assert.ok(formattersIndex > workspaceCopyIndex, 'work history formatters must load after workspace copy');
  assert.ok(templatesIndex > formattersIndex, 'work history layout templates must load after formatter helpers');
  assert.ok(renderIndex > templatesIndex, 'work history render must load after layout templates');
});

test('work history templates keep the default work-history surface', () => {
  const context = createContext();
  const shellHtml = context.KpiWorkHistory.view.buildShellHtml();

  assert.match(shellHtml, /작업 이력 기입/);
  assert.match(shellHtml, /내역 추가/);
  assert.match(shellHtml, /작업내역 추가/);
  assert.match(shellHtml, /id="history-workspace-pill" hidden>보고 전용/);
  assert.doesNotMatch(shellHtml, /data-role="fixed-category-pill"/);
});
