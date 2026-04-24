import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetGasScopedMetricsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/gas/scoped-metrics.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createGasScopedMetricsContext() {
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
    parseUtilMonthValue(monthKey) {
      const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
      return match ? { year: Number(match[1]), month: Number(match[2]) } : null;
    },
    sumUtilReportMetric(entries, yearValue, monthValue, teamName, metricKey = 'usage') {
      return (Array.isArray(entries) ? entries : []).reduce((sum, entry) => {
        if (Number(entry?.year) !== Number(yearValue) || Number(entry?.month) !== Number(monthValue)) return sum;
        if (String(entry?.team || '').trim() !== String(teamName || '').trim()) return sum;
        const metricValue = Number(entry?.[metricKey]);
        return Number.isFinite(metricValue) ? sum + metricValue : sum;
      }, 0);
    }
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetGasScopedMetricsSource, context, {
    filename: 'KPI.util.report.sheet.gas.scoped-metrics.js'
  });
  return context;
}

test('report sheet gas scoped metrics registry exposes production options and metric map helpers', () => {
  const context = createGasScopedMetricsContext();
  const registry = context.KPIUtilReportSheetGasScopedMetrics;

  assert.ok(registry, 'report sheet gas scoped metrics registry is missing');

  const productionOptions = registry.getUtilGasMeterProductionOptions();
  const team0102Option = productionOptions.find(option => option.key === 'team_01_02');
  const team03Option = productionOptions.find(option => option.key === 'team_03');
  const combinedOption = productionOptions.find(option => option.key === 'combined');

  assert.ok(team0102Option, 'team_01_02 production option is missing');
  assert.ok(team03Option, 'team_03 production option is missing');
  assert.ok(combinedOption, 'combined production option is missing');

  const gasEntries = [
    { year: 2026, month: 1, team: team0102Option.usageTeams.lng[0], usage: 110 },
    { year: 2026, month: 1, team: team03Option.usageTeams.lng[0], usage: 90 },
    { year: 2026, month: 1, team: team0102Option.usageTeams.lpg[0], usage: 40 }
  ];
  const dailyProductionMap = new Map([
    [`2026-1-${team0102Option.teamNames[0]}`, { value: 70 }],
    [`2026-1-${team03Option.teamNames[0]}`, { value: 55 }]
  ]);

  registry.setRuntimeAdapters({
    getUtilGasBillingScopeKeys() {
      return { plantB: 'plantB' };
    },
    getUtilGasAnalysisCategoryOption() {
      return {
        key: 'plantA',
        usageTeams: {
          lpg: [...team0102Option.usageTeams.lpg],
          lng: [...combinedOption.usageTeams.lng]
        },
        productionTeamNames: [...combinedOption.teamNames],
        ratioProductionTeamNames: {
          lpg: [...team0102Option.teamNames],
          lng: [...team03Option.teamNames]
        },
        includePlantBLngCost: true,
        includePlantALngCost: true,
        showLpgCard: true,
        meterScopeKey: 'combined'
      };
    },
    isUtilGasAnalysisFuelInactive() {
      return false;
    },
    getUtilGasBillingScopeFields() {
      return { billing_amount: '12345' };
    },
    parseUtilGasMeterNumber(value) {
      return Number(value);
    },
    buildUtilGasMeterFieldDefinitions() {
      return [{ id: 'gas_field_03' }, { id: 'gas_field_04' }, { id: 'gas_field_06' }];
    },
    buildUtilGasMeterTimelineMap() {
      return new Map();
    },
    buildUtilGasMeterMonthTable() {
      return {
        columns: [
          { id: 'gas_field_03', correctedUsage: 10 },
          { id: 'gas_field_04', correctedUsage: 20 },
          { id: 'gas_field_06', correctedUsage: 30 }
        ]
      };
    },
    buildUtilGasBillingSummaryModel() {
      return {
        lng: { totalAmount: 60000 },
        lpg: { totalAmount: 20000 }
      };
    },
    sumUtilGasMeterColumnValues(columns, valueKey, fieldIds) {
      return (Array.isArray(columns) ? columns : []).reduce((sum, column) => {
        if (!Array.isArray(fieldIds) || !fieldIds.includes(column?.id)) return sum;
        const value = Number(column?.[valueKey]);
        return Number.isFinite(value) ? sum + value : sum;
      }, 0);
    },
    parseUtilMonthValue: context.parseUtilMonthValue,
    sumUtilReportMetric: context.sumUtilReportMetric,
    getUtilGasEntries() {
      return gasEntries;
    },
    getUtilDailyProductionValue(teamName, yearValue, monthValue) {
      return dailyProductionMap.get(`${yearValue}-${monthValue}-${String(teamName || '').trim()}`) || null;
    }
  });

  assert.equal(productionOptions.length, 3);
  assert.equal(registry.normalizeUtilGasMeterProductionKey('team_01_02'), 'team_01_02');
  assert.equal(registry.normalizeUtilGasMeterProductionKey('invalid'), 'combined');
  assert.equal(registry.getUtilGasAnalysisProductionStartDay(), 1);
  assert.equal(registry.getUtilGasMeterScopedUsageMetric('2026-01', 'lng', 'combined'), 200);
  assert.equal(
    registry.getUtilGasMeterScopedCost(
      { lng: { totalAmount: 60000 } },
      {
        columns: [
          { id: 'gas_field_03', correctedUsage: 10 },
          { id: 'gas_field_04', correctedUsage: 20 },
          { id: 'gas_field_06', correctedUsage: 30 }
        ]
      },
      'lng',
      'team_01_02'
    ),
    30000
  );
  assert.equal(registry.getUtilGasProductionMetric('2026-01', combinedOption.teamNames), 125);
  assert.equal(registry.getUtilGasAnalysisPlantBBillingAmount('2026-01'), 12345);

  const metricMap = registry.buildUtilGasAnalysisMetricMap(['2026-01'], { key: 'plantA' });
  const metric = metricMap.get('2026-01');

  assert.equal(metric.lngUsage, 200);
  assert.equal(metric.lpgUsage, 40);
  assert.equal(metric.production, 125);
  assert.equal(metric.lngCost, 72345);
  assert.equal(metric.lpgCost, 20000);
  assert.equal(metric.gasCost, 92345);
});

test('kpi html loads gas scoped metrics after gas comparison summary and before panel runtime', () => {
  const billingIndex = kpiHtml.indexOf('runtime/util/report/sheet/billing.js?v=053');
  const comparisonIndex = kpiHtml.indexOf('runtime/util/report/sheet/gas/comparison-summary.js?v=053');
  const scopedMetricsIndex = kpiHtml.indexOf('runtime/util/report/sheet/gas/scoped-metrics.js?v=053');
  const panelRuntimeIndex = kpiHtml.indexOf('runtime/util/report/sheet/panel/runtime.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(billingIndex >= 0, 'report sheet billing loader is missing');
  assert.ok(comparisonIndex > billingIndex, 'gas comparison summary must load after billing');
  assert.ok(scopedMetricsIndex > comparisonIndex, 'gas scoped metrics must load after gas comparison summary');
  assert.ok(panelRuntimeIndex > scopedMetricsIndex, 'panel runtime must load after gas scoped metrics');
  assert.ok(sheetIndex > panelRuntimeIndex, 'gas scoped metrics must load before sheet.js');
});
