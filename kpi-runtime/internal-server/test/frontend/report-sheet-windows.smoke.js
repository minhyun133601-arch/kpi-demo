import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const REPORT_ROOT = '../../../../utility/runtime/util/report';
const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetWindowDetachedInteractionsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/windows/detached-interactions.js', import.meta.url),
  'utf8'
);
const reportSheetWindowsSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/windows.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);
function createHeadDocument() {
  const headNodes = [
    { outerHTML: '<style>.from-head{color:red;}</style>' },
    { outerHTML: '<link rel="stylesheet" href="/runtime.css">' },
  ];
  return {
    head: {
      querySelectorAll(selector) {
        if (selector === 'style, link[rel="stylesheet"]') {
          return headNodes;
        }
        return [];
      },
    },
    getElementById() {
      return null;
    },
  };
}
function createReportSheetWindowsContext() {
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
    document: createHeadDocument(),
    alert() {},
    open() {
      return null;
    },
    screen: {
      availWidth: 1920,
      availHeight: 1080,
      width: 1920,
      height: 1080,
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetWindowDetachedInteractionsSource, context, {
    filename: 'KPI.util.report.sheet.window.detached-interactions.js',
  });
  vm.runInContext(reportSheetWindowsSource, context, {
    filename: 'KPI.util.report.sheet.windows.js',
  });
  return context;
}
test('report sheet windows registry builds detached/chart shells and closes detached state safely', () => {
  const context = createReportSheetWindowsContext();
  assert.ok(context.KPIUtilReportSheetWindowDetachedInteractions);
  const windows = context.KPIUtilReportSheetWindows;
  const config = context.KPIUtilReportSheetConfig;
  windows.setRuntimeAdapters({
    buildUtilSheetDetachedCompareToggleHtml() {
      return '<button data-role="util-sheet-report-detached-compare-select">compare</button>';
    },
  });
  const detachedHtml = windows.buildUtilSheetDetachedReportShellHtml();
  const popupHtml = windows.buildUtilSheetAnalysisChartPopupShellHtml();
  assert.ok(detachedHtml.includes('util-sheet-report-detached-body'));
  assert.ok(detachedHtml.includes('util-sheet-report-detached-compare-select'));
  assert.ok(detachedHtml.includes('<style>.from-head{color:red;}</style>'));
  assert.ok(popupHtml.includes('util-sheet-analysis-chart-popup-body'));
  assert.ok(popupHtml.includes('<link rel="stylesheet" href="/runtime.css">'));
  const fakePopup = {
    closed: false,
    closeCalled: false,
    close() {
      this.closeCalled = true;
      this.closed = true;
    },
  };
  config.UtilSheetDetachedReportState.win = fakePopup;
  windows.closeUtilSheetDetachedReportWindow();
  assert.equal(config.UtilSheetDetachedReportState.win, null);
  assert.equal(fakePopup.closeCalled, true);
});
test('kpi html loads report sheet windows before sheet.js', () => {
  const detachedInteractionIndex = kpiHtml.indexOf('runtime/util/report/sheet/windows/detached-interactions.js?v=053');
  const windowsIndex = kpiHtml.indexOf('runtime/util/report/sheet/windows.js?v=053');
  const modalActionsIndex = kpiHtml.indexOf('runtime/util/report/sheet/modal/actions.js?v=053');
  assert.ok(detachedInteractionIndex >= 0, 'report sheet detached interaction loader is missing');
  assert.ok(windowsIndex >= 0, 'report sheet windows loader is missing');
  assert.ok(windowsIndex > detachedInteractionIndex, 'report sheet windows must load after detached interactions');
  assert.ok(modalActionsIndex > windowsIndex, 'report sheet windows must load before report sheet modal actions');
});
