import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetModalRenderSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/modal/render.js', import.meta.url),
  'utf8'
);
const reportSheetGasRuntimeSyncSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/gas/runtime-sync.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    add: (...names) => names.forEach((name) => classes.add(name)),
    remove: (...names) => names.forEach((name) => classes.delete(name)),
    contains: (name) => classes.has(name),
    toggle: (name, force) => {
      if (force === true) {
        classes.add(name);
        return true;
      }
      if (force === false) {
        classes.delete(name);
        return false;
      }
      if (classes.has(name)) {
        classes.delete(name);
        return false;
      }
      classes.add(name);
      return true;
    },
  };
}

function createModalHarness() {
  const kicker = { textContent: '' };
  const title = { textContent: '' };
  const sub = { textContent: '' };
  const body = { innerHTML: '' };
  const monthSelect = {
    innerHTML: '',
    value: '',
    disabled: false,
  };

  const modal = {
    dataset: {
      sheetType: 'meter',
      datasetKey: 'gas',
      compareKey: 'month',
      monthKey: '2026-03',
      gasMeterProductionKey: 'combined',
      gasAnalysisCategoryKey: 'plantA',
      electricMeterTeamKey: 'combined',
      electricAnalysisTeamKey: 'combined',
      electricMeterViewKey: 'meter',
      analysisFullscreen: 'false',
      analysisFullscreenChartKey: '',
      analysisFullscreenAutoExpanded: 'false',
      analysisInlineRatioTableKey: '',
    },
    classList: createClassList(['is-open']),
    querySelector(selector) {
      switch (selector) {
        case '[data-role="util-sheet-report-kicker"]':
          return kicker;
        case '[data-role="util-sheet-report-title"]':
          return title;
        case '[data-role="util-sheet-report-sub"]':
          return sub;
        case '[data-role="util-sheet-report-body"]':
          return body;
        case '[data-role="util-sheet-modal-month"]':
          return monthSelect;
        default:
          return null;
      }
    },
  };

  return {
    modal,
    kicker,
    title,
    sub,
    body,
    monthSelect,
  };
}

function createModalRenderContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    document: {
      getElementById() {
        return null;
      },
    },
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetModalRenderSource, context, {
    filename: 'KPI.util.report.sheet.modal-render.js',
  });
  return context;
}

function createGasRuntimeSyncContext() {
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
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetGasRuntimeSyncSource, context, {
    filename: 'KPI.util.report.sheet.gas.runtime-sync.js',
  });
  return context;
}

test('report sheet modal render registry normalizes meter modal state and rerenders the active modal', () => {
  const context = createModalRenderContext();
  const modalRender = context.KPIUtilReportSheetModalRender;
  const config = context.KPIUtilReportSheetConfig;
  const { modal, kicker, title, sub, body, monthSelect } = createModalHarness();

  context.document.getElementById = (id) => (id === 'util-sheet-report-modal' ? modal : null);

  let pruneCount = 0;
  let typeSyncCount = 0;
  let datasetSyncCount = 0;
  let compareSyncCount = 0;
  let chartPopupSyncCount = 0;
  let detachedSyncCount = 0;
  let windowStateSyncCount = 0;
  let relocateCount = 0;
  let summaryBlockCount = 0;

  modalRender.setRuntimeAdapters({
    normalizeUtilSheetType(sheetType) {
      return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    },
    resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
      void sheetType;
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    getUtilSheetPresentation(sheetType, datasetKey) {
      return {
        kicker: `${sheetType.toUpperCase()}:${datasetKey.toUpperCase()}`,
        title: 'UTILITY SHEET REPORT',
      };
    },
    normalizeUtilSheetCompareKey(compareKey) {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    normalizeUtilGasMeterProductionKey(value) {
      return String(value || 'combined').trim() || 'combined';
    },
    normalizeUtilGasAnalysisCategoryKey(value) {
      return String(value || 'plantA').trim() || 'plantA';
    },
    normalizeUtilElectricMeterTeamKey(value) {
      return String(value || 'combined').trim() || 'combined';
    },
    normalizeUtilElectricAnalysisTeamKey(value) {
      return String(value || 'combined').trim() || 'combined';
    },
    normalizeUtilElectricMeterViewKey(value) {
      return String(value || 'meter').trim() || 'meter';
    },
    buildUtilSheetDatasetResult(datasetKey, monthKey) {
      assert.equal(datasetKey, 'gas');
      assert.ok(monthKey === '2026-03' || monthKey === '2026-04');
      return {
        hasData: true,
        monthOptions: [
          { value: '2026-03', label: '2026-03' },
          { value: '2026-04', label: '2026-04' },
        ],
        activeMonthKey: '2026-04',
        latestMonthLabel: '2026-04',
      };
    },
    pruneUtilSheetDatasetToggles(currentModal) {
      assert.equal(currentModal, modal);
      pruneCount += 1;
    },
    syncUtilSheetTypeButtons(currentModal, selector, sheetType) {
      assert.equal(currentModal, modal);
      assert.equal(selector, '[data-role="util-sheet-modal-type-select"]');
      assert.equal(sheetType, 'meter');
      typeSyncCount += 1;
    },
    syncUtilSheetDatasetButtons(currentModal, selector, datasetKey, sheetType) {
      assert.equal(currentModal, modal);
      assert.equal(selector, '[data-role="util-sheet-modal-select"]');
      assert.equal(datasetKey, 'gas');
      assert.equal(sheetType, 'meter');
      datasetSyncCount += 1;
    },
    syncUtilSheetCompareButtons(currentModal, selector, compareKey) {
      assert.equal(currentModal, modal);
      assert.equal(selector, '[data-role="util-sheet-modal-compare-select"]');
      assert.equal(compareKey, 'month');
      compareSyncCount += 1;
    },
    escapeUtilSheetHtml(value) {
      return String(value ?? '').replace(/&/g, '&amp;');
    },
    syncUtilSheetAnalysisChartPopup(currentModal) {
      assert.equal(currentModal, modal);
      chartPopupSyncCount += 1;
    },
    syncUtilSheetDetachedReportWindow(currentModal) {
      assert.equal(currentModal, modal);
      detachedSyncCount += 1;
    },
    syncUtilSheetReportWindowState(currentModal) {
      assert.equal(currentModal, modal);
      windowStateSyncCount += 1;
    },
    getUtilSheetDetachedReportWindow() {
      return null;
    },
    buildUtilSheetCompareMeta(datasetResult, compareKey) {
      assert.equal(datasetResult.latestMonthLabel, '2026-04');
      assert.equal(compareKey, 'month');
      return { label: 'MONTH OVER MONTH' };
    },
    buildUtilGasMeterComparisonModel(monthKey, compareKey) {
      assert.equal(monthKey, '2026-04');
      assert.equal(compareKey, 'month');
      return { loading: false, items: [] };
    },
    buildUtilGasMeterSummaryItems(datasetResult, compareKey, comparisonModel, productionKey) {
      assert.equal(datasetResult.activeMonthKey, '2026-04');
      assert.equal(compareKey, 'month');
      assert.equal(comparisonModel.loading, false);
      assert.equal(productionKey, 'combined');
      return [{ label: 'TOTAL_USAGE', value: '10' }];
    },
    resolveUtilSheetMemoItems(sheetType, datasetKey, datasetResult, compareKey, comparisonModel) {
      assert.equal(sheetType, 'meter');
      assert.equal(datasetKey, 'gas');
      assert.equal(datasetResult.activeMonthKey, '2026-04');
      assert.equal(compareKey, 'month');
      assert.equal(comparisonModel.loading, false);
      return ['memo'];
    },
    buildUtilSheetBadgesHtml(sheetType, datasetResult, compareKey) {
      return `<span class="badge">${sheetType}:${datasetResult.activeMonthKey}:${compareKey}</span>`;
    },
    buildUtilGasMeterSummaryBlockHtml(summaryItems, productionKey) {
      assert.equal(summaryItems.length, 1);
      assert.equal(productionKey, 'combined');
      summaryBlockCount += 1;
      return `<div class="summary-block">summary-${summaryBlockCount}</div>`;
    },
    buildUtilSheetMemoSectionHtml(items) {
      return `<section class="memo-block">memo-${items.length}</section>`;
    },
    buildUtilGasMeterComparisonSectionHtml(comparisonModel) {
      assert.equal(comparisonModel.loading, false);
      return '<section class="compare-block">compare</section>';
    },
    relocateUtilGasGuidanceNote(currentBody) {
      assert.equal(currentBody, body);
      relocateCount += 1;
    },
  });

  modalRender.renderUtilSheetReportModal(modal);

  assert.equal(modal.dataset.sheetType, 'meter');
  assert.equal(modal.dataset.datasetKey, 'gas');
  assert.equal(modal.dataset.monthKey, '2026-04');
  assert.equal(kicker.textContent, 'METER:GAS');
  assert.equal(title.textContent, 'UTILITY SHEET REPORT');
  assert.ok(sub.textContent.includes('2026-04'));
  assert.ok(sub.textContent.includes('MONTH OVER MONTH'));
  assert.ok(monthSelect.innerHTML.includes('2026-04'));
  assert.equal(monthSelect.value, '2026-04');
  assert.equal(monthSelect.disabled, false);
  assert.ok(body.innerHTML.includes('summary-1'));
  assert.ok(body.innerHTML.includes('compare-block'));
  assert.ok(body.innerHTML.includes('memo-1'));
  assert.equal(config.UtilSheetReportState.meter, 'gas');
  assert.equal(config.UtilSheetReportMonthState.meter, '2026-04');
  assert.equal(pruneCount, 1);
  assert.equal(typeSyncCount, 1);
  assert.equal(datasetSyncCount, 1);
  assert.equal(compareSyncCount, 1);
  assert.equal(chartPopupSyncCount, 1);
  assert.equal(detachedSyncCount, 1);
  assert.equal(windowStateSyncCount, 1);
  assert.equal(relocateCount, 1);

  modalRender.rerenderUtilSheetReportModalIfActive('meter', 'gas');

  assert.ok(body.innerHTML.includes('summary-2'));
  assert.equal(pruneCount, 2);
  assert.equal(typeSyncCount, 2);
  assert.equal(datasetSyncCount, 2);
  assert.equal(compareSyncCount, 2);
  assert.equal(chartPopupSyncCount, 3);
  assert.equal(detachedSyncCount, 3);
  assert.equal(windowStateSyncCount, 3);
  assert.equal(relocateCount, 2);
});

test('report sheet modal render syncs gas data before showing no-data fallback', () => {
  const context = createModalRenderContext();
  const modalRender = context.KPIUtilReportSheetModalRender;
  const config = context.KPIUtilReportSheetConfig;
  const { modal, sub, body, monthSelect } = createModalHarness();

  config.UtilSheetRuntimeState.gasDataSyncedOnce = false;
  config.UtilSheetRuntimeState.gasDataSyncPromise = null;

  let gasSyncCount = 0;
  let detachedSyncCount = 0;
  let windowStateSyncCount = 0;

  modalRender.setRuntimeAdapters({
    normalizeUtilSheetType(sheetType) {
      return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    },
    resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
      void sheetType;
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    getUtilSheetPresentation() {
      return {
        kicker: 'METER:GAS',
        title: 'UTILITY SHEET REPORT',
      };
    },
    normalizeUtilSheetCompareKey() {
      return 'month';
    },
    normalizeUtilGasMeterProductionKey() {
      return 'combined';
    },
    normalizeUtilGasAnalysisCategoryKey() {
      return 'plantA';
    },
    normalizeUtilElectricMeterTeamKey() {
      return 'combined';
    },
    normalizeUtilElectricAnalysisTeamKey() {
      return 'combined';
    },
    normalizeUtilElectricMeterViewKey() {
      return 'meter';
    },
    buildUtilSheetDatasetResult() {
      return {
        hasData: false,
        monthOptions: [],
        activeMonthKey: '',
        latestMonthLabel: '',
      };
    },
    syncUtilSheetTypeButtons() {},
    syncUtilSheetDatasetButtons() {},
    syncUtilSheetCompareButtons() {},
    ensureUtilGasReportDataSync() {
      gasSyncCount += 1;
      config.UtilSheetRuntimeState.gasDataSyncedOnce = true;
      return Promise.resolve({ changed: true });
    },
    syncUtilSheetDetachedReportWindow() {
      detachedSyncCount += 1;
    },
    syncUtilSheetReportWindowState() {
      windowStateSyncCount += 1;
    },
  });

  modalRender.renderUtilSheetReportModal(modal);

  assert.equal(gasSyncCount, 1);
  assert.equal(monthSelect.disabled, true);
  assert.ok(sub.textContent.includes('가스 검침 데이터'));
  assert.ok(body.innerHTML.includes('가스 검침표 데이터를 정리하는 중입니다'));
  assert.equal(detachedSyncCount, 1);
  assert.equal(windowStateSyncCount, 1);
});

test('report sheet gas runtime sync forces one metering sync per report session', async () => {
  const context = createGasRuntimeSyncContext();
  const gasRuntimeSync = context.KPIUtilReportSheetGasRuntimeSync;
  const config = context.KPIUtilReportSheetConfig;
  const state = config.UtilSheetRuntimeState;

  state.gasDataSyncedOnce = false;
  state.gasDataSyncPromise = null;

  let syncCount = 0;
  gasRuntimeSync.setRuntimeAdapters({
    syncUtilGasDataFromMetering(options) {
      syncCount += 1;
      assert.equal(options.force, true);
      return Promise.resolve(true);
    },
  });

  const firstResult = await gasRuntimeSync.ensureUtilGasReportDataSync();
  const secondResult = await gasRuntimeSync.ensureUtilGasReportDataSync();

  assert.equal(firstResult.changed, true);
  assert.equal(secondResult.changed, false);
  assert.equal(syncCount, 1);
  assert.equal(state.gasDataSyncedOnce, true);
  assert.equal(state.gasDataSyncPromise, null);
});

test('kpi html loads report sheet modal render between modal shell and sheet.js', () => {
  const configIndex = kpiHtml.indexOf('runtime/util/report/sheet/config.js?v=054');
  const gasScopedMetricsIndex = kpiHtml.indexOf('runtime/util/report/sheet/gas/scoped-metrics.js?v=053');
  const gasRuntimeSyncIndex = kpiHtml.indexOf('runtime/util/report/sheet/gas/runtime-sync.js?v=054');
  const modalShellIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/shell.js?v=053');
  const modalRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/render.js?v=054');
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('KPI.util.report.sheet.js?v=054');

  assert.ok(configIndex >= 0, 'report sheet config loader is missing');
  assert.ok(gasRuntimeSyncIndex > gasScopedMetricsIndex, 'gas runtime sync must load after gas scoped metrics');
  assert.ok(modalShellIndex >= 0, 'report sheet modal shell loader is missing');
  assert.ok(modalRenderIndex > modalShellIndex, 'report sheet modal render must load after report sheet modal shell');
  assert.ok(analysisRenderIndex > modalRenderIndex, 'report sheet analysis render must load after report sheet modal render');
  assert.ok(sheetIndex > analysisRenderIndex, 'report sheet must load after report sheet analysis render');
});
