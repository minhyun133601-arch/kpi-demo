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
    recordKey: 'work_kim_mingyu',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_KIM_MINGYU,
    sourceKey: 'work_kim_mingyu',
  },
  {
    recordKey: 'work_shin_taeseob',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_SHIN_TAESEOB,
    sourceKey: 'work_shin_taeseob',
  },
  {
    recordKey: 'work_ahn_junsoo',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_AHN_JUNSOO,
    sourceKey: 'work_ahn_junsoo',
  },
  {
    recordKey: 'work_shin_jungrae',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_SHIN_JUNGRAE,
    sourceKey: 'work_shin_jungrae',
  },
  {
    recordKey: 'work_lee_hyoseok',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_LEE_HYOSEOK,
    sourceKey: 'work_lee_hyoseok',
  },
  {
    recordKey: 'work_kim_minhyun',
    permissionKey: PERMISSION_KEYS.WORK_PERSON_KIM_MINHYUN,
    sourceKey: 'work_kim_minhyun',
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
