function normalizeBillingStoreSections(
  source,
  resourceType = getCurrentResourceType()
) {
  const normalizedType = normalizeResourceType(resourceType);
  const normalizedSource = isPlainObject(source) ? source : {};

  return {
    billingDocuments: normalizeBillingDocuments(
      normalizedSource.billingDocuments,
      normalizedType
    ),
    billingSettlementEntries: normalizeBillingSettlementEntries(
      normalizedSource.billingSettlementEntries
    ),
  };
}

function mergeBillingResourceStoreSections(
  currentDataset,
  presetDataset,
  resourceType = getCurrentResourceType()
) {
  const normalizedType = normalizeResourceType(resourceType);
  const currentSource = isPlainObject(currentDataset) ? currentDataset : {};
  const presetSource = isPlainObject(presetDataset) ? presetDataset : {};

  return {
    billingDocuments: mergeBillingDocumentsWithPresetLocalStore(
      currentSource.billingDocuments,
      presetSource.billingDocuments,
      normalizedType
    ),
    billingSettlementEntries: mergeBillingSettlementEntriesWithPresetLocalStore(
      currentSource.billingSettlementEntries,
      presetSource.billingSettlementEntries
    ),
  };
}

function mergeBillingStoreSections(
  currentStore,
  presetLocalStore,
  resourceType = getCurrentResourceType()
) {
  return mergeBillingResourceStoreSections(
    currentStore,
    presetLocalStore,
    resourceType
  );
}
