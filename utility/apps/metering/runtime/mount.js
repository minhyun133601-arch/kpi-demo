function renderInitFailureState() {
  if (elements.heroText) {
    elements.heroText.textContent = "로컬 초기화에 문제가 있어 기본 상태로 열지 못했습니다.";
  }

  if (elements.selectedDateTitle) {
    elements.selectedDateTitle.textContent = "새로고침 후 다시 열어 주세요";
  }

  if (elements.saveStatus) {
    elements.saveStatus.textContent = "초기화 오류가 발생했습니다.";
    elements.saveStatus.classList.add("is-dirty", "is-error");
  }
}

function resetBootState() {
  clearEquipmentReadingTimelineCaches();
  state.store = createDefaultStore();
  state.currentMonth = "";
  state.selectedDate = "";
  state.selectedCalendarDates = [];
  state.loadedSnapshot = "";
  state.cleanStatusText = "저장된 기록이 없습니다.";
  state.openTeamPickerKey = "";
  state.openEquipmentManageKey = "";
  state.openEquipmentOrderMenu = false;
  state.openEquipmentAddMenu = false;
  state.openQuickEntryMenu = false;
  state.quickEntryResults = [];
  state.selectedEquipmentKeys = [];
  state.selectedTeamKey = "";
  state.selectedTeamKeys = [];
  state.teamPickerSelections = {};
  state.teamCalendarSelections = {};
  state.isEquipmentFullscreen = false;
  state.isTeamSettlementPanelOpen = false;
  state.activeTeamSettlementScope = getDefaultBillingSettlementScopeKey(RESOURCE_TYPES.ELECTRIC);
  state.selectionDisplayMode = "monthly";
  state.calendarSelectionAnchorDate = "";
  state.equipmentSelectionAnchorKey = "";
  state.teamSelectionAnchorKey = "";
  state.eventsBound = false;
}

async function bootMountedApp() {
  if (
    typeof window !== "undefined" &&
    window.__SHARED_APP_STORE_PRELOAD__ &&
    typeof window.__SHARED_APP_STORE_PRELOAD__.then === "function"
  ) {
    try {
      await window.__SHARED_APP_STORE_PRELOAD__;
    } catch (error) {
      console.warn("Shared metering store preload failed before boot.", error);
    }
  }

  if (supportsSharedServerPersistence()) {
    rememberSharedStoreMeta(getPresetSharedStoreMeta());
  }

  try {
    init();
  } catch (error) {
    console.error("Initial app boot failed. Retrying with default local state.", error);
    resetBootState();

    try {
      init();
    } catch (retryError) {
      console.error("Retry app boot failed.", retryError);
      renderInitFailureState();
    }
  }
}

async function unmountIntegratedMetering(options = {}) {
  const { clearHost = false } = options;

  try {
    await exitFormFullscreenMode({ skipBrowserExit: false, skipPopupClose: false });
  } catch (error) {
    clearMountHostStateClasses();
    closeCalendarPopupWindow();
  }

  flushRuntimeCleanups();
  clearMountHostStateClasses();
  state.eventsBound = false;
  state.openQuickEntryMenu = false;

  if (clearHost && runtimeContext.hostElement?.shadowRoot) {
    runtimeContext.hostElement.shadowRoot.innerHTML = "";
  }

  runtimeContext.mountRoot = null;
  runtimeContext.portalRoot = null;
  runtimeContext.hostElement = null;
  runtimeContext.document = document;
  runtimeContext.assetBaseUrl = window.location.href;
  runtimeContext.popupStylesUrl = "";
  elements = {};
}

function createEmbeddedStylesheetNode(doc, options = {}) {
  const cssText = typeof options.cssText === "string" ? options.cssText.trim() : "";
  if (cssText) {
    const style = doc.createElement("style");
    style.dataset.meteringEmbeddedStyles = "true";
    style.textContent = cssText;
    return style;
  }

  const href = normalizeText(options.href);
  if (!href) {
    return null;
  }

  const link = doc.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  link.dataset.meteringEmbeddedStyles = "true";
  return link;
}

function renderIntegratedMountHost(hostElement, options = {}) {
  const shadowRoot = hostElement.shadowRoot || hostElement.attachShadow({ mode: "open" });
  const runtimeAssetBaseUrl =
    normalizeText(options.assetBaseUrl) ||
    normalizeText(options.baseUrl) ||
    runtimeContext.assetBaseUrl ||
    window.location.href;
  const normalizedTemplateAssetBaseUrl = /\/$/.test(runtimeAssetBaseUrl)
    ? runtimeAssetBaseUrl
    : `${runtimeAssetBaseUrl}/`;
  // Keep the compiled template working even if the runtime folder name changes.
  const templateMarkup = String(options.templateHtml || window.__KPI_METERING_TEMPLATE__ || "")
    .trim()
    .replaceAll("utility/검침/", normalizedTemplateAssetBaseUrl);
  const embeddedStylesUrl =
    normalizeText(options.embeddedStylesUrl) || resolveRuntimeAssetUrl("embedded.css");
  shadowRoot.innerHTML = "";

  const embeddedStylesNode = createEmbeddedStylesheetNode(hostElement.ownerDocument || document, {
    href: embeddedStylesUrl,
    cssText: options.embeddedStylesCssText,
  });
  if (embeddedStylesNode) {
    shadowRoot.appendChild(embeddedStylesNode);
  }

  const wrapper = (hostElement.ownerDocument || document).createElement("div");
  wrapper.innerHTML = templateMarkup;
  Array.from(wrapper.childNodes).forEach((node) => {
    shadowRoot.appendChild(node);
  });
  const heroBrand = shadowRoot.querySelector(".hero-brand");
  if (heroBrand) {
    heroBrand.remove();
  }
  const resourceEyebrow = shadowRoot.querySelector("#resourceEyebrow");
  if (resourceEyebrow) {
    resourceEyebrow.textContent = "";
    resourceEyebrow.classList.add("is-hidden");
  }
  shadowRoot.querySelectorAll("img").forEach((image) => {
    image.draggable = false;
  });

  return shadowRoot;
}

async function mountIntegratedMetering(hostElement, options = {}) {
  if (!hostElement) {
    throw new Error("metering_mount_target_missing");
  }

  await unmountIntegratedMetering({ clearHost: false });
  const mountRoot = renderIntegratedMountHost(hostElement, options);
  runtimeContext.hostElement = hostElement;
  runtimeContext.mountRoot = mountRoot;
  runtimeContext.portalRoot = mountRoot;
  runtimeContext.document = hostElement.ownerDocument || document;
  runtimeContext.assetBaseUrl =
    normalizeText(options.assetBaseUrl) || normalizeText(options.baseUrl) || window.location.href;
  runtimeContext.popupStylesUrl =
    normalizeText(options.popupStylesUrl) || resolveRuntimeAssetUrl("styles.css");
  await bootMountedApp();
  return {
    unmount: (unmountOptions) => unmountIntegratedMetering(unmountOptions),
  };
}

window.KpiMeteringApp = {
  mount: mountIntegratedMetering,
  unmount: (options) => unmountIntegratedMetering(options),
  manualSave: (options) => performManualSave(options),
  getElectricMonthlyTeamSnapshot: (monthValue) => buildElectricMonthlyTeamSnapshot(monthValue),
  getElectricUtilityDatasetSnapshot: () => buildElectricUtilityDatasetSnapshot(),
  getGasUtilityDatasetSnapshot: () => buildGasUtilityDatasetSnapshot(),
  getWasteUtilityDatasetSnapshot: () => buildWasteUtilityDatasetSnapshot(),
};
