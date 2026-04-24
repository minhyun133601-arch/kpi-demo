import { listModuleRecordsByModuleKey } from '../repositories/modules.js';
import { loadUtilProductionDailyState } from '../services/util-production-daily.js';
import { PORTAL_DATA_MODULE_KEY, WORK_RUNTIME_MODULE_KEY } from './portal-data-registry.js';
import { PERMISSION_KEYS } from './permission-registry.js';
import { buildPortalDataBootstrapPayload, splitReadableModuleRecords } from './portal-bootstrap/payload.js';
import { buildPortalRuntimeConfig } from './portal-bootstrap/runtime-config.js';
import {
  createPermissionProbe,
  PORTAL_DATA_BOOTSTRAP_PATH,
  serializeJsonForScript,
} from './portal-bootstrap/shared.js';
import { injectPortalDataBootstrap } from './portal-bootstrap/static.js';

export { injectPortalDataBootstrap, PORTAL_DATA_BOOTSTRAP_PATH };

function appendUtilProductionState(payload, utilProductionState) {
  if (utilProductionState?.state) {
    payload.portalData.util_production_daily = utilProductionState.state;
    payload.importedMeta.push({
      moduleKey: utilProductionState.meta?.moduleKey || 'util_production',
      recordKey: utilProductionState.meta?.recordKey || 'daily_state_v1',
      permissionKey: utilProductionState.meta?.permissionKey || PERMISSION_KEYS.UTIL_PRODUCTION_DAILY,
      version: utilProductionState.meta?.version || 1,
      updatedAt: utilProductionState.meta?.updatedAt || new Date().toISOString(),
    });
  } else {
    payload.missing.push('util_production_daily');
  }
}

export async function buildPortalDataBootstrapScript(auth, canAccessPermission) {
  const permissionProbe = createPermissionProbe(canAccessPermission);
  const [allRecords, allWorkRuntimeRecords] = await Promise.all([
    listModuleRecordsByModuleKey(PORTAL_DATA_MODULE_KEY),
    listModuleRecordsByModuleKey(WORK_RUNTIME_MODULE_KEY),
  ]);
  const [
    { readable: records, blocked: blockedPortalRecords },
    { readable: workRuntimeRecords, blocked: blockedWorkRuntimeRecords },
  ] = await Promise.all([
    splitReadableModuleRecords(allRecords, auth, permissionProbe),
    splitReadableModuleRecords(allWorkRuntimeRecords, auth, permissionProbe),
  ]);

  const payload = buildPortalDataBootstrapPayload(records, workRuntimeRecords, {
    knownPortalRecordKeys: new Set(allRecords.map((record) => record.record_key)),
    knownWorkRuntimeRecordKeys: new Set(allWorkRuntimeRecords.map((record) => record.record_key)),
  });

  const canReadUtilProduction = await permissionProbe(auth?.user, PERMISSION_KEYS.UTIL_PRODUCTION_DAILY, 'read');
  if (canReadUtilProduction) {
    appendUtilProductionState(payload, await loadUtilProductionDailyState());
  }

  const runtimeConfig = await buildPortalRuntimeConfig(auth, permissionProbe);
  const serializedPortalData = serializeJsonForScript(payload.portalData);
  const serializedMeta = serializeJsonForScript({
    moduleKey: PORTAL_DATA_MODULE_KEY,
    importedCount: payload.importedMeta.length,
    importedMeta: payload.importedMeta,
    missing: payload.missing,
    blocked: [...blockedPortalRecords, ...blockedWorkRuntimeRecords],
    generatedAt: new Date().toISOString(),
  });
  const serializedRuntimeConfig = serializeJsonForScript(runtimeConfig);
  const warningLine = payload.missing.length
    ? `console.warn('[kpi] portal_data bootstrap missing records:', ${serializeJsonForScript(payload.missing)});\n`
    : '';

  return [
    `window.__KPI_SERVER_RUNTIME_CONFIG__ = ${serializedRuntimeConfig};`,
    'window.PortalData = window.PortalData || {};',
    `Object.assign(window.PortalData, ${serializedPortalData});`,
    `window.__KPI_PORTAL_DATA_BOOTSTRAP__ = ${serializedMeta};`,
    warningLine,
    '',
  ].join('\n');
}
