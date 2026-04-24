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

const productionPath = await findFile(repoRoot, 'KPI.work.production.js');
assert.ok(productionPath, 'work production source is missing');

const workDir = path.dirname(productionPath);
const productionSourcePaths = [
  productionPath,
  path.join(workDir, 'KPI.work.production.history.js'),
  path.join(workDir, 'KPI.work.production.overview.js'),
  path.join(workDir, 'KPI.work.production.draft.js'),
];

const productionSources = await Promise.all(
  productionSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

const kpiHtml = await fs.readFile(path.join(repoRoot, 'KPI.html'), 'utf8');

function overrideBinding(context, name, value) {
  const overrideKey = `__override_${name}`;
  context[overrideKey] = value;
  vm.runInContext(`${name} = globalThis.${overrideKey};`, context);
}

function canonicalizeTeamName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b(?:lng|lpg)\b/g, '')
    .replace(/\s+/g, '');
}

function parseNumericValue(value) {
  const normalized = String(value ?? '')
    .replaceAll(',', '')
    .trim();
  if (!normalized) return Number.NaN;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : Number.NaN;
}

function formatDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createContext() {
  const categories = [
    { dataKey: 'work_team_calendar_team1_part1', title: 'Line Alpha', emptyProductionLabel: 'No production' },
    { dataKey: 'work_team_calendar_team4', title: 'Facility Support', emptyProductionLabel: 'No production' },
    { dataKey: 'work_team_calendar_overview', title: 'Overview', emptyProductionLabel: 'No production' },
  ];
  const draftStore = new Map();
  const monthRows = new Map([
    ['electric::Line Alpha::2026-04', { usage: 120, costs: { total: 10000 } }],
    ['gas::Line Alpha LNG::2026-04', { usage: 55, costs: { total: 20000 } }],
    ['waste::Plant A::2026-04', { usage: 5, costs: { total: 3000 } }],
    ['waste::Plant B::2026-04', { usage: 3, costs: { total: 2000 } }],
  ]);
  const historyPayload = {
    teams: {
      team1part1: [
        {
          team: 'team1part1',
          startDate: '2026-04-15',
          endDate: '2026-04-15',
          category: 'Inspection',
          categoryGroup: 'report',
          workContent: 'Boiler check',
          assignees: ['Alpha'],
          cost: 100000,
          attachments: [
            {
              attachmentType: 'report',
              originalName: 'report.pdf',
              storedName: 'report.pdf',
              url: '/report.pdf',
              previewUrl: '/report.pdf',
              downloadUrl: '/report.pdf',
            },
          ],
          attachmentSlots: {
            report: {
              attachmentType: 'report',
              originalName: 'report.pdf',
              storedName: 'report.pdf',
            },
          },
        },
      ],
      team1part2: [],
      team2: [],
      team3: [],
      team4: [],
    },
  };
  const context = {
    console,
    window: null,
    globalThis: null,
    document: {
      body: {
        appendChild() {},
      },
      documentElement: {
        classList: {
          add() {},
          remove() {},
        },
      },
      createElement() {
        return {
          style: {},
          click() {},
          remove() {},
        };
      },
      getElementById() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    URL: {
      createObjectURL() {
        return 'blob:test';
      },
      revokeObjectURL() {},
    },
    Blob,
    setTimeout(callback) {
      callback();
      return 0;
    },
    clearTimeout() {},
    AppData: {
      work: {
        name: 'Work',
        categories,
      },
    },
    WorkState: {
      teamCalendarModal: 'work_team_calendar_team1_part1',
      teamCalendarGasMode: {},
      teamCalendarAnchor: {},
      workEntryRootConnected: false,
    },
    UTIL_PRODUCTION_DAILY_INDEX: {
      [canonicalizeTeamName('Line Alpha')]: [
        {
          dateLabel: '2026-04-15',
          teamName: 'Line Alpha',
          lineName: 'Line A',
          productName: 'Item A',
          amount: 200,
          moistureExcludedYield: 91,
          equipmentCapa: 250,
          equipmentUtilization: 80,
        },
        {
          dateLabel: '2026-04-16',
          teamName: 'Line Alpha',
          lineName: 'Line B',
          productName: 'Item B',
          amount: 150,
          moistureExcludedYield: 88,
          equipmentCapa: 200,
          equipmentUtilization: 75,
        },
      ],
    },
    KpiWorkHistory: {
      TeamInfo: {
        team1part1: { name: 'Line Alpha', class: 'team-alpha' },
        team1part2: { name: 'Line Beta', class: 'team-beta' },
        team2: { name: 'Line Gamma', class: 'team-two' },
        team3: { name: 'Line Delta', class: 'team-three' },
        team4: { name: 'Facility Support', class: 'team-four' },
      },
      IMPORTANT_FLAG_LABEL: 'KPI',
      IMPORTANT_FLAG_PILL_LABEL: 'KPI',
      getPayload() {
        return historyPayload;
      },
      normalizePayload(value) {
        return value;
      },
      normalizeAssignees(value) {
        return String(value || '')
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
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
    Math,
    Promise,
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);

  productionSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });

  overrideBinding(context, 'getWorkTeamCalendarRawCategoryList', () => categories);
  overrideBinding(context, 'resolveWorkTeamCalendarSourceDataKeys', (dataKey) => {
    if (dataKey === 'work_team_calendar_overview') {
      return ['work_team_calendar_team1_part1', 'work_team_calendar_team4'];
    }
    return [String(dataKey || '').trim()];
  });
  overrideBinding(context, 'getWorkTeamCalendarCategory', (dataKey) => {
    return categories.find((category) => category.dataKey === String(dataKey || '').trim()) || null;
  });
  overrideBinding(context, 'resolveUtilProductionSourceTeams', (title) => {
    return String(title || '').trim() === 'Line Alpha' ? ['Line Alpha'] : [];
  });
  overrideBinding(context, 'normalizeUtilTeamName', canonicalizeTeamName);
  overrideBinding(context, 'canonicalizeUtilTeamName', canonicalizeTeamName);
  overrideBinding(context, 'parseUtilAmount', parseNumericValue);
  overrideBinding(context, 'parseUtilPercentAmount', parseNumericValue);
  overrideBinding(context, 'formatUtilNumber', (value, digits = 0) => {
    return Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  });
  overrideBinding(context, 'formatUtilNumberWithUnit', (value, unit, digits = 0) => {
    return `${context.formatUtilNumber(value, digits)} ${unit}`;
  });
  overrideBinding(context, 'getUtilDatasetSourceByKey', (datasetKey) => {
    if (datasetKey === 'electric') return [{ name: 'Line Alpha' }];
    if (datasetKey === 'gas') return [{ name: 'Line Alpha LNG' }];
    return [];
  });
  overrideBinding(context, 'findUtilDatasetMonthRow', (datasetKey, teamName, yearValue, monthValue) => {
    const monthKey = `${yearValue}-${String(monthValue).padStart(2, '0')}`;
    return monthRows.get(`${datasetKey}::${teamName}::${monthKey}`) || null;
  });
  overrideBinding(context, 'inferUtilFuelType', (teamName) => {
    const normalized = String(teamName || '').toUpperCase();
    if (normalized.includes('LPG')) return 'lpg';
    if (normalized.includes('LNG')) return 'lng';
    return 'lng';
  });
  overrideBinding(context, 'normalizeWorkTeamCalendarDateKeys', (dateKeys) => {
    const list = Array.isArray(dateKeys) ? dateKeys : [dateKeys];
    return list.map((value) => String(value || '').trim()).filter(Boolean);
  });
  overrideBinding(context, 'parseMonthKey', (monthKey) => {
    const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || ''));
    if (!match) return null;
    return { year: Number(match[1]), monthIndex: Number(match[2]) - 1 };
  });
  overrideBinding(context, 'getMonthMatrix', (yearValue, monthIndex) => {
    return [
      new Date(Date.UTC(yearValue, monthIndex, 15)),
      new Date(Date.UTC(yearValue, monthIndex, 16)),
    ];
  });
  overrideBinding(context, 'formatDateKey', formatDateKey);
  overrideBinding(context, 'formatWorkTeamCalendarMonthOptionLabel', (monthKey) => monthKey);
  overrideBinding(context, 'summarizeWorkTeamCalendarProductionMetrics', (items) => {
    const list = Array.isArray(items) ? items : [];
    const totalAmount = list.reduce((sum, item) => sum + (parseNumericValue(item.amount) || 0), 0);
    const totalEquipmentCapa = list.reduce((sum, item) => sum + (parseNumericValue(item.equipmentCapa) || 0), 0);
    const moistureExcludedYieldRate = list.length
      ? list.reduce((sum, item) => sum + (parseNumericValue(item.moistureExcludedYield) || 0), 0) / list.length
      : null;
    const utilizationRate = list.length
      ? list.reduce((sum, item) => sum + (parseNumericValue(item.equipmentUtilization) || 0), 0) / list.length
      : null;
    return {
      totalAmount,
      totalEquipmentCapa,
      moistureExcludedYieldRate,
      utilizationRate,
    };
  });
  overrideBinding(context, 'getWorkTeamCalendarProductionMetricLine', (group) => {
    return `Yield ${context.formatUtilNumber(group?.moistureExcludedYieldRate || 0, 0)}`;
  });
  overrideBinding(context, 'formatWorkTeamCalendarYieldLabel', (value) => `Yield ${context.formatUtilNumber(value || 0, 0)}`);
  overrideBinding(context, 'formatWorkTeamCalendarCapaLabel', (value) => `CAPA ${context.formatUtilNumber(value || 0, 0)}`);
  overrideBinding(
    context,
    'formatWorkTeamCalendarUtilizationLabel',
    (value) => `Util ${context.formatUtilNumber(value || 0, 0)}`
  );
  overrideBinding(context, 'escapeHtml', (value) => {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  });
  overrideBinding(context, 'arraysEqual', (left, right) => JSON.stringify(left || []) === JSON.stringify(right || []));
  overrideBinding(context, 'normalizeWorkTeamCalendarMembers', (members) => {
    return Array.from(
      new Set((Array.isArray(members) ? members : [members]).map((value) => String(value || '').trim()).filter(Boolean))
    );
  });
  overrideBinding(context, 'normalizeWorkTeamCalendarAttachments', (attachments) => {
    return Array.isArray(attachments) ? attachments.slice() : [];
  });
  overrideBinding(context, 'getWorkTeamCalendarData', (dataKey) => {
    const normalizedKey = String(dataKey || '').trim();
    if (!draftStore.has(normalizedKey)) {
      draftStore.set(normalizedKey, { drafts: {} });
    }
    return draftStore.get(normalizedKey);
  });
  overrideBinding(context, 'saveWorkData', () => true);
  overrideBinding(context, 'getWorkTeamCalendarDraftSnapshot', (dataKey, dateKey) => {
    const data = context.getWorkTeamCalendarData(dataKey);
    const raw = data?.drafts?.[String(dateKey || '').trim()] || {};
    return {
      title: String(raw.title || ''),
      note: String(raw.note || ''),
      remark: String(raw.remark || ''),
      members: Array.isArray(raw.members) ? raw.members.slice() : [],
      attachments: Array.isArray(raw.attachments) ? raw.attachments.slice() : [],
    };
  });
  overrideBinding(context, 'ensureWorkTeamCalendarDraft', (dataKey, dateKey) => {
    const data = context.getWorkTeamCalendarData(dataKey);
    const normalizedDateKey = String(dateKey || '').trim();
    if (!data.drafts[normalizedDateKey]) {
      data.drafts[normalizedDateKey] = {
        title: '',
        note: '',
        remark: '',
        members: [],
        attachments: [],
      };
    }
    return data.drafts[normalizedDateKey];
  });
  overrideBinding(context, 'cleanupWorkTeamCalendarDraft', () => {});
  overrideBinding(context, 'isWorkTeamCalendarDateLocked', () => false);
  overrideBinding(context, 'getWorkTeamCalendarActiveMonth', () => '2026-04');
  overrideBinding(context, 'getWorkTeamCalendarEditorDateKeys', () => ['2026-04-15']);
  overrideBinding(context, 'getWorkTeamCalendarPrimarySelectedDate', () => '2026-04-15');
  overrideBinding(context, 'setLastModified', () => {});
  overrideBinding(context, 'getWorkAttachmentServerRuntimeConfig', () => null);
  overrideBinding(context, 'setWorkTeamCalendarAnchor', (dataKey, dateKey, memberName) => {
    context.WorkState.teamCalendarAnchor[String(dataKey || '').trim()] = {
      dateKey: String(dateKey || '').trim(),
      memberName: String(memberName || '').trim(),
    };
  });

  return context;
}

test('work production split files expose utility, history, and draft helpers together', () => {
  const context = createContext();
  const summary = context.getWorkTeamCalendarUtilitySummary('work_team_calendar_overview', '2026-04');
  const historyHtml = context.renderWorkTeamCalendarGroupedHistoryHtml('work_team_calendar_overview', [
    '2026-04-15',
  ]);

  assert.equal(typeof context.getWorkTeamCalendarUtilitySummary, 'function');
  assert.equal(typeof context.renderWorkTeamCalendarGroupedHistoryHtml, 'function');
  assert.equal(typeof context.getWorkTeamCalendarDraftForDates, 'function');
  assert.equal(summary.electric.usageText, '120 kWh');
  assert.equal(summary.production.totalAmountText, '350kg');
  assert.match(summary.workEntryCountText, /^1건/);
  assert.match(historyHtml, /Boiler check/);
  assert.match(historyHtml, /work-team-calendar-team-group/);
});

test('work production draft helpers update member and title state through the shared draft store', () => {
  const context = createContext();

  assert.equal(
    context.toggleWorkTeamCalendarMember('Alpha', {
      dataKey: 'work_team_calendar_team1_part1',
      dateKey: '2026-04-15',
      dateKeys: ['2026-04-15'],
    }),
    true
  );

  context.updateWorkTeamCalendarTitle('Shift note');
  const draft = context.getWorkTeamCalendarDraftForDates('work_team_calendar_team1_part1', ['2026-04-15']);

  assert.deepEqual(draft.members, ['Alpha']);
  assert.equal(draft.title, 'Shift note');
});

test('kpi html loads work production split files before team calendar bootstrap', () => {
  const baseIndex = kpiHtml.indexOf('runtime/work/KPI.work.production.js?v=238');
  const historyIndex = kpiHtml.indexOf('runtime/work/KPI.work.production.history.js?v=1');
  const overviewIndex = kpiHtml.indexOf('runtime/work/KPI.work.production.overview.js?v=1');
  const draftIndex = kpiHtml.indexOf('runtime/work/KPI.work.production.draft.js?v=1');
  const teamCalendarIndex = kpiHtml.indexOf('runtime/work/KPI.work.team-calendar.js?v=237');

  assert.ok(baseIndex >= 0, 'work production loader is missing');
  assert.ok(historyIndex > baseIndex, 'work production history must load after production.js');
  assert.ok(overviewIndex > historyIndex, 'work production overview must load after production history');
  assert.ok(draftIndex > overviewIndex, 'work production draft must load after production overview');
  assert.ok(teamCalendarIndex > draftIndex, 'team calendar bootstrap must load after production split files');
});
