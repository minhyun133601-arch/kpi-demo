import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const plantBCardSource = await fs.readFile(
  new URL(
    '../../../../utility/apps/metering/team-overview/plantB-card.js',
    import.meta.url
  ),
  'utf8'
);

function createPlantBCardContext(options = {}) {
  let isElectric = options.isElectric !== false;
  let activeSelectionIds = new Set(options.activeSelectionIds ?? ['plantB_total']);

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
    PLANT_B_POWER_TEAM_KEY: 'plantB_power',
    PLANT_B_TOTAL_SELECTION_ID: 'plantB_total',
    TEAM_01_01_KEY: 'team_01_01',
    RESOURCE_TYPES: {
      ELECTRIC: 'electric',
    },
    state: {
      currentMonth: '2026-04',
    },
    isElectricResourceType() {
      return isElectric;
    },
    isTeamCalendarSelectionActive(_teamKey, selectionId) {
      return activeSelectionIds.has(selectionId);
    },
    getDirectTeamMonthlyUsage(teamKey) {
      if (teamKey === 'team_01_01') {
        return 40;
      }

      return null;
    },
    resolvePlantBSettlementAmount() {
      return 200;
    },
    calculateUsageShare(usage, totalUsage) {
      if (!Number.isFinite(usage) || !Number.isFinite(totalUsage) || totalUsage === 0) {
        return null;
      }

      return usage / totalUsage;
    },
    formatUsageShare(value) {
      return `share:${Math.round(Number(value) * 100)}%`;
    },
    formatSettlementAmount(value) {
      return `amt:${Math.round(Number(value) || 0)}`;
    },
    formatWholeNumber(value) {
      return `whole:${Math.round(Number(value) || 0)}`;
    },
    formatDailyUsage(value) {
      return `usage:${Math.round(Number(value) || 0)}`;
    },
    getTeamGroup(teamKey) {
      return {
        key: teamKey,
        iconKey: 'power',
      };
    },
    getTeamContextDetailText(teamKey) {
      return `context:${teamKey}`;
    },
    __setActiveSelectionIds(nextIds = []) {
      activeSelectionIds = new Set(nextIds);
    },
    __setElectric(nextValue) {
      isElectric = Boolean(nextValue);
    },
  };

  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(plantBCardSource, context, {
    filename: 'team-overview/plantB-card.js',
  });
  return context;
}

test('plantB card returns usage and amount only for electric active selection', () => {
  const context = createPlantBCardContext();

  assert.equal(context.getPlantBTotalCardMonthlyUsage('2026-04'), 40);
  assert.equal(context.getPlantBTotalCardAmountValue('2026-04'), 200);

  context.__setActiveSelectionIds([]);
  assert.equal(
    context.getPlantBTotalCardMonthlyUsage('2026-04', { selectionOnly: true }),
    null
  );
  assert.equal(
    context.getPlantBTotalCardAmountValue('2026-04', { selectionOnly: true }),
    null
  );

  context.__setElectric(false);
  assert.equal(context.getPlantBTotalCardMonthlyUsage('2026-04'), null);
  assert.equal(context.getPlantBTotalCardChargePool('2026-04'), null);
});

test('plantB card derives descriptor usage share and charge from direct usage', () => {
  const context = createPlantBCardContext();
  const descriptor = {
    isDirectTeamUsage: true,
    teamKey: 'team_01_01',
    selectionId: 'plantB_total',
  };

  assert.equal(context.getPlantBTotalCardDescriptorUsageValue(descriptor, '2026-04'), 40);
  assert.equal(context.getPlantBTotalCardDescriptorUsageShare(descriptor, '2026-04'), 1);
  assert.equal(context.calculatePlantBTotalCardDescriptorCharge(descriptor, '2026-04'), 200);
  assert.match(
    context.getPlantBTotalCardDescriptorShareText(descriptor, '2026-04'),
    /share:100%/
  );
  assert.match(
    context.getPlantBTotalCardDescriptorChargeText(descriptor, '2026-04'),
    /amt:200/
  );
});

test('plantB card detail text includes usage share and charge math', () => {
  const context = createPlantBCardContext();
  const detailText = context.getPlantBTotalCardDescriptorDetailText(
    {
      isDirectTeamUsage: true,
      teamKey: 'team_01_01',
      selectionId: 'plantB_total',
    },
    '2026-04'
  );

  assert.match(detailText, /whole:40/);
  assert.match(detailText, /share:100%/);
  assert.match(detailText, /amt:200/);
});

test('plantB card toggle descriptor exposes direct team usage metadata', () => {
  const context = createPlantBCardContext();
  const [descriptor] = context.getPlantBTotalCardToggleDescriptors('2026-04');

  assert.equal(descriptor.id, 'plantB_total');
  assert.equal(descriptor.selectionId, 'plantB_total');
  assert.equal(descriptor.teamKey, 'team_01_01');
  assert.equal(descriptor.sourceTeamKey, 'plantB_power');
  assert.equal(descriptor.isDirectTeamUsage, true);
  assert.equal(descriptor.iconKey, 'power');
  assert.equal(descriptor.usageText, 'usage:40');
  assert.match(descriptor.chargeText, /amt:200/);
  assert.equal(descriptor.detailText, 'context:plantB_power');
});
