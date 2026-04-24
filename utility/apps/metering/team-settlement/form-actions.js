function handleTeamSettlementFieldInput(event) {
  const input = event.target.closest("input[data-billing-settlement-field]");
  if (!input) {
    return;
  }

  const monthValue = normalizeMonthValue(state.currentMonth);
  if (!monthValue) {
    return;
  }

  const fieldKey = normalizeText(input.dataset.billingSettlementField);
  const scopeKey = getCurrentBillingSettlementScope();
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  const autoCalculatedFieldKeys = getBillingSettlementAutoCalculatedFieldKeySet(
    resourceType,
    scopeKey
  );
  const zeroDefaultFieldKeys = getBillingSettlementZeroDefaultFieldKeys(
    resourceType,
    scopeKey
  );
  if (!BILLING_SETTLEMENT_FIELD_KEYS.has(fieldKey)) {
    return;
  }

  if (autoCalculatedFieldKeys.has(fieldKey)) {
    input.value = getBillingSettlementEntry(monthValue, scopeKey)?.fields?.[fieldKey] || "";
    return;
  }

  const currentEntry = getBillingSettlementEntry(monthValue, scopeKey);
  const nextRawFields = {
    ...(currentEntry?.fields || {}),
  };
  const nextValue = normalizeBillingSettlementStoredValue(
    fieldKey,
    input.value,
    resourceType,
    scopeKey
  );

  if (nextValue) {
    nextRawFields[fieldKey] = nextValue;
  } else {
    delete nextRawFields[fieldKey];
  }

  const nextFields = resolveBillingSettlementFields(nextRawFields, monthValue, scopeKey);

  if (Object.keys(nextFields).length) {
    setBillingSettlementEntryForScope(
      monthValue,
      {
        monthValue,
        fields: nextFields,
        completed: false,
        updatedAt: new Date().toISOString(),
      },
      scopeKey
    );
  } else {
    deleteBillingSettlementEntryForScope(monthValue, scopeKey);
  }

  state.cleanStatusText = "정산 값을 수정했습니다. 저장해 주세요.";
  updateDirtyState();

  if (!nextValue) {
    if (zeroDefaultFieldKeys.includes(fieldKey) && nextFields[fieldKey]) {
      input.value = formatBillingSettlementFieldDisplayValue(
        fieldKey,
        nextFields[fieldKey],
        resourceType,
        scopeKey
      );
    } else {
      input.value = "";
    }
  } else {
    input.value = formatBillingSettlementFieldDisplayValue(
      fieldKey,
      nextFields[fieldKey] ?? nextValue,
      resourceType,
      scopeKey
    );
  }

  autoCalculatedFieldKeys.forEach((autoCalculatedFieldKey) => {
    const calculatedInput = elements.teamSettlementFields?.querySelector(
      `input[data-billing-settlement-field="${autoCalculatedFieldKey}"]`
    );
    if (calculatedInput) {
      calculatedInput.value = formatBillingSettlementFieldDisplayValue(
        autoCalculatedFieldKey,
        nextFields[autoCalculatedFieldKey] || "",
        resourceType,
        scopeKey,
        true
      );
    }
  });

  renderTeamTotals();
  renderTeamBoards();
  syncTeamSettlementCompletionButtonState();
}

function handleTeamSettlementFieldClick(event) {
  const scopeToggle = event.target.closest("[data-team-settlement-scope-toggle]");
  if (scopeToggle && elements.teamSettlementFields?.contains(scopeToggle)) {
    event.preventDefault();
    const nextScopeKey = normalizeBillingSettlementScope(
      scopeToggle.dataset.teamSettlementScopeToggle
    );
    if (nextScopeKey && nextScopeKey !== getCurrentBillingSettlementScope()) {
      state.activeTeamSettlementScope = nextScopeKey;
      renderTeamMode();
      focusTeamSettlementPrimaryInput();
    }
    return;
  }

  const toggleButton = event.target.closest("button[data-billing-settlement-formula-toggle]");
  if (!toggleButton || !elements.teamSettlementFields?.contains(toggleButton)) {
    return;
  }

  event.preventDefault();
  const fieldKey = normalizeText(toggleButton.dataset.billingSettlementFormulaToggle);
  const formulaPanel = elements.teamSettlementFields.querySelector(
    `[data-billing-settlement-formula="${fieldKey}"]`
  );
  if (!fieldKey || !formulaPanel) {
    return;
  }

  const shouldOpen = formulaPanel.classList.contains("is-hidden");

  elements.teamSettlementFields
    .querySelectorAll("[data-billing-settlement-formula]")
    .forEach((panel) => panel.classList.add("is-hidden"));
  elements.teamSettlementFields
    .querySelectorAll("[data-billing-settlement-formula-toggle]")
    .forEach((button) => {
      button.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
    });

  formulaPanel.classList.toggle("is-hidden", !shouldOpen);
  toggleButton.classList.toggle("is-open", shouldOpen);
  toggleButton.setAttribute("aria-expanded", String(shouldOpen));
}

function getBillingSettlementFieldLabel(fieldKey) {
  const scopeKey = getCurrentBillingSettlementScope();
  const resourceType = getBillingSettlementResourceType(scopeKey, getCurrentResourceType());
  return (
    getBillingSettlementFields(resourceType, scopeKey).find(
      (field) => field.key === fieldKey
    )?.label || fieldKey
  );
}

function handleTeamSettlementCompleteClick(event) {
  event?.preventDefault();

  if (getCurrentMode() !== MODES.TEAM) {
    return;
  }

  const monthValue = normalizeMonthValue(state.currentMonth);
  const scopeKey = getCurrentBillingSettlementScope();
  if (!monthValue) {
    return;
  }

  const completionState = getBillingSettlementCompletionState(monthValue, scopeKey);
  if (!completionState.entry?.fields || !Object.keys(completionState.entry.fields).length) {
    window.alert("정산값을 먼저 입력해 주세요");
    return;
  }

  if (completionState.entry.completed) {
    setBillingSettlementEntryForScope(
      monthValue,
      {
        monthValue,
        fields: completionState.entry.fields,
        completed: false,
        updatedAt: new Date().toISOString(),
      },
      scopeKey
    );
    state.cleanStatusText = "정산 완료를 삭제했습니다.";
  } else {
    if (completionState.missingFieldKeys.length) {
      const missingLabels = completionState.missingFieldKeys.map(getBillingSettlementFieldLabel);
      window.alert(`다음 정산 항목을 확인해 주세요.\n${missingLabels.join("\n")}`);
      return;
    }

    setBillingSettlementEntryForScope(
      monthValue,
      {
        monthValue,
        fields: completionState.fields,
        completed: true,
        updatedAt: new Date().toISOString(),
      },
      scopeKey
    );
    state.cleanStatusText = "정산 완료 처리했습니다.";
  }

  state.cleanStatusText = completionState.entry.completed
    ? "정산 완료 해제를 반영했습니다. 저장해 주세요."
    : "정산 완료 상태를 반영했습니다. 저장해 주세요.";
  updateDirtyState();
  renderTeamMode();
}
