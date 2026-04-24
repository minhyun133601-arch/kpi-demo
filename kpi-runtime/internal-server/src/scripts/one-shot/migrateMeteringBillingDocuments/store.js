import { DEFAULT_SCOPE_KEY } from './constants.js';
import { isPlainObject, normalizeMonthValue, normalizeScopeKey, normalizeText } from './normalizers.js';

export function isBillingDocumentLeafRecord(rawDocument) {
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

export function getBillingDocumentScopeMap(rawDocument) {
  if (!isPlainObject(rawDocument)) {
    return {};
  }

  const scopeSource = isPlainObject(rawDocument.scopes) ? rawDocument.scopes : rawDocument;
  const scopeMap = {};
  for (const [scopeKey, value] of Object.entries(scopeSource)) {
    if (isPlainObject(value)) {
      scopeMap[normalizeScopeKey(scopeKey)] = value;
    }
  }

  if (Object.keys(scopeMap).length > 0) {
    return scopeMap;
  }

  if (isBillingDocumentLeafRecord(rawDocument)) {
    return {
      [DEFAULT_SCOPE_KEY]: rawDocument,
    };
  }

  return {};
}

export function buildBillingDocumentMonthRecord(monthValue, scopeDocuments) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(scopeDocuments)) {
    return null;
  }

  const validScopes = Object.fromEntries(
    Object.entries(scopeDocuments).filter(([, document]) => isPlainObject(document))
  );
  const scopeKeys = Object.keys(validScopes);
  if (!scopeKeys.length) {
    return null;
  }

  if (scopeKeys.length === 1 && scopeKeys[0] === DEFAULT_SCOPE_KEY) {
    return validScopes[DEFAULT_SCOPE_KEY];
  }

  return {
    monthValue: normalizedMonth,
    scopes: validScopes,
  };
}

export function getBillingDocumentContainers(store) {
  if (!isPlainObject(store)) {
    return [];
  }

  const resourceDatasets = isPlainObject(store.resourceDatasets) ? store.resourceDatasets : null;
  if (resourceDatasets) {
    return Object.entries(resourceDatasets)
      .filter(([, dataset]) => isPlainObject(dataset))
      .map(([resourceType, dataset]) => {
        if (!isPlainObject(dataset.billingDocuments)) {
          dataset.billingDocuments = {};
        }
        return {
          resourceType: normalizeText(resourceType) || 'electric',
          billingDocuments: dataset.billingDocuments,
        };
      });
  }

  if (!isPlainObject(store.billingDocuments)) {
    store.billingDocuments = {};
  }
  return [
    {
      resourceType: normalizeText(store.resourceType) || 'electric',
      billingDocuments: store.billingDocuments,
    },
  ];
}

export function syncRootBillingDocumentsFromActiveDataset(store) {
  if (!isPlainObject(store?.resourceDatasets)) {
    return;
  }

  const resourceType = normalizeText(store.resourceType) || 'electric';
  const activeDataset = isPlainObject(store.resourceDatasets[resourceType])
    ? store.resourceDatasets[resourceType]
    : null;
  if (!activeDataset) {
    return;
  }

  store.billingDocuments = isPlainObject(activeDataset.billingDocuments) ? activeDataset.billingDocuments : {};
}

export function createSummary() {
  return {
    containerCount: 0,
    monthCount: 0,
    scopeCount: 0,
    localOnlyCount: 0,
    resolvedFromRelativePathCount: 0,
    resolvedFromFileNameCount: 0,
    unresolvedLocalOnlyCount: 0,
    migratableCount: 0,
    migratedCount: 0,
    skippedExistingServerCount: 0,
    skippedNoBase64Count: 0,
  };
}
