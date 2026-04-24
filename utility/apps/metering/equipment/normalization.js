function clearEquipmentEntriesForResetMonths(entries) {
  return Object.fromEntries(
    Object.entries(entries).filter(
      ([dateString]) =>
        !CLEARED_ENTRY_MONTH_PREFIXES.some((prefix) => dateString.startsWith(prefix))
    )
  );
}

function normalizeEquipmentItems(items, resourceType = RESOURCE_TYPES.ELECTRIC) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  if (!Array.isArray(items)) {
    return (
      normalizedResourceType === RESOURCE_TYPES.GAS
        ? DEFAULT_GAS_EQUIPMENT_ITEMS
        : normalizedResourceType === RESOURCE_TYPES.WASTE
          ? DEFAULT_WASTE_EQUIPMENT_ITEMS
          : normalizedResourceType === RESOURCE_TYPES.PRODUCTION
            ? DEFAULT_PRODUCTION_EQUIPMENT_ITEMS
            : DEFAULT_EQUIPMENT_ITEMS
    ).map((item) => ({ ...item }));
  }

  if (normalizedResourceType === RESOURCE_TYPES.GAS) {
    const gasItemLookup = new Map();
    const createGasLabelKey = (value) =>
      normalizeText(value)
        .toLowerCase()
        .replace(/\s+/g, "")
        .replace(/[()]/g, "");

    items.forEach((item, index) => {
      const fallbackId = `gas_field_${String(index + 1).padStart(2, "0")}`;
      const normalizedItem = {
        id: normalizeText(item?.id) || fallbackId,
        label: normalizeText(item?.label),
        factor: normalizeUsageFactor(item?.factor, 1),
        decimalDigits: normalizeEquipmentDecimalDigits(item?.decimalDigits, 0),
        visibleFromMonth: normalizeMonthValue(item?.visibleFromMonth),
        hiddenFromDate: /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(item?.hiddenFromDate))
          ? normalizeText(item?.hiddenFromDate)
          : "",
        readingAdjustmentValue: normalizeEquipmentReadingAdjustmentValue(
          item?.readingAdjustmentValue,
          0
        ),
        readingAdjustmentStartDate: normalizeEquipmentReadingAdjustmentStartDate(
          item?.readingAdjustmentStartDate
        ),
      };

      if (normalizedItem.label) {
        gasItemLookup.set(createGasLabelKey(normalizedItem.label), normalizedItem);
      }
      gasItemLookup.set(normalizedItem.id, normalizedItem);
    });

    return DEFAULT_GAS_EQUIPMENT_ITEMS.map((defaultItem) => {
      const matchedItem =
        gasItemLookup.get(defaultItem.id) || gasItemLookup.get(createGasLabelKey(defaultItem.label));

      return {
        ...defaultItem,
        factor: normalizeUsageFactor(matchedItem?.factor, defaultItem.factor),
        decimalDigits: normalizeEquipmentDecimalDigits(
          matchedItem?.decimalDigits,
          normalizeEquipmentDecimalDigits(defaultItem?.decimalDigits, 0)
        ),
        visibleFromMonth: normalizeMonthValue(matchedItem?.visibleFromMonth),
        hiddenFromDate: /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(matchedItem?.hiddenFromDate))
          ? normalizeText(matchedItem?.hiddenFromDate)
          : "",
        readingAdjustmentValue: normalizeEquipmentReadingAdjustmentValue(
          matchedItem?.readingAdjustmentValue,
          0
        ),
        readingAdjustmentStartDate: normalizeEquipmentReadingAdjustmentStartDate(
          matchedItem?.readingAdjustmentStartDate
        ),
      };
    });
  }

  const seenIds = new Set();
  const normalizedItems = items
    .map((item, index) => {
      const id = normalizeText(item?.id) || `field_${String(index + 1).padStart(2, "0")}`;
      const requestedLabel = normalizeText(item?.label);
      const defaultItem = DEFAULT_ELECTRIC_EQUIPMENT_ITEM_BY_ID.get(id);
      const label =
        defaultItem && looksLikeBrokenKoreanText(requestedLabel)
          ? defaultItem.label
          : requestedLabel;

      return {
        id,
        label,
        factor: normalizeUsageFactor(item?.factor, getDefaultUsageFactorByLabel(label)),
        decimalDigits: normalizeEquipmentDecimalDigits(item?.decimalDigits, null),
        visibleFromMonth: normalizeMonthValue(item?.visibleFromMonth),
        hiddenFromDate: /^\d{4}-\d{2}-\d{2}$/.test(normalizeText(item?.hiddenFromDate))
          ? normalizeText(item?.hiddenFromDate)
          : "",
        readingAdjustmentValue: normalizeEquipmentReadingAdjustmentValue(
          item?.readingAdjustmentValue,
          0
        ),
        readingAdjustmentStartDate: normalizeEquipmentReadingAdjustmentStartDate(
          item?.readingAdjustmentStartDate
        ),
      };
    })
    .filter((item) => item.label)
    .filter((item) => {
      if (seenIds.has(item.id)) {
        return false;
      }

      seenIds.add(item.id);
      return true;
    });

  const hasOtherEquipment = normalizedItems.some((item) => isOtherEquipment(item));
  if (normalizedResourceType === RESOURCE_TYPES.ELECTRIC && !hasOtherEquipment) {
    normalizedItems.push({
      id: OTHER_EQUIPMENT_DEFAULT_ID,
      label: "기타",
      factor: getDefaultUsageFactorByLabel("기타"),
    });
  }

  return normalizedItems;
}

function applyRequestedEquipmentFactorMigration(items) {
  return items.map((item) => {
    const labelKey = normalizeEquipmentFactorLabel(item?.label);
    const factor = normalizeUsageFactor(item?.factor, getDefaultUsageFactorByLabel(item?.label));

    if ((labelKey === "Process Gamma" || labelKey === "Process Gamma1") && factor === 200) {
      return {
        ...item,
        factor: 1,
      };
    }

    if (labelKey === "Break Area") {
      return {
        ...item,
        factor: 1,
      };
    }

    if (labelKey === "Process Gamma2") {
      return {
        ...item,
        visibleFromMonth: "2025-07",
      };
    }

    return item;
  });
}

function insertEquipmentItemAfter(items, afterId, nextItem) {
  const targetIndex = items.findIndex((item) => item?.id === afterId);
  if (targetIndex < 0) {
    items.push(nextItem);
    return;
  }

  items.splice(targetIndex + 1, 0, nextItem);
}

function createNormalizedStickItem(baseItem) {
  const labelKey = normalizeEquipmentFactorLabel(baseItem?.label);
  const keepLabel =
    labelKey &&
    !["Process Beta", "Process Beta#1", "Process Beta#2", "Process Beta(구)"].includes(labelKey);

  return {
    ...(baseItem || {}),
    id: STICK_FIELD_ID,
    label: keepLabel ? normalizeText(baseItem?.label) : STICK_FIELD_LABEL,
    factor: normalizeUsageFactor(baseItem?.factor, getDefaultUsageFactorByLabel(STICK_FIELD_LABEL)),
    visibleFromMonth: "",
    hiddenFromDate: "",
  };
}

function collapseLegacyStickEntryMap(entryMap, hasValue) {
  const preferredValue = LEGACY_STICK_FIELD_IDS
    .map((fieldId) => entryMap?.[fieldId])
    .filter((value) => hasValue(value))
    .pop();

  LEGACY_STICK_FIELD_IDS.forEach((fieldId) => {
    if (fieldId !== STICK_FIELD_ID) {
      delete entryMap[fieldId];
    }
  });

  if (hasValue(preferredValue)) {
    entryMap[STICK_FIELD_ID] = preferredValue;
    return;
  }

  delete entryMap[STICK_FIELD_ID];
}

function applyRequestedStickSingleEquipmentMigration(items, entries) {
  const nextItems = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
  const entryMap = isPlainObject(entries) ? entries : {};
  const stickLabelKeys = new Set(
    ["Process Beta", "Process Beta (구)", "Process Beta #1", "Process Beta #2"].map((label) => normalizeEquipmentFactorLabel(label))
  );
  const baseItem = nextItems.find(
    (item) =>
      LEGACY_STICK_FIELD_IDS.includes(item?.id) ||
      stickLabelKeys.has(normalizeEquipmentFactorLabel(item?.label))
  );

  if (baseItem) {
    let hasInsertedStickItem = false;
    const normalizedItems = [];

    nextItems.forEach((item) => {
      const isLegacyStickItem =
        LEGACY_STICK_FIELD_IDS.includes(item?.id) ||
        stickLabelKeys.has(normalizeEquipmentFactorLabel(item?.label));

      if (!isLegacyStickItem) {
        normalizedItems.push(item);
        return;
      }

      if (!hasInsertedStickItem) {
        normalizedItems.push(createNormalizedStickItem(item));
        hasInsertedStickItem = true;
      }
    });

    if (!hasInsertedStickItem) {
      insertEquipmentItemAfter(normalizedItems, "field_12", createNormalizedStickItem(baseItem));
    }

    nextItems.length = 0;
    nextItems.push(...normalizedItems);
  }

  const nextEntries = {};

  Object.entries(entryMap).forEach(([dateString, entry]) => {
    if (!isPlainObject(entry)) {
      nextEntries[dateString] = entry;
      return;
    }

    const nextEntry = {
      ...entry,
      values: { ...(entry.values || {}) },
      statuses: { ...(entry.statuses || {}) },
      fieldDayStatuses: { ...(entry.fieldDayStatuses || {}) },
    };

    collapseLegacyStickEntryMap(nextEntry.values, (value) => normalizeEntryValue(value) !== "");
    collapseLegacyStickEntryMap(
      nextEntry.statuses,
      (value) => normalizeEquipmentFieldStatus(value) !== ""
    );
    collapseLegacyStickEntryMap(
      nextEntry.fieldDayStatuses,
      (value) => normalizeEquipmentFieldDayStatus(value) !== ""
    );

    nextEntries[dateString] = nextEntry;
  });

  return {
    equipmentItems: nextItems,
    equipmentEntries: nextEntries,
  };
}

function migrateLegacyStickTeamAssignments(assignments) {
  if (!isPlainObject(assignments)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(assignments).map(([teamKey, rawList]) => {
      if (!Array.isArray(rawList)) {
        return [teamKey, rawList];
      }

      const nextList = [];
      rawList.forEach((rawValue) => {
        const equipmentId = normalizeText(rawValue);
        if (!equipmentId) {
          return;
        }

        const normalizedEquipmentId = LEGACY_STICK_FIELD_IDS.includes(equipmentId)
          ? STICK_FIELD_ID
          : equipmentId;
        if (!nextList.includes(normalizedEquipmentId)) {
          nextList.push(normalizedEquipmentId);
        }
      });

      return [teamKey, nextList];
    })
  );
}

function applyRequestedEntryStatusBaseline(entries) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const normalized = {};

  Object.entries(entries).forEach(([dateString, entry]) => {
    if (!isPlainObject(entry)) {
      return;
    }

    const nextStatus = getEntryDayStatus(entry) === "completed" ? "completed" : "";
    const normalizedEntry = {
      values: { ...(entry.values || {}) },
      statuses: { ...(entry.statuses || {}) },
      fieldDayStatuses: {},
      dayStatus: nextStatus,
      completed: nextStatus === "completed",
      updatedAt: entry.updatedAt,
    };

    if (hasEntryData(normalizedEntry)) {
      normalized[dateString] = normalizedEntry;
    }
  });

  return normalized;
}

function applyRequestedHistoricalEntryValueFixes(entries) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const nextEntries = { ...entries };

  Object.entries(HISTORICAL_ENTRY_VALUE_FIXES).forEach(([dateString, fixedValues]) => {
    const currentEntry = nextEntries[dateString];
    if (!isPlainObject(currentEntry)) {
      return;
    }

    const nextValues = { ...(currentEntry.values || {}) };
    let didChange = false;

    Object.entries(fixedValues).forEach(([fieldKey, fixedValue]) => {
      const normalizedValue = normalizeEntryValue(fixedValue);
      if (!normalizedValue) {
        return;
      }

      if (normalizeEntryValue(nextValues[fieldKey]) === normalizedValue) {
        return;
      }

      nextValues[fieldKey] = normalizedValue;
      didChange = true;
    });

    if (didChange) {
      nextEntries[dateString] = {
        ...currentEntry,
        values: nextValues,
      };
    }
  });

  return nextEntries;
}

function restoreValidationCorrectionEntries(entries) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const presetEntries = getPresetEquipmentEntries();
  if (!isPlainObject(presetEntries) || !countPlainObjectKeys(presetEntries)) {
    return entries;
  }

  const nextEntries = { ...entries };

  Object.entries(ENTRY_VALUE_CORRECTIONS).forEach(([dateString, correctedValues]) => {
    const currentEntry = nextEntries[dateString];
    const presetEntry = presetEntries[dateString];
    if (!isPlainObject(currentEntry) || !isPlainObject(presetEntry)) {
      return;
    }

    let didRestore = false;
    const nextValues = { ...(currentEntry.values || {}) };

    Object.entries(correctedValues).forEach(([fieldKey, correctedRawValue]) => {
      const currentRawValue = normalizeEntryValue(nextValues[fieldKey]);
      const presetRawValue = normalizeEntryValue(presetEntry.values?.[fieldKey]);
      if (!currentRawValue || !presetRawValue) {
        return;
      }

      if (currentRawValue === normalizeEntryValue(correctedRawValue) && currentRawValue !== presetRawValue) {
        nextValues[fieldKey] = presetRawValue;
        didRestore = true;
      }
    });

    if (didRestore) {
      nextEntries[dateString] = {
        ...currentEntry,
        values: nextValues,
      };
    }
  });

  return nextEntries;
}

function normalizeEquipmentEntries(entries) {
  if (!isPlainObject(entries)) {
    return {};
  }

  const normalized = {};

  Object.entries(entries).forEach(([dateString, entry]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString) || !isPlainObject(entry)) {
      return;
    }

    const values = {};
    const statuses = {};
    if (isPlainObject(entry.values)) {
      Object.entries(entry.values).forEach(([fieldKey, value]) => {
        const normalizedKey = normalizeText(fieldKey);
        const normalizedValue = normalizeEntryValue(value);
        if (normalizedKey && normalizedValue !== "") {
          values[normalizedKey] = normalizedValue;
        }
      });
    }

    if (isPlainObject(entry.statuses)) {
      Object.entries(entry.statuses).forEach(([fieldKey, status]) => {
        const normalizedKey = normalizeText(fieldKey);
        const normalizedStatus = normalizeEquipmentFieldStatus(status);
        if (normalizedKey && normalizedStatus) {
          statuses[normalizedKey] = normalizedStatus;
        }
      });
    }

    const normalizedEntry = {
      values,
      statuses,
      fieldDayStatuses: {},
      dayStatus: getEntryDayStatus(entry),
      completed: getEntryDayStatus(entry) === "completed",
    };

    if (typeof entry.updatedAt === "string" && entry.updatedAt) {
      normalizedEntry.updatedAt = entry.updatedAt;
    }

    if (hasEntryData(normalizedEntry)) {
      normalized[dateString] = normalizedEntry;
    }
  });

  return normalized;
}

function pruneEquipmentEntriesByVisibility(entries, equipmentItems) {
  if (!isPlainObject(entries)) {
    return {};
  }

  if (!Array.isArray(equipmentItems) || !equipmentItems.length) {
    return entries;
  }

  const normalized = {};

  Object.entries(entries).forEach(([dateString, entry]) => {
    if (!isPlainObject(entry)) {
      return;
    }

    const nextEntry = {
      values: { ...(entry.values || {}) },
      statuses: { ...(entry.statuses || {}) },
      fieldDayStatuses: {},
      dayStatus: getEntryDayStatus(entry),
      completed: getEntryDayStatus(entry) === "completed",
      updatedAt: entry.updatedAt,
    };

    equipmentItems.forEach((item) => {
      const visibleFromMonth = normalizeMonthValue(item?.visibleFromMonth);
      const hiddenFromDate = getEquipmentHiddenFromDate(item);

      if (visibleFromMonth && compareMonthValues(dateString.slice(0, 7), visibleFromMonth) < 0) {
        delete nextEntry.values[item.id];
        delete nextEntry.statuses[item.id];
      }

      if (hiddenFromDate && dateString >= hiddenFromDate) {
        delete nextEntry.values[item.id];
        delete nextEntry.statuses[item.id];
      }
    });

    if (hasEntryData(nextEntry)) {
      normalized[dateString] = nextEntry;
    }
  });

  return normalized;
}
