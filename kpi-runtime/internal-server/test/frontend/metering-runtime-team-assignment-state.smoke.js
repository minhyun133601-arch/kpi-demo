import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const teamAssignmentStateSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/team-assignment-state.js',
    import.meta.url
  ),
  'utf8'
);

function normalizeLabel(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]/g, '');
}

function toPlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function createTeamAssignmentStateContext() {
  const equipmentItems = [
    { id: 'power_mid', label: 'mid power' },
    { id: 'power_peak', label: 'peak power' },
    { id: 'reactive_sum', label: 'reactive total' },
    { id: 'reactive_field', label: 'reactive field' },
    { id: 'other_item', label: 'other' },
    { id: 'summary_only', label: 'summary only' },
    { id: 'gas_item', label: 'gas item' },
  ];

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
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
    },
    TOTAL_POWER_TEAM_KEY: 'power_total',
    LEGACY_ACTIVE_POWER_TEAM_KEY: 'power_active',
    TEAM_GROUPS: [
      { key: 'power_total' },
      { key: 'team_04' },
      { key: 'power_reactive' },
    ],
    DEFAULT_TEAM_ASSIGNMENT_LABEL_KEYS: {
      power_total: new Set([normalizeLabel('mid power'), normalizeLabel('peak power')]),
      team_04: new Set([normalizeLabel('other')]),
      power_reactive: new Set(),
    },
    GAS_FIXED_TEAM_EQUIPMENT_IDS: {},
    ACTIVE_POWER_DEFAULT_IDS: new Set(['power_mid']),
    ACTIVE_POWER_LABEL_KEYS: new Set([normalizeLabel('peak power')]),
    REACTIVE_POWER_DEFAULT_IDS: new Set(['reactive_field']),
    REACTIVE_POWER_LABEL_KEYS: new Set(),
    SUMMARY_ONLY_DEFAULT_IDS: new Set(['summary_only']),
    SUMMARY_ONLY_LABEL_KEYS: new Set(),
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    normalizeEquipmentFactorLabel(value) {
      return normalizeLabel(value);
    },
    isOtherEquipment(equipment) {
      return normalizeLabel(equipment?.label) === normalizeLabel('other');
    },
    isAutoCalculatedEquipment(equipment) {
      return context.isOtherEquipment(equipment);
    },
    supportsDirectTeamMonthlyUsage(teamKey) {
      return teamKey === 'direct_team';
    },
    isGasResourceType() {
      return false;
    },
    getCurrentTeamGroups() {
      return context.TEAM_GROUPS;
    },
    getTeamAssignedEquipmentIds(teamKey) {
      return context.getRawTeamAssignmentList(context.state.store.teamAssignments, teamKey);
    },
    isTeamAssignableEquipment(equipment, teamKey) {
      return context.isTeamAssignmentEligibleEquipment(
        equipment,
        teamKey,
        context.RESOURCE_TYPES.ELECTRIC
      );
    },
    getEquipmentItem(equipmentId) {
      return context.state.store.equipmentItems.find((item) => item.id === equipmentId) || null;
    },
    state: {
      store: {
        equipmentItems: [...equipmentItems],
        teamAssignments: {},
      },
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(teamAssignmentStateSource, context, {
    filename: 'runtime/team-assignment-state.js',
  });
  return context;
}

test('team assignment state normalizes explicit team assignments with validation and dedupe', () => {
  const context = createTeamAssignmentStateContext();

  const normalized = context.normalizeTeamAssignments(
    {
      power_total: [' power_mid ', 'unknown', 'reactive_field'],
      team_04: ['other_item', 'power_mid'],
      power_reactive: ['reactive_field', 'summary_only'],
    },
    context.state.store.equipmentItems,
    context.RESOURCE_TYPES.ELECTRIC
  );

  assert.deepEqual(toPlainValue(normalized), {
    power_total: ['power_mid'],
    team_04: ['other_item'],
    power_reactive: ['reactive_field'],
  });
});

test('team assignment state fills default label assignments when explicit values are absent', () => {
  const context = createTeamAssignmentStateContext();

  const normalized = context.normalizeTeamAssignments(
    {},
    context.state.store.equipmentItems,
    context.RESOURCE_TYPES.ELECTRIC
  );

  assert.deepEqual(toPlainValue(normalized), {
    power_total: ['power_mid', 'power_peak'],
    team_04: ['other_item'],
    power_reactive: [],
  });
});

test('team assignment state keeps legacy total-power source keys addressable', () => {
  const context = createTeamAssignmentStateContext();

  assert.deepEqual(toPlainValue(context.getTeamAssignmentSourceKeys('power_total')), [
    'power_total',
    'power_active',
  ]);
  assert.equal(context.hasExplicitTeamAssignment({ power_active: ['power_peak'] }, 'power_total'), true);
  assert.deepEqual(
    toPlainValue(context.getRawTeamAssignmentList({ power_active: ['power_peak'] }, 'power_total')),
    ['power_peak']
  );
});

test('team assignment state returns explicit configured total-power ids without fallback', () => {
  const context = createTeamAssignmentStateContext();

  context.state.store.teamAssignments = {
    power_total: [' power_peak ', 'summary_only', 'unknown', 'power_peak'],
  };

  assert.deepEqual(toPlainValue(context.getConfiguredTotalPowerEquipmentIds()), ['power_peak']);

  context.state.store.teamAssignments = {
    power_total: [],
  };

  assert.deepEqual(toPlainValue(context.getConfiguredTotalPowerEquipmentIds()), []);

  context.state.store.teamAssignments = {
    power_active: [' power_peak ', 'power_mid'],
  };

  assert.deepEqual(toPlainValue(context.getConfiguredTotalPowerEquipmentIds()), [
    'power_peak',
    'power_mid',
  ]);
});

test('team assignment state falls back to active-power equipment ids when no explicit config exists', () => {
  const context = createTeamAssignmentStateContext();

  context.state.store.teamAssignments = {};

  assert.deepEqual(toPlainValue(context.getConfiguredTotalPowerEquipmentIds()), [
    'power_mid',
    'power_peak',
  ]);
});

test('team assignment state resolves available options and assigned ids by team boundary', () => {
  const context = createTeamAssignmentStateContext();

  context.state.store.teamAssignments = {
    power_total: ['power_mid'],
    team_04: ['other_item'],
    power_reactive: ['reactive_field'],
  };

  assert.deepEqual(
    toPlainValue(context.getAvailableEquipmentOptionsForTeam('power_total').map((item) => item.id)),
    ['power_peak', 'reactive_sum', 'gas_item']
  );
  assert.deepEqual(toPlainValue([...context.getAssignedEquipmentIds('power_total')]), [
    'other_item',
    'reactive_field',
  ]);
  assert.deepEqual(toPlainValue(context.getAvailableEquipmentOptionsForTeam('direct_team')), []);
});
