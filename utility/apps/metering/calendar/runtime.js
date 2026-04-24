function setSelectedCalendarDatesStatus(selectedDateKeys, status) {
  const orderedDateKeys = getCalendarSelectableDateStrings().filter((dateString) =>
    selectedDateKeys.includes(dateString)
  );
  if (!orderedDateKeys.length) {
    return;
  }

  if (state.selectedDate && orderedDateKeys.includes(state.selectedDate) && isDirty()) {
    saveEquipmentEntryDraftToLocalStore();
  }

  const nextStatus = normalizeEntryDayStatus(status);
  const updatedAt = new Date().toISOString();

  orderedDateKeys.forEach((dateString) => {
    setStoredEntryDayStatus(dateString, nextStatus, { updatedAt });
  });

  state.cleanStatusText =
    nextStatus === "completed"
      ? `${orderedDateKeys.length}일을 완료 상태로 표시했습니다.`
      : `${orderedDateKeys.length}일 완료 표시를 해제했습니다.`;

  if (state.selectedDate) {
    loadEntryToForm(getCurrentEntry());
  } else {
    renderCalendar();
    renderSummary();
    renderTeamMode();
  }

  updateDirtyState();
  updateActionState();
}

function setStoredEntryDayStatus(dateString, status, options = {}) {
  if (!dateString) {
    return;
  }

  const normalizedStatus = normalizeEntryDayStatus(status);
  const updatedAt = options.updatedAt || new Date().toISOString();
  const currentEntry = state.store.equipmentEntries[dateString];
  const nextEntry = {
    values: { ...(currentEntry?.values || {}) },
    statuses: { ...(currentEntry?.statuses || {}) },
    fieldDayStatuses: {},
    dayStatus: normalizedStatus,
    completed: normalizedStatus === "completed",
    updatedAt,
  };

  if (hasEntryData(nextEntry)) {
    state.store.equipmentEntries[dateString] = nextEntry;
  } else {
    delete state.store.equipmentEntries[dateString];
  }
}

function getCalendarDayBadgeMarkup(dayStatus, hasEntry) {
  void hasEntry;

  const label = dayStatus === "holiday" ? "휴무" : ENTRY_DAY_STATUS_META[dayStatus]?.label || "";
  if (dayStatus === "completed" || dayStatus === "holiday") {
    return `
      <span class="day-status-icon is-${dayStatus}" aria-hidden="true"></span>
      <span class="status-sr-only">${label}</span>
    `;
  }

  return "";
}

function getPreviousDateString(dateString) {
  const previousDate = parseDateString(dateString);
  previousDate.setDate(previousDate.getDate() - 1);
  return formatDate(previousDate);
}

function calculateEquipmentCalendarAnchorUsage(equipmentId, dateString) {
  const equipment = getEquipmentItem(equipmentId);
  if (!equipment || isOtherEquipment(equipment)) {
    return {
      value: null,
      dayCounts: [],
    };
  }

  const factor = getEquipmentUsageFactor(equipmentId);
  const usageWindow = getEquipmentDistributedUsageWindow(equipmentId, dateString);
  const distributedDates = usageWindow?.distributedDates || [];
  const startReading = usageWindow?.startReading ?? null;
  const endReading = usageWindow?.endReading ?? null;
  const rawDifference =
    startReading === null || endReading === null ? null : endReading - startReading;
  const anchorDate = distributedDates.length
    ? distributedDates[distributedDates.length - 1]
    : getPreviousDateString(usageWindow?.endDate || "");

  if (isUsageCalculationExcludedEquipment(equipment)) {
    return {
      value: null,
      dayCounts: [],
    };
  }

  if (rawDifference === null || !distributedDates.length || anchorDate !== dateString) {
    return {
      value: null,
      dayCounts: [],
    };
  }

  return {
    value: rawDifference * factor,
    dayCounts: [distributedDates.length],
  };
}

function sumCalendarAnchorUsageItems(items) {
  if (!items.length) {
    return {
      value: null,
      dayCounts: [],
    };
  }

  return {
    value: items.reduce((sum, item) => sum + (item.value ?? 0), 0),
    dayCounts: items.flatMap((item) => item.dayCounts || []),
  };
}

function calculateOtherCalendarAnchorUsage(dateString) {
  const totalPowerUsage = calculateCalendarScopeAnchorUsage(
    getDefaultCalendarTrackedEquipmentIds(),
    dateString
  );
  if (totalPowerUsage.value === null) {
    return {
      value: null,
      dayCounts: [],
    };
  }

  const equipmentUsage = calculateCalendarScopeAnchorUsage(getEquipmentSummaryIds(), dateString);
  return {
    value: totalPowerUsage.value - (equipmentUsage.value ?? 0),
    dayCounts: totalPowerUsage.dayCounts,
  };
}

function calculateCalendarScopeAnchorUsage(equipmentIds, dateString) {
  const usageItems = equipmentIds.reduce((accumulator, equipmentId) => {
    const equipment = getEquipmentItem(equipmentId);
    if (!equipment) {
      return accumulator;
    }

    const usage = isOtherEquipment(equipment)
      ? calculateOtherCalendarAnchorUsage(dateString)
      : calculateEquipmentCalendarAnchorUsage(equipmentId, dateString);

    if (usage.value === null) {
      return accumulator;
    }

    accumulator.push(usage);
    return accumulator;
  }, []);

  return sumCalendarAnchorUsageItems(usageItems);
}

function formatCalendarAnchorDayCounts(dayCounts) {
  const uniqueDayCounts = [...new Set((dayCounts || []).filter((value) => Number.isFinite(value) && value > 0))];
  if (!uniqueDayCounts.length) {
    return "";
  }

  return `(${uniqueDayCounts.map((value) => `${value}일`).join(", ")})`;
}

function renderCalendar() {
  const entries = state.store.equipmentEntries;
  const [year, month] = state.currentMonth.split("-").map(Number);
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const selectedCalendarDates = new Set(getSelectedCalendarDateKeys());
  let completedDaysCount = 0;
  let holidayDaysCount = 0;
  let errorDaysCount = 0;

  elements.calendarGrid.innerHTML = "";

  for (let index = 0; index < firstDayOfWeek; index += 1) {
    const spacer = document.createElement("div");
    spacer.className = "calendar-spacer";
    spacer.setAttribute("aria-hidden", "true");
    elements.calendarGrid.appendChild(spacer);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateString = `${state.currentMonth}-${String(day).padStart(2, "0")}`;
    const entry = entries[dateString];
    const hasEntry = hasEntryData(entry);
    const dayStatus = getResolvedEntryDayStatus(entry, dateString);
    const dayStatusMeta = ENTRY_DAY_STATUS_META[dayStatus];
    const validationIssues = getStoredEquipmentReadingValidationIssues(dateString);
    const hasValidationError = validationIssues.length > 0;
    const disabled = isFutureDate(dateString);
    const button = document.createElement("button");

    if (!disabled) {
      if (dayStatus === "completed") {
        completedDaysCount += 1;
      } else if (dayStatus === "holiday") {
        holidayDaysCount += 1;
      }

      if (hasValidationError) {
        errorDaysCount += 1;
      }
    }

    button.type = "button";
    button.className = "calendar-day";
    button.dataset.dateString = dateString;
    button.disabled = disabled;

    if (dayStatusMeta?.calendarClassName) {
      button.classList.add(dayStatusMeta.calendarClassName);
    }

    if (hasValidationError) {
      button.classList.add("has-validation-error");
      button.title = getEquipmentReadingValidationSummaryText(validationIssues);
    }

    if (selectedCalendarDates.has(dateString)) {
      button.classList.add("selected");
    }

    const footMainMarkup = disabled
      ? ""
      : dayStatus
        ? `<span class="day-foot-main">${getCalendarDayBadgeMarkup(dayStatus, hasEntry)}</span>`
        : `<span class="day-foot-main day-status-text">\uBBF8\uC785\uB825</span>`;
    const footNote = !disabled && hasValidationError ? "오류" : "";
    const footClassName = footMainMarkup || footNote
      ? `day-foot${dayStatus ? " has-status-icon" : ""}`
      : "day-foot is-empty";

    button.innerHTML = `
      <div class="day-top">
        <span class="day-number">${day}</span>
      </div>
      <div class="${footClassName}">
        ${footMainMarkup}
        ${footNote ? `<span class="day-foot-note">${footNote}</span>` : ""}
      </div>
    `;

    if (!disabled) {
      button.addEventListener("click", (event) => {
        handleCalendarDateClick(dateString, event);
      });
    }

    elements.calendarGrid.appendChild(button);
  }

  const trailingColumnCount = (7 - ((firstDayOfWeek + daysInMonth) % 7)) % 7;
  const summary = document.createElement("div");
  summary.className = "calendar-tail-summary";
  if (trailingColumnCount > 0) {
    summary.style.gridColumn = `span ${trailingColumnCount}`;
  } else {
    summary.style.gridColumn = "1 / -1";
  }
  summary.innerHTML = `
    <span class="calendar-tail-summary-chip is-completed">완료 ${completedDaysCount}일</span>
    <span class="calendar-tail-summary-chip is-holiday"><span class="status-sr-only">휴무</span>${holidayDaysCount}일</span>
    ${errorDaysCount ? `<span class="calendar-tail-summary-chip is-error">오류 ${errorDaysCount}일</span>` : ""}
  `;
  elements.calendarGrid.appendChild(summary);

  syncCalendarPopupWindow();
}
