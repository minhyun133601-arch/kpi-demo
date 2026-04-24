import assert from 'node:assert/strict';
import test from 'node:test';

import {
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
  WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
  WASTE_PLANT_B_TEAM_KEY,
} from '../../../src/scripts/one-shot/migrateLegacyUtilityAuthorityToMeteringStore/constants.js';
import { migrateGasAuthorityValues, migrateWasteAuthorityValues } from '../../../src/scripts/one-shot/migrateLegacyUtilityAuthorityToMeteringStore/migrators.js';
import { buildSummary, extractLegacyMonthlyRows } from '../../../src/scripts/one-shot/migrateLegacyUtilityAuthorityToMeteringStore/store.js';

test('extractLegacyMonthlyRows normalizes year-month rows and numeric values', () => {
  const rowsByTeam = extractLegacyMonthlyRows({
    payload: {
      teams: [
        {
          name: 'Plant B',
          years: [
            {
              label: '2026',
              rows: [
                {
                  label: '4월',
                  usage: '1,234',
                  cost: '8,765',
                  costs: {
                    labor: '500',
                    sludge: '120',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  });

  assert.equal(rowsByTeam.get('Plant B').get('2026-04').usage, 1234);
  assert.equal(rowsByTeam.get('Plant B').get('2026-04').cost, 8765);
  assert.deepEqual(rowsByTeam.get('Plant B').get('2026-04').costs, {
    labor: 500,
    sludge: 120,
  });
});

test('migrateGasAuthorityValues aggregates LNG settlement costs across legacy teams', () => {
  const store = {
    resourceDatasets: {
      gas: {
        billingSettlementEntries: {},
        teamMonthlyEntries: {},
      },
    },
  };
  const legacyTeamMaps = new Map([
    ['Line Beta (LNG)', new Map([['2026-04', { cost: 1000, usage: null, costs: {} }]])],
    ['Line Delta (LNG)', new Map([['2026-04', { cost: 2000, usage: null, costs: {} }]])],
  ]);
  const summary = buildSummary();

  migrateGasAuthorityValues(store, legacyTeamMaps, summary, { overwrite: true });

  const monthRecord = store.resourceDatasets.gas.billingSettlementEntries['2026-04'];
  assert.equal(monthRecord.scopes[GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY].fields.power_charge, '3000');
  assert.equal(summary.gasSettlementWritten, 1);
});

test('migrateWasteAuthorityValues writes usage and fallback billing amount for waste', () => {
  const store = {
    resourceDatasets: {
      waste: {
        billingSettlementEntries: {},
        teamMonthlyEntries: {},
      },
    },
  };
  const legacyTeamMaps = new Map([
    ['Plant B', new Map([['2026-04', { usage: 15, cost: 700, costs: {} }]])],
  ]);
  const summary = buildSummary();

  migrateWasteAuthorityValues(store, legacyTeamMaps, summary, { overwrite: true });

  assert.equal(store.resourceDatasets.waste.teamMonthlyEntries['2026-04'][WASTE_PLANT_B_TEAM_KEY], 15);
  assert.equal(
    store.resourceDatasets.waste.billingSettlementEntries['2026-04'].scopes[WASTE_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY].fields.billing_amount,
    '700'
  );
  assert.equal(summary.wasteUsageWritten, 1);
  assert.equal(summary.wasteSettlementWritten, 1);
});
