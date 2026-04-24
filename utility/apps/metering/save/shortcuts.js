function handleSave(event) {
  event?.preventDefault();
  void performManualSave({ trigger: "submit" });
}

function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const tagName = String(target.tagName || "").toUpperCase();
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT") {
    return true;
  }

  return typeof target.closest === "function"
    ? Boolean(target.closest("input, textarea, select, [contenteditable='true']"))
    : false;
}

function getMonthStepOffsetFromKeyboardEvent(event) {
  if (!state.currentMonth || event.isComposing || isEditableKeyboardTarget(getEventTarget(event))) {
    return 0;
  }

  if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
    return 0;
  }

  if (event.key === "ArrowLeft") {
    return -1;
  }

  if (event.key === "ArrowRight") {
    return 1;
  }

  return 0;
}

function canHandleResourceToggleShortcut(event) {
  if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }

  if (isEditableKeyboardTarget(getEventTarget(event))) {
    return false;
  }

  return true;
}

function handleGlobalKeydown(event) {
  if (isBillingDocumentPreviewOpen()) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeBillingDocumentPreview({ focusTarget: elements.teamSettlementPreviewBtn });
    }
    return;
  }

  const normalizedKey = String(event.key || "").toLowerCase();
  const normalizedCode = String(event.code || "");
  const isSaveShortcut =
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    (normalizedKey === "s" || normalizedCode === "KeyS");

  if (isSaveShortcut) {
    event.preventDefault();
    event.stopPropagation();
    void performManualSave({ trigger: "shortcut" });
    return;
  }

  if (event.key === "Tab" && canHandleResourceToggleShortcut(event)) {
    event.preventDefault();
    event.stopPropagation();
    const currentResourceType = getCurrentResourceType();
    const currentIndex = RESOURCE_TOGGLE_ORDER.indexOf(currentResourceType);
    const nextResourceType =
      RESOURCE_TOGGLE_ORDER[
        currentIndex >= 0 ? (currentIndex + 1) % RESOURCE_TOGGLE_ORDER.length : 0
      ];
    void applyResourceType(nextResourceType);
    return;
  }

  const monthStepOffset = getMonthStepOffsetFromKeyboardEvent(event);
  if (!monthStepOffset) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  handleMonthStep(monthStepOffset);
}
