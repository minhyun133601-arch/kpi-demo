function getCurrentMode() {
  if (!supportsTeamModeForCurrentResource()) {
    return MODES.EQUIPMENT;
  }

  return state.store.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT;
}

function getCurrentEntry() {
  if (!state.selectedDate) {
    return null;
  }

  return state.store.equipmentEntries[state.selectedDate] || null;
}

function hasEntryValue(entry) {
  if (!entry) {
    return false;
  }

  return Object.values(entry.values || {}).some((value) => String(value).trim() !== "");
}

function hasEntryData(entry) {
  if (!entry) {
    return false;
  }

  return hasEntryValue(entry) || Boolean(getEntryDayStatus(entry)) || hasEntryStatus(entry);
}

function hasCalendarDraftHighlight(entry) {
  return hasEntryValue(entry);
}

function hasCurrentMonthFirstDayEntryValue() {
  if (!state.currentMonth) {
    return false;
  }

  return hasEntryValue(state.store.equipmentEntries[`${state.currentMonth}-01`]);
}

function getLatestEntryDateInMonth(monthValue) {
  return Object.keys(state.store.equipmentEntries)
    .filter(
      (dateString) =>
        dateString.startsWith(monthValue) &&
        !isFutureDate(dateString) &&
        hasEntryData(state.store.equipmentEntries[dateString])
    )
    .sort()
    .pop();
}

function getLatestAvailableDate(monthValue) {
  if (monthValue === getMonthValue(today())) {
    return formatDate(today());
  }

  const [year, month] = monthValue.split("-").map(Number);
  return `${monthValue}-${String(new Date(year, month, 0).getDate()).padStart(2, "0")}`;
}

function getHeroDescription(mode) {
  if (mode === MODES.TEAM) {
    return "";
  }

  return RESOURCE_HERO_DESCRIPTIONS[normalizeResourceType(getCurrentResourceType())] || "";
}

function getSelectedDateDescription(mode) {
  if (mode === MODES.TEAM) {
    const selectedTeamKeys = getSelectedTeamKeys();
    if (!selectedTeamKeys.length) {
      return "";
    }

    if (selectedTeamKeys.length === 1) {
      const team = getTeamGroup(selectedTeamKeys[0]);
      const teamDisplayLabel = getTeamDisplayLabel(team) || "선택 팀";
      if (supportsDirectTeamMonthlyUsage(selectedTeamKeys[0])) {
        return `${teamDisplayLabel} 월 사용량 직접 입력 기준입니다.`;
      }
      const assignedIds = getTeamAssignedEquipmentIds(selectedTeamKeys[0]);
      const selectedIds = getTeamCalendarSelection(selectedTeamKeys[0]);

      if (!assignedIds.length) {
        return `${teamDisplayLabel}에 배정된 설비가 없습니다.`;
      }

      if (!selectedIds.length) {
        return `${teamDisplayLabel}에서 달력 합계에 포함된 설비가 없습니다.`;
      }

      const calculableIds = selectedIds.filter((equipmentId) => {
        const equipment = state.store.equipmentItems.find((item) => item.id === equipmentId);
        return !isUsageCalculationExcludedEquipment(equipment);
      });

      if (!calculableIds.length) {
        return "";
      }

      if (selectedIds.length === assignedIds.length) {
        return "";
      }

      return `${teamDisplayLabel} 설비 ${selectedIds.length}개 기준입니다.`;
    }

    return `선택 팀 ${selectedTeamKeys.length}개 합산 기준입니다.`;
  }

  const selectedEquipmentIds = getSelectedEquipmentIds();
  if (!selectedEquipmentIds.length) {
    return "";
  }

  if (isGasResourceType() && selectedEquipmentIds.length > 1) {
    return `선택 항목 ${selectedEquipmentIds.length}개 합산 기준입니다.`;
  }

  if (selectedEquipmentIds.length === 1) {
    const equipment = getEquipmentItem(selectedEquipmentIds[0]);
    if (isOtherEquipment(equipment)) {
      return "기타 사용량 기준입니다.";
    }

    if (isUsageCalculationExcludedEquipment(equipment)) {
      return "";
    }

    return equipment ? `${getEquipmentDisplayLabel(equipment)} 기준입니다.` : "";
  }

  const calculableIds = selectedEquipmentIds.filter((equipmentId) => {
    const equipment = state.store.equipmentItems.find((item) => item.id === equipmentId);
    return !isUsageCalculationExcludedEquipment(equipment);
  });

  if (!calculableIds.length) {
    return "";
  }

  return `선택 설비 ${selectedEquipmentIds.length}개 합산 기준입니다.`;
}

function getSelectedDateEnteredEquipmentCount() {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate) {
    return 0;
  }

  return getEquipmentInputs().filter((input) => {
    const equipment = getEquipmentItem(input.dataset.fieldKey);
    if (!equipment || isHiddenEquipmentFieldCard(equipment)) {
      return false;
    }

    return normalizeEntryValue(input.value) !== "";
  }).length;
}

function getSelectedDateErrorText(validationIssues = getCurrentEquipmentReadingValidationIssues()) {
  if (getCurrentMode() !== MODES.EQUIPMENT || !state.selectedDate || !validationIssues.length) {
    return "";
  }

  return getEquipmentReadingValidationSummaryText(validationIssues);
}

function syncSelectedDateHeaderStatus(validationIssues = getCurrentEquipmentReadingValidationIssues()) {
  if (!elements.selectedDateError) {
    return;
  }

  const errorText = getSelectedDateErrorText(validationIssues);
  elements.selectedDateError.textContent = errorText;
  elements.selectedDateError.classList.toggle("is-hidden", !errorText);
}

function renderEquipmentItemCount() {
  const count = state.store.equipmentItems.filter((item) => !isHiddenEquipmentFieldCard(item)).length;
  elements.equipmentItemCount.textContent = formatEquipmentItemCountText(count);

  if (!elements.selectedDateEquipmentCount) {
    return;
  }

  const showSelectedDateCount =
    getCurrentMode() === MODES.EQUIPMENT && Boolean(state.selectedDate) && count > 0;
  const selectedDateCount = showSelectedDateCount ? getSelectedDateEnteredEquipmentCount() : 0;
  elements.selectedDateEquipmentCount.textContent = `입력 ${selectedDateCount}개`;
  elements.selectedDateEquipmentCount.classList.toggle("is-hidden", !showSelectedDateCount);
}
