import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisRangeRatioSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/range-ratio.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createRangeRatioContext() {
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
  vm.runInContext(reportSheetAnalysisRangeRatioSource, context, {
    filename: 'KPI.util.report.sheet.analysis.range-ratio.js',
  });
  return context;
}

test('report sheet analysis range-ratio registry builds tables, chart html, and combined model', () => {
  const context = createRangeRatioContext();
  const registry = context.KPIUtilReportSheetAnalysisRangeRatio;

  assert.ok(registry, 'report sheet analysis range-ratio registry is missing');

  registry.setRuntimeAdapters({
    compareUtilSheetMonthKeys(left, right) {
      return String(left || '').localeCompare(String(right || ''), 'ko');
    },
    formatUtilReportMonthShort(monthKey) {
      return `SHORT:${String(monthKey || '')}`;
    },
    getUtilGasAnalysisDisplayMode(chartKey) {
      return String(chartKey || '').trim() === 'ratio-lpg' ? 'bar' : 'line';
    },
    getUtilGasAnalysisUnitKey(chartKey) {
      return String(chartKey || '').trim() === 'line-a' ? 'kg' : 'ratio';
    },
    getUtilGasAnalysisChartUnitLabel(chartKey, unitKey) {
      return String(unitKey || '').trim() === 'kg' ? 'kg' : '%';
    },
    getUtilGasAnalysisChartDecimals(chartKey) {
      return String(chartKey || '').trim() === 'line-a' ? 1 : 3;
    },
    getUtilGasAnalysisUnitOptions(chartKey) {
      return String(chartKey || '').trim() === 'line-a'
        ? [{ key: 'kg', label: 'kg' }]
        : [{ key: 'ratio', label: '%' }];
    },
    scaleUtilGasAnalysisChartValue(chartKey, value) {
      return Number.isFinite(value) ? Number(value) : NaN;
    },
    buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
      return `${compareLabel}:${monthKey}:${deltaText}`;
    },
    formatUtilSheetRatio(value, digits = 3, fallback = '-') {
      return Number.isFinite(Number(value)) ? Number(value).toFixed(digits) : fallback;
    },
    formatUtilSheetPercent(value, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : fallback;
    },
    formatUtilElectricAnalysisLineMetricValue(value, unitKey) {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}${String(unitKey || '')}` : '-';
    },
    formatUtilElectricAnalysisSignedLineMetric(value, unitKey) {
      if (!Number.isFinite(Number(value))) return '-';
      const numeric = Number(value);
      return `${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}${String(unitKey || '')}`;
    },
    renderUtilMultiSeriesChart(series, options = {}) {
      return JSON.stringify({
        seriesCount: Array.isArray(series) ? series.length : 0,
        chartTitle: options.chartTitle,
        axisYLabel: options.axisYLabel
      });
    }
  });

  const ratioUsageMap = new Map([
    ['2026-01', { lpg: 2.5, lng: 4.1 }],
    ['2026-02', { lpg: 2.8, lng: 4.4 }]
  ]);
  const productionMap = new Map([
    ['2026-01', { lpg: 10, lng: 20 }],
    ['2026-02', { lpg: 12, lng: 22 }]
  ]);
  const rangeTables = registry.buildUtilGasAnalysisRangeTables(
    ['2026-01', '2026-02'],
    ratioUsageMap,
    productionMap
  );

  assert.equal(rangeTables.length, 2);
  assert.equal(rangeTables[0].key, 'lpg');
  assert.equal(rangeTables[1].key, 'lng');
  assert.equal(rangeTables[0].rows[0].cells[0], 0.25);

  const rangeChartHtml = registry.buildUtilGasAnalysisRangeChartHtml(rangeTables[0]);
  const parsedChartHtml = JSON.parse(rangeChartHtml);
  assert.equal(parsedChartHtml.seriesCount, 1);
  assert.equal(parsedChartHtml.axisYLabel, 'kg/kg');

  const combinedModel = registry.buildUtilGasAnalysisRatioCombinedChartModel(rangeTables, '2026-01 ~ 2026-02', {
    activeMonthKey: '2026-02',
    referenceMonthKey: '2026-01',
    compareLabel: 'month-compare',
    categoryLabel: 'Utilities',
    lineRatioSeries: [
      {
        key: 'line-a',
        title: 'Line A',
        color: '#2563eb',
        totalAmount: 10,
        totalRatio: 8,
        deltaAmount: 2,
        deltaRatio: 1,
        points: [
          { monthKey: '2026-01', ratioValue: 4, amountValue: 5 },
          { monthKey: '2026-02', ratioValue: 5, amountValue: 5 }
        ]
      }
    ]
  });

  assert.equal(combinedModel?.key, 'ratio-combined');
  assert.equal(combinedModel?.series?.length, 3);
  assert.equal(combinedModel?.controlItems?.length, 3);
  assert.equal(combinedModel?.summaryItems?.length, 3);
  assert.equal(combinedModel?.summaryControlItems?.length, 3);
  assert.equal(combinedModel?.hasVisibleSeries, true);
});

test('kpi html loads report sheet analysis range-ratio between chart-controls and electric chart model', () => {
  const chartControlsIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/chart-controls.js?v=053');
  const rangeRatioIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/range-ratio.js?v=053');
  const electricChartModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/electric/chart-model.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(chartControlsIndex >= 0, 'report sheet analysis chart-controls loader is missing');
  assert.ok(rangeRatioIndex > chartControlsIndex, 'report sheet analysis range-ratio must load after chart-controls');
  assert.ok(electricChartModelIndex > rangeRatioIndex, 'report sheet analysis range-ratio must load before electric chart model');
  assert.ok(sheetIndex > electricChartModelIndex, 'report sheet analysis range-ratio must load before sheet.js');
});
