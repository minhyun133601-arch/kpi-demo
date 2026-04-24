import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const runtimeMountDomSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('runtime/mount-dom.js'),
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
    toArray() {
      return [...names];
    },
  };
}

function createMockElement(tagName = 'div', doc = null, registry = null) {
  const classList = createClassList();
  let classNameValue = '';
  let idValue = '';
  const element = {
    tagName: String(tagName).toUpperCase(),
    ownerDocument: doc,
    parentElement: null,
    children: [],
    removed: false,
    textContent: '',
    title: '',
    type: '',
    attributes: {},
    classList,
    append(...nodes) {
      nodes.flat().forEach((node) => this.appendChild(node));
    },
    appendChild(node) {
      node.parentElement = this;
      this.children.push(node);
      registry?.registerElement(node);
      return node;
    },
    insertBefore(node, referenceNode) {
      const index = this.children.indexOf(referenceNode);
      if (index < 0) {
        return this.appendChild(node);
      }

      node.parentElement = this;
      this.children.splice(index, 0, node);
      registry?.registerElement(node);
      return node;
    },
    remove() {
      this.removed = true;
      if (this.parentElement) {
        this.parentElement.children = this.parentElement.children.filter((child) => child !== this);
      }
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };

  Object.defineProperty(element, 'className', {
    get() {
      return classNameValue;
    },
    set(value) {
      classNameValue = String(value || '');
      classList.toArray().forEach((name) => classList.remove(name));
      classNameValue
        .split(/\s+/)
        .filter(Boolean)
        .forEach((name) => classList.add(name));
    },
  });

  Object.defineProperty(element, 'id', {
    get() {
      return idValue;
    },
    set(value) {
      idValue = String(value || '');
      registry?.registerElement(element);
    },
  });

  return element;
}

function createMountRegistry() {
  const selectors = new Map();
  return {
    register(selector, element) {
      selectors.set(selector, element);
    },
    registerElement(element) {
      if (!element || element.removed) {
        return;
      }
      if (element.id) {
        selectors.set(`#${element.id}`, element);
      }
      const className = String(element.className || '').trim();
      if (className && !className.includes(' ')) {
        selectors.set(`.${className}`, element);
      }
    },
    query(selector) {
      const element = selectors.get(selector) || null;
      return element && !element.removed ? element : null;
    },
  };
}

function createMountDomContext(options = {}) {
  const errors = [];
  const registry = createMountRegistry();
  const document = {
    createElement(tagName) {
      return createMockElement(tagName, document, registry);
    },
  };
  const mountRoot = {
    querySelector(selector) {
      return registry.query(selector);
    },
  };
  const hostElement = createMockElement('div', document, registry);
  const portalRoot = createMockElement('div', document, registry);
  const windowObject = {
    location: {
      href: 'http://127.0.0.1:3103/KPI.html',
    },
    __KPI_GLOBAL_SAVE_SHELL__: options.globalSaveShell === true,
  };
  const context = {
    console: {
      error(...args) {
        errors.push(args.map((value) => String(value)).join(' '));
      },
    },
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
    URL,
    document,
    window: windowObject,
    normalizeText(value) {
      return String(value ?? '').trim();
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(runtimeMountDomSource, context, {
    filename: 'runtime/mount-dom.js',
  });

  context.__mountRoot = mountRoot;
  context.__mountDocument = document;
  context.__hostElement = hostElement;
  context.__portalRoot = portalRoot;
  vm.runInContext(
    `
      runtimeContext.mountRoot = __mountRoot;
      runtimeContext.document = __mountDocument;
      runtimeContext.hostElement = __hostElement;
      runtimeContext.portalRoot = __portalRoot;
      runtimeContext.assetBaseUrl = "http://127.0.0.1:3103/utility/apps/metering/";
    `,
    context
  );

  return {
    context,
    errors,
    registry,
    mountRoot,
    document,
    hostElement,
    portalRoot,
  };
}

function registerRequiredMountElements(registry, document) {
  [
    '.app-shell',
    '#entryForm',
    '#yearPicker',
    '#monthPicker',
    '#calendarGrid',
    '#fieldsGrid',
    '#teamTotalsGrid',
    '#teamBoards',
    '.panel-head-actions',
    '#teamModeBtn',
    '#equipmentModeBtn',
    '.mode-switch',
    '#productionPreviewResourceBtn',
  ].forEach((selector) => {
    const tagName = selector === '.panel-head-actions' || selector === '.mode-switch' ? 'div' : 'button';
    const element = createMockElement(tagName, document, registry);
    if (selector.startsWith('#')) {
      element.id = selector.slice(1);
    }
    if (selector.startsWith('.')) {
      element.className = selector.slice(1);
    }
    registry.register(selector, element);
  });

  const panelHeadActions = registry.query('.panel-head-actions');
  panelHeadActions.appendChild(registry.query('#teamModeBtn'));
  panelHeadActions.appendChild(registry.query('#equipmentModeBtn'));
}

test('runtime mount dom exposes mount context helpers and flushes cleanup handlers', () => {
  const { context, errors, hostElement, portalRoot, document } = createMountDomContext();
  const cleanupOrder = [];

  assert.equal(context.getMountDocument(), document);
  assert.equal(context.getMountRoot(), context.__mountRoot);
  assert.equal(context.getMountHostElement(), hostElement);
  assert.equal(context.getMountPortalRoot(), portalRoot);

  context.registerRuntimeCleanup(() => cleanupOrder.push('first'));
  context.registerRuntimeCleanup(() => {
    cleanupOrder.push('second');
    throw new Error('cleanup failed');
  });
  context.registerRuntimeCleanup(() => cleanupOrder.push('third'));
  context.flushRuntimeCleanups();

  assert.deepEqual(cleanupOrder, ['third', 'second', 'first']);
  assert.equal(errors.length, 1);
});

test('runtime mount dom resolves event targets and asset URLs from runtime context', () => {
  const { context } = createMountDomContext();
  const composedTarget = { id: 'composed' };
  const directTarget = { id: 'direct' };

  assert.equal(
    context.getEventTarget({
      composedPath() {
        return [composedTarget];
      },
      target: directTarget,
    }),
    composedTarget
  );
  assert.equal(context.getEventTarget({ target: directTarget }), directTarget);
  assert.equal(
    context.resolveRuntimeAssetUrl('embedded.css'),
    'http://127.0.0.1:3103/utility/apps/metering/embedded.css'
  );
  assert.equal(context.resolveRuntimeAssetUrl('   '), '');
});

test('runtime mount dom resolves required elements and injects placeholder buttons', () => {
  const { context, registry, document, hostElement } = createMountDomContext();
  registerRequiredMountElements(registry, document);

  hostElement.classList.add(
    'is-quick-entry-active',
    'is-equipment-fullscreen',
    'is-equipment-panel-scroll-mode'
  );
  const resolvedElements = context.resolveElements();

  assert.equal(resolvedElements.appShell, registry.query('.app-shell'));
  assert.equal(resolvedElements.wasteResourceBtn?.id, 'wasteResourceBtn');
  assert.equal(resolvedElements.saveEntryBtn?.id, 'saveEntryBtn');
  assert.equal(resolvedElements.teamSaveBtn?.id, 'teamSaveBtn');
  assert.equal(registry.query('#productionPreviewResourceBtn'), null);

  context.toggleMountHostStateClass('is-quick-entry-active', false);
  assert.equal(hostElement.classList.contains('is-quick-entry-active'), false);
  context.clearMountHostStateClasses();
  assert.equal(hostElement.classList.contains('is-equipment-fullscreen'), false);
  assert.equal(hostElement.classList.contains('is-equipment-panel-scroll-mode'), false);

  assert.doesNotThrow(() => context.assertMountReady());
  assert.equal(context.createDetachedElement('span').tagName, 'SPAN');
});

test('runtime mount dom removes manual save buttons when the global save shell owns them', () => {
  const { context, registry, document } = createMountDomContext({
    globalSaveShell: true,
  });
  registerRequiredMountElements(registry, document);

  const existingEquipmentSaveBtn = createMockElement('button', document, registry);
  existingEquipmentSaveBtn.id = 'saveEntryBtn';
  registry.register('#saveEntryBtn', existingEquipmentSaveBtn);

  const existingTeamSaveBtn = createMockElement('button', document, registry);
  existingTeamSaveBtn.id = 'teamSaveBtn';
  registry.register('#teamSaveBtn', existingTeamSaveBtn);

  context.ensureManualSaveButtons();

  assert.equal(existingEquipmentSaveBtn.removed, true);
  assert.equal(existingTeamSaveBtn.removed, true);
});

test('runtime mount dom asserts when required mount nodes are missing', () => {
  const { context } = createMountDomContext();

  context.resolveElements();

  assert.throws(
    () => context.assertMountReady(),
    /metering_mount_missing_elements:appShell,entryForm,yearPicker,monthPicker,calendarGrid,fieldsGrid,teamTotalsGrid,teamBoards/
  );
});
