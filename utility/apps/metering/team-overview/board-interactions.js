function handleTeamBoardClick(event) {
  if (
    event.target.closest(".team-direct-usage") ||
    event.target.closest("[data-direct-team-usage-display]") ||
    event.target.closest("[data-team-direct-usage-input]")
  ) {
    return;
  }

  const toggleButton = event.target.closest("[data-toggle-team-picker]");
  if (toggleButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleTeamPicker(toggleButton.dataset.toggleTeamPicker);
    return;
  }

  const pickButton = event.target.closest("[data-pick-team-equipment]");
  if (pickButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleTeamEquipmentSelection(pickButton.dataset.teamKey, pickButton.dataset.pickTeamEquipment);
    return;
  }

  const completeButton = event.target.closest("[data-complete-team-picker]");
  if (completeButton) {
    event.preventDefault();
    event.stopPropagation();
    addSelectedEquipmentToTeam(completeButton.dataset.completeTeamPicker);
    return;
  }

  const removeButton = event.target.closest("[data-remove-team-equipment]");
  if (removeButton) {
    event.preventDefault();
    event.stopPropagation();
    removeEquipmentFromTeam(removeButton.dataset.teamKey, removeButton.dataset.removeTeamEquipment);
    return;
  }

  const calendarToggleButton = event.target.closest("[data-toggle-team-calendar-equipment]");
  if (calendarToggleButton) {
    event.preventDefault();
    event.stopPropagation();
    toggleTeamCalendarEquipmentSelection(
      calendarToggleButton.dataset.teamKey,
      calendarToggleButton.dataset.toggleTeamCalendarEquipment
    );
    return;
  }

  if (event.target.closest(".team-picker")) {
    return;
  }

  const totalTeamSelectorButton = event.target.closest("[data-total-team-selector]");
  if (totalTeamSelectorButton) {
    event.preventDefault();
    event.stopPropagation();
    selectTeamCalendar(totalTeamSelectorButton.dataset.totalTeamSelector);
    return;
  }

  const board = event.target.closest("[data-team-board-key]");
  if (board) {
    event.preventDefault();
    updateSelectedTeams(board.dataset.teamBoardKey, event);
  }
}

function handleTeamDirectUsageDisplayDoubleClick(event) {
  const display = event.target.closest("[data-direct-team-usage-display]");
  if (!display) {
    return;
  }

  const teamKey = display.dataset.directTeamUsageDisplay;
  if (!canEditDirectTeamMonthlyUsage(teamKey)) {
    return;
  }

  const chip = display.closest("[data-direct-team-usage-chip]");
  if (!chip || chip.querySelector("[data-team-direct-usage-input]")) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.className = "team-assigned-chip-direct-input";
  input.dataset.teamDirectUsageInput = teamKey;
  input.dataset.teamDirectUsageSurface = "chip";
  input.placeholder = "사용량 입력";
  input.value = getDirectTeamMonthlyUsageInputValue(teamKey);
  input.setAttribute("aria-label", `${getTeamDisplayLabel(teamKey) || "선택 팀"} 월 사용량`);

  display.hidden = true;
  chip.appendChild(input);

  window.setTimeout(() => {
    input.focus();
    input.setSelectionRange(0, input.value.length);
  }, 0);
}

function sanitizeTeamDirectUsageInputValue(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function handleTeamDirectUsageInput(event) {
  const input = event.target.closest("[data-team-direct-usage-input]");
  if (!input) {
    return;
  }

  const sanitizedValue = sanitizeTeamDirectUsageInputValue(input.value);
  if (input.value !== sanitizedValue) {
    input.value = sanitizedValue;
  }
}

function commitTeamDirectUsageInput(input) {
  if (!input?.matches("[data-team-direct-usage-input]")) {
    return;
  }

  const teamKey = input.dataset.teamDirectUsageInput;
  if (!supportsDirectTeamMonthlyUsage(teamKey)) {
    return;
  }

  const sanitizedValue = sanitizeTeamDirectUsageInputValue(input.value);
  input.value = sanitizedValue ? formatWholeNumber(sanitizedValue) : "";
  setDirectTeamMonthlyUsage(teamKey, sanitizedValue === "" ? null : sanitizedValue);
  state.cleanStatusText = "팀별 월 사용량을 수정했습니다. 저장해 주세요.";
  renderTeamMode();
  renderCalendar();
  renderSummary();
  syncSelectedDatePresentation();
  updateDirtyState();
  updateActionState();
}

function handleTeamDirectUsageChange(event) {
  const input = event.target.closest("[data-team-direct-usage-input]");
  if (!input) {
    return;
  }

  commitTeamDirectUsageInput(input);
}

function handleTeamDirectUsageKeydown(event) {
  const input = event.target.closest("[data-team-direct-usage-input]");
  if (!input) {
    return;
  }

  if (event.key === "Escape" && input.dataset.teamDirectUsageSurface === "chip") {
    event.preventDefault();
    renderTeamMode();
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  input.blur();
}

function handleTeamDirectUsageFocusOut(event) {
  const input = event.target.closest("[data-team-direct-usage-input]");
  if (!input || input.dataset.teamDirectUsageSurface !== "chip") {
    return;
  }

  commitTeamDirectUsageInput(input);
}

function sanitizeTeamDirectAmountInputValue(value) {
  return String(value || "").replace(/[^\d]/g, "");
}

function handleTeamDirectAmountInput(event) {
  const input = event.target.closest("[data-team-direct-amount-input]");
  if (!input) {
    return;
  }

  const sanitizedValue = sanitizeTeamDirectAmountInputValue(input.value);
  if (input.value !== sanitizedValue) {
    input.value = sanitizedValue;
  }
}

function commitTeamDirectAmountInput(input) {
  if (!input?.matches("[data-team-direct-amount-input]")) {
    return;
  }

  const teamKey = input.dataset.teamDirectAmountInput;
  if (!supportsDirectTeamMonthlyAmount(teamKey)) {
    return;
  }

  const sanitizedValue = sanitizeTeamDirectAmountInputValue(input.value);
  input.value = sanitizedValue ? formatSettlementAmount(sanitizedValue) : "";
  setDirectTeamMonthlyAmount(teamKey, sanitizedValue === "" ? null : sanitizedValue);
  state.cleanStatusText = "팀별 월 금액을 수정했습니다. 저장해 주세요.";
  renderTeamMode();
  renderCalendar();
  renderSummary();
  syncSelectedDatePresentation();
  updateDirtyState();
  updateActionState();
}

function handleTeamDirectAmountChange(event) {
  const input = event.target.closest("[data-team-direct-amount-input]");
  if (!input) {
    return;
  }

  commitTeamDirectAmountInput(input);
}

function handleTeamDirectAmountKeydown(event) {
  const input = event.target.closest("[data-team-direct-amount-input]");
  if (!input) {
    return;
  }

  if (event.key !== "Enter") {
    return;
  }

  event.preventDefault();
  input.blur();
}

function toggleTeamPicker(teamKey) {
  if (!teamKey) {
    return;
  }

  if (state.openTeamPickerKey === teamKey) {
    state.openTeamPickerKey = "";
    delete state.teamPickerSelections[teamKey];
  } else {
    state.openTeamPickerKey = teamKey;
    state.teamPickerSelections[teamKey] = [];
  }

  renderTeamMode();
}

function toggleTeamEquipmentSelection(teamKey, equipmentId) {
  if (!teamKey || !equipmentId) {
    return;
  }

  const availableIds = new Set(getAvailableEquipmentOptionsForTeam(teamKey).map((item) => item.id));
  if (!availableIds.has(equipmentId)) {
    return;
  }

  const nextSelection = new Set(getTeamPickerSelections(teamKey));
  if (nextSelection.has(equipmentId)) {
    nextSelection.delete(equipmentId);
  } else {
    nextSelection.add(equipmentId);
  }

  state.teamPickerSelections[teamKey] = state.store.equipmentItems
    .map((item) => item.id)
    .filter((itemId) => nextSelection.has(itemId));

  renderTeamMode();
}

function addSelectedEquipmentToTeam(teamKey) {
  const selectedEquipmentIds = getTeamPickerSelections(teamKey);
  if (!teamKey || !selectedEquipmentIds.length) {
    return;
  }

  selectedEquipmentIds.forEach((equipmentId) => {
    TEAM_GROUPS.forEach((team) => {
      state.store.teamAssignments[team.key] = (state.store.teamAssignments[team.key] || []).filter(
        (itemId) => itemId !== equipmentId
      );
    });
  });

  const assignedIds = new Set(getTeamAssignedEquipmentIds(teamKey));
  selectedEquipmentIds.forEach((equipmentId) => {
    assignedIds.add(equipmentId);
  });

  state.store.teamAssignments[teamKey] = state.store.equipmentItems
    .map((item) => item.id)
    .filter((equipmentId) => {
      if (!assignedIds.has(equipmentId)) {
        return false;
      }

      return isTeamAssignableEquipment(getEquipmentItem(equipmentId), teamKey);
    });
  state.openTeamPickerKey = "";
  delete state.teamPickerSelections[teamKey];

  if (getSelectedTeamKeys().includes(teamKey)) {
    state.teamCalendarSelections[teamKey] = getTeamCalendarSelectableIds(teamKey);
  }

  persistStore();
  renderEquipmentFieldInputs();
  renderTeamMode();
  renderCalendar();
  state.loadedSnapshot = createFormSnapshot();
  updateDirtyState();
}

function removeEquipmentFromTeam(teamKey, equipmentId) {
  state.store.teamAssignments[teamKey] = (state.store.teamAssignments[teamKey] || []).filter(
    (itemId) => itemId !== equipmentId
  );
  state.openTeamPickerKey = "";
  delete state.teamPickerSelections[teamKey];

  persistStore();
  renderEquipmentFieldInputs();
  renderTeamMode();
  renderCalendar();
  state.loadedSnapshot = createFormSnapshot();
  updateDirtyState();
}
