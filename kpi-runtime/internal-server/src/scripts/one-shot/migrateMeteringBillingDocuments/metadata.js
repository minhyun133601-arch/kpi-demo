import { resolveManagedDocumentStorageFolder } from '../../../lib/document-storage.js';
import { METERING_MODULE_KEY, RESOURCE_RECORD_KEY_BY_TYPE } from '../../../services/metering-authority.js';

import {
  DEFAULT_SCOPE_KEY,
  METERING_BILLING_DOCUMENT_FILE_CATEGORY,
  METERING_BILLING_DOCUMENT_OWNER_DOMAIN,
} from './constants.js';
import { normalizeMonthValue, normalizeScopeKey, normalizeText } from './normalizers.js';

export function buildBillingOwnerKey(resourceType, monthValue, scopeKey) {
  return [
    normalizeText(resourceType || 'electric') || 'electric',
    normalizeMonthValue(monthValue),
    normalizeScopeKey(scopeKey),
  ].filter(Boolean).join(':');
}

export function getMeteringBillingStorageFolder(resourceType) {
  const normalizedResourceType = normalizeText(resourceType || 'electric');
  const storageFolder = resolveManagedDocumentStorageFolder({
    ownerDomain: METERING_BILLING_DOCUMENT_OWNER_DOMAIN,
    ownerKey: buildBillingOwnerKey(normalizedResourceType, '', DEFAULT_SCOPE_KEY),
    fileCategory: METERING_BILLING_DOCUMENT_FILE_CATEGORY,
    metadata: {
      resourceType: normalizedResourceType,
    },
  });
  if (!storageFolder) {
    throw new Error('billing_document_resource_unsupported');
  }
  return storageFolder;
}

export function buildMigratedDocument(monthValue, rawDocument, savedDocument, keepBase64) {
  return {
    monthValue: normalizeMonthValue(monthValue),
    fileName: normalizeText(rawDocument.fileName) || normalizeText(savedDocument.original_name),
    relativePath: normalizeText(rawDocument.relativePath),
    mimeType: normalizeText(rawDocument.mimeType) || normalizeText(savedDocument.mime_type),
    savedAt: normalizeText(savedDocument.created_at),
    base64Data: keepBase64 ? normalizeText(rawDocument.base64Data) : '',
    documentId: normalizeText(savedDocument.id),
    previewUrl: `/api/files/${savedDocument.id}/view`,
    downloadUrl: `/api/files/${savedDocument.id}/download`,
    savedToLocalDirectory: false,
  };
}

export function buildDocumentSaveMetadata(resourceType, monthValue, scopeKey, migratedFrom, extras = {}) {
  return {
    migratedFrom,
    moduleKey: METERING_MODULE_KEY,
    recordKey: RESOURCE_RECORD_KEY_BY_TYPE[resourceType] || 'electric_v1',
    resourceType,
    monthValue: normalizeMonthValue(monthValue),
    scopeKey: normalizeScopeKey(scopeKey),
    storageFolder: getMeteringBillingStorageFolder(resourceType),
    ...extras,
  };
}
