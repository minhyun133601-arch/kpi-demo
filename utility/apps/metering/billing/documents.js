function isBillingDocumentLeafRecord(rawDocument) {
  if (!isPlainObject(rawDocument)) {
    return false;
  }

  return Boolean(
    normalizeText(rawDocument.fileName) ||
      normalizeText(rawDocument.relativePath) ||
      normalizeText(rawDocument.mimeType) ||
      normalizeText(rawDocument.base64Data)
  );
}

function getBillingDocumentScopeRawMap(rawDocument) {
  if (!isPlainObject(rawDocument)) {
    return {};
  }

  const scopeSource = isPlainObject(rawDocument.scopes) ? rawDocument.scopes : rawDocument;
  const scopeMap = {};
  BILLING_SETTLEMENT_SCOPE_KEYS.forEach((scopeKey) => {
    if (isPlainObject(scopeSource[scopeKey])) {
      scopeMap[scopeKey] = scopeSource[scopeKey];
    }
  });

  if (countPlainObjectKeys(scopeMap)) {
    return scopeMap;
  }

  if (isBillingDocumentLeafRecord(rawDocument)) {
    return {
      [DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY]: rawDocument,
    };
  }

  return {};
}

function buildBillingDocumentMonthRecord(
  monthValue,
  scopeDocuments,
  resourceType = getCurrentResourceType()
) {
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

  if (
    !supportsScopedBillingSettlement(resourceType) ||
    (scopeKeys.length === 1 && scopeKeys[0] === DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY)
  ) {
    return validScopes[scopeKeys[0]];
  }

  return {
    monthValue: normalizedMonth,
    scopes: validScopes,
  };
}

function normalizeBillingDocument(
  monthValue,
  rawDocument,
  resourceType = getCurrentResourceType(),
  scopeKey = ""
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(rawDocument)) {
    return null;
  }

  const fileName = buildBillingDocumentFileName(
    normalizedMonth,
    normalizeText(rawDocument.fileName) || getBillingDocumentFileNameFromPath(rawDocument.relativePath),
    rawDocument.mimeType,
    resourceType,
    scopeKey
  );
  const relativePath = normalizeBillingDocumentRelativePath(
    rawDocument.relativePath,
    fileName,
    resourceType
  );
  const documentId = normalizeText(rawDocument.documentId);
  const previewUrl = normalizeText(rawDocument.previewUrl);
  const downloadUrl = normalizeText(rawDocument.downloadUrl);
  const base64Data = normalizeText(rawDocument.base64Data);
  const hasServerDocument = Boolean(documentId || previewUrl || downloadUrl);
  if (!fileName || !(relativePath || previewUrl || downloadUrl || base64Data)) {
    return null;
  }

  return {
    monthValue: normalizedMonth,
    fileName,
    relativePath,
    mimeType: normalizeText(rawDocument.mimeType),
    savedAt: normalizeText(rawDocument.savedAt),
    base64Data,
    documentId,
    previewUrl,
    downloadUrl,
    savedToLocalDirectory: hasServerDocument ? false : rawDocument.savedToLocalDirectory !== false,
  };
}

function normalizeBillingDocuments(
  rawBillingDocuments,
  resourceType = getCurrentResourceType()
) {
  if (!isPlainObject(rawBillingDocuments)) {
    return {};
  }

  return Object.entries(rawBillingDocuments).reduce((normalized, [monthValue, rawDocument]) => {
    const scopeDocuments = getBillingDocumentScopeRawMap(rawDocument);
    const normalizedScopeDocuments = Object.entries(scopeDocuments).reduce(
      (scopeNormalized, [scopeKey, scopeDocument]) => {
        const document = normalizeBillingDocument(
          monthValue,
          scopeDocument,
          resourceType,
          scopeKey
        );
        if (document) {
          scopeNormalized[scopeKey] = document;
        }
        return scopeNormalized;
      },
      {}
    );
    const document = buildBillingDocumentMonthRecord(
      monthValue,
      normalizedScopeDocuments,
      resourceType
    );
    if (document) {
      normalized[normalizeMonthValue(monthValue)] = document;
    }

    return normalized;
  }, {});
}

function mergeBillingDocumentsWithPresetLocalStore(
  currentEntries,
  presetEntries,
  resourceType = getCurrentResourceType()
) {
  const normalizedCurrent = normalizeBillingDocuments(currentEntries, resourceType);
  const normalizedPreset = normalizeBillingDocuments(presetEntries, resourceType);
  const mergedEntries = {};
  const monthValues = new Set([
    ...Object.keys(normalizedPreset),
    ...Object.keys(normalizedCurrent),
  ]);

  monthValues.forEach((monthValue) => {
    const nextScopeDocuments = {
      ...getBillingDocumentScopeRawMap(normalizedPreset[monthValue]),
      ...getBillingDocumentScopeRawMap(normalizedCurrent[monthValue]),
    };
    const nextRecord = buildBillingDocumentMonthRecord(
      monthValue,
      nextScopeDocuments,
      resourceType
    );
    if (nextRecord) {
      mergedEntries[monthValue] = nextRecord;
    }
  });

  return mergedEntries;
}

function getBillingDocumentForMonth(
  monthValue = state.currentMonth,
  scopeKey = getCurrentBillingSettlementScope()
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(state.store.billingDocuments)) {
    return null;
  }

  const rawDocument = state.store.billingDocuments[normalizedMonth] || null;
  if (!rawDocument) {
    return null;
  }

  const scopeDocuments = normalizeBillingDocuments(
    {
      [normalizedMonth]: rawDocument,
    },
    getCurrentResourceType()
  )[normalizedMonth];
  if (!scopeDocuments) {
    return null;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey, getCurrentResourceType());
  if (isBillingDocumentLeafRecord(scopeDocuments)) {
    return resolvedScopeKey === DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY ? scopeDocuments : null;
  }

  return isPlainObject(scopeDocuments.scopes) ? scopeDocuments.scopes[resolvedScopeKey] || null : null;
}

function setBillingDocumentForScope(
  monthValue,
  document,
  scopeKey = getCurrentBillingSettlementScope(),
  resourceType = getCurrentResourceType()
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(document)) {
    return;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey, resourceType);
  const currentScopeMap = getBillingDocumentScopeRawMap(
    state.store.billingDocuments?.[normalizedMonth]
  );
  const nextScopeMap = {
    ...currentScopeMap,
    [resolvedScopeKey]: document,
  };
  const nextRecord = buildBillingDocumentMonthRecord(normalizedMonth, nextScopeMap, resourceType);
  if (nextRecord) {
    state.store.billingDocuments[normalizedMonth] = nextRecord;
  }
}

function deleteBillingDocumentForScope(
  monthValue,
  scopeKey = getCurrentBillingSettlementScope(),
  resourceType = getCurrentResourceType()
) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth || !isPlainObject(state.store.billingDocuments)) {
    return;
  }

  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey, resourceType);
  const currentScopeMap = {
    ...getBillingDocumentScopeRawMap(state.store.billingDocuments[normalizedMonth]),
  };
  delete currentScopeMap[resolvedScopeKey];

  const nextRecord = buildBillingDocumentMonthRecord(normalizedMonth, currentScopeMap, resourceType);
  if (nextRecord) {
    state.store.billingDocuments[normalizedMonth] = nextRecord;
    return;
  }

  delete state.store.billingDocuments[normalizedMonth];
}
