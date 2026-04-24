function getResolvedEquipmentUsageFactor(equipmentId, factorOverride = null) {
  if (Number.isFinite(factorOverride)) {
    return factorOverride;
  }

  return isGasResourceType() ? 1 : getEquipmentUsageFactor(equipmentId);
}

function calculateEquipmentDailyUsageBase(equipmentId, dateString, options = {}) {
  const { includeExcludedUsage = false, factorOverride = null } = options;
  const equipment = getEquipmentItem(equipmentId);
  const factor = getResolvedEquipmentUsageFactor(equipmentId, factorOverride);
  if (isOtherEquipment(equipment)) {
    return createOtherDailyUsageResult(dateString);
  }

  const usageWindow = isGasResourceType()
    ? getGasRecentUsageWindow(equipmentId, dateString)
    : getEquipmentDistributedUsageWindow(equipmentId, dateString);
  const startDate = usageWindow?.startDate || dateString;
  const endDate = usageWindow?.endDate || (isGasResourceType() ? dateString : getNextDateString(dateString));
  const startReading = usageWindow?.startReading ?? null;
  const endReading = usageWindow?.endReading ?? null;
  const distributedDates = usageWindow?.distributedDates || [];
  const rawDifference =
    startReading === null || endReading === null ? null : endReading - startReading;

  if (isUsageCalculationExcludedEquipment(equipment) && !includeExcludedUsage) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  if (shouldExcludeEquipmentUsageOnDate(equipmentId, dateString)) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  if (rawDifference === null || !distributedDates.length) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  if (isGasResourceType()) {
    return {
      value: rawDifference,
      difference: rawDifference,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  const difference = rawDifference / distributedDates.length;
  const value = difference * factor;

  return {
    value,
    difference,
    factor,
    startDate,
    endDate,
    startReading,
    endReading,
  };
}

function calculateEquipmentCalendarDailyUsageBase(equipmentId, dateString, options = {}) {
  const { includeExcludedUsage = false, factorOverride = null } = options;
  const equipment = getEquipmentItem(equipmentId);
  const factor = getResolvedEquipmentUsageFactor(equipmentId, factorOverride);
  if (isOtherEquipment(equipment)) {
    return createOtherCalendarDailyUsageResult(dateString);
  }

  const usageWindow = isGasResourceType()
    ? getGasRecentUsageWindow(equipmentId, dateString)
    : getEquipmentDistributedUsageWindow(equipmentId, dateString);
  const startDate = usageWindow?.startDate || dateString;
  const endDate = usageWindow?.endDate || (isGasResourceType() ? dateString : getNextDateString(dateString));
  const startReading = usageWindow?.startReading ?? null;
  const endReading = usageWindow?.endReading ?? null;
  const distributedDates = usageWindow?.distributedDates || [];
  const rawDifference =
    startReading === null || endReading === null ? null : endReading - startReading;

  if (isUsageCalculationExcludedEquipment(equipment) && !includeExcludedUsage) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  if (shouldExcludeEquipmentUsageOnDate(equipmentId, dateString)) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  if (rawDifference === null || !distributedDates.length) {
    return {
      value: null,
      difference: null,
      factor,
      startDate,
      endDate,
      startReading,
      endReading,
    };
  }

  return {
    value: rawDifference * factor,
    difference: rawDifference,
    factor,
    startDate,
    endDate,
    startReading,
    endReading,
  };
}

function calculateGasCorrectionFactorForDate(dateString, options = {}) {
  if (!isGasResourceType()) {
    return null;
  }

  const { calendarMode = false } = options;
  const resolveUsage = calendarMode
    ? calculateEquipmentCalendarDailyUsageBase
    : calculateEquipmentDailyUsageBase;
  const totalUsage = resolveUsage(GAS_TOTAL_USAGE_EQUIPMENT_ID, dateString, { factorOverride: 1 }).value;
  const sourceUsageTotal = GAS_CORRECTION_SOURCE_IDS.map((equipmentId) =>
    resolveUsage(equipmentId, dateString, { factorOverride: 1 }).value
  )
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);

  if (!Number.isFinite(totalUsage) || sourceUsageTotal <= 0) {
    return null;
  }

  return totalUsage / sourceUsageTotal;
}

function calculateEquipmentMonthlyUsageBase(equipmentId, options = {}) {
  const { includeExcludedUsage = false, factorOverride = null, monthValue = state.currentMonth } = options;
  const period = getTeamUsagePeriod(monthValue);
  const factor = getResolvedEquipmentUsageFactor(equipmentId, factorOverride);
  const equipment = getEquipmentItem(equipmentId);
  if (!period) {
    return {
      value: null,
      difference: null,
      factor,
      startDate: "",
      endDate: "",
      startReading: null,
      endReading: null,
      daysCount: 0,
    };
  }

  if (isOtherEquipment(equipment)) {
    const dailyOtherUsage = calculateMonthlyUsageFromDailyResolver((dateString) =>
      createOtherDailyUsageResult(dateString)
    );
    const monthlyOtherUsage = calculateOtherMonthlyUsage();
    return {
      value: monthlyOtherUsage,
      difference: monthlyOtherUsage,
      factor,
      startDate: dailyOtherUsage.startDate || period.startDate,
      endDate: dailyOtherUsage.endDate || period.endDate,
      startReading: null,
      endReading: null,
      daysCount: dailyOtherUsage.daysCount,
    };
  }

  if (isUsageCalculationExcludedEquipment(equipment) && !includeExcludedUsage) {
    return {
      value: null,
      difference: null,
      factor,
      startDate: period.startDate,
      endDate: period.endDate,
      startReading: null,
      endReading: null,
      daysCount: 0,
    };
  }

  if (isGasResourceType()) {
    const boundaryUsageWindow = getGasMonthlyBoundaryUsageWindow(equipmentId, monthValue);
    if (boundaryUsageWindow) {
      const difference = boundaryUsageWindow.endReading - boundaryUsageWindow.startReading;
      return {
        value: difference,
        difference,
        factor,
        startDate: boundaryUsageWindow.startDate,
        endDate: boundaryUsageWindow.endDate,
        startReading: boundaryUsageWindow.startReading,
        endReading: boundaryUsageWindow.endReading,
        daysCount: 1,
      };
    }

    return {
      value: null,
      difference: null,
      factor,
      startDate: period.startDate,
      endDate: period.endDate,
      startReading: null,
      endReading: null,
      daysCount: 0,
    };
  }

  const usage = calculateMonthlyUsageFromDailyResolver(
    (dateString) =>
      calculateEquipmentDailyUsageBase(equipmentId, dateString, {
        includeExcludedUsage,
        factorOverride,
      }),
    monthValue
  );

  return {
    value: usage.value,
    difference: usage.difference,
    factor,
    startDate: usage.startDate || period.startDate,
    endDate: usage.endDate || period.endDate,
    startReading: null,
    endReading: null,
    daysCount: usage.daysCount,
  };
}

function calculateGasCorrectionFactorForMonth(monthValue = state.currentMonth) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!isGasResourceType() || !normalizedMonth) {
    return null;
  }

  const totalUsage = calculateEquipmentMonthlyUsageBase(GAS_TOTAL_USAGE_EQUIPMENT_ID, {
    monthValue: normalizedMonth,
    factorOverride: 1,
  }).value;
  const sourceUsageTotal = GAS_CORRECTION_SOURCE_IDS.map((equipmentId) =>
    calculateEquipmentMonthlyUsageBase(equipmentId, {
      monthValue: normalizedMonth,
      factorOverride: 1,
    }).value
  )
    .filter((value) => Number.isFinite(value))
    .reduce((sum, value) => sum + value, 0);

  if (!Number.isFinite(totalUsage) || sourceUsageTotal <= 0) {
    return null;
  }

  return totalUsage / sourceUsageTotal;
}
