        function bindUtilReportModalControls(modal) {
            if (!modal) return;
            bindUtilReportInlineInsightControls(modal);
            bindUtilReportModalBodyDrag(modal);
            bindUtilReportDonutRowDrag(modal);
            if (modal.dataset.bound === 'true') return;
            modal.dataset.bound = 'true';

            modal.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role.startsWith('util-report-modal-')) return;
                if (role === 'util-report-modal-year-color') {
                    const yearType = event.target?.getAttribute?.('data-year-type') === 'prev' ? 'prev' : 'current';
                    const defaultColor = yearType === 'prev' ? '#334155' : '#1d4ed8';
                    const nextColor = normalizeUtilReportColor(event.target.value, defaultColor);
                    if (yearType === 'prev') UtilReportState.prevYearColor = nextColor;
                    else UtilReportState.currentYearColor = nextColor;
                    event.target.value = nextColor;
                    runUtilReportFromState({ renderModal: true });
                    return;
                }
                if (role === 'util-report-modal-category') {
                    const categoryValue = String(event.target?.value || '').trim();
                    UtilReportState.categoryKey = normalizeUtilReportCategory(categoryValue);
                }
                if (role === 'util-report-modal-scope') {
                    const scopeKey = normalizeUtilReportScope(event.target.value);
                    UtilReportState.scopeKey = scopeKey;
                    UtilReportState.selectedScopeKeys = scopeKey === 'total'
                        ? ['electric', 'gas', 'waste']
                        : [scopeKey];
                    UtilReportState.metricKey = resolveUtilReportMetricKey(scopeKey, UtilReportState.categoryKey);
                    UtilReportState.activeMetricCard = UtilReportState.metricKey;
                    UtilReportState.totalCompositionView = 'scope';
                    UtilReportState.excludeWasteCompositionView = 'team';
                    UtilReportState.costTotalSelectedCompositionView = 'total';
                    UtilReportState.activeTotalTeamCompositionKey = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                    UtilReportState.activeTotalProcessCompositionKey = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                    resetUtilReportSelectedProcessStates();
                    syncUtilReportModalControls(modal);
                }
                collectUtilReportStateFromModal(modal);
                syncUtilReportGraphMetricDefaults();
                runUtilReportFromState({ renderModal: true });
            });

            modal.addEventListener('click', event => {
                const closeBtn = event.target.closest('[data-role="util-report-modal-close"]');
                if (closeBtn) {
                    closeUtilReportModal();
                    return;
                }
                const printBtn = event.target.closest('[data-role="util-report-modal-print"]');
                if (printBtn) {
                    window.print();
                    return;
                }
                const builderOpenBtn = event.target.closest('[data-role="util-report-builder-open"]');
                if (builderOpenBtn) {
                    openUtilReportBuilderModal();
                    return;
                }
                const overviewResetBtn = event.target.closest('[data-role="util-report-modal-reset-overview"]');
                if (overviewResetBtn) {
                    resetUtilReportOverviewState();
                    syncUtilReportGraphMetricDefaults();
                    syncUtilReportModalControls(modal);
                    runUtilReportFromState({ renderModal: true });
                    return;
                }
                const monthHitTarget = event.target?.closest?.('[data-role="util-chart-month-hit"]');
                if (monthHitTarget) {
                    const monthToken = monthHitTarget.getAttribute('data-month-token') || '';
                    const monthKey = monthHitTarget.getAttribute('data-month-key') || '';
                    const seriesKey = monthHitTarget.getAttribute('data-series-key') || '';
                    if (focusUtilReportDetailRowByMonth(modal, { monthToken, monthKey, seriesKey }, { scroll: true })) {
                        return;
                    }
                }
                const chartFullscreenToggleBtn = event.target.closest('[data-role="util-report-modal-chart-fullscreen-toggle"]');
                if (chartFullscreenToggleBtn) {
                    UtilReportState.chartFullscreen = !(UtilReportState.chartFullscreen === true);
                    syncUtilReportModalControls(modal);
                    renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                    return;
                }
                const chartTypeToggleBtn = event.target.closest('[data-role="util-report-modal-chart-type-toggle"]');
                if (chartTypeToggleBtn) {
                    UtilReportState.chartType = UtilReportState.chartType === 'line' ? 'bar' : 'line';
                    syncUtilReportChartTypeToggleButton(chartTypeToggleBtn, UtilReportState.chartType);
                    runUtilReportFromState({ renderModal: true });
                    return;
                }
                const totalCompositionToggleBtn = event.target.closest('[data-role="util-report-composition-toggle-view"]');
                if (totalCompositionToggleBtn) {
                    const toggleTarget = String(totalCompositionToggleBtn.getAttribute('data-toggle-target') || 'total').trim();
                    const nextView = String(totalCompositionToggleBtn.getAttribute('data-next-view') || 'scope').trim();
                    if (toggleTarget === 'exclude-waste') {
                        UtilReportState.excludeWasteCompositionView = nextView === 'process' ? 'process' : 'team';
                    } else if (toggleTarget === 'cost-total-selected') {
                        UtilReportState.costTotalSelectedCompositionView = ['total', 'process', 'team', 'plantA'].includes(nextView)
                            ? nextView
                            : 'total';
                        if (UtilReportState.costTotalSelectedCompositionView === 'process') {
                            setUtilReportDetailMetricOverride(
                                UtilReportState.activeTotalProcessCompositionKey || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY
                            );
                        } else if (UtilReportState.costTotalSelectedCompositionView === 'plantA') {
                            const costCompositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
                            UtilReportState.activeTeamCompositionKey = costCompositionKeys.total;
                            setUtilReportDetailMetricOverride(resolveUtilReportSelectedTotalDetailOverrideMetric(costCompositionKeys.total));
                        } else if (UtilReportState.costTotalSelectedCompositionView === 'team') {
                            const costCompositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
                            setUtilReportDetailMetricOverride(
                                UtilReportState.activeTeamCompositionKey || costCompositionKeys.total
                            );
                        } else {
                            setUtilReportDetailMetricOverride(
                                UtilReportState.activeTotalTeamCompositionKey || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY
                            );
                        }
                        runUtilReportFromState({ renderModal: true });
                        return;
                    } else if (toggleTarget === 'electric-selected') {
                        UtilReportState.electricSelectedCompositionView = nextView === 'process' ? 'process' : 'team';
                    } else if (toggleTarget === 'gas-selected') {
                        UtilReportState.gasSelectedCompositionView = nextView === 'process' ? 'process' : 'team';
                    } else if (toggleTarget === 'production-selected') {
                        UtilReportState.productionSelectedCompositionView = nextView === 'process' ? 'process' : 'team';
                        if (UtilReportState.productionSelectedCompositionView !== 'process') {
                            UtilReportState.activeProductionProcessCompositionKey = UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
                        }
                        UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                    } else {
                        UtilReportState.totalCompositionView = nextView === 'site' ? 'site' : 'scope';
                    }
                    renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                    return;
                }
                const compItemBtn = event.target.closest('[data-role="util-report-composition-item"]');
                if (compItemBtn) {
                    const compositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
                    const metric = compItemBtn.getAttribute('data-metric') || '';
                    const compositionKind = compItemBtn.getAttribute('data-composition-kind') || 'total';
                    if (compositionKind === 'team-total-excl-waste') {
                        UtilReportState.activeTotalTeamCompositionKey = metric || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                        setUtilReportDetailMetricOverride(UtilReportState.activeTotalTeamCompositionKey);
                        runUtilReportFromState({ renderModal: true });
                        return;
                    }
                    if (compositionKind === 'process-total-excl-waste') {
                        UtilReportState.activeTotalProcessCompositionKey = metric || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                        setUtilReportDetailMetricOverride(UtilReportState.activeTotalProcessCompositionKey);
                        runUtilReportFromState({ renderModal: true });
                        return;
                    }
                    if (compositionKind === 'electric-process') {
                        UtilReportState.activeElectricProcessCompositionKey = metric || UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY;
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'gas-process') {
                        UtilReportState.activeGasProcessCompositionKey = metric || UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'production-process') {
                        clearUtilReportDetailMetricOverride();
                        UtilReportState.activeProductionProcessCompositionKey = metric || UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
                        UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    const isCostSiteScopedTotal = getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'cost'
                        && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                        && getUtilReportSiteFilterByScope('total') !== 'all';
                    if (compositionKind === 'total' && isCostSiteScopedTotal) {
                        const nextMetric = metric || compositionKeys.total;
                        UtilReportState.activeMetricCard = nextMetric;
                        setUtilReportDetailMetricOverride(nextMetric);
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    clearUtilReportDetailMetricOverride();
                    if (compositionKind === 'site') {
                        if (applyUtilReportSiteFilterFromCompositionMetric(metric)) {
                            syncUtilReportGraphMetricDefaults();
                            syncUtilReportModalControls(modal);
                            runUtilReportFromState({ renderModal: true });
                            return;
                        }
                        UtilReportState.activeSiteCompositionKey = metric;
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'selected') {
                        const selectedScope = normalizeUtilReportScope(UtilReportState.scopeKey);
                        if (selectedScope === 'electric' || selectedScope === 'gas') {
                            UtilReportState.activeTeamCompositionKey = metric || compositionKeys.total;
                            const nextOverrideMetric = resolveUtilReportSelectedScopeDetailOverrideMetric(
                                UtilReportState.activeTeamCompositionKey,
                                selectedScope
                            );
                            if (nextOverrideMetric) {
                                setUtilReportDetailMetricOverride(nextOverrideMetric);
                            } else {
                                clearUtilReportDetailMetricOverride();
                            }
                            runUtilReportFromState({ renderModal: true });
                            return;
                        }
                        if (isUtilReportSelectedTotalDetailScope()) {
                            UtilReportState.activeTeamCompositionKey = metric || compositionKeys.total;
                            setUtilReportDetailMetricOverride(
                                resolveUtilReportSelectedTotalDetailOverrideMetric(UtilReportState.activeTeamCompositionKey)
                            );
                            runUtilReportFromState({ renderModal: true });
                            return;
                        }
                        if (applyUtilReportTeamFilterFromCompositionMetric(metric)) {
                            syncUtilReportGraphMetricDefaults();
                            syncUtilReportModalControls(modal);
                            runUtilReportFromState({ renderModal: true });
                            return;
                        }
                        UtilReportState.activeTeamCompositionKey = metric;
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'waste-detail') {
                        if (applyUtilReportWasteDetailFromCompositionMetric(metric)) {
                            syncUtilReportGraphMetricDefaults();
                            syncUtilReportModalControls(modal);
                            runUtilReportFromState({ renderModal: true });
                        }
                        return;
                    }
                    if (compositionKind === 'production-product') {
                        if (applyUtilReportProductionProductFilterFromCompositionMetric(metric)) {
                            syncUtilReportGraphMetricDefaults();
                            syncUtilReportModalControls(modal);
                            runUtilReportFromState({ renderModal: true });
                            return;
                        }
                        UtilReportState.activeProductionProductCompositionKey = metric;
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'production-process-line') {
                        UtilReportState.activeProductionProductCompositionKey = metric || 'total_production_product';
                        renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    const scopeKey = getUtilReportScopeFromMetric(metric || compositionKeys.total);
                    UtilReportState.scopeKey = normalizeUtilReportScope(scopeKey);
                    UtilReportState.selectedScopeKeys = UtilReportState.scopeKey === 'total'
                        ? ['electric', 'gas', 'waste']
                        : [UtilReportState.scopeKey];
                    UtilReportState.metricKey = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
                    UtilReportState.activeMetricCard = UtilReportState.metricKey;
                    UtilReportState.wasteCostModeKey = 'total';
                    UtilReportState.activeWasteDetailCompositionKey = '';
                    if (UtilReportState.scopeKey === 'total') {
                        UtilReportState.electricTeam = 'all';
                        UtilReportState.gasTeam = 'all';
                        UtilReportState.wasteTeam = 'all';
                        UtilReportState.activeTotalTeamCompositionKey = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                        UtilReportState.activeTotalProcessCompositionKey = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                        UtilReportState.excludeWasteCompositionView = 'team';
                        UtilReportState.costTotalSelectedCompositionView = 'total';
                        UtilReportState.totalCompositionView = 'scope';
                        UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                        if (getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'production') {
                            UtilReportState.productionTeam = 'all';
                        }
                    }
                    UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                    syncUtilReportGraphMetricDefaults();
                    syncUtilReportModalControls(modal);
                    runUtilReportFromState({ renderModal: true });
                }
            });

        }

        function ensureUtilReportModal() {
            let modal = document.getElementById('util-report-modal');
            if (modal) {
                bindUtilReportModalControls(modal);
                return modal;
            }

            modal = document.createElement('div');
            modal.id = 'util-report-modal';
            modal.className = 'util-report-modal';
            modal.innerHTML = `
                <div class="util-report-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 보고서">
                    <div class="util-report-modal-head">
                        <div class="util-report-modal-header">
                            <div>
                                <div class="util-report-modal-title">유틸리티 통합 보고서</div>
                                <div class="util-report-modal-sub" data-role="util-report-modal-sub">기간: -</div>
                            </div>
                            <div class="util-report-modal-actions">
                                <button type="button" class="util-report-modal-btn" data-role="util-report-modal-reset-overview" aria-label="전체 복귀" title="전체 복귀"><i class="fas fa-rotate-left" aria-hidden="true"></i></button>
                                <button type="button" class="util-report-modal-btn" data-role="util-report-inline-detach">표 분리</button>
                                <button type="button" class="util-report-modal-btn" data-role="util-report-modal-print">인쇄</button>
                                <button type="button" class="util-report-modal-close" data-role="util-report-modal-close">닫기</button>
                            </div>
                        </div>
                    </div>
                    <div class="util-report-modal-body">
                        <div class="util-report-chart-shell" data-role="util-report-modal-chart-shell">
                            <div class="util-report-chart-inline-controls">
                                <div class="util-report-chart-inline-left">
                                    <div class="util-report-modal-group util-report-modal-group-category">
                                        <div class="util-report-modal-field">
                                            <label>항목</label>
                                            <select data-role="util-report-modal-category">
                                                <option value="cost">비용</option>
                                                <option value="production">생산량</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div class="util-report-modal-group util-report-modal-group-period">
                                        <div class="util-report-modal-field">
                                            <label>시작</label>
                                            <select data-role="util-report-modal-from"></select>
                                        </div>
                                        <div class="util-report-modal-field">
                                            <label>끝</label>
                                            <select data-role="util-report-modal-to"></select>
                                        </div>
                                        <div class="util-report-modal-field">
                                            <label>기준년도</label>
                                            <select data-role="util-report-modal-compare-year"></select>
                                        </div>
                                    </div>
                                </div>
                                <div class="util-report-chart-inline-right">
                                    <div class="util-report-modal-group util-report-modal-group-display">
                                        <div class="util-report-modal-field">
                                            <label>단위</label>
                                            <select data-role="util-report-modal-unit">
                                                <option value="krw">원</option>
                                                <option value="thousand">천원</option>
                                                <option value="million">백만원</option>
                                            </select>
                                        </div>
                                        <div class="util-report-modal-field">
                                            <label>소수</label>
                                            <select data-role="util-report-modal-decimals">
                                                <option value="0">0</option>
                                                <option value="1">1</option>
                                                <option value="2">2</option>
                                                <option value="3">3</option>
                                            </select>
                                        </div>
                                        <div class="util-report-modal-field util-report-modal-field-check">
                                            <label>레이블</label>
                                            <label class="util-report-modal-checkbox">
                                                <input type="checkbox" data-role="util-report-modal-show-labels" />
                                                <span>표시</span>
                                            </label>
                                        </div>
                                        <div class="util-report-modal-field">
                                            <label>그래프</label>
                                            <button type="button" class="util-report-chart-type-toggle" data-role="util-report-modal-chart-type-toggle" data-chart-type="bar">막대</button>
                                        </div>
                                        <div class="util-report-modal-field">
                                            <label>화면</label>
                                            <button type="button" class="util-report-chart-type-toggle util-report-chart-icon-toggle" data-role="util-report-modal-chart-fullscreen-toggle" aria-label="차트 확대" title="차트 확대"><i class="fas fa-expand" aria-hidden="true"></i></button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="util-report-chart-host-wrap" data-role="util-report-modal-chart-wrap">
                                <div class="util-report-chart-host" data-role="util-report-modal-chart"></div>
                                <div class="util-report-chart-inline-meta" data-role="util-report-modal-chart-meta"></div>
                            </div>
                        </div>
                        <div class="util-report-donut-row">
                            <div class="util-report-composition-shell" data-role="util-report-modal-total-donut"></div>
                            <div class="util-report-composition-shell" data-role="util-report-modal-site-donut"></div>
                            <div class="util-report-composition-shell" data-role="util-report-modal-selected-donut"></div>
                            <div class="util-report-composition-shell is-hidden" data-role="util-report-modal-production-product-donut"></div>
                            <div class="util-report-composition-shell is-hidden" data-role="util-report-modal-waste-detail-donut"></div>
                        </div>
                        <div class="util-report-inline-insight" data-role="util-report-inline-insight">
                            <div class="util-report-inline-insight-head">
                                <div class="util-report-inline-insight-meta">
                                    <div class="util-report-inline-insight-title">상세표</div>
                                    <div class="util-report-inline-insight-note">차트/원형그래프를 눌러 기준을 바꾸고, 상단 표 분리 버튼으로 별도 창을 켜고 끕니다.</div>
                                </div>
                            </div>
                            <div data-role="util-report-inline-body"></div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            bindUtilReportModalControls(modal);

            modal.addEventListener('click', event => {
                if (event.target === modal) closeUtilReportModal();
            });

            if (!window.__utilReportModalEscapeBound) {
                window.__utilReportModalEscapeBound = true;
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    const builderVizModal = document.getElementById('util-report-builder-viz-modal');
                    if (builderVizModal && builderVizModal.classList.contains('is-open')) {
                        closeUtilReportBuilderVizModal(true);
                        return;
                    }
                    const builderModal = document.getElementById('util-report-builder-modal');
                    if (builderModal && builderModal.classList.contains('is-open')) {
                        closeUtilReportBuilderModal(true);
                        return;
                    }
                    const opened = document.getElementById('util-report-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    closeUtilReportModal();
                });
            }

            if (!window.__utilReportChartResizeBound) {
                window.__utilReportChartResizeBound = true;
                window.addEventListener('resize', () => {
                    const opened = document.getElementById('util-report-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    renderUtilReportModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                });
            }

            return modal;
        }

        function openUtilReportModal(result) {
            const modal = ensureUtilReportModal();
            if (result) UtilReportState.lastResult = result;
            if (!UtilReportState.lastResult) {
                UtilReportState.lastResult = runUtilReportFromState({ renderModal: false });
            }
            syncUtilReportModalControls(modal);
            renderUtilReportModal(UtilReportState.lastResult);
            modal.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            requestAnimationFrame(() => {
                if (!modal.classList.contains('is-open')) return;
                renderUtilReportModal(UtilReportState.lastResult);
            });
        }

        function closeUtilReportModal() {
            const modal = document.getElementById('util-report-modal');
            if (!modal) return;
            UtilReportState.chartFullscreen = false;
            modal.classList.remove('is-chart-fullscreen');
            modal.classList.remove('is-open');
            closeUtilReportDetachedTableWindow();
            closeUtilReportBuilderModal(true);
            closeUtilReportBuilderVizModal(true);
            closeUtilReportGraphModal(true);
            closeUtilReportYoYModal(true);
            document.body.style.overflow = '';
        }

        function collectUtilReportGraphStateFromModal(modal) {
            if (!modal) return;
            const yearRaw = modal.querySelector('[data-role="util-report-graph-year"]')?.value || UtilReportState.graphYear;
            const numeratorRaw = modal.querySelector('[data-role="util-report-graph-numerator"]')?.value || UtilReportState.graphNumeratorMetric;
            const denominatorRaw = modal.querySelector('[data-role="util-report-graph-denominator"]')?.value || UtilReportState.graphDenominatorMetric;
            const chartTypeRaw = modal.querySelector('[data-role="util-report-graph-chart-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-graph-chart-type"]')?.value
                || UtilReportState.graphChartType;
            const useDenominator = !!modal.querySelector('[data-role="util-report-graph-denominator-toggle"]')?.checked;

            const options = getUtilReportGraphMetricOptions(UtilReportState.scopeKey);
            UtilReportState.graphNumeratorMetric = normalizeUtilReportGraphMetric(
                numeratorRaw,
                options,
                resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey)
            );
            UtilReportState.graphDenominatorMetric = normalizeUtilReportGraphMetric(denominatorRaw, options, 'production');
            UtilReportState.graphUseDenominator = useDenominator;
            UtilReportState.graphChartType = chartTypeRaw === 'bar' ? 'bar' : 'line';
            UtilReportState.graphYear = String(yearRaw || '').trim();
        }

        function syncUtilReportGraphModalControls(modal, result) {
            if (!modal) return;
            syncUtilReportGraphMetricDefaults();
            const yearSelect = modal.querySelector('[data-role="util-report-graph-year"]');
            const numeratorSelect = modal.querySelector('[data-role="util-report-graph-numerator"]');
            const denominatorSelect = modal.querySelector('[data-role="util-report-graph-denominator"]');
            const denominatorToggle = modal.querySelector('[data-role="util-report-graph-denominator-toggle"]');
            const denominatorField = modal.querySelector('[data-role="util-report-graph-denominator-field"]');
            const chartTypeSelect = modal.querySelector('[data-role="util-report-graph-chart-type"]');
            const chartTypeToggleBtn = modal.querySelector('[data-role="util-report-graph-chart-type-toggle"]');

            const yearOptions = getUtilReportAllYearOptions(result || UtilReportState.lastResult || {});
            UtilReportState.graphYear = normalizeUtilReportYear(UtilReportState.graphYear || UtilReportState.chartYear, yearOptions);
            if (yearSelect) {
                yearSelect.innerHTML = yearOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
                yearSelect.value = UtilReportState.graphYear;
            }

            const metricOptions = getUtilReportGraphMetricOptions(UtilReportState.scopeKey);
            const metricHtml = metricOptions.map(item => `<option value="${item.key}">${item.label}</option>`).join('');
            if (numeratorSelect) {
                numeratorSelect.innerHTML = metricHtml;
                numeratorSelect.value = normalizeUtilReportGraphMetric(
                    UtilReportState.graphNumeratorMetric,
                    metricOptions,
                    resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey)
                );
            }
            if (denominatorSelect) {
                denominatorSelect.innerHTML = metricHtml;
                denominatorSelect.value = normalizeUtilReportGraphMetric(UtilReportState.graphDenominatorMetric, metricOptions, 'production');
            }
            if (denominatorToggle) denominatorToggle.checked = !!UtilReportState.graphUseDenominator;
            if (denominatorField) denominatorField.style.display = UtilReportState.graphUseDenominator ? '' : 'none';
            if (denominatorSelect) denominatorSelect.disabled = !UtilReportState.graphUseDenominator;
            if (chartTypeSelect) chartTypeSelect.value = UtilReportState.graphChartType === 'bar' ? 'bar' : 'line';
            syncUtilReportChartTypeToggleButton(chartTypeToggleBtn, UtilReportState.graphChartType);
        }

        function resolveUtilReportBuilderTeamFilter(teamName, itemKey = UtilReportBuilderState.itemKey) {
            const normalized = normalizeUtilReportBuilderTeam(teamName, itemKey);
            if (normalized === '전체') return 'all';
            return normalized;
        }

        function getUtilReportBuilderMetricUnit(metricKey) {
            const key = String(metricKey || '').trim();
            if (key === 'electric_usage') return 'kWh';
            if (key === 'gas_usage') return 'm³';
            if (key === 'waste_usage') return '㎥';
            if (key === 'production') return getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey);
            return getUtilReportUnitLabel(UtilReportState.unitKey);
        }

        function getUtilReportBuilderMetricTitle(metricKey) {
            const key = String(metricKey || '').trim();
            if (key === 'electric_usage') return '전력량 (kWh)';
            if (key === 'gas_usage') return '가스 사용량 (m³)';
            if (key === 'waste_usage') return '폐수 사용량 (㎥)';
            if (key === 'electric_cost') return `금액 (${getUtilReportUnitLabel(UtilReportState.unitKey)})`;
            if (key === 'gas_cost') return `가스 비용 (${getUtilReportUnitLabel(UtilReportState.unitKey)})`;
            if (key === 'waste_cost') return `폐수 비용 (${getUtilReportUnitLabel(UtilReportState.unitKey)})`;
            if (key === 'production') return `생산량 (${getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey)})`;
            return getUtilReportMetricLabel(key, UtilReportState.unitKey);
        }

        function buildUtilReportUsagePerProductionPoints(result, itemKey = 'electric') {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const usagePropKey = normalizedItemKey === 'gas'
                ? 'gasUsage'
                : (normalizedItemKey === 'waste' ? 'wasteUsage' : 'electricUsage');
            const rows = Array.isArray(result?.rows) ? result.rows : [];
            return rows.map(row => {
                const usage = Number(row?.[usagePropKey]);
                const production = Number(row?.production);
                const value = Number.isFinite(usage) && Number.isFinite(production) && production > 0
                    ? usage / production
                    : NaN;
                return {
                    key: row?.monthKey,
                    label: formatUtilReportMonthShort(row?.monthKey),
                    value
                };
            });
        }

        function renderUtilReportBuilderVizIsolatedChart(points, isolatedSeriesKey, options = {}) {
            const seriesKey = normalizeUtilReportBuilderVizSeriesKey(isolatedSeriesKey);
            if (!seriesKey) {
                return '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div></div>';
            }
            const defaultDigits = Number.isFinite(options.decimals) ? options.decimals : 1;
            const decimalsMap = options?.decimalsMap && typeof options.decimalsMap === 'object'
                ? options.decimalsMap
                : {};
            const usageDigits = Number.isFinite(Number(decimalsMap.usage)) ? Number(decimalsMap.usage) : defaultDigits;
            const costDigits = Number.isFinite(Number(decimalsMap.cost)) ? Number(decimalsMap.cost) : defaultDigits;
            const productionDigits = Number.isFinite(Number(decimalsMap.production))
                ? Number(decimalsMap.production)
                : (Number.isFinite(options.secondaryDecimals) ? Number(options.secondaryDecimals) : defaultDigits);
            const showLabels = options.showLabels === true;
            const focusMonthKey = normalizeUtilReportMonthKey(options.focusMonthKey);
            const seriesMetaMap = {
                usage: {
                    key: 'usage',
                    label: options.usageLabel || '사용량',
                    shortLabel: '사용량',
                    color: '#EAB308',
                    digits: usageDigits,
                    icon: '⚡',
                    unitLabel: String(options.usageLabel || '사용량')
                },
                cost: {
                    key: 'cost',
                    label: options.costLabel || '비용',
                    shortLabel: '비용',
                    color: '#2563EB',
                    digits: costDigits,
                    icon: '💰',
                    unitLabel: String(options.costLabel || '비용')
                },
                production: {
                    key: 'production',
                    label: options.productionLabel || '생산량',
                    shortLabel: '생산량',
                    color: '#DC2626',
                    digits: productionDigits,
                    icon: '🏭',
                    unitLabel: String(options.productionLabel || '생산량')
                }
            };
            const activeMeta = seriesMetaMap[seriesKey];
            const isolatedChartType = normalizeUtilReportBuilderVizChartType(
                options?.seriesTypeMap?.[seriesKey]
                || options?.isolatedChartType
                || 'bar'
            );
            const chartPoints = (Array.isArray(points) ? points : []).map(point => ({
                key: point?.key || '',
                label: point?.label || '',
                value: Number(point?.[seriesKey])
            }));
            const validValues = chartPoints.map(point => Number(point?.value)).filter(Number.isFinite);
            if (!validValues.length) {
                return '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div></div>';
            }
            const legendItems = [
                { key: 'usage', color: '#EAB308', label: options.usageLabel || '사용량' },
                { key: 'cost', color: '#2563EB', label: options.costLabel || '비용' },
                { key: 'production', color: '#DC2626', label: options.productionLabel || '생산량' }
            ];
            const legendHtml = `
                <div class="util-analytics-chart-legend">
                    ${legendItems.map(item => {
                        const itemClass = `util-analytics-chart-legend-item${item.key === seriesKey ? ' is-active is-isolated' : ' is-dim'}`;
                        return `<button type="button" class="${itemClass}" data-role="util-report-builder-viz-series-item" data-series-key="${item.key}" title="더블클릭: ${escapeHtml(item.label)}만 단일 보기"><i style="background:${item.color};"></i>${escapeHtml(item.label)}${item.key === seriesKey ? ' (단일)' : ''}</button>`;
                    }).join('')}
                </div>
            `;
            const rangeHtml = `
                <div class="util-analytics-chart-meta-row">
                    <span class="util-analytics-chart-period">${escapeHtml(activeMeta.shortLabel)} ${formatUtilNumber(Math.min(...validValues), activeMeta.digits)} ~ ${formatUtilNumber(Math.max(...validValues), activeMeta.digits)}</span>
                </div>
            `;
            const chartHtml = renderUtilTrendChart(chartPoints, activeMeta.unitLabel, {
                mode: 'modal',
                chartType: isolatedChartType,
                showTypeSelect: false,
                showLabelToggle: false,
                showLabels,
                decimals: activeMeta.digits,
                forceWidth: Number.isFinite(Number(options.forceWidth)) ? Number(options.forceWidth) : undefined,
                minWidth: 0,
                pointSpacing: Math.max(46, Number(options.pointSpacing) || 58),
                height: Number.isFinite(Number(options.height)) ? Math.max(420, Math.floor(Number(options.height)) - 40) : 440,
                topCenterTitle: `${activeMeta.label} 단일 차트`,
                axisXLabel: String(options.axisXLabel || '월'),
                axisYLabel: activeMeta.label,
                axisXIcon: '📅',
                axisYIcon: activeMeta.icon,
                focusMonthKey,
                showYearBands: false
            });
            const injectedChart = chartHtml.replace('<div class="util-analytics-chart-canvas">', `${legendHtml}${rangeHtml}<div class="util-analytics-chart-canvas">`);
            return `<div style="--util-chart-accent:${activeMeta.color};">${injectedChart}</div>`;
        }
