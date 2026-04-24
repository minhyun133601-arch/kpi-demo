function buildElectricMonthlyTeamSnapshot(monthValue, store = state.store) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return null;
  }

  return withDetachedResourceSnapshot(
    RESOURCE_TYPES.ELECTRIC,
    normalizedMonth,
    () => {
      state.currentMonth = normalizedMonth;
      const teams = {};

      ELECTRIC_UTILITY_SNAPSHOT_TEAM_KEYS.forEach((teamKey) => {
        const rawUsage = getTeamMonthlyUsage(teamKey);
        const rawCost = calculateTeamAmount(teamKey, normalizedMonth);
        teams[teamKey] = {
          usage: Number.isFinite(rawUsage) ? Math.round(rawUsage) : null,
          cost: Number.isFinite(rawCost) ? Math.round(rawCost) : null,
        };
      });

      return {
        monthValue: normalizedMonth,
        teams,
      };
    },
    store
  );
}

function buildElectricUtilityDatasetSnapshot(store = state.store) {
  const effectiveStore = resolveDetachedSnapshotSourceStore(store);
  const monthValues = collectElectricUtilitySnapshotMonthValues(effectiveStore);
  if (!monthValues.length) {
    return {
      months: [],
      teams: {},
    };
  }

  return withDetachedResourceSnapshot(
    RESOURCE_TYPES.ELECTRIC,
    monthValues[0],
    () => {
      const teams = Object.fromEntries(
        ELECTRIC_UTILITY_SNAPSHOT_TEAM_KEYS.map((teamKey) => [teamKey, {}])
      );

      monthValues.forEach((monthValue) => {
        state.currentMonth = monthValue;
        ELECTRIC_UTILITY_SNAPSHOT_TEAM_KEYS.forEach((teamKey) => {
          const rawUsage = getTeamMonthlyUsage(teamKey);
          const rawCost = calculateTeamAmount(teamKey, monthValue);
          teams[teamKey][monthValue] = {
            usage: Number.isFinite(rawUsage) ? Math.round(rawUsage) : null,
            cost: Number.isFinite(rawCost) ? Math.round(rawCost) : null,
          };
        });
      });

      return {
        months: monthValues,
        teams,
      };
    },
    effectiveStore
  );
}

function buildGasUtilityDatasetSnapshot(store = state.store) {
  const effectiveStore = resolveDetachedSnapshotSourceStore(store);
  const monthValues = collectGasUtilitySnapshotMonthValues(effectiveStore);
  if (!monthValues.length) {
    return {
      months: [],
      teams: {},
    };
  }

  return withDetachedResourceSnapshot(
    RESOURCE_TYPES.GAS,
    monthValues[0],
    () => {
      const teams = Object.fromEntries(
        [
          ...Object.keys(GAS_UTILITY_SNAPSHOT_DIRECT_TEAM_NAMES),
          ...Object.keys(GAS_UTILITY_SNAPSHOT_TEAM_EQUIPMENT_IDS),
        ].map((teamName) => [teamName, {}])
      );

      monthValues.forEach((monthValue) => {
        state.currentMonth = monthValue;
        Object.entries(GAS_UTILITY_SNAPSHOT_DIRECT_TEAM_NAMES).forEach(([teamName, teamKey]) => {
          const usage = getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.GAS);
          const rawCost = calculateGasUtilitySnapshotTeamCost(teamName, usage, monthValue);
          if (
            !hasStoredTeamMonthlyUsageOverride(teamKey, monthValue, RESOURCE_TYPES.GAS) &&
            !Number.isFinite(usage) &&
            !Number.isFinite(rawCost)
          ) {
            return;
          }

          teams[teamName][monthValue] = {
            usage: Number.isFinite(usage) ? Math.round(usage) : null,
            cost: Number.isFinite(rawCost) ? Math.round(rawCost) : null,
          };
        });
        Object.entries(GAS_UTILITY_SNAPSHOT_TEAM_EQUIPMENT_IDS).forEach(
          ([teamName, equipmentIds]) => {
            const usage = calculateGasUtilitySnapshotTeamUsage(equipmentIds);
            const rawCost = calculateGasUtilitySnapshotTeamCost(teamName, usage, monthValue);
            if (!Number.isFinite(usage) && !Number.isFinite(rawCost)) {
              return;
            }

            teams[teamName][monthValue] = {
              usage: Number.isFinite(usage) ? Math.round(usage) : null,
              cost: Number.isFinite(rawCost) ? Math.round(rawCost) : null,
            };
          }
        );
      });

      return {
        months: monthValues,
        teams,
      };
    },
    effectiveStore
  );
}

function buildWasteUtilityDatasetSnapshot(store = state.store) {
  const effectiveStore = resolveDetachedSnapshotSourceStore(store);
  const monthValues = collectWasteUtilitySnapshotMonthValues(effectiveStore);
  if (!monthValues.length) {
    return {
      months: [],
      teams: {},
    };
  }

  return withDetachedResourceSnapshot(
    RESOURCE_TYPES.WASTE,
    monthValues[0],
    () => {
      const teams = Object.fromEntries(
        Object.entries(WASTE_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY).map(([teamKey, teamName]) => [
          teamName,
          {},
        ])
      );

      monthValues.forEach((monthValue) => {
        state.currentMonth = monthValue;
        Object.entries(WASTE_UTILITY_SNAPSHOT_TEAM_NAMES_BY_KEY).forEach(([teamKey, teamName]) => {
          const usage = getDirectTeamMonthlyUsage(teamKey, monthValue, RESOURCE_TYPES.WASTE);
          const scopeKey = getWasteBillingSettlementScopeKeyForTeam(teamKey);
          const entryFields = getBillingSettlementEntry(monthValue, scopeKey)?.fields || {};
          const totalCost = calculateBillingSettlementBillingAmountValue(entryFields, scopeKey);
          const costs = buildWasteUtilitySnapshotCosts(entryFields, scopeKey);
          if (!Number.isFinite(usage) && !Number.isFinite(totalCost) && !costs) {
            return;
          }

          teams[teamName][monthValue] = {
            usage: Number.isFinite(usage) ? Math.round(usage) : null,
            cost: Number.isFinite(totalCost) ? Math.round(totalCost) : null,
            costs,
          };
        });
      });

      return {
        months: monthValues,
        teams,
      };
    },
    effectiveStore
  );
}


