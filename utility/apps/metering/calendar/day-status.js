function normalizeEntryDayStatus(value) {
  const normalizedValue = normalizeText(value).toLowerCase();
  if (normalizedValue === "rain") {
    return "holiday";
  }

  return ENTRY_DAY_STATUS_ORDER.includes(normalizedValue) ? normalizedValue : "";
}

function getEntryDayStatus(entry) {
  if (!entry) {
    return "";
  }

  const dayStatus = normalizeEntryDayStatus(entry.dayStatus);
  if (dayStatus) {
    return dayStatus;
  }

  return entry.completed ? "completed" : "";
}

function normalizeEquipmentFieldDayStatus(status) {
  const normalizedStatus = normalizeText(status).toLowerCase();
  return normalizedStatus === "completed" || normalizedStatus === "holiday" ? normalizedStatus : "";
}

function getEntryEquipmentFieldDayStatus(entry, fieldKey) {
  return normalizeEquipmentFieldDayStatus(entry?.fieldDayStatuses?.[fieldKey]);
}

function getDerivedEntryDayStatusFromFieldDayStatuses(entry) {
  return "";
}

function isWeekendDate(dateString) {
  if (!dateString) {
    return false;
  }

  const dayOfWeek = parseDateString(dateString).getDay();
  return dayOfWeek === 0 || dayOfWeek === 6;
}

function getDefaultCalendarDayStatus(dateString) {
  if (getAutoHolidayDateSet(dateString?.slice(0, 7)).has(dateString)) {
    return "holiday";
  }

  return "";
}

function getCompletedDateStrings() {
  return Object.keys(state.store.equipmentEntries)
    .filter((dateString) => {
      if (isFutureDate(dateString)) {
        return false;
      }

      return getEntryDayStatus(state.store.equipmentEntries[dateString]) === "completed";
    })
    .sort();
}

function getAutoHolidayDateSet(monthValue = state.currentMonth) {
  const normalizedMonth = normalizeMonthValue(monthValue);
  if (!normalizedMonth) {
    return new Set();
  }

  const completedDates = getCompletedDateStrings();
  if (completedDates.length < 2) {
    return new Set();
  }

  const autoHolidayDates = new Set();

  for (let index = 1; index < completedDates.length; index += 1) {
    const startDate = completedDates[index - 1];
    const endDate = completedDates[index];
    let cursorDate = getNextDateString(startDate);

    while (cursorDate < endDate) {
      if (!isFutureDate(cursorDate) && cursorDate.startsWith(`${normalizedMonth}-`)) {
        const entry = state.store.equipmentEntries[cursorDate];
        if (!hasEntryValue(entry) && !getEntryDayStatus(entry)) {
          autoHolidayDates.add(cursorDate);
        }
      }

      cursorDate = getNextDateString(cursorDate);
    }
  }

  return autoHolidayDates;
}

function getResolvedEntryDayStatus(entry, dateString = state.selectedDate) {
  return (
    getEntryDayStatus(entry) ||
    getDerivedEntryDayStatusFromFieldDayStatuses(entry) ||
    getDefaultCalendarDayStatus(dateString)
  );
}

function getCurrentEntryDayStatus() {
  return normalizeEntryDayStatus(elements.entryStatusWrap?.dataset.entryStatus);
}

function setCurrentEntryDayStatus(status) {
  if (!elements.entryStatusWrap) {
    return;
  }

  const normalizedStatus = normalizeEntryDayStatus(status);
  elements.entryStatusWrap.dataset.entryStatus = normalizedStatus;

  if (elements.entryCompleteCheckbox) {
    elements.entryCompleteCheckbox.checked = normalizedStatus === "completed";
    elements.entryCompleteCheckbox.indeterminate = false;
  }
}

function getNextEntryDayStatus(status) {
  const normalizedStatus = normalizeEntryDayStatus(status);
  const currentIndex = ENTRY_DAY_STATUS_ORDER.indexOf(normalizedStatus);
  return ENTRY_DAY_STATUS_ORDER[(currentIndex + 1) % ENTRY_DAY_STATUS_ORDER.length];
}

function getCalendarSelectableDateStrings(monthValue = state.currentMonth) {
  if (!monthValue) {
    return [];
  }

  const [year, month] = monthValue.split("-").map(Number);
  if (!year || !month) {
    return [];
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  return Array.from({ length: daysInMonth }, (_, index) => {
    return `${monthValue}-${String(index + 1).padStart(2, "0")}`;
  }).filter((dateString) => !isFutureDate(dateString));
}

function getSelectedCalendarDateKeys(monthValue = state.currentMonth) {
  const orderedDateStrings = getCalendarSelectableDateStrings(monthValue);
  if (!orderedDateStrings.length) {
    return [];
  }

  const selectedDates = Array.isArray(state.selectedCalendarDates) ? state.selectedCalendarDates : [];
  const nextSelection = new Set(selectedDates.filter((dateString) => orderedDateStrings.includes(dateString)));
  if (state.selectedDate && orderedDateStrings.includes(state.selectedDate)) {
    nextSelection.add(state.selectedDate);
  }

  return orderedDateStrings.filter((dateString) => nextSelection.has(dateString));
}

function resolveCalendarDateSelection(targetDateString, event) {
  const orderedDateStrings = getCalendarSelectableDateStrings();
  if (!targetDateString || !orderedDateStrings.includes(targetDateString)) {
    return getSelectedCalendarDateKeys();
  }

  const wantsRangeSelection = Boolean(event?.shiftKey);
  const wantsToggleSelection = Boolean(event?.ctrlKey || event?.metaKey);

  if (wantsRangeSelection && state.calendarSelectionAnchorDate) {
    const anchorIndex = orderedDateStrings.indexOf(state.calendarSelectionAnchorDate);
    if (anchorIndex >= 0) {
      const targetIndex = orderedDateStrings.indexOf(targetDateString);
      const [fromIndex, toIndex] =
        anchorIndex <= targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
      const nextSelection = new Set(getSelectedCalendarDateKeys());

      orderedDateStrings.slice(fromIndex, toIndex + 1).forEach((dateString) => {
        nextSelection.add(dateString);
      });

      return orderedDateStrings.filter((dateString) => nextSelection.has(dateString));
    }
  }

  if (wantsToggleSelection) {
    const nextSelection = new Set(getSelectedCalendarDateKeys());
    if (nextSelection.has(targetDateString)) {
      nextSelection.delete(targetDateString);
    } else {
      nextSelection.add(targetDateString);
    }

    return orderedDateStrings.filter((dateString) => nextSelection.has(dateString));
  }

  return [targetDateString];
}

function handleCalendarDateClick(dateString, event) {
  if (!dateString) {
    return;
  }

  const nextSelectedDates = resolveCalendarDateSelection(dateString, event);
  const fallbackDate = nextSelectedDates[nextSelectedDates.length - 1] || "";
  const nextActiveDate = nextSelectedDates.includes(dateString) ? dateString : fallbackDate;
  const nextAnchorDate = nextSelectedDates.includes(dateString) ? dateString : fallbackDate;

  selectDate(nextActiveDate, {
    selectionDates: nextSelectedDates,
    selectionAnchorDate: nextAnchorDate,
  });
}

function handleEntryCompleteCheckboxChange(event) {
  const nextStatus = event.target?.checked ? "completed" : "";
  applySelectedCalendarDatesStatus(nextStatus);
}

function applySelectedCalendarDatesStatus(status) {
  const selectedDateKeys = getSelectedCalendarDateKeys();
  if (selectedDateKeys.length > 1) {
    setSelectedCalendarDatesStatus(selectedDateKeys, status);
    return;
  }

  const previousStatus = getCurrentEntryDayStatus();
  const nextStatus = normalizeEntryDayStatus(status);
  setCurrentEntryDayStatus(nextStatus);
  const validationIssues = getCurrentEquipmentReadingValidationIssues();
  if (validationIssues.length) {
    setCurrentEntryDayStatus(previousStatus);
  }

  updateDirtyState();
  updateActionState();
}
