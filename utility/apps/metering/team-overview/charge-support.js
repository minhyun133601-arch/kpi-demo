function getTeamChargeEquipmentIds(teamKey, options = {}) {
  return options.selectionOnly ? getTeamCalendarSelection(teamKey) : getTeamAssignedEquipmentIds(teamKey);
}

function shouldApplySharedCompressorSettlement(monthValue = state.currentMonth) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  return (
    !isGasResourceType() &&
    Boolean(normalizedMonth) &&
    compareMonthValues(normalizedMonth, SHARED_COMPRESSOR_SETTLEMENT_START_MONTH) >= 0
  );
}

function getSharedCompressorSettlementRatio(teamKey, monthValue = state.currentMonth) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return null;
  }

  const ratio = SHARED_COMPRESSOR_SETTLEMENT_RATIOS[teamKey];
  return Number.isFinite(ratio) ? ratio : null;
}

function getSharedCompressorSettlementSourceIdsForTeam(teamKey) {
  const sourceIds = SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM[teamKey];
  if (!Array.isArray(sourceIds) || !sourceIds.length) {
    return [];
  }

  const teamEquipmentIds = getTeamAssignedEquipmentIds(teamKey);
  return sourceIds.filter((equipmentId) => teamEquipmentIds.includes(equipmentId));
}

function getSharedCompressorSettlementSourceIds() {
  const sourceIds = Object.keys(SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM).flatMap((teamKey) =>
    getSharedCompressorSettlementSourceIdsForTeam(teamKey)
  );
  return [...new Set(sourceIds)];
}

function getTeamChargeEquipmentIdsExcludingSharedCompressor(
  teamKey,
  monthValue = state.currentMonth,
  options = {}
) {
  const equipmentIds = getTeamChargeEquipmentIds(teamKey, options);
  const ratio = getSharedCompressorSettlementRatio(teamKey, monthValue);
  if (!Number.isFinite(ratio)) {
    return equipmentIds;
  }

  return equipmentIds.filter(
    (equipmentId) =>
      !SHARED_COMPRESSOR_SETTLEMENT_SOURCE_ID_SET.has(equipmentId) &&
      !isSharedCompressorVirtualEquipmentId(equipmentId)
  );
}

function isTeamSharedCompressorSettlementSelected(
  teamKey,
  monthValue = state.currentMonth,
  options = {}
) {
  const ratio = getSharedCompressorSettlementRatio(teamKey, monthValue);
  if (!Number.isFinite(ratio)) {
    return false;
  }

  if (!options.selectionOnly) {
    return true;
  }

  return getTeamChargeEquipmentIds(teamKey, options).includes(SHARED_COMPRESSOR_VIRTUAL_ID);
}

function calculateSharedCompressorSettlementUsageSum(monthValue = state.currentMonth) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return null;
  }

  const values = getSharedCompressorSettlementSourceIds().map(
    (equipmentId) => calculateEquipmentMonthlyUsage(equipmentId).value
  );
  return sumFiniteValues(values);
}

function calculateSharedCompressorSettlementVariableChargeSum(monthValue = state.currentMonth) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return null;
  }

  const values = getSharedCompressorSettlementSourceIds().map((equipmentId) =>
    calculateEquipmentVariableCharge(equipmentId, monthValue)
  );
  return sumFiniteValues(values);
}

function calculateSharedCompressorSettlementBaseChargeSum(monthValue = state.currentMonth) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return null;
  }

  const values = getSharedCompressorSettlementSourceIds().map((equipmentId) =>
    calculateEquipmentBaseChargeAllocation(equipmentId, monthValue)
  );
  return sumFiniteValues(values);
}

function getTeamSharedCompressorSettlementValue(
  teamKey,
  totalValue,
  monthValue = state.currentMonth,
  options = {}
) {
  const ratio = getSharedCompressorSettlementRatio(teamKey, monthValue);
  if (
    !Number.isFinite(ratio) ||
    !Number.isFinite(totalValue) ||
    !isTeamSharedCompressorSettlementSelected(teamKey, monthValue, options)
  ) {
    return null;
  }

  return totalValue * ratio;
}

function calculateTeamSharedCompressorSettlementUsage(
  teamKey,
  monthValue = state.currentMonth,
  options = {}
) {
  return getTeamSharedCompressorSettlementValue(
    teamKey,
    calculateSharedCompressorSettlementUsageSum(monthValue),
    monthValue,
    options
  );
}

function calculateTeamSharedCompressorSettlementCharge(
  teamKey,
  monthValue = state.currentMonth,
  options = {}
) {
  const variableCharge = getTeamSharedCompressorSettlementValue(
    teamKey,
    calculateSharedCompressorSettlementVariableChargeSum(monthValue),
    monthValue,
    options
  );
  const baseCharge = getTeamSharedCompressorSettlementValue(
    teamKey,
    calculateSharedCompressorSettlementBaseChargeSum(monthValue),
    monthValue,
    options
  );

  return sumFiniteValues([variableCharge, baseCharge]);
}

function getTeamSharedCompressorSettlementChargeText(teamKey, monthValue = state.currentMonth) {
  const charge = calculateTeamSharedCompressorSettlementCharge(teamKey, monthValue);
  return Number.isFinite(charge) ? `금액 ${formatSettlementAmount(charge)}` : "";
}

function getTeamSharedCompressorSettlementDetailText(teamKey, monthValue = state.currentMonth) {
  const totalUsage = calculateSharedCompressorSettlementUsageSum(monthValue);
  const teamUsage = calculateTeamSharedCompressorSettlementUsage(teamKey, monthValue);
  const ratio = getSharedCompressorSettlementRatio(teamKey, monthValue);

  if (!Number.isFinite(totalUsage) || !Number.isFinite(teamUsage) || !Number.isFinite(ratio)) {
    return "";
  }

  const parts = [
    `Compressor 380V + Compressor 합계 ${formatWholeNumber(totalUsage)} x 배분 ${formatUsageShare(
      ratio
    )} = ${formatWholeNumber(teamUsage)}`,
  ];

  if (isBillingSettlementCompleted(monthValue)) {
    const variableCharge = getTeamSharedCompressorSettlementValue(
      teamKey,
      calculateSharedCompressorSettlementVariableChargeSum(monthValue),
      monthValue
    );
    const baseCharge = getTeamSharedCompressorSettlementValue(
      teamKey,
      calculateSharedCompressorSettlementBaseChargeSum(monthValue),
      monthValue
    );
    const charge = calculateTeamSharedCompressorSettlementCharge(teamKey, monthValue);

    if (Number.isFinite(variableCharge)) {
      parts.push(`사용량요금 ${formatSettlementAmount(variableCharge)}`);
    }

    if (Number.isFinite(baseCharge)) {
      parts.push(`기본요금 배분 ${formatSettlementAmount(baseCharge)}`);
    }

    if (Number.isFinite(charge)) {
      parts.push(`최종 금액 ${formatSettlementAmount(charge)}`);
    }
  }

  return parts.join("\n");
}

function calculateTeamEquipmentVariableChargeSum(teamKey, monthValue = state.currentMonth, options = {}) {
  const charges = getTeamChargeEquipmentIdsExcludingSharedCompressor(teamKey, monthValue, options)
    .map((equipmentId) => calculateEquipmentVariableCharge(equipmentId, monthValue))
    .filter((value) => Number.isFinite(value));
  const sharedCharge = getTeamSharedCompressorSettlementValue(
    teamKey,
    calculateSharedCompressorSettlementVariableChargeSum(monthValue),
    monthValue,
    options
  );

  if (Number.isFinite(sharedCharge)) {
    charges.push(sharedCharge);
  }

  if (!charges.length) {
    return null;
  }

  return charges.reduce((sum, value) => sum + value, 0);
}

function calculateTeamBaseChargeAllocationSum(teamKey, monthValue = state.currentMonth, options = {}) {
  const allocations = getTeamChargeEquipmentIdsExcludingSharedCompressor(teamKey, monthValue, options)
    .map((equipmentId) => calculateEquipmentBaseChargeAllocation(equipmentId, monthValue))
    .filter((value) => Number.isFinite(value));
  const sharedAllocation = getTeamSharedCompressorSettlementValue(
    teamKey,
    calculateSharedCompressorSettlementBaseChargeSum(monthValue),
    monthValue,
    options
  );

  if (Number.isFinite(sharedAllocation)) {
    allocations.push(sharedAllocation);
  }

  if (!allocations.length) {
    return null;
  }

  return allocations.reduce((sum, value) => sum + value, 0);
}
