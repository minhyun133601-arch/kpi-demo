function selectTeamCalendar(teamKey, options = {}) {
  const { selectAll = false } = options;
  if (!teamKey || !hasTeamGroup(teamKey)) {
    return;
  }

  state.selectedTeamKey = teamKey;
  state.selectedTeamKeys = [teamKey];
  state.teamSelectionAnchorKey = teamKey;
  state.teamCalendarSelections[teamKey] = selectAll
    ? getTeamCalendarSelectableIds(teamKey)
    : getTeamCalendarSelection(teamKey);

  syncSelectedDatePresentation();
  renderTeamMode();
  renderCalendar();
  renderSummary();
}

function toggleTeamCalendarEquipmentSelection(teamKey, equipmentId) {
  if (!teamKey || !equipmentId) {
    return;
  }

  const selectableIds = getTeamCalendarSelectableIds(teamKey);
  if (!selectableIds.includes(equipmentId)) {
    return;
  }

  if (hasTeamGroup(teamKey)) {
    state.selectedTeamKey = teamKey;
    state.teamSelectionAnchorKey = teamKey;
    if (!getSelectedTeamKeys().includes(teamKey)) {
      state.selectedTeamKeys = getCurrentTeamGroups().map((team) => team.key).filter(
        (key) => key === teamKey || getSelectedTeamKeys().includes(key)
      );
    }
  }

  const nextSelection = new Set(getTeamCalendarSelection(teamKey));
  if (nextSelection.has(equipmentId)) {
    nextSelection.delete(equipmentId);
  } else {
    nextSelection.add(equipmentId);
  }

  state.teamCalendarSelections[teamKey] = selectableIds.filter((itemId) => nextSelection.has(itemId));
  syncSelectedDatePresentation();
  renderTeamMode();
  renderCalendar();
  renderSummary();
}

function getSelectedTeamKeys() {
  if (!Array.isArray(state.selectedTeamKeys)) {
    return [];
  }

  return getCurrentTeamGroups().map((team) => team.key).filter((teamKey) => {
    if (!state.selectedTeamKeys.includes(teamKey)) {
      return false;
    }

    if (isElectricResourceType()) {
      return ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS.includes(teamKey);
    }

    if (isGasResourceType()) {
      return GAS_OVERVIEW_TEAM_KEYS.includes(teamKey);
    }

    return true;
  });
}

function getSelectedTeamCalendarEquipmentIds() {
  const selectedEquipmentSet = new Set();
  getSelectedTeamKeys().forEach((teamKey) => {
    getTeamCalendarSelection(teamKey).forEach((equipmentId) => {
      if (isSharedCompressorVirtualEquipmentId(equipmentId)) {
        getSharedCompressorSettlementSourceIds().forEach((sourceId) => {
          selectedEquipmentSet.add(sourceId);
        });
        return;
      }

      selectedEquipmentSet.add(equipmentId);
    });
  });

  return state.store.equipmentItems
    .map((item) => item.id)
    .filter((equipmentId) => selectedEquipmentSet.has(equipmentId));
}

function updateSelectedTeams(teamKey, event) {
  if (!teamKey || !hasTeamGroup(teamKey)) {
    return;
  }

  if (isElectricResourceType() && !ELECTRIC_TOTAL_OVERVIEW_TEAM_KEYS.includes(teamKey)) {
    return;
  }

  const orderedTeamKeys = getOrderedTeamGroupsForBoardRender().map((team) => team.key);
  const nextSelection = resolveCardMultiSelection(
    orderedTeamKeys,
    getSelectedTeamKeys(),
    teamKey,
    state.teamSelectionAnchorKey,
    event
  );

  state.selectedTeamKeys = nextSelection;
  state.selectedTeamKey = nextSelection.includes(teamKey)
    ? teamKey
    : nextSelection[nextSelection.length - 1] || "";
  state.teamSelectionAnchorKey = nextSelection.includes(teamKey)
    ? teamKey
    : nextSelection[nextSelection.length - 1] || "";

  if (nextSelection.includes(teamKey) && !Array.isArray(state.teamCalendarSelections[teamKey])) {
    state.teamCalendarSelections[teamKey] = getTeamCalendarSelectableIds(teamKey);
  }

  syncSelectedDatePresentation();
  renderTeamMode();
  renderCalendar();
  renderSummary();
}
