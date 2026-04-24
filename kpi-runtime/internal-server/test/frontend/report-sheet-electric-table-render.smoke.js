import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const REPORT_ROOT = '../../../../utility/runtime/util/report';

const electricTableRenderSource = await fs.readFile(
  new URL(REPORT_ROOT + '/sheet/electric/table-render.js', import.meta.url),
  'utf8'
);
const kpiHtml = await fs.readFile(
  new URL('../../../../KPI.html', import.meta.url),
  'utf8'
);

function createElectricTableRenderContext() {
  const context = {
    console,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Math,
    KPIUtilReportSheetOptions: {
      UTIL_ELECTRIC_TEAM_COLOR_META: {
        combined: { color: '#4f46e5', soft: '#e0e7ff' },
        team_01: { color: '#0f766e', soft: '#ccfbf1' },
        team_04: { color: '#a16207', soft: '#fef3c7' }
      }
    }
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(electricTableRenderSource, context, {
    filename: 'KPI.util.report.sheet.electric.table-render.js'
  });
  return context;
}

test('report sheet electric table render registry builds meter and summary table html', () => {
  const context = createElectricTableRenderContext();
  const registry = context.KPIUtilReportSheetElectricTableRender;

  assert.ok(registry, 'report sheet electric table render registry is missing');

  registry.setRuntimeAdapters({
    escapeUtilSheetHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
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
    }
  });

  assert.equal(registry.getUtilElectricTeamColorMeta('team_01').color, '#0f766e');

  const summaryHtml = registry.buildUtilElectricSummaryTableHtml(
    [
      { key: 'combined', label: '\uD569\uACC4', teamKey: 'combined' },
      { key: 'team_01', label: '1\uD300', teamKey: 'team_01' }
    ],
    [
      {
        label: '\uC0AC\uC6A9\uB7C9',
        key: 'usage',
        formatter(value) {
          return `${value}kWh`;
        }
      }
    ],
    {
      title: '\uC804\uAE30 \uC694\uC57D'
    }
  );

  assert.match(summaryHtml, /util-sheet-meter-table-electric/);
  assert.match(summaryHtml, /data-team-key=\"team_01\"/);
  assert.match(summaryHtml, /\uC804\uAE30 \uC694\uC57D/u);

  const meterHtml = registry.buildUtilElectricMeterTableHtml(
    {
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
          id: 'team_01',
          label: '1\uD300',
          teamKey: 'team_01',
          factor: 1,
          startReading: 600,
          endReading: 680,
          usage: 80
        }
      ]
    },
    '\uC120\uD0DD \uC6D4 \uAC80\uCE68\uD45C',
    {
      startReadingLabel: '\uC804\uC6D4 \uC9C0\uCE68',
      endReadingLabel: '\uB2F9\uC6D4 \uC9C0\uCE68'
    }
  );

  assert.match(meterHtml, /util-sheet-meter-table-electric/);
  assert.match(meterHtml, /\uC120\uD0DD \uC6D4 \uAC80\uCE68\uD45C/u);
  assert.match(meterHtml, /data-team-key=\"team_01\"/);
});

test('kpi html loads electric table render before electric meter model and electric comparison summary', () => {
  const tableRenderIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/table-render.js?v=053');
  const meterModelIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/meter-model.js?v=053');
  const comparisonSummaryIndex = kpiHtml.indexOf('runtime/util/report/sheet/electric/comparison-summary.js?v=053');

  assert.ok(tableRenderIndex >= 0, 'report sheet electric table render loader is missing');
  assert.ok(
    meterModelIndex > tableRenderIndex,
    'electric meter model must load after electric table render'
  );
  assert.ok(
    comparisonSummaryIndex > meterModelIndex,
    'electric comparison summary must load after electric meter model'
  );
});
