function getAssignedTeamForEquipment(equipmentId) {
  return (
    getCurrentTeamGroups().find(
      (team) => (state.store.teamAssignments[team.key] || []).includes(equipmentId)
    ) ||
    null
  );
}

function inferEquipmentIconKey(label) {
  const normalizedLabel = normalizeText(label).toLowerCase();

  if (!normalizedLabel) {
    return "equipment";
  }

  if (normalizedLabel.includes("무효전력")) {
    return "power_reactive";
  }

  if (normalizedLabel.includes("유효전력")) {
    return "power_active";
  }

  if (normalizedLabel.includes("processgamma") || normalizedLabel.includes("process gamma")) {
    return "liquid";
  }

  if (
    normalizedLabel.includes("adminarea") ||
    normalizedLabel.includes("admin area") ||
    normalizedLabel.includes("breakarea") ||
    normalizedLabel.includes("break area")
  ) {
    return "building";
  }

  if (normalizedLabel.includes("processbeta") || normalizedLabel.includes("process beta")) {
    return "packaging";
  }

  if (normalizedLabel.includes("건물")) {
    return "drying";
  }

  return "equipment";
}

function getEquipmentIconKey(equipment) {
  if (!equipment) {
    return "equipment";
  }

  const assignedTeam = getAssignedTeamForEquipment(equipment.id);
  return assignedTeam?.iconKey || inferEquipmentIconKey(equipment.label);
}

function getEquipmentDisplayLabel(equipmentOrLabel) {
  const baseLabel = normalizeText(
    typeof equipmentOrLabel === "string" ? equipmentOrLabel : equipmentOrLabel?.label
  );
  if (!baseLabel) {
    return "";
  }

  return EQUIPMENT_DISPLAY_LABEL_OVERRIDES[normalizeEquipmentFactorLabel(baseLabel)] || baseLabel;
}

function getResourceDuplicateBadgeIconKeyForEquipment(
  equipmentOrLabel,
  resourceType = getCurrentResourceType()
) {
  const labelKey = normalizeEquipmentFactorLabel(
    typeof equipmentOrLabel === "string" ? equipmentOrLabel : equipmentOrLabel?.label
  );
  if (!labelKey || !isPlainObject(state?.store?.resourceDatasets)) {
    return "";
  }

  const otherResourceType = isGasResourceType(resourceType)
    ? RESOURCE_TYPES.ELECTRIC
    : RESOURCE_TYPES.GAS;
  const otherItems = getActiveResourceDataset(state.store, otherResourceType)?.equipmentItems;
  if (
    !Array.isArray(otherItems) ||
    !otherItems.some((item) => normalizeEquipmentFactorLabel(item?.label) === labelKey)
  ) {
    return "";
  }

  return isGasResourceType(resourceType) ? "resource_gas" : "resource_electric";
}
