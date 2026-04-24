function getFirstRecordedEquipmentReadingDetailInMonth(equipmentId, monthValue) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return null;
  }

  const timeline = getEquipmentReadingTimeline(equipmentId);
  const orderedDates = Array.isArray(timeline?.orderedDates) ? timeline.orderedDates : [];
  const detailsByDate = timeline?.detailsByDate;
  if (!(detailsByDate instanceof Map)) {
    return null;
  }

  for (const dateString of orderedDates) {
    if (!dateString.startsWith(`${normalizedMonth}-`)) {
      continue;
    }

    const detail = detailsByDate.get(dateString);
    if (detail) {
      return {
        dateString,
        rawValue: detail.rawValue,
        value: detail.value,
        fractionDigits: detail.fractionDigits,
      };
    }
  }

  return null;
}

function hasGasMonthlyBoundaryReadingOverrideForMonth(monthValue = state.currentMonth) {
  if (!isGasResourceType()) {
    return false;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return false;
  }

  return countPlainObjectKeys(GAS_MONTHLY_BOUNDARY_READING_OVERRIDES[normalizedMonth]) > 0;
}

function getGasMonthlyBoundaryOverrideDisplayMeta(equipmentId, monthValue = state.currentMonth) {
  if (!isGasResourceType()) {
    return null;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return null;
  }

  const overrideConfig = GAS_MONTHLY_BOUNDARY_READING_OVERRIDES[normalizedMonth]?.[equipmentId];
  if (!isPlainObject(overrideConfig)) {
    return null;
  }

  const nextMonthValue = normalizeMonthValue(shiftMonthValue(normalizedMonth, 1));
  const startBoundary = getFirstRecordedEquipmentReadingDetailInMonth(equipmentId, normalizedMonth);
  const endBoundary = getFirstRecordedEquipmentReadingDetailInMonth(equipmentId, nextMonthValue);
  if (!startBoundary || !endBoundary) {
    return null;
  }

  const hasStartOverride = Number.isFinite(overrideConfig.startReading);
  const hasEndOverride = Number.isFinite(overrideConfig.endReading);
  if (!hasStartOverride && !hasEndOverride) {
    return null;
  }

  const startAdjustmentValue = getEffectiveEquipmentReadingAdjustmentValue(
    equipmentId,
    startBoundary.dateString
  );
  const endAdjustmentValue = getEffectiveEquipmentReadingAdjustmentValue(
    equipmentId,
    endBoundary.dateString
  );
  const overrideStartAdjustedReading = hasStartOverride
    ? overrideConfig.startReading
    : startBoundary.value;
  const overrideEndAdjustedReading = hasEndOverride ? overrideConfig.endReading : endBoundary.value;

  return {
    monthValue: normalizedMonth,
    equipmentId,
    startDate: startBoundary.dateString,
    endDate: endBoundary.dateString,
    hasStartOverride,
    hasEndOverride,
    startAdjustmentValue,
    endAdjustmentValue,
    storedStartRawReading: startBoundary.rawValue,
    storedStartAdjustedReading: startBoundary.value,
    storedEndRawReading: endBoundary.rawValue,
    storedEndAdjustedReading: endBoundary.value,
    overrideStartAdjustedReading,
    overrideEndAdjustedReading,
    overrideStartRawReading: hasStartOverride
      ? overrideStartAdjustedReading - startAdjustmentValue
      : startBoundary.rawValue,
    overrideEndRawReading: hasEndOverride
      ? overrideEndAdjustedReading - endAdjustmentValue
      : endBoundary.rawValue,
  };
}

function getGasMonthlyBoundaryOverrideDetailText(equipmentId, monthValue = state.currentMonth) {
  const overrideMeta = getGasMonthlyBoundaryOverrideDisplayMeta(equipmentId, monthValue);
  if (!overrideMeta) {
    return "";
  }

  const parts = [];
  if (
    overrideMeta.hasStartOverride &&
    Number.isFinite(overrideMeta.overrideStartRawReading) &&
    Number.isFinite(overrideMeta.storedStartRawReading)
  ) {
    parts.push(
      `시작 경계(${formatShortDate(overrideMeta.startDate)}): 계산값 ${formatWholeNumber(
        overrideMeta.overrideStartRawReading
      )} / 시트값 ${formatWholeNumber(overrideMeta.storedStartRawReading)}`
    );
  }
  if (
    overrideMeta.hasEndOverride &&
    Number.isFinite(overrideMeta.overrideEndRawReading) &&
    Number.isFinite(overrideMeta.storedEndRawReading)
  ) {
    parts.push(
      `종료 경계(${formatShortDate(overrideMeta.endDate)}): 계산값 ${formatWholeNumber(
        overrideMeta.overrideEndRawReading
      )} / 시트값 ${formatWholeNumber(overrideMeta.storedEndRawReading)}`
    );
  }
  parts.push(`이 보정은 ${overrideMeta.monthValue} 월간 계산에만 적용`);
  return parts.join("\n");
}

function getGasMonthlyBoundaryOverrideBadgeText(equipmentId, monthValue = state.currentMonth) {
  const overrideMeta = getGasMonthlyBoundaryOverrideDisplayMeta(equipmentId, monthValue);
  if (!overrideMeta) {
    return "";
  }

  if (
    overrideMeta.hasEndOverride &&
    Number.isFinite(overrideMeta.overrideEndRawReading) &&
    Number.isFinite(overrideMeta.storedEndRawReading)
  ) {
    return `경계보정 ${formatWholeNumber(overrideMeta.overrideEndRawReading)} / 시트 ${formatWholeNumber(
      overrideMeta.storedEndRawReading
    )}`;
  }

  if (
    overrideMeta.hasStartOverride &&
    Number.isFinite(overrideMeta.overrideStartRawReading) &&
    Number.isFinite(overrideMeta.storedStartRawReading)
  ) {
    return `경계보정 ${formatWholeNumber(
      overrideMeta.overrideStartRawReading
    )} / 시트 ${formatWholeNumber(overrideMeta.storedStartRawReading)}`;
  }

  return "";
}

function getGasMonthlyBoundaryUsageWindow(equipmentId, monthValue = state.currentMonth) {
  if (!isGasResourceType()) {
    return null;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return null;
  }

  const nextMonthValue = normalizeMonthValue(shiftMonthValue(normalizedMonth, 1));
  const startBoundary = getFirstRecordedEquipmentReadingDetailInMonth(equipmentId, normalizedMonth);
  const endBoundary = getFirstRecordedEquipmentReadingDetailInMonth(equipmentId, nextMonthValue);
  if (!startBoundary || !endBoundary) {
    return null;
  }

  const startDate = startBoundary.dateString;
  const endDate = endBoundary.dateString;
  const boundaryReadingOverrides = GAS_MONTHLY_BOUNDARY_READING_OVERRIDES[normalizedMonth]?.[equipmentId];
  const startReading = Number.isFinite(boundaryReadingOverrides?.startReading)
    ? boundaryReadingOverrides.startReading
    : startBoundary.value;
  const endReading = Number.isFinite(boundaryReadingOverrides?.endReading)
    ? boundaryReadingOverrides.endReading
    : endBoundary.value;
  if (startReading === null || endReading === null) {
    return null;
  }

  return {
    startDate,
    endDate,
    startReading,
    endReading,
  };
}
