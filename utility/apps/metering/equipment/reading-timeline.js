function getStoredEquipmentReadingDetailOnDate(equipmentId, dateString) {
  const entry = state.store.equipmentEntries[dateString];
  if (!entry) {
    return null;
  }

  const rawValue = normalizeEntryValue(entry.values?.[equipmentId]);
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    rawValue,
    value: parsedValue,
  };
}

function getLatestRecordedEquipmentFractionDigits(equipmentId) {
  const orderedDates = Object.keys(state.store.equipmentEntries).sort().reverse();
  for (const dateString of orderedDates) {
    const detail = getStoredEquipmentReadingDetailOnDate(equipmentId, dateString);
    if (detail?.rawValue) {
      return getEntryFractionDigits(detail.rawValue);
    }
  }

  return 0;
}

function isStickReadingWrapEquipment(equipmentId) {
  return normalizeText(equipmentId) === STICK_FIELD_ID;
}

function unwrapEquipmentReadingValue(equipmentId, rawValue, minimumValue = null) {
  if (!isStickReadingWrapEquipment(equipmentId) || !Number.isFinite(minimumValue)) {
    return rawValue;
  }

  let candidateValue = rawValue;
  while (candidateValue < minimumValue) {
    candidateValue += STICK_READING_WRAP_BASE;
  }

  return candidateValue;
}

function clearEquipmentReadingTimelineCaches() {
  equipmentReadingTimelineCache.clear();
  equipmentValidationReadingTimelineCache.clear();
}

function getStoredValidationReadingSourceDetailOnDate(equipmentId, dateString) {
  const storedDetail = getStoredEquipmentReadingDetailOnDate(equipmentId, dateString);
  if (!storedDetail) {
    return null;
  }

  const correctedRawValue = getValidationCorrectedEntryRawValue(equipmentId, dateString);
  const rawValue = correctedRawValue || storedDetail.rawValue;
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  return {
    rawValue,
    value: parsedValue,
    fractionDigits: getEntryFractionDigits(rawValue),
  };
}

function buildResolvedEquipmentReadingTimeline(equipmentId, sourceDetailResolver) {
  const orderedDates = [];
  const detailsByDate = new Map();
  let previousResolvedValue = null;

  Object.keys(state.store.equipmentEntries)
    .sort()
    .forEach((dateString) => {
      const sourceDetail = sourceDetailResolver(equipmentId, dateString);
      if (!sourceDetail) {
        return;
      }

      const adjustedValue = applyEquipmentReadingAdjustment(
        equipmentId,
        sourceDetail.value,
        dateString
      );
      const resolvedValue = unwrapEquipmentReadingValue(
        equipmentId,
        adjustedValue,
        previousResolvedValue
      );
      const resolvedDetail = {
        rawValue: sourceDetail.rawValue,
        value: resolvedValue,
        fractionDigits:
          sourceDetail.fractionDigits ?? getEntryFractionDigits(sourceDetail.rawValue),
      };

      orderedDates.push(dateString);
      detailsByDate.set(dateString, resolvedDetail);
      previousResolvedValue = resolvedValue;
    });

  return {
    orderedDates,
    detailsByDate,
  };
}

function getResolvedEquipmentReadingTimeline(cacheMap, equipmentId, sourceDetailResolver) {
  const normalizedEquipmentId = normalizeText(equipmentId);
  if (!normalizedEquipmentId) {
    return {
      orderedDates: [],
      detailsByDate: new Map(),
    };
  }

  if (!cacheMap.has(normalizedEquipmentId)) {
    cacheMap.set(
      normalizedEquipmentId,
      buildResolvedEquipmentReadingTimeline(normalizedEquipmentId, sourceDetailResolver)
    );
  }

  return cacheMap.get(normalizedEquipmentId);
}

function getEquipmentReadingTimeline(equipmentId) {
  return getResolvedEquipmentReadingTimeline(
    equipmentReadingTimelineCache,
    equipmentId,
    getStoredEquipmentReadingDetailOnDate
  );
}

function getValidationReadingTimeline(equipmentId) {
  return getResolvedEquipmentReadingTimeline(
    equipmentValidationReadingTimelineCache,
    equipmentId,
    getStoredValidationReadingSourceDetailOnDate
  );
}

function getEquipmentReadingDetailOnDate(equipmentId, dateString) {
  return getEquipmentReadingTimeline(equipmentId).detailsByDate.get(dateString) || null;
}

function getValidationCorrectedEntryRawValue(equipmentId, dateString) {
  if (dateString?.endsWith("-01")) {
    return "";
  }

  return normalizeEntryValue(ENTRY_VALUE_CORRECTIONS?.[dateString]?.[equipmentId]);
}

function getValidationReadingDetailOnDate(equipmentId, dateString, options = {}) {
  const { currentRawValue = null, preferCurrentRawValue = false } = options;
  const normalizedCurrentRawValue = normalizeEntryValue(currentRawValue);
  if (!(preferCurrentRawValue && normalizedCurrentRawValue !== "")) {
    return getValidationReadingTimeline(equipmentId).detailsByDate.get(dateString) || null;
  }

  let rawValue = normalizedCurrentRawValue;
  if (!rawValue) {
    return null;
  }

  const parsedValue = Number.parseFloat(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return null;
  }

  const adjustedValue = applyEquipmentReadingAdjustment(equipmentId, parsedValue, dateString);
  const previousReading = isStickReadingWrapEquipment(equipmentId)
    ? getAdjacentValidationRecordedEquipmentReading(equipmentId, dateString, -1)
    : null;

  return {
    rawValue,
    value: unwrapEquipmentReadingValue(equipmentId, adjustedValue, previousReading?.value ?? null),
    fractionDigits: getEntryFractionDigits(rawValue),
  };
}
