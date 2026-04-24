import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const iconLabelsSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/icon-labels.js',
    import.meta.url
  ),
  'utf8'
);

function createFakeElement(tagName) {
  return {
    tagName: String(tagName || '').toUpperCase(),
    className: '',
    dataset: {},
    attributes: {},
    children: [],
    innerHTML: '',
    textContent: '',
    classList: {
      values: [],
      add(...classNames) {
        classNames.forEach((className) => {
          if (!this.values.includes(className)) {
            this.values.push(className);
          }
        });
      },
      contains(className) {
        return this.values.includes(className);
      },
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    append(...children) {
      this.children.push(...children);
    },
  };
}

function createIconLabelsContext() {
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
    ICON_SVGS: {
      equipment: '<svg data-icon="equipment"></svg>',
      manage: '<svg data-icon="manage"></svg>',
      resource_gas: '<svg data-icon="resource_gas"></svg>',
    },
    document: {
      createElement(tagName) {
        return createFakeElement(tagName);
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(iconLabelsSource, context, {
    filename: 'runtime/icon-labels.js',
  });
  return context;
}

test('runtime icon labels create category icon with fallback and aria metadata', () => {
  const context = createIconLabelsContext();

  const icon = context.createCategoryIcon('missing', 'field-manage-icon');

  assert.equal(icon.tagName, 'SPAN');
  assert.equal(icon.className, 'field-manage-icon');
  assert.equal(icon.dataset.iconKind, 'equipment');
  assert.equal(icon.attributes['aria-hidden'], 'true');
  assert.equal(icon.innerHTML, '<svg data-icon="equipment"></svg>');
});

test('runtime icon labels create plain icon label wrapper and text node', () => {
  const context = createIconLabelsContext();

  const label = context.createIconLabel('설비 라벨', 'manage', {
    containerTag: 'div',
    containerClass: 'field-title-content',
    textClass: 'field-title-copy',
  });

  assert.equal(label.tagName, 'DIV');
  assert.equal(label.className, 'field-title-content');
  assert.equal(label.children.length, 2);
  assert.equal(label.children[0].dataset.iconKind, 'manage');
  assert.equal(label.children[1].className, 'field-title-copy');
  assert.equal(label.children[1].textContent, '설비 라벨');
});

test('runtime icon labels create trailing badge layout when trailing icon is requested', () => {
  const context = createIconLabelsContext();

  const label = context.createIconLabel('LNG 합계', 'equipment', {
    trailingIconKey: 'resource_gas',
    trailingIconClass: 'category-icon equipment-resource-badge-icon',
  });

  const textNode = label.children[1];
  const copyNode = textNode.children[0];
  const trailingIconNode = textNode.children[1];

  assert.equal(textNode.classList.contains('has-trailing-icon'), true);
  assert.equal(copyNode.className, 'icon-label-copy-text');
  assert.equal(copyNode.textContent, 'LNG 합계');
  assert.equal(trailingIconNode.dataset.iconKind, 'resource_gas');
  assert.equal(trailingIconNode.className, 'category-icon equipment-resource-badge-icon');
});
