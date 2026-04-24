async function handleTeamSettlementAttachClick(event) {
  event?.preventDefault();

  if (getCurrentMode() !== MODES.TEAM || !supportsBillingSettlementForCurrentResource()) {
    return;
  }

  const resourceType = getCurrentResourceType();
  if (!supportsBillingDocumentForResource(resourceType)) {
    return;
  }
  const monthValue = normalizeMonthValue(state.currentMonth);
  const scopeKey = getCurrentBillingSettlementScope(resourceType);
  getBillingSettlementScopeTitle(scopeKey, resourceType);
  if (!monthValue) {
    window.alert("기입 년월을 먼저 선택해 주세요.");
    syncEquipmentFullscreenUI();
    return;
  }

  if (isElectricResourceType(resourceType) && calculateTotalPowerMonthlyUsage() === null) {
    window.alert("전력총량이 계산되어야 정산을 열 수 있습니다.");
    syncEquipmentFullscreenUI();
    return;
  }

  state.isTeamSettlementPanelOpen = true;
  closeBillingDocumentPreview();
  const existingBillingDocument = getBillingDocumentForMonth(monthValue, scopeKey);
  if (existingBillingDocument) {
    const confirmed = window.confirm(`"${existingBillingDocument.fileName}" 첨부를 삭제할까요?`);
    if (!confirmed) {
      syncEquipmentFullscreenUI();
      return;
    }

    state.isBillingDocumentUploading = true;
    syncEquipmentFullscreenUI();

    try {
      await deleteBillingDocumentStorage(existingBillingDocument, resourceType);
      deleteBillingDocumentForScope(monthValue, scopeKey, resourceType);
      persistStore({ skipLocalFileWrite: true });
      state.loadedSnapshot = createFormSnapshot();
      state.cleanStatusText = `${getBillingDocumentLabel(monthValue, resourceType, scopeKey)} 첨부 삭제 완료`;
      updateDirtyState();
      renderTeamMode();
      window.setTimeout(() => elements.teamSettlementAttachBtn?.focus(), 0);
    } catch (error) {
      console.error("Billing document delete failed.", error);
      const message = "청구서 삭제에 실패했습니다. 다시 시도해 주세요.";
      if (elements.saveStatus) {
        elements.saveStatus.textContent = message;
        elements.saveStatus.classList.add("is-dirty", "is-error");
      }
      window.alert(message);
    } finally {
      state.isBillingDocumentUploading = false;
      syncEquipmentFullscreenUI();
    }
    return;
  }

  const selectedFile = await requestBillingDocumentFile();
  if (!selectedFile) {
    syncEquipmentFullscreenUI();
    return;
  }

  state.isBillingDocumentUploading = true;
  syncEquipmentFullscreenUI();

  try {
    const billingDocument = await uploadBillingDocument(selectedFile, monthValue, scopeKey);
    setBillingDocumentForScope(
      monthValue,
      normalizeBillingDocument(monthValue, billingDocument, resourceType, scopeKey),
      scopeKey,
      resourceType
    );
    const existingSettlementEntry = getBillingSettlementEntry(monthValue, scopeKey);
    if (existingSettlementEntry) {
      setBillingSettlementEntryForScope(
        monthValue,
        {
          ...existingSettlementEntry,
          completed: false,
          updatedAt: new Date().toISOString(),
        },
        scopeKey
      );
    }
    persistStore({ skipLocalFileWrite: true });
    state.loadedSnapshot = createFormSnapshot();
    const uploadStatusSuffix =
      !supportsSharedServerPersistence() && billingDocument?.savedToLocalDirectory === false
        ? " (청구서 폴더 선택 필요)"
        : "";
    state.cleanStatusText = `${getBillingDocumentLabel(monthValue, resourceType, scopeKey)} 저장 완료${uploadStatusSuffix}`;
    updateDirtyState();
    renderTeamMode();
    focusTeamSettlementPrimaryInput();
  } catch (error) {
    console.error("Billing document upload failed.", error);
    if (String(error?.message || "") === "billing_document_pdf_only") {
      window.alert("PDF 파일만 첨부할 수 있습니다.");
      return;
    }
    const message = "청구서 저장에 실패했습니다. 다시 시도해 주세요.";
    if (elements.saveStatus) {
      elements.saveStatus.textContent = message;
      elements.saveStatus.classList.add("is-dirty", "is-error");
    }
    window.alert(message);
  } finally {
    state.isBillingDocumentUploading = false;
    syncEquipmentFullscreenUI();
  }
}

async function handleTeamSettlementDirectoryConnectClick(event) {
  event?.preventDefault();

  if (getCurrentMode() !== MODES.TEAM || !supportsBillingSettlementForCurrentResource()) {
    return;
  }

  const resourceType = getCurrentResourceType();
  try {
    const directoryHandle = await promptBillingDocumentDirectoryHandle(resourceType);
    if (!directoryHandle) {
      return;
    }

    state.cleanStatusText = `${getBillingDocumentDirectoryName(resourceType)} 폴더 연결 완료`;
    persistStore({ skipLocalFileWrite: true });
    state.loadedSnapshot = createFormSnapshot();
    updateDirtyState();
    renderTeamMode();
    window.setTimeout(() => {
      elements.teamSettlementAttachBtn?.focus();
    }, 0);
  } catch (error) {
    console.error("Billing document directory connect failed.", error);
    const message = "청구서 폴더 연결에 실패했습니다. 다시 시도해 주세요.";
    if (elements.saveStatus) {
      elements.saveStatus.textContent = message;
      elements.saveStatus.classList.add("is-dirty", "is-error");
    }
    window.alert(message);
  }
}
