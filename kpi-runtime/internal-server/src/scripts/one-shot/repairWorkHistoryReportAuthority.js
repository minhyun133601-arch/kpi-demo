import { closePool } from '../../db/pool.js';
import { PERMISSION_KEYS } from '../../lib/permission-registry.js';
import { findModuleRecord, upsertModuleRecord } from '../../repositories/modules.js';

import { writeBackupSnapshot } from './repairWorkHistoryReportAuthority/backup.js';
import {
  AUDIT_RECORD_KEY,
  MODULE_KEY,
  WORK_RECORD_KEY,
} from './repairWorkHistoryReportAuthority/constants.js';
import { normalizeText, parseArgs } from './repairWorkHistoryReportAuthority/normalizers.js';
import { cleanupAuditAuthority, repairAuthority } from './repairWorkHistoryReportAuthority/repair.js';

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [workRecord, auditRecord] = await Promise.all([
    findModuleRecord(MODULE_KEY, WORK_RECORD_KEY),
    findModuleRecord(MODULE_KEY, AUDIT_RECORD_KEY),
  ]);

  if (!workRecord) {
    throw new Error('work_history_record_not_found');
  }

  const { nextPayload, payloadChanged, summary, auditDocumentIdsToDelete = [] } = await repairAuthority(
    workRecord,
    auditRecord,
    options
  );

  if (!summary.auditEntryCount) {
    console.log(
      JSON.stringify(
        {
          ok: true,
          mode: options.write ? 'write' : 'preview',
          summary,
        },
        null,
        2
      )
    );
    return;
  }

  if (options.write) {
    summary.backupPath = await writeBackupSnapshot(workRecord, auditRecord);
    if (payloadChanged) {
      const savedRecord = await upsertModuleRecord({
        moduleKey: workRecord.module_key,
        recordKey: workRecord.record_key,
        permissionKey: normalizeText(workRecord.permission_key) || PERMISSION_KEYS.WORK_TEAM_CALENDAR,
        payload: nextPayload,
        updatedByUserId: null,
        expectedVersion: workRecord.version,
      });
      summary.workRecordVersion = savedRecord.version;
    }
    await cleanupAuditAuthority(auditRecord, auditDocumentIdsToDelete, summary, options);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        mode: options.write ? 'write' : 'preview',
        summary,
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(
      JSON.stringify(
        {
          ok: false,
          error: error.message,
        },
        null,
        2
      )
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool().catch(() => {});
  });
