import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetOptionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/options.js', import.meta.url),
  'utf8'
);
const reportSheetControlsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/controls.js', import.meta.url),
  'utf8'
);
const reportSheetPanelRuntimeSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/panel/runtime.js', import.meta.url),
  'utf8'
);
const reportSheetPanelPreviewSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/panel/preview.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createPanelPreviewContext() {
  const context = {
    console,
    Intl,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetOptionsSource, context, {
    filename: 'KPI.util.report.sheet.options.js',
  });
  vm.runInContext(reportSheetControlsSource, context, {
    filename: 'KPI.util.report.sheet.controls.js',
  });
  vm.runInContext(reportSheetPanelRuntimeSource, context, {
    filename: 'KPI.util.report.sheet.panel.runtime.js',
  });
  vm.runInContext(reportSheetPanelPreviewSource, context, {
    filename: 'KPI.util.report.sheet.panel.preview.js',
  });
  return context;
}

function createPanelStub() {
  const previewEl = { innerHTML: '', hidden: false };
  const noteEl = { textContent: '', hidden: false };
  const monthSelect = { innerHTML: '', disabled: false, value: '' };
  const nodes = new Map([
    ['[data-role="util-sheet-preview"]', previewEl],
    ['[data-role="util-sheet-note"]', noteEl],
    ['[data-role="util-sheet-month"]', monthSelect],
  ]);

  const panel = {
    dataset: {
      sheetType: 'meter',
      datasetKey: 'gas',
      monthKey: '2026-03',
      compareKey: 'month',
    },
    classList: {
      toggle() {},
    },
    querySelector(selector) {
      return nodes.get(selector) ?? null;
    },
    querySelectorAll() {
      return [];
    },
  };

  return { panel, previewEl, noteEl, monthSelect };
}

test('report sheet panel preview registry builds dataset result and renders month selector state', () => {
  const context = createPanelPreviewContext();
  const controls = context.KPIUtilReportSheetControls;
  const panelRuntime = context.KPIUtilReportSheetPanelRuntime;
  const panelPreview = context.KPIUtilReportSheetPanelPreview;

  assert.ok(panelPreview, 'report sheet panel preview registry is missing');

  controls.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    normalizeUtilGasMeterProductionKey(value) {
      return value === 'plantB' ? 'plantB' : 'combined';
    },
    getUtilGasMeterProductionOptions() {
      return [
        { key: 'combined', label: 'combined' },
      ];
    },
  });

  panelRuntime.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
  });

  panelPreview.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    buildUtilSheetMonthBounds() {
      return { from: '2026-02', to: '2026-04' };
    },
    buildUtilReportMonthlyRows(state) {
      const allRows = [
        { year: 2026, month: 2, monthKey: '2026-02', gasUsage: 100, gasCost: 9000, gasUnit: 10, production: 900 },
        { year: 2026, month: 3, monthKey: '2026-03', gasUsage: 110, gasCost: 9900, gasUnit: 10, production: 950 },
        { year: 2026, month: 4, monthKey: '2026-04', gasUsage: 120, gasCost: 10800, gasUnit: 10, production: 1000 },
      ];
      const to = String(state?.to || '2026-04');
      return {
        rows: allRows.filter(row => row.monthKey <= to),
        rangeLabel: `${state?.from || ''}~${to}`,
      };
    },
    isUtilSheetSettledRow() {
      return true;
    },
    summarizeUtilSheetRows(rows, spec) {
      const usage = rows.reduce((sum, row) => sum + (Number(row?.[spec.usageKey]) || 0), 0);
      const cost = rows.reduce((sum, row) => sum + (Number(row?.[spec.costKey]) || 0), 0);
      const production = rows.reduce((sum, row) => sum + (Number(row?.production) || 0), 0);
      return {
        usage,
        cost,
        production,
        unit: production > 0 ? cost / production : null,
      };
    },
    formatUtilReportMonthLong(monthKey) {
      return `LONG:${monthKey}`;
    },
    parseUtilMonthValue(monthKey) {
      const [year, month] = String(monthKey || '').split('-').map(Number);
      return Number.isFinite(year) && Number.isFinite(month) ? { year, month, value: monthKey } : null;
    },
  });

  const datasetResult = panelPreview.buildUtilSheetDatasetResult('gas', '2026-03');
  const previewModel = panelPreview.buildUtilSheetPreviewModel('meter', 'gas', '2026-03');
  const { panel, previewEl, noteEl, monthSelect } = createPanelStub();

  panelPreview.renderUtilSheetPanel(panel);

  assert.equal(datasetResult.hasData, true);
  assert.equal(datasetResult.activeMonthKey, '2026-03');
  assert.equal(datasetResult.latestMonthLabel, 'LONG:2026-03');
  assert.equal(previewModel.hasData, true);
  assert.ok(monthSelect.innerHTML.includes('value="2026-03" selected'));
  assert.equal(panel.dataset.monthKey, '2026-03');
  assert.equal(previewEl.hidden, true);
  assert.equal(noteEl.hidden, true);
});

test('kpi html loads report sheet panel preview after panel runtime and before windows', () => {
  const panelRuntimeIndex = kpiHtml.indexOf('runtime/util/report/sheet/panel/runtime.js?v=053');
  const panelPreviewIndex = kpiHtml.indexOf('runtime/util/report/sheet/panel/preview.js?v=053');
  const windowsIndex = kpiHtml.indexOf('runtime/util/report/sheet/windows.js?v=053');

  assert.ok(panelRuntimeIndex >= 0, 'report sheet panel runtime loader is missing');
  assert.ok(panelPreviewIndex > panelRuntimeIndex, 'report sheet panel preview must load after panel runtime');
  assert.ok(windowsIndex > panelPreviewIndex, 'report sheet panel preview must load before windows');
});
