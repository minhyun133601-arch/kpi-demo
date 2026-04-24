import {
  ELECTRIC_DIRECT_LEGACY_TEAM_NAME,
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
  GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
  GAS_DIRECT_LEGACY_TEAM_NAME,
  GAS_PLANT_A_LNG_LEGACY_TEAM_NAMES,
  GAS_PLANT_A_LPG_LEGACY_TEAM_NAME,
  TEAM_01_01_KEY,
  WASTE_TEAM_CONFIG,
} from './constants.js';
import {
  assignMonthlyNumericValue,
  assignSettlementScopeEntry,
  ensureDataset,
  sumLegacyCosts,
  writeWasteLegacyFields,
} from './store.js';

export function migrateElectricDirectMonthlyValues(store, legacyTeamMaps, summary, options = {}) {
  const directMonths = legacyTeamMaps.get(ELECTRIC_DIRECT_LEGACY_TEAM_NAME);
  if (!directMonths?.size) {
    return;
  }
  const dataset = ensureDataset(store, 'electric');
  for (const [monthValue, row] of directMonths.entries()) {
    assignMonthlyNumericValue(
      dataset.teamMonthlyEntries,
      monthValue,
      TEAM_01_01_KEY,
      row.usage,
      summary,
      'electricDirectUsage',
      options.overwrite
    );
    assignMonthlyNumericValue(
      dataset.teamMonthlyAmountEntries,
      monthValue,
      TEAM_01_01_KEY,
      row.cost,
      summary,
      'electricDirectAmount',
      options.overwrite
    );
  }
}

export function migrateGasAuthorityValues(store, legacyTeamMaps, summary, options = {}) {
  const dataset = ensureDataset(store, 'gas');
  const updatedAt = new Date().toISOString();
  const directMonths = legacyTeamMaps.get(GAS_DIRECT_LEGACY_TEAM_NAME);
  if (directMonths?.size) {
    for (const [monthValue, row] of directMonths.entries()) {
      assignMonthlyNumericValue(
        dataset.teamMonthlyEntries,
        monthValue,
        TEAM_01_01_KEY,
        row.usage,
        summary,
        'gasDirectUsage',
        options.overwrite
      );
      if (Number.isFinite(row.cost)) {
        assignSettlementScopeEntry(
          dataset.billingSettlementEntries,
          monthValue,
          GAS_BILLING_SETTLEMENT_SCOPE_PLANT_B_KEY,
          { power_charge: row.cost },
          updatedAt,
          summary,
          'gasSettlement',
          options.overwrite
        );
      }
    }
  }

  const allGasMonths = new Set();
  [GAS_DIRECT_LEGACY_TEAM_NAME, ...GAS_PLANT_A_LNG_LEGACY_TEAM_NAMES, GAS_PLANT_A_LPG_LEGACY_TEAM_NAME]
    .forEach((teamName) => {
      const monthMap = legacyTeamMaps.get(teamName);
      if (!monthMap?.size) {
        return;
      }
      for (const monthValue of monthMap.keys()) {
        allGasMonths.add(monthValue);
      }
    });

  for (const monthValue of Array.from(allGasMonths).sort()) {
    const plantALngCost = sumLegacyCosts(legacyTeamMaps, monthValue, GAS_PLANT_A_LNG_LEGACY_TEAM_NAMES);
    if (Number.isFinite(plantALngCost)) {
      assignSettlementScopeEntry(
        dataset.billingSettlementEntries,
        monthValue,
        GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LNG_KEY,
        { power_charge: plantALngCost },
        updatedAt,
        summary,
        'gasSettlement',
        options.overwrite
      );
    }

    const lpgCost = legacyTeamMaps.get(GAS_PLANT_A_LPG_LEGACY_TEAM_NAME)?.get(monthValue)?.cost ?? null;
    if (Number.isFinite(lpgCost)) {
      assignSettlementScopeEntry(
        dataset.billingSettlementEntries,
        monthValue,
        GAS_BILLING_SETTLEMENT_SCOPE_PLANT_A_LPG_KEY,
        { power_charge: lpgCost },
        updatedAt,
        summary,
        'gasSettlement',
        options.overwrite
      );
    }
  }
}

export function migrateWasteAuthorityValues(store, legacyTeamMaps, summary, options = {}) {
  const dataset = ensureDataset(store, 'waste');
  const updatedAt = new Date().toISOString();
  Object.entries(WASTE_TEAM_CONFIG).forEach(([legacyTeamName, teamConfig]) => {
    const monthMap = legacyTeamMaps.get(legacyTeamName);
    if (!monthMap?.size) {
      return;
    }
    for (const [monthValue, row] of monthMap.entries()) {
      assignMonthlyNumericValue(
        dataset.teamMonthlyEntries,
        monthValue,
        teamConfig.teamKey,
        row.usage,
        summary,
        'wasteUsage',
        options.overwrite
      );
      const fields = writeWasteLegacyFields(row.costs, teamConfig, row.cost);
      if (!Object.keys(fields).length) {
        continue;
      }
      assignSettlementScopeEntry(
        dataset.billingSettlementEntries,
        monthValue,
        teamConfig.scopeKey,
        fields,
        updatedAt,
        summary,
        'wasteSettlement',
        options.overwrite
      );
    }
  });
}
