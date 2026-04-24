function isElectricTotalOverviewTeamKey(teamKey) {
  return isElectricResourceType() && ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS.includes(teamKey);
}

function isElectricTotalSummaryTeamKey(teamKey) {
  return isElectricResourceType() && ELECTRIC_TOTAL_SUMMARY_TEAM_KEYS.includes(teamKey);
}

function getTeamBoardDisplayLabel(teamOrKey, resourceType = getCurrentResourceType()) {
  const team =
    typeof teamOrKey === "string"
      ? getTeamGroup(teamOrKey)
      : teamOrKey && typeof teamOrKey === "object"
        ? teamOrKey
        : null;
  if (!team) {
    return "";
  }

  if (isElectricResourceType(resourceType) && team.key === TOTAL_POWER_TEAM_KEY) {
    return "Plant A 전력 총량";
  }

  if (isElectricResourceType(resourceType) && team.key === PLANT_B_POWER_TEAM_KEY) {
    return "Plant B 전력 총량";
  }

  return getTeamDisplayLabel(team, resourceType);
}

function getElectricOverviewTeamMonthlyUsage(teamKey, monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return null;
  }

  if (supportsDirectTeamMonthlyUsage(teamKey, RESOURCE_TYPES.ELECTRIC)) {
    return getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.ELECTRIC);
  }

  return getTeamBoardMonthlyUsage(teamKey);
}

function calculatePlantBLegacySettlementAmount(monthValue = state.currentMonth) {
  const usage = getElectricOverviewTeamMonthlyUsage(TEAM_01_01_KEY, monthValue);
  const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
  const usageShare = calculateUsageShare(usage, totalUsage);
  const chargePool = getTotalPowerCardChargePool(monthValue);
  if (!Number.isFinite(chargePool) || !Number.isFinite(usageShare)) {
    return null;
  }

  return chargePool * usageShare;
}

function resolvePlantBSettlementAmount(monthValue = state.currentMonth) {
  const scopedEntry = getBillingSettlementEntry(monthValue, "plantB");
  const scopedFields = scopedEntry?.fields || {};
  const electricityChargeTotal = resolveBillingSettlementElectricityChargeTotalValue(scopedFields);
  const baseCharge = getBillingSettlementNumericField("base_charge", monthValue, "plantB");
  const scopedChargePool = sumFiniteValues([electricityChargeTotal, baseCharge]);
  if (Number.isFinite(scopedChargePool)) {
    return scopedChargePool;
  }

  return calculatePlantBLegacySettlementAmount(monthValue);
}

function calculateElectricOverviewTeamAmount(teamKey, monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return null;
  }

  if (supportsDirectTeamMonthlyUsage(teamKey, RESOURCE_TYPES.ELECTRIC)) {
    if (teamKey === TEAM_01_01_KEY || teamKey === PLANT_B_POWER_TEAM_KEY) {
      return resolvePlantBSettlementAmount(monthValue);
    }

    const usage = getElectricOverviewTeamMonthlyUsage(teamKey, monthValue);
    const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
    const usageShare = calculateUsageShare(usage, totalUsage);
    const chargePool = getTotalPowerCardChargePool(monthValue);
    if (!Number.isFinite(chargePool) || !Number.isFinite(usageShare)) {
      return null;
    }
    return chargePool * usageShare;
  }

  return calculateTeamAmount(teamKey, monthValue);
}

function getElectricOverviewTeamAmountText(teamKey, monthValue = state.currentMonth) {
  if (isElectricResourceType() && isPowerReactiveTeamKey(teamKey)) {
    return "";
  }

  if (isElectricResourceType() && teamKey === "team_04") {
    const amount = calculateElectricManageDisplayAmount(monthValue);
    return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
  }

  const amount = calculateElectricOverviewTeamAmount(teamKey, monthValue);
  return Number.isFinite(amount) ? `금액 ${formatSettlementAmount(amount)}` : "";
}

function getElectricOverviewTeamShareText(teamKey, monthValue = state.currentMonth) {
  if (!isElectricResourceType()) {
    return "";
  }

  if (teamKey === TEAM_01_01_KEY) {
    return "";
  }

  if (teamKey === PLANT_B_POWER_TEAM_KEY) {
    const usage = getElectricOverviewTeamMonthlyUsage(teamKey, monthValue);
    const totalUsage = getElectricTeamModeOverallMonthlyUsage(monthValue);
    const usageShare = calculateUsageShare(usage, totalUsage);
    return usageShare === null ? "" : `${getCurrentOverallUsageLabel()} ${formatUsageShare(usageShare)}`;
  }

  if (supportsDirectTeamMonthlyUsage(teamKey, RESOURCE_TYPES.ELECTRIC)) {
    return "";
  }

  const usage = getElectricOverviewTeamMonthlyUsage(teamKey, monthValue);
  const totalUsage = getTotalPowerCardMonthlyUsage(monthValue);
  const usageShare = calculateUsageShare(usage, totalUsage);
  return usageShare === null ? "" : `Plant A 전력 ${formatUsageShare(usageShare)}`;
}

function createTeamOverviewSelectorElement(selectedTeamKeySet = new Set()) {
  const grid = document.createElement("div");
  grid.className = "team-total-selector-grid";
  grid.classList.toggle("is-gas-grid", isGasResourceType());

  const overviewTeamKeys = isGasResourceType()
    ? GAS_OVERVIEW_TEAM_KEYS
    : isWasteResourceType()
      ? WASTE_OVERVIEW_TEAM_KEYS
      : ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS;

  overviewTeamKeys.forEach((teamKey) => {
    const team = getTeamGroup(teamKey);
    if (!team) {
      return;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-total-selector-btn";
    button.classList.toggle("is-gas-team", isGasResourceType());
    button.classList.toggle("is-power-total", isElectricResourceType() && team.key === TOTAL_POWER_TEAM_KEY);
    button.classList.toggle(
      "is-plantB-total",
      isElectricResourceType() && team.key === PLANT_B_POWER_TEAM_KEY
    );
    button.classList.toggle(
      "is-reactive-summary",
      isElectricResourceType() && isPowerReactiveTeamKey(team.key)
    );
    button.dataset.totalTeamSelector = team.key;
    button.classList.toggle("is-active", selectedTeamKeySet.has(team.key));
    button.setAttribute("aria-pressed", String(selectedTeamKeySet.has(team.key)));
    button.setAttribute("aria-label", `${getTeamBoardDisplayLabel(team)} 선택`);

    const label = createIconLabel(getTeamBoardDisplayLabel(team), team.iconKey, {
      containerClass: "team-total-selector-head",
      textClass: "team-total-selector-text",
      iconClass: "category-icon team-total-selector-icon",
    });

    const overviewUsage = isElectricResourceType()
      ? getElectricOverviewTeamMonthlyUsage(team.key)
      : getTeamBoardMonthlyUsage(team.key, { selectionOnly: true });
    const totalValue = document.createElement("strong");
    totalValue.className = "team-total-selector-total";
    totalValue.textContent = `합계 ${formatDailyUsage(overviewUsage)}`;

    const amountText = isElectricResourceType()
      ? getElectricOverviewTeamAmountText(team.key)
      : isWasteResourceType()
        ? getWasteOverviewTeamAmountText(team.key, state.currentMonth)
        : getGasOverviewTeamAmountText(team.key);
    const amountDetailText = isElectricResourceType()
      ? amountText
      : isWasteResourceType()
        ? getWasteTeamAmountDetailText(team.key, state.currentMonth)
        : getGasTeamAmountDetailText(team.key, state.currentMonth, {
            selectionOnly: true,
          });
    const shareText = isElectricResourceType()
      ? getElectricOverviewTeamShareText(team.key)
      : isWasteResourceType()
        ? getTeamUsageShareText(team.key, calculateWasteOverallMonthlyUsage(), {
            selectionOnly: true,
          })
        : getGasOverviewTeamShareText(team.key);
    button.title = [getTeamContextDetailText(team.key), amountDetailText, shareText]
      .filter(Boolean)
      .join("\n");
    const metaTexts = isElectricResourceType()
      ? [shareText, amountText].filter(Boolean)
      : [amountText, shareText].filter(Boolean);
    if (metaTexts.length) {
      const metaStack = document.createElement("div");
      metaStack.className = "team-total-selector-meta-stack";
      metaTexts.forEach((text) => {
        const meta = document.createElement("span");
        meta.className = "team-total-selector-meta";
        meta.textContent = text;
        metaStack.appendChild(meta);
      });
      button.append(label, totalValue, metaStack);
    } else {
      button.append(label, totalValue);
    }

    grid.appendChild(button);
  });

  return grid;
}


