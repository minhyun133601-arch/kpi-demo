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

const teamCalendarPath = await findFile(repoRoot, 'KPI.work.team-calendar.js');
assert.ok(teamCalendarPath, 'work team calendar source is missing');

const workDir = path.dirname(teamCalendarPath);
const teamCalendarSourcePaths = [
  teamCalendarPath,
  path.join(workDir, 'KPI.work.team-calendar.selection.js'),
  path.join(workDir, 'KPI.work.team-calendar.draft-actions.js'),
  path.join(workDir, 'KPI.work.team-calendar.render.js'),
];

const teamCalendarSources = await Promise.all(
  teamCalendarSourcePaths.map(async (targetPath) => ({
    filename: path.basename(targetPath),
    source: await fs.readFile(targetPath, 'utf8'),
  }))
);

const combinedTeamCalendarSource = teamCalendarSources.map((entry) => entry.source).join('\n');

function overrideBinding(context, name, value) {
  const overrideKey = `__override_${name}`;
  context[overrideKey] = value;
  vm.runInContext(`${name} = globalThis.${overrideKey};`, context);
}

function createModalElement() {
  return {
    innerHTML: '',
    classList: {
      add() {},
      remove() {},
      contains() {
        return true;
      },
      toggle() {},
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    remove() {},
    parentElement: null,
  };
}

function createContext(options = {}) {
  const modal = createModalElement();
  const editorState = { open: false, dateKey: '', manual: false };
  const selectedDateKey = options.selectedDateKey || '2026-04-15';
  const productionSummaryMap =
    options.productionSummaryMap
    || new Map([[selectedDateKey, { count: 0, totalAmount: 0, isOffday: false }]]);
  const historySummaryMap =
    options.historySummaryMap
    || new Map([[selectedDateKey, { count: 0, kpiCount: 0 }]]);
  const utilitySummary = {
    electric: { usageText: '120 kWh', costText: '10000', canSelect: false, mode: 'all' },
    gas: { usageText: '55 Nm3', costText: '20000', canSelect: false, mode: 'all' },
    waste: { usageText: '8 t', costText: '5000' },
    production: { totalAmountText: '320kg', itemCountText: '3 items' },
    workEntryCountText: '2 items',
    workCostText: '30000',
  };
  const context = {
    console,
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
    RegExp,
    AppData: {
      work: {
        categories: [
          {
            dataKey: 'overview',
            view: 'team_calendar',
            title: 'Overview',
            processLabel: 'Overview Process',
            color: '#2563eb',
            secondaryColor: '#38bdf8',
            tint: '#eff6ff',
            emptyProductionLabel: 'No items',
          },
        ],
      },
    },
    WorkState: {
      teamCalendarModal: 'overview',
      teamCalendarUtilityPopup: { overview: '' },
      workEntryRootConnected: false,
      monthFilters: {},
      activeMonth: {},
    },
    WORK_TEAM_CALENDAR_RANGE: {
      start: '2026-04',
      end: '2026-04',
    },
    WORK_TEAM_CALENDAR_MEMBERS: ['Alpha', 'Beta'],
    WORK_DAY_LABELS: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    window: null,
    document: {
      body: { style: {} },
      querySelectorAll() {
        return [];
      },
    },
    alert() {},
  };
  context.window = context;
  context.globalThis = context;
  context.KpiWorkHistory = {
    IMPORTANT_FLAG_LABEL: 'KPI',
    IMPORTANT_FLAG_PILL_LABEL: 'KPI',
  };
  vm.createContext(context);
  teamCalendarSources.forEach(({ filename, source }) => {
    vm.runInContext(source, context, { filename });
  });

  overrideBinding(context, 'ensureWorkTeamCalendarModal', () => modal);
  overrideBinding(context, 'getWorkTeamCalendarActiveMonth', () => '2026-04');
  overrideBinding(context, 'getWorkTeamCalendarMonthOptions', () => ['2026-04']);
  overrideBinding(context, 'parseMonthKey', () => ({ year: 2026, monthIndex: 3 }));
  overrideBinding(context, 'formatDateKey', () => selectedDateKey);
  overrideBinding(context, 'getWorkTeamCalendarSelectedDate', () => selectedDateKey);
  overrideBinding(context, 'getWorkTeamCalendarSelectedDateKeys', () => [selectedDateKey]);
  overrideBinding(context, 'getWorkTeamCalendarPrimarySelectedDate', () => selectedDateKey);
  overrideBinding(context, 'isWorkTeamCalendarDateLocked', () => false);
  overrideBinding(context, 'isWorkTeamCalendarOverview', () => true);
  overrideBinding(context, 'getWorkTeamCalendarUtilityPopupMetric', () => '');
  overrideBinding(context, 'getWorkTeamCalendarEditorState', () => editorState);
  overrideBinding(context, 'getWorkTeamCalendarDraftForDates', () => ({
    title: '',
    note: '',
    remark: '',
    members: [],
    attachments: [],
  }));
  overrideBinding(context, 'getWorkTeamCalendarHistoryRecordsForDates', () => []);
  overrideBinding(context, 'renderWorkTeamCalendarReadonlyEntriesHtml', () => '');
  overrideBinding(context, 'getWorkTeamCalendarMemberCountLabel', () => '0');
  overrideBinding(context, 'renderWorkTeamCalendarSelectedMembersHtml', () => '');
  overrideBinding(context, 'renderWorkTeamCalendarAttachmentListHtml', () => '');
  overrideBinding(context, 'buildWorkTeamCalendarEntryTitle', () => '');
  overrideBinding(context, 'getWorkTeamCalendarAttachmentPreviewLabel', () => '');
  overrideBinding(context, 'getMonthMatrix', () => [new Date(`${selectedDateKey}T00:00:00Z`)]);
  overrideBinding(context, 'getWorkTeamCalendarProductionSummaryMap', () => productionSummaryMap);
  overrideBinding(context, 'getWorkTeamCalendarHistorySummaryMap', () => historySummaryMap);
  overrideBinding(context, 'getWorkTeamCalendarProductionGroups', () => []);
  overrideBinding(
    context,
    'renderWorkTeamCalendarProductionTeamGroupsHtml',
    () => '<div class="groups">overview</div>'
  );
  overrideBinding(context, 'renderWorkTeamCalendarProductionGroupsHtml', () => '<div class="groups">detail</div>');
  overrideBinding(context, 'summarizeWorkTeamCalendarProductionMetrics', () => ({ totalAmount: 0 }));
  overrideBinding(context, 'getWorkTeamCalendarProductionMetricLine', () => '');
  overrideBinding(context, 'getWorkTeamCalendarSelectionLabel', () => '2026.04.15');
  overrideBinding(context, 'getWorkTeamCalendarRangeLabel', () => '26.04 ~ 26.04');
  overrideBinding(context, 'formatUtilNumber', (value, digits = 0) => Number(value || 0).toFixed(digits));
  overrideBinding(context, 'isWorkTeamCalendarInlineMode', () => false);
  overrideBinding(context, 'isWorkTeamCalendarFullscreen', () => false);
  overrideBinding(context, 'getWorkTeamCalendarFullscreenLabel', () => 'Fullscreen');
  overrideBinding(context, 'escapeHtml', (value) => String(value ?? ''));
  overrideBinding(context, 'getWorkTeamCalendarFullscreenIconSvg', () => '<svg></svg>');
  overrideBinding(context, 'getWorkTeamCalendarUtilitySummary', () => utilitySummary);
  overrideBinding(context, 'buildWorkTeamCalendarOverviewUtilityBreakdown', () => ({
    monthLabel: '2026.04',
    electric: [],
    gas: [],
  }));
  overrideBinding(context, 'renderWorkTeamCalendarGroupedHistoryHtml', () => '');
  overrideBinding(context, 'bindWorkTeamCalendarMemberPicker', () => {});
  overrideBinding(context, 'bindWorkTeamCalendarEditorOverlay', () => {});
  overrideBinding(context, 'refreshWorkTeamCalendarStorageStatus', () => {});
  overrideBinding(context, 'syncWorkTeamCalendarInlineIndex', () => {});
  overrideBinding(context, 'syncWorkTeamCalendarFullscreenUi', () => {});

  return { context, modal };
}

test('work team calendar overview modal renders after split files are loaded together', () => {
  const { context, modal } = createContext();

  assert.doesNotThrow(() => {
    context.renderWorkTeamCalendarModal();
  });
  assert.match(modal.innerHTML, /work-team-calendar-utility-strip/);
  assert.match(modal.innerHTML, /work-team-calendar-grid/);
  assert.match(modal.innerHTML, /data-work-save-status="overview"/);
});

test('work team calendar offday cells keep production and history cues in the flag slot', () => {
  const { context, modal } = createContext({
    productionSummaryMap: new Map([['2026-04-15', { count: 2, totalAmount: 18, isOffday: true }]]),
    historySummaryMap: new Map([['2026-04-15', { count: 3, kpiCount: 2 }]]),
  });

  context.renderWorkTeamCalendarModal();

  assert.match(modal.innerHTML, /휴무/);
  assert.match(modal.innerHTML, /오늘/);
  assert.match(modal.innerHTML, /KPI 2/);
  assert.match(modal.innerHTML, /18kg/);
  assert.match(modal.innerHTML, /3건/);
});

test('work team calendar source does not keep stray equipUtilityChipHtml references', () => {
  assert.doesNotMatch(combinedTeamCalendarSource, /\bequipUtilityChipHtml\b/);
});

test('work team calendar attachment actions confirm server save before destructive file cleanup', () => {
  assert.match(combinedTeamCalendarSource, /async function updateWorkTeamCalendarAttachments/);
  assert.match(combinedTeamCalendarSource, /confirmWorkTeamCalendarSave\(dataKey, data, 'work_team_calendar_attachment_save_failed'\)/);
  assert.match(combinedTeamCalendarSource, /cleanupWorkTeamCalendarUploadedAttachments\(uploadedAttachments, folderHandle, dataKey\)/);
  assert.match(combinedTeamCalendarSource, /confirmWorkTeamCalendarSave\(dataKey, data, 'work_team_calendar_delete_save_failed'\)/);
  assert.match(combinedTeamCalendarSource, /첨부 기록에서는 제거했지만 파일 삭제는 실패했습니다/);
});
