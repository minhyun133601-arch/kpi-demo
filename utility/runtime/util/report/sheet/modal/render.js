(function registerUtilReportSheetModalRender(globalScope) {
    if (globalScope.KPIUtilReportSheetModalRender) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.modal-render.js');
    }

    const {
        UTIL_SHEET_DATASET_SPECS,
        UtilSheetReportState,
        UtilSheetReportMonthState,
        UtilSheetCompareState,
        UtilSheetMeterState,
        UtilSheetRuntimeState,
        UtilSheetAnalysisState
    } = utilReportSheetConfig;

    const runtime = {
        normalizeUtilSheetType: null,
        resolveUtilSheetReportDatasetKey: null,
        getUtilSheetPresentation: null,
        normalizeUtilSheetCompareKey: null,
        normalizeUtilGasMeterProductionKey: null,
        normalizeUtilGasAnalysisCategoryKey: null,
        normalizeUtilElectricMeterTeamKey: null,
        normalizeUtilElectricAnalysisTeamKey: null,
        normalizeUtilElectricMeterViewKey: null,
        buildUtilSheetDatasetResult: null,
        pruneUtilSheetDatasetToggles: null,
        isUtilSheetCustomAnalysisDataset: null,
        syncUtilSheetTypeButtons: null,
        syncUtilSheetDatasetButtons: null,
        syncUtilSheetCompareButtons: null,
        escapeUtilSheetHtml: null,
        syncUtilSheetAnalysisChartPopup: null,
        syncUtilSheetDetachedReportWindow: null,
        syncUtilSheetReportWindowState: null,
        ensureUtilElectricReportDataSync: null,
        ensureUtilGasReportDataSync: null,
        ensureUtilGasMeteringStore: null,
        ensureUtilElectricMeteringStore: null,
        getUtilSheetDetachedReportWindow: null,
        getUtilElectricUtilitySnapshot: null,
        hasUtilElectricMeteringStore: null,
        buildUtilGasAnalysisModel: null,
        normalizeUtilGasAnalysisFullscreenChartKey: null,
        getUtilGasAnalysisInlineRatioTableKey: null,
        buildUtilGasAnalysisBodyHtmlV2: null,
        buildUtilSheetMemoSectionHtml: null,
        buildUtilSheetCompareMeta: null,
        buildUtilGasMeterComparisonModel: null,
        resolveUtilSheetMemoItems: null,
        bindUtilSheetAnalysisChartDragScroll: null,
        bindUtilSheetAnalysisInlineTableDrag: null,
        buildUtilElectricAnalysisModel: null,
        buildUtilElectricAnalysisBodyHtmlV2: null,
        buildUtilElectricMeterComparisonModel: null,
        buildUtilElectricMeterTeamDatasetResult: null,
        buildUtilGasMeterSummaryItems: null,
        buildUtilElectricMeterSummaryItems: null,
        buildUtilSheetBadgesHtml: null,
        buildUtilElectricMeterSummaryBlockHtml: null,
        buildUtilGasMeterSummaryBlockHtml: null,
        buildUtilSheetStatsHtml: null,
        buildUtilGasMeterComparisonSectionHtml: null,
        buildUtilElectricMeterComparisonSectionHtml: null,
        buildUtilSheetMatrixHtml: null,
        relocateUtilGasGuidanceNote: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetModalRender;
    }

    function getDocument() {
        return globalScope.document || null;
    }

    function normalizeSheetType(sheetType = 'meter') {
        if (typeof runtime.normalizeUtilSheetType === 'function') {
            return runtime.normalizeUtilSheetType(sheetType);
        }
        return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    }

    function resolveDatasetKey(sheetType, datasetKey = '') {
        if (typeof runtime.resolveUtilSheetReportDatasetKey === 'function') {
            return runtime.resolveUtilSheetReportDatasetKey(sheetType, datasetKey);
        }
        return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    }

    function normalizeCompareKey(compareKey = 'month') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function normalizeGasMeterProductionKey(productionKey = 'combined') {
        if (typeof runtime.normalizeUtilGasMeterProductionKey === 'function') {
            return runtime.normalizeUtilGasMeterProductionKey(productionKey);
        }
        return String(productionKey || 'combined').trim() || 'combined';
    }

    function normalizeGasAnalysisCategoryKey(categoryKey = 'plantA') {
        if (typeof runtime.normalizeUtilGasAnalysisCategoryKey === 'function') {
            return runtime.normalizeUtilGasAnalysisCategoryKey(categoryKey);
        }
        return String(categoryKey || 'plantA').trim() || 'plantA';
    }

    function normalizeElectricMeterTeamKey(teamKey = 'combined') {
        if (typeof runtime.normalizeUtilElectricMeterTeamKey === 'function') {
            return runtime.normalizeUtilElectricMeterTeamKey(teamKey);
        }
        return String(teamKey || 'combined').trim() || 'combined';
    }

    function normalizeElectricAnalysisTeamKey(teamKey = 'combined') {
        if (typeof runtime.normalizeUtilElectricAnalysisTeamKey === 'function') {
            return runtime.normalizeUtilElectricAnalysisTeamKey(teamKey);
        }
        return String(teamKey || 'combined').trim() || 'combined';
    }

    function normalizeElectricMeterViewKey(viewKey = 'meter') {
        if (typeof runtime.normalizeUtilElectricMeterViewKey === 'function') {
            return runtime.normalizeUtilElectricMeterViewKey(viewKey);
        }
        return String(viewKey || 'meter').trim() || 'meter';
    }

    function isCustomAnalysisDataset(datasetKey = '') {
        if (typeof runtime.isUtilSheetCustomAnalysisDataset === 'function') {
            return runtime.isUtilSheetCustomAnalysisDataset(datasetKey);
        }
        return false;
    }

    function getDetachedWindow() {
        if (typeof runtime.getUtilSheetDetachedReportWindow === 'function') {
            return runtime.getUtilSheetDetachedReportWindow();
        }
        return null;
    }

    function hasElectricRuntimeReady() {
        if (typeof runtime.hasUtilElectricMeteringStore === 'function' && runtime.hasUtilElectricMeteringStore()) {
            return true;
        }
        return typeof runtime.getUtilElectricUtilitySnapshot === 'function' && Boolean(runtime.getUtilElectricUtilitySnapshot());
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function syncSupplementaryWindows(modal) {
        if (!modal) return;
        if (typeof runtime.syncUtilSheetAnalysisChartPopup === 'function') {
            runtime.syncUtilSheetAnalysisChartPopup(modal);
        }
        if (typeof runtime.syncUtilSheetDetachedReportWindow === 'function') {
            runtime.syncUtilSheetDetachedReportWindow(modal);
        }
        if (typeof runtime.syncUtilSheetReportWindowState === 'function') {
            runtime.syncUtilSheetReportWindowState(modal);
        }
    }

    function rerenderUtilSheetReportModalIfActive(sheetType, datasetKey) {
        const doc = getDocument();
        if (!doc || typeof doc.getElementById !== 'function') return;
        const activeModal = doc.getElementById('util-sheet-report-modal');
        if (!activeModal) return;
        if (!activeModal.classList?.contains?.('is-open') && !getDetachedWindow()) return;
        if (String(activeModal.dataset.sheetType || '') !== sheetType) return;
        if (String(activeModal.dataset.datasetKey || '') !== datasetKey) return;
        renderUtilSheetReportModal(activeModal);
        syncSupplementaryWindows(activeModal);
    }

    function resolveAnalysisViewState(modal) {
        const chartKey = typeof runtime.normalizeUtilGasAnalysisFullscreenChartKey === 'function'
            ? runtime.normalizeUtilGasAnalysisFullscreenChartKey(modal, modal.dataset.analysisFullscreenChartKey || 'combined')
            : '';
        const viewState = {
            fullscreenChart: modal.dataset.analysisFullscreen === 'true',
            chartKey,
            inlineTableKey: ''
        };
        if (!viewState.fullscreenChart || !viewState.chartKey) {
            if (modal.dataset.analysisFullscreen === 'true' && modal.dataset.analysisFullscreenAutoExpanded === 'true') {
                modal.classList?.remove?.('is-expanded');
            }
            modal.dataset.analysisFullscreen = 'false';
            modal.dataset.analysisFullscreenChartKey = '';
            modal.dataset.analysisFullscreenAutoExpanded = 'false';
            modal.classList?.remove?.('is-analysis-chart-fullscreen');
            viewState.fullscreenChart = false;
            viewState.chartKey = '';
        } else {
            modal.dataset.analysisFullscreenChartKey = viewState.chartKey;
            modal.classList?.add?.('is-analysis-chart-fullscreen');
        }
        viewState.inlineTableKey = viewState.fullscreenChart
            ? ''
            : (typeof runtime.getUtilGasAnalysisInlineRatioTableKey === 'function'
                ? runtime.getUtilGasAnalysisInlineRatioTableKey(modal, modal.dataset.analysisInlineRatioTableKey || '')
                : '');
        modal.dataset.analysisInlineRatioTableKey = viewState.inlineTableKey;
        return viewState;
    }

    function renderUtilSheetReportModal(modal) {
        if (!modal) return;
        const sheetType = normalizeSheetType(modal.dataset.sheetType);
        const datasetKey = resolveDatasetKey(sheetType, modal.dataset.datasetKey || UtilSheetReportState[sheetType] || 'gas');
        const presentation = typeof runtime.getUtilSheetPresentation === 'function'
            ? runtime.getUtilSheetPresentation(sheetType, datasetKey)
            : { kicker: 'REPORT', title: '보고서' };
        const selectedMonthKey = String(modal.dataset.monthKey || UtilSheetReportMonthState[sheetType] || '').trim();
        const compareKey = normalizeCompareKey(modal.dataset.compareKey || UtilSheetCompareState[sheetType] || 'month');
        const gasMeterProductionKey = normalizeGasMeterProductionKey(modal.dataset.gasMeterProductionKey || UtilSheetMeterState.gasProductionKey);
        const gasAnalysisCategoryKey = normalizeGasAnalysisCategoryKey(modal.dataset.gasAnalysisCategoryKey || UtilSheetAnalysisState.gas.categoryKey);
        const electricMeterTeamKey = normalizeElectricMeterTeamKey(modal.dataset.electricMeterTeamKey || UtilSheetMeterState.electricTeamKey);
        const electricAnalysisTeamKey = normalizeElectricAnalysisTeamKey(modal.dataset.electricAnalysisTeamKey || UtilSheetAnalysisState.electric.teamKey);
        const electricMeterViewKey = normalizeElectricMeterViewKey(modal.dataset.electricMeterViewKey || UtilSheetMeterState.electricViewKey);
        const datasetResult = typeof runtime.buildUtilSheetDatasetResult === 'function'
            ? runtime.buildUtilSheetDatasetResult(datasetKey, selectedMonthKey)
            : { hasData: false, monthOptions: [], activeMonthKey: '', latestMonthLabel: '' };
        const spec = UTIL_SHEET_DATASET_SPECS[datasetKey] || UTIL_SHEET_DATASET_SPECS.gas || { label: '' };
        const kickerEl = modal.querySelector?.('[data-role="util-sheet-report-kicker"]') || null;
        const titleEl = modal.querySelector?.('[data-role="util-sheet-report-title"]') || null;
        const subEl = modal.querySelector?.('[data-role="util-sheet-report-sub"]') || null;
        const bodyEl = modal.querySelector?.('[data-role="util-sheet-report-body"]') || null;
        const monthSelect = modal.querySelector?.('[data-role="util-sheet-modal-month"]') || null;

        modal.dataset.sheetType = sheetType;
        modal.dataset.datasetKey = datasetKey;
        modal.dataset.compareKey = compareKey;
        modal.dataset.gasMeterProductionKey = gasMeterProductionKey;
        modal.dataset.gasAnalysisCategoryKey = gasAnalysisCategoryKey;
        modal.dataset.electricMeterTeamKey = electricMeterTeamKey;
        modal.dataset.electricAnalysisTeamKey = electricAnalysisTeamKey;
        modal.dataset.electricMeterViewKey = electricMeterViewKey;
        UtilSheetReportState[sheetType] = datasetKey;
        UtilSheetMeterState.gasProductionKey = gasMeterProductionKey;
        UtilSheetAnalysisState.gas.categoryKey = gasAnalysisCategoryKey;
        UtilSheetMeterState.electricTeamKey = electricMeterTeamKey;
        UtilSheetAnalysisState.electric.teamKey = electricAnalysisTeamKey;
        UtilSheetMeterState.electricViewKey = electricMeterViewKey;

        if (typeof runtime.pruneUtilSheetDatasetToggles === 'function') {
            runtime.pruneUtilSheetDatasetToggles(modal);
        }

        const isCustomAnalysisView = sheetType === 'analysis' && isCustomAnalysisDataset(datasetKey);
        if (!isCustomAnalysisView) {
            modal.dataset.analysisFullscreen = 'false';
            modal.dataset.analysisFullscreenChartKey = '';
            modal.dataset.analysisFullscreenAutoExpanded = 'false';
            modal.dataset.analysisInlineRatioTableKey = '';
            modal.classList?.remove?.('is-analysis-chart-fullscreen');
        } else {
            modal.classList?.toggle?.('is-analysis-chart-fullscreen', modal.dataset.analysisFullscreen === 'true');
        }

        if (typeof runtime.syncUtilSheetTypeButtons === 'function') {
            runtime.syncUtilSheetTypeButtons(modal, '[data-role="util-sheet-modal-type-select"]', sheetType);
        }
        if (typeof runtime.syncUtilSheetDatasetButtons === 'function') {
            runtime.syncUtilSheetDatasetButtons(modal, '[data-role="util-sheet-modal-select"]', datasetKey, sheetType);
        }
        if (typeof runtime.syncUtilSheetCompareButtons === 'function') {
            runtime.syncUtilSheetCompareButtons(modal, '[data-role="util-sheet-modal-compare-select"]', compareKey);
        }

        if (monthSelect) {
            const monthOptions = Array.isArray(datasetResult.monthOptions) ? datasetResult.monthOptions : [];
            monthSelect.innerHTML = monthOptions.map(item => `
                <option value="${escapeHtml(item.value)}">${escapeHtml(item.label)}</option>
            `).join('');
            monthSelect.disabled = !monthOptions.length;
            if (datasetResult.activeMonthKey && monthOptions.some(item => item.value === datasetResult.activeMonthKey)) {
                monthSelect.value = datasetResult.activeMonthKey;
                modal.dataset.monthKey = datasetResult.activeMonthKey;
                UtilSheetReportMonthState[sheetType] = datasetResult.activeMonthKey;
            } else {
                modal.dataset.monthKey = '';
                UtilSheetReportMonthState[sheetType] = '';
            }
        }

        if (kickerEl) kickerEl.textContent = presentation.kicker;
        if (titleEl) titleEl.textContent = presentation.title;
        if (!bodyEl) {
            syncSupplementaryWindows(modal);
            return;
        }

        if (datasetKey === 'electric' && !UtilSheetRuntimeState.electricDataSyncedOnce) {
            if (subEl) subEl.textContent = '기준: 전기 기입 데이터를 동기화하는 중';
            bodyEl.innerHTML = '<div class="util-sheet-empty">전기 검침표 데이터를 정리하는 중입니다.</div>';
            if (typeof runtime.ensureUtilElectricReportDataSync === 'function') {
                runtime.ensureUtilElectricReportDataSync().then(() => {
                    rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
                });
            }
            if (typeof runtime.syncUtilSheetDetachedReportWindow === 'function') {
                runtime.syncUtilSheetDetachedReportWindow(modal);
            }
            if (typeof runtime.syncUtilSheetReportWindowState === 'function') {
                runtime.syncUtilSheetReportWindowState(modal);
            }
            return;
        }

        modal._utilSheetAnalysisModel = null;
        if (
            datasetKey === 'gas'
            && !datasetResult.hasData
            && !UtilSheetRuntimeState.gasDataSyncedOnce
            && typeof runtime.ensureUtilGasReportDataSync === 'function'
        ) {
            if (subEl) subEl.textContent = '기준: 가스 검침 데이터를 불러오는 중';
            bodyEl.innerHTML = '<div class="util-sheet-empty">가스 검침표 데이터를 정리하는 중입니다.</div>';
            runtime.ensureUtilGasReportDataSync().then(() => {
                rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
            });
            syncSupplementaryWindows(modal);
            return;
        }
        if (!datasetResult.hasData) {
            if (subEl) subEl.textContent = '기준: 데이터 없음';
            bodyEl.innerHTML = '<div class="util-sheet-empty">표시할 보고서를 준비하지 못했습니다.</div>';
            return;
        }

        if (sheetType === 'analysis' && datasetKey === 'gas') {
            const analysisModel = typeof runtime.buildUtilGasAnalysisModel === 'function'
                ? runtime.buildUtilGasAnalysisModel(selectedMonthKey || datasetResult.activeMonthKey, compareKey)
                : { hasData: false };
            modal._utilSheetAnalysisModel = analysisModel;
            if (analysisModel.loading) {
                if (subEl) subEl.textContent = '기준: 가스 검침 데이터 불러오는 중';
                bodyEl.innerHTML = `<div class="util-sheet-empty">${escapeHtml(analysisModel.message || '가스 검침 데이터를 불러오는 중입니다.')}</div>`;
                if (typeof runtime.ensureUtilGasMeteringStore === 'function') {
                    runtime.ensureUtilGasMeteringStore().then(() => {
                        rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
                    });
                }
                syncSupplementaryWindows(modal);
                return;
            }
            if (!analysisModel.hasData) {
                if (subEl) subEl.textContent = '기준: 데이터 없음';
                bodyEl.innerHTML = '<div class="util-sheet-empty">표시할 분석표를 준비하지 못했습니다.</div>';
                syncSupplementaryWindows(modal);
                return;
            }

            modal.dataset.monthKey = analysisModel.range.to;
            UtilSheetReportMonthState[sheetType] = analysisModel.range.to;
            if (monthSelect) monthSelect.value = analysisModel.range.to;
            const analysisViewState = resolveAnalysisViewState(modal);
            if (subEl) {
                subEl.textContent = `범위 ${analysisModel.rangeLabel} / ${analysisModel.compareLabel} / 기준 ${analysisModel.categoryOption?.label || '합산'}`;
            }
            const analysisDatasetResult = typeof runtime.buildUtilSheetDatasetResult === 'function'
                ? runtime.buildUtilSheetDatasetResult(datasetKey, analysisModel.range.to)
                : datasetResult;
            const gasMeterComparisonModel = typeof runtime.buildUtilGasMeterComparisonModel === 'function'
                ? runtime.buildUtilGasMeterComparisonModel(analysisModel.range.to, compareKey)
                : null;
            const insights = typeof runtime.resolveUtilSheetMemoItems === 'function'
                ? runtime.resolveUtilSheetMemoItems(sheetType, datasetKey, analysisDatasetResult, compareKey, gasMeterComparisonModel)
                : [];
            if (gasMeterComparisonModel?.loading && typeof runtime.ensureUtilGasMeteringStore === 'function') {
                runtime.ensureUtilGasMeteringStore().then(() => {
                    rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
                });
            }
            bodyEl.innerHTML = `
                ${typeof runtime.buildUtilGasAnalysisBodyHtmlV2 === 'function' ? runtime.buildUtilGasAnalysisBodyHtmlV2(analysisModel, analysisViewState, modal) : ''}
                ${analysisViewState.fullscreenChart
                    ? ''
                    : (typeof runtime.buildUtilSheetMemoSectionHtml === 'function' ? runtime.buildUtilSheetMemoSectionHtml(insights) : '')}
            `;
            if (typeof runtime.bindUtilSheetAnalysisChartDragScroll === 'function') {
                runtime.bindUtilSheetAnalysisChartDragScroll(bodyEl);
            }
            if (typeof runtime.bindUtilSheetAnalysisInlineTableDrag === 'function') {
                runtime.bindUtilSheetAnalysisInlineTableDrag(bodyEl, modal);
            }
            syncSupplementaryWindows(modal);
            return;
        }

        if (sheetType === 'analysis' && datasetKey === 'electric') {
            const analysisModel = typeof runtime.buildUtilElectricAnalysisModel === 'function'
                ? runtime.buildUtilElectricAnalysisModel(selectedMonthKey || datasetResult.activeMonthKey, compareKey, electricAnalysisTeamKey)
                : { hasData: false };
            modal._utilSheetAnalysisModel = analysisModel;
            if (!analysisModel.hasData) {
                if (subEl) subEl.textContent = '기준: 데이터 없음';
                bodyEl.innerHTML = '<div class="util-sheet-empty">표시할 분석 데이터를 준비하지 못했습니다.</div>';
                syncSupplementaryWindows(modal);
                return;
            }

            modal.dataset.monthKey = analysisModel.range.to;
            UtilSheetReportMonthState[sheetType] = analysisModel.range.to;
            if (monthSelect) monthSelect.value = analysisModel.range.to;
            const analysisViewState = resolveAnalysisViewState(modal);
            if (subEl) {
                subEl.textContent = `범위 ${analysisModel.rangeLabel} / ${analysisModel.compareLabel} / 기준 ${analysisModel.teamOption?.label || '합산'}`;
            }
            const analysisDatasetResult = analysisModel.datasetResult || (
                typeof runtime.buildUtilSheetDatasetResult === 'function'
                    ? runtime.buildUtilSheetDatasetResult(datasetKey, analysisModel.range.to)
                    : datasetResult
            );
            const insights = typeof runtime.resolveUtilSheetMemoItems === 'function'
                ? runtime.resolveUtilSheetMemoItems(sheetType, datasetKey, analysisDatasetResult, compareKey, null)
                : [];
            bodyEl.innerHTML = `
                ${typeof runtime.buildUtilElectricAnalysisBodyHtmlV2 === 'function' ? runtime.buildUtilElectricAnalysisBodyHtmlV2(analysisModel, analysisViewState, modal) : ''}
                ${analysisViewState.fullscreenChart
                    ? ''
                    : (typeof runtime.buildUtilSheetMemoSectionHtml === 'function' ? runtime.buildUtilSheetMemoSectionHtml(insights) : '')}
            `;
            if (typeof runtime.bindUtilSheetAnalysisChartDragScroll === 'function') {
                runtime.bindUtilSheetAnalysisChartDragScroll(bodyEl);
            }
            if (typeof runtime.bindUtilSheetAnalysisInlineTableDrag === 'function') {
                runtime.bindUtilSheetAnalysisInlineTableDrag(bodyEl, modal);
            }
            syncSupplementaryWindows(modal);
            return;
        }

        const compareMeta = typeof runtime.buildUtilSheetCompareMeta === 'function'
            ? runtime.buildUtilSheetCompareMeta(datasetResult, compareKey)
            : { label: '' };
        const electricRuntimeReady = hasElectricRuntimeReady();
        const gasMeterComparisonModel = sheetType === 'meter' && datasetKey === 'gas' && typeof runtime.buildUtilGasMeterComparisonModel === 'function'
            ? runtime.buildUtilGasMeterComparisonModel(datasetResult.activeMonthKey || selectedMonthKey, compareKey)
            : null;
        const electricMeterComparisonModel = sheetType === 'meter' && datasetKey === 'electric' && typeof runtime.buildUtilElectricMeterComparisonModel === 'function'
            ? runtime.buildUtilElectricMeterComparisonModel(datasetResult.activeMonthKey || selectedMonthKey, compareKey, electricMeterTeamKey)
            : null;
        const electricTeamDatasetResult = sheetType === 'meter' && datasetKey === 'electric' && electricRuntimeReady && typeof runtime.buildUtilElectricMeterTeamDatasetResult === 'function'
            ? runtime.buildUtilElectricMeterTeamDatasetResult(datasetResult.activeMonthKey || selectedMonthKey, electricMeterTeamKey)
            : null;
        const gasMeterSummaryItems = sheetType === 'meter' && datasetKey === 'gas' && typeof runtime.buildUtilGasMeterSummaryItems === 'function'
            ? runtime.buildUtilGasMeterSummaryItems(datasetResult, compareKey, gasMeterComparisonModel, gasMeterProductionKey)
            : [];
        const electricMeterSummaryItems = sheetType === 'meter' && datasetKey === 'electric' && electricRuntimeReady && typeof runtime.buildUtilElectricMeterSummaryItems === 'function'
            ? runtime.buildUtilElectricMeterSummaryItems(datasetResult, compareKey, electricTeamDatasetResult)
            : [];
        const insights = typeof runtime.resolveUtilSheetMemoItems === 'function'
            ? runtime.resolveUtilSheetMemoItems(sheetType, datasetKey, datasetResult, compareKey, gasMeterComparisonModel)
            : [];

        if (subEl) subEl.textContent = `기준 ${datasetResult.latestMonthLabel} / ${compareMeta.label}`;

        if (gasMeterComparisonModel?.loading && typeof runtime.ensureUtilGasMeteringStore === 'function') {
            runtime.ensureUtilGasMeteringStore().then(() => {
                rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
            });
        }
        if (electricMeterComparisonModel?.loading && typeof runtime.ensureUtilElectricMeteringStore === 'function') {
            runtime.ensureUtilElectricMeteringStore().then(loaded => {
                if (!loaded || !hasElectricRuntimeReady()) return;
                rerenderUtilSheetReportModalIfActive(sheetType, datasetKey);
            });
        }

        bodyEl.innerHTML = `
            <section class="util-sheet-section is-hero">
                <div class="util-sheet-badge-row">
                    ${typeof runtime.buildUtilSheetBadgesHtml === 'function' ? runtime.buildUtilSheetBadgesHtml(sheetType, datasetResult, compareKey) : ''}
                </div>
                ${sheetType === 'meter' && datasetKey === 'gas' && gasMeterSummaryItems.length
                    ? (typeof runtime.buildUtilGasMeterSummaryBlockHtml === 'function' ? runtime.buildUtilGasMeterSummaryBlockHtml(gasMeterSummaryItems, gasMeterProductionKey) : '')
                    : sheetType === 'meter' && datasetKey === 'electric' && electricMeterSummaryItems.length
                        ? (typeof runtime.buildUtilElectricMeterSummaryBlockHtml === 'function' ? runtime.buildUtilElectricMeterSummaryBlockHtml(electricMeterSummaryItems, electricMeterTeamKey) : '')
                        : `
                            <div class="util-sheet-stat-grid">
                                ${typeof runtime.buildUtilSheetStatsHtml === 'function'
                                    ? runtime.buildUtilSheetStatsHtml(sheetType, datasetResult, compareKey, gasMeterComparisonModel)
                                    : ''}
                            </div>
                        `}
            </section>
            ${sheetType === 'meter' && datasetKey === 'gas'
                ? (typeof runtime.buildUtilGasMeterComparisonSectionHtml === 'function' ? runtime.buildUtilGasMeterComparisonSectionHtml(gasMeterComparisonModel) : '')
                : sheetType === 'meter' && datasetKey === 'electric'
                    ? (typeof runtime.buildUtilElectricMeterComparisonSectionHtml === 'function'
                        ? runtime.buildUtilElectricMeterComparisonSectionHtml(electricMeterComparisonModel, electricTeamDatasetResult, electricMeterViewKey)
                        : '')
                    : ''}
            ${sheetType === 'analysis' ? `
                <section class="util-sheet-section">
                    <div class="util-sheet-section-head">
                        <div>
                            <div class="util-sheet-section-title">원단위 연도 비교</div>
                            <div class="util-sheet-section-sub">${escapeHtml(spec.label)} 원단위를 2월 기준 월까지만 같은 위치에서 비교할 수 있게 정리했습니다.</div>
                        </div>
                    </div>
                    ${typeof runtime.buildUtilSheetMatrixHtml === 'function' ? runtime.buildUtilSheetMatrixHtml(datasetResult) : ''}
                </section>
            ` : ''}
            ${true ? '' : `
                <section class="util-sheet-section">
                    <div class="util-sheet-section-head">
                        <div>
                            <div class="util-sheet-section-title">최근 월 추이</div>
                            <div class="util-sheet-section-sub">최근 6개월 사용량, 비용, 생산량, 원단위를 정리했습니다.</div>
                        </div>
                    </div>
                </section>
            `}
            ${typeof runtime.buildUtilSheetMemoSectionHtml === 'function' ? runtime.buildUtilSheetMemoSectionHtml(insights) : ''}
        `;

        if (sheetType === 'meter' && datasetKey === 'gas' && typeof runtime.relocateUtilGasGuidanceNote === 'function') {
            runtime.relocateUtilGasGuidanceNote(bodyEl);
        }
        syncSupplementaryWindows(modal);
    }

    globalScope.KPIUtilReportSheetModalRender = Object.freeze({
        setRuntimeAdapters,
        rerenderUtilSheetReportModalIfActive,
        renderUtilSheetReportModal
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
