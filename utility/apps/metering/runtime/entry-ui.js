function selectDate(dateString, options = {}) {
  const {
    skipDirtyCheck = false,
    selectionDates = null,
    selectionAnchorDate = "",
  } = options;

  if (!dateString) {
    if (!skipDirtyCheck && !confirmSafeMove("저장하지 않은 변경이 있습니다. 날짜 선택을 해제할까요?")) {
      renderCalendar();
      return;
    }

    clearEquipmentLocalAutosaveTimer();

    state.selectedDate = "";
    state.selectedCalendarDates = [];
    state.calendarSelectionAnchorDate = "";
    loadEntryToForm(null);
    renderCalendar();
    return;
  }

  if (!skipDirtyCheck && !confirmSafeMove("저장하지 않은 변경이 있습니다. 날짜를 바꿀까요?")) {
    renderCalendar();
    return;
  }

  clearEquipmentLocalAutosaveTimer();

  state.selectedDate = dateString;
  state.selectedCalendarDates =
    Array.isArray(selectionDates) && selectionDates.length ? [...selectionDates] : [dateString];
  state.calendarSelectionAnchorDate = selectionAnchorDate || dateString;
  loadEntryToForm(getCurrentEntry());
  renderCalendar();
}

function syncSelectedDatePresentation() {
  const mode = getCurrentMode();

  if (mode === MODES.TEAM) {
    elements.selectedDateTitle.textContent = getTeamModeMonthTitle(state.currentMonth);
    elements.selectedDateSub.textContent = getSelectedDateDescription(mode);
    syncSelectedDateHeaderStatus([]);
    return;
  }

  const selectedDateKeys = getSelectedCalendarDateKeys();
  const selectedDateTitle = state.selectedDate
    ? selectedDateKeys.length > 1
      ? `${formatFullDate(state.selectedDate)} 외 ${selectedDateKeys.length - 1}일`
      : formatFullDate(state.selectedDate)
    : "날짜를 선택해 주세요";
  const selectedDateDescription = getSelectedDateDescription(mode);
  const selectionText =
    state.selectedDate && selectedDateKeys.length > 1 ? `날짜 ${selectedDateKeys.length}일 선택` : "";

  elements.selectedDateTitle.textContent = selectedDateTitle;
  elements.selectedDateSub.textContent = [selectionText, selectedDateDescription]
    .filter(Boolean)
    .join(" · ");
  syncSelectedDateHeaderStatus();
}

function loadEntryToForm(entry) {
  clearEquipmentFieldValidationSuppression?.();
  clearQuickEntryFieldValidationSuppression?.();

  const mode = getCurrentMode();

  if (mode === MODES.TEAM) {
    syncSelectedDatePresentation();
    renderTeamMode();
    setCurrentEntryDayStatus("");
    state.cleanStatusText = "팀 배정은 즉시 저장됩니다.";
    state.loadedSnapshot = createFormSnapshot();
    updateDirtyState();
    updateActionState();
    return;
  }

  syncSelectedDatePresentation();
  renderEquipmentFieldInputs();
  loadEquipmentEntry(entry);
  setCurrentEntryDayStatus(getEntryDayStatus(entry));

  state.cleanStatusText = entry?.updatedAt
    ? `마지막 저장 ${formatUpdatedAt(entry.updatedAt)}`
    : "저장된 기록이 없습니다.";
  state.loadedSnapshot = createFormSnapshot();

  syncEquipmentUsageLabels();
  syncAutoCalculatedEquipmentInputs();
  syncEquipmentReadingValidationStates();
  updateDirtyState();
  updateActionState();
}

function loadEquipmentEntry(entry) {
  const values = entry?.values || {};

  getEquipmentInputs().forEach((input) => {
    const fieldKey = input.dataset.fieldKey;
    const inputValue = values[fieldKey] || "";

    input.value = formatEquipmentInputDisplay(inputValue);
    input.dataset.lastValue = formatEquipmentInputDisplay(inputValue);
    input.placeholder = getEquipmentInputPlaceholder(fieldKey);
  });

  syncAutoCalculatedEquipmentInputs();
}

function syncAutoCalculatedEquipmentInputs() {
  getEquipmentInputs().forEach((input) => {
    const equipment = getEquipmentItem(input.dataset.fieldKey);
    if (!isAutoCalculatedEquipment(equipment)) {
      return;
    }

    const derivedValue = state.selectedDate
      ? calculateOtherCalendarDailyUsage(state.selectedDate)
      : null;

    input.value =
      derivedValue === null
        ? ""
        : formatEquipmentInputDisplay(derivedValue);
    input.dataset.lastValue = "";
    input.readOnly = true;
    input.placeholder = "자동 계산";
  });
}

function getEquipmentInputPlaceholder(fieldKey, dateString = state.selectedDate) {
  const equipment = getEquipmentItem(fieldKey);
  if (!equipment || isAutoCalculatedEquipment(equipment) || !dateString) {
    return isGasResourceType() ? "가스값" : "전력값";
  }

  const previousMeta = getEquipmentPreviousReadingMeta(fieldKey, dateString);
  if (previousMeta.valueText) {
    return `이전 ${previousMeta.valueText}`;
  }

  return isGasResourceType() ? "가스값" : "전력값";
}

function getEquipmentPreviousReadingMeta(fieldKey, dateString = state.selectedDate) {
  const emptyMeta = {
    text: "",
    valueText: "",
    dateText: "",
  };
  const equipment = getEquipmentItem(fieldKey);
  if (!equipment || isAutoCalculatedEquipment(equipment) || !dateString) {
    return emptyMeta;
  }

  const previousReading = getAdjacentStoredEquipmentReadingDetail(fieldKey, dateString, -1);
  if (!previousReading) {
    return emptyMeta;
  }

  const valueText = formatEquipmentInputDisplay(previousReading.rawValue);
  if (!valueText) {
    return emptyMeta;
  }

  const dateText = previousReading.dateString
    ? typeof formatShortDate === "function"
      ? formatShortDate(previousReading.dateString)
      : previousReading.dateString
    : "";
  return {
    text: dateText ? `이전값 ${valueText} (${dateText})` : `이전값 ${valueText}`,
    valueText,
    dateText,
  };
}

function hasSameReadingAsPrevious(fieldKey, rawValue, dateString = state.selectedDate) {
  const equipment = getEquipmentItem(fieldKey);
  if (!equipment || isAutoCalculatedEquipment(equipment) || !dateString) {
    return false;
  }

  const currentDetail = getValidationReadingDetailOnDate(fieldKey, dateString, {
    currentRawValue: rawValue,
    preferCurrentRawValue: true,
  });
  if (!currentDetail) {
    return false;
  }

  const previousReading = getAdjacentRecordedEquipmentReading(fieldKey, dateString, -1);
  return Boolean(previousReading && currentDetail.value === previousReading.value);
}

function hasRecordedEquipmentValue(rawValue) {
  return normalizeEntryValue(rawValue) !== "";
}

function syncEquipmentRestIndicators() {
  getEquipmentInputs().forEach((input) => {
    const fieldKey = input.dataset.fieldKey;
    const card = getEquipmentFieldCard(fieldKey);
    const restChip = card?.querySelector(`[data-field-rest-key="${fieldKey}"]`);
    const hasRecordedValue = hasRecordedEquipmentValue(input.value);
    const inheritedInactive = getEffectiveEquipmentFieldInactive(fieldKey);
    const shouldMarkRest =
      hasSameReadingAsPrevious(fieldKey, input.value) || (!hasRecordedValue && inheritedInactive);

    card?.classList.remove("is-inactive", "is-rest-equal");
    restChip?.classList.toggle("is-hidden", !shouldMarkRest);
    syncEquipmentCardMetaVisibility(card);
  });
}
