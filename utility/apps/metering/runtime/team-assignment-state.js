function getTeamAssignmentSourceKeys(teamKey) {
  if (teamKey === TOTAL_POWER_TEAM_KEY) {
    return [TOTAL_POWER_TEAM_KEY, LEGACY_ACTIVE_POWER_TEAM_KEY];
  }

  return [teamKey];
}

function hasExplicitTeamAssignment(assignments, teamKey) {
  return getTeamAssignmentSourceKeys(teamKey).some((sourceKey) =>
    Object.prototype.hasOwnProperty.call(assignments || {}, sourceKey)
  );
}

function getRawTeamAssignmentList(assignments, teamKey) {
  return getTeamAssignmentSourceKeys(teamKey).flatMap((sourceKey) =>
    Array.isArray(assignments?.[sourceKey]) ? assignments[sourceKey] : []
  );
}

function isAssignmentSummaryOnlyEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return SUMMARY_ONLY_DEFAULT_IDS.has(equipment.id) || SUMMARY_ONLY_LABEL_KEYS.has(labelKey);
}

function isAssignmentActivePowerEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return ACTIVE_POWER_DEFAULT_IDS.has(equipment.id) || ACTIVE_POWER_LABEL_KEYS.has(labelKey);
}

function isAssignmentReactivePowerEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  const labelKey = normalizeEquipmentFactorLabel(equipment.label);
  return REACTIVE_POWER_DEFAULT_IDS.has(equipment.id) || REACTIVE_POWER_LABEL_KEYS.has(labelKey);
}

function isAssignmentReactiveSummaryEquipment(equipment) {
  if (!equipment) {
    return false;
  }

  return normalizeEquipmentFactorLabel(equipment.label) === normalizeEquipmentFactorLabel("무효전력의 합");
}

// Team assignment normalization runs while app.js is still bootstrapping `state`.
// Keep this predicate independent from UI visibility helpers that read active month/date.
function isTeamAssignmentEligibleEquipment(
  equipment,
  teamKey,
  resourceType = RESOURCE_TYPES.ELECTRIC
) {
  if (!equipment || isAssignmentSummaryOnlyEquipment(equipment)) {
    return false;
  }

  if (
    resourceType !== RESOURCE_TYPES.GAS &&
    (isAssignmentReactiveSummaryEquipment(equipment) ||
      isAssignmentReactivePowerEquipment(equipment))
  ) {
    return teamKey === "power_reactive";
  }

  if (!isAutoCalculatedEquipment(equipment)) {
    return true;
  }

  return teamKey === "team_04" && isOtherEquipment(equipment);
}

function normalizeTeamAssignments(
  assignments,
  equipmentItems,
  resourceType = RESOURCE_TYPES.ELECTRIC
) {
  const equipmentMap = new Map(equipmentItems.map((item) => [item.id, item]));
  const validIds = new Set(equipmentItems.map((item) => item.id));
  const takenIds = new Set();
  const normalized = {};
  const explicitTeamKeys = new Set();

  TEAM_GROUPS.forEach((team) => {
    const rawList = getRawTeamAssignmentList(assignments, team.key);
    normalized[team.key] = [];

    if (hasExplicitTeamAssignment(assignments, team.key)) {
      explicitTeamKeys.add(team.key);
    }

    rawList.forEach((value) => {
      const equipmentId = normalizeText(value);
      const equipment = equipmentMap.get(equipmentId);
      if (
        !equipmentId ||
        !validIds.has(equipmentId) ||
        takenIds.has(equipmentId) ||
        !isTeamAssignmentEligibleEquipment(equipment, team.key, resourceType)
      ) {
        return;
      }

      takenIds.add(equipmentId);
      normalized[team.key].push(equipmentId);
    });
  });

  TEAM_GROUPS.forEach((team) => {
    const defaultLabelKeys = DEFAULT_TEAM_ASSIGNMENT_LABEL_KEYS[team.key];
    if (!defaultLabelKeys?.size || explicitTeamKeys.has(team.key)) {
      return;
    }

    equipmentItems.forEach((item) => {
      if (takenIds.has(item.id) || !validIds.has(item.id)) {
        return;
      }

      if (
        !defaultLabelKeys.has(normalizeEquipmentFactorLabel(item.label)) ||
        !isTeamAssignmentEligibleEquipment(item, team.key, resourceType)
      ) {
        return;
      }

      takenIds.add(item.id);
      normalized[team.key].push(item.id);
    });
  });

  return normalized;
}

function getConfiguredTotalPowerEquipmentIds() {
  const equipmentItems = Array.isArray(state?.store?.equipmentItems) ? state.store.equipmentItems : [];
  const teamAssignments = state?.store?.teamAssignments;
  if (hasExplicitTeamAssignment(teamAssignments, TOTAL_POWER_TEAM_KEY)) {
    const explicitAssignments = getRawTeamAssignmentList(teamAssignments, TOTAL_POWER_TEAM_KEY);
    const equipmentMap = new Map(equipmentItems.map((item) => [item.id, item]));
    const takenIds = new Set();
    return explicitAssignments.reduce((normalizedIds, value) => {
      const equipmentId = normalizeText(value);
      const equipment = equipmentMap.get(equipmentId);
      if (
        !equipmentId ||
        takenIds.has(equipmentId) ||
        !equipment ||
        !isTeamAssignmentEligibleEquipment(equipment, TOTAL_POWER_TEAM_KEY, RESOURCE_TYPES.ELECTRIC)
      ) {
        return normalizedIds;
      }

      takenIds.add(equipmentId);
      normalizedIds.push(equipmentId);
      return normalizedIds;
    }, []);
  }

  return equipmentItems
    .filter((item) => isAssignmentActivePowerEquipment(item))
    .map((item) => item.id);
}

function getAvailableEquipmentOptionsForTeam(teamKey) {
  if (supportsDirectTeamMonthlyUsage(teamKey)) {
    return [];
  }

  if (isGasResourceType() && Array.isArray(GAS_FIXED_TEAM_EQUIPMENT_IDS[teamKey])) {
    return [];
  }

  const assignedElsewhere = getAssignedEquipmentIds(teamKey);
  const currentAssignments = new Set(getTeamAssignedEquipmentIds(teamKey));

  return state.store.equipmentItems.filter(
    (item) =>
      isTeamAssignableEquipment(item, teamKey) &&
      !assignedElsewhere.has(item.id) &&
      !currentAssignments.has(item.id)
  );
}

function getAssignedEquipmentIds(exceptTeamKey = "") {
  const assignedIds = new Set();

  getCurrentTeamGroups().forEach((team) => {
    if (team.key === exceptTeamKey) {
      return;
    }

    getTeamAssignedEquipmentIds(team.key).forEach((equipmentId) => {
      if (!isTeamAssignableEquipment(getEquipmentItem(equipmentId), team.key)) {
        return;
      }

      assignedIds.add(equipmentId);
    });
  });

  return assignedIds;
}
