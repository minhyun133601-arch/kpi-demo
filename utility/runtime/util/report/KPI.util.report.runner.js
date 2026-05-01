        function applyUtilReportStateFromPanel(panel) {
            if (!panel) return;
            const from = panel.querySelector('[data-role="util-report-from"]')?.value || UtilReportState.from;
            const to = panel.querySelector('[data-role="util-report-to"]')?.value || UtilReportState.to;
            const scopeKeyRaw = panel.querySelector('[data-role="util-report-scope"]')?.value
                || UtilReportState.scopeKey
                || getUtilReportScopeFromMetric(UtilReportState.metricKey);
            const electricTeam = panel.querySelector('[data-role="util-report-team-electric"]')?.value || UtilReportState.electricTeam;
            const gasTeam = panel.querySelector('[data-role="util-report-team-gas"]')?.value || UtilReportState.gasTeam;
            const wasteTeam = panel.querySelector('[data-role="util-report-team-waste"]')?.value || UtilReportState.wasteTeam;
            let unitKey = panel.querySelector('[data-role="util-report-unit"]')?.value || UtilReportState.unitKey;
            const decimals = Number(panel.querySelector('[data-role="util-report-decimals"]')?.value || UtilReportState.decimals);
            const chartType = panel.querySelector('[data-role="util-report-chart-type"]')?.value || UtilReportState.chartType;

            if (unitKey === '1') unitKey = 'krw';
            else if (unitKey === '1000') unitKey = 'thousand';
            else if (unitKey === '1000000') unitKey = 'million';

            const range = normalizeMonthRange(from, to);
            const scopeKey = normalizeUtilReportScope(scopeKeyRaw);
            const selectedScopeKeys = scopeKey === 'total'
                ? normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys)
                : [scopeKey];
            const normalizedTeams = applyUtilReportScopeToTeams(scopeKey, {
                electricTeam,
                gasTeam,
                wasteTeam
            });

            clearUtilReportDetailMetricOverride();
            UtilReportState.from = range.start;
            UtilReportState.to = range.end;
            UtilReportState.scopeKey = scopeKey;
            UtilReportState.selectedScopeKeys = selectedScopeKeys;
            UtilReportState.electricTeam = normalizedTeams.electricTeam;
            UtilReportState.gasTeam = normalizedTeams.gasTeam;
            UtilReportState.wasteTeam = normalizedTeams.wasteTeam;
            UtilReportState.unitKey = normalizeUtilReportCostUnitKey(unitKey);
            UtilReportState.decimals = Number.isFinite(decimals) ? Math.max(0, Math.min(4, Math.floor(decimals))) : 0;
            UtilReportState.categoryKey = normalizeUtilReportCategory(UtilReportState.categoryKey);
            UtilReportState.metricKey = resolveUtilReportMetricKey(scopeKey, UtilReportState.categoryKey);
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            UtilReportState.chartType = chartType === 'line' ? 'line' : 'bar';
            UtilReportState.builderCustomMode = false;
            if (scopeKey === 'waste') {
                UtilReportState.wasteCostModeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                UtilReportState.activeWasteDetailCompositionKey = UtilReportState.wasteCostModeKey === 'total'
                    ? ''
                    : buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey);
            } else {
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
            }
        }

        function runUtilReportFromState(options = {}) {
            ensureUtilReportStateRange();
            UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || getUtilReportScopeFromMetric(UtilReportState.metricKey));
            UtilReportState.categoryKey = normalizeUtilReportCategory(UtilReportState.categoryKey);
            UtilReportState.unitKey = normalizeUtilReportCostUnitKey(UtilReportState.unitKey);
            UtilReportState.productionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportState.productionUnitKey);
            UtilReportState.productionTeam = normalizeUtilReportProductionTeam(UtilReportState.productionTeam);
            if (UtilReportState.scopeKey === 'total') {
                UtilReportState.selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys);
                if (UtilReportState.selectedScopeKeys.length === 1) {
                    UtilReportState.scopeKey = UtilReportState.selectedScopeKeys[0];
                }
            } else {
                UtilReportState.selectedScopeKeys = [UtilReportState.scopeKey];
            }
            UtilReportState.metricKey = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            const scopedTeams = applyUtilReportScopeToTeams(UtilReportState.scopeKey, {
                electricTeam: UtilReportState.electricTeam,
                gasTeam: UtilReportState.gasTeam,
                wasteTeam: UtilReportState.wasteTeam
            });
            UtilReportState.electricTeam = scopedTeams.electricTeam;
            UtilReportState.gasTeam = scopedTeams.gasTeam;
            UtilReportState.wasteTeam = scopedTeams.wasteTeam;
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            if (UtilReportState.scopeKey === 'waste') {
                UtilReportState.wasteCostModeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                UtilReportState.activeWasteDetailCompositionKey = UtilReportState.wasteCostModeKey === 'total'
                    ? ''
                    : buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey);
            } else {
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
            }
            syncUtilReportGraphMetricDefaults();

            const result = buildUtilReportMonthlyRows(UtilReportState);
            const compareOptions = getUtilReportCompareYearOptions(result);
            UtilReportState.compareYear = normalizeUtilReportCompareYear(UtilReportState.compareYear, compareOptions);
            UtilReportState.lastResult = result;
            const panel = document.querySelector('[data-role="util-report-panel"]');
            renderUtilReportPreview(panel, result);
            const modal = document.getElementById('util-report-modal');
            if (options.renderModal || modal?.classList.contains('is-open')) {
                renderUtilReportModal(result);
            }
            if (typeof syncUtilReportDetachedTableWindow === 'function') {
                syncUtilReportDetachedTableWindow(result);
            }
            return result;
        }

        function runUtilReport(panel, options = {}) {
            const rootPanel = panel && panel.matches?.('[data-role="util-report-panel"]')
                ? panel
                : (panel?.querySelector?.('[data-role="util-report-panel"]') || document.querySelector('[data-role="util-report-panel"]'));
            if (rootPanel) {
                applyUtilReportStateFromPanel(rootPanel);
            }
            return runUtilReportFromState(options);
        }

        function setUtilReportProductionOverride(monthKey, rawValue) {
            const key = String(monthKey || '').trim();
            if (!key) return false;
            const text = String(rawValue ?? '').replace(/,/g, '').trim();
            if (!text) {
                delete UtilReportOverrideState.productionByMonth[key];
                return true;
            }
            const value = Number(text);
            if (!Number.isFinite(value) || value < 0) return false;
            UtilReportOverrideState.productionByMonth[key] = value;
            return true;
        }

        function fillUtilReportTeamSelect(selectEl, entries, selectedValue) {
            if (!selectEl) return;
            const options = [];
            const isGasEntries = entries === UTIL_GAS_ENTRIES;
            const isElectricEntries = entries === UTIL_ELECTRIC_ENTRIES;
            let resolvedSelectedValue = selectedValue;
            if (isGasEntries) {
                const includeSiteGroups = normalizeUtilReportSiteKey(selectedValue) !== 'all';
                options.push(...buildUtilReportGasTeamOptions(entries, includeSiteGroups));
                if (selectedValue !== 'all') {
                    resolvedSelectedValue = findUtilReportBuilderTeamOption(selectedValue, 'gas') || selectedValue;
                }
            } else if (isElectricEntries) {
                options.push(...buildUtilReportElectricTeamOptions(entries, true));
            } else if (entries === UTIL_WASTE_ENTRIES) {
                options.push(...buildUtilReportWasteTeamOptions(entries));
            } else {
                options.push(...buildUtilTeamOptions(entries || []));
            }
            selectEl.innerHTML = `<option value="all">전체</option>` + options.map(team => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join('');
            if (resolvedSelectedValue === 'all' || options.includes(resolvedSelectedValue)) {
                selectEl.value = resolvedSelectedValue;
            } else {
                selectEl.value = 'all';
            }
        }

        function syncUtilReportTeamFieldVisibility(root, prefix, scopeKey) {
            if (!root) return;
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            ['electric', 'gas', 'waste'].forEach(kind => {
                const field = root.querySelector(`[data-role="${prefix}-team-field-${kind}"]`);
                const select = root.querySelector(`[data-role="${prefix}-team-${kind}"]`);
                const isVisible = normalizedScope === 'total' || normalizedScope === kind;
                if (field) field.classList.toggle('is-hidden', !isVisible);
                if (select) {
                    select.disabled = !isVisible;
                    if (!isVisible) select.value = 'all';
                }
            });
        }

        function collectUtilReportStateFromModal(modal) {
            if (!modal) return;
            const from = modal.querySelector('[data-role="util-report-modal-from"]')?.value || UtilReportState.from;
            const to = modal.querySelector('[data-role="util-report-modal-to"]')?.value || UtilReportState.to;
            const scopeKeyRaw = UtilReportState.scopeKey || getUtilReportScopeFromMetric(UtilReportState.metricKey);
            const electricTeam = modal.querySelector('[data-role="util-report-modal-team-electric"]')
                ? (modal.querySelector('[data-role="util-report-modal-team-electric"]')?.value || 'all')
                : 'all';
            const gasTeam = modal.querySelector('[data-role="util-report-modal-team-gas"]')
                ? (modal.querySelector('[data-role="util-report-modal-team-gas"]')?.value || 'all')
                : 'all';
            const wasteTeam = modal.querySelector('[data-role="util-report-modal-team-waste"]')
                ? (modal.querySelector('[data-role="util-report-modal-team-waste"]')?.value || 'all')
                : 'all';
            const categoryKey = normalizeUtilReportCategory(
                modal.querySelector('[data-role="util-report-modal-category"]')?.value || UtilReportState.categoryKey || 'cost'
            );
            const productionTeamRaw = modal.querySelector('[data-role="util-report-modal-team-production"]')?.value || UtilReportState.productionTeam || 'all';
            const unitRaw = modal.querySelector('[data-role="util-report-modal-unit"]')?.value
                || (categoryKey === 'production' ? UtilReportState.productionUnitKey : UtilReportState.unitKey);
            const decimals = Number(modal.querySelector('[data-role="util-report-modal-decimals"]')?.value || UtilReportState.decimals);
            const chartType = modal.querySelector('[data-role="util-report-modal-chart-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-modal-chart-type"]')?.value
                || UtilReportState.chartType;
            const showChartLabelsInput = modal.querySelector('[data-role="util-report-modal-show-labels"]');
            const compareYearRaw = modal.querySelector('[data-role="util-report-modal-compare-year"]')?.value ?? UtilReportState.compareYear;

            const range = normalizeMonthRange(from, to);
            const scopeKey = normalizeUtilReportScope(scopeKeyRaw);
            const selectedScopeKeys = scopeKey === 'total'
                ? normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys)
                : [scopeKey];
            const normalizedTeams = applyUtilReportScopeToTeams(scopeKey, {
                electricTeam,
                gasTeam,
                wasteTeam
            });

            UtilReportState.from = range.start;
            UtilReportState.to = range.end;
            UtilReportState.scopeKey = scopeKey;
            UtilReportState.selectedScopeKeys = selectedScopeKeys;
            UtilReportState.electricTeam = normalizedTeams.electricTeam;
            UtilReportState.gasTeam = normalizedTeams.gasTeam;
            UtilReportState.wasteTeam = normalizedTeams.wasteTeam;
            UtilReportState.categoryKey = categoryKey;
            UtilReportState.productionTeam = normalizeUtilReportProductionTeam(productionTeamRaw);
            if (categoryKey === 'production') {
                UtilReportState.productionUnitKey = normalizeUtilReportProductionUnitKey(unitRaw);
            } else {
                UtilReportState.unitKey = normalizeUtilReportCostUnitKey(unitRaw);
            }
            UtilReportState.decimals = Number.isFinite(decimals) ? Math.max(0, Math.min(4, Math.floor(decimals))) : 0;
            UtilReportState.metricKey = resolveUtilReportMetricKey(scopeKey, categoryKey);
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            UtilReportState.chartType = chartType === 'line' ? 'line' : 'bar';
            UtilReportState.showChartLabels = showChartLabelsInput ? showChartLabelsInput.checked : (UtilReportState.showChartLabels === true);
            UtilReportState.compareYear = String(compareYearRaw || '').trim();
            UtilReportState.builderCustomMode = false;
        }

        function syncUtilReportModalControls(modal) {
            if (!modal) return;
            const monthOptions = ensureUtilReportStateRange();
            const fromSelect = modal.querySelector('[data-role="util-report-modal-from"]');
            const toSelect = modal.querySelector('[data-role="util-report-modal-to"]');
            const electricTeamSelect = modal.querySelector('[data-role="util-report-modal-team-electric"]');
            const gasTeamSelect = modal.querySelector('[data-role="util-report-modal-team-gas"]');
            const wasteTeamSelect = modal.querySelector('[data-role="util-report-modal-team-waste"]');
            const productionTeamSelect = modal.querySelector('[data-role="util-report-modal-team-production"]');
            const productionTeamField = modal.querySelector('[data-role="util-report-modal-team-production-field"]');
            const categorySelect = modal.querySelector('[data-role="util-report-modal-category"]');
            const unitSelect = modal.querySelector('[data-role="util-report-modal-unit"]');
            const decimalsSelect = modal.querySelector('[data-role="util-report-modal-decimals"]');
            const chartTypeSelect = modal.querySelector('[data-role="util-report-modal-chart-type"]');
            const chartTypeToggleBtn = modal.querySelector('[data-role="util-report-modal-chart-type-toggle"]');
            const chartFullscreenToggleBtn = modal.querySelector('[data-role="util-report-modal-chart-fullscreen-toggle"]');
            const showLabelsCheckbox = modal.querySelector('[data-role="util-report-modal-show-labels"]');
            const compareYearSelect = modal.querySelector('[data-role="util-report-modal-compare-year"]');
            const overviewResetBtn = modal.querySelector('[data-role="util-report-modal-reset-overview"]');

            const monthHtml = monthOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
            if (fromSelect) fromSelect.innerHTML = monthHtml;
            if (toSelect) toSelect.innerHTML = monthHtml;

            UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || getUtilReportScopeFromMetric(UtilReportState.metricKey));
            UtilReportState.categoryKey = normalizeUtilReportCategory(UtilReportState.categoryKey);
            UtilReportState.unitKey = normalizeUtilReportCostUnitKey(UtilReportState.unitKey);
            UtilReportState.productionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportState.productionUnitKey);
            UtilReportState.productionTeam = normalizeUtilReportProductionTeam(UtilReportState.productionTeam);
            if (UtilReportState.scopeKey === 'total') {
                UtilReportState.selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys);
                if (UtilReportState.selectedScopeKeys.length === 1) {
                    UtilReportState.scopeKey = UtilReportState.selectedScopeKeys[0];
                }
            } else {
                UtilReportState.selectedScopeKeys = [UtilReportState.scopeKey];
            }
            if (UtilReportState.builderCustomMode) {
                const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey || UtilReportState.scopeKey);
                const valueKeys = normalizeUtilReportBuilderValueKeys(itemKey, UtilReportState.builderValueKeys);
                UtilReportState.metricKey = valueKeys.length
                    ? valueKeys[0]
                    : resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            } else {
                UtilReportState.metricKey = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            }
            UtilReportState.activeMetricCard = UtilReportState.metricKey;

            fillUtilReportTeamSelect(electricTeamSelect, UTIL_ELECTRIC_ENTRIES, UtilReportState.electricTeam);
            fillUtilReportTeamSelect(gasTeamSelect, UTIL_GAS_ENTRIES, UtilReportState.gasTeam);
            fillUtilReportTeamSelect(wasteTeamSelect, UTIL_WASTE_ENTRIES, UtilReportState.wasteTeam);

            if (fromSelect) fromSelect.value = UtilReportState.from;
            if (toSelect) toSelect.value = UtilReportState.to;
            if (categorySelect) {
                categorySelect.innerHTML = UTIL_REPORT_CATEGORY_OPTIONS.map(item => `<option value="${item.key}">${item.label}</option>`).join('');
                categorySelect.value = normalizeUtilReportCategory(UtilReportState.categoryKey);
            }
            if (productionTeamSelect) {
                productionTeamSelect.innerHTML = `<option value="all">전체</option>${UTIL_REPORT_PRODUCTION_TEAM_OPTIONS.map(team => `<option value="${team}">${team}</option>`).join('')}`;
                productionTeamSelect.value = UtilReportState.productionTeam;
            }
            const isProductionCategory = normalizeUtilReportCategory(UtilReportState.categoryKey) === 'production';
            if (productionTeamField) productionTeamField.classList.toggle('is-hidden', !isProductionCategory);
            if (productionTeamSelect) productionTeamSelect.disabled = !isProductionCategory;
            if (unitSelect) {
                syncUtilReportUnitSelectOptions(unitSelect, UtilReportState.categoryKey);
            }
            if (decimalsSelect) decimalsSelect.value = String(UtilReportState.decimals);
            if (chartTypeSelect) chartTypeSelect.value = UtilReportState.chartType;
            syncUtilReportChartTypeToggleButton(chartTypeToggleBtn, UtilReportState.chartType);
            UtilReportState.chartFullscreen = UtilReportState.chartFullscreen === true;
            syncUtilReportChartFullscreenToggleButton(chartFullscreenToggleBtn, UtilReportState.chartFullscreen);
            modal.classList.toggle('is-chart-fullscreen', UtilReportState.chartFullscreen);
            if (showLabelsCheckbox) showLabelsCheckbox.checked = UtilReportState.showChartLabels === true;

            const compareBaseResult = UtilReportState.lastResult || buildUtilReportMonthlyRows(UtilReportState);
            const compareOptions = getUtilReportCompareYearOptions(compareBaseResult);
            UtilReportState.compareYear = normalizeUtilReportCompareYear(UtilReportState.compareYear, compareOptions);
            if (compareYearSelect) {
                const compareYearHtml = compareOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
                compareYearSelect.innerHTML = `<option value="">없음</option>${compareYearHtml}`;
                compareYearSelect.value = UtilReportState.compareYear || '';
                compareYearSelect.disabled = false;
            }
            if (overviewResetBtn) {
                const isAtProductionOverview = isProductionCategory
                    && normalizeUtilReportProductionTeam(UtilReportState.productionTeam) === 'all'
                    && String(UtilReportState.activeSiteCompositionKey || '') === 'total_production'
                    && String(UtilReportState.activeProductionProcessCompositionKey || '') === UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY
                    && String(UtilReportState.activeProductionProductCompositionKey || '') === 'total_production_product'
                    && String(UtilReportState.productionSelectedCompositionView || 'team') === 'team';
                const isAtCostOverview = !isProductionCategory
                    && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                    && UtilReportState.electricTeam === 'all'
                    && UtilReportState.gasTeam === 'all'
                    && UtilReportState.wasteTeam === 'all'
                    && String(UtilReportState.costTotalSelectedCompositionView || 'total') === 'total'
                    && String(UtilReportState.wasteCostModeKey || 'total') === 'total';
                overviewResetBtn.innerHTML = '<i class="fas fa-rotate-left" aria-hidden="true"></i>';
                overviewResetBtn.setAttribute('aria-label', '전체 복귀');
                overviewResetBtn.setAttribute('title', '전체 복귀');
                overviewResetBtn.disabled = isProductionCategory ? isAtProductionOverview : isAtCostOverview;
            }
            syncUtilReportTeamFieldVisibility(modal, 'util-report-modal', UtilReportState.scopeKey);
            syncUtilReportGraphMetricDefaults();
        }

        function buildUtilReportCompositionData(result, options = {}) {
            if (!result || !result.summary) {
                return { total: 0, items: [] };
            }
            const yearFilter = String(options.year || '').trim();
            const compositionCategory = getUtilReportCompositionCategory(options.categoryKey || UtilReportState.categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            const isProductionCategory = compositionCategory === 'production';
            const selectedScopes = normalizeUtilReportSelectedScopeKeys(options.selectedScopeKeys || UtilReportState.selectedScopeKeys);
            const selectedScopeSet = new Set(selectedScopes);

            let electricCost = 0;
            let gasCost = 0;
            let wasteCost = 0;
            if (isProductionCategory) {
                const totals = buildUtilReportScopeProductionTotals(yearFilter, {
                    electricTeam: 'all',
                    gasTeam: 'all',
                    wasteTeam: 'all',
                    selectedScopeKeys: selectedScopes
                });
                electricCost = Number(totals.electric) || 0;
                gasCost = Number(totals.gas) || 0;
                wasteCost = Number(totals.waste) || 0;
            } else {
                electricCost = Number(result.summary.electricCost) || 0;
                gasCost = Number(result.summary.gasCost) || 0;
                wasteCost = Number(result.summary.wasteCost) || 0;
                if (yearFilter && Array.isArray(result.rows) && result.rows.length) {
                    electricCost = 0;
                    gasCost = 0;
                    wasteCost = 0;
                    result.rows.forEach(row => {
                        if (String(row?.year) !== yearFilter) return;
                        electricCost += Number(row?.electricCost) || 0;
                        gasCost += Number(row?.gasCost) || 0;
                        wasteCost += Number(row?.wasteCost) || 0;
                    });
                }
            }
            const items = [];
            if (selectedScopeSet.has('electric')) {
                items.push({ key: compositionKeys.electric, label: '전기', value: electricCost, color: UTIL_REPORT_DONUT_COLORS[compositionKeys.electric] || '#2563EB' });
            }
            if (selectedScopeSet.has('gas')) {
                items.push({ key: compositionKeys.gas, label: '가스', value: gasCost, color: UTIL_REPORT_DONUT_COLORS[compositionKeys.gas] || '#DC2626' });
            }
            if (selectedScopeSet.has('waste')) {
                items.push({ key: compositionKeys.waste, label: '폐수', value: wasteCost, color: UTIL_REPORT_DONUT_COLORS[compositionKeys.waste] || '#0EA5A3' });
            }
            const total = items.reduce((acc, item) => acc + (Number.isFinite(item.value) ? item.value : 0), 0);
            return {
                total,
                items,
                title: options.title || (isProductionCategory ? '총 생산량 구성비 (전기/가스/폐수)' : '총액 구성비 (전기/가스/폐수)'),
                valueType: isProductionCategory ? 'production' : 'cost',
                totalKey: compositionKeys.total
            };
        }

        function getUtilReportCompositionIconClass(item, compositionKind = 'total') {
            const key = String(item?.key || '').trim();
            if (key === 'total_cost') return 'fa-coins';
            if (key === 'total_production') return 'fa-industry';
            if (key === UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY) return 'fa-coins';
            if (key === 'electric_cost') return 'fa-bolt';
            if (key === 'gas_cost') return 'fa-fire';
            if (key === 'waste_cost') return 'fa-droplet';
            if (key === 'electric_production') return 'fa-bolt';
            if (key === 'gas_production') return 'fa-fire';
            if (key === 'waste_production') return 'fa-droplet';
            if (compositionKind === 'team-total-excl-waste' || key.startsWith(`${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::`)) {
                const parsed = parseUtilReportTeamTotalExcludeWasteCompositionMetric(key);
                const canonical = canonicalizeUtilTeamName(item?.teamName || parsed.teamName || item?.label);
                if (canonical === 'Plant B' || canonical === '1팀1파트') return 'fa-warehouse';
                if (canonical) return 'fa-users';
                return 'fa-coins';
            }
            if (compositionKind === 'process-total-excl-waste' || key.startsWith(`${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::`)) {
                const parsed = parseUtilReportProcessTotalExcludeWasteCompositionMetric(key);
                if (!parsed.processKey) return 'fa-coins';
                if (parsed.processKey === 'drying') return 'fa-industry';
                if (parsed.processKey === 'stick_pouch') return 'fa-box-open';
                if (parsed.processKey === 'liquid') return 'fa-flask';
                return 'fa-layer-group';
            }
            if (compositionKind === 'electric-process' || key.startsWith(`${UTIL_REPORT_ELECTRIC_PROCESS_PREFIX}::`)) {
                const parsed = parseUtilReportElectricProcessCompositionMetric(key);
                if (!parsed.processKey) return 'fa-bolt';
                if (parsed.processKey === 'drying') return 'fa-industry';
                if (parsed.processKey === 'stick_pouch') return 'fa-box-open';
                if (parsed.processKey === 'liquid') return 'fa-flask';
                return 'fa-layer-group';
            }
            if (compositionKind === 'gas-process' || key.startsWith(`${UTIL_REPORT_GAS_PROCESS_PREFIX}::`)) {
                const parsed = parseUtilReportGasProcessCompositionMetric(key);
                if (!parsed.processKey) return 'fa-fire';
                if (parsed.processKey === 'drying') return 'fa-industry';
                if (parsed.processKey === 'liquid') return 'fa-flask';
                return 'fa-layer-group';
            }
            if (compositionKind === 'production-process' || key.startsWith(`${UTIL_REPORT_PRODUCTION_PROCESS_PREFIX}::`)) {
                const parsed = parseUtilReportProductionProcessCompositionMetric(key);
                if (!parsed.processKey) return 'fa-industry';
                if (parsed.processKey === 'drying') return 'fa-industry';
                if (parsed.processKey === 'stick_pouch') return 'fa-box-open';
                if (parsed.processKey === 'liquid') return 'fa-flask';
                return 'fa-layer-group';
            }

            if (compositionKind === 'selected') {
                const sourceLabel = String(item?.sourceLabel || parseUtilReportTeamCompositionMetric(key).sourceLabel || '').trim();
                if (sourceLabel === '전기') return 'fa-bolt';
                if (sourceLabel === '가스') return 'fa-fire';
                if (sourceLabel === '폐수') return 'fa-droplet';
                if (sourceLabel === '생산량') return 'fa-industry';
            }

            if (compositionKind === 'production-product' || compositionKind === 'production-process-line') {
                return 'fa-tags';
            }

            if (compositionKind === 'site') {
                const siteKey = normalizeUtilReportSiteKey(item?.siteKey || parseUtilReportSiteCompositionMetric(key).siteKey);
                if (siteKey === 'Plant A') return 'fa-industry';
                if (siteKey === 'Plant B') return 'fa-warehouse';
            }
            if (compositionKind === 'waste-detail') {
                const detail = parseUtilReportWasteDetailMetric(key);
                switch (detail.modeKey) {
                    case 'total': return 'fa-coins';
                    case 'water': return 'fa-droplet';
                    case 'share': return 'fa-scale-balanced';
                    case 'sludge': return 'fa-industry';
                    case 'resin': return 'fa-flask';
                    case 'outsourcing': return 'fa-building';
                    case 'labor': return 'fa-users';
                    default: return 'fa-circle-dot';
                }
            }

            return 'fa-chart-pie';
        }

        function renderUtilReportCompositionLauncher(data) {
            const total = Number(data?.total) || 0;
            const items = Array.isArray(data?.items) ? data.items : [];
            const title = String(data?.title || '구성비');
            const valueType = normalizeUtilReportValueType(data?.valueType);
            const emptyLabel = valueType === 'production'
                ? '해당 기간의 생산량 데이터가 없어 원형 그래프를 표시할 수 없습니다.'
                : '해당 기간의 비용 데이터가 없어 원형 그래프를 표시할 수 없습니다.';
            if (!total || !items.length) {
                return `
                    <div class="util-report-composition-top">
                        <div class="util-report-composition-title">${escapeHtml(title)}</div>
                        <button type="button" class="util-report-composition-open" data-role="util-report-composition-open">팝업 열기</button>
                    </div>
                    <div class="util-report-composition-launch-note">${escapeHtml(emptyLabel)}</div>
                `;
            }
            const rows = items.map(item => {
                const ratio = total > 0 ? (item.value / total) * 100 : 0;
                const iconClass = getUtilReportCompositionIconClass(item, 'total');
                return `
                    <div class="util-report-composition-launch-row">
                        <span class="util-report-composition-key"><i class="util-report-composition-dot" style="background:${item.color};"></i><i class="util-report-composition-icon fa-solid ${iconClass}" aria-hidden="true"></i>${item.label}</span>
                        <span>${formatUtilNumber(ratio, 1)}%</span>
                    </div>
                `;
            }).join('');
            return `
                <div class="util-report-composition-top">
                    <div class="util-report-composition-title">${escapeHtml(title)}</div>
                    <button type="button" class="util-report-composition-open" data-role="util-report-composition-open">팝업 열기</button>
                </div>
                <div class="util-report-composition-launch-note">원형 그래프는 팝업에서만 표시됩니다.</div>
                <div class="util-report-composition-launch-list">${rows}</div>
            `;
        }

        function buildUtilReportCompositionCenterToggleHtml(toggleTarget = '', nextView = '', label = '보기 전환') {
            const target = String(toggleTarget || '').trim();
            const view = String(nextView || '').trim();
            const title = String(label || '보기 전환').trim() || '보기 전환';
            if (!target || !view) return '';
            return `<button type="button" class="util-report-composition-center-toggle" data-role="util-report-composition-toggle-view" data-toggle-target="${escapeHtml(target)}" data-next-view="${escapeHtml(view)}" aria-label="${escapeHtml(title)}" title="${escapeHtml(title)}"><i class="fa-solid fa-right-left" aria-hidden="true"></i></button>`;
        }

        function renderUtilReportCompositionDonut(data, options = {}) {
            const total = Number(data?.total) || 0;
            const items = Array.isArray(data?.items) ? data.items : [];
            const activeMetric = String(options.activeMetric || '').trim();
            const focusItemKey = String(options.focusItemKey || '').trim();
            const highlightMetrics = Array.isArray(options.highlightMetrics)
                ? options.highlightMetrics
                : (Array.isArray(data?.highlightItemKeys) ? data.highlightItemKeys : []);
            const highlightMetricSet = new Set(highlightMetrics.map(item => String(item || '').trim()).filter(Boolean));
            const compositionKind = String(options.compositionKind || 'total').trim() || 'total';
            const metricMetaMap = options.metricMetaMap && typeof options.metricMetaMap === 'object'
                ? options.metricMetaMap
                : {};
            const valueType = normalizeUtilReportValueType(options.valueType || data?.valueType);
            const unitLabel = getUtilReportValueUnitLabelByType(valueType);
            const decimals = UtilReportState.decimals;
            const size = Number(options.size) > 0 ? Number(options.size) : 140;
            const strokeWidth = Math.max(12, Math.round(size * 0.13));
            const radius = Math.max(30, Math.floor((size - strokeWidth) / 2));
            const center = size / 2;
            const circumference = 2 * Math.PI * radius;
            const largeClass = options.large ? 'is-large' : '';
            const showOpen = options.showOpen !== false;
            const title = options.title || data?.title || '구성비';
            const centerLabel = options.centerLabel || '총액';
            const centerControlHtml = String(options.centerControlHtml || '');
            const ratioTotalRaw = Number(options.ratioTotal ?? data?.ratioTotal);
            const ratioTotal = ratioTotalRaw > 0 ? ratioTotalRaw : total;
            const totalItemValueRaw = Number(options.totalItemValue ?? data?.totalItemValue);
            const totalItemValue = totalItemValueRaw > 0 ? totalItemValueRaw : total;
            const totalItem = options.includeTotalItem
                ? {
                    key: String(options.totalItemKey || (valueType === 'production' ? 'total_production' : 'total_cost')).trim() || (valueType === 'production' ? 'total_production' : 'total_cost'),
                    label: String(options.totalItemLabel || '총액').trim() || '총액',
                    value: totalItemValue,
                    color: String(options.totalItemColor || '#94a3b8').trim() || '#94a3b8',
                    isTotal: true
                }
                : null;
            const focusPool = totalItem ? [totalItem].concat(items) : items;
            const focusItem = focusItemKey
                ? (focusPool.find(item => String(item?.key || '') === focusItemKey) || null)
                : null;
            const centerTitleText = focusItem ? String(focusItem.label || centerLabel) : centerLabel;
            const centerValue = focusItem ? (Number(focusItem.value) || 0) : total;
            const segmentItems = items.filter(item => item?.excludeFromDonut !== true);

            if (!total || !segmentItems.length) {
                return `
                    <div class="util-report-composition-title">${escapeHtml(title)}</div>
                    <div class="text-sm text-slate-300">해당 기간에 구성비 데이터가 없습니다.</div>
                `;
            }

            const hasActiveSegment = !!activeMetric && segmentItems.some(item => String(item?.key || '') === activeMetric);
            const hasHighlightSegments = !hasActiveSegment
                && highlightMetricSet.size > 0
                && segmentItems.some(item => highlightMetricSet.has(String(item?.key || '')));
            let offset = 0;
            const segmentGap = segmentItems.length > 1 ? Math.max(1.6, circumference * 0.006) : 0;
            const segments = segmentItems.map(item => {
                const ratio = item.value / total;
                const rawLength = circumference * ratio;
                const length = Math.max(0, rawLength - segmentGap);
                const isActive = hasActiveSegment && String(item?.key || '') === activeMetric;
                const isHighlighted = !hasActiveSegment && hasHighlightSegments && highlightMetricSet.has(String(item?.key || ''));
                const segmentStrokeWidth = isActive
                    ? (strokeWidth + 4)
                    : (isHighlighted ? (strokeWidth + 2) : strokeWidth);
                const segmentOpacity = (hasActiveSegment || hasHighlightSegments) && !(isActive || isHighlighted) ? '0.24' : '1';
                const segmentStyle = (isActive || isHighlighted) ? 'filter:drop-shadow(0 0 6px rgba(96,165,250,0.95));' : '';
                const html = `<circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${item.color}" stroke-width="${segmentStrokeWidth}" stroke-linecap="round" opacity="${segmentOpacity}" style="${segmentStyle}" transform="rotate(-90 ${center} ${center})" stroke-dasharray="${length} ${Math.max(0, circumference - length)}" stroke-dashoffset="${-offset}"></circle>`;
                offset += rawLength;
                return html;
            }).join('');

            const legendItems = totalItem
                ? [totalItem].concat(items.filter(item => item?.excludeFromLegend !== true))
                : items.filter(item => item?.excludeFromLegend !== true);

            const legend = legendItems.map(item => {
                const ratio = ratioTotal > 0 ? (item.value / ratioTotal) * 100 : 0;
                const isLegendActive = activeMetric === item.key || (item?.isTotal && focusItemKey === item.key);
                const activeClass = isLegendActive ? 'is-active' : '';
                const iconClass = getUtilReportCompositionIconClass(item, compositionKind);
                const ratioSuffix = options.appendSourceToRatio && item?.sourceLabel
                    ? ` (${item.sourceLabel})`
                    : '';
                const metaRows = Array.isArray(metricMetaMap[item.key]) ? metricMetaMap[item.key] : [];
                const metaHtml = metaRows.length
                    ? `<div class="util-report-composition-meta">${metaRows.map(meta => {
                        const cls = meta?.className ? ` ${meta.className}` : '';
                        return `<span class="util-report-composition-meta-pill${cls}">${escapeHtml(String(meta?.text || ''))}</span>`;
                    }).join('')}</div>`
                    : '';
                return `
                    <button type="button" class="util-report-composition-item ${activeClass}" data-role="util-report-composition-item" data-metric="${item.key}" data-composition-kind="${compositionKind}">
                        <span class="util-report-composition-key"><i class="util-report-composition-dot" style="background:${item.color};"></i><i class="util-report-composition-icon fa-solid ${iconClass}" aria-hidden="true"></i>${escapeHtml(String(item.label || '-'))}</span>
                        <span class="util-report-composition-value">
                            <span class="main">${formatUtilReportValueByType(item.value, valueType, decimals)} ${unitLabel}</span>
                            <span class="ratio">${formatUtilNumber(ratio, 1)}%${escapeHtml(String(ratioSuffix || ''))}</span>
                        </span>
                        ${metaHtml}
                    </button>
                `;
            }).join('');

            const topHtml = showOpen
                ? `<div class="util-report-composition-top"><div class="util-report-composition-title">${escapeHtml(title)}</div><button type="button" class="util-report-composition-open" data-role="util-report-composition-open">팝업 열기</button></div>`
                : `<div class="util-report-composition-title">${escapeHtml(title)}</div>`;

            return `
                ${topHtml}
                <div class="util-report-composition-wrap ${largeClass}">
                    <div class="util-report-composition-donut ${showOpen ? 'is-clickable' : ''}" ${showOpen ? 'data-role="util-report-composition-open" role="button" tabindex="0" aria-label="구성비 팝업 열기"' : ''}>
                        <svg viewBox="0 0 ${size} ${size}" role="img" aria-label="구성비 원형 그래프">
                            <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="#1e293b" stroke-width="${strokeWidth}"></circle>
                            ${segments}
                            <text x="${center}" y="${center - 4}" text-anchor="middle" class="util-report-composition-center">${escapeHtml(centerTitleText)}</text>
                            <text x="${center}" y="${center + 16}" text-anchor="middle" class="util-report-composition-center">${formatUtilReportValueByType(centerValue, valueType, decimals)} ${unitLabel}</text>
                        </svg>
                        ${centerControlHtml}
                    </div>
                    <div class="util-report-composition-legend">${legend}</div>
                </div>
            `;
        }

        function renderUtilReportCompositionFlipCard(frontHtml, backHtml, options = {}) {
            const activeView = String(options.activeView || 'scope').trim() === 'site' ? 'site' : 'scope';
            return `
                <div class="util-report-composition-flip ${activeView === 'site' ? 'is-site' : ''}">
                    <div class="util-report-composition-flip-card">
                        <div class="util-report-composition-flip-face is-front">${frontHtml}</div>
                        <div class="util-report-composition-flip-face is-back">${backHtml}</div>
                    </div>
                </div>
            `;
        }
        function buildUtilReportYoYRows(result, metricKey, compareYear) {
            if (!result || !Array.isArray(result.rows) || !result.rows.length) {
                return { rows: [], summary: null, pair: null };
            }

            const toYoYRows = (currentRows, prevRowResolver, pair = null) => {
                const rows = currentRows.map(row => {
                    const prevRow = prevRowResolver(row);
                    const currentValue = Number(getUtilReportMetricValue(row, metricKey));
                    const prevValueRaw = Number(getUtilReportMetricValue(prevRow, metricKey));
                    const current = Number.isFinite(currentValue) ? currentValue : null;
                    const prev = Number.isFinite(prevValueRaw) ? prevValueRaw : null;
                    const delta = (current !== null && prev !== null) ? current - prev : null;
                    const rate = (delta !== null && prev !== 0) ? (delta / prev) * 100 : null;
                    return {
                        monthKey: row.monthKey,
                        current,
                        prev,
                        delta,
                        rate
                    };
                });

                const currentSum = rows.reduce((acc, item) => acc + (Number.isFinite(item.current) ? item.current : 0), 0);
                const prevSumRaw = rows.reduce((acc, item) => acc + (Number.isFinite(item.prev) ? item.prev : 0), 0);
                const missingPrevCount = rows.reduce((acc, item) => acc + (Number.isFinite(item.prev) ? 0 : 1), 0);
                const hasAllPrev = missingPrevCount === 0;
                const prevSum = hasAllPrev ? prevSumRaw : null;
                const deltaSum = hasAllPrev ? (currentSum - prevSumRaw) : null;
                const rateSum = hasAllPrev && prevSumRaw !== 0 ? (deltaSum / prevSumRaw) * 100 : null;

                return {
                    rows,
                    summary: {
                        current: currentSum,
                        prev: prevSum,
                        delta: deltaSum,
                        rate: rateSum,
                        missingPrevCount
                    },
                    pair
                };
            };

            const targetYear = Number(compareYear);
            if (Number.isFinite(targetYear)) {
                const currentRows = result.rows.filter(row => row.year === targetYear);
                if (currentRows.length) {
                    const monthNumbers = currentRows.map(row => Number(row.month)).filter(Number.isFinite);
                    if (monthNumbers.length) {
                        const minMonth = Math.min(...monthNumbers);
                        const maxMonth = Math.max(...monthNumbers);
                        const prevState = {
                            ...UtilReportState,
                            from: toUtilMonthKey(targetYear - 1, minMonth),
                            to: toUtilMonthKey(targetYear - 1, maxMonth)
                        };
                        const prevResult = buildUtilReportMonthlyRows(prevState);
                        const prevByMonth = new Map((prevResult.rows || []).map(row => [row.month, row]));
                        return toYoYRows(currentRows, row => prevByMonth.get(row.month), {
                            currentYear: targetYear,
                            prevYear: targetYear - 1
                        });
                    }
                }
            }

            const prevState = {
                ...UtilReportState,
                from: shiftUtilMonthKeyByYear(UtilReportState.from, -1),
                to: shiftUtilMonthKeyByYear(UtilReportState.to, -1)
            };
            const prevResult = buildUtilReportMonthlyRows(prevState);
            const prevMap = new Map((prevResult.rows || []).map(row => [row.monthKey, row]));
            return toYoYRows(result.rows, row => prevMap.get(toUtilMonthKey(row.year - 1, row.month)), null);
        }
