import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const exportActionsSource = await fs.readFile(
  new URL('../../../../utility/apps/production-extractor/runtime/export-actions.js', import.meta.url),
  'utf8'
);
const productionExtractorHtml = await fs.readFile(
  new URL('../../../../utility/apps/production-extractor/production-extractor.html', import.meta.url),
  'utf8'
);
const productionExtractorBridgeSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/production/KPI.util.production.extractor.js', import.meta.url),
  'utf8'
);

function createExportActionsContext() {
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
    setTimeout,
    clearTimeout,
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(exportActionsSource, context, {
    filename: 'runtime/export-actions.js',
  });
  return context;
}

test('production extractor export actions registers a window API with the split handlers', () => {
  const context = createExportActionsContext();
  const api = context.KPIProductionExtractorExportActions;

  assert.equal(typeof api?.initializeStoredExportPanel, 'function');
  assert.equal(typeof api?.refreshStoredRowsFromParent, 'function');
  assert.equal(typeof api?.handleDownloadStoredRows, 'function');
  assert.equal(typeof api?.downloadFilteredRows, 'function');
  assert.equal(typeof api?.downloadAllRows, 'function');
});

test('production extractor export actions normalize stored bridge rows deterministically', () => {
  const context = createExportActionsContext();
  const api = context.KPIProductionExtractorExportActions;

  const normalized = api.normalizeStoredRowsPayload(
    {
      parseDateText(value) {
        const normalizedValue = String(value || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) return null;
        return new Date(`${normalizedValue}T00:00:00Z`);
      },
      parseProductionValue(value) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      },
      formatYmd(date) {
        return date.toISOString().slice(0, 10);
      },
    },
    [
      { date: '2026-04-10', team: 'A팀', lineName: '1호기', productName: '베이스', amount: '12' },
      { date: '2026-04-10', team: 'A팀', lineName: '1호기', productName: '베이스', amount: 12 },
      { date: '2026-04-09', team: 'B팀', lineName: '2호기', productName: '시럽', amount: 5 },
      { date: 'invalid', team: 'C팀', amount: 1 },
    ]
  );

  assert.deepEqual(
    JSON.parse(JSON.stringify(normalized)),
    [
      {
        date: '2026-04-09',
        team: 'B팀',
        lineName: '2호기',
        productName: '시럽',
        amount: 5,
      },
      {
        date: '2026-04-10',
        team: 'A팀',
        lineName: '1호기',
        productName: '베이스',
        amount: 12,
      },
    ]
  );
  assert.deepEqual(
    api.normalizeStoredTeamList(['C팀', 'A팀'], normalized),
    ['A팀', 'B팀', 'C팀']
  );
});

test('production extractor html loads export actions before app and KPI bridge busts the embed cache', () => {
  const exportActionsIndex = productionExtractorHtml.indexOf('runtime/export-actions.js?v=16');
  const appIndex = productionExtractorHtml.indexOf('app.js?v=16');

  assert.ok(exportActionsIndex >= 0, 'split runtime loader is missing');
  assert.ok(appIndex > exportActionsIndex, 'app.js must load after runtime/export-actions.js');
  assert.match(
    productionExtractorBridgeSource,
    /production-extractor\.html\?embed=1&v=16/
  );
});

test('production extractor export actions keep month-based export copy', () => {
  assert.match(exportActionsSource, /날짜 원본 그대로 사용, 월 기준 1일~말일 분류/);
  assert.match(exportActionsSource, /\["선택 월"/);
  assert.doesNotMatch(exportActionsSource, /정산 시작일/);
});
