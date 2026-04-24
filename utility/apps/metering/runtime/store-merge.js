function countPopulatedTeamAssignments(assignments) {
  if (!isPlainObject(assignments)) {
    return 0;
  }

  return Object.values(assignments).reduce(
    (total, value) => total + (Array.isArray(value) ? value.length : 0),
    0
  );
}

function normalizeTeamMonthlyEntries(entries, resourceType = getCurrentResourceType()) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const allowedTeamKeys = new Set(getDirectTeamMonthlyUsageTeamKeys(resourceType));
  if (!allowedTeamKeys.size) {
    return {};
  }

  const normalized = {};
  Object.entries(entries).forEach(([rawMonthValue, rawTeamEntries]) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (!monthValue || !isPlainObject(rawTeamEntries)) {
      return;
    }

    const nextTeamEntries = {};
    Object.entries(rawTeamEntries).forEach(([rawTeamKey, rawValue]) => {
      const teamKey = normalizeText(rawTeamKey);
      if (!allowedTeamKeys.has(teamKey)) {
        return;
      }

      const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
      const shouldPreferCurrentValue =
        teamKey === storageKey || !Object.prototype.hasOwnProperty.call(nextTeamEntries, storageKey);

      if (rawValue === null) {
        if (shouldPreferCurrentValue) {
          nextTeamEntries[storageKey] = null;
        }
        return;
      }

      const usageValue = normalizeTeamMonthlyUsageValue(rawValue, null);
      if (!Number.isFinite(usageValue)) {
        return;
      }

      if (!shouldPreferCurrentValue) {
        return;
      }

      nextTeamEntries[storageKey] = usageValue;
    });

    if (Object.keys(nextTeamEntries).length) {
      normalized[monthValue] = nextTeamEntries;
    }
  });

  return normalized;
}

function normalizeTeamMonthlyAmountEntries(entries, resourceType = getCurrentResourceType()) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const allowedTeamKeys = new Set(getDirectTeamMonthlyAmountTeamKeys(resourceType));
  if (!allowedTeamKeys.size) {
    return {};
  }

  const normalized = {};
  Object.entries(entries).forEach(([rawMonthValue, rawTeamEntries]) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (!monthValue || !isPlainObject(rawTeamEntries)) {
      return;
    }

    const nextTeamEntries = {};
    Object.entries(rawTeamEntries).forEach(([rawTeamKey, rawValue]) => {
      const teamKey = normalizeText(rawTeamKey);
      if (!allowedTeamKeys.has(teamKey)) {
        return;
      }

      const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
      const shouldPreferCurrentValue =
        teamKey === storageKey || !Object.prototype.hasOwnProperty.call(nextTeamEntries, storageKey);

      if (rawValue === null) {
        if (shouldPreferCurrentValue) {
          nextTeamEntries[storageKey] = null;
        }
        return;
      }

      const amountValue = normalizeTeamMonthlyAmountValue(rawValue, null);
      if (!Number.isFinite(amountValue)) {
        return;
      }

      if (!shouldPreferCurrentValue) {
        return;
      }

      nextTeamEntries[storageKey] = amountValue;
    });

    if (Object.keys(nextTeamEntries).length) {
      normalized[monthValue] = nextTeamEntries;
    }
  });

  return normalized;
}

function mergeTeamMonthlyEntriesWithPresetLocalStore(
  currentEntries,
  presetEntries,
  resourceType = getCurrentResourceType()
) {
  const normalizedCurrent = normalizeTeamMonthlyEntries(currentEntries, resourceType);
  const normalizedPreset = normalizeTeamMonthlyEntries(presetEntries, resourceType);
  const mergedEntries = {};
  const monthValues = new Set([
    ...Object.keys(normalizedPreset),
    ...Object.keys(normalizedCurrent),
  ]);

  monthValues.forEach((monthValue) => {
    const nextMonthEntries = {
      ...(normalizedPreset[monthValue] || {}),
      ...(normalizedCurrent[monthValue] || {}),
    };

    if (Object.keys(nextMonthEntries).length) {
      mergedEntries[monthValue] = nextMonthEntries;
    }
  });

  return mergedEntries;
}

function mergeTeamMonthlyAmountEntriesWithPresetLocalStore(
  currentEntries,
  presetEntries,
  resourceType = getCurrentResourceType()
) {
  const normalizedCurrent = normalizeTeamMonthlyAmountEntries(currentEntries, resourceType);
  const normalizedPreset = normalizeTeamMonthlyAmountEntries(presetEntries, resourceType);
  const mergedEntries = {};
  const monthValues = new Set([
    ...Object.keys(normalizedPreset),
    ...Object.keys(normalizedCurrent),
  ]);

  monthValues.forEach((monthValue) => {
    const nextMonthEntries = {
      ...(normalizedPreset[monthValue] || {}),
      ...(normalizedCurrent[monthValue] || {}),
    };

    if (Object.keys(nextMonthEntries).length) {
      mergedEntries[monthValue] = nextMonthEntries;
    }
  });

  return mergedEntries;
}

function selectPreferredTeamAssignments(currentAssignments, presetAssignments) {
  const currentMap = isPlainObject(currentAssignments) ? currentAssignments : {};
  const presetMap = isPlainObject(presetAssignments) ? presetAssignments : {};

  return countPopulatedTeamAssignments(currentMap) >= countPopulatedTeamAssignments(presetMap)
    ? currentMap
    : presetMap;
}

function mergeResourceDatasetWithPresetLocalStore(currentDataset, presetDataset, resourceType) {
  const normalizedType = normalizeResourceType(resourceType);
  const currentSource = isPlainObject(currentDataset) ? currentDataset : {};
  const presetSource = isPlainObject(presetDataset) ? presetDataset : {};

  return {
    ...presetSource,
    ...currentSource,
    mode:
      normalizedType === RESOURCE_TYPES.WASTE
        ? MODES.TEAM
        : currentSource.mode === MODES.TEAM
          ? MODES.TEAM
          : MODES.EQUIPMENT,
    equipmentItems: mergeEquipmentItemsWithPresetLocalStore(
      currentSource.equipmentItems,
      presetSource.equipmentItems
    ),
    equipmentEntries: mergeEquipmentEntriesWithPresetLocalStore(
      currentSource.equipmentEntries,
      presetSource.equipmentEntries
    ),
    teamAssignments:
      normalizedType === RESOURCE_TYPES.WASTE
        ? {}
        : selectPreferredTeamAssignments(
            currentSource.teamAssignments,
            presetSource.teamAssignments
          ),
    teamMonthlyEntries: mergeTeamMonthlyEntriesWithPresetLocalStore(
      currentSource.teamMonthlyEntries,
      presetSource.teamMonthlyEntries,
      normalizedType
    ),
    teamMonthlyAmountEntries: mergeTeamMonthlyAmountEntriesWithPresetLocalStore(
      currentSource.teamMonthlyAmountEntries,
      presetSource.teamMonthlyAmountEntries,
      normalizedType
    ),
    ...mergeBillingResourceStoreSections(currentSource, presetSource, normalizedType),
  };
}

function mergeCurrentStoreWithPresetLocalStore(currentStore, presetLocalStore) {
  if (!isPlainObject(presetLocalStore)) {
    return currentStore;
  }

  if (!isPlainObject(currentStore)) {
    return presetLocalStore;
  }

  const currentResourceType = normalizeText(currentStore.resourceType);
  const presetResourceType = normalizeText(presetLocalStore.resourceType);
  const resolvedResourceType = normalizeResourceType(currentResourceType || presetResourceType);

  const currentElectricDataset = extractRawResourceDataset(currentStore, RESOURCE_TYPES.ELECTRIC);
  const presetElectricDataset = extractRawResourceDataset(
    presetLocalStore,
    RESOURCE_TYPES.ELECTRIC
  );
  const currentGasDataset = extractRawResourceDataset(currentStore, RESOURCE_TYPES.GAS);
  const presetGasDataset = extractRawResourceDataset(presetLocalStore, RESOURCE_TYPES.GAS);
  const currentWasteDataset = extractRawResourceDataset(currentStore, RESOURCE_TYPES.WASTE);
  const presetWasteDataset = extractRawResourceDataset(presetLocalStore, RESOURCE_TYPES.WASTE);
  const currentProductionDataset = extractRawResourceDataset(
    currentStore,
    RESOURCE_TYPES.PRODUCTION
  );
  const presetProductionDataset = extractRawResourceDataset(
    presetLocalStore,
    RESOURCE_TYPES.PRODUCTION
  );

  return {
    ...presetLocalStore,
    ...currentStore,
    resourceType: resolvedResourceType,
    resourceDatasets: {
      [RESOURCE_TYPES.ELECTRIC]: mergeResourceDatasetWithPresetLocalStore(
        currentElectricDataset,
        presetElectricDataset,
        RESOURCE_TYPES.ELECTRIC
      ),
      [RESOURCE_TYPES.GAS]: mergeResourceDatasetWithPresetLocalStore(
        currentGasDataset,
        presetGasDataset,
        RESOURCE_TYPES.GAS
      ),
      [RESOURCE_TYPES.WASTE]: mergeResourceDatasetWithPresetLocalStore(
        currentWasteDataset,
        presetWasteDataset,
        RESOURCE_TYPES.WASTE
      ),
      [RESOURCE_TYPES.PRODUCTION]: mergeResourceDatasetWithPresetLocalStore(
        currentProductionDataset,
        presetProductionDataset,
        RESOURCE_TYPES.PRODUCTION
      ),
    },
    equipmentItems: mergeEquipmentItemsWithPresetLocalStore(
      currentStore.equipmentItems,
      presetLocalStore.equipmentItems
    ),
    equipmentEntries: mergeEquipmentEntriesWithPresetLocalStore(
      currentStore.equipmentEntries,
      presetLocalStore.equipmentEntries
    ),
    teamAssignments: selectPreferredTeamAssignments(
      currentStore.teamAssignments,
      presetLocalStore.teamAssignments
    ),
    teamMonthlyEntries: mergeTeamMonthlyEntriesWithPresetLocalStore(
      currentStore.teamMonthlyEntries,
      presetLocalStore.teamMonthlyEntries,
      resolvedResourceType
    ),
    teamMonthlyAmountEntries: mergeTeamMonthlyAmountEntriesWithPresetLocalStore(
      currentStore.teamMonthlyAmountEntries,
      presetLocalStore.teamMonthlyAmountEntries,
      resolvedResourceType
    ),
    ...mergeBillingStoreSections(currentStore, presetLocalStore, resolvedResourceType),
  };
}
