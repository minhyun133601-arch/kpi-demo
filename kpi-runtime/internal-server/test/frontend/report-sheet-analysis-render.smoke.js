import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetOptionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/options.js', import.meta.url),
  'utf8'
);
const reportSheetControlsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/controls.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisRenderSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/render.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createAnalysisRenderContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    renderUtilIndependentBoundsMultiSeriesChart(series, options = {}) {
      return `<div class="multi-series-chart" data-series-count="${Array.isArray(series) ? series.length : 0}" data-mode="${String(options.mode || '')}" data-show-labels="${String(options.showLabels === true)}">${String(options.chartTitle || '')}</div>`;
    },
    renderUtilTrendChart(points, metricLabel, options = {}) {
      return `<div class="trend-chart" data-point-count="${Array.isArray(points) ? points.length : 0}" data-mode="${String(options.mode || '')}" data-metric="${String(metricLabel || '')}">${String(options.chartTitle || '')}</div>`;
    }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetOptionsSource, context, {
    filename: 'KPI.util.report.sheet.options.js'
  });
  vm.runInContext(reportSheetControlsSource, context, {
    filename: 'KPI.util.report.sheet.controls.js'
  });
  vm.runInContext(reportSheetAnalysisRenderSource, context, {
    filename: 'KPI.util.report.sheet.analysis.render.js'
  });
  return context;
}

test('report sheet analysis render registry builds fullscreen gas chart cards and gas/electric analysis bodies', () => {
  const context = createAnalysisRenderContext();
  const controls = context.KPIUtilReportSheetControls;
  const analysisRender = context.KPIUtilReportSheetAnalysisRender;
  const productionLineKey = 'productionLineRatio::A::line1';

  controls.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
  });

  analysisRender.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    buildUtilGasAnalysisCombinedControlsHtml(chart) {
      return `<div class="combined-controls">${String(chart?.key || '')}</div>`;
    },
    normalizeUtilSheetAnalysisDatasetKey(datasetKey) {
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    getUtilSheetAnalysisShowLabels(datasetKey, chartKey, isFullscreenChart) {
      return datasetKey === 'electric' || (chartKey === 'combined' && isFullscreenChart === true);
    },
    getUtilGasAnalysisRatioShowLabels() {
      return true;
    },
    buildUtilGasAnalysisSeriesControlHtml(controlItem) {
      return `<button class="series-control" data-key="${String(controlItem?.key || '')}">series</button>`;
    },
    buildUtilGasAnalysisPopupOnlyControlHtml(item) {
      return `<button class="popup-only-control" data-key="${String(item?.key || '')}">popup</button>`;
    },
    getUtilGasAnalysisInlineRatioTableKey(modal, tableKey) {
      void modal;
      return String(tableKey || '').trim();
    },
    buildUtilGasAnalysisFloatingTablePanelHtml(modal, model, tableKey) {
      void modal;
      return `<aside class="floating-table" data-range="${String(model?.rangeLabel || '')}" data-key="${String(tableKey || '')}"></aside>`;
    }
  });

  const gasModel = {
    datasetKey: 'gas',
    rangeLabel: '2026-01 ~ 2026-03',
    categoryOption: { key: 'plantA' },
    monthOptions: [
      { value: '2026-01', label: '2026-01' },
      { value: '2026-02', label: '2026-02' },
      { value: '2026-03', label: '2026-03' }
    ],
    range: { from: '2026-01', to: '2026-03' },
    summaryItems: [
      { key: 'combined', title: 'Gas Total', valueText: '120', tone: 'gas', icon: 'fa-fire', subText: 'delta:+5' }
    ],
    combinedChart: {
      key: 'combined',
      title: 'Gas Combined Chart',
      tone: 'gas',
      icon: 'fa-fire',
      color: '#2563eb',
      decimals: 1,
      series: [{ points: [{ value: 10 }, { value: 12 }, { value: 14 }] }],
      chartDataList: [{ key: 'lng' }],
      controlItems: [{ key: 'combined' }]
    },
    charts: [],
    ratioCombinedChart: {
      key: 'ratio-combined',
      title: 'Gas Ratio Chart',
      tone: 'combined',
      icon: 'fa-scale-balanced',
      decimals: 2,
      series: [{ points: [{ value: 1 }, { value: 2 }, { value: 3 }] }],
      controlItems: [{ key: 'ratio-combined', points: [{ value: 1 }] }]
    }
  };
  const electricModel = {
    datasetKey: 'electric',
    rangeLabel: '2026-01 ~ 2026-03',
    teamOption: { key: 'combined' },
    monthOptions: gasModel.monthOptions,
    range: gasModel.range,
    summaryItems: [
      { key: 'electric-combined', title: 'Electric Total', valueText: '980', tone: 'electric', icon: 'fa-bolt' }
    ],
    combinedChart: {
      key: 'electricCombined',
      title: 'Electric Combined Chart',
      tone: 'electric',
      icon: 'fa-bolt',
      color: '#0f766e',
      decimals: 0,
      series: [{ points: [{ value: 100 }, { value: 120 }, { value: 140 }] }],
      chartDataList: [{ key: 'usage' }],
      controlItems: [{ key: 'electric-combined' }]
    },
    charts: [
      {
        key: 'electricIntensity',
        title: 'Electric Intensity',
        tone: 'electric',
        icon: 'fa-chart-line',
        color: '#0891b2',
        decimals: 2,
        metricLabel: 'kWh/kg',
        points: [{ value: 1.2 }, { value: 1.3 }, { value: 1.1 }]
      },
      {
        key: 'electricIntensity-lines',
        title: 'Electric Intensity Lines',
        tone: 'electric',
        icon: 'fa-chart-line',
        decimals: 1,
        color: '#0891b2',
        series: [{ seriesKey: productionLineKey, points: [{ value: 64.6 }, { value: 66.7 }, { value: 66.7 }] }],
        chartDataList: [{ key: productionLineKey }],
        controlItems: [{
          key: productionLineKey,
          title: 'Line 1',
          unitOptions: [{ key: 'percent', label: '%' }],
          unitKey: 'percent',
          displayMode: 'line',
          popupTableKey: productionLineKey
        }],
        summaryItems: [{
          key: productionLineKey,
          title: 'Line 1',
          valueText: '64.6%',
          secondaryLabelText: 'kg',
          secondaryValueText: '212kg',
          tone: 'production',
          icon: 'fa-chart-pie',
          popupTableKey: productionLineKey
        }],
        summaryControlItems: [{
          key: productionLineKey,
          title: 'Line 1',
          unitOptions: [{ key: 'percent', label: '%' }],
          unitKey: 'percent',
          displayMode: 'line',
          popupTableKey: productionLineKey
        }]
      }
    ]
  };

  const fullscreenCardHtml = analysisRender.buildUtilGasAnalysisChartCardHtmlV2(
    gasModel.combinedChart,
    gasModel,
    { fullscreenChart: true, chartKey: 'combined' }
  );
  const gasBodyHtml = analysisRender.buildUtilGasAnalysisBodyHtmlV2(
    gasModel,
    { fullscreenChart: false, inlineTableKey: 'ratio-combined' },
    {}
  );
  const electricBodyHtml = analysisRender.buildUtilElectricAnalysisBodyHtmlV2(
    electricModel,
    { fullscreenChart: false, inlineTableKey: 'ratio-combined' },
    {}
  );

  assert.ok(fullscreenCardHtml.includes('is-fullscreen-target'));
  assert.ok(fullscreenCardHtml.includes('multi-series-chart'));
  assert.ok(fullscreenCardHtml.includes('data-mode="modal"'));
  assert.ok(gasBodyHtml.includes('util-sheet-analysis-gas-category-select'));
  assert.ok(gasBodyHtml.includes('floating-table'));
  assert.ok(gasBodyHtml.includes('ratio-combined'));
  assert.ok(gasBodyHtml.includes('series-control'));
  assert.ok(gasBodyHtml.includes('util-sheet-analysis-table-stack'));
  assert.ok(electricBodyHtml.includes('util-sheet-analysis-electric-team-select'));
  assert.ok(electricBodyHtml.includes('trend-chart'));
  assert.ok(electricBodyHtml.includes('multi-series-chart'));
  assert.ok(electricBodyHtml.includes(productionLineKey));
  assert.ok(electricBodyHtml.includes('Line 1'));
});

test('kpi html loads report sheet analysis render between modal render and sheet.js', () => {
  const modalRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/render.js?v=054');
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('KPI.util.report.sheet.js?v=054');

  assert.ok(modalRenderIndex >= 0, 'report sheet modal render loader is missing');
  assert.ok(analysisRenderIndex > modalRenderIndex, 'report sheet analysis render must load after report sheet modal render');
  assert.ok(sheetIndex > analysisRenderIndex, 'report sheet must load after report sheet analysis render');
});
