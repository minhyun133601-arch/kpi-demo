import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const fullscreenPopupSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('fullscreen/popup.js'),
  'utf8'
);

function setBinding(context, bindingName, value) {
  context[`__override_${bindingName}`] = value;
  vm.runInContext(`${bindingName} = globalThis.__override_${bindingName};`, context);
}

function createButtonStub() {
  return {
    innerHTML: '',
    title: '',
    attributes: {},
    classList: {
      toggle() {},
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

function createFullscreenPopupContext(options = {}) {
  const calls = {
    syncPendingMeteringDraftInputs: [],
    clearEquipmentOrderDragState: 0,
    clearEquipmentFieldCardDragState: 0,
    syncEquipmentManageMenus: 0,
    syncEquipmentOrderMenu: 0,
    syncEquipmentFullscreenUI: 0,
    renderEquipmentFieldInputs: 0,
    renderCalendar: 0,
    renderTeamMode: 0,
    renderSummary: 0,
    closeCalendarPopupWindow: 0,
    restoreEquipmentFormData: [],
    syncEquipmentRestIndicators: 0,
    syncEquipmentReadingValidationStates: 0,
    updateDirtyState: 0,
    updateActionState: 0,
    requestFullscreen: 0,
    exitFullscreen: 0,
  };

  const documentStub = {
    fullscreenElement: null,
    async exitFullscreen() {
      calls.exitFullscreen += 1;
      documentStub.fullscreenElement = null;
    },
  };
  const panelForm = {
    async requestFullscreen() {
      calls.requestFullscreen += 1;
      documentStub.fullscreenElement = panelForm;
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
    document: documentStub,
    window: {
      alert() {},
      setTimeout(handler) {
        if (typeof handler === 'function') {
          handler();
        }
        return 1;
      },
      clearTimeout() {},
    },
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    state: {
      isEquipmentFullscreen: Boolean(options.isEquipmentFullscreen),
      openEquipmentOrderMenu: true,
      openEquipmentManageKey: 'field_01',
    },
    elements: {
      panelForm,
      equipmentOrderHead: { innerHTML: 'open' },
      equipmentOrderList: { innerHTML: 'open' },
      equipmentFullscreenToggleBtn: createButtonStub(),
      teamFullscreenToggleBtn: createButtonStub(),
      teamSettlementBtn: createButtonStub(),
    },
    getCurrentMode() {
      return options.currentMode || 'equipment';
    },
    getCurrentEntry() {
      return options.currentEntry || { values: { field_01: '123' } };
    },
    getEntryDayStatus() {
      return options.currentEntryDayStatus || 'completed';
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(fullscreenPopupSource, context, {
    filename: 'fullscreen/popup.js',
  });

  setBinding(context, 'syncPendingMeteringDraftInputs', (nextOptions = {}) => {
    calls.syncPendingMeteringDraftInputs.push({ ...nextOptions });
    return true;
  });
  setBinding(context, 'clearEquipmentOrderDragState', () => {
    calls.clearEquipmentOrderDragState += 1;
  });
  setBinding(context, 'clearEquipmentFieldCardDragState', () => {
    calls.clearEquipmentFieldCardDragState += 1;
  });
  setBinding(context, 'syncEquipmentManageMenus', () => {
    calls.syncEquipmentManageMenus += 1;
  });
  setBinding(context, 'syncEquipmentOrderMenu', () => {
    calls.syncEquipmentOrderMenu += 1;
  });
  setBinding(context, 'syncEquipmentFullscreenUI', () => {
    calls.syncEquipmentFullscreenUI += 1;
  });
  setBinding(context, 'renderEquipmentFieldInputs', () => {
    calls.renderEquipmentFieldInputs += 1;
  });
  setBinding(context, 'renderCalendar', () => {
    calls.renderCalendar += 1;
  });
  setBinding(context, 'renderTeamMode', () => {
    calls.renderTeamMode += 1;
  });
  setBinding(context, 'renderSummary', () => {
    calls.renderSummary += 1;
  });
  setBinding(context, 'closeCalendarPopupWindow', () => {
    calls.closeCalendarPopupWindow += 1;
  });
  setBinding(context, 'restoreEquipmentFormData', (formData, dayStatus) => {
    calls.restoreEquipmentFormData.push({
      formData: JSON.parse(JSON.stringify(formData)),
      dayStatus,
    });
  });
  setBinding(context, 'syncEquipmentRestIndicators', () => {
    calls.syncEquipmentRestIndicators += 1;
  });
  setBinding(context, 'syncEquipmentReadingValidationStates', () => {
    calls.syncEquipmentReadingValidationStates += 1;
  });
  setBinding(context, 'updateDirtyState', () => {
    calls.updateDirtyState += 1;
  });
  setBinding(context, 'updateActionState', () => {
    calls.updateActionState += 1;
  });

  return {
    context,
    calls,
    documentStub,
    panelForm,
  };
}

test('fullscreen popup syncs current drafts before entering fullscreen', async () => {
  const { context, calls, documentStub, panelForm } = createFullscreenPopupContext();

  await context.enterFormFullscreenMode();

  assert.deepEqual(calls.syncPendingMeteringDraftInputs, [{ includeEquipmentDraft: true }]);
  assert.equal(context.state.isEquipmentFullscreen, true);
  assert.equal(calls.requestFullscreen, 1);
  assert.equal(documentStub.fullscreenElement, panelForm);
  assert.equal(calls.renderEquipmentFieldInputs, 1);
  assert.deepEqual(calls.restoreEquipmentFormData, [
    {
      formData: { values: { field_01: '123' } },
      dayStatus: 'completed',
    },
  ]);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(calls.renderSummary, 1);
});

test('fullscreen popup syncs current drafts before exiting fullscreen', async () => {
  const { context, calls, documentStub, panelForm } = createFullscreenPopupContext({
    isEquipmentFullscreen: true,
  });
  documentStub.fullscreenElement = panelForm;

  await context.exitFormFullscreenMode();

  assert.deepEqual(calls.syncPendingMeteringDraftInputs, [{ includeEquipmentDraft: true }]);
  assert.equal(context.state.isEquipmentFullscreen, false);
  assert.equal(calls.exitFullscreen, 1);
  assert.equal(calls.renderEquipmentFieldInputs, 1);
  assert.deepEqual(calls.restoreEquipmentFormData, [
    {
      formData: { values: { field_01: '123' } },
      dayStatus: 'completed',
    },
  ]);
  assert.equal(calls.renderCalendar, 1);
  assert.equal(calls.renderTeamMode, 1);
  assert.equal(calls.renderSummary, 1);
});
