function isDirectTeamUsageBoardEditable(teamKey, resourceType = getCurrentResourceType()) {
  if (isGasResourceType(resourceType) && teamKey === TEAM_01_01_KEY) {
    return false;
  }

  return canEditDirectTeamMonthlyUsage(teamKey, resourceType);
}

function createDirectTeamMetricFieldElement(teamKey, metricKey = "usage") {
  const team = getTeamGroup(teamKey);
  const isAmountField = metricKey === "amount";
  const editable = isAmountField
    ? canEditDirectTeamMonthlyAmount(teamKey)
    : isDirectTeamUsageBoardEditable(teamKey);
  const directUsage = document.createElement("div");
  directUsage.className = "team-direct-usage";
  directUsage.classList.toggle("is-readonly", !editable);

  const copy = document.createElement("div");
  copy.className = "team-direct-usage-copy";

  const label = document.createElement("span");
  label.className = "team-direct-usage-label";
  label.textContent = isAmountField ? "월 금액" : "월 사용량";
  copy.append(label);

  if (!editable) {
    const hint = document.createElement("span");
    hint.className = "team-direct-usage-hint";
    hint.textContent = "수정은 Plant B 정산에서";
    copy.appendChild(hint);
  }

  const input = document.createElement("input");
  input.type = "text";
  input.inputMode = "numeric";
  input.className = "team-direct-usage-input";
  if (isAmountField) {
    input.dataset.teamDirectAmountInput = teamKey;
    input.placeholder = "금액 입력";
    input.value = getDirectTeamMonthlyAmountInputValue(teamKey);
  } else {
    input.dataset.teamDirectUsageInput = teamKey;
    input.placeholder = "사용량 입력";
    input.value = getDirectTeamMonthlyUsageInputValue(teamKey);
  }
  input.readOnly = !editable;
  input.setAttribute(
    "aria-label",
    `${getTeamDisplayLabel(team) || "선택 팀"} ${isAmountField ? "월 금액" : "월 사용량"}`
  );
  if (!editable) {
    input.title = "수정은 Plant B 정산에서";
  }

  directUsage.append(copy, input);
  return directUsage;
}

function createDirectTeamUsageFieldElement(teamKey) {
  const stack = document.createElement("div");
  stack.className = "team-direct-entry-stack";
  stack.appendChild(createDirectTeamMetricFieldElement(teamKey, "usage"));
  if (supportsDirectTeamMonthlyAmount(teamKey)) {
    stack.appendChild(createDirectTeamMetricFieldElement(teamKey, "amount"));
  }
  return stack;
}

function getTeamAssignedChipDescriptors(teamKey, monthValue = state.currentMonth, options = {}) {
  const { includeDirectUsageChip = true } = options;
  const team = getTeamGroup(teamKey);
  const descriptors = getTeamAssignedEquipmentIds(teamKey)
    .filter((equipmentId) => !shouldHideSharedCompressorSourceEquipmentForTeam(teamKey, equipmentId, monthValue))
    .map((equipmentId) => {
      const equipment = getEquipmentItem(equipmentId);
      if (!equipment) {
        return null;
      }

      return {
        id: equipmentId,
        selectionId: equipmentId,
        label: getEquipmentDisplayLabel(equipment),
        iconKey: team?.iconKey || "equipment",
        resourceBadgeIconKey: getResourceDuplicateBadgeIconKeyForEquipment(equipment),
        usageText: getTeamAssignedChipUsageText(equipmentId),
        chargeText: getTeamAssignedChipChargeText(equipmentId, monthValue),
        detailText: getTeamAssignedChipDetailText(equipmentId),
        removable: true,
      };
    })
    .filter(Boolean);

  const directUsageDescriptor = includeDirectUsageChip
    ? getDirectTeamUsageChipDescriptor(teamKey, monthValue)
    : null;
  if (directUsageDescriptor) {
    descriptors.push(directUsageDescriptor);
  }

  const sharedDescriptor = getTeamSharedCompressorChipDescriptor(teamKey, monthValue);
  if (sharedDescriptor) {
    descriptors.push(sharedDescriptor);
  }

  if (isElectricResourceType() && teamKey === TOTAL_POWER_TEAM_KEY) {
    return sortTotalPowerCardChipDescriptors(descriptors);
  }

  return descriptors;
}

function getTeamSharedCompressorChipDescriptor(teamKey, monthValue = state.currentMonth) {
  if (!shouldApplySharedCompressorSettlement(monthValue)) {
    return null;
  }

  const ratio = getSharedCompressorSettlementRatio(teamKey, monthValue);
  if (!Number.isFinite(ratio) || !getSharedCompressorSettlementSourceIds().length) {
    return null;
  }

  const team = getTeamGroup(teamKey);
  return {
    id: SHARED_COMPRESSOR_VIRTUAL_ID,
    selectionId: SHARED_COMPRESSOR_VIRTUAL_ID,
    label: SHARED_COMPRESSOR_VIRTUAL_LABEL,
    iconKey: team?.iconKey || "equipment",
    usageText: formatDailyUsage(
      calculateTeamSharedCompressorSettlementUsage(teamKey, monthValue)
    ),
    chargeText: getTeamSharedCompressorSettlementChargeText(teamKey, monthValue),
    detailText: getTeamSharedCompressorSettlementDetailText(teamKey, monthValue),
    removable: false,
  };
}



function createTeamAssignedListElement(team) {
  const teamKey = team?.key || "";
  const isElectricTotalPowerCard = Boolean(isElectricResourceType() && teamKey === TOTAL_POWER_TEAM_KEY);
  const isElectricPlantBTotalCard = Boolean(
    isElectricResourceType() && teamKey === PLANT_B_POWER_TEAM_KEY
  );
  if (isElectricPlantBTotalCard) {
    return createPlantBTotalCardToggleListElement(state.currentMonth);
  }
  const useDirectEntryFields = Boolean(
    supportsDirectTeamMonthlyUsage(teamKey) &&
      !(
        (isElectricResourceType() && teamKey === TEAM_01_01_KEY) ||
        (isGasResourceType() && teamKey === TEAM_01_01_KEY)
      )
  );
  if (useDirectEntryFields) {
    return createDirectTeamUsageFieldElement(teamKey);
  }

  const assignedItems =
    (isElectricResourceType() && teamKey === TEAM_01_01_KEY) ||
    (isGasResourceType() && teamKey === TEAM_01_01_KEY)
    ? [getDirectTeamUsageChipDescriptor(teamKey, state.currentMonth)].filter(Boolean)
    : getTeamAssignedChipDescriptors(team?.key, state.currentMonth, {
        includeDirectUsageChip: !(isElectricTotalSummaryTeamKey(teamKey) && teamKey === TOTAL_POWER_TEAM_KEY),
      });
  const selectedCalendarIds = new Set(getTeamCalendarSelection(team?.key));
  const showTeamShare = shouldShowTeamAssignedChipShare(teamKey);
  const assignedList = document.createElement("div");
  assignedList.className = "team-assigned-list";

  if (!assignedItems.length) {
    const empty = document.createElement("p");
    empty.className = "team-assigned-empty";
    empty.textContent = "없음";
    assignedList.appendChild(empty);
    return assignedList;
  }

  assignedItems.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "team-assigned-chip";
    const isDirectTeamUsageChip = Boolean(item.isDirectTeamUsage);
    if (isDirectTeamUsageChip) {
      chip.classList.add("team-assigned-chip-direct");
      chip.dataset.directTeamUsageChip = item.teamKey || "";
      chip.title = item.detailText || "";
    } else {
      chip.dataset.teamKey = team?.key || "";
      chip.dataset.toggleTeamCalendarEquipment = item.selectionId;
      chip.classList.toggle("is-active", selectedCalendarIds.has(item.selectionId));
    }

    if (isDirectTeamUsageChip) {
      const directUsageEditable = canEditDirectTeamMonthlyUsage(item.teamKey);
      const directShareText = isElectricTotalPowerCard
        ? getTotalPowerCardDescriptorShareText(item)
        : isElectricPlantBTotalCard
          ? getPlantBTotalCardDescriptorShareText(item)
          : "";
      const directChargeText = isElectricTotalPowerCard
        ? getTotalPowerCardDescriptorChargeText(item)
        : isElectricPlantBTotalCard
          ? getPlantBTotalCardDescriptorChargeText(item)
          : item.chargeText || "";
      const directDetailText = isElectricTotalPowerCard
        ? [item.detailText, getTotalPowerCardDescriptorDetailText(item)].filter(Boolean).join("\n")
        : isElectricPlantBTotalCard
          ? [item.detailText, getPlantBTotalCardDescriptorDetailText(item)].filter(Boolean).join("\n")
          : item.detailText || "";
      const display = document.createElement("div");
      display.className = "team-assigned-chip-direct-display";
      display.dataset.directTeamUsageDisplay = item.teamKey || "";
      if (directUsageEditable) {
        display.setAttribute("role", "button");
        display.setAttribute("tabindex", "0");
        display.setAttribute("aria-label", `${item.label} 월 사용량 수정`);
      } else {
        display.setAttribute("aria-label", `${item.label} 월 사용량 표시`);
      }
      display.title = directDetailText;

      const label = createIconLabel(
        getEquipmentDisplayLabel(item.label),
        item.iconKey || team?.iconKey || "equipment",
        {
          containerClass: "team-assigned-chip-label",
          textClass: "team-assigned-chip-text",
          iconClass: "category-icon team-assigned-icon",
          trailingIconKey: item.resourceBadgeIconKey || "",
        }
      );

      const usageValue = document.createElement("span");
      usageValue.className = "team-assigned-chip-value";
      usageValue.dataset.directTeamUsageValue = item.teamKey || "";
      usageValue.textContent = item.usageText;

      const shareValue = document.createElement("span");
      shareValue.className = "team-assigned-chip-share";
      shareValue.textContent = directShareText;
      shareValue.classList.toggle("is-hidden", !directShareText);

      const chargeValue = document.createElement("span");
      chargeValue.className = "team-assigned-chip-charge";
      chargeValue.textContent = directChargeText;
      chargeValue.classList.toggle("is-hidden", !directChargeText);

      const metrics = document.createElement("span");
      metrics.className = "team-assigned-chip-metrics";
      metrics.append(usageValue, shareValue, chargeValue);

      display.append(label, metrics);
      chip.title = directDetailText;
      chip.append(display);
      assignedList.appendChild(chip);
      return;
    }

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className = "team-assigned-chip-toggle";
    toggleButton.dataset.teamKey = team?.key || "";
    toggleButton.dataset.toggleTeamCalendarEquipment = item.selectionId;
    toggleButton.setAttribute("aria-pressed", String(selectedCalendarIds.has(item.selectionId)));
    toggleButton.setAttribute("aria-label", `${getEquipmentDisplayLabel(item.label)} 달력 합계 토글`);
    const shareText = isElectricTotalPowerCard
      ? getTotalPowerCardDescriptorShareText(item, state.currentMonth, { selectionOnly: true })
      : isElectricPlantBTotalCard
        ? getPlantBTotalCardDescriptorShareText(item, state.currentMonth, { selectionOnly: true })
      : showTeamShare
        ? getTeamAssignedChipShareText(teamKey, item.selectionId, { selectionOnly: true })
        : "";
    const shareDetailText = isElectricTotalPowerCard
      ? getTotalPowerCardDescriptorDetailText(item, state.currentMonth, { selectionOnly: true })
      : isElectricPlantBTotalCard
        ? getPlantBTotalCardDescriptorDetailText(item, state.currentMonth, { selectionOnly: true })
      : shareText
        ? getTeamAssignedChipShareDetailText(teamKey, item.selectionId, { selectionOnly: true })
        : "";
    toggleButton.title = [item.detailText, shareDetailText].filter(Boolean).join("\n");

    const label = createIconLabel(getEquipmentDisplayLabel(item.label), item.iconKey || team?.iconKey || "equipment", {
      containerClass: "team-assigned-chip-label",
      textClass: "team-assigned-chip-text",
      iconClass: "category-icon team-assigned-icon",
      trailingIconKey: item.resourceBadgeIconKey || "",
    });

    const usageValue = document.createElement("span");
    usageValue.className = "team-assigned-chip-value";
    usageValue.textContent = item.usageText;

    const chargeValue = document.createElement("span");
    chargeValue.className = "team-assigned-chip-charge";
    chargeValue.textContent = isElectricTotalPowerCard
      ? getTotalPowerCardDescriptorChargeText(item) || item.chargeText
      : isElectricPlantBTotalCard
        ? getPlantBTotalCardDescriptorChargeText(item) || item.chargeText
        : item.chargeText;
    chargeValue.classList.toggle("is-hidden", !chargeValue.textContent);

    const shareValue = document.createElement("span");
    shareValue.className = "team-assigned-chip-share";
    shareValue.textContent = shareText;
    shareValue.classList.toggle("is-hidden", !shareText);

    const metrics = document.createElement("span");
    metrics.className = "team-assigned-chip-metrics";
    metrics.append(usageValue, shareValue, chargeValue);

    toggleButton.append(label, metrics);
    chip.append(toggleButton);

    if (item.removable) {
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "team-assigned-chip-remove";
      removeButton.dataset.teamKey = team?.key || "";
      removeButton.dataset.removeTeamEquipment = item.id;
      removeButton.setAttribute("aria-label", `${getEquipmentDisplayLabel(item.label)} 삭제`);
      removeButton.textContent = "x";
      chip.append(removeButton);
    }

    assignedList.appendChild(chip);
  });

  return assignedList;
}
