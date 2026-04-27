import fs from 'node:fs/promises';
import vm from 'node:vm';

import { saveMeteringAuthorityStore } from '../services/metering-authority.js';
import { saveUtilProductionDailyState } from '../services/util-production-daily.js';

const DEMO_DATA_URL = new URL('../../../demo/KPI.demo-data.js', import.meta.url);

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function loadDemoFixture() {
  const source = await fs.readFile(DEMO_DATA_URL, 'utf8');
  const sandbox = {
    console,
    window: {
      PortalData: {},
    },
  };
  vm.runInNewContext(source, sandbox, {
    filename: DEMO_DATA_URL.pathname,
  });

  const utilProductionState = sandbox.window.PortalData?.util_production_daily;
  const meteringStore = sandbox.window.__LOCAL_APP_STORE__;
  if (!isPlainObject(utilProductionState)) {
    throw new Error('portfolio_util_production_fixture_missing');
  }
  if (!isPlainObject(meteringStore)) {
    throw new Error('portfolio_metering_fixture_missing');
  }

  return {
    utilProductionState,
    meteringStore,
  };
}

function countUtilProductionEntries(state) {
  return (Array.isArray(state?.teams) ? state.teams : []).reduce(
    (sum, team) => sum + (Array.isArray(team?.entries) ? team.entries.length : 0),
    0
  );
}

function countEquipmentEntries(store, resourceType) {
  const entries = store?.resourceDatasets?.[resourceType]?.equipmentEntries;
  return isPlainObject(entries) ? Object.keys(entries).length : 0;
}

async function main() {
  const { utilProductionState, meteringStore } = await loadDemoFixture();
  const utilResult = await saveUtilProductionDailyState({
    state: utilProductionState,
    updatedByUserId: null,
  });
  const meteringResult = await saveMeteringAuthorityStore({
    store: meteringStore,
    updatedByUserId: null,
  });

  console.log(JSON.stringify({
    ok: true,
    utilProduction: {
      version: utilResult.meta?.version || 0,
      teams: Array.isArray(utilResult.state?.teams) ? utilResult.state.teams.length : 0,
      entries: countUtilProductionEntries(utilResult.state),
      archives: Array.isArray(utilResult.state?.archives) ? utilResult.state.archives.length : 0,
    },
    metering: {
      version: meteringResult.meta?.version || 0,
      electricEquipmentEntryDays: countEquipmentEntries(meteringResult.store, 'electric'),
      gasEquipmentEntryDays: countEquipmentEntries(meteringResult.store, 'gas'),
      monthlyElectricMonths: Object.keys(meteringResult.store?.resourceDatasets?.electric?.teamMonthlyEntries || {}).length,
      monthlyWasteMonths: Object.keys(meteringResult.store?.resourceDatasets?.waste?.teamMonthlyEntries || {}).length,
    },
  }));
}

main().catch((error) => {
  console.error(JSON.stringify({
    ok: false,
    error: error?.message || String(error),
  }));
  process.exitCode = 1;
});
