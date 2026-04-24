(function registerUtilReportSheetWindows(globalScope) {
    if (globalScope.KPIUtilReportSheetWindows) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.windows.js');
    }
    const utilReportSheetWindowDetachedInteractions = globalScope.KPIUtilReportSheetWindowDetachedInteractions;
    if (!utilReportSheetWindowDetachedInteractions) {
        throw new Error('KPIUtilReportSheetWindowDetachedInteractions must load before KPI.util.report.sheet.windows.js');
    }

    const {
        UtilSheetCompareState,
        UtilSheetDetachedReportState,
        UtilSheetAnalysisChartPopupState
    } = utilReportSheetConfig;

    const runtime = {
        buildUtilSheetDetachedCompareToggleHtml: null,
        normalizeUtilSheetCompareKey: null,
        syncUtilSheetCompareButtons: null,
        normalizeUtilSheetType: null,
        isUtilSheetCustomAnalysisDataset: null,
        getUtilSheetActiveAnalysisDatasetKey: null,
        normalizeUtilGasAnalysisPopupKey: null,
        parseUtilGasAnalysisRatioTablePopupKey: null,
        getUtilGasAnalysisChartModelByKey: null,
        getUtilGasAnalysisRatioTableByKey: null,
        isUtilGasAnalysisChartRenderable: null,
        buildUtilGasAnalysisRangeTableHtml: null,
        buildUtilGasAnalysisRatioCombinedChartCardHtmlV2: null,
        buildUtilGasAnalysisChartCardHtmlV2: null,
        resolveUtilSheetAnalysisLabelToggleContext: null,
        setUtilSheetAnalysisShowLabels: null,
        renderUtilSheetReportModal: null,
        openUtilGasAnalysisRatioTablePopup: null,
        setUtilGasAnalysisRatioShowLabels: null,
        setUtilGasAnalysisFuelInactive: null,
        setUtilSheetAnalysisUnitKey: null,
        setUtilSheetAnalysisDisplayMode: null,
        applyUtilGasMeterProductionSelection: null,
        applyUtilElectricMeterTeamSelection: null,
        applyUtilElectricAnalysisTeamSelection: null,
        applyUtilGasAnalysisCategorySelection: null,
        applyUtilGasAnalysisRangeSelection: null,
        applyUtilSheetCompareSelection: null,
        applyUtilElectricMeterViewSelection: null,
        openUtilSheetBillingPreview: null,
        closeUtilSheetBillingPreview: null,
        openUtilGasAnalysisChartModal: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        utilReportSheetWindowDetachedInteractions.setRuntimeAdapters({
            getReportModal,
            rerenderAndSync,
            resolveUtilSheetAnalysisLabelToggleContext: (...args) => runtime.resolveUtilSheetAnalysisLabelToggleContext?.(...args) ?? null,
            setUtilSheetAnalysisShowLabels: (...args) => runtime.setUtilSheetAnalysisShowLabels?.(...args),
            setUtilGasAnalysisRatioShowLabels: (...args) => runtime.setUtilGasAnalysisRatioShowLabels?.(...args),
            applyUtilGasMeterProductionSelection: (...args) => runtime.applyUtilGasMeterProductionSelection?.(...args),
            applyUtilElectricMeterTeamSelection: (...args) => runtime.applyUtilElectricMeterTeamSelection?.(...args),
            applyUtilElectricAnalysisTeamSelection: (...args) => runtime.applyUtilElectricAnalysisTeamSelection?.(...args),
            applyUtilGasAnalysisCategorySelection: (...args) => runtime.applyUtilGasAnalysisCategorySelection?.(...args),
            setUtilGasAnalysisFuelInactive: (...args) => runtime.setUtilGasAnalysisFuelInactive?.(...args),
            setUtilSheetAnalysisUnitKey: (...args) => runtime.setUtilSheetAnalysisUnitKey?.(...args),
            getUtilSheetActiveAnalysisDatasetKey: (...args) => runtime.getUtilSheetActiveAnalysisDatasetKey?.(...args) ?? '',
            applyUtilGasAnalysisRangeSelection: (...args) => runtime.applyUtilGasAnalysisRangeSelection?.(...args),
            applyUtilSheetCompareSelection: (...args) => runtime.applyUtilSheetCompareSelection?.(...args),
            applyUtilElectricMeterViewSelection: (...args) => runtime.applyUtilElectricMeterViewSelection?.(...args),
            openUtilSheetBillingPreview: (...args) => runtime.openUtilSheetBillingPreview?.(...args),
            setUtilSheetAnalysisDisplayMode: (...args) => runtime.setUtilSheetAnalysisDisplayMode?.(...args),
            openUtilGasAnalysisRatioTablePopup: (...args) => runtime.openUtilGasAnalysisRatioTablePopup?.(...args),
            openUtilGasAnalysisChartModal: (...args) => runtime.openUtilGasAnalysisChartModal?.(...args)
        });
        return globalScope.KPIUtilReportSheetWindows;
    }

    function getDocument() {
        return globalScope.document || null;
    }

    function getReportModal() {
        const doc = getDocument();
        if (!doc || typeof doc.getElementById !== 'function') return null;
        return doc.getElementById('util-sheet-report-modal');
    }

    function rerenderAndSync(modal) {
        if (!modal) return;
        if (typeof runtime.renderUtilSheetReportModal === 'function') {
            runtime.renderUtilSheetReportModal(modal);
        }
        syncUtilSheetDetachedReportWindow(modal);
        syncUtilSheetReportWindowState(modal);
    }

    function normalizeCompareKey(compareKey = 'month') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function syncCompareButtons(root, selector, compareKey) {
        if (typeof runtime.syncUtilSheetCompareButtons === 'function') {
            runtime.syncUtilSheetCompareButtons(root, selector, compareKey);
        }
    }

    function getUtilSheetDetachedReportWindow() {
        const popup = UtilSheetDetachedReportState.win;
        if (popup && !popup.closed) return popup;
        UtilSheetDetachedReportState.win = null;
        return null;
    }

    function closeUtilSheetDetachedReportWindow() {
        const popup = getUtilSheetDetachedReportWindow();
        UtilSheetDetachedReportState.win = null;
        if (!popup) return;
        try {
            popup.close();
        } catch (error) {
            void error;
        }
    }

    function getUtilSheetAnalysisChartPopupWindow() {
        const popup = UtilSheetAnalysisChartPopupState.win;
        if (popup && !popup.closed) return popup;
        UtilSheetAnalysisChartPopupState.win = null;
        return null;
    }

    function closeUtilSheetAnalysisChartPopupWindow() {
        const popup = getUtilSheetAnalysisChartPopupWindow();
        UtilSheetAnalysisChartPopupState.win = null;
        UtilSheetAnalysisChartPopupState.chartKey = '';
        if (!popup) return;
        try {
            popup.close();
        } catch (error) {
            void error;
        }
    }

    function getUtilSheetDetachedHeadAssetsHtml() {
        const doc = getDocument();
        const head = doc?.head;
        if (!head || typeof head.querySelectorAll !== 'function') return '';
        return Array.from(head.querySelectorAll('style, link[rel="stylesheet"]'))
            .map(node => String(node?.outerHTML || ''))
            .join('');
    }

    function buildUtilSheetDetachedReportShellHtml() {
        const compareToggleHtml = typeof runtime.buildUtilSheetDetachedCompareToggleHtml === 'function'
            ? runtime.buildUtilSheetDetachedCompareToggleHtml('month')
            : '';

        return `
            <!doctype html>
            <html lang="ko">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>유틸리티 보고서</title>
                ${getUtilSheetDetachedHeadAssetsHtml()}
                <style>
                    html, body { height: 100%; }
                    body { margin: 0; overflow: hidden; background: #dbe4f3; color: #0f172a; }
                    .util-sheet-report-detached-shell { height: 100vh; min-height: 100vh; display: grid; grid-template-rows: auto minmax(0, 1fr); background: #dbe4f3; }
                    .util-sheet-report-detached-head { position: sticky; top: 0; z-index: 10; display: flex; align-items: flex-start; justify-content: space-between; gap: 0.9rem; padding: 14px 16px; border-bottom: 1px solid #bfdbfe; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); box-shadow: 0 14px 32px rgba(15, 23, 42, 0.12); cursor: grab; user-select: none; }
                    .util-sheet-report-detached-head.is-window-dragging { cursor: grabbing; }
                    .util-sheet-report-detached-copy { display: grid; gap: 0.2rem; min-width: 0; }
                    .util-sheet-report-detached-kicker { font-size: 0.68rem; font-weight: 900; color: #1d4ed8; letter-spacing: 0.06em; text-transform: uppercase; }
                    .util-sheet-report-detached-title { font-size: 1.04rem; font-weight: 900; color: #0f172a; }
                    .util-sheet-report-detached-sub { font-size: 0.76rem; font-weight: 700; color: #475569; }
                    .util-sheet-report-detached-note { font-size: 0.72rem; font-weight: 700; color: #64748b; line-height: 1.45; }
                    .util-sheet-report-detached-actions { display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end; }
                    .util-sheet-report-detached-btn { min-height: 34px; border: 1px solid #bfdbfe; background: rgba(255, 255, 255, 0.92); color: #1d4ed8; border-radius: 8px; padding: 0 12px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 800; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,0.72); }
                    .util-sheet-report-detached-btn:hover { border-color: #60a5fa; background: #ffffff; }
                    .util-sheet-report-detached-btn.is-close { border-color: #fecaca; color: #b91c1c; }
                    .util-sheet-report-detached-btn.is-close:hover { border-color: #f87171; background: #fff1f2; }
                    .util-sheet-report-detached-body { min-height: 0; overflow: auto; overscroll-behavior: contain; display: grid; gap: 0.8rem; padding: 14px; background: #f8fafc; }
                    @media (min-width: 1400px) {
                        .util-sheet-report-detached-body { padding: 16px; gap: 1rem; }
                    }
                </style>
            </head>
            <body>
                <div class="util-sheet-report-detached-shell">
                    <div class="util-sheet-report-detached-head">
                        <div class="util-sheet-report-detached-copy">
                            <div class="util-sheet-report-detached-kicker" data-role="util-sheet-report-detached-kicker">GAS REPORT</div>
                            <div class="util-sheet-report-detached-title" data-role="util-sheet-report-detached-title">보고서</div>
                            <div class="util-sheet-report-detached-sub" data-role="util-sheet-report-detached-sub">기준: -</div>
                            <div class="util-sheet-report-detached-note">팝업 창을 별도 브라우저 창으로 열어 두고 계속 보고서를 확인할 수 있습니다.</div>
                        </div>
                        <div class="util-sheet-report-detached-actions">${compareToggleHtml}</div>
                    </div>
                    <div class="util-sheet-report-detached-body" data-role="util-sheet-report-detached-body">
                        <div class="util-sheet-empty">보고서를 불러오는 중입니다.</div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    function buildUtilSheetAnalysisChartPopupShellHtml() {
        return `
            <!doctype html>
            <html lang="ko">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <title>차트 전체화면</title>
                ${getUtilSheetDetachedHeadAssetsHtml()}
                <style>
                    html, body { height: 100%; }
                    body { margin: 0; overflow: hidden; background: #0f172a; color: #0f172a; }
                    .util-sheet-analysis-chart-popup-shell { height: 100vh; min-height: 100vh; display: grid; grid-template-rows: auto minmax(0, 1fr); background: #e2e8f0; }
                    .util-sheet-analysis-chart-popup-head { position: sticky; top: 0; z-index: 12; display: flex; align-items: flex-start; justify-content: space-between; gap: 0.9rem; padding: 14px 16px; border-bottom: 1px solid rgba(148, 163, 184, 0.45); background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); box-shadow: 0 14px 32px rgba(15, 23, 42, 0.16); }
                    .util-sheet-analysis-chart-popup-copy { display: grid; gap: 0.2rem; min-width: 0; }
                    .util-sheet-analysis-chart-popup-kicker { font-size: 0.68rem; font-weight: 900; color: #1d4ed8; letter-spacing: 0.06em; text-transform: uppercase; }
                    .util-sheet-analysis-chart-popup-title { font-size: 1.08rem; font-weight: 900; color: #0f172a; }
                    .util-sheet-analysis-chart-popup-sub { font-size: 0.76rem; font-weight: 700; color: #475569; }
                    .util-sheet-analysis-chart-popup-actions { display: inline-flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; justify-content: flex-end; }
                    .util-sheet-analysis-chart-popup-btn { min-height: 34px; border: 1px solid #bfdbfe; background: rgba(255, 255, 255, 0.94); color: #1d4ed8; border-radius: 8px; padding: 0 12px; display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.75rem; font-weight: 800; cursor: pointer; box-shadow: inset 0 1px 0 rgba(255,255,255,0.72); }
                    .util-sheet-analysis-chart-popup-btn:hover { border-color: #60a5fa; background: #ffffff; }
                    .util-sheet-analysis-chart-popup-btn.is-close { border-color: #fecaca; color: #b91c1c; }
                    .util-sheet-analysis-chart-popup-btn.is-close:hover { border-color: #f87171; background: #fff1f2; }
                    .util-sheet-analysis-chart-popup-body { min-height: 0; overflow: auto; overscroll-behavior: contain; padding: 12px; background: #f8fafc; }
                    .util-sheet-analysis-chart-popup-content { display: grid; min-height: calc(100vh - 88px); }
                    .util-sheet-analysis-chart-popup-content .util-sheet-analysis-chart-card { min-height: calc(100vh - 112px); }
                    .util-sheet-analysis-chart-popup-content .util-sheet-analysis-chart-surface { min-height: 0; flex: 1 1 auto; }
                    .util-sheet-analysis-chart-popup-content .util-sheet-analysis-chart-frame { min-height: calc(100vh - 238px); height: calc(100vh - 238px); }
                    .util-sheet-analysis-chart-popup-content .util-report-chart-shell { height: 100%; }
                    .util-sheet-analysis-chart-popup-content .util-analytics-chart,
                    .util-sheet-analysis-chart-popup-content .util-analytics-chart-canvas,
                    .util-sheet-analysis-chart-popup-content .util-chart-scroll-shell { min-height: 100%; height: 100%; }
                    .util-sheet-analysis-chart-popup-body .util-sheet-analysis-chart-surface,
                    .util-sheet-analysis-chart-popup-body .util-analytics-chart-canvas { overscroll-behavior-x: contain; scrollbar-gutter: stable both-edges; }
                    .util-sheet-analysis-chart-popup-body .util-analytics-chart-canvas { cursor: grab; touch-action: pan-x; }
                    .util-sheet-analysis-chart-popup-body .util-analytics-chart-canvas.is-dragging { cursor: grabbing; }
                    @media (min-width: 1400px) {
                        .util-sheet-analysis-chart-popup-body { padding: 16px; }
                        .util-sheet-analysis-chart-popup-content .util-sheet-analysis-chart-frame { min-height: calc(100vh - 252px); height: calc(100vh - 252px); }
                    }
                </style>
            </head>
            <body>
                <div class="util-sheet-analysis-chart-popup-shell">
                    <div class="util-sheet-analysis-chart-popup-head">
                        <div class="util-sheet-analysis-chart-popup-copy">
                            <div class="util-sheet-analysis-chart-popup-kicker">ANALYSIS CHART</div>
                            <div class="util-sheet-analysis-chart-popup-title" data-role="util-sheet-analysis-chart-popup-title">차트 전체화면</div>
                            <div class="util-sheet-analysis-chart-popup-sub" data-role="util-sheet-analysis-chart-popup-sub">그래프를 크게 보는 창입니다.</div>
                        </div>
                        <div class="util-sheet-analysis-chart-popup-actions">
                            <button type="button" class="util-sheet-analysis-chart-popup-btn is-close" data-role="util-sheet-analysis-chart-popup-close">
                                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                                <span>닫기</span>
                            </button>
                        </div>
                    </div>
                    <div class="util-sheet-analysis-chart-popup-body" data-role="util-sheet-analysis-chart-popup-body">
                        <div class="util-sheet-empty">차트를 불러오는 중입니다.</div>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    function syncUtilSheetDetachedReportWindow(modal) {
        const popup = getUtilSheetDetachedReportWindow();
        if (!popup || !modal) return;
        try {
            const kickerText = String(modal.querySelector('[data-role="util-sheet-report-kicker"]')?.textContent || 'GAS REPORT').trim();
            const titleText = String(modal.querySelector('[data-role="util-sheet-report-title"]')?.textContent || '보고서').trim();
            const subText = String(modal.querySelector('[data-role="util-sheet-report-sub"]')?.textContent || '기준: -').trim();
            const bodyHtml = String(modal.querySelector('[data-role="util-sheet-report-body"]')?.innerHTML || '<div class="util-sheet-empty">표시할 보고서가 없습니다.</div>');
            const compareKey = normalizeCompareKey(modal.dataset.compareKey || UtilSheetCompareState[String(modal.dataset.sheetType || 'meter').trim()] || 'month');
            const kickerEl = popup.document.querySelector('[data-role="util-sheet-report-detached-kicker"]');
            const titleEl = popup.document.querySelector('[data-role="util-sheet-report-detached-title"]');
            const subEl = popup.document.querySelector('[data-role="util-sheet-report-detached-sub"]');
            const bodyEl = popup.document.querySelector('[data-role="util-sheet-report-detached-body"]');
            popup.document.title = titleText;
            if (kickerEl) kickerEl.textContent = kickerText;
            if (titleEl) titleEl.textContent = titleText;
            if (subEl) subEl.textContent = subText;
            if (bodyEl) {
                bodyEl.innerHTML = bodyHtml;
                bindUtilSheetAnalysisChartDragScroll(bodyEl);
                bindUtilSheetAnalysisInlineTableDrag(bodyEl, modal);
            }
            syncCompareButtons(popup.document, '[data-role="util-sheet-report-detached-compare-select"]', compareKey);
            bindUtilSheetDetachedReportWindowInteractions(popup);
        } catch (error) {
            if (popup.closed) {
                UtilSheetDetachedReportState.win = null;
            }
        }
    }

    function maximizeUtilSheetAnalysisChartPopup(popup) {
        if (!popup || popup.closed) return;
        const screenWidth = Number(globalScope?.screen?.availWidth) || Number(globalScope?.screen?.width) || 1520;
        const screenHeight = Number(globalScope?.screen?.availHeight) || Number(globalScope?.screen?.height) || 940;
        try {
            popup.moveTo(0, 0);
        } catch (error) {
            void error;
        }
        try {
            popup.resizeTo(screenWidth, screenHeight);
        } catch (error) {
            void error;
        }
    }

    function syncUtilSheetAnalysisChartPopup(modal) {
        const popup = getUtilSheetAnalysisChartPopupWindow();
        if (!popup) return;
        const normalizedSheetType = typeof runtime.normalizeUtilSheetType === 'function'
            ? runtime.normalizeUtilSheetType(modal?.dataset?.sheetType)
            : String(modal?.dataset?.sheetType || '').trim();
        const activeDatasetKey = typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
            ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
            : '';
        const isCustomAnalysisView = typeof runtime.isUtilSheetCustomAnalysisDataset === 'function'
            ? runtime.isUtilSheetCustomAnalysisDataset(activeDatasetKey)
            : false;
        if (!modal || normalizedSheetType !== 'analysis' || !isCustomAnalysisView) {
            closeUtilSheetAnalysisChartPopupWindow();
            return;
        }
        try {
            const datasetKey = activeDatasetKey;
            const normalizedPopupKey = typeof runtime.normalizeUtilGasAnalysisPopupKey === 'function'
                ? runtime.normalizeUtilGasAnalysisPopupKey(modal, UtilSheetAnalysisChartPopupState.chartKey || 'combined')
                : '';
            const tableKey = typeof runtime.parseUtilGasAnalysisRatioTablePopupKey === 'function'
                ? runtime.parseUtilGasAnalysisRatioTablePopupKey(normalizedPopupKey)
                : '';
            const analysisModel = modal._utilSheetAnalysisModel;
            const chart = tableKey
                ? { title: 'ratio-table' }
                : (normalizedPopupKey && typeof runtime.getUtilGasAnalysisChartModelByKey === 'function'
                    ? runtime.getUtilGasAnalysisChartModelByKey(modal, normalizedPopupKey)
                    : null);
            const table = tableKey && typeof runtime.getUtilGasAnalysisRatioTableByKey === 'function'
                ? runtime.getUtilGasAnalysisRatioTableByKey(modal, tableKey)
                : null;
            const controlItem = tableKey
                ? ((Array.isArray(analysisModel?.ratioCombinedChart?.controlItems) ? analysisModel.ratioCombinedChart.controlItems : [])
                    .find(item => String(item?.key || '').trim() === `ratio-${tableKey}`) || null)
                : null;
            const titleEl = popup.document.querySelector('[data-role="util-sheet-analysis-chart-popup-title"]');
            const subEl = popup.document.querySelector('[data-role="util-sheet-analysis-chart-popup-sub"]');
            const bodyEl = popup.document.querySelector('[data-role="util-sheet-analysis-chart-popup-body"]');
            const isRenderableChart = typeof runtime.isUtilGasAnalysisChartRenderable === 'function'
                ? runtime.isUtilGasAnalysisChartRenderable(chart)
                : Boolean(chart);
            if (!bodyEl || !analysisModel || !normalizedPopupKey || (!tableKey && !isRenderableChart) || (tableKey && !table)) {
                popup.document.title = '차트 전체화면';
                if (titleEl) titleEl.textContent = '차트 전체화면';
                if (subEl) subEl.textContent = '현재 선택한 그래프를 다시 열어 주세요.';
                if (bodyEl) bodyEl.innerHTML = '<div class="util-sheet-empty">표시할 그래프가 없습니다.</div>';
                return;
            }
            UtilSheetAnalysisChartPopupState.chartKey = normalizedPopupKey;
            UtilSheetAnalysisChartPopupState.datasetKey = datasetKey;
            const viewState = {
                fullscreenChart: true,
                chartKey: normalizedPopupKey
            };
            const scopeLabel = datasetKey === 'electric' ? '전기 분석' : '가스 분석';
            const teamLabel = analysisModel?.teamOption?.label || analysisModel?.categoryOption?.label || '-';
            const bodyHtml = tableKey
                ? (typeof runtime.buildUtilGasAnalysisRangeTableHtml === 'function'
                    ? runtime.buildUtilGasAnalysisRangeTableHtml(table, controlItem, { hideDisplayModeControls: true })
                    : '')
                : (normalizedPopupKey === 'ratio-combined'
                    ? (typeof runtime.buildUtilGasAnalysisRatioCombinedChartCardHtmlV2 === 'function'
                        ? runtime.buildUtilGasAnalysisRatioCombinedChartCardHtmlV2(chart, analysisModel, viewState)
                        : '')
                    : (typeof runtime.buildUtilGasAnalysisChartCardHtmlV2 === 'function'
                        ? runtime.buildUtilGasAnalysisChartCardHtmlV2(chart, analysisModel, viewState)
                        : ''));
            const popupTitle = tableKey ? String(table?.title || 'ratio-table').trim() : String(chart?.title || 'chart').trim();
            popup.document.title = `${popupTitle} - ${analysisModel.rangeLabel}`;
            if (chart && typeof chart === 'object') {
                chart.title = popupTitle;
            }
            if (titleEl) titleEl.textContent = popupTitle || '차트 전체화면';
            if (subEl) subEl.textContent = `${scopeLabel} / ${analysisModel.rangeLabel} / ${analysisModel.compareLabel} / 기준 ${teamLabel}`;
            bodyEl.innerHTML = `
                <div class="util-sheet-analysis-chart-popup-content">
                    ${bodyHtml}
                </div>
            `;
            bindUtilSheetAnalysisChartDragScroll(bodyEl);
            bindUtilSheetAnalysisChartPopupInteractions(popup);
        } catch (error) {
            if (popup.closed) {
                UtilSheetAnalysisChartPopupState.win = null;
                UtilSheetAnalysisChartPopupState.chartKey = '';
            }
        }
    }

    function bindUtilSheetAnalysisChartDragScroll(root = null) {
        const host = root && typeof root.querySelectorAll === 'function'
            ? root
            : (getDocument() || globalScope.document);
        if (!host || typeof host.querySelectorAll !== 'function') return;
        const candidates = Array.from(host.querySelectorAll('.util-sheet-analysis-chart-surface')).map(surface => (
            surface.querySelector('.util-analytics-chart-canvas') || surface
        ));
        candidates.forEach(scrollEl => {
            if (!scrollEl || scrollEl.dataset.analysisDragBound === 'true') return;
            scrollEl.dataset.analysisDragBound = 'true';

            let activePointerId = null;
            let startX = 0;
            let startScrollLeft = 0;

            const endDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                scrollEl.classList.remove('is-dragging');
            };

            const isInteractiveTarget = target => !!target?.closest?.(
                'input, select, textarea, button, label, a, summary, details, [contenteditable], [data-role="util-chart-month-hit"]'
            );

            scrollEl.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                if ((scrollEl.scrollWidth - scrollEl.clientWidth) <= 4) return;
                activePointerId = event.pointerId;
                startX = event.clientX;
                startScrollLeft = scrollEl.scrollLeft;
                scrollEl.classList.add('is-dragging');
                if (typeof scrollEl.setPointerCapture === 'function') {
                    try {
                        scrollEl.setPointerCapture(activePointerId);
                    } catch (error) {
                        void error;
                    }
                }
            });

            scrollEl.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.clientX - startX;
                const maxScrollLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
                scrollEl.scrollLeft = Math.min(maxScrollLeft, Math.max(0, startScrollLeft - diffX));
                if (Math.abs(diffX) > 2) event.preventDefault();
            });

            scrollEl.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            scrollEl.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            scrollEl.addEventListener('lostpointercapture', endDrag);
        });
    }

    function bindUtilSheetAnalysisInlineTableDrag(root = null, modal = null) {
        const doc = getDocument();
        const host = root && typeof root.querySelectorAll === 'function' ? root : doc;
        const activeModal = modal || getReportModal();
        if (!host || typeof host.querySelectorAll !== 'function') return;
        host.querySelectorAll('[data-role="util-sheet-analysis-inline-table-panel"]').forEach(panel => {
            if (!panel || panel.dataset.inlineDragBound === 'true') return;
            const handle = panel.querySelector('[data-role="util-sheet-analysis-inline-table-drag"]');
            if (!handle) return;
            panel.dataset.inlineDragBound = 'true';

            let activePointerId = null;
            let startLeft = 0;
            let startTop = 0;
            let startX = 0;
            let startY = 0;
            let parentRect = null;
            let panelRect = null;

            const finishDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                panel.classList.remove('is-dragging');
                handle.classList.remove('is-dragging');
            };

            handle.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                const offsetParent = panel.offsetParent || panel.parentElement;
                if (!offsetParent) return;
                parentRect = offsetParent.getBoundingClientRect();
                panelRect = panel.getBoundingClientRect();
                activePointerId = event.pointerId;
                startLeft = panelRect.left - parentRect.left;
                startTop = panelRect.top - parentRect.top;
                startX = event.clientX;
                startY = event.clientY;
                panel.style.left = `${startLeft}px`;
                panel.style.top = `${startTop}px`;
                panel.style.right = 'auto';
                panel.classList.add('is-dragging');
                handle.classList.add('is-dragging');
                if (typeof handle.setPointerCapture === 'function') {
                    try {
                        handle.setPointerCapture(activePointerId);
                    } catch (error) {
                        void error;
                    }
                }
                event.preventDefault();
            });

            handle.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId || !parentRect || !panelRect) return;
                const nextLeft = startLeft + (event.clientX - startX);
                const nextTop = startTop + (event.clientY - startY);
                const maxLeft = Math.max(0, parentRect.width - panelRect.width);
                const maxTop = Math.max(0, parentRect.height - Math.min(panelRect.height, parentRect.height));
                const clampedLeft = Math.min(maxLeft, Math.max(0, nextLeft));
                const clampedTop = Math.min(maxTop, Math.max(0, nextTop));
                panel.style.left = `${clampedLeft}px`;
                panel.style.top = `${clampedTop}px`;
                panel.style.right = 'auto';
                if (activeModal) {
                    activeModal.dataset.analysisInlineRatioTableX = String(Math.round(clampedLeft));
                    activeModal.dataset.analysisInlineRatioTableY = String(Math.round(clampedTop));
                }
                event.preventDefault();
            });

            handle.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                finishDrag();
            });
            handle.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                finishDrag();
            });
            handle.addEventListener('lostpointercapture', finishDrag);
        });
    }

    function bindUtilSheetDetachedReportWindowDrag(popup) {
        utilReportSheetWindowDetachedInteractions.bindUtilSheetDetachedReportWindowDrag(popup);
    }

    function bindUtilSheetAnalysisChartPopupInteractions(popup) {
        if (!popup || popup.__utilSheetAnalysisChartPopupInteractionBound) return;
        popup.__utilSheetAnalysisChartPopupInteractionBound = true;

        popup.document.addEventListener('click', event => {
            const closeButton = event.target?.closest?.('[data-role="util-sheet-analysis-chart-popup-close"]');
            if (closeButton) {
                closeUtilSheetAnalysisChartPopupWindow();
                return;
            }
            const modal = getReportModal();
            if (!modal) return;
            const chartTypeButton = event.target?.closest?.('[data-role="util-sheet-analysis-series-type"]');
            if (chartTypeButton) {
                if (typeof runtime.setUtilSheetAnalysisDisplayMode === 'function') {
                    runtime.setUtilSheetAnalysisDisplayMode(
                        typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
                            ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
                            : '',
                        chartTypeButton.dataset.chartKey || '',
                        chartTypeButton.dataset.chartType || 'bar'
                    );
                }
                if (typeof runtime.renderUtilSheetReportModal === 'function') {
                    runtime.renderUtilSheetReportModal(modal);
                }
                return;
            }
            const ratioTableButton = event.target?.closest?.('[data-role="util-sheet-analysis-open-ratio-table"]');
            if (ratioTableButton) {
                if (typeof runtime.openUtilGasAnalysisRatioTablePopup === 'function') {
                    runtime.openUtilGasAnalysisRatioTablePopup(modal, ratioTableButton.dataset.tableKey || '', ratioTableButton);
                }
                return;
            }
            const chartButton = event.target?.closest?.('[data-role="util-sheet-analysis-open-chart"]');
            if (chartButton) {
                closeUtilSheetAnalysisChartPopupWindow();
            }
        });

        popup.document.addEventListener('change', event => {
            const modal = getReportModal();
            if (!modal) return;
            const labelToggleContext = typeof runtime.resolveUtilSheetAnalysisLabelToggleContext === 'function'
                ? runtime.resolveUtilSheetAnalysisLabelToggleContext(event.target, modal)
                : null;
            if (labelToggleContext?.toggleEl) {
                if (typeof runtime.setUtilSheetAnalysisShowLabels === 'function') {
                    runtime.setUtilSheetAnalysisShowLabels(
                        labelToggleContext.datasetKey,
                        labelToggleContext.chartKey,
                        labelToggleContext.toggleEl.checked === true
                    );
                }
                if (typeof runtime.renderUtilSheetReportModal === 'function') {
                    runtime.renderUtilSheetReportModal(modal);
                }
                return;
            }
            const ratioLabelToggle = event.target.closest('[data-role="util-sheet-analysis-ratio-label-toggle"]');
            if (ratioLabelToggle) {
                if (typeof runtime.setUtilGasAnalysisRatioShowLabels === 'function') {
                    runtime.setUtilGasAnalysisRatioShowLabels(ratioLabelToggle.checked === true);
                }
                if (typeof runtime.renderUtilSheetReportModal === 'function') {
                    runtime.renderUtilSheetReportModal(modal);
                }
                return;
            }
            const fuelInactiveToggle = event.target.closest('[data-role="util-sheet-analysis-fuel-inactive"]');
            if (fuelInactiveToggle) {
                if (typeof runtime.setUtilGasAnalysisFuelInactive === 'function') {
                    runtime.setUtilGasAnalysisFuelInactive(fuelInactiveToggle.dataset.fuelKey || '', fuelInactiveToggle.checked === true);
                }
                if (typeof runtime.renderUtilSheetReportModal === 'function') {
                    runtime.renderUtilSheetReportModal(modal);
                }
                return;
            }
            const unitSelect = event.target.closest('[data-role="util-sheet-analysis-unit"]');
            if (unitSelect && typeof runtime.setUtilSheetAnalysisUnitKey === 'function') {
                runtime.setUtilSheetAnalysisUnitKey(
                    typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
                        ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
                        : '',
                    unitSelect.dataset.chartKey || '',
                    unitSelect.value || ''
                );
                if (typeof runtime.renderUtilSheetReportModal === 'function') {
                    runtime.renderUtilSheetReportModal(modal);
                }
            }
        });

        popup.document.addEventListener('keydown', event => {
            if (event.key !== 'Escape') return;
            event.preventDefault();
            closeUtilSheetAnalysisChartPopupWindow();
        });
    }

    function bindUtilSheetDetachedReportWindowInteractions(popup) {
        utilReportSheetWindowDetachedInteractions.bindUtilSheetDetachedReportWindowInteractions(popup);
    }

    function openUtilSheetDetachedReportWindow(modal) {
        if (!modal) return false;
        let popup = getUtilSheetDetachedReportWindow();
        if (!popup) {
            popup = globalScope.open('', 'util-sheet-report-detached-window', 'popup=yes,width=1520,height=940,resizable=yes,scrollbars=yes');
            if (!popup) {
                globalScope.alert('팝업 창을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
                return false;
            }
            popup.document.open();
            popup.document.write(buildUtilSheetDetachedReportShellHtml());
            popup.document.close();
            bindUtilSheetDetachedReportWindowDrag(popup);
            UtilSheetDetachedReportState.win = popup;
            popup.addEventListener('beforeunload', () => {
                if (UtilSheetDetachedReportState.win !== popup) return;
                UtilSheetDetachedReportState.win = null;
                const activeModal = getReportModal();
                if (activeModal) syncUtilSheetReportWindowState(activeModal);
            });
        }
        syncUtilSheetDetachedReportWindow(modal);
        syncUtilSheetReportWindowState(modal);
        if (popup.focus) popup.focus();
        return true;
    }

    function openUtilSheetAnalysisChartPopup(modal, chartKey = '') {
        if (!modal) return false;
        const nextChartKey = typeof runtime.normalizeUtilGasAnalysisPopupKey === 'function'
            ? runtime.normalizeUtilGasAnalysisPopupKey(modal, chartKey)
            : '';
        if (!nextChartKey) return false;
        let popup = getUtilSheetAnalysisChartPopupWindow();
        if (!popup) {
            const screenWidth = Number(globalScope?.screen?.availWidth) || Number(globalScope?.screen?.width) || 1520;
            const screenHeight = Number(globalScope?.screen?.availHeight) || Number(globalScope?.screen?.height) || 940;
            popup = globalScope.open(
                '',
                'util-sheet-analysis-chart-window',
                `popup=yes,width=${screenWidth},height=${screenHeight},left=0,top=0,resizable=yes,scrollbars=yes`
            );
            if (!popup) {
                globalScope.alert('차트 팝업을 열 수 없습니다. 브라우저 팝업 차단을 확인해 주세요.');
                return false;
            }
            popup.document.open();
            popup.document.write(buildUtilSheetAnalysisChartPopupShellHtml());
            popup.document.close();
            UtilSheetAnalysisChartPopupState.win = popup;
            popup.addEventListener('beforeunload', () => {
                if (UtilSheetAnalysisChartPopupState.win !== popup) return;
                UtilSheetAnalysisChartPopupState.win = null;
                UtilSheetAnalysisChartPopupState.chartKey = '';
            });
        }
        UtilSheetAnalysisChartPopupState.chartKey = nextChartKey;
        UtilSheetAnalysisChartPopupState.datasetKey = typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
            ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
            : '';
        syncUtilSheetAnalysisChartPopup(modal);
        maximizeUtilSheetAnalysisChartPopup(popup);
        if (popup.focus) popup.focus();
        return true;
    }

    function syncUtilSheetReportWindowState(modal) {
        if (!modal) return;
        const detachButton = modal.querySelector('[data-role="util-sheet-report-detach"]');
        const expandButton = modal.querySelector('[data-role="util-sheet-report-expand"]');
        const expandIcon = modal.querySelector('[data-role="util-sheet-report-expand-icon"]');
        const expandLabel = modal.querySelector('[data-role="util-sheet-report-expand-label"]');
        const isDetached = !!getUtilSheetDetachedReportWindow();
        const isExpanded = modal.classList.contains('is-expanded');
        if (detachButton) {
            const detachLabel = isDetached ? '팝업 열림' : '팝업';
            detachButton.classList.toggle('is-active', isDetached);
            detachButton.setAttribute('aria-label', detachLabel);
            detachButton.setAttribute('title', detachLabel);
        }
        if (expandButton) {
            const label = isExpanded ? '원래 크기' : '전체화면';
            expandButton.classList.toggle('is-active', isExpanded);
            expandButton.setAttribute('aria-label', label);
            expandButton.setAttribute('title', label);
        }
        if (expandIcon) {
            expandIcon.className = `fa-solid ${isExpanded ? 'fa-compress' : 'fa-expand'}`;
        }
        if (expandLabel) {
            expandLabel.textContent = isExpanded ? '원래 크기' : '전체화면';
        }
    }

    globalScope.KPIUtilReportSheetWindows = {
        setRuntimeAdapters,
        getUtilSheetDetachedReportWindow,
        closeUtilSheetDetachedReportWindow,
        getUtilSheetAnalysisChartPopupWindow,
        closeUtilSheetAnalysisChartPopupWindow,
        getUtilSheetDetachedHeadAssetsHtml,
        buildUtilSheetDetachedReportShellHtml,
        buildUtilSheetAnalysisChartPopupShellHtml,
        syncUtilSheetDetachedReportWindow,
        maximizeUtilSheetAnalysisChartPopup,
        syncUtilSheetAnalysisChartPopup,
        bindUtilSheetAnalysisChartDragScroll,
        bindUtilSheetAnalysisInlineTableDrag,
        bindUtilSheetDetachedReportWindowDrag,
        bindUtilSheetAnalysisChartPopupInteractions,
        bindUtilSheetDetachedReportWindowInteractions,
        openUtilSheetDetachedReportWindow,
        openUtilSheetAnalysisChartPopup,
        syncUtilSheetReportWindowState
    };
})(typeof window !== 'undefined' ? window : globalThis);
