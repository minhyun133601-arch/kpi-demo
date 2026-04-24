import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentInputFormattingSource = await fs.readFile(
  new URL('../../../../utility/apps/metering/equipment/input-formatting.js', import.meta.url),
  'utf8'
);

function createInputFormattingContext() {
  const FakeDate = class extends Date {
    static now() {
      return 1700000000000;
    }
  };
  const mathStub = {
    max: Math.max,
    random() {
      return 0.123456789;
    },
  };
  const context = {
    console,
    Date: FakeDate,
    Intl,
    JSON,
    Math: mathStub,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    EQUIPMENT_INPUT_FRACTION_DIGITS: 2,
    normalizeEntryValue(value) {
      return String(value ?? '').trim();
    },
    normalizeEquipmentDecimalDigits(value, fallback = null) {
      const parsed = Number.parseInt(String(value ?? ''), 10);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
    },
    getEntryFractionDigits(value) {
      const normalized = String(value ?? '');
      const decimalIndex = normalized.indexOf('.');
      if (decimalIndex < 0) {
        return 0;
      }
      return normalized.slice(decimalIndex + 1).length;
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentInputFormattingSource, context, {
    filename: 'equipment/input-formatting.js',
  });
  return context;
}

test('equipment input formatting sanitizes decimal input and preserves a trailing dot when requested', () => {
  const context = createInputFormattingContext();

  assert.equal(context.sanitizeEquipmentInputValue(' 1,234.567kg '), '1234.56');
  assert.equal(
    context.sanitizeEquipmentInputValue('45.', {
      preserveTrailingDecimalPoint: true,
    }),
    '45.'
  );
  assert.equal(
    context.sanitizeEquipmentInputValue('45.', {
      preserveTrailingDecimalPoint: false,
    }),
    '45'
  );
});

test('equipment input formatting formats grouped values and fixed digits predictably', () => {
  const context = createInputFormattingContext();

  assert.equal(context.formatEquipmentInputDisplay('1234.5'), '1,234.5');
  assert.equal(context.formatEquipmentInputDisplay('1234.', { fixedDigits: false }), '1,234.');
  assert.equal(context.formatEquipmentInputDisplay('1234.5', { fixedDigits: true }), '1,234.50');
});

test('equipment input formatting expands visible fraction digits when equipment precision requires it', () => {
  const context = createInputFormattingContext();

  assert.equal(context.formatEquipmentInputDisplayByDecimalDigits('15.2', 3), '15.200');
  assert.equal(context.formatEquipmentInputDisplayByDecimalDigits('15.25', 1), '15.25');
  assert.equal(context.formatEquipmentInputDisplayByDecimalDigits('15', null), '15');
});

test('equipment input formatting creates stable custom equipment id prefixes', () => {
  const context = createInputFormattingContext();

  assert.match(
    context.createEquipmentItemId(),
    /^field_custom_1700000000000_[a-z0-9]{6}$/
  );
});
