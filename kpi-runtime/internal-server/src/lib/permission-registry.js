export const PERMISSION_KEYS = Object.freeze({
  UTIL_METERING_APP: 'util.metering.app',
  UTIL_ENERGY_ELECTRIC: 'util.energy.electric',
  UTIL_ENERGY_GAS: 'util.energy.gas',
  UTIL_ENERGY_WASTEWATER: 'util.energy.wastewater',
  UTIL_PRODUCTION_DAILY: 'util.production.daily',
  UTIL_PRODUCTION_ARCHIVE: 'util.production.archive',
  WORK_MONTHLY_PLAN: 'work.plan.monthly',
  WORK_TEAM_CALENDAR: 'work.team_calendar',
  WORK_PERSON_KIM_MINGYU: 'work.person.kim_mingyu',
  WORK_PERSON_SHIN_TAESEOB: 'work.person.shin_taeseob',
  WORK_PERSON_AHN_JUNSOO: 'work.person.ahn_junsoo',
  WORK_PERSON_SHIN_JUNGRAE: 'work.person.shin_jungrae',
  WORK_PERSON_LEE_HYOSEOK: 'work.person.lee_hyoseok',
  WORK_PERSON_KIM_MINHYUN: 'work.person.kim_minhyun',
  AUDIT_LUX: 'audit.lux',
  AUDIT_REGULATION: 'audit.regulation'
});

const WORK_PERMISSION_KEY_BY_DATA_KEY = Object.freeze({
  work_monthly_plan: PERMISSION_KEYS.WORK_MONTHLY_PLAN,
  work_history_records: PERMISSION_KEYS.WORK_TEAM_CALENDAR,
  work_kim_mingyu: PERMISSION_KEYS.WORK_PERSON_KIM_MINGYU,
  work_shin_taeseob: PERMISSION_KEYS.WORK_PERSON_SHIN_TAESEOB,
  work_ahn_junsoo: PERMISSION_KEYS.WORK_PERSON_AHN_JUNSOO,
  work_shin_jungrae: PERMISSION_KEYS.WORK_PERSON_SHIN_JUNGRAE,
  work_lee_hyoseok: PERMISSION_KEYS.WORK_PERSON_LEE_HYOSEOK,
  work_kim_minhyun: PERMISSION_KEYS.WORK_PERSON_KIM_MINHYUN
});

const AUDIT_PERMISSION_KEY_BY_DATA_KEY = Object.freeze({
  audit_lux: PERMISSION_KEYS.AUDIT_LUX,
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
