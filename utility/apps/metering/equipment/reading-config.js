function normalizeEquipmentReadingAdjustmentValue(value, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const normalizedValue = value.replace(/,/g, "").trim();
    if (!normalizedValue) {
      return fallback;
    }

    const parsedValue = Number.parseFloat(normalizedValue);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return fallback;
}

function normalizeEquipmentReadingAdjustmentStartDate(value) {
  const normalizedValue = normalizeText(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return "";
  }

  return formatDate(parseDateString(normalizedValue)) === normalizedValue ? normalizedValue : "";
}

function getEquipmentReadingAdjustment(equipment) {
  if (!equipment) {
    return null;
  }

  const startDate = normalizeEquipmentReadingAdjustmentStartDate(
    equipment.readingAdjustmentStartDate
  );
  const value = normalizeEquipmentReadingAdjustmentValue(equipment.readingAdjustmentValue, 0);
  if (!startDate || !Number.isFinite(value) || value === 0) {
    return null;
  }

  return {
    startDate,
    value,
  };
}

function getEffectiveEquipmentReadingAdjustmentValue(equipmentId, dateString) {
  if (!dateString) {
    return 0;
  }

  const equipment = getEquipmentItem(equipmentId);
  const adjustment = getEquipmentReadingAdjustment(equipment);
  if (!adjustment || dateString < adjustment.startDate) {
    return 0;
  }

  return adjustment.value;
}

function applyEquipmentReadingAdjustment(equipmentId, rawValue, dateString) {
  const adjustmentValue = getEffectiveEquipmentReadingAdjustmentValue(equipmentId, dateString);
  return rawValue + adjustmentValue;
}

function getEquipmentUsageFactor(equipmentId) {
  const equipment = getEquipmentItem(equipmentId);
  if (!equipment) {
    return DEFAULT_USAGE_FACTOR;
  }

  if (isAutoCalculatedEquipment(equipment)) {
    return 1;
  }

  return normalizeUsageFactor(equipment.factor, getDefaultUsageFactorByLabel(equipment.label));
}

function getEquipmentDecimalDigits(equipmentId) {
  const equipment = getEquipmentItem(equipmentId);
  if (!equipment) {
    return 0;
  }

  const fallbackDigits = isGasResourceType() ? 0 : getLatestRecordedEquipmentFractionDigits(equipmentId);
  return normalizeEquipmentDecimalDigits(equipment.decimalDigits, fallbackDigits) ?? 0;
}

function formatUsageFactor(value) {
  return formatNumber(normalizeUsageFactor(value));
}

function formatEquipmentDecimalDigitsLabel(equipmentId) {
  return `소수점 ${getEquipmentDecimalDigits(equipmentId)}자리`;
}
