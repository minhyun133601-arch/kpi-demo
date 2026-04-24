const HOST_STATE_CLASS_NAMES = Object.freeze([
  "is-quick-entry-active",
  "is-equipment-fullscreen",
  "is-equipment-panel-scroll-mode",
]);

const runtimeContext = {
  hostElement: null,
  mountRoot: null,
  portalRoot: null,
  document: document,
  assetBaseUrl: window.location.href,
  popupStylesUrl: "",
  cleanupHandlers: [],
};

function getMountDocument() {
  return runtimeContext.document || document;
}

function getMountRoot() {
  return runtimeContext.mountRoot || getMountDocument();
}

function getMountHostElement() {
  return runtimeContext.hostElement || null;
}

function getMountPortalRoot() {
  return runtimeContext.portalRoot || getMountRoot();
}

function registerRuntimeCleanup(callback) {
  if (typeof callback === "function") {
    runtimeContext.cleanupHandlers.push(callback);
  }
}

function flushRuntimeCleanups() {
  while (runtimeContext.cleanupHandlers.length) {
    const callback = runtimeContext.cleanupHandlers.pop();
    try {
      callback?.();
    } catch (error) {
      console.error("Failed to clean up metering runtime listener.", error);
    }
  }
}

function clearMountHostStateClasses() {
  const hostElement = getMountHostElement();
  if (!hostElement) {
    return;
  }

  HOST_STATE_CLASS_NAMES.forEach((className) => {
    hostElement.classList.remove(className);
  });
}

function toggleMountHostStateClass(className, enabled) {
  getMountHostElement()?.classList.toggle(className, Boolean(enabled));
}

function getEventTarget(event) {
  if (typeof event?.composedPath === "function") {
    const [firstTarget] = event.composedPath();
    if (firstTarget) {
      return firstTarget;
    }
  }

  return event?.target || null;
}

function resolveRuntimeAssetUrl(relativePath) {
  const normalizedPath = normalizeText(relativePath);
  if (!normalizedPath) {
    return "";
  }

  try {
    return new URL(normalizedPath, runtimeContext.assetBaseUrl || window.location.href).href;
  } catch (error) {
    return normalizedPath;
  }
}

function queryWithinMountRoot(selector) {
  const mountRoot = getMountRoot();
  if (!mountRoot || typeof mountRoot.querySelector !== "function") {
    return null;
  }

  return mountRoot.querySelector(selector);
}

function createDetachedElement(tagName) {
  return getMountDocument().createElement(tagName);
}

function buildElementRegistry() {
  return {
    appShell: queryWithinMountRoot(".app-shell"),
    heroCard: queryWithinMountRoot(".hero-card"),
    heroBrand: queryWithinMountRoot(".hero-brand"),
    workspace: queryWithinMountRoot(".workspace"),
    panelCalendar: queryWithinMountRoot(".panel-calendar"),
    panelForm: queryWithinMountRoot(".panel-form"),
    weekdayRow: queryWithinMountRoot(".weekday-row"),
    resourceEyebrow: queryWithinMountRoot("#resourceEyebrow"),
    appTitle: queryWithinMountRoot("#appTitle"),
    heroText: queryWithinMountRoot("#heroText"),
    electricResourceBtn: queryWithinMountRoot("#electricResourceBtn"),
    gasResourceBtn: queryWithinMountRoot("#gasResourceBtn"),
    wasteResourceBtn: queryWithinMountRoot("#wasteResourceBtn"),
    productionResourceBtn: queryWithinMountRoot("#productionResourceBtn"),
    equipmentModeBtn: queryWithinMountRoot("#equipmentModeBtn"),
    teamModeBtn: queryWithinMountRoot("#teamModeBtn"),
    yearPicker: queryWithinMountRoot("#yearPicker"),
    monthPicker: queryWithinMountRoot("#monthPicker"),
    prevMonthBtn: queryWithinMountRoot("#prevMonthBtn"),
    nextMonthBtn: queryWithinMountRoot("#nextMonthBtn"),
    monthTitle: queryWithinMountRoot("#monthTitle"),
    calendarHint: queryWithinMountRoot("#calendarHint"),
    totalPowerMonthUsageTotal: queryWithinMountRoot("#totalPowerMonthUsageTotal"),
    summaryFocusLabel: queryWithinMountRoot("#summaryFocusLabel"),
    equipmentMonthUsageTotal: queryWithinMountRoot("#equipmentMonthUsageTotal"),
    equipmentMonthUsageLabel: queryWithinMountRoot("#equipmentMonthUsageLabel"),
    otherMonthUsageTotal: queryWithinMountRoot("#otherMonthUsageTotal"),
    otherMonthUsageLabel: queryWithinMountRoot("#otherMonthUsageLabel"),
    calendarGrid: queryWithinMountRoot("#calendarGrid"),
    entrySectionLabel: queryWithinMountRoot("#entrySectionLabel"),
    selectedDateTitle: queryWithinMountRoot("#selectedDateTitle"),
    selectedDateError: queryWithinMountRoot("#selectedDateError"),
    selectedDateSub: queryWithinMountRoot("#selectedDateSub"),
    panelHeadActions: queryWithinMountRoot(".panel-head-actions"),
    calendarDisplayModeToggleBtn: queryWithinMountRoot("#calendarDisplayModeToggleBtn"),
    clearCardSelectionBtn: queryWithinMountRoot("#clearCardSelectionBtn"),
    entryStatusWrap: queryWithinMountRoot("#entryStatusWrap"),
    teamFullscreenToggleBtn: queryWithinMountRoot("#teamFullscreenToggleBtn"),
    teamSettlementBtn: queryWithinMountRoot("#teamSettlementBtn"),
    entryForm: queryWithinMountRoot("#entryForm"),
    saveEntryBtn: queryWithinMountRoot("#saveEntryBtn"),
    teamSaveBtn: queryWithinMountRoot("#teamSaveBtn"),
    formMeta: queryWithinMountRoot("#formMeta"),
    equipmentOrderWrap: queryWithinMountRoot("#equipmentOrderWrap") || createDetachedElement("div"),
    equipmentOrderToggleBtn:
      queryWithinMountRoot("#equipmentOrderToggleBtn") || createDetachedElement("button"),
    equipmentOrderMenu: queryWithinMountRoot("#equipmentOrderMenu") || createDetachedElement("div"),
    equipmentOrderHead: queryWithinMountRoot("#equipmentOrderHead") || createDetachedElement("div"),
    equipmentOrderList: queryWithinMountRoot("#equipmentOrderList") || createDetachedElement("div"),
    equipmentAddWrap: queryWithinMountRoot("#equipmentAddWrap"),
    equipmentAddToggleBtn: queryWithinMountRoot("#equipmentAddToggleBtn"),
    equipmentAddMenu: queryWithinMountRoot("#equipmentAddMenu"),
    quickEntryWrap: queryWithinMountRoot("#quickEntryWrap"),
    quickEntryToggleBtn: queryWithinMountRoot("#quickEntryToggleBtn"),
    quickEntryMenu: queryWithinMountRoot("#quickEntryMenu"),
    quickEntryTextarea: queryWithinMountRoot("#quickEntryTextarea"),
    quickEntryCompleteBtn: queryWithinMountRoot("#quickEntryCompleteBtn"),
    quickEntryResultList: queryWithinMountRoot("#quickEntryResultList"),
    quickEntryCounter: queryWithinMountRoot("#quickEntryCounter"),
    quickEntryCounterFraction: queryWithinMountRoot("#quickEntryCounterFraction"),
    equipmentFieldsSection: queryWithinMountRoot("#equipmentFieldsSection"),
    equipmentItemNameInput: queryWithinMountRoot("#equipmentItemNameInput"),
    equipmentItemFactorInput: queryWithinMountRoot("#equipmentItemFactorInput"),
    addEquipmentItemBtn: queryWithinMountRoot("#addEquipmentItemBtn"),
    equipmentFullscreenToggleBtn: queryWithinMountRoot("#equipmentFullscreenToggleBtn"),
    equipmentItemCount: queryWithinMountRoot("#equipmentItemCount"),
    selectedDateEquipmentCount: queryWithinMountRoot("#selectedDateEquipmentCount"),
    fieldsGrid: queryWithinMountRoot("#fieldsGrid"),
    teamModeSection: queryWithinMountRoot("#teamModeSection"),
    teamUsagePeriodText: queryWithinMountRoot("#teamUsagePeriodText"),
    teamSettlementSection: queryWithinMountRoot("#teamSettlementSection"),
    teamSettlementFileName: queryWithinMountRoot("#teamSettlementFileName"),
    teamSettlementAttachBtn: queryWithinMountRoot("#teamSettlementAttachBtn"),
    teamSettlementPreviewBtn: queryWithinMountRoot("#teamSettlementPreviewBtn"),
    teamSettlementOpenBtn: queryWithinMountRoot("#teamSettlementOpenBtn"),
    teamSettlementCompleteBtn: queryWithinMountRoot("#teamSettlementCompleteBtn"),
    teamSettlementFields: queryWithinMountRoot("#teamSettlementFields"),
    teamTotalsGrid: queryWithinMountRoot("#teamTotalsGrid"),
    teamBoards: queryWithinMountRoot("#teamBoards"),
    entryCompleteCheckbox: queryWithinMountRoot("#entryCompleteCheckbox"),
    deleteEntryBtn: queryWithinMountRoot("#deleteEntryBtn"),
    equipmentListLabel: queryWithinMountRoot("#equipmentListLabel"),
    saveStatus: queryWithinMountRoot("#saveStatus"),
    billingDocumentPreviewModal: queryWithinMountRoot("#billingDocumentPreviewModal"),
    billingDocumentPreviewTitle: queryWithinMountRoot("#billingDocumentPreviewTitle"),
    billingDocumentPreviewMeta: queryWithinMountRoot("#billingDocumentPreviewMeta"),
    billingDocumentPreviewBody: queryWithinMountRoot("#billingDocumentPreviewBody"),
    billingDocumentPreviewOpenBtn: queryWithinMountRoot("#billingDocumentPreviewOpenBtn"),
    billingDocumentPreviewCloseBtn: queryWithinMountRoot("#billingDocumentPreviewCloseBtn"),
  };
}

let elements = {};

function ensureResourcePlaceholderButtons() {
  const modeSwitch = queryWithinMountRoot(".mode-switch");
  if (!modeSwitch) {
    return;
  }

  queryWithinMountRoot("#productionPreviewResourceBtn")?.remove();
  if (!queryWithinMountRoot("#wasteResourceBtn")) {
    const button = createDetachedElement("button");
    button.type = "button";
    button.id = "wasteResourceBtn";
    button.className = "mode-chip";

    const icon = createDetachedElement("span");
    icon.className = "mode-chip-inline-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "💧";

    const label = createDetachedElement("span");
    label.textContent = "폐수";

    button.append(icon, label);
    modeSwitch.appendChild(button);
  }
}

function resolveElements() {
  ensureResourcePlaceholderButtons();
  ensureManualSaveButtons();
  elements = buildElementRegistry();
  return elements;
}

function createManualSaveButton(buttonId, labelText = "저장") {
  const button = createDetachedElement("button");
  button.type = "button";
  button.id = buttonId;
  button.className = "entry-save-btn is-hidden";
  button.textContent = labelText;
  button.title = "저장";
  button.setAttribute("aria-label", "저장");
  return button;
}

function ensureManualSaveButtons() {
  const panelHeadActions = queryWithinMountRoot(".panel-head-actions");
  if (!panelHeadActions) {
    return;
  }

  if (window.__KPI_GLOBAL_SAVE_SHELL__ === true) {
    queryWithinMountRoot("#saveEntryBtn")?.remove();
    queryWithinMountRoot("#teamSaveBtn")?.remove();
    return;
  }

  let equipmentSaveBtn = queryWithinMountRoot("#saveEntryBtn");
  if (!equipmentSaveBtn) {
    equipmentSaveBtn = createManualSaveButton("saveEntryBtn");
    const equipmentInsertAnchor = queryWithinMountRoot("#teamModeBtn");
    if (equipmentInsertAnchor?.parentElement === panelHeadActions) {
      panelHeadActions.insertBefore(equipmentSaveBtn, equipmentInsertAnchor);
    } else {
      panelHeadActions.appendChild(equipmentSaveBtn);
    }
  }

  let teamSaveBtn = queryWithinMountRoot("#teamSaveBtn");
  if (!teamSaveBtn) {
    teamSaveBtn = createManualSaveButton("teamSaveBtn");
    const teamInsertAnchor = queryWithinMountRoot("#equipmentModeBtn");
    if (teamInsertAnchor?.parentElement === panelHeadActions) {
      panelHeadActions.insertBefore(teamSaveBtn, teamInsertAnchor);
    } else {
      panelHeadActions.appendChild(teamSaveBtn);
    }
  }
}

function assertMountReady() {
  const requiredKeys = [
    "appShell",
    "entryForm",
    "yearPicker",
    "monthPicker",
    "calendarGrid",
    "fieldsGrid",
    "teamTotalsGrid",
    "teamBoards",
  ];
  const missingKeys = requiredKeys.filter((key) => !elements[key]);
  if (missingKeys.length) {
    throw new Error(`metering_mount_missing_elements:${missingKeys.join(",")}`);
  }
}
