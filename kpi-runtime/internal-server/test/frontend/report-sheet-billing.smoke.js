import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
const REPORT_ROOT = '../../../../utility/runtime/util/report';
const GAS_BILLING_FOLDER = '\uAC00\uC2A4 \uCCAD\uAD6C\uC11C';
const reportSheetConfigSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/config.js', import.meta.url),
  'utf8'
);
const reportSheetBillingSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/billing.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);
function createReportSheetBillingContext() {
  const context = {
    console,
    Intl,
    URL,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    encodeURIComponent,
    decodeURIComponent,
    location: {
      href: 'http://127.0.0.1:3103/KPI.html',
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(reportSheetConfigSource, context, {
    filename: 'KPI.util.report.sheet.config.js',
  });
  vm.runInContext(reportSheetBillingSource, context, {
    filename: 'KPI.util.report.sheet.billing.js',
  });
  return context;
}
test('report sheet billing registry resolves scoped gas billing descriptors from runtime adapters', () => {
  const context = createReportSheetBillingContext();
  const billing = context.KPIUtilReportSheetBilling;
  billing.setRuntimeAdapters({
    getGasMeteringStore() {
      return {
        billingSettlementEntries: {
          '2026-04': {
            scopes: {
              plantA_lng: {
                fields: {
                  billing_amount: 120000,
                },
              },
            },
          },
        },
        billingDocuments: {
          '2026-04': {
            scopes: {
              plantA_lng: {
                fileName: 'lng-2026-04.pdf',
                relativePath: GAS_BILLING_FOLDER + '/lng-2026-04.pdf',
              },
            },
          },
        },
      };
    },
    getElectricMeteringStore() {
      return {};
    },
    getLocalAppStore() {
      return null;
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    formatMonthLabel(monthKey) {
      return 'FMT:' + monthKey;
    },
  });
  assert.equal(billing.getUtilGasBillingScopeFields('2026-04', 'plantA_lng').billing_amount, 120000);
  assert.equal(billing.getUtilGasBillingDocument('2026-04', 'plantA_lng')?.fileName, 'lng-2026-04.pdf');
  const descriptor = billing.resolveUtilGasBillingDocumentDescriptor('2026-04', 'plantA_lng');
  assert.equal(descriptor?.scopeLabel, 'LNG');
  assert.equal(descriptor?.folderName, GAS_BILLING_FOLDER);
  assert.ok(String(descriptor?.url || '').includes('apps/metering/%EA%B0%80%EC%8A%A4%20%EC%B2%AD%EA%B5%AC%EC%84%9C/lng-2026-04.pdf'));
});
test('kpi html loads report sheet billing before sheet.js', () => {
  const billingIndex = kpiHtml.indexOf('runtime/util/report/sheet/billing.js?v=053');
  const windowsIndex = kpiHtml.indexOf('runtime/util/report/sheet/windows.js?v=053');
  assert.ok(billingIndex >= 0, 'report sheet billing loader is missing');
  assert.ok(windowsIndex > billingIndex, 'report sheet billing must load before report sheet windows');
});
