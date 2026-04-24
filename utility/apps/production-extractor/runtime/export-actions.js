"use strict";

(function attachProductionExtractorExportActions(globalScope) {
  function normalizeStoredRowsPayload(context, rows) {
    const list = Array.isArray(rows) ? rows : [];
    const dedupe = new Set();
    const normalizedRows = [];

    for (const row of list) {
      const parsedDate = context.parseDateText(row?.date);
      const amount = context.parseProductionValue(row?.amount ?? row?.production ?? row?.value);
      const team = String(row?.team ?? "").trim();
      const lineName = String(row?.lineName ?? row?.line ?? "").trim();
      const productName = String(row?.productName ?? row?.product ?? row?.itemName ?? "").trim();
      if (!parsedDate || amount === null || !team) continue;
      const date = context.formatYmd(parsedDate);
      const key = [
        date,
        team.toLowerCase(),
        lineName.toLowerCase(),
        productName.toLowerCase(),
        String(amount),
      ].join("|");
      if (dedupe.has(key)) continue;
      dedupe.add(key);
      normalizedRows.push({
        date,
        team,
        lineName,
        productName,
        amount,
      });
    }

    normalizedRows.sort((a, b) => {
      const dateDiff = String(a.date).localeCompare(String(b.date), "ko");
      if (dateDiff !== 0) return dateDiff;
      const teamDiff = String(a.team).localeCompare(String(b.team), "ko");
      if (teamDiff !== 0) return teamDiff;
      const lineDiff = String(a.lineName).localeCompare(String(b.lineName), "ko");
      if (lineDiff !== 0) return lineDiff;
      return String(a.productName).localeCompare(String(b.productName), "ko");
    });

    return normalizedRows;
  }

  function normalizeStoredTeamList(teams, rows) {
    const set = new Set();
    (Array.isArray(teams) ? teams : []).forEach((team) => {
      const value = String(team || "").trim();
      if (value) set.add(value);
    });
    (Array.isArray(rows) ? rows : []).forEach((row) => {
      const value = String(row?.team || "").trim();
      if (value) set.add(value);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, "ko"));
  }

  function populateStoredTeamOptions(context) {
    if (!context.dom.storedTeamSelect) return;
    const previous = String(context.dom.storedTeamSelect.value || "ALL");
    context.dom.storedTeamSelect.innerHTML = "";

    const allOption = context.document.createElement("option");
    allOption.value = "ALL";
    allOption.textContent = "전체 팀";
    context.dom.storedTeamSelect.appendChild(allOption);

    for (const team of context.state.storedTeams) {
      const option = context.document.createElement("option");
      option.value = team;
      option.textContent = team;
      context.dom.storedTeamSelect.appendChild(option);
    }

    const exists = previous === "ALL" || context.state.storedTeams.includes(previous);
    context.dom.storedTeamSelect.value = exists ? previous : "ALL";
  }

  function applyStoredDateRangeDefaults(context) {
    if (!context.dom.storedStartDate || !context.dom.storedEndDate) return;
    if (!context.state.storedRows.length) {
      if (!context.dom.storedStartDate.value) context.dom.storedStartDate.value = "";
      if (!context.dom.storedEndDate.value) context.dom.storedEndDate.value = "";
      return;
    }

    const dates = context.state.storedRows.map((row) => String(row.date || "")).filter(Boolean);
    if (!dates.length) return;
    const minDate = dates[0];
    const maxDate = dates[dates.length - 1];
    if (!context.dom.storedStartDate.value) context.dom.storedStartDate.value = minDate;
    if (!context.dom.storedEndDate.value) context.dom.storedEndDate.value = maxDate;
  }

  function sanitizeFileNameToken(value, fallback = "전체팀") {
    const raw = String(value || "").trim() || fallback;
    return raw.replace(/[\\/:*?"<>|]/g, "_");
  }

  function requestStoredRowsViaBridge(context) {
    return new Promise((resolve, reject) => {
      if (!context.window.parent || context.window.parent === context.window) {
        reject(new Error("KPI 연동 화면에서만 조회할 수 있습니다."));
        return;
      }

      const requestId = `kpi_stored_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const timeout = globalScope.setTimeout(() => {
        cleanup();
        reject(new Error("기입데이터 응답 시간이 초과되었습니다."));
      }, 10000);

      const cleanup = () => {
        globalScope.clearTimeout(timeout);
        context.window.removeEventListener("message", onMessage);
      };

      const onMessage = (event) => {
        const data = event?.data;
        if (!data || data.type !== "kpi-production-stored-data-response") return;
        if (String(data.requestId || "") !== requestId) return;
        cleanup();
        if (!data.ok) {
          reject(new Error(String(data.message || "기입데이터 조회 실패")));
          return;
        }
        resolve({
          rows: Array.isArray(data.rows) ? data.rows : [],
          teams: Array.isArray(data.teams) ? data.teams : [],
        });
      };

      context.window.addEventListener("message", onMessage);
      try {
        context.window.parent.postMessage(
          {
            type: "kpi-production-stored-data-request",
            requestId,
          },
          "*",
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  async function refreshStoredRowsFromParent(context, showNotice = true) {
    try {
      const payload = await requestStoredRowsViaBridge(context);
      context.state.storedRows = normalizeStoredRowsPayload(context, payload.rows);
      context.state.storedTeams = normalizeStoredTeamList(payload.teams, context.state.storedRows);
      populateStoredTeamOptions(context);
      applyStoredDateRangeDefaults(context);
      if (showNotice) {
        context.setStatus(`기입데이터 갱신: ${context.formatNumber(context.state.storedRows.length)}건`);
      }
    } catch (error) {
      if (showNotice) {
        context.setStatus(`기입데이터 조회 실패: ${error.message || "알 수 없는 오류"}`, true);
      }
    }
  }

  function initializeStoredExportPanel(context) {
    if (!context.dom.storedSection) return;
    if (!context.window.parent || context.window.parent === context.window) {
      if (context.dom.downloadStoredBtn) context.dom.downloadStoredBtn.disabled = true;
      if (context.dom.refreshStoredBtn) context.dom.refreshStoredBtn.disabled = true;
      return;
    }
    refreshStoredRowsFromParent(context, false);
  }

  function exportStoredRowsToXlsx(context, rows, fileName, options = {}) {
    const resultAoa = [["생산일자", "팀", "라인명", "품명", "생산량"]];
    for (const row of rows) {
      resultAoa.push([
        String(row.date || ""),
        String(row.team || ""),
        String(row.lineName || ""),
        String(row.productName || ""),
        Number(row.amount) || 0,
      ]);
    }

    const resultSheet = context.XLSX.utils.aoa_to_sheet(resultAoa);
    resultSheet["!cols"] = [
      { wch: 12 },
      { wch: 14 },
      { wch: 20 },
      { wch: 28 },
      { wch: 14 },
    ];

    const sum = rows.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    const summarySheet = context.XLSX.utils.aoa_to_sheet([
      ["생성일시", new Date().toLocaleString("ko-KR")],
      ["시작일", String(options.startDate || "")],
      ["종료일", String(options.endDate || "")],
      ["팀", String(options.teamLabel || "전체팀")],
      ["건수", rows.length],
      ["생산량 합계", sum],
    ]);

    const workbook = context.XLSX.utils.book_new();
    context.XLSX.utils.book_append_sheet(workbook, resultSheet, "기입데이터");
    context.XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");
    context.XLSX.writeFile(workbook, fileName);
  }

  async function handleDownloadStoredRows(context) {
    if (!context.window.parent || context.window.parent === context.window) {
      context.setStatus("KPI 연동 화면에서만 기입데이터 추출이 가능합니다.", true);
      return;
    }
    if (!context.dom.downloadStoredBtn) return;

    context.dom.downloadStoredBtn.disabled = true;
    if (context.dom.refreshStoredBtn) context.dom.refreshStoredBtn.disabled = true;

    try {
      const payload = await requestStoredRowsViaBridge(context);
      context.state.storedRows = normalizeStoredRowsPayload(context, payload.rows);
      context.state.storedTeams = normalizeStoredTeamList(payload.teams, context.state.storedRows);
      populateStoredTeamOptions(context);
      applyStoredDateRangeDefaults(context);

      if (!context.state.storedRows.length) {
        context.setStatus("기입된 생산량 데이터가 없습니다.", true);
        return;
      }

      const startDate = String(context.dom.storedStartDate?.value || "").trim();
      const endDate = String(context.dom.storedEndDate?.value || "").trim();
      const selectedTeam = String(context.dom.storedTeamSelect?.value || "ALL");
      const parsedStart = context.parseDateText(startDate);
      const parsedEnd = context.parseDateText(endDate);
      if (!parsedStart || !parsedEnd) {
        context.setStatus("시작일/종료일을 입력해주세요.", true);
        return;
      }

      const safeStart = context.formatYmd(parsedStart);
      const safeEnd = context.formatYmd(parsedEnd);
      if (safeStart > safeEnd) {
        context.setStatus("시작일은 종료일보다 늦을 수 없습니다.", true);
        return;
      }

      const filteredRows = context.state.storedRows.filter((row) => {
        const date = String(row.date || "");
        if (!date || date < safeStart || date > safeEnd) return false;
        if (selectedTeam !== "ALL" && String(row.team || "") !== selectedTeam) return false;
        return true;
      });
      if (!filteredRows.length) {
        context.setStatus("선택한 기간/팀 조건에 맞는 기입데이터가 없습니다.", true);
        return;
      }

      const teamLabel = selectedTeam === "ALL" ? "전체팀" : selectedTeam;
      const fileName = `생산량기입데이터_${safeStart.replaceAll("-", "")}_${safeEnd.replaceAll("-", "")}_${sanitizeFileNameToken(teamLabel)}.xlsx`;
      exportStoredRowsToXlsx(context, filteredRows, fileName, {
        startDate: safeStart,
        endDate: safeEnd,
        teamLabel,
      });
      context.setStatus(`기입데이터 엑셀 추출 완료: ${fileName}`);
    } catch (error) {
      context.setStatus(`기입데이터 추출 실패: ${error.message || "알 수 없는 오류"}`, true);
    } finally {
      context.dom.downloadStoredBtn.disabled = false;
      if (context.dom.refreshStoredBtn) context.dom.refreshStoredBtn.disabled = false;
    }
  }

  function exportRowsToXlsx(context, rows, fileName) {
    const aoa = [];
    aoa.push(["추출 기준", "A/B/C/E/F 열, 날짜 원본 그대로 사용, 월 기준 1일~말일 분류"]);
    aoa.push(["선택 월", context.getSelectedPeriodText()]);
    aoa.push(["선택 팀", context.getSelectedTeamText()]);
    aoa.push(["선택 라인", context.getSelectedLineText()]);
    aoa.push(["정렬", context.getSelectedSortText()]);
    aoa.push(["생산 기간", context.getDateRangeLabel(rows)]);
    aoa.push(["중복 제거", `${context.formatNumber(context.state.duplicateRemovedCount)}건`]);
    aoa.push([]);
    aoa.push(context.state.headers);

    for (const row of rows) {
      aoa.push(row.values.map((value) => context.normalizeValue(value)));
    }

    const resultSheet = context.XLSX.utils.aoa_to_sheet(aoa);
    resultSheet["!cols"] = context.state.headers.map((header, index) => {
      const base = String(header).length + 6;
      const longCol = index === context.PRODUCTION_VALUE_INDEX ? 30 : 14;
      return { wch: Math.max(base, longCol) };
    });

    const stats = context.computeProductionStats(rows);
    const summarySheet = context.XLSX.utils.aoa_to_sheet([
      ["생성일시", new Date().toLocaleString("ko-KR")],
      ["행 수", rows.length],
      ["생산 기간", context.getDateRangeLabel(rows)],
      ["중복 제거", context.state.duplicateRemovedCount],
      ["생산량 합계", stats.sum],
      ["생산량 평균", stats.avg === null ? "" : stats.avg],
    ]);

    const monthSummaryAoa = [["월", "데이터 행", "생산량 합계", "생산량 평균"]];
    for (const summary of context.state.periodSummaries) {
      monthSummaryAoa.push([
        summary.label,
        summary.rowCount,
        summary.sum,
        summary.avg === null ? "" : summary.avg,
      ]);
    }
    const monthSummarySheet = context.XLSX.utils.aoa_to_sheet(monthSummaryAoa);

    const teamSummaryAoa = [["팀", "데이터 행", "생산 기간", "생산량 합계", "생산량 평균"]];
    for (const summary of context.state.teamSummaries) {
      teamSummaryAoa.push([
        summary.team,
        summary.rowCount,
        summary.rangeLabel,
        summary.sum,
        summary.avg === null ? "" : summary.avg,
      ]);
    }
    const teamSummarySheet = context.XLSX.utils.aoa_to_sheet(teamSummaryAoa);

    const workbook = context.XLSX.utils.book_new();
    context.XLSX.utils.book_append_sheet(workbook, resultSheet, "추출결과");
    context.XLSX.utils.book_append_sheet(workbook, summarySheet, "요약");
    context.XLSX.utils.book_append_sheet(workbook, monthSummarySheet, "월별요약");
    context.XLSX.utils.book_append_sheet(workbook, teamSummarySheet, "팀별요약");
    context.XLSX.writeFile(workbook, fileName);

    context.setStatus(`다운로드 완료: ${fileName}`);
  }

  function downloadFilteredRows(context) {
    if (context.state.filteredRows.length === 0) {
      context.setStatus("다운로드할 데이터가 없습니다.", true);
      return;
    }

    const safePeriod = context.getSelectedPeriodText().replace(/[\\/:*?"<>|]/g, "_");
    const safeTeam = context.getSelectedTeamText().replace(/[\\/:*?"<>|]/g, "_");
    const safeLine = context.getSelectedLineText().replace(/[\\/:*?"<>|]/g, "_");
    exportRowsToXlsx(context, context.state.filteredRows, `생산량추출_${safePeriod}_${safeTeam}_${safeLine}.xlsx`);
  }

  function downloadAllRows(context) {
    if (context.state.rows.length === 0) {
      context.setStatus("다운로드할 데이터가 없습니다.", true);
      return;
    }

    exportRowsToXlsx(context, context.state.rows, "생산량추출_전체.xlsx");
  }

  globalScope.KPIProductionExtractorExportActions = {
    initializeStoredExportPanel,
    refreshStoredRowsFromParent,
    handleDownloadStoredRows,
    downloadFilteredRows,
    downloadAllRows,
    normalizeStoredRowsPayload,
    normalizeStoredTeamList,
  };
})(window);
