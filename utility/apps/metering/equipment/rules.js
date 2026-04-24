function normalizeEquipmentFactorLabel(label) {
  return normalizeText(label).toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function hasEquipmentLabelConflict(label, exceptId = "") {
  const labelKey = normalizeEquipmentFactorLabel(label);
  if (!labelKey) {
    return false;
  }

  return state.store.equipmentItems.some(
      (item) => item?.id !== exceptId && normalizeEquipmentFactorLabel(item?.label) === labelKey
  );
}

function getEquipmentItem(equipmentId) {
  return state.store.equipmentItems.find((item) => item.id === equipmentId) || null;
}

function isOtherEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  return normalizeEquipmentFactorLabel(equipment.label) === OTHER_EQUIPMENT_LABEL_KEY;
}

function isAutoCalculatedEquipment(equipment) {
  return isOtherEquipment(equipment);
}

function canManageEquipmentDecimalDigits(equipment) {
  if (!equipment || isAutoCalculatedEquipment(equipment)) {
    return false;
  }

  return !(
    isTotalPowerSummaryEquipment(equipment) ||
    isReactiveSummaryEquipment(equipment) ||
    isActivePowerEquipment(equipment) ||
    isReactivePowerEquipment(equipment)
  );
}

function getDefaultUsageFactorByLabel(label) {
  const normalizedLabel = normalizeEquipmentFactorLabel(label);
  return EQUIPMENT_USAGE_FACTORS[normalizedLabel] ?? DEFAULT_USAGE_FACTOR;
}

function normalizeUsageFactor(value, fallback = DEFAULT_USAGE_FACTOR) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/,/g, "").trim();
    const parsedValue = Number.parseFloat(normalizedValue);
    if (Number.isFinite(parsedValue) && parsedValue >= 0) {
      return parsedValue;
    }
  }

  return fallback;
}

function normalizeEquipmentDecimalDigits(value, fallback = null) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const parsedValue =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseInt(String(value).trim(), 10);

  if (!Number.isInteger(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, 0), EQUIPMENT_INPUT_FRACTION_DIGITS);
}
