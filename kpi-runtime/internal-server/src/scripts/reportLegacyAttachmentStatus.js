import {
  WORK_RUNTIME_BOOTSTRAP_RECORDS,
  WORK_RUNTIME_MODULE_KEY
} from '../lib/portal-data-registry.js';
import { closePool } from '../db/pool.js';
import { listModuleRecordsByModuleKey } from '../repositories/modules.js';
import { loadMeteringAuthorityStore } from '../services/metering-authority.js';

function normalizeText(value) {
  return String(value || '').trim();
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function getBillingDocumentContainers(store) {
  if (!isPlainObject(store)) {
    return [];
  }

  const resourceDatasets = isPlainObject(store.resourceDatasets) ? store.resourceDatasets : null;
  if (resourceDatasets) {
    return Object.entries(resourceDatasets)
      .filter(([, dataset]) => isPlainObject(dataset) && isPlainObject(dataset.billingDocuments))
      .map(([resourceType, dataset]) => ({
        resourceType: normalizeText(resourceType) || 'electric',
        billingDocuments: dataset.billingDocuments
      }));
  }

  if (!isPlainObject(store.billingDocuments)) {
    return [];
  }

  return [
    {
      resourceType: normalizeText(store.resourceType) || 'electric',
      billingDocuments: store.billingDocuments
    }
  ];
}

function isBillingDocumentLeafRecord(rawDocument) {
  if (!isPlainObject(rawDocument)) {
    return false;
  }

  return Boolean(
    normalizeText(rawDocument.fileName) ||
    normalizeText(rawDocument.relativePath) ||
    normalizeText(rawDocument.mimeType) ||
    normalizeText(rawDocument.base64Data) ||
    normalizeText(rawDocument.documentId)
  );
}

function getBillingDocumentScopeMap(rawDocument) {
  if (!isPlainObject(rawDocument)) {
    return {};
  }

  const scopeSource = isPlainObject(rawDocument.scopes) ? rawDocument.scopes : rawDocument;
  const scopeMap = {};
  for (const [scopeKey, value] of Object.entries(scopeSource)) {
    if (isPlainObject(value)) {
      scopeMap[normalizeText(scopeKey) || 'default'] = value;
    }
  }

  if (Object.keys(scopeMap).length > 0) {
    return scopeMap;
  }

  if (isBillingDocumentLeafRecord(rawDocument)) {
    return { default: rawDocument };
  }

  return {};
}

function scanMeteringBillingDocuments(store) {
  const result = {
    legacyBase64Count: 0,
    localOnlyDocumentCount: 0,
    serverDocumentCount: 0,
    sample: []
  };

  for (const container of getBillingDocumentContainers(store)) {
    for (const [monthValue, rawMonthRecord] of Object.entries(container.billingDocuments)) {
      const scopeMap = getBillingDocumentScopeMap(rawMonthRecord);
      for (const [scopeKey, rawDocument] of Object.entries(scopeMap)) {
        const hasServerDocument = Boolean(
          normalizeText(rawDocument.documentId) ||
          normalizeText(rawDocument.previewUrl) ||
          normalizeText(rawDocument.downloadUrl)
        );
        const hasBase64 = Boolean(normalizeText(rawDocument.base64Data));
        if (hasServerDocument) {
          result.serverDocumentCount += 1;
          continue;
        }
        if (!hasBase64) {
          if (normalizeText(rawDocument.fileName) || normalizeText(rawDocument.relativePath)) {
            result.localOnlyDocumentCount += 1;
          }
          continue;
        }
        result.legacyBase64Count += 1;
        if (result.sample.length < 10) {
          result.sample.push({
            resourceType: container.resourceType,
            monthValue,
            scopeKey,
            fileName: normalizeText(rawDocument.fileName)
          });
        }
      }
    }
  }

  return result;
}

function walkWorkLegacyAttachments(value, pathParts = [], found = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walkWorkLegacyAttachments(item, [...pathParts, `[${index}]`], found));
    return found;
  }

  if (!isPlainObject(value)) {
    return found;
  }

  if (Array.isArray(value.attachments)) {
    value.attachments.forEach((attachment, index) => {
      const fileName = normalizeText(attachment?.fileName || attachment?.name);
      const isLegacyDirectoryAttachment =
        !normalizeText(attachment?.documentId) &&
        !normalizeText(attachment?.assetId) &&
        !!fileName;
      if (isLegacyDirectoryAttachment) {
        found.push({
          path: [...pathParts, 'attachments', `[${index}]`].join('.'),
          fileName,
          storage: normalizeText(attachment?.storage) || 'directory',
          relativePath: normalizeText(attachment?.relativePath)
        });
      }
    });
  }

  Object.entries(value).forEach(([key, child]) => {
    if (key === 'attachments') return;
    walkWorkLegacyAttachments(child, [...pathParts, key], found);
  });
  return found;
}

async function main() {
  const [meteringState, workRecords] = await Promise.all([
    loadMeteringAuthorityStore(),
    listModuleRecordsByModuleKey(WORK_RUNTIME_MODULE_KEY)
  ]);

  const workSummary = workRecords.map((record) => {
    const legacyAttachments = walkWorkLegacyAttachments(record.payload, [record.record_key]);
    return {
      recordKey: record.record_key,
      legacyDirectoryAttachmentCount: legacyAttachments.length,
      sample: legacyAttachments.slice(0, 5)
    };
  }).filter((item) => item.legacyDirectoryAttachmentCount > 0);

  console.log(
    JSON.stringify(
      {
        ok: true,
        metering: meteringState
          ? {
              recordVersion: meteringState.meta?.version || 0,
              recordVersions: meteringState.meta?.recordVersions || null,
              ...scanMeteringBillingDocuments(meteringState.store)
            }
          : { missing: true },
        workRuntime: {
          expectedRecordCount: WORK_RUNTIME_BOOTSTRAP_RECORDS.length,
          recordCount: workRecords.length,
          recordKeys: workRecords.map((record) => record.record_key),
          missingRecordKeys: WORK_RUNTIME_BOOTSTRAP_RECORDS
            .map((record) => record.recordKey)
            .filter((recordKey) => !workRecords.some((record) => record.record_key === recordKey)),
          legacyRecordCount: workSummary.length,
          records: workSummary
        }
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error.message
      },
      null,
      2
    )
  );
  process.exitCode = 1;
}).finally(async () => {
  await closePool().catch(() => {});
});
