(function registerUtilReportSheetPanelPreview(globalScope) {
    if (globalScope.KPIUtilReportSheetPanelPreview) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.panel.preview.js');
    }

    const utilReportSheetControls = globalScope.KPIUtilReportSheetControls;
    if (!utilReportSheetControls) {
        throw new Error('KPIUtilReportSheetControls must load before KPI.util.report.sheet.panel.preview.js');
    }

    const utilReportSheetPanelRuntime = globalScope.KPIUtilReportSheetPanelRuntime;
    if (!utilReportSheetPanelRuntime) {
        throw new Error('KPIUtilReportSheetPanelRuntime must load before KPI.util.report.sheet.panel.preview.js');
    }

    const {
        UTIL_SHEET_DATASET_SPECS,
        UtilSheetReportState,
        UtilSheetReportMonthState,
        UtilSheetCompareState
    } = utilReportSheetConfig;

    const {
        buildUtilSheetMonthOptionHtml
    } = utilReportSheetControls;

    const {
        normalizeUtilSheetType,
        resolveUtilSheetReportDatasetKey,
        normalizeUtilSheetCompareKey,
        pruneUtilSheetDatasetToggles,
        syncUtilSheetPanelChrome,
        syncUtilSheetTypeButtons,
        syncUtilSheetDatasetButtons
    } = utilReportSheetPanelRuntime;

    const runtime = {
        escapeUtilSheetHtml: null,
        buildUtilSheetMonthBounds: null,
        buildUtilReportMonthlyRows: null,
        isUtilSheetSettledRow: null,
        summarizeUtilSheetRows: null,
        formatUtilReportMonthLong: null,
        parseUtilMonthValue: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetPanelPreview;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function buildMonthBounds(datasetKey) {
        if (typeof runtime.buildUtilSheetMonthBounds === 'function') {
            return runtime.buildUtilSheetMonthBounds(datasetKey);
        }
        return null;
    }

    function buildMonthlyRows(state) {
        if (typeof runtime.buildUtilReportMonthlyRows === 'function') {
            return runtime.buildUtilReportMonthlyRows(state);
        }
        return null;
    }

    function isSettledRow(row, spec) {
        if (typeof runtime.isUtilSheetSettledRow === 'function') {
            return runtime.isUtilSheetSettledRow(row, spec);
        }
        return Boolean(row && spec);
    }

    function summarizeRows(rows, spec) {
        if (typeof runtime.summarizeUtilSheetRows === 'function') {
            return runtime.summarizeUtilSheetRows(rows, spec);
        }
        return {
            usage: 0,
            cost: 0,
            production: 0,
            unit: null
        };
    }

    function formatMonthLong(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthLong === 'function') {
            return runtime.formatUtilReportMonthLong(monthKey);
        }
        return String(monthKey || '');
    }

    function parseMonthValue(monthKey = '') {
        if (typeof runtime.parseUtilMonthValue === 'function') {
            return runtime.parseUtilMonthValue(monthKey);
        }
        const match = String(monthKey || '').trim().match(/^(\d{4})-(\d{2})$/);
        if (!match) return null;
        const year = Number(match[1]);
        const month = Number(match[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
        return { year, month, value: `${match[1]}-${match[2]}` };
    }

    function buildUtilSheetDatasetResult(datasetKey, selectedMonthKey = '') {
        const spec = UTIL_SHEET_DATASET_SPECS[datasetKey];
        if (!spec) {
            return { hasData: false, monthOptions: [], activeMonthKey: '' };
        }
        const bounds = buildMonthBounds(datasetKey);
        if (!bounds) return { hasData: false, monthOptions: [], activeMonthKey: '' };

        const baseState = {
            from: bounds.from,
            to: bounds.to,
            electricTeam: 'all',
            gasTeam: 'all',
            wasteTeam: 'all',
            productionTeam: 'all',
            categoryKey: 'cost',
            selectedScopeKeys: [spec.scopeKey]
        };
        const fullResult = buildMonthlyRows(baseState);
        const fullRows = Array.isArray(fullResult?.rows) ? fullResult.rows : [];
        const monthOptions = fullRows
            .filter(row => isSettledRow(row, spec))
            .map(row => ({
                value: row.monthKey,
                label: formatMonthLong(row.monthKey)
            }));
        if (!monthOptions.length) {
            return { hasData: false, bounds, monthOptions: [], activeMonthKey: '' };
        }

        const allowedMonthSet = new Set(monthOptions.map(item => item.value));
        const activeMonthKey = allowedMonthSet.has(selectedMonthKey)
            ? selectedMonthKey
            : monthOptions[monthOptions.length - 1].value;
        const result = buildMonthlyRows({
            ...baseState,
            to: activeMonthKey
        });
        const rows = Array.isArray(result?.rows) ? result.rows : [];
        if (!rows.length) return { hasData: false, bounds, monthOptions, activeMonthKey };

        const latestRow = rows.find(row => row.monthKey === activeMonthKey) || rows[rows.length - 1] || null;
        const latestIndex = latestRow ? rows.findIndex(row => row.monthKey === latestRow.monthKey) : -1;
        const prevMonthRow = latestIndex > 0 ? rows[latestIndex - 1] : null;
        const prevYearRow = latestRow
            ? rows.find(row => row.year === latestRow.year - 1 && row.month === latestRow.month) || null
            : null;
        const currentYearRows = latestRow
            ? rows.filter(row => row.year === latestRow.year && row.month <= latestRow.month)
            : [];
        const previousYearRows = latestRow
            ? rows.filter(row => row.year === latestRow.year - 1 && row.month <= latestRow.month)
            : [];
        const currentYearSummary = summarizeRows(currentYearRows, spec);
        const previousYearSummary = summarizeRows(previousYearRows, spec);
        const recentRows = latestIndex >= 0
            ? rows.slice(Math.max(0, latestIndex - 5), latestIndex + 1)
            : rows.slice(-6);
        const cutoffParsed = parseMonthValue(bounds.to);
        const matrixMonths = cutoffParsed
            ? Array.from({ length: cutoffParsed.month }, (_, index) => index + 1)
            : [1, 2];
        const matrixYears = Array.from(new Set(rows.map(row => row.year))).sort((a, b) => a - b);
        const matrixRows = matrixYears.map(year => ({
            year,
            cells: matrixMonths.map(month => rows.find(row => row.year === year && row.month === month) || null)
        }));

        const latestUsage = Number.isFinite(latestRow?.[spec.usageKey]) ? latestRow[spec.usageKey] : null;
        const latestCost = Number.isFinite(latestRow?.[spec.costKey]) ? latestRow[spec.costKey] : null;
        const latestUnit = Number.isFinite(latestRow?.[spec.unitKey]) ? latestRow[spec.unitKey] : null;
        const latestProduction = Number.isFinite(latestRow?.production) ? latestRow.production : null;
        const prevMonthUsage = Number.isFinite(prevMonthRow?.[spec.usageKey]) ? prevMonthRow[spec.usageKey] : null;
        const prevMonthCost = Number.isFinite(prevMonthRow?.[spec.costKey]) ? prevMonthRow[spec.costKey] : null;
        const prevMonthProduction = Number.isFinite(prevMonthRow?.production) ? prevMonthRow.production : null;
        const prevMonthUnit = Number.isFinite(prevMonthRow?.[spec.unitKey]) ? prevMonthRow[spec.unitKey] : null;
        const prevYearUsage = Number.isFinite(prevYearRow?.[spec.usageKey]) ? prevYearRow[spec.usageKey] : null;
        const prevYearCost = Number.isFinite(prevYearRow?.[spec.costKey]) ? prevYearRow[spec.costKey] : null;
        const prevYearProduction = Number.isFinite(prevYearRow?.production) ? prevYearRow.production : null;
        const prevYearUnit = Number.isFinite(prevYearRow?.[spec.unitKey]) ? prevYearRow[spec.unitKey] : null;

        return {
            hasData: true,
            spec,
            bounds,
            rangeLabel: result?.rangeLabel || '-',
            monthOptions,
            activeMonthKey,
            rows,
            latestRow,
            prevMonthRow,
            prevYearRow,
            recentRows,
            currentYearSummary,
            previousYearSummary,
            matrixRows,
            matrixMonths,
            latestUsage,
            latestCost,
            latestUnit,
            latestProduction,
            latestMonthLabel: latestRow ? formatMonthLong(latestRow.monthKey) : '-',
            deltaUsageVsPrevMonth: Number.isFinite(latestUsage) && Number.isFinite(prevMonthUsage) ? latestUsage - prevMonthUsage : null,
            deltaCostVsPrevMonth: Number.isFinite(latestCost) && Number.isFinite(prevMonthCost) ? latestCost - prevMonthCost : null,
            deltaProductionVsPrevMonth: Number.isFinite(latestProduction) && Number.isFinite(prevMonthProduction) ? latestProduction - prevMonthProduction : null,
            deltaUnitVsPrevMonth: Number.isFinite(latestUnit) && Number.isFinite(prevMonthUnit) ? latestUnit - prevMonthUnit : null,
            deltaUsageVsPrevYear: Number.isFinite(latestUsage) && Number.isFinite(prevYearUsage) ? latestUsage - prevYearUsage : null,
            deltaCostVsPrevYear: Number.isFinite(latestCost) && Number.isFinite(prevYearCost) ? latestCost - prevYearCost : null,
            deltaProductionVsPrevYear: Number.isFinite(latestProduction) && Number.isFinite(prevYearProduction) ? latestProduction - prevYearProduction : null,
            deltaUnitVsPrevYear: Number.isFinite(latestUnit) && Number.isFinite(prevYearUnit) ? latestUnit - prevYearUnit : null
        };
    }

    function buildUtilSheetPreviewModel(sheetType, datasetKey, selectedMonthKey = '') {
        const result = buildUtilSheetDatasetResult(datasetKey, selectedMonthKey);
        void sheetType;
        if (!result.hasData) {
            return {
                hasData: false,
                note: '표시 가능한 월간 데이터가 없습니다.',
                previewItems: [],
                result
            };
        }

        return {
            hasData: true,
            note: '',
            previewItems: [],
            result
        };
    }

    function renderUtilSheetPanel(panel) {
        if (!panel) return;
        const sheetType = normalizeUtilSheetType(panel.dataset.sheetType);
        const datasetKey = resolveUtilSheetReportDatasetKey(sheetType, panel.dataset.datasetKey || UtilSheetReportState[sheetType] || 'gas');
        const selectedMonthKey = String(panel.dataset.monthKey || UtilSheetReportMonthState[sheetType] || '').trim();
        const compareKey = normalizeUtilSheetCompareKey(panel.dataset.compareKey || UtilSheetCompareState[sheetType] || 'month');
        const model = buildUtilSheetPreviewModel(sheetType, datasetKey, selectedMonthKey);
        const datasetResult = model.result || { monthOptions: [], activeMonthKey: '' };
        const previewEl = panel.querySelector('[data-role="util-sheet-preview"]');
        const noteEl = panel.querySelector('[data-role="util-sheet-note"]');
        const monthSelect = panel.querySelector('[data-role="util-sheet-month"]');
        panel.dataset.sheetType = sheetType;
        panel.dataset.datasetKey = datasetKey;
        panel.dataset.compareKey = compareKey;
        UtilSheetReportState[sheetType] = datasetKey;
        pruneUtilSheetDatasetToggles(panel);
        syncUtilSheetPanelChrome(panel, sheetType, datasetKey);
        syncUtilSheetTypeButtons(panel, '[data-role="util-sheet-type-select"]', sheetType);
        syncUtilSheetDatasetButtons(panel, '[data-role="util-sheet-select"]', datasetKey, sheetType);

        if (monthSelect) {
            const monthOptions = Array.isArray(datasetResult.monthOptions) ? datasetResult.monthOptions : [];
            monthSelect.innerHTML = buildUtilSheetMonthOptionHtml(monthOptions, datasetResult.activeMonthKey);
            monthSelect.disabled = !monthOptions.length;
            if (datasetResult.activeMonthKey && monthOptions.some(item => item.value === datasetResult.activeMonthKey)) {
                monthSelect.value = datasetResult.activeMonthKey;
                panel.dataset.monthKey = datasetResult.activeMonthKey;
                UtilSheetReportMonthState[sheetType] = datasetResult.activeMonthKey;
            } else {
                panel.dataset.monthKey = '';
                UtilSheetReportMonthState[sheetType] = '';
            }
        }

        if (previewEl) {
            previewEl.innerHTML = '';
            previewEl.hidden = true;
        }
        if (noteEl) {
            noteEl.textContent = '';
            noteEl.hidden = true;
        }
        if (!model.hasData) {
            if (previewEl) {
                previewEl.innerHTML = '<div class="util-report-kpi"><div class="util-report-kpi-label">안내</div><div class="util-report-kpi-value">데이터 준비 중</div></div>';
                previewEl.hidden = false;
            }
            if (noteEl) {
                const noteText = String(model.note || '').trim();
                noteEl.textContent = noteText;
                noteEl.hidden = !noteText;
            }
            return;
        }

        if (previewEl) {
            previewEl.innerHTML = model.previewItems.map(item => `
                <div class="util-report-kpi" data-tone="${escapeHtml(item.tone || 'neutral')}">
                    <div class="util-report-kpi-head">
                        <span class="util-report-kpi-icon" aria-hidden="true"><i class="fa-solid ${escapeHtml(item.icon || 'fa-circle')}"></i></span>
                        <div class="util-report-kpi-label">${escapeHtml(item.label)}</div>
                    </div>
                    <div class="util-report-kpi-value">${escapeHtml(item.value)}</div>
                    <div class="util-sheet-kpi-sub">${escapeHtml(item.sub || '')}</div>
                </div>
            `).join('');
            previewEl.hidden = !model.previewItems.length;
        }
        if (noteEl) {
            const noteText = String(model.note || '').trim();
            noteEl.textContent = noteText;
            noteEl.hidden = !noteText;
        }
    }

    globalScope.KPIUtilReportSheetPanelPreview = {
        setRuntimeAdapters,
        buildUtilSheetDatasetResult,
        buildUtilSheetPreviewModel,
        renderUtilSheetPanel
    };
})(window);
