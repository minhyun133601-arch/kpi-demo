function sortTotalPowerCardChipDescriptors(descriptors = []) {
  return descriptors
    .map((item, index) => {
      const labelKey = normalizeEquipmentFactorLabel(item?.label);
      const preferredOrder = TOTAL_POWER_CARD_PREFERRED_LABEL_ORDER_MAP[labelKey];
      return {
        item,
        index,
        preferredOrder: Number.isFinite(preferredOrder) ? preferredOrder : Number.MAX_SAFE_INTEGER,
      };
    })
    .sort((left, right) => {
      if (left.preferredOrder !== right.preferredOrder) {
        return left.preferredOrder - right.preferredOrder;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.item);
}

function getTotalPowerCardMonthlyUsage(monthValue = state.currentMonth, options = {}) {
  if (!isElectricResourceType()) {
    return null;
  }

  if (options.selectionOnly === true) {
    const values = getTeamAssignedChipDescriptors(TOTAL_POWER_TEAM_KEY, monthValue, {
      includeDirectUsageChip: false,
    })
      .map((item) =>
        getTotalPowerCardDescriptorUsageValue(item, monthValue, {
          selectionOnly: true,
        })
      )
      .filter((value) => Number.isFinite(value));

    if (!values.length) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0);
  }

  const usage = calculateTotalPowerMonthlyUsageWindow(monthValue).value;
  return Number.isFinite(usage) ? usage : null;
}

function getTotalPowerCardChargePool(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return null;
  }

  const rawFields = getBillingSettlementEntry(monthValue)?.fields || {};
  const electricityChargeTotal = resolveBillingSettlementElectricityChargeTotalValue(rawFields);
  const baseCharge = getBillingSettlementBaseCharge(monthValue);
  return sumFiniteValues([electricityChargeTotal, baseCharge]);
}

function getTotalPowerCardAmountValue(monthValue = state.currentMonth, options = {}) {
  const chargePool = getTotalPowerCardChargePool(monthValue);
  if (!Number.isFinite(chargePool)) {
    return null;
  }

  if (options.selectionOnly !== true) {
    return chargePool;
  }

  const usage = getTotalPowerCardMonthlyUsage(monthValue, {
    selectionOnly: true,
  });
  const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
  const usageShare = calculateUsageShare(usage, totalUsage);
  if (!Number.isFinite(usageShare)) {
    return null;
  }

  return chargePool * usageShare;
}

function getTotalPowerCardAmountText(monthValue = state.currentMonth, options = {}) {
  const amount = getTotalPowerCardAmountValue(monthValue, options);
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getElectricTeamModeOverallAmountValue(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return null;
  }

  const plantBAmount = getPlantBTotalCardAmountValue(monthValue);
  const plantAAmount = getTotalPowerCardAmountValue(monthValue);
  if (!Number.isFinite(plantBAmount) || !Number.isFinite(plantAAmount)) {
    return null;
  }

  const otherCostDescriptors = getElectricOtherCostDescriptors(monthValue);
  const otherCostAmount = otherCostDescriptors.length
    ? calculateElectricOtherCostAmount(monthValue)
    : 0;
  if (otherCostDescriptors.length && !Number.isFinite(otherCostAmount)) {
    return null;
  }

  return plantBAmount + plantAAmount + otherCostAmount;
}

function getElectricTeamModeOverallAmountText(monthValue = state.currentMonth) {
  const amount = getElectricTeamModeOverallAmountValue(monthValue);
  return Number.isFinite(amount) ? `총액 ${formatSettlementAmount(amount)}` : "";
}

function getElectricTeamModeOverallAmountDetailText(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return "";
  }

  const plantBAmount = getPlantBTotalCardAmountValue(monthValue);
  const plantAAmount = getTotalPowerCardAmountValue(monthValue);
  const otherCostAmount = calculateElectricOtherCostAmount(monthValue);
  const amount = getElectricTeamModeOverallAmountValue(monthValue);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const parts = [];
  if (Number.isFinite(plantBAmount)) {
    parts.push(`Plant B ${formatSettlementAmount(plantBAmount)}`);
  }
  if (Number.isFinite(plantAAmount)) {
    parts.push(`Plant A ${formatSettlementAmount(plantAAmount)}`);
  }
  if (Number.isFinite(otherCostAmount)) {
    parts.push(`그 외 비용 ${formatSettlementAmount(otherCostAmount)}`);
  }
  parts.push(`합계 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}

function getTotalPowerCardDescriptorUsageValue(item, monthValue = state.currentMonth, options = {}) {
  if (!item || !isElectricResourceType()) {
    return null;
  }

  if (
    options.selectionOnly === true &&
    item.selectionId &&
    !isTeamCalendarSelectionActive(TOTAL_POWER_TEAM_KEY, item.selectionId, monthValue)
  ) {
    return null;
  }

  if (item.isDirectTeamUsage) {
    const usage = getDirectTeamMonthlyUsage(item.teamKey, monthValue, RESOURCE_TYPES.ELECTRIC);
    return Number.isFinite(usage) ? usage : null;
  }

  if (!item.id || item.id === SHARED_COMPRESSOR_VIRTUAL_ID) {
    return null;
  }

  const usage = calculateDisplayedEquipmentMonthlyUsage(item.id).value;
  return Number.isFinite(usage) ? usage : null;
}

function getTotalPowerCardDescriptorUsageShare(item, monthValue = state.currentMonth, options = {}) {
  const usage = getTotalPowerCardDescriptorUsageValue(item, monthValue, options);
  const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
  return calculateUsageShare(usage, totalUsage);
}

function calculateTotalPowerCardDescriptorCharge(item, monthValue = state.currentMonth, options = {}) {
  const chargePool = getTotalPowerCardChargePool(monthValue);
  const usageShare = getTotalPowerCardDescriptorUsageShare(item, monthValue, options);
  if (!Number.isFinite(chargePool) || !Number.isFinite(usageShare)) {
    return null;
  }

  return chargePool * usageShare;
}

function getTotalPowerCardDescriptorShareText(item, monthValue = state.currentMonth, options = {}) {
  const usageShare = getTotalPowerCardDescriptorUsageShare(item, monthValue, options);
  return usageShare === null ? "" : `전력총량 ${formatUsageShare(usageShare)}`;
}

function getTotalPowerCardDescriptorChargeText(item, monthValue = state.currentMonth, options = {}) {
  const charge = calculateTotalPowerCardDescriptorCharge(item, monthValue, options);
  return Number.isFinite(charge) ? `금액 ${formatSettlementAmount(charge)}` : "";
}

function getTotalPowerCardDescriptorDetailText(item, monthValue = state.currentMonth, options = {}) {
  const usage = getTotalPowerCardDescriptorUsageValue(item, monthValue, options);
  const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
  const usageShare = getTotalPowerCardDescriptorUsageShare(item, monthValue, options);
  const chargePool = getTotalPowerCardChargePool(monthValue);
  const charge = calculateTotalPowerCardDescriptorCharge(item, monthValue, options);
  const parts = [];

  if (Number.isFinite(usage) && Number.isFinite(totalUsage) && Number.isFinite(usageShare)) {
    parts.push(
      `전력총량 ${formatWholeNumber(totalUsage)} 중 ${formatWholeNumber(usage)} = ${formatUsageShare(
        usageShare
      )}`
    );
  }

  if (Number.isFinite(chargePool) && Number.isFinite(charge) && Number.isFinite(usageShare)) {
    parts.push(
      `전기요금계+기본요금 ${formatSettlementAmount(chargePool)} x ${formatUsageShare(
        usageShare
      )} = ${formatSettlementAmount(charge)}`
    );
  }

  return parts.join("\n");
}
