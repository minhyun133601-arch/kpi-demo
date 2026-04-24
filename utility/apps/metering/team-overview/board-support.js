function calculateGasPlantALngMonthlyUsage() {
  if (!isGasResourceType()) {
    return null;
  }

  const values = GAS_CORRECTION_SOURCE_IDS
    .map((equipmentId) => getTeamAssignedChipDisplayUsage(equipmentId))
    .filter((value) => Number.isFinite(value));

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function createGasLngReferenceSelectorCard() {
  const team = getTeamGroup("team_01_02");
  const card = document.createElement("article");
  card.className = "team-total-selector-note is-gas-lng-summary";
  card.setAttribute("aria-label", "Plant A LNG 합계 참고");

  const head = createIconLabel("Plant A LNG 합계", team?.iconKey || "equipment", {
    containerClass: "team-total-selector-head",
    textClass: "team-total-selector-text",
    iconClass: "category-icon team-total-selector-icon",
  });

  const totalValue = document.createElement("strong");
  totalValue.className = "team-total-selector-total";
  totalValue.textContent = formatDailyUsage(calculateGasPlantALngMonthlyUsage());

  const metaStack = document.createElement("div");
  metaStack.className = "team-total-selector-meta-stack";

  const sourceMeta = document.createElement("span");
  sourceMeta.className = "team-total-selector-meta";
  sourceMeta.textContent = "Line Beta Demo Boiler A + Process Gamma Boiler + Demo Boiler B 합계";

  const excludeMeta = document.createElement("span");
  excludeMeta.className = "team-total-selector-meta";
  excludeMeta.textContent = "가스 총사용량, 비율 계산 제외";

  metaStack.append(sourceMeta, excludeMeta);
  card.title = "Plant A LNG 합계 = Line Beta Demo Boiler A + Process Gamma Boiler + Demo Boiler B";
  card.append(head, totalValue, metaStack);
  return card;
}

function createPlantBTotalCardToggleListElement(monthValue = state.currentMonth) {
  const descriptors = getPlantBTotalCardToggleDescriptors(monthValue);
  const selectedIds = new Set(getTeamCalendarSelection(PLANT_B_POWER_TEAM_KEY, monthValue));
  const list = document.createElement("div");
  list.className = "team-assigned-list";

  if (!descriptors.length) {
    const empty = document.createElement("p");
    empty.className = "team-assigned-empty";
    empty.textContent = "없음";
    list.appendChild(empty);
    return list;
  }

  descriptors.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "team-assigned-chip";
    chip.dataset.teamKey = PLANT_B_POWER_TEAM_KEY;
    chip.dataset.toggleTeamCalendarEquipment = item.selectionId;
    chip.classList.toggle("is-active", selectedIds.has(item.selectionId));

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "team-assigned-chip-toggle";
    toggleButton.dataset.teamKey = PLANT_B_POWER_TEAM_KEY;
    toggleButton.dataset.toggleTeamCalendarEquipment = item.selectionId;
    toggleButton.setAttribute("aria-pressed", String(selectedIds.has(item.selectionId)));
    toggleButton.setAttribute("aria-label", `${item.label} 달력 합계 토글`);
    toggleButton.title = [
      item.detailText,
      getPlantBTotalCardDescriptorDetailText(item, monthValue, {
        selectionOnly: true,
      }),
    ]
      .filter(Boolean)
      .join("\n");

    const label = createIconLabel(item.label, item.iconKey || "power_active", {
      containerClass: "team-assigned-chip-label",
      textClass: "team-assigned-chip-text",
      iconClass: "category-icon team-assigned-icon",
    });

    const usageValue = document.createElement("span");
    usageValue.className = "team-assigned-chip-value";
    usageValue.textContent = item.usageText;

    const shareValue = document.createElement("span");
    shareValue.className = "team-assigned-chip-share";
    shareValue.textContent = getPlantBTotalCardDescriptorShareText(item, monthValue, {
      selectionOnly: true,
    });
    shareValue.classList.toggle("is-hidden", !shareValue.textContent);

    const chargeValue = document.createElement("span");
    chargeValue.className = "team-assigned-chip-charge";
    chargeValue.textContent = item.chargeText || "";
    chargeValue.classList.toggle("is-hidden", !chargeValue.textContent);

    const metrics = document.createElement("span");
    metrics.className = "team-assigned-chip-metrics";
    metrics.append(usageValue, shareValue, chargeValue);

    toggleButton.append(label, metrics);
    chip.append(toggleButton);
    list.appendChild(chip);
  });

  return list;
}

function createElectricOtherCostListElement(monthValue = state.currentMonth) {
  const descriptors = getElectricOtherCostDescriptors(monthValue);
  const selectedIds = new Set(getTeamCalendarSelection(ELECTRIC_OTHER_COST_TEAM_KEY, monthValue));
  const list = document.createElement("div");
  list.className = "team-assigned-list";

  if (!descriptors.length) {
    const empty = document.createElement("p");
    empty.className = "team-assigned-empty";
    empty.textContent = "없음";
    list.appendChild(empty);
    return list;
  }

  descriptors.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "team-assigned-chip";
    chip.dataset.teamKey = ELECTRIC_OTHER_COST_TEAM_KEY;
    chip.dataset.toggleTeamCalendarEquipment = item.selectionId;
    chip.classList.toggle("is-active", selectedIds.has(item.selectionId));

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "team-assigned-chip-toggle";
    toggleButton.dataset.teamKey = ELECTRIC_OTHER_COST_TEAM_KEY;
    toggleButton.dataset.toggleTeamCalendarEquipment = item.selectionId;
    toggleButton.setAttribute("aria-pressed", String(selectedIds.has(item.selectionId)));
    toggleButton.setAttribute("aria-label", `${item.label} 달력 합계 토글`);
    toggleButton.title = `${item.label} ${formatSettlementAmount(item.value)}`;

    const label = createIconLabel(item.label, "manage", {
      containerClass: "team-assigned-chip-label",
      textClass: "team-assigned-chip-text",
      iconClass: "category-icon team-assigned-icon",
    });

    const amountValue = document.createElement("span");
    amountValue.className = "team-assigned-chip-value";
    amountValue.textContent = `금액 ${formatSettlementAmount(item.value)}`;

    const metrics = document.createElement("span");
    metrics.className = "team-assigned-chip-metrics";
    metrics.append(amountValue);

    toggleButton.append(label, metrics);
    chip.append(toggleButton);
    list.appendChild(chip);
  });

  return list;
}

function createElectricOtherCostBoardElement(monthValue = state.currentMonth) {
  const board = document.createElement("section");
  board.className = "team-board";

  const head = document.createElement("div");
  head.className = "team-board-head";

  const titleWrap = document.createElement("div");
  titleWrap.className = "team-board-copy";

  const title = createIconLabel("그 외 비용", "manage", {
    containerTag: "h3",
    containerClass: "team-board-title",
    textClass: "team-board-title-text",
    iconClass: "category-icon team-board-icon",
  });

  const share = document.createElement("p");
  share.className = "team-board-share";
  share.textContent = ["추가 항목", getElectricOtherCostAmountText(monthValue, { selectionOnly: true })]
    .filter(Boolean)
    .join(" · ");
  share.title = getElectricOtherCostDetailText(monthValue, { selectionOnly: true });
  titleWrap.append(title, share);

  const tools = document.createElement("div");
  tools.className = "team-board-tools";

  const totalText = document.createElement("span");
  totalText.className = "team-board-total";
  const amount = calculateElectricOtherCostAmount(monthValue, { selectionOnly: true });
  totalText.textContent = Number.isFinite(amount)
    ? `총액 ${formatSettlementAmount(amount)}`
    : "총액 -";

  tools.append(totalText);
  head.append(titleWrap, tools);

  board.append(head, createElectricOtherCostListElement(monthValue));
  return board;
}

function createGasOtherCostListElement(monthValue = state.currentMonth) {
  const descriptors = getGasOtherCostDescriptors(monthValue);
  const selectedIds = new Set(getTeamCalendarSelection(GAS_OTHER_COST_TEAM_KEY, monthValue));
  const list = document.createElement("div");
  list.className = "team-assigned-list";

  if (!descriptors.length) {
    const empty = document.createElement("p");
    empty.className = "team-assigned-empty";
    empty.textContent = "없음";
    list.appendChild(empty);
    return list;
  }

  descriptors.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "team-assigned-chip";
    chip.dataset.teamKey = GAS_OTHER_COST_TEAM_KEY;
    chip.dataset.toggleTeamCalendarEquipment = item.selectionId;
    chip.classList.toggle("is-active", selectedIds.has(item.selectionId));

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "team-assigned-chip-toggle";
    toggleButton.dataset.teamKey = GAS_OTHER_COST_TEAM_KEY;
    toggleButton.dataset.toggleTeamCalendarEquipment = item.selectionId;
    toggleButton.setAttribute("aria-pressed", String(selectedIds.has(item.selectionId)));
    toggleButton.setAttribute("aria-label", `${item.label} 달력 합계 토글`);
    toggleButton.title = `${item.label} ${formatSettlementAmount(item.value)}`;

    const label = createIconLabel(item.label, "manage", {
      containerClass: "team-assigned-chip-label",
      textClass: "team-assigned-chip-text",
      iconClass: "category-icon team-assigned-icon",
    });

    const amountValue = document.createElement("span");
    amountValue.className = "team-assigned-chip-value";
    amountValue.textContent = `금액 ${formatSettlementAmount(item.value)}`;

    const metrics = document.createElement("span");
    metrics.className = "team-assigned-chip-metrics";
    metrics.append(amountValue);

    toggleButton.append(label, metrics);
    chip.append(toggleButton);
    list.appendChild(chip);
  });

  return list;
}

function createGasOtherCostBoardElement(monthValue = state.currentMonth) {
  const board = document.createElement("section");
  board.className = "team-board";

  const head = document.createElement("div");
  head.className = "team-board-head";

  const titleWrap = document.createElement("div");
  titleWrap.className = "team-board-copy";

  const title = createIconLabel("그 외 비용", "manage", {
    containerTag: "h3",
    containerClass: "team-board-title",
    textClass: "team-board-title-text",
    iconClass: "category-icon team-board-icon",
  });

  const share = document.createElement("p");
  share.className = "team-board-share";
  share.textContent = ["추가 항목", getGasOtherCostAmountText(monthValue, { selectionOnly: true })]
    .filter(Boolean)
    .join(" · ");
  share.title = getGasOtherCostDetailText(monthValue, { selectionOnly: true });
  titleWrap.append(title, share);

  const tools = document.createElement("div");
  tools.className = "team-board-tools";

  const totalText = document.createElement("span");
  totalText.className = "team-board-total";
  const amount = calculateGasOtherCostAmount(monthValue, { selectionOnly: true });
  totalText.textContent = Number.isFinite(amount)
    ? `총액 ${formatSettlementAmount(amount)}`
    : "총액 -";

  tools.append(totalText);
  head.append(titleWrap, tools);

  board.append(head, createGasOtherCostListElement(monthValue));
  return board;
}

function getGasOverviewTeamShareText(teamKey, monthValue = state.currentMonth) {
  if (!isGasResourceType()) {
    return "";
  }

  const usage = getTeamBoardMonthlyUsage(teamKey, {
    selectionOnly: true,
    monthValue,
  });
  const totalUsage = getTeamModeOverallMonthlyUsage();
  const usageShare = calculateUsageShare(usage, totalUsage);
  return usageShare === null ? "" : `가스 총사용량 ${formatUsageShare(usageShare)}`;
}

function getOrderedTeamGroupsForBoardRender() {
  const teamGroups = getCurrentTeamGroups();

  if (isGasResourceType()) {
    const selectedTeamKeySet = new Set(getSelectedTeamKeys());
    if (!selectedTeamKeySet.size) {
      return [];
    }

    return teamGroups.filter((team) => selectedTeamKeySet.has(team.key));
  }

  if (isWasteResourceType()) {
    const selectedTeamKeySet = new Set(getSelectedTeamKeys());
    if (!selectedTeamKeySet.size) {
      return teamGroups;
    }

    return teamGroups.filter((team) => selectedTeamKeySet.has(team.key));
  }

  if (!isElectricResourceType()) {
    return teamGroups;
  }

  const selectedTeamKeySet = new Set(getSelectedTeamKeys());
  const orderedTeamKeys = selectedTeamKeySet.size
    ? ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS.filter((teamKey) => selectedTeamKeySet.has(teamKey))
    : [...ELECTRIC_TOTAL_SUMMARY_TEAM_KEYS];
  const orderedGroups = orderedTeamKeys
    .map((teamKey) => getTeamGroup(teamKey))
    .filter(Boolean);

  const seen = new Set();
  return orderedGroups.filter((team) => {
    if (!team || seen.has(team.key)) {
      return false;
    }
    seen.add(team.key);
    return true;
  });
}


