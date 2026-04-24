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

const renderersPath = await findFile(repoRoot, 'KPI.work.renderers.js');
assert.ok(renderersPath, 'work renderers source is missing');

const workDir = path.dirname(renderersPath);
const renderSourcePaths = [
  path.join(workDir, 'KPI.work.renderers.weekly-actions.js'),
  path.join(workDir, 'KPI.work.renderers.print.js'),
  path.join(workDir, 'KPI.work.renderers.monthly-plan.js'),
  renderersPath,
];

const renderSources = await Promise.all(
  renderSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function createClassList() {
  const classes = new Set();
  return {
    add(...tokens) {
      tokens.forEach((token) => classes.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => classes.delete(token));
    },
    contains(token) {
      return classes.has(token);
    },
  };
}

function createContext() {
  const contentContainer = { innerHTML: '' };
  const printSheet = {
    innerHTML: '',
    dataset: {},
    setAttribute(name, value) {
      this.dataset[name] = value;
    },
  };
  const clickedAnchors = [];
  const localUrls = [];
  const categoryMap = new Map();
  const store = {
    work_demo: {
      meta: { moduleKey: 'work_demo', moduleName: '주간 데모', version: 1, updatedAt: '2026-04-23T00:00:00.000Z' },
      weeks: [
        {
          year: 2026,
          week: 17,
          days: {
            mon: [{ team: 'Plant A', room: 'A', task: '점검' }],
            tue: [],
            wed: [],
            thu: [],
            fri: [],
            sat: [],
            sun: [],
          },
        },
      ],
    },
    work_monthly_plan: {
      meta: { moduleKey: 'work_monthly_plan', moduleName: '월간 계획', version: 1, updatedAt: '2026-04-23T00:00:00.000Z' },
      monthly: { entries: {} },
      weeks: [],
    },
  };
  const context = {
    console,
    window: null,
    document: {
      body: {
        appendChild() {},
      },
      documentElement: {
        classList: createClassList(),
      },
      getElementById(id) {
        if (id === 'content-container') return contentContainer;
        if (id === 'print-sheet') return printSheet;
        return null;
      },
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      createElement(tagName) {
        if (tagName === 'a') {
          return {
            href: '',
            download: '',
            style: {},
            click() {
              clickedAnchors.push({ href: this.href, download: this.download });
            },
            remove() {},
          };
        }
        return { style: {}, click() {}, remove() {} };
      },
    },
    URL: {
      createObjectURL(blob) {
        localUrls.push(blob);
        return `blob:${localUrls.length}`;
      },
      revokeObjectURL() {},
    },
    Blob,
    AppData: {
      work: {
        name: '팀별내역서',
        accent: '#16a34a',
      },
    },
    WorkState: {
      activeWeek: { work_demo: '2026-W17' },
      activeMonth: { work_monthly_plan: '2026-04' },
      activeDate: { work_monthly_plan: '2026-04-15' },
      monthFilters: {},
      monthReportCache: {
        work_monthly_plan: {
          rangeLabel: '2026-04 ~ 2026-04',
          totalCount: 1,
          filters: { team: '', owner: '', room: '', keyword: '' },
          entries: [
            { dateKey: '2026-04-15', team: 'Plant A', room: 'A', owner: 'Operator A', task: '월간 점검' },
          ],
        },
      },
    },
    WORK_DAY_KEYS: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
    WORK_DAY_LABELS: ['월', '화', '수', '목', '금', '토', '일'],
    WORK_DAY_COLORS: ['#2563eb', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#0ea5e9'],
    getWorkData(dataKey, moduleName) {
      const data = store[dataKey];
      if (data) return JSON.parse(JSON.stringify(data));
      return { meta: { moduleKey: dataKey, moduleName: moduleName || dataKey, version: 1 }, weeks: [] };
    },
    saveWorkData(dataKey, data) {
      store[dataKey] = JSON.parse(JSON.stringify(data));
      return true;
    },
    cloneWorkDataPayload(value) {
      return JSON.parse(JSON.stringify(value || {}));
    },
    waitForWorkServerWrite() {
      return Promise.resolve(true);
    },
    ensureWeeksUpToCurrent() {},
    ensureWeek(data, year, week) {
      data.weeks = data.weeks || [];
      const existing = data.weeks.find((entry) => entry.year === year && entry.week === week);
      if (existing) return;
      data.weeks.push({
        year,
        week,
        days: {
          mon: [],
          tue: [],
          wed: [],
          thu: [],
          fri: [],
          sat: [],
          sun: [],
        },
      });
    },
    makeWeekKey(year, week) {
      return `${year}-W${String(week).padStart(2, '0')}`;
    },
    parseWeekKey(key) {
      const match = /^(\d{4})-W(\d{2})$/.exec(String(key || ''));
      if (!match) return null;
      return { year: Number(match[1]), week: Number(match[2]) };
    },
    getISOWeekInfo() {
      return { year: 2026, week: 17 };
    },
    getWeekStartDate(year, week) {
      const date = new Date(Date.UTC(year, 0, 1));
      date.setUTCDate(date.getUTCDate() + (week - 1) * 7);
      return new Date(date);
    },
    formatWeekRange() {
      return '04.21(월) ~ 04.27(일)';
    },
    formatDate(date) {
      return `${String(date.getUTCMonth() + 1).padStart(2, '0')}.${String(date.getUTCDate()).padStart(2, '0')}`;
    },
    normalizeDayEntries(entries) {
      return (entries || []).map((entry) => ({
        team: entry.team || '',
        room: entry.room || '',
        task: entry.task || '',
      }));
    },
    normalizeWorkTeamName(value) {
      return String(value || '').trim();
    },
    getWorkTeamOptions() {
      return ['Plant A', 'Plant B'];
    },
    getEquipIconInfo(team) {
      return {
        icon: team === 'Plant B' ? 'fa-box' : 'fa-folder',
        color: team === 'Plant B' ? '#f97316' : '#2563eb',
      };
    },
    escapeJs(value) {
      return String(value || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    },
    escapeHtml(value) {
      return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;');
    },
    renderWorkTeamCalendarContent() {},
    getWorkCategory(dataKey) {
      return categoryMap.get(dataKey) || null;
    },
    setLastModified() {},
    getMonthMatrix(year, monthIndex) {
      return [new Date(Date.UTC(year, monthIndex, 15))];
    },
    getMonthlyFilterState() {
      return {
        startMonth: '2026-04',
        endMonth: '2026-04',
        team: '',
        room: '',
        owner: '',
        keyword: '',
      };
    },
    normalizeMonthRange(startMonth, endMonth) {
      return { start: startMonth || '2026-04', end: endMonth || '2026-04' };
    },
    collectEntriesByDateRange() {
      return {
        '2026-04-15': [
          { team: 'Plant A', room: 'A', owner: 'Operator A', task: '월간 점검' },
        ],
      };
    },
    isDateInRange() {
      return true;
    },
    entryMatchesFilter() {
      return true;
    },
    getWorkOwners() {
      return ['Operator A'];
    },
    buildSelectOptions(list, selectedValue, placeholder) {
      const options = [`<option value="">${placeholder}</option>`];
      (list || []).forEach((item) => {
        const selected = item === selectedValue ? 'selected' : '';
        options.push(`<option value="${item}" ${selected}>${item}</option>`);
      });
      return options.join('');
    },
    getEquipRooms() {
      return ['A'];
    },
    formatMonthLabel(year, monthIndex) {
      return `${year}년 ${monthIndex + 1}월`;
    },
    formatDateKey(date) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
    },
    updateMonthlyFilter() {},
    clearMonthlyFilter() {},
    ensureMonthly(data) {
      data.monthly = data.monthly || { entries: {} };
      return data.monthly;
    },
    formatUtilNumber(value, digits = 0) {
      return Number(value || 0).toFixed(digits);
    },
    setTimeout(callback) {
      callback();
      return 0;
    },
    printCalls: 0,
    print() {
      this.printCalls += 1;
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
  };
  context.window = context;
  context.globalThis = context;

  const weeklyCategory = {
    dataKey: 'work_demo',
    title: '주간 데모',
    desc: '주간 편집 데모',
    color: '#2563eb',
  };
  const monthlyCategory = {
    dataKey: 'work_monthly_plan',
    title: '월간 계획',
    desc: '월간 계획 데모',
    color: '#0f766e',
  };
  categoryMap.set(weeklyCategory.dataKey, weeklyCategory);
  categoryMap.set(monthlyCategory.dataKey, monthlyCategory);
  context.weeklyCategory = weeklyCategory;
  context.monthlyCategory = monthlyCategory;

  vm.createContext(context);
  renderSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });

  return { context, contentContainer, printSheet, clickedAnchors };
}

test('work renderers split files expose weekly, monthly, and print helpers together', () => {
  const { context } = createContext();

  assert.equal(typeof context.renderWorkContent, 'function');
  assert.equal(typeof context.workExport, 'function');
  assert.equal(typeof context.workSelect, 'function');
  assert.equal(typeof context.printMonthlyReport, 'function');
  assert.equal(typeof context.printUtilAnalytics, 'function');
  assert.equal(typeof context.renderMonthlyPlan, 'function');
  assert.equal(typeof context.monthPrev, 'function');
  assert.equal(typeof context.monthNext, 'function');
});

test('work renderers split files render weekly and monthly content after loading together', () => {
  const { context, contentContainer } = createContext();

  context.renderWorkContent(context.weeklyCategory);
  assert.match(contentContainer.innerHTML, /work-week-meta/);
  assert.match(contentContainer.innerHTML, /workExport\('work_demo'\)/);

  context.renderWorkContent(context.monthlyCategory);
  assert.match(contentContainer.innerHTML, /month-panel/);
  assert.match(contentContainer.innerHTML, /printMonthlyReport\('work_monthly_plan'\)/);
});

test('work renderers export helper downloads a js bootstrap payload', async () => {
  const { context, clickedAnchors } = createContext();

  const didExport = await context.workExport('work_demo');

  assert.equal(didExport, true);
  assert.equal(clickedAnchors.length, 1);
  assert.match(clickedAnchors[0].download, /work_demo/);
  assert.match(clickedAnchors[0].href, /^blob:/);
});

test('work renderers print helper populates the print sheet and triggers print', () => {
  const { context, printSheet } = createContext();

  context.printMonthlyReport('work_monthly_plan');

  assert.equal(printSheet.dataset['data-mode'], 'monthly');
  assert.match(printSheet.innerHTML, /월간 실적 보고서/);
  assert.equal(context.printCalls, 1);
});

test('kpi html loads work renderer split files before work runtime bootstrap', () => {
  const weeklyActionsIndex = kpiHtml.indexOf('runtime/work/KPI.work.renderers.weekly-actions.js?v=1');
  const printIndex = kpiHtml.indexOf('runtime/work/KPI.work.renderers.print.js?v=1');
  const monthlyPlanIndex = kpiHtml.indexOf('runtime/work/KPI.work.renderers.monthly-plan.js?v=1');
  const renderersIndex = kpiHtml.indexOf('runtime/work/KPI.work.renderers.js?v=1');
  const workRuntimeIndex = kpiHtml.indexOf('runtime/work/KPI.work.runtime.js?v=227');

  assert.ok(weeklyActionsIndex >= 0, 'work renderer weekly actions loader is missing');
  assert.ok(printIndex > weeklyActionsIndex, 'work renderer print helper must load after weekly actions');
  assert.ok(monthlyPlanIndex > printIndex, 'work renderer monthly plan must load after print helper');
  assert.ok(renderersIndex > monthlyPlanIndex, 'work renderers shell must load after split helpers');
  assert.ok(workRuntimeIndex > renderersIndex, 'work runtime bootstrap must load after work renderers');
});
