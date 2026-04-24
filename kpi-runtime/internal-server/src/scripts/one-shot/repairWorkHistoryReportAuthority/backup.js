import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDir } from '../../../lib/fs.js';

import { backupDir } from './constants.js';

export async function writeBackupSnapshot(workRecord, auditRecord) {
  await ensureDir(backupDir);
  const filePath = path.join(backupDir, `work-history-report-authority-${Date.now()}.json`);
  await fs.writeFile(
    filePath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        workHistoryRecord: workRecord
          ? {
              moduleKey: workRecord.module_key,
              recordKey: workRecord.record_key,
              version: workRecord.version,
              updatedAt: workRecord.updated_at,
              payload: workRecord.payload,
            }
          : null,
        auditMonthlyReportRecord: auditRecord
          ? {
              moduleKey: auditRecord.module_key,
              recordKey: auditRecord.record_key,
              version: auditRecord.version,
              updatedAt: auditRecord.updated_at,
              payload: auditRecord.payload,
            }
          : null,
      },
      null,
      2
    ),
    'utf8'
  );
  return filePath;
}
