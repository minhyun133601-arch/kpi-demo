import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const equipmentRulesSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/rules.js',
    import.meta.url
  ),
  'utf8'
);

function createEquipmentRulesContext() {
  const state = {
    store: {
      equipmentItems: [
        { id: 'field_01', label: 'Demo Boiler A' },
        { id: 'field_02', label: 'Demo Boiler A' },
        { id: 'field_03', label: '기타' },
      ],
    },
  };

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
    state,
    DEFAULT_USAGE_FACTOR: 1,
    EQUIPMENT_INPUT_FRACTION_DIGITS: 3,
    OTHER_EQUIPMENT_LABEL_KEY: '기타',
    EQUIPMENT_USAGE_FACTORS: {
      demoboilera: 2.5,
      기타: 1,
    },
    normalizeText(value) {
      return String(value || '').trim();
    },
    isTotalPowerSummaryEquipment(equipment) {
      return equipment?.kind === 'total';
    },
    isReactiveSummaryEquipment(equipment) {
      return equipment?.kind === 'reactive-summary';
    },
    isActivePowerEquipment(equipment) {
      return equipment?.kind === 'active-power';
    },
    isReactivePowerEquipment(equipment) {
      return equipment?.kind === 'reactive-power';
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(equipmentRulesSource, context, {
    filename: 'equipment/rules.js',
  });
  return context;
}

test('equipment rules normalize factor labels and detect label conflicts by normalized key', () => {
  const context = createEquipmentRulesContext();

  assert.equal(context.normalizeEquipmentFactorLabel(' Demo Boiler A '), 'demoboilera');
  assert.equal(context.hasEquipmentLabelConflict('Demo Boiler A'), true);
  assert.equal(context.hasEquipmentLabelConflict('Demo Boiler A', 'field_02'), true);
  assert.equal(context.hasEquipmentLabelConflict('새 설비'), false);
});

test('equipment rules expose equipment items by id from the active store', () => {
  const context = createEquipmentRulesContext();

  assert.equal(context.getEquipmentItem('field_02')?.label, 'Demo Boiler A');
  assert.equal(context.getEquipmentItem('field_03')?.label, '기타');
  assert.equal(context.getEquipmentItem('missing'), null);
});

test('equipment rules detect other equipment and auto calculated cases', () => {
  const context = createEquipmentRulesContext();

  assert.equal(context.isOtherEquipment({ label: '기타' }), true);
  assert.equal(context.isOtherEquipment({ label: 'Demo Boiler A' }), false);
  assert.equal(context.isAutoCalculatedEquipment({ label: '기타' }), true);
  assert.equal(context.isAutoCalculatedEquipment({ label: 'Demo Boiler A' }), false);
});

test('equipment rules guard decimal digit management by equipment kind', () => {
  const context = createEquipmentRulesContext();

  assert.equal(context.canManageEquipmentDecimalDigits({ label: '일반 설비', kind: 'normal' }), true);
  assert.equal(context.canManageEquipmentDecimalDigits({ label: '기타', kind: 'normal' }), false);
  assert.equal(context.canManageEquipmentDecimalDigits({ label: '합계', kind: 'total' }), false);
  assert.equal(
    context.canManageEquipmentDecimalDigits({ label: '유효전력', kind: 'active-power' }),
    false
  );
});

test('equipment rules resolve default usage factors and clamp decimal digits', () => {
  const context = createEquipmentRulesContext();

  assert.equal(context.getDefaultUsageFactorByLabel('Demo Boiler A'), 2.5);
  assert.equal(context.getDefaultUsageFactorByLabel('없는 설비'), 1);
  assert.equal(context.normalizeUsageFactor('2.75', 1), 2.75);
  assert.equal(context.normalizeUsageFactor('-1', 1), 1);
  assert.equal(context.normalizeEquipmentDecimalDigits('5', null), 3);
  assert.equal(context.normalizeEquipmentDecimalDigits('-2', null), 0);
  assert.equal(context.normalizeEquipmentDecimalDigits('', 2), 2);
});
