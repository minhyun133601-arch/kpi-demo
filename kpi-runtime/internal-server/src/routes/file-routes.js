import path from 'node:path';
import fs from 'node:fs/promises';
import { sendJson } from '../lib/http.js';
import { deleteDocument, getDocumentFile, saveBase64Document } from '../services/files.js';
import { assertOpenPermission, normalizeText, parseBody, serializePermissionKey } from './route-context.js';

const DOCUMENT_ATTACHMENT_OWNER_DOMAINS = new Set([
  'audit.legal_facility',
  'audit.lux.evidence',
  'data.equipment_history',
  'work.history',
  'work.team_calendar'
]);
const DOCUMENT_IMAGE_ALLOWED_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp'
]);
const DOCUMENT_ATTACHMENT_ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.doc',
  '.docx',
  '.hwp',
  '.hwpx'
]);
const DOCUMENT_IMAGE_ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp'
]);
const DOCUMENT_ATTACHMENT_ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/x-hwp',
  'application/haansofthwp',
  'application/x-hwp+zip',
  'application/haansofthwpx'
]);
const DOCUMENT_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

async function loadDocumentOr404(res, documentId) {
  const loaded = await getDocumentFile(documentId);
  if (!loaded) {
    sendJson(res, 404, { ok: false, error: 'not_found' });
    return null;
  }
  return loaded;
}

async function sendDocumentBinary(res, loaded, disposition = 'attachment') {
  const data = await fs.readFile(loaded.fullPath);
  const headers = {
    'Content-Type': loaded.record.mime_type || 'application/octet-stream',
    'Content-Length': data.length
  };

  if (disposition === 'attachment') {
    headers['Content-Disposition'] = `attachment; filename="${encodeURIComponent(loaded.record.original_name)}"`;
  } else if (disposition === 'inline') {
    headers['Content-Disposition'] = `inline; filename="${encodeURIComponent(loaded.record.original_name)}"`;
  }

  res.writeHead(200, headers);
  res.end(data);
}

function getBase64ByteLength(base64Data) {
  const normalized = String(base64Data || '').replace(/\s+/g, '');
  const paddingLength = (normalized.match(/=+$/)?.[0] || '').length;
  return Math.max(0, Math.floor((normalized.length * 3) / 4) - paddingLength);
}

function isImageUploadCategory(fileCategory) {
  return /^(photo|image|images?)$/i.test(String(fileCategory || '').trim());
}

function isAuditLuxEvidenceUpload({ ownerDomain, fileCategory }) {
  return ownerDomain === 'audit.lux.evidence'
    && /^evidence$/i.test(String(fileCategory || '').trim());
}

function isPdfUploadType({ extension, mimeType }) {
  return extension === '.pdf' || mimeType === 'application/pdf';
}

function hasAllowedUploadType({ ownerDomain, fileCategory, extension, mimeType }) {
  if (isAuditLuxEvidenceUpload({ ownerDomain, fileCategory })) {
    return DOCUMENT_IMAGE_ALLOWED_EXTENSIONS.has(extension)
      || DOCUMENT_IMAGE_ALLOWED_MIME_TYPES.has(mimeType)
      || isPdfUploadType({ extension, mimeType });
  }
  if (isImageUploadCategory(fileCategory)) {
    return DOCUMENT_IMAGE_ALLOWED_EXTENSIONS.has(extension) || DOCUMENT_IMAGE_ALLOWED_MIME_TYPES.has(mimeType);
  }
  return DOCUMENT_ATTACHMENT_ALLOWED_EXTENSIONS.has(extension) || DOCUMENT_ATTACHMENT_ALLOWED_MIME_TYPES.has(mimeType);
}

function validateUploadPolicy({ ownerDomain, fileCategory, originalName, mimeType, base64Data }) {
  if (!DOCUMENT_ATTACHMENT_OWNER_DOMAINS.has(ownerDomain)) {
    return;
  }

  const normalizedExt = path.extname(String(originalName || '')).toLowerCase();
  const normalizedMimeType = String(mimeType || '').trim().toLowerCase();
  if (!hasAllowedUploadType({
    ownerDomain,
    fileCategory,
    extension: normalizedExt,
    mimeType: normalizedMimeType
  })) {
    throw new Error('unsupported_type');
  }

  if (getBase64ByteLength(base64Data) > DOCUMENT_ATTACHMENT_MAX_BYTES) {
    throw new Error('file_too_large');
  }
}

export async function handleUploadBase64File(context) {
  const { req, res, auth } = context;
  const body = await parseBody(req);
  const permissionKey = serializePermissionKey(body.permissionKey);
  await assertOpenPermission(permissionKey, auth, 'write');

  const ownerDomain = normalizeText(body.ownerDomain || 'generic');
  const ownerKey = normalizeText(body.ownerKey || 'unassigned');
  const fileCategory = normalizeText(body.fileCategory || 'attachment');
  const originalName = normalizeText(body.originalName || 'file.bin');
  const mimeType = normalizeText(body.mimeType || 'application/octet-stream');
  const base64Data = normalizeText(body.base64Data);
  validateUploadPolicy({
    ownerDomain,
    fileCategory,
    originalName,
    mimeType,
    base64Data
  });

  const document = await saveBase64Document({
    actorUserId: auth?.user?.id || null,
    permissionKey,
    ownerDomain,
    ownerKey,
    fileCategory,
    originalName,
    mimeType,
    base64Data,
    metadata: body.metadata ?? {}
  });

  sendJson(res, 201, {
    ok: true,
    document
  });
}

export async function handleDocumentMeta(context, documentId) {
  const { req, res, auth } = context;
  void req;
  const loaded = await loadDocumentOr404(res, documentId);
  if (!loaded) return;

  await assertOpenPermission(loaded.record.permission_key, auth, 'read');
  sendJson(res, 200, {
    ok: true,
    document: loaded.record
  });
}

export async function handleDocumentDownload(context, documentId) {
  const { req, res, auth } = context;
  void req;
  const loaded = await loadDocumentOr404(res, documentId);
  if (!loaded) return;

  await assertOpenPermission(loaded.record.permission_key, auth, 'read');
  await sendDocumentBinary(res, loaded, 'attachment');
}

export async function handleDocumentView(context, documentId) {
  const { req, res, auth } = context;
  void req;
  const loaded = await loadDocumentOr404(res, documentId);
  if (!loaded) return;

  await assertOpenPermission(loaded.record.permission_key, auth, 'read');
  await sendDocumentBinary(res, loaded, 'inline');
}

export async function handleDocumentDelete(context, documentId) {
  const { res, auth } = context;
  const loaded = await loadDocumentOr404(res, documentId);
  if (!loaded) return;

  await assertOpenPermission(loaded.record.permission_key, auth, 'write');
  const deleted = await deleteDocument({
    actorUserId: auth?.user?.id || null,
    documentId
  });

  sendJson(res, 200, {
    ok: true,
    document: deleted
  });
}
