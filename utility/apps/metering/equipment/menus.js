function resetEquipmentAddDraft() {
  if (elements.equipmentItemNameInput) {
    elements.equipmentItemNameInput.value = "";
  }

  if (elements.equipmentItemFactorInput) {
    elements.equipmentItemFactorInput.value = "";
  }
}

function syncEquipmentAddMenu() {
  if (!elements.equipmentAddWrap || !elements.equipmentAddToggleBtn || !elements.equipmentAddMenu) {
    return;
  }

  elements.equipmentAddWrap.classList.toggle("is-open", state.openEquipmentAddMenu);
  elements.equipmentAddToggleBtn.setAttribute("aria-expanded", String(state.openEquipmentAddMenu));
  elements.equipmentAddMenu.classList.toggle("is-hidden", !state.openEquipmentAddMenu);
}

function syncEquipmentOrderMenu() {
  if (!elements.equipmentOrderWrap || !elements.equipmentOrderToggleBtn || !elements.equipmentOrderMenu) {
    return;
  }

  const canManageOrder =
    getCurrentMode() === MODES.EQUIPMENT &&
    Array.isArray(state.store?.equipmentItems) &&
    state.store.equipmentItems.length >= 2;

  if (!canManageOrder) {
    state.openEquipmentOrderMenu = false;
    clearEquipmentOrderDragState();
    if (elements.equipmentOrderHead) {
      elements.equipmentOrderHead.innerHTML = "";
    }
    if (elements.equipmentOrderList) {
      elements.equipmentOrderList.innerHTML = "";
    }
  }

  elements.equipmentOrderWrap.classList.toggle("is-hidden", !canManageOrder);
  elements.equipmentOrderWrap.classList.toggle("is-open", canManageOrder && state.openEquipmentOrderMenu);
  elements.equipmentOrderToggleBtn.classList.toggle("is-hidden", !canManageOrder);
  elements.equipmentOrderToggleBtn.disabled = !canManageOrder;
  elements.equipmentOrderToggleBtn.setAttribute(
    "aria-expanded",
    String(canManageOrder && state.openEquipmentOrderMenu)
  );
  elements.equipmentOrderMenu.classList.toggle("is-hidden", !(canManageOrder && state.openEquipmentOrderMenu));
}

function toggleEquipmentAddMenu() {
  state.openEquipmentAddMenu = !state.openEquipmentAddMenu;

  if (state.openEquipmentAddMenu) {
    if (state.openQuickEntryMenu) {
      state.openQuickEntryMenu = false;
      resetQuickEntryDraft();
      syncQuickEntryMenu();
    }

    state.openEquipmentManageKey = "";
    syncEquipmentManageMenus();
    state.openEquipmentOrderMenu = false;
    clearEquipmentOrderDragState();
    elements.equipmentOrderHead.innerHTML = "";
    elements.equipmentOrderList.innerHTML = "";
    syncEquipmentOrderMenu();
    syncEquipmentAddMenu();
    window.setTimeout(() => {
      elements.equipmentItemNameInput?.focus();
    }, 0);
    return;
  }

  resetEquipmentAddDraft();
  syncEquipmentAddMenu();
}

function handleEquipmentItemInputKeydown(event) {
  if (event.key === "Escape" && state.openEquipmentAddMenu) {
    event.preventDefault();
    state.openEquipmentAddMenu = false;
    resetEquipmentAddDraft();
    syncEquipmentAddMenu();
    elements.equipmentAddToggleBtn?.focus();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  if (event.target === elements.equipmentItemNameInput) {
    elements.equipmentItemFactorInput?.focus();
    elements.equipmentItemFactorInput?.select?.();
    return;
  }

  handleAddEquipmentItem();
}

function toggleEquipmentOrderMenu() {
  if (state.store.equipmentItems.length < 2) {
    return;
  }

  if (!state.openEquipmentOrderMenu && state.openEquipmentAddMenu) {
    state.openEquipmentAddMenu = false;
    resetEquipmentAddDraft();
    syncEquipmentAddMenu();
  }

  if (!state.openEquipmentOrderMenu && state.openQuickEntryMenu) {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
    syncQuickEntryMenu();
  }

  state.openEquipmentOrderMenu = !state.openEquipmentOrderMenu;
  if (state.openEquipmentOrderMenu) {
    state.openEquipmentManageKey = "";
    syncEquipmentManageMenus();
    renderEquipmentOrderHead();
    renderEquipmentOrderList();
  } else {
    clearEquipmentOrderDragState();
    elements.equipmentOrderHead.innerHTML = "";
    elements.equipmentOrderList.innerHTML = "";
  }

  syncEquipmentOrderMenu();
}

function toggleEquipmentManageMenu(fieldKey) {
  if (fieldKey) {
    if (state.openEquipmentAddMenu) {
      state.openEquipmentAddMenu = false;
      resetEquipmentAddDraft();
      syncEquipmentAddMenu();
    }

    if (state.openQuickEntryMenu) {
      state.openQuickEntryMenu = false;
      resetQuickEntryDraft();
      syncQuickEntryMenu();
    }

    state.openEquipmentOrderMenu = false;
    clearEquipmentOrderDragState();
    elements.equipmentOrderHead.innerHTML = "";
    elements.equipmentOrderList.innerHTML = "";
    syncEquipmentOrderMenu();
  }

  state.openEquipmentManageKey = state.openEquipmentManageKey === fieldKey ? "" : fieldKey;
  syncEquipmentManageMenus();
}

function handleDocumentClick(event) {
  const target = getEventTarget(event);

  if (state.openEquipmentManageKey && !target?.closest?.(".field-manage")) {
    toggleEquipmentManageMenu("");
  }

  if (state.openEquipmentOrderMenu && !target?.closest?.(".entry-order")) {
    state.openEquipmentOrderMenu = false;
    clearEquipmentOrderDragState();
    elements.equipmentOrderHead.innerHTML = "";
    elements.equipmentOrderList.innerHTML = "";
    syncEquipmentOrderMenu();
  }

  if (state.openEquipmentAddMenu && !target?.closest?.(".entry-add")) {
    state.openEquipmentAddMenu = false;
    resetEquipmentAddDraft();
    syncEquipmentAddMenu();
  }

  if (
    state.openQuickEntryMenu &&
    !target?.closest?.(".quick-entry-wrap") &&
    !target?.closest?.(".quick-entry-menu")
  ) {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
    syncQuickEntryMenu();
  }

  if (
    state.openTeamPickerKey &&
    !target?.closest?.("#teamBoards") &&
    !target?.closest?.("#teamTotalsGrid")
  ) {
    state.openTeamPickerKey = "";
    renderTeamMode();
  }
}

function handleAddEquipmentItem() {
  const label = getEquipmentDisplayLabel(normalizeText(elements.equipmentItemNameInput?.value));
  if (!label) {
    elements.equipmentItemNameInput?.focus();
    return;
  }

  const duplicated = hasEquipmentLabelConflict(label);
  if (duplicated) {
    window.alert("이미 등록된 설비입니다.");
    elements.equipmentItemNameInput?.focus();
    elements.equipmentItemNameInput?.select();
    return;
  }

  const rawFactorText = String(elements.equipmentItemFactorInput?.value || "")
    .replace(/,/g, "")
    .trim();
  const defaultFactor = getDefaultUsageFactorByLabel(label);
  const nextFactor = rawFactorText ? Number.parseFloat(rawFactorText) : defaultFactor;

  if (!Number.isFinite(nextFactor) || nextFactor < 0) {
    window.alert(`${getUsageFactorLabel()}은 0 이상의 숫자만 입력할 수 있습니다.`);
    elements.equipmentItemFactorInput?.focus();
    elements.equipmentItemFactorInput?.select();
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();
  const currentMonth = normalizeMonthValue(state.currentMonth) || getMinimumSelectableMonth();

  state.store.equipmentItems.push({
    id: createEquipmentItemId(),
    label,
    factor: nextFactor,
    decimalDigits: isGasResourceType() ? 0 : null,
    visibleFromMonth: currentMonth,
    hiddenFromDate: "",
    readingAdjustmentValue: 0,
    readingAdjustmentStartDate: "",
  });

  state.openEquipmentAddMenu = false;
  resetEquipmentAddDraft();
  state.openEquipmentManageKey = "";
  persistStore();
  renderEquipmentFieldInputs();
  restoreEquipmentFormData(currentFormData, currentEntryDayStatus);
  renderTeamMode();
  syncEquipmentAddMenu();

  if (!wasDirty) {
    state.loadedSnapshot = createFormSnapshot();
  }

  updateDirtyState();
  elements.equipmentAddToggleBtn?.focus();
}
