import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { runtimePaths } from '../config.js';
import { resolveDocumentStorage } from '../lib/document-storage.js';
import { ensureDir } from '../lib/fs.js';
import { appendAuditLog } from '../repositories/audit-log.js';
import { createDocumentRecord, deleteDocumentById, findDocumentById } from '../repositories/documents.js';

function sanitizeFileName(name) {
  const safe = String(name || 'file').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_').trim();
  return safe || 'file';
}

function extensionFromName(name) {
  const ext = path.extname(String(name || '')).toLowerCase();
  return ext && ext.length <= 16 ? ext : '';
}

function sanitizeStorageFolderSegments(raw) {
  const joined = Array.isArray(raw)
    ? raw.map((segment) => String(segment || '').trim()).join('/')
    : String(raw || '').trim();
  if (!joined) return [];
  return joined
    .split(/[\\/]+/)
    .map((segment) => sanitizeFileName(segment))
    .filter((segment) => segment && segment !== '.' && segment !== '..');
}

export async function initializeFileStorage() {
  await ensureDir(runtimePaths.filesRoot);
  await ensureDir(runtimePaths.logsRoot);
}

export async function saveBase64Document({
  actorUserId,
  permissionKey,
  ownerDomain,
  ownerKey,
  fileCategory,
  originalName,
  mimeType,
  base64Data,
  metadata
}) {
  const binary = Buffer.from(String(base64Data || ''), 'base64');
  if (!binary.length) {
    throw new Error('empty_file_payload');
  }

  const now = new Date();
  const datedParts = [
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, '0'),
    String(now.getUTCDate()).padStart(2, '0')
  ];
  const resolvedStorage = resolveDocumentStorage({
    ownerDomain,
    ownerKey,
    fileCategory,
    metadata
  });
  const preferredParts = sanitizeStorageFolderSegments(resolvedStorage.storageFolder);
  const parts = preferredParts.length ? preferredParts : datedParts;
  const targetDir = path.join(runtimePaths.filesRoot, ...parts);
  await ensureDir(targetDir);

  const ext = extensionFromName(originalName);
  const storedName = `${randomUUID()}${ext}`;
  const fullPath = path.join(targetDir, storedName);
  await fs.writeFile(fullPath, binary);

  const storageRelPath = path.posix.join(...parts, storedName);
  const record = await createDocumentRecord({
    permissionKey,
    ownerDomain,
    ownerKey,
    fileCategory,
    originalName: sanitizeFileName(originalName),
    storedName,
    mimeType: String(mimeType || 'application/octet-stream'),
    byteSize: binary.length,
    storageRelPath,
    metadata: resolvedStorage.metadata,
    uploadedByUserId: actorUserId
  });

  await appendAuditLog({
    actorUserId,
    actionKey: 'document.upload',
    targetType: 'document',
    targetKey: record.id,
    detail: {
      permissionKey,
      ownerDomain,
      ownerKey,
      fileCategory,
      originalName: record.original_name,
      byteSize: record.byte_size
    }
  });

  return record;
}

export async function getDocumentFile(documentId) {
  const record = await findDocumentById(documentId);
  if (!record) return null;
  const fullPath = path.join(runtimePaths.filesRoot, ...String(record.storage_rel_path || '').split('/'));
  return {
    record,
    fullPath
  };
}

export async function deleteDocument({ actorUserId, documentId }) {
  const loaded = await getDocumentFile(documentId);
  if (!loaded) return null;

  await fs.rm(loaded.fullPath, { force: true }).catch((error) => {
    if (error?.code !== 'ENOENT') throw error;
  });

  const deleted = await deleteDocumentById(documentId);
  if (!deleted) return null;

  await appendAuditLog({
    actorUserId,
    actionKey: 'document.delete',
    targetType: 'document',
    targetKey: deleted.id,
    detail: {
      permissionKey: deleted.permission_key,
      ownerDomain: deleted.owner_domain,
      ownerKey: deleted.owner_key,
      fileCategory: deleted.file_category,
      originalName: deleted.original_name,
      byteSize: deleted.byte_size
    }
  });

  return deleted;
}
