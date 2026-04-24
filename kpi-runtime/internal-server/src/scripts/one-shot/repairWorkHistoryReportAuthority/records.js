import {
  REPORT_CATEGORY_GROUP,
  REPORT_TEAM_KEY,
  WORK_ATTACHMENT_TYPE,
  WORK_FILE_CATEGORY,
  WORK_RECORD_KEY,
} from './constants.js';
import { cloneJson, getAttachmentFileName, isPlainObject, normalizeText, parseDateKey } from './normalizers.js';

export function createEmptyAttachmentSlots() {
  return {
    billing: null,
    report: null,
  };
}

export function buildWorkOwnerKey(entry) {
  return [WORK_RECORD_KEY, REPORT_TEAM_KEY, WORK_ATTACHMENT_TYPE, entry.dateKey, entry.originalName]
    .filter(Boolean)
    .join(':');
}

function buildDocumentViewUrl(documentId) {
  return `/api/files/${encodeURIComponent(documentId)}/view`;
}

function buildDocumentDownloadUrl(documentId) {
  return `/api/files/${encodeURIComponent(documentId)}/download`;
}

export function buildManagedAttachment(documentRecord) {
  return {
    attachmentType: WORK_ATTACHMENT_TYPE,
    originalName: normalizeText(documentRecord.original_name),
    storedName: normalizeText(documentRecord.stored_name),
    url: buildDocumentViewUrl(documentRecord.id),
    previewUrl: buildDocumentViewUrl(documentRecord.id),
    downloadUrl: buildDocumentDownloadUrl(documentRecord.id),
    size: Number(documentRecord.byte_size) || 0,
    mimeType: normalizeText(documentRecord.mime_type) || 'application/octet-stream',
    documentId: normalizeText(documentRecord.id),
    storageRelPath: normalizeText(documentRecord.storage_rel_path),
    fileCategory: normalizeText(documentRecord.file_category) || WORK_FILE_CATEGORY,
  };
}

export function getExistingReportIdentity(record) {
  const reportAttachment = isPlainObject(record?.attachmentSlots?.report)
    ? record.attachmentSlots.report
    : isPlainObject(record?.reportAttachment)
      ? record.reportAttachment
      : null;
  const fileName = getAttachmentFileName(reportAttachment) || normalizeText(record?.workContent);
  const dateKey = parseDateKey(record?.startDate || record?.endDate || fileName);
  return {
    fileName: normalizeText(fileName).toLowerCase(),
    dateKey,
  };
}

export function findMatchingReportRecordIndex(records, entry) {
  const entryFileName = normalizeText(entry.originalName).toLowerCase();
  return records.findIndex((record) => {
    if (!isPlainObject(record)) return false;
    if (normalizeText(record.team) !== REPORT_TEAM_KEY) return false;
    if (normalizeText(record.categoryGroup) !== REPORT_CATEGORY_GROUP) return false;

    const identity = getExistingReportIdentity(record);
    return identity.dateKey === entry.dateKey && identity.fileName === entryFileName;
  });
}

export function buildNextReportRecord(existingRecord, entry, attachment) {
  const nextRecord = isPlainObject(existingRecord) ? cloneJson(existingRecord) : {};
  const existingSlots = isPlainObject(nextRecord.attachmentSlots)
    ? cloneJson(nextRecord.attachmentSlots)
    : createEmptyAttachmentSlots();
  const billingAttachment =
    existingSlots.billing && isPlainObject(existingSlots.billing)
      ? cloneJson(existingSlots.billing)
      : isPlainObject(nextRecord.billingAttachment)
        ? cloneJson(nextRecord.billingAttachment)
        : null;

  nextRecord.team = REPORT_TEAM_KEY;
  nextRecord.startDate = entry.dateKey;
  nextRecord.endDate = entry.dateKey;
  nextRecord.categoryGroup = REPORT_CATEGORY_GROUP;
  nextRecord.category = normalizeText(nextRecord.category);
  nextRecord.kpi = false;
  nextRecord.assignees =
    Array.isArray(nextRecord.assignees) && nextRecord.assignees.length
      ? nextRecord.assignees.map((item) => normalizeText(item)).filter(Boolean)
      : ['미정'];
  nextRecord.assignee = normalizeText(nextRecord.assignee) || nextRecord.assignees.join(', ');
  nextRecord.workContent = normalizeText(nextRecord.workContent) || entry.workContent || entry.originalName;
  nextRecord.remarks = normalizeText(nextRecord.remarks);
  nextRecord.attachmentSlots = {
    billing: billingAttachment,
    report: cloneJson(attachment),
  };
  nextRecord.billingAttachment = billingAttachment ? cloneJson(billingAttachment) : null;
  nextRecord.reportAttachment = cloneJson(attachment);
  nextRecord.attachments = [billingAttachment, attachment].filter(Boolean).map((item) => cloneJson(item));
  return nextRecord;
}
