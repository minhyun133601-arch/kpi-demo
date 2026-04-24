function getAllEquipmentIds() {
  return state.store.equipmentItems.map((item) => item.id);
}

function isActivePowerEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return ACTIVE_POWER_DEFAULT_IDS.has(equipment.id) || ACTIVE_POWER_LABEL_KEYS.has(labelKey);
}

function isReactivePowerEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return REACTIVE_POWER_DEFAULT_IDS.has(equipment.id) || REACTIVE_POWER_LABEL_KEYS.has(labelKey);
}

function isUsageCalculationExcludedEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return (
    REACTIVE_USAGE_EXCLUDED_DEFAULT_IDS.has(equipment.id) ||
    REACTIVE_USAGE_EXCLUDED_LABEL_KEYS.has(labelKey)
  );
}

function isSummaryOnlyEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return SUMMARY_ONLY_DEFAULT_IDS.has(equipment.id) || SUMMARY_ONLY_LABEL_KEYS.has(labelKey);
}

function getEquipmentFirstRecordedMonth(equipmentId) {
  if (!equipmentId) {
    return "";
  }

  const firstRecordedDate = Object.keys(state.store.equipmentEntries)
    .sort()
    .find((dateString) => {
      if (!dateString || dateString.length < 10) {
        return false;
      }

      const entryValue = state.store.equipmentEntries[dateString]?.values?.[equipmentId];
      return normalizeEntryValue(entryValue) !== "";
    });

  if (!firstRecordedDate) {
    return "";
  }

  return firstRecordedDate.slice(0, 7);
}

function getEquipmentVisibleFromMonth(equipment) {
  if (!equipment) {
    return "";
  }

  const explicitVisibleFromMonth = normalizeMonthValue(equipment.visibleFromMonth);
  if (explicitVisibleFromMonth) {
    return explicitVisibleFromMonth;
  }

  if (equipment.id === "field_16") {
    return getEquipmentFirstRecordedMonth(equipment.id);
  }

  return "";
}

function getEquipmentHiddenFromDate(equipment) {
  if (!equipment) {
    return "";
  }

  const normalizedValue = normalizeText(equipment.hiddenFromDate);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalizedValue) ? normalizedValue : "";
}

function getEquipmentVisibilityContextDate(dateString = state.selectedDate) {
  if (dateString) {
    return dateString;
  }

  if (!state.currentMonth) {
    return "";
  }

  return getLatestEntryDateInMonth(state.currentMonth) || getLatestAvailableDate(state.currentMonth);
}

function shouldHideEquipmentFieldBeforeFirstRecordedMonth(equipment, monthValue = state.currentMonth) {
  if (!equipment || !monthValue) {
    return false;
  }

  const visibleFromMonth = getEquipmentVisibleFromMonth(equipment);
  if (!visibleFromMonth) {
    return false;
  }

  return compareMonthValues(monthValue, visibleFromMonth) < 0;
}

function shouldHideEquipmentFieldOnOrAfterHiddenDate(
  equipment,
  dateString = getEquipmentVisibilityContextDate()
) {
  if (!equipment || !dateString) {
    return false;
  }

  const hiddenFromDate = getEquipmentHiddenFromDate(equipment);
  if (!hiddenFromDate) {
    return false;
  }

  return dateString >= hiddenFromDate;
}

function isHiddenEquipmentFieldCard(equipment, dateString = getEquipmentVisibilityContextDate()) {
  return (
    isSummaryOnlyEquipment(equipment) ||
    shouldHideEquipmentFieldBeforeFirstRecordedMonth(equipment) ||
    shouldHideEquipmentFieldOnOrAfterHiddenDate(equipment, dateString)
  );
}

function isTotalPowerSummaryEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  return normalizeEquipmentFactorLabel(equipment.label) === normalizeEquipmentFactorLabel("유효전력의 합");
}

function isReactiveSummaryEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  return normalizeEquipmentFactorLabel(equipment.label) === normalizeEquipmentFactorLabel("무효전력의 합");
}

function isExcludedFromEquipmentSummary(equipment) {
  return (
    isOtherEquipment(equipment) ||
    isActivePowerEquipment(equipment) ||
    isReactivePowerEquipment(equipment) ||
    isSummaryOnlyEquipment(equipment)
  );
}

function isEquipmentUsageShareTarget(equipment) {
  if (!equipment) {
    return false;
  }

  return isOtherEquipment(equipment) || !isExcludedFromEquipmentSummary(equipment);
}

function getGasOverallTrackedEquipmentIds() {
  if (!isGasResourceType()) {
    return [];
  }

  return state.store.equipmentItems.map((item) => item.id);
}

function getDefaultCalendarTrackedEquipmentIds() {
  if (isGasResourceType()) {
    return getGasOverallTrackedEquipmentIds();
  }

  if (isWasteResourceType()) {
    return [];
  }

  return getConfiguredTotalPowerEquipmentIds();
}

function getEquipmentSummaryIds() {
  return state.store.equipmentItems
    .filter((item) => !isExcludedFromEquipmentSummary(item))
    .map((item) => item.id);
}
