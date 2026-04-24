import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetModalActionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/modal/actions.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createModalActionsContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    document: {
      getElementById() {
        return null;
      },
    },
    requestAnimationFrame(callback) {
      callback();
    },
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetModalActionsSource, context, {
    filename: 'KPI.util.report.sheet.modal-actions.js',
  });
  return context;
}

test('report sheet modal actions registry updates compare and fullscreen state through runtime adapters', () => {
  const context = createModalActionsContext();
  const modalActions = context.KPIUtilReportSheetModalActions;
  const config = context.KPIUtilReportSheetConfig;
  const modal = {
    dataset: {
      sheetType: 'analysis',
      datasetKey: 'gas',
      compareKey: 'month',
      analysisInlineRatioTableKey: '',
      analysisFullscreen: 'false',
      analysisFullscreenChartKey: '',
      analysisFullscreenAutoExpanded: 'false',
    },
    _classes: new Set(),
    classList: {
      add: (...names) => names.forEach((name) => modal._classes.add(name)),
      remove: (...names) => names.forEach((name) => modal._classes.delete(name)),
      toggle: (name, force) => {
        if (force === true) {
          modal._classes.add(name);
          return true;
        }
        if (force === false) {
          modal._classes.delete(name);
          return false;
        }
        if (modal._classes.has(name)) {
          modal._classes.delete(name);
          return false;
        }
        modal._classes.add(name);
        return true;
      },
      contains: (name) => modal._classes.has(name),
    },
    querySelector(selector) {
      if (selector === '[data-role="util-sheet-analysis-section"]') {
        return {
          getBoundingClientRect() {
            return { left: 10, top: 20, width: 840, height: 500 };
          },
        };
      }
      return null;
    },
    focus() {},
  };

  let renderCount = 0;
  let detachedSyncCount = 0;
  let windowStateSyncCount = 0;
  let panelSyncArgs = null;
  let chartPopupArgs = null;
  let closeChartPopupCount = 0;

  modalActions.setRuntimeAdapters({
    normalizeUtilSheetCompareKey(compareKey) {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    normalizeUtilSheetType(sheetType) {
      return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    },
    resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
      void sheetType;
      return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    },
    normalizeUtilGasAnalysisCategoryKey(value) {
      return String(value || '').trim() || 'plantA';
    },
    normalizeUtilGasAnalysisFullscreenChartKey(currentModal, chartKey) {
      assert.equal(currentModal, modal);
      return String(chartKey || '').trim() || 'combined';
    },
    getUtilGasAnalysisInlineRatioTableKey(currentModal, tableKey = '') {
      assert.equal(currentModal, modal);
      const key = String(tableKey || currentModal.dataset.analysisInlineRatioTableKey || '').trim().toLowerCase();
      return key === 'heat' ? 'heat' : '';
    },
    setUtilSheetAnalysisRangeState() {},
    renderUtilSheetReportModal(currentModal) {
      assert.equal(currentModal, modal);
      renderCount += 1;
    },
    syncUtilSheetDetachedReportWindow(currentModal) {
      assert.equal(currentModal, modal);
      detachedSyncCount += 1;
    },
    syncUtilSheetReportWindowState(currentModal) {
      assert.equal(currentModal, modal);
      windowStateSyncCount += 1;
    },
    syncUtilSheetPanelSelection(sheetType, datasetKey) {
      panelSyncArgs = { sheetType, datasetKey };
    },
    openUtilSheetAnalysisChartPopup(currentModal, chartKey) {
      chartPopupArgs = { currentModal, chartKey };
      return true;
    },
    closeUtilSheetAnalysisChartPopupWindow() {
      closeChartPopupCount += 1;
    },
  });

  modalActions.applyUtilSheetCompareSelection(modal, 'year');
  assert.equal(modal.dataset.compareKey, 'year');
  assert.equal(config.UtilSheetCompareState.analysis, 'year');
  assert.deepEqual(panelSyncArgs, { sheetType: 'analysis', datasetKey: 'gas' });

  const fullscreenEnabled = modalActions.setUtilGasAnalysisChartFullscreen(modal, 'combined', true);
  assert.equal(fullscreenEnabled, true);
  assert.equal(modal.dataset.analysisFullscreen, 'true');
  assert.equal(modal.dataset.analysisFullscreenChartKey, 'combined');
  assert.equal(modal.classList.contains('is-expanded'), true);
  assert.equal(modal.classList.contains('is-analysis-chart-fullscreen'), true);

  const triggerEl = {
    getBoundingClientRect() {
      return { left: 120, top: 40, bottom: 72 };
    },
  };
  const toggleResult = modalActions.openUtilGasAnalysisRatioTablePopup(modal, 'heat', triggerEl);
  assert.equal(toggleResult, true);
  assert.equal(modal.dataset.analysisInlineRatioTableKey, 'heat');
  assert.equal(modal.dataset.analysisFullscreen, 'false');
  assert.equal(closeChartPopupCount, 1);
  assert.ok(Number(modal.dataset.analysisInlineRatioTableX) >= 0);
  assert.ok(Number(modal.dataset.analysisInlineRatioTableY) >= 0);

  const chartResult = modalActions.openUtilGasAnalysisChartModal(modal, 'ratio-combined');
  assert.equal(chartResult, true);
  assert.deepEqual(chartPopupArgs, { currentModal: modal, chartKey: 'ratio-combined' });
  assert.ok(renderCount >= 2);
  assert.ok(detachedSyncCount >= 2);
  assert.ok(windowStateSyncCount >= 2);
});

test('kpi html loads report sheet modal actions before sheet.js', () => {
  const modalActionsIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/actions.js?v=053');
  const modalShellIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/shell.js?v=053');

  assert.ok(modalActionsIndex >= 0, 'report sheet modal actions loader is missing');
  assert.ok(modalShellIndex > modalActionsIndex, 'report sheet modal actions must load before report sheet modal shell');
});
