import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

import { resolveMeteringBundleSourceUrl } from '../../src/lib/metering-bundle-draft.js';

const equipmentInputStateSource = await fs.readFile(
  resolveMeteringBundleSourceUrl('equipment/input-state.js'),
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

function createStubElement(overrides = {}) {
  const attributes = new Map();
  return {
    dataset: {},
    value: '',
    title: '',
    textContent: '',
    placeholder: '',
    disabled: false,
    readOnly: false,
    classList: createClassList(),
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) || null;
    },
    matches() {
      return false;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    ...overrides,
  };
}

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function shiftDate(dateString, offsetDays) {
  const date = new Date(`${dateString}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function shiftMonthValue(monthValue, offsetMonths) {
  const [year, month] = String(monthValue || '')
    .split('-')
    .map((value) => Number.parseInt(value, 10));
  const date = new Date(Date.UTC(year, (month || 1) - 1 + offsetMonths, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function createEquipmentInputStateContext() {
  const equipmentById = new Map([
    ['field_01', { id: 'field_01', label: '보일러', kind: 'normal' }],
    ['field_02', { id: 'field_02', label: '기타', kind: 'other' }],
    ['field_03', { id: 'field_03', label: 'Supply Fan기', kind: 'normal' }],
  ]);

  const inputs = new Map([
    [
      'field_01',
      createStubElement({
        dataset: {
          fieldKey: 'field_01',
          lastValue: '',
        },
        value: '12',
        matches(selector) {
          return selector === 'input[data-field-key]';
        },
      }),
    ],
    [
      'field_02',
      createStubElement({
        dataset: {
          fieldKey: 'field_02',
          lastValue: '',
        },
        value: 'auto',
        readOnly: true,
        matches(selector) {
          return selector === 'input[data-field-key]';
        },
      }),
    ],
    [
      'field_03',
      createStubElement({
        dataset: {
          fieldKey: 'field_03',
          lastValue: '',
        },
        value: '',
        matches(selector) {
          return selector === 'input[data-field-key]';
        },
      }),
    ],
  ]);

  const cards = new Map([
    ['field_01', createStubElement({ dataset: { fieldKey: 'field_01' } })],
    ['field_02', createStubElement({ dataset: { fieldKey: 'field_02' } })],
    ['field_03', createStubElement({ dataset: { fieldKey: 'field_03' } })],
  ]);

  const toggles = new Map([
    ['field_01', createStubElement({ dataset: { statusKey: 'field_01' } })],
    ['field_02', createStubElement({ dataset: { statusKey: 'field_02' } })],
    ['field_03', createStubElement({ dataset: { statusKey: 'field_03' } })],
  ]);

  const manageControls = new Map([
    [
      'field_01',
      {
        root: createStubElement({
          dataset: {
            manageFieldKey: 'field_01',
          },
        }),
        toggle: createStubElement({
          dataset: {
            manageToggleKey: 'field_01',
          },
        }),
        menu: createStubElement(),
      },
    ],
    [
      'field_03',
      {
        root: createStubElement({
          dataset: {
            manageFieldKey: 'field_03',
          },
        }),
        toggle: createStubElement({
          dataset: {
            manageToggleKey: 'field_03',
          },
        }),
        menu: createStubElement(),
      },
    ],
  ]);

  manageControls.forEach((control) => {
    control.root.querySelector = (selector) => {
      if (selector === 'button[data-manage-toggle-key]') {
        return control.toggle;
      }
      if (selector === '.field-manage-menu') {
        return control.menu;
      }
      return null;
    };
  });

  const fieldsGrid = createStubElement({
    querySelectorAll(selector) {
      if (selector === 'input[data-field-key]') {
        return [...inputs.values()];
      }
      if (selector === '.field-manage') {
        return [...manageControls.values()].map((control) => control.root);
      }
      return [];
    },
    querySelector(selector) {
      const cardMatch = selector.match(/\.field-card\[data-field-key="([^"]+)"\]/);
      if (cardMatch) {
        return cards.get(cardMatch[1]) || null;
      }

      const inputMatch = selector.match(/input\[data-field-key="([^"]+)"\]/);
      if (inputMatch) {
        return inputs.get(inputMatch[1]) || null;
      }

      const toggleMatch = selector.match(/button\[data-status-key="([^"]+)"\]/);
      if (toggleMatch) {
        return toggles.get(toggleMatch[1]) || null;
      }

      return null;
    },
  });

  const validationDetails = new Map([
    ['field_01|2026-04-18|12', { rawValue: '12', value: 12, fractionDigits: 0 }],
    ['field_03|2026-04-18|30', { rawValue: '30', value: 30, fractionDigits: 0 }],
  ]);
  const storedReadingDetails = new Map([
    ['field_01|2026-04-18', { rawValue: '10', value: 10, fractionDigits: 0 }],
    ['field_03|2026-04-18', { rawValue: '28', value: 28, fractionDigits: 0 }],
  ]);
  const adjacentValidationReadings = new Map([
    ['field_01|2026-04-18|-1', { dateString: '2026-04-17', value: 15 }],
    ['field_03|2026-04-18|1', { dateString: '2026-04-19', value: 25 }],
  ]);
  const adjacentStoredReadings = new Map([
    ['field_03|2026-04-18|-1', { dateString: '2026-04-16', rawValue: '8', value: 8 }],
  ]);

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
    Map,
    Set,
    RegExp,
    Promise,
    MODES: {
      EQUIPMENT: 'equipment',
      TEAM: 'team',
    },
    GAS_READING_VALIDATION_COMPARISON_EXCEPTIONS: new Set(),
    state: {
      selectedDate: '2026-04-18',
      currentMonth: '2026-04',
      openEquipmentManageKey: 'field_01',
      store: {
        equipmentEntries: {
          '2026-04-16': {
            values: {
              field_03: '8',
            },
            statuses: {
              field_03: 'inactive',
            },
            fieldDayStatuses: {},
            dayStatus: '',
          },
          '2026-04-18': {
            values: {
              field_01: '12',
              field_03: '30',
            },
            statuses: {},
            fieldDayStatuses: {},
            dayStatus: 'completed',
          },
        },
      },
    },
    elements: {
      fieldsGrid,
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    normalizeEntryValue(value) {
      return String(value ?? '').trim();
    },
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getCurrentMode() {
      return 'equipment';
    },
    getEquipmentItem(fieldKey) {
      return equipmentById.get(fieldKey) || null;
    },
    isAutoCalculatedEquipment(equipment) {
      return equipment?.kind === 'other';
    },
    formatEquipmentInputDisplay(value) {
      const normalizedValue = String(value || '').trim();
      return normalizedValue ? `fmt:${normalizedValue}` : '';
    },
    getCurrentEntryDayStatus() {
      return 'completed';
    },
    getAdjacentStoredEquipmentReadingDetail(fieldKey, dateString, offset) {
      return adjacentStoredReadings.get(`${fieldKey}|${dateString}|${offset}`) || null;
    },
    getEquipmentReadingDetailOnDate(fieldKey, dateString) {
      return storedReadingDetails.get(`${fieldKey}|${dateString}`) || null;
    },
    getValidationReadingDetailOnDate(fieldKey, dateString, options = {}) {
      const rawValue = options.preferCurrentRawValue
        ? String(options.currentRawValue || '').trim()
        : storedReadingDetails.get(`${fieldKey}|${dateString}`)?.rawValue || '';
      return validationDetails.get(`${fieldKey}|${dateString}|${rawValue}`) || null;
    },
    getAdjacentValidationRecordedEquipmentReading(fieldKey, dateString, offset) {
      return adjacentValidationReadings.get(`${fieldKey}|${dateString}|${offset}`) || null;
    },
    getEquipmentDisplayLabel(equipment) {
      return equipment?.label || '';
    },
    formatShortDate(dateString) {
      return dateString;
    },
    formatNumber(value) {
      return String(value);
    },
    readEquipmentFormData() {
      return {
        values: {
          field_01: '12',
          field_03: '30',
        },
      };
    },
    getEquipmentInputPlaceholder(fieldKey) {
      return `placeholder:${fieldKey}`;
    },
    getEntryDayStatus(entry) {
      return String(entry?.dayStatus || '').trim();
    },
    hasEntryData(entry) {
      const hasValue = Object.values(entry?.values || {}).some((value) => String(value).trim() !== '');
      const hasStatus = Object.values(entry?.statuses || {}).some((value) => String(value).trim() !== '');
      return hasValue || hasStatus || Boolean(entry?.dayStatus);
    },
    shiftMonthValue,
    getNextDateString(dateString) {
      return shiftDate(dateString, 1);
    },
    __restSyncCount: 0,
    syncEquipmentRestIndicators() {
      context.__restSyncCount += 1;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentInputStateSource, context, {
    filename: 'equipment/input-state.js',
  });

  return {
    context,
    inputs,
    cards,
    toggles,
    manageControls,
  };
}

test('equipment input state finalizes visible input values and autofills inactive blanks', () => {
  const harness = createEquipmentInputStateContext();
  const field01Input = harness.inputs.get('field_01');
  const field02Input = harness.inputs.get('field_02');
  const field03Input = harness.inputs.get('field_03');

  harness.context.finalizeEquipmentInputDisplay(field01Input);
  harness.context.finalizeEquipmentInputDisplay(field02Input);
  assert.equal(field01Input.value, 'fmt:12');
  assert.equal(field02Input.value, 'auto');

  field01Input.value = '14';
  field03Input.value = '6';
  harness.context.finalizeEquipmentInputDisplays();
  assert.equal(field01Input.value, 'fmt:14');
  assert.equal(field03Input.value, 'fmt:6');

  field03Input.value = '';
  harness.context.autofillInactiveEquipmentInputsOnComplete();
  assert.equal(field03Input.value, 'fmt:8');
  assert.equal(field03Input.dataset.lastValue, 'fmt:8');
  assert.equal(harness.context.__restSyncCount, 1);
});

test('equipment input state builds validation issues and syncs invalid field UI', () => {
  const harness = createEquipmentInputStateContext();
  const issues = harness.context.getEquipmentReadingValidationIssuesForDate(
    {
      values: {
        field_01: '12',
        field_03: '30',
      },
    },
    '2026-04-18'
  );

  assert.equal(issues.length, 2);
  assert.match(issues[0].message, /보다 작을 수 없습니다/);
  assert.match(issues[1].message, /보다 클 수 없습니다/);
  assert.equal(
    harness.context.getEquipmentReadingValidationSummaryText(issues),
    '오류 보일러 외 1건'
  );
  assert.equal(
    harness.context.getStoredEquipmentReadingValidationIssues('2026-04-18').length,
    2
  );

  harness.context.syncEquipmentReadingValidationStates();
  assert.equal(harness.inputs.get('field_01').getAttribute('aria-invalid'), 'true');
  assert.equal(harness.cards.get('field_01').classList.contains('is-invalid'), true);
  assert.equal(harness.inputs.get('field_03').title.includes('클 수 없습니다'), true);
  assert.equal(harness.inputs.get('field_02').getAttribute('aria-invalid'), 'false');
});

test('equipment input state exposes field selectors and menu open state', () => {
  const harness = createEquipmentInputStateContext();

  assert.equal(harness.context.getEquipmentInputs().length, 3);
  assert.deepEqual(
    toPlainValue(
      harness.context.getTabNavigableEquipmentInputs().map((input) => input.dataset.fieldKey)
    ),
    ['field_01', 'field_03']
  );
  assert.equal(harness.context.getEquipmentFieldCard('field_03'), harness.cards.get('field_03'));
  assert.equal(harness.context.getEquipmentFieldInput('field_01'), harness.inputs.get('field_01'));
  assert.equal(
    harness.context.getEquipmentFieldStatusToggle('field_01'),
    harness.toggles.get('field_01')
  );

  harness.context.syncEquipmentManageMenus();
  assert.equal(harness.manageControls.get('field_01').root.classList.contains('is-open'), true);
  assert.equal(
    harness.manageControls.get('field_01').toggle.getAttribute('aria-expanded'),
    'true'
  );
  assert.equal(harness.manageControls.get('field_03').root.classList.contains('is-open'), false);
  assert.equal(
    harness.manageControls.get('field_03').toggle.getAttribute('aria-expanded'),
    'false'
  );
});

test('equipment input state toggles inactive fields and preserves manual values', () => {
  const harness = createEquipmentInputStateContext();
  const field01Input = harness.inputs.get('field_01');
  const field02Input = harness.inputs.get('field_02');

  field01Input.value = '17';
  harness.context.setEquipmentFieldInactive('field_01', true);
  assert.equal(field01Input.dataset.lastValue, '17');
  assert.equal(harness.toggles.get('field_01').getAttribute('aria-pressed'), 'true');

  field01Input.value = '';
  harness.context.setEquipmentFieldInactive('field_01', false);
  assert.equal(field01Input.value, '17');
  assert.equal(field01Input.placeholder, 'placeholder:field_01');
  assert.equal(harness.toggles.get('field_01').getAttribute('aria-pressed'), 'false');

  harness.context.setEquipmentFieldInactive('field_02', true);
  assert.equal(field02Input.readOnly, true);
  assert.equal(field02Input.placeholder, '자동 계산');
  assert.equal(harness.toggles.get('field_02').getAttribute('aria-pressed'), 'false');
});

test('equipment input state can suppress transient validation for actively edited fields', () => {
  const harness = createEquipmentInputStateContext();

  harness.context.suppressEquipmentFieldValidation('field_01');
  const suppressedIssues = harness.context.getCurrentEquipmentReadingValidationIssues();
  assert.equal(suppressedIssues.length, 1);
  assert.equal(suppressedIssues[0].fieldKey, 'field_03');

  harness.context.clearEquipmentFieldValidationSuppression('field_01');
  assert.equal(harness.context.getCurrentEquipmentReadingValidationIssues().length, 2);

  harness.context.suppressEquipmentFieldValidation('field_01');
  harness.context.clearEquipmentFieldValidationSuppression();
  assert.equal(harness.context.getCurrentEquipmentReadingValidationIssues().length, 2);
});

test('equipment input state keeps status inheritance and stored entry status consistent', () => {
  const harness = createEquipmentInputStateContext();
  const dateEntry = harness.context.state.store.equipmentEntries['2026-04-16'];

  assert.equal(harness.context.normalizeEquipmentFieldStatus(' INACTIVE '), 'inactive');
  assert.equal(harness.context.getEntryEquipmentFieldStatus(dateEntry, 'field_03'), 'inactive');
  assert.equal(harness.context.hasEntryStatus(dateEntry), true);
  assert.equal(
    harness.context.getLastEquipmentFieldStatusBeforeDate('field_03', '2026-04-18'),
    'inactive'
  );
  assert.equal(harness.context.getInheritedEquipmentFieldInactive('field_03', '2026-04-18'), true);
  assert.equal(
    harness.context.getEffectiveEquipmentFieldInactive('field_03', '2026-04-18', {
      statuses: {
        field_03: 'active',
      },
    }),
    false
  );
  assert.deepEqual(
    toPlainValue(harness.context.getEquipmentStatusCarryUntilDate('2026-04-18')),
    {
      restUntilDate: '2026-05-01',
      hiddenFromDate: '2026-05-02',
    }
  );

  harness.context.setStoredEquipmentFieldStatus('2026-04-20', 'field_01', 'inactive', {
    updatedAt: '2026-04-20T00:00:00.000Z',
  });
  assert.equal(
    harness.context.state.store.equipmentEntries['2026-04-20'].statuses.field_01,
    'inactive'
  );
  harness.context.setStoredEquipmentFieldStatus('2026-04-20', 'field_01', '', {
    updatedAt: '2026-04-20T00:00:00.000Z',
  });
  assert.equal(harness.context.state.store.equipmentEntries['2026-04-20'], undefined);
});
