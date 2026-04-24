function countPlainObjectKeys(value) {
  return isPlainObject(value) ? Object.keys(value).length : 0;
}

function countPopulatedEquipmentEntryValues(entry) {
  return countPlainObjectKeys(isPlainObject(entry) ? entry.values : null);
}

function shouldApplyLegacyGasFebruary2025DateShiftEntry(entry) {
  if (!isPlainObject(entry) || !countPopulatedEquipmentEntryValues(entry)) {
    return false;
  }

  const cutoffUpdatedAt = Date.parse(LEGACY_GAS_2025_02_SHIFT_CUTOFF_UPDATED_AT);
  const entryUpdatedAt = Date.parse(normalizeText(entry.updatedAt));
  if (!Number.isFinite(cutoffUpdatedAt)) {
    return true;
  }

  return !Number.isFinite(entryUpdatedAt) || entryUpdatedAt < cutoffUpdatedAt;
}

function applyLegacyGasFebruary2025DateShift(entries) {
  const sourceEntries = isPlainObject(entries) ? entries : {};
  if (!countPlainObjectKeys(sourceEntries)) {
    return sourceEntries;
  }

  const shiftedEntries = { ...sourceEntries };
  LEGACY_GAS_2025_02_DATE_SHIFT_MAP.forEach((correctDateKey, legacyDateKey) => {
    const legacyEntry = shiftedEntries[legacyDateKey];
    if (!shouldApplyLegacyGasFebruary2025DateShiftEntry(legacyEntry)) {
      return;
    }

    const correctEntry = shiftedEntries[correctDateKey];
    if (!isPlainObject(correctEntry)) {
      shiftedEntries[correctDateKey] = legacyEntry;
      delete shiftedEntries[legacyDateKey];
      return;
    }

    const legacyValueCount = countPopulatedEquipmentEntryValues(legacyEntry);
    const correctValueCount = countPopulatedEquipmentEntryValues(correctEntry);
    const legacyUpdatedAt = Date.parse(normalizeText(legacyEntry.updatedAt));
    const correctUpdatedAt = Date.parse(normalizeText(correctEntry.updatedAt));
    if (
      legacyValueCount > correctValueCount ||
      (legacyValueCount === correctValueCount &&
        Number.isFinite(legacyUpdatedAt) &&
        (!Number.isFinite(correctUpdatedAt) || legacyUpdatedAt > correctUpdatedAt))
    ) {
      shiftedEntries[correctDateKey] = legacyEntry;
    }

    delete shiftedEntries[legacyDateKey];
  });

  return shiftedEntries;
}

function hasSameGasEntryValues(firstEntry, secondEntry) {
  if (!isPlainObject(firstEntry) || !isPlainObject(secondEntry)) {
    return false;
  }

  const firstValues = isPlainObject(firstEntry.values) ? firstEntry.values : {};
  const secondValues = isPlainObject(secondEntry.values) ? secondEntry.values : {};
  let populatedCount = 0;

  for (const item of GAS_METER_ITEM_DEFINITIONS) {
    const firstValue = normalizeEntryValue(firstValues[item.id]);
    const secondValue = normalizeEntryValue(secondValues[item.id]);
    if (firstValue || secondValue) {
      populatedCount += 1;
    }

    if (firstValue !== secondValue) {
      return false;
    }
  }

  return populatedCount > 0;
}

function pruneLegacyShiftedGasEntries(entries) {
  const sourceEntries = isPlainObject(entries) ? entries : {};
  if (!countPlainObjectKeys(sourceEntries)) {
    return sourceEntries;
  }

  const prunedEntries = { ...sourceEntries };
  Object.keys(sourceEntries)
    .sort()
    .forEach((dateString) => {
      if (
        dateString < LEGACY_SHIFTED_GAS_ENTRY_START_DATE ||
        dateString > LEGACY_SHIFTED_GAS_ENTRY_END_DATE
      ) {
        return;
      }

      const nextDateString = getNextDateString(dateString);
      if (!hasSameGasEntryValues(prunedEntries[dateString], prunedEntries[nextDateString])) {
        return;
      }

      delete prunedEntries[dateString];
    });

  return prunedEntries;
}

function mergeEquipmentEntriesWithPresetLocalStore(currentEntries, presetEntries) {
  const currentMap = isPlainObject(currentEntries) ? currentEntries : {};
  const presetMap = isPlainObject(presetEntries) ? presetEntries : {};

  if (!countPlainObjectKeys(currentMap)) {
    return presetMap;
  }

  if (!countPlainObjectKeys(presetMap)) {
    return currentMap;
  }

  const mergedEntries = {};
  const allDates = new Set([...Object.keys(presetMap), ...Object.keys(currentMap)]);
  allDates.forEach((dateKey) => {
    const currentEntry = currentMap[dateKey];
    const presetEntry = presetMap[dateKey];

    if (!isPlainObject(currentEntry)) {
      mergedEntries[dateKey] = presetEntry;
      return;
    }

    if (!isPlainObject(presetEntry)) {
      mergedEntries[dateKey] = currentEntry;
      return;
    }

    const currentValueCount = countPopulatedEquipmentEntryValues(currentEntry);
    const presetValueCount = countPopulatedEquipmentEntryValues(presetEntry);

    if (presetValueCount > currentValueCount) {
      mergedEntries[dateKey] = presetEntry;
      return;
    }

    if (currentValueCount > presetValueCount) {
      mergedEntries[dateKey] = currentEntry;
      return;
    }

    const currentUpdatedAt = Date.parse(normalizeText(currentEntry.updatedAt));
    const presetUpdatedAt = Date.parse(normalizeText(presetEntry.updatedAt));
    mergedEntries[dateKey] =
      Number.isFinite(presetUpdatedAt) &&
      (!Number.isFinite(currentUpdatedAt) || presetUpdatedAt > currentUpdatedAt)
        ? presetEntry
        : currentEntry;
  });

  return mergedEntries;
}

function mergeEquipmentItemsWithPresetLocalStore(currentItems, presetItems) {
  const currentList = Array.isArray(currentItems) ? currentItems : [];
  const presetList = Array.isArray(presetItems) ? presetItems : [];

  if (!currentList.length) {
    return presetList;
  }

  if (!presetList.length) {
    return currentList;
  }

  const presetById = new Map(
    presetList.map((item, index) => [
      normalizeText(item?.id) || `field_${String(index + 1).padStart(2, "0")}`,
      item,
    ])
  );
  const seenIds = new Set();
  const mergedItems = currentList.map((item, index) => {
    const normalizedId =
      normalizeText(item?.id) || `field_${String(index + 1).padStart(2, "0")}`;
    const presetItem = presetById.get(normalizedId);
    seenIds.add(normalizedId);

    return {
      ...(presetItem || {}),
      ...(item || {}),
      id: normalizeText(item?.id) || presetItem?.id || normalizedId,
      visibleFromMonth:
        normalizeMonthValue(item?.visibleFromMonth) ||
        normalizeMonthValue(presetItem?.visibleFromMonth) ||
        "",
      hiddenFromDate:
        normalizeText(item?.hiddenFromDate) ||
        normalizeText(presetItem?.hiddenFromDate) ||
        "",
    };
  });

  presetList.forEach((item, index) => {
    const normalizedId =
      normalizeText(item?.id) || `field_${String(index + 1).padStart(2, "0")}`;
    if (!seenIds.has(normalizedId)) {
      mergedItems.push(item);
    }
  });

  return mergedItems;
}

function isGasCorrectionTargetEquipment(equipmentId) {
  return isGasResourceType() && GAS_CORRECTION_TARGET_IDS.has(equipmentId);
}

function createDefaultStore() {
  return normalizeStore({
    resourceType: RESOURCE_TYPES.ELECTRIC,
    resourceDatasets: {
      [RESOURCE_TYPES.ELECTRIC]: createDefaultResourceDataset(RESOURCE_TYPES.ELECTRIC),
      [RESOURCE_TYPES.GAS]: createDefaultResourceDataset(RESOURCE_TYPES.GAS),
      [RESOURCE_TYPES.WASTE]: createDefaultResourceDataset(RESOURCE_TYPES.WASTE),
      [RESOURCE_TYPES.PRODUCTION]: createDefaultResourceDataset(RESOURCE_TYPES.PRODUCTION),
    },
  });
}
