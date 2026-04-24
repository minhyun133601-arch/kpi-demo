const ELECTRIC_UTILITY_SNAPSHOT_TEAM_KEYS = Object.freeze([
  TEAM_01_01_KEY,
  "team_01_02",
  "team_02",
  "team_03",
]);
const GAS_UTILITY_SNAPSHOT_TEAM_EQUIPMENT_IDS = Object.freeze({
  "Line Beta (LNG)": Object.freeze(["gas_field_03", "gas_field_04"]),
  "Line Beta (LPG)": Object.freeze([GAS_LPG_CORRECTION_EQUIPMENT_ID]),
  "Line Delta (LNG)": Object.freeze(["gas_field_06"]),
});
const GAS_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY = Object.freeze({
  [TEAM_01_01_KEY]: "Line Alpha (LNG)",
  [GAS_PLANT_A_LNG_TEAM_KEY]: "Line Beta (LNG)",
  [GAS_PLANT_A_LPG_TEAM_KEY]: "Line Beta (LPG)",
  team_03: "Line Delta (LNG)",
});
const GAS_UTILITY_SNAPSHOT_DIRECT_TEAM_NAMES = Object.freeze({
  "Line Alpha (LNG)": TEAM_01_01_KEY,
});
const GAS_UTILITY_SNAPSHOT_TEAM_COST_SCOPES = Object.freeze({
  "Line Alpha (LNG)": GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
  "Line Beta (LNG)": GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
  "Line Beta (LPG)": GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
  "Line Delta (LNG)": GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
});
const WASTE_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY = Object.freeze({
  [WASTE_PLANT_B_TEAM_KEY]: "Plant B",
  [WASTE_PLANT_A_TEAM_KEY]: "Plant A",
});

function cloneStoreSnapshot(store = state.store) {
  try {
    return JSON.parse(JSON.stringify(store || {}));
  } catch (error) {
    return {};
  }
}

function resolveDetachedSnapshotSourceStore(store = state.store) {
  if (store !== state.store || state.eventsBound) {
    return store;
  }

  return loadStore();
}

function withDetachedResourceSnapshot(resourceType, monthValue, callback, store = state.store) {
  const previousStore = state.store;
  const previousMonth = state.currentMonth;

  try {
    const clonedStore = normalizeStore(
      cloneStoreSnapshot(resolveDetachedSnapshotSourceStore(store))
    );
    attachResourceDatasetToStore(clonedStore, resourceType);
    // Reading timelines are keyed only by equipment id, so clear them when the snapshot swaps stores.
    clearEquipmentReadingTimelineCaches();
    if (normalizeResourceType(resourceType) === RESOURCE_TYPES.ELECTRIC) {
      const electricDataset = getActiveResourceDataset(clonedStore, RESOURCE_TYPES.ELECTRIC);
      const presetBillingSettlementEntries = normalizeBillingSettlementEntries(
        getPresetBillingSettlementEntries()
      );
      if (
        isPlainObject(electricDataset) &&
        !Object.keys(electricDataset.billingSettlementEntries || {}).length &&
        Object.keys(presetBillingSettlementEntries).length
      ) {
        electricDataset.billingSettlementEntries = presetBillingSettlementEntries;
        if (normalizeResourceType(clonedStore.resourceType) === RESOURCE_TYPES.ELECTRIC) {
          clonedStore.billingSettlementEntries = electricDataset.billingSettlementEntries;
        }
      }
    }
    state.store = clonedStore;
    state.currentMonth = normalizeMonthValue(monthValue) || previousMonth || "";
    return callback(clonedStore);
  } finally {
    clearEquipmentReadingTimelineCaches();
    state.store = previousStore;
    state.currentMonth = previousMonth;
  }
}

function collectElectricUtilitySnapshotMonthValues(store = state.store) {
  const dataset = getActiveResourceDataset(store, RESOURCE_TYPES.ELECTRIC);
  const monthValues = new Set();

  Object.keys(dataset?.equipmentEntries || {}).forEach((dateString) => {
    const monthValue = normalizeMonthValue(String(dateString || "").slice(0, 7));
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.billingSettlementEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.teamMonthlyEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.teamMonthlyAmountEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  return Array.from(monthValues).sort((a, b) => a.localeCompare(b, "ko"));
}

function collectGasUtilitySnapshotMonthValues(store = state.store) {
  const dataset = getActiveResourceDataset(store, RESOURCE_TYPES.GAS);
  const monthValues = new Set();

  Object.keys(dataset?.equipmentEntries || {}).forEach((dateString) => {
    const monthValue = normalizeMonthValue(String(dateString || "").slice(0, 7));
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.billingSettlementEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.teamMonthlyEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.teamMonthlyAmountEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  return Array.from(monthValues).sort((a, b) => a.localeCompare(b, "ko"));
}

function collectWasteUtilitySnapshotMonthValues(store = state.store) {
  const dataset = getActiveResourceDataset(store, RESOURCE_TYPES.WASTE);
  const monthValues = new Set();

  Object.keys(dataset?.billingSettlementEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  Object.keys(dataset?.teamMonthlyEntries || {}).forEach((rawMonthValue) => {
    const monthValue = normalizeMonthValue(rawMonthValue);
    if (monthValue) {
      monthValues.add(monthValue);
    }
  });

  return Array.from(monthValues).sort((a, b) => a.localeCompare(b, "ko"));
}

function calculateGasUtilitySnapshotTeamUsage(equipmentIds = []) {
  const values = equipmentIds
    .map((equipmentId) => getTeamAssignedChipDisplayUsage(equipmentId))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function calculateGasUtilitySnapshotTeamCost(
  teamName,
  usageValue,
  monthValue = state.currentMonth
) {
  const scopeKey = GAS_UTILITY_SNAPSHOT_TEAM_COST_SCOPES[teamName];
  if (!scopeKey) {
    return null;
  }

  if (
    scopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY ||
    scopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY
  ) {
    const directPowerCharge = getBillingSettlementNumericField("power_charge", monthValue, scopeKey);
    if (Number.isFinite(directPowerCharge)) {
      return directPowerCharge;
    }
  }

  if (!Number.isFinite(usageValue)) {
    return null;
  }

  const unitPrice = getBillingSettlementUnitPrice(monthValue, scopeKey);
  if (!Number.isFinite(unitPrice)) {
    return null;
  }

  return usageValue * unitPrice;
}

function getGasUtilitySnapshotTeamName(teamKey) {
  return GAS_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY[teamKey] || "";
}

function getWasteUtilitySnapshotTeamName(teamKey) {
  return WASTE_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY[teamKey] || "";
}

function getGasBillingSettlementScopeShortLabel(scopeKey) {
  const definition = getBillingSettlementScopeDefinitions(RESOURCE_TYPES.GAS).find(
    (item) => item.key === scopeKey
  );
  return definition?.shortLabel || "";
}

function calculateWasteSettlementScopeMonthlyUsage(
  scopeKey,
  monthValue = state.currentMonth
) {
  const teamKey = getWasteBillingSettlementTeamKeyForScope(scopeKey);
  if (!teamKey) {
    return null;
  }

  return getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.WASTE);
}

function calculateWasteTeamDisplayAmount(teamKey, monthValue = state.currentMonth) {
  const scopeKey = getWasteBillingSettlementScopeKeyForTeam(teamKey);
  if (!scopeKey) {
    return null;
  }

  return getBillingSettlementNumericField("billing_amount", monthValue, scopeKey);
}

function getWasteOverviewTeamAmountText(teamKey, monthValue = state.currentMonth) {
  const amount = calculateWasteTeamDisplayAmount(teamKey, monthValue);
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getWasteBillingSettlementFieldLabel(scopeKey, fieldKey) {
  return (
    getBillingSettlementFields(RESOURCE_TYPES.WASTE, scopeKey).find(
      (field) => field.key === fieldKey
    )?.label || fieldKey
  );
}

function getWasteTeamAmountDetailText(teamKey, monthValue = state.currentMonth) {
  if (!isWasteResourceType()) {
    return "";
  }

  const scopeKey = getWasteBillingSettlementScopeKeyForTeam(teamKey);
  const amount = calculateWasteTeamDisplayAmount(teamKey, monthValue);
  if (!scopeKey || !Number.isFinite(amount)) {
    return "";
  }

  const usageValue = getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.WASTE);
  const unitPrice = getBillingSettlementUnitPrice(monthValue, scopeKey);
  const entryFields = getBillingSettlementEntry(monthValue, scopeKey)?.fields || {};
  const parts = [`${getTeamDisplayLabel(teamKey)} 폐수 정산`];

  if (Number.isFinite(usageValue)) {
    parts.push(`월 사용량 ${formatWholeNumber(usageValue)}`);
  }

  getWasteBillingSettlementManualCostFieldKeys(scopeKey).forEach((fieldKey) => {
    const numericValue = parseBillingSettlementNumericValue(entryFields[fieldKey]);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    parts.push(
      `${getWasteBillingSettlementFieldLabel(scopeKey, fieldKey)} ${formatSettlementAmount(
        numericValue
      )}`
    );
  });

  if (Number.isFinite(unitPrice)) {
    parts.push(`단가 ${formatNumber(unitPrice)}`);
  }

  parts.push(`총비용 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}

function calculateWasteOverallMonthlyUsage(monthValue = state.currentMonth) {
  const values = WASTE_OVERVIEW_TEAM_KEYS
    .map((teamKey) => getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.WASTE))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function calculateWasteOverallMonthlyAmount(monthValue = state.currentMonth) {
  const values = WASTE_OVERVIEW_TEAM_KEYS
    .map((teamKey) => calculateWasteTeamDisplayAmount(teamKey, monthValue))
    .filter((value) => Number.isFinite(value));
  return values.length ? values.reduce((sum, value) => sum + value, 0) : null;
}

function getWasteOverallAmountDetailText(monthValue = state.currentMonth) {
  const amount = calculateWasteOverallMonthlyAmount(monthValue);
  if (!Number.isFinite(amount)) {
    return "";
  }

  const parts = WASTE_OVERVIEW_TEAM_KEYS.map((teamKey) => {
    const teamAmount = calculateWasteTeamDisplayAmount(teamKey, monthValue);
    return Number.isFinite(teamAmount)
      ? `${getTeamDisplayLabel(teamKey)} 금액 ${formatSettlementAmount(teamAmount)}`
      : "";
  }).filter(Boolean);
  parts.push(`통합 금액 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}

function buildWasteUtilitySnapshotCosts(rawFields, scopeKey) {
  const costs = {};
  getWasteBillingSettlementManualCostFieldKeys(scopeKey).forEach((fieldKey) => {
    const numericValue = parseBillingSettlementNumericValue(rawFields?.[fieldKey]);
    if (Number.isFinite(numericValue)) {
      costs[fieldKey] = Math.round(numericValue);
    }
  });
  const totalCost = calculateBillingSettlementBillingAmountValue(rawFields, scopeKey);
  if (Number.isFinite(totalCost)) {
    costs.total = Math.round(totalCost);
  }
  return Object.keys(costs).length ? costs : null;
}

function calculateGasTeamDisplayAmount(teamKey, monthValue = state.currentMonth, options = {}) {
  if (!isGasResourceType()) {
    return null;
  }

  const teamName = getGasUtilitySnapshotTeamName(teamKey);
  if (!teamName) {
    return null;
  }

  const usageValue = getTeamBoardMonthlyUsage(teamKey, {
    monthValue,
    selectionOnly: options.selectionOnly === true,
  });
  return calculateGasUtilitySnapshotTeamCost(teamName, usageValue, monthValue);
}

function getGasOverviewTeamAmountText(teamKey, monthValue = state.currentMonth) {
  const amount = calculateGasTeamDisplayAmount(teamKey, monthValue, {
    selectionOnly: true,
  });
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getGasTeamAmountDetailText(teamKey, monthValue = state.currentMonth, options = {}) {
  if (!isGasResourceType()) {
    return "";
  }

  const teamName = getGasUtilitySnapshotTeamName(teamKey);
  if (!teamName) {
    return "";
  }

  const scopeKey = GAS_UTILITY_SNAPSHOT_TEAM_COST_SCOPES[teamName];
  const amount = calculateGasTeamDisplayAmount(teamKey, monthValue, options);
  if (!scopeKey || !Number.isFinite(amount)) {
    return "";
  }

  const usageValue = getTeamBoardMonthlyUsage(teamKey, {
    monthValue,
    selectionOnly: options.selectionOnly === true,
  });
  const powerCharge = getBillingSettlementNumericField("power_charge", monthValue, scopeKey);
  const unitPrice = getBillingSettlementUnitPrice(monthValue, scopeKey);
  const scopeLabel = getGasBillingSettlementScopeShortLabel(scopeKey) || getTeamDisplayLabel(teamKey);
  const coreChargeLabel =
    scopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY ? "공급가액" : "사용료";
  const parts = [];

  if (Number.isFinite(powerCharge)) {
    parts.push(`${scopeLabel} ${coreChargeLabel} ${formatSettlementAmount(powerCharge)}`);
  }

  if (
    scopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY &&
    Number.isFinite(unitPrice) &&
    Number.isFinite(usageValue)
  ) {
    parts.push(
      `단가 ${formatNumber(unitPrice)} x 사용량 ${formatWholeNumber(usageValue)} = ${formatSettlementAmount(
        amount
      )}`
    );
  }

  if (getGasOtherCostDescriptors(monthValue).length) {
    parts.push("그 외 비용은 별도 카드에서 표시합니다.");
  }

  parts.push(`${getTeamDisplayLabel(teamKey)} 금액 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}


