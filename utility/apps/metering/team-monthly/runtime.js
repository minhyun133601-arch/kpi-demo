function getDirectTeamMonthlyUsageTeamKeys(resourceType = getCurrentResourceType()) {
  const normalizedType = normalizeResourceType(resourceType);
  return [...(DIRECT_TEAM_MONTHLY_USAGE_TEAM_KEYS_BY_RESOURCE[normalizedType] || [])];
}

function getDirectTeamMonthlyAmountTeamKeys(resourceType = getCurrentResourceType()) {
  const normalizedType = normalizeResourceType(resourceType);
  return [...(DIRECT_TEAM_MONTHLY_AMOUNT_TEAM_KEYS_BY_RESOURCE[normalizedType] || [])];
}

function getDirectTeamMonthlyStorageKey(teamKey, resourceType = getCurrentResourceType()) {
  const normalizedType = normalizeResourceType(resourceType);
  return DIRECT_TEAM_MONTHLY_STORAGE_KEY_ALIASES_BY_RESOURCE?.[normalizedType]?.[teamKey] || teamKey;
}

function isPlantBPowerOverviewAliasTeamKey(teamKey, resourceType = getCurrentResourceType()) {
  return isElectricResourceType(resourceType) && teamKey === TEAM_01_01_KEY;
}

function isPlantBPowerSummaryTeamKey(teamKey, resourceType = getCurrentResourceType()) {
  return isElectricResourceType(resourceType) && teamKey === PLANT_B_POWER_TEAM_KEY;
}

function supportsDirectTeamMonthlyUsage(teamKey, resourceType = getCurrentResourceType()) {
  return Boolean(teamKey) && getDirectTeamMonthlyUsageTeamKeys(resourceType).includes(teamKey);
}

function supportsDirectTeamMonthlyAmount(teamKey, resourceType = getCurrentResourceType()) {
  if (isElectricResourceType(resourceType) && teamKey === PLANT_B_POWER_TEAM_KEY) {
    return false;
  }

  return Boolean(teamKey) && getDirectTeamMonthlyAmountTeamKeys(resourceType).includes(teamKey);
}

function canEditDirectTeamMonthlyUsage(teamKey, resourceType = getCurrentResourceType()) {
  if (!supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    return false;
  }

  return !isPlantBPowerOverviewAliasTeamKey(teamKey, resourceType);
}

function canEditDirectTeamMonthlyAmount(teamKey, resourceType = getCurrentResourceType()) {
  if (!supportsDirectTeamMonthlyAmount(teamKey, resourceType)) {
    return false;
  }

  return !isPlantBPowerOverviewAliasTeamKey(teamKey, resourceType);
}

function getDirectTeamMonthlyUsageKpiTeamName(
  teamKey,
  resourceType = getCurrentResourceType()
) {
  const normalizedType = normalizeResourceType(resourceType);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, normalizedType);
  return (
    DIRECT_TEAM_MONTHLY_USAGE_KPI_TEAM_NAMES?.[normalizedType]?.[storageKey] ||
    DIRECT_TEAM_MONTHLY_USAGE_KPI_TEAM_NAMES?.[normalizedType]?.[teamKey] ||
    ""
  );
}

function normalizeTeamMonthlyUsageValue(value, fallback = null) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const numericValue =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseFloat(String(value).replace(/,/g, "").trim());

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return roundCalculatedUsage(numericValue);
}

function getStoredTeamMonthlyUsage(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    return null;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return null;
  }

  const monthEntries = state.store?.teamMonthlyEntries?.[normalizedMonth];
  if (!isPlainObject(monthEntries) || !Object.prototype.hasOwnProperty.call(monthEntries, storageKey)) {
    return null;
  }

  return normalizeTeamMonthlyUsageValue(monthEntries[storageKey], null);
}

function hasStoredTeamMonthlyUsageOverride(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    return false;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return false;
  }

  const monthEntries = state.store?.teamMonthlyEntries?.[normalizedMonth];
  return isPlainObject(monthEntries) && Object.prototype.hasOwnProperty.call(monthEntries, storageKey);
}

function getFallbackTeamMonthlyUsageFromPortalData(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  return null;
}

function getDirectTeamMonthlyUsage(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (hasStoredTeamMonthlyUsageOverride(teamKey, monthValue, resourceType)) {
    const storedValue = getStoredTeamMonthlyUsage(teamKey, monthValue, resourceType);
    return storedValue;
  }

  return getFallbackTeamMonthlyUsageFromPortalData(teamKey, monthValue, resourceType);
}

function findWastePortalMonthRow(teamKey, monthValue = state.currentMonth) {
  return null;
}

function buildWasteBillingSettlementFallbackEntry(
  monthValue = state.currentMonth,
  scopeKey = getCurrentBillingSettlementScope(RESOURCE_TYPES.WASTE)
) {
  const teamKey = getWasteBillingSettlementTeamKeyForScope(scopeKey);
  const monthRow = findWastePortalMonthRow(teamKey, monthValue);
  if (!teamKey || !monthRow) {
    return null;
  }

  const fields = {};
  const costFields = isPlainObject(monthRow.costs) ? monthRow.costs : {};
  getWasteBillingSettlementManualCostFieldKeys(scopeKey).forEach((fieldKey) => {
    const numericValue = normalizeTeamMonthlyAmountValue(costFields[fieldKey], null);
    if (Number.isFinite(numericValue)) {
      fields[fieldKey] = String(numericValue);
    }
  });

  const rawTotalCost =
    normalizeTeamMonthlyAmountValue(monthRow.cost, null) ??
    normalizeTeamMonthlyAmountValue(costFields.total, null);
  if (Number.isFinite(rawTotalCost)) {
    fields.billing_amount = String(rawTotalCost);
  }

  const resolvedFields = resolveBillingSettlementFields(fields, monthValue, scopeKey);
  if (!Object.keys(resolvedFields).length) {
    return null;
  }

  return {
    monthValue: normalizeMonthValue(monthValue),
    fields: resolvedFields,
    completed: false,
    updatedAt: "",
  };
}

function getDirectTeamMonthlyUsageInputValue(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  const usageValue = getDirectTeamMonthlyUsage(teamKey, monthValue, resourceType);
  return Number.isFinite(usageValue) ? formatWholeNumber(usageValue) : "";
}

function setDirectTeamMonthlyUsage(
  teamKey,
  rawValue,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyUsage(teamKey, resourceType)) {
    return;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return;
  }

  const nextValue = normalizeTeamMonthlyUsageValue(rawValue, null);
  state.store.teamMonthlyEntries = isPlainObject(state.store.teamMonthlyEntries)
    ? state.store.teamMonthlyEntries
    : {};

  const nextMonthEntries = isPlainObject(state.store.teamMonthlyEntries[normalizedMonth])
    ? { ...state.store.teamMonthlyEntries[normalizedMonth] }
    : {};

  if (Number.isFinite(nextValue)) {
    nextMonthEntries[storageKey] = nextValue;
  } else {
    nextMonthEntries[storageKey] = null;
  }

  if (Object.keys(nextMonthEntries).length) {
    state.store.teamMonthlyEntries[normalizedMonth] = nextMonthEntries;
  } else {
    delete state.store.teamMonthlyEntries[normalizedMonth];
  }

  const activeDataset = syncActiveResourceDatasetToStore(state.store);
  if (activeDataset) {
    activeDataset.teamMonthlyEntries = state.store.teamMonthlyEntries;
  }
}

function normalizeTeamMonthlyAmountValue(value, fallback = null) {
  if (value === "" || value === null || value === undefined) {
    return fallback;
  }

  const numericValue =
    typeof value === "number" && Number.isFinite(value)
      ? value
      : Number.parseFloat(String(value).replace(/,/g, "").trim());

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return fallback;
  }

  return Math.round(numericValue);
}

function getStoredTeamMonthlyAmount(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyAmount(teamKey, resourceType)) {
    return null;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return null;
  }

  const monthEntries = state.store?.teamMonthlyAmountEntries?.[normalizedMonth];
  if (!isPlainObject(monthEntries) || !Object.prototype.hasOwnProperty.call(monthEntries, storageKey)) {
    return null;
  }

  return normalizeTeamMonthlyAmountValue(monthEntries[storageKey], null);
}

function hasStoredTeamMonthlyAmountOverride(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyAmount(teamKey, resourceType)) {
    return false;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return false;
  }

  const monthEntries = state.store?.teamMonthlyAmountEntries?.[normalizedMonth];
  return isPlainObject(monthEntries) && Object.prototype.hasOwnProperty.call(monthEntries, storageKey);
}

function getFallbackTeamMonthlyAmountFromPortalData(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  return null;
}

function getDirectTeamMonthlyAmount(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (hasStoredTeamMonthlyAmountOverride(teamKey, monthValue, resourceType)) {
    return getStoredTeamMonthlyAmount(teamKey, monthValue, resourceType);
  }

  return getFallbackTeamMonthlyAmountFromPortalData(teamKey, monthValue, resourceType);
}

function getDirectTeamMonthlyAmountInputValue(
  teamKey,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  const amountValue = getDirectTeamMonthlyAmount(teamKey, monthValue, resourceType);
  return Number.isFinite(amountValue) ? formatSettlementAmount(amountValue) : "";
}

function setDirectTeamMonthlyAmount(
  teamKey,
  rawValue,
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  if (!supportsDirectTeamMonthlyAmount(teamKey, resourceType)) {
    return;
  }

  const normalizedMonth = normalizeMonthValue(monthValue);
  const storageKey = getDirectTeamMonthlyStorageKey(teamKey, resourceType);
  if (!normalizedMonth) {
    return;
  }

  const nextValue = normalizeTeamMonthlyAmountValue(rawValue, null);
  state.store.teamMonthlyAmountEntries = isPlainObject(state.store.teamMonthlyAmountEntries)
    ? state.store.teamMonthlyAmountEntries
    : {};

  const nextMonthEntries = isPlainObject(state.store.teamMonthlyAmountEntries[normalizedMonth])
    ? { ...state.store.teamMonthlyAmountEntries[normalizedMonth] }
    : {};

  if (Number.isFinite(nextValue)) {
    nextMonthEntries[storageKey] = nextValue;
  } else {
    nextMonthEntries[storageKey] = null;
  }

  if (Object.keys(nextMonthEntries).length) {
    state.store.teamMonthlyAmountEntries[normalizedMonth] = nextMonthEntries;
  } else {
    delete state.store.teamMonthlyAmountEntries[normalizedMonth];
  }

  const activeDataset = syncActiveResourceDatasetToStore(state.store);
  if (activeDataset) {
    activeDataset.teamMonthlyAmountEntries = state.store.teamMonthlyAmountEntries;
  }
}
