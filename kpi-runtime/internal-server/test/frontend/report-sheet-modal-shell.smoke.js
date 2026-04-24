import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetModalShellSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/modal/shell.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createDocumentHarness() {
  const harness = {
    appendedNode: null,
  };

  const document = {
    body: {
      appendChild(node) {
        harness.appendedNode = node;
        return node;
      },
    },
    getElementById(id) {
      return id === 'util-sheet-report-modal' ? harness.appendedNode : null;
    },
    createElement() {
      const listeners = {};
      const classes = new Set();

      return {
        dataset: {},
        style: {},
        innerHTML: '',
        className: '',
        id: '',
        tabIndex: 0,
        listeners,
        classList: {
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
        },
        addEventListener(type, handler) {
          listeners[type] = handler;
        },
      };
    },
  };

  return { document, harness };
}

function createTarget(selectorMap = {}, dataset = {}, value = '') {
  return {
    dataset,
    value,
    checked: false,
    closest(selector) {
      return selectorMap[selector] ? this : null;
    },
  };
}

function createModalShellContext() {
  const { document, harness } = createDocumentHarness();
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    document,
    print() {},
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetModalShellSource, context, {
    filename: 'KPI.util.report.sheet.modal-shell.js',
  });
  return { context, harness };
}

test('report sheet modal shell registry creates the shared modal and routes type/month interactions through runtime adapters', () => {
  const { context, harness } = createModalShellContext();
  const modalShell = context.KPIUtilReportSheetModalShell;
  const config = context.KPIUtilReportSheetConfig;

  config.UtilSheetReportMonthState.analysis = '2026-05';
  config.UtilSheetCompareState.analysis = 'year';

  let pruneCount = 0;
  let renderCount = 0;
  let detachedSyncCount = 0;
  let windowStateSyncCount = 0;
  let closeCount = 0;
  let panelSyncArgs = null;

  modalShell.setRuntimeAdapters({
    pruneUtilSheetDatasetToggles(modal) {
      pruneCount += 1;
      assert.ok(modal);
    },
    closeUtilSheetReportModal() {
      closeCount += 1;
    },
    renderUtilSheetReportModal(modal) {
      renderCount += 1;
      assert.equal(modal, harness.appendedNode);
    },
    syncUtilSheetDetachedReportWindow(modal) {
      detachedSyncCount += 1;
      assert.equal(modal, harness.appendedNode);
    },
    syncUtilSheetReportWindowState(modal) {
      windowStateSyncCount += 1;
      assert.ok(modal);
    },
    getUtilSheetAlternateType() {
      return 'analysis';
    },
    getUtilSheetAlternateDatasetKey() {
      return 'electric';
    },
    resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
      return String(sheetType || '').trim() === 'analysis'
        ? (String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas')
        : (String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas');
    },
    normalizeUtilSheetCompareKey(compareKey) {
      return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    },
    normalizeUtilSheetType(sheetType) {
      return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    },
    isUtilSheetCustomAnalysisDataset(datasetKey) {
      return datasetKey === 'gas' || datasetKey === 'electric';
    },
    setUtilSheetAnalysisToMonth(datasetKey, monthKey) {
      assert.equal(datasetKey, 'electric');
      assert.equal(monthKey, '2026-06');
    },
    syncUtilSheetPanelSelection(sheetType, datasetKey) {
      panelSyncArgs = { sheetType, datasetKey };
    },
  });

  const modal = modalShell.ensureUtilSheetReportModal();
  assert.equal(modal, harness.appendedNode);
  assert.ok(modal.innerHTML.includes('util-sheet-report-body'));
  assert.ok(modal.innerHTML.includes('util-sheet-report-close'));
  assert.ok(modal.listeners.click, 'click handler missing');
  assert.ok(modal.listeners.keydown, 'keydown handler missing');
  assert.ok(modal.listeners.change, 'change handler missing');
  assert.equal(pruneCount, 1);
  assert.equal(windowStateSyncCount, 1);

  const reusedModal = modalShell.ensureUtilSheetReportModal();
  assert.equal(reusedModal, modal);

  modal.dataset.sheetType = 'meter';
  modal.dataset.datasetKey = 'gas';
  modal.dataset.monthKey = '2026-04';
  modal.dataset.compareKey = 'month';

  const typeButton = createTarget({
    '[data-role="util-sheet-modal-type-select"]': true,
  });
  modal.listeners.click({ target: typeButton });
  assert.equal(modal.dataset.sheetType, 'analysis');
  assert.equal(modal.dataset.datasetKey, 'gas');
  assert.equal(modal.dataset.monthKey, '2026-05');
  assert.equal(modal.dataset.compareKey, 'year');
  assert.deepEqual(panelSyncArgs, { sheetType: 'analysis', datasetKey: 'gas' });

  modal.dataset.datasetKey = 'electric';
  modal.dataset.sheetType = 'analysis';
  const monthSelect = createTarget({
    '[data-role="util-sheet-modal-month"]': true,
  }, {}, '2026-06');
  modal.listeners.change({ target: monthSelect });
  assert.equal(config.UtilSheetReportMonthState.analysis, '2026-06');
  assert.deepEqual(panelSyncArgs, { sheetType: 'analysis', datasetKey: 'electric' });

  const closeButton = createTarget({
    '[data-role="util-sheet-report-close"]': true,
  });
  modal.listeners.click({ target: closeButton });
  assert.equal(closeCount, 1);
  assert.ok(renderCount >= 2);
  assert.ok(detachedSyncCount >= 2);
  assert.ok(windowStateSyncCount >= 3);
});

test('kpi html loads report sheet modal shell before modal render and sheet.js', () => {
  const modalActionsIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/actions.js?v=053');
  const modalShellIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/shell.js?v=053');
  const modalRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/render.js?v=054');
  const analysisRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/analysis/render.js?v=053');
  const sheetIndex = kpiHtml.indexOf('KPI.util.report.sheet.js?v=054');

  assert.ok(modalActionsIndex >= 0, 'report sheet modal actions loader is missing');
  assert.ok(modalShellIndex > modalActionsIndex, 'report sheet modal shell must load after report sheet modal actions');
  assert.ok(modalRenderIndex > modalShellIndex, 'report sheet modal render must load after report sheet modal shell');
  assert.ok(analysisRenderIndex > modalRenderIndex, 'report sheet analysis render must load after report sheet modal render');
  assert.ok(sheetIndex > analysisRenderIndex, 'report sheet must load after report sheet analysis render');
});
