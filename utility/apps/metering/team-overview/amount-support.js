function getElectricOtherCostDescriptors(monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return [];
  }

  const shouldSplitPlantBCosts = [
    getBillingSettlementNumericField("vat", monthValue, "plantB"),
    getBillingSettlementNumericField("electric_power_fund", monthValue, "plantB"),
    getBillingSettlementNumericField("tv_reception_fee", monthValue, "plantB"),
    getBillingSettlementNumericField("rounding_adjustment", monthValue, "plantB"),
  ].some((value) => Number.isFinite(value));
  const descriptors = [];
  const pushDescriptor = (label, value, selectionId) => {
    if (!Number.isFinite(value)) {
      return;
    }
    descriptors.push({ label, value, selectionId });
  };

  pushDescriptor(
    shouldSplitPlantBCosts ? "Plant A 부가가치세" : "부가가치세",
    getBillingSettlementNumericField("vat", monthValue, "plantA"),
    ELECTRIC_OTHER_COST_SELECTION_IDS.vat
  );
  pushDescriptor(
    shouldSplitPlantBCosts ? "Plant A 전력기금" : "전력기금",
    getBillingSettlementNumericField("electric_power_fund", monthValue, "plantA"),
    ELECTRIC_OTHER_COST_SELECTION_IDS.electricPowerFund
  );
  pushDescriptor(
    shouldSplitPlantBCosts ? "Plant A TV수신료" : "TV수신료",
    getBillingSettlementNumericField("tv_reception_fee", monthValue, "plantA"),
    ELECTRIC_OTHER_COST_SELECTION_IDS.tvReceptionFee
  );

  const plantARoundingAdjustment = getBillingSettlementNumericField(
    "rounding_adjustment",
    monthValue,
    "plantA"
  );
  if (Number.isFinite(plantARoundingAdjustment)) {
    pushDescriptor(
      shouldSplitPlantBCosts ? "Plant A 원단위 절삭" : "원단위 절삭",
      -plantARoundingAdjustment,
      ELECTRIC_OTHER_COST_SELECTION_IDS.roundingAdjustment
    );
  }

  if (shouldSplitPlantBCosts) {
    pushDescriptor(
      "Plant B 부가가치세",
      getBillingSettlementNumericField("vat", monthValue, "plantB"),
      ELECTRIC_OTHER_COST_SELECTION_IDS.plantBVat
    );
    pushDescriptor(
      "Plant B 전력기금",
      getBillingSettlementNumericField("electric_power_fund", monthValue, "plantB"),
      ELECTRIC_OTHER_COST_SELECTION_IDS.plantBElectricPowerFund
    );
    pushDescriptor(
      "Plant B TV수신료",
      getBillingSettlementNumericField("tv_reception_fee", monthValue, "plantB"),
      ELECTRIC_OTHER_COST_SELECTION_IDS.plantBTvReceptionFee
    );

    const plantBRoundingAdjustment = getBillingSettlementNumericField(
      "rounding_adjustment",
      monthValue,
      "plantB"
    );
    if (Number.isFinite(plantBRoundingAdjustment)) {
      pushDescriptor(
        "Plant B 원단위 절삭",
        -plantBRoundingAdjustment,
        ELECTRIC_OTHER_COST_SELECTION_IDS.plantBRoundingAdjustment
      );
    }
  }

  const amountAdjustment = getTeamAmountAdjustmentValue("team_04", monthValue);
  if (amountAdjustment) {
    pushDescriptor(
      "월별 보정",
      amountAdjustment,
      ELECTRIC_OTHER_COST_SELECTION_IDS.monthlyAdjustment
    );
  }

  return descriptors;
}

function getElectricOtherCostDisplayDescriptors(monthValue = state.currentMonth, options = {}) {
  const descriptors = getElectricOtherCostDescriptors(monthValue);
  if (options.selectionOnly !== true) {
    return descriptors;
  }

  const activeIds = new Set(getTeamCalendarSelection(ELECTRIC_OTHER_COST_TEAM_KEY, monthValue));
  return descriptors.filter((item) => item.selectionId && activeIds.has(item.selectionId));
}

function calculateElectricOtherCostAmount(monthValue = state.currentMonth, options = {}) {
  return sumFiniteValues(
    getElectricOtherCostDisplayDescriptors(monthValue, options).map((item) => item.value)
  );
}

function getElectricOtherCostAmountText(monthValue = state.currentMonth, options = {}) {
  const amount = calculateElectricOtherCostAmount(monthValue, options);
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getElectricOtherCostDetailText(monthValue = state.currentMonth, options = {}) {
  const descriptors = getElectricOtherCostDisplayDescriptors(monthValue, options);
  if (!descriptors.length) {
    return "";
  }

  const parts = descriptors.map(
    (item) => `${item.label} ${formatSettlementAmount(item.value)}`
  );
  const amount = calculateElectricOtherCostAmount(monthValue, options);
  if (Number.isFinite(amount)) {
    parts.push(`그 외 비용 ${formatSettlementAmount(amount)}`);
  }
  return parts.join("\n");
}

function getGasOtherCostDescriptors(monthValue = state.currentMonth) {
  if (!isGasResourceType()) {
    return [];
  }

  const descriptors = [];
  const pushDescriptor = (label, value, selectionId) => {
    if (!Number.isFinite(value) || value === 0) {
      return;
    }
    descriptors.push({ label, value, selectionId });
  };

  const pushLngScopeDescriptors = (scopeKey, scopeLabel, selectionIds) => {
    pushDescriptor(
      `${scopeLabel} 교체비`,
      getBillingSettlementNumericField("operation_fee", monthValue, scopeKey),
      selectionIds.operationFee
    );
    pushDescriptor(
      `${scopeLabel} 부가세`,
      getBillingSettlementNumericField("vat", monthValue, scopeKey),
      selectionIds.vat
    );
    pushDescriptor(
      `${scopeLabel} 가산세`,
      getBillingSettlementNumericField("fuel_adjustment_charge", monthValue, scopeKey),
      selectionIds.fuelAdjustmentCharge
    );

    const roundingAdjustment = getBillingSettlementNumericField(
      "rounding_adjustment",
      monthValue,
      scopeKey
    );
    if (Number.isFinite(roundingAdjustment) && roundingAdjustment !== 0) {
      pushDescriptor(
        `${scopeLabel} 원절삭`,
        -roundingAdjustment,
        selectionIds.roundingAdjustment
      );
    }
  };

  pushLngScopeDescriptors(
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
    "Plant B",
    {
      operationFee: GAS_OTHER_COST_SELECTION_IDS.plantBOperationFee,
      vat: GAS_OTHER_COST_SELECTION_IDS.plantBVat,
      fuelAdjustmentCharge: GAS_OTHER_COST_SELECTION_IDS.plantBFuelAdjustmentCharge,
      roundingAdjustment: GAS_OTHER_COST_SELECTION_IDS.plantBRoundingAdjustment,
    }
  );
  pushLngScopeDescriptors(
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
    "Plant A LNG",
    {
      operationFee: GAS_OTHER_COST_SELECTION_IDS.plantALngOperationFee,
      vat: GAS_OTHER_COST_SELECTION_IDS.plantALngVat,
      fuelAdjustmentCharge: GAS_OTHER_COST_SELECTION_IDS.plantALngFuelAdjustmentCharge,
      roundingAdjustment: GAS_OTHER_COST_SELECTION_IDS.plantALngRoundingAdjustment,
    }
  );
  pushDescriptor(
    "Plant A LPG 세액",
    getBillingSettlementNumericField(
      "vat",
      monthValue,
      GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY
    ),
    GAS_OTHER_COST_SELECTION_IDS.plantALpgVat
  );

  return descriptors;
}

function getGasOtherCostDisplayDescriptors(monthValue = state.currentMonth, options = {}) {
  const descriptors = getGasOtherCostDescriptors(monthValue);
  if (options.selectionOnly !== true) {
    return descriptors;
  }

  const activeIds = new Set(getTeamCalendarSelection(GAS_OTHER_COST_TEAM_KEY, monthValue));
  return descriptors.filter((item) => item.selectionId && activeIds.has(item.selectionId));
}

function calculateGasOtherCostAmount(monthValue = state.currentMonth, options = {}) {
  return sumFiniteValues(
    getGasOtherCostDisplayDescriptors(monthValue, options).map((item) => item.value)
  );
}

function getGasOtherCostAmountText(monthValue = state.currentMonth, options = {}) {
  const amount = calculateGasOtherCostAmount(monthValue, options);
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getGasOtherCostDetailText(monthValue = state.currentMonth, options = {}) {
  const descriptors = getGasOtherCostDisplayDescriptors(monthValue, options);
  if (!descriptors.length) {
    return "";
  }

  const parts = descriptors.map(
    (item) => `${item.label} ${formatSettlementAmount(item.value)}`
  );
  const amount = calculateGasOtherCostAmount(monthValue, options);
  if (Number.isFinite(amount)) {
    parts.push(`그 외 비용 ${formatSettlementAmount(amount)}`);
  }
  return parts.join("\n");
}

function calculateElectricManageDisplayAmount(monthValue = state.currentMonth, options = {}) {
  if (!isElectricResourceType()) {
    return null;
  }

  return sumFiniteValues([
    calculateTeamEquipmentVariableChargeSum("team_04", monthValue, options),
    calculateTeamBaseChargeAllocationSum("team_04", monthValue, options),
  ]);
}

function getElectricManageDisplayDetailText(monthValue = state.currentMonth, options = {}) {
  const variableChargeSum = calculateTeamEquipmentVariableChargeSum("team_04", monthValue, options);
  const baseChargeAllocationSum = calculateTeamBaseChargeAllocationSum("team_04", monthValue, options);
  const amount = calculateElectricManageDisplayAmount(monthValue, options);

  if (!Number.isFinite(amount)) {
    return "";
  }

  const parts = [];
  if (Number.isFinite(variableChargeSum)) {
    parts.push(`설비별 사용요금 합계 ${formatSettlementAmount(variableChargeSum)}`);
  }
  if (Number.isFinite(baseChargeAllocationSum)) {
    parts.push(`기본요금 배부 ${formatSettlementAmount(baseChargeAllocationSum)}`);
  }
  if (getElectricOtherCostDescriptors(monthValue).length) {
    parts.push("그 외 비용은 별도 카드에서 표시합니다.");
  }
  parts.push(`Admin Area 금액 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}

function getTeamAmountAdjustmentValue(teamKey, monthValue = state.currentMonth, options = {}) {
  if (options.selectionOnly) {
    return 0;
  }

  const monthAdjustments = TEAM_AMOUNT_ADJUSTMENTS[monthValue];

  if (!monthAdjustments) {
    return 0;
  }

  const adjustment = monthAdjustments[teamKey];
  return Number.isFinite(adjustment) ? adjustment : 0;
}

function calculateTeamAmount(teamKey, monthValue = state.currentMonth, options = {}) {
  if (
    !hasTeamGroup(teamKey) ||
    isPowerActiveTeamKey(teamKey) ||
    isPowerReactiveTeamKey(teamKey)
  ) {
    return null;
  }

  if (isElectricResourceType() && (teamKey === TEAM_01_01_KEY || isPowerPlantBTeamKey(teamKey))) {
    return resolvePlantBSettlementAmount(monthValue);
  }

  if (!isBillingSettlementCompleted(monthValue)) {
    return null;
  }

  const components = [
    calculateTeamEquipmentVariableChargeSum(teamKey, monthValue, options),
    calculateTeamBaseChargeAllocationSum(teamKey, monthValue, options),
  ];

  if (teamKey === "team_04") {
    components.push(
      getBillingSettlementNumericField("vat", monthValue),
      getBillingSettlementNumericField("electric_power_fund", monthValue),
      getBillingSettlementNumericField("tv_reception_fee", monthValue)
    );
  }

  const validComponents = components.filter((value) => Number.isFinite(value));

  if (!validComponents.length) {
    return null;
  }

  return validComponents.reduce((sum, value) => sum + value, 0) + getTeamAmountAdjustmentValue(teamKey, monthValue, options);
}

function getTeamAmountText(teamKey, options = {}, monthValue = state.currentMonth) {
  if (isGasResourceType()) {
    const amount = calculateGasTeamDisplayAmount(teamKey, monthValue, options);
    return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
  }

  if (isWasteResourceType()) {
    const amount = calculateWasteTeamDisplayAmount(teamKey, monthValue);
    return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
  }

  if (isElectricResourceType() && isPowerReactiveTeamKey(teamKey)) {
    return "";
  }

  if (isElectricResourceType() && teamKey === PLANT_B_POWER_TEAM_KEY) {
    const amount = getPlantBTotalCardAmountValue(monthValue, options);
    return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
  }

  if (isElectricResourceType() && teamKey === "team_04") {
    const amount = calculateElectricManageDisplayAmount(monthValue, options);
    return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
  }

  const amount = calculateTeamAmount(teamKey, monthValue, options);
  return amount === null ? "" : `금액 ${formatSettlementAmount(amount)}`;
}

function getTeamAmountDetailText(teamKey, options = {}, monthValue = state.currentMonth) {
  if (isGasResourceType()) {
    return getGasTeamAmountDetailText(teamKey, monthValue, options);
  }

  if (isWasteResourceType()) {
    return getWasteTeamAmountDetailText(teamKey, monthValue);
  }

  if (
    !hasTeamGroup(teamKey) ||
    isPowerActiveTeamKey(teamKey) ||
    isPowerReactiveTeamKey(teamKey)
  ) {
    return "";
  }

  if (isElectricResourceType() && (teamKey === TEAM_01_01_KEY || isPowerPlantBTeamKey(teamKey))) {
    const amount =
      teamKey === PLANT_B_POWER_TEAM_KEY
        ? getPlantBTotalCardAmountValue(monthValue, options)
        : resolvePlantBSettlementAmount(monthValue);
    if (!Number.isFinite(amount)) {
      return "";
    }

    const directAmount = getDirectTeamMonthlyAmount(
      PLANT_B_POWER_TEAM_KEY,
      monthValue,
      RESOURCE_TYPES.ELECTRIC
    );
    const scopedEntry = getBillingSettlementEntry(monthValue, "plantB");
    const scopedFields = scopedEntry?.fields || {};
    const electricityChargeTotal = resolveBillingSettlementElectricityChargeTotalValue(scopedFields);
    const baseCharge = getBillingSettlementNumericField("base_charge", monthValue, "plantB");
    if (Number.isFinite(electricityChargeTotal) || Number.isFinite(baseCharge)) {
      const parts = [`Plant B 기준 팀 Line Alpha`];
      if (Number.isFinite(electricityChargeTotal)) {
        parts.push(`Plant B 전기요금계 ${formatSettlementAmount(electricityChargeTotal)}`);
      }
      if (Number.isFinite(baseCharge)) {
        parts.push(`Plant B 기본요금 ${formatSettlementAmount(baseCharge)}`);
      }
      parts.push("Plant B 그 외 비용은 별도 카드에서 표시합니다.");
      parts.push(`Plant B 금액 ${formatSettlementAmount(amount)}`);
      return parts.join("\n");
    }

    const parts = [
      `Plant B 기준 팀 Line Alpha`,
      `Plant B 금액 ${formatSettlementAmount(amount)}`,
    ];
    if (Number.isFinite(directAmount)) {
      parts.push(`직접 입력 금액 ${formatSettlementAmount(directAmount)}`);
    } else {
      parts.push("직접 입력 금액이 없어서 기존 전력 비율 계산값을 표시합니다.");
    }
    return parts.join("\n");
  }

  if (isElectricResourceType() && teamKey === "team_04") {
    return getElectricManageDisplayDetailText(monthValue, options);
  }

  const teamLabel = getTeamDisplayLabel(teamKey) || "팀";
  const variableChargeSum = calculateTeamEquipmentVariableChargeSum(teamKey, monthValue, options);
  const baseChargeAllocationSum = calculateTeamBaseChargeAllocationSum(teamKey, monthValue, options);
  const vat = getBillingSettlementNumericField("vat", monthValue);
  const electricPowerFund = getBillingSettlementNumericField("electric_power_fund", monthValue);
  const tvReceptionFee = getBillingSettlementNumericField("tv_reception_fee", monthValue);
  const amountAdjustment = getTeamAmountAdjustmentValue(teamKey, monthValue, options);
  const amount = calculateTeamAmount(teamKey, monthValue, options);

  if (!Number.isFinite(amount)) {
    return "";
  }

  const parts = [];

  if (Number.isFinite(variableChargeSum)) {
    parts.push(`설비별 사용요금 합계 ${formatSettlementAmount(variableChargeSum)}`);
  }

  if (Number.isFinite(baseChargeAllocationSum)) {
    parts.push(`기본요금 배부 ${formatSettlementAmount(baseChargeAllocationSum)}`);
  }

  if (teamKey === "team_04") {
    if (Number.isFinite(vat)) {
      parts.push(`부가가치세 ${formatSettlementAmount(vat)}`);
    }

    if (Number.isFinite(electricPowerFund)) {
      parts.push(`전력기금 ${formatSettlementAmount(electricPowerFund)}`);
    }

    if (Number.isFinite(tvReceptionFee)) {
      parts.push(`TV수신료 ${formatSettlementAmount(tvReceptionFee)}`);
    }
  }

  if (amountAdjustment) {
    parts.push(`금액 보정 ${formatSettlementAmount(amountAdjustment)}`);
  }

  parts.push(`${teamLabel} 금액 ${formatSettlementAmount(amount)}`);
  return parts.join("\n");
}
