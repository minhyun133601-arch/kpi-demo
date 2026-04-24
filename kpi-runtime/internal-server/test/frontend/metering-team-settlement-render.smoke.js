import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const teamSettlementRenderSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-settlement/render.js',
    import.meta.url
  ),
  'utf8'
);

function createClassList(initialNames = []) {
  const names = new Set(initialNames);
  return {
    add(...nextNames) {
      nextNames.forEach((name) => names.add(String(name)));
    },
    remove(...nextNames) {
      nextNames.forEach((name) => names.delete(String(name)));
    },
    toggle(name, force) {
      const normalizedName = String(name);
      if (force === undefined) {
        if (names.has(normalizedName)) {
          names.delete(normalizedName);
          return false;
        }
        names.add(normalizedName);
        return true;
      }

      if (force) {
        names.add(normalizedName);
        return true;
      }

      names.delete(normalizedName);
      return false;
    },
    contains(name) {
      return names.has(String(name));
    },
    replace(nextNames = []) {
      names.clear();
      nextNames
        .filter(Boolean)
        .map((name) => String(name))
        .forEach((name) => names.add(name));
    },
    toArray() {
      return [...names];
    },
  };
}

function appendInto(parent, node) {
  if (!node) {
    return;
  }

  if (node.isFragment) {
    node.children.forEach((child) => appendInto(parent, child));
    return;
  }

  node.parentElement = parent;
  parent.children.push(node);
}

function insertInto(parent, node, index) {
  if (!node) {
    return;
  }

  if (node.isFragment) {
    node.children.forEach((child, childIndex) => insertInto(parent, child, index + childIndex));
    return;
  }

  node.parentElement = parent;
  parent.children.splice(index, 0, node);
}

function toDatasetKey(selectorName) {
  return String(selectorName || '')
    .split('-')
    .filter(Boolean)
    .map((part, index) =>
      index === 0 ? part : `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    )
    .join('');
}

function matchesSelector(element, selector) {
  const match = String(selector || '').match(/^\[data-([^=\]]+)(?:=\"([^\"]*)\")?\]$/);
  if (!match) {
    return false;
  }

  const datasetKey = toDatasetKey(match[1]);
  if (!Object.prototype.hasOwnProperty.call(element.dataset, datasetKey)) {
    return false;
  }

  if (match[2] === undefined) {
    return true;
  }

  return String(element.dataset[datasetKey]) === match[2];
}

function querySelectorFrom(root, selector) {
  for (const child of root.children) {
    if (matchesSelector(child, selector)) {
      return child;
    }

    const nestedMatch = querySelectorFrom(child, selector);
    if (nestedMatch) {
      return nestedMatch;
    }
  }

  return null;
}

function containsNode(root, target) {
  if (root === target) {
    return true;
  }

  return root.children.some((child) => containsNode(child, target));
}

function walkNodes(root, visitor) {
  if (!root) {
    return;
  }

  visitor(root);
  root.children.forEach((child) => walkNodes(child, visitor));
}

function findByDataset(root, datasetKey, expectedValue) {
  let found = null;
  walkNodes(root, (node) => {
    if (found) {
      return;
    }

    if (!Object.prototype.hasOwnProperty.call(node.dataset, datasetKey)) {
      return;
    }

    if (expectedValue === undefined || String(node.dataset[datasetKey]) === String(expectedValue)) {
      found = node;
    }
  });
  return found;
}

function createMockElement(tagName = 'div', options = {}) {
  const classList = createClassList();
  let innerHtml = '';
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    dataset: {},
    attributes: {},
    style: {},
    title: '',
    textContent: '',
    value: '',
    placeholder: '',
    disabled: false,
    readOnly: false,
    type: '',
    inputMode: '',
    isFragment: options.isFragment === true,
    parentElement: null,
    eventListeners: {},
    append(...nodes) {
      nodes.flat().forEach((node) => appendInto(this, node));
    },
    appendChild(node) {
      appendInto(this, node);
      return node;
    },
    insertBefore(node, referenceNode) {
      const referenceIndex = this.children.indexOf(referenceNode);
      if (referenceIndex < 0) {
        appendInto(this, node);
        return node;
      }

      insertInto(this, node, referenceIndex);
      return node;
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      if (!this.eventListeners[type]) {
        this.eventListeners[type] = [];
      }
      this.eventListeners[type].push(handler);
    },
    querySelector(selector) {
      return querySelectorFrom(this, selector);
    },
    contains(target) {
      return containsNode(this, target);
    },
    classList,
  };

  Object.defineProperty(element, 'className', {
    get() {
      return classList.toArray().join(' ');
    },
    set(value) {
      classList.replace(String(value || '').split(/\s+/).filter(Boolean));
    },
  });

  Object.defineProperty(element, 'innerHTML', {
    get() {
      return innerHtml;
    },
    set(value) {
      innerHtml = String(value ?? '');
      element.children = [];
    },
  });

  return element;
}

function createTeamSettlementRenderContext(options = {}) {
  let currentResourceType = options.resourceType || 'electric';
  let currentScopeKey = options.scopeKey || 'plantB';
  let supportsSettlement = options.supportsSettlement !== false;
  let supportsBillingDocument = options.supportsBillingDocument !== false;
  let supportsDirectoryPersistence = options.supportsDirectoryPersistence !== false;
  let settlementEntry =
    options.settlementEntry ?? {
      fields: {
        base_charge: '100',
        billing_amount: '140',
      },
      completed: false,
    };
  let completionState =
    options.completionState ?? {
      entry: settlementEntry,
      missingFieldKeys: [],
    };
  let billingDocument = options.billingDocument ?? { fileName: 'bill.pdf' };
  let connectedDirectory = options.connectedDirectory === true;
  let scopeDefinitions = options.scopeDefinitions ?? [
    { key: 'plantB', label: 'Plant B' },
    { key: 'plantA', label: 'Plant A' },
  ];
  let settlementFields = options.settlementFields ?? [
    { key: 'base_charge', label: '기본요금' },
    { key: 'billing_amount', label: '청구금액' },
  ];
  let autoCalculatedFieldKeys = new Set(options.autoCalculatedFieldKeys ?? ['billing_amount']);

  const actions = createMockElement('div');
  const attachBtn = createMockElement('button');
  const previewBtn = createMockElement('button');
  const openBtn = createMockElement('button');
  const completeBtn = createMockElement('button');

  actions.appendChild(attachBtn);

  const context = {
    console,
    Date,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Set,
    RegExp,
    Promise,
    TEAM_01_01_KEY: 'team_01_01',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'plantB',
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
    },
    state: {
      currentMonth: '2026-04',
      isTeamSettlementPanelOpen: options.isTeamSettlementPanelOpen !== false,
      isBillingDocumentUploading: options.isBillingDocumentUploading === true,
    },
    elements: {
      teamSettlementSection: createMockElement('section'),
      teamSettlementFields: createMockElement('div'),
      teamSettlementFileName: createMockElement('span'),
      teamSettlementAttachBtn: attachBtn,
      teamSettlementPreviewBtn: previewBtn,
      teamSettlementOpenBtn: openBtn,
      teamSettlementCompleteBtn: completeBtn,
    },
    document: {
      createElement(tagName) {
        return createMockElement(tagName);
      },
      createDocumentFragment() {
        return createMockElement('#fragment', { isFragment: true });
      },
    },
    localFilePersistenceState: {
      get billingDocumentDirectoryHandle() {
        return connectedDirectory ? { kind: 'directory' } : null;
      },
    },
    handleTeamSettlementDirectoryConnectClick() {},
    getCurrentBillingSettlementScope() {
      return currentScopeKey;
    },
    getBillingSettlementScopeDefinitions() {
      return [...scopeDefinitions];
    },
    supportsBillingSettlementForCurrentResource() {
      return supportsSettlement;
    },
    normalizeMonthValue(value) {
      return value ? String(value) : '';
    },
    getBillingSettlementScopeTitle(scopeKey = currentScopeKey) {
      return `scope:${scopeKey}`;
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    getBillingSettlementEntry() {
      return settlementEntry;
    },
    supportsBillingDocumentForResource() {
      return supportsBillingDocument;
    },
    getBillingDocumentForMonth() {
      return billingDocument;
    },
    getBillingDocumentDirectoryName(resourceType = currentResourceType) {
      return `${resourceType}-docs`;
    },
    supportsBillingDocumentDirectoryPersistence() {
      return supportsDirectoryPersistence;
    },
    isElectricResourceType(resourceType = currentResourceType) {
      return resourceType === 'electric';
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    isWasteResourceType(resourceType = currentResourceType) {
      return resourceType === 'waste';
    },
    calculateTotalPowerMonthlyUsage() {
      return options.totalPowerMonthlyUsage ?? 123;
    },
    getBillingDocumentLabel() {
      return '청구서';
    },
    getDirectTeamMonthlyUsageInputValue(teamKey) {
      if (teamKey === 'team_01_01') {
        return '77';
      }

      if (teamKey === 'waste_team') {
        return '33';
      }

      return '';
    },
    normalizeResourceType(value) {
      return String(value || '');
    },
    getWasteBillingSettlementTeamKeyForScope(scopeKey) {
      return scopeKey ? 'waste_team' : '';
    },
    getBillingSettlementScopeLabel(scopeKey) {
      return `label:${scopeKey}`;
    },
    getTeamDisplayLabel(teamKey) {
      return `team:${teamKey}`;
    },
    getBillingSettlementAvailableMonthRangeText() {
      return '2026-01 ~ 2026-12';
    },
    getBillingSettlementFields() {
      return settlementFields;
    },
    getBillingSettlementAutoCalculatedFieldKeySet() {
      return new Set(autoCalculatedFieldKeys);
    },
    getBillingSettlementFormulaGuide(fieldKey) {
      return fieldKey === 'billing_amount' ? 'formula:billing_amount' : '';
    },
    formatBillingSettlementFieldDisplayValue(fieldKey, value, _resourceType, _scopeKey, isAuto) {
      return `${fieldKey}:${String(value || '')}:${isAuto ? 'auto' : 'manual'}`;
    },
    getBillingSettlementCompletionState() {
      return completionState;
    },
    getBillingSettlementFieldLabel(fieldKey) {
      return `label:${fieldKey}`;
    },
    __actions: actions,
    __setSupportsSettlement(nextValue) {
      supportsSettlement = Boolean(nextValue);
    },
    __setCompletionState(nextValue) {
      completionState = nextValue;
    },
    __setSettlementEntry(nextValue) {
      settlementEntry = nextValue;
    },
    __setBillingDocument(nextValue) {
      billingDocument = nextValue;
    },
    __setConnectedDirectory(nextValue) {
      connectedDirectory = Boolean(nextValue);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamSettlementRenderSource, context, {
    filename: 'team-settlement/render.js',
  });
  return context;
}

test('team settlement render builds scope toggle chips with the active scope', () => {
  const context = createTeamSettlementRenderContext();

  const toggle = context.createTeamSettlementScopeToggleElement('plantA');

  assert.equal(toggle.className, 'team-settlement-scope-toggle');
  assert.equal(toggle.attributes.role, 'tablist');
  assert.equal(toggle.children.length, 2);
  assert.equal(toggle.children[1].dataset.teamSettlementScopeToggle, 'plantA');
  assert.equal(toggle.children[1].classList.contains('is-active'), true);
});

test('team settlement render injects the directory connect button once before attach', () => {
  const context = createTeamSettlementRenderContext();

  const firstButton = context.ensureTeamSettlementDirectoryConnectButton();
  const secondButton = context.ensureTeamSettlementDirectoryConnectButton();
  const insertedButtons = context.__actions.children.filter(
    (child) => child.dataset.teamSettlementDirectoryConnect === 'true'
  );

  assert.equal(firstButton, secondButton);
  assert.equal(insertedButtons.length, 1);
  assert.equal(context.__actions.children[0], firstButton);
  assert.equal(context.__actions.children[1], context.elements.teamSettlementAttachBtn);
});

test('team settlement render builds electric plantB fields and document actions', () => {
  const context = createTeamSettlementRenderContext();

  context.renderTeamSettlementSection();

  assert.equal(context.elements.teamSettlementSection.classList.contains('is-hidden'), false);
  assert.equal(context.elements.teamSettlementFields.children.length, 4);
  assert.equal(context.elements.teamSettlementFields.children[0].className, 'team-settlement-scope-toggle');
  assert.ok(findByDataset(context.elements.teamSettlementFields, 'teamDirectUsageInput', 'team_01_01'));
  assert.ok(
    findByDataset(context.elements.teamSettlementFields, 'billingSettlementFormulaToggle', 'billing_amount')
  );
  assert.equal(context.elements.teamSettlementPreviewBtn.classList.contains('is-hidden'), false);
  assert.equal(context.elements.teamSettlementOpenBtn.classList.contains('is-hidden'), false);
  assert.equal(context.elements.teamSettlementCompleteBtn.disabled, false);
  assert.equal(context.__actions.children[0].dataset.teamSettlementDirectoryConnect, 'true');
});

test('team settlement render hides unsupported resources and clears stale fields', () => {
  const context = createTeamSettlementRenderContext({
    supportsSettlement: false,
    completionState: {
      entry: null,
      missingFieldKeys: [],
    },
  });
  context.elements.teamSettlementFields.appendChild(createMockElement('div'));
  context.elements.teamSettlementFileName.textContent = 'stale';

  context.renderTeamSettlementSection();

  assert.equal(context.elements.teamSettlementSection.classList.contains('is-hidden'), true);
  assert.equal(context.elements.teamSettlementFields.children.length, 0);
  assert.equal(context.elements.teamSettlementFileName.textContent, '');
  assert.equal(context.elements.teamSettlementCompleteBtn.classList.contains('is-hidden'), true);
});

test('team settlement completion button marks completed entries', () => {
  const completedEntry = {
    fields: {
      base_charge: '1',
    },
    completed: true,
  };
  const context = createTeamSettlementRenderContext({
    settlementEntry: completedEntry,
    completionState: {
      entry: completedEntry,
      missingFieldKeys: [],
    },
  });

  context.syncTeamSettlementCompletionButtonState('2026-04', true, 'plantB');

  assert.equal(context.elements.teamSettlementCompleteBtn.classList.contains('is-completed'), true);
  assert.equal(context.elements.teamSettlementCompleteBtn.disabled, false);
  assert.equal(context.elements.teamSettlementCompleteBtn.textContent, '취소');
});
