import { appendAuditLog } from '../repositories/audit-log.js';
import { upsertModuleRecord } from '../repositories/modules.js';

function resolveModuleRecordActionKey(version) {
  return Number(version) <= 1 ? 'module.record.create' : 'module.record.update';
}

export async function saveModuleRecord(input) {
  const record = await upsertModuleRecord(input);
  const actorUserId = input.updatedByUserId || null;

  if (actorUserId) {
    await appendAuditLog({
      actorUserId,
      actionKey: resolveModuleRecordActionKey(record.version),
      targetType: 'module_record',
      targetKey: `${record.module_key}:${record.record_key}`,
      detail: {
        moduleKey: record.module_key,
        recordKey: record.record_key,
        permissionKey: record.permission_key,
        version: record.version
      }
    });
  }

  return record;
}
