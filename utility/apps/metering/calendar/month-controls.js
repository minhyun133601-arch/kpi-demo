function setupPeriodControls() {
  const years = getAvailableYears();
  elements.yearPicker.innerHTML = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
}

function handlePeriodChange() {
  const selectedYear = Number(elements.yearPicker.value);
  if (!selectedYear) {
    return;
  }

  const preferredMonth = elements.monthPicker.value || state.currentMonth.slice(5, 7) || "01";
  populateMonthOptions(selectedYear, preferredMonth);

  const selectedMonth = elements.monthPicker.value;
  if (!selectedMonth) {
    return;
  }

  const nextMonth = `${selectedYear}-${selectedMonth}`;
  if (nextMonth === state.currentMonth) {
    return;
  }

  applyMonth(nextMonth);
}

function handleMonthStep(offset) {
  const nextMonth = getAdjacentMonthValue(state.currentMonth, offset);
  if (!nextMonth || nextMonth === state.currentMonth) {
    syncMonthNavigation();
    return;
  }

  applyMonth(nextMonth);
}

function applyMonth(monthValue) {
  if (!monthValue) {
    return;
  }

  state.currentMonth = monthValue;
  closeBillingDocumentPreview();
  state.openTeamPickerKey = "";
  state.teamPickerSelections = {};
  syncPeriodControls(monthValue);
  syncMonthNavigation();
  elements.monthTitle.textContent = formatMonthTitle(monthValue);
  updateCalendarHint();

  const defaultDate = getLatestEntryDateInMonth(monthValue) || getLatestAvailableDate(monthValue);
  selectDate(defaultDate, { skipDirtyCheck: true });
  renderSummary();
}

function syncPeriodControls(monthValue) {
  const [year, month] = monthValue.split("-").map(Number);

  if (!elements.yearPicker.querySelector(`option[value="${year}"]`)) {
    setupPeriodControls();
  }

  elements.yearPicker.value = String(year);
  populateMonthOptions(year, month);
}

function populateMonthOptions(year, preferredMonth) {
  const minimumMonthValue = getMinimumSelectableMonth();
  const maximumMonthValue = getMaximumSelectableMonth();
  const minimumMonth =
    minimumMonthValue && Number(minimumMonthValue.slice(0, 4)) === Number(year)
      ? Number(minimumMonthValue.slice(5, 7))
      : 1;
  const maxMonth =
    maximumMonthValue && Number(maximumMonthValue.slice(0, 4)) === Number(year)
      ? Number(maximumMonthValue.slice(5, 7))
      : 12;

  elements.monthPicker.innerHTML = Array.from(
    { length: Math.max(maxMonth - minimumMonth + 1, 0) },
    (_, index) => {
      const monthNumber = minimumMonth + index;
      const monthValue = String(monthNumber).padStart(2, "0");
      return `<option value="${monthValue}">${monthNumber}</option>`;
    }
  ).join("");

  const normalizedMonth = String(
    Math.min(Math.max(Number(preferredMonth) || minimumMonth, minimumMonth), maxMonth)
  ).padStart(2, "0");
  elements.monthPicker.value = normalizedMonth;
}

function syncMonthNavigation() {
  const previousMonth = getAdjacentMonthValue(state.currentMonth, -1);
  const nextMonth = getAdjacentMonthValue(state.currentMonth, 1);

  elements.prevMonthBtn.disabled = !previousMonth;
  elements.nextMonthBtn.disabled = !nextMonth;
}

function getAdjacentMonthValue(monthValue, offset) {
  if (!monthValue || !Number.isInteger(offset) || offset === 0) {
    return "";
  }

  const nextMonth = shiftMonthValue(monthValue, offset);
  return isSelectableMonth(nextMonth) ? nextMonth : "";
}

function shiftMonthValue(monthValue, offset) {
  if (!monthValue || !Number.isInteger(offset) || offset === 0) {
    return "";
  }

  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return "";
  }

  const nextDate = new Date(year, month - 1 + offset, 1);
  return getMonthValue(nextDate);
}

function isSelectableMonth(monthValue) {
  if (!monthValue) {
    return false;
  }

  return (
    compareMonthValues(monthValue, getMinimumSelectableMonth()) >= 0 &&
    compareMonthValues(monthValue, getMaximumSelectableMonth()) <= 0
  );
}

function getMinimumSelectableMonth() {
  return FIXED_MIN_SELECTABLE_MONTH;
}

function getMaximumSelectableMonth() {
  const todayMonth = getMonthValue(today());
  return compareMonthValues(todayMonth, FIXED_MAX_SELECTABLE_MONTH) < 0
    ? todayMonth
    : FIXED_MAX_SELECTABLE_MONTH;
}

function compareMonthValues(leftMonth, rightMonth) {
  return leftMonth.localeCompare(rightMonth);
}

function getSelectableMonthValues(resourceType = getCurrentResourceType()) {
  const activeEntries = isPlainObject(state?.store?.equipmentEntries) ? state.store.equipmentEntries : {};
  const presetEntries = isGasResourceType(resourceType) ? getPresetGasEntries() : getPresetEquipmentEntries();
  const discoveredMonths = [...Object.keys(activeEntries), ...Object.keys(presetEntries)]
    .map((dateString) => String(dateString || "").slice(0, 7))
    .filter((monthValue) => /^\d{4}-\d{2}$/.test(monthValue))
    .filter((monthValue, index, list) => list.indexOf(monthValue) === index)
    .sort();

  if (discoveredMonths.length) {
    return discoveredMonths;
  }

  const months = [];
  let cursor = FIXED_MIN_SELECTABLE_MONTH;
  while (compareMonthValues(cursor, FIXED_MAX_SELECTABLE_MONTH) <= 0) {
    months.push(cursor);
    cursor = shiftMonthValue(cursor, 1);
    if (!cursor) {
      break;
    }
  }
  return months;
}

function getAvailableYears() {
  const minimumYear = Number(getMinimumSelectableMonth().slice(0, 4));
  const maximumYear = Number(getMaximumSelectableMonth().slice(0, 4));
  const years = [];

  for (let year = maximumYear; year >= minimumYear; year -= 1) {
    years.push(year);
  }

  return years;
}

function updateCalendarHint() {
  const correctionHint = isGasResourceType() ? GAS_CORRECTION_MONTH_HINTS[state.currentMonth] || "" : "";
  elements.calendarHint.textContent = correctionHint;
}
