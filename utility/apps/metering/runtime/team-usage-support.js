function getCorrectedEquipmentMonthlyUsage(equipmentId) {
  const usage = calculateEquipmentMonthlyUsage(equipmentId).value;
  if (usage === null) {
    return null;
  }

  if (isGasResourceType() && equipmentId === GAS_LPG_CORRECTION_EQUIPMENT_ID) {
    return usage * GAS_LPG_CORRECTION_USAGE_FACTOR;
  }

  return usage;
}

function getGasTeamDisplayUsageFactor(equipmentId) {
  if (!isGasResourceType()) {
    return null;
  }

  if (equipmentId === GAS_TOTAL_USAGE_EQUIPMENT_ID) {
    return 1;
  }

  if (equipmentId === GAS_LPG_CORRECTION_EQUIPMENT_ID) {
    return GAS_LPG_CORRECTION_USAGE_FACTOR;
  }

  if (GAS_CORRECTION_TARGET_IDS.has(equipmentId)) {
    const factor = calculateGasCorrectionFactorForMonth();
    return Number.isFinite(factor) ? factor : null;
  }

  return null;
}

function isGasTeamDisplayUsageEquipment(equipmentId) {
  return Number.isFinite(getGasTeamDisplayUsageFactor(equipmentId));
}

function getTeamAssignedChipDisplayUsage(equipmentId) {
  const usage = calculateEquipmentMonthlyUsage(equipmentId).value;
  if (usage === null) {
    return null;
  }

  const factor = getGasTeamDisplayUsageFactor(equipmentId);
  if (!Number.isFinite(factor)) {
    return usage;
  }

  return usage * factor;
}

function getTeamAssignedChipUsageText(equipmentId) {
  if (isGasTeamDisplayUsageEquipment(equipmentId)) {
    return formatDailyUsage(getTeamAssignedChipDisplayUsage(equipmentId));
  }

  return formatEquipmentUsage(equipmentId);
}

function getTeamAssignedChipChargeText(equipmentId, monthValue = state.currentMonth) {
  if (isGasTeamDisplayUsageEquipment(equipmentId)) {
    return "(사용량)";
  }

  return getEquipmentUsageChargeText(equipmentId, monthValue);
}

function getTeamAssignedChipDetailText(equipmentId) {
  const detailText = getEquipmentUsageDetailText(equipmentId);
  if (!isGasTeamDisplayUsageEquipment(equipmentId)) {
    return detailText;
  }

  const usage = calculateEquipmentMonthlyUsage(equipmentId).value;
  const displayUsage = getTeamAssignedChipDisplayUsage(equipmentId);
  const factor = getGasTeamDisplayUsageFactor(equipmentId);
  if (!Number.isFinite(usage) || !Number.isFinite(displayUsage) || !Number.isFinite(factor)) {
    return detailText;
  }

  const displayDetailText = `팀별 표시 사용량 ${formatWholeNumber(usage)} x ${formatNumber(
    factor
  )} = ${formatWholeNumber(displayUsage)}`;
  return detailText ? `${detailText}\n${displayDetailText}` : displayDetailText;
}

function shouldShowTeamAssignedChipShare(teamKey) {
  return (
    Boolean(teamKey) &&
    !isPowerActiveTeamKey(teamKey) &&
    !isPowerReactiveTeamKey(teamKey) &&
    getSelectedTeamKeys().includes(teamKey)
  );
}

function getTeamAssignedChipShareUsageValue(teamKey, equipmentId, options = {}) {
  if (!teamKey || !equipmentId) {
    return null;
  }

  const selectionOnly = options.selectionOnly === true;
  const activeIds = selectionOnly ? getTeamCalendarSelection(teamKey) : getTeamCalendarSelectableIds(teamKey);
  if (!activeIds.includes(equipmentId)) {
    return null;
  }

  if (equipmentId === SHARED_COMPRESSOR_VIRTUAL_ID) {
    const sharedUsage = calculateTeamSharedCompressorSettlementUsage(teamKey, state.currentMonth, {
      selectionOnly,
    });
    return Number.isFinite(sharedUsage) ? sharedUsage : null;
  }

  const usage = isGasTeamDisplayUsageEquipment(equipmentId)
    ? getTeamAssignedChipDisplayUsage(equipmentId)
    : calculateDisplayedEquipmentMonthlyUsage(equipmentId).value;
  return Number.isFinite(usage) ? usage : null;
}

function getTeamAssignedChipShareTotalUsage(teamKey, options = {}) {
  if (!teamKey) {
    return null;
  }

  const selectionOnly = options.selectionOnly === true;
  const total = (selectionOnly ? getTeamCalendarSelection(teamKey) : getTeamCalendarSelectableIds(teamKey))
    .map((equipmentId) =>
      getTeamAssignedChipShareUsageValue(teamKey, equipmentId, {
        selectionOnly,
      })
    )
    .filter((value) => value !== null);

  if (!total.length) {
    return null;
  }

  return total.reduce((sum, value) => sum + value, 0);
}

function getTeamAssignedChipShareText(teamKey, equipmentId, options = {}) {
  const usage = getTeamAssignedChipShareUsageValue(teamKey, equipmentId, options);
  const totalUsage = getTeamAssignedChipShareTotalUsage(teamKey, options);
  const usageShare = calculateUsageShare(usage, totalUsage);
  if (usageShare === null) {
    return "";
  }

  return `팀 기준 ${formatUsageShare(usageShare)}`;
}

function getTeamAssignedChipShareDetailText(teamKey, equipmentId, options = {}) {
  const usage = getTeamAssignedChipShareUsageValue(teamKey, equipmentId, options);
  const totalUsage = getTeamAssignedChipShareTotalUsage(teamKey, options);
  const usageShare = calculateUsageShare(usage, totalUsage);
  if (usageShare === null) {
    return "";
  }

  const teamLabel = getTeamDisplayLabel(teamKey) || "선택 팀";
  return `${teamLabel} 합계 ${formatDailyUsage(totalUsage)} 중 ${formatDailyUsage(
    usage
  )} = ${formatUsageShare(usageShare)}`;
}

function getTeamCorrectedMonthlyUsage(teamKey, options = {}) {
  if (!isGasResourceType()) {
    return null;
  }

  const values = getTeamChargeEquipmentIdsExcludingSharedCompressor(teamKey, state.currentMonth, options)
    .map((equipmentId) => getCorrectedEquipmentMonthlyUsage(equipmentId))
    .filter((value) => value !== null);
  const sharedUsage = calculateTeamSharedCompressorSettlementUsage(teamKey, state.currentMonth, options);

  if (Number.isFinite(sharedUsage)) {
    values.push(sharedUsage);
  }

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function getSelectedTeamCorrectedSummaryInfo() {
  const selectedTeamKeys = getSelectedTeamKeys();
  if (!selectedTeamKeys.length) {
    return null;
  }

  const label =
    selectedTeamKeys.length === 1
      ? `${getTeamDisplayLabel(selectedTeamKeys[0]) || "선택 팀"} 보정 사용량`
      : `선택 팀 ${selectedTeamKeys.length}개 보정 사용량`;
  const values = selectedTeamKeys
    .map((teamKey) => getTeamCorrectedMonthlyUsage(teamKey, { selectionOnly: true }))
    .filter((value) => value !== null);

  return {
    value: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
    label: `${label} (LPG x ${formatNumber(GAS_LPG_CORRECTION_USAGE_FACTOR)})`,
  };
}

function getTeamMonthlyUsage(teamKey, options = {}) {
  if (supportsDirectTeamMonthlyUsage(teamKey)) {
    return getDirectTeamMonthlyUsage(teamKey);
  }

  const values = getTeamChargeEquipmentIdsExcludingSharedCompressor(teamKey, state.currentMonth, options)
    .map((equipmentId) => calculateEquipmentMonthlyUsage(equipmentId).value)
    .filter((value) => value !== null);
  const sharedUsage = calculateTeamSharedCompressorSettlementUsage(teamKey, state.currentMonth, options);

  if (Number.isFinite(sharedUsage)) {
    values.push(sharedUsage);
  }

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}
