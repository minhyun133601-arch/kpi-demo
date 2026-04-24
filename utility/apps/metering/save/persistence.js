function clearEquipmentLocalAutosaveTimer() {
  if (!equipmentLocalAutosaveTimer) {
    return;
  }

  window.clearTimeout(equipmentLocalAutosaveTimer);
  equipmentLocalAutosaveTimer = 0;
}

function saveEquipmentEntryDraftToLocalStore() {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    return false;
  }

  const formData = readEquipmentFormData();
  const dayStatus = getCurrentEntryDayStatus();
  const entry = {
    values: formData.values,
    statuses: formData.statuses,
    fieldDayStatuses: {},
    dayStatus,
    completed: dayStatus === "completed",
    updatedAt: new Date().toISOString(),
  };

  if (hasEntryData(entry)) {
    state.store.equipmentEntries[state.selectedDate] = entry;
    state.cleanStatusText = "임시 저장본을 이 PC에 보관했습니다.";
  } else {
    delete state.store.equipmentEntries[state.selectedDate];
    state.cleanStatusText = "비어 있는 입력이라 임시 저장본을 남기지 않았습니다.";
  }

  persistStore({ skipLocalFileWrite: true, skipSharedServerWrite: true });
  updateDirtyState();
  updateActionState();
  syncEquipmentUsageLabels();
  syncAutoCalculatedEquipmentInputs();
  syncEquipmentReadingValidationStates();
  renderCalendar();
  renderSummary();
  renderTeamMode();
  return true;
}

function scheduleEquipmentLocalAutosave() {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    return;
  }

  clearEquipmentLocalAutosaveTimer();
  equipmentLocalAutosaveTimer = window.setTimeout(() => {
    equipmentLocalAutosaveTimer = 0;
    saveEquipmentEntryDraftToLocalStore();
  }, 900);
}


function saveCurrentEquipmentEntry(options = {}) {
  const { localOnly = false, allowValidationIssues = false } = options;
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    updateDirtyState();
    updateActionState();
    return false;
  }

  clearEquipmentLocalAutosaveTimer();

  finalizeEquipmentInputDisplays();
  autofillInactiveEquipmentInputsOnComplete();

  const validationIssues = getCurrentEquipmentReadingValidationIssues();
  if (validationIssues.length && !allowValidationIssues) {
    syncEquipmentReadingValidationStates();
    updateDirtyState();
    updateActionState();
    return false;
  }

  const formData = readEquipmentFormData();
  const dayStatus = getCurrentEntryDayStatus();
  const entry = {
    values: formData.values,
    statuses: formData.statuses,
    fieldDayStatuses: {},
    dayStatus,
    completed: dayStatus === "completed",
    updatedAt: new Date().toISOString(),
  };

  if (hasEntryData(entry)) {
    state.store.equipmentEntries[state.selectedDate] = entry;
    state.cleanStatusText = `마지막 저장 ${formatUpdatedAt(entry.updatedAt)}`;
  } else {
    delete state.store.equipmentEntries[state.selectedDate];
    state.cleanStatusText = "비어 있는 입력이라 저장된 기록이 없습니다.";
  }

  persistStore({ skipSharedServerWrite: localOnly });
  state.loadedSnapshot = createFormSnapshot();

  updateDirtyState();
  updateActionState();
  syncEquipmentUsageLabels();
  syncAutoCalculatedEquipmentInputs();
  syncEquipmentReadingValidationStates();
  renderCalendar();
  renderSummary();
  renderTeamMode();
  return true;
}


function restoreEquipmentFormData(formData, dayStatus) {
  loadEquipmentEntry({
    values: formData.values,
  });
  setCurrentEntryDayStatus(dayStatus);
}


function readEquipmentFormData() {
  const currentEntry = getCurrentEntry();
  return getEquipmentInputs().reduce(
    (accumulator, input) => {
      const fieldKey = input.dataset.fieldKey;
      const equipment = getEquipmentItem(fieldKey);
      if (isAutoCalculatedEquipment(equipment)) {
        return accumulator;
      }

      const value = normalizeEntryValue(input.value);
      if (value !== "") {
        accumulator.values[fieldKey] = value;
      }

      return accumulator;
    },
    {
      values: {},
      statuses: { ...(currentEntry?.statuses || {}) },
      fieldDayStatuses: {},
    }
  );
}


function updateDirtyState() {
  const validationIssues = getCurrentEquipmentReadingValidationIssues();
  if (validationIssues.length) {
    const firstIssue = validationIssues[0];
    elements.saveStatus.textContent =
      validationIssues.length > 1
        ? `${firstIssue.message} 외 ${validationIssues.length - 1}건`
        : firstIssue.message;
    elements.saveStatus.classList.add("is-dirty", "is-error");
    syncSelectedDateHeaderStatus(validationIssues);
    return;
  }

  const dirty = isDirty();
  elements.saveStatus.textContent = dirty ? "저장되지 않은 변경이 있습니다." : state.cleanStatusText;
  elements.saveStatus.classList.toggle("is-dirty", dirty);
  elements.saveStatus.classList.remove("is-error");
  syncSelectedDateHeaderStatus(validationIssues);
}

function updateActionState() {
  const canEditEquipmentEntry = getCurrentMode() === MODES.EQUIPMENT && Boolean(state.selectedDate);
  const hasValidationIssues = Boolean(getCurrentEquipmentReadingValidationIssues().length);
  if (elements.saveEntryBtn) {
    elements.saveEntryBtn.disabled = hasValidationIssues || !isDirty();
    elements.saveEntryBtn.title = hasValidationIssues
      ? "오류를 먼저 확인해 주세요."
      : "저장";
  }
  if (elements.teamSaveBtn) {
    elements.teamSaveBtn.disabled = getCurrentMode() !== MODES.TEAM || !isDirty();
    elements.teamSaveBtn.title = "저장";
  }
  if (elements.quickEntryToggleBtn) {
    elements.quickEntryToggleBtn.disabled = !canEditEquipmentEntry;
    elements.quickEntryToggleBtn.setAttribute("aria-disabled", String(!canEditEquipmentEntry));
  }
  if (elements.entryCompleteCheckbox) {
    elements.entryCompleteCheckbox.disabled = !canEditEquipmentEntry;
  }
  elements.deleteEntryBtn.disabled = !canEditEquipmentEntry;

  if (!canEditEquipmentEntry && state.openQuickEntryMenu) {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
  }

  applyEquipmentEntryLockState();
  renderEquipmentItemCount();
  syncQuickEntryMenu();

  if (getCurrentMode() !== MODES.EQUIPMENT) {
    return;
  }
}

function applyEquipmentEntryLockState() {
  const locked = false;

  elements.fieldsGrid.classList.remove("is-locked");

  elements.fieldsGrid
    .querySelectorAll(
      "button[data-manage-toggle-key], button[data-factor-field-key], button[data-decimal-field-key], button[data-delete-field-key]"
    )
    .forEach((button) => {
      button.disabled = locked;
    });

  getEquipmentInputs().forEach((input) => {
    const equipment = getEquipmentItem(input.dataset.fieldKey);
    if (isAutoCalculatedEquipment(equipment)) {
      input.disabled = false;
      input.readOnly = true;
      input.placeholder = "자동 계산";
      return;
    }

    input.disabled = locked;
    input.readOnly = false;
    input.placeholder = getEquipmentInputPlaceholder(input.dataset.fieldKey);
  });

  syncEquipmentFieldDayStatusIndicators();
  syncEquipmentRestIndicators();
}

function isCurrentEquipmentEntryLocked() {
  return false;
}

function confirmSafeMove(message) {
  void message;
  if (!isDirty()) {
    return true;
  }

  clearEquipmentLocalAutosaveTimer();

  if (getCurrentMode() === MODES.EQUIPMENT && state.selectedDate) {
    return saveCurrentEquipmentEntry({ allowValidationIssues: true });
  }

  persistStore({ skipLocalFileWrite: true });
  state.loadedSnapshot = createFormSnapshot();
  updateDirtyState();
  updateActionState();
  return true;
}

function isDirty() {
  return state.loadedSnapshot !== createFormSnapshot();
}

function createFormSnapshot() {
  const mode = getCurrentMode();

  if (mode === MODES.TEAM) {
    const currentMonth = normalizeMonthValue(state.currentMonth);
    const billingDocument = currentMonth ? getBillingDocumentForMonth(currentMonth) : null;
    const billingSettlementEntry = currentMonth ? getBillingSettlementEntry(currentMonth) : null;
    return JSON.stringify({
      mode,
      currentMonth,
      teamAssignments: state.store.teamAssignments,
      teamMonthlyEntries: state.store.teamMonthlyEntries,
      teamMonthlyAmountEntries: state.store.teamMonthlyAmountEntries,
      billingDocument: billingDocument
        ? {
            fileName: billingDocument.fileName,
            relativePath: billingDocument.relativePath,
            savedAt: billingDocument.savedAt,
          }
        : null,
      billingSettlementEntry,
    });
  }

  return JSON.stringify({
    mode,
    ...readEquipmentFormData(),
    dayStatus: getCurrentEntryDayStatus(),
  });
}


