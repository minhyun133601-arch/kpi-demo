const EQUIPMENT_FULLSCREEN_BUTTON_ICONS = {
  enter: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 4.5H4.5V8" />
      <path d="M16 4.5h3.5V8" />
      <path d="M8 19.5H4.5V16" />
      <path d="M16 19.5h3.5V16" />
    </svg>
  `,
  exit: `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9.5 4.5v4h-4" />
      <path d="M14.5 4.5v4h4" />
      <path d="M9.5 19.5v-4h-4" />
      <path d="M14.5 19.5v-4h4" />
    </svg>
  `,
};

const equipmentFullscreenSession = {
  calendarWindow: null,
  isClosingCalendarWindow: false,
};

function getEquipmentFullscreenButtonMarkup(isActive) {
  return isActive
    ? EQUIPMENT_FULLSCREEN_BUTTON_ICONS.exit
    : EQUIPMENT_FULLSCREEN_BUTTON_ICONS.enter;
}

function isSupportedFullscreenMode(mode = getCurrentMode()) {
  return mode === MODES.EQUIPMENT || mode === MODES.TEAM;
}

function syncFullscreenToggleButton(button, isVisible, isActive) {
  if (!button) {
    return;
  }

  button.classList.toggle("is-hidden", !isVisible);
  button.classList.toggle("is-active", isVisible && isActive);
  button.setAttribute("aria-pressed", String(isVisible && isActive));
  button.setAttribute("aria-label", isVisible && isActive ? "전체화면 종료" : "전체화면");
  button.title = isVisible && isActive ? "원래 화면으로" : "전체화면";
  button.innerHTML = getEquipmentFullscreenButtonMarkup(isVisible && isActive);
}

function syncEquipmentFullscreenUI() {
  const currentMode = getCurrentMode();
  const isEquipmentMode = currentMode === MODES.EQUIPMENT;
  const isTeamMode = currentMode === MODES.TEAM;
  const isActive = isSupportedFullscreenMode(currentMode) && state.isEquipmentFullscreen;

  toggleMountHostStateClass("is-equipment-fullscreen", isActive);
  toggleMountHostStateClass("is-equipment-panel-scroll-mode", isEquipmentMode && !state.isEquipmentFullscreen);

  if (!isEquipmentMode || state.isEquipmentFullscreen) {
    clearEquipmentSectionDragScrollState();
  }

  syncFullscreenToggleButton(elements.equipmentFullscreenToggleBtn, isEquipmentMode, isActive);
  syncFullscreenToggleButton(elements.teamFullscreenToggleBtn, isTeamMode, isActive);
  syncTeamSettlementButtonState();
}

function syncTeamSettlementButtonState() {
  if (elements.teamSettlementBtn) {
    const resourceType = getCurrentResourceType();
    const isTeamMode = getCurrentMode() === MODES.TEAM;
    const supportsSettlement = supportsBillingSettlementForResource(resourceType);
    const requiresTotalPowerUsage = isElectricResourceType(resourceType);
    const shouldShowSettlementButton = isTeamMode && supportsSettlement;
    const hasCurrentMonth = Boolean(normalizeMonthValue(state.currentMonth));
    const hasTotalPowerUsage = isTeamMode && calculateTotalPowerMonthlyUsage() !== null;
    const canUseSettlementButton =
      supportsSettlement &&
      isTeamMode &&
      hasCurrentMonth &&
      (!requiresTotalPowerUsage || hasTotalPowerUsage) &&
      !state.isBillingDocumentUploading;

    elements.teamSettlementBtn.classList.toggle("is-hidden", !shouldShowSettlementButton);
    elements.teamSettlementBtn.disabled = !canUseSettlementButton;
    elements.teamSettlementBtn.setAttribute("aria-disabled", String(!canUseSettlementButton));
    elements.teamSettlementBtn.setAttribute(
      "aria-expanded",
      String(Boolean(state.isTeamSettlementPanelOpen && canUseSettlementButton))
    );
    elements.teamSettlementBtn.classList.toggle(
      "is-active",
      Boolean(state.isTeamSettlementPanelOpen && canUseSettlementButton)
    );

    if (!shouldShowSettlementButton) {
      elements.teamSettlementBtn.title = "정산";
    } else if (state.isBillingDocumentUploading) {
      elements.teamSettlementBtn.title = "청구서를 저장하고 있습니다.";
    } else if (!hasCurrentMonth) {
      elements.teamSettlementBtn.title = "기입 년월을 먼저 선택해 주세요.";
    } else if (requiresTotalPowerUsage && !hasTotalPowerUsage) {
      elements.teamSettlementBtn.title = "전력총량이 계산되어야 정산을 열 수 있습니다.";
    } else if (state.isTeamSettlementPanelOpen) {
      elements.teamSettlementBtn.title = "정산 입력 닫기";
    } else {
      elements.teamSettlementBtn.title = "정산 입력 열기";
    }
  }
}

async function handleFormFullscreenToggleClick(event) {
  event.preventDefault();

  if (state.isEquipmentFullscreen) {
    await exitFormFullscreenMode();
    return;
  }

  await enterFormFullscreenMode();
}

function shouldUseCalendarPopup() {
  return false;
}

function ensureCalendarPopupWindow() {
  if (!shouldUseCalendarPopup()) {
    return null;
  }

  const activePopup = equipmentFullscreenSession.calendarWindow;
  if (activePopup && !activePopup.closed) {
    return activePopup;
  }

  const popupWindow = window.open(
    "",
    "monthly-electricity-calendar",
    "popup=yes,width=920,height=980,resizable=yes,scrollbars=yes"
  );
  if (!popupWindow) {
    return null;
  }

  equipmentFullscreenSession.calendarWindow = popupWindow;
  return popupWindow;
}

function initializeCalendarPopupWindow(popupWindow) {
  const popupDocument = popupWindow.document;
  if (popupDocument.getElementById("calendarPopupRoot")) {
    return popupDocument;
  }

  const stylesheetHref = runtimeContext.popupStylesUrl || resolveRuntimeAssetUrl("styles.css");
  popupDocument.open();
  popupDocument.write(`<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>달력</title>
    <link rel="stylesheet" href="${stylesheetHref}" />
  </head>
  <body class="calendar-popup-body">
    <div id="calendarPopupRoot" class="calendar-popup-shell"></div>
  </body>
</html>`);
  popupDocument.close();

  if (!popupWindow.__calendarPopupLifecycleBound) {
    popupWindow.addEventListener("beforeunload", handleCalendarPopupWindowClosed);
    popupWindow.__calendarPopupLifecycleBound = true;
  }

  return popupDocument;
}

function bindCalendarPopupEvents(popupWindow, popupDocument) {
  const previousMonthButton = popupDocument.querySelector("#prevMonthBtn");
  const nextMonthButton = popupDocument.querySelector("#nextMonthBtn");
  const yearPicker = popupDocument.querySelector("#yearPicker");
  const monthPicker = popupDocument.querySelector("#monthPicker");

  if (!popupWindow.__calendarPopupMonthKeydownBound) {
    popupDocument.addEventListener("keydown", (event) => {
      const monthStepOffset = getMonthStepOffsetFromKeyboardEvent(event);
      if (!monthStepOffset) {
        return;
      }

      event.preventDefault();
      handleMonthStep(monthStepOffset);
      popupWindow.focus();
    });
    popupWindow.__calendarPopupMonthKeydownBound = true;
  }

  previousMonthButton?.addEventListener("click", () => {
    handleMonthStep(-1);
    popupWindow.focus();
  });

  nextMonthButton?.addEventListener("click", () => {
    handleMonthStep(1);
    popupWindow.focus();
  });

  const handlePopupPeriodChange = () => {
    handleCalendarPopupPeriodChange(yearPicker?.value, monthPicker?.value);
    popupWindow.focus();
  };

  yearPicker?.addEventListener("change", handlePopupPeriodChange);
  monthPicker?.addEventListener("change", handlePopupPeriodChange);

  popupDocument.querySelectorAll(".calendar-day[data-date-string]").forEach((button) => {
    if (button.disabled) {
      return;
    }

    button.addEventListener("click", (event) => {
      handleCalendarDateClick(button.dataset.dateString || "", event);
      popupWindow.focus();
    });
  });
}

function syncCalendarPopupWindow() {
  if (!state.isEquipmentFullscreen || !isSupportedFullscreenMode(getCurrentMode())) {
    closeCalendarPopupWindow();
    return;
  }

  if (!shouldUseCalendarPopup()) {
    closeCalendarPopupWindow();
    return;
  }

  const popupWindow = equipmentFullscreenSession.calendarWindow;
  if (!popupWindow || popupWindow.closed) {
    equipmentFullscreenSession.calendarWindow = null;
    return;
  }

  const popupDocument = initializeCalendarPopupWindow(popupWindow);
  const popupRoot = popupDocument.getElementById("calendarPopupRoot");
  if (!popupRoot || !elements.panelCalendar) {
    return;
  }

  popupRoot.innerHTML = `
    <section class="panel panel-calendar calendar-popup-panel">
      ${elements.panelCalendar.innerHTML}
    </section>
  `;
  popupDocument.title = `${elements.monthTitle?.textContent || "달력"} 달력`;
  bindCalendarPopupEvents(popupWindow, popupDocument);
}

function handleCalendarPopupPeriodChange(yearValue, monthValue) {
  const year = Number(yearValue);
  const month = String(monthValue || "").padStart(2, "0");
  if (!year || !month) {
    return;
  }

  elements.yearPicker.value = String(year);
  populateMonthOptions(year, month);
  elements.monthPicker.value = month;
  handlePeriodChange();
}

function handleCalendarPopupWindowClosed() {
  if (equipmentFullscreenSession.isClosingCalendarWindow) {
    return;
  }

  equipmentFullscreenSession.calendarWindow = null;
}

function closeCalendarPopupWindow() {
  const popupWindow = equipmentFullscreenSession.calendarWindow;
  if (!popupWindow || popupWindow.closed) {
    equipmentFullscreenSession.calendarWindow = null;
    return;
  }

  equipmentFullscreenSession.isClosingCalendarWindow = true;
  try {
    popupWindow.close();
  } catch (error) {
    // Ignore popup close failures and continue restoring the main layout.
  }

  equipmentFullscreenSession.calendarWindow = null;
  window.setTimeout(() => {
    equipmentFullscreenSession.isClosingCalendarWindow = false;
  }, 0);
}

function restoreEquipmentEntryAfterFullscreenRender() {
  if (getCurrentMode() !== MODES.EQUIPMENT) {
    return;
  }

  const currentEntry = getCurrentEntry();
  restoreEquipmentFormData(currentEntry || { values: {} }, getEntryDayStatus(currentEntry));
  syncEquipmentRestIndicators();
  syncEquipmentReadingValidationStates();
  updateDirtyState();
  updateActionState();
}

async function enterFormFullscreenMode() {
  const currentMode = getCurrentMode();
  if (!isSupportedFullscreenMode(currentMode)) {
    return;
  }

  syncPendingMeteringDraftInputs({ includeEquipmentDraft: true });

  let popupWindow = null;
  if (shouldUseCalendarPopup()) {
    popupWindow = ensureCalendarPopupWindow();
  }
  if (shouldUseCalendarPopup() && !popupWindow) {
    window.alert("달력 창을 열 수 없습니다. 팝업 차단을 확인해 주세요.");
    return;
  }

  state.isEquipmentFullscreen = true;
  state.openEquipmentOrderMenu = false;
  state.openEquipmentManageKey = "";
  clearEquipmentOrderDragState();
  clearEquipmentFieldCardDragState();
  elements.equipmentOrderHead.innerHTML = "";
  elements.equipmentOrderList.innerHTML = "";
  syncEquipmentManageMenus();
  syncEquipmentOrderMenu();
  syncEquipmentFullscreenUI();
  renderEquipmentFieldInputs();
  restoreEquipmentEntryAfterFullscreenRender();
  renderCalendar();
  renderTeamMode();
  renderSummary();

  try {
    if (elements.panelForm?.requestFullscreen && document.fullscreenElement !== elements.panelForm) {
      await elements.panelForm.requestFullscreen();
    }
  } catch (error) {
    // Browser fullscreen can fail; keep the expanded layout as a fallback.
  }

  if (popupWindow) {
    syncCalendarPopupWindow();
    popupWindow.focus();
  } else {
    closeCalendarPopupWindow();
  }
}

async function exitFormFullscreenMode(options = {}) {
  const { skipBrowserExit = false, skipPopupClose = false } = options;

  if (!state.isEquipmentFullscreen && !document.fullscreenElement) {
    if (!skipPopupClose) {
      closeCalendarPopupWindow();
    }
    syncEquipmentFullscreenUI();
    return;
  }

  syncPendingMeteringDraftInputs({ includeEquipmentDraft: true });

  state.isEquipmentFullscreen = false;
  state.openEquipmentOrderMenu = false;
  clearEquipmentOrderDragState();
  clearEquipmentFieldCardDragState();
  elements.equipmentOrderHead.innerHTML = "";
  elements.equipmentOrderList.innerHTML = "";
  syncEquipmentOrderMenu();
  syncEquipmentFullscreenUI();

  if (!skipPopupClose) {
    closeCalendarPopupWindow();
  }

  if (!skipBrowserExit && document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (error) {
      // Ignore browser fullscreen exit failures and continue restoring the layout.
    }
  }

  renderEquipmentFieldInputs();
  restoreEquipmentEntryAfterFullscreenRender();
  renderCalendar();
  renderTeamMode();
  renderSummary();
}

function handleDocumentFullscreenChange() {
  if (!document.fullscreenElement && state.isEquipmentFullscreen) {
    void exitFormFullscreenMode({ skipBrowserExit: true });
  }
}
