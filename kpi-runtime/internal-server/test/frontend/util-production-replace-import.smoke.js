import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const productionImportSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/KPI.util.production-import.js', import.meta.url),
  'utf8'
);

function parseDateKey(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    !Number.isFinite(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return { year, month, day, date };
}

function createProductionImportContext() {
  let queuedWriteCount = 0;
  const utilProductionState = {
    meta: {},
    periodDefault: { startDay: 1 },
    teams: [
      {
        name: '기존팀',
        entries: [
          {
            date: '2026-04-01',
            team: '기존팀',
            lineName: 'OLD',
            productName: 'OLD',
            amount: 10,
            sourceFileName: 'old.xlsx',
            sourceFingerprint: 'old-fingerprint',
          },
        ],
      },
    ],
    archives: [
      {
        id: 'archive-old',
        fileName: 'old.xlsx',
      },
    ],
  };

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
    DEFAULT_UTIL_PRODUCTION_PERIOD: { startDay: 1 },
    UTIL_PRODUCTION_ARCHIVE_SOURCE_LABEL_DEFAULT: 'default',
    UTIL_PRODUCTION_DAILY_STATE: utilProductionState,
    UTIL_PRODUCTION_DAILY_DATA: utilProductionState.teams,
    UTIL_PRODUCTION_ARCHIVE_META: utilProductionState.archives,
    UTIL_ELECTRIC_DATA: [{ name: 'Line Alpha' }, { name: 'Line Gamma' }],
    UTIL_GAS_DATA: [],
    UTIL_WASTE_DATA: [],
    PortalData: {},
    document: {
      querySelectorAll() {
        return [];
      },
    },
    parseUtilDateKey: parseDateKey,
    parseUtilAmount(value) {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    },
    parseUtilPercentAmount(value) {
      if (value === null || value === undefined || String(value).trim() === '') return null;
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    },
    clampUtilDay(value, fallback) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.min(31, Math.max(1, Math.floor(numeric)));
    },
    normalizeUtilProductionArchiveMeta(value) {
      return value;
    },
    KpiUtilityServerRuntime: {
      queueUtilProductionDailyServerWrite() {
        queuedWriteCount += 1;
        return true;
      },
      supportsUtilProductionServerPersistence() {
        return true;
      },
    },
  };

  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    [
      productionImportSource,
      'globalThis.__testExports = {',
      '  mergeUtilProductionExtractorRows,',
      '  getTeams: () => UTIL_PRODUCTION_DAILY_DATA,',
      '  getArchives: () => UTIL_PRODUCTION_ARCHIVE_META,',
      '};',
    ].join('\n'),
    context,
    { filename: 'KPI.util.production-import.js' }
  );
  context.__getQueuedWriteCount = () => queuedWriteCount;
  return context;
}

test('production import merge replaces existing rows and clears archive metadata while deduping incoming rows', () => {
  const context = createProductionImportContext();

  const result = context.__testExports.mergeUtilProductionExtractorRows([
    {
      date: '2026-05-01',
      team: 'Line Alpha',
      lineName: '1호기',
      productName: '제품A',
      amount: 50,
    },
    {
      date: '2026-05-01',
      team: 'Line Alpha',
      lineName: '1호기',
      productName: '제품A',
      amount: 50,
      moistureExcludedYield: 98,
    },
    {
      date: '2026-05-02',
      team: 'Line Gamma',
      lineName: '2호기',
      productName: '제품B',
      amount: 60,
    },
  ]);

  const teams = JSON.parse(JSON.stringify(context.__testExports.getTeams()));

  assert.equal(result.addedCount, 2);
  assert.equal(result.skippedCount, 0);
  assert.equal(result.patchedCount, 1);
  assert.deepEqual(result.addedTeams, ['Line Alpha', 'Line Gamma']);
  assert.deepEqual(
    teams.map((team) => team.name),
    ['Line Alpha', 'Line Gamma']
  );
  assert.equal(teams[0].entries.length, 1);
  assert.equal(teams[0].entries[0].amount, 50);
  assert.equal(teams[0].entries[0].moistureExcludedYield, 98);
  assert.equal(teams[0].entries[0].sourceFileName, '');
  assert.equal(teams[1].entries.length, 1);
  assert.equal(teams[1].entries[0].amount, 60);
  assert.equal(context.__testExports.getArchives().length, 0);
  assert.equal(context.__getQueuedWriteCount(), 1);
});
