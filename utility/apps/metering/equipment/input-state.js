function finalizeEquipmentInputDisplay(input) {
  if (!input?.matches("input[data-field-key]")) {
    return;
  }

  const equipment = getEquipmentItem(input.dataset.fieldKey);
  if (!equipment || isAutoCalculatedEquipment(equipment)) {
    return;
  }

  const formattedValue = formatEquipmentInputDisplay(input.value);
  if (input.value !== formattedValue) {
    input.value = formattedValue;
  }
}

function finalizeEquipmentInputDisplays() {
  getEquipmentInputs().forEach((input) => {
    finalizeEquipmentInputDisplay(input);
  });
}

function autofillInactiveEquipmentInputsOnComplete() {
  if (getCurrentEntryDayStatus() !== "completed" || !state.selectedDate) {
    return;
  }

  let didAutofill = false;

  getEquipmentInputs().forEach((input) => {
    const fieldKey = input.dataset.fieldKey;
    const equipment = getEquipmentItem(fieldKey);
    if (!equipment || isAutoCalculatedEquipment(equipment)) {
      return;
    }

    if (normalizeEntryValue(input.value) !== "") {
      return;
    }

    if (!getEffectiveEquipmentFieldInactive(fieldKey, state.selectedDate)) {
      return;
    }

    const previousReading = getAdjacentStoredEquipmentReadingDetail(fieldKey, state.selectedDate, -1);
    if (!previousReading) {
      return;
    }

    const formattedValue = formatEquipmentInputDisplay(previousReading.rawValue);
    input.value = formattedValue;
    input.dataset.lastValue = formattedValue;
    didAutofill = true;
  });

  if (!didAutofill) {
    return;
  }

  syncEquipmentRestIndicators();
}

function getCurrentEquipmentReadingValidationIssues(formData = readEquipmentFormData()) {
  return getEquipmentReadingValidationIssuesForDate(formData, state.selectedDate, {
    skipFieldKeys: getSuppressedEquipmentValidationFieldKeys(),
  });
}

function shouldSkipEquipmentReadingComparisonValidation(fieldKey, currentDateString, adjacentDateString) {
  return GAS_READING_VALIDATION_COMPARISON_EXCEPTIONS.has(
    `${fieldKey}|${currentDateString}|${adjacentDateString}`
  );
}

function getEquipmentValidationSuppressionState() {
  if (!state.equipmentValidationSuppression || typeof state.equipmentValidationSuppression !== "object") {
    state.equipmentValidationSuppression = {};
  }

  if (!(state.equipmentValidationSuppression.fieldKeys instanceof Set)) {
    state.equipmentValidationSuppression.fieldKeys = new Set();
  }

  if (!(state.equipmentValidationSuppression.quickEntryKeys instanceof Set)) {
    state.equipmentValidationSuppression.quickEntryKeys = new Set();
  }

  return state.equipmentValidationSuppression;
}

function getSuppressedEquipmentValidationFieldKeys() {
  return new Set(getEquipmentValidationSuppressionState().fieldKeys);
}

function suppressEquipmentFieldValidation(fieldKey) {
  if (!fieldKey) {
    return;
  }

  getEquipmentValidationSuppressionState().fieldKeys.add(fieldKey);
}

function clearEquipmentFieldValidationSuppression(fieldKey = "") {
  if (!fieldKey) {
    getEquipmentValidationSuppressionState().fieldKeys.clear();
    return;
  }

  getEquipmentValidationSuppressionState().fieldKeys.delete(fieldKey);
}

function buildQuickEntryValidationSuppressionKey(resourceType, fieldKey) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  const normalizedFieldKey = normalizeText(fieldKey);
  if (!normalizedResourceType || !normalizedFieldKey) {
    return "";
  }

  return `${normalizedResourceType}::${normalizedFieldKey}`;
}

function getSuppressedQuickEntryValidationFieldKeys(resourceType) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  const suppressedKeys = new Set();
  if (!normalizedResourceType) {
    return suppressedKeys;
  }

  getEquipmentValidationSuppressionState().quickEntryKeys.forEach((key) => {
    const [candidateResourceType = "", candidateFieldKey = ""] = String(key).split("::");
    if (candidateResourceType === normalizedResourceType && candidateFieldKey) {
      suppressedKeys.add(candidateFieldKey);
    }
  });

  return suppressedKeys;
}

function suppressQuickEntryFieldValidation(resourceType, fieldKey) {
  const key = buildQuickEntryValidationSuppressionKey(resourceType, fieldKey);
  if (!key) {
    return;
  }

  getEquipmentValidationSuppressionState().quickEntryKeys.add(key);
}

function clearQuickEntryFieldValidationSuppression(resourceType = "", fieldKey = "") {
  const suppressionState = getEquipmentValidationSuppressionState();
  if (!resourceType && !fieldKey) {
    suppressionState.quickEntryKeys.clear();
    return;
  }

  const key = buildQuickEntryValidationSuppressionKey(resourceType, fieldKey);
  if (!key) {
    return;
  }

  suppressionState.quickEntryKeys.delete(key);
}

function getEquipmentReadingValidationIssuesForDate(formData, dateString, options = {}) {
  const { allowAnyMode = false, skipFieldKeys = null } = options;
  if ((!allowAnyMode && getCurrentMode() !== MODES.EQUIPMENT) || !dateString) {
    return [];
  }

  const issues = [];

  Object.entries(formData.values || {}).forEach(([fieldKey, rawValue]) => {
    if (skipFieldKeys?.has(fieldKey)) {
      return;
    }

    const equipment = getEquipmentItem(fieldKey);
    if (!equipment || isAutoCalculatedEquipment(equipment)) {
      return;
    }

    const storedDetail = getEquipmentReadingDetailOnDate(fieldKey, dateString);
    const normalizedRawValue = normalizeEntryValue(rawValue);
    const preferCurrentRawValue =
      normalizeEntryValue(storedDetail?.rawValue) !== normalizedRawValue;
    const currentDetail = getValidationReadingDetailOnDate(fieldKey, dateString, {
      currentRawValue: rawValue,
      preferCurrentRawValue,
    });

    if (!currentDetail) {
      return;
    }

    const currentValue = currentDetail.value;
    const previousReading = getAdjacentValidationRecordedEquipmentReading(fieldKey, dateString, -1);
    if (
      previousReading &&
      !shouldSkipEquipmentReadingComparisonValidation(
        fieldKey,
        dateString,
        previousReading.dateString
      ) &&
      currentValue < previousReading.value
    ) {
      issues.push({
        fieldKey,
        message: `${getEquipmentDisplayLabel(equipment)}는 ${formatShortDate(previousReading.dateString)} 값 ${formatNumber(
          previousReading.value
        )}보다 작을 수 없습니다.`,
      });
      return;
    }

    const nextReading = getAdjacentValidationRecordedEquipmentReading(fieldKey, dateString, 1);
    if (
      nextReading &&
      !shouldSkipEquipmentReadingComparisonValidation(fieldKey, dateString, nextReading.dateString) &&
      currentValue > nextReading.value
    ) {
      issues.push({
        fieldKey,
        message: `${getEquipmentDisplayLabel(equipment)}는 ${formatShortDate(nextReading.dateString)} 값 ${formatNumber(
          nextReading.value
        )}보다 클 수 없습니다.`,
      });
    }
  });

  return issues;
}

function getStoredEquipmentReadingValidationIssues(dateString) {
  if (!dateString) {
    return [];
  }

  const entry = state.store.equipmentEntries[dateString];
  if (!entry || !hasEntryData(entry)) {
    return [];
  }

  return getEquipmentReadingValidationIssuesForDate(
    {
      values: entry.values || {},
      statuses: entry.statuses || {},
      fieldDayStatuses: entry.fieldDayStatuses || {},
    },
    dateString,
    { allowAnyMode: true }
  );
}

function getEquipmentReadingValidationSummaryText(validationIssues) {
  if (!validationIssues.length) {
    return "";
  }

  const firstIssue = validationIssues[0];
  const firstLabel = firstIssue?.fieldKey
    ? getEquipmentItem(firstIssue.fieldKey)?.label || firstIssue.fieldKey
    : firstIssue?.message || "";

  return validationIssues.length > 1
    ? `오류 ${firstLabel} 외 ${validationIssues.length - 1}건`
    : `오류 ${firstLabel}`;
}

function syncEquipmentReadingValidationStates() {
  const errorMap = new Map(
    getCurrentEquipmentReadingValidationIssues().map((issue) => [issue.fieldKey, issue.message])
  );

  getEquipmentInputs().forEach((input) => {
    const fieldKey = input.dataset.fieldKey;
    const message = errorMap.get(fieldKey) || "";
    const card = getEquipmentFieldCard(fieldKey);
    const isInvalid = Boolean(message);

    input.classList.toggle("is-invalid", isInvalid);
    input.setAttribute("aria-invalid", String(isInvalid));
    input.title = message;
    card?.classList.toggle("is-invalid", isInvalid);
    if (card) {
      card.title = message;
    }
  });
}

function getEquipmentInputs() {
  return [...elements.fieldsGrid.querySelectorAll("input[data-field-key]")];
}

function getTabNavigableEquipmentInputs() {
  return getEquipmentInputs().filter((input) => !input.disabled && !input.readOnly);
}

function setEquipmentFieldInactive(fieldKey, inactive, options = {}) {
  const { preserveCurrentValue = true, restorePreviousValue = true } = options;
  const card = getEquipmentFieldCard(fieldKey);
  const input = getEquipmentFieldInput(fieldKey);
  const toggle = getEquipmentFieldStatusToggle(fieldKey);
  const equipment = getEquipmentItem(fieldKey);

  if (!card || !input) {
    return;
  }

  if (isAutoCalculatedEquipment(equipment)) {
    input.value = state.selectedDate ? input.value : "";
    input.placeholder = "자동 계산";
    input.disabled = false;
    input.readOnly = true;
    card.classList.remove("is-inactive", "is-rest-equal");
    toggle?.setAttribute("aria-pressed", "false");
    return;
  }

  if (!toggle) {
    return;
  }

  if (inactive) {
    if (preserveCurrentValue && input.value.trim()) {
      input.dataset.lastValue = input.value.trim();
    }
  } else {
    if (restorePreviousValue && !input.value && input.dataset.lastValue) {
      input.value = input.dataset.lastValue;
    }
  }

  input.placeholder = getEquipmentInputPlaceholder(fieldKey);
  input.disabled = false;
  card.classList.remove("is-inactive", "is-rest-equal");
  toggle.setAttribute("aria-pressed", String(inactive));
  syncEquipmentRestIndicators();
}

function syncEquipmentManageMenus() {
  elements.fieldsGrid.querySelectorAll(".field-manage").forEach((manage) => {
    const isOpen = manage.dataset.manageFieldKey === state.openEquipmentManageKey;
    const toggleButton = manage.querySelector("button[data-manage-toggle-key]");
    const menu = manage.querySelector(".field-manage-menu");

    manage.classList.toggle("is-open", isOpen);
    toggleButton?.setAttribute("aria-expanded", String(isOpen));
    menu?.classList.toggle("is-hidden", !isOpen);
  });
}

function getEquipmentFieldCard(fieldKey) {
  return elements.fieldsGrid.querySelector(`.field-card[data-field-key="${fieldKey}"]`);
}

function getEquipmentFieldInput(fieldKey) {
  return elements.fieldsGrid.querySelector(`input[data-field-key="${fieldKey}"]`);
}

function getEquipmentFieldStatusToggle(fieldKey) {
  return elements.fieldsGrid.querySelector(`button[data-status-key="${fieldKey}"]`);
}

function isEquipmentFieldInactive(fieldKey) {
  return getEquipmentFieldStatusToggle(fieldKey)?.getAttribute("aria-pressed") === "true";
}

function normalizeEquipmentFieldStatus(status) {
  const normalizedStatus = normalizeText(status).toLowerCase();
  return normalizedStatus === "inactive" || normalizedStatus === "active" ? normalizedStatus : "";
}

function getEntryEquipmentFieldStatus(entry, fieldKey) {
  return normalizeEquipmentFieldStatus(entry?.statuses?.[fieldKey]);
}

function hasEntryStatus(entry) {
  if (!entry || !isPlainObject(entry.statuses)) {
    return false;
  }

  return Object.values(entry.statuses).some((status) => normalizeEquipmentFieldStatus(status) !== "");
}

function getLastEquipmentFieldStatusBeforeDate(fieldKey, dateString, options = {}) {
  const { inclusive = false } = options;
  if (!fieldKey || !dateString) {
    return "";
  }

  const targetDates = Object.keys(state.store.equipmentEntries)
    .filter((candidateDate) => (inclusive ? candidateDate <= dateString : candidateDate < dateString))
    .sort()
    .reverse();

  for (const candidateDate of targetDates) {
    const status = getEntryEquipmentFieldStatus(state.store.equipmentEntries[candidateDate], fieldKey);
    if (status) {
      return status;
    }
  }

  return "";
}

function getInheritedEquipmentFieldInactive(fieldKey, dateString = state.selectedDate) {
  return getLastEquipmentFieldStatusBeforeDate(fieldKey, dateString) === "inactive";
}

function getEffectiveEquipmentFieldInactive(
  fieldKey,
  dateString = state.selectedDate,
  entry = state.store.equipmentEntries[dateString]
) {
  const explicitStatus = getEntryEquipmentFieldStatus(entry, fieldKey);
  if (explicitStatus) {
    return explicitStatus === "inactive";
  }

  return getInheritedEquipmentFieldInactive(fieldKey, dateString);
}

function getEquipmentStatusCarryUntilDate(deleteDate) {
  if (!deleteDate) {
    return {
      restUntilDate: "",
      hiddenFromDate: "",
    };
  }

  const nextMonthValue = shiftMonthValue(deleteDate.slice(0, 7), 1);
  const restUntilDate = nextMonthValue ? `${nextMonthValue}-01` : "";
  return {
    restUntilDate,
    hiddenFromDate: restUntilDate ? getNextDateString(restUntilDate) : "",
  };
}

function setStoredEquipmentFieldStatus(dateString, fieldKey, status, options = {}) {
  if (!dateString || !fieldKey) {
    return;
  }

  const normalizedStatus = normalizeEquipmentFieldStatus(status);
  const updatedAt = options.updatedAt || new Date().toISOString();
  const currentEntry = state.store.equipmentEntries[dateString];
  const nextEntry = {
    values: { ...(currentEntry?.values || {}) },
    statuses: { ...(currentEntry?.statuses || {}) },
    fieldDayStatuses: {},
    dayStatus: getEntryDayStatus(currentEntry),
    completed: getEntryDayStatus(currentEntry) === "completed",
    updatedAt,
  };

  if (normalizedStatus) {
    nextEntry.statuses[fieldKey] = normalizedStatus;
  } else {
    delete nextEntry.statuses[fieldKey];
  }

  if (hasEntryData(nextEntry)) {
    state.store.equipmentEntries[dateString] = nextEntry;
  } else {
    delete state.store.equipmentEntries[dateString];
  }
}
