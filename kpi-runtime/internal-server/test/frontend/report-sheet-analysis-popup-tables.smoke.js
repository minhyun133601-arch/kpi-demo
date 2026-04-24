import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetAnalysisPopupTablesSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/popup-tables.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createPopupTablesContext() {
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
  vm.runInContext(reportSheetAnalysisPopupTablesSource, context, {
    filename: 'KPI.util.report.sheet.analysis.popup-tables.js',
  });
  return context;
}

function createRuntimeAdapters() {
  return {
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    },
    buildUtilGasAnalysisRatioTableControlHtml(controlItem) {
      return `<div class="ratio-control">${String(controlItem?.key || '')}</div>`;
    },
    formatUtilSheetRatio(value, decimals = 0, fallback = '-') {
      return Number.isFinite(value) ? Number(value).toFixed(decimals) : fallback;
    },
    formatUtilSheetDecimal(value, decimals = 0, fallback = '-') {
      return Number.isFinite(value) ? Number(value).toFixed(decimals) : fallback;
    },
    normalizeUtilSheetAnalysisDatasetKey(datasetKey) {
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    getUtilElectricAnalysisUnitKey() {
      return 'kwh';
    },
    getUtilElectricAnalysisChartUnitLabel() {
      return 'kWh';
    },
    getUtilElectricAnalysisChartDecimals() {
      return 1;
    },
    scaleUtilElectricAnalysisChartValue(chartKey, value) {
      return chartKey ? value : null;
    },
    resolveUtilElectricAnalysisPointValue(controlItem, point) {
      return point?.value ?? controlItem?.fallbackValue ?? null;
    },
    getUtilGasAnalysisUnitKey() {
      return 'nm3';
    },
    getUtilGasAnalysisChartUnitLabel() {
      return 'Nm3';
    },
    getUtilGasAnalysisChartDecimals() {
      return 2;
    },
    scaleUtilGasAnalysisChartValue(chartKey, value) {
      return chartKey ? value : null;
    },
    resolveUtilGasAnalysisPointValue(controlItem, point) {
      return point?.value ?? controlItem?.fallbackValue ?? null;
    },
    getUtilSheetActiveAnalysisDatasetKey(modal) {
      return String(modal?.dataset?.datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
  };
}

test('report sheet analysis popup tables registry resolves range/metric popup helpers', () => {
  const context = createPopupTablesContext();
  const registry = context.KPIUtilReportSheetAnalysisPopupTables;

  assert.ok(registry, 'report sheet analysis popup tables registry is missing');

  registry.setRuntimeAdapters(createRuntimeAdapters());

  const gasModal = {
    dataset: {
      datasetKey: 'gas',
      analysisInlineRatioTableKey: 'lng',
      analysisInlineRatioTableX: '12',
      analysisInlineRatioTableY: '34',
    },
    _utilSheetAnalysisModel: {
      ratioTables: [
        {
          key: 'lng',
          title: 'LNG ratio',
          rows: [
            { year: 2026, label: 'LNG', unitLabel: 'Nm3/ton', cells: [1.23, null, 2.34] },
          ],
        },
      ],
      ratioCombinedChart: {
        controlItems: [
          {
            key: 'ratio-lng',
            title: 'LNG ratio',
            points: [{ monthKey: '2026-01', value: 1.23 }],
          },
        ],
      },
      combinedChart: {
        controlItems: [
          {
            key: 'usage',
            title: 'Gas usage',
            points: [{ monthKey: '2026-01', value: 10.2 }],
          },
        ],
      },
      charts: [
        {
          key: 'usage',
          points: [{ value: 10.2 }],
        },
      ],
    },
  };

  const electricModal = {
    dataset: {
      datasetKey: 'electric',
      analysisInlineRatioTableKey: 'power',
    },
    _utilSheetAnalysisModel: {
      combinedChart: {
        controlItems: [
          {
            key: 'power',
            title: 'Power usage',
            points: [
              { monthKey: '2026-01', value: 10.4 },
              { monthKey: '2026-02', value: 11.5 },
            ],
          },
        ],
      },
      charts: [
        {
          key: 'power',
          points: [{ value: 10.4 }],
        },
      ],
    },
  };

  assert.equal(registry.parseUtilGasAnalysisRatioTablePopupKey('ratio-table-lng'), 'lng');
  assert.equal(registry.getUtilGasAnalysisInlineRatioTableKey(gasModal), 'lng');
  assert.equal(registry.normalizeUtilGasAnalysisPopupKey(gasModal, 'ratio-table-lng'), 'ratio-table-lng');
  assert.equal(registry.normalizeUtilGasAnalysisFullscreenChartKey(gasModal, 'usage'), 'usage');
  assert.equal(registry.isUtilGasAnalysisChartRenderable(gasModal._utilSheetAnalysisModel.charts[0]), true);

  const floatingPanelHtml = registry.buildUtilGasAnalysisFloatingTablePanelHtml(gasModal, gasModal._utilSheetAnalysisModel, 'lng');
  assert.ok(floatingPanelHtml.includes('util-sheet-analysis-inline-table-panel'));
  assert.ok(floatingPanelHtml.includes('left:12px;top:34px;right:auto;'));
  assert.ok(floatingPanelHtml.includes('ratio-control'));
  assert.ok(floatingPanelHtml.includes('LNG ratio'));

  const electricTableKey = registry.getUtilGasAnalysisInlineRatioTableKey(electricModal, 'power');
  assert.equal(electricTableKey, 'power');
  const electricTableEntry = registry.getUtilGasAnalysisInlineTableEntry(electricModal, electricTableKey);
  assert.equal(electricTableEntry?.kind, 'metric');
  assert.equal(electricTableEntry?.table?.unitLabel, 'kWh');
});

test('kpi html loads report sheet analysis popup tables after analysis render and before summary render', () => {
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const popupTablesIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/popup-tables.js?v=053');
  const summaryRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/summary/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(analysisRenderIndex >= 0, 'report sheet analysis render loader is missing');
  assert.ok(popupTablesIndex > analysisRenderIndex, 'report sheet analysis popup tables must load after analysis render');
  assert.ok(summaryRenderIndex > popupTablesIndex, 'report sheet analysis popup tables must load before summary render');
  assert.ok(sheetIndex > summaryRenderIndex, 'report sheet analysis popup tables must load before sheet.js');
});
