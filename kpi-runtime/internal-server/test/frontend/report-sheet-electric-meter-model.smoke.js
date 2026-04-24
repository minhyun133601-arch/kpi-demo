import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetOptionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/options.js', import.meta.url),
  'utf8'
);
const electricMeterModelSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/electric/meter-model.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function shiftMonthKey(monthKey = '', offset = 0) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
  if (!match) return '';
  const yearValue = Number(match[1]);
  const monthValue = Number(match[2]) - 1;
  const shifted = new Date(Date.UTC(yearValue, monthValue + Number(offset || 0), 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function createElectricMeterModelContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    Set,
    Map,
    Intl
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js'
  });
  vm.runInContext(reportSheetOptionsSource, context, {
    filename: 'KPI.util.report.sheet.options.js'
  });
  vm.runInContext(electricMeterModelSource, context, {
    filename: 'KPI.util.report.sheet.electric.meter-model.js'
  });
  return context;
}

test('report sheet electric meter model registry builds electric comparison model and dataset result', () => {
  const context = createElectricMeterModelContext();
  const registry = context.KPIUtilReportSheetElectricMeterModel;

  assert.ok(registry, 'report sheet electric meter model registry is missing');

  registry.setRuntimeAdapters({
    getUtilElectricMeteringStore() {
      return {
        equipmentItems: [
          { id: 'field_24', label: '전력총량', factor: '1' },
          { id: 'field_01', label: 'Line Alpha', factor: '1' },
          { id: 'field_02', label: 'Line Gamma', factor: '1' },
          { id: 'field_03', label: 'Line Delta', factor: '1' },
          { id: 'field_17', label: 'Admin Area', factor: '1' }
        ],
        teamAssignments: {
          team_01_02: ['field_01'],
          team_02: ['field_02'],
          team_03: ['field_03'],
          team_04: ['field_17']
        },
        equipmentEntries: {
          '2026-02-01': {
            values: {
              field_24: '100',
              field_01: '10',
              field_02: '20',
              field_03: '30',
              field_17: '5'
            }
          },
          '2026-03-01': {
            values: {
              field_24: '120',
              field_01: '15',
              field_02: '24',
              field_03: '33',
              field_17: '7'
            }
          },
          '2026-04-01': {
            values: {
              field_24: '150',
              field_01: '21',
              field_02: '29',
              field_03: '39',
              field_17: '9'
            }
          }
        }
      };
    },
    hasUtilElectricMeteringStore() {
      return true;
    },
    getUtilElectricUtilitySnapshot() {
      return {
        teams: {
          team_01_02: {
            '2026-02': { usage: 70, cost: 700 },
            '2026-03': { usage: 80, cost: 800 }
          },
          team_02: {
            '2026-02': { usage: 60, cost: 600 },
            '2026-03': { usage: 70, cost: 700 }
          },
          team_03: {
            '2026-02': { usage: 50, cost: 500 },
            '2026-03': { usage: 60, cost: 600 }
          },
          team_04: {
            '2026-02': { usage: 10, cost: 100 },
            '2026-03': { usage: 12, cost: 120 }
          }
        }
      };
    },
    parseUtilGasMeterNumber(value) {
      return Number(value);
    },
    normalizeUtilGasMeterDate(value) {
      return String(value || '').trim();
    },
    isUtilSheetPlainObject(value) {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    },
    compareUtilSheetMonthKeys(left, right) {
      return String(left || '').localeCompare(String(right || ''), 'ko');
    },
    shiftUtilSheetMonthKey(monthKey, offset) {
      return shiftMonthKey(monthKey, offset);
    },
    normalizeUtilSheetCompareKey(compareKey) {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    buildUtilSheetMonthBounds() {
      return {
        from: '2026-02',
        to: '2026-03'
      };
    },
    buildUtilReportMonthlyRows() {
      return { rows: [] };
    },
    getUtilGasProductionMetric(monthKey) {
      if (monthKey === '2026-03') return 450;
      if (monthKey === '2026-02') return 400;
      return NaN;
    }
  });

  const comparisonModel = registry.buildUtilElectricMeterComparisonModel('2026-03', 'month', 'combined');

  assert.equal(comparisonModel.ready, true);
  assert.equal(comparisonModel.compareKey, 'month');
  assert.equal(comparisonModel.selectedTable.optionKey, 'combined');
  assert.ok(comparisonModel.selectedTable.columns.some((column) => column.id === 'power_total'));
  assert.ok(comparisonModel.selectedTable.columns.some((column) => column.id === 'combined_total'));
  assert.equal(
    comparisonModel.selectedTable.columns.find((column) => column.id === 'combined_total')?.usage,
    19
  );
  assert.equal(
    comparisonModel.referenceTable.columns.find((column) => column.id === 'combined_total')?.usage,
    14
  );

  const datasetResult = registry.buildUtilElectricMeterTeamDatasetResult('2026-03', 'combined');

  assert.equal(datasetResult.option.key, 'combined');
  assert.equal(datasetResult.latestRow?.monthKey, '2026-03');
  assert.equal(datasetResult.latestUsage, 222);
  assert.equal(datasetResult.latestCost, 2220);
  assert.equal(datasetResult.latestProduction, 450);
  assert.equal(datasetResult.prevMonthRow?.monthKey, '2026-02');
  assert.equal(datasetResult.deltaUsageVsPrevMonth, 32);
  assert.equal(datasetResult.deltaCostVsPrevMonth, 320);
  assert.equal(datasetResult.deltaProductionVsPrevMonth, 50);
});

test('kpi html loads electric meter model after electric runtime sync and before electric comparison summary', () => {
  const tableRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/table-render.js?v=053');
  const runtimeSyncIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/runtime-sync.js?v=053');
  const meterModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/meter-model.js?v=053');
  const comparisonSummaryIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/comparison-summary.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(tableRenderIndex >= 0, 'report sheet electric table render loader is missing');
  assert.ok(runtimeSyncIndex > tableRenderIndex, 'report sheet electric runtime sync must load after electric table render');
  assert.ok(meterModelIndex > runtimeSyncIndex, 'report sheet electric meter model must load after electric runtime sync');
  assert.ok(comparisonSummaryIndex > meterModelIndex, 'report sheet electric comparison summary must load after electric meter model');
  assert.ok(sheetIndex > comparisonSummaryIndex, 'report sheet electric meter model must load before sheet.js');
});
