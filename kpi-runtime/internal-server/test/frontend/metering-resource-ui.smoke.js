import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const resourceUiSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/resource-ui.js'),
  'utf8'
);

function createClassList(initialTokens = []) {
  const tokens = new Set(initialTokens);
  return {
    add(...nextTokens) {
      nextTokens.forEach((token) => tokens.add(token));
    },
    remove(...nextTokens) {
      nextTokens.forEach((token) => tokens.delete(token));
    },
    toggle(token, force) {
      if (force === true) {
        tokens.add(token);
        return true;
      }
      if (force === false) {
        tokens.delete(token);
        return false;
      }
      if (tokens.has(token)) {
        tokens.delete(token);
        return false;
      }
      tokens.add(token);
      return true;
    },
    contains(token) {
      return tokens.has(token);
    },
    toJSON() {
      return [...tokens].sort();
    },
  };
}

function createMockElement(initialTokens = []) {
  return {
    textContent: '',
    title: '',
    placeholder: '',
    disabled: false,
    classList: createClassList(initialTokens),
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

function toPlainJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function createResourceUiContext(options = {}) {
  const calls = {
    clearEquipmentLocalAutosaveTimer: 0,
    closeBillingDocumentPreview: 0,
    exitFormFullscreenMode: 0,
    syncActiveResourceDatasetToStore: 0,
    attachResourceDatasetToStore: [],
    setCurrentMode: [],
    persistStore: [],
    renderEquipmentFieldInputs: 0,
    renderCalendar: 0,
    renderSummary: 0,
    loadEntryToForm: [],
    updateCalendarHint: 0,
    syncEquipmentFullscreenUI: 0,
    syncQuickEntryMenu: 0,
    syncCalendarDisplayModeToggleButton: 0,
    syncClearCardSelectionButton: 0,
    renderEquipmentItemCount: 0,
    renderTeamMode: 0,
    resetQuickEntryDraft: 0,
    confirmSafeMove: [],
  };
  const state = {
    store: {
      resourceType: options.resourceType || 'electric',
      mode: options.mode || 'equipment',
      resourceDatasets: {
        electric: { mode: 'equipment' },
        gas: { mode: 'equipment' },
        waste: { mode: 'team' },
        production: { mode: 'equipment' },
      },
      equipmentItems: [],
      equipmentEntries: {},
    },
    isEquipmentFullscreen: Boolean(options.isEquipmentFullscreen),
    openTeamPickerKey: 'team-picker',
    openEquipmentManageKey: 'equipment-manage',
    openEquipmentOrderMenu: true,
    openEquipmentAddMenu: true,
    openQuickEntryMenu: true,
    quickEntryResults: ['draft'],
    selectedEquipmentKeys: ['field_01'],
    selectedTeamKey: 'team_01',
    selectedTeamKeys: ['team_01'],
    teamPickerSelections: { team_01: true },
    teamCalendarSelections: { team_01: ['field_01'] },
    teamSelectionAnchorKey: 'team-anchor',
    equipmentSelectionAnchorKey: 'equipment-anchor',
    calendarSelectionAnchorDate: '2026-04-20',
    activeTeamSettlementScope: 'scope:electric',
    currentMonth: '2026-04',
  };
  const elements = {
    resourceEyebrow: createMockElement(['is-hidden']),
    appTitle: createMockElement(),
    heroBrand: createMockElement(),
    equipmentListLabel: createMockElement(),
    electricResourceBtn: createMockElement(),
    gasResourceBtn: createMockElement(),
    wasteResourceBtn: createMockElement(),
    productionResourceBtn: createMockElement(),
    equipmentItemFactorInput: createMockElement(),
    heroText: createMockElement(),
    entrySectionLabel: createMockElement(),
    equipmentModeBtn: createMockElement(),
    teamModeBtn: createMockElement(),
    equipmentFieldsSection: createMockElement(),
    teamModeSection: createMockElement(['is-hidden']),
    formMeta: createMockElement(),
    entryStatusWrap: createMockElement(),
    equipmentAddWrap: createMockElement(),
    saveEntryBtn: createMockElement(),
    teamSaveBtn: createMockElement(['is-hidden']),
    quickEntryWrap: createMockElement(),
  };

  const context = {
    console,
    JSON,
    Math,
    Array,
    Object,
    String,
    Number,
    Boolean,
    Promise,
    Date,
    document: {
      title: '',
    },
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    state,
    elements,
    normalizeResourceType(value) {
      if (value === 'gas') return 'gas';
      if (value === 'waste') return 'waste';
      if (value === 'production') return 'production';
      return 'electric';
    },
    getCurrentResourceType() {
      return context.normalizeResourceType(context.state.store.resourceType);
    },
    isGasResourceType(resourceType = context.getCurrentResourceType()) {
      return context.normalizeResourceType(resourceType) === 'gas';
    },
    isWasteResourceType(resourceType = context.getCurrentResourceType()) {
      return context.normalizeResourceType(resourceType) === 'waste';
    },
    isProductionResourceType(resourceType = context.getCurrentResourceType()) {
      return context.normalizeResourceType(resourceType) === 'production';
    },
    getResourceEyebrowText(resourceType = context.getCurrentResourceType()) {
      return `eyebrow:${context.normalizeResourceType(resourceType)}`;
    },
    getResourceTitleText(resourceType = context.getCurrentResourceType()) {
      return `title:${context.normalizeResourceType(resourceType)}`;
    },
    getEquipmentListLabelText() {
      return `list:${context.getCurrentResourceType()}`;
    },
    getUsageFactorLabel(resourceType = context.getCurrentResourceType()) {
      return `factor:${context.normalizeResourceType(resourceType)}`;
    },
    getCurrentMode() {
      return context.state.store.mode === 'team' ? 'team' : 'equipment';
    },
    getHeroDescription(mode) {
      return `hero:${mode}`;
    },
    getEntrySectionTitle() {
      return `entry:${context.getCurrentMode()}`;
    },
    supportsTeamModeForCurrentResource() {
      return options.supportsTeamMode ?? true;
    },
    supportsEquipmentModeForResource() {
      return options.supportsEquipmentMode ?? true;
    },
    supportsEquipmentModeForCurrentResource() {
      return options.supportsEquipmentMode ?? true;
    },
    supportsEquipmentEditingForCurrentResource() {
      return options.supportsEquipmentEditing ?? true;
    },
    clearEquipmentLocalAutosaveTimer() {
      calls.clearEquipmentLocalAutosaveTimer += 1;
    },
    closeBillingDocumentPreview() {
      calls.closeBillingDocumentPreview += 1;
    },
    async exitFormFullscreenMode() {
      calls.exitFormFullscreenMode += 1;
      context.state.isEquipmentFullscreen = false;
    },
    confirmSafeMove(message) {
      calls.confirmSafeMove.push(message);
      return options.confirmSafeMove ?? true;
    },
    syncActiveResourceDatasetToStore(store) {
      calls.syncActiveResourceDatasetToStore += 1;
      if (!store.resourceDatasets) {
        store.resourceDatasets = {};
      }
      store.resourceDatasets[store.resourceType] = {
        mode: store.mode,
      };
      return store.resourceDatasets[store.resourceType];
    },
    attachResourceDatasetToStore(store, resourceType) {
      const normalizedResourceType = context.normalizeResourceType(resourceType);
      calls.attachResourceDatasetToStore.push(normalizedResourceType);
      store.resourceType = normalizedResourceType;
      if (!store.resourceDatasets) {
        store.resourceDatasets = {};
      }
      if (!store.resourceDatasets[normalizedResourceType]) {
        store.resourceDatasets[normalizedResourceType] = { mode: store.mode };
      }
      const dataset = store.resourceDatasets[normalizedResourceType];
      store.mode = dataset.mode === 'team' ? 'team' : 'equipment';
      return store;
    },
    setCurrentMode(mode) {
      calls.setCurrentMode.push(mode);
      context.state.store.mode =
        context.supportsTeamModeForCurrentResource() && mode === context.MODES.TEAM
          ? context.MODES.TEAM
          : context.MODES.EQUIPMENT;
    },
    persistStore(nextOptions = {}) {
      calls.persistStore.push({ ...nextOptions });
    },
    updateCalendarHint() {
      calls.updateCalendarHint += 1;
    },
    renderEquipmentFieldInputs() {
      calls.renderEquipmentFieldInputs += 1;
    },
    renderCalendar() {
      calls.renderCalendar += 1;
    },
    renderSummary() {
      calls.renderSummary += 1;
    },
    getCurrentEntry() {
      return options.currentEntry || { values: { field_01: '11' } };
    },
    loadEntryToForm(entry) {
      calls.loadEntryToForm.push(entry);
    },
    syncEquipmentFullscreenUI() {
      calls.syncEquipmentFullscreenUI += 1;
    },
    syncQuickEntryMenu() {
      calls.syncQuickEntryMenu += 1;
    },
    syncCalendarDisplayModeToggleButton() {
      calls.syncCalendarDisplayModeToggleButton += 1;
    },
    syncClearCardSelectionButton() {
      calls.syncClearCardSelectionButton += 1;
    },
    renderEquipmentItemCount() {
      calls.renderEquipmentItemCount += 1;
    },
    renderTeamMode() {
      calls.renderTeamMode += 1;
    },
    resetQuickEntryDraft() {
      calls.resetQuickEntryDraft += 1;
    },
    getDefaultBillingSettlementScopeKey(resourceType = context.getCurrentResourceType()) {
      return `scope:${context.normalizeResourceType(resourceType)}`;
    },
    __calls: calls,
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(resourceUiSource, context, {
    filename: 'runtime/resource-ui.js',
  });
  return context;
}

test('resource ui renders resource-specific button state and labels', () => {
  const context = createResourceUiContext({
    resourceType: 'gas',
    mode: 'equipment',
  });

  context.renderResourceUI();

  assert.equal(context.elements.resourceEyebrow.textContent, 'eyebrow:gas');
  assert.equal(context.elements.resourceEyebrow.classList.contains('is-hidden'), false);
  assert.equal(context.elements.appTitle.textContent, 'title:gas');
  assert.equal(context.elements.equipmentListLabel.textContent, 'list:gas');
  assert.equal(context.elements.equipmentItemFactorInput.placeholder, 'factor:gas');
  assert.equal(context.elements.gasResourceBtn.getAttribute('aria-pressed'), 'true');
  assert.equal(context.elements.electricResourceBtn.getAttribute('aria-pressed'), 'false');
  assert.equal(context.document.title, 'title:gas');
});

test('resource ui switches resource type and resets transient selection state', async () => {
  const context = createResourceUiContext({
    resourceType: 'electric',
    mode: 'equipment',
    currentEntry: { values: { gas_meter: '22' } },
  });

  await context.applyResourceType('gas', { skipDirtyCheck: true });

  assert.equal(context.state.store.resourceType, 'gas');
  assert.equal(context.state.activeTeamSettlementScope, 'scope:gas');
  assert.equal(context.state.openTeamPickerKey, '');
  assert.equal(context.state.openEquipmentManageKey, '');
  assert.equal(context.state.openEquipmentOrderMenu, false);
  assert.equal(context.state.openEquipmentAddMenu, false);
  assert.equal(context.state.openQuickEntryMenu, false);
  assert.deepEqual(toPlainJson(context.state.quickEntryResults), []);
  assert.deepEqual(toPlainJson(context.state.selectedEquipmentKeys), []);
  assert.deepEqual(toPlainJson(context.state.selectedTeamKeys), []);
  assert.deepEqual(toPlainJson(context.state.teamPickerSelections), {});
  assert.equal(context.__calls.syncActiveResourceDatasetToStore, 1);
  assert.deepEqual(context.__calls.attachResourceDatasetToStore, ['gas']);
  assert.deepEqual(context.__calls.setCurrentMode, ['equipment']);
  assert.deepEqual(context.__calls.persistStore, [{ skipLocalFileWrite: true }]);
  assert.equal(context.__calls.renderEquipmentFieldInputs, 1);
  assert.equal(context.__calls.renderCalendar, 1);
  assert.equal(context.__calls.renderSummary, 1);
  assert.deepEqual(toPlainJson(context.__calls.loadEntryToForm[0]), { values: { gas_meter: '22' } });
  assert.equal(context.document.title, 'title:gas');
});

test('resource ui applies team mode and refreshes visible sections', async () => {
  const context = createResourceUiContext({
    resourceType: 'electric',
    mode: 'equipment',
  });

  await context.applyMode('team', { skipDirtyCheck: true });

  assert.equal(context.state.store.mode, 'team');
  assert.equal(context.state.openTeamPickerKey, '');
  assert.equal(context.state.openEquipmentOrderMenu, false);
  assert.deepEqual(toPlainJson(context.state.teamPickerSelections), {});
  assert.deepEqual(toPlainJson(context.state.selectedTeamKeys), []);
  assert.equal(context.state.teamSelectionAnchorKey, '');
  assert.deepEqual(context.__calls.persistStore, [{ skipLocalFileWrite: true }]);
  assert.equal(context.__calls.resetQuickEntryDraft, 1);
  assert.equal(context.__calls.renderCalendar, 1);
  assert.equal(context.__calls.renderSummary, 1);
  assert.equal(context.elements.equipmentFieldsSection.classList.contains('is-hidden'), true);
  assert.equal(context.elements.teamModeSection.classList.contains('is-hidden'), false);
  assert.equal(context.elements.quickEntryWrap.classList.contains('is-hidden'), true);
});

test('resource ui resolves waste and unsupported resources to the correct initial mode', () => {
  const wasteContext = createResourceUiContext({
    resourceType: 'waste',
    mode: 'equipment',
  });
  const equipmentOnlyContext = createResourceUiContext({
    resourceType: 'electric',
    mode: 'team',
    supportsTeamMode: false,
  });

  assert.equal(wasteContext.resolveInitialMode(), 'team');
  assert.equal(equipmentOnlyContext.resolveInitialMode(), 'equipment');
});
