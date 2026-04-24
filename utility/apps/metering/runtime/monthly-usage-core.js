function getTeamUsagePeriod(monthValue = state.currentMonth) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return null;
  }

  const startDate = `${normalizedMonth}-01`;
  const isCurrentMonth = normalizedMonth === getMonthValue(today());
  const [year, month] = normalizedMonth.split("-").map(Number);
  const endDate = isCurrentMonth ? formatDate(today()) : formatDate(new Date(year, month, 1));

  return {
    startDate,
    endDate,
    isCurrentMonth,
  };
}

function getTeamUsagePeriodText() {
  return "";
}

function hasUsageAllocatedDayStatus(dateString) {
  return Boolean(getResolvedEntryDayStatus(state.store.equipmentEntries[dateString], dateString));
}

function shouldExcludeEquipmentUsageOnDate() {
  return false;
}

function createOtherDailyUsageResult(dateString) {
  const value = calculateOtherDailyUsage(dateString);
  return {
    value,
    difference: value,
    factor: 1,
    startDate: dateString,
    endDate: getNextDateString(dateString),
    startReading: null,
    endReading: null,
  };
}

function createOtherCalendarDailyUsageResult(dateString) {
  const value = calculateOtherCalendarDailyUsage(dateString);
  return {
    value,
    difference: value,
    factor: 1,
    startDate: dateString,
    endDate: getNextDateString(dateString),
    startReading: null,
    endReading: null,
  };
}

function getMonthDateStrings(monthValue = state.currentMonth) {
  if (!monthValue) {
    return [];
  }

  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return [];
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    const day = String(index + 1).padStart(2, "0");
    return `${monthValue}-${day}`;
  });
}

function calculateMonthlyUsageFromDailyResolver(resolveUsage, monthValue = state.currentMonth) {
  const monthDates = getMonthDateStrings(monthValue);
  let totalValue = 0;
  let totalDifference = 0;
  let daysCount = 0;
  let startDate = "";
  let endDate = "";

  monthDates.forEach((dateString) => {
    const usage = resolveUsage(dateString);
    if (!usage || usage.value === null) {
      return;
    }

    totalValue += usage.value;
    totalDifference += usage.difference ?? 0;

    if (!startDate) {
      startDate = usage.startDate || dateString;
    }

    endDate = usage.endDate || getNextDateString(dateString);
    daysCount += 1;
  });

  return {
    value: daysCount ? totalValue : null,
    difference: daysCount ? totalDifference : null,
    startDate,
    endDate,
    startReading: null,
    endReading: null,
    daysCount,
  };
}

function calculateEquipmentGroupDailyUsage(equipmentIds, dateString) {
  const values = equipmentIds
    .map((equipmentId) => calculateEquipmentDailyUsage(equipmentId, dateString).value)
    .filter((value) => value !== null);

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function calculateEquipmentGroupCalendarDailyUsage(equipmentIds, dateString) {
  const values = equipmentIds
    .map((equipmentId) => calculateEquipmentCalendarDailyUsage(equipmentId, dateString).value)
    .filter((value) => value !== null);

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function calculateEquipmentGroupMonthlyUsage(equipmentIds) {
  const values = equipmentIds
    .map((equipmentId) => calculateEquipmentMonthlyUsage(equipmentId).value)
    .filter((value) => value !== null);

  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0);
}

function calculateOtherDailyUsage(dateString) {
  if (isGasResourceType()) {
    return null;
  }

  const totalPowerUsage = calculateEquipmentGroupDailyUsage(
    getDefaultCalendarTrackedEquipmentIds(),
    dateString
  );
  if (totalPowerUsage === null) {
    return null;
  }

  const equipmentUsage = calculateEquipmentGroupDailyUsage(getEquipmentSummaryIds(), dateString);
  return totalPowerUsage - (equipmentUsage ?? 0);
}

function calculateOtherCalendarDailyUsage(dateString) {
  if (isGasResourceType()) {
    return null;
  }

  const totalPowerUsage = calculateEquipmentGroupCalendarDailyUsage(
    getDefaultCalendarTrackedEquipmentIds(),
    dateString
  );
  if (totalPowerUsage === null) {
    return null;
  }

  const equipmentUsage = calculateEquipmentGroupCalendarDailyUsage(
    getEquipmentSummaryIds(),
    dateString
  );
  return totalPowerUsage - (equipmentUsage ?? 0);
}

function calculateOtherMonthlyUsage() {
  if (isGasResourceType()) {
    return null;
  }

  const totalPowerUsage = calculateTotalPowerMonthlyUsage();
  if (totalPowerUsage !== null) {
    const equipmentUsage = calculateEquipmentGroupMonthlyUsage(getEquipmentSummaryIds());
    return totalPowerUsage - (equipmentUsage ?? 0);
  }

  return calculateMonthlyUsageFromDailyResolver((dateString) =>
    createOtherDailyUsageResult(dateString)
  ).value;
}
