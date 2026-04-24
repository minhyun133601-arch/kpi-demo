function getDefaultSelectedTeamKey() {
  const teamGroups = getCurrentTeamGroups();
  const teamWithAssignments = teamGroups.find(
    (team) => getTeamAssignedEquipmentIds(team.key).length > 0
  );
  return teamWithAssignments?.key || teamGroups[0]?.key || "";
}

function hasTeamGroup(teamKey) {
  return getCurrentTeamGroups().some((team) => team.key === teamKey);
}

function getTeamGroup(teamKey) {
  return getCurrentTeamGroups().find((team) => team.key === teamKey) || null;
}

function isTeamAssignableEquipment(equipment, teamKey) {
  if (!equipment) {
    return false;
  }

  if (isHiddenEquipmentFieldCard(equipment)) {
    return false;
  }

  if (
    !isGasResourceType() &&
    (isReactiveSummaryEquipment(equipment) || isReactivePowerEquipment(equipment))
  ) {
    return teamKey === "power_reactive";
  }

  if (!isAutoCalculatedEquipment(equipment)) {
    return true;
  }

  return teamKey === "team_04" && isOtherEquipment(equipment);
}

function getTeamAssignedEquipmentIds(teamKey) {
  if (isGasResourceType() && Array.isArray(GAS_FIXED_TEAM_EQUIPMENT_IDS[teamKey])) {
    return GAS_FIXED_TEAM_EQUIPMENT_IDS[teamKey].filter((equipmentId) =>
      state.store.equipmentItems.some((item) => item.id === equipmentId)
    );
  }

  const validIds = new Set(state.store.equipmentItems.map((item) => item.id));
  const assignedIds = (state.store.teamAssignments[teamKey] || []).filter((equipmentId) => {
    if (!validIds.has(equipmentId)) {
      return false;
    }

    return isTeamAssignableEquipment(getEquipmentItem(equipmentId), teamKey);
  });

  if (!isGasResourceType()) {
    return assignedIds;
  }

  const forcedAssignmentEntries = Object.entries(GAS_TEAM_FORCED_ASSIGNMENTS);
  const forcedEquipmentIds = new Set(forcedAssignmentEntries.map(([equipmentId]) => equipmentId));
  const nextAssignedIds = assignedIds.filter((equipmentId) => !forcedEquipmentIds.has(equipmentId));

  forcedAssignmentEntries.forEach(([equipmentId, forcedTeamKey]) => {
    if (teamKey !== forcedTeamKey) {
      return;
    }

    const equipment = getEquipmentItem(equipmentId);
    if (
      validIds.has(equipmentId) &&
      isTeamAssignableEquipment(equipment, teamKey) &&
      !nextAssignedIds.includes(equipmentId)
    ) {
      nextAssignedIds.unshift(equipmentId);
    }
  });

  if (!forcedAssignmentEntries.some(([, forcedTeamKey]) => teamKey === forcedTeamKey)) {
    return nextAssignedIds;
  }

  return nextAssignedIds;
}

function shouldHideSharedCompressorSourceEquipmentForTeam(
  teamKey,
  equipmentId,
  monthValue = state.currentMonth
) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return false;
  }

  return Boolean(
    SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM[teamKey]?.includes(equipmentId)
  );
}

function getTeamCalendarSelectableIds(teamKey, monthValue = state.currentMonth) {
  if (teamKey === PLANT_B_POWER_TEAM_KEY) {
    return [PLANT_B_TOTAL_SELECTION_ID];
  }

  if (teamKey === ELECTRIC_OTHER_COST_TEAM_KEY) {
    return getElectricOtherCostDescriptors(monthValue)
      .map((item) => item.selectionId)
      .filter(Boolean);
  }

  if (teamKey === GAS_OTHER_COST_TEAM_KEY) {
    return getGasOtherCostDescriptors(monthValue)
      .map((item) => item.selectionId)
      .filter(Boolean);
  }

  const selectableIds = getTeamAssignedEquipmentIds(teamKey).filter(
    (equipmentId) => !shouldHideSharedCompressorSourceEquipmentForTeam(teamKey, equipmentId, monthValue)
  );

  if (getTeamSharedCompressorChipDescriptor(teamKey, monthValue)) {
    selectableIds.push(SHARED_COMPRESSOR_VIRTUAL_ID);
  }

  return selectableIds;
}

function normalizeTeamCalendarSelectionIds(teamKey, rawSelection, monthValue = state.currentMonth) {
  const selectableIds = getTeamCalendarSelectableIds(teamKey, monthValue);
  const selectableSet = new Set(selectableIds);

  if (!Array.isArray(rawSelection)) {
    return [...selectableIds];
  }

  const nextSelection = rawSelection.filter((equipmentId) => selectableSet.has(equipmentId));
  if (selectableSet.has(SHARED_COMPRESSOR_VIRTUAL_ID)) {
    const legacySharedSourceIds = SHARED_COMPRESSOR_SETTLEMENT_SOURCE_IDS_BY_TEAM[teamKey] || [];
    if (rawSelection.some((equipmentId) => legacySharedSourceIds.includes(equipmentId))) {
      nextSelection.push(SHARED_COMPRESSOR_VIRTUAL_ID);
    }
  }

  const nextSelectionSet = new Set(nextSelection);
  return selectableIds.filter((equipmentId) => nextSelectionSet.has(equipmentId));
}

function getTeamCalendarSelection(teamKey, monthValue = state.currentMonth) {
  const rawSelection = state.teamCalendarSelections[teamKey];
  return normalizeTeamCalendarSelectionIds(teamKey, rawSelection, monthValue);
}

function isTeamCalendarSelectionActive(teamKey, equipmentId, monthValue = state.currentMonth) {
  if (!teamKey || !equipmentId) {
    return false;
  }

  return getTeamCalendarSelection(teamKey, monthValue).includes(equipmentId);
}

function syncTeamCalendarSelectionState() {
  const currentTeamGroups = getCurrentTeamGroups();
  const validTeamKeys = new Set(currentTeamGroups.map((team) => team.key));
  if (state.selectedTeamKey && !validTeamKeys.has(state.selectedTeamKey)) {
    state.selectedTeamKey = "";
  }

  state.selectedTeamKeys = getSelectedTeamKeys();
  if (state.teamSelectionAnchorKey && !validTeamKeys.has(state.teamSelectionAnchorKey)) {
    state.teamSelectionAnchorKey = "";
  }

  if (shouldHideStandaloneTeamBoard(state.selectedTeamKey)) {
    state.selectedTeamKey = "";
  }

  state.selectedTeamKeys = state.selectedTeamKeys.filter(
    (teamKey) => !shouldHideStandaloneTeamBoard(teamKey)
  );

  if (shouldHideStandaloneTeamBoard(state.teamSelectionAnchorKey)) {
    state.teamSelectionAnchorKey = "";
  }

  currentTeamGroups.forEach((team) => {
    const rawSelection = state.teamCalendarSelections[team.key];
    if (!Array.isArray(rawSelection)) {
      return;
    }

    state.teamCalendarSelections[team.key] = normalizeTeamCalendarSelectionIds(
      team.key,
      rawSelection
    );
  });
}
