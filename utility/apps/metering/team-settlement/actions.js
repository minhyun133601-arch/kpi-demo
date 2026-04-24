async function handleTeamSettlementClick(event) {
  event?.preventDefault();

  if (getCurrentMode() !== MODES.TEAM || !supportsBillingSettlementForCurrentResource()) {
    return;
  }

  const monthValue = normalizeMonthValue(state.currentMonth);
  if (!monthValue) {
    window.alert("기입 년월을 먼저 선택해 주세요.");
    syncEquipmentFullscreenUI();
    return;
  }

  if (isElectricResourceType() && calculateTotalPowerMonthlyUsage() === null) {
    window.alert("전력총량이 계산되어야 정산을 열 수 있습니다.");
    syncEquipmentFullscreenUI();
    return;
  }

  state.isTeamSettlementPanelOpen = !state.isTeamSettlementPanelOpen;
  renderTeamMode();
  if (state.isTeamSettlementPanelOpen) {
    focusTeamSettlementPrimaryInput();
  } else {
    elements.teamSettlementBtn?.focus();
  }
}

function focusTeamSettlementPrimaryInput() {
  window.setTimeout(() => {
    const target =
      elements.teamSettlementFields?.querySelector(
        'input[data-billing-settlement-field]:not([readonly])'
      ) || elements.teamSettlementAttachBtn;
    target?.focus();
  }, 0);
}
