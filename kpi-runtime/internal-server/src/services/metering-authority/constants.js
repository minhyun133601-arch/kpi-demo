import { PERMISSION_KEYS } from '../../lib/permission-registry.js';

export const METERING_MODULE_KEY = 'util_metering';
export const METERING_LEGACY_SHARED_STORE_RECORD_KEY = 'shared_store_v1';
export const METERING_AUTHORITY_UI_STATE_RECORD_KEY = 'ui_state_v1';
export const METERING_AUTHORITY_RECORD_KEYS = Object.freeze([
  METERING_AUTHORITY_UI_STATE_RECORD_KEY,
  'electric_v1',
  'gas_v1',
  'waste_v1',
  'production_v1',
]);
export const METERING_PERMISSION_KEY = PERMISSION_KEYS.UTIL_METERING_APP;
export const RESOURCE_TYPES = Object.freeze(['electric', 'gas', 'waste', 'production']);
export const RESOURCE_RECORD_KEY_BY_TYPE = Object.freeze({
  electric: 'electric_v1',
  gas: 'gas_v1',
  waste: 'waste_v1',
  production: 'production_v1',
});
export const ELECTRIC_DATASET_META_KEYS = Object.freeze([
  'presetImportVersion',
  'entryResetVersion',
  'entryStatusBaselineVersion',
  'equipmentFactorMigrationVersion',
  'teamAssignmentBaselineVersion',
  'historicalEntryValueFixVersion',
  'stickMeterSplitVersion',
]);
