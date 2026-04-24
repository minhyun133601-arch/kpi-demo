import fs from 'node:fs/promises';
import path from 'node:path';

import { ensureDir } from '../../../lib/fs.js';

import { backupDir } from './constants.js';

export async function writeBackupSnapshot(records) {
  await ensureDir(backupDir);
  const safeRecords = Array.isArray(records) ? records : [];
  const versionLabel = safeRecords.length
    ? safeRecords
        .map((record) => `${record.record_key}-v${record.version}`)
        .sort()
        .join('__')
    : 'empty';
  const filePath = path.join(
    backupDir,
    `metering-authority-${versionLabel}-${Date.now()}.json`
  );
  await fs.writeFile(
    filePath,
    JSON.stringify(
      safeRecords.map((record) => ({
        exportedAt: new Date().toISOString(),
        moduleKey: record.module_key,
        recordKey: record.record_key,
        version: record.version,
        updatedAt: record.updated_at,
        payload: record.payload,
      })),
      null,
      2
    ),
    'utf8'
  );
  return filePath;
}
