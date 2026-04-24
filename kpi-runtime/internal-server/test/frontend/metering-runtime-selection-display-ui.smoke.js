import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeSelectionDisplayUiSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/selection-display-ui.js'),
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

function createMockElement(initialTokens = []) {
  return {
    classList: createClassList(initialTokens),
    textContent: '',
    title: '',
    disabled: false,
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    getAttribute(name) {
      return Object.prototype.hasOwnProperty.call(this.attributes, name)
        ? this.attributes[name]
        : null;
    },
  };
}

function createRuntimeSelectionDisplayUiContext() {
  const calls = {
    syncSelectedDatePresentation: 0,
    syncSelectedEquipmentCardState: 0,
    renderTeamMode: 0,
    renderCalendar: 0,
    renderSummary: 0,
  };
  const state = {
    selectionDisplayMode: 'daily',
  };
  const elements = {
    calendarDisplayModeToggleBtn: createMockElement(),
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
    elements,
    syncSelectedDatePresentation() {
      calls.syncSelectedDatePresentation += 1;
    },
    syncSelectedEquipmentCardState() {
      calls.syncSelectedEquipmentCardState += 1;
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
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeSelectionDisplayUiSource, context, {
    filename: 'runtime/selection-display-ui.js',
  });

  return {
    context,
    calls,
    state,
    elements,
  };
}

test('runtime selection display ui syncs the monthly-only toggle state', () => {
  const { context, state, elements } = createRuntimeSelectionDisplayUiContext();

  context.syncCalendarDisplayModeToggleButton();

  assert.equal(state.selectionDisplayMode, 'monthly');
  assert.equal(elements.calendarDisplayModeToggleBtn.classList.contains('is-hidden'), true);
  assert.equal(elements.calendarDisplayModeToggleBtn.disabled, true);
  assert.equal(elements.calendarDisplayModeToggleBtn.textContent, '월별');
  assert.equal(elements.calendarDisplayModeToggleBtn.getAttribute('aria-pressed'), 'true');
  assert.equal(elements.calendarDisplayModeToggleBtn.title, '월별만 표시합니다.');
});

test('runtime selection display ui resets selection display mode and refreshes dependent views', () => {
  const { context, calls, state, elements } = createRuntimeSelectionDisplayUiContext();

  context.handleCalendarDisplayModeToggleClick();

  assert.equal(state.selectionDisplayMode, 'monthly');
  assert.equal(elements.calendarDisplayModeToggleBtn.classList.contains('is-hidden'), true);
  assert.equal(calls.syncSelectedDatePresentation, 1);
  assert.equal(calls.syncSelectedEquipmentCardState, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderSummary, 1);
});
