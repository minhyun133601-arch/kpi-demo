import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentQuickEntryUiSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/quick-entry-ui.js', import.meta.url),
  'utf8'
);
const equipmentQuickEntrySource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/quick-entry.js', import.meta.url),
  'utf8'
);
const meteringStylesSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/styles.css', import.meta.url),
  'utf8'
);
const meteringEmbeddedStylesSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/embedded.css', import.meta.url),
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
      if (typeof force === 'boolean') {
        if (force) {
          tokens.add(token);
        } else {
          tokens.delete(token);
        }
        return force;
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
  };
}

function matchesSelector(node, selector) {
  if (!node || !selector) {
    return false;
  }

  const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)$/);
  if (classMatch) {
    return node.classList.contains(classMatch[1]);
  }

  const attributeMatch = selector.match(/^\[([^=\]]+)(?:="([^"]+)")?\]$/);
  if (attributeMatch) {
    const attributeValue = node.getAttribute(attributeMatch[1]);
    if (attributeValue === null) {
      return false;
    }
    return attributeMatch[2] ? attributeValue === attributeMatch[2] : true;
  }

  const tagAttributeMatch = selector.match(/^([a-zA-Z0-9_-]+)\[([^=\]]+)(?:="([^"]+)")?\]$/);
  if (tagAttributeMatch) {
    if (node.tagName.toLowerCase() !== tagAttributeMatch[1].toLowerCase()) {
      return false;
    }
    const attributeValue = node.getAttribute(tagAttributeMatch[2]);
    if (attributeValue === null) {
      return false;
    }
    return tagAttributeMatch[3] ? attributeValue === tagAttributeMatch[3] : true;
  }

  return node.tagName.toLowerCase() === selector.toLowerCase();
}

function createElementStub(tagName = 'div') {
  const attributes = new Map();
  const listeners = new Map();
  const node = {
    tagName,
    children: [],
    childNodes: [],
    parentNode: null,
    className: '',
    textContent: '',
    value: '',
    title: '',
    dataset: {},
    style: {},
    focusCalls: 0,
    selectCalls: 0,
    classList: createClassList(),
    append(...childNodes) {
      childNodes.forEach((childNode) => this.appendChild(childNode));
    },
    appendChild(childNode) {
      if (!childNode) {
        return childNode;
      }
      if (childNode.parentNode) {
        childNode.parentNode.removeChild(childNode);
      }
      childNode.parentNode = this;
      this.children.push(childNode);
      this.childNodes = this.children;
      return childNode;
    },
    removeChild(childNode) {
      this.children = this.children.filter((candidate) => candidate !== childNode);
      this.childNodes = this.children;
      childNode.parentNode = null;
      return childNode;
    },
    addEventListener(type, handler) {
      const registrations = listeners.get(type) || [];
      registrations.push(handler);
      listeners.set(type, registrations);
    },
    dispatch(type, event = {}) {
      (listeners.get(type) || []).forEach((handler) => {
        handler({
          ...event,
          currentTarget: this,
          target: event.target || this,
        });
      });
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
      if (name.startsWith('data-')) {
        const datasetKey = name
          .slice(5)
          .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        this.dataset[datasetKey] = String(value);
      }
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    },
    focus() {
      this.focusCalls += 1;
    },
    select() {
      this.selectCalls += 1;
    },
    matches(selector) {
      return matchesSelector(this, selector);
    },
    closest(selector) {
      let cursor = this;
      while (cursor) {
        if (matchesSelector(cursor, selector)) {
          return cursor;
        }
        cursor = cursor.parentNode;
      }
      return null;
    },
    querySelector(selector) {
      for (const child of this.children) {
        if (matchesSelector(child, selector)) {
          return child;
        }
        const nestedResult = child.querySelector(selector);
        if (nestedResult) {
          return nestedResult;
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      const matches = [];
      this.children.forEach((child) => {
        if (matchesSelector(child, selector)) {
          matches.push(child);
        }
        matches.push(...child.querySelectorAll(selector));
      });
      return matches;
    },
  };

  Object.defineProperty(node, 'innerHTML', {
    get() {
      return '';
    },
    set() {
      node.children = [];
      node.childNodes = node.children;
    },
  });

  return node;
}

function buildLegacyQuickEntryMenu() {
  const quickEntryMenu = createElementStub('div');
  const dragBar = createElementStub('div');
  dragBar.className = 'quick-entry-menu-drag-bar';
  dragBar.classList.add('quick-entry-menu-drag-bar');

  const head = createElementStub('div');
  head.className = 'quick-entry-menu-head';
  head.classList.add('quick-entry-menu-head');

  const copy = createElementStub('div');
  const title = createElementStub('p');
  title.className = 'quick-entry-menu-title';
  title.classList.add('quick-entry-menu-title');
  const subtitle = createElementStub('p');
  subtitle.className = 'quick-entry-menu-sub';
  subtitle.classList.add('quick-entry-menu-sub');
  copy.append(title, subtitle);

  const counter = createElementStub('div');
  counter.className = 'quick-entry-counter';
  const counterFraction = createElementStub('span');
  counterFraction.className = 'quick-entry-counter-fraction';
  counterFraction.id = 'quickEntryCounterFraction';
  counter.appendChild(counterFraction);

  head.append(copy, counter);

  const textarea = createElementStub('textarea');
  const actionRow = createElementStub('div');
  actionRow.className = 'quick-entry-action-row';
  actionRow.classList.add('quick-entry-action-row');
  const completeButton = createElementStub('button');
  actionRow.appendChild(completeButton);
  const resultList = createElementStub('div');

  quickEntryMenu.append(dragBar, head, textarea, actionRow, resultList);

  return {
    quickEntryMenu,
    quickEntryCounter: counter,
    quickEntryCounterFraction: counterFraction,
    quickEntryTextarea: textarea,
    quickEntryCompleteBtn: completeButton,
    quickEntryResultList: resultList,
  };
}

function createQuickEntryContext() {
  const documentStub = {
    createElement(tagName) {
      return createElementStub(tagName);
    },
  };
  const portalRoot = createElementStub('div');
  const quickEntryWrap = createElementStub('div');
  const quickEntryToggleBtn = createElementStub('button');
  const equipmentOrderHead = createElementStub('div');
  const equipmentOrderList = createElementStub('div');
  const legacyMenu = buildLegacyQuickEntryMenu();
  quickEntryWrap.appendChild(legacyMenu.quickEntryMenu);

  const activeFieldInputs = {
    'field-a': createElementStub('input'),
    'field-b': createElementStub('input'),
  };
  activeFieldInputs['field-a'].dataset.fieldKey = 'field-a';
  activeFieldInputs['field-b'].dataset.fieldKey = 'field-b';
  activeFieldInputs['field-a'].value = '';
  activeFieldInputs['field-b'].value = '44';

  const resourceDatasets = {
    electric: {
      equipmentItems: [
        { id: 'field-a', label: '전기 A', decimalDigits: 1 },
        { id: 'field-b', label: '전기 B', decimalDigits: 0 },
      ],
      equipmentEntries: {},
    },
    gas: {
      equipmentItems: [{ id: 'gas-a', label: '가스 A', decimalDigits: 0 }],
      equipmentEntries: {
        '2026-04-18': {
          values: {
            'gas-a': '77',
          },
        },
      },
    },
  };

  let hostStateActive = false;
  let dirtyStateCalls = 0;
  let actionStateCalls = 0;
  let autosaveCalls = 0;
  let restSyncCalls = 0;
  let validationSyncCalls = 0;
  const suppressedQuickEntryValidationKeys = new Set();

  const context = {
    console,
    Date,
    JSON,
    Math,
    Promise,
    Array,
    Object,
    String,
    Number,
    Boolean,
    document: documentStub,
    window: {
      setTimeout(handler) {
        if (typeof handler === 'function') {
          handler();
        }
        return 1;
      },
    },
    QUICK_ENTRY_RESULT_LIMIT: 5,
    QUICK_ENTRY_HIGHLIGHT_DURATION: 1200,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
    },
    state: {
      selectedDate: '2026-04-18',
      openQuickEntryMenu: false,
      openEquipmentAddMenu: true,
      openEquipmentManageKey: 'field-b',
      openEquipmentOrderMenu: true,
      quickEntryResults: [],
      store: {
        resourceType: 'electric',
        mode: 'equipment',
        equipmentItems: resourceDatasets.electric.equipmentItems,
        equipmentEntries: resourceDatasets.electric.equipmentEntries,
        resourceDatasets,
      },
    },
    elements: {
      quickEntryWrap,
      quickEntryToggleBtn,
      quickEntryMenu: legacyMenu.quickEntryMenu,
      quickEntryTextarea: legacyMenu.quickEntryTextarea,
      quickEntryCompleteBtn: legacyMenu.quickEntryCompleteBtn,
      quickEntryResultList: legacyMenu.quickEntryResultList,
      quickEntryCounter: legacyMenu.quickEntryCounter,
      quickEntryCounterFraction: legacyMenu.quickEntryCounterFraction,
      equipmentOrderHead,
      equipmentOrderList,
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    normalizeEntryValue(value) {
      return String(value || '').trim();
    },
    normalizeResourceType(value) {
      return String(value || '').trim().toLowerCase() === 'gas' ? 'gas' : 'electric';
    },
    getSuppressedQuickEntryValidationFieldKeys(resourceType) {
      const normalizedResourceType = context.normalizeResourceType(resourceType);
      const fieldKeys = new Set();
      suppressedQuickEntryValidationKeys.forEach((key) => {
        const [candidateResourceType = '', candidateFieldKey = ''] = String(key).split('::');
        if (candidateResourceType === normalizedResourceType && candidateFieldKey) {
          fieldKeys.add(candidateFieldKey);
        }
      });
      return fieldKeys;
    },
    suppressQuickEntryFieldValidation(resourceType, fieldKey) {
      suppressedQuickEntryValidationKeys.add(
        `${context.normalizeResourceType(resourceType)}::${String(fieldKey || '').trim()}`
      );
    },
    clearQuickEntryFieldValidationSuppression(resourceType = '', fieldKey = '') {
      if (!resourceType && !fieldKey) {
        suppressedQuickEntryValidationKeys.clear();
        return;
      }

      suppressedQuickEntryValidationKeys.delete(
        `${context.normalizeResourceType(resourceType)}::${String(fieldKey || '').trim()}`
      );
    },
    getCurrentResourceType() {
      return context.normalizeResourceType(context.state.store.resourceType);
    },
    isElectricResourceType(resourceType = context.getCurrentResourceType()) {
      return context.normalizeResourceType(resourceType) === 'electric';
    },
    isGasResourceType(resourceType = context.getCurrentResourceType()) {
      return context.normalizeResourceType(resourceType) === 'gas';
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getCurrentMode() {
      return 'equipment';
    },
    getActiveResourceDataset(store, resourceType) {
      return store?.resourceDatasets?.[context.normalizeResourceType(resourceType)] || null;
    },
    getMountDocument() {
      return documentStub;
    },
    getMountPortalRoot() {
      return portalRoot;
    },
    toggleMountHostStateClass(className, isActive) {
      if (className === 'is-quick-entry-active') {
        hostStateActive = isActive;
      }
    },
    resetEquipmentAddDraft() {},
    syncEquipmentAddMenu() {},
    syncEquipmentManageMenus() {},
    clearEquipmentOrderDragState() {},
    syncEquipmentOrderMenu() {},
    formatFullDate(dateString) {
      return dateString;
    },
    getEquipmentDisplayLabel(item) {
      return item?.label || '';
    },
    isAutoCalculatedEquipment() {
      return false;
    },
    isHiddenEquipmentFieldCard() {
      return false;
    },
    getEquipmentDecimalDigits(fieldKey) {
      const currentItem = context.state.store.equipmentItems.find((item) => item.id === fieldKey);
      return Number.isInteger(currentItem?.decimalDigits) ? currentItem.decimalDigits : 0;
    },
    sanitizeEquipmentInputValue(value, options = {}) {
      const maxFractionDigits = Number.isInteger(options.maxFractionDigits)
        ? options.maxFractionDigits
        : 2;
      const rawValue = String(value || '').replace(/,/g, '').replace(/[^\d.]/g, '');
      if (!rawValue) {
        return '';
      }
      const [integerPart = '', ...decimalParts] = rawValue.split('.');
      if (!decimalParts.length || maxFractionDigits <= 0) {
        return integerPart;
      }
      const decimalPart = decimalParts.join('').slice(0, maxFractionDigits);
      return decimalPart ? `${integerPart}.${decimalPart}` : integerPart;
    },
    formatEquipmentInputDisplayByDecimalDigits(value) {
      return String(value || '');
    },
    getEquipmentInputPlaceholder(fieldKey) {
      return `이전 ${fieldKey}`;
    },
    getEquipmentPreviousReadingMeta(fieldKey) {
      return {
        text: `이전값 ${fieldKey} (04.17)`,
        valueText: fieldKey,
        dateText: '04.17',
      };
    },
    getEntryDayStatus(entry) {
      return entry?.dayStatus || '';
    },
    readEquipmentFormData() {
      return {
        values: Object.fromEntries(
          Object.entries(activeFieldInputs)
            .map(([fieldKey, input]) => [fieldKey, context.normalizeEntryValue(input.value)])
            .filter(([, value]) => value !== '')
        ),
        statuses: {},
        fieldDayStatuses: {},
      };
    },
    getCurrentEntryDayStatus() {
      return '';
    },
    getEquipmentReadingValidationIssuesForDate(formData, _dateString, options = {}) {
      if (options.skipFieldKeys?.has('gas-a')) {
        return [];
      }
      if (formData?.values?.['gas-a'] === '9') {
        return [{ fieldKey: 'gas-a', message: '가스 값 확인' }];
      }
      return [];
    },
    hasEntryData(entry) {
      return Boolean(Object.keys(entry?.values || {}).length || entry?.dayStatus);
    },
    getEquipmentFieldInput(fieldKey) {
      return activeFieldInputs[fieldKey] || null;
    },
    syncEquipmentRestIndicators() {
      restSyncCalls += 1;
    },
    syncEquipmentReadingValidationStates() {
      validationSyncCalls += 1;
    },
    scheduleEquipmentLocalAutosave() {
      autosaveCalls += 1;
    },
    updateDirtyState() {
      dirtyStateCalls += 1;
    },
    updateActionState() {
      actionStateCalls += 1;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentQuickEntryUiSource, context, {
    filename: 'equipment/quick-entry-ui.js',
  });
  vm.runInContext(equipmentQuickEntrySource, context, {
    filename: 'equipment/quick-entry.js',
  });

  return {
    context,
    portalRoot,
    quickEntryWrap,
    quickEntryToggleBtn,
    activeFieldInputs,
    getHostStateActive() {
      return hostStateActive;
    },
    getDirtyStateCalls() {
      return dirtyStateCalls;
    },
    getActionStateCalls() {
      return actionStateCalls;
    },
    getAutosaveCalls() {
      return autosaveCalls;
    },
    getRestSyncCalls() {
      return restSyncCalls;
    },
    getValidationSyncCalls() {
      return validationSyncCalls;
    },
  };
}

function findPopupFieldInput(context, resourceType, fieldKey) {
  return context
    .getQuickEntryPopupBody()
    .querySelectorAll('input[data-quick-entry-popup-field]')
    .find(
      (input) =>
        input.dataset.resourceType === resourceType && input.dataset.fieldKey === fieldKey
    );
}

test('quick-entry popup opens from the existing button and focuses the search input', () => {
  const { context, portalRoot, getHostStateActive } = createQuickEntryContext();

  context.toggleQuickEntryMenu();

  assert.equal(context.state.openQuickEntryMenu, true);
  assert.equal(context.state.openEquipmentAddMenu, false);
  assert.equal(context.state.openEquipmentManageKey, '');
  assert.equal(context.state.openEquipmentOrderMenu, false);
  assert.equal(context.elements.quickEntryMenu.parentNode, portalRoot);
  assert.equal(context.getQuickEntryPopupSearchInput().focusCalls, 1);
  assert.equal(context.elements.quickEntryCounterFraction.textContent, '2/3');
  assert.equal(getHostStateActive(), true);
});

test('quick-entry popup skipStateRefresh option prevents closed-menu state recursion', () => {
  const { context, getDirtyStateCalls, getActionStateCalls } = createQuickEntryContext();

  context.syncQuickEntryMenu({ skipStateRefresh: true });

  assert.equal(getDirtyStateCalls(), 0);
  assert.equal(getActionStateCalls(), 0);

  context.syncQuickEntryMenu();

  assert.equal(getDirtyStateCalls(), 1);
  assert.equal(getActionStateCalls(), 1);
});

test('quick-entry popup renders electric and gas equipment rows together', () => {
  const { context } = createQuickEntryContext();

  context.toggleQuickEntryMenu();

  const popupRows = context
    .getQuickEntryPopupBody()
    .querySelectorAll('[data-quick-entry-popup-row]');

  assert.equal(popupRows.length, 3);
  assert.equal(
    context.getQuickEntryPopupBody().querySelectorAll('[data-quick-entry-popup-section]').length,
    2
  );
  assert.equal(
    context
      .getQuickEntryPopupBody()
      .querySelectorAll('[data-quick-entry-popup-grid]')
      .map((node) => node.className)
      .every((className) => className.includes('is-dense-entry-grid')),
    true
  );
  assert.equal(
    context
      .getQuickEntryPopupBody()
      .querySelectorAll('[data-quick-entry-resource-count]')
      .map((node) => node.textContent)
      .join('|'),
    '1/2 입력|1/1 입력'
  );
  assert.equal(
    context.getQuickEntryPopupBody().querySelectorAll('[data-quick-entry-popup-previous]').length,
    0
  );
  assert.equal(
    popupRows[0].children[0].children[1].textContent.includes('소수점'),
    true
  );
});

test('quick-entry popup CSS uses a dense fullscreen grid instead of large row cards', () => {
  [meteringStylesSource, meteringEmbeddedStylesSource].forEach((source) => {
    assert.match(source, /\.quick-entry-popup-panel\s*\{[\s\S]*width:\s*min\(1720px,\s*100%\)/);
    assert.match(source, /\.quick-entry-popup-panel\s*\{[\s\S]*min-height:\s*calc\(100vh - clamp\(16px,\s*2\.8vw,\s*32px\)\)/);
    assert.match(source, /\.quick-entry-popup-body\s*\{[\s\S]*overflow:\s*hidden/);
    assert.match(source, /\.quick-entry-popup-row-list\s*\{[\s\S]*grid-template-columns:\s*repeat\(auto-fill,\s*minmax\(172px,\s*1fr\)\)/);
    assert.match(source, /\.quick-entry-popup-row\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(74px,\s*94px\)/);
    assert.match(source, /\.quick-entry-popup-row-title\s*\{[\s\S]*white-space:\s*nowrap/);
    assert.doesNotMatch(source, /\.quick-entry-popup-row-meta\.has-previous-value/);
    assert.doesNotMatch(source, /\.field-card-previous\s*\{/);
  });
});

test('quick-entry popup updates the active resource form and autosave pipeline', () => {
  const {
    context,
    activeFieldInputs,
    getAutosaveCalls,
    getDirtyStateCalls,
    getActionStateCalls,
    getRestSyncCalls,
    getValidationSyncCalls,
  } = createQuickEntryContext();

  context.toggleQuickEntryMenu();

  const fieldInput = findPopupFieldInput(context, 'electric', 'field-a');
  fieldInput.value = '12.5';

  context.handleQuickEntryPopupFieldInput({ target: fieldInput });

  assert.equal(activeFieldInputs['field-a'].value, '12.5');
  assert.equal(context.elements.quickEntryCounterFraction.textContent, '3/3');
  assert.equal(getAutosaveCalls(), 1);
  assert.equal(getRestSyncCalls(), 1);
  assert.equal(getValidationSyncCalls(), 1);
  assert.equal(getDirtyStateCalls(), 1);
  assert.equal(getActionStateCalls(), 1);
});

test('quick-entry popup stores non-active resource values directly in that dataset', () => {
  const { context, getDirtyStateCalls, getActionStateCalls } = createQuickEntryContext();

  context.toggleQuickEntryMenu();

  const gasInput = findPopupFieldInput(context, 'gas', 'gas-a');
  gasInput.value = '123';

  context.handleQuickEntryPopupFieldInput({ target: gasInput });

  assert.equal(
    context.state.store.resourceDatasets.gas.equipmentEntries['2026-04-18'].values['gas-a'],
    '123'
  );
  assert.equal(getDirtyStateCalls(), 1);
  assert.equal(getActionStateCalls(), 1);
});

test('quick-entry popup suppresses transient validation while typing and restores it on blur', () => {
  const { context, getValidationSyncCalls, getDirtyStateCalls, getActionStateCalls } =
    createQuickEntryContext();

  context.toggleQuickEntryMenu();

  const gasInput = findPopupFieldInput(context, 'gas', 'gas-a');
  gasInput.value = '9';

  context.handleQuickEntryPopupFieldInput({ target: gasInput });

  const gasRow = gasInput.closest('[data-quick-entry-popup-row]');
  const gasMessage = gasRow.querySelector('[data-quick-entry-popup-message]');
  assert.equal(gasRow.classList.contains('is-invalid'), false);
  assert.equal(gasMessage.classList.contains('is-hidden'), true);

  gasInput.dispatch('blur');

  assert.equal(gasRow.classList.contains('is-invalid'), true);
  assert.equal(gasMessage.classList.contains('is-hidden'), false);
  assert.equal(gasMessage.textContent, '가스 값 확인');
  assert.equal(getValidationSyncCalls(), 1);
  assert.equal(getDirtyStateCalls(), 2);
  assert.equal(getActionStateCalls(), 2);
});
