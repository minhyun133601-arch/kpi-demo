// The inline equipment form replaces the retired fullscreen quick-entry popup.
function isMeteringQuickEntryPopupEnabled() {
  return false;
}

function renderResourceUI() {
  const resourceType = getCurrentResourceType();
  const isGas = isGasResourceType(resourceType);
  const isWaste = isWasteResourceType(resourceType);
  const isProduction = isProductionResourceType(resourceType);
  const resourceEyebrow = getResourceEyebrowText(resourceType);

  if (elements.resourceEyebrow) {
    elements.resourceEyebrow.textContent = resourceEyebrow;
    elements.resourceEyebrow.classList.toggle("is-hidden", !resourceEyebrow);
  }
  if (elements.appTitle) {
    elements.appTitle.textContent = getResourceTitleText(resourceType);
  }
  elements.heroBrand?.classList.add("is-hidden");
  if (elements.equipmentListLabel) {
    elements.equipmentListLabel.textContent = getEquipmentListLabelText();
  }
  if (elements.electricResourceBtn) {
    const isActive = !isGas && !isWaste && !isProduction;
    elements.electricResourceBtn.classList.toggle("is-active", isActive);
    elements.electricResourceBtn.setAttribute("aria-pressed", String(isActive));
  }
  if (elements.gasResourceBtn) {
    elements.gasResourceBtn.classList.toggle("is-active", isGas);
    elements.gasResourceBtn.setAttribute("aria-pressed", String(isGas));
  }
  if (elements.wasteResourceBtn) {
    elements.wasteResourceBtn.classList.toggle("is-active", isWaste);
    elements.wasteResourceBtn.setAttribute("aria-pressed", String(isWaste));
  }
  if (elements.productionResourceBtn) {
    elements.productionResourceBtn.classList.toggle("is-active", isProduction);
    elements.productionResourceBtn.setAttribute("aria-pressed", String(isProduction));
  }
  if (elements.equipmentItemFactorInput) {
    elements.equipmentItemFactorInput.placeholder = getUsageFactorLabel(resourceType);
  }

  document.title = getResourceTitleText(resourceType);
}

async function applyResourceType(resourceType, options = {}) {
  const nextResourceType = normalizeResourceType(resourceType);
  const { skipDirtyCheck = false } = options;

  if (nextResourceType === getCurrentResourceType()) {
    renderResourceUI();
    renderModeUI();
    renderSummary();
    return;
  }

  if (
    !skipDirtyCheck &&
    !confirmSafeMove("검침 구분을 바꾸면 저장하지 않은 변경이 사라집니다. 계속할까요?")
  ) {
    renderResourceUI();
    renderModeUI();
    return;
  }

  clearEquipmentLocalAutosaveTimer();
  closeBillingDocumentPreview();

  if (state.isEquipmentFullscreen) {
    await exitFormFullscreenMode();
  }

  syncActiveResourceDatasetToStore(state.store);
  state.store.resourceType = nextResourceType;
  attachResourceDatasetToStore(state.store, nextResourceType);
  setCurrentMode(resolveInitialMode());
  state.openTeamPickerKey = "";
  state.openEquipmentManageKey = "";
  state.openEquipmentOrderMenu = false;
  state.openEquipmentAddMenu = false;
  state.openQuickEntryMenu = false;
  state.quickEntryResults = [];
  state.selectedEquipmentKeys = [];
  state.selectedTeamKey = "";
  state.selectedTeamKeys = [];
  state.teamPickerSelections = {};
  state.teamCalendarSelections = {};
  state.teamSelectionAnchorKey = "";
  state.equipmentSelectionAnchorKey = "";
  state.calendarSelectionAnchorDate = "";
  state.activeTeamSettlementScope = getDefaultBillingSettlementScopeKey(nextResourceType);

  persistStore({ skipLocalFileWrite: true });
  renderResourceUI();
  renderModeUI();
  updateCalendarHint();
  renderEquipmentFieldInputs();
  renderCalendar();
  renderSummary();
  loadEntryToForm(getCurrentEntry());
}

function renderModeUI() {
  const mode = getCurrentMode();
  const isEquipmentMode = mode === MODES.EQUIPMENT;
  const isTeamMode = mode === MODES.TEAM;
  const supportsTeamMode = supportsTeamModeForCurrentResource();
  const supportsEquipmentMode = supportsEquipmentModeForResource();
  const supportsEquipmentEditing = supportsEquipmentEditingForCurrentResource();
  const supportsQuickEntryPopup =
    isMeteringQuickEntryPopupEnabled() &&
    (isElectricResourceType() || isGasResourceType()) &&
    supportsEquipmentMode &&
    isEquipmentMode;

  if ((!isEquipmentMode || !supportsQuickEntryPopup) && state.openQuickEntryMenu) {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
  }

  renderResourceUI();
  elements.heroText.textContent = getHeroDescription(mode);
  elements.entrySectionLabel.textContent = getEntrySectionTitle();
  elements.equipmentModeBtn.classList.toggle(
    "is-hidden",
    !supportsTeamMode || !supportsEquipmentMode || !isTeamMode
  );
  elements.teamModeBtn.classList.toggle(
    "is-hidden",
    !supportsTeamMode || !supportsEquipmentMode || !isEquipmentMode
  );
  elements.equipmentModeBtn.setAttribute("aria-pressed", "false");
  elements.teamModeBtn.setAttribute("aria-pressed", "false");
  elements.equipmentModeBtn.title = "설비별로 전환";
  elements.teamModeBtn.title = "팀별로 전환";

  elements.equipmentFieldsSection.classList.toggle(
    "is-hidden",
    !supportsEquipmentMode || !isEquipmentMode
  );
  elements.teamModeSection.classList.toggle("is-hidden", !supportsTeamMode || !isTeamMode);
  elements.formMeta.classList.toggle("is-hidden", !supportsEquipmentMode || !isEquipmentMode);
  elements.entryStatusWrap?.classList.toggle(
    "is-hidden",
    !supportsEquipmentMode || !isEquipmentMode
  );
  elements.equipmentAddWrap?.classList.toggle(
    "is-hidden",
    !supportsEquipmentMode || !isEquipmentMode || !supportsEquipmentEditing
  );
  elements.saveEntryBtn?.classList.toggle("is-hidden", !supportsEquipmentMode || !isEquipmentMode);
  elements.teamSaveBtn?.classList.toggle("is-hidden", !supportsTeamMode || !isTeamMode);
  elements.quickEntryWrap?.classList.toggle(
    "is-hidden",
    !supportsQuickEntryPopup
  );

  syncEquipmentFullscreenUI();
  syncQuickEntryMenu();
  syncCalendarDisplayModeToggleButton();
  syncClearCardSelectionButton();
  renderEquipmentItemCount();
  if (state.currentMonth) {
    renderTeamMode();
  }
}

async function applyMode(mode, options = {}) {
  const { skipDirtyCheck = false } = options;
  if (!Object.values(MODES).includes(mode)) {
    return;
  }

  if (mode === MODES.TEAM && !supportsTeamModeForCurrentResource()) {
    renderModeUI();
    return;
  }

  if (mode === MODES.EQUIPMENT && !supportsEquipmentModeForCurrentResource()) {
    renderModeUI();
    return;
  }

  if (mode === getCurrentMode()) {
    renderModeUI();
    return;
  }

  if (!skipDirtyCheck && !confirmSafeMove("모드를 변경하면 저장하지 않은 변경이 사라집니다. 계속할까요?")) {
    renderModeUI();
    return;
  }

  clearEquipmentLocalAutosaveTimer();
  closeBillingDocumentPreview();

  if (state.isEquipmentFullscreen) {
    await exitFormFullscreenMode();
  }

  setCurrentMode(mode);
  state.openTeamPickerKey = "";
  state.openEquipmentOrderMenu = false;
  state.teamPickerSelections = {};
  if (mode === MODES.TEAM) {
    state.selectedTeamKey = "";
    state.selectedTeamKeys = [];
    state.teamSelectionAnchorKey = "";
  }
  persistStore({ skipLocalFileWrite: true });
  renderModeUI();
  updateCalendarHint();
  renderCalendar();
  renderSummary();
  loadEntryToForm(getCurrentEntry());
}

function resolveInitialMode() {
  if (isWasteResourceType()) {
    return MODES.TEAM;
  }

  if (!supportsTeamModeForCurrentResource()) {
    return MODES.EQUIPMENT;
  }

  return state.store.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT;
}
