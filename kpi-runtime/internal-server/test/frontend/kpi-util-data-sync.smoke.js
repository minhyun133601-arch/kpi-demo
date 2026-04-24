import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const dataSyncSource = await fs.readFile(
  new URL('../../../../utility/runtime/util/KPI.util.data-sync.js', import.meta.url),
  'utf8'
);

function createLegacyWasteTeams() {
  return [
    {
      name: 'Plant A',
      years: [
        {
          label: '2026',
          rows: [{ label: '4월', usage: 12, cost: 3000 }],
        },
      ],
    },
    {
      name: 'Plant B',
      years: [],
    },
  ];
}

function createDataSyncContext(options = {}) {
  let rebuildCount = 0;
  const context = {
    console,
    Date,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    Map,
    Promise,
    XLSX: {
      SSF: {
        parse_date_code() {
          return null;
        },
      },
    },
    __KPI_SERVER_RUNTIME_CONFIG__: {},
    __LOCAL_APP_STORE__: options.localAppStore ?? null,
    PortalData: {
      util_wastewater_data: {
        teams: createLegacyWasteTeams(),
      },
    },
    KpiMeteringBridge: {
      ensureIntegratedMeteringRuntime: async () => ({
        getWasteUtilityDatasetSnapshot: () => options.snapshot ?? { months: [], teams: {} },
      }),
    },
    document: {},
    rebuildUtilEntryCollections() {
      rebuildCount += 1;
    },
    renderUtilDualTabs() {},
    refreshUtilViewsAfterDataMutation() {},
  };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(
    [
      dataSyncSource,
      'globalThis.__testExports = {',
      '  getWasteData: () => UTIL_WASTE_DATA,',
      '  syncUtilWasteDataFromMetering,',
      '};',
    ].join('\n'),
    context,
    { filename: 'KPI.util.data-sync.js' }
  );
  context.__getRebuildCount = () => rebuildCount;
  return context;
}

function findWasteMonthRow(context, teamName = 'Plant A') {
  const team = context.__testExports.getWasteData().find((item) => item.name === teamName);
  const year = team?.years?.find((item) => String(item.label) === '2026');
  return year?.rows?.find((item) => item.label === '4월') || null;
}

test('util data sync preserves legacy wastewater data when metering store is not hydrated', async () => {
  const context = createDataSyncContext({
    localAppStore: null,
    snapshot: { months: [], teams: {} },
  });

  assert.equal(findWasteMonthRow(context).usage, 12);

  const changed = await context.__testExports.syncUtilWasteDataFromMetering({ force: true });

  assert.equal(changed, false);
  assert.equal(findWasteMonthRow(context).usage, 12);
  assert.equal(context.PortalData.util_wastewater_data.teams[0].years[0].rows[0].usage, 12);
  assert.equal(context.__getRebuildCount(), 0);
});

test('util data sync accepts empty wastewater snapshot after metering store hydration', async () => {
  const context = createDataSyncContext({
    localAppStore: { resourceDatasets: { waste: {} } },
    snapshot: { months: [], teams: {} },
  });

  const changed = await context.__testExports.syncUtilWasteDataFromMetering({ force: true });

  assert.equal(changed, true);
  assert.equal(findWasteMonthRow(context), null);
  assert.deepEqual(
    context.PortalData.util_wastewater_data.teams.map((team) => [team.name, team.years]),
    [
      ['Plant A', []],
      ['Plant B', []],
    ]
  );
  assert.equal(context.__getRebuildCount(), 1);
});
