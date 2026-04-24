import { WORK_RUNTIME_BOOTSTRAP_RECORDS, WORK_RUNTIME_MODULE_KEY } from './portal-data-registry.js';
import { findModuleRecord, upsertModuleRecord } from '../repositories/modules.js';

const WORK_RUNTIME_MODULE_NAME_BY_RECORD_KEY = Object.freeze({
  work_team_calendar_team1_part1: 'team1_part1_calendar',
  work_team_calendar_team1_part2: 'team1_part2_calendar',
  work_team_calendar_team2: 'team2_calendar',
  work_team_calendar_team3: 'team3_calendar'
});

function buildDefaultWorkRuntimePayload(recordKey) {
  const now = new Date().toISOString();
  return {
    meta: {
      moduleKey: recordKey,
      moduleName: WORK_RUNTIME_MODULE_NAME_BY_RECORD_KEY[recordKey] || recordKey,
      version: 1,
      updatedAt: now
    },
    weeks: [],
    teamCalendar: {
      entries: {}
    }
  };
}

export async function seedWorkRuntimeBootstrap({ dryRun = false } = {}) {
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      moduleKey: WORK_RUNTIME_MODULE_KEY,
      expectedRecordCount: WORK_RUNTIME_BOOTSTRAP_RECORDS.length,
      existingCount: 0,
      createdCount: WORK_RUNTIME_BOOTSTRAP_RECORDS.length,
      existing: [],
      created: WORK_RUNTIME_BOOTSTRAP_RECORDS.map((recordDef) => ({
        recordKey: recordDef.recordKey,
        permissionKey: recordDef.permissionKey,
        version: null
      }))
    };
  }

  const created = [];
  const existing = [];

  for (const recordDef of WORK_RUNTIME_BOOTSTRAP_RECORDS) {
    const currentRecord = await findModuleRecord(WORK_RUNTIME_MODULE_KEY, recordDef.recordKey);
    if (currentRecord) {
      existing.push({
        recordKey: currentRecord.record_key,
        permissionKey: currentRecord.permission_key,
        version: currentRecord.version
      });
      continue;
    }

    const nextRecord = await upsertModuleRecord({
      moduleKey: WORK_RUNTIME_MODULE_KEY,
      recordKey: recordDef.recordKey,
      permissionKey: recordDef.permissionKey,
      payload: buildDefaultWorkRuntimePayload(recordDef.recordKey),
      updatedByUserId: null
    });

    created.push({
      recordKey: nextRecord.record_key,
      permissionKey: nextRecord.permission_key,
      version: nextRecord.version
    });
  }

  return {
    ok: true,
    dryRun: false,
    moduleKey: WORK_RUNTIME_MODULE_KEY,
    expectedRecordCount: WORK_RUNTIME_BOOTSTRAP_RECORDS.length,
    existingCount: existing.length,
    createdCount: created.length,
    existing,
    created
  };
}
