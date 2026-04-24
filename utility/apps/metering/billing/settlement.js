function buildBillingSettlementCompletionFields(
  rawFields,
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const nextRawFields = {
    ...(isPlainObject(rawFields) ? rawFields : {}),
  };

  getBillingSettlementZeroDefaultFieldKeys(resourceType, scopeKey).forEach((fieldKey) => {
    if (!normalizeBillingSettlementInputValue(nextRawFields[fieldKey])) {
      nextRawFields[fieldKey] = "0";
    }
  });

  return resolveBillingSettlementFields(nextRawFields, monthValue, scopeKey);
}

function getBillingSettlementCompletionState(
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const manualFieldKeys = getBillingSettlementManualFieldKeys(resourceType, scopeKey);
  const requiresCalorificValue =
    resourceType !== RESOURCE_TYPES.GAS ||
    isGasLpgBillingSettlementScope(scopeKey) ||
    Number.isFinite(getBillingSettlementUsageBaseValue(monthValue, scopeKey));
  const requiredManualFieldKeys = requiresCalorificValue
    ? manualFieldKeys
    : manualFieldKeys.filter((fieldKey) => fieldKey !== "calorific_value");
  const entry = getBillingSettlementEntry(monthValue, scopeKey);
  if (!entry?.fields) {
    return {
      entry,
      fields: {},
      missingFieldKeys: [...requiredManualFieldKeys],
    };
  }

  const fields = buildBillingSettlementCompletionFields(entry.fields, monthValue, scopeKey);
  const missingFieldKeys = requiredManualFieldKeys.filter(
    (fieldKey) => !normalizeBillingSettlementInputValue(fields[fieldKey])
  );
  return {
    entry,
    fields,
    missingFieldKeys,
  };
}

function resolveBillingSettlementFields(
  rawFields,
  monthValue = state.currentMonth,
  scopeKey = DEFAULT_BILLING_SETTLEMENT_SCOPE_KEY
) {
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const settlementFields = getBillingSettlementFields(resourceType, scopeKey);
  const autoCalculatedFieldKeys = getBillingSettlementAutoCalculatedFieldKeySet(
    resourceType,
    scopeKey
  );
  const zeroDefaultFieldKeys = getBillingSettlementZeroDefaultFieldKeys(
    resourceType,
    scopeKey
  );
  const fields = {};
  const preservedElectricityChargeTotal = normalizeBillingSettlementInputValue(
    rawFields?.electricity_charge_total
  );
  const preservedBilledQuantityMj = normalizeBillingSettlementInputValue(
    rawFields?.billed_quantity_mj
  );
  const preservedUnitPrice = normalizeBillingSettlementInputValue(rawFields?.unit_price);
  const preservedBillingAmount = normalizeBillingSettlementInputValue(rawFields?.billing_amount);

  settlementFields.forEach((field) => {
    if (autoCalculatedFieldKeys.has(field.key)) {
      return;
    }

    const fieldValue = normalizeBillingSettlementInputValue(rawFields?.[field.key]);
    if (fieldValue) {
      if (field.key === "calorific_value") {
        const numericValue = parseBillingSettlementNumericValue(fieldValue);
        fields[field.key] = Number.isFinite(numericValue)
          ? numericValue.toFixed(3)
          : fieldValue;
      } else if (
        resourceType === RESOURCE_TYPES.GAS &&
        field.key === "rounding_adjustment"
      ) {
        fields[field.key] = normalizeGasBillingSettlementRoundingAdjustmentValue(fieldValue);
      } else {
        fields[field.key] = fieldValue;
      }
    }
  });

  if (Object.keys(fields).length) {
    zeroDefaultFieldKeys.forEach((fieldKey) => {
      if (!normalizeBillingSettlementInputValue(fields[fieldKey])) {
        fields[fieldKey] = "0";
      }
    });
  }

  if (resourceType === RESOURCE_TYPES.ELECTRIC) {
    const electricityChargeTotal = calculateBillingSettlementElectricityChargeTotal(fields);
    if (electricityChargeTotal) {
      fields.electricity_charge_total = electricityChargeTotal;
    } else if (preservedElectricityChargeTotal) {
      fields.electricity_charge_total = preservedElectricityChargeTotal;
    }
  }

  if (resourceType === RESOURCE_TYPES.GAS && !isGasLpgBillingSettlementScope(scopeKey)) {
    const billedQuantityMj = calculateBillingSettlementBilledQuantityMj(fields, monthValue, scopeKey);
    if (billedQuantityMj) {
      fields.billed_quantity_mj = billedQuantityMj;
    } else if (preservedBilledQuantityMj) {
      fields.billed_quantity_mj = preservedBilledQuantityMj;
    }
  }

  const unitPrice = calculateBillingSettlementUnitPrice(fields, monthValue, scopeKey);
  if (unitPrice) {
    fields.unit_price = unitPrice;
  } else if (preservedUnitPrice) {
    fields.unit_price = preservedUnitPrice;
  }

  const billingAmount = calculateBillingSettlementBillingAmount(fields, scopeKey);
  if (resourceType === RESOURCE_TYPES.GAS || resourceType === RESOURCE_TYPES.WASTE) {
    if (billingAmount) {
      fields.billing_amount = billingAmount;
    } else if (preservedBillingAmount) {
      fields.billing_amount = preservedBillingAmount;
    }
  } else if (preservedBillingAmount) {
    fields.billing_amount = preservedBillingAmount;
  } else if (billingAmount) {
    fields.billing_amount = billingAmount;
  }

  return fields;
}
