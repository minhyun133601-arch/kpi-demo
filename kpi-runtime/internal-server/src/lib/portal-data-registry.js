import { PERMISSION_KEYS } from './permission-registry.js';

export const PORTAL_DATA_MODULE_KEY = 'portal_data';
export const WORK_RUNTIME_MODULE_KEY = 'work_runtime';

export const CURRENT_PORTAL_DATA_RECORDS = Object.freeze([
  {
    recordKey: 'audit_lux',
    permissionKey: PERMISSION_KEYS.AUDIT_LUX,
    sourceKey: 'audit_lux',
  },
  {
    recordKey: 'audit_regulation',
    permissionKey: PERMISSION_KEYS.AUDIT_REGULATION,
    sourceKey: 'audit_regulation',
  },
  {
    recordKey: 'audit_legal_facility',
    permissionKey: PERMISSION_KEYS.AUDIT_LEGAL_FACILITY,
    sourceKey: 'audit_legal_facility',
  },
  {
    recordKey: 'data_equipment_history_card',
    permissionKey: PERMISSION_KEYS.DATA_EQUIPMENT_HISTORY,
    sourceKey: 'data_equipment_history_card',
  },
  {
    recordKey: 'work_operator_b',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_B,
    sourceKey: 'work_operator_b',
  },
  {
    recordKey: 'work_operator_c',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_C,
    sourceKey: 'work_operator_c',
  },
  {
    recordKey: 'work_operator_d',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_D,
    sourceKey: 'work_operator_d',
  },
  {
    recordKey: 'work_operator_e',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_E,
    sourceKey: 'work_operator_e',
  },
  {
    recordKey: 'work_operator_f',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_F,
    sourceKey: 'work_operator_f',
  },
  {
    recordKey: 'work_operator_g',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_OPERATOR_G,
    sourceKey: 'work_operator_g',
  },
  {
    recordKey: 'work_monthly_plan',
    permissionKey: PERMISSION_KEYS.WORK_MONTHLY_PLAN,
    sourceKey: 'work_monthly_plan',
  },
  {
    recordKey: 'work_history_records',
    permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
    sourceKey: 'work_history_records',
  },
]);

export const WORK_RUNTIME_BOOTSTRAP_RECORDS = Object.freeze([
  {
    recordKey: 'work_team_calendar_team1_part1',
    permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
    sourceKey: 'work_team_calendar_team1_part1',
  },
  {
    recordKey: 'work_team_calendar_team1_part2',
    permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
    sourceKey: 'work_team_calendar_team1_part2',
  },
  {
    recordKey: 'work_team_calendar_team2',
    permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
    sourceKey: 'work_team_calendar_team2',
  },
  {
    recordKey: 'work_team_calendar_team3',
    permissionKey: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
    sourceKey: 'work_team_calendar_team3',
  },
]);

const KNOWN_MODULE_RECORD_DEFINITIONS = Object.freeze([
  ...CURRENT_PORTAL_DATA_RECORDS.map((record) => ({
    ...record,
    moduleKey: PORTAL_DATA_MODULE_KEY,
  })),
  ...WORK_RUNTIME_BOOTSTRAP_RECORDS.map((record) => ({
    ...record,
    moduleKey: WORK_RUNTIME_MODULE_KEY,
  })),
]);

export function findModuleRecordDefinition(moduleKey, recordKey) {
  const normalizedModuleKey = String(moduleKey || '').trim();
  const normalizedRecordKey = String(recordKey || '').trim();
  if (!normalizedModuleKey || !normalizedRecordKey) return null;

  return (
    KNOWN_MODULE_RECORD_DEFINITIONS.find(
      (record) => record.moduleKey === normalizedModuleKey && record.recordKey === normalizedRecordKey
    ) || null
  );
}

export function getModuleRecordPermissionKey(moduleKey, recordKey) {
  return findModuleRecordDefinition(moduleKey, recordKey)?.permissionKey || '';
}
