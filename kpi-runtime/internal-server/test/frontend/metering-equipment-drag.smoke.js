import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentDragSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/drag.js', import.meta.url),
  'utf8'
);

function createClassList(initialNames = []) {
  const names = new Set(initialNames);
  return {
    add(...nextNames) {
      nextNames.forEach((name) => names.add(name));
    },
    remove(...nextNames) {
      nextNames.forEach((name) => names.delete(name));
    },
    contains(name) {
      return names.has(name);
    },
  };
}

function createCard(fieldKey) {
  return {
    dataset: {
      fieldKey,
    },
    classList: createClassList(["is-dragging", "is-drag-over-before"]),
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        width: 100,
        height: 100,
      };
    },
  };
}

function createEquipmentDragContext(options = {}) {
  const persistedCalls = [];
  const restoredCalls = [];
  const renderCalls = [];
  const cards = [createCard("field-a"), createCard("field-b"), createCard("field-c")];

  const context = {
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Set,
    MODES: {
      EQUIPMENT: "equipment",
    },
    state: {
      store: {
        equipmentItems: [{ id: "field-a" }, { id: "field-b" }, { id: "field-c" }],
      },
      openEquipmentManageKey: "field-b",
      isEquipmentFullscreen: options.isEquipmentFullscreen ?? true,
      loadedSnapshot: "snapshot-before",
    },
    elements: {
      fieldsGrid: {
        querySelectorAll(selector) {
          return selector === ".field-card" ? cards : [];
        },
        querySelector(selector) {
          return cards.find((card) => selector.includes(card.dataset.fieldKey)) || null;
        },
      },
      equipmentOrderList: {
        querySelectorAll() {
          return [];
        },
        querySelector() {
          return null;
        },
      },
      equipmentFieldsSection: {
        classList: createClassList(),
        scrollHeight: 400,
        clientHeight: 100,
        scrollTop: 20,
      },
    },
    supportsEquipmentEditingForCurrentResource() {
      return options.supportsEquipmentEditing ?? true;
    },
    getCurrentMode() {
      return options.currentMode ?? "equipment";
    },
    isDirty() {
      return options.isDirty ?? false;
    },
    readEquipmentFormData() {
      return {
        values: { "field-a": "11" },
        statuses: { "field-a": "entered" },
      };
    },
    getCurrentEntryDayStatus() {
      return "working";
    },
    setCurrentEquipmentItems(items) {
      context.state.store.equipmentItems = items;
    },
    persistStore(payload) {
      persistedCalls.push(payload);
    },
    renderEquipmentFieldInputs() {
      renderCalls.push("renderEquipmentFieldInputs");
    },
    restoreEquipmentFormData(formData, dayStatus) {
      restoredCalls.push({ formData, dayStatus });
    },
    renderTeamMode() {
      renderCalls.push("renderTeamMode");
    },
    createFormSnapshot() {
      return "snapshot-after";
    },
    updateDirtyState() {
      renderCalls.push("updateDirtyState");
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentDragSource, context, {
    filename: "equipment/drag.js",
  });

  return {
    context,
    cards,
    getEquipmentFieldCardDragState() {
      return vm.runInContext("equipmentFieldCardDragState", context);
    },
    persistedCalls,
    renderCalls,
    restoredCalls,
  };
}

test("equipment drag runtime gates direct reorder by mode, fullscreen, and item count", () => {
  const { context } = createEquipmentDragContext();
  assert.equal(context.canDirectReorderEquipmentFields(), true);

  const { context: noFullscreenContext } = createEquipmentDragContext({
    isEquipmentFullscreen: false,
  });
  assert.equal(noFullscreenContext.canDirectReorderEquipmentFields(), false);

  const { context: noSupportContext } = createEquipmentDragContext({
    supportsEquipmentEditing: false,
  });
  assert.equal(noSupportContext.canDirectReorderEquipmentFields(), false);
});

test("equipment drag runtime reorders cards and mirrors the UI refresh pipeline", () => {
  const { context, persistedCalls, renderCalls, restoredCalls } = createEquipmentDragContext();

  context.reorderEquipmentItems("field-a", "field-c", "after");

  assert.deepEqual(Array.from(context.state.store.equipmentItems, (item) => item.id), [
    "field-b",
    "field-c",
    "field-a",
  ]);
  assert.equal(context.state.openEquipmentManageKey, "");
  assert.equal(persistedCalls.length, 1);
  assert.equal(persistedCalls[0].skipLocalFileWrite, true);
  assert.equal(restoredCalls.length, 1);
  assert.deepEqual(renderCalls, [
    "renderEquipmentFieldInputs",
    "renderTeamMode",
    "updateDirtyState",
  ]);
  assert.equal(context.state.loadedSnapshot, "snapshot-after");
});

test("equipment drag runtime derives card drop placement from dominant pointer direction", () => {
  const { context } = createEquipmentDragContext();
  const card = createCard("field-z");

  assert.equal(
    context.getEquipmentFieldCardDragPlacement({ clientX: 40, clientY: 90 }, card),
    "after"
  );
  assert.equal(
    context.getEquipmentFieldCardDragPlacement({ clientX: 40, clientY: 10 }, card),
    "before"
  );
  assert.equal(
    context.getEquipmentFieldCardDragPlacement({ clientX: 90, clientY: 55 }, card),
    "after"
  );
});

test("equipment drag runtime clears card drag state and removes drop classes", () => {
  const { context, cards, getEquipmentFieldCardDragState } = createEquipmentDragContext();
  const dragState = getEquipmentFieldCardDragState();

  dragState.fieldKey = "field-a";
  dragState.targetKey = "field-c";
  dragState.placement = "after";

  context.clearEquipmentFieldCardDragState();

  assert.equal(dragState.fieldKey, "");
  assert.equal(dragState.targetKey, "");
  assert.equal(dragState.placement, "before");
  cards.forEach((card) => {
    assert.equal(card.classList.contains("is-dragging"), false);
    assert.equal(card.classList.contains("is-drag-over-before"), false);
  });
});
