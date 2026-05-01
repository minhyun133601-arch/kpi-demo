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

const sharedPath = await findFile(repoRoot, 'KPI.work.shared.js');
assert.ok(sharedPath, 'work shared source is missing');

const workDir = path.dirname(sharedPath);
const sharedSourcePaths = [
  sharedPath,
  path.join(workDir, 'KPI.work.shared.team-calendar.categories.js'),
  path.join(workDir, 'KPI.work.shared.team-calendar.state.js'),
  path.join(workDir, 'KPI.work.shared.team-calendar.summary.js'),
];

const sharedSources = await Promise.all(
  sharedSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createLocalStorage() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    removeItem(key) {
      store.delete(String(key));
    },
  };
}

function parseNumericValue(value) {
  const normalized = String(value ?? '')
    .replaceAll(',', '')
    .trim();
  if (!normalized) return Number.NaN;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function createContext() {
  const categoryRecords = [
    {
      dataKey: 'work_team_calendar_team1_part1',
      title: 'Line Alpha',
      view: 'team_calendar',
      icon: 'fa-flask',
      color: '#2563eb',
      secondaryColor: '#1d4ed8',
      tint: '#dbeafe',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
    {
      dataKey: 'work_team_calendar_team1_part2',
      title: 'Line Beta',
      view: 'team_calendar',
      icon: 'fa-flask',
      color: '#0ea5e9',
      secondaryColor: '#0284c7',
      tint: '#e0f2fe',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
    {
      dataKey: 'work_team_calendar_team2',
      title: 'Line Gamma',
      view: 'team_calendar',
      icon: 'fa-box',
      color: '#16a34a',
      secondaryColor: '#15803d',
      tint: '#dcfce7',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
    {
      dataKey: 'work_team_calendar_team3',
      title: 'Line Delta',
      view: 'team_calendar',
      icon: 'fa-tint',
      color: '#f59e0b',
      secondaryColor: '#d97706',
      tint: '#fef3c7',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
    {
      dataKey: 'work_team_calendar_team4',
      title: 'Facility Support',
      view: 'team_calendar',
      icon: 'fa-water',
      color: '#64748b',
      secondaryColor: '#475569',
      tint: '#e2e8f0',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
    {
      dataKey: 'work_team_calendar_overview',
      title: '통합 현황',
      view: 'team_calendar',
      icon: 'fa-chart-column',
      color: '#7c3aed',
      secondaryColor: '#6d28d9',
      tint: '#ede9fe',
      emptyProductionLabel: '생산량 없음',
      emptyWorkLabel: '작업 내역 미입력',
    },
  ];

  const workDataStore = new Map();
  const context = {
    console,
    Map,
    Set,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    JSON,
    Math,
    Promise,
    window: null,
    globalThis: null,
    localStorage: createLocalStorage(),
    document: {
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    setTimeout() {
      return 0;
    },
    clearTimeout() {},
    fetch: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          ok: true,
          document: {
            id: 'doc-1',
            original_name: 'mock-file.pdf',
            preview_url: '/api/files/doc-1/view',
            download_url: '/api/files/doc-1/download',
          },
        };
      },
    }),
    renderSidebar() {},
    renderWorkTeamCalendarModal() {},
    getNavigationSelectionSectionId() {
      return '';
    },
    getNavigationSelectionCategoryIndex() {
      return -1;
    },
    selectCategory() {},
    formatWorkTeamCalendarDateLabel(dateKey) {
      return String(dateKey || '');
    },
    AppData: {
      work: {
        categories: categoryRecords,
        teamCategories: [],
      },
      equip: {
        teamCategories: [
          { title: 'Plant A 1팀', rooms: [], icon: 'fa-industry', color: '#0f766e' },
          { title: 'Plant B 1팀', rooms: [], icon: 'fa-warehouse', color: '#b45309' },
          { title: 'Line Gamma', rooms: [], icon: 'fa-box', color: '#15803d' },
          { title: 'Line Delta', rooms: [], icon: 'fa-tint', color: '#1d4ed8' },
        ],
      },
    },
    getWorkData(dataKey, moduleName) {
      const key = String(dataKey || '').trim();
      if (!workDataStore.has(key)) {
        workDataStore.set(key, {
          moduleName: String(moduleName || '').trim(),
          teamCalendar: {
            entries: {},
          },
        });
      }
      return workDataStore.get(key);
    },
    saveWorkData() {
      return true;
    },
    getWorkServerRuntimeConfig() {
      return {
        apiBase: '/api',
        permissionKey: 'work.team_calendar',
        readEnabled: true,
        writeEnabled: true,
      };
    },
    normalizeAreaAssetType(type, name) {
      const normalizedType = String(type || '').trim().toLowerCase();
      const normalizedName = String(name || '').trim().toLowerCase();
      if (normalizedType.includes('pdf') || normalizedName.endsWith('.pdf')) return 'pdf';
      if (normalizedType.startsWith('image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(normalizedName)) return 'image';
      return 'file';
    },
    parseUtilAmount: parseNumericValue,
    parseUtilPercentAmount: parseNumericValue,
    formatUtilNumber(value, digits = 0) {
      return Number(value || 0).toLocaleString('ko-KR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  sharedSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });
  return { context, workDataStore };
}

test('work shared split files expose category, state, and summary helpers together', () => {
  const { context } = createContext();

  assert.equal(typeof context.getWorkTeamCalendarModeMeta, 'function');
  assert.equal(typeof context.getWorkTeamCalendarDisplayCategoryList, 'function');
  assert.equal(typeof context.getWorkTeamCalendarActiveMonth, 'function');
  assert.equal(typeof context.getWorkTeamCalendarDraftSnapshot, 'function');
  assert.equal(typeof context.getWorkTeamCalendarProductionMetricLine, 'function');

  const detailCategories = context.getWorkTeamCalendarDisplayCategoryList();
  assert.ok(detailCategories.some((entry) => entry.dataKey === 'work_team_calendar_team1_part1'));
  assert.ok(detailCategories.some((entry) => entry.dataKey === 'work_team_calendar_overview'));

  context.setWorkTeamCalendarMode('group');
  const groupCategories = context.getWorkTeamCalendarDisplayCategoryList();
  assert.ok(groupCategories.some((entry) => entry.dataKey === 'work_team_calendar_group_plantB'));
  assert.ok(groupCategories.some((entry) => entry.dataKey === 'work_team_calendar_group_plantA'));

  context.setWorkTeamCalendarMode('process');
  const processCategories = context.getWorkTeamCalendarDisplayCategoryList();
  assert.ok(processCategories.some((entry) => entry.dataKey === 'work_team_calendar_process_dry'));
  assert.ok(processCategories.some((entry) => entry.dataKey === 'work_team_calendar_process_liquid'));

  const activeMonth = context.setWorkTeamCalendarActiveMonthState('work_team_calendar_team1_part1', '2026-04');
  assert.equal(activeMonth, '2026-04');
  assert.equal(context.getWorkTeamCalendarActiveMonth('work_team_calendar_team1_part1'), '2026-04');

  const normalizedDateKeys = context.normalizeWorkTeamCalendarDateKeys(
    ['2026-04-15', '2026-04-15', '2026-05-01'],
    '2026-04'
  );
  assert.equal(JSON.stringify(Array.from(normalizedDateKeys)), JSON.stringify(['2026-04-15']));
});

test('work shared draft and summary helpers keep draft state readable after the split', () => {
  const { context } = createContext();
  const dataKey = 'work_team_calendar_team1_part1';
  const dateKey = '2026-04-15';

  const draft = context.ensureWorkTeamCalendarDraft(dataKey, dateKey);
  draft.title = '열교환기 점검';
  draft.note = '펌프 압력과 밸브 상태를 확인함';
  draft.remark = '추가 이상 없음';
  draft.members = ['Operator A', 'Operator B'];
  draft.attachments = [
    {
      assetId: 'asset-1',
      name: 'report.pdf',
      fileName: 'report.pdf',
      type: 'pdf',
      storage: 'indexeddb',
    },
  ];

  const snapshot = context.getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
  const focusSummary = context.getWorkTeamCalendarFocusSummary(snapshot);
  const workStatus = context.getWorkTeamCalendarWorkStatus(snapshot, '작업 내역 미입력');
  const metricLine = context.getWorkTeamCalendarProductionMetricLine({
    moistureExcludedYieldRate: 91.2,
    totalEquipmentCapa: 320,
    utilizationRate: 77.5,
  });

  assert.equal(snapshot.title, '열교환기 점검');
  assert.equal(JSON.stringify(Array.from(snapshot.members)), JSON.stringify(['Operator A', 'Operator B']));
  assert.match(focusSummary, /열교환기 점검/);
  assert.match(focusSummary, /담당 Operator A 외 1명/);
  assert.match(workStatus, /열교환기 점검/);
  assert.match(metricLine, /수율/);
  assert.match(metricLine, /CAPA/);
  assert.match(metricLine, /가동률/);
});

test('kpi html loads shared split files before production bootstrap', () => {
  const sharedIndex = kpiHtml.indexOf('runtime/work/KPI.work.shared.js?v=239');
  const categoriesIndex = kpiHtml.indexOf('runtime/work/KPI.work.shared.team-calendar.categories.js?v=1');
  const stateIndex = kpiHtml.indexOf('runtime/work/KPI.work.shared.team-calendar.state.js?v=1');
  const summaryIndex = kpiHtml.indexOf('runtime/work/KPI.work.shared.team-calendar.summary.js?v=1');
  const productionIndex = kpiHtml.indexOf('runtime/work/KPI.work.production.js?v=238');

  assert.ok(sharedIndex >= 0, 'work shared loader is missing');
  assert.ok(categoriesIndex > sharedIndex, 'shared categories must load after shared.js');
  assert.ok(stateIndex > categoriesIndex, 'shared state must load after shared categories');
  assert.ok(summaryIndex > stateIndex, 'shared summary must load after shared state');
  assert.ok(productionIndex > summaryIndex, 'work production must load after shared split files');
});
