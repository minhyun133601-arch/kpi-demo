import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisElectricChartModelSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/electric/chart-model.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisElectricModelSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/electric/model.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisGasModelSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/gas/model.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

const PRODUCTION_LINE_PREFIX = '\uc0dd\uc0b0\ub77c\uc778::';

function createMonthKey(year, month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function shiftMonthKey(monthKey, offset = 0) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
  if (!match) return '';
  const yearValue = Number(match[1]);
  const monthValue = Number(match[2]) - 1;
  const shifted = new Date(Date.UTC(yearValue, monthValue + Number(offset || 0), 1));
  return createMonthKey(shifted.getUTCFullYear(), shifted.getUTCMonth() + 1);
}

function createMonthRange(fromKey, toKey) {
  const items = [];
  let current = String(fromKey || '').trim();
  const end = String(toKey || '').trim();
  while (current && current <= end) {
    const match = /^(\d{4})-(\d{2})$/.exec(current);
    items.push({
      key: current,
      year: Number(match?.[1]),
      month: Number(match?.[2])
    });
    current = shiftMonthKey(current, 1);
  }
  return items;
}

function summarizeRows(rows, spec) {
  const normalizedRows = Array.isArray(rows) ? rows : [];
  const usage = normalizedRows.reduce((sum, row) => sum + (Number(row?.[spec?.usageKey]) || 0), 0);
  const cost = normalizedRows.reduce((sum, row) => sum + (Number(row?.[spec?.costKey]) || 0), 0);
  const production = normalizedRows.reduce((sum, row) => sum + (Number(row?.production) || 0), 0);
  return {
    usage,
    cost,
    production,
    unit: production > 0 ? cost / production : null
  };
}

function createAnalysisModelContext() {
  const productionRowsByTeam = {
    A: [
      { monthKey: '2026-01', year: 2026, month: 1, electricUsage: 110, electricCost: 1210, production: 100, electricUnit: 12.1 },
      { monthKey: '2026-02', year: 2026, month: 2, electricUsage: 120, electricCost: 1260, production: 108, electricUnit: 11.6667 },
      { monthKey: '2026-03', year: 2026, month: 3, electricUsage: 132, electricCost: 1452, production: 120, electricUnit: 12.1 }
    ],
    B: [
      { monthKey: '2026-01', year: 2026, month: 1, electricUsage: 90, electricCost: 900, production: 88, electricUnit: 10.2273 },
      { monthKey: '2026-02', year: 2026, month: 2, electricUsage: 96, electricCost: 1008, production: 92, electricUnit: 10.9565 },
      { monthKey: '2026-03', year: 2026, month: 3, electricUsage: 108, electricCost: 1188, production: 101, electricUnit: 11.7624 }
    ]
  };
  const gasMetricMap = new Map([
    ['2026-01', { lpgUsage: 2500, lngUsage: 4100, gasCost: 1800000, production: 188, ratioProduction: { lpg: 84, lng: 104 } }],
    ['2026-02', { lpgUsage: 2700, lngUsage: 4300, gasCost: 1920000, production: 200, ratioProduction: { lpg: 91, lng: 109 } }],
    ['2026-03', { lpgUsage: 2900, lngUsage: 4500, gasCost: 2050000, production: 221, ratioProduction: { lpg: 96, lng: 125 } }]
  ]);
  const productionValueMap = {
    '2026-01': {
      [`${PRODUCTION_LINE_PREFIX}A::line1`]: 60,
      [`${PRODUCTION_LINE_PREFIX}A::line2`]: 40
    },
    '2026-02': {
      [`${PRODUCTION_LINE_PREFIX}A::line1`]: 72,
      [`${PRODUCTION_LINE_PREFIX}A::line2`]: 36
    },
    '2026-03': {
      [`${PRODUCTION_LINE_PREFIX}A::line1`]: 80,
      [`${PRODUCTION_LINE_PREFIX}A::line2`]: 40
    }
  };
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Math,
    Date,
    Intl,
    parseUtilMonthValue(monthKey) {
      const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
      return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
    },
    buildUtilReportMonthlyRows(state = {}) {
      const scopeKeys = Array.isArray(state.selectedScopeKeys) ? state.selectedScopeKeys : [];
      if (scopeKeys.includes('gas')) {
        return {
          rows: Array.from(gasMetricMap.entries()).map(([monthKey, metric]) => ({
            monthKey,
            year: Number(monthKey.slice(0, 4)),
            month: Number(monthKey.slice(5, 7)),
            gasUsage: Number(metric.lngUsage) + Number(metric.lpgUsage),
            gasCost: metric.gasCost,
            gasUnit: metric.production > 0 ? metric.gasCost / metric.production : null,
            production: metric.production
          }))
        };
      }
      const rows = productionRowsByTeam[String(state.electricTeam || '').trim()] || [];
      return { rows };
    },
    getUtilReportMonthRange(fromKey, toKey) {
      return createMonthRange(fromKey, toKey);
    },
    formatUtilReportMonthLong(monthKey) {
      return `LONG:${String(monthKey || '')}`;
    },
    formatUtilReportMonthShort(monthKey) {
      return `SHORT:${String(monthKey || '')}`;
    },
    buildUtilReportProductionProductMonthlyValueMap(yearValue, monthValue, teamName) {
      return productionValueMap[createMonthKey(yearValue, monthValue)] && String(teamName || '').trim() === 'A'
        ? productionValueMap[createMonthKey(yearValue, monthValue)]
        : {};
    }
  };

  context.__TEST_GAS_METRIC_MAP__ = gasMetricMap;
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js'
  });
  vm.runInContext(reportSheetAnalysisElectricChartModelSource, context, {
    filename: 'KPI.util.report.sheet.analysis.electric.chart-model.js'
  });
  vm.runInContext(reportSheetAnalysisElectricModelSource, context, {
    filename: 'KPI.util.report.sheet.analysis.electric.model.js'
  });
  vm.runInContext(reportSheetAnalysisGasModelSource, context, {
    filename: 'KPI.util.report.sheet.analysis.gas.model.js'
  });
  return context;
}

test('report sheet analysis model registries build electric and gas analysis models', () => {
  const context = createAnalysisModelContext();
  const config = context.KPIUtilReportSheetConfig;
  const electricChartModelRegistry = context.KPIUtilReportSheetAnalysisElectricChartModel;
  const electricModelRegistry = context.KPIUtilReportSheetAnalysisElectricModel;
  const gasModelRegistry = context.KPIUtilReportSheetAnalysisGasModel;
  const lineRatioPrefix = config.UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX;

  assert.ok(electricChartModelRegistry);
  electricModelRegistry.setRuntimeAdapters({
    getUtilElectricAnalysisTeamOption(teamKey = 'combined') {
      if (String(teamKey || '').trim() === 'team-a') {
        return {
          key: 'team-a',
          label: 'Team A',
          reportTeamFilters: ['A'],
          productionTeamNames: ['A']
        };
      }
      return {
        key: 'combined',
        label: 'Combined',
        reportTeamFilters: ['A', 'B'],
        productionTeamNames: ['A', 'B']
      };
    },
    buildUtilSheetMonthBounds() {
      return { from: '2026-01', to: '2026-03' };
    },
    isUtilSheetSettledRow(row) {
      return Boolean(row?.monthKey);
    },
    compareUtilSheetMonthKeys(left, right) {
      return String(left || '').localeCompare(String(right || ''), 'ko');
    },
    summarizeUtilSheetRows: summarizeRows,
    getUtilSheetAnalysisRangeState(datasetKey = 'electric') {
      return config.UtilSheetAnalysisState[datasetKey];
    },
    normalizeUtilSheetCompareKey(compareKey = 'month') {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    normalizeUtilSheetAnalysisRange(monthOptions, fromValue = '', toValue = '', fallbackToValue = '') {
      const values = (Array.isArray(monthOptions) ? monthOptions : []).map((item) => String(item?.value || ''));
      const from = values.includes(String(fromValue || '')) ? String(fromValue || '') : values[0];
      const to = values.includes(String(toValue || ''))
        ? String(toValue || '')
        : (values.includes(String(fallbackToValue || '')) ? String(fallbackToValue || '') : values[values.length - 1]);
      return { from, to, monthKeys: values.filter((value) => value >= from && value <= to) };
    },
    buildUtilSheetRangeMonthKeys(monthOptions, fromValue = '', toValue = '') {
      return (Array.isArray(monthOptions) ? monthOptions : [])
        .map((item) => String(item?.value || ''))
        .filter((value) => value >= String(fromValue || '') && value <= String(toValue || ''));
    },
    buildUtilSheetRangeLabel(fromValue = '', toValue = '') {
      return `${fromValue} ~ ${toValue}`;
    },
    shiftUtilSheetMonthKey: shiftMonthKey,
    getUtilSheetCompareLabel(compareKey = 'month') {
      return compareKey === 'year' ? 'year-compare' : 'month-compare';
    },
    buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
      return `${compareLabel}:${monthKey}:${deltaText}`;
    },
    formatUtilSheetQuantity(value, unit, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} ${unit}` : fallback;
    },
    formatUtilSheetSignedQuantity(value, unit, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)} ${unit}` : fallback;
    },
    formatUtilSheetCost(value, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Math.round(Number(value)).toLocaleString('ko-KR')} KRW` : fallback;
    },
    formatUtilSheetSignedCost(value, fallback = '-') {
      return Number.isFinite(Number(value))
        ? `${Number(value) >= 0 ? '+' : ''}${Math.round(Number(value)).toLocaleString('ko-KR')} KRW`
        : fallback;
    },
    getUtilElectricAnalysisUnitKey(chartKey = '') {
      const key = String(chartKey || '').trim();
      if (key === 'electricUsage') return 'kwh';
      if (key === 'electricCost') return 'krw';
      if (key === 'production') return 'kg';
      if (key === 'electricIntensity') return 'kwhkg';
      if (key.startsWith(lineRatioPrefix)) return 'percent';
      return 'kwh';
    },
    getUtilElectricAnalysisChartUnitLabel(chartKey = '', unitKey = '') {
      const key = String(unitKey || chartKey || '').trim();
      if (key === 'kwh' || key === 'electricUsage') return 'kWh';
      if (key === 'krw' || key === 'electricCost') return 'KRW';
      if (key === 'kg' || key === 'production') return 'kg';
      if (key === 'kwhkg' || key === 'electricIntensity') return 'kWh/kg';
      if (key === 'percent') return '%';
      return key;
    },
    getUtilElectricAnalysisChartDecimals(chartKey = '', unitKey = '') {
      const key = String(unitKey || chartKey || '').trim();
      return key === 'kwhkg' || key === 'percent' ? 1 : 0;
    },
    scaleUtilElectricAnalysisChartValue(chartKey = '', value) {
      void chartKey;
      return Number.isFinite(Number(value)) ? Number(value) : NaN;
    },
    formatUtilSheetDecimal(value, decimals = 2, fallback = '-') {
      return Number.isFinite(Number(value)) ? Number(value).toFixed(decimals) : fallback;
    },
    getUtilElectricAnalysisUnitOption(chartKey = '', unitKey = '') {
      return { key: unitKey || String(chartKey || ''), label: unitKey || String(chartKey || ''), scale: 1, decimals: 1 };
    },
    formatUtilSheetPercent(value, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)}%` : fallback;
    },
    formatUtilSheetSignedPercentPoint(value, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)}%p` : fallback;
    },
    getUtilElectricAnalysisDisplayMode(chartKey = '') {
      return String(chartKey || '').trim() === 'electricUsage' ? 'bar' : 'line';
    },
    getUtilElectricAnalysisUnitOptions(chartKey = '') {
      return [{ key: String(chartKey || ''), label: String(chartKey || ''), scale: 1, decimals: 1 }];
    },
    buildUtilGasAnalysisSeriesLabel({ title = '', metricLabel = '' } = {}) {
      return `${title} (${metricLabel})`;
    },
    setUtilSheetAnalysisRangeState(datasetKey = 'electric', fromValue = '', toValue = '') {
      config.UtilSheetAnalysisState[datasetKey].from = fromValue;
      config.UtilSheetAnalysisState[datasetKey].to = toValue;
    }
  });

  gasModelRegistry.setRuntimeAdapters({
    buildUtilSheetMonthBounds() {
      return { from: '2026-01', to: '2026-03' };
    },
    hasUtilGasMeteringStore() {
      return true;
    },
    normalizeUtilSheetCompareKey(compareKey = 'month') {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    getUtilGasAnalysisCategoryOption() {
      return {
        key: 'plantA',
        label: 'plantA',
        productionTeamNames: ['A'],
        showLpgCard: true
      };
    },
    normalizeUtilSheetAnalysisRange(monthOptions, fromValue = '', toValue = '', fallbackToValue = '') {
      const values = (Array.isArray(monthOptions) ? monthOptions : []).map((item) => String(item?.value || ''));
      const from = values.includes(String(fromValue || '')) ? String(fromValue || '') : values[0];
      const to = values.includes(String(toValue || ''))
        ? String(toValue || '')
        : (values.includes(String(fallbackToValue || '')) ? String(fallbackToValue || '') : values[values.length - 1]);
      return { from, to, monthKeys: values.filter((value) => value >= from && value <= to) };
    },
    buildUtilSheetRangeMonthKeys(monthOptions, fromValue = '', toValue = '') {
      return (Array.isArray(monthOptions) ? monthOptions : [])
        .map((item) => String(item?.value || ''))
        .filter((value) => value >= String(fromValue || '') && value <= String(toValue || ''));
    },
    buildUtilSheetRangeLabel(fromValue = '', toValue = '') {
      return `${fromValue} ~ ${toValue}`;
    },
    buildUtilGasAnalysisMetricMap(monthKeys = []) {
      return new Map((Array.isArray(monthKeys) ? monthKeys : []).map((monthKey) => [monthKey, context.__TEST_GAS_METRIC_MAP__.get(monthKey) || {}]));
    },
    shiftUtilSheetMonthKey: shiftMonthKey,
    buildUtilElectricAnalysisLineRatioSeries: electricModelRegistry.buildUtilElectricAnalysisLineRatioSeries,
    getUtilGasAnalysisChartUnitLabel(chartKey = '') {
      if (chartKey === 'lpgUsage') return 'kg';
      if (chartKey === 'lngUsage') return 'Nm3';
      if (chartKey === 'gasCost') return 'KRW';
      if (chartKey === 'production') return 'kg';
      return '';
    },
    getUtilGasAnalysisChartDecimals(chartKey = '') {
      return chartKey === 'gasCost' ? 0 : 1;
    },
    isUtilGasAnalysisFuelInactive() {
      return false;
    },
    buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
      return `${compareLabel}:${monthKey}:${deltaText}`;
    },
    formatUtilSheetQuantity(value, unit, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value).toFixed(1)} ${unit}` : fallback;
    },
    formatUtilSheetSignedQuantity(value, unit, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)} ${unit}` : fallback;
    },
    formatUtilSheetCost(value, fallback = '-') {
      return Number.isFinite(Number(value)) ? `${Math.round(Number(value)).toLocaleString('ko-KR')} KRW` : fallback;
    },
    formatUtilSheetSignedCost(value, fallback = '-') {
      return Number.isFinite(Number(value))
        ? `${Number(value) >= 0 ? '+' : ''}${Math.round(Number(value)).toLocaleString('ko-KR')} KRW`
        : fallback;
    },
    buildUtilGasAnalysisCostModeText() {
      return 'cost-mode';
    },
    buildUtilGasAnalysisCombinedChart(charts = [], rangeLabel = '') {
      return {
        key: 'combined',
        title: 'Gas Combined',
        periodLabel: rangeLabel,
        controlItems: charts,
        chartDataList: charts,
        series: []
      };
    },
    buildUtilGasAnalysisRangeTables(rangeKeys = [], ratioUsageMap = new Map(), productionMap = new Map()) {
      return [{
        key: 'lpg',
        title: 'LPG Ratio',
        tone: 'gas',
        months: rangeKeys,
        ratioUsageMap,
        productionMap
      }];
    },
    buildUtilGasAnalysisRatioCombinedChartModel(ratioTables = [], rangeLabel = '', options = {}) {
      return {
        key: 'ratio-combined',
        title: 'Gas Ratio',
        rangeLabel,
        controlItems: ratioTables.map((table) => ({ key: `ratio-${table.key}`, title: table.title })),
        series: options.lineRatioSeries || []
      };
    }
  });

  const electricModel = electricModelRegistry.buildUtilElectricAnalysisModel('2026-03', 'month', 'team-a');
  const gasModel = gasModelRegistry.buildUtilGasAnalysisModel('2026-03', 'month');

  assert.equal(electricModel.hasData, true);
  assert.equal(electricModel.teamOption.key, 'team-a');
  assert.ok(electricModel.combinedChart);
  assert.ok(Array.isArray(electricModel.charts));
  assert.ok(Array.isArray(electricModel.charts[0]?.summaryItems));
  assert.ok(electricModel.charts[0].summaryItems.some((item) => item.key === 'electricIntensity'));
  const electricLineControlItems = (electricModel.charts[0].summaryControlItems || [])
    .filter((item) => String(item?.key || '').startsWith(lineRatioPrefix));
  assert.equal(
    electricLineControlItems.map((item) => String(item.title)).join(','),
    'line1,line2',
    'team-specific electric analysis must expose production line summary controls'
  );
  assert.equal(electricLineControlItems[0].points.find((point) => point.monthKey === '2026-03').amountValue, 80);
  assert.equal(electricLineControlItems[1].points.find((point) => point.monthKey === '2026-03').amountValue, 40);
  assert.ok(
    electricModel.charts[0].series.some((series) => series.seriesKey === `${lineRatioPrefix}A::line1`),
    'team-specific electric intensity chart must include production line series'
  );
  assert.equal(config.UtilSheetAnalysisState.electric.teamKey, 'team-a');
  assert.equal(config.UtilSheetAnalysisState.electric.from, '2026-01');
  assert.equal(config.UtilSheetAnalysisState.electric.to, '2026-03');

  assert.equal(gasModel.hasData, true);
  assert.equal(gasModel.categoryOption.key, 'plantA');
  assert.ok(gasModel.combinedChart);
  assert.ok(gasModel.ratioCombinedChart);
  assert.ok(Array.isArray(gasModel.summaryItems));
  assert.equal(config.UtilSheetAnalysisState.gas.categoryKey, 'plantA');
  assert.equal(config.UtilSheetAnalysisState.gas.from, '2026-01');
  assert.equal(config.UtilSheetAnalysisState.gas.to, '2026-03');
});

test('kpi html loads report sheet analysis model scripts before analysis render and sheet.js', () => {
  const modalRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/render.js?v=054');
  const rangeRatioIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/range-ratio.js?v=053');
  const electricChartModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/electric/chart-model.js?v=053');
  const electricModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/electric/model.js?v=053');
  const gasModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/gas/model.js?v=053');
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('KPI.util.report.sheet.js?v=054');

  assert.ok(modalRenderIndex >= 0, 'report sheet modal render loader is missing');
  assert.ok(rangeRatioIndex > modalRenderIndex, 'analysis range-ratio must load after report sheet modal render');
  assert.ok(electricChartModelIndex > rangeRatioIndex, 'electric chart model must load after analysis range-ratio');
  assert.ok(electricModelIndex > electricChartModelIndex, 'electric analysis model must load after electric chart model');
  assert.ok(gasModelIndex > electricModelIndex, 'gas analysis model must load after electric analysis model');
  assert.ok(analysisRenderIndex > gasModelIndex, 'analysis render must load after analysis model registries');
  assert.ok(sheetIndex > analysisRenderIndex, 'report sheet must load after analysis render');
});
