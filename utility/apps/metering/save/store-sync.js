function getManualSaveContextLabel() {
  if (getCurrentMode() === MODES.TEAM) {
    const monthValue = normalizeMonthValue(state.currentMonth);
    return monthValue ? `${getCurrentResourceLabel()} ${monthValue} 팀별` : `${getCurrentResourceLabel()} 팀별`;
  }

  if (state.selectedDate) {
    return `${getCurrentResourceLabel()} ${state.selectedDate} 설비별`;
  }

  return `${getCurrentResourceLabel()} 설비별`;
}

function appendManualSaveHistoryRecord(record) {
  state.store.manualSaveHistory = normalizeManualSaveHistory([
    record,
    ...(Array.isArray(state.store.manualSaveHistory) ? state.store.manualSaveHistory : []),
  ]);
}

async function waitForQueuedPersistence() {
  await Promise.allSettled([sharedServerPersistenceState.writeChain]);
}

async function writeStoreToSharedServer() {
  syncActiveResourceDatasetToStore(state.store);
  return writeStorePayloadToSharedServer(state.store).then((writeResult) => {
    window.__LOCAL_APP_STORE__ = JSON.parse(JSON.stringify(state.store));
    window.__PRESET_ELECTRIC_ENTRIES__ = getElectricPresetEntriesForStore(window.__LOCAL_APP_STORE__);
    sharedServerPersistenceState.lastErrorMessage = "";
    return writeResult;
  });
}

async function writeStorePayloadToSharedServer(store) {
  if (!supportsSharedServerPersistence()) {
    return false;
  }

  const currentMeta = sharedServerPersistenceState.meta || getPresetSharedStoreMeta();
  if (!sharedServerPersistenceState.meta && currentMeta) {
    sharedServerPersistenceState.meta = currentMeta;
  }

  const expectedVersion = Number.isInteger(currentMeta?.version)
    ? currentMeta.version
    : null;
  const expectedRecordVersions = isPlainObject(currentMeta?.recordVersions)
    ? currentMeta.recordVersions
    : null;

  const response = await window.fetch(getSharedStoreEndpoint(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    cache: "no-store",
    credentials: "same-origin",
    body: JSON.stringify({
      store,
      expectedVersion,
      expectedRecordVersions,
    }),
  });

  const payload = await response.json().catch(() => null);

  if (response.status === 409 || payload?.error === "version_conflict") {
    sharedServerPersistenceState.conflictMeta = rememberSharedStoreMeta(payload?.currentMeta);
    throw new Error("shared_store_version_conflict");
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(`shared_store_write_failed:${response.status}`);
  }

  sharedServerPersistenceState.conflictMeta = null;
  rememberSharedStoreMeta(payload?.meta);
  return true;
}

function queueSharedStoreWrite() {
  if (!supportsSharedServerPersistence()) {
    return;
  }

  sharedServerPersistenceState.writeChain = sharedServerPersistenceState.writeChain
    .then(() => writeStoreToSharedServer())
    .catch((error) => {
      const message = error?.message === "shared_store_version_conflict"
        ? "중앙 서버 버전 충돌로 저장이 보류되었습니다. 새로고침 후 최신 내용을 확인해 주세요."
        : "중앙 서버 저장에 실패했습니다.";
      sharedServerPersistenceState.lastErrorMessage = message;
      console.error(message, error);
    });
}

async function performManualSave(options = {}) {
  const trigger = normalizeText(options.trigger) || "manual";
  const currentMode = getCurrentMode();

  sharedServerPersistenceState.lastErrorMessage = "";

  let didSave = false;

  if (currentMode === MODES.EQUIPMENT) {
    if (state.selectedDate) {
      didSave = saveCurrentEquipmentEntry({ allowValidationIssues: true });
      if (!didSave) {
        updateDirtyState();
        updateActionState();
        return false;
      }
    } else if (isDirty()) {
      persistStore();
      didSave = true;
    }
  } else {
    persistStore();
    didSave = true;
  }

  if (!didSave) {
    return false;
  }

  if (!supportsSharedServerPersistence()) {
    const message = "이 환경에서는 서버 저장을 지원하지 않습니다.";
    sharedServerPersistenceState.lastErrorMessage = message;
    if (elements.saveStatus) {
      elements.saveStatus.textContent = message;
      elements.saveStatus.classList.add("is-dirty", "is-error");
    }
    updateDirtyState();
    updateActionState();
    return false;
  }

  await waitForQueuedPersistence();

  if (sharedServerPersistenceState.lastErrorMessage) {
    updateDirtyState();
    updateActionState();
    return false;
  }

  const savedAt = new Date().toISOString();
  appendManualSaveHistoryRecord({
    savedAt,
    trigger,
    resourceType: getCurrentResourceType(),
    mode: currentMode,
    contextLabel: getManualSaveContextLabel(),
  });
  persistStore();
  await waitForQueuedPersistence();
  state.loadedSnapshot = createFormSnapshot();
  state.cleanStatusText = "서버 저장을 완료했습니다.";
  updateDirtyState();
  updateActionState();
  return true;
}

function persistStore(options = {}) {
  const { skipSharedServerWrite = false } = options;
  syncActiveResourceDatasetToStore(state.store);
  clearEquipmentReadingTimelineCaches();
  window.__LOCAL_APP_STORE__ = JSON.parse(JSON.stringify(state.store));
  window.__PRESET_ELECTRIC_ENTRIES__ = getElectricPresetEntriesForStore(window.__LOCAL_APP_STORE__);
  notifyKpiMeteringStoreUpdated();
  if (!skipSharedServerWrite && ENABLE_SHARED_SERVER_WRITE) {
    queueSharedStoreWrite();
  }
}

function dispatchKpiMeteringStoreUpdatedEvent(targetWindow) {
  if (!targetWindow || typeof targetWindow.dispatchEvent !== "function") {
    return;
  }

  const EventConstructor =
    typeof targetWindow.CustomEvent === "function" ? targetWindow.CustomEvent : CustomEvent;
  targetWindow.dispatchEvent(
    new EventConstructor("kpi:metering-store-updated", {
      detail: {
        resourceType: getCurrentResourceType(),
      },
    })
  );
}

function notifyKpiMeteringStoreUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const targetWindows = [window];

    try {
      if (window.parent && window.parent !== window && !targetWindows.includes(window.parent)) {
        targetWindows.push(window.parent);
      }
    } catch (error) {
      console.warn("Failed to access parent window for metering update notification.", error);
    }

    try {
      if (window.top && window.top !== window && !targetWindows.includes(window.top)) {
        targetWindows.push(window.top);
      }
    } catch (error) {
      console.warn("Failed to access top window for metering update notification.", error);
    }

    targetWindows.forEach((targetWindow) => {
      dispatchKpiMeteringStoreUpdatedEvent(targetWindow);
    });
  } catch (error) {
    console.error("Failed to notify KPI metering store update.", error);
  }
}
