function handleClearCardSelectionClick() {
  clearCardSelection();
}

function clearCardSelection() {
  if (getCurrentMode() === MODES.TEAM) {
    if (!getSelectedTeamKeys().length) {
      syncClearCardSelectionButton();
      return;
    }

    state.selectedTeamKey = "";
    state.selectedTeamKeys = [];
    state.teamSelectionAnchorKey = "";
    syncSelectedDatePresentation();
    renderTeamMode();
    renderCalendar();
    renderSummary();
    return;
  }

  if (!getSelectedEquipmentIds().length) {
    syncClearCardSelectionButton();
    return;
  }

  state.selectedEquipmentKeys = [];
  state.equipmentSelectionAnchorKey = "";
  syncSelectedEquipmentCardState();
  syncSelectedDatePresentation();
  renderCalendar();
  renderSummary();
}

function shouldUseTeamSummaryReturnButton() {
  return Boolean(
    getCurrentMode() === MODES.TEAM &&
      (isElectricResourceType() || isGasResourceType()) &&
      getSelectedTeamKeys().length
  );
}

function shouldEmbedClearCardSelectionButtonInElectricTotalCard() {
  return Boolean(
    getCurrentMode() === MODES.TEAM &&
      (isElectricResourceType() || isGasResourceType())
  );
}

function hasActiveCardSelection() {
  if (getCurrentMode() === MODES.TEAM) {
    return getSelectedTeamKeys().length > 0;
  }

  return getSelectedEquipmentIds().length > 0;
}

function syncClearCardSelectionButton() {
  if (!elements.clearCardSelectionBtn) {
    return;
  }

  const hasSelection = hasActiveCardSelection();
  const useReturnButton = shouldUseTeamSummaryReturnButton();
  const buttonLabel = useReturnButton ? "←" : "선택 해제";
  const buttonTitle = useReturnButton
    ? isGasResourceType()
      ? "가스 팀 전체 보기"
      : "Plant B 전력 총량, Plant A 전력 총량, 무효전력 보기"
    : "선택한 카드를 해제합니다.";

  elements.clearCardSelectionBtn.textContent = buttonLabel;
  elements.clearCardSelectionBtn.setAttribute("aria-label", buttonTitle);
  elements.clearCardSelectionBtn.title = buttonTitle;
  elements.clearCardSelectionBtn.classList.toggle("is-icon-only", useReturnButton);
  elements.clearCardSelectionBtn.classList.toggle("is-hidden", !hasSelection);
  elements.clearCardSelectionBtn.disabled = !hasSelection;
  syncClearCardSelectionButtonPlacement();
}

function syncClearCardSelectionButtonPlacement() {
  if (!elements.clearCardSelectionBtn) {
    return;
  }

  const embeddedHost = shouldEmbedClearCardSelectionButtonInElectricTotalCard()
    ? elements.teamTotalsGrid?.querySelector("[data-team-total-return-host]")
    : null;
  if (embeddedHost) {
    elements.clearCardSelectionBtn.classList.add("is-inline-inside-total-card");
    if (elements.clearCardSelectionBtn.parentElement !== embeddedHost) {
      embeddedHost.appendChild(elements.clearCardSelectionBtn);
    }
    return;
  }

  elements.clearCardSelectionBtn.classList.remove("is-inline-inside-total-card");

  const defaultParent =
    elements.teamSettlementBtn?.parentElement ||
    elements.clearCardSelectionBtn.closest(".panel-head-actions") ||
    elements.clearCardSelectionBtn.parentElement;
  if (!defaultParent) {
    return;
  }

  const fallbackSibling =
    elements.teamSettlementBtn?.parentElement === defaultParent ? elements.teamSettlementBtn : null;
  if (fallbackSibling) {
    defaultParent.insertBefore(elements.clearCardSelectionBtn, fallbackSibling);
    return;
  }

  if (elements.clearCardSelectionBtn.parentElement !== defaultParent) {
    defaultParent.appendChild(elements.clearCardSelectionBtn);
  }
}

function getSelectedEquipmentIds() {
  if (!Array.isArray(state.selectedEquipmentKeys)) {
    return [];
  }

  const validIds = new Set(
    state.store.equipmentItems
      .filter((item) => !isHiddenEquipmentFieldCard(item))
      .map((item) => item.id)
  );
  return state.selectedEquipmentKeys.filter((equipmentId) => validIds.has(equipmentId));
}
