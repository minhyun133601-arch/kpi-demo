function init() {
  resolveElements();
  assertMountReady();
  state.store = loadStore();
  setCurrentMode(resolveInitialMode());
  renderEquipmentFieldInputs();
  setupPeriodControls();
  bindEvents();
  void restorePersistedBillingDocumentDirectoryHandle();
  syncEquipmentAddMenu();
  syncQuickEntryMenu();
  renderModeUI();
  applyMonth(getMonthValue(today()));
  persistStore({ skipLocalFileWrite: true });
}

function bindEvents() {
  if (state.eventsBound) {
    return;
  }

  state.eventsBound = true;
  const mountDocument = getMountDocument();
  const handleBeforeUnload = (event) => {
    if (!isDirty()) {
      return;
    }

    event.preventDefault();
    event.returnValue = "";
  };
  elements.electricResourceBtn?.addEventListener("click", () => {
    void applyResourceType(RESOURCE_TYPES.ELECTRIC);
  });
  elements.gasResourceBtn?.addEventListener("click", () => {
    void applyResourceType(RESOURCE_TYPES.GAS);
  });
  elements.wasteResourceBtn?.addEventListener("click", () => {
    void applyResourceType(RESOURCE_TYPES.WASTE);
  });
  elements.productionResourceBtn?.addEventListener("click", () => {
    void applyResourceType(RESOURCE_TYPES.PRODUCTION);
  });
  elements.equipmentModeBtn.addEventListener("click", () => {
    void applyMode(MODES.EQUIPMENT);
  });
  elements.teamModeBtn.addEventListener("click", () => {
    void applyMode(MODES.TEAM);
  });
  elements.saveEntryBtn?.addEventListener("click", () => {
    void performManualSave({ trigger: "button" });
  });
  elements.teamSaveBtn?.addEventListener("click", () => {
    void performManualSave({ trigger: "button" });
  });
  elements.calendarDisplayModeToggleBtn?.addEventListener("click", handleCalendarDisplayModeToggleClick);
  elements.clearCardSelectionBtn?.addEventListener("click", handleClearCardSelectionClick);
  elements.yearPicker.addEventListener("change", handlePeriodChange);
  elements.monthPicker.addEventListener("change", handlePeriodChange);
  elements.prevMonthBtn.addEventListener("click", () => handleMonthStep(-1));
  elements.nextMonthBtn.addEventListener("click", () => handleMonthStep(1));
  elements.entryForm.addEventListener("submit", handleSave);
  elements.deleteEntryBtn.addEventListener("click", handleClearCurrentEntry);
  elements.equipmentOrderToggleBtn.addEventListener("click", toggleEquipmentOrderMenu);
  elements.equipmentAddToggleBtn.addEventListener("click", toggleEquipmentAddMenu);
  elements.quickEntryToggleBtn?.addEventListener("click", toggleQuickEntryMenu);
  elements.equipmentFullscreenToggleBtn?.addEventListener("click", handleFormFullscreenToggleClick);
  elements.teamFullscreenToggleBtn?.addEventListener("click", handleFormFullscreenToggleClick);
  elements.equipmentFieldsSection?.addEventListener("pointerdown", handleEquipmentSectionDragScrollStart);
  elements.fieldsGrid.addEventListener("click", handleEquipmentFieldGridClick);
  elements.fieldsGrid.addEventListener("dblclick", handleEquipmentFieldGridDoubleClick);
  elements.fieldsGrid.addEventListener("input", handleEquipmentFieldInput);
  elements.fieldsGrid.addEventListener("change", handleEquipmentFieldValueChange);
  elements.fieldsGrid.addEventListener("keydown", handleEquipmentFieldKeydown);
  elements.fieldsGrid.addEventListener("dragstart", handleEquipmentFieldCardDragStart);
  elements.fieldsGrid.addEventListener("dragover", handleEquipmentFieldCardDragOver);
  elements.fieldsGrid.addEventListener("drop", handleEquipmentFieldCardDrop);
  elements.fieldsGrid.addEventListener("dragend", handleEquipmentFieldCardDragEnd);
  elements.equipmentOrderList.addEventListener("dragstart", handleEquipmentOrderDragStart);
  elements.equipmentOrderList.addEventListener("dragover", handleEquipmentOrderDragOver);
  elements.equipmentOrderList.addEventListener("drop", handleEquipmentOrderDrop);
  elements.equipmentOrderList.addEventListener("dragend", handleEquipmentOrderDragEnd);
  elements.addEquipmentItemBtn.addEventListener("click", handleAddEquipmentItem);
  elements.equipmentItemNameInput.addEventListener("keydown", handleEquipmentItemInputKeydown);
  elements.equipmentItemFactorInput.addEventListener("keydown", handleEquipmentItemInputKeydown);
  elements.quickEntryTextarea?.addEventListener("keydown", handleQuickEntryTextareaKeydown);
  elements.quickEntryCompleteBtn?.addEventListener("click", handleQuickEntryCompleteClick);
  elements.teamTotalsGrid.addEventListener("click", handleTeamBoardClick);
  elements.teamTotalsGrid.addEventListener("dblclick", handleTeamDirectUsageDisplayDoubleClick);
  elements.teamTotalsGrid.addEventListener("input", handleTeamDirectUsageInput);
  elements.teamTotalsGrid.addEventListener("input", handleTeamDirectAmountInput);
  elements.teamTotalsGrid.addEventListener("change", handleTeamDirectUsageChange);
  elements.teamTotalsGrid.addEventListener("change", handleTeamDirectAmountChange);
  elements.teamTotalsGrid.addEventListener("keydown", handleTeamDirectUsageKeydown);
  elements.teamTotalsGrid.addEventListener("keydown", handleTeamDirectAmountKeydown);
  elements.teamTotalsGrid.addEventListener("focusout", handleTeamDirectUsageFocusOut, true);
  elements.teamBoards.addEventListener("click", handleTeamBoardClick);
  elements.teamBoards.addEventListener("input", handleTeamDirectUsageInput);
  elements.teamBoards.addEventListener("input", handleTeamDirectAmountInput);
  elements.teamBoards.addEventListener("change", handleTeamDirectUsageChange);
  elements.teamBoards.addEventListener("change", handleTeamDirectAmountChange);
  elements.teamBoards.addEventListener("keydown", handleTeamDirectUsageKeydown);
  elements.teamBoards.addEventListener("keydown", handleTeamDirectAmountKeydown);
  elements.entryCompleteCheckbox?.addEventListener("change", handleEntryCompleteCheckboxChange);
  elements.teamSettlementBtn?.addEventListener("click", handleTeamSettlementClick);
  elements.teamSettlementAttachBtn?.addEventListener("click", handleTeamSettlementAttachClick);
  elements.teamSettlementPreviewBtn?.addEventListener("click", handleTeamSettlementPreviewClick);
  elements.teamSettlementOpenBtn?.addEventListener("click", handleTeamSettlementOpenClick);
  elements.teamSettlementCompleteBtn?.addEventListener("click", handleTeamSettlementCompleteClick);
  elements.teamSettlementFields?.addEventListener("click", handleTeamSettlementFieldClick);
  elements.teamSettlementFields?.addEventListener("input", handleTeamSettlementFieldInput);
  elements.teamSettlementFields?.addEventListener("input", handleTeamDirectUsageInput);
  elements.teamSettlementFields?.addEventListener("change", handleTeamDirectUsageChange);
  elements.teamSettlementFields?.addEventListener("keydown", handleTeamDirectUsageKeydown);
  elements.billingDocumentPreviewOpenBtn?.addEventListener("click", handleBillingDocumentPreviewOpenClick);
  elements.billingDocumentPreviewCloseBtn?.addEventListener("click", handleBillingDocumentPreviewCloseClick);
  elements.billingDocumentPreviewModal?.addEventListener("click", handleBillingDocumentPreviewModalClick);
  mountDocument.addEventListener("click", handleDocumentClick);
  mountDocument.addEventListener("fullscreenchange", handleDocumentFullscreenChange);
  mountDocument.addEventListener("keydown", handleGlobalKeydown, true);
  mountDocument.addEventListener("dragstart", handleGuardedNativeDragStart, true);
  mountDocument.addEventListener("pointermove", handleEquipmentSectionDragScrollMove);
  mountDocument.addEventListener("pointerup", handleEquipmentSectionDragScrollEnd);
  mountDocument.addEventListener("pointercancel", handleEquipmentSectionDragScrollEnd);
  window.addEventListener("beforeunload", handleBeforeUnload);
  registerRuntimeCleanup(() => mountDocument.removeEventListener("click", handleDocumentClick));
  registerRuntimeCleanup(() =>
    mountDocument.removeEventListener("fullscreenchange", handleDocumentFullscreenChange)
  );
  registerRuntimeCleanup(() => mountDocument.removeEventListener("keydown", handleGlobalKeydown, true));
  registerRuntimeCleanup(() =>
    mountDocument.removeEventListener("dragstart", handleGuardedNativeDragStart, true)
  );
  registerRuntimeCleanup(() =>
    mountDocument.removeEventListener("pointermove", handleEquipmentSectionDragScrollMove)
  );
  registerRuntimeCleanup(() =>
    mountDocument.removeEventListener("pointerup", handleEquipmentSectionDragScrollEnd)
  );
  registerRuntimeCleanup(() =>
    mountDocument.removeEventListener("pointercancel", handleEquipmentSectionDragScrollEnd)
  );
  registerRuntimeCleanup(() => window.removeEventListener("beforeunload", handleBeforeUnload));
}
