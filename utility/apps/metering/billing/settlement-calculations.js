function normalizeBillingSettlementInputValue(value) {
  return String(value ?? "").trim();
}

function getBillingSettlementResourceType(
  scopeKey = "",
  fallbackResourceType = getCurrentResourceType()
) {
  if (isGasBillingSettlementScope(scopeKey)) {
    return RESOURCE_TYPES.GAS;
  }

  if (isWasteBillingSettlementScope(scopeKey)) {
    return RESOURCE_TYPES.WASTE;
  }

  if (normalizeText(scopeKey) === "plantA" || normalizeText(scopeKey) === "plantB") {
    return RESOURCE_TYPES.ELECTRIC;
  }

  return normalizeResourceType(fallbackResourceType);
}

function calculateGasSettlementScopeMonthlyUsage(
  scopeKey,
  monthValue = state.currentMonth
) {
  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey, RESOURCE_TYPES.GAS);
  if (resolvedScopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY) {
    return getDirectTeamMonthlyUsage(TEAM_01_01_KEY, monthValue, RESOURCE_TYPES.GAS);
  }

  const targetTeamKeys = GAS_SETTLEMENT_SCOPE_TEAM_KEYS[resolvedScopeKey] || [];
  if (!targetTeamKeys.length) {
    return null;
  }

  const values = targetTeamKeys
    .map((teamKey) => getTeamBoardMonthlyUsage(teamKey, { monthValue }))
    .filter((value) => Number.isFinite(value));
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function getBillingSettlementUsageBaseValue(
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const resolvedScopeKey = normalizeBillingSettlementScope(scopeKey, resourceType);

  if (resourceType === RESOURCE_TYPES.GAS) {
    return calculateGasSettlementScopeMonthlyUsage(resolvedScopeKey, monthValue);
  }

  if (resourceType === RESOURCE_TYPES.WASTE) {
    return calculateWasteSettlementScopeMonthlyUsage(resolvedScopeKey, monthValue);
  }

  if (resolvedScopeKey === "plantB") {
    return getDirectTeamMonthlyUsage(TEAM_01_01_KEY, monthValue, RESOURCE_TYPES.ELECTRIC);
  }

  return calculateTotalPowerMonthlyUsageWindow(monthValue).value;
}

function getBillingSettlementNumericField(
  fieldKey,
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const numericValue = parseBillingSettlementNumericValue(
    getBillingSettlementEntry(monthValue, scopeKey)?.fields?.[fieldKey]
  );
  return Number.isFinite(numericValue) ? numericValue : null;
}

function getBillingSettlementUnitPrice(
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const rawFields = getBillingSettlementEntry(monthValue, scopeKey)?.fields || {};
  const rawUnitPrice = calculateBillingSettlementUnitPriceValue(rawFields, monthValue, scopeKey);
  if (Number.isFinite(rawUnitPrice)) {
    return rawUnitPrice;
  }

  return getBillingSettlementNumericField("unit_price", monthValue, scopeKey);
}

function getBillingSettlementBaseCharge(monthValue = state.currentMonth) {
  return getBillingSettlementNumericField("base_charge", monthValue);
}

function isBillingSettlementCompleted(
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const completionState = getBillingSettlementCompletionState(monthValue, scopeKey);
  return Boolean(completionState.entry?.completed) && !completionState.missingFieldKeys.length;
}

function parseBillingSettlementNumericValue(value) {
  const normalizedValue = String(value ?? "").replace(/,/g, "").trim();
  if (!normalizedValue) {
    return null;
  }

  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeGasBillingSettlementRoundingAdjustmentValue(value) {
  const numericValue = parseBillingSettlementNumericValue(value);
  if (!Number.isFinite(numericValue)) {
    return normalizeBillingSettlementInputValue(value);
  }

  return String(Math.abs(numericValue));
}

function normalizeBillingSettlementStoredValue(
  fieldKey,
  value,
  resourceType = getCurrentResourceType(),
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const normalizedValue = normalizeBillingSettlementInputValue(value);
  if (!normalizedValue) {
    return "";
  }

  if (
    resourceType === RESOURCE_TYPES.GAS &&
    !isGasLpgBillingSettlementScope(scopeKey) &&
    fieldKey === "rounding_adjustment"
  ) {
    return normalizeGasBillingSettlementRoundingAdjustmentValue(normalizedValue);
  }

  const numericValue = parseBillingSettlementNumericValue(normalizedValue);
  if (!Number.isFinite(numericValue)) {
    return normalizedValue;
  }

  if (
    resourceType === RESOURCE_TYPES.GAS &&
    !isGasLpgBillingSettlementScope(scopeKey) &&
    fieldKey === "calorific_value"
  ) {
    return numericValue.toFixed(3);
  }

  return String(roundCalculatedUsage(numericValue));
}

function formatBillingSettlementFieldDisplayValue(
  fieldKey,
  value,
  resourceType = getCurrentResourceType(),
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY,
  isAutoCalculated = false
) {
  const normalizedValue = normalizeBillingSettlementInputValue(value);
  if (!normalizedValue) {
    return "";
  }

  const numericValue = parseBillingSettlementNumericValue(normalizedValue);
  if (!Number.isFinite(numericValue)) {
    return normalizedValue;
  }

  if (
    resourceType === RESOURCE_TYPES.GAS &&
    !isGasLpgBillingSettlementScope(scopeKey) &&
    fieldKey === "calorific_value"
  ) {
    return formatFixedDecimalNumber(numericValue, 3);
  }

  if (fieldKey === "unit_price") {
    return formatNumber(numericValue);
  }

  if (fieldKey === "billed_quantity_mj") {
    return formatFixedDecimalNumber(numericValue, 3);
  }

  return formatWholeNumber(numericValue);
}

function calculateBillingSettlementElectricityChargeTotal(rawFields) {
  const total = calculateBillingSettlementElectricityChargeTotalValue(rawFields);
  return Number.isFinite(total) ? formatNumber(total) : "";
}

function calculateBillingSettlementElectricityChargeTotalValue(rawFields) {
  return calculateBillingSettlementSignedTotalValue(rawFields, BILLING_SETTLEMENT_TOTAL_COMPONENTS);
}

function deriveBillingSettlementElectricityChargeTotalFromBillingAmountValue(rawFields) {
  const billingAmount = parseBillingSettlementNumericValue(rawFields?.billing_amount);
  if (!Number.isFinite(billingAmount)) {
    return null;
  }

  let hasSupportingValue = false;
  let derivedValue = billingAmount;
  const applyAdjustment = (fieldKey, sign) => {
    const numericValue = parseBillingSettlementNumericValue(rawFields?.[fieldKey]);
    if (!Number.isFinite(numericValue)) {
      return;
    }
    hasSupportingValue = true;
    derivedValue += numericValue * sign;
  };

  applyAdjustment("base_charge", -1);
  applyAdjustment("vat", -1);
  applyAdjustment("electric_power_fund", -1);
  applyAdjustment("tv_reception_fee", -1);
  applyAdjustment("rounding_adjustment", 1);

  return hasSupportingValue ? derivedValue : null;
}

function resolveBillingSettlementElectricityChargeTotalValue(rawFields) {
  const calculatedValue = calculateBillingSettlementElectricityChargeTotalValue(rawFields);
  if (Number.isFinite(calculatedValue)) {
    return calculatedValue;
  }

  const derivedValue = deriveBillingSettlementElectricityChargeTotalFromBillingAmountValue(rawFields);
  if (Number.isFinite(derivedValue)) {
    return derivedValue;
  }

  const existingValue = parseBillingSettlementNumericValue(rawFields?.electricity_charge_total);
  return Number.isFinite(existingValue) ? existingValue : null;
}

function calculateBillingSettlementUnitPrice(
  rawFields,
  monthValue,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const unitPrice = calculateBillingSettlementUnitPriceValue(rawFields, monthValue, scopeKey);
  return Number.isFinite(unitPrice) ? formatNumber(unitPrice) : "";
}

function calculateBillingSettlementBilledQuantityMj(
  rawFields,
  monthValue,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const billedQuantity = calculateBillingSettlementBilledQuantityMjValue(
    rawFields,
    monthValue,
    scopeKey
  );
  return Number.isFinite(billedQuantity)
    ? formatFixedDecimalNumber(billedQuantity, 3)
    : "";
}

function calculateBillingSettlementBilledQuantityMjValue(
  rawFields,
  monthValue,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  if (resourceType !== RESOURCE_TYPES.GAS || isGasLpgBillingSettlementScope(scopeKey)) {
    return null;
  }

  const calorificValue = parseBillingSettlementNumericValue(rawFields?.calorific_value);
  const usageBaseValue = getBillingSettlementUsageBaseValue(monthValue, scopeKey);
  if (!Number.isFinite(calorificValue) || !Number.isFinite(usageBaseValue) || usageBaseValue <= 0) {
    return null;
  }

  return calorificValue * usageBaseValue;
}

function calculateBillingSettlementUnitPriceValue(
  rawFields,
  monthValue,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const unitPriceSourceValue =
    resourceType === RESOURCE_TYPES.GAS
      ? parseBillingSettlementNumericValue(rawFields?.power_charge)
      : resourceType === RESOURCE_TYPES.WASTE
        ? calculateBillingSettlementBillingAmountValue(rawFields, scopeKey)
        : resolveBillingSettlementElectricityChargeTotalValue(rawFields);
  const totalPowerUsage = getBillingSettlementUsageBaseValue(monthValue, scopeKey);

  if (
    !Number.isFinite(unitPriceSourceValue) ||
    !Number.isFinite(totalPowerUsage) ||
    totalPowerUsage <= 0
  ) {
    return null;
  }

  return unitPriceSourceValue / totalPowerUsage;
}

function calculateBillingSettlementBillingAmount(
  rawFields,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const billingAmount = calculateBillingSettlementBillingAmountValue(rawFields, scopeKey);
  return Number.isFinite(billingAmount) ? formatNumber(billingAmount) : "";
}

function calculateBillingSettlementBillingAmountValue(
  rawFields,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const normalizedFields = {
    ...(isPlainObject(rawFields) ? rawFields : {}),
  };

  if (resourceType === RESOURCE_TYPES.GAS) {
    if (!isGasLpgBillingSettlementScope(scopeKey)) {
      const normalizedRoundingAdjustment = normalizeGasBillingSettlementRoundingAdjustmentValue(
        normalizedFields.rounding_adjustment
      );
      if (normalizedRoundingAdjustment) {
        normalizedFields.rounding_adjustment = normalizedRoundingAdjustment;
      }
    }

    return calculateBillingSettlementSignedTotalValue(
      normalizedFields,
      isGasLpgBillingSettlementScope(scopeKey)
        ? GAS_LPG_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS
        : GAS_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS
    );
  }

  if (resourceType === RESOURCE_TYPES.WASTE) {
    return calculateBillingSettlementSignedTotalValue(
      normalizedFields,
      getWasteBillingSettlementBillingAmountComponents(scopeKey)
    );
  }

  const electricityChargeTotal = resolveBillingSettlementElectricityChargeTotalValue(normalizedFields);
  if (Number.isFinite(electricityChargeTotal)) {
    normalizedFields.electricity_charge_total = electricityChargeTotal;
  }

  return calculateBillingSettlementSignedTotalValue(
    normalizedFields,
    ELECTRIC_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS
  );
}

function calculateBillingSettlementSignedTotal(rawFields, components) {
  const total = calculateBillingSettlementSignedTotalValue(rawFields, components);
  return Number.isFinite(total) ? formatNumber(total) : "";
}

function calculateBillingSettlementSignedTotalValue(rawFields, components) {
  let hasComponentValue = false;
  let total = 0;

  components.forEach(({ key, sign }) => {
    const numericValue = parseBillingSettlementNumericValue(rawFields?.[key]);
    if (!Number.isFinite(numericValue)) {
      return;
    }

    hasComponentValue = true;
    total += numericValue * sign;
  });

  return hasComponentValue ? total : null;
}
