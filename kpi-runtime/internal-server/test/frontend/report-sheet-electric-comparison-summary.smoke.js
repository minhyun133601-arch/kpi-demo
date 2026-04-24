import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const electricTableRenderSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/electric/table-render.js', import.meta.url),
  'utf8'
);
const comparisonSummarySource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/electric/comparison-summary.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createElectricComparisonSummaryContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Map,
    Set,
    Math,
    Intl,
    KPIUtilReportSheetOptions: {
      UTIL_ELECTRIC_ALLOCATION_GROUPS: [
        {
          key: 'production',
          label: '\uC0DD\uC0B0',
          caption: '\uC0DD\uC0B0 \uC124\uBE44',
          sourceIds: ['detail_01', 'detail_02']
        }
      ],
      UTIL_ELECTRIC_TEAM_SUMMARY_OPTIONS: [
        {
          key: 'team_01',
          label: '1\uD300',
          reportTeamFilters: ['1\uD300'],
          productionTeamNames: ['1\uD300']
        },
        {
          key: 'team_04',
          label: '\uAD00\uB9AC\uB3D9',
          reportTeamFilters: ['\uAD00\uB9AC\uB3D9'],
          productionTeamNames: []
        }
      ],
      UTIL_ELECTRIC_TEAM_COLOR_META: {
        combined: { color: '#4f46e5', soft: '#e0e7ff' },
        team_01: { color: '#0f766e', soft: '#ccfbf1' },
        team_04: { color: '#a16207', soft: '#fef3c7' }
      },
      UTIL_ELECTRIC_BILLING_SUMMARY_FIELDS: [
        { key: 'electricity_charge_total', label: '\uC804\uAE30\uC694\uAE08\uACC4' },
        { key: 'unit_price', label: '\uB2E8\uAC00' },
        { key: 'billing_amount', label: '\uCCAD\uAD6C\uAE08\uC561' },
        { key: 'base_charge', label: '\uAE30\uBCF8\uC694\uAE08' }
      ],
      normalizeUtilElectricMeterViewKey(value) {
        const normalizedValue = String(value || '').trim();
        return normalizedValue || 'meter';
      },
      getUtilElectricMeterTeamOption(teamKey) {
        return {
          key: String(teamKey || 'combined'),
          label: teamKey === 'combined' ? '\uD569\uC0B0' : String(teamKey || ''),
          reportTeamFilters: [],
          productionTeamNames: []
        };
      }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(electricTableRenderSource, context, {
    filename: 'KPI.util.report.sheet.electric.table-render.js'
  });
  vm.runInContext(comparisonSummarySource, context, {
    filename: 'KPI.util.report.sheet.electric.comparison-summary.js'
  });
  return context;
}

test('report sheet electric comparison summary registry builds electric billing summary and comparison section', () => {
  const context = createElectricComparisonSummaryContext();
  const registry = context.KPIUtilReportSheetElectricComparisonSummary;

  assert.ok(registry, 'report sheet electric comparison summary registry is missing');

  registry.setRuntimeAdapters({
    getUtilElectricMeteringStore() {
      return {
        billingSettlementEntries: {
          '2026-03': {
            scopes: {
              plantA: {
                fields: {
                  power_charge: '10000',
                  climate_environment_charge: '500',
                  fuel_adjustment_charge: '200',
                  operation_fee: '100',
                  lagging_power_factor_charge: '50',
                  internet_discount: '150',
                  base_charge: '5000',
                  vat: '1500',
                  electric_power_fund: '300',
                  tv_reception_fee: '250',
                  billing_amount: '17750',
                  unit_price: '177.5'
                }
              }
            }
          }
        }
      };
    },
    getLocalAppStore() {
      return null;
    },
    isUtilSheetPlainObject(value) {
      return !!value && typeof value === 'object' && !Array.isArray(value);
    },
    parseUtilGasMeterNumber(value) {
      return Number(value);
    },
    buildUtilElectricMeterTeamDatasetResult(monthKey, teamKey) {
      return {
        option: {
          key: String(teamKey || 'combined'),
          label: String(teamKey || 'combined')
        },
        latestRow: { monthKey },
        latestUsage: 120,
        latestCost: 17750,
        latestProduction: 400,
        deltaCostVsPrevMonth: 1500,
        deltaCostVsPrevYear: 2500
      };
    },
    buildUtilElectricScopedDatasetResult(monthKey, reportTeamFilters) {
      const key = Array.isArray(reportTeamFilters) ? reportTeamFilters[0] : '';
      return {
        latestRow: { monthKey },
        latestUsage: key === '\uAD00\uB9AC\uB3D9' ? 12 : 108,
        latestCost: key === '\uAD00\uB9AC\uB3D9' ? 1750 : 16000,
        latestProduction: key === '\uAD00\uB9AC\uB3D9' ? null : 400,
        deltaCostVsPrevMonth: key === '\uAD00\uB9AC\uB3D9' ? 100 : 1400,
        deltaCostVsPrevYear: key === '\uAD00\uB9AC\uB3D9' ? 150 : 2400
      };
    },
    normalizeUtilSheetCompareKey(compareKey) {
      const normalizedValue = String(compareKey || '').trim();
      return normalizedValue === 'year' ? 'year' : 'month';
    },
    shiftUtilSheetMonthKey(monthKey, delta) {
      const [yearText, monthText] = String(monthKey || '').split('-');
      const date = new Date(Number(yearText), Number(monthText) - 1 + Number(delta || 0), 1);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    },
    buildUtilElectricMeterViewToggleHtml(viewKey) {
      return `<div data-view-toggle="${String(viewKey || '')}"></div>`;
    },
    resolveUtilSheetBillingDocumentDescriptor(datasetKey, monthKey, scopeKey) {
      if (datasetKey === 'electric' && monthKey === '2026-03' && scopeKey === 'plantA') {
        return { relativePath: 'electric/2026-03-plantA.pdf' };
      }
      return null;
    },
    escapeUtilSheetHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    },
    formatUtilReportMonthLong(monthKey) {
      return `${String(monthKey || '')}\uC6D4`;
    },
    formatUtilSheetCost(value, fallback = '-') {
      return Number.isFinite(value) ? `${Number(value).toLocaleString('ko-KR')}\uC6D0` : fallback;
    },
    formatUtilSheetDecimal(value, digits = 0, fallback = '-') {
      return Number.isFinite(value)
        ? Number(value).toLocaleString('ko-KR', {
            minimumFractionDigits: digits,
            maximumFractionDigits: digits
          })
        : fallback;
    },
    formatUtilSheetInteger(value, fallback = '-') {
      return Number.isFinite(value) ? `${Math.round(Number(value)).toLocaleString('ko-KR')}` : fallback;
    },
    formatUtilSheetSignedCost(value, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      const prefix = value > 0 ? '+' : '';
      return `${prefix}${Math.round(Number(value)).toLocaleString('ko-KR')}\uC6D0`;
    },
    formatUtilSheetSignedInteger(value, fallback = '-') {
      if (!Number.isFinite(value)) return fallback;
      const prefix = value > 0 ? '+' : '';
      return `${prefix}${Math.round(Number(value)).toLocaleString('ko-KR')}`;
    },
    formatUtilSheetQuantity(value, unit = '') {
      return Number.isFinite(value) ? `${Math.round(Number(value)).toLocaleString('ko-KR')}${unit}` : '-';
    }
  });

  const model = {
    ready: true,
    compareKey: 'month',
    option: { key: 'combined', label: '\uD569\uC0B0' },
    selectedTable: {
      monthKey: '2026-03',
      optionKey: 'combined',
      columns: [
        {
          id: 'combined_total',
          label: '\uD569\uACC4',
          teamKey: 'combined',
          factor: 1,
          startReading: 1000,
          endReading: 1100,
          usage: 100
        },
        {
          id: 'power_total',
          label: '\uC804\uB825\uCD1D\uB7C9',
          teamKey: 'combined',
          factor: 1,
          startReading: 1000,
          endReading: 1100,
          usage: 100
        }
      ],
      detailColumns: [
        { id: 'detail_01', label: '\uC0DD\uC0B0 A', teamKey: 'team_01', usage: 60 },
        { id: 'detail_02', label: '\uC0DD\uC0B0 B', teamKey: 'team_01', usage: 30 },
        { id: 'detail_03', label: '\uAE30\uD0C0', teamKey: 'team_04', usage: 10 }
      ]
    },
    referenceTable: {
      monthKey: '2026-02',
      optionKey: 'combined',
      columns: [
        {
          id: 'combined_total',
          label: '\uD569\uACC4',
          teamKey: 'combined',
          factor: 1,
          startReading: 900,
          endReading: 980,
          usage: 80
        },
        {
          id: 'power_total',
          label: '\uC804\uB825\uCD1D\uB7C9',
          teamKey: 'combined',
          factor: 1,
          startReading: 900,
          endReading: 980,
          usage: 80
        }
      ],
      detailColumns: [
        { id: 'detail_01', label: '\uC0DD\uC0B0 A', teamKey: 'team_01', usage: 50 },
        { id: 'detail_02', label: '\uC0DD\uC0B0 B', teamKey: 'team_01', usage: 20 },
        { id: 'detail_03', label: '\uAE30\uD0C0', teamKey: 'team_04', usage: 10 }
      ]
    }
  };

  const summary = registry.buildUtilElectricBillingSummaryModel(model);
  assert.equal(summary.monthKey, '2026-03');
  assert.match(summary.items[0].valueText, /10,700\uC6D0/u);
  assert.match(summary.items[1].valueText, /177\.50\uC6D0\/kWh/u);
  assert.match(summary.items[2].valueText, /17,750\uC6D0/u);

  const html = registry.buildUtilElectricMeterComparisonSectionHtml(model, null, 'meter');
  assert.match(html, /util-sheet-meter-table-electric/);
  assert.match(html, /util-sheet-disclosure/);
  assert.match(html, /data-view-toggle=\"meter\"/);
  assert.match(html, /data-billing-dataset-key=\"electric\"/);
  assert.match(html, /data-billing-scope-key=\"plantA\"/);
});

test('kpi html loads electric runtime sync between electric table render and electric meter model', () => {
  const billingIndex = kpiHtml.indexOf('runtime/util/report/sheet/billing.js?v=053');
  const electricTableRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/table-render.js?v=053');
  const electricRuntimeSyncIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/runtime-sync.js?v=053');
  const electricMeterModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/meter-model.js?v=053');
  const electricComparisonIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/comparison-summary.js?v=053');
  const gasComparisonIndex = kpiHtml.indexOf('runtime/util/report/sheet/gas/comparison-summary.js?v=053');
  const sheetIndex = kpiHtml.indexOf('runtime/util/report/KPI.util.report.sheet.js?v=054');

  assert.ok(billingIndex >= 0, 'report sheet billing loader is missing');
  assert.ok(electricTableRenderIndex > billingIndex, 'electric table render must load after billing');
  assert.ok(
    electricRuntimeSyncIndex > electricTableRenderIndex,
    'electric runtime sync must load after electric table render'
  );
  assert.ok(
    electricMeterModelIndex > electricRuntimeSyncIndex,
    'electric meter model must load after electric runtime sync'
  );
  assert.ok(
    electricComparisonIndex > electricMeterModelIndex,
    'electric comparison summary must load after electric meter model'
  );
  assert.ok(
    gasComparisonIndex > electricComparisonIndex,
    'gas comparison summary must load after electric comparison summary'
  );
  assert.ok(sheetIndex > gasComparisonIndex, 'report sheet must load after electric and gas comparison summaries');
});
