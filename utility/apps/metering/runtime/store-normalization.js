const MANUAL_SAVE_HISTORY_LIMIT = 40;

function normalizeResourceDataset(rawDataset, resourceType) {
  const normalizedType = normalizeResourceType(resourceType);
  const source = isPlainObject(rawDataset) ? rawDataset : {};
  const normalizedEquipmentItems = normalizeEquipmentItems(
    source.equipmentItems,
    normalizedType
  );

  if (normalizedType === RESOURCE_TYPES.GAS) {
    const gasEntries = pruneEquipmentEntriesByVisibility(
      pruneLegacyShiftedGasEntries(
        mergeEquipmentEntriesWithPresetLocalStore(
          applyLegacyGasFebruary2025DateShift(normalizeEquipmentEntries(source.equipmentEntries)),
          getPresetGasEntries()
        )
      ),
      normalizedEquipmentItems
    );
    const normalizedTeamAssignments = normalizeTeamAssignments(
      isPlainObject(source.teamAssignments) ? source.teamAssignments : {},
      normalizedEquipmentItems,
      normalizedType
    );

    return {
      mode: source.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT,
      equipmentItems: normalizedEquipmentItems,
      equipmentEntries: gasEntries,
      teamAssignments: normalizedTeamAssignments,
      teamMonthlyEntries: normalizeTeamMonthlyEntries(source.teamMonthlyEntries, normalizedType),
      teamMonthlyAmountEntries: normalizeTeamMonthlyAmountEntries(
        source.teamMonthlyAmountEntries,
        normalizedType
      ),
      ...normalizeBillingStoreSections(source, normalizedType),
    };
  }

  if (normalizedType === RESOURCE_TYPES.WASTE) {
    return {
      mode: MODES.TEAM,
      equipmentItems: normalizedEquipmentItems,
      equipmentEntries: normalizeEquipmentEntries(source.equipmentEntries),
      teamAssignments: {},
      teamMonthlyEntries: normalizeTeamMonthlyEntries(source.teamMonthlyEntries, normalizedType),
      teamMonthlyAmountEntries: normalizeTeamMonthlyAmountEntries(
        source.teamMonthlyAmountEntries,
        normalizedType
      ),
      ...normalizeBillingStoreSections(source, normalizedType),
    };
  }

  const equipmentItems =
    Number(source?.equipmentFactorMigrationVersion) >= EQUIPMENT_FACTOR_MIGRATION_VERSION
      ? normalizedEquipmentItems
      : applyRequestedEquipmentFactorMigration(normalizedEquipmentItems);
  const normalizedEntries = normalizeEquipmentEntries(source.equipmentEntries);
  const importedEntries =
    Number(source?.presetImportVersion) >= PRESET_IMPORT_VERSION
      ? normalizedEntries
      : mergePresetEquipmentEntries(normalizedEntries);
  const resetEntries =
    Number(source?.entryResetVersion) >= ENTRY_RESET_VERSION
      ? importedEntries
      : clearEquipmentEntriesForResetMonths(importedEntries);
  const statusBaselineEntries =
    Number(source?.entryStatusBaselineVersion) >= ENTRY_STATUS_BASELINE_VERSION
      ? resetEntries
      : applyRequestedEntryStatusBaseline(resetEntries);
  const historicalFixedEntries =
    Number(source?.historicalEntryValueFixVersion) >= HISTORICAL_ENTRY_VALUE_FIX_VERSION
      ? statusBaselineEntries
      : applyRequestedHistoricalEntryValueFixes(statusBaselineEntries);
  const stickEquipmentResult = applyRequestedStickSingleEquipmentMigration(
    equipmentItems,
    historicalFixedEntries
  );
  const visibilityPrunedEntries = pruneEquipmentEntriesByVisibility(
    stickEquipmentResult.equipmentEntries,
    stickEquipmentResult.equipmentItems
  );
  const restoredEntries = restoreValidationCorrectionEntries(visibilityPrunedEntries);
  const requestedTeamAssignments =
    Number(source?.teamAssignmentBaselineVersion) >= TEAM_ASSIGNMENT_BASELINE_VERSION
      ? source.teamAssignments
      : {};
  const normalizedTeamAssignments = normalizeTeamAssignments(
    migrateLegacyStickTeamAssignments(requestedTeamAssignments),
    stickEquipmentResult.equipmentItems,
    normalizedType
  );

  return {
    mode: source.mode === MODES.TEAM ? MODES.TEAM : MODES.EQUIPMENT,
    equipmentItems: stickEquipmentResult.equipmentItems,
    equipmentEntries: restoredEntries,
    teamAssignments: normalizedTeamAssignments,
    teamMonthlyEntries: normalizeTeamMonthlyEntries(source.teamMonthlyEntries, normalizedType),
    teamMonthlyAmountEntries: normalizeTeamMonthlyAmountEntries(
      source.teamMonthlyAmountEntries,
      normalizedType
    ),
    ...normalizeBillingStoreSections(source, normalizedType),
  };
}

function normalizeManualSaveHistory(rawHistory) {
  if (!Array.isArray(rawHistory)) {
    return [];
  }

  return rawHistory
    .map((entry) => {
      if (!isPlainObject(entry)) {
        return null;
      }

      const savedAt = normalizeText(entry.savedAt);
      if (!savedAt) {
        return null;
      }

      return {
        savedAt,
        trigger: normalizeText(entry.trigger) || "manual",
        resourceType: normalizeResourceType(entry.resourceType),
        mode: normalizeText(entry.mode) || MODES.EQUIPMENT,
        contextLabel: normalizeText(entry.contextLabel),
      };
    })
    .filter(Boolean)
    .sort((left, right) => Date.parse(right.savedAt) - Date.parse(left.savedAt))
    .slice(0, MANUAL_SAVE_HISTORY_LIMIT);
}

function normalizeStore(rawStore) {
  const normalizedResourceType = normalizeResourceType(rawStore?.resourceType);
  const electricDataset = normalizeResourceDataset(
    extractRawResourceDataset(rawStore, RESOURCE_TYPES.ELECTRIC),
    RESOURCE_TYPES.ELECTRIC
  );
  const gasDataset = normalizeResourceDataset(
    extractRawResourceDataset(rawStore, RESOURCE_TYPES.GAS),
    RESOURCE_TYPES.GAS
  );
  const wasteDataset = normalizeResourceDataset(
    extractRawResourceDataset(rawStore, RESOURCE_TYPES.WASTE),
    RESOURCE_TYPES.WASTE
  );
  const productionDataset = normalizeResourceDataset(
    extractRawResourceDataset(rawStore, RESOURCE_TYPES.PRODUCTION),
    RESOURCE_TYPES.PRODUCTION
  );

  return attachResourceDatasetToStore(
    {
      resourceType: normalizedResourceType,
      resourceDatasets: {
        [RESOURCE_TYPES.ELECTRIC]: electricDataset,
        [RESOURCE_TYPES.GAS]: gasDataset,
        [RESOURCE_TYPES.WASTE]: wasteDataset,
        [RESOURCE_TYPES.PRODUCTION]: productionDataset,
      },
      mode: MODES.EQUIPMENT,
      equipmentItems: [],
      equipmentEntries: {},
      teamAssignments: {},
      teamMonthlyEntries: {},
      teamMonthlyAmountEntries: {},
      billingDocuments: {},
      billingSettlementEntries: {},
      manualSaveHistory: normalizeManualSaveHistory(rawStore?.manualSaveHistory),
      presetImportVersion: PRESET_IMPORT_VERSION,
      entryResetVersion: ENTRY_RESET_VERSION,
      entryStatusBaselineVersion: ENTRY_STATUS_BASELINE_VERSION,
      equipmentFactorMigrationVersion: EQUIPMENT_FACTOR_MIGRATION_VERSION,
      teamAssignmentBaselineVersion: TEAM_ASSIGNMENT_BASELINE_VERSION,
      historicalEntryValueFixVersion: HISTORICAL_ENTRY_VALUE_FIX_VERSION,
      stickMeterSplitVersion: STICK_METER_SPLIT_VERSION,
    },
    normalizedResourceType
  );
}
