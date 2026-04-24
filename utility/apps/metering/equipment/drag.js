const equipmentOrderDragState = {
  fieldKey: "",
  targetKey: "",
  placement: "before",
};

const equipmentFieldCardDragState = {
  fieldKey: "",
  targetKey: "",
  placement: "before",
  suppressClickUntil: 0,
};

const equipmentSectionDragScrollState = {
  pointerId: null,
  startX: 0,
  startY: 0,
  startScrollTop: 0,
  scrollTarget: null,
  isDragging: false,
};

function handleEquipmentOrderDragStart(event) {
  if (!event.target.closest(".equipment-order-drag-handle")) {
    event.preventDefault();
    return;
  }

  const optionButton = event.target.closest("button[data-order-field-key]");
  if (!optionButton) {
    return;
  }

  const fieldKey = optionButton.dataset.orderFieldKey || "";
  if (!fieldKey) {
    return;
  }

  equipmentOrderDragState.fieldKey = fieldKey;
  equipmentOrderDragState.targetKey = "";
  equipmentOrderDragState.placement = "before";
  clearEquipmentOrderDropState();
  optionButton.classList.add("is-dragging");
  event.dataTransfer?.setData("text/plain", fieldKey);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
}

function handleEquipmentOrderDragOver(event) {
  if (!equipmentOrderDragState.fieldKey) {
    return;
  }

  const optionButton = event.target.closest("button[data-order-field-key]");
  if (!optionButton) {
    return;
  }

  const targetKey = optionButton.dataset.orderFieldKey || "";
  if (!targetKey || targetKey === equipmentOrderDragState.fieldKey) {
    return;
  }

  event.preventDefault();

  const placement = getEquipmentOrderPlacement(event, optionButton);
  equipmentOrderDragState.targetKey = targetKey;
  equipmentOrderDragState.placement = placement;
  clearEquipmentOrderDropState();
  optionButton.classList.add(placement === "after" ? "is-drag-over-after" : "is-drag-over-before");
  elements.equipmentOrderList
    .querySelector(`button[data-order-field-key="${equipmentOrderDragState.fieldKey}"]`)
    ?.classList.add("is-dragging");
}

function handleEquipmentOrderDrop(event) {
  if (!equipmentOrderDragState.fieldKey) {
    return;
  }

  const optionButton = event.target.closest("button[data-order-field-key]");
  const targetKey = optionButton?.dataset.orderFieldKey || equipmentOrderDragState.targetKey;
  const placement = optionButton
    ? getEquipmentOrderPlacement(event, optionButton)
    : equipmentOrderDragState.placement;
  const draggedFieldKey = equipmentOrderDragState.fieldKey;

  event.preventDefault();
  clearEquipmentOrderDragState();

  if (!targetKey || targetKey === draggedFieldKey) {
    return;
  }

  reorderEquipmentItems(draggedFieldKey, targetKey, placement);
}

function handleEquipmentOrderDragEnd() {
  clearEquipmentOrderDragState();
}

function getEquipmentOrderPlacement(event, optionButton) {
  const bounds = optionButton.getBoundingClientRect();
  const centerX = bounds.left + bounds.width / 2;
  return event.clientX >= centerX ? "after" : "before";
}

function clearEquipmentOrderDragState() {
  equipmentOrderDragState.fieldKey = "";
  equipmentOrderDragState.targetKey = "";
  equipmentOrderDragState.placement = "before";
  clearEquipmentOrderDropState();
}

function clearEquipmentOrderDropState() {
  if (!elements.equipmentOrderList) {
    return;
  }

  elements.equipmentOrderList.querySelectorAll(".equipment-order-option").forEach((optionButton) => {
    optionButton.classList.remove("is-dragging", "is-drag-over-before", "is-drag-over-after");
  });
}

function reorderEquipmentItems(draggedFieldKey, targetFieldKey, placement) {
  if (!draggedFieldKey || !targetFieldKey || draggedFieldKey === targetFieldKey) {
    return;
  }

  const sourceIndex = state.store.equipmentItems.findIndex((item) => item.id === draggedFieldKey);
  const targetIndex = state.store.equipmentItems.findIndex((item) => item.id === targetFieldKey);

  if (sourceIndex < 0 || targetIndex < 0) {
    return;
  }

  const wasDirty = isDirty();
  const currentFormData = readEquipmentFormData();
  const currentEntryDayStatus = getCurrentEntryDayStatus();
  const reorderedItems = [...state.store.equipmentItems];
  const [movedItem] = reorderedItems.splice(sourceIndex, 1);

  let insertIndex = reorderedItems.findIndex((item) => item.id === targetFieldKey);
  if (insertIndex < 0) {
    return;
  }

  if (placement === "after") {
    insertIndex += 1;
  }

  reorderedItems.splice(insertIndex, 0, movedItem);
  setCurrentEquipmentItems(reorderedItems);
  state.openEquipmentManageKey = "";

  persistStore({ skipLocalFileWrite: true });
  renderEquipmentFieldInputs();
  restoreEquipmentFormData(currentFormData, currentEntryDayStatus);
  renderTeamMode();

  if (!wasDirty) {
    state.loadedSnapshot = createFormSnapshot();
  }

  updateDirtyState();
}

function canDirectReorderEquipmentFields() {
  return (
    supportsEquipmentEditingForCurrentResource() &&
    getCurrentMode() === MODES.EQUIPMENT &&
    state.isEquipmentFullscreen &&
    state.store.equipmentItems.length > 1
  );
}

function handleEquipmentSectionDragScrollStart(event) {
  if (!shouldEnableEquipmentSectionDragScroll(event)) {
    return;
  }

  const scrollTarget = resolveEquipmentSectionDragScrollTarget();
  if (!scrollTarget) {
    return;
  }

  equipmentSectionDragScrollState.pointerId = event.pointerId;
  equipmentSectionDragScrollState.startX = event.clientX;
  equipmentSectionDragScrollState.startY = event.clientY;
  equipmentSectionDragScrollState.startScrollTop = scrollTarget.scrollTop;
  equipmentSectionDragScrollState.scrollTarget = scrollTarget;
  equipmentSectionDragScrollState.isDragging = false;
}

function handleEquipmentSectionDragScrollMove(event) {
  if (equipmentSectionDragScrollState.pointerId !== event.pointerId) {
    return;
  }

  const { scrollTarget } = equipmentSectionDragScrollState;
  if (!scrollTarget) {
    clearEquipmentSectionDragScrollState();
    return;
  }

  const deltaX = event.clientX - equipmentSectionDragScrollState.startX;
  const deltaY = event.clientY - equipmentSectionDragScrollState.startY;

  if (
    !equipmentSectionDragScrollState.isDragging &&
    Math.abs(deltaX) < 6 &&
    Math.abs(deltaY) < 6
  ) {
    return;
  }

  if (!equipmentSectionDragScrollState.isDragging) {
    equipmentSectionDragScrollState.isDragging = true;
    elements.equipmentFieldsSection?.classList.add("is-drag-scrolling");
  }

  event.preventDefault();
  scrollTarget.scrollTop = equipmentSectionDragScrollState.startScrollTop - deltaY;
}

function handleEquipmentSectionDragScrollEnd(event) {
  if (equipmentSectionDragScrollState.pointerId !== event.pointerId) {
    return;
  }

  if (equipmentSectionDragScrollState.isDragging) {
    equipmentFieldCardDragState.suppressClickUntil = Date.now() + 220;
  }

  clearEquipmentSectionDragScrollState();
}

function handleGuardedNativeDragStart(event) {
  const target = event.target;
  if (!(target instanceof Element)) {
    return;
  }

  if (
    target.closest(".field-drag-handle") ||
    target.closest(".equipment-order-drag-handle")
  ) {
    return;
  }

  event.preventDefault();
}

function shouldEnableEquipmentSectionDragScroll(event) {
  return false;
}

function resolveEquipmentSectionDragScrollTarget() {
  const section = elements.equipmentFieldsSection;
  if (!section || section.classList.contains("is-hidden")) {
    return null;
  }

  if (section.scrollHeight <= section.clientHeight + 1) {
    return null;
  }

  return section;
}

function clearEquipmentSectionDragScrollState() {
  equipmentSectionDragScrollState.pointerId = null;
  equipmentSectionDragScrollState.startX = 0;
  equipmentSectionDragScrollState.startY = 0;
  equipmentSectionDragScrollState.startScrollTop = 0;
  equipmentSectionDragScrollState.scrollTarget = null;
  equipmentSectionDragScrollState.isDragging = false;
  elements.equipmentFieldsSection?.classList.remove("is-drag-scrolling");
}

function clearEquipmentFieldCardDragState() {
  equipmentFieldCardDragState.fieldKey = "";
  equipmentFieldCardDragState.targetKey = "";
  equipmentFieldCardDragState.placement = "before";
  clearEquipmentFieldCardDropState();
}

function clearEquipmentFieldCardDropState() {
  if (!elements.fieldsGrid) {
    return;
  }

  elements.fieldsGrid.querySelectorAll(".field-card").forEach((card) => {
    card.classList.remove("is-dragging", "is-drag-over-before", "is-drag-over-after");
  });
}

function handleEquipmentFieldCardDragStart(event) {
  if (!canDirectReorderEquipmentFields()) {
    return;
  }

  if (event.target.closest("input, button")) {
    event.preventDefault();
    return;
  }

  if (!event.target.closest(".field-drag-handle")) {
    event.preventDefault();
    return;
  }

  const card = event.target.closest(".field-card[data-field-key]");
  if (!card) {
    return;
  }

  const fieldKey = card.dataset.fieldKey || "";
  if (!fieldKey) {
    return;
  }

  equipmentFieldCardDragState.fieldKey = fieldKey;
  equipmentFieldCardDragState.targetKey = "";
  equipmentFieldCardDragState.placement = "before";
  clearEquipmentFieldCardDropState();
  card.classList.add("is-dragging");

  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", fieldKey);
  }
}

function handleEquipmentFieldCardDragOver(event) {
  if (!canDirectReorderEquipmentFields() || !equipmentFieldCardDragState.fieldKey) {
    return;
  }

  const card = event.target.closest(".field-card[data-field-key]");
  if (!card) {
    return;
  }

  const targetKey = card.dataset.fieldKey || "";
  if (!targetKey || targetKey === equipmentFieldCardDragState.fieldKey) {
    return;
  }

  event.preventDefault();

  const placement = getEquipmentFieldCardDragPlacement(event, card);
  equipmentFieldCardDragState.targetKey = targetKey;
  equipmentFieldCardDragState.placement = placement;
  clearEquipmentFieldCardDropState();
  card.classList.add(placement === "after" ? "is-drag-over-after" : "is-drag-over-before");
  elements.fieldsGrid
    .querySelector(`.field-card[data-field-key="${equipmentFieldCardDragState.fieldKey}"]`)
    ?.classList.add("is-dragging");
}

function handleEquipmentFieldCardDrop(event) {
  if (!canDirectReorderEquipmentFields() || !equipmentFieldCardDragState.fieldKey) {
    return;
  }

  const card = event.target.closest(".field-card[data-field-key]");
  const targetKey = card?.dataset.fieldKey || equipmentFieldCardDragState.targetKey;
  const placement = card
    ? getEquipmentFieldCardDragPlacement(event, card)
    : equipmentFieldCardDragState.placement;
  const draggedFieldKey = equipmentFieldCardDragState.fieldKey;

  event.preventDefault();
  clearEquipmentFieldCardDragState();

  if (!targetKey || targetKey === draggedFieldKey) {
    return;
  }

  equipmentFieldCardDragState.suppressClickUntil = Date.now() + 220;
  reorderEquipmentItems(draggedFieldKey, targetKey, placement);
}

function handleEquipmentFieldCardDragEnd() {
  clearEquipmentFieldCardDragState();
}

function getEquipmentFieldCardDragPlacement(event, card) {
  const bounds = card.getBoundingClientRect();
  const horizontalRatio = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
  const verticalRatio = (event.clientY - bounds.top) / Math.max(bounds.height, 1);
  const horizontalDistance = Math.abs(horizontalRatio - 0.5);
  const verticalDistance = Math.abs(verticalRatio - 0.5);

  if (verticalDistance > horizontalDistance) {
    return verticalRatio >= 0.5 ? "after" : "before";
  }

  return horizontalRatio >= 0.5 ? "after" : "before";
}
