function supportsEquipmentEditingForResource(resourceType = getCurrentResourceType()) {
  return (
    isElectricResourceType(resourceType) ||
    isGasResourceType(resourceType) ||
    isProductionResourceType(resourceType)
  );
}

function supportsEquipmentEditingForCurrentResource() {
  return supportsEquipmentEditingForResource(getCurrentResourceType());
}

function createDefaultResourceDataset(resourceType) {
  const normalizedType = normalizeResourceType(resourceType);
  const defaultItems = (
    normalizedType === RESOURCE_TYPES.GAS
      ? DEFAULT_GAS_EQUIPMENT_ITEMS
      : normalizedType === RESOURCE_TYPES.WASTE
        ? DEFAULT_WASTE_EQUIPMENT_ITEMS
        : normalizedType === RESOURCE_TYPES.PRODUCTION
          ? DEFAULT_PRODUCTION_EQUIPMENT_ITEMS
          : DEFAULT_EQUIPMENT_ITEMS
  ).map((item) => ({ ...item }));

  return {
    mode: normalizedType === RESOURCE_TYPES.WASTE ? MODES.TEAM : MODES.EQUIPMENT,
    equipmentItems: defaultItems,
    equipmentEntries: {},
    teamAssignments: {},
    teamMonthlyEntries: {},
    teamMonthlyAmountEntries: {},
    billingDocuments: {},
    billingSettlementEntries: {},
  };
}

function extractRawResourceDataset(rawStore, resourceType) {
  if (!isPlainObject(rawStore)) {
    return {};
  }

  const normalizedType = normalizeResourceType(resourceType);
  const rawDatasets = isPlainObject(rawStore.resourceDatasets)
    ? rawStore.resourceDatasets
    : null;
  if (rawDatasets && isPlainObject(rawDatasets[normalizedType])) {
    return rawDatasets[normalizedType];
  }

  if (normalizedType === RESOURCE_TYPES.ELECTRIC) {
    return {
      mode: rawStore.mode,
      equipmentItems: rawStore.equipmentItems,
      equipmentEntries: rawStore.equipmentEntries,
      teamAssignments: rawStore.teamAssignments,
      teamMonthlyEntries: rawStore.teamMonthlyEntries,
      teamMonthlyAmountEntries: rawStore.teamMonthlyAmountEntries,
      billingDocuments: rawStore.billingDocuments,
      billingSettlementEntries: rawStore.billingSettlementEntries,
      presetImportVersion: rawStore.presetImportVersion,
      entryResetVersion: rawStore.entryResetVersion,
      entryStatusBaselineVersion: rawStore.entryStatusBaselineVersion,
      equipmentFactorMigrationVersion: rawStore.equipmentFactorMigrationVersion,
      teamAssignmentBaselineVersion: rawStore.teamAssignmentBaselineVersion,
      historicalEntryValueFixVersion: rawStore.historicalEntryValueFixVersion,
      stickMeterSplitVersion: rawStore.stickMeterSplitVersion,
    };
  }

  return {};
}

function getActiveResourceDataset(
  store = state.store,
  resourceType = normalizeResourceType(store?.resourceType)
) {
  if (!isPlainObject(store?.resourceDatasets)) {
    return null;
  }

  return isPlainObject(store.resourceDatasets[resourceType])
    ? store.resourceDatasets[resourceType]
    : null;
}

function syncActiveResourceDatasetToStore(store = state.store) {
  if (!isPlainObject(store)) {
    return null;
  }

  const resourceType = normalizeResourceType(store.resourceType);
  if (!isPlainObject(store.resourceDatasets)) {
    store.resourceDatasets = {};
  }

  const dataset =
    getActiveResourceDataset(store, resourceType) || createDefaultResourceDataset(resourceType);

  dataset.mode = store.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT;
  dataset.equipmentItems = Array.isArray(store.equipmentItems) ? store.equipmentItems : [];
  dataset.equipmentEntries = isPlainObject(store.equipmentEntries)
    ? store.equipmentEntries
    : {};
  dataset.teamAssignments = isPlainObject(store.teamAssignments)
    ? store.teamAssignments
    : {};
  dataset.teamMonthlyEntries = isPlainObject(store.teamMonthlyEntries)
    ? store.teamMonthlyEntries
    : {};
  dataset.teamMonthlyAmountEntries = isPlainObject(store.teamMonthlyAmountEntries)
    ? store.teamMonthlyAmountEntries
    : {};
  dataset.billingDocuments = isPlainObject(store.billingDocuments)
    ? store.billingDocuments
    : {};
  dataset.billingSettlementEntries = isPlainObject(store.billingSettlementEntries)
    ? store.billingSettlementEntries
    : {};

  store.resourceDatasets[resourceType] = dataset;
  store.resourceType = resourceType;
  return dataset;
}

function attachResourceDatasetToStore(
  store,
  resourceType = normalizeResourceType(store?.resourceType)
) {
  if (!isPlainObject(store)) {
    return store;
  }

  store.resourceType = normalizeResourceType(resourceType);
  if (!isPlainObject(store.resourceDatasets)) {
    store.resourceDatasets = {};
  }

  const dataset =
    getActiveResourceDataset(store, store.resourceType) ||
    createDefaultResourceDataset(store.resourceType);
  store.resourceDatasets[store.resourceType] = dataset;
  store.mode = dataset.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT;
  store.equipmentItems = Array.isArray(dataset.equipmentItems)
    ? dataset.equipmentItems
    : [];
  store.equipmentEntries = isPlainObject(dataset.equipmentEntries)
    ? dataset.equipmentEntries
    : {};
  store.teamAssignments = isPlainObject(dataset.teamAssignments)
    ? dataset.teamAssignments
    : {};
  store.teamMonthlyEntries = isPlainObject(dataset.teamMonthlyEntries)
    ? dataset.teamMonthlyEntries
    : {};
  store.teamMonthlyAmountEntries = isPlainObject(dataset.teamMonthlyAmountEntries)
    ? dataset.teamMonthlyAmountEntries
    : {};
  store.billingDocuments = isPlainObject(dataset.billingDocuments)
    ? dataset.billingDocuments
    : {};
  store.billingSettlementEntries = isPlainObject(dataset.billingSettlementEntries)
    ? dataset.billingSettlementEntries
    : {};

  return store;
}

function setCurrentMode(mode) {
  const resolvedMode =
    supportsTeamModeForCurrentResource() && mode === MODES.TEAM
      ? MODES.TEAM
      : MODES.EQUIPMENT;
  state.store.mode = resolvedMode;

  const activeDataset = syncActiveResourceDatasetToStore(state.store);
  if (activeDataset) {
    activeDataset.mode = resolvedMode;
  }
}

function setCurrentEquipmentItems(items) {
  state.store.equipmentItems = Array.isArray(items) ? items : [];
  const activeDataset = syncActiveResourceDatasetToStore(state.store);
  if (activeDataset) {
    activeDataset.equipmentItems = state.store.equipmentItems;
  }
}

function getElectricPresetEntriesForStore(store = state.store) {
  const electricDataset = getActiveResourceDataset(store, RESOURCE_TYPES.ELECTRIC);
  if (isPlainObject(electricDataset?.equipmentEntries)) {
    return electricDataset.equipmentEntries;
  }

  return isPlainObject(store?.equipmentEntries) ? store.equipmentEntries : {};
}
