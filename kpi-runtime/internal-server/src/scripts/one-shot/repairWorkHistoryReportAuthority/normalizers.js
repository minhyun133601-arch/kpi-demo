export function normalizeText(value) {
  return String(value || '').trim();
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function cloneJson(value) {
  return JSON.parse(JSON.stringify(value ?? {}));
}

export function parseArgs(argv) {
  return {
    write: argv.includes('--write'),
  };
}

export function parseDateKey(value) {
  const direct = normalizeText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(direct)) {
    return direct;
  }

  const match = normalizeText(value).match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) return '';
  return `${match[1]}-${match[2]}-${match[3]}`;
}

export function getAttachmentFileName(attachment) {
  const direct = normalizeText(attachment?.originalName || attachment?.name || attachment?.fileName);
  if (direct) return direct;

  const sourcePath = normalizeText(
    attachment?.downloadUrl || attachment?.previewUrl || attachment?.url || attachment?.path
  );
  if (!sourcePath) return '';
  const normalizedPath = sourcePath.replace(/\\/g, '/');
  return normalizeText(normalizedPath.split('/').pop());
}

export function normalizeAuditEntry(entry) {
  if (!isPlainObject(entry)) return null;
  const originalName = normalizeText(entry.originalName || entry.fileName || entry.name);
  const dateKey = parseDateKey(entry.dateKey || entry.dateLabel || originalName || entry.title);
  const documentId = normalizeText(entry.documentId || entry.fileId);
  if (!originalName || !dateKey || !documentId) {
    return null;
  }

  return {
    originalName,
    dateKey,
    documentId,
    mimeType: normalizeText(entry.mimeType) || 'application/octet-stream',
    byteSize: Number(entry.byteSize) || 0,
    workContent: normalizeText(entry.name || originalName) || originalName,
  };
}

export function getAuditEntries(record) {
  const entries = Array.isArray(record?.payload?.entries) ? record.payload.entries : [];
  return entries
    .map((entry) => normalizeAuditEntry(entry))
    .filter(Boolean)
    .sort((left, right) => right.dateKey.localeCompare(left.dateKey));
}

export function compareRecordsDesc(left, right) {
  const endDiff = normalizeText(right?.endDate).localeCompare(normalizeText(left?.endDate));
  if (endDiff !== 0) return endDiff;

  const startDiff = normalizeText(right?.startDate).localeCompare(normalizeText(left?.startDate));
  if (startDiff !== 0) return startDiff;

  return normalizeText(left?.workContent).localeCompare(normalizeText(right?.workContent), 'ko');
}

export function createSummary({ workRecord, auditRecord, auditEntries }) {
  return {
    workRecordVersion: Number(workRecord?.version) || 0,
    auditRecordVersion: Number(auditRecord?.version) || 0,
    auditEntryCount: auditEntries.length,
    reusedWorkDocumentCount: 0,
    copiedWorkDocumentCount: 0,
    updatedExistingRecordCount: 0,
    createdRecordCount: 0,
    deletedAuditDocumentCount: 0,
    deletedAuditRecord: false,
    unresolvedCount: 0,
    backupPath: '',
    items: [],
  };
}
