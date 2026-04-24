function calculateEquipmentDailyUsage(equipmentId, dateString, options = {}) {
  const usage = calculateEquipmentDailyUsageBase(equipmentId, options?.dateString || dateString, options);
  if (isGasResourceType()) {
    return usage;
  }

  if (!isGasCorrectionTargetEquipment(equipmentId) || usage.value === null || usage.difference === null) {
    return usage;
  }

  const gasCorrectionFactor = calculateGasCorrectionFactorForMonth(dateString.slice(0, 7));
  if (!Number.isFinite(gasCorrectionFactor)) {
    return usage;
  }

  return {
    ...usage,
    value: usage.difference * gasCorrectionFactor,
    factor: gasCorrectionFactor,
    gasCorrectionFactor,
  };
}

function calculateEquipmentCalendarDailyUsage(equipmentId, dateString) {
  const usage = calculateEquipmentCalendarDailyUsageBase(equipmentId, dateString);
  if (isGasResourceType()) {
    return usage;
  }

  if (!isGasCorrectionTargetEquipment(equipmentId) || usage.value === null || usage.difference === null) {
    return usage;
  }

  const gasCorrectionFactor = calculateGasCorrectionFactorForMonth(dateString.slice(0, 7));
  if (!Number.isFinite(gasCorrectionFactor)) {
    return usage;
  }

  return {
    ...usage,
    value: usage.difference * gasCorrectionFactor,
    factor: gasCorrectionFactor,
    gasCorrectionFactor,
  };
}

function calculateEquipmentMonthlyUsage(equipmentId, options = {}) {
  const usage = calculateEquipmentMonthlyUsageBase(equipmentId, options);
  if (isGasResourceType()) {
    return usage;
  }

  if (!isGasCorrectionTargetEquipment(equipmentId) || usage.value === null || usage.difference === null) {
    return usage;
  }

  const gasCorrectionFactor = calculateGasCorrectionFactorForMonth(options?.monthValue || state.currentMonth);
  if (!Number.isFinite(gasCorrectionFactor)) {
    return usage;
  }

  return {
    ...usage,
    value: usage.difference * gasCorrectionFactor,
    factor: gasCorrectionFactor,
    gasCorrectionFactor,
  };
}

function calculateDisplayedEquipmentMonthlyUsage(equipmentId) {
  const equipment = getEquipmentItem(equipmentId);
  if (isUsageCalculationExcludedEquipment(equipment)) {
    return calculateEquipmentMonthlyUsage(equipmentId, {
      includeExcludedUsage: true,
      factorOverride: 1,
    });
  }

  return calculateEquipmentMonthlyUsage(equipmentId);
}

function getEquipmentUsageDetailText(equipmentId) {
  const equipment = getEquipmentItem(equipmentId);
  if (isOtherEquipment(equipment)) {
    const totalPowerUsage = calculateTotalPowerMonthlyUsage();
    const equipmentUsage = calculateEquipmentGroupMonthlyUsage(getEquipmentSummaryIds());
    const otherUsage = calculateOtherMonthlyUsage();
    const chargeDetailText = getEquipmentUsageChargeDetailText(equipmentId);

    if (totalPowerUsage === null) {
      const dailyTotalPowerUsage = calculateEquipmentGroupMonthlyUsage(
        getDefaultCalendarTrackedEquipmentIds()
      );
      if (dailyTotalPowerUsage === null) {
        return "전력 총량 사용량이 있어야 기타를 계산할 수 있습니다.";
      }

      const baseText = `전력 총량 일별 합계 ${formatWholeNumber(
        dailyTotalPowerUsage
      )} - 설비 사용량 일별 합계 ${formatWholeNumber(
        equipmentUsage ?? 0
      )} = 기타 ${formatWholeNumber(otherUsage ?? 0)}`;
      return chargeDetailText ? `${baseText}\n${chargeDetailText}` : baseText;
    }

    const baseText = `전력총량 월 합계 ${formatWholeNumber(totalPowerUsage)} - 설비 사용량 월 합계 ${formatWholeNumber(
      equipmentUsage ?? 0
    )} = 기타 ${formatWholeNumber(otherUsage ?? 0)}`;
    return chargeDetailText ? `${baseText}\n${chargeDetailText}` : baseText;
  }

  if (isGasResourceType()) {
    const usage = calculateEquipmentMonthlyUsage(equipmentId);
    if (!usage.daysCount || usage.value === null || usage.difference === null) {
      return "해당 월의 일별 차이를 계산할 검침값이 부족합니다.";
    }

    const basePeriodText = `${formatShortDate(usage.startDate)} ~ ${formatShortDate(
      usage.endDate
    )} 일별 차이 합계 ${formatNumber(usage.difference)}`;

    const usageText =
      isGasCorrectionTargetEquipment(equipmentId) && Number.isFinite(usage.gasCorrectionFactor)
        ? `${basePeriodText} x 월 가스 보정 ${formatNumber(usage.gasCorrectionFactor)} = ${formatWholeNumber(
            usage.value
          )}`
        : `${basePeriodText} = ${formatWholeNumber(usage.value)}`;
    const boundaryOverrideText = getGasMonthlyBoundaryOverrideDetailText(equipmentId);
    return boundaryOverrideText ? `${usageText}\n${boundaryOverrideText}` : usageText;
  }

  if (isUsageCalculationExcludedEquipment(equipment)) {
    const usage = calculateDisplayedEquipmentMonthlyUsage(equipmentId);
    if (!usage.daysCount || usage.value === null || usage.difference === null) {
      return "해당 월의 일별 차이를 계산할 검침값이 부족합니다.";
    }

    const baseText = `${formatShortDate(usage.startDate)} ~ ${formatShortDate(
      usage.endDate
    )} 일별 차이 합계 ${formatNumber(usage.difference)} x 승률 ${formatNumber(
      usage.factor
    )} = ${formatWholeNumber(usage.value)}`;
    const chargeDetailText = getEquipmentUsageChargeDetailText(equipmentId);
    return chargeDetailText ? `${baseText}\n${chargeDetailText}` : baseText;
  }

  const usage = calculateEquipmentMonthlyUsage(equipmentId);

  if (!usage.daysCount || usage.value === null || usage.difference === null) {
    return "해당 월의 일별 차이를 계산할 검침값이 부족합니다.";
  }

  const baseText = `${formatShortDate(usage.startDate)} ~ ${formatShortDate(
    usage.endDate
  )} 일별 차이 합계 ${formatNumber(usage.difference)} x 승률 ${formatNumber(
    usage.factor
  )} = ${formatWholeNumber(usage.value)}`;
  const chargeDetailText = getEquipmentUsageChargeDetailText(equipmentId);
  return chargeDetailText ? `${baseText}\n${chargeDetailText}` : baseText;
}

function formatEquipmentUsage(equipmentId) {
  const usage = calculateDisplayedEquipmentMonthlyUsage(equipmentId).value;
  return usage === null ? "-" : formatWholeNumber(usage);
}

function calculateEquipmentBaseChargeAllocation(equipmentId, monthValue = state.currentMonth) {
  const equipment = getEquipmentItem(equipmentId);
  if (!isEquipmentUsageShareTarget(equipment)) {
    return null;
  }

  const usage = calculateDisplayedEquipmentMonthlyUsage(equipmentId).value;
  const totalPowerUsage = calculateTotalPowerMonthlyUsageWindow(monthValue).value;
  const baseCharge = getBillingSettlementBaseCharge(monthValue);
  const usageShare = calculateUsageShare(usage, totalPowerUsage);

  if (!Number.isFinite(baseCharge) || !Number.isFinite(usageShare)) {
    return null;
  }

  return baseCharge * usageShare;
}

function calculateEquipmentVariableCharge(equipmentId, monthValue = state.currentMonth) {
  const usage = calculateDisplayedEquipmentMonthlyUsage(equipmentId).value;
  const unitPrice = getBillingSettlementUnitPrice(monthValue);

  if (!Number.isFinite(usage) || !Number.isFinite(unitPrice)) {
    return null;
  }

  return usage * unitPrice;
}

function calculateEquipmentUsageCharge(equipmentId, monthValue = state.currentMonth) {
  if (!isBillingSettlementCompleted(monthValue)) {
    return null;
  }

  const equipment = getEquipmentItem(equipmentId);
  if (isReactiveSummaryEquipment(equipment) || isReactivePowerEquipment(equipment)) {
    return null;
  }

  const variableCharge = calculateEquipmentVariableCharge(equipmentId, monthValue);
  const baseChargeAllocation = calculateEquipmentBaseChargeAllocation(equipmentId, monthValue);

  let totalCharge = 0;
  let hasChargeComponent = false;

  if (Number.isFinite(variableCharge)) {
    totalCharge += variableCharge;
    hasChargeComponent = true;
  }

  if (Number.isFinite(baseChargeAllocation)) {
    totalCharge += baseChargeAllocation;
    hasChargeComponent = true;
  }

  return hasChargeComponent ? totalCharge : null;
}

function formatSettlementAmount(value) {
  return formatWholeNumber(value);
}

function getEquipmentUsageChargeText(equipmentId, monthValue = state.currentMonth) {
  if (isGasResourceType()) {
    return "";
  }

  const charge = calculateEquipmentUsageCharge(equipmentId, monthValue);
  return charge === null ? "" : `금액 ${formatSettlementAmount(charge)}`;
}

function getEquipmentUsageChargeDetailText(equipmentId, monthValue = state.currentMonth) {
  if (isGasResourceType()) {
    return "";
  }

  if (!isBillingSettlementCompleted(monthValue)) {
    return "";
  }

  const usage = calculateDisplayedEquipmentMonthlyUsage(equipmentId).value;
  const unitPrice = getBillingSettlementUnitPrice(monthValue);
  const baseCharge = getBillingSettlementBaseCharge(monthValue);
  const totalPowerUsage = calculateTotalPowerMonthlyUsageWindow(monthValue).value;
  const usageShare = calculateUsageShare(usage, totalPowerUsage);
  const baseChargeAllocation = calculateEquipmentBaseChargeAllocation(equipmentId, monthValue);
  const variableCharge = calculateEquipmentVariableCharge(equipmentId, monthValue);
  const charge = calculateEquipmentUsageCharge(equipmentId, monthValue);

  if (!Number.isFinite(charge)) {
    return "";
  }

  const parts = [];

  if (Number.isFinite(variableCharge) && Number.isFinite(usage) && Number.isFinite(unitPrice)) {
    parts.push(
      `사용량요금 ${formatWholeNumber(usage)} x 단가 ${formatNumber(unitPrice)} = ${formatSettlementAmount(
        variableCharge
      )}`
    );
  }

  if (
    Number.isFinite(baseCharge) &&
    Number.isFinite(usageShare) &&
    Number.isFinite(baseChargeAllocation)
  ) {
    parts.push(
      `기본요금 배분 ${formatUsageShare(usageShare)} x ${formatSettlementAmount(baseCharge)} = ${formatSettlementAmount(
        baseChargeAllocation
      )}`
    );
  }

  parts.push(`최종 금액 ${formatSettlementAmount(charge)}`);
  return parts.join("\n");
}
