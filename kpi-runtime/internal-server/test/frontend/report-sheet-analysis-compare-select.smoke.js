import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetAnalysisCompareSelectSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/analysis/compare-select.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createCompareSelectContext() {
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
  vm.runInContext(reportSheetAnalysisCompareSelectSource, context, {
    filename: 'KPI.util.report.sheet.analysis.compare-select.js',
  });
  return context;
}

test('report sheet analysis compare/select registry resolves compare text and label-toggle context', () => {
  const context = createCompareSelectContext();
  const registry = context.KPIUtilReportSheetAnalysisCompareSelect;

  assert.ok(registry, 'report sheet analysis compare/select registry is missing');

  const inactiveFuels = { lng: false, lpg: false };
  registry.setRuntimeAdapters({
    formatUtilReportMonthShort(monthKey) {
      return `SHORT:${monthKey}`;
    },
    getUtilGasAnalysisCategoryOption(categoryKey) {
      if (String(categoryKey || '').trim() === 'with-lpg') {
        return { key: 'with-lpg', showLpgCard: true };
      }
      return { key: 'plantA', showLpgCard: false };
    },
    isUtilGasAnalysisFuelInactive(fuelKey) {
      return inactiveFuels[String(fuelKey || '').trim()] === true;
    },
    getUtilSheetActiveAnalysisDatasetKey(modal) {
      return String(modal?.dataset?.datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
  });

  assert.equal(
    registry.buildUtilGasAnalysisCostModeText('plantA'),
    '\uBE44\uC6A9 \uACC4\uC0B0 \u00B7 LNG \uBC18\uC601'
  );
  assert.equal(
    registry.buildUtilGasAnalysisCostModeText('with-lpg'),
    '\uBE44\uC6A9 \uACC4\uC0B0 \u00B7 LNG + LPG \uBC18\uC601'
  );

  inactiveFuels.lng = true;
  inactiveFuels.lpg = true;
  assert.equal(
    registry.buildUtilGasAnalysisCostModeText('with-lpg'),
    '\uBE44\uC6A9 \uACC4\uC0B0 \u00B7 \uBBF8\uBC18\uC601'
  );

  assert.equal(
    registry.buildUtilGasAnalysisCompareSub('\uC804\uC6D4\uB300\uBE44', '2026-03', '+1.0'),
    'SHORT:2026-03 \uC804\uC6D4\uB300\uBE44 +1.0'
  );
  assert.equal(
    registry.buildUtilGasAnalysisCompareSub('\uC804\uC6D4\uB300\uBE44', '2026-03', '-'),
    '\uC804\uC6D4\uB300\uBE44 \uBE44\uAD50\uAC12 \uC5C6\uC74C'
  );

  const intensityToggle = {};
  const intensityTarget = {
    closest(selector) {
      return selector === '[data-role="util-sheet-analysis-electric-intensity-label-toggle"]'
        ? intensityToggle
        : null;
    },
  };
  const intensityContext = registry.resolveUtilSheetAnalysisLabelToggleContext(
    intensityTarget,
    { dataset: { datasetKey: 'gas' } }
  );
  assert.equal(intensityContext?.datasetKey, 'electric');
  assert.equal(intensityContext?.chartKey, 'electricIntensity');
  assert.equal(intensityContext?.toggleEl, intensityToggle);

  const summaryCard = {
    querySelector(selector) {
      if (selector === '.util-sheet-analysis-summary-label') {
        return { textContent: '\uC0DD\uC0B0\uB7C9 \uB300\uBE44 \uC804\uAE30 \uC0AC\uC6A9\uB7C9' };
      }
      return null;
    },
  };
  const labelToggle = {
    closest(selector) {
      if (selector === '[data-analysis-chart-key]') return null;
      if (selector === '[data-role="util-sheet-analysis-summary-grid"] [data-tone]') return summaryCard;
      return null;
    },
  };
  const genericTarget = {
    closest(selector) {
      return selector === '[data-chart-label-toggle]' ? labelToggle : null;
    },
  };
  const genericContext = registry.resolveUtilSheetAnalysisLabelToggleContext(
    genericTarget,
    { dataset: { datasetKey: 'electric' } }
  );
  assert.equal(genericContext?.datasetKey, 'electric');
  assert.equal(genericContext?.chartKey, 'electricIntensity');
  assert.equal(genericContext?.toggleEl, labelToggle);
});

test('kpi html loads report sheet analysis compare/select between analysis state and analysis models', () => {
  const analysisStateIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/state.js?v=053');
  const compareSelectIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/compare-select.js?v=053');
  const electricChartModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/electric/chart-model.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(analysisStateIndex >= 0, 'report sheet analysis state loader is missing');
  assert.ok(compareSelectIndex > analysisStateIndex, 'report sheet analysis compare/select must load after analysis state');
  assert.ok(electricChartModelIndex > compareSelectIndex, 'report sheet analysis compare/select must load before analysis models');
  assert.ok(sheetIndex > electricChartModelIndex, 'report sheet analysis compare/select must load before sheet.js');
});
