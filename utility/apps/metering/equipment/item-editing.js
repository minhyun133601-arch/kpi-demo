function closeEquipmentManageMenu() {
  state.openEquipmentManageKey = "";
  syncEquipmentManageMenus();
}

function rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus) {
  persistStore();
  renderEquipmentFieldInputs();
  restoreEquipmentFormData(currentFormData, currentEntryDayStatus);
  renderCalendar();
  renderSummary();
  renderTeamMode();
}

function finalizeEquipmentItemEditing(wasDirty, options = {}) {
  if (!wasDirty) {
    state.loadedSnapshot = createFormSnapshot();
  }

  updateDirtyState();
  if (options.shouldUpdateActionState) {
    updateActionState();
  }
}

function handleDeleteEquipmentItem(fieldKey) {
  const targetItem = getEquipmentItem(fieldKey);
  if (!targetItem || isAutoCalculatedEquipment(targetItem)) {
    return;
  }

  closeEquipmentManageMenu();

  const deleteDate = state.selectedDate;
  if (!deleteDate) {
    window.alert("삭제 날짜를 먼저 선택해 주세요.");
    return;
  }

  const { restUntilDate, hiddenFromDate } = getEquipmentStatusCarryUntilDate(deleteDate);
  const confirmed = window.confirm(
    hiddenFromDate
      ? `"${getEquipmentDisplayLabel(targetItem)}" 설비를 ${formatShortDate(deleteDate)}부터 비활성으로 두고 ${formatShortDate(
          hiddenFromDate
        )}부터 숨깁니다. 삭제 효과는 ${formatShortDate(restUntilDate)}까지 반영됩니다.`
      : `"${getEquipmentDisplayLabel(targetItem)}" 설비를 삭제할까요?`
  );
  if (!confirmed) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();
  const updatedAt = new Date().toISOString();

  targetItem.hiddenFromDate = hiddenFromDate;
  removeEquipmentFieldFromEntries(fieldKey, {
    shouldRemoveDate: (dateString) => dateString >= deleteDate,
  });
  setStoredEquipmentFieldStatus(deleteDate, fieldKey, "inactive", { updatedAt });

  delete currentFormData.values[fieldKey];
  delete currentFormData.statuses[fieldKey];

  rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus);
  finalizeEquipmentItemEditing(wasDirty, { shouldUpdateActionState: true });
}

function handleRenameEquipmentItem(fieldKey) {
  const targetItem = getEquipmentItem(fieldKey);
  if (!targetItem || isAutoCalculatedEquipment(targetItem)) {
    return;
  }

  closeEquipmentManageMenu();

  const promptedLabel = window.prompt("설비명을 수정하세요.", getEquipmentDisplayLabel(targetItem));
  if (promptedLabel === null) {
    return;
  }

  const nextLabel = getEquipmentDisplayLabel(normalizeText(promptedLabel));
  if (!nextLabel) {
    window.alert("설비명은 비워 둘 수 없습니다.");
    return;
  }

  if (hasEquipmentLabelConflict(nextLabel, fieldKey)) {
    window.alert("이미 등록된 설비명입니다.");
    return;
  }

  if (targetItem.label === nextLabel) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();
  const previousDefaultFactor = getDefaultUsageFactorByLabel(targetItem.label);
  const currentFactor = normalizeUsageFactor(targetItem.factor, previousDefaultFactor);

  targetItem.label = nextLabel;
  targetItem.factor =
    currentFactor === previousDefaultFactor ? getDefaultUsageFactorByLabel(nextLabel) : currentFactor;
  state.cleanStatusText = "설비명을 수정했습니다.";

  rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus);
  finalizeEquipmentItemEditing(wasDirty);
}

function handleUpdateEquipmentFactor(fieldKey) {
  const targetItem = getEquipmentItem(fieldKey);
  if (!targetItem || isAutoCalculatedEquipment(targetItem)) {
    return;
  }

  closeEquipmentManageMenu();

  const currentFactor = normalizeUsageFactor(
    targetItem.factor,
    getDefaultUsageFactorByLabel(targetItem.label)
  );
  const usageFactorLabel = getUsageFactorLabel();
  const promptedFactor = window.prompt(`${usageFactorLabel}를 수정하세요.`, String(currentFactor));
  if (promptedFactor === null) {
    return;
  }

  const normalizedPrompt = promptedFactor.replace(/,/g, "").trim();
  if (!normalizedPrompt) {
    window.alert(`${usageFactorLabel}는 비워 둘 수 없습니다.`);
    return;
  }

  const nextFactor = Number.parseFloat(normalizedPrompt);
  if (!Number.isFinite(nextFactor) || nextFactor < 0) {
    window.alert(`${usageFactorLabel}는 0 이상의 숫자만 입력할 수 있습니다.`);
    return;
  }

  if (currentFactor === nextFactor) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();

  targetItem.factor = nextFactor;
  state.cleanStatusText = `설비 ${usageFactorLabel}를 수정했습니다.`;

  rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus);
  finalizeEquipmentItemEditing(wasDirty);
}

function handleUpdateEquipmentDecimalDigits(fieldKey) {
  const targetItem = getEquipmentItem(fieldKey);
  if (!targetItem || !canManageEquipmentDecimalDigits(targetItem)) {
    return;
  }

  closeEquipmentManageMenu();

  const currentDigits = getEquipmentDecimalDigits(fieldKey);
  const promptedDigits = window.prompt(
    `소수점 자리를 수정하세요. (0-${EQUIPMENT_INPUT_FRACTION_DIGITS})`,
    String(currentDigits)
  );
  if (promptedDigits === null) {
    return;
  }

  const normalizedPrompt = promptedDigits.trim();
  if (!normalizedPrompt) {
    window.alert("소수점 자리는 비워 둘 수 없습니다.");
    return;
  }

  const nextDigits = normalizeEquipmentDecimalDigits(normalizedPrompt, null);
  if (nextDigits === null || String(nextDigits) !== normalizedPrompt) {
    window.alert(`소수점 자리는 0부터 ${EQUIPMENT_INPUT_FRACTION_DIGITS}까지의 정수만 입력할 수 있습니다.`);
    return;
  }

  if (currentDigits === nextDigits) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();

  targetItem.decimalDigits = nextDigits;
  state.cleanStatusText = "설비 소수점 자리를 수정했습니다.";

  rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus);
  finalizeEquipmentItemEditing(wasDirty);
}

function getSuggestedEquipmentReadingAdjustmentStartDate(equipment) {
  const currentAdjustment = getEquipmentReadingAdjustment(equipment);
  if (currentAdjustment?.startDate) {
    return currentAdjustment.startDate;
  }

  if (state.selectedDate) {
    return state.selectedDate;
  }

  return getEquipmentVisibilityContextDate() || formatDate(today());
}

function handleUpdateEquipmentReadingAdjustment(fieldKey) {
  const targetItem = getEquipmentItem(fieldKey);
  if (!targetItem || isAutoCalculatedEquipment(targetItem)) {
    return;
  }

  closeEquipmentManageMenu();

  const currentAdjustment = getEquipmentReadingAdjustment(targetItem);
  const promptedAdjustmentValue = window.prompt(
    "보정값을 입력하세요. 예: 10000, -10000. 비우면 해제됩니다.",
    currentAdjustment ? String(currentAdjustment.value) : ""
  );
  if (promptedAdjustmentValue === null) {
    return;
  }

  const normalizedAdjustmentPrompt = promptedAdjustmentValue.replace(/,/g, "").trim();
  const nextAdjustmentValue =
    normalizedAdjustmentPrompt === "" ? 0 : Number.parseFloat(normalizedAdjustmentPrompt);

  if (normalizedAdjustmentPrompt && !Number.isFinite(nextAdjustmentValue)) {
    window.alert("보정값은 숫자만 입력할 수 있습니다.");
    return;
  }

  const shouldClearAdjustment =
    normalizedAdjustmentPrompt === "" ||
    !Number.isFinite(nextAdjustmentValue) ||
    nextAdjustmentValue === 0;

  let nextStartDate = "";
  if (!shouldClearAdjustment) {
    const promptedStartDate = window.prompt(
      "보정 시작일을 입력하세요. 예: 2025-07-01",
      getSuggestedEquipmentReadingAdjustmentStartDate(targetItem)
    );
    if (promptedStartDate === null) {
      return;
    }

    nextStartDate = normalizeEquipmentReadingAdjustmentStartDate(promptedStartDate);
    if (!nextStartDate) {
      window.alert("보정 시작일은 YYYY-MM-DD 형식으로 입력해 주세요.");
      return;
    }
  }

  const previousValue = currentAdjustment?.value ?? 0;
  const previousStartDate = currentAdjustment?.startDate || "";
  if (
    previousValue === (shouldClearAdjustment ? 0 : nextAdjustmentValue) &&
    previousStartDate === nextStartDate
  ) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();

  targetItem.readingAdjustmentValue = shouldClearAdjustment ? 0 : nextAdjustmentValue;
  targetItem.readingAdjustmentStartDate = shouldClearAdjustment ? "" : nextStartDate;
  state.cleanStatusText = shouldClearAdjustment
    ? "설비 보정을 해제했습니다."
    : "설비 보정을 수정했습니다.";

  rerenderEquipmentAfterItemEditing(currentFormData, currentEntryDayStatus);
  finalizeEquipmentItemEditing(wasDirty, { shouldUpdateActionState: true });
}
