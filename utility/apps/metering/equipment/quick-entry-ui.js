const QUICK_ENTRY_POPUP_RESOURCE_TYPES = Object.freeze([
  RESOURCE_TYPES.ELECTRIC,
  RESOURCE_TYPES.GAS,
]);

function canUseMeteringQuickEntryPopup() {
  if (typeof isMeteringQuickEntryPopupEnabled === "function") {
    return Boolean(isMeteringQuickEntryPopupEnabled());
  }

  return true;
}

function isQuickEntryPopupSupportedResource(resourceType = getCurrentResourceType()) {
  return isElectricResourceType(resourceType) || isGasResourceType(resourceType);
}

function getQuickEntryPopupResourceTypes() {
  return QUICK_ENTRY_POPUP_RESOURCE_TYPES.filter((resourceType) =>
    isPlainObject(getActiveResourceDataset(state.store, resourceType))
  );
}

function getQuickEntryPopupDataset(resourceType) {
  return getActiveResourceDataset(state.store, resourceType);
}

function runWithQuickEntryResourceContext(resourceType, callback) {
  const dataset = getQuickEntryPopupDataset(resourceType);
  if (!dataset || typeof callback !== "function") {
    return null;
  }

  const previousResourceType = state.store?.resourceType;
  const previousMode = state.store?.mode;
  const previousItems = state.store?.equipmentItems;
  const previousEntries = state.store?.equipmentEntries;

  try {
    state.store.resourceType = normalizeResourceType(resourceType);
    state.store.mode = MODES.EQUIPMENT;
    state.store.equipmentItems = Array.isArray(dataset.equipmentItems) ? dataset.equipmentItems : [];
    state.store.equipmentEntries = isPlainObject(dataset.equipmentEntries)
      ? dataset.equipmentEntries
      : {};
    return callback(dataset);
  } finally {
    state.store.resourceType = previousResourceType;
    state.store.mode = previousMode;
    state.store.equipmentItems = previousItems;
    state.store.equipmentEntries = previousEntries;
  }
}

function getQuickEntryPopupSearchInput() {
  return elements.quickEntryMenu?.__quickEntrySearchInput || null;
}

function getQuickEntryPopupBody() {
  return elements.quickEntryMenu?.__quickEntryPopupBody || null;
}

function getQuickEntryPopupEmptyState() {
  return elements.quickEntryMenu?.__quickEntryPopupEmptyState || null;
}

function getQuickEntryPopupDateBadge() {
  return elements.quickEntryMenu?.__quickEntryPopupDateBadge || null;
}

function getQuickEntryPopupRenderKey() {
  return `${state.selectedDate || ""}::${getQuickEntryPopupSearchQuery?.() || ""}`;
}

function resetQuickEntryDraft(options = {}) {
  const { preserveSearch = false, preserveResults = false } = options;

  if (elements.quickEntryTextarea) {
    elements.quickEntryTextarea.value = "";
  }

  if (!preserveSearch) {
    const searchInput = getQuickEntryPopupSearchInput();
    if (searchInput) {
      searchInput.value = "";
    }
    if (elements.quickEntryMenu) {
      elements.quickEntryMenu.__quickEntryPopupRenderKey = "";
    }
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
  elements.quickEntryResultList.classList.add("is-hidden");
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

function ensureQuickEntryPopupScaffold() {
  const menu = elements.quickEntryMenu;
  if (!menu || menu.__popupScaffoldReady) {
    return;
  }

  const mountDocument = getMountDocument();
  const panel = mountDocument.createElement("section");
  panel.className = "quick-entry-popup-panel";

  Array.from(menu.childNodes).forEach((childNode) => {
    panel.appendChild(childNode);
  });

  const toolbar = mountDocument.createElement("div");
  toolbar.className = "quick-entry-popup-toolbar";

  const searchField = mountDocument.createElement("label");
  searchField.className = "quick-entry-popup-search";

  const searchLabel = mountDocument.createElement("span");
  searchLabel.className = "quick-entry-popup-search-label";
  searchLabel.textContent = "설비 찾기";

  const searchInput = mountDocument.createElement("input");
  searchInput.type = "search";
  searchInput.className = "quick-entry-popup-search-input";
  searchInput.placeholder = "설비명 검색: 전기/가스 전체";
  searchInput.setAttribute("autocomplete", "off");
  searchInput.setAttribute("spellcheck", "false");
  searchInput.setAttribute("data-quick-entry-search-input", "true");

  searchField.append(searchLabel, searchInput);

  const toolbarMeta = mountDocument.createElement("div");
  toolbarMeta.className = "quick-entry-popup-toolbar-meta";

  const dateBadge = mountDocument.createElement("p");
  dateBadge.className = "quick-entry-popup-date";
  dateBadge.textContent = "";

  const closeButton = mountDocument.createElement("button");
  closeButton.type = "button";
  closeButton.className = "quick-entry-popup-close";
  closeButton.textContent = "닫기";
  closeButton.setAttribute("data-quick-entry-close", "true");

  toolbarMeta.append(dateBadge, closeButton);
  toolbar.append(searchField, toolbarMeta);

  const body = mountDocument.createElement("div");
  body.className = "quick-entry-popup-body";
  body.setAttribute("data-quick-entry-popup-body", "true");

  const emptyState = mountDocument.createElement("div");
  emptyState.className = "quick-entry-popup-empty is-hidden";
  emptyState.setAttribute("data-quick-entry-popup-empty", "true");
  emptyState.innerHTML = `
    <strong>조건에 맞는 설비가 없습니다.</strong>
    <span>검색어를 지우거나 설비명을 다시 확인해 주세요.</span>
  `;

  panel.append(toolbar, body, emptyState);
  menu.appendChild(panel);

  const title = panel.querySelector(".quick-entry-menu-title");
  const subtitle = panel.querySelector(".quick-entry-menu-sub");
  const dragBar = panel.querySelector(".quick-entry-menu-drag-bar");
  const actionRow = panel.querySelector(".quick-entry-action-row");

  if (title) {
    title.textContent = "전기/가스 설비 기입";
  }
  if (subtitle) {
    subtitle.textContent = "전기와 가스를 한 화면에 최대한 많이 펼쳐두고, 설비명만 찾아 바로 값을 넣으세요.";
  }
  dragBar?.classList.add("quick-entry-legacy");
  elements.quickEntryTextarea?.classList.add("quick-entry-legacy");
  actionRow?.classList.add("quick-entry-legacy");
  elements.quickEntryCompleteBtn?.classList.add("quick-entry-legacy");
  elements.quickEntryResultList?.classList.add("quick-entry-legacy");

  menu.__quickEntrySearchInput = searchInput;
  menu.__quickEntryPopupBody = body;
  menu.__quickEntryPopupEmptyState = emptyState;
  menu.__quickEntryPopupDateBadge = dateBadge;
  menu.__popupScaffoldReady = true;

  searchInput.addEventListener("input", () => {
    renderQuickEntryPopupBody();
  });
  searchInput.addEventListener("keydown", handleQuickEntryPopupSearchKeydown);

  closeButton.addEventListener("click", () => {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
    syncQuickEntryMenu();
    elements.quickEntryToggleBtn?.focus();
  });

  menu.addEventListener("click", (event) => {
    if (event.target === menu) {
      state.openQuickEntryMenu = false;
      resetQuickEntryDraft();
      syncQuickEntryMenu();
      elements.quickEntryToggleBtn?.focus();
    }
  });
}

function syncQuickEntryPopupFrame() {
  const dateBadge = getQuickEntryPopupDateBadge();
  if (dateBadge) {
    dateBadge.textContent = state.selectedDate ? formatFullDate(state.selectedDate) : "";
    dateBadge.classList.toggle("is-hidden", !state.selectedDate);
  }
}

function syncQuickEntryMenu(options = {}) {
  const { skipStateRefresh = false } = options;
  if (!elements.quickEntryWrap || !elements.quickEntryToggleBtn || !elements.quickEntryMenu) {
    return;
  }

  const isEquipmentMode = getCurrentMode() === MODES.EQUIPMENT;
  const isSupportedResource = isQuickEntryPopupSupportedResource();
  const isFeatureEnabled = canUseMeteringQuickEntryPopup();
  const canOpen =
    isFeatureEnabled && isEquipmentMode && isSupportedResource && Boolean(state.selectedDate);

  if (!isFeatureEnabled && state.openQuickEntryMenu) {
    state.openQuickEntryMenu = false;
    resetQuickEntryDraft();
  }

  const isOpen = state.openQuickEntryMenu && canOpen;
  const portalRoot = getMountPortalRoot();

  elements.quickEntryWrap.classList.toggle("is-open", isOpen);
  elements.quickEntryToggleBtn.setAttribute("aria-expanded", String(isOpen));
  elements.quickEntryMenu.classList.toggle("is-hidden", !isOpen);
  toggleMountHostStateClass("is-quick-entry-active", isOpen);

  if (isOpen) {
    ensureQuickEntryPopupScaffold();
    if (elements.quickEntryMenu.parentNode !== portalRoot) {
      portalRoot.appendChild(elements.quickEntryMenu);
    }
    syncQuickEntryPopupFrame();
    syncQuickEntryCounter();
    if (elements.quickEntryMenu.__quickEntryPopupRenderKey !== getQuickEntryPopupRenderKey()) {
      renderQuickEntryPopupBody();
    } else {
      syncQuickEntryPopupSectionCounts?.();
      syncQuickEntryPopupValidationStates?.();
    }
  } else {
    clearQuickEntryFieldValidationSuppression?.();
    if (elements.quickEntryMenu.parentNode === portalRoot) {
      elements.quickEntryWrap.appendChild(elements.quickEntryMenu);
    }
    syncQuickEntryPopupValidationStates?.();
    syncEquipmentReadingValidationStates?.();
    if (!skipStateRefresh) {
      updateDirtyState?.();
      updateActionState?.();
    }
  }
}

function getQuickEntryEquipmentCounts(resourceType, dateString) {
  const items = typeof getQuickEntryPopupVisibleItems === "function"
    ? getQuickEntryPopupVisibleItems(resourceType, dateString)
    : [];

  let filled = 0;
  items.forEach((item) => {
    const rawValue =
      typeof getQuickEntryPopupFieldRawValue === "function"
        ? getQuickEntryPopupFieldRawValue(resourceType, item.id, dateString)
        : "";
    if (normalizeEntryValue(rawValue) !== "") {
      filled += 1;
    }
  });

  return {
    total: items.length,
    filled,
  };
}

function syncQuickEntryCounter() {
  if (!elements.quickEntryCounter || !elements.quickEntryCounterFraction) {
    return;
  }

  const dateString = state.selectedDate;
  const counts = getQuickEntryPopupResourceTypes().reduce(
    (accumulator, resourceType) => {
      const resourceCounts = getQuickEntryEquipmentCounts(resourceType, dateString);
      accumulator.total += resourceCounts.total;
      accumulator.filled += resourceCounts.filled;
      return accumulator;
    },
    { total: 0, filled: 0 }
  );
  const isComplete = counts.total > 0 && counts.filled === counts.total;

  elements.quickEntryCounterFraction.textContent = `${counts.filled}/${counts.total}`;
  elements.quickEntryCounter.classList.toggle("is-complete", isComplete);
}

function toggleQuickEntryMenu() {
  if (
    !canUseMeteringQuickEntryPopup() ||
    getCurrentMode() !== MODES.EQUIPMENT ||
    !state.selectedDate ||
    !isQuickEntryPopupSupportedResource()
  ) {
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
      getQuickEntryPopupSearchInput()?.focus();
      getQuickEntryPopupSearchInput()?.select?.();
    }, 0);
    return;
  }

  resetQuickEntryDraft();
  syncQuickEntryMenu();
}

function handleQuickEntryPopupSearchKeydown(event) {
  if (event.key !== "ArrowDown") {
    return;
  }

  const firstInput = getQuickEntryPopupBody()?.querySelector?.("input[data-quick-entry-popup-field]");
  if (!firstInput) {
    return;
  }

  event.preventDefault();
  firstInput.focus();
  firstInput.select?.();
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
  getQuickEntryPopupSearchInput()?.focus();
  getQuickEntryPopupSearchInput()?.select?.();
}
