function sumFiniteValues(values) {
  const numericValues = values.filter((value) => Number.isFinite(value));
  if (!numericValues.length) {
    return null;
  }

  return numericValues.reduce((sum, value) => sum + value, 0);
}

function calculateTotalPowerMonthlyUsage() {
  return calculateTotalPowerMonthlyUsageWindow().value;
}

function getMonthBoundaryDateString(monthValue) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  return normalizedMonth ? `${normalizedMonth}-01` : "";
}

function getTotalPowerReadingOnDate(dateString) {
  if (!dateString) {
    return null;
  }

  const totalReading = getEquipmentReadingOnDate("field_24", dateString);
  if (totalReading !== null) {
    return totalReading;
  }

  const activePowerEquipmentIds = getConfiguredTotalPowerEquipmentIds();
  if (!activePowerEquipmentIds.length) {
    return null;
  }

  const readings = activePowerEquipmentIds.map((equipmentId) =>
    getEquipmentReadingOnDate(equipmentId, dateString)
  );
  if (readings.some((value) => value === null)) {
    return null;
  }

  return readings.reduce((sum, value) => sum + value, 0);
}

function calculateTotalPowerMonthlyUsageWindow(monthValue = state.currentMonth) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return {
      value: null,
      difference: null,
      startDate: "",
      endDate: "",
      startReading: null,
      endReading: null,
    };
  }

  const startDate = getMonthBoundaryDateString(normalizedMonth);
  const endDate = getMonthBoundaryDateString(shiftMonthValue(normalizedMonth, 1));
  const startReading = getTotalPowerReadingOnDate(startDate);
  const endReading = getTotalPowerReadingOnDate(endDate);

  if (startReading === null || endReading === null) {
    return {
      value: null,
      difference: null,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  const difference = endReading - startReading;
  return {
    value: difference * TOTAL_POWER_USAGE_FACTOR,
    difference,
    startDate,
    endDate,
    startReading,
    endReading,
  };
}

function calculateUsageShare(value, totalValue) {
  if (value === null || totalValue === null || totalValue <= 0) {
    return null;
  }

  return value / totalValue;
}

function isPowerActiveTeamKey(teamKey) {
  return teamKey === TOTAL_POWER_TEAM_KEY;
}

function isPowerPlantBTeamKey(teamKey) {
  return teamKey === PLANT_B_POWER_TEAM_KEY;
}

function isPowerReactiveTeamKey(teamKey) {
  return teamKey === "power_reactive";
}

function isElectricOnlyTeamKey(teamKey) {
  return isPowerActiveTeamKey(teamKey) || isPowerPlantBTeamKey(teamKey) || isPowerReactiveTeamKey(teamKey);
}

function getEquipmentUsageShareText(
  equipmentId,
  overallUsage = getCurrentOverallMonthlyUsage()
) {
  const equipment = getEquipmentItem(equipmentId);
  if (!isEquipmentUsageShareTarget(equipment)) {
    return "";
  }

  const usage = calculateEquipmentMonthlyUsage(equipmentId).value;
  const usageShare = calculateUsageShare(usage, overallUsage);
  if (usageShare === null) {
    return "";
  }

  if (isGasResourceType()) {
    return `가스 총사용량 ${formatUsageShare(usageShare)}`;
  }

  return `전력총량 ${formatUsageShare(usageShare)}`;
}

function formatDailyUsage(value) {
  return value === null ? "-" : formatWholeNumber(value);
}

function getTeamBoardMonthlyUsage(teamKey, options = {}) {
  const monthValue = options.monthValue || state.currentMonth;

  if (isPowerActiveTeamKey(teamKey)) {
    return getTotalPowerCardMonthlyUsage(monthValue, options);
  }

  if (isPowerPlantBTeamKey(teamKey)) {
    return getPlantBTotalCardMonthlyUsage(monthValue, options);
  }

  if (supportsDirectTeamMonthlyUsage(teamKey)) {
    return getDirectTeamMonthlyUsage(teamKey, monthValue);
  }

  if (isPowerReactiveTeamKey(teamKey)) {
    const equipmentIds = options.selectionOnly
      ? getTeamCalendarSelection(teamKey)
      : getTeamAssignedEquipmentIds(teamKey);
    const values = equipmentIds
      .map((equipmentId) => calculateDisplayedEquipmentMonthlyUsage(equipmentId).value)
      .filter((value) => value !== null);

    if (!values.length) {
      return null;
    }

    return values.reduce((sum, value) => sum + value, 0);
  }

  if (isGasResourceType()) {
    return getTeamAssignedChipShareTotalUsage(teamKey, options);
  }

  return getTeamMonthlyUsage(teamKey, options);
}

function getTeamUsageShareText(
  teamKey,
  overallUsage = getCurrentOverallMonthlyUsage(),
  options = {}
) {
  if (
    isPowerReactiveTeamKey(teamKey) ||
    (isElectricResourceType() && teamKey === TEAM_01_01_KEY)
  ) {
    return "";
  }

  const usage = getTeamBoardMonthlyUsage(teamKey, options);
  const usageShare = calculateUsageShare(usage, overallUsage);
  if (usageShare === null) {
    return "";
  }

  return `${getCurrentOverallUsageLabel()} ${formatUsageShare(usageShare)}`;
}

function calculateGasOverallMonthlyUsage() {
  return calculateEquipmentGroupMonthlyUsage(getGasOverallTrackedEquipmentIds());
}

function calculateGasRawLpgMonthlyUsage() {
  if (!isGasResourceType()) {
    return null;
  }

  return calculateEquipmentMonthlyUsage(GAS_LPG_CORRECTION_EQUIPMENT_ID).value;
}

function calculateGasRawLngMonthlyUsage() {
  const totalUsage = calculateGasOverallMonthlyUsage();
  if (totalUsage === null) {
    return null;
  }

  const lpgUsage = calculateGasRawLpgMonthlyUsage();
  return totalUsage - (Number.isFinite(lpgUsage) ? lpgUsage : 0);
}

function calculateGasTeamDisplayTotalMonthlyUsage() {
  if (!isGasResourceType()) {
    return null;
  }

  const values = getGasOverallTrackedEquipmentIds()
    .filter((equipmentId) => equipmentId !== GAS_TOTAL_USAGE_EQUIPMENT_ID)
    .map((equipmentId) => getTeamAssignedChipDisplayUsage(equipmentId))
    .filter((value) => value !== null);
  getDirectTeamMonthlyUsageTeamKeys(RESOURCE_TYPES.GAS).forEach((teamKey) => {
    const usageValue = getDirectTeamMonthlyUsage(teamKey, state.currentMonth, RESOURCE_TYPES.GAS);
    if (Number.isFinite(usageValue)) {
      values.push(usageValue);
    }
  });

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function calculateGasTeamDisplayLpgMonthlyUsage() {
  if (!isGasResourceType()) {
    return null;
  }

  return getTeamAssignedChipDisplayUsage(GAS_LPG_CORRECTION_EQUIPMENT_ID);
}

function calculateGasTeamDisplayLngMonthlyUsage() {
  if (!isGasResourceType()) {
    return null;
  }

  const values = [GAS_PLANT_A_LNG_TEAM_KEY, "team_03", "team_04"]
    .map((teamKey) => getTeamBoardMonthlyUsage(teamKey, { monthValue: state.currentMonth }))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function getGasStandaloneSummaryInfo() {
  return {
    value: calculateGasRawLpgMonthlyUsage(),
    label: "LPG",
  };
}

function getDefaultGasFocusedSummaryInfo() {
  return {
    value: calculateGasRawLngMonthlyUsage(),
    label: "LNG",
  };
}

function getGasTeamModeSummaryInfo() {
  return {
    value: calculateGasTeamDisplayTotalMonthlyUsage(),
    label: "가스 총사용량",
  };
}

function getGasTeamModeFocusedSummaryInfo() {
  return {
    value: calculateGasTeamDisplayLngMonthlyUsage(),
    label: "LNG 총합",
  };
}

function getGasTeamModeStandaloneSummaryInfo() {
  return {
    value: calculateGasTeamDisplayLpgMonthlyUsage(),
    label: "LPG 총합",
  };
}

function getCalendarTrackedEquipmentIds() {
  if (getCurrentMode() === MODES.TEAM) {
    const selectedTeamKeys = getSelectedTeamKeys();
    if (!selectedTeamKeys.length) {
      return getDefaultCalendarTrackedEquipmentIds();
    }

    return getSelectedTeamCalendarEquipmentIds();
  }

  const selectedEquipmentIds = getSelectedEquipmentIds();
  if (!selectedEquipmentIds.length) {
    return getDefaultCalendarTrackedEquipmentIds();
  }

  return selectedEquipmentIds;
}

function hasMonthlySelectionFocus() {
  return hasActiveCardSelection();
}

function getMonthlyFocusedSummaryInfo() {
  if (!hasMonthlySelectionFocus()) {
    return null;
  }

  if (getCurrentMode() === MODES.TEAM) {
    const selectedTeamKeys = getSelectedTeamKeys();
    if (!selectedTeamKeys.length) {
      return null;
    }

    const label =
      selectedTeamKeys.length === 1
        ? `${getTeamDisplayLabel(selectedTeamKeys[0]) || "선택 팀"} 합계`
        : `선택 팀 ${selectedTeamKeys.length}개`;
    const values = selectedTeamKeys
      .map((teamKey) => getTeamBoardMonthlyUsage(teamKey, { selectionOnly: true }))
      .filter((value) => value !== null);

    return {
      value: values.length ? values.reduce((sum, value) => sum + value, 0) : null,
      label,
      highlightKey: "equipment",
    };
  }

  const selectedEquipmentIds = getSelectedEquipmentIds();
  if (!selectedEquipmentIds.length) {
    return null;
  }

  const selectedItems = selectedEquipmentIds
    .map((equipmentId) => getEquipmentItem(equipmentId))
    .filter(Boolean);
  const selectedLabel =
    selectedItems.length === 1
      ? `${getEquipmentDisplayLabel(selectedItems[0])} 합계`
      : `선택 설비 ${selectedItems.length}개`;

  return {
    value: calculateEquipmentGroupMonthlyUsage(selectedEquipmentIds),
    label: selectedLabel,
    highlightKey: "equipment",
  };
}

function getOverallTeamMonthlyUsage() {
  return getCurrentTeamGroups().reduce((total, team) => {
    if (isPowerActiveTeamKey(team.key)) {
      return total;
    }

    return total + (getTeamMonthlyUsage(team.key) ?? 0);
  }, 0);
}

function getCurrentMonthlySummaryInfo() {
  return {
    value: getCurrentOverallMonthlyUsage(),
    label: getCurrentOverallUsageLabel(),
  };
}
