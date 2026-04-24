import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const electricRuntimeSyncSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/electric/runtime-sync.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createElectricRuntimeSyncContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    Map,
    Set
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js'
  });
  vm.runInContext(electricRuntimeSyncSource, context, {
    filename: 'KPI.util.report.sheet.electric.runtime-sync.js'
  });
  return context;
}

test('report sheet electric runtime sync registry exposes store, snapshot, and sync helpers', async () => {
  const context = createElectricRuntimeSyncContext();
  const registry = context.KPIUtilReportSheetElectricRuntimeSync;

  assert.ok(registry, 'report sheet electric runtime sync registry is missing');

  let syncCallCount = 0;
  registry.setRuntimeAdapters({
    getUtilMeteringDataset(datasetKey) {
      if (datasetKey !== 'electric') return null;
      return { equipmentEntries: { '2026-04-01': { values: {} } } };
    },
    ensureUtilMeteringDataset(datasetKey, promiseKey) {
      assert.equal(datasetKey, 'electric');
      assert.equal(promiseKey, 'electricMeteringPromise');
      return Promise.resolve(true);
    },
    isUtilSheetPlainObject(value) {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    },
    syncUtilElectricDataFromMetering() {
      syncCallCount += 1;
      return true;
    }
  });

  context.KpiMeteringApp = {
    getElectricUtilityDatasetSnapshot() {
      return {
        teams: {
          combined: {
            '2026-03': { usage: 100, cost: 1000 }
          }
        }
      };
    }
  };

  assert.deepEqual(
    registry.getUtilElectricMeteringStore(),
    { equipmentEntries: { '2026-04-01': { values: {} } } }
  );
  assert.equal(registry.hasUtilElectricMeteringStore(), true);
  assert.equal(await registry.ensureUtilElectricMeteringStore(), true);
  assert.deepEqual(registry.getUtilElectricUtilitySnapshot(), {
    teams: {
      combined: {
        '2026-03': { usage: 100, cost: 1000 }
      }
    }
  });

  const firstSync = await registry.ensureUtilElectricReportDataSync();
  const secondSync = await registry.ensureUtilElectricReportDataSync();

  assert.equal(firstSync?.changed, true);
  assert.equal(secondSync?.changed, false);
  assert.equal(syncCallCount, 1);
});

test('kpi html loads electric runtime sync between electric table render and electric meter model', () => {
  const tableRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/table-render.js?v=053');
  const runtimeSyncIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/runtime-sync.js?v=053');
  const meterModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/meter-model.js?v=053');
  const comparisonSummaryIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/comparison-summary.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(tableRenderIndex >= 0, 'report sheet electric table render loader is missing');
  assert.ok(runtimeSyncIndex > tableRenderIndex, 'report sheet electric runtime sync must load after electric table render');
  assert.ok(meterModelIndex > runtimeSyncIndex, 'report sheet electric meter model must load after electric runtime sync');
  assert.ok(comparisonSummaryIndex > meterModelIndex, 'report sheet electric comparison summary must load after electric meter model');
  assert.ok(sheetIndex > comparisonSummaryIndex, 'report sheet electric runtime sync must load before sheet.js');
});
