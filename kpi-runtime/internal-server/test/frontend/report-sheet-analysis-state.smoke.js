import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetAnalysisStateSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/state.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createReportSheetAnalysisStateContext() {
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
  vm.runInContext(reportSheetAnalysisStateSource, context, {
    filename: 'KPI.util.report.sheet.analysis.state.js',
  });
  return context;
}

test('report sheet analysis state registry normalizes analysis range and shared state helpers', () => {
  const context = createReportSheetAnalysisStateContext();
  const registry = context.KPIUtilReportSheetAnalysisState;
  const config = context.KPIUtilReportSheetConfig;

  assert.ok(registry, 'report sheet analysis state registry is missing');

  registry.setRuntimeAdapters({
    compareUtilSheetMonthKeys(left, right) {
      return String(left || '').localeCompare(String(right || ''), 'ko');
    },
    formatUtilReportMonthShort(monthKey) {
      return `SHORT:${String(monthKey || '')}`;
    },
    resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
      assert.equal(sheetType, 'analysis');
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    getUtilSheetCurrentAnalysisDatasetKey() {
      return 'electric';
    },
  });

  const normalizedRange = registry.normalizeUtilSheetAnalysisRange(
    [
      { value: '2026-03' },
      { value: '2026-01' },
      { value: '2026-02' },
    ],
    '2026-03',
    '2026-01',
    '2026-02'
  );
  assert.equal(normalizedRange.from, '2026-01');
  assert.equal(normalizedRange.to, '2026-01');
  assert.equal(JSON.stringify(normalizedRange.monthKeys), JSON.stringify(['2026-01', '2026-02', '2026-03']));

  assert.equal(
    JSON.stringify(registry.buildUtilSheetRangeMonthKeys(
      [
        { value: '2026-01' },
        { value: '2026-02' },
        { value: '2026-03' },
      ],
      '2026-02',
      '2026-03'
    )),
    JSON.stringify(['2026-02', '2026-03'])
  );
  assert.equal(registry.buildUtilSheetRangeLabel('2026-01', '2026-03'), 'SHORT:2026-01 ~ SHORT:2026-03');

  registry.setUtilSheetAnalysisRangeState('gas', '2026-02', '2026-03');
  assert.equal(config.UtilSheetAnalysisState.gas.from, '2026-02');
  assert.equal(config.UtilSheetAnalysisState.gas.to, '2026-03');

  registry.setUtilSheetAnalysisToMonth('gas', '2026-04');
  assert.equal(config.UtilSheetAnalysisState.gas.to, '2026-04');

  registry.setUtilGasAnalysisFuelInactive('lpg', true);
  assert.equal(registry.isUtilGasAnalysisFuelInactive('lpg'), true);

  assert.equal(registry.getUtilSheetActiveAnalysisDatasetKey({ dataset: { datasetKey: 'gas' } }), 'gas');
  assert.equal(registry.getUtilSheetActiveAnalysisDatasetKey({ dataset: {} }), 'electric');

  assert.equal(registry.getUtilSheetAnalysisShowLabels('gas', '', true), true);
  registry.setUtilGasAnalysisRatioShowLabels(true);
  assert.equal(registry.getUtilGasAnalysisRatioShowLabels(), true);
});

test('kpi html loads report sheet analysis state before analysis models and sheet.js', () => {
  const modalRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/render.js?v=054');
  const analysisStateIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/state.js?v=053');
  const electricChartModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/electric/chart-model.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(modalRenderIndex >= 0, 'report sheet modal render loader is missing');
  assert.ok(analysisStateIndex > modalRenderIndex, 'report sheet analysis state must load after modal render');
  assert.ok(electricChartModelIndex > analysisStateIndex, 'report sheet analysis state must load before analysis models');
  assert.ok(sheetIndex > electricChartModelIndex, 'report sheet analysis state must load before sheet.js');
});
