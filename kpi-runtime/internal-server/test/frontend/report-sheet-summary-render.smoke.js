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
const reportSheetSummaryRenderSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/summary/render.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createSummaryRenderContext() {
  const context = {
    console,
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
  vm.runInContext(reportSheetOptionsSource, context, {
    filename: 'KPI.util.report.sheet.options.js',
  });
  vm.runInContext(reportSheetControlsSource, context, {
    filename: 'KPI.util.report.sheet.controls.js',
  });
  vm.runInContext(reportSheetSummaryRenderSource, context, {
    filename: 'KPI.util.report.sheet.summary.render.js',
  });
  return context;
}

test('report sheet summary render registry builds badges, stats, compare, matrix, recent, and memo blocks', () => {
  const context = createSummaryRenderContext();
  const controls = context.KPIUtilReportSheetControls;
  const summaryRender = context.KPIUtilReportSheetSummaryRender;

  controls.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    normalizeUtilGasMeterProductionKey(value) {
      return value === 'plantB' ? 'plantB' : 'combined';
    },
    getUtilGasMeterProductionOptions() {
      return [
        { key: 'plantB', label: 'plantB' },
        { key: 'combined', label: 'combined' },
      ];
    },
  });

  summaryRender.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    normalizeUtilSheetCompareKey(compareKey) {
      return compareKey === 'year' ? 'year' : 'month';
    },
    buildUtilSheetCompareSub(compareMeta, formattedDelta) {
      return formattedDelta === '-'
        ? `${compareMeta.label} ${compareMeta.referenceLabel}`
        : `${compareMeta.label} ${formattedDelta} ??${compareMeta.referenceLabel}`;
    },
    getUtilSheetCompareLabel(compareKey) {
      return compareKey === 'year' ? 'year-compare' : 'month-compare';
    },
    shiftUtilSheetMonthKey(monthKey, offset) {
      return `${monthKey}:${offset}`;
    },
    getUtilGasMeterProductionOption(productionKey) {
      return {
        key: productionKey || 'combined',
        label: productionKey === 'plantB' ? 'plantB' : 'combined',
        icon: 'fa-industry',
        teamNames: productionKey === 'plantB' ? ['plantB'] : ['plantA', 'plantB'],
      };
    },
    getUtilGasMeterScopedUsageMetric(monthKey, fuelKey, productionOption) {
      return monthKey === '2026-04' && fuelKey === 'lpg'
        ? 21
        : monthKey === '2026-04' && fuelKey === 'lng'
          ? 99
          : productionOption?.key === 'plantB'
            ? 11
            : 88;
    },
    getUtilGasMeterScopedCost(summary, table, fuelKey) {
      void summary;
      void table;
      return fuelKey === 'lpg' ? 4100 : 8300;
    },
    getUtilGasProductionMetric(monthKey) {
      return monthKey === '2026-04' ? 940 : 905;
    },
    getUtilGasMeterColumn(table, fieldId) {
      return table?.[fieldId] || null;
    },
    buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
      return `${compareLabel}:${monthKey}:${deltaText}`;
    },
    buildUtilElectricMeterTeamDatasetResult(activeMonthKey, teamKey) {
      return {
        option: { key: teamKey, label: teamKey === 'plantB' ? 'plantB-team' : 'combined' },
        latestUsage: 880,
        latestCost: 12000,
        latestProduction: 950,
        deltaUsageVsPrevMonth: 30,
        deltaUsageVsPrevYear: 55,
        deltaCostVsPrevMonth: 700,
        deltaCostVsPrevYear: -900,
        deltaProductionVsPrevMonth: 25,
        deltaProductionVsPrevYear: 40,
        activeMonthKey,
      };
    },
    getUtilElectricMeterTeamOption(teamKey) {
      return { key: teamKey || 'combined', label: teamKey === 'plantB' ? 'plantB-team' : 'combined' };
    },
    buildUtilSheetAnalysisSummaryGridHtml(summaryItems) {
      return `<div class="summary-grid" data-count="${Array.isArray(summaryItems) ? summaryItems.length : 0}"></div>`;
    },
    calculateUtilSheetPercentDelta(currentValue, referenceValue) {
      if (!Number.isFinite(currentValue) || !Number.isFinite(referenceValue) || referenceValue === 0) return null;
      return ((currentValue - referenceValue) / referenceValue) * 100;
    },
    formatUtilSheetSignedPercent(value, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
    },
    getGasAnalysisProductionStartDay() {
      return 1;
    },
    formatUtilReportMonthShort(monthKey) {
      return `SHORT:${String(monthKey || '')}`;
    },
    formatUtilReportMonthLong(monthKey) {
      return `LONG:${String(monthKey || '')}`;
    },
    formatUtilSheetQuantity(value, unit, fallback = '-') {
      return Number.isFinite(value) ? `${value}${unit}` : fallback;
    },
    formatUtilSheetSignedQuantity(value, unit, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      return `${value >= 0 ? '+' : ''}${value}${unit}`;
    },
    formatUtilSheetInteger(value, fallback = '-') {
      return Number.isFinite(value) ? String(value) : fallback;
    },
    formatUtilSheetCost(value, fallback = '-') {
      return Number.isFinite(value) ? `??{value}` : fallback;
    },
    formatUtilSheetSignedCost(value, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      return `${value >= 0 ? '+' : ''}${value}`;
    },
    formatUtilSheetUnit(value, fallback = '-') {
      return Number.isFinite(value) ? `${value}` : fallback;
    },
    formatUtilSheetSignedUnit(value, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      return `${value >= 0 ? '+' : ''}${value}`;
    },
  });

  const datasetResult = {
    activeMonthKey: '2026-04',
    bounds: { to: '2026-04' },
    spec: {
      key: 'gas',
      label: 'gas',
      usageKey: 'usage',
      usageUnit: 'Nm3',
      costKey: 'cost',
      unitKey: 'unit',
    },
    latestUsage: 120,
    latestCost: 11000,
    latestProduction: 940,
    latestUnit: 9.7,
    latestMonthLabel: '2026-04',
    latestRow: { year: 2026, month: 4, monthKey: '2026-04' },
    currentYearSummary: { cost: 31040, unit: 9.8 },
    prevMonthRow: { monthKey: '2026-03' },
    prevYearRow: { monthKey: '2025-04' },
    deltaUsageVsPrevMonth: 5,
    deltaUsageVsPrevYear: 12,
    deltaCostVsPrevMonth: 12000,
    deltaCostVsPrevYear: -7000,
    deltaProductionVsPrevMonth: 20,
    deltaProductionVsPrevYear: 35,
    deltaUnitVsPrevMonth: 1.7,
    deltaUnitVsPrevYear: -0.4,
    matrixMonths: ['01', '02'],
    matrixRows: [
      {
        year: 2025,
        cells: [{ unit: 10.2 }, { unit: null }],
      },
      {
        year: 2026,
        cells: [{ unit: 9.7 }, { unit: 9.4 }],
      },
    ],
    rows: [
      { monthKey: '2026-02', usage: 108, cost: 9200, production: 900, unit: 10.2 },
      { monthKey: '2026-03', usage: 115, cost: 9800, production: 920, unit: 9.9 },
      { monthKey: '2026-04', usage: 120, cost: 11000, production: 940, unit: 9.7 },
    ],
    recentRows: [
      { monthKey: '2026-03', usage: 115, cost: 9800, production: 920, unit: 9.9 },
      { monthKey: '2026-04', usage: 120, cost: 11000, production: 940, unit: 9.7 },
    ],
  };

  const badgesHtml = summaryRender.buildUtilSheetBadgesHtml('meter', datasetResult, 'month');
  const statsHtml = summaryRender.buildUtilSheetStatsHtml('meter', datasetResult, 'month', {
    ready: true,
    selectedTable: {
      gas_field_02: { usage: 15 },
      gas_field_01: { usage: 105 },
    },
    referenceTable: {
      monthKey: '2026-03',
      gas_field_02: { usage: 14 },
      gas_field_01: { usage: 101 },
    },
    billingSummary: {
      lng: { totalUsage: 105 },
    },
  });
  const compareCardsHtml = summaryRender.buildUtilSheetCompareCardsHtml(datasetResult);
  const matrixHtml = summaryRender.buildUtilSheetMatrixHtml(datasetResult);
  const recentTableHtml = summaryRender.buildUtilSheetRecentTableHtml(datasetResult);
  const memoHtml = summaryRender.buildUtilSheetMemoSectionHtml(['Electric usage stayed within the demo baseline.', 'LNG usage was reviewed against the synthetic meter table.']);
  const memoItems = summaryRender.resolveUtilSheetMemoItems('meter', 'gas', datasetResult, 'month', {
    ready: true,
    selectedTable: {
      gas_field_02: { correctedUsage: 15, usage: 15 },
      gas_field_03: { correctedUsage: 7 },
      gas_field_04: { correctedUsage: 8 },
      gas_field_06: { correctedUsage: 4 },
      gas_field_01: { usage: 105 },
    },
    referenceTable: {
      monthKey: '2026-03',
      gas_field_02: { correctedUsage: 14, usage: 14 },
      gas_field_03: { correctedUsage: 6 },
      gas_field_04: { correctedUsage: 7 },
      gas_field_06: { correctedUsage: 5 },
      gas_field_01: { usage: 101 },
    },
    billingSummary: {
      lng: { totalUsage: 105 },
    },
  });
  const gasSummaryItems = summaryRender.buildUtilGasMeterSummaryItems(datasetResult, 'month', {
    selectedTable: {
      gas_field_02: { usage: 15 },
      gas_field_01: { usage: 105 },
    },
    referenceTable: {
      gas_field_02: { usage: 13 },
      gas_field_01: { usage: 100 },
    },
    billingSummary: {
      lng: { totalUsage: 105 },
    },
  }, 'combined');
  const electricSummaryItems = summaryRender.buildUtilElectricMeterSummaryItems(datasetResult, 'month', null);
  const gasSummaryBlockHtml = summaryRender.buildUtilGasMeterSummaryBlockHtml(gasSummaryItems, 'combined');
  const electricSummaryBlockHtml = summaryRender.buildUtilElectricMeterSummaryBlockHtml(electricSummaryItems, 'plantB');

  assert.ok(badgesHtml.includes('SHORT:2026-04'));
  assert.ok(badgesHtml.includes('util-sheet-badge'));
  assert.ok(statsHtml.includes('util-sheet-stat-split-list'));
  assert.ok(statsHtml.includes('105Nm3'));
  assert.ok(compareCardsHtml.includes('LONG:2025-04'));
  assert.ok(compareCardsHtml.includes('LONG:2025-04'));
  assert.ok(matrixHtml.includes('util-sheet-table is-matrix'));
  assert.ok(matrixHtml.includes('<th>01'));
  assert.ok(recentTableHtml.includes('SHORT:2026-04'));
  assert.ok(recentTableHtml.includes('SHORT:2026-04'));
  assert.ok(memoHtml.includes('LNG'));
  assert.ok(memoHtml.includes('LNG'));
  assert.equal(memoItems.length, 4);
  assert.ok(typeof memoItems[0] === 'string' && memoItems[0].length > 0);
  assert.equal(gasSummaryItems.length, 3);
  assert.ok(gasSummaryItems[0].subText.includes('2026-04:+5Nm3'));
  assert.equal(electricSummaryItems.length, 3);
  assert.ok(electricSummaryItems[1].subText.includes('2026-04:+700'));
  assert.ok(gasSummaryBlockHtml.includes('util-sheet-meter-production-select'));
  assert.ok(gasSummaryBlockHtml.includes('summary-grid'));
  assert.ok(electricSummaryBlockHtml.includes('util-sheet-meter-electric-team-select'));
});

test('kpi html loads report sheet summary render between analysis render and sheet.js', () => {
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const summaryRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/summary/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('KPI.util.report.sheet.js?v=054');

  assert.ok(analysisRenderIndex >= 0, 'report sheet analysis render loader is missing');
  assert.ok(summaryRenderIndex > analysisRenderIndex, 'report sheet summary render must load after report sheet analysis render');
  assert.ok(sheetIndex > summaryRenderIndex, 'report sheet must load after report sheet summary render');
});
