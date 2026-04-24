        function ensureUtilReportBuilderVizRatioAppliedControls(modal) {
            if (!modal) return;
            const ratioPanelEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-panel"]');
            const ratioToolsEl = ratioPanelEl?.querySelector('.util-report-builder-viz-panel-tools');
            if (!ratioPanelEl || !ratioToolsEl) return;

            const baseField = ratioToolsEl.querySelector('[data-role="util-report-builder-viz-applied-base-year"]')?.closest('.util-report-builder-viz-field');
            const compareField = ratioToolsEl.querySelector('[data-role="util-report-builder-viz-applied-compare-year"]')?.closest('.util-report-builder-viz-field');
            [baseField, compareField].forEach(field => {
                if (field) field.setAttribute('data-role', 'util-report-builder-viz-applied-year-field');
            });

            if (!ratioToolsEl.querySelector('[data-role="util-report-builder-viz-applied-toggle"]')) {
                const appliedField = document.createElement('div');
                appliedField.className = 'util-report-builder-viz-field is-sm';
                appliedField.innerHTML = `
                    <label>적용</label>
                    <button
                        type="button"
                        class="util-report-chart-type-toggle"
                        data-role="util-report-builder-viz-applied-toggle"
                        aria-pressed="false"
                    >적용</button>
                `;
                ratioToolsEl.insertBefore(appliedField, baseField || ratioToolsEl.firstChild);
            }
        }

        function ensureUtilReportBuilderVizModal() {
            let modal = document.getElementById('util-report-builder-viz-modal');
            if (modal) {
                ensureUtilReportBuilderVizRatioAppliedControls(modal);
                bindUtilReportBuilderVizViewportDrag(modal);
                return modal;
            }

            modal = document.createElement('div');
            modal.id = 'util-report-builder-viz-modal';
            modal.className = 'util-report-builder-viz-modal';
            modal.innerHTML = `
                <div class="util-report-builder-viz-card" role="dialog" aria-modal="true" aria-label="보고서 생성 전용 화면">
                    <div class="util-report-builder-viz-head">
                        <div>
                            <div class="util-report-builder-viz-title">보고서 생성 전용 화면</div>
                            <div class="util-report-builder-viz-sub" data-role="util-report-builder-viz-sub">기간: -</div>
                        </div>
                        <div class="util-report-builder-viz-actions">
                            <button type="button" class="util-report-builder-viz-btn" data-role="util-report-builder-viz-inline-detach">표 분리</button>
                            <button type="button" class="util-report-builder-viz-btn util-report-builder-viz-icon-btn" data-role="util-report-builder-viz-chart-fullscreen-toggle" aria-label="차트 확대" title="차트 확대"><i class="fas fa-expand" aria-hidden="true"></i></button>
                            <button type="button" class="util-report-builder-viz-btn" data-role="util-report-builder-viz-chart-view-toggle">비율</button>
                            <button type="button" class="util-report-builder-viz-btn primary" data-role="util-report-builder-viz-close">닫기</button>
                        </div>
                    </div>
                    <div class="util-report-builder-viz-controls">
                        <div class="util-report-builder-viz-control-row">
                            <div class="util-report-builder-viz-group">
                                <div class="util-report-builder-viz-fields">
                                    <div class="util-report-builder-viz-field is-lg">
                                        <label>시작</label>
                                        <select data-role="util-report-builder-viz-from"></select>
                                    </div>
                                    <div class="util-report-builder-viz-field is-lg">
                                        <label>끝</label>
                                        <select data-role="util-report-builder-viz-to"></select>
                                    </div>
                                </div>
                            </div>
                            <div class="util-report-builder-viz-group">
                                <div class="util-report-builder-viz-unit-shell" data-role="util-report-builder-viz-unit-shell">
                                    <button type="button" class="util-report-builder-viz-unit-toggle" data-role="util-report-builder-viz-unit-toggle" aria-expanded="false">단위</button>
                                    <div class="util-report-builder-viz-unit-popover" data-role="util-report-builder-viz-unit-popover" hidden>
                                        <div class="util-report-builder-viz-unit-grid">
                                            <div class="util-report-builder-viz-unit-row">
                                                <span class="name">사용량</span>
                                                <select data-role="util-report-builder-viz-usage-unit"></select>
                                                <select data-role="util-report-builder-viz-usage-decimals"></select>
                                            </div>
                                            <div class="util-report-builder-viz-unit-row">
                                                <span class="name">비용</span>
                                                <select data-role="util-report-builder-viz-cost-unit"></select>
                                                <select data-role="util-report-builder-viz-cost-decimals"></select>
                                            </div>
                                            <div class="util-report-builder-viz-unit-row">
                                                <span class="name">생산량</span>
                                                <select data-role="util-report-builder-viz-production-unit"></select>
                                                <select data-role="util-report-builder-viz-production-decimals"></select>
                                            </div>
                                            <div class="util-report-builder-viz-unit-row is-ratio">
                                                <span class="name">분수</span>
                                                <select data-role="util-report-builder-viz-ratio-numerator"></select>
                                                <span class="slash">/</span>
                                                <select data-role="util-report-builder-viz-ratio-denominator"></select>
                                            </div>
                                            <div class="util-report-builder-viz-unit-row is-ratio-decimals">
                                                <span class="name">분수소수</span>
                                                <select data-role="util-report-builder-viz-ratio-decimals"></select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="util-report-builder-viz-body">
                        <div class="util-report-builder-viz-kpis" data-role="util-report-builder-viz-kpis"></div>
                        <div class="util-report-builder-viz-panel" data-role="util-report-builder-viz-main-panel">
                            <div class="util-report-builder-viz-panel-head">
                                <div class="util-report-builder-viz-panel-title">사용량 · 비용 · 생산량</div>
                                <div class="util-report-builder-viz-panel-tools">
                                    <div class="util-report-builder-viz-field is-sm">
                                        <label>사용량</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-usage-type-toggle" data-chart-type="bar">막대</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm">
                                        <label>비용</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-cost-type-toggle" data-chart-type="line">선</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm">
                                        <label>생산량</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-production-type-toggle" data-chart-type="line">선</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-label">
                                        <label>레이블</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-label-toggle" aria-pressed="false">레이블</button>
                                    </div>
                                </div>
                                <div class="util-report-builder-viz-panel-note" data-role="util-report-builder-viz-main-note">항목별 선/막대 선택 · 항목별 최소/최대 독립 스케일</div>
                            </div>
                            <div class="util-report-builder-viz-scroll" data-role="util-report-builder-viz-main-chart"></div>
                            <div class="util-report-builder-viz-detail" data-role="util-report-builder-viz-main-detail"></div>
                        </div>
                        <div class="util-report-builder-viz-panel" data-role="util-report-builder-viz-ratio-panel">
                            <div class="util-report-builder-viz-panel-head">
                                <div class="util-report-builder-viz-panel-title" data-role="util-report-builder-viz-ratio-title">비율</div>
                                <div class="util-report-builder-viz-panel-tools">
                                    <div class="util-report-builder-viz-field is-sm">
                                        <label>원단위 기준</label>
                                        <select data-role="util-report-builder-viz-applied-base-year"></select>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm">
                                        <label>적용 대상</label>
                                        <select data-role="util-report-builder-viz-applied-compare-year"></select>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-type-field">
                                        <label>비율</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-type-toggle" data-chart-type="line">선</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-actual-type-field" hidden>
                                        <label>실제값</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-actual-type-toggle" data-chart-type="line">선</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-sm" data-role="util-report-builder-viz-ratio-applied-type-field" hidden>
                                        <label>적용값</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-ratio-applied-type-toggle" data-chart-type="line">선</button>
                                    </div>
                                    <div class="util-report-builder-viz-field is-label">
                                        <label>레이블</label>
                                        <button type="button" class="util-report-chart-type-toggle" data-role="util-report-builder-viz-label-toggle" aria-pressed="false">레이블</button>
                                    </div>
                                </div>
                                <div class="util-report-builder-viz-panel-note">그래프 클릭 시 해당 월 값 강조</div>
                            </div>
                            <div class="util-report-builder-viz-scroll is-ratio" data-role="util-report-builder-viz-ratio-chart"></div>
                            <div class="util-report-builder-viz-detail" data-role="util-report-builder-viz-ratio-detail"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            ensureUtilReportBuilderVizRatioAppliedControls(modal);
            bindUtilReportBuilderVizViewportDrag(modal);

            modal.addEventListener('click', event => {
                const unitToggleButton = event.target.closest('[data-role="util-report-builder-viz-unit-toggle"]');
                if (unitToggleButton) {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleUtilReportBuilderVizUnitPopover(modal);
                    return;
                }
                const unitShell = modal.querySelector('[data-role="util-report-builder-viz-unit-shell"]');
                if (unitShell && !unitShell.contains(event.target)) {
                    closeUtilReportBuilderVizUnitPopover(modal);
                }
                if (event.target === modal) {
                    closeUtilReportBuilderVizModal(true);
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-close"]')) {
                    closeUtilReportBuilderVizModal(true);
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-inline-detach"]')) {
                    if (UtilReportBuilderVizDetachedTableState.detached) {
                        closeUtilReportBuilderVizDetachedTableWindow();
                    } else {
                        openUtilReportBuilderVizDetachedTableWindow(modal._builderVizData || (UtilReportBuilderVizState.hasGenerated === true ? buildUtilReportBuilderVizData() : null));
                    }
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-chart-fullscreen-toggle"]')) {
                    UtilReportBuilderVizState.chartFullscreen = !(UtilReportBuilderVizState.chartFullscreen === true);
                    renderUtilReportBuilderVizModal();
                    return;
                }
                const labelToggleBtn = event.target.closest('[data-role="util-report-builder-viz-label-toggle"]');
                if (labelToggleBtn) {
                    UtilReportBuilderVizState.showLabels = !(UtilReportBuilderVizState.showLabels === true);
                    UtilReportState.showChartLabels = UtilReportBuilderVizState.showLabels === true;
                    modal.querySelectorAll('[data-role="util-report-builder-viz-label-toggle"]').forEach(button => {
                        syncUtilReportBuilderVizLabelToggleButton(button, UtilReportBuilderVizState.showLabels === true);
                    });
                    syncUtilDualSectionFromReportBuilderViz(UtilReportBuilderVizState.itemKey);
                    if (UtilReportBuilderVizState.hasGenerated === true) {
                        renderUtilReportBuilderVizModal();
                    }
                    return;
                }
                const appliedToggleBtn = event.target.closest('[data-role="util-report-builder-viz-applied-toggle"]');
                if (appliedToggleBtn) {
                    UtilReportBuilderVizState.appliedModeEnabled = !(UtilReportBuilderVizState.appliedModeEnabled === true);
                    if (UtilReportBuilderVizState.appliedModeEnabled === true) {
                        const defaultYears = resolveUtilReportBuilderVizDefaultAppliedYears();
                        if (!UtilReportBuilderVizState.appliedBaseYear) {
                            UtilReportBuilderVizState.appliedBaseYear = defaultYears.baseYear;
                        }
                        if (!UtilReportBuilderVizState.appliedCompareYear) {
                            UtilReportBuilderVizState.appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                                defaultYears.compareYear,
                                UtilReportBuilderVizState.appliedBaseYear
                            );
                        }
                    }
                    syncUtilReportBuilderVizControls(modal);
                    UtilReportBuilderVizState.hasGenerated = true;
                    UtilReportBuilderVizState.isDirty = false;
                    renderUtilReportBuilderVizModal();
                    return;
                }
                const monthHitTarget = event.target.closest('[data-role="util-chart-month-hit"]');
                if (monthHitTarget) {
                    const monthKey = normalizeUtilReportMonthKey(monthHitTarget.getAttribute('data-month-key') || '');
                    const seriesKey = normalizeUtilReportBuilderVizSeriesKey(
                        monthHitTarget.getAttribute('data-series-key')
                        || UtilReportBuilderVizState.isolatedSeriesKey
                    );
                    if (monthKey) {
                        UtilReportBuilderVizState.focusMonthKey = monthKey;
                        UtilReportBuilderVizState.pendingDetailScroll = true;
                    }
                    if (seriesKey) {
                        UtilReportBuilderVizState.focusSeriesKey = seriesKey;
                        UtilReportBuilderVizState.detailFocusSeriesKey = seriesKey;
                    } else {
                        UtilReportBuilderVizState.detailFocusSeriesKey = '';
                    }
                    if (UtilReportBuilderVizState.hasGenerated === true) {
                        renderUtilReportBuilderVizModal();
                    }
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-viz-chart-view-toggle"]')) {
                    toggleUtilReportBuilderVizChartView(modal);
                    if (UtilReportBuilderVizState.hasGenerated === true) {
                        renderUtilReportBuilderVizModal();
                    } else {
                        syncUtilReportBuilderVizChartView(modal);
                    }
                    modal.querySelector(getUtilReportBuilderVizActivePanelSelector())?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    return;
                }
                const typeToggleBtn = event.target.closest('[data-role="util-report-builder-viz-usage-type-toggle"], [data-role="util-report-builder-viz-cost-type-toggle"], [data-role="util-report-builder-viz-production-type-toggle"], [data-role="util-report-builder-viz-ratio-type-toggle"], [data-role="util-report-builder-viz-ratio-actual-type-toggle"], [data-role="util-report-builder-viz-ratio-applied-type-toggle"]');
                if (typeToggleBtn) {
                    const role = typeToggleBtn.getAttribute('data-role') || '';
                    const currentType = role === 'util-report-builder-viz-usage-type-toggle'
                        ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar')
                        : (role === 'util-report-builder-viz-cost-type-toggle'
                            ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line')
                            : (role === 'util-report-builder-viz-production-type-toggle'
                                ? normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line')
                                : (role === 'util-report-builder-viz-ratio-actual-type-toggle'
                                    ? normalizeUtilReportBuilderVizChartType(
                                        normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType)
                                        || UtilReportBuilderVizState.ratioChartType
                                        || 'line'
                                    )
                                    : (role === 'util-report-builder-viz-ratio-applied-type-toggle'
                                        ? normalizeUtilReportBuilderVizChartType(
                                            normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType)
                                            || UtilReportBuilderVizState.ratioChartType
                                            || 'line'
                                        )
                                        : normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.ratioChartType || 'line')))));
                    const allowNone = role === 'util-report-builder-viz-usage-type-toggle'
                        || role === 'util-report-builder-viz-cost-type-toggle'
                        || role === 'util-report-builder-viz-production-type-toggle';
                    const nextType = getUtilReportBuilderVizNextChartType(currentType, allowNone);
                    if (role === 'util-report-builder-viz-usage-type-toggle') {
                        UtilReportBuilderVizState.usageChartType = nextType;
                    } else if (role === 'util-report-builder-viz-cost-type-toggle') {
                        UtilReportBuilderVizState.costChartType = nextType;
                    } else if (role === 'util-report-builder-viz-production-type-toggle') {
                        UtilReportBuilderVizState.productionChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-actual-type-toggle') {
                        UtilReportBuilderVizState.ratioActualChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-applied-type-toggle') {
                        UtilReportBuilderVizState.ratioAppliedChartType = nextType;
                    } else if (role === 'util-report-builder-viz-ratio-type-toggle') {
                        UtilReportBuilderVizState.ratioChartType = nextType;
                    }
                    syncUtilReportChartTypeToggleButton(typeToggleBtn, nextType);
                    UtilReportBuilderVizState.hasGenerated = true;
                    UtilReportBuilderVizState.isDirty = false;
                    renderUtilReportBuilderVizModal();
                    return;
                }
                const seriesBtn = event.target.closest('[data-role="util-report-builder-viz-series-item"]');
                if (seriesBtn) {
                    const seriesKey = normalizeUtilReportBuilderVizSeriesKey(seriesBtn.dataset.seriesKey);
                    if (!seriesKey) return;
                    if (window.__utilReportBuilderVizSeriesClickTimer) {
                        clearTimeout(window.__utilReportBuilderVizSeriesClickTimer);
                        window.__utilReportBuilderVizSeriesClickTimer = null;
                    }
                    if (event.detail > 1) return;
                    window.__utilReportBuilderVizSeriesClickTimer = window.setTimeout(() => {
                        const isolated = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.isolatedSeriesKey);
                        if (isolated && isolated === seriesKey) {
                            UtilReportBuilderVizState.focusSeriesKey = seriesKey;
                            UtilReportBuilderVizState.detailFocusSeriesKey = seriesKey;
                        } else {
                            UtilReportBuilderVizState.isolatedSeriesKey = '';
                            UtilReportBuilderVizState.focusSeriesKey = UtilReportBuilderVizState.focusSeriesKey === seriesKey ? '' : seriesKey;
                            UtilReportBuilderVizState.detailFocusSeriesKey = UtilReportBuilderVizState.focusSeriesKey;
                        }
                        UtilReportBuilderVizState.pendingDetailScroll = false;
                        if (UtilReportBuilderVizState.hasGenerated === true) {
                            renderUtilReportBuilderVizModal();
                        }
                    }, 180);
                    return;
                }
            });

            modal.addEventListener('dblclick', event => {
                const seriesBtn = event.target.closest('[data-role="util-report-builder-viz-series-item"]');
                if (!seriesBtn) return;
                if (window.__utilReportBuilderVizSeriesClickTimer) {
                    clearTimeout(window.__utilReportBuilderVizSeriesClickTimer);
                    window.__utilReportBuilderVizSeriesClickTimer = null;
                }
                const seriesKey = normalizeUtilReportBuilderVizSeriesKey(seriesBtn.dataset.seriesKey);
                if (!seriesKey) return;
                const nextIsolatedKey = UtilReportBuilderVizState.isolatedSeriesKey === seriesKey ? '' : seriesKey;
                UtilReportBuilderVizState.isolatedSeriesKey = nextIsolatedKey;
                UtilReportBuilderVizState.focusSeriesKey = nextIsolatedKey || seriesKey;
                UtilReportBuilderVizState.detailFocusSeriesKey = nextIsolatedKey || seriesKey;
                UtilReportBuilderVizState.pendingDetailScroll = false;
                if (UtilReportBuilderVizState.hasGenerated === true) {
                    renderUtilReportBuilderVizModal();
                }
                event.preventDefault();
            });

            modal.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role.startsWith('util-report-builder-viz-')) return;
                if (role === 'util-report-builder-viz-ratio-numerator' || role === 'util-report-builder-viz-ratio-denominator') {
                    syncUtilReportBuilderVizRatioSelects(modal);
                }
                if (
                    role === 'util-report-builder-viz-from'
                    || role === 'util-report-builder-viz-to'
                    || role === 'util-report-builder-viz-applied-base-year'
                    || role === 'util-report-builder-viz-applied-compare-year'
                ) {
                    syncUtilReportBuilderVizAppliedYearSelects(modal);
                }
                collectUtilReportBuilderVizStateFromModal(modal);
                syncUtilDualSectionFromReportBuilderViz(UtilReportBuilderVizState.itemKey);
                UtilReportBuilderVizState.hasGenerated = true;
                UtilReportBuilderVizState.isDirty = false;
                renderUtilReportBuilderVizModal();
            });

            if (!window.__utilReportBuilderVizKeyBound) {
                window.__utilReportBuilderVizKeyBound = true;
                document.addEventListener('keydown', event => {
                    const opened = document.getElementById('util-report-builder-viz-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        closeUtilReportBuilderVizModal(true);
                        return;
                    }
                    if (event.key !== 'Backspace') return;
                    if (event.defaultPrevented) return;
                    if (isEditableTarget(event.target)) return;
                    event.preventDefault();
                    event.stopPropagation();
                    closeUtilReportBuilderVizModal(true);
                }, true);
            }
            if (!window.__utilReportBuilderVizResizeBound) {
                window.__utilReportBuilderVizResizeBound = true;
                window.addEventListener('resize', () => {
                    const opened = document.getElementById('util-report-builder-viz-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    if (UtilReportBuilderVizState.hasGenerated !== true) return;
                    renderUtilReportBuilderVizModal();
                });
            }

            return modal;
        }

        function openUtilReportBuilderVizModal() {
            const modal = ensureUtilReportBuilderVizModal();
            syncUtilReportBuilderVizStateFromReportState();
            UtilReportBuilderVizState.chartFullscreen = false;
            closeUtilReportBuilderVizUnitPopover(modal);
            syncUtilReportBuilderVizControls(modal);
            UtilReportBuilderVizState.hasGenerated = true;
            UtilReportBuilderVizState.isDirty = false;
            renderUtilReportBuilderVizModal();
            modal.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }

        function closeUtilReportBuilderVizModal(keepBodyLock = false) {
            const modal = document.getElementById('util-report-builder-viz-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            modal.classList.remove('is-chart-fullscreen');
            closeUtilReportBuilderVizUnitPopover(modal);
            UtilReportBuilderVizState.chartFullscreen = false;
            closeUtilReportBuilderVizDetachedTableWindow();
            if (keepBodyLock) return;
            const reportOpen = document.getElementById('util-report-modal')?.classList.contains('is-open');
            const graphOpen = document.getElementById('util-report-graph-modal')?.classList.contains('is-open');
            const yoyOpen = document.getElementById('util-report-yoy-modal')?.classList.contains('is-open');
            const energyOpen = document.getElementById('util-energy-modal')?.classList.contains('is-open');
            if (!reportOpen && !graphOpen && !yoyOpen && !energyOpen) {
                document.body.style.overflow = '';
            }
        }

        function ensureUtilReportBuilderModal() {
            let modal = document.getElementById('util-report-builder-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'util-report-builder-modal';
            modal.className = 'util-report-builder-modal';
            modal.innerHTML = `
                <div class="util-report-builder-card" role="dialog" aria-modal="true" aria-label="보고서 생성 설정">
                    <div class="util-report-builder-head">
                        <div>
                            <div class="util-report-builder-title">보고서 생성</div>
                            <div class="util-report-builder-sub">기간, 팀, 항목을 체크하면 보고서가 즉시 갱신됩니다.</div>
                        </div>
                        <button type="button" class="util-report-builder-close" data-role="util-report-builder-close">닫기</button>
                    </div>
                    <div class="util-report-builder-body">
                        <div class="util-report-builder-group">
                            <div class="util-report-builder-group-title">기간</div>
                            <div class="util-report-builder-range">
                                <div class="util-report-builder-field">
                                    <label>시작</label>
                                    <select data-role="util-report-builder-from"></select>
                                </div>
                                <div class="util-report-builder-field">
                                    <label>끝</label>
                                    <select data-role="util-report-builder-to"></select>
                                </div>
                            </div>
                        </div>
                        <div class="util-report-builder-group">
                            <div class="util-report-builder-group-title">팀</div>
                            <div class="util-report-builder-check-grid" data-role="util-report-builder-team-wrap"></div>
                        </div>
                        <div class="util-report-builder-group">
                            <div class="util-report-builder-group-title">항목</div>
                            <div class="util-report-builder-check-grid">
                                ${UTIL_REPORT_BUILDER_ITEM_OPTIONS.map(scope => `
                                    <label class="util-report-builder-check ${scope.enabled === false ? 'is-disabled' : ''}">
                                        <input type="checkbox" data-role="util-report-builder-item-check" value="${escapeHtml(scope.key)}" ${scope.enabled === false ? 'disabled' : ''} />
                                        <span>${escapeHtml(scope.label)}</span>
                                    </label>
                                `).join('')}
                            </div>
                        </div>
                        <div class="util-report-builder-group">
                            <div class="util-report-builder-group-title">값</div>
                            <div class="util-report-builder-check-grid" data-role="util-report-builder-value-wrap"></div>
                        </div>
                    </div>
                    <div class="util-report-builder-foot">
                        <button type="button" class="util-report-builder-btn" data-role="util-report-builder-close">취소</button>
                        <button type="button" class="util-report-builder-btn primary" data-role="util-report-builder-apply">적용</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeUtilReportBuilderModal();
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-close"]')) {
                    closeUtilReportBuilderModal();
                    return;
                }
                if (event.target.closest('[data-role="util-report-builder-apply"]')) {
                    const nextState = collectUtilReportBuilderStateFromModal(modal);
                    applyUtilReportBuilderState(nextState);
                    closeUtilReportBuilderModal(true);
                    const reportModal = ensureUtilReportModal();
                    syncUtilReportModalControls(reportModal);
                    if (UtilReportState.builderCustomMode) {
                        const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey);
                        const valueKeys = normalizeUtilReportBuilderValueKeys(itemKey, UtilReportState.builderValueKeys);
                        const primaryMetricKey = valueKeys.length ? valueKeys[0] : resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
                        UtilReportState.metricKey = primaryMetricKey;
                        UtilReportState.activeMetricCard = primaryMetricKey;
                    }
                    runUtilReportFromState({ renderModal: true });
                }
            });

            modal.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role) return;
                if (role === 'util-report-builder-team-check') {
                    const teamInputs = Array.from(modal.querySelectorAll('[data-role="util-report-builder-team-check"]'));
                    if (event.target.checked) {
                        teamInputs.forEach(input => {
                            if (input !== event.target) input.checked = false;
                        });
                    } else if (!teamInputs.some(input => input.checked)) {
                        const fallback = teamInputs.find(input => String(input.value || '').trim() === '전체') || teamInputs[0];
                        if (fallback) fallback.checked = true;
                    }
                }
                if (role === 'util-report-builder-item-check') {
                    const itemInputs = Array.from(modal.querySelectorAll('[data-role="util-report-builder-item-check"]'))
                        .filter(input => !input.disabled);
                    if (event.target.checked) {
                        itemInputs.forEach(input => {
                            if (input !== event.target) input.checked = false;
                        });
                    } else if (!itemInputs.some(input => input.checked)) {
                        const fallback = itemInputs[0];
                        if (fallback) fallback.checked = true;
                    }
                    const selectedInput = itemInputs.find(input => input.checked);
                    const itemKey = normalizeUtilReportBuilderItemKey(selectedInput?.value || 'electric');
                    const selectedTeamInput = Array.from(modal.querySelectorAll('[data-role="util-report-builder-team-check"]'))
                        .find(input => input.checked);
                    const nextTeam = normalizeUtilReportBuilderTeam(selectedTeamInput?.value || UtilReportBuilderState.team, itemKey);
                    renderUtilReportBuilderTeamChecks(modal, itemKey, nextTeam);
                    renderUtilReportBuilderValueChecks(
                        modal,
                        itemKey,
                        getUtilReportBuilderValueOptions(itemKey).map(item => item.key)
                    );
                }
                if (role === 'util-report-builder-value-check') {
                    const valueInputs = Array.from(modal.querySelectorAll('[data-role="util-report-builder-value-check"]'));
                    if (!valueInputs.some(input => input.checked)) {
                        event.target.checked = true;
                    }
                }
            });

            if (!window.__utilReportBuilderEscapeBound) {
                window.__utilReportBuilderEscapeBound = true;
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    const opened = document.getElementById('util-report-builder-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    closeUtilReportBuilderModal(true);
                });
            }

            return modal;
        }

        function openUtilReportBuilderModal(itemKey = '', teamName = '') {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey || UtilReportState.builderItemKey || UtilReportState.scopeKey || 'electric');
            const normalizedTeam = normalizeUtilReportBuilderTeam(teamName || UtilReportBuilderVizState.team || '전체', normalizedItemKey);
            UtilReportState.builderItemKey = normalizedItemKey;
            UtilReportState.scopeKey = normalizeUtilReportScope(normalizedItemKey);
            UtilReportState.selectedScopeKeys = [normalizedItemKey];
            if (normalizedItemKey === 'electric') UtilReportState.electricTeam = resolveUtilReportBuilderTeamFilter(normalizedTeam, normalizedItemKey);
            else if (normalizedItemKey === 'gas') UtilReportState.gasTeam = resolveUtilReportBuilderTeamFilter(normalizedTeam, normalizedItemKey);
            else if (normalizedItemKey === 'waste') UtilReportState.wasteTeam = resolveUtilReportBuilderTeamFilter(normalizedTeam, normalizedItemKey);
            UtilReportBuilderVizState.itemKey = normalizedItemKey;
            UtilReportBuilderVizState.team = normalizedTeam;
            UtilReportBuilderVizState.usageUnitKey = normalizeUtilReportBuilderVizUsageUnitKey(
                UtilReportBuilderVizState.usageUnitKey,
                normalizedItemKey
            );
            if (typeof openUtilReportBuilderVizPopupWindow === 'function') {
                const popup = openUtilReportBuilderVizPopupWindow();
                if (popup) {
                    const inlineModal = document.getElementById('util-report-builder-viz-modal');
                    if (inlineModal?.classList.contains('is-open')) {
                        closeUtilReportBuilderVizModal();
                    }
                    return;
                }
            }
            openUtilReportBuilderVizModal();
        }

        function toggleUtilInlineReport(itemKey = '', teamName = '') {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey || UtilReportState.builderItemKey || UtilReportBuilderVizState.itemKey || 'electric');
            const normalizedTeam = normalizeUtilReportBuilderTeam(teamName || UtilReportBuilderVizState.team || '전체', normalizedItemKey);
            openUtilReportBuilderModal(normalizedItemKey, normalizedTeam);
            return true;
        }

        function closeUtilReportBuilderModal(keepBodyLock = false) {
            const modal = document.getElementById('util-report-builder-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            if (keepBodyLock) return;
            const reportOpen = document.getElementById('util-report-modal')?.classList.contains('is-open');
            const graphOpen = document.getElementById('util-report-graph-modal')?.classList.contains('is-open');
            const yoyOpen = document.getElementById('util-report-yoy-modal')?.classList.contains('is-open');
            if (!reportOpen && !graphOpen && !yoyOpen) {
                document.body.style.overflow = '';
            }
        }

        function ensureUtilReportGraphModal() {
            let modal = document.getElementById('util-report-graph-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'util-report-graph-modal';
            modal.className = 'util-report-graph-modal';
            modal.innerHTML = `
                <div class="util-report-graph-modal-card" role="dialog" aria-modal="true" aria-label="그래프 생성 팝업">
                    <div class="util-report-graph-modal-head">
                        <div class="util-report-graph-modal-header">
                            <div>
                                <div class="util-report-graph-modal-title">원단위 그래프 생성</div>
                                <div class="util-report-graph-modal-sub" data-role="util-report-graph-sub">기간: -</div>
                            </div>
                            <button type="button" class="util-report-graph-modal-close" data-role="util-report-graph-close">닫기</button>
                        </div>
                        <div class="util-report-graph-modal-controls">
                            <div class="util-report-graph-modal-field">
                                <label>년도</label>
                                <select data-role="util-report-graph-year"></select>
                            </div>
                            <div class="util-report-graph-modal-field">
                                <label>분자</label>
                                <select data-role="util-report-graph-numerator"></select>
                            </div>
                            <label class="util-report-graph-modal-toggle">
                                <input type="checkbox" data-role="util-report-graph-denominator-toggle" />
                                분모 사용
                            </label>
                            <div class="util-report-graph-modal-field" data-role="util-report-graph-denominator-field">
                                <label>분모</label>
                                <select data-role="util-report-graph-denominator"></select>
                            </div>
                            <div class="util-report-graph-modal-field">
                                <label>그래프</label>
                                <button type="button" class="util-report-chart-type-toggle" data-role="util-report-graph-chart-type-toggle" data-chart-type="line">선</button>
                            </div>
                        </div>
                    </div>
                    <div class="util-report-graph-modal-body">
                        <div class="util-report-graph-shell" data-role="util-report-graph-chart"></div>
                        <div class="util-report-graph-detail" data-role="util-report-graph-detail"></div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeUtilReportGraphModal();
                    return;
                }
                if (event.target.closest('[data-role="util-report-graph-close"]')) {
                    closeUtilReportGraphModal();
                    return;
                }
                const chartTypeToggleBtn = event.target.closest('[data-role="util-report-graph-chart-type-toggle"]');
                if (chartTypeToggleBtn) {
                    UtilReportState.graphChartType = UtilReportState.graphChartType === 'line' ? 'bar' : 'line';
                    syncUtilReportChartTypeToggleButton(chartTypeToggleBtn, UtilReportState.graphChartType);
                    renderUtilReportGraphModal(UtilReportState.lastResult);
                    return;
                }
                const monthHitTarget = event.target.closest('[data-role="util-chart-month-hit"]');
                if (monthHitTarget) {
                    const monthKey = normalizeUtilReportMonthKey(monthHitTarget.getAttribute('data-month-key') || '');
                    if (monthKey) {
                        modal.dataset.graphFocusMonthKey = monthKey;
                        renderUtilReportGraphModal(UtilReportState.lastResult);
                    }
                }
            });

            modal.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role.startsWith('util-report-graph-')) return;
                collectUtilReportGraphStateFromModal(modal);
                renderUtilReportGraphModal(UtilReportState.lastResult);
            });

            if (!window.__utilReportGraphModalEscapeBound) {
                window.__utilReportGraphModalEscapeBound = true;
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    const opened = document.getElementById('util-report-graph-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    closeUtilReportGraphModal();
                });
            }

            return modal;
        }

        function renderUtilReportGraphDetailTable(points, graphMeta, useDenominator) {
            const focusMonthKey = normalizeUtilReportMonthKey(graphMeta?.focusMonthKey || '');
            const rows = Array.isArray(points)
                ? points.filter(point => Number.isFinite(Number(point?.value)))
                : [];
            if (!rows.length) {
                return '<div class="util-report-graph-detail-empty">표시할 상세표 데이터가 없습니다.</div>';
            }
            const valueDigits = useDenominator ? Math.max(3, UtilReportState.decimals) : UtilReportState.decimals;
            const numberDigits = UtilReportState.decimals;
            let prevValue = NaN;
            const bodyHtml = rows.map(point => {
                const monthKey = normalizeUtilReportMonthKey(point?.key || point?.label || '');
                const monthLabel = formatUtilReportMonthOnly(point?.key || point?.label || '-');
                const numerator = Number(point?.numerator);
                const denominator = Number(point?.denominator);
                const value = Number(point?.value);
                const delta = Number.isFinite(prevValue) ? (value - prevValue) : NaN;
                prevValue = value;
                const deltaClass = !Number.isFinite(delta)
                    ? ''
                    : (delta > 0 ? 'util-report-builder-viz-detail-delta-up' : (delta < 0 ? 'util-report-builder-viz-detail-delta-down' : ''));
                const deltaText = Number.isFinite(delta)
                    ? `${delta > 0 ? '+' : ''}${formatUtilNumber(delta, valueDigits)}`
                    : '-';
                const rowClass = focusMonthKey && focusMonthKey === monthKey ? ' class="is-focused"' : '';
                const valueCellClass = focusMonthKey && focusMonthKey === monthKey ? ' class="is-cell-focused"' : '';
                return `
                    <tr data-month-key="${escapeHtml(monthKey)}" data-month-token="${escapeHtml(monthLabel)}"${rowClass}>
                        <td>${escapeHtml(monthLabel)}</td>
                        <td>${Number.isFinite(numerator) ? escapeHtml(formatUtilNumber(numerator, numberDigits)) : '-'}</td>
                        ${useDenominator ? `<td>${Number.isFinite(denominator) ? escapeHtml(formatUtilNumber(denominator, numberDigits)) : '-'}</td>` : ''}
                        <td${valueCellClass}>${escapeHtml(formatUtilNumber(value, valueDigits))}</td>
                        <td class="${deltaClass}">${escapeHtml(deltaText)}</td>
                    </tr>
                `;
            }).join('');
            return `
                <table class="util-report-yoy-table">
                    <thead>
                        <tr>
                            <th>월</th>
                            <th>${escapeHtml(String(graphMeta?.numeratorLabel || '분자'))}</th>
                            ${useDenominator ? `<th>${escapeHtml(String(graphMeta?.denominatorLabel || '분모'))}</th>` : ''}
                            <th>${escapeHtml(String(graphMeta?.metricLabel || '값'))}</th>
                            <th>전월대비</th>
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            `;
        }

        function renderUtilReportGraphModal(result) {
            const modal = ensureUtilReportGraphModal();
            const chartEl = modal.querySelector('[data-role="util-report-graph-chart"]');
            const detailEl = modal.querySelector('[data-role="util-report-graph-detail"]');
            const subEl = modal.querySelector('[data-role="util-report-graph-sub"]');
            const data = result || UtilReportState.lastResult || null;
            if (!chartEl) return;

            syncUtilReportGraphModalControls(modal, data || {});

            if (!data || !Array.isArray(data.rows) || !data.rows.length) {
                if (subEl) subEl.textContent = '기간: 데이터 없음';
                chartEl.innerHTML = '<div class="util-report-graph-empty">그래프 데이터가 없습니다.</div>';
                if (detailEl) detailEl.innerHTML = '<div class="util-report-graph-detail-empty">표시할 상세표 데이터가 없습니다.</div>';
                return;
            }

            const yearOptions = getUtilReportAllYearOptions(data);
            UtilReportState.graphYear = normalizeUtilReportYear(UtilReportState.graphYear || UtilReportState.chartYear, yearOptions);
            const graphMeta = buildUtilReportCustomGraphMeta(
                UtilReportState.scopeKey,
                UtilReportState.graphNumeratorMetric,
                UtilReportState.graphDenominatorMetric,
                UtilReportState.graphUseDenominator
            );
            const graphPoints = buildUtilReportCustomGraphPoints(
                data,
                UtilReportState.graphNumeratorMetric,
                UtilReportState.graphDenominatorMetric,
                UtilReportState.graphUseDenominator,
                UtilReportState.graphYear
            );
            const focusMonthKey = normalizeUtilReportMonthKey(modal.dataset.graphFocusMonthKey || '');
            const hasValue = graphPoints.some(point => Number.isFinite(point.value));
            if (subEl) {
                const yearLabel = UtilReportState.graphYear ? `${UtilReportState.graphYear}년` : '전체';
                subEl.textContent = `${yearLabel} · ${graphMeta.metricLabel} · 단위 ${graphMeta.unitLabel}`;
            }

            if (!hasValue) {
                chartEl.innerHTML = '<div class="util-report-graph-empty">선택한 분자/분모 조합으로 계산 가능한 값이 없습니다.</div>';
                if (detailEl) detailEl.innerHTML = '<div class="util-report-graph-detail-empty">선택한 조건의 상세표 데이터가 없습니다.</div>';
                return;
            }

            const bodyEl = modal.querySelector('.util-report-graph-modal-body');
            const chartWidthBase = chartEl.clientWidth || bodyEl?.clientWidth || 0;
            const fitChartWidth = chartWidthBase > 0
                ? Math.max(360, Math.floor(chartWidthBase - 16))
                : undefined;
            chartEl.innerHTML = renderUtilTrendChart(graphPoints, graphMeta.metricLabel, {
                mode: 'modal',
                chartType: UtilReportState.graphChartType,
                showTypeSelect: false,
                showLabelToggle: true,
                showLabels: modal.dataset.graphShowLabels !== 'false',
                decimals: UtilReportState.decimals,
                unitLabel: graphMeta.unitLabel,
                minWidth: 0,
                forceWidth: fitChartWidth,
                pointSpacing: 44,
                height: 420,
                axisXLabel: '월',
                axisYLabel: formatUtilLabelWithUnit(graphMeta.metricLabel, graphMeta.unitLabel),
                axisXIcon: '📅',
                axisYIcon: '📈',
                focusMonthKey
            });
            syncUtilAnalyticsChartHostHeight(chartEl, 34);
            if (detailEl) {
                detailEl.innerHTML = renderUtilReportGraphDetailTable(
                    graphPoints,
                    { ...graphMeta, focusMonthKey },
                    UtilReportState.graphUseDenominator
                );
                scrollUtilReportFocusedElementIntoView(detailEl);
            }

            const labelToggle = chartEl.querySelector('[data-chart-label-toggle]');
            if (labelToggle) {
                labelToggle.checked = modal.dataset.graphShowLabels !== 'false';
                labelToggle.addEventListener('change', () => {
                    modal.dataset.graphShowLabels = labelToggle.checked ? 'true' : 'false';
                    renderUtilReportGraphModal(data);
                });
            }
        }

        function openUtilReportGraphModal(result) {
            const modal = ensureUtilReportGraphModal();
            if (result) UtilReportState.lastResult = result;
            if (!UtilReportState.lastResult) {
                UtilReportState.lastResult = runUtilReportFromState({ renderModal: false });
            }
            if (!UtilReportState.graphYear) UtilReportState.graphYear = UtilReportState.chartYear;
            syncUtilReportGraphMetricDefaults();
            renderUtilReportGraphModal(UtilReportState.lastResult);
            modal.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        }
