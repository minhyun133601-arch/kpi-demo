export const PERMISSION_KEYS = Object.freeze({
  UTIL_METERING_APP: 'util.metering.app',
  UTIL_ENERGY_ELECTRIC: 'util.energy.electric',
  UTIL_ENERGY_GAS: 'util.energy.gas',
  UTIL_ENERGY_WASTEWATER: 'util.energy.wastewater',
  UTIL_PRODUCTION_DAILY: 'util.production.daily',
  UTIL_PRODUCTION_ARCHIVE: 'util.production.archive',
  WORK_MONTHLY_PLAN: 'work.plan.monthly',
  WORK_TEAM_CALENDAR: 'work.team_calendar',
  WORK_PERSON_OPERATOR_B: 'work.person.operator_b',
  WORK_PERSON_OPERATOR_C: 'work.person.operator_c',
  WORK_PERSON_OPERATOR_D: 'work.person.operator_d',
  WORK_PERSON_OPERATOR_E: 'work.person.operator_e',
  WORK_PERSON_OPERATOR_F: 'work.person.operator_f',
  WORK_PERSON_OPERATOR_G: 'work.person.operator_g',
  DATA_EQUIPMENT_HISTORY: 'data.equipment_history',
  AUDIT_LUX: 'audit.lux',
  AUDIT_REGULATION: 'audit.regulation',
  AUDIT_LEGAL_FACILITY: 'audit.legal_facility'
});

const WORK_PERMISSION_KEY_BY_DATA_KEY = Object.freeze({
  work_monthly_plan: PERMISSION_KEYS.WORK_MONTHLY_PLAN,
  work_history_records: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
  work_operator_b: PERMISSION_KEYS.WORK_PERSON_OPERATOR_B,
  work_operator_c: PERMISSION_KEYS.WORK_PERSON_OPERATOR_C,
  work_operator_d: PERMISSION_KEYS.WORK_PERSON_OPERATOR_D,
  work_operator_e: PERMISSION_KEYS.WORK_PERSON_OPERATOR_E,
  work_operator_f: PERMISSION_KEYS.WORK_PERSON_OPERATOR_F,
  work_operator_g: PERMISSION_KEYS.WORK_PERSON_OPERATOR_G
});

const AUDIT_PERMISSION_KEY_BY_DATA_KEY = Object.freeze({
  audit_lux: PERMISSION_KEYS.AUDIT_LUX,
  audit_legal_facility: PERMISSION_KEYS.AUDIT_LEGAL_FACILITY,
  audit_regulation: PERMISSION_KEYS.AUDIT_REGULATION
});

export function getWorkPermissionKey(dataKey) {
  const normalized = String(dataKey || '').trim();
  if (/^work_team_calendar_/.test(normalized)) {
    return PERMISSION_KEYS.WORK_TEAM_CALENDAR;
  }
  return WORK_PERMISSION_KEY_BY_DATA_KEY[normalized] || '';
}

export function getAuditPermissionKey(dataKey) {
  return AUDIT_PERMISSION_KEY_BY_DATA_KEY[String(dataKey || '').trim()] || '';
}
