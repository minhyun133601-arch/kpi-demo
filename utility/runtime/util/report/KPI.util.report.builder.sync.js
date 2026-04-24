        function syncUtilReportBuilderVizStateFromDualSection(section, datasetKey = '') {
            if (!section) return;
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(datasetKey || section.dataset.datasetKey || UtilReportBuilderVizState.itemKey || 'electric');
            const normalizedTeam = normalizeUtilReportBuilderTeam(
                section.dataset.activeTeam || UtilReportBuilderVizState.team || '전체',
                normalizedItemKey
            );
            const usageUnitKey = normalizeUtilReportBuilderVizUsageUnitKey(
                section.dataset.usageUnitKey || UtilReportBuilderVizState.usageUnitKey,
                normalizedItemKey
            );
            const costUnitKey = normalizeUtilReportCostUnitKey(section.dataset.costUnitKey || UtilReportBuilderVizState.costUnitKey);
            const productionUnitKey = normalizeUtilReportProductionUnitKey(section.dataset.productionUnitKey || UtilReportBuilderVizState.productionUnitKey);
            const usageDecimals = clampUtilReportBuilderVizDecimals(getUtilDualReportSyncDecimals(section, 'usage'));
            const costDecimals = clampUtilReportBuilderVizDecimals(getUtilDualReportSyncDecimals(section, 'cost'));
            const productionDecimals = clampUtilReportBuilderVizDecimals(getUtilDualReportSyncDecimals(section, 'production'));
            const ratioDecimals = clampUtilReportBuilderVizDecimals(getUtilDualReportSyncDecimals(section, 'ratio'));
            const rawShowLabels = String(section.dataset.reportShowLabels || '').trim().toLowerCase();
            const showLabels = rawShowLabels === 'true'
                ? true
                : (rawShowLabels === 'false' ? false : (UtilReportState.showChartLabels === true));

            UtilReportBuilderVizState.itemKey = normalizedItemKey;
            UtilReportBuilderVizState.team = normalizedTeam;
            UtilReportBuilderVizState.usageUnitKey = usageUnitKey;
            UtilReportBuilderVizState.costUnitKey = costUnitKey;
            UtilReportBuilderVizState.productionUnitKey = productionUnitKey;
            UtilReportBuilderVizState.usageDecimals = usageDecimals;
            UtilReportBuilderVizState.costDecimals = costDecimals;
            UtilReportBuilderVizState.productionDecimals = productionDecimals;
            UtilReportBuilderVizState.ratioDecimals = ratioDecimals;
            UtilReportBuilderVizState.decimals = usageDecimals;
            UtilReportBuilderVizState.showLabels = showLabels;

            UtilReportState.builderItemKey = normalizedItemKey;
            UtilReportState.scopeKey = normalizeUtilReportScope(normalizedItemKey);
            UtilReportState.selectedScopeKeys = [normalizedItemKey];
            UtilReportState.unitKey = costUnitKey;
            UtilReportState.productionUnitKey = productionUnitKey;
            UtilReportState.decimals = usageDecimals;
            UtilReportState.showChartLabels = showLabels;
            UtilReportState.graphNumeratorMetric = resolveUtilReportGraphMetricKeyByDualRatioMetric(
                normalizedItemKey,
                section.dataset.ratioNumerator || 'usage'
            );
            UtilReportState.graphDenominatorMetric = resolveUtilReportGraphMetricKeyByDualRatioMetric(
                normalizedItemKey,
                section.dataset.ratioDenominator || 'production'
            );
            UtilReportState.graphUseDenominator = true;

            const teamFilter = resolveUtilReportBuilderTeamFilter(normalizedTeam, normalizedItemKey);
            if (normalizedItemKey === 'electric') UtilReportState.electricTeam = teamFilter;
            else if (normalizedItemKey === 'gas') UtilReportState.gasTeam = teamFilter;
            else if (normalizedItemKey === 'waste') UtilReportState.wasteTeam = teamFilter;
        }

        function resetUtilReportBuilderVizRangeToFull() {
            const monthOptions = buildUtilReportMonthOptions();
            if (!Array.isArray(monthOptions) || !monthOptions.length) return false;
            const nextFrom = String(monthOptions[0]?.value || '').trim();
            const nextTo = String(monthOptions[monthOptions.length - 1]?.value || '').trim();
            if (!nextFrom || !nextTo) return false;
            const range = normalizeMonthRange(nextFrom, nextTo);
            const defaultYears = resolveUtilReportBuilderVizDefaultAppliedYears(range);
            UtilReportState.from = range.start;
            UtilReportState.to = range.end;
            UtilReportBuilderVizState.from = range.start;
            UtilReportBuilderVizState.to = range.end;
            UtilReportBuilderVizState.appliedBaseYear = normalizeUtilReportBuilderVizAppliedBaseYear(
                UtilReportBuilderVizState.appliedBaseYear,
                range
            );
            UtilReportBuilderVizState.appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                UtilReportBuilderVizState.appliedCompareYear,
                UtilReportBuilderVizState.appliedBaseYear,
                range
            );
            if (UtilReportBuilderVizState.appliedModeEnabled === true) {
                if (!UtilReportBuilderVizState.appliedBaseYear) {
                    UtilReportBuilderVizState.appliedBaseYear = defaultYears.baseYear;
                }
                if (!UtilReportBuilderVizState.appliedCompareYear) {
                    UtilReportBuilderVizState.appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                        defaultYears.compareYear,
                        UtilReportBuilderVizState.appliedBaseYear,
                        range
                    );
                }
            }
            return true;
        }

        function syncUtilDualSectionFromReportBuilderViz(itemKey = UtilReportBuilderVizState.itemKey) {
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey);
            const section = getUtilDualCombinedSection(normalizedItemKey);
            if (!section) return;
            const wrapper = section.closest('[data-util-dual]');
            const nextTeam = normalizeUtilReportBuilderTeam(UtilReportBuilderVizState.team, normalizedItemKey);
            const nextUsageUnitKey = normalizeUtilDualUsageUnitKey(UtilReportBuilderVizState.usageUnitKey, normalizedItemKey);
            const nextCostUnitKey = normalizeUtilReportCostUnitKey(UtilReportBuilderVizState.costUnitKey);
            const nextProductionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportBuilderVizState.productionUnitKey);
            const nextUsageDecimals = String(getUtilReportBuilderVizMetricDecimals('usage'));
            const nextCostDecimals = String(getUtilReportBuilderVizMetricDecimals('cost'));
            const nextProductionDecimals = String(getUtilReportBuilderVizMetricDecimals('production'));
            const nextRatioDecimals = String(getUtilReportBuilderVizMetricDecimals('ratio'));

            section.dataset.datasetKey = normalizedItemKey;
            section.dataset.usageUnitKey = nextUsageUnitKey;
            section.dataset.costUnitKey = nextCostUnitKey;
            section.dataset.productionUnitKey = nextProductionUnitKey;
            section.dataset.usageDecimals = nextUsageDecimals;
            section.dataset.costDecimals = nextCostDecimals;
            section.dataset.productionDecimals = nextProductionDecimals;
            section.dataset.ratioDecimals = nextRatioDecimals;
            section.dataset.reportDecimals = nextUsageDecimals;
            section.dataset.reportShowLabels = UtilReportBuilderVizState.showLabels === true ? 'true' : 'false';
            section.dataset.ratioNumerator = resolveUtilDualRatioMetricKeyByGraphMetric(
                normalizedItemKey,
                UtilReportState.graphNumeratorMetric,
                'usage'
            );
            section.dataset.ratioDenominator = resolveUtilDualRatioMetricKeyByGraphMetric(
                normalizedItemKey,
                UtilReportState.graphDenominatorMetric,
                'production'
            );

            const teamButtons = Array.from(wrapper?.querySelectorAll?.('[data-util-dual-tabs] [data-team]') || []);
            const nextTeamButton = teamButtons.find(button => String(button.dataset.team || '').trim() === nextTeam);
            if (nextTeamButton) {
                const currentTeam = String(section.dataset.activeTeam || '').trim();
                section.dataset.activeTeam = nextTeam;
                if (currentTeam !== nextTeam || !nextTeamButton.classList.contains('active')) {
                    nextTeamButton.click();
                    return;
                }
            }

            syncUtilDualSelects(section);
            applyUtilCostMode(section);
            applyUtilDualConversion(section);
        }

        function getUtilReportBuilderVizMetricDisplayLabel(metricKey, itemKey = UtilReportBuilderVizState.itemKey) {
            switch (String(metricKey || '').trim()) {
                case 'electric_usage': return '전력량';
                case 'gas_usage': return '가스량';
                case 'waste_usage': return '방류량';
                case 'electric_cost':
                case 'gas_cost':
                case 'waste_cost':
                case 'total_cost':
                    return '비용';
                case 'production':
                    return '생산량';
                default: {
                    const fallbackLabel = String(
                        getUtilReportGraphMetricLabel(metricKey, normalizeUtilReportScope(itemKey))
                        || metricKey
                    ).trim();
                    if (fallbackLabel === '전기 사용량') return '전력량';
                    if (fallbackLabel === '가스 사용량') return '가스량';
                    if (fallbackLabel === '폐수 사용량') return '방류량';
                    return fallbackLabel || '-';
                }
            }
        }

        function getUtilReportBuilderVizMetricUnitLabel(metricKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const rawMetric = String(metricKey || '').trim();
            if (!rawMetric) return '';
            if (isUtilReportCostMetric(rawMetric)) {
                return getUtilReportUnitLabel(UtilReportBuilderVizState.costUnitKey);
            }
            if (rawMetric === 'production') {
                return getUtilReportProductionUnitLabel(UtilReportBuilderVizState.productionUnitKey);
            }
            if (['electric_usage', 'gas_usage', 'waste_usage'].includes(rawMetric)) {
                return getUtilReportBuilderVizUsageLabel(UtilReportBuilderVizState.usageUnitKey, itemKey);
            }
            return '';
        }

        function getUtilReportBuilderVizMetricScale(metricKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const rawMetric = String(metricKey || '').trim();
            if (!rawMetric) return 1;
            if (isUtilReportCostMetric(rawMetric)) {
                return getUtilReportScale(UtilReportBuilderVizState.costUnitKey);
            }
            if (rawMetric === 'production') {
                return getUtilReportProductionScale(UtilReportBuilderVizState.productionUnitKey);
            }
            if (['electric_usage', 'gas_usage', 'waste_usage'].includes(rawMetric)) {
                return getUtilReportBuilderVizUsageScale(UtilReportBuilderVizState.usageUnitKey, itemKey);
            }
            return 1;
        }

        function isUtilReportBuilderVizMetricEnabled(metricKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const rawMetric = String(metricKey || '').trim();
            if (!rawMetric) return false;
            if (isUtilReportCostMetric(rawMetric)) {
                return normalizeUtilReportCostUnitKey(UtilReportBuilderVizState.costUnitKey) !== 'none';
            }
            if (rawMetric === 'production') {
                return normalizeUtilReportProductionUnitKey(UtilReportBuilderVizState.productionUnitKey) !== 'none';
            }
            if (['electric_usage', 'gas_usage', 'waste_usage'].includes(rawMetric)) {
                return normalizeUtilReportBuilderVizUsageUnitKey(UtilReportBuilderVizState.usageUnitKey, itemKey) !== 'none';
            }
            return true;
        }

        function resolveUtilReportBuilderVizRatioConfig(itemKey = UtilReportBuilderVizState.itemKey) {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const scopeKey = normalizeUtilReportScope(normalizedItemKey);
            const metricOptions = getUtilReportGraphMetricOptions(scopeKey);
            const defaultNumerator = resolveUtilReportGraphMetricKeyByDualRatioMetric(normalizedItemKey, 'usage');
            const numeratorMetric = normalizeUtilReportGraphMetric(
                UtilReportState.graphNumeratorMetric,
                metricOptions,
                defaultNumerator
            );
            const denominatorMetric = normalizeUtilReportGraphMetric(
                UtilReportState.graphDenominatorMetric,
                metricOptions,
                metricOptions.some(item => item.key === 'production') ? 'production' : numeratorMetric
            );
            return {
                itemKey: normalizedItemKey,
                numeratorMetric,
                denominatorMetric,
                useDenominator: UtilReportState.graphUseDenominator !== false
            };
        }

        function getUtilDualRatioMetricAlternativeKey(excludedKey = '', fallback = 'usage') {
            const blockedKey = normalizeUtilDualRatioMetricKey(excludedKey);
            const preferredKey = normalizeUtilDualRatioMetricKey(fallback);
            if (preferredKey !== blockedKey) return preferredKey;
            return ['usage', 'cost', 'production'].find(key => key !== blockedKey) || 'usage';
        }

        function normalizeUtilReportBuilderVizRatioPair(numeratorKey = 'usage', denominatorKey = 'production') {
            const normalizedNumerator = normalizeUtilDualRatioMetricKey(numeratorKey);
            const normalizedDenominator = normalizeUtilDualRatioMetricKey(denominatorKey);
            return {
                numerator: normalizedNumerator,
                denominator: normalizedDenominator
            };
        }

        function syncUtilReportBuilderVizRatioSelects(modal) {
            if (!modal) return normalizeUtilReportBuilderVizRatioPair();
            const ratioConfig = resolveUtilReportBuilderVizRatioConfig(UtilReportBuilderVizState.itemKey);
            const ratioNumeratorSelect = modal.querySelector('[data-role="util-report-builder-viz-ratio-numerator"]');
            const ratioDenominatorSelect = modal.querySelector('[data-role="util-report-builder-viz-ratio-denominator"]');
            const fallbackNumerator = resolveUtilDualRatioMetricKeyByGraphMetric(
                UtilReportBuilderVizState.itemKey,
                ratioConfig.numeratorMetric,
                'usage'
            );
            const fallbackDenominator = resolveUtilDualRatioMetricKeyByGraphMetric(
                UtilReportBuilderVizState.itemKey,
                ratioConfig.denominatorMetric,
                'production'
            );
            const ratioPair = normalizeUtilReportBuilderVizRatioPair(
                ratioNumeratorSelect?.value || fallbackNumerator,
                ratioDenominatorSelect?.value || fallbackDenominator
            );
            if (ratioNumeratorSelect) {
                ratioNumeratorSelect.innerHTML = getUtilDualRatioMetricOptionsHtml(ratioPair.numerator, ratioPair.denominator);
                ratioNumeratorSelect.value = ratioPair.numerator;
            }
            if (ratioDenominatorSelect) {
                ratioDenominatorSelect.innerHTML = getUtilDualRatioMetricOptionsHtml(ratioPair.denominator, ratioPair.numerator);
                ratioDenominatorSelect.value = ratioPair.denominator;
            }
            return ratioPair;
        }

        function buildUtilReportBuilderVizRatioMeta(
            itemKey = UtilReportBuilderVizState.itemKey,
            numeratorMetric = '',
            denominatorMetric = '',
            useDenominator = true
        ) {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const numeratorLabel = getUtilReportBuilderVizMetricDisplayLabel(numeratorMetric, normalizedItemKey) || '사용량';
            const denominatorLabel = getUtilReportBuilderVizMetricDisplayLabel(denominatorMetric, normalizedItemKey) || '생산량';
            const numeratorUnitLabel = getUtilReportBuilderVizMetricUnitLabel(numeratorMetric, normalizedItemKey);
            const denominatorUnitLabel = getUtilReportBuilderVizMetricUnitLabel(denominatorMetric, normalizedItemKey);
            const title = useDenominator === true
                ? `${denominatorLabel} 대비 ${numeratorLabel}`
                : numeratorLabel;
            const unitLabel = buildUtilReportBuilderVizRatioUnitLabel(
                numeratorUnitLabel,
                denominatorUnitLabel,
                useDenominator
            );
            const axisBaseLabel = useDenominator === true
                ? `${numeratorLabel}/${denominatorLabel}`
                : numeratorLabel;
            return {
                title,
                unitLabel,
                axisBaseLabel,
                axisLabel: formatUtilLabelWithUnit(axisBaseLabel, unitLabel),
                numeratorLabel,
                denominatorLabel,
                numeratorUnitLabel,
                denominatorUnitLabel
            };
        }

        function getUtilReportBuilderVizRatioTitle(
            itemKey = UtilReportBuilderVizState.itemKey,
            numeratorMetric = '',
            denominatorMetric = '',
            useDenominator = true
        ) {
            return buildUtilReportBuilderVizRatioMeta(itemKey, numeratorMetric, denominatorMetric, useDenominator).title;
        }

        function getUtilReportBuilderVizRatioAxisLabel(
            itemKey = UtilReportBuilderVizState.itemKey,
            unitLabel = '',
            numeratorMetric = '',
            denominatorMetric = '',
            useDenominator = true
        ) {
            const meta = buildUtilReportBuilderVizRatioMeta(itemKey, numeratorMetric, denominatorMetric, useDenominator);
            return formatUtilLabelWithUnit(meta.axisBaseLabel, unitLabel || meta.unitLabel);
        }

        function normalizeUtilReportCategory(categoryKey) {
            const raw = String(categoryKey || '').trim();
            return UTIL_REPORT_CATEGORY_OPTIONS.some(item => item.key === raw) ? raw : 'cost';
        }

        function getUtilReportScopeFromMetric(metricKey) {
            const rawMetric = String(metricKey || '').trim();
            if (rawMetric === 'total_production') return 'total';
            if (rawMetric === 'electric_production') return 'electric';
            if (rawMetric === 'gas_production') return 'gas';
            if (rawMetric === 'waste_production') return 'waste';
            if (rawMetric === 'electric_usage') return 'electric';
            if (rawMetric === 'gas_usage') return 'gas';
            if (rawMetric === 'waste_usage') return 'waste';
            if (getUtilReportTotalExcludeWasteMetricDescriptor(rawMetric)) return 'total';
            const normalizedMetric = getUtilReportMetricOption(rawMetric).key;
            const matched = UTIL_REPORT_SCOPE_OPTIONS.find(item => item.metricKey === normalizedMetric);
            return matched ? matched.key : 'total';
        }

        function getUtilReportMetricFromScope(scopeKey) {
            return getUtilReportScopeOption(scopeKey).metricKey;
        }

        function resolveUtilReportMetricKey(scopeKey, categoryKey) {
            const normalizedCategory = normalizeUtilReportCategory(categoryKey);
            if (normalizedCategory === 'production') return 'production';
            return getUtilReportMetricFromScope(scopeKey);
        }

        function getUtilReportCompositionCategory(categoryKey = UtilReportState.categoryKey) {
            return normalizeUtilReportCategory(categoryKey) === 'production' ? 'production' : 'cost';
        }

        function getUtilReportCompositionMetricKeys(categoryKey = UtilReportState.categoryKey) {
            const category = getUtilReportCompositionCategory(categoryKey);
            return UTIL_REPORT_COMPOSITION_KEYSETS[category] || UTIL_REPORT_COMPOSITION_KEYSETS.cost;
        }

        function getUtilReportCompositionMetricKeyByScope(scopeKey, categoryKey = UtilReportState.categoryKey) {
            const keys = getUtilReportCompositionMetricKeys(categoryKey);
            const scope = normalizeUtilReportScope(scopeKey);
            if (scope === 'electric') return keys.electric;
            if (scope === 'gas') return keys.gas;
            if (scope === 'waste') return keys.waste;
            return keys.total;
        }

        function getUtilReportCompositionValueType(categoryKey = UtilReportState.categoryKey) {
            return getUtilReportCompositionCategory(categoryKey) === 'production' ? 'production' : 'cost';
        }

        function getUtilReportMetricScale(metricKey, unitKey = UtilReportState.unitKey, productionUnitKey = UtilReportState.productionUnitKey) {
            const metric = getUtilReportMetricOption(metricKey);
            if (metric.type === 'cost') return getUtilReportScale(unitKey);
            if (metric.type === 'production') return getUtilReportProductionScale(productionUnitKey);
            if (metric.type === 'usage') return 1;
            return 1;
        }

        function normalizeUtilReportChartType(chartType) {
            const normalized = String(chartType || '').trim().toLowerCase();
            if (normalized === 'line' || normalized === 'none') return normalized;
            return 'bar';
        }

        function getUtilReportChartTypeLabel(chartType) {
            const normalized = normalizeUtilReportChartType(chartType);
            if (normalized === 'line') return '선';
            if (normalized === 'none') return '없음';
            return '막대';
        }

        function syncUtilReportChartTypeToggleButton(button, chartType) {
            if (!button) return;
            const normalized = normalizeUtilReportChartType(chartType);
            button.dataset.chartType = normalized;
            button.textContent = getUtilReportChartTypeLabel(normalized);
            button.classList.toggle('is-line', normalized === 'line');
            button.setAttribute('aria-label', `그래프: ${getUtilReportChartTypeLabel(normalized)} (클릭 시 전환)`);
            button.title = `그래프: ${getUtilReportChartTypeLabel(normalized)} (클릭 시 전환)`;
        }

        function syncUtilReportChartFullscreenToggleButton(button, isFullscreen) {
            if (!button) return;
            const active = isFullscreen === true;
            button.innerHTML = active
                ? '<i class="fas fa-compress" aria-hidden="true"></i>'
                : '<i class="fas fa-expand" aria-hidden="true"></i>';
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-label', active ? '차트 복원' : '차트 확대');
            button.title = active ? '차트 복원' : '차트 확대';
        }

        function applyUtilReportScopeToTeams(scopeKey, teams = {}) {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const normalized = {
                electricTeam: teams.electricTeam || 'all',
                gasTeam: teams.gasTeam || 'all',
                wasteTeam: teams.wasteTeam || 'all'
            };
            if (normalizedScope === 'electric') {
                normalized.gasTeam = 'all';
                normalized.wasteTeam = 'all';
            } else if (normalizedScope === 'gas') {
                normalized.electricTeam = 'all';
                normalized.wasteTeam = 'all';
            } else if (normalizedScope === 'waste') {
                normalized.electricTeam = 'all';
                normalized.gasTeam = 'all';
            }
            return normalized;
        }

        function getUtilReportWasteCostModeOptions(teamName = '') {
            const team = String(teamName || '').trim();
            if (team && team !== 'all') {
                return buildUtilCostOptions('waste', team);
            }
            const optionMap = new Map();
            UTIL_WASTE_COST_BASE.forEach(item => {
                if (!item?.key) return;
                optionMap.set(item.key, { key: item.key, label: item.label || UTIL_REPORT_WASTE_DETAIL_LABELS[item.key] || item.key });
            });
            ['outsourcing', 'labor'].forEach(key => {
                optionMap.set(key, {
                    key,
                    label: UTIL_REPORT_WASTE_DETAIL_LABELS[key] || key
                });
            });
            return Array.from(optionMap.values());
        }

        function normalizeUtilReportWasteCostModeKey(modeKey, teamName = '') {
            const options = getUtilReportWasteCostModeOptions(teamName);
            const normalizedKey = String(modeKey || '').trim();
            if (options.some(item => item.key === normalizedKey)) return normalizedKey;
            return 'total';
        }

        function getUtilReportWasteCostModeLabel(modeKey, teamName = '') {
            const options = getUtilReportWasteCostModeOptions(teamName);
            const normalizedKey = normalizeUtilReportWasteCostModeKey(modeKey, teamName);
            const matched = options.find(item => item.key === normalizedKey);
            if (matched?.label) return matched.label;
            return UTIL_REPORT_WASTE_DETAIL_LABELS[normalizedKey] || normalizedKey;
        }

        function buildUtilReportWasteDetailMetricKey(modeKey) {
            return `waste_detail::${String(modeKey || '').trim()}`;
        }

        function parseUtilReportWasteDetailMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = 'waste_detail::';
            if (!raw.startsWith(prefix)) {
                return { raw, modeKey: '' };
            }
            const modeKey = raw.slice(prefix.length).trim();
            return { raw, modeKey };
        }

        function applyUtilReportWasteDetailFromCompositionMetric(metricValue) {
            const parsed = parseUtilReportWasteDetailMetric(metricValue);
            if (!parsed.modeKey) return false;
            const compositionKeys = getUtilReportCompositionMetricKeys(getUtilReportCompositionCategory(UtilReportState.categoryKey));
            UtilReportState.scopeKey = 'waste';
            UtilReportState.selectedScopeKeys = ['waste'];
            UtilReportState.metricKey = 'waste_cost';
            UtilReportState.activeMetricCard = 'waste_cost';
            if (parsed.modeKey === 'total') {
                UtilReportState.wasteTeam = 'all';
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                UtilReportState.activeWasteDetailCompositionKey = buildUtilReportWasteDetailMetricKey('total');
                return true;
            }
            UtilReportState.wasteCostModeKey = normalizeUtilReportWasteCostModeKey(parsed.modeKey, UtilReportState.wasteTeam);
            UtilReportState.activeWasteDetailCompositionKey = buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey);
            return true;
        }

        function getUtilReportScopeFromSourceLabel(sourceLabel) {
            const normalized = String(sourceLabel || '').trim();
            if (normalized === '전기') return 'electric';
            if (normalized === '가스') return 'gas';
            if (normalized === '폐수') return 'waste';
            if (normalized === '생산량') return 'total';
            return '';
        }

        function parseUtilReportTeamCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            if (!raw) {
                return { raw: '', sourceLabel: '', scopeKey: '', teamName: '' };
            }
            const parts = raw.split('::');
            if (parts.length < 2) {
                return { raw, sourceLabel: '', scopeKey: '', teamName: '' };
            }
            const sourceLabel = String(parts[0] || '').trim();
            const teamName = String(parts.slice(1).join('::') || '').trim();
            return {
                raw,
                sourceLabel,
                scopeKey: getUtilReportScopeFromSourceLabel(sourceLabel),
                teamName
            };
        }

        function applyUtilReportTeamFilterFromCompositionMetric(metricValue) {
            const parsed = parseUtilReportTeamCompositionMetric(metricValue);
            const rawMetric = String(metricValue || '').trim();
            const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            const isTotalMetric = rawMetric === String(compositionKeys.total || '').trim()
                || rawMetric === 'total_cost'
                || rawMetric === 'total_production';

            if (!parsed.teamName) {
                if (!isTotalMetric) return false;
                if (compositionCategory === 'production') {
                    UtilReportState.categoryKey = 'production';
                    UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || 'total');
                    UtilReportState.selectedScopeKeys = UtilReportState.scopeKey === 'total'
                        ? ['electric', 'gas', 'waste']
                        : [UtilReportState.scopeKey];
                    UtilReportState.metricKey = 'production';
                    UtilReportState.activeMetricCard = 'production';
                    const siteContextKey = resolveUtilReportSelectedSiteContextKey('total', 'production');
                    UtilReportState.productionTeam = siteContextKey === 'Plant B' ? 'Line Alpha' : (siteContextKey === 'Plant A' ? 'Plant A' : 'all');
                    UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                    UtilReportState.activeSiteCompositionKey = siteContextKey === 'all'
                        ? compositionKeys.total
                        : (buildUtilReportSiteMetricKey(siteContextKey) || compositionKeys.total);
                    UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                    UtilReportState.activeWasteDetailCompositionKey = '';
                    return true;
                }
                const scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey);
                if (scopeKey === 'total') return false;
                const siteContextKey = resolveUtilReportSelectedSiteContextKey(scopeKey, UtilReportState.categoryKey);
                UtilReportState.scopeKey = scopeKey === 'total' ? 'total' : scopeKey;
                UtilReportState.selectedScopeKeys = UtilReportState.scopeKey === 'total' ? ['electric', 'gas', 'waste'] : [UtilReportState.scopeKey];
                UtilReportState.metricKey = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
                UtilReportState.activeMetricCard = UtilReportState.metricKey;
                if (UtilReportState.scopeKey === 'electric') {
                    UtilReportState.electricTeam = siteContextKey === 'all' ? 'all' : siteContextKey;
                } else if (UtilReportState.scopeKey === 'gas') {
                    UtilReportState.gasTeam = siteContextKey === 'all' ? 'all' : siteContextKey;
                } else if (UtilReportState.scopeKey === 'waste') {
                    UtilReportState.wasteTeam = siteContextKey === 'all' ? 'all' : siteContextKey;
                } else {
                    UtilReportState.electricTeam = 'all';
                    UtilReportState.gasTeam = 'all';
                    UtilReportState.wasteTeam = 'all';
                }
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeSiteCompositionKey = siteContextKey === 'all'
                    ? compositionKeys.total
                    : (buildUtilReportSiteMetricKey(siteContextKey) || compositionKeys.total);
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                UtilReportState.activeWasteDetailCompositionKey = '';
                return true;
            }

            if (parsed.sourceLabel === '생산량') {
                UtilReportState.categoryKey = 'production';
                UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || 'total');
                UtilReportState.selectedScopeKeys = UtilReportState.scopeKey === 'total'
                    ? ['electric', 'gas', 'waste']
                    : [UtilReportState.scopeKey];
                UtilReportState.metricKey = 'production';
                UtilReportState.activeMetricCard = 'production';
                UtilReportState.productionTeam = normalizeUtilReportProductionTeam(parsed.teamName);
                const siteMetricKey = buildUtilReportSiteMetricKey(resolveUtilReportSiteKeyByTeam(parsed.teamName));
                if (siteMetricKey) {
                    UtilReportState.activeSiteCompositionKey = siteMetricKey;
                }
                UtilReportState.activeTeamCompositionKey = parsed.raw;
                UtilReportState.activeWasteDetailCompositionKey = '';
                return true;
            }

            const scopeKey = normalizeUtilReportScope(parsed.scopeKey || UtilReportState.scopeKey);
            UtilReportState.scopeKey = scopeKey;
            UtilReportState.selectedScopeKeys = [scopeKey];
            UtilReportState.metricKey = resolveUtilReportMetricKey(scopeKey, UtilReportState.categoryKey);
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            if (scopeKey === 'electric') {
                UtilReportState.electricTeam = parsed.teamName;
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
            } else if (scopeKey === 'gas') {
                const normalizedGasTeam = normalizeUtilReportBuilderTeam(parsed.teamName, 'gas');
                UtilReportState.gasTeam = normalizedGasTeam === '전체' ? 'all' : normalizedGasTeam;
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
            } else if (scopeKey === 'waste') {
                UtilReportState.wasteTeam = parsed.teamName;
                UtilReportState.wasteCostModeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, parsed.teamName);
                UtilReportState.activeWasteDetailCompositionKey = UtilReportState.wasteCostModeKey === 'total'
                    ? ''
                    : buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey);
            }
            const siteMetricKey = buildUtilReportSiteMetricKey(resolveUtilReportSiteKeyByTeam(parsed.teamName));
            if (siteMetricKey) {
                UtilReportState.activeSiteCompositionKey = siteMetricKey;
            }
            UtilReportState.activeTeamCompositionKey = parsed.raw;
            return true;
        }

        function parseUtilReportProductionProductCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            if (!raw || raw === 'total_production_product') {
                return {
                    raw: 'total_production_product',
                    teamName: '',
                    lineName: '',
                    isTotal: true
                };
            }
            const prefix = '생산라인::';
            if (!raw.startsWith(prefix)) {
                return {
                    raw,
                    teamName: '',
                    lineName: '',
                    isTotal: false
                };
            }
            const body = raw.slice(prefix.length);
            const parts = body.split('::');
            const teamName = String(parts[0] || '').trim();
            const lineName = String(parts.slice(1).join('::') || '').trim();
            return {
                raw,
                teamName,
                lineName,
                isTotal: !teamName
            };
        }

        function parseUtilReportProductionProductDetailMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = 'production_product::';
            if (!raw.startsWith(prefix)) return null;
            const compositionMetric = raw.slice(prefix.length).trim();
            if (!compositionMetric) return null;
            const parsed = parseUtilReportProductionProductCompositionMetric(compositionMetric);
            return {
                raw,
                compositionMetric: parsed.raw,
                teamName: parsed.teamName,
                lineName: parsed.lineName,
                isTotal: parsed.isTotal
            };
        }

        function buildUtilReportProductionProductDetailMetric(metricValue) {
            const parsed = parseUtilReportProductionProductCompositionMetric(metricValue);
            if (parsed.isTotal || !parsed.teamName || !parsed.lineName) return '';
            return `production_product::${parsed.raw}`;
        }

        function getUtilReportProductionProductDetailMetricLabel(parsedMetric) {
            if (!parsedMetric || parsedMetric.isTotal) return '생산량';
            const teamName = String(parsedMetric.teamName || '').trim();
            const lineName = String(parsedMetric.lineName || '').trim();
            if (teamName && lineName) return `${teamName} · ${lineName}`;
            return lineName || teamName || '생산량';
        }

        function resolveUtilReportDetailMetricKey() {
            const normalizedCategory = normalizeUtilReportCategory(UtilReportState.categoryKey);
            if (normalizedCategory === 'cost') {
                const overrideMetricKey = normalizeUtilReportDetailMetricOverrideKey(UtilReportState.detailMetricOverrideKey);
                if (overrideMetricKey) {
                    return overrideMetricKey;
                }
                return UtilReportState.metricKey;
            }
            if (normalizedCategory !== 'production') {
                return UtilReportState.metricKey;
            }
            const detailMetric = buildUtilReportProductionProductDetailMetric(UtilReportState.activeProductionProductCompositionKey);
            return detailMetric || UtilReportState.metricKey;
        }

        function resolveUtilReportChartMetricKey() {
            return resolveUtilReportDetailMetricKey();
        }

        function applyUtilReportProductionProductFilterFromCompositionMetric(metricValue) {
            const parsed = parseUtilReportProductionProductCompositionMetric(metricValue);
            const compositionKeys = getUtilReportCompositionMetricKeys('production');
            UtilReportState.categoryKey = 'production';
            UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || 'total');
            UtilReportState.selectedScopeKeys = UtilReportState.scopeKey === 'total'
                ? ['electric', 'gas', 'waste']
                : [UtilReportState.scopeKey];
            UtilReportState.metricKey = 'production';
            UtilReportState.activeMetricCard = 'production';
            UtilReportState.wasteCostModeKey = 'total';
            UtilReportState.activeWasteDetailCompositionKey = '';

            if (parsed.isTotal || !parsed.teamName) {
                const siteContextKey = resolveUtilReportSelectedSiteContextKey('total', 'production');
                UtilReportState.productionTeam = siteContextKey === 'Plant B' ? 'Line Alpha' : (siteContextKey === 'Plant A' ? 'Plant A' : 'all');
                UtilReportState.activeSiteCompositionKey = siteContextKey === 'all'
                    ? compositionKeys.total
                    : (buildUtilReportSiteMetricKey(siteContextKey) || compositionKeys.total);
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                return true;
            }

            const productionTeam = normalizeUtilReportProductionTeam(parsed.teamName);
            if (productionTeam === 'all') {
                UtilReportState.productionTeam = 'all';
                UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                return true;
            }

            UtilReportState.productionTeam = productionTeam;
            UtilReportState.activeTeamCompositionKey = `생산량::${productionTeam}`;
            const siteMetricKey = buildUtilReportSiteMetricKey(resolveUtilReportSiteKeyByTeam(parsed.teamName) || normalizeUtilReportSiteKey(productionTeam));
            UtilReportState.activeSiteCompositionKey = siteMetricKey || compositionKeys.total;
            UtilReportState.activeProductionProductCompositionKey = parsed.raw;
            return true;
        }

        function isUtilReportProductionSpecificTeamSelection(teamName) {
            const normalizedTeam = normalizeUtilReportProductionTeam(teamName);
            if (!normalizedTeam || normalizedTeam === 'all') return false;
            return normalizeUtilReportSiteKey(normalizedTeam) === 'all';
        }

        function resetUtilReportOverviewState() {
            clearUtilReportDetailMetricOverride();
            const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            if (compositionCategory === 'production') {
                UtilReportState.categoryKey = 'production';
                UtilReportState.scopeKey = 'total';
                UtilReportState.selectedScopeKeys = ['electric', 'gas', 'waste'];
                UtilReportState.metricKey = 'production';
                UtilReportState.activeMetricCard = 'production';
                UtilReportState.productionTeam = 'all';
                UtilReportState.activeTotalTeamCompositionKey = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                UtilReportState.activeTotalProcessCompositionKey = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                UtilReportState.totalCompositionView = 'scope';
                UtilReportState.excludeWasteCompositionView = 'team';
                UtilReportState.costTotalSelectedCompositionView = 'total';
                UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                resetUtilReportSelectedProcessStates();
                UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
                return;
            }
            UtilReportState.scopeKey = 'total';
            UtilReportState.selectedScopeKeys = ['electric', 'gas', 'waste'];
            UtilReportState.metricKey = resolveUtilReportMetricKey('total', UtilReportState.categoryKey);
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            UtilReportState.electricTeam = 'all';
            UtilReportState.gasTeam = 'all';
            UtilReportState.wasteTeam = 'all';
            UtilReportState.activeTotalTeamCompositionKey = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
            UtilReportState.activeTotalProcessCompositionKey = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
            UtilReportState.totalCompositionView = 'scope';
            UtilReportState.excludeWasteCompositionView = 'team';
            UtilReportState.costTotalSelectedCompositionView = 'total';
            UtilReportState.wasteCostModeKey = 'total';
            UtilReportState.activeSiteCompositionKey = compositionKeys.total;
            UtilReportState.activeTeamCompositionKey = compositionKeys.total;
            resetUtilReportSelectedProcessStates();
            UtilReportState.activeWasteDetailCompositionKey = '';
        }
