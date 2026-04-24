function getPlantBTotalCardMonthlyUsage(monthValue = state.currentMonth, options = {}) {
  if (!isElectricResourceType()) {
    return null;
  }

  if (
    options.selectionOnly === true &&
    !isTeamCalendarSelectionActive(PLANT_B_POWER_TEAM_KEY, PLANT_B_TOTAL_SELECTION_ID, monthValue)
  ) {
    return null;
  }

  const usage = getDirectTeamMonthlyUsage(TEAM_01_01_KEY, monthValue, RESOURCE_TYPES.ELECTRIC);
  return Number.isFinite(usage) ? usage : null;
}

function getPlantBTotalCardAmountValue(monthValue = state.currentMonth, options = {}) {
  const amount = resolvePlantBSettlementAmount(monthValue);
  if (!Number.isFinite(amount)) {
    return null;
  }

  if (
    options.selectionOnly === true &&
    !isTeamCalendarSelectionActive(PLANT_B_POWER_TEAM_KEY, PLANT_B_TOTAL_SELECTION_ID, monthValue)
  ) {
    return null;
  }

  return amount;
}

function getPlantBTotalCardChargePool(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return null;
  }

  return getPlantBTotalCardAmountValue(monthValue);
}

function getPlantBTotalCardDescriptorUsageValue(item, monthValue = state.currentMonth, options = {}) {
  if (!item || !item.isDirectTeamUsage) {
    return null;
  }

  if (
    options.selectionOnly === true &&
    item.selectionId &&
    !isTeamCalendarSelectionActive(PLANT_B_POWER_TEAM_KEY, item.selectionId, monthValue)
  ) {
    return null;
  }

  const usage = getDirectTeamMonthlyUsage(item.teamKey, monthValue, RESOURCE_TYPES.ELECTRIC);
  return Number.isFinite(usage) ? usage : null;
}

function getPlantBTotalCardDescriptorUsageShare(item, monthValue = state.currentMonth, options = {}) {
  const usage = getPlantBTotalCardDescriptorUsageValue(item, monthValue, options);
  const totalUsage = getPlantBTotalCardMonthlyUsage(monthValue);
  return calculateUsageShare(usage, totalUsage);
}

function calculatePlantBTotalCardDescriptorCharge(item, monthValue = state.currentMonth, options = {}) {
  const chargePool = getPlantBTotalCardChargePool(monthValue);
  const usageShare = getPlantBTotalCardDescriptorUsageShare(item, monthValue, options);
  if (!Number.isFinite(chargePool) || !Number.isFinite(usageShare)) {
    return null;
  }

  return chargePool * usageShare;
}

function getPlantBTotalCardDescriptorShareText(item, monthValue = state.currentMonth, options = {}) {
  const usageShare = getPlantBTotalCardDescriptorUsageShare(item, monthValue, options);
  return usageShare === null ? "" : `전력총량 ${formatUsageShare(usageShare)}`;
}

function getPlantBTotalCardDescriptorChargeText(item, monthValue = state.currentMonth, options = {}) {
  const charge = calculatePlantBTotalCardDescriptorCharge(item, monthValue, options);
  return Number.isFinite(charge) ? `금액 ${formatSettlementAmount(charge)}` : "";
}

function getPlantBTotalCardDescriptorDetailText(item, monthValue = state.currentMonth, options = {}) {
  const usage = getPlantBTotalCardDescriptorUsageValue(item, monthValue, options);
  const totalUsage = getPlantBTotalCardMonthlyUsage(monthValue);
  const usageShare = getPlantBTotalCardDescriptorUsageShare(item, monthValue, options);
  const chargePool = getPlantBTotalCardChargePool(monthValue);
  const charge = calculatePlantBTotalCardDescriptorCharge(item, monthValue, options);
  const parts = [];

  if (Number.isFinite(usage) && Number.isFinite(totalUsage) && Number.isFinite(usageShare)) {
    parts.push(
      `Plant B 전력총량 ${formatWholeNumber(totalUsage)} 중 ${formatWholeNumber(usage)} = ${formatUsageShare(
        usageShare
      )}`
    );
  }

  if (Number.isFinite(chargePool) && Number.isFinite(charge) && Number.isFinite(usageShare)) {
    parts.push(
      `Plant B 금액 ${formatSettlementAmount(chargePool)} x ${formatUsageShare(
        usageShare
      )} = ${formatSettlementAmount(charge)}`
    );
  }

  return parts.join("\n");
}

function getPlantBTotalCardToggleDescriptors(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return [];
  }

  const team = getTeamGroup(PLANT_B_POWER_TEAM_KEY);
  return [
    {
      id: PLANT_B_TOTAL_SELECTION_ID,
      selectionId: PLANT_B_TOTAL_SELECTION_ID,
      label: "Plant B 전력 총량",
      iconKey: team?.iconKey || "power_active",
      usageText: formatDailyUsage(
        getDirectTeamMonthlyUsage(TEAM_01_01_KEY, monthValue, RESOURCE_TYPES.ELECTRIC)
      ),
      chargeText: getPlantBTotalCardDescriptorChargeText(
        {
          isDirectTeamUsage: true,
          teamKey: TEAM_01_01_KEY,
        },
        monthValue
      ),
      detailText: getTeamContextDetailText(PLANT_B_POWER_TEAM_KEY),
      removable: false,
      isDirectTeamUsage: true,
      teamKey: TEAM_01_01_KEY,
      sourceTeamKey: PLANT_B_POWER_TEAM_KEY,
    },
  ];
}
