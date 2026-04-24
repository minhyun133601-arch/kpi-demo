import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const importParsingSource = await fs.readFile(
  new URL('../../../../utility/apps/production-extractor/runtime/import-parsing.js', import.meta.url),
  'utf8'
);
const productionExtractorHtml = await fs.readFile(
  new URL('../../../../utility/apps/production-extractor/production-extractor.html', import.meta.url),
  'utf8'
);

function createImportParsingContext() {
  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Set,
    Map,
    Promise,
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(importParsingSource, context, {
    filename: 'runtime/import-parsing.js',
  });
  return context;
}

test('production extractor import parsing registers the parsing API and date helpers', () => {
  const context = createImportParsingContext();
  const api = context.KPIProductionExtractorImportParsing;

  assert.equal(typeof api?.parseExcelFile, 'function');
  assert.equal(typeof api?.deduplicateRows, 'function');
  assert.equal(api.sanitizeCycleDay('99'), 31);
  assert.equal(api.sanitizeCycleDay('x'), 15);
  assert.equal(api.formatYmd(new Date(2026, 3, 10)), '2026-04-10');
  assert.equal(api.getPeriodInfo({}, new Date(2026, 3, 10), 15).key, '2026-04');
  assert.equal(api.buildDateRangeLabel({}, null, null), '날짜 없음');
});

test('production extractor import parsing deduplicates rows by normalized date and amount', () => {
  const context = createImportParsingContext();
  const api = context.KPIProductionExtractorImportParsing;

  const deduped = api.deduplicateRows(
    {
      PRODUCTION_VALUE_INDEX: 4,
      parseProductionValue(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
    },
    [
      { values: ['2026-04-10', 'A팀', '1호기', '베이스', '12'] },
      { values: ['2026/04/10', 'A팀', '1호기', '베이스', 12] },
      { values: ['2026-04-11', 'B팀', '2호기', '시럽', 5] },
    ]
  );

  assert.equal(deduped.removedCount, 1);
  assert.equal(deduped.rows.length, 2);
});

test('production extractor import parsing parses workbook rows and normalizes team and period data', async () => {
  const context = createImportParsingContext();
  const api = context.KPIProductionExtractorImportParsing;

  const workbook = {
    SheetNames: ['Sheet1'],
    Sheets: {
      Sheet1: {
        '!ref': 'A1:F4',
        A3: { v: '생산일자', w: '생산일자' },
        B3: { v: '팀', w: '팀' },
        C3: { v: '라인명', w: '라인명' },
        E3: { v: '품명', w: '품명' },
        F3: { v: '생산량', w: '생산량' },
        A4: { v: new Date(Date.UTC(2026, 3, 10)) },
        B4: { v: '' },
        C4: { v: 'Process Gamma 라인' },
        E4: { v: '시럽' },
        F4: { v: 12 },
      },
    },
  };
  const parsed = await api.parseExcelFile(
    {
      XLSX: {
        read() {
          return workbook;
        },
        SSF: {
          parse_date_code(value) {
            return value ? { y: 2026, m: 4, d: 10 } : null;
          },
        },
        utils: {
          decode_range() {
            return { e: { r: 3 } };
          },
        },
      },
      TARGET_COLS: ['A', 'B', 'C', 'E', 'F'],
      HEADER_ROW: 3,
      DATA_START_ROW: 4,
      TEAM_VALUE_INDEX: 1,
      LINE_VALUE_INDEX: 2,
      PRODUCTION_VALUE_INDEX: 4,
      PRODUCTION_DATE_OFFSET_DAYS: 0,
      REQUIRED_HEADER_RULES: {
        A: [/생산일자/],
        B: [/팀/],
        C: [/라인명/, /라인/],
        E: [/품명/],
        F: [/생산량/],
      },
      parseProductionValue(value) {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : null;
      },
    },
    {
      name: 'sample.xlsx',
      async arrayBuffer() {
        return new ArrayBuffer(8);
      },
    },
    15
  );

  assert.equal(parsed.rows.length, 1);
  assert.equal(parsed.rows[0].values[0], '2026-04-10');
  assert.equal(parsed.rows[0].values[1], 'Line Delta');
  assert.equal(parsed.rows[0].periodKey, '2026-04');
  assert.equal(parsed.productionRangeLabel, '2026-04-10 ~ 2026-04-10');
});

test('production extractor html loads import parsing before export actions and app', () => {
  const importParsingIndex = productionExtractorHtml.indexOf('runtime/import-parsing.js?v=16');
  const exportActionsIndex = productionExtractorHtml.indexOf('runtime/export-actions.js?v=16');
  const appIndex = productionExtractorHtml.indexOf('app.js?v=16');

  assert.ok(importParsingIndex >= 0, 'import parsing loader is missing');
  assert.ok(exportActionsIndex > importParsingIndex, 'export actions must load after import parsing');
  assert.ok(appIndex > exportActionsIndex, 'app.js must load after split runtime files');
});
