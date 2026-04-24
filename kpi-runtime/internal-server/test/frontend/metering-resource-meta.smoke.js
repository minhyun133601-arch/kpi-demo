import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const resourceMetaSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/runtime/resource-meta.js',
    import.meta.url
  ),
  'utf8'
);

function createResourceMetaContext() {
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
    Set,
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
      GAS: 'gas',
      WASTE: 'waste',
      PRODUCTION: 'production',
    },
    RESOURCE_DISPLAY_META: {
      electric: {
        equipmentEmptyTitle: '설비 없음',
        equipmentItemLabel: '설비',
        billingDocumentDirectory: 'electric-docs',
      },
      gas: {
        equipmentEmptyTitle: '검침 항목 없음',
        equipmentItemLabel: '검침 항목',
        billingDocumentDirectory: 'gas-docs',
      },
      waste: {
        equipmentEmptyTitle: '폐수 입력 항목 없음',
        equipmentItemLabel: '폐수 입력',
        billingDocumentDirectory: '',
      },
      production: {
        equipmentEmptyTitle: '생산 항목 없음',
        equipmentItemLabel: '생산 항목',
        billingDocumentDirectory: 'production-docs',
      },
    },
    BILLING_SETTLEMENT_SCOPE_DEFINITIONS_BY_RESOURCE: {
      electric: [{ key: 'electric_default', shortLabel: '전기', label: '전기 정산' }],
      gas: [
        { key: 'gas_plantB', shortLabel: 'Plant B LNG', label: 'Plant B LNG 정산' },
        { key: 'gas_plantA_lng', shortLabel: 'Plant A LNG', label: 'Plant A LNG 정산' },
        { key: 'gas_plantA_lpg', shortLabel: 'Plant A LPG', label: 'Plant A LPG 정산' },
      ],
      waste: [
        { key: 'waste_plantB', shortLabel: 'Plant B', label: 'Plant B 폐수' },
        { key: 'waste_plantA', shortLabel: 'Plant A', label: 'Plant A 폐수' },
      ],
      production: [],
    },
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'gas_plantB',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY: 'gas_plantA_lng',
    GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY: 'gas_plantA_lpg',
    WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY: 'waste_plantB',
    WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_A_KEY: 'waste_plantA',
    WASTE_PLANT_B_TEAM_KEY: 'waste-team-plantB',
    WASTE_PLANT_A_TEAM_KEY: 'waste-team-plantA',
    WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_B: [
      { key: 'supply_cost' },
      { key: 'vat' },
    ],
    WASTE_BILLING_SETTLEMENT_BILLING_AMOUNT_COMPONENTS_PLANT_A: [
      { key: 'usage_cost' },
      { key: 'surcharge' },
    ],
    GAS_BILLING_SETTLEMENT_FIELDS: [
      { key: 'usage_base' },
      { key: 'billing_amount' },
      { key: 'auto_total' },
    ],
    GAS_LPG_BILLING_SETTLEMENT_FIELDS: [
      { key: 'lpg_usage_base' },
      { key: 'billing_amount' },
    ],
    WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_B: [
      { key: 'usage' },
      { key: 'billing_amount' },
    ],
    WASTE_BILLING_SETTLEMENT_FIELDS_PLANT_A: [
      { key: 'usage' },
      { key: 'usage_cost' },
      { key: 'surcharge' },
      { key: 'billing_amount' },
    ],
    ELECTRIC_BILLING_SETTLEMENT_FIELDS: [
      { key: 'usage' },
      { key: 'billing_amount' },
      { key: 'auto_total' },
    ],
    GAS_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS: new Set(['auto_total']),
    GAS_LPG_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS: new Set(['billing_amount']),
    WASTE_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS: new Set(['billing_amount']),
    ELECTRIC_BILLING_SETTLEMENT_AUTO_CALCULATED_FIELD_KEYS: new Set(['auto_total']),
    GAS_BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS: ['usage_base'],
    BILLING_SETTLEMENT_ZERO_DEFAULT_FIELD_KEYS: ['usage'],
    GAS_LPG_BILLING_SETTLEMENT_FORMULA_GUIDES: {
      billing_amount: 'LPG 총액',
    },
    GAS_BILLING_SETTLEMENT_FORMULA_GUIDES: {
      auto_total: 'LNG 자동합계',
    },
    WASTE_BILLING_SETTLEMENT_FORMULA_GUIDES: {
      billing_amount: '폐수 총액',
    },
    BILLING_SETTLEMENT_FORMULA_GUIDES: {
      billing_amount: '전기 총액',
    },
    LEGACY_BILLING_DOCUMENT_DIRECTORY_NAME: 'legacy-electric-docs',
    TEAM_01_01_KEY: 'team_01_01',
    TEAM_GROUPS: [
      { key: 'team_01_01', label: 'Line Alpha' },
      { key: 'electric_only', label: '전기 전용' },
      { key: 'team_02', label: 'Line Gamma' },
    ],
    GAS_TEAM_GROUPS: [{ key: 'gas_team', label: '가스팀' }],
    WASTE_TEAM_GROUPS: [
      { key: 'waste-team-plantB', label: 'Plant B' },
      { key: 'waste-team-plantA', label: 'Plant A' },
    ],
    state: {
      activeTeamSettlementScope: '',
      store: {
        resourceType: 'electric',
      },
    },
    normalizeText(value) {
      return String(value ?? '').trim();
    },
    isElectricOnlyTeamKey(teamKey) {
      return teamKey === 'electric_only';
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(resourceMetaSource, context, {
    filename: 'runtime/resource-meta.js',
  });
  return context;
}

test('resource meta normalizes resource type and resolves mode support by resource', () => {
  const context = createResourceMetaContext();

  assert.equal(context.normalizeResourceType('gas'), 'gas');
  assert.equal(context.normalizeResourceType('unknown'), 'electric');
  assert.equal(context.getCurrentResourceType(), 'electric');
  assert.equal(context.isProductionResourceType('production'), true);
  assert.equal(context.supportsEquipmentModeForResource('waste'), false);
  assert.equal(context.supportsBillingDocumentForResource('production'), false);
  assert.equal(context.supportsTeamModeForResource('gas'), true);
  assert.ok(context.formatEquipmentItemCountText(2, 'gas').includes('2'));
  assert.ok(context.formatEquipmentItemCountText(2, 'gas').includes('검침 항목'));
});

test('resource meta resolves billing settlement scopes, field sets, and guides', () => {
  const context = createResourceMetaContext();
  context.state.activeTeamSettlementScope = 'gas_plantA_lpg';

  assert.equal(context.getCurrentBillingSettlementScope('gas'), 'gas_plantA_lpg');
  assert.deepEqual(
    context.getBillingSettlementFields('gas', 'gas_plantA_lpg').map((field) => field.key),
    ['lpg_usage_base', 'billing_amount']
  );
  assert.deepEqual(
    context.getBillingSettlementManualFieldKeys('electric', 'electric_default'),
    ['usage', 'billing_amount']
  );
  assert.deepEqual(
    context.getBillingSettlementZeroDefaultFieldKeys('gas', 'gas_plantB'),
    ['usage_base']
  );
  assert.equal(
    context.normalizeBillingSettlementScope('missing-scope', 'waste'),
    'waste_plantB'
  );
  assert.equal(context.getBillingSettlementScopeTitle('missing-scope', 'waste'), 'Plant B 폐수');
  assert.equal(
    context.getBillingSettlementFormulaGuide('billing_amount', 'electric', 'electric_default'),
    '전기 총액'
  );
});

test('resource meta maps waste settlement scopes and billing document directories', () => {
  const context = createResourceMetaContext();

  assert.equal(
    context.getWasteBillingSettlementScopeKeyForTeam('waste-team-plantA'),
    'waste_plantA'
  );
  assert.equal(
    context.getWasteBillingSettlementTeamKeyForScope('waste_plantB'),
    'waste-team-plantB'
  );
  assert.deepEqual(
    Array.from(context.getWasteBillingSettlementManualCostFieldKeys('waste_plantA')),
    ['usage_cost', 'surcharge']
  );
  assert.deepEqual(Array.from(context.getAcceptedBillingDocumentDirectoryNames('electric')), [
    'electric-docs',
    'legacy-electric-docs',
  ]);
  assert.deepEqual(Array.from(context.getAcceptedBillingDocumentDirectoryNames('gas')), ['gas-docs']);
});

test('resource meta keeps resource-specific team group selections', () => {
  const context = createResourceMetaContext();

  assert.deepEqual(
    context.getTeamGroupsForResource('gas').map((team) => team.key),
    ['gas_team']
  );
  assert.deepEqual(
    context.getTeamGroupsForResource('waste').map((team) => team.key),
    ['waste-team-plantB', 'waste-team-plantA']
  );
  assert.deepEqual(
    context.getTeamGroupsForResource('production').map((team) => team.key),
    ['team_01_01', 'team_02']
  );

  context.state.store.resourceType = 'production';
  assert.deepEqual(
    context.getCurrentTeamGroups().map((team) => team.key),
    ['team_01_01', 'team_02']
  );
  assert.equal(context.supportsTeamModeForCurrentResource(), true);
});
