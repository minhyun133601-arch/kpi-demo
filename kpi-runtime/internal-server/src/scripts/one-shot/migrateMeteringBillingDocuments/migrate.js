import fs from 'node:fs/promises';
import path from 'node:path';

import { saveBase64Document } from '../../../services/files.js';

import {
  METERING_BILLING_DOCUMENT_FILE_CATEGORY,
  METERING_BILLING_DOCUMENT_OWNER_DOMAIN,
  METERING_SHARED_STORE_PERMISSION_KEY,
  meteringAppRoot,
} from './constants.js';
import { buildBillingOwnerKey, buildDocumentSaveMetadata, buildMigratedDocument } from './metadata.js';
import { buildMeteringFileNameIndex, resolveLocalBillingDocumentFile } from './local-files.js';
import { cloneJson, normalizeText } from './normalizers.js';
import {
  buildBillingDocumentMonthRecord,
  createSummary,
  getBillingDocumentContainers,
  getBillingDocumentScopeMap,
  syncRootBillingDocumentsFromActiveDataset,
} from './store.js';

async function migrateLocalOnlyDocument({
  container,
  monthValue,
  scopeKey,
  rawDocument,
  fileNameIndex,
  nextScopeMap,
  options,
  summary,
}) {
  if (normalizeText(rawDocument.fileName) || normalizeText(rawDocument.relativePath)) {
    summary.localOnlyCount += 1;
  }
  const resolvedLocalFile = await resolveLocalBillingDocumentFile(rawDocument, fileNameIndex);
  if (!resolvedLocalFile) {
    summary.unresolvedLocalOnlyCount += 1;
    summary.skippedNoBase64Count += 1;
    return;
  }
  if (resolvedLocalFile.resolvedBy === 'relativePath') {
    summary.resolvedFromRelativePathCount += 1;
  } else {
    summary.resolvedFromFileNameCount += 1;
  }
  const localFileBuffer = await fs.readFile(resolvedLocalFile.fullPath);
  const localFileBase64 = localFileBuffer.toString('base64');
  summary.migratableCount += 1;
  if (!options.write) {
    return;
  }

  const savedDocument = await saveBase64Document({
    actorUserId: null,
    permissionKey: METERING_SHARED_STORE_PERMISSION_KEY,
    ownerDomain: METERING_BILLING_DOCUMENT_OWNER_DOMAIN,
    ownerKey: buildBillingOwnerKey(container.resourceType, monthValue, scopeKey),
    fileCategory: METERING_BILLING_DOCUMENT_FILE_CATEGORY,
    originalName: normalizeText(rawDocument.fileName) || path.basename(resolvedLocalFile.fullPath),
    mimeType: normalizeText(rawDocument.mimeType) || 'application/octet-stream',
    base64Data: localFileBase64,
    metadata: buildDocumentSaveMetadata(
      container.resourceType,
      monthValue,
      scopeKey,
      'local_relative_path',
      {
        sourceRelativePath: normalizeText(rawDocument.relativePath),
        sourceFilePath: resolvedLocalFile.fullPath,
        resolvedBy: resolvedLocalFile.resolvedBy,
      }
    ),
  });

  nextScopeMap[scopeKey] = buildMigratedDocument(monthValue, rawDocument, savedDocument, options.keepBase64);
  summary.migratedCount += 1;
}

async function migrateBase64Document({
  container,
  monthValue,
  scopeKey,
  rawDocument,
  nextScopeMap,
  options,
  summary,
}) {
  summary.migratableCount += 1;
  if (!options.write) {
    return;
  }

  const savedDocument = await saveBase64Document({
    actorUserId: null,
    permissionKey: METERING_SHARED_STORE_PERMISSION_KEY,
    ownerDomain: METERING_BILLING_DOCUMENT_OWNER_DOMAIN,
    ownerKey: buildBillingOwnerKey(container.resourceType, monthValue, scopeKey),
    fileCategory: METERING_BILLING_DOCUMENT_FILE_CATEGORY,
    originalName: normalizeText(rawDocument.fileName) || 'billing-document.bin',
    mimeType: normalizeText(rawDocument.mimeType) || 'application/octet-stream',
    base64Data: normalizeText(rawDocument.base64Data),
    metadata: buildDocumentSaveMetadata(
      container.resourceType,
      monthValue,
      scopeKey,
      'shared_store_base64'
    ),
  });

  nextScopeMap[scopeKey] = buildMigratedDocument(monthValue, rawDocument, savedDocument, options.keepBase64);
  summary.migratedCount += 1;
}

export async function migrateBillingDocuments(store, options) {
  const nextStore = cloneJson(store);
  const summary = createSummary();
  const containers = getBillingDocumentContainers(nextStore);
  const fileNameIndex = await buildMeteringFileNameIndex(meteringAppRoot);
  summary.containerCount = containers.length;

  for (const container of containers) {
    for (const [monthValue, rawMonthRecord] of Object.entries(container.billingDocuments)) {
      const scopeMap = getBillingDocumentScopeMap(rawMonthRecord);
      const scopeKeys = Object.keys(scopeMap);
      if (!scopeKeys.length) {
        continue;
      }

      summary.monthCount += 1;
      const nextScopeMap = { ...scopeMap };

      for (const scopeKey of scopeKeys) {
        const rawDocument = scopeMap[scopeKey];
        summary.scopeCount += 1;

        const documentId = normalizeText(rawDocument.documentId);
        const previewUrl = normalizeText(rawDocument.previewUrl);
        const downloadUrl = normalizeText(rawDocument.downloadUrl);
        if (documentId || previewUrl || downloadUrl) {
          summary.skippedExistingServerCount += 1;
          continue;
        }

        if (!normalizeText(rawDocument.base64Data)) {
          await migrateLocalOnlyDocument({
            container,
            monthValue,
            scopeKey,
            rawDocument,
            fileNameIndex,
            nextScopeMap,
            options,
            summary,
          });
          continue;
        }

        await migrateBase64Document({
          container,
          monthValue,
          scopeKey,
          rawDocument,
          nextScopeMap,
          options,
          summary,
        });
      }

      if (options.write) {
        const nextMonthRecord = buildBillingDocumentMonthRecord(monthValue, nextScopeMap);
        if (nextMonthRecord) {
          container.billingDocuments[monthValue] = nextMonthRecord;
        } else {
          delete container.billingDocuments[monthValue];
        }
      }
    }
  }

  if (options.write) {
    syncRootBillingDocumentsFromActiveDataset(nextStore);
  }

  return {
    nextStore,
    summary,
  };
}
