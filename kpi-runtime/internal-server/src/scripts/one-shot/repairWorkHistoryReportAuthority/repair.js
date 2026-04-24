import fs from 'node:fs/promises';

import { PERMISSION_KEYS } from '../../../lib/permission-registry.js';
import { findLatestDocumentByOwner } from '../../../repositories/documents.js';
import { deleteModuleRecord } from '../../../repositories/modules.js';
import { deleteDocument, getDocumentFile, initializeFileStorage, saveBase64Document } from '../../../services/files.js';

import {
  REPORT_TEAM_KEY,
  WORK_ATTACHMENT_TYPE,
  WORK_FILE_CATEGORY,
  WORK_OWNER_DOMAIN,
  WORK_RECORD_KEY,
} from './constants.js';
import { buildManagedAttachment, buildNextReportRecord, buildWorkOwnerKey, findMatchingReportRecordIndex } from './records.js';
import { compareRecordsDesc, createSummary, getAuditEntries, isPlainObject, cloneJson, normalizeText } from './normalizers.js';

async function resolveOrCreateWorkDocument(entry, permissionKey, options, summary) {
  const ownerKey = buildWorkOwnerKey(entry);
  let workDocument = await findLatestDocumentByOwner({
    ownerDomain: WORK_OWNER_DOMAIN,
    ownerKey,
    fileCategory: WORK_FILE_CATEGORY,
  });
  if (workDocument) {
    summary.reusedWorkDocumentCount += 1;
    return { workDocument, ownerKey, sourceDocumentId: entry.documentId, status: 'reused' };
  }

  const auditLoaded = await getDocumentFile(entry.documentId);
  if (!auditLoaded?.record?.id) {
    summary.unresolvedCount += 1;
    return { workDocument: null, ownerKey, sourceDocumentId: entry.documentId, status: 'missing_audit_document' };
  }

  if (!options.write) {
    return { workDocument: null, ownerKey, sourceDocumentId: entry.documentId, status: 'pending_copy' };
  }

  const binary = await fs.readFile(auditLoaded.fullPath);
  workDocument = await saveBase64Document({
    actorUserId: null,
    permissionKey,
    ownerDomain: WORK_OWNER_DOMAIN,
    ownerKey,
    fileCategory: WORK_FILE_CATEGORY,
    originalName: entry.originalName,
    mimeType: entry.mimeType,
    base64Data: binary.toString('base64'),
    metadata: {
      dataKey: WORK_RECORD_KEY,
      team: REPORT_TEAM_KEY,
      startDate: entry.dateKey,
      endDate: entry.dateKey,
      attachmentType: WORK_ATTACHMENT_TYPE,
      sourceDocumentId: entry.documentId,
      sourceOwnerDomain: 'audit.monthly_report',
    },
  });
  summary.copiedWorkDocumentCount += 1;
  return { workDocument, ownerKey, sourceDocumentId: entry.documentId, status: 'copied' };
}

export async function repairAuthority(workRecord, auditRecord, options) {
  const auditEntries = getAuditEntries(auditRecord);
  const summary = createSummary({ workRecord, auditRecord, auditEntries });
  if (!auditEntries.length) {
    return {
      nextPayload: cloneJson(workRecord?.payload ?? {}),
      payloadChanged: false,
      summary,
    };
  }

  const workPayload = cloneJson(isPlainObject(workRecord?.payload) ? workRecord.payload : {});
  workPayload.meta = isPlainObject(workPayload.meta) ? workPayload.meta : {};
  workPayload.teams = isPlainObject(workPayload.teams) ? workPayload.teams : {};
  const team4Records = Array.isArray(workPayload.teams[REPORT_TEAM_KEY])
    ? workPayload.teams[REPORT_TEAM_KEY].map((record) => cloneJson(record))
    : [];
  const permissionKey = normalizeText(workRecord?.permission_key) || PERMISSION_KEYS.WORK_TEAM_CALENDAR;

  if (options.write) {
    await initializeFileStorage();
  }

  const auditDocumentIdsToDelete = [];
  for (const entry of auditEntries) {
    const resolved = await resolveOrCreateWorkDocument(entry, permissionKey, options, summary);
    const itemSummary = {
      originalName: entry.originalName,
      dateKey: entry.dateKey,
      sourceDocumentId: resolved.sourceDocumentId,
      workOwnerKey: resolved.ownerKey,
      status: resolved.status,
      workDocumentId: normalizeText(resolved.workDocument?.id),
    };

    if (!resolved.workDocument) {
      summary.items.push(itemSummary);
      continue;
    }

    const attachment = buildManagedAttachment(resolved.workDocument);
    const recordIndex = findMatchingReportRecordIndex(team4Records, entry);
    if (recordIndex >= 0) {
      team4Records[recordIndex] = buildNextReportRecord(team4Records[recordIndex], entry, attachment);
      summary.updatedExistingRecordCount += 1;
      itemSummary.recordAction = 'updated';
    } else {
      team4Records.push(buildNextReportRecord(null, entry, attachment));
      summary.createdRecordCount += 1;
      itemSummary.recordAction = 'created';
    }

    auditDocumentIdsToDelete.push(entry.documentId);
    summary.items.push(itemSummary);
  }

  team4Records.sort(compareRecordsDesc);
  workPayload.teams[REPORT_TEAM_KEY] = team4Records;
  if (summary.updatedExistingRecordCount > 0 || summary.createdRecordCount > 0) {
    workPayload.meta.updatedAt = new Date().toISOString();
  }

  return {
    nextPayload: workPayload,
    payloadChanged: JSON.stringify(workRecord?.payload ?? {}) !== JSON.stringify(workPayload),
    summary,
    auditDocumentIdsToDelete,
  };
}

export async function cleanupAuditAuthority(auditRecord, auditDocumentIds, summary, options) {
  if (!options.write || summary.unresolvedCount > 0) {
    return;
  }

  const uniqueDocumentIds = [...new Set(auditDocumentIds.map((value) => normalizeText(value)).filter(Boolean))];
  for (const documentId of uniqueDocumentIds) {
    const deleted = await deleteDocument({
      actorUserId: null,
      documentId,
    });
    if (deleted?.id) {
      summary.deletedAuditDocumentCount += 1;
    }
  }

  if (auditRecord?.id) {
    const deletedRecord = await deleteModuleRecord({
      moduleKey: auditRecord.module_key,
      recordKey: auditRecord.record_key,
      expectedVersion: auditRecord.version,
    });
    summary.deletedAuditRecord = Boolean(deletedRecord?.id);
  }
}
