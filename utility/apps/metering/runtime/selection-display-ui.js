function handleCalendarDisplayModeToggleClick() {
  state.selectionDisplayMode = "monthly";
  syncCalendarDisplayModeToggleButton();
  syncSelectedDatePresentation();
  syncSelectedEquipmentCardState();
  renderTeamMode();
  renderCalendar();
  renderSummary();
}

function syncCalendarDisplayModeToggleButton() {
  state.selectionDisplayMode = "monthly";
  if (!elements.calendarDisplayModeToggleBtn) {
    return;
  }

  elements.calendarDisplayModeToggleBtn.classList.add("is-hidden");
  elements.calendarDisplayModeToggleBtn.disabled = true;
  elements.calendarDisplayModeToggleBtn.textContent = "월별";
  elements.calendarDisplayModeToggleBtn.setAttribute("aria-pressed", "true");
  elements.calendarDisplayModeToggleBtn.title = "월별만 표시합니다.";
}
