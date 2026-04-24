function resetQuickEntryDraft(options = {}) {
  const { preserveResults = false } = options;

  if (elements.quickEntryTextarea) {
    elements.quickEntryTextarea.value = "";
  }

  if (!preserveResults) {
    state.quickEntryResults = [];
    renderQuickEntryResults();
  }
}

function renderQuickEntryResults() {
  if (!elements.quickEntryResultList) {
    return;
  }

  elements.quickEntryResultList.innerHTML = "";

  if (!state.quickEntryResults.length) {
    elements.quickEntryResultList.classList.add("is-hidden");
    return;
  }

  state.quickEntryResults.slice(0, QUICK_ENTRY_RESULT_LIMIT).forEach((result) => {
    const item = document.createElement("div");
    item.className = `quick-entry-result is-${result.kind}`;
    item.textContent = result.text;
    elements.quickEntryResultList.appendChild(item);
  });

  elements.quickEntryResultList.classList.remove("is-hidden");
}

function pushQuickEntryResult(text, kind = "success") {
  if (!text) {
    return;
  }

  state.quickEntryResults = [{ text, kind }, ...state.quickEntryResults].slice(
    0,
    QUICK_ENTRY_RESULT_LIMIT
  );
  renderQuickEntryResults();
}

function syncQuickEntryMenu() {
  if (!elements.quickEntryWrap || !elements.quickEntryToggleBtn || !elements.quickEntryMenu) {
    return;
  }

  const isEquipmentMode = getCurrentMode() === MODES.EQUIPMENT;
  const canOpen = isEquipmentMode && Boolean(state.selectedDate);
  const isOpen = state.openQuickEntryMenu && canOpen;
  const portalRoot = getMountPortalRoot();

  elements.quickEntryWrap.classList.toggle("is-open", isOpen);
  elements.quickEntryToggleBtn.setAttribute("aria-expanded", String(isOpen));
  elements.quickEntryMenu.classList.toggle("is-hidden", !isOpen);
  toggleMountHostStateClass("is-quick-entry-active", isOpen);

  if (isOpen) {
    if (elements.quickEntryMenu.parentNode !== portalRoot) {
      portalRoot.appendChild(elements.quickEntryMenu);
    }
    ensureQuickEntryDragBar();
    syncQuickEntryCounter();
  } else {
    if (elements.quickEntryMenu.parentNode === portalRoot) {
      elements.quickEntryWrap.appendChild(elements.quickEntryMenu);
    }
    elements.quickEntryMenu.style.top = "";
    elements.quickEntryMenu.style.left = "";
    elements.quickEntryMenu.style.transform = "";
  }
}

function getQuickEntryEquipmentCounts(resourceType, dateString) {
  const dataset = getActiveResourceDataset(state.store, resourceType);
  if (!dataset) {
    return { total: 0, filled: 0 };
  }

  const items = Array.isArray(dataset.equipmentItems) ? dataset.equipmentItems : [];
  const entries = isPlainObject(dataset.equipmentEntries) ? dataset.equipmentEntries : {};
  const entry = isPlainObject(entries[dateString]) ? entries[dateString] : {};
  const contextDate = dateString || getEquipmentVisibilityContextDate();

  let total = 0;
  let filled = 0;

  items.forEach((item) => {
    if (isSummaryOnlyEquipment(item) || isAutoCalculatedEquipment(item)) {
      return;
    }
    if (isHiddenEquipmentFieldCard(item, contextDate)) {
      return;
    }
    total += 1;
    const rawValue = isPlainObject(entry.values) ? entry.values[item.id] : entry?.[item.id];
    if (rawValue !== undefined && rawValue !== null && normalizeEntryValue(String(rawValue)) !== "") {
      filled += 1;
    }
  });

  return { total, filled };
}

function syncQuickEntryCounter() {
  if (!elements.quickEntryCounter || !elements.quickEntryCounterFraction) {
    return;
  }

  const dateString = state.selectedDate;

  const currentInputs = getTabNavigableEquipmentInputs().filter((input) => {
    const fieldKey = input.dataset.fieldKey || "";
    const equipment = getEquipmentItem(fieldKey);
    return equipment && !isHiddenEquipmentFieldCard(equipment) && !isAutoCalculatedEquipment(equipment);
  });
  const currentFilled = currentInputs.filter((input) => normalizeEntryValue(input.value) !== "").length;
  const currentTotal = currentInputs.length;

  const otherType = isGasResourceType() ? RESOURCE_TYPES.ELECTRIC : RESOURCE_TYPES.GAS;
  const otherCounts = getQuickEntryEquipmentCounts(otherType, dateString);

  const totalCount = currentTotal + otherCounts.total;
  const filledCount = currentFilled + otherCounts.filled;
  const isComplete = totalCount > 0 && filledCount === totalCount;

  elements.quickEntryCounterFraction.textContent = `${filledCount}/${totalCount}`;
  elements.quickEntryCounter.classList.toggle("is-complete", isComplete);
}

function ensureQuickEntryDragBar() {
  const dragBar = elements.quickEntryMenu.querySelector(".quick-entry-menu-drag-bar");
  if (!dragBar || dragBar.__dragBound) {
    return;
  }
  dragBar.__dragBound = true;

  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;

  dragBar.addEventListener("pointerdown", (event) => {
    isDragging = true;
    const rect = elements.quickEntryMenu.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    elements.quickEntryMenu.classList.add("is-dragging");
    elements.quickEntryMenu.style.transform = "none";
    elements.quickEntryMenu.style.left = rect.left + "px";
    elements.quickEntryMenu.style.top = rect.top + "px";
    dragBar.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  dragBar.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }
    const x = Math.max(
      0,
      Math.min(event.clientX - offsetX, window.innerWidth - elements.quickEntryMenu.offsetWidth)
    );
    const y = Math.max(
      0,
      Math.min(event.clientY - offsetY, window.innerHeight - elements.quickEntryMenu.offsetHeight)
    );
    elements.quickEntryMenu.style.left = x + "px";
    elements.quickEntryMenu.style.top = y + "px";
  });

  dragBar.addEventListener("pointerup", () => {
    isDragging = false;
    elements.quickEntryMenu.classList.remove("is-dragging");
  });
}

function toggleQuickEntryMenu() {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    return;
  }

  state.openQuickEntryMenu = !state.openQuickEntryMenu;

  if (state.openQuickEntryMenu) {
    if (state.openEquipmentAddMenu) {
      state.openEquipmentAddMenu = false;
      resetEquipmentAddDraft();
      syncEquipmentAddMenu();
    }

    state.openEquipmentManageKey = "";
    syncEquipmentManageMenus();
    state.openEquipmentOrderMenu = false;
    clearEquipmentOrderDragState();
    elements.equipmentOrderHead.innerHTML = "";
    elements.equipmentOrderList.innerHTML = "";
    syncEquipmentOrderMenu();
    resetQuickEntryDraft();
    syncQuickEntryMenu();
    window.setTimeout(() => {
      elements.quickEntryTextarea?.focus();
      elements.quickEntryTextarea?.select?.();
    }, 0);
    return;
  }

  resetQuickEntryDraft();
  syncQuickEntryMenu();
}

function handleQuickEntryTextareaKeydown(event) {
  if (event.key === "Escape" && state.openQuickEntryMenu) {
    event.preventDefault();
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
    syncQuickEntryMenu();
    elements.quickEntryToggleBtn?.focus();
  }
}

function handleQuickEntryCompleteClick() {
  processQuickEntryTextarea();
}
