function cloneQuickEntryPopupEntry(entry) {
  return {
    values: { ...(entry?.values || {}) },
    statuses: { ...(entry?.statuses || {}) },
    fieldDayStatuses: { ...(entry?.fieldDayStatuses || {}) },
    dayStatus: getEntryDayStatus(entry),
    completed: getEntryDayStatus(entry) === "completed",
    updatedAt: entry?.updatedAt || "",
  };
}

function getQuickEntryPopupStoredEntry(resourceType, dateString = state.selectedDate) {
  if (!dateString) {
    return cloneQuickEntryPopupEntry(null);
  }

  const dataset = getQuickEntryPopupDataset(resourceType);
  const storedEntry = isPlainObject(dataset?.equipmentEntries?.[dateString])
    ? dataset.equipmentEntries[dateString]
    : null;
  return cloneQuickEntryPopupEntry(storedEntry);
}

function getQuickEntryPopupDraftEntry(resourceType, dateString = state.selectedDate) {
  const normalizedResourceType = normalizeResourceType(resourceType);
  if (
    normalizedResourceType !== getCurrentResourceType() ||
    typeof readEquipmentFormData !== "function"
  ) {
    return getQuickEntryPopupStoredEntry(resourceType, dateString);
  }

  const formData = readEquipmentFormData();
  const dayStatus = getCurrentEntryDayStatus();
  return {
    values: { ...(formData?.values || {}) },
    statuses: { ...(formData?.statuses || {}) },
    fieldDayStatuses: { ...(formData?.fieldDayStatuses || {}) },
    dayStatus,
    completed: dayStatus === "completed",
  };
}

function getQuickEntryPopupFieldRawValue(resourceType, fieldKey, dateString = state.selectedDate) {
  const entry = getQuickEntryPopupDraftEntry(resourceType, dateString);
  return normalizeEntryValue(entry?.values?.[fieldKey]);
}

function getQuickEntryPopupVisibleItems(resourceType, dateString = state.selectedDate) {
  const dataset = getQuickEntryPopupDataset(resourceType);
  if (!dataset) {
    return [];
  }

  return (
    runWithQuickEntryResourceContext(resourceType, () =>
      (Array.isArray(dataset.equipmentItems) ? dataset.equipmentItems : []).filter((item) => {
        if (!item || isAutoCalculatedEquipment(item)) {
          return false;
        }

        return !isHiddenEquipmentFieldCard(item, dateString);
      })
    ) || []
  );
}

function getQuickEntryPopupFieldDecimalDigits(resourceType, fieldKey) {
  return (
    runWithQuickEntryResourceContext(resourceType, () => getEquipmentDecimalDigits(fieldKey)) ?? 0
  );
}

function getQuickEntryPopupFieldHint(resourceType, fieldKey, dateString = state.selectedDate) {
  return (
    runWithQuickEntryResourceContext(resourceType, () =>
      getEquipmentInputPlaceholder(fieldKey, dateString)
    ) || ""
  );
}

function getQuickEntryPopupFieldDisplayValue(
  resourceType,
  fieldKey,
  dateString = state.selectedDate
) {
  const rawValue = getQuickEntryPopupFieldRawValue(resourceType, fieldKey, dateString);
  if (!rawValue) {
    return "";
  }

  return formatEquipmentInputDisplayByDecimalDigits(
    rawValue,
    getQuickEntryPopupFieldDecimalDigits(resourceType, fieldKey)
  );
}

function getQuickEntryPopupValidationIssues(dateString = state.selectedDate) {
  if (getCurrentMode() !== MODES.EQUIPMENT || !dateString) {
    return [];
  }

  const issues = [];

  getQuickEntryPopupResourceTypes().forEach((resourceType) => {
    const draftEntry = getQuickEntryPopupDraftEntry(resourceType, dateString);
    const suppressedFieldKeys = getSuppressedQuickEntryValidationFieldKeys(resourceType);
    const resourceIssues =
      runWithQuickEntryResourceContext(resourceType, () =>
        getEquipmentReadingValidationIssuesForDate(draftEntry, dateString, {
          allowAnyMode: true,
          skipFieldKeys: suppressedFieldKeys,
        })
      ) || [];

    resourceIssues.forEach((issue) => {
      issues.push({
        ...issue,
        resourceType,
      });
    });
  });

  return issues;
}

function getQuickEntryPopupSnapshotEntries(dateString = state.selectedDate) {
  return getQuickEntryPopupResourceTypes().map((resourceType) => ({
    resourceType,
    entry: getQuickEntryPopupDraftEntry(resourceType, dateString),
  }));
}

function getQuickEntryPopupSearchQuery() {
  return normalizeText(getQuickEntryPopupSearchInput()?.value).toLowerCase();
}

function getQuickEntryPopupResourceLabel(resourceType) {
  return isGasResourceType(resourceType) ? "가스" : "전기";
}

function getQuickEntryPopupResourceClassName(resourceType) {
  return isGasResourceType(resourceType) ? "gas" : "electric";
}

function matchesQuickEntryPopupSearch(resourceType, item, searchQuery) {
  if (!searchQuery) {
    return true;
  }

  const label = getEquipmentDisplayLabel(item).toLowerCase();
  const resourceLabel = getQuickEntryPopupResourceLabel(resourceType).toLowerCase();
  return label.includes(searchQuery) || `${resourceLabel} ${label}`.includes(searchQuery);
}

function createQuickEntryPopupRow(resourceType, item) {
  const mountDocument = getMountDocument();
  const row = mountDocument.createElement("article");
  row.className = "quick-entry-popup-row";
  row.setAttribute("data-quick-entry-popup-row", "true");
  row.dataset.resourceType = resourceType;
  row.dataset.fieldKey = item.id;

  const copy = mountDocument.createElement("div");
  copy.className = "quick-entry-popup-row-copy";

  const title = mountDocument.createElement("p");
  title.className = "quick-entry-popup-row-title";
  title.textContent = getEquipmentDisplayLabel(item);

  const meta = mountDocument.createElement("p");
  const fieldHint = getQuickEntryPopupFieldHint(resourceType, item.id);
  const decimalDigits = getQuickEntryPopupFieldDecimalDigits(resourceType, item.id);
  const shouldReuseHint = fieldHint && !fieldHint.startsWith("이전 ");
  meta.className = "quick-entry-popup-row-meta";
  meta.textContent = shouldReuseHint ? fieldHint : `소수점 ${decimalDigits}자리`;

  copy.append(title, meta);

  const control = mountDocument.createElement("div");
  control.className = "quick-entry-popup-row-control";

  const input = mountDocument.createElement("input");
  input.type = "text";
  input.className = "quick-entry-popup-input";
  input.value = getQuickEntryPopupFieldDisplayValue(resourceType, item.id);
  input.setAttribute("autocomplete", "off");
  input.setAttribute("inputmode", "decimal");
  input.setAttribute("data-quick-entry-popup-field", "true");
  input.dataset.resourceType = resourceType;
  input.dataset.fieldKey = item.id;
  input.placeholder = fieldHint;

  const message = mountDocument.createElement("p");
  message.className = "quick-entry-popup-row-message";
  message.setAttribute("data-quick-entry-popup-message", "true");

  input.addEventListener("input", handleQuickEntryPopupFieldInput);
  input.addEventListener("blur", handleQuickEntryPopupFieldBlur);
  input.addEventListener("keydown", handleQuickEntryPopupFieldKeydown);

  control.append(input, message);
  row.append(copy, control);
  return row;
}

function renderQuickEntryPopupBody() {
  const body = getQuickEntryPopupBody();
  const emptyState = getQuickEntryPopupEmptyState();
  if (!body || !emptyState) {
    return;
  }

  const mountDocument = getMountDocument();
  const searchQuery = getQuickEntryPopupSearchQuery();
  let renderedSectionCount = 0;

  body.innerHTML = "";

  getQuickEntryPopupResourceTypes().forEach((resourceType) => {
    const visibleItems = getQuickEntryPopupVisibleItems(resourceType, state.selectedDate);
    const matchedItems = visibleItems.filter((item) =>
      matchesQuickEntryPopupSearch(resourceType, item, searchQuery)
    );

    if (!matchedItems.length) {
      return;
    }

    renderedSectionCount += 1;

    const section = mountDocument.createElement("section");
    section.className = "quick-entry-popup-section is-dense-entry-section";
    section.setAttribute("data-quick-entry-popup-section", resourceType);
    section.dataset.resourceType = resourceType;

    const sectionHead = mountDocument.createElement("div");
    sectionHead.className = "quick-entry-popup-section-head";

    const sectionTitleRow = mountDocument.createElement("div");
    sectionTitleRow.className = "quick-entry-popup-section-title-row";

    const resourceChip = mountDocument.createElement("span");
    resourceChip.className = `quick-entry-popup-resource-chip is-${getQuickEntryPopupResourceClassName(resourceType)}`;
    resourceChip.textContent = getQuickEntryPopupResourceLabel(resourceType);

    const sectionTitle = mountDocument.createElement("h3");
    sectionTitle.className = "quick-entry-popup-section-title";
    sectionTitle.textContent = `${getQuickEntryPopupResourceLabel(resourceType)} 설비`;

    sectionTitleRow.append(resourceChip, sectionTitle);

    const sectionCount = mountDocument.createElement("p");
    sectionCount.className = "quick-entry-popup-section-count";
    sectionCount.setAttribute("data-quick-entry-resource-count", resourceType);

    sectionHead.append(sectionTitleRow, sectionCount);

    const rowList = mountDocument.createElement("div");
    rowList.className = "quick-entry-popup-row-list is-dense-entry-grid";
    rowList.setAttribute("data-quick-entry-popup-grid", resourceType);

    matchedItems.forEach((item) => {
      rowList.appendChild(createQuickEntryPopupRow(resourceType, item));
    });

    section.append(sectionHead, rowList);
    body.appendChild(section);
  });

  emptyState.classList.toggle("is-hidden", renderedSectionCount > 0);
  if (elements.quickEntryMenu) {
    elements.quickEntryMenu.__quickEntryPopupRenderKey = getQuickEntryPopupRenderKey();
  }
  syncQuickEntryPopupSectionCounts();
  syncQuickEntryPopupValidationStates();
}

function syncQuickEntryPopupSectionCounts() {
  const body = getQuickEntryPopupBody();
  if (!body) {
    return;
  }

  body.querySelectorAll("[data-quick-entry-resource-count]").forEach((countNode) => {
    const resourceType = countNode.getAttribute("data-quick-entry-resource-count") || "";
    const counts = getQuickEntryEquipmentCounts(resourceType, state.selectedDate);
    countNode.textContent = `${counts.filled}/${counts.total} 입력`;
  });
}

function syncQuickEntryPopupValidationStates() {
  const body = getQuickEntryPopupBody();
  if (!body) {
    return;
  }

  const issueMap = new Map(
    getQuickEntryPopupValidationIssues().map((issue) => [
      `${normalizeResourceType(issue.resourceType)}::${issue.fieldKey}`,
      issue.message,
    ])
  );

  body.querySelectorAll("[data-quick-entry-popup-row]").forEach((row) => {
    const resourceType = normalizeResourceType(row.dataset.resourceType);
    const fieldKey = row.dataset.fieldKey || "";
    const key = `${resourceType}::${fieldKey}`;
    const message = issueMap.get(key) || "";
    const input = row.querySelector("input[data-quick-entry-popup-field]");
    const messageNode = row.querySelector("[data-quick-entry-popup-message]");
    const isInvalid = Boolean(message);

    row.classList.toggle("is-invalid", isInvalid);
    if (input) {
      input.classList.toggle("is-invalid", isInvalid);
      input.setAttribute("aria-invalid", String(isInvalid));
      input.title = message;
    }
    if (messageNode) {
      messageNode.textContent = message;
      messageNode.classList.toggle("is-hidden", !message);
    }
  });
}

function upsertQuickEntryPopupStoredValue(resourceType, fieldKey, normalizedValue) {
  const dataset = getQuickEntryPopupDataset(resourceType);
  const dateString = state.selectedDate;
  if (!dataset || !dateString) {
    return;
  }

  if (!isPlainObject(dataset.equipmentEntries)) {
    dataset.equipmentEntries = {};
  }

  const currentEntry = dataset.equipmentEntries[dateString];
  const nextEntry = cloneQuickEntryPopupEntry(currentEntry);
  nextEntry.updatedAt = new Date().toISOString();

  if (normalizedValue) {
    nextEntry.values[fieldKey] = normalizedValue;
  } else {
    delete nextEntry.values[fieldKey];
  }

  if (hasEntryData(nextEntry)) {
    dataset.equipmentEntries[dateString] = nextEntry;
  } else {
    delete dataset.equipmentEntries[dateString];
  }
}

function syncQuickEntryPopupActiveFormField(fieldKey, displayValue) {
  const activeInput = getEquipmentFieldInput(fieldKey);
  if (!activeInput) {
    return;
  }

  activeInput.value = displayValue;
  activeInput.dataset.lastValue = displayValue;
}

function handleQuickEntryPopupFieldInput(event) {
  const input = event.target?.closest?.("input[data-quick-entry-popup-field]");
  if (!input) {
    return;
  }

  const resourceType = normalizeResourceType(input.dataset.resourceType);
  const fieldKey = input.dataset.fieldKey || "";
  suppressQuickEntryFieldValidation(resourceType, fieldKey);
  const decimalDigits = getQuickEntryPopupFieldDecimalDigits(resourceType, fieldKey);
  const normalizedValue = sanitizeEquipmentInputValue(input.value, {
    maxFractionDigits: decimalDigits,
    preserveTrailingDecimalPoint: true,
  });
  const displayValue = normalizedValue
    ? formatEquipmentInputDisplayByDecimalDigits(normalizedValue, decimalDigits)
    : "";

  input.value = displayValue;

  if (resourceType === getCurrentResourceType()) {
    syncQuickEntryPopupActiveFormField(fieldKey, displayValue);
    syncEquipmentRestIndicators();
    syncEquipmentReadingValidationStates();
    scheduleEquipmentLocalAutosave();
  } else {
    upsertQuickEntryPopupStoredValue(resourceType, fieldKey, normalizedValue);
  }

  syncQuickEntryCounter();
  syncQuickEntryPopupSectionCounts();
  syncQuickEntryPopupValidationStates();
  updateDirtyState();
  updateActionState();
}

function handleQuickEntryPopupFieldBlur(event) {
  const input = event.target?.closest?.("input[data-quick-entry-popup-field]");
  if (!input) {
    return;
  }

  const resourceType = normalizeResourceType(input.dataset.resourceType);
  const fieldKey = input.dataset.fieldKey || "";
  clearQuickEntryFieldValidationSuppression(resourceType, fieldKey);
  syncQuickEntryPopupValidationStates();
  syncEquipmentReadingValidationStates();
  updateDirtyState();
  updateActionState();
}

function handleQuickEntryPopupFieldKeydown(event) {
  const input = event.target?.closest?.("input[data-quick-entry-popup-field]");
  if (!input) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
    syncQuickEntryMenu();
    elements.quickEntryToggleBtn?.focus();
    return;
  }

  if (event.key !== "Enter" || event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  event.preventDefault();
  const popupInputs = [
    ...getQuickEntryPopupBody().querySelectorAll("input[data-quick-entry-popup-field]"),
  ];
  const currentIndex = popupInputs.findIndex((candidate) => candidate === input);
  if (currentIndex < 0) {
    return;
  }

  const nextInput = popupInputs[currentIndex + 1];
  if (!nextInput) {
    input.blur();
    return;
  }

  nextInput.focus();
  nextInput.select?.();
}

function processQuickEntryTextarea() {
  getQuickEntryPopupSearchInput()?.focus();
}

function applyQuickEntryValue(rawValue) {
  return {
    ok: false,
    kind: "error",
    message: normalizeText(rawValue) ? "줄단위 자동 기입은 제거되었습니다." : "",
    fieldKey: "",
  };
}

function findBestQuickEntryMatch() {
  return {
    match: null,
    message: "줄단위 자동 기입은 제거되었습니다.",
  };
}

function getQuickEntryCandidateInputs() {
  return [];
}

function getQuickEntryComparisonReference() {
  return null;
}

function getEquipmentValidationMessageForValue(fieldKey, rawValue, dateString = state.selectedDate) {
  return (
    getEquipmentReadingValidationIssuesForDate(
      {
        values: {
          [fieldKey]: rawValue,
        },
        statuses: {},
        fieldDayStatuses: {},
      },
      dateString
    )[0]?.message || ""
  );
}

function revealQuickEntryMatchedField(fieldKey) {
  const card = getEquipmentFieldCard(fieldKey);
  if (!card) {
    return;
  }

  card.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "nearest",
  });
  card.classList.remove("is-quick-entry-highlight");
  void card.offsetWidth;
  card.classList.add("is-quick-entry-highlight");
  window.setTimeout(() => {
    card.classList.remove("is-quick-entry-highlight");
  }, QUICK_ENTRY_HIGHLIGHT_DURATION);
}
