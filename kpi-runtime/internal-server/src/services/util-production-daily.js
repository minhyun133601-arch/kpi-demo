import { appendAuditLog } from '../repositories/audit-log.js';
import {
  findUtilProductionDailyStateRow,
  listUtilProductionDailyArchives,
  listUtilProductionDailyEntries,
  replaceUtilProductionDailyState,
} from '../repositories/util-production-daily.js';
import { MODULE_KEY, PERMISSION_KEY, RECORD_KEY, DEFAULT_START_DAY } from './util-production-daily/constants.js';
import { clampStartDay } from './util-production-daily/normalizers.js';
import { buildStateMeta, buildStatePayload, normalizeStateSnapshot } from './util-production-daily/state.js';

async function loadStructuredState() {
  const [stateRow, entryRows, archiveRows] = await Promise.all([
    findUtilProductionDailyStateRow(),
    listUtilProductionDailyEntries(),
    listUtilProductionDailyArchives(),
  ]);

  const hasStructuredPayload =
    entryRows.length > 0 ||
    archiveRows.length > 0 ||
    clampStartDay(stateRow?.period_start_day) !== DEFAULT_START_DAY ||
    (Number.isInteger(stateRow?.version) && stateRow.version > 1) ||
    Boolean(stateRow?.updated_by_user_id);

  if (!hasStructuredPayload) {
    return null;
  }

  const effectiveStateRow =
    stateRow ||
    {
      period_start_day: DEFAULT_START_DAY,
      version: 1,
      updated_at: new Date().toISOString(),
    };

  return {
    source: 'structured_table',
    meta: buildStateMeta(effectiveStateRow),
    state: buildStatePayload(effectiveStateRow, entryRows, archiveRows),
  };
}

export async function loadUtilProductionDailyState() {
  return loadStructuredState();
}

export async function saveUtilProductionDailyState({ state, updatedByUserId }) {
  const normalizedState = normalizeStateSnapshot(state);
  const result = await replaceUtilProductionDailyState({
    periodStartDay: normalizedState.periodStartDay,
    entries: normalizedState.entries,
    archives: normalizedState.archives,
    updatedByUserId,
  });

  if (updatedByUserId) {
    await appendAuditLog({
      actorUserId: updatedByUserId,
      actionKey: 'util.production.daily.save',
      targetType: 'util_production_daily',
      targetKey: `${MODULE_KEY}:${RECORD_KEY}`,
      detail: {
        permissionKey: PERMISSION_KEY,
        version: result.stateRow?.version || 1,
        entryCount: result.entryRows.length,
        archiveCount: result.archiveRows.length,
      },
    });
  }

  return {
    source: 'structured_table',
    meta: buildStateMeta(result.stateRow),
    state: buildStatePayload(result.stateRow, result.entryRows, result.archiveRows),
  };
}
