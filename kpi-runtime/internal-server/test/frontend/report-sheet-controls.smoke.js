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
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createReportSheetControlsContext() {
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
  return context;
}

test('report sheet controls registry builds select, toggle, and month option html', () => {
  const context = createReportSheetControlsContext();
  const controls = context.KPIUtilReportSheetControls;

  assert.ok(controls, 'report sheet controls registry is missing');

  controls.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    normalizeUtilGasMeterProductionKey(value) {
      return value === 'plantB' ? 'plantB' : 'combined';
    },
    getUtilGasMeterProductionOptions() {
      return [
        { key: 'plantB', label: 'PlantB' },
        { key: 'combined', label: 'Combined' },
      ];
    },
  });

  const gasSelectHtml = controls.buildUtilGasMeterProductionSelectHtml('plantB');
  const electricSelectHtml = controls.buildUtilElectricMeterTeamSelectHtml('team_02');
  const analysisTeamHtml = controls.buildUtilElectricAnalysisTeamSelectHtml('team_03');
  const gasCategoryHtml = controls.buildUtilGasAnalysisCategorySelectHtml('plantA');
  const viewToggleHtml = controls.buildUtilElectricMeterViewToggleHtml('team');
  const monthOptionHtml = controls.buildUtilSheetMonthOptionHtml([
    { value: '2026-03', label: '2026-03' },
    { value: '2026-04', label: '2026-04' },
  ], '2026-04');

  assert.ok(gasSelectHtml.includes('util-sheet-meter-production-select'));
  assert.ok(gasSelectHtml.includes('PlantB'));
  assert.ok(electricSelectHtml.includes('util-sheet-meter-electric-team-select'));
  assert.ok(analysisTeamHtml.includes('util-sheet-analysis-electric-team-select'));
  assert.ok(gasCategoryHtml.includes('util-sheet-analysis-gas-category-select'));
  assert.ok(viewToggleHtml.includes('data-view-key="team"'));
  assert.ok(viewToggleHtml.includes('is-active'));
  assert.ok(monthOptionHtml.includes('value="2026-04" selected'));
});

test('kpi html loads report sheet controls after options and before billing', () => {
  const optionsIndex = kpiHtml.indexOf('runtime/util/report/sheet/options.js?v=053');
  const controlsIndex = kpiHtml.indexOf('runtime/util/report/sheet/controls.js?v=053');
  const billingIndex = kpiHtml.indexOf('runtime/util/report/sheet/billing.js?v=053');

  assert.ok(optionsIndex >= 0, 'report sheet options loader is missing');
  assert.ok(controlsIndex > optionsIndex, 'report sheet controls must load after report sheet options');
  assert.ok(billingIndex > controlsIndex, 'report sheet controls must load before report sheet billing');
});
