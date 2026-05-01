function syncOpenTeamPickerSelectionState(currentTeamGroups = getCurrentTeamGroups()) {
  if (
    state.openTeamPickerKey &&
    !currentTeamGroups.some((team) => team.key === state.openTeamPickerKey)
  ) {
    state.openTeamPickerKey = "";
  }

  if (!state.openTeamPickerKey) {
    return;
  }

  const availableIds = new Set(
    getAvailableEquipmentOptionsForTeam(state.openTeamPickerKey).map((item) => item.id)
  );
  state.teamPickerSelections[state.openTeamPickerKey] = getTeamPickerSelections(
    state.openTeamPickerKey
  ).filter((equipmentId) => availableIds.has(equipmentId));
}

function createTeamPickerElement(team) {
  const availableItems = getAvailableEquipmentOptionsForTeam(team?.key);
  const selectedItems = getTeamPickerSelections(team?.key);
  const picker = document.createElement("div");
  picker.className = "team-picker";

  const pickerHead = document.createElement("div");
  pickerHead.className = "team-picker-head";

  const pickerDraft = document.createElement("span");
  pickerDraft.className = "team-picker-draft";
  pickerDraft.textContent = selectedItems.length ? `${selectedItems.length}개 선택` : "선택 0";

  const confirmButton = document.createElement("button");
  confirmButton.type = "button";
  confirmButton.className = "team-picker-confirm";
  confirmButton.dataset.completeTeamPicker = team?.key || "";
  confirmButton.disabled = selectedItems.length === 0;
  confirmButton.textContent = "완료";

  pickerHead.append(pickerDraft, confirmButton);
  picker.appendChild(pickerHead);

  if (availableItems.length) {
    availableItems.forEach((item) => {
      const optionButton = document.createElement("button");
      optionButton.type = "button";
      optionButton.className = "team-picker-option";
      optionButton.classList.toggle("is-selected", selectedItems.includes(item.id));
      optionButton.dataset.teamKey = team?.key || "";
      optionButton.dataset.pickTeamEquipment = item.id;
      optionButton.appendChild(
        createIconLabel(getEquipmentDisplayLabel(item), team?.iconKey || "equipment", {
          containerClass: "team-picker-option-content",
          textClass: "team-picker-option-text",
          iconClass: "category-icon team-picker-icon",
          trailingIconKey: getResourceDuplicateBadgeIconKeyForEquipment(item),
        })
      );
      picker.appendChild(optionButton);
    });
  } else {
    const emptyPicker = document.createElement("p");
    emptyPicker.className = "team-picker-empty";
    emptyPicker.textContent = "없음";
    picker.appendChild(emptyPicker);
  }

  return picker;
}

function isSharedCompressorVirtualEquipmentId(equipmentId) {
  return equipmentId === SHARED_COMPRESSOR_VIRTUAL_ID;
}

function shouldHideStandaloneTeamBoard(teamKey, resourceType = getCurrentResourceType()) {
  return Boolean(
    isElectricResourceType(resourceType) &&
      teamKey === TEAM_01_01_KEY &&
      !getSelectedTeamKeys().includes(teamKey)
  );
}

function resolveElectricSummaryDirectTeamKey(teamKey) {
  if (!isElectricResourceType()) {
    return "";
  }

  if (
    teamKey === TEAM_01_01_KEY ||
    teamKey === TOTAL_POWER_TEAM_KEY ||
    teamKey === PLANT_B_POWER_TEAM_KEY
  ) {
    return TEAM_01_01_KEY;
  }

  return "";
}

function getDirectTeamUsageChipDescriptor(teamKey, monthValue = state.currentMonth) {
  const directTeamKey = resolveElectricSummaryDirectTeamKey(teamKey);
  if (!directTeamKey) {
    return null;
  }

  const directTeam = getTeamGroup(directTeamKey);
  const amountText = getTeamAmountText(directTeamKey, {}, monthValue);
  const detailText = canEditDirectTeamMonthlyUsage(directTeamKey)
    ? "더블클릭해 월 사용량 수정"
    : "Plant B 정산에서 월 사용량과 금액을 수정합니다.";
  return {
    id: `direct_usage_${directTeamKey}`,
    selectionId: "",
    label: directTeam?.label || "Line Alpha",
    iconKey: directTeam?.iconKey || "drying",
    usageText: formatDailyUsage(getDirectTeamMonthlyUsage(directTeamKey, monthValue)),
    chargeText: amountText,
    detailText,
    removable: false,
    isDirectTeamUsage: true,
    teamKey: directTeamKey,
    sourceTeamKey: teamKey,
  };
}

function getTeamPickerSelections(teamKey) {
  return Array.isArray(state.teamPickerSelections[teamKey]) ? state.teamPickerSelections[teamKey] : [];
}
