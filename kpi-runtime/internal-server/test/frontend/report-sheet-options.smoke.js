import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetOptionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/options.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createReportSheetOptionsContext() {
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
  return context;
}

test('report sheet options register team/category registries and lookup helpers', () => {
  const context = createReportSheetOptionsContext();
  const options = context.KPIUtilReportSheetOptions;

  assert.ok(options, 'report sheet options registry is missing');
  assert.equal(options.UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS.length, 5);
  assert.equal(options.UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS.length, 5);
  assert.equal(options.normalizeUtilElectricMeterTeamKey('team_02'), 'team_02');
  assert.equal(options.normalizeUtilElectricMeterTeamKey('x'), 'combined');
  assert.equal(options.getUtilGasAnalysisCategoryOption('team_03')?.key, 'team_03');
  assert.equal(options.normalizeUtilElectricMeterViewKey('TEAM'), 'team');
});

test('kpi html loads report sheet options before sheet.js', () => {
  const optionsIndex = kpiHtml.indexOf('runtime/util/report/sheet/options.js?v=053');
  const billingIndex = kpiHtml.indexOf('runtime/util/report/sheet/billing.js?v=053');

  assert.ok(optionsIndex >= 0, 'report sheet options loader is missing');
  assert.ok(billingIndex > optionsIndex, 'report sheet options must load before report sheet billing');
});
