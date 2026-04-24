function normalizeResourceType(value) {
  if (value === RESOURCE_TYPES.GAS) {
    return RESOURCE_TYPES.GAS;
  }

  if (value === RESOURCE_TYPES.WASTE) {
    return RESOURCE_TYPES.WASTE;
  }

  if (value === RESOURCE_TYPES.PRODUCTION) {
    return RESOURCE_TYPES.PRODUCTION;
  }

  return RESOURCE_TYPES.ELECTRIC;
}

function getCurrentResourceType() {
  return normalizeResourceType(state?.store?.resourceType);
}

function isGasResourceType(resourceType = getCurrentResourceType()) {
  return normalizeResourceType(resourceType) === RESOURCE_TYPES.GAS;
}

function isWasteResourceType(resourceType = getCurrentResourceType()) {
  return normalizeResourceType(resourceType) === RESOURCE_TYPES.WASTE;
}

function isElectricResourceType(resourceType = getCurrentResourceType()) {
  return normalizeResourceType(resourceType) === RESOURCE_TYPES.ELECTRIC;
}

function isProductionResourceType(resourceType = getCurrentResourceType()) {
  return normalizeResourceType(resourceType) === RESOURCE_TYPES.PRODUCTION;
}

function getResourceDisplayMeta(resourceType = getCurrentResourceType()) {
  return RESOURCE_DISPLAY_META[normalizeResourceType(resourceType)] || RESOURCE_DISPLAY_META[RESOURCE_TYPES.ELECTRIC];
}

function getEquipmentEmptyStateTitle(resourceType = getCurrentResourceType()) {
  return getResourceDisplayMeta(resourceType).equipmentEmptyTitle;
}

function formatEquipmentItemCountText(count, resourceType = getCurrentResourceType()) {
  const itemLabel = getResourceDisplayMeta(resourceType).equipmentItemLabel;
  return count > 0
    ? `등록된 ${itemLabel} ${count}개`
    : `아직 등록된 ${itemLabel}이 없습니다.`;
}

function getBillingDocumentDirectoryName(resourceType = getCurrentResourceType()) {
  return getResourceDisplayMeta(resourceType).billingDocumentDirectory;
}

function supportsBillingDocumentForResource(resourceType = getCurrentResourceType()) {
  return isElectricResourceType(resourceType) || isGasResourceType(resourceType);
}

function supportsScopedBillingSettlement(resourceType = getCurrentResourceType()) {
  return isElectricResourceType(resourceType) || isGasResourceType(resourceType);
}

function getBillingSettlementScopeDefinitions(resourceType = getCurrentResourceType()) {
  return BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE[
    normalizeResourceType(resourceType)
  ] || [];
}

function getDefaultBillingSettlementScopeKey(resourceType = getCurrentResourceType()) {
  return getBillingSettlementScopeDefinitions(resourceType)[0]?.key || "";
}

function isGasBillingSettlementScope(scopeKey) {
  return [
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
  ].includes(normalizeText(scopeKey));
}

function isGasLpgBillingSettlementScope(scopeKey) {
  return normalizeText(scopeKey) === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY;
}

function isWasteBillingSettlementScope(scopeKey) {
  return [
    WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
    WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY,
  ].includes(normalizeText(scopeKey));
}

function getWasteBillingSettlementScopeKeyForTeam(teamKey) {
  if (teamKey === WASTE_PLANT_B_TEAM_KEY) {
    return WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY;
  }

  if (teamKey === WASTE_PLANT_A_TEAM_KEY) {
    return WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY;
  }

  return "";
}

function getWasteBillingSettlementTeamKeyForScope(scopeKey) {
  const normalizedScopeKey = normalizeText(scopeKey);
  if (normalizedScopeKey === WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY) {
    return WASTE_PLANT_B_TEAM_KEY;
  }

  if (normalizedScopeKey === WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY) {
    return WASTE_PLANT_A_TEAM_KEY;
  }

  return "";
}

function getWasteBillingSettlementBillingAmountComponents(scopeKey) {
  return normalizeText(scopeKey) === WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY
    ? WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_A
    : WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_B;
}

function getWasteBillingSettlementManualCostFieldKeys(scopeKey) {
  return getWasteBillingSettlementBillingAmountComponents(scopeKey).map(({ key }) => key);
}

function getBillingSettlementFields(
  resourceType = getCurrentResourceType(),
  scopeKey = getCurrentBillingSettlementScope(resourceType)
) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  const normalizedScopeKey = normalizeBillingSettlementScope(scopeKey, normalizedResourceType);
  if (normalizedResourceType === RESOURCE_TYPES.GAS) {
    return isGasLpgBillingSettlementScope(normalizedScopeKey)
      ? GAS_LPG_BILLING_SETTLEMENT_FIELDS
      : GAS_BILLING_SETTLEMENT_FIELDS;
  }

  if (normalizedResourceType === RESOURCE_TYPES.WASTE) {
    return normalizedScopeKey === WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY
      ? WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_A
      : WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_B;
  }

  return ELECTRIC_BILLING_SETTLEMENT_FIELDS;
}

function getBillingSettlementAutoCalculatedFieldKeySet(
  resourceType = getCurrentResourceType(),
  scopeKey = getCurrentBillingSettlementScope(resourceType)
) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  if (normalizedResourceType === RESOURCE_TYPES.GAS) {
    return isGasLpgBillingSettlementScope(scopeKey)
      ? GAS_LPG_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS
      : GAS_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS;
  }

  if (normalizedResourceType === RESOURCE_TYPES.WASTE) {
    return WASTE_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS;
  }

  return ELECTRIC_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS;
}

function getBillingSettlementManualFieldKeys(
  resourceType = getCurrentResourceType(),
  scopeKey = getCurrentBillingSettlementScope(resourceType)
) {
  const autoCalculatedFieldKeys = getBillingSettlementAutoCalculatedFieldKeySet(
    resourceType,
    scopeKey
  );
  return getBillingSettlementFields(resourceType, scopeKey)
    .filter((field) => !autoCalculatedFieldKeys.has(field.key))
    .map((field) => field.key);
}

function getBillingSettlementZeroDefaultFieldKeys(
  resourceType = getCurrentResourceType(),
  scopeKey = getCurrentBillingSettlementScope(resourceType)
) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  if (normalizedResourceType === RESOURCE_TYPES.GAS) {
    return isGasLpgBillingSettlementScope(scopeKey)
      ? []
      : GAS_BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS;
  }

  if (normalizedResourceType === RESOURCE_TYPES.WASTE) {
    return [];
  }

  return BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS;
}

function getBillingSettlementFormulaGuide(
  fieldKey,
  resourceType = getCurrentResourceType(),
  scopeKey = getCurrentBillingSettlementScope(resourceType)
) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  if (normalizedResourceType === RESOURCE_TYPES.GAS) {
    const guides = isGasLpgBillingSettlementScope(scopeKey)
      ? GAS_LPG_BILLING_SETTLEMENT_FORMULA_GUIDES
      : GAS_BILLING_SETTLEMENT_FORMULA_GUIDES;
    return guides[fieldKey] || "";
  }

  if (normalizedResourceType === RESOURCE_TYPES.WASTE) {
    return WASTE_BILLING_SETTLEMENT_FORMULA_GUIDES[fieldKey] || "";
  }

  return BILLING_SETTLEMENT_FORMULA_GUIDES[fieldKey] || "";
}

function normalizeBillingSettlementScope(
  scopeKey,
  resourceType = getCurrentResourceType()
) {
  const definitions = getBillingSettlementScopeDefinitions(resourceType);
  if (!definitions.length) {
    return "";
  }

  const normalizedScopeKey = normalizeText(scopeKey);
  return definitions.some((item) => item.key === normalizedScopeKey)
    ? normalizedScopeKey
    : getDefaultBillingSettlementScopeKey(resourceType);
}

function getCurrentBillingSettlementScope(resourceType = getCurrentResourceType()) {
  return normalizeBillingSettlementScope(state.activeTeamSettlementScope, resourceType);
}

function getBillingSettlementScopeDefinition(
  scopeKey,
  resourceType = getCurrentResourceType()
) {
  const normalizedScopeKey = normalizeBillingSettlementScope(scopeKey, resourceType);
  return (
    getBillingSettlementScopeDefinitions(resourceType).find(
      (item) => item.key === normalizedScopeKey
    ) || null
  );
}

function getBillingSettlementScopeLabel(scopeKey, resourceType = getCurrentResourceType()) {
  return getBillingSettlementScopeDefinition(scopeKey, resourceType)?.shortLabel || "";
}

function getBillingSettlementScopeTitle(scopeKey, resourceType = getCurrentResourceType()) {
  return getBillingSettlementScopeDefinition(scopeKey, resourceType)?.label || "정산";
}

function getAcceptedBillingDocumentDirectoryNames(resourceType = getCurrentResourceType()) {
  const nextNames = [getBillingDocumentDirectoryName(resourceType)];
  if (isElectricResourceType(resourceType)) {
    nextNames.push(LEGACY_BILLING_DOCUMENT_DIRECTORY_NAME);
  }
  return nextNames.filter((name, index, list) => list.indexOf(name) === index);
}

function supportsTeamModeForResource(resourceType = getCurrentResourceType()) {
  return (
    isElectricResourceType(resourceType) ||
    isGasResourceType(resourceType) ||
    isWasteResourceType(resourceType) ||
    isProductionResourceType(resourceType)
  );
}

function supportsEquipmentModeForResource(resourceType = getCurrentResourceType()) {
  return !isWasteResourceType(resourceType);
}

function supportsTeamModeForCurrentResource() {
  return supportsTeamModeForResource(getCurrentResourceType());
}

function supportsEquipmentModeForCurrentResource() {
  return supportsEquipmentModeForResource(getCurrentResourceType());
}

function supportsBillingSettlementForResource(resourceType = getCurrentResourceType()) {
  return (
    isElectricResourceType(resourceType) ||
    isGasResourceType(resourceType) ||
    isWasteResourceType(resourceType)
  );
}

function supportsBillingSettlementForCurrentResource() {
  return supportsBillingSettlementForResource(getCurrentResourceType());
}

function getTeamGroupsForResource(resourceType = getCurrentResourceType()) {
  if (isWasteResourceType(resourceType)) {
    return WASTE_TEAM_GROUPS;
  }

  if (isGasResourceType(resourceType)) {
    return GAS_TEAM_GROUPS;
  }

  return TEAM_GROUPS.filter(
    (team) =>
      (!isGasResourceType(resourceType) && !isProductionResourceType(resourceType)) ||
      !isElectricOnlyTeamKey(team.key)
  );
}

function getCurrentTeamGroups() {
  return getTeamGroupsForResource(getCurrentResourceType());
}
