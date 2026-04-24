import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeSelectionUiSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/selection-ui.js'),
  'utf8'
);

function createClassList(initialTokens = []) {
  const tokens = new Set(initialTokens);
  return {
    add(...nextTokens) {
      nextTokens.forEach((token) => tokens.add(String(token)));
    },
    remove(...nextTokens) {
      nextTokens.forEach((token) => tokens.delete(String(token)));
    },
    toggle(token, force) {
      const normalizedToken = String(token);
      if (force === true) {
        tokens.add(normalizedToken);
        return true;
      }
      if (force === false) {
        tokens.delete(normalizedToken);
        return false;
      }
      if (tokens.has(normalizedToken)) {
        tokens.delete(normalizedToken);
        return false;
      }
      tokens.add(normalizedToken);
      return true;
    },
    contains(token) {
      return tokens.has(String(token));
    },
    toJSON() {
      return [...tokens].sort();
    },
  };
}

function detachChild(child) {
  const parent = child?.parentElement;
  if (!parent || !Array.isArray(parent.children)) {
    return;
  }

  const childIndex = parent.children.indexOf(child);
  if (childIndex >= 0) {
    parent.children.splice(childIndex, 1);
  }
}

function createMockContainer(options = {}) {
  return {
    children: [],
    parentElement: null,
    matchesPanelHeadActions: Boolean(options.isPanelHeadActions),
    queryMap: options.queryMap || {},
    appendChild(child) {
      detachChild(child);
      this.children.push(child);
      child.parentElement = this;
      return child;
    },
    insertBefore(child, sibling) {
      detachChild(child);
      const siblingIndex = this.children.indexOf(sibling);
      if (siblingIndex >= 0) {
        this.children.splice(siblingIndex, 0, child);
      } else {
        this.children.push(child);
      }
      child.parentElement = this;
      return child;
    },
    querySelector(selector) {
      return this.queryMap[selector] || null;
    },
  };
}

function createMockElement(initialTokens = [], options = {}) {
  const element = createMockContainer(options);
  element.classList = createClassList(initialTokens);
  element.textContent = '';
  element.title = '';
  element.disabled = false;
  element.attributes = {};
  element.dataset = { ...(options.dataset || {}) };
  element.setAttribute = function setAttribute(name, value) {
    this.attributes[name] = String(value);
  };
  element.getAttribute = function getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  };
  element.closest = function closest(selector) {
    if (selector !== '.panel-head-actions') {
      return null;
    }

    let current = this.parentElement;
    while (current) {
      if (current.matchesPanelHeadActions) {
        return current;
      }
      current = current.parentElement;
    }
    return null;
  };
  return element;
}

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createRuntimeSelectionUiContext(options = {}) {
  const calls = {
    syncClearCardSelectionButton: 0,
    syncSelectedDatePresentation: 0,
    renderTeamMode: 0,
    renderCalendar: 0,
    renderSummary: 0,
    syncSelectedEquipmentCardState: 0,
  };
  const defaultParent = createMockContainer({
    isPanelHeadActions: true,
  });
  const embeddedReturnHost = createMockContainer();
  const clearCardSelectionBtn = createMockElement(options.clearButtonTokens || []);
  const teamSettlementBtn = createMockElement();
  defaultParent.appendChild(clearCardSelectionBtn);
  defaultParent.appendChild(teamSettlementBtn);

  const state = {
    selectedEquipmentKeys: [...(options.selectedEquipmentKeys || [])],
    selectedTeamKey: options.selectedTeamKey || '',
    selectedTeamKeys: [...(options.selectedTeamKeys || [])],
    teamSelectionAnchorKey: options.teamSelectionAnchorKey || '',
    equipmentSelectionAnchorKey: options.equipmentSelectionAnchorKey || '',
    store: {
      equipmentItems: [...(options.equipmentItems || [])],
    },
  };
  const context = {
    console,
    Date,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    RegExp,
    state,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    elements: {
      clearCardSelectionBtn,
      teamSettlementBtn,
      teamTotalsGrid: createMockContainer({
        queryMap: {
          '[data-team-total-return-host]': options.hasEmbeddedReturnHost === false
            ? null
            : embeddedReturnHost,
        },
      }),
    },
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getSelectedTeamKeys() {
      return Array.isArray(context.state.selectedTeamKeys)
        ? [...context.state.selectedTeamKeys]
        : [];
    },
    syncSelectedDatePresentation() {
      calls.syncSelectedDatePresentation += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    renderCalendar() {
      calls.renderCalendar += 1;
    },
    renderSummary() {
      calls.renderSummary += 1;
    },
    syncSelectedEquipmentCardState() {
      calls.syncSelectedEquipmentCardState += 1;
    },
    isElectricResourceType() {
      return (options.resourceType || 'electric') === 'electric';
    },
    isGasResourceType() {
      return (options.resourceType || 'electric') === 'gas';
    },
    isHiddenEquipmentFieldCard(item) {
      return (options.hiddenEquipmentIds || []).includes(item?.id);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeSelectionUiSource, context, {
    filename: 'runtime/selection-ui.js',
  });

  return {
    context,
    calls,
    state,
    elements: context.elements,
    defaultParent,
    embeddedReturnHost,
  };
}

test('runtime selection ui filters hidden equipment ids from the active selection', () => {
  const { context } = createRuntimeSelectionUiContext({
    selectedEquipmentKeys: ['field_visible', 'field_hidden', 'field_missing'],
    equipmentItems: [
      { id: 'field_visible' },
      { id: 'field_hidden' },
    ],
    hiddenEquipmentIds: ['field_hidden'],
  });

  assert.deepEqual(toPlainJson(context.getSelectedEquipmentIds()), ['field_visible']);
});

test('runtime selection ui clears equipment selection and refreshes the equipment views', () => {
  const { context, calls, state } = createRuntimeSelectionUiContext({
    currentMode: 'equipment',
    selectedEquipmentKeys: ['field_a'],
    equipmentSelectionAnchorKey: 'field_anchor',
    equipmentItems: [{ id: 'field_a' }],
  });

  context.clearCardSelection();

  assert.deepEqual(toPlainJson(state.selectedEquipmentKeys), []);
  assert.equal(state.equipmentSelectionAnchorKey, '');
  assert.equal(calls.syncSelectedEquipmentCardState, 1);
  assert.equal(calls.syncSelectedDatePresentation, 1);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderSummary, 1);
});

test('runtime selection ui clears team selection and refreshes the team views', () => {
  const { context, calls, state } = createRuntimeSelectionUiContext({
    currentMode: 'team',
    resourceType: 'gas',
    selectedTeamKey: 'team_a',
    selectedTeamKeys: ['team_a'],
    teamSelectionAnchorKey: 'team_anchor',
  });

  context.handleClearCardSelectionClick();

  assert.equal(state.selectedTeamKey, '');
  assert.deepEqual(toPlainJson(state.selectedTeamKeys), []);
  assert.equal(state.teamSelectionAnchorKey, '');
  assert.equal(calls.syncSelectedDatePresentation, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderSummary, 1);
});

test('runtime selection ui renders the team return button inside the total card host', () => {
  const { context, elements, embeddedReturnHost } = createRuntimeSelectionUiContext({
    currentMode: 'team',
    resourceType: 'electric',
    selectedTeamKeys: ['team_a'],
  });

  context.syncClearCardSelectionButton();

  assert.equal(elements.clearCardSelectionBtn.textContent, '←');
  assert.equal(
    elements.clearCardSelectionBtn.getAttribute('aria-label'),
    'Plant B 전력 총량, Plant A 전력 총량, 무효전력 보기'
  );
  assert.equal(
    elements.clearCardSelectionBtn.title,
    'Plant B 전력 총량, Plant A 전력 총량, 무효전력 보기'
  );
  assert.equal(elements.clearCardSelectionBtn.disabled, false);
  assert.equal(elements.clearCardSelectionBtn.classList.contains('is-icon-only'), true);
  assert.equal(elements.clearCardSelectionBtn.classList.contains('is-hidden'), false);
  assert.equal(
    elements.clearCardSelectionBtn.classList.contains('is-inline-inside-total-card'),
    true
  );
  assert.equal(elements.clearCardSelectionBtn.parentElement, embeddedReturnHost);
});

test('runtime selection ui falls back to the default action row for equipment selection', () => {
  const { context, elements, defaultParent } = createRuntimeSelectionUiContext({
    currentMode: 'equipment',
    resourceType: 'electric',
    selectedEquipmentKeys: ['field_a'],
    equipmentItems: [{ id: 'field_a' }],
    clearButtonTokens: ['is-inline-inside-total-card', 'is-icon-only'],
    hasEmbeddedReturnHost: false,
  });

  context.syncClearCardSelectionButton();

  assert.equal(elements.clearCardSelectionBtn.textContent, '선택 해제');
  assert.equal(
    elements.clearCardSelectionBtn.title,
    '선택한 카드를 해제합니다.'
  );
  assert.equal(elements.clearCardSelectionBtn.classList.contains('is-icon-only'), false);
  assert.equal(
    elements.clearCardSelectionBtn.classList.contains('is-inline-inside-total-card'),
    false
  );
  assert.equal(elements.clearCardSelectionBtn.parentElement, defaultParent);
  assert.equal(defaultParent.children.indexOf(elements.clearCardSelectionBtn), 0);
  assert.equal(defaultParent.children.indexOf(elements.teamSettlementBtn), 1);
});
