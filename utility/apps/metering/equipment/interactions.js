function handleEquipmentFieldInput(event) {
  if (!event.target.matches("input[data-field-key]")) {
    return;
  }

  suppressEquipmentFieldValidation(event.target.dataset.fieldKey || "");

  const equipment = getEquipmentItem(event.target.dataset.fieldKey);
  if (!isAutoCalculatedEquipment(equipment)) {
    const formattedValue = formatEquipmentInputDisplay(event.target.value);
    if (event.target.value !== formattedValue) {
      event.target.value = formattedValue;
    }
  }

  syncEquipmentRestIndicators();
  syncEquipmentReadingValidationStates();
  updateDirtyState();
  updateActionState();
  scheduleEquipmentLocalAutosave();
}

function handleEquipmentFieldFocusOut(event) {
  const input = event.target?.closest?.("input[data-field-key]");
  if (!input) {
    return;
  }

  clearEquipmentFieldValidationSuppression(input.dataset.fieldKey || "");
  syncEquipmentReadingValidationStates();
  updateDirtyState();
  updateActionState();
}

function handleEquipmentFieldKeydown(event) {
  const isTabKey = event.key === "Tab";
  const isEnterKey = event.key === "Enter";
  if ((!isTabKey && !isEnterKey) || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  const input = event.target.closest("input[data-field-key]");
  if (!input) {
    return;
  }

  const navigableInputs = getTabNavigableEquipmentInputs();
  const currentIndex = navigableInputs.findIndex((item) => item === input);
  if (currentIndex < 0) {
    return;
  }

  const targetIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
  const nextInput = navigableInputs[targetIndex];
  if (!nextInput && !isEnterKey) {
    return;
  }

  event.preventDefault();
  if (!nextInput) {
    input.blur();
    saveCurrentEquipmentEntry();
    return;
  }

  nextInput.focus();
  nextInput.select?.();
}

function clearPendingEquipmentTitleClickSelection() {
  if (equipmentTitleInteractionState.clickTimeoutId) {
    window.clearTimeout(equipmentTitleInteractionState.clickTimeoutId);
    equipmentTitleInteractionState.clickTimeoutId = 0;
  }
}

function scheduleEquipmentTitleClickSelection(fieldKey, event) {
  if (!fieldKey) {
    return;
  }

  clearPendingEquipmentTitleClickSelection();
  const selectionEvent = {
    shiftKey: Boolean(event?.shiftKey),
    ctrlKey: Boolean(event?.ctrlKey),
    metaKey: Boolean(event?.metaKey),
  };

  equipmentTitleInteractionState.clickTimeoutId = window.setTimeout(() => {
    equipmentTitleInteractionState.clickTimeoutId = 0;
    toggleSelectedEquipment(fieldKey, selectionEvent);
  }, EQUIPMENT_TITLE_DOUBLE_CLICK_DELAY_MS);
}

function handleEquipmentFieldGridClick(event) {
  if (Date.now() < equipmentFieldCardDragState.suppressClickUntil) {
    event.preventDefault();
    return;
  }

  if (!event.target.closest(".field-title")) {
    clearPendingEquipmentTitleClickSelection();
  }

  const manageToggle = event.target.closest("button[data-manage-toggle-key]");
  if (manageToggle) {
    toggleEquipmentManageMenu(manageToggle.dataset.manageToggleKey);
    return;
  }

  const factorButton = event.target.closest("button[data-factor-field-key]");
  if (factorButton) {
    handleUpdateEquipmentFactor(factorButton.dataset.factorFieldKey);
    return;
  }

  const decimalButton = event.target.closest("button[data-decimal-field-key]");
  if (decimalButton) {
    handleUpdateEquipmentDecimalDigits(decimalButton.dataset.decimalFieldKey);
    return;
  }

  const adjustmentButton = event.target.closest("button[data-adjustment-field-key]");
  if (adjustmentButton) {
    handleUpdateEquipmentReadingAdjustment(adjustmentButton.dataset.adjustmentFieldKey);
    return;
  }

  const deleteButton = event.target.closest("button[data-delete-field-key]");
  if (deleteButton) {
    handleDeleteEquipmentItem(deleteButton.dataset.deleteFieldKey);
    return;
  }

  const titleLabel = event.target.closest(".field-title");
  if (titleLabel) {
    event.preventDefault();
    const card = titleLabel.closest(".field-card");
    if (!card) {
      return;
    }

    scheduleEquipmentTitleClickSelection(card.dataset.fieldKey || "", event);
    return;
  }

  const input = event.target.closest("input[data-field-key]");
  if (input) {
    const fieldKey = input.dataset.fieldKey || "";
    const selectedEquipmentIds = getSelectedEquipmentIds();
    const wantsMultiSelection = Boolean(event.shiftKey || event.ctrlKey || event.metaKey);
    const isSingleSelectedCard =
      selectedEquipmentIds.length === 1 && selectedEquipmentIds.includes(fieldKey);

    if (!isSingleSelectedCard || wantsMultiSelection) {
      toggleSelectedEquipment(fieldKey, event);
    }

    return;
  }

  const card = event.target.closest(".field-card");
  if (!card) {
    return;
  }

  event.preventDefault();
  toggleSelectedEquipment(card.dataset.fieldKey || "", event);
}

function handleEquipmentFieldGridDoubleClick(event) {
  if (Date.now() < equipmentFieldCardDragState.suppressClickUntil) {
    event.preventDefault();
    return;
  }

  const titleLabel = event.target.closest(".field-title");
  if (!titleLabel) {
    return;
  }

  event.preventDefault();
  clearPendingEquipmentTitleClickSelection();
  const card = titleLabel.closest(".field-card");
  if (!card) {
    return;
  }

  handleRenameEquipmentItem(card.dataset.fieldKey || "");
}

function resolveCardMultiSelection(orderedIds, currentIds, targetId, anchorId, event) {
  if (!targetId || !orderedIds.includes(targetId)) {
    return orderedIds.filter((itemId) => currentIds.includes(itemId));
  }

  const nextSelection = new Set(currentIds.filter((itemId) => orderedIds.includes(itemId)));
  const wantsRangeSelection = Boolean(event?.shiftKey);
  const wantsToggleSelection = Boolean(event?.ctrlKey || event?.metaKey);

  if (wantsRangeSelection && anchorId && orderedIds.includes(anchorId)) {
    const startIndex = orderedIds.indexOf(anchorId);
    const endIndex = orderedIds.indexOf(targetId);
    const [fromIndex, toIndex] =
      startIndex <= endIndex ? [startIndex, endIndex] : [endIndex, startIndex];

    orderedIds.slice(fromIndex, toIndex + 1).forEach((itemId) => {
      nextSelection.add(itemId);
    });

    return orderedIds.filter((itemId) => nextSelection.has(itemId));
  }

  if (wantsToggleSelection) {
    if (nextSelection.has(targetId)) {
      nextSelection.delete(targetId);
    } else {
      nextSelection.add(targetId);
    }

    return orderedIds.filter((itemId) => nextSelection.has(itemId));
  }

  if (nextSelection.size === 1 && nextSelection.has(targetId)) {
    return [];
  }

  return [targetId];
}

function toggleSelectedEquipment(fieldKey, event) {
  if (!fieldKey) {
    return;
  }

  const orderedIds = state.store.equipmentItems.map((item) => item.id);
  state.selectedEquipmentKeys = resolveCardMultiSelection(
    orderedIds,
    getSelectedEquipmentIds(),
    fieldKey,
    state.equipmentSelectionAnchorKey,
    event
  );
  state.equipmentSelectionAnchorKey = state.selectedEquipmentKeys.includes(fieldKey)
    ? fieldKey
    : state.selectedEquipmentKeys[state.selectedEquipmentKeys.length - 1] || "";
  syncSelectedEquipmentCardState();
  syncSelectedDatePresentation();
  renderCalendar();
  renderSummary();
}

function handleEquipmentItemNameKeydown(event) {
  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  handleAddEquipmentItem();
}

function handleEquipmentFieldValueChange(event) {
  if (!event.target.matches("input[data-field-key]")) {
    return;
  }

  clearEquipmentFieldValidationSuppression(event.target.dataset.fieldKey || "");
  clearEquipmentLocalAutosaveTimer();
  saveCurrentEquipmentEntry();
}
