function getElectricDirectTeamMonthlyUsage(monthValue = state.currentMonth) {
  return getDirectTeamMonthlyUsage(TEAM_01_01_KEY, monthValue, RESOURCE_TYPES.ELECTRIC);
}

function getElectricTeamModeOverallMonthlyUsage(monthValue = state.currentMonth) {
  const baseUsage = calculateTotalPowerMonthlyUsage();
  if (!Number.isFinite(baseUsage)) {
    return null;
  }

  const directUsage = getElectricDirectTeamMonthlyUsage(monthValue);
  return Number.isFinite(directUsage) ? baseUsage + directUsage : baseUsage;
}

function getElectricTeamModeEquipmentSummaryUsage(monthValue = state.currentMonth) {
  const values = [
    calculateEquipmentGroupMonthlyUsage(getEquipmentSummaryIds()),
    getElectricDirectTeamMonthlyUsage(monthValue),
  ].filter((value) => Number.isFinite(value));

  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function getCurrentOverallMonthlyUsage() {
  if (isGasResourceType()) {
    return calculateGasOverallMonthlyUsage();
  }

  if (isWasteResourceType()) {
    return calculateWasteOverallMonthlyUsage();
  }

  if (isProductionResourceType()) {
    return calculateEquipmentGroupMonthlyUsage(getAllEquipmentIds());
  }

  return calculateTotalPowerMonthlyUsage();
}

function getTeamModeOverallMonthlyUsage() {
  if (isGasResourceType()) {
    return calculateGasTeamDisplayTotalMonthlyUsage();
  }

  if (isWasteResourceType()) {
    return getCurrentOverallMonthlyUsage();
  }

  if (isProductionResourceType()) {
    return getCurrentOverallMonthlyUsage();
  }

  return getElectricTeamModeOverallMonthlyUsage();
}

function getCurrentOverallUsageLabel() {
  if (isGasResourceType()) {
    return "가스 총사용량";
  }

  if (isWasteResourceType()) {
    return "폐수 총사용량";
  }

  if (isProductionResourceType()) {
    return "생산량 합계";
  }

  return "전력총량";
}

function getTeamDisplayLabel(teamOrKey, resourceType = getCurrentResourceType()) {
  const team =
    typeof teamOrKey === "string"
      ? getTeamGroup(teamOrKey)
      : teamOrKey && typeof teamOrKey === "object"
        ? teamOrKey
        : null;
  const baseLabel = normalizeText(team?.label);

  if (!baseLabel) {
    return "";
  }

  return baseLabel;
}

function getTeamContextText(teamKey, resourceType = getCurrentResourceType()) {
  if (isElectricResourceType(resourceType) && teamKey === TEAM_01_01_KEY) {
    return "읽기 전용";
  }

  if (isElectricResourceType(resourceType) && teamKey === PLANT_B_POWER_TEAM_KEY) {
    return "";
  }

  if (supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    return isGasResourceType(resourceType) ? "" : "직접 입력";
  }

  return "";
}

function getTeamContextDetailText(teamKey, resourceType = getCurrentResourceType()) {
  if (isElectricResourceType(resourceType) && teamKey === TEAM_01_01_KEY) {
    return "Plant B 정산에 입력한 값을 표시합니다.";
  }

  if (isElectricResourceType(resourceType) && teamKey === PLANT_B_POWER_TEAM_KEY) {
    return "Plant B 정산에서 월 사용량과 금액을 수정합니다.";
  }

  if (supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    if (isGasResourceType(resourceType)) {
      return "월 사용량은 Plant B 정산에서 수정합니다.";
    }

    return "월 사용량 직접 입력";
  }

  if (normalizeResourceType(resourceType) === RESOURCE_TYPES.GAS) {
    if (teamKey === GAS_PLANT_A_LNG_TEAM_KEY) {
      return "Demo Boiler A + Demo Boiler B 사용량";
    }

    if (teamKey === GAS_PLANT_A_LPG_TEAM_KEY) {
      return `Demo Heater (LPG) 보정 사용량 x ${formatNumber(GAS_LPG_CORRECTION_USAGE_FACTOR)}`;
    }
  }

  return "";
}

function getResourceEyebrowText(resourceType = getCurrentResourceType()) {
  return getResourceDisplayMeta(resourceType).eyebrow;
}

function getResourceTitleText(resourceType = getCurrentResourceType()) {
  return getResourceDisplayMeta(resourceType).title;
}

function getTeamModeEntrySectionTitle() {
  return getResourceDisplayMeta().teamEntrySectionTitle;
}

function getTeamModeSummaryLabel() {
  return getResourceDisplayMeta().teamSummaryLabel;
}

function getTeamModeMonthTitle(monthKey = state.currentMonth) {
  const monthTitle = formatMonthTitle(monthKey);
  const suffix = getResourceDisplayMeta().teamMonthTitleSuffix;
  return suffix ? `${monthTitle} ${suffix}` : monthTitle;
}

function getEntrySectionTitle() {
  if (getCurrentMode() === MODES.TEAM) {
    return getTeamModeEntrySectionTitle();
  }

  return "";
}

function getEquipmentListLabelText() {
  return getResourceDisplayMeta().equipmentListLabel;
}

function getUsageFactorLabel(resourceType = getCurrentResourceType()) {
  return "승률";
}

function getGasManageUsageFactorText(equipmentId, monthValue = state.currentMonth) {
  if (!isGasResourceType() || !equipmentId) {
    return "";
  }

  if (equipmentId === GAS_LPG_CORRECTION_EQUIPMENT_ID) {
    return `표시 x ${formatNumber(GAS_LPG_CORRECTION_USAGE_FACTOR)}`;
  }

  if (GAS_CORRECTION_TARGET_IDS.has(equipmentId)) {
    const gasCorrectionFactor = calculateGasCorrectionFactorForMonth(monthValue);
    return Number.isFinite(gasCorrectionFactor)
      ? `표시 x 월가스보정 ${formatNumber(gasCorrectionFactor)}`
      : "표시 x 월가스보정";
  }

  return "";
}

function getEquipmentManageFactorButtonText(field, monthValue = state.currentMonth) {
  const baseText = `${getUsageFactorLabel()} ${formatUsageFactor(field?.factor)}`;
  const gasFactorText = getGasManageUsageFactorText(field?.id, monthValue);
  return gasFactorText ? `${baseText} · ${gasFactorText}` : baseText;
}
