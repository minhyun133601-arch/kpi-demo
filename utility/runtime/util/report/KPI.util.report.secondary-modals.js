        function closeUtilReportGraphModal(keepBodyLock = false) {
            const modal = document.getElementById('util-report-graph-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            if (keepBodyLock) return;
            const reportOpen = document.getElementById('util-report-modal')?.classList.contains('is-open');
            const yoyOpen = document.getElementById('util-report-yoy-modal')?.classList.contains('is-open');
            if (!reportOpen && !yoyOpen) {
                document.body.style.overflow = '';
            }
        }

        function setUtilReportInsightView(view) {
            UtilReportState.insightView = view === 'donut' ? 'donut' : 'yoy';
        }

        function ensureUtilReportCompositionModal() {
            return ensureUtilReportYoYModal();
        }

        function openUtilReportCompositionModal(result) {
            openUtilReportYoYModal('donut', result);
        }

        function closeUtilReportCompositionModal(keepBodyLock = false) {
            closeUtilReportYoYModal(keepBodyLock);
        }

        function ensureUtilReportYoYModal() {
            let modal = document.getElementById('util-report-yoy-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'util-report-yoy-modal';
            modal.className = 'util-report-yoy-modal';
            modal.innerHTML = `
                <div class="util-report-yoy-modal-card" role="dialog" aria-modal="true" aria-label="상세 분석 팝업">
                    <div class="util-report-yoy-modal-head">
                        <div class="util-report-yoy-modal-header">
                            <div>
                                <div class="util-report-yoy-modal-title">상세 분석 팝업</div>
                                <div class="util-report-yoy-modal-sub" data-role="util-report-yoy-modal-sub">기간: -</div>
                            </div>
                            <div class="util-report-yoy-modal-actions">
                                <button type="button" class="util-report-yoy-modal-close" data-role="util-report-yoy-modal-close">닫기</button>
                            </div>
                        </div>
                        <div class="util-report-yoy-modal-controls">
                            <div class="util-report-insight-tabs" data-role="util-report-insight-tabs">
                                <button type="button" class="util-report-insight-tab" data-role="util-report-insight-tab" data-view="donut">원형 그래프</button>
                                <button type="button" class="util-report-insight-tab" data-role="util-report-insight-tab" data-view="yoy">전년도 비교표</button>
                            </div>
                            <div class="util-report-yoy-modal-field">
                                <label>지표</label>
                                <select data-role="util-report-yoy-modal-scope"></select>
                            </div>
                            <div class="util-report-yoy-modal-field">
                                <label>표 기준년도</label>
                                <select data-role="util-report-yoy-modal-compare-year"></select>
                            </div>
                        </div>
                    </div>
                    <div class="util-report-yoy-modal-body" data-role="util-report-yoy-modal-body"></div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeUtilReportYoYModal();
                    return;
                }
                if (event.target.closest('[data-role="util-report-yoy-modal-close"]')) {
                    closeUtilReportYoYModal();
                    return;
                }
                const tabBtn = event.target.closest('[data-role="util-report-insight-tab"]');
                if (tabBtn) {
                    setUtilReportInsightView(tabBtn.getAttribute('data-view'));
                    renderUtilReportYoYModal(UtilReportState.lastResult);
                    return;
                }
                const compItemBtn = event.target.closest('[data-role="util-report-composition-item"]');
                if (compItemBtn) {
                    const compositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
                    const metric = compItemBtn.getAttribute('data-metric') || compositionKeys.total;
                    const compositionKind = compItemBtn.getAttribute('data-composition-kind') || 'total';
                    if (compositionKind === 'team-total-excl-waste') {
                        UtilReportState.activeTotalTeamCompositionKey = metric || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                        setUtilReportDetailMetricOverride(UtilReportState.activeTotalTeamCompositionKey);
                        renderUtilReportYoYModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'process-total-excl-waste') {
                        UtilReportState.activeTotalProcessCompositionKey = metric || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                        setUtilReportDetailMetricOverride(UtilReportState.activeTotalProcessCompositionKey);
                        renderUtilReportYoYModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    const isCostSiteScopedTotal = getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'cost'
                        && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                        && getUtilReportSiteFilterByScope('total') !== 'all';
                    if (compositionKind === 'total' && isCostSiteScopedTotal) {
                        const nextMetric = metric || compositionKeys.total;
                        UtilReportState.activeMetricCard = nextMetric;
                        setUtilReportDetailMetricOverride(nextMetric);
                        renderUtilReportYoYModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    if (compositionKind === 'site') {
                        clearUtilReportDetailMetricOverride();
                        if (applyUtilReportSiteFilterFromCompositionMetric(metric)) {
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                        }
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
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                            return;
                        }
                        if (isUtilReportSelectedTotalDetailScope()) {
                            UtilReportState.activeTeamCompositionKey = metric || compositionKeys.total;
                            setUtilReportDetailMetricOverride(
                                resolveUtilReportSelectedTotalDetailOverrideMetric(UtilReportState.activeTeamCompositionKey)
                            );
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                            return;
                        }
                        clearUtilReportDetailMetricOverride();
                        if (applyUtilReportTeamFilterFromCompositionMetric(metric)) {
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                            return;
                        }
                    }
                    if (compositionKind === 'waste-detail') {
                        clearUtilReportDetailMetricOverride();
                        if (applyUtilReportWasteDetailFromCompositionMetric(metric)) {
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                        }
                        return;
                    }
                    if (compositionKind === 'production-product') {
                        clearUtilReportDetailMetricOverride();
                        if (applyUtilReportProductionProductFilterFromCompositionMetric(metric)) {
                            const result = runUtilReportFromState({ renderModal: true });
                            renderUtilReportYoYModal(result);
                            return;
                        }
                        UtilReportState.activeProductionProductCompositionKey = metric;
                        renderUtilReportYoYModal(UtilReportState.lastResult || runUtilReportFromState({ renderModal: false }));
                        return;
                    }
                    clearUtilReportDetailMetricOverride();
                    const scopeKey = getUtilReportScopeFromMetric(metric);
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
                    const result = runUtilReportFromState({ renderModal: true });
                    renderUtilReportYoYModal(result);
                }
            });

            modal.addEventListener('change', event => {
                const role = event.target?.getAttribute?.('data-role') || '';
                if (!role.startsWith('util-report-yoy-modal-')) return;
                if (role === 'util-report-yoy-modal-scope') {
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
                } else if (role === 'util-report-yoy-modal-compare-year') {
                    UtilReportState.compareYear = String(event.target.value || '').trim();
                }
                const result = runUtilReportFromState({ renderModal: true });
                renderUtilReportYoYModal(result);
            });

            if (!window.__utilReportYoYModalEscapeBound) {
                window.__utilReportYoYModalEscapeBound = true;
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    const opened = document.getElementById('util-report-yoy-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    closeUtilReportYoYModal();
                });
            }

            return modal;
        }

        function syncUtilReportYoYModalControls(modal, result) {
            if (!modal) return;
            const scopeSelect = modal.querySelector('[data-role="util-report-yoy-modal-scope"]');
            const compareSelect = modal.querySelector('[data-role="util-report-yoy-modal-compare-year"]');
            const subEl = modal.querySelector('[data-role="util-report-yoy-modal-sub"]');

            modal.querySelectorAll('[data-role="util-report-insight-tab"]').forEach(btn => {
                const view = btn.getAttribute('data-view') || 'yoy';
                btn.classList.toggle('is-active', view === UtilReportState.insightView);
            });

            if (scopeSelect) {
                scopeSelect.innerHTML = UTIL_REPORT_SCOPE_OPTIONS.map(item => `<option value="${item.key}">${item.label}</option>`).join('');
                scopeSelect.value = normalizeUtilReportScope(UtilReportState.scopeKey);
            }

            const compareOptions = getUtilReportAllYearOptions(result || {});
            UtilReportState.compareYear = normalizeUtilReportCompareYear(UtilReportState.compareYear, compareOptions);
            if (compareSelect) {
                const compareYearHtml = compareOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
                compareSelect.innerHTML = `<option value="">없음</option>${compareYearHtml}`;
                compareSelect.value = UtilReportState.compareYear || '';
                compareSelect.disabled = UtilReportState.insightView !== 'yoy';
            }

            if (subEl) {
                subEl.textContent = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
            }
        }

        function renderUtilReportYoYModal(result) {
            const modal = ensureUtilReportYoYModal();
            const bodyEl = modal.querySelector('[data-role="util-report-yoy-modal-body"]');
            const data = result || UtilReportState.lastResult || null;
            syncUtilReportYoYModalControls(modal, data || {});
            if (!bodyEl) return;
            if (!data || !Array.isArray(data.rows) || !data.rows.length) {
                bodyEl.innerHTML = '<div class="p-4 text-sm text-slate-300">표시할 데이터가 없습니다.</div>';
                return;
            }

            if (UtilReportState.insightView === 'donut') {
                const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
                const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
                const compositionValueType = getUtilReportCompositionValueType(compositionCategory);
                const isProductionCategory = compositionCategory === 'production';
                const totalSiteFilter = isProductionCategory ? 'all' : getUtilReportSiteFilterByScope('total');
                const hasCostSiteDrilldown = !isProductionCategory
                    && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                    && totalSiteFilter !== 'all';
                const composition = isProductionCategory
                    ? buildUtilReportSiteCompositionData(data, UtilReportState.chartYear, 'total')
                    : (UtilReportState.lastComposition || buildUtilReportCompositionData(data, {
                        categoryKey: compositionCategory,
                        title: hasCostSiteDrilldown
                            ? `${totalSiteFilter} 총액 구성비 (전기/가스/폐수)`
                            : '총액 구성비 (전기/가스/폐수)'
                    }));
                UtilReportState.lastComposition = composition;
                let focusMetric = getUtilReportCompositionMetricKeyByScope(UtilReportState.scopeKey, compositionCategory);
                let compositionKind = 'total';
                let centerLabel = isProductionCategory ? '총생산량' : '총액';
                let title = isProductionCategory
                    ? '총생산량 공장별 구성비 (Plant A/Plant B)'
                    : (hasCostSiteDrilldown ? `${totalSiteFilter} 총액 구성비 (전기/가스/폐수)` : '총액 구성비 (전기/가스/폐수)');
                if (isProductionCategory) {
                    compositionKind = 'site';
                    centerLabel = '공장별';
                    focusMetric = compositionKeys.total;
                    const activeSiteFilter = getUtilReportSiteFilterByScope('total');
                    const activeSiteMetric = buildUtilReportSiteMetricKey(activeSiteFilter);
                    if (activeSiteMetric && composition.items.some(item => item.key === activeSiteMetric)) {
                        focusMetric = activeSiteMetric;
                    } else if (
                        UtilReportState.activeSiteCompositionKey
                        && composition.items.some(item => item.key === UtilReportState.activeSiteCompositionKey)
                    ) {
                        focusMetric = UtilReportState.activeSiteCompositionKey;
                    }
                    UtilReportState.activeSiteCompositionKey = focusMetric;
                } else if (hasCostSiteDrilldown) {
                    const overrideMetric = normalizeUtilReportDetailMetricOverrideKey(UtilReportState.detailMetricOverrideKey);
                    const preferredMetric = overrideMetric || UtilReportState.activeMetricCard || compositionKeys.total;
                    focusMetric = (
                        preferredMetric === compositionKeys.total
                        || composition.items.some(item => item.key === preferredMetric)
                    )
                        ? preferredMetric
                        : compositionKeys.total;
                    centerLabel = `${totalSiteFilter} 총액`;
                }
                bodyEl.innerHTML = renderUtilReportCompositionDonut(composition, {
                    activeMetric: focusMetric,
                    focusItemKey: focusMetric,
                    compositionKind,
                    showOpen: false,
                    large: true,
                    size: 300,
                    includeTotalItem: true,
                    totalItemKey: compositionKeys.total,
                    totalItemLabel: compositionCategory === 'production' ? '총생산량' : '총액',
                    centerLabel,
                    title,
                    valueType: compositionValueType
                });
            } else {
                bodyEl.innerHTML = renderUtilReportYoYTable(data, resolveUtilReportDetailMetricKey(), UtilReportState.compareYear);
            }
        }

        function openUtilReportYoYModal(viewOrResult, maybeResult) {
            let result = null;
            if (typeof viewOrResult === 'string') {
                setUtilReportInsightView(viewOrResult);
                result = maybeResult || null;
            } else if (viewOrResult && typeof viewOrResult === 'object') {
                result = viewOrResult;
            }

            if (result) UtilReportState.lastResult = result;
            if (!UtilReportState.lastResult) {
                UtilReportState.lastResult = runUtilReportFromState({ renderModal: false });
            }
            renderUtilReportModal(UtilReportState.lastResult);
            const reportModal = document.getElementById('util-report-modal');
            const inlineInsightEl = reportModal?.querySelector?.('[data-role="util-report-inline-insight"]');
            if (inlineInsightEl && typeof inlineInsightEl.scrollIntoView === 'function') {
                inlineInsightEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }

        function closeUtilReportYoYModal(keepBodyLock = false) {
            const modal = document.getElementById('util-report-yoy-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            if (keepBodyLock) return;
            const reportOpen = document.getElementById('util-report-modal')?.classList.contains('is-open');
            const graphOpen = document.getElementById('util-report-graph-modal')?.classList.contains('is-open');
            if (!reportOpen && !graphOpen) {
                document.body.style.overflow = '';
            }
        }

