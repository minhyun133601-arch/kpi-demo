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

function createProductionBridgeContext(savePromise) {
  let messageHandler = null;
  const dailyData = [{ name: '기존', entries: [{ date: '2026-04-01', amount: 1 }] }];
  const archiveMeta = [{ id: 'old-archive' }];
  const status = {
    textContent: '',
    classList: {
      toggle() {},
    },
  };
  const frameWindow = {
    messages: [],
    postMessage(message) {
      this.messages.push(message);
    },
  };
  const modal = {
    querySelector(selector) {
      if (selector === '[data-role="frame"]') return { contentWindow: frameWindow };
      if (selector === '[data-role="status"]') return status;
      return null;
    },
  };
  const context = {
    console,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Date,
    Math,
    Set,
    Map,
    Promise,
    document: {
      getElementById(id) {
        return id === 'util-production-extractor-modal' ? modal : null;
      },
    },
    location: {
      origin: 'http://127.0.0.1:3192',
      protocol: 'http:',
      host: '127.0.0.1:3192',
    },
    PortalData: {},
    UtilProductionBridgeState: {
      activeTeam: '1팀',
      onApplied: null,
    },
    UtilProductionState: {
      startDay: 1,
    },
    DEFAULT_UTIL_PRODUCTION_PERIOD: {
      startDay: 1,
    },
    UTIL_PRODUCTION_DAILY_DATA: dailyData,
    UTIL_PRODUCTION_ARCHIVE_META: archiveMeta,
    UTIL_PRODUCTION_DAILY_STATE: {
      meta: { version: 3 },
      periodDefault: { startDay: 1 },
      teams: dailyData,
      archives: archiveMeta,
    },
    persistUtilProductionDailyState() {
      return Promise.resolve(true);
    },
    refreshUtilProductionDailyIndex() {},
    refreshUtilProductionArchiveCountBadges() {},
    setLastModified() {},
  };
  context.mergeUtilProductionExtractorRows = () => {
    context.UTIL_PRODUCTION_DAILY_DATA.length = 0;
    context.UTIL_PRODUCTION_DAILY_DATA.push({ name: '신규', entries: [{ date: '2026-04-02', amount: 2 }] });
    return {
      addedCount: 1,
      skippedCount: 0,
      patchedCount: 0,
      addedTeams: ['1팀'],
      savePromise,
    };
  };
  context.window = context;
  context.globalThis = context;
  context.addEventListener = (type, handler) => {
    if (type === 'message') messageHandler = handler;
  };
  vm.createContext(context);
  vm.runInContext(productionExtractorBridgeSource, context, {
    filename: 'KPI.util.production.extractor.js',
  });
  return { context, frameWindow, status, getMessageHandler: () => messageHandler };
}

test('production extractor bridge waits for the server save before reporting success', async () => {
  let resolveSave;
  const savePromise = new Promise((resolve) => {
    resolveSave = resolve;
  });
  const { frameWindow, getMessageHandler } = createProductionBridgeContext(savePromise);
  const handler = getMessageHandler();

  const pending = handler({
    source: frameWindow,
    data: {
      type: 'kpi-production-extracted',
      rows: [{ date: '2026-04-02', team: '1팀', amount: 2 }],
      meta: {},
    },
  });
  assert.equal(frameWindow.messages.length, 0, 'success must wait for the save promise');

  resolveSave(true);
  await pending;
  assert.equal(frameWindow.messages.length, 1);
  assert.equal(frameWindow.messages[0].ok, true);
});

test('production extractor bridge rolls back optimistic rows when the server save fails', async () => {
  const { context, frameWindow, getMessageHandler } = createProductionBridgeContext(Promise.resolve(false));
  const handler = getMessageHandler();

  await handler({
    source: frameWindow,
    data: {
      type: 'kpi-production-extracted',
      rows: [{ date: '2026-04-02', team: '1팀', amount: 2 }],
      meta: {},
    },
  });

  assert.equal(frameWindow.messages.length, 1);
  assert.equal(frameWindow.messages[0].ok, false);
  assert.deepEqual(context.UTIL_PRODUCTION_DAILY_DATA, [
    { name: '기존', entries: [{ date: '2026-04-01', amount: 1 }] },
  ]);
  assert.deepEqual(context.UTIL_PRODUCTION_ARCHIVE_META, [{ id: 'old-archive' }]);
  assert.deepEqual(context.UTIL_PRODUCTION_DAILY_STATE.periodDefault, { startDay: 1 });
  assert.equal(context.PortalData?.util_production_daily, context.UTIL_PRODUCTION_DAILY_STATE);
});
