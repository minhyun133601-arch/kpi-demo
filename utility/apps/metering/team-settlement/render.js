function createTeamSettlementScopeToggleElement(
  activeScopeKey = getCurrentBillingSettlementScope()
) {
  const definitions = getBillingSettlementScopeDefinitions();
  if (definitions.length < 2) {
    return null;
  }

  const wrap = document.createElement("div");
  wrap.className = "team-settlement-scope-toggle";
  wrap.setAttribute("role", "tablist");
  wrap.setAttribute("aria-label", "정산 구분 선택");

  definitions.forEach((definition) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "team-settlement-scope-chip";
    button.dataset.teamSettlementScopeToggle = definition.key;
    button.classList.toggle("is-active", definition.key === activeScopeKey);
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(definition.key === activeScopeKey));
    button.textContent = definition.label;
    wrap.appendChild(button);
  });

  return wrap;
}

function ensureTeamSettlementDirectoryConnectButton() {
  const actions = elements.teamSettlementAttachBtn?.parentElement;
  if (!actions || !elements.teamSettlementAttachBtn) {
    return null;
  }

  let button = actions.querySelector("[data-team-settlement-directory-connect]");
  if (!button) {
    button = document.createElement("button");
    button.type = "button";
    button.className = "team-settlement-attach-btn";
    button.dataset.teamSettlementDirectoryConnect = "true";
    button.textContent = "폴더";
    button.addEventListener("click", handleTeamSettlementDirectoryConnectClick);
    actions.insertBefore(button, elements.teamSettlementAttachBtn);
  }

  return button;
}

function createPlantBSettlementMonthlyUsageSection(
  monthValue = state.currentMonth,
  resourceType = getCurrentResourceType()
) {
  const groupWrap = document.createElement("section");
  groupWrap.className = "team-settlement-group";

  const groupLabel = document.createElement("p");
  groupLabel.className = "team-settlement-group-label";
  groupLabel.textContent = "Plant B 기준";

  const groupGrid = document.createElement("div");
  groupGrid.className = "team-settlement-group-grid";

  const fieldWrap = document.createElement("label");
  fieldWrap.className = "team-settlement-field";

  const labelRow = document.createElement("div");
  labelRow.className = "team-settlement-label-row";

  const label = document.createElement("span");
  label.className = "team-settlement-label";
  label.textContent = "월 사용량";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.className = "team-settlement-input";
  input.dataset.teamDirectUsageInput = TEAM_01_01_KEY;
  input.dataset.teamDirectUsageSurface = "settlement";
  input.placeholder = "사용량 입력";
  input.value = getDirectTeamMonthlyUsageInputValue(TEAM_01_01_KEY, monthValue, resourceType);
  input.setAttribute(
    "aria-label",
    normalizeResourceType(resourceType) === RESOURCE_TYPES.GAS
      ? "Plant B 가스 월 사용량"
      : "Plant B 전력 총량 월 사용량"
  );
  input.title =
    normalizeResourceType(resourceType) === RESOURCE_TYPES.GAS
      ? "Plant B 가스 정산 기준 월 사용량"
      : "Plant B 정산 기준 월 사용량";

  labelRow.appendChild(label);
  fieldWrap.append(labelRow, input);
  groupGrid.appendChild(fieldWrap);
  groupWrap.append(groupLabel, groupGrid);
  return groupWrap;
}

function createWasteSettlementMonthlyUsageSection(
  monthValue = state.currentMonth,
  scopeKey = getCurrentBillingSettlementScope(RESOURCE_TYPES.WASTE)
) {
  const teamKey = getWasteBillingSettlementTeamKeyForScope(scopeKey);
  if (!teamKey) {
    return document.createDocumentFragment();
  }

  const groupWrap = document.createElement("section");
  groupWrap.className = "team-settlement-group";

  const groupLabel = document.createElement("p");
  groupLabel.className = "team-settlement-group-label";
  groupLabel.textContent = `${getBillingSettlementScopeLabel(scopeKey, RESOURCE_TYPES.WASTE)} 기준`;

  const groupGrid = document.createElement("div");
  groupGrid.className = "team-settlement-group-grid";

  const fieldWrap = document.createElement("label");
  fieldWrap.className = "team-settlement-field";

  const labelRow = document.createElement("div");
  labelRow.className = "team-settlement-label-row";

  const label = document.createElement("span");
  label.className = "team-settlement-label";
  label.textContent = "월 사용량";

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.className = "team-settlement-input";
  input.dataset.teamDirectUsageInput = teamKey;
  input.dataset.teamDirectUsageSurface = "settlement";
  input.placeholder = "사용량 입력";
  input.value = getDirectTeamMonthlyUsageInputValue(teamKey, monthValue, RESOURCE_TYPES.WASTE);
  input.setAttribute("aria-label", `${getTeamDisplayLabel(teamKey)} 폐수 월 사용량`);
  input.title = `${getTeamDisplayLabel(teamKey)} 폐수 정산 기준 월 사용량`;

  labelRow.appendChild(label);
  fieldWrap.append(labelRow, input);
  groupGrid.appendChild(fieldWrap);
  groupWrap.append(groupLabel, groupGrid);
  return groupWrap;
}

function renderTeamSettlementSection() {
  if (
    !elements.teamSettlementSection ||
    !elements.teamSettlementFields ||
    !elements.teamSettlementFileName
  ) {
    return;
  }

  if (!supportsBillingSettlementForCurrentResource()) {
    elements.teamSettlementSection.classList.add("is-hidden");
    elements.teamSettlementFileName.textContent = "";
    elements.teamSettlementFileName.title = "";
    elements.teamSettlementFields.innerHTML = "";
    syncTeamSettlementCompletionButtonState(state.currentMonth, false);
    return;
  }

  const monthValue = normalizeMonthValue(state.currentMonth);
  const scopeKey = getCurrentBillingSettlementScope();
  const scopeTitle = getBillingSettlementScopeTitle(scopeKey);
  const resourceType = getCurrentResourceType();
  const settlementEntry = getBillingSettlementEntry(monthValue, scopeKey);
  const supportsBillingDocument = supportsBillingDocumentForResource(resourceType);
  const billingDocument = supportsBillingDocument
    ? getBillingDocumentForMonth(monthValue, scopeKey)
    : null;
  const billingDirectoryName = supportsBillingDocument
    ? getBillingDocumentDirectoryName(resourceType)
    : "";
  const hasBillingDocument = supportsBillingDocument && Boolean(billingDocument?.fileName);
  const shouldShow = Boolean(
    monthValue &&
      (!isElectricResourceType(resourceType) || calculateTotalPowerMonthlyUsage() !== null) &&
      state.isTeamSettlementPanelOpen
  );

  elements.teamSettlementSection.classList.toggle("is-hidden", !shouldShow);
  elements.teamSettlementFileName.textContent = shouldShow
    ? supportsBillingDocument
      ? hasBillingDocument
        ? `${scopeTitle} · ${billingDirectoryName} · ${billingDocument.fileName}`
        : `${scopeTitle} · ${billingDirectoryName} · 청구서 미첨부`
      : `${scopeTitle} · 수기 입력`
    : "";
  elements.teamSettlementFileName.title = elements.teamSettlementFileName.textContent;
  const directoryConnectBtn = ensureTeamSettlementDirectoryConnectButton();
  if (directoryConnectBtn) {
    const supportsDirectoryPersistence = supportsBillingDocumentDirectoryPersistence();
    const hasConnectedDirectory = Boolean(localFilePersistenceState.billingDocumentDirectoryHandle);
    directoryConnectBtn.classList.toggle(
      "is-hidden",
      !shouldShow || !supportsBillingDocument || !supportsDirectoryPersistence
    );
    directoryConnectBtn.disabled =
      !shouldShow ||
      !supportsBillingDocument ||
      state.isBillingDocumentUploading ||
      hasConnectedDirectory;
    directoryConnectBtn.textContent = hasConnectedDirectory ? "연결됨" : "폴더";
    directoryConnectBtn.title = hasConnectedDirectory
      ? `${billingDirectoryName} 폴더 연결 완료`
      : `${billingDirectoryName} 폴더 연결`;
  }
  if (elements.teamSettlementAttachBtn) {
    elements.teamSettlementAttachBtn.classList.toggle(
      "is-hidden",
      !shouldShow || !supportsBillingDocument
    );
    elements.teamSettlementAttachBtn.disabled =
      !shouldShow || !supportsBillingDocument || state.isBillingDocumentUploading;
    elements.teamSettlementAttachBtn.textContent = hasBillingDocument ? "삭제" : "첨부";

    if (!shouldShow || !supportsBillingDocument) {
      elements.teamSettlementAttachBtn.title = "청구서 첨부";
    } else if (state.isBillingDocumentUploading) {
      elements.teamSettlementAttachBtn.title = "청구서를 처리하고 있습니다.";
    } else if (billingDocument?.fileName) {
      elements.teamSettlementAttachBtn.title = `${scopeTitle} · ${billingDocument.fileName} 삭제`;
    } else {
      elements.teamSettlementAttachBtn.title = `${getBillingDocumentLabel(
        monthValue,
        getCurrentResourceType(),
        scopeKey
      )} 첨부`;
    }
  }
  if (elements.teamSettlementPreviewBtn) {
    elements.teamSettlementPreviewBtn.classList.toggle(
      "is-hidden",
      !shouldShow || !supportsBillingDocument || !hasBillingDocument
    );
    elements.teamSettlementPreviewBtn.disabled =
      !shouldShow || !supportsBillingDocument || !hasBillingDocument;
    elements.teamSettlementPreviewBtn.title = hasBillingDocument
      ? `${scopeTitle} · ${billingDocument.fileName} 미리보기`
      : "청구서 미리보기";
  }
  if (elements.teamSettlementOpenBtn) {
    elements.teamSettlementOpenBtn.classList.toggle(
      "is-hidden",
      !shouldShow || !supportsBillingDocument || !hasBillingDocument
    );
    elements.teamSettlementOpenBtn.disabled =
      !shouldShow || !supportsBillingDocument || !hasBillingDocument;
    elements.teamSettlementOpenBtn.title = hasBillingDocument
      ? `${scopeTitle} · ${billingDocument.fileName} 다운로드`
      : "청구서 다운로드";
  }
  elements.teamSettlementFields.innerHTML = "";
  syncTeamSettlementCompletionButtonState(monthValue, shouldShow, scopeKey);

  if (!shouldShow) {
    return;
  }

  const fragment = document.createDocumentFragment();
  const scopeToggle = createTeamSettlementScopeToggleElement(scopeKey);
  if (scopeToggle) {
    fragment.appendChild(scopeToggle);
  }
  if (isWasteResourceType(resourceType)) {
    fragment.appendChild(createWasteSettlementMonthlyUsageSection(monthValue, scopeKey));
  } else if (
    (isElectricResourceType(resourceType) && scopeKey === "plantB") ||
    (isGasResourceType(resourceType) && scopeKey === GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY)
  ) {
    fragment.appendChild(createPlantBSettlementMonthlyUsageSection(monthValue, resourceType));
  }
  if (!settlementEntry) {
    const status = document.createElement("p");
    status.className = "team-settlement-status";
    const availableMonthRange = getBillingSettlementAvailableMonthRangeText();
    status.textContent = availableMonthRange
      ? `${scopeTitle} · ${monthValue} 정산값이 없습니다. 저장된 월: ${availableMonthRange}`
      : `${scopeTitle} · ${monthValue} 정산값이 없습니다.`;
    fragment.appendChild(status);
  }
  const settlementFields = getBillingSettlementFields(resourceType, scopeKey);
  const autoCalculatedFieldKeys = getBillingSettlementAutoCalculatedFieldKeySet(
    resourceType,
    scopeKey
  );
  const settlementGroups = [
    {
      label: "직접 입력",
      className: "team-settlement-group",
      fields: settlementFields.filter((field) => !autoCalculatedFieldKeys.has(field.key)),
    },
    {
      label: "자동 계산",
      className: "team-settlement-group is-auto",
      fields: settlementFields.filter((field) => autoCalculatedFieldKeys.has(field.key)),
    },
  ];

  settlementGroups.forEach((group) => {
    if (!group.fields.length) {
      return;
    }

    const groupWrap = document.createElement("section");
    groupWrap.className = group.className;

    const groupLabel = document.createElement("p");
    groupLabel.className = "team-settlement-group-label";
    groupLabel.textContent = group.label;
    groupWrap.appendChild(groupLabel);

    const groupGrid = document.createElement("div");
    groupGrid.className = "team-settlement-group-grid";

    group.fields.forEach((field) => {
      const fieldWrap = document.createElement("label");
      fieldWrap.className = "team-settlement-field";
      const isAutoCalculated = autoCalculatedFieldKeys.has(field.key);
      const formulaGuide = getBillingSettlementFormulaGuide(field.key, resourceType, scopeKey);
      fieldWrap.classList.toggle("is-auto", isAutoCalculated);

      const label = document.createElement("span");
      label.className = "team-settlement-label";
      label.textContent = field.label;

      const labelRow = document.createElement("div");
      labelRow.className = "team-settlement-label-row";
      labelRow.appendChild(label);

      if (isAutoCalculated && formulaGuide) {
        const formulaToggle = document.createElement("button");
        formulaToggle.type = "button";
        formulaToggle.className = "team-settlement-formula-toggle";
        formulaToggle.dataset.billingSettlementFormulaToggle = field.key;
        formulaToggle.setAttribute("aria-expanded", "false");
        formulaToggle.title = `${field.label} 산식 보기`;
        formulaToggle.textContent = "식";
        labelRow.appendChild(formulaToggle);
      }

      const input = document.createElement("input");
      input.type = "text";
      input.inputMode = "decimal";
      input.className = "team-settlement-input";
      input.dataset.billingSettlementField = field.key;
      input.value = formatBillingSettlementFieldDisplayValue(
        field.key,
        settlementEntry?.fields?.[field.key] || "",
        resourceType,
        scopeKey,
        isAutoCalculated
      );

      if (isAutoCalculated) {
        input.readOnly = true;
        input.title = "자동 계산";
        input.setAttribute("aria-readonly", "true");
        input.placeholder = "자동 계산";
        input.classList.add("is-auto");
      }

      fieldWrap.append(labelRow, input);
      if (isAutoCalculated && formulaGuide) {
        const formulaPanel = document.createElement("div");
        formulaPanel.className = "team-settlement-formula is-hidden";
        formulaPanel.dataset.billingSettlementFormula = field.key;
        formulaPanel.textContent = formulaGuide;
        fieldWrap.appendChild(formulaPanel);
      }

      groupGrid.appendChild(fieldWrap);
    });

    groupWrap.appendChild(groupGrid);
    fragment.appendChild(groupWrap);
  });

  elements.teamSettlementFields.appendChild(fragment);
}

function syncTeamSettlementCompletionButtonState(
  monthValue = state.currentMonth,
  shouldShow = !elements.teamSettlementSection?.classList.contains("is-hidden"),
  scopeKey = getCurrentBillingSettlementScope()
) {
  if (!elements.teamSettlementCompleteBtn) {
    return;
  }

  const scopeTitle = getBillingSettlementScopeTitle(scopeKey);
  const completionState = getBillingSettlementCompletionState(monthValue, scopeKey);
  const hasAnyFields = Boolean(completionState.entry?.fields && Object.keys(completionState.entry.fields).length);
  const isCompleted = Boolean(completionState.entry?.completed) && !completionState.missingFieldKeys.length;
  const missingLabels = completionState.missingFieldKeys.map(getBillingSettlementFieldLabel);

  elements.teamSettlementCompleteBtn.classList.toggle("is-hidden", !shouldShow);
  elements.teamSettlementCompleteBtn.classList.toggle("is-completed", isCompleted);
  elements.teamSettlementCompleteBtn.disabled = !shouldShow || !hasAnyFields;
  elements.teamSettlementCompleteBtn.textContent = isCompleted ? "취소" : "완료";

  if (!shouldShow) {
    elements.teamSettlementCompleteBtn.title = `${scopeTitle} 완료`;
    return;
  }

  if (!hasAnyFields) {
    elements.teamSettlementCompleteBtn.title = `${scopeTitle} 값을 먼저 입력해 주세요`;
    return;
  }

  if (isCompleted) {
    elements.teamSettlementCompleteBtn.title = `${scopeTitle} 완료 상태입니다.`;
    return;
  }

  if (missingLabels.length) {
    elements.teamSettlementCompleteBtn.title = `${scopeTitle} 확인 필요: ${missingLabels.join(", ")}`;
    return;
  }

  elements.teamSettlementCompleteBtn.title = `${scopeTitle} 값 검토 후 완료 처리`;
}
