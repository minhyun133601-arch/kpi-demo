function renderTeamTotals() {
  const isGas = isGasResourceType();
  const isWaste = isWasteResourceType();
  const isProduction = isProductionResourceType();
  const supportsAggregateTeamCard = !isGas && !isWaste && !isProduction;
  const useTeamOverviewLayout = isElectricResourceType() || isGas || isWaste;
  const totalTeam = getTeamGroup(TOTAL_POWER_TEAM_KEY);
  const overallTotal = getTeamModeOverallMonthlyUsage();
  const availableItems = supportsAggregateTeamCard
    ? getAvailableEquipmentOptionsForTeam(TOTAL_POWER_TEAM_KEY)
    : [];
  const selectedTeamKeySet = new Set(getSelectedTeamKeys());
  elements.teamTotalsGrid.innerHTML = "";

  const totalCard = document.createElement("div");
  totalCard.className = "team-total-card team-total-card-accent";
  if (useTeamOverviewLayout) {
    totalCard.classList.add("is-static");
  } else if (supportsAggregateTeamCard) {
    totalCard.dataset.teamBoardKey = TOTAL_POWER_TEAM_KEY;
    totalCard.classList.toggle("is-selected", selectedTeamKeySet.has(TOTAL_POWER_TEAM_KEY));
    totalCard.classList.toggle("is-monthly-focus", selectedTeamKeySet.has(TOTAL_POWER_TEAM_KEY));
  }

  const head = document.createElement("div");
  head.className = "team-total-card-head";

  const copy = document.createElement("div");
  copy.className = "team-total-card-copy";

  const totalLabel = document.createElement("span");
  totalLabel.className = "team-total-card-label";
  totalLabel.textContent =
    isGas || isWaste || isProduction ? getCurrentOverallUsageLabel() : "전력총량";

  const totalValue = document.createElement("strong");
  totalValue.textContent = formatDailyUsage(overallTotal);

  const tools = document.createElement("div");
  tools.className = "team-total-card-tools";
  const wasteOverallAmount = isWaste
    ? calculateWasteOverallMonthlyAmount(state.currentMonth)
    : null;
  const totalAmountText = isElectricResourceType()
    ? getElectricTeamModeOverallAmountText(state.currentMonth)
    : isWaste
      ? Number.isFinite(wasteOverallAmount)
        ? `금액 ${formatSettlementAmount(wasteOverallAmount)}`
        : ""
      : "";
  const totalAmountDetailText = isElectricResourceType()
    ? getElectricTeamModeOverallAmountDetailText(state.currentMonth)
    : isWaste
      ? getWasteOverallAmountDetailText(state.currentMonth)
      : "";

  copy.appendChild(totalLabel);
  tools.appendChild(totalValue);
  if (totalAmountText) {
    const totalAmount = document.createElement("span");
    totalAmount.className = "team-total-card-label";
    totalAmount.textContent = totalAmountText;
    totalAmount.title = totalAmountDetailText;
    tools.appendChild(totalAmount);
  }
  if (supportsAggregateTeamCard && !useTeamOverviewLayout) {
    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "team-add-toggle";
    addButton.dataset.toggleTeamPicker = TOTAL_POWER_TEAM_KEY;
    addButton.setAttribute(
      "aria-expanded",
      String(state.openTeamPickerKey === TOTAL_POWER_TEAM_KEY)
    );
    addButton.setAttribute("aria-label", `${totalTeam?.label || "전력총량"} 설비 추가`);
    addButton.textContent = "+";
    addButton.disabled = availableItems.length === 0;
    tools.appendChild(addButton);
  }
  head.append(copy, tools);
  totalCard.appendChild(head);

  if (supportsAggregateTeamCard && !useTeamOverviewLayout && state.openTeamPickerKey === TOTAL_POWER_TEAM_KEY) {
    totalCard.appendChild(createTeamPickerElement(totalTeam));
  }

  if (supportsAggregateTeamCard || useTeamOverviewLayout) {
    if (useTeamOverviewLayout) {
      const selectorToolbar = document.createElement("div");
      selectorToolbar.className = "team-total-selector-toolbar";

      const returnHost = document.createElement("div");
      returnHost.className = "team-total-selector-return";
      returnHost.dataset.teamTotalReturnHost = "true";
      selectorToolbar.appendChild(returnHost);
      totalCard.appendChild(selectorToolbar);
      totalCard.appendChild(createTeamOverviewSelectorElement(selectedTeamKeySet));
    } else {
      totalCard.appendChild(createTeamAssignedListElement(totalTeam));
    }
  }
  elements.teamTotalsGrid.appendChild(totalCard);
}

function renderTeamBoards() {
  elements.teamBoards.innerHTML = "";

  if (!state.store.equipmentItems.length && !isWasteResourceType()) {
    const emptyState = document.createElement("div");
    emptyState.className = "team-empty-state";
    emptyState.innerHTML = `
      <strong>${isProductionResourceType() ? "항목 없음" : "설비 없음"}</strong>
    `;
    elements.teamBoards.appendChild(emptyState);
    return;
  }

  const boardsFragment = document.createDocumentFragment();
  const overallUsage = getTeamModeOverallMonthlyUsage();
  const selectedTeamKeys = new Set(getSelectedTeamKeys());
  const orderedTeamGroups = getOrderedTeamGroupsForBoardRender();
  let appendedElectricOtherCostBoard = false;

  if ((isElectricResourceType() || isGasResourceType()) && !orderedTeamGroups.length) {
    if (isGasResourceType()) {
      // Gas team mode keeps the initial "그 외 비용" board visible
      // even before any team card is selected.
    } else {
    const emptyState = document.createElement("div");
    emptyState.className = "team-empty-state";
    emptyState.innerHTML = `
      <strong>팀 선택 대기</strong>
      <p>${isGasResourceType()
        ? "상단 가스 총사용량 카드에서 팀을 누르면 해당 팀 검침만 아래에 표시됩니다."
        : "상단 전력총량 카드에서 팀을 누르면 해당 팀 설비만 아래에 표시됩니다."}</p>
    `;
    elements.teamBoards.appendChild(emptyState);
    return;
    }
  }

  orderedTeamGroups.forEach((team) => {
    if (shouldHideStandaloneTeamBoard(team.key)) {
      return;
    }

    const supportsTeamPicker = !supportsDirectTeamMonthlyUsage(team.key);
    const availableItems = supportsTeamPicker ? getAvailableEquipmentOptionsForTeam(team.key) : [];
    const displayedUsage = getTeamBoardMonthlyUsage(team.key, { selectionOnly: true });
    const usageShareText = getTeamUsageShareText(team.key, overallUsage, {
      selectionOnly: true,
    });
    const board = document.createElement("section");
    board.className = "team-board";
    board.dataset.teamBoardKey = team.key;
    board.classList.toggle("is-selected", selectedTeamKeys.has(team.key));
    board.classList.toggle("is-monthly-focus", selectedTeamKeys.has(team.key));
    board.classList.toggle("is-power-total", isPowerActiveTeamKey(team.key));
    board.classList.toggle("is-plantB-total", isPowerPlantBTeamKey(team.key));
    board.classList.toggle("is-reactive-summary", isPowerReactiveTeamKey(team.key));
    const head = document.createElement("div");
    head.className = "team-board-head";

    const titleWrap = document.createElement("div");
    titleWrap.className = "team-board-copy";
    const teamDisplayLabel = getTeamBoardDisplayLabel(team);
    const title = createIconLabel(teamDisplayLabel, team.iconKey, {
      containerTag: "h3",
      containerClass: "team-board-title",
      textClass: "team-board-title-text",
      iconClass: "category-icon team-board-icon",
    });

    const share = document.createElement("p");
    share.className = "team-board-share";
    const teamContextText = getTeamContextText(team.key);
    const teamContextDetailText = getTeamContextDetailText(team.key);
    const teamAmountText =
      isElectricResourceType() && team.key === TOTAL_POWER_TEAM_KEY
        ? getTotalPowerCardAmountText(state.currentMonth, { selectionOnly: true })
        : getTeamAmountText(team.key, { selectionOnly: true });
    share.textContent = [teamContextText, usageShareText, teamAmountText].filter(Boolean).join(" · ");
    share.title = [teamContextDetailText, getTeamAmountDetailText(team.key, { selectionOnly: true })]
      .filter(Boolean)
      .join(" · ");

    titleWrap.append(title, share);

    const tools = document.createElement("div");
    tools.className = "team-board-tools";

    const totalText = document.createElement("span");
    totalText.className = "team-board-total";
    totalText.textContent = `합계 ${formatDailyUsage(displayedUsage)}`;

    tools.append(totalText);
    if (supportsTeamPicker) {
      const addButton = document.createElement("button");
      addButton.type = "button";
      addButton.className = "team-add-toggle";
      addButton.dataset.toggleTeamPicker = team.key;
      addButton.setAttribute("aria-expanded", String(state.openTeamPickerKey === team.key));
      addButton.setAttribute("aria-label", `${teamDisplayLabel} 설비 추가`);
      addButton.textContent = "+";
      addButton.disabled = availableItems.length === 0;
      tools.append(addButton);
    }
    head.append(titleWrap, tools);
    board.appendChild(head);

    if (supportsTeamPicker && state.openTeamPickerKey === team.key) {
      board.appendChild(createTeamPickerElement(team));
    }

    board.appendChild(createTeamAssignedListElement(team));
    boardsFragment.appendChild(board);
    if (isElectricResourceType() && team.key === TOTAL_POWER_TEAM_KEY) {
      boardsFragment.appendChild(createElectricOtherCostBoardElement());
      appendedElectricOtherCostBoard = true;
    }
  });

  if (isElectricResourceType() && !appendedElectricOtherCostBoard && !selectedTeamKeys.size) {
    boardsFragment.appendChild(createElectricOtherCostBoardElement());
  }

  if (isGasResourceType() && !selectedTeamKeys.size) {
    boardsFragment.appendChild(createGasOtherCostBoardElement());
  }

  elements.teamBoards.appendChild(boardsFragment);
}


