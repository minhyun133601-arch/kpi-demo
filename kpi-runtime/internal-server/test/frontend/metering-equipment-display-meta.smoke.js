import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const displayMetaSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/equipment/display-meta.js',
    import.meta.url
  ),
  'utf8'
);

function normalizeEquipmentFactorLabel(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '');
}

function createDisplayMetaContext() {
  let currentResourceType = 'electric';
  let currentTeamGroups = [
    { key: 'team_a', iconKey: 'team-a-icon' },
    { key: 'team_b', iconKey: 'team-b-icon' },
  ];

  const state = {
    store: {
      teamAssignments: {
        team_a: ['eq_team_a'],
        team_b: ['eq_team_b'],
      },
      resourceDatasets: {
        electric: {
          equipmentItems: [
            { id: 'eq_team_a', label: 'LNG 합계' },
            { id: 'eq_power', label: '유효전력 계량기' },
            { id: 'eq_building', label: 'Admin Area HVAC' },
          ],
        },
        gas: {
          equipmentItems: [
            { id: 'gas_lng', label: 'LNG 합계' },
            { id: 'gas_boiler', label: 'Demo Boiler A' },
          ],
        },
      },
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
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
    },
    EQUIPMENT_DISPLAY_LABEL_OVERRIDES: Object.freeze({
      'linegammalng합계': 'LNG 합계',
      linegammalngtotal: 'LNG 합계',
      'lng합계': 'LNG 합계',
      demoboilera: 'Demo Boiler A',
    }),
    normalizeText(value) {
      return String(value || '').trim();
    },
    normalizeEquipmentFactorLabel,
    isPlainObject(value) {
      return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    },
    getCurrentTeamGroups() {
      return [...currentTeamGroups];
    },
    getCurrentResourceType() {
      return currentResourceType;
    },
    isGasResourceType(resourceType = currentResourceType) {
      return resourceType === 'gas';
    },
    getActiveResourceDataset(store, resourceType) {
      return store?.resourceDatasets?.[resourceType] || null;
    },
    __setCurrentResourceType(nextResourceType) {
      currentResourceType = String(nextResourceType || 'electric');
    },
    __setCurrentTeamGroups(nextGroups = []) {
      currentTeamGroups = [...nextGroups];
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(displayMetaSource, context, {
    filename: 'equipment/display-meta.js',
  });
  return context;
}

test('equipment display meta resolves assigned team from current team groups only', () => {
  const context = createDisplayMetaContext();

  assert.equal(context.getAssignedTeamForEquipment('eq_team_a')?.key, 'team_a');

  context.__setCurrentTeamGroups([{ key: 'team_b', iconKey: 'team-b-icon' }]);
  assert.equal(context.getAssignedTeamForEquipment('eq_team_a'), null);
});

test('equipment display meta prefers team icon and falls back to inferred icon keys', () => {
  const context = createDisplayMetaContext();

  assert.equal(
    context.getEquipmentIconKey({ id: 'eq_team_b', label: '유효전력 계량기' }),
    'team-b-icon'
  );
  assert.equal(context.getEquipmentIconKey({ id: 'eq_power', label: '유효전력 계량기' }), 'power_active');
  assert.equal(context.getEquipmentIconKey({ id: 'eq_building', label: 'Admin Area HVAC' }), 'building');
  assert.equal(context.getEquipmentIconKey(null), 'equipment');
});

test('equipment display meta normalizes display label overrides', () => {
  const context = createDisplayMetaContext();

  assert.equal(context.getEquipmentDisplayLabel('Line Gamma LNG 합계'), 'LNG 합계');
  assert.equal(context.getEquipmentDisplayLabel({ label: 'Demo Boiler A' }), 'Demo Boiler A');
  assert.equal(context.getEquipmentDisplayLabel('일반 설비'), '일반 설비');
  assert.equal(context.getEquipmentDisplayLabel(''), '');
});

test('equipment display meta marks duplicate resource badges against opposite dataset', () => {
  const context = createDisplayMetaContext();

  assert.equal(
    context.getResourceDuplicateBadgeIconKeyForEquipment({ label: 'LNG 합계' }),
    'resource_electric'
  );

  context.__setCurrentResourceType('gas');
  assert.equal(
    context.getResourceDuplicateBadgeIconKeyForEquipment({ label: 'LNG 합계' }),
    'resource_gas'
  );
  assert.equal(
    context.getResourceDuplicateBadgeIconKeyForEquipment({ label: 'Demo Boiler A' }),
    ''
  );
});
