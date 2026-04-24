"use strict";

const TARGET_COLS = ["A", "B", "C", "E", "F"];
const HEADER_ROW = 3;
const DATA_START_ROW = 4;
const TEAM_VALUE_INDEX = 1;
const LINE_VALUE_INDEX = 2;
const PRODUCTION_VALUE_INDEX = 4;
const PRODUCTION_DATE_OFFSET_DAYS = 0;
const FIXED_PERIOD_START_DAY = 1;

const REQUIRED_HEADER_RULES = {
  A: [/생산일자/],
  B: [/팀/],
  C: [/라인명/, /라인/],
  E: [/품명/],
  F: [/생산량/],
};

const state = {
  headers: TARGET_COLS.map((col) => `${col}열`),
  rows: [],
  filteredRows: [],
  fileSummaries: [],
  periodSummaries: [],
  teamSummaries: [],
  cycleStartDay: FIXED_PERIOD_START_DAY,
  selectedPeriod: "ALL",
  selectedTeam: "ALL",
  selectedLine: "ALL",
  sortKey: "date_asc",
  search: "",
  dateRangeLabel: "-",
  duplicateRemovedCount: 0,
  failedFiles: [],
  storedRows: [],
  storedTeams: [],
};

const dom = {};
function requireProductionParsingApi() {
  const api = window.KPIProductionExtractorImportParsing;
  if (api) return api;
  throw new Error("KPIProductionExtractorImportParsing is not loaded.");
}

function getProductionParsingContext() {
  return {
    XLSX,
    TARGET_COLS,
    HEADER_ROW,
    DATA_START_ROW,
    TEAM_VALUE_INDEX,
    LINE_VALUE_INDEX,
    PRODUCTION_VALUE_INDEX,
    PRODUCTION_DATE_OFFSET_DAYS,
    REQUIRED_HEADER_RULES,
    parseProductionValue,
  };
}

function requireProductionExportActionsApi() {
  const api = window.KPIProductionExtractorExportActions;
  if (api) return api;
  throw new Error("KPIProductionExtractorExportActions is not loaded.");
}

function getProductionExportActionsContext() {
  return {
    window,
    document,
    XLSX,
    state,
    dom,
    formatNumber,
    parseDateText,
    parseProductionValue,
    formatYmd,
    setStatus,
    getSelectedPeriodText,
    getSelectedTeamText,
    getSelectedLineText,
    getSelectedSortText,
    getDateRangeLabel,
    normalizeValue,
    computeProductionStats,
    PRODUCTION_VALUE_INDEX,
    PRODUCTION_DATE_OFFSET_DAYS,
  };
}

const EMBED_DATA_SECTION_IDS = [
  "metricsSection",
  "periodSummarySection",
  "teamSummarySection",
  "resultTableSection",
  "fileSummarySection",
];
const isEmbedMode = (() => {
  try {
    const params = new URLSearchParams(window.location.search || "");
    if (params.get("embed") === "1") return true;
  } catch (error) {
    // no-op
  }
  return window.self !== window.top;
})();

document.addEventListener("DOMContentLoaded", () => {
  cacheDom();
  setupEmbedMode();
  bindEvents();
  clearExtractedState();
  initializeStoredExportPanel();
  setStatus("파일을 첨부한 뒤 추출 실행을 눌러주세요.");
});

function cacheDom() {
  dom.fileInput = document.getElementById("fileInput");
  dom.periodSelect = document.getElementById("periodSelect");
  dom.teamSelect = document.getElementById("teamSelect");
  dom.lineSelect = document.getElementById("lineSelect");
  dom.sortSelect = document.getElementById("sortSelect");
  dom.searchInput = document.getElementById("searchInput");
  dom.extractBtn = document.getElementById("extractBtn");
  dom.applyToKpiBtn = document.getElementById("applyToKpiBtn");
  dom.downloadFilteredBtn = document.getElementById("downloadFilteredBtn");
  dom.downloadAllBtn = document.getElementById("downloadAllBtn");
  dom.backBtn = document.getElementById("backBtn");
  dom.statusText = document.getElementById("statusText");
  dom.storedSection = document.getElementById("storedExportSection");
  dom.storedStartDate = document.getElementById("storedStartDate");
  dom.storedEndDate = document.getElementById("storedEndDate");
  dom.storedTeamSelect = document.getElementById("storedTeamSelect");
  dom.downloadStoredBtn = document.getElementById("downloadStoredBtn");
  dom.refreshStoredBtn = document.getElementById("refreshStoredBtn");

  dom.metricFiles = document.getElementById("metricFiles");
  dom.metricRowsAll = document.getElementById("metricRowsAll");
  dom.metricRowsFiltered = document.getElementById("metricRowsFiltered");
  dom.metricPeriod = document.getElementById("metricPeriod");
  dom.metricTeam = document.getElementById("metricTeam");
  dom.metricLine = document.getElementById("metricLine");
  dom.metricSum = document.getElementById("metricSum");
  dom.metricAvg = document.getElementById("metricAvg");
  dom.metricDateRange = document.getElementById("metricDateRange");
  dom.metricDedup = document.getElementById("metricDedup");

  dom.currentPeriodLabel = document.getElementById("currentPeriodLabel");
  dom.periodSummaryBody = document.getElementById("periodSummaryBody");
  dom.teamSummaryBody = document.getElementById("teamSummaryBody");
  dom.tableHeader = document.getElementById("tableHeader");
  dom.tableBody = document.getElementById("tableBody");
  dom.fileSummary = document.getElementById("fileSummary");
}

function setupEmbedMode() {
  if (!isEmbedMode) return;
  document.body.classList.add("embed-mode");
  setEmbedDataSectionsVisible(false);
  simplifyEmbedControls();
}

function setEmbedDataSectionsVisible(visible) {
  if (!isEmbedMode) return;
  EMBED_DATA_SECTION_IDS.forEach((id) => {
    const section = document.getElementById(id);
    if (!section) return;
    section.style.display = visible ? "" : "none";
  });
}

function simplifyEmbedControls() {
  const controlsSection = document.getElementById("extractControlsSection");
  if (!controlsSection) return;
  controlsSection.querySelectorAll(".field").forEach((field) => {
    const hasFileInput = field.querySelector("#fileInput");
    field.style.display = hasFileInput ? "" : "none";
  });
  dom.downloadFilteredBtn.style.display = "none";
  dom.downloadAllBtn.style.display = "none";
  dom.backBtn.style.display = "none";
  state.cycleStartDay = FIXED_PERIOD_START_DAY;
  if (dom.storedSection) dom.storedSection.style.display = "";
}

function bindEvents() {
  dom.extractBtn.addEventListener("click", handleExtract);
  dom.periodSelect.addEventListener("change", handlePeriodChange);
  dom.teamSelect.addEventListener("change", handleTeamChange);
  dom.lineSelect.addEventListener("change", handleLineChange);
  dom.sortSelect.addEventListener("change", handleSortChange);
  dom.searchInput.addEventListener("input", handleSearch);
  dom.applyToKpiBtn.addEventListener("click", handleApplyToKpi);
  dom.downloadFilteredBtn.addEventListener("click", downloadFilteredRows);
  dom.downloadAllBtn.addEventListener("click", downloadAllRows);
  dom.backBtn.addEventListener("click", handleBack);
  dom.downloadStoredBtn?.addEventListener("click", handleDownloadStoredRows);
  dom.refreshStoredBtn?.addEventListener("click", () => refreshStoredRowsFromParent(true));
  window.addEventListener("message", handleKpiImportResultMessage);

  dom.fileInput.addEventListener("change", () => {
    const count = dom.fileInput.files.length;
    setStatus(
      count > 0
        ? `선택 파일: ${count}개 (여러 파일/여러 시트 동시 분석)`
        : "파일 선택이 취소되었습니다.",
    );
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Backspace") return;
    if (isEditableTarget(event.target)) return;
    event.preventDefault();
    handleBack();
  });
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function handleBack() {
  if (isEmbedMode && window.parent && window.parent !== window) {
    window.parent.postMessage({ type: "kpi-production-close" }, "*");
    return;
  }
  if (window.history.length > 1) window.history.back();
}

function setStatus(message, isError = false) {
  dom.statusText.textContent = message;
  dom.statusText.classList.toggle("error", isError);
}

function setBusy(isBusy) {
  dom.extractBtn.disabled = isBusy;
  dom.applyToKpiBtn.disabled = isBusy || state.rows.length === 0;
  dom.fileInput.disabled = isBusy;
  dom.periodSelect.disabled = isBusy;
  dom.teamSelect.disabled = isBusy;
  dom.lineSelect.disabled = isBusy;
  dom.sortSelect.disabled = isBusy;
  dom.searchInput.disabled = isBusy;
  if (dom.downloadStoredBtn) dom.downloadStoredBtn.disabled = isBusy;
  if (dom.refreshStoredBtn) dom.refreshStoredBtn.disabled = isBusy;
  if (dom.storedStartDate) dom.storedStartDate.disabled = isBusy;
  if (dom.storedEndDate) dom.storedEndDate.disabled = isBusy;
  if (dom.storedTeamSelect) dom.storedTeamSelect.disabled = isBusy;
}

function handlePeriodChange() {
  state.selectedPeriod = dom.periodSelect.value;
  refreshDerivedViews();
  renderAll();
}

function handleTeamChange() {
  state.selectedTeam = dom.teamSelect.value;
  refreshDerivedViews();
  renderAll();
}

function handleLineChange() {
  state.selectedLine = dom.lineSelect.value;
  refreshDerivedViews();
  renderAll();
}

function handleSortChange() {
  state.sortKey = dom.sortSelect.value;
  refreshFilteredRows();
  renderAll();
}

function handleSearch() {
  state.search = dom.searchInput.value.trim().toLowerCase();
  refreshDerivedViews();
  renderAll();
}

async function handleExtract() {
  const files = Array.from(dom.fileInput.files || []);
  if (files.length === 0) {
    setStatus("엑셀 파일을 먼저 선택해주세요.", true);
    return;
  }

  setBusy(true);
  setStatus("엑셀 파일을 분석 중입니다...");

  try {
    const parsedResults = await Promise.all(
      files.map(async (file) => {
        try {
          const parsed = await parseExcelFile(file, state.cycleStartDay);
          return {
            ok: true,
            fileName: String(file?.name || "").trim(),
            parsed,
          };
        } catch (error) {
          return {
            ok: false,
            fileName: String(file?.name || "").trim(),
            message: String(error?.message || "형식 오류"),
          };
        }
      }),
    );
    const parsedFiles = parsedResults
      .filter((item) => item.ok && item.parsed)
      .map((item) => item.parsed);
    const failedFiles = parsedResults
      .filter((item) => !item.ok)
      .map((item) => ({
        fileName: item.fileName || "알 수 없는 파일",
        message: item.message || "형식 오류",
      }));
    if (parsedFiles.length === 0) {
      const failedNames = failedFiles.map((item) => item.fileName).filter(Boolean).join(", ");
      throw new Error(
        failedNames
          ? `형식 오류 파일만 선택되었습니다. 오류 파일: ${failedNames}`
          : "기입 가능한 데이터가 없습니다.",
      );
    }

    state.headers = TARGET_COLS.map((col) => `${col}열`);
    state.rows = [];
    state.fileSummaries = [];
    state.periodSummaries = [];
    state.teamSummaries = [];
    state.selectedPeriod = "ALL";
    state.selectedTeam = "ALL";
    state.selectedLine = "ALL";
    state.sortKey = "date_asc";
    state.search = "";
    state.duplicateRemovedCount = 0;
    state.failedFiles = failedFiles;
    dom.searchInput.value = "";
    dom.sortSelect.value = state.sortKey;

    for (const parsed of parsedFiles) {
      if (parsed.headers.length === TARGET_COLS.length) {
        state.headers = parsed.headers;
      }
      state.rows.push(...parsed.rows);
      state.fileSummaries.push({
        fileName: parsed.fileName,
        rowCount: parsed.rows.length,
        productionRangeLabel: parsed.productionRangeLabel,
        sheetCount: parsed.sheetCount,
      });
    }

    const dedup = deduplicateRows(state.rows);
    state.rows = dedup.rows;
    state.duplicateRemovedCount = dedup.removedCount;
    state.rows.sort(compareRowsByDateAsc);
    state.dateRangeLabel = getDateRangeLabel(state.rows);

    buildPeriodSummaries();
    populatePeriodOptions();
    populateTeamOptions();
    populateLineOptions();
    refreshDerivedViews();
    renderAll();

    const failedNames = failedFiles.map((item) => item.fileName).filter(Boolean);
    const failedNotice = failedNames.length
      ? `, 형식 오류 제외 ${failedNames.length.toLocaleString("ko-KR")}개 (${failedNames.join(", ")})`
      : "";
    setStatus(
      `완료: 선택 ${files.length}개 중 ${parsedFiles.length.toLocaleString("ko-KR")}개 분석, ${state.rows.length.toLocaleString("ko-KR")}행 추출 (중복 제거 ${state.duplicateRemovedCount.toLocaleString("ko-KR")}건${failedNotice})`,
    );
    if (isEmbedMode) setEmbedDataSectionsVisible(true);
  } catch (error) {
    clearExtractedState();
    if (isEmbedMode) setEmbedDataSectionsVisible(false);
    setStatus(`오류: ${error.message}`, true);
  } finally {
    setBusy(false);
  }
}
async function parseExcelFile(file, cycleStartDay = FIXED_PERIOD_START_DAY) {
  return requireProductionParsingApi().parseExcelFile(
    getProductionParsingContext(),
    file,
    cycleStartDay,
  );
}

function deduplicateRows(rows) {
  return requireProductionParsingApi().deduplicateRows(getProductionParsingContext(), rows);
}

function normalizeValue(value) {
  return requireProductionParsingApi().normalizeValue(value);
}

function parseDateText(value) {
  return requireProductionParsingApi().parseDateText(value);
}

function getPeriodInfo(date) {
  return requireProductionParsingApi().getPeriodInfo(getProductionParsingContext(), date);
}

function formatYmd(date) {
  return requireProductionParsingApi().formatYmd(date);
}

function buildDateRangeLabel(minDate, maxDate) {
  return requireProductionParsingApi().buildDateRangeLabel(
    getProductionParsingContext(),
    minDate,
    maxDate,
  );
}

function getDateRangeLabel(rows) {
  return requireProductionParsingApi().getDateRangeLabel(getProductionParsingContext(), rows);
}

function compareRowsByFallback(a, b) {
  const teamDiff = String(a.teamKey).localeCompare(String(b.teamKey), "ko");
  if (teamDiff !== 0) return teamDiff;

  const lineDiff = String(a.lineKey).localeCompare(String(b.lineKey), "ko");
  if (lineDiff !== 0) return lineDiff;

  const fileDiff = String(a.fileName).localeCompare(String(b.fileName), "ko");
  if (fileDiff !== 0) return fileDiff;

  const sheetDiff = String(a.sheetName || "").localeCompare(String(b.sheetName || ""), "ko");
  if (sheetDiff !== 0) return sheetDiff;

  return a.rowNumber - b.rowNumber;
}

function compareRowsByDateAsc(a, b) {
  if (a.dateObj && b.dateObj) {
    const diff = a.dateObj - b.dateObj;
    if (diff !== 0) return diff;
  } else if (!a.dateObj && b.dateObj) {
    return 1;
  } else if (a.dateObj && !b.dateObj) {
    return -1;
  }
  return compareRowsByFallback(a, b);
}

function compareRowsByDateDesc(a, b) {
  if (a.dateObj && b.dateObj) {
    const diff = b.dateObj - a.dateObj;
    if (diff !== 0) return diff;
  } else if (!a.dateObj && b.dateObj) {
    return 1;
  } else if (a.dateObj && !b.dateObj) {
    return -1;
  }
  return compareRowsByFallback(a, b);
}

function compareRowsBySort(a, b, sortKey) {
  switch (sortKey) {
    case "date_desc":
      return compareRowsByDateDesc(a, b);
    case "team_asc": {
      const teamDiff = String(a.teamKey).localeCompare(String(b.teamKey), "ko");
      if (teamDiff !== 0) return teamDiff;
      return compareRowsByDateAsc(a, b);
    }
    case "line_asc": {
      const lineDiff = String(a.lineKey).localeCompare(String(b.lineKey), "ko");
      if (lineDiff !== 0) return lineDiff;
      return compareRowsByDateAsc(a, b);
    }
    case "amount_desc": {
      const aValue = parseProductionValue(a.values[PRODUCTION_VALUE_INDEX]);
      const bValue = parseProductionValue(b.values[PRODUCTION_VALUE_INDEX]);
      const aNum = aValue === null ? Number.NEGATIVE_INFINITY : aValue;
      const bNum = bValue === null ? Number.NEGATIVE_INFINITY : bValue;
      const diff = bNum - aNum;
      if (diff !== 0) return diff;
      return compareRowsByDateAsc(a, b);
    }
    case "date_asc":
    default:
      return compareRowsByDateAsc(a, b);
  }
}

function sortRows(rows) {
  return [...rows].sort((a, b) => compareRowsBySort(a, b, state.sortKey));
}
function buildPeriodSummaries() {
  const periodMap = new Map();
  for (const row of state.rows) {
    if (!periodMap.has(row.periodKey)) {
      periodMap.set(row.periodKey, {
        key: row.periodKey,
        label: row.periodLabel,
        startTime: row.periodStart ? row.periodStart.getTime() : Number.MAX_SAFE_INTEGER,
        rowCount: 0,
        sum: 0,
        numericCount: 0,
      });
    }
    const target = periodMap.get(row.periodKey);
    target.rowCount += 1;
    const numericValue = parseProductionValue(row.values[PRODUCTION_VALUE_INDEX]);
    if (numericValue !== null) {
      target.sum += numericValue;
      target.numericCount += 1;
    }
  }

  state.periodSummaries = Array.from(periodMap.values())
    .sort((a, b) => a.startTime - b.startTime)
    .map((summary) => ({
      ...summary,
      avg: summary.numericCount > 0 ? summary.sum / summary.numericCount : null,
    }));
}

function populatePeriodOptions() {
  const periodMap = new Map();
  for (const row of state.rows) {
    if (!periodMap.has(row.periodKey)) {
      periodMap.set(row.periodKey, {
        label: row.periodLabel,
        startTime: row.periodStart ? row.periodStart.getTime() : Number.MAX_SAFE_INTEGER,
      });
    }
  }

  const periods = Array.from(periodMap.entries()).sort((a, b) => a[1].startTime - b[1].startTime);
  const previousSelected = state.selectedPeriod;

  dom.periodSelect.innerHTML = "";
  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "전체";
  dom.periodSelect.appendChild(allOption);

  for (const [key, info] of periods) {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = info.label;
    dom.periodSelect.appendChild(option);
  }

  const exists = previousSelected === "ALL" || periodMap.has(previousSelected);
  state.selectedPeriod = exists ? previousSelected : "ALL";
  dom.periodSelect.value = state.selectedPeriod;
}

function populateTeamOptions() {
  const teams = Array.from(
    new Set(state.rows.map((row) => String(row.teamKey || "팀 없음"))),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const previousSelected = state.selectedTeam;
  dom.teamSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "전체 팀";
  dom.teamSelect.appendChild(allOption);

  for (const team of teams) {
    const option = document.createElement("option");
    option.value = team;
    option.textContent = team;
    dom.teamSelect.appendChild(option);
  }

  const exists = previousSelected === "ALL" || teams.includes(previousSelected);
  state.selectedTeam = exists ? previousSelected : "ALL";
  dom.teamSelect.value = state.selectedTeam;
}

function populateLineOptions() {
  const lines = Array.from(
    new Set(state.rows.map((row) => String(row.lineKey || "라인 없음"))),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const previousSelected = state.selectedLine;
  dom.lineSelect.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "ALL";
  allOption.textContent = "전체 라인";
  dom.lineSelect.appendChild(allOption);

  for (const line of lines) {
    const option = document.createElement("option");
    option.value = line;
    option.textContent = line;
    dom.lineSelect.appendChild(option);
  }

  const exists = previousSelected === "ALL" || lines.includes(previousSelected);
  state.selectedLine = exists ? previousSelected : "ALL";
  dom.lineSelect.value = state.selectedLine;
}

function matchesPeriodLineAndSearch(row) {
  const matchPeriod = state.selectedPeriod === "ALL" || row.periodKey === state.selectedPeriod;
  if (!matchPeriod) return false;

  const matchLine = state.selectedLine === "ALL" || row.lineKey === state.selectedLine;
  if (!matchLine) return false;

  if (state.search.length === 0) return true;

  return row.values
    .map((value) => String(value ?? "").toLowerCase())
    .join(" ")
    .includes(state.search);
}

function refreshTeamSummaries() {
  const rows = state.rows.filter(matchesPeriodLineAndSearch);
  const teamMap = new Map();

  for (const row of rows) {
    const key = String(row.teamKey || "팀 없음");
    if (!teamMap.has(key)) {
      teamMap.set(key, {
        team: key,
        rowCount: 0,
        sum: 0,
        numericCount: 0,
        minDate: null,
        maxDate: null,
      });
    }

    const target = teamMap.get(key);
    target.rowCount += 1;

    if (row.dateObj) {
      if (!target.minDate || row.dateObj < target.minDate) target.minDate = row.dateObj;
      if (!target.maxDate || row.dateObj > target.maxDate) target.maxDate = row.dateObj;
    }

    const numeric = parseProductionValue(row.values[PRODUCTION_VALUE_INDEX]);
    if (numeric !== null) {
      target.sum += numeric;
      target.numericCount += 1;
    }
  }

  state.teamSummaries = Array.from(teamMap.values())
    .map((summary) => ({
      ...summary,
      avg: summary.numericCount > 0 ? summary.sum / summary.numericCount : null,
      rangeLabel: buildDateRangeLabel(summary.minDate, summary.maxDate),
    }))
    .sort((a, b) => a.team.localeCompare(b.team, "ko"));
}

function refreshFilteredRows() {
  const filtered = state.rows.filter((row) => {
    if (!matchesPeriodLineAndSearch(row)) return false;
    if (state.selectedTeam !== "ALL" && row.teamKey !== state.selectedTeam) return false;
    return true;
  });
  state.filteredRows = sortRows(filtered);
}

function refreshDerivedViews() {
  refreshTeamSummaries();
  refreshFilteredRows();
}

function renderAll() {
  renderMetrics();
  renderCurrentPeriod();
  renderPeriodSummary();
  renderTeamSummary();
  renderTable();
  renderFileSummary();
  renderDownloadButtons();
}

function getSelectedPeriodText() {
  return state.selectedPeriod === "ALL"
    ? "전체"
    : dom.periodSelect.selectedOptions[0]?.textContent || "전체";
}

function getSelectedTeamText() {
  return state.selectedTeam === "ALL"
    ? "전체 팀"
    : dom.teamSelect.selectedOptions[0]?.textContent || state.selectedTeam;
}

function getSelectedLineText() {
  return state.selectedLine === "ALL"
    ? "전체 라인"
    : dom.lineSelect.selectedOptions[0]?.textContent || state.selectedLine;
}

function getSelectedSortText() {
  return dom.sortSelect.selectedOptions[0]?.textContent || "날짜 오름차순";
}

function renderMetrics() {
  const currentStats = computeProductionStats(state.filteredRows);

  dom.metricFiles.textContent = String(state.fileSummaries.length);
  dom.metricRowsAll.textContent = formatNumber(state.rows.length);
  dom.metricRowsFiltered.textContent = formatNumber(state.filteredRows.length);
  dom.metricPeriod.textContent = getSelectedPeriodText();
  dom.metricTeam.textContent = getSelectedTeamText();
  dom.metricLine.textContent = getSelectedLineText();
  dom.metricSum.textContent = formatNumber(currentStats.sum);
  dom.metricAvg.textContent = currentStats.avg === null ? "-" : formatNumber(currentStats.avg);
  dom.metricDateRange.textContent = state.dateRangeLabel;
  dom.metricDedup.textContent = formatNumber(state.duplicateRemovedCount);
}

function renderCurrentPeriod() {
  const periodText = getSelectedPeriodText();
  const teamText = getSelectedTeamText();
  const lineText = getSelectedLineText();
  const sortText = getSelectedSortText();
  dom.currentPeriodLabel.textContent = `현재 보기: ${periodText} / ${teamText} / ${lineText} / ${sortText}`;
}
function renderPeriodSummary() {
  dom.periodSummaryBody.innerHTML = "";

  if (state.periodSummaries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.colSpan = 4;
    td.textContent = "추출 실행 후 월별 요약이 표시됩니다.";
    tr.appendChild(td);
    dom.periodSummaryBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const summary of state.periodSummaries) {
    const tr = document.createElement("tr");
    if (state.selectedPeriod !== "ALL" && state.selectedPeriod === summary.key) {
      tr.classList.add("active-period");
    }

    const cells = [
      summary.label,
      formatNumber(summary.rowCount),
      formatNumber(summary.sum),
      summary.avg === null ? "-" : formatNumber(summary.avg),
    ];

    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    fragment.appendChild(tr);
  }

  dom.periodSummaryBody.appendChild(fragment);
}

function renderTeamSummary() {
  dom.teamSummaryBody.innerHTML = "";

  if (state.teamSummaries.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.colSpan = 5;
    td.textContent = "조건에 맞는 팀 요약 데이터가 없습니다.";
    tr.appendChild(td);
    dom.teamSummaryBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const summary of state.teamSummaries) {
    const tr = document.createElement("tr");
    if (state.selectedTeam !== "ALL" && state.selectedTeam === summary.team) {
      tr.classList.add("active-period");
    }

    const cells = [
      summary.team,
      formatNumber(summary.rowCount),
      summary.rangeLabel,
      formatNumber(summary.sum),
      summary.avg === null ? "-" : formatNumber(summary.avg),
    ];

    for (const value of cells) {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    }
    fragment.appendChild(tr);
  }

  dom.teamSummaryBody.appendChild(fragment);
}

function renderTable() {
  dom.tableHeader.innerHTML = "";
  dom.tableBody.innerHTML = "";

  if (state.rows.length === 0) {
    const th = document.createElement("th");
    th.textContent = "데이터 없음";
    dom.tableHeader.appendChild(th);

    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.textContent = "추출 실행 후 데이터가 표시됩니다.";
    tr.appendChild(td);
    dom.tableBody.appendChild(tr);
    return;
  }

  for (const header of state.headers) {
    const th = document.createElement("th");
    th.textContent = header;
    dom.tableHeader.appendChild(th);
  }

  if (state.filteredRows.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.className = "empty";
    td.colSpan = state.headers.length;
    td.textContent = "선택한 조건에 맞는 데이터가 없습니다.";
    tr.appendChild(td);
    dom.tableBody.appendChild(tr);
    return;
  }

  const fragment = document.createDocumentFragment();
  for (const row of state.filteredRows) {
    const tr = document.createElement("tr");
    for (const value of row.values) {
      const td = document.createElement("td");
      td.textContent = String(value ?? "");
      tr.appendChild(td);
    }
    fragment.appendChild(tr);
  }
  dom.tableBody.appendChild(fragment);
}

function renderFileSummary() {
  if (state.fileSummaries.length === 0) {
    dom.fileSummary.className = "file-summary empty";
    dom.fileSummary.textContent = "아직 처리된 파일이 없습니다.";
    return;
  }

  dom.fileSummary.className = "file-summary";
  dom.fileSummary.innerHTML = "";

  const fragment = document.createDocumentFragment();
  for (const summary of state.fileSummaries) {
    const card = document.createElement("article");
    card.className = "summary-card";

    const title = document.createElement("h3");
    title.textContent = summary.fileName;
    card.appendChild(title);

    const sheetRow = document.createElement("p");
    sheetRow.className = "summary-row";
    sheetRow.innerHTML = `<span>분석 시트</span><strong>${formatNumber(summary.sheetCount)}개</strong>`;
    card.appendChild(sheetRow);

    const periodRow = document.createElement("p");
    periodRow.className = "summary-row";
    periodRow.innerHTML = `<span>생산 기간</span><strong>${escapeHtml(summary.productionRangeLabel)}</strong>`;
    card.appendChild(periodRow);

    const countRow = document.createElement("p");
    countRow.className = "summary-row";
    countRow.innerHTML = `<span>추출 행 수</span><strong>${formatNumber(summary.rowCount)}</strong>`;
    card.appendChild(countRow);

    fragment.appendChild(card);
  }

  dom.fileSummary.appendChild(fragment);
}

function renderDownloadButtons() {
  const hasAnyData = state.rows.length > 0;
  const hasFilteredData = state.filteredRows.length > 0;
  dom.applyToKpiBtn.disabled = !hasAnyData;
  dom.downloadAllBtn.disabled = !hasAnyData;
  dom.downloadFilteredBtn.disabled = !hasFilteredData;
}

function buildKpiBridgeRows() {
  const fileMetaMap = buildSourceFileMetaMap();
  return state.rows.map((row) => ({
    date: row.values[0] ?? "",
    team: row.values[TEAM_VALUE_INDEX] ?? "",
    lineName: row.values[LINE_VALUE_INDEX] ?? "",
    productName: row.values[3] ?? "",
    amount: row.values[PRODUCTION_VALUE_INDEX] ?? "",
    sourceFileName: String(row.fileName || "").trim(),
    sourceFingerprint: String(fileMetaMap.get(String(row.fileName || "").trim())?.fingerprint || ""),
  }));
}

function buildSourceFingerprint(fileName, size, lastModified) {
  const safeName = String(fileName || "").trim().toLowerCase();
  const safeSize = Number.isFinite(Number(size)) ? Number(size) : 0;
  const safeLastModified = Number.isFinite(Number(lastModified)) ? Number(lastModified) : 0;
  if (!safeName) return "";
  return `${safeName}|${safeSize}|${safeLastModified}`;
}

function buildSourceFileMetaMap() {
  const files = Array.from(dom.fileInput?.files || []);
  const map = new Map();
  for (const file of files) {
    const fileName = String(file?.name || "").trim();
    if (!fileName) continue;
    map.set(fileName, {
      fileName,
      size: Number(file?.size) || 0,
      lastModified: Number(file?.lastModified) || 0,
      fingerprint: buildSourceFingerprint(fileName, file?.size, file?.lastModified),
    });
  }
  return map;
}

function buildSourceFilesPayload() {
  const files = Array.from(dom.fileInput?.files || []);
  return files
    .map((file) => ({
      fileName: String(file?.name || "").trim(),
      size: Number(file?.size) || 0,
      type: String(file?.type || ""),
      lastModified: Number(file?.lastModified) || 0,
      fingerprint: buildSourceFingerprint(file?.name, file?.size, file?.lastModified),
      blob: file,
    }))
    .filter((item) => item.fileName && item.blob instanceof Blob);
}

function handleApplyToKpi() {
  if (state.rows.length === 0) {
    setStatus("생산량 기입 대상이 없습니다.", true);
    return;
  }
  if (!window.parent || window.parent === window) {
    setStatus("KPI 연동 화면에서만 생산량 기입이 가능합니다.", true);
    return;
  }
  const payload = {
    type: "kpi-production-extracted",
    rows: buildKpiBridgeRows(),
    meta: {
      cycleStartDay: state.cycleStartDay,
      rowCount: state.rows.length,
      duplicateRemovedCount: state.duplicateRemovedCount,
      failedFiles: state.failedFiles.map((item) => ({
        fileName: String(item?.fileName || "").trim(),
        message: String(item?.message || "").trim(),
      })),
      sourceFolderName: "원본 엑셀",
      sourceFiles: buildSourceFilesPayload(),
      generatedAt: new Date().toISOString(),
    },
  };
  try {
    window.parent.postMessage(payload, "*");
    setStatus(`생산량 전체 교체 요청: ${formatNumber(state.rows.length)}행 전송 완료`);
  } catch (error) {
    const fallbackPayload = {
      ...payload,
      meta: {
        ...payload.meta,
        sourceFiles: [],
      },
    };
    window.parent.postMessage(fallbackPayload, "*");
    setStatus(`생산량 전체 교체 요청: ${formatNumber(state.rows.length)}행 전송 완료`);
  }
}

function handleKpiImportResultMessage(event) {
  const data = event?.data;
  if (!data || data.type !== "kpi-production-import-result") return;
  if (data.ok) {
    const addedText = formatNumber(Number(data.addedCount) || 0);
    const skippedText = formatNumber(Number(data.skippedCount) || 0);
    const failedFiles = Array.isArray(data.failedFiles)
      ? data.failedFiles
          .map((item) => {
            if (typeof item === "string") return item.trim();
            return String(item?.fileName || "").trim();
          })
          .filter(Boolean)
      : [];
    const failedNotice = failedFiles.length
      ? `, 형식 오류 제외 ${formatNumber(failedFiles.length)}개 (${failedFiles.join(", ")})`
      : "";
    setStatus(`생산량 기입 완료: 기존 생산량 비우고 ${addedText}건 기입, 중복 제외 ${skippedText}건${failedNotice}`);
    return;
  }
  const message = data.message ? String(data.message) : "생산량 기입에 실패했습니다.";
  setStatus(message, true);
}

function initializeStoredExportPanel() {
  return requireProductionExportActionsApi().initializeStoredExportPanel(
    getProductionExportActionsContext(),
  );
}

async function refreshStoredRowsFromParent(showNotice = true) {
  return requireProductionExportActionsApi().refreshStoredRowsFromParent(
    getProductionExportActionsContext(),
    showNotice,
  );
}

async function handleDownloadStoredRows() {
  return requireProductionExportActionsApi().handleDownloadStoredRows(
    getProductionExportActionsContext(),
  );
}

function downloadFilteredRows() {
  return requireProductionExportActionsApi().downloadFilteredRows(
    getProductionExportActionsContext(),
  );
}

function downloadAllRows() {
  return requireProductionExportActionsApi().downloadAllRows(
    getProductionExportActionsContext(),
  );
}

function computeProductionStats(rows) {
  let sum = 0;
  let numericCount = 0;
  for (const row of rows) {
    const numeric = parseProductionValue(row.values[PRODUCTION_VALUE_INDEX]);
    if (numeric === null) continue;
    sum += numeric;
    numericCount += 1;
  }
  return {
    sum,
    avg: numericCount > 0 ? sum / numericCount : null,
    numericCount,
  };
}

function parseProductionValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (text === "") return null;

  const cleaned = text.replaceAll(",", "");
  const match = cleaned.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;

  const numeric = Number(match[0]);
  return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "-";
  if (Number.isInteger(value)) return value.toLocaleString("ko-KR");

  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) return rounded.toLocaleString("ko-KR");

  return rounded.toLocaleString("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearExtractedState() {
  state.headers = TARGET_COLS.map((col) => `${col}열`);
  state.rows = [];
  state.filteredRows = [];
  state.fileSummaries = [];
  state.periodSummaries = [];
  state.teamSummaries = [];
  state.selectedPeriod = "ALL";
  state.selectedTeam = "ALL";
  state.selectedLine = "ALL";
  state.sortKey = "date_asc";
  state.search = "";
  state.dateRangeLabel = "-";
  state.duplicateRemovedCount = 0;
  state.failedFiles = [];

  if (dom.searchInput) dom.searchInput.value = "";
  if (dom.sortSelect) dom.sortSelect.value = "date_asc";

  populatePeriodOptions();
  populateTeamOptions();
  populateLineOptions();
  refreshDerivedViews();
  renderAll();
  if (isEmbedMode) setEmbedDataSectionsVisible(false);
}
