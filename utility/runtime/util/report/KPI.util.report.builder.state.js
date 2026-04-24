        function collectUtilReportBuilderStateFromModal(modal) {
            if (!modal) return null;
            const from = modal.querySelector('[data-role="util-report-builder-from"]')?.value || UtilReportBuilderState.from;
            const to = modal.querySelector('[data-role="util-report-builder-to"]')?.value || UtilReportBuilderState.to;
            const itemInput = Array.from(modal.querySelectorAll('[data-role="util-report-builder-item-check"]'))
                .find(input => input.checked);
            const itemKey = normalizeUtilReportBuilderItemKey(itemInput?.value || UtilReportBuilderState.itemKey);
            const teamInput = Array.from(modal.querySelectorAll('[data-role="util-report-builder-team-check"]'))
                .find(input => input.checked);
            const team = normalizeUtilReportBuilderTeam(teamInput?.value || UtilReportBuilderState.team, itemKey);
            const valueKeys = normalizeUtilReportBuilderValueKeys(
                itemKey,
                Array.from(modal.querySelectorAll('[data-role="util-report-builder-value-check"]'))
                    .filter(input => input.checked)
                    .map(input => String(input.value || '').trim())
            );
            return { from, to, team, itemKey, valueKeys };
        }

        function applyUtilReportBuilderState(nextState) {
            if (!nextState) return;
            const range = normalizeMonthRange(nextState.from, nextState.to);
            const itemKey = normalizeUtilReportBuilderItemKey(nextState.itemKey);
            const team = normalizeUtilReportBuilderTeam(nextState.team, itemKey);
            const valueKeys = normalizeUtilReportBuilderValueKeys(itemKey, nextState.valueKeys);
            const teamFilter = resolveUtilReportBuilderTeamFilter(team, itemKey);

            UtilReportBuilderState.from = range.start;
            UtilReportBuilderState.to = range.end;
            UtilReportBuilderState.team = team;
            UtilReportBuilderState.itemKey = itemKey;
            UtilReportBuilderState.valueKeys = valueKeys.slice();

            UtilReportState.from = range.start;
            UtilReportState.to = range.end;
            UtilReportState.builderCustomMode = true;
            UtilReportState.builderItemKey = itemKey;
            UtilReportState.builderValueKeys = valueKeys.slice();
            UtilReportState.selectedScopeKeys = [itemKey];
            UtilReportState.scopeKey = normalizeUtilReportScope(itemKey);
            UtilReportState.electricTeam = teamFilter;
            UtilReportState.gasTeam = teamFilter;
            UtilReportState.wasteTeam = teamFilter;
            const primaryMetricKey = valueKeys.length ? valueKeys[0] : resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            UtilReportState.metricKey = primaryMetricKey;
            UtilReportState.activeMetricCard = UtilReportState.metricKey;

            UtilReportState.categoryKey = valueKeys.every(key => key === 'production') ? 'production' : 'cost';
            UtilReportState.productionTeam = team === '전체'
                ? 'all'
                : normalizeUtilReportProductionTeam(team);

            if (UtilReportState.scopeKey === 'waste') {
                UtilReportState.wasteCostModeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                UtilReportState.activeWasteDetailCompositionKey = UtilReportState.wasteCostModeKey === 'total'
                    ? ''
                    : buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey);
            } else {
                UtilReportState.wasteCostModeKey = 'total';
                UtilReportState.activeWasteDetailCompositionKey = '';
            }
        }

        function clampUtilReportBuilderVizDecimals(value) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return 1;
            return Math.max(0, Math.min(4, Math.floor(numeric)));
        }

        function getUtilReportBuilderVizMetricDecimals(metricKey = 'usage') {
            const fallback = clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.decimals);
            if (metricKey === 'cost') {
                return clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.costDecimals ?? fallback);
            }
            if (metricKey === 'production') {
                return clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.productionDecimals ?? fallback);
            }
            if (metricKey === 'ratio') {
                return clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.ratioDecimals ?? Math.max(3, fallback));
            }
            return clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.usageDecimals ?? fallback);
        }

        function syncUtilReportBuilderVizLabelToggleButton(button, enabled) {
            if (!button) return;
            const active = enabled === true;
            button.textContent = '레이블';
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.setAttribute('aria-label', active ? '레이블 표시 켜짐' : '레이블 표시 꺼짐');
            button.title = active ? '레이블 표시 켜짐' : '레이블 표시 꺼짐';
        }

        function normalizeUtilReportBuilderVizChartType(value) {
            const normalized = String(value || '').trim().toLowerCase();
            if (normalized === 'line' || normalized === 'none') return normalized;
            return 'bar';
        }

        function normalizeUtilReportBuilderVizOptionalChartType(value) {
            const normalized = String(value || '').trim().toLowerCase();
            return normalized === 'line' || normalized === 'bar'
                ? normalized
                : '';
        }

        function getUtilReportBuilderVizNextChartType(currentType, includeNone = false) {
            const sequence = includeNone === true
                ? ['line', 'bar', 'none']
                : ['line', 'bar'];
            const normalized = normalizeUtilReportBuilderVizChartType(currentType);
            const currentIndex = sequence.indexOf(normalized);
            return sequence[(currentIndex + 1) % sequence.length];
        }

        function normalizeUtilReportBuilderVizSeriesKey(value) {
            const key = String(value || '').trim().toLowerCase();
            return ['usage', 'cost', 'production'].includes(key) ? key : '';
        }

        function normalizeUtilReportBuilderVizChartView(value) {
            return String(value || '').trim().toLowerCase() === 'ratio' ? 'ratio' : 'main';
        }

        function resolveUtilReportBuilderVizDefaultAppliedYears(range = null) {
            const years = getUtilReportBuilderVizAvailableYears(range);
            if (years.length < 2) {
                return { baseYear: '', compareYear: '', years };
            }
            return {
                baseYear: String(years[years.length - 2]),
                compareYear: String(years[years.length - 1]),
                years
            };
        }

        function syncUtilReportBuilderVizAppliedToggleButton(button, enabled) {
            if (!button) return;
            const active = enabled === true;
            button.textContent = '적용';
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.setAttribute('aria-label', active ? '적용 분석 끄기' : '적용 분석 켜기');
            button.title = active ? '적용 분석 끄기' : '적용 분석 켜기';
        }

        function getUtilReportBuilderVizAvailableYears(range = null) {
            const normalizedRange = range
                ? normalizeMonthRange(range.start || range.from, range.end || range.to)
                : normalizeMonthRange(UtilReportBuilderVizState.from, UtilReportBuilderVizState.to);
            const startParsed = parseUtilMonthValue(normalizedRange.start);
            const endParsed = parseUtilMonthValue(normalizedRange.end);
            if (!startParsed || !endParsed) return [];
            const years = [];
            for (let year = startParsed.year; year <= endParsed.year; year += 1) {
                years.push(year);
            }
            return years;
        }

        function normalizeUtilReportBuilderVizAppliedBaseYear(value = '', range = null) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return '';
            const year = Math.trunc(numeric);
            return getUtilReportBuilderVizAvailableYears(range).includes(year)
                ? String(year)
                : '';
        }

        function normalizeUtilReportBuilderVizAppliedCompareYear(value = '', baseYear = '', range = null) {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return '';
            const year = Math.trunc(numeric);
            const normalizedBaseYear = normalizeUtilReportBuilderVizAppliedBaseYear(baseYear, range);
            if (normalizedBaseYear && String(year) === normalizedBaseYear) return '';
            return getUtilReportBuilderVizAvailableYears(range).includes(year)
                ? String(year)
                : '';
        }

        function syncUtilReportBuilderVizAppliedYearSelects(modal) {
            if (!modal) {
                return {
                    baseYear: '',
                    compareYear: '',
                    years: getUtilReportBuilderVizAvailableYears()
                };
            }
            const range = normalizeMonthRange(
                modal.querySelector('[data-role="util-report-builder-viz-from"]')?.value || UtilReportBuilderVizState.from,
                modal.querySelector('[data-role="util-report-builder-viz-to"]')?.value || UtilReportBuilderVizState.to
            );
            const years = getUtilReportBuilderVizAvailableYears(range);
            const baseSelect = modal.querySelector('[data-role="util-report-builder-viz-applied-base-year"]');
            const compareSelect = modal.querySelector('[data-role="util-report-builder-viz-applied-compare-year"]');
            const appliedModeEnabled = UtilReportBuilderVizState.appliedModeEnabled === true;
            const defaultYears = resolveUtilReportBuilderVizDefaultAppliedYears(range);
            let baseYear = normalizeUtilReportBuilderVizAppliedBaseYear(
                baseSelect?.value || UtilReportBuilderVizState.appliedBaseYear,
                range
            );
            if (appliedModeEnabled && !baseYear) {
                baseYear = defaultYears.baseYear;
            }
            if (baseSelect) {
                baseSelect.innerHTML = [
                    '<option value="">선택</option>',
                    ...years.map(year => `<option value="${year}">${year}년</option>`)
                ].join('');
                baseSelect.value = baseYear;
            }
            let compareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                compareSelect?.value || UtilReportBuilderVizState.appliedCompareYear,
                baseYear,
                range
            );
            if (appliedModeEnabled && !compareYear) {
                compareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                    defaultYears.compareYear,
                    baseYear,
                    range
                );
            }
            if (compareSelect) {
                compareSelect.innerHTML = [
                    '<option value="">선택</option>',
                    ...years
                        .filter(year => String(year) !== baseYear)
                        .map(year => `<option value="${year}">${year}년</option>`)
                ].join('');
                compareSelect.value = compareYear;
            }
            return { baseYear, compareYear, years };
        }

        function syncUtilReportBuilderVizStateFromReportState() {
            ensureUtilReportStateRange();
            const range = normalizeMonthRange(UtilReportState.from, UtilReportState.to);
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
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey || UtilReportState.scopeKey || UtilReportBuilderVizState.itemKey);
            const scopedTeam = getUtilReportScopeTeamFilterByItem(itemKey, UtilReportState);
            const preferredTeam = scopedTeam && scopedTeam !== 'all'
                ? scopedTeam
                : (UtilReportBuilderVizState.team || '전체');
            UtilReportBuilderVizState.itemKey = itemKey;
            UtilReportBuilderVizState.team = normalizeUtilReportBuilderTeam(preferredTeam, itemKey);
            UtilReportBuilderVizState.costUnitKey = normalizeUtilReportCostUnitKey(UtilReportState.unitKey || UtilReportBuilderVizState.costUnitKey);
            UtilReportBuilderVizState.productionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportState.productionUnitKey || UtilReportBuilderVizState.productionUnitKey);
            UtilReportBuilderVizState.usageUnitKey = normalizeUtilReportBuilderVizUsageUnitKey(
                UtilReportBuilderVizState.usageUnitKey,
                itemKey
            );
            UtilReportBuilderVizState.usageDecimals = clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.usageDecimals ?? UtilReportState.decimals);
            UtilReportBuilderVizState.costDecimals = clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.costDecimals ?? UtilReportState.decimals);
            UtilReportBuilderVizState.productionDecimals = clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.productionDecimals ?? UtilReportState.decimals);
            UtilReportBuilderVizState.ratioDecimals = clampUtilReportBuilderVizDecimals(UtilReportBuilderVizState.ratioDecimals ?? Math.max(3, clampUtilReportBuilderVizDecimals(UtilReportState.decimals)));
            UtilReportBuilderVizState.decimals = clampUtilReportBuilderVizDecimals(UtilReportState.decimals);
            UtilReportBuilderVizState.showLabels = UtilReportState.showChartLabels === true;
            UtilReportBuilderVizState.usageChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar');
            UtilReportBuilderVizState.costChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line');
            UtilReportBuilderVizState.productionChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line');
            UtilReportBuilderVizState.ratioChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.ratioChartType || 'line');
            UtilReportBuilderVizState.ratioActualChartType = normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType);
            UtilReportBuilderVizState.ratioAppliedChartType = normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType);
            UtilReportBuilderVizState.appliedModeEnabled = UtilReportBuilderVizState.appliedModeEnabled === true;
            if (UtilReportBuilderVizState.appliedModeEnabled === true) {
                const defaultYears = resolveUtilReportBuilderVizDefaultAppliedYears(range);
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
            UtilReportBuilderVizState.focusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.focusSeriesKey);
            UtilReportBuilderVizState.isolatedSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.isolatedSeriesKey);
            UtilReportBuilderVizState.detailFocusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.detailFocusSeriesKey);
            if (UtilReportBuilderVizState.isolatedSeriesKey) {
                UtilReportBuilderVizState.focusSeriesKey = UtilReportBuilderVizState.isolatedSeriesKey;
                UtilReportBuilderVizState.detailFocusSeriesKey = UtilReportBuilderVizState.isolatedSeriesKey;
            }
            UtilReportBuilderVizState.focusMonthKey = normalizeUtilReportMonthKey(UtilReportBuilderVizState.focusMonthKey);
            UtilReportBuilderVizState.chartViewKey = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            UtilReportBuilderVizState.chartFullscreen = UtilReportBuilderVizState.chartFullscreen === true;
            UtilReportBuilderVizState.pendingDetailScroll = false;
        }

        function collectUtilReportBuilderVizStateFromModal(modal) {
            if (!modal) return;
            const from = modal.querySelector('[data-role="util-report-builder-viz-from"]')?.value || UtilReportBuilderVizState.from;
            const to = modal.querySelector('[data-role="util-report-builder-viz-to"]')?.value || UtilReportBuilderVizState.to;
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportBuilderVizState.itemKey);
            const team = normalizeUtilReportBuilderTeam(UtilReportBuilderVizState.team, itemKey);
            const usageUnitKey = normalizeUtilReportBuilderVizUsageUnitKey(
                modal.querySelector('[data-role="util-report-builder-viz-usage-unit"]')?.value || UtilReportBuilderVizState.usageUnitKey,
                itemKey
            );
            const costUnitKey = normalizeUtilReportCostUnitKey(
                modal.querySelector('[data-role="util-report-builder-viz-cost-unit"]')?.value || UtilReportBuilderVizState.costUnitKey
            );
            const productionUnitKey = normalizeUtilReportProductionUnitKey(
                modal.querySelector('[data-role="util-report-builder-viz-production-unit"]')?.value || UtilReportBuilderVizState.productionUnitKey
            );
            const usageDecimals = clampUtilReportBuilderVizDecimals(
                modal.querySelector('[data-role="util-report-builder-viz-usage-decimals"]')?.value ?? getUtilReportBuilderVizMetricDecimals('usage')
            );
            const costDecimals = clampUtilReportBuilderVizDecimals(
                modal.querySelector('[data-role="util-report-builder-viz-cost-decimals"]')?.value ?? getUtilReportBuilderVizMetricDecimals('cost')
            );
            const productionDecimals = clampUtilReportBuilderVizDecimals(
                modal.querySelector('[data-role="util-report-builder-viz-production-decimals"]')?.value ?? getUtilReportBuilderVizMetricDecimals('production')
            );
            const ratioDecimals = clampUtilReportBuilderVizDecimals(
                modal.querySelector('[data-role="util-report-builder-viz-ratio-decimals"]')?.value ?? getUtilReportBuilderVizMetricDecimals('ratio')
            );
            const showLabels = UtilReportBuilderVizState.showLabels === true;
            const ratioPair = normalizeUtilReportBuilderVizRatioPair(
                modal.querySelector('[data-role="util-report-builder-viz-ratio-numerator"]')?.value
                || resolveUtilDualRatioMetricKeyByGraphMetric(itemKey, UtilReportState.graphNumeratorMetric, 'usage'),
                modal.querySelector('[data-role="util-report-builder-viz-ratio-denominator"]')?.value
                || resolveUtilDualRatioMetricKeyByGraphMetric(itemKey, UtilReportState.graphDenominatorMetric, 'production')
            );
            const ratioNumerator = ratioPair.numerator;
            const ratioDenominator = ratioPair.denominator;
            const usageChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-usage-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-usage-type"]')?.value
                || UtilReportBuilderVizState.usageChartType
            );
            const costChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-cost-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-cost-type"]')?.value
                || UtilReportBuilderVizState.costChartType
            );
            const productionChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-production-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-production-type"]')?.value
                || UtilReportBuilderVizState.productionChartType
            );
            const ratioChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-ratio-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-ratio-type"]')?.value
                || UtilReportBuilderVizState.ratioChartType
            );
            const ratioActualChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-ratio-actual-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-ratio-actual-type"]')?.value
                || normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType)
                || ratioChartType
            );
            const ratioAppliedChartType = normalizeUtilReportBuilderVizChartType(
                modal.querySelector('[data-role="util-report-builder-viz-ratio-applied-type-toggle"]')?.dataset?.chartType
                || modal.querySelector('[data-role="util-report-builder-viz-ratio-applied-type"]')?.value
                || normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType)
                || ratioChartType
            );
            const range = normalizeMonthRange(from, to);
            const appliedToggleButton = modal.querySelector('[data-role="util-report-builder-viz-applied-toggle"]');
            const appliedModeEnabled = appliedToggleButton
                ? appliedToggleButton.getAttribute('aria-pressed') === 'true'
                : UtilReportBuilderVizState.appliedModeEnabled === true;
            const defaultAppliedYears = resolveUtilReportBuilderVizDefaultAppliedYears(range);
            let appliedBaseYear = normalizeUtilReportBuilderVizAppliedBaseYear(
                modal.querySelector('[data-role="util-report-builder-viz-applied-base-year"]')?.value
                || UtilReportBuilderVizState.appliedBaseYear,
                range
            );
            if (appliedModeEnabled && !appliedBaseYear) {
                appliedBaseYear = defaultAppliedYears.baseYear;
            }
            let appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                modal.querySelector('[data-role="util-report-builder-viz-applied-compare-year"]')?.value
                || UtilReportBuilderVizState.appliedCompareYear,
                appliedBaseYear,
                range
            );
            if (appliedModeEnabled && !appliedCompareYear) {
                appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                    defaultAppliedYears.compareYear,
                    appliedBaseYear,
                    range
                );
            }
            UtilReportBuilderVizState.from = range.start;
            UtilReportBuilderVizState.to = range.end;
            UtilReportBuilderVizState.itemKey = itemKey;
            UtilReportBuilderVizState.team = team;
            UtilReportBuilderVizState.appliedModeEnabled = appliedModeEnabled;
            UtilReportBuilderVizState.appliedBaseYear = appliedBaseYear;
            UtilReportBuilderVizState.appliedCompareYear = appliedCompareYear;
            UtilReportBuilderVizState.usageUnitKey = usageUnitKey;
            UtilReportBuilderVizState.costUnitKey = costUnitKey;
            UtilReportBuilderVizState.productionUnitKey = productionUnitKey;
            UtilReportBuilderVizState.usageDecimals = usageDecimals;
            UtilReportBuilderVizState.costDecimals = costDecimals;
            UtilReportBuilderVizState.productionDecimals = productionDecimals;
            UtilReportBuilderVizState.ratioDecimals = ratioDecimals;
            UtilReportBuilderVizState.decimals = usageDecimals;
            UtilReportBuilderVizState.showLabels = showLabels;
            UtilReportBuilderVizState.usageChartType = usageChartType;
            UtilReportBuilderVizState.costChartType = costChartType;
            UtilReportBuilderVizState.productionChartType = productionChartType;
            UtilReportBuilderVizState.ratioChartType = ratioChartType;
            UtilReportBuilderVizState.ratioActualChartType = ratioActualChartType;
            UtilReportBuilderVizState.ratioAppliedChartType = ratioAppliedChartType;
            UtilReportBuilderVizState.isolatedSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.isolatedSeriesKey);
            if (UtilReportBuilderVizState.isolatedSeriesKey) {
                UtilReportBuilderVizState.focusSeriesKey = UtilReportBuilderVizState.isolatedSeriesKey;
                UtilReportBuilderVizState.detailFocusSeriesKey = UtilReportBuilderVizState.isolatedSeriesKey;
            }
            UtilReportBuilderVizState.pendingDetailScroll = false;
            UtilReportBuilderVizState.isDirty = true;

            UtilReportState.from = range.start;
            UtilReportState.to = range.end;
            UtilReportState.builderItemKey = itemKey;
            UtilReportState.scopeKey = normalizeUtilReportScope(itemKey);
            UtilReportState.selectedScopeKeys = [itemKey];
            UtilReportState.unitKey = costUnitKey;
            UtilReportState.productionUnitKey = productionUnitKey;
            UtilReportState.decimals = usageDecimals;
            UtilReportState.showChartLabels = showLabels;
            UtilReportState.graphNumeratorMetric = resolveUtilReportGraphMetricKeyByDualRatioMetric(itemKey, ratioNumerator);
            UtilReportState.graphDenominatorMetric = resolveUtilReportGraphMetricKeyByDualRatioMetric(itemKey, ratioDenominator);
            UtilReportState.graphUseDenominator = true;

            const teamFilter = resolveUtilReportBuilderTeamFilter(team, itemKey);
            if (itemKey === 'electric') UtilReportState.electricTeam = teamFilter;
            else if (itemKey === 'gas') UtilReportState.gasTeam = teamFilter;
            else if (itemKey === 'waste') UtilReportState.wasteTeam = teamFilter;
        }

        function syncUtilReportBuilderVizControls(modal) {
            if (!modal) return;
            const monthOptions = ensureUtilReportStateRange();
            const monthHtml = monthOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
            const fromSelect = modal.querySelector('[data-role="util-report-builder-viz-from"]');
            const toSelect = modal.querySelector('[data-role="util-report-builder-viz-to"]');
            if (fromSelect) {
                fromSelect.innerHTML = monthHtml;
                fromSelect.value = UtilReportBuilderVizState.from;
            }
            if (toSelect) {
                toSelect.innerHTML = monthHtml;
                toSelect.value = UtilReportBuilderVizState.to;
            }
            const appliedYears = syncUtilReportBuilderVizAppliedYearSelects(modal);
            UtilReportBuilderVizState.appliedBaseYear = appliedYears.baseYear;
            UtilReportBuilderVizState.appliedCompareYear = appliedYears.compareYear;
            const appliedToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-applied-toggle"]');
            syncUtilReportBuilderVizAppliedToggleButton(appliedToggleBtn, UtilReportBuilderVizState.appliedModeEnabled === true);
            modal.querySelectorAll('[data-role="util-report-builder-viz-applied-year-field"]').forEach(field => {
                field.hidden = UtilReportBuilderVizState.appliedModeEnabled !== true;
            });

            const usageUnitSelect = modal.querySelector('[data-role="util-report-builder-viz-usage-unit"]');
            if (usageUnitSelect) {
                usageUnitSelect.innerHTML = getUtilReportBuilderVizUsageUnitOptions(UtilReportBuilderVizState.itemKey)
                    .map(item => `<option value="${item.key}">${item.label}</option>`)
                    .join('');
                usageUnitSelect.value = normalizeUtilReportBuilderVizUsageUnitKey(
                    UtilReportBuilderVizState.usageUnitKey,
                    UtilReportBuilderVizState.itemKey
                );
            }
            const costUnitSelect = modal.querySelector('[data-role="util-report-builder-viz-cost-unit"]');
            if (costUnitSelect) {
                costUnitSelect.innerHTML = `
                    <option value="krw">원</option>
                    <option value="thousand">천원</option>
                    <option value="million">백만원</option>
                `;
                costUnitSelect.value = normalizeUtilReportCostUnitKey(UtilReportBuilderVizState.costUnitKey);
            }
            const productionUnitSelect = modal.querySelector('[data-role="util-report-builder-viz-production-unit"]');
            if (productionUnitSelect) {
                productionUnitSelect.innerHTML = UTIL_REPORT_PRODUCTION_UNIT_OPTIONS
                    .map(item => `<option value="${item.key}">${item.label}</option>`)
                    .join('');
                productionUnitSelect.value = normalizeUtilReportProductionUnitKey(UtilReportBuilderVizState.productionUnitKey);
            }
            const buildDecimalsOptionsHtml = () => `
                    <option value="0">0</option>
                    <option value="1">1</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4</option>
                `;
            const usageDecimalsSelect = modal.querySelector('[data-role="util-report-builder-viz-usage-decimals"]');
            if (usageDecimalsSelect) {
                usageDecimalsSelect.innerHTML = buildDecimalsOptionsHtml();
                usageDecimalsSelect.value = String(getUtilReportBuilderVizMetricDecimals('usage'));
            }
            const costDecimalsSelect = modal.querySelector('[data-role="util-report-builder-viz-cost-decimals"]');
            if (costDecimalsSelect) {
                costDecimalsSelect.innerHTML = buildDecimalsOptionsHtml();
                costDecimalsSelect.value = String(getUtilReportBuilderVizMetricDecimals('cost'));
            }
            const productionDecimalsSelect = modal.querySelector('[data-role="util-report-builder-viz-production-decimals"]');
            if (productionDecimalsSelect) {
                productionDecimalsSelect.innerHTML = buildDecimalsOptionsHtml();
                productionDecimalsSelect.value = String(getUtilReportBuilderVizMetricDecimals('production'));
            }
            const ratioDecimalsSelect = modal.querySelector('[data-role="util-report-builder-viz-ratio-decimals"]');
            if (ratioDecimalsSelect) {
                ratioDecimalsSelect.innerHTML = buildDecimalsOptionsHtml();
                ratioDecimalsSelect.value = String(getUtilReportBuilderVizMetricDecimals('ratio'));
            }
            syncUtilReportBuilderVizRatioSelects(modal);
            const usageTypeSelect = modal.querySelector('[data-role="util-report-builder-viz-usage-type"]');
            const usageTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-usage-type-toggle"]');
            if (usageTypeSelect) {
                usageTypeSelect.value = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar');
            }
            syncUtilReportChartTypeToggleButton(usageTypeToggleBtn, UtilReportBuilderVizState.usageChartType || 'bar');
            const costTypeSelect = modal.querySelector('[data-role="util-report-builder-viz-cost-type"]');
            const costTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-cost-type-toggle"]');
            if (costTypeSelect) {
                costTypeSelect.value = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line');
            }
            syncUtilReportChartTypeToggleButton(costTypeToggleBtn, UtilReportBuilderVizState.costChartType || 'line');
            const productionTypeSelect = modal.querySelector('[data-role="util-report-builder-viz-production-type"]');
            const productionTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-production-type-toggle"]');
            if (productionTypeSelect) {
                productionTypeSelect.value = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line');
            }
            syncUtilReportChartTypeToggleButton(productionTypeToggleBtn, UtilReportBuilderVizState.productionChartType || 'line');
            const ratioTypeSelect = modal.querySelector('[data-role="util-report-builder-viz-ratio-type"]');
            const ratioTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-ratio-type-toggle"]');
            const ratioTypeField = modal.querySelector('[data-role="util-report-builder-viz-ratio-type-field"]');
            const ratioActualTypeField = modal.querySelector('[data-role="util-report-builder-viz-ratio-actual-type-field"]');
            const ratioAppliedTypeField = modal.querySelector('[data-role="util-report-builder-viz-ratio-applied-type-field"]');
            const ratioActualTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-ratio-actual-type-toggle"]');
            const ratioAppliedTypeToggleBtn = modal.querySelector('[data-role="util-report-builder-viz-ratio-applied-type-toggle"]');
            const ratioActualChartType = normalizeUtilReportBuilderVizChartType(
                normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType)
                || UtilReportBuilderVizState.ratioChartType
                || 'line'
            );
            const ratioAppliedChartType = normalizeUtilReportBuilderVizChartType(
                normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType)
                || UtilReportBuilderVizState.ratioChartType
                || 'line'
            );
            if (ratioTypeSelect) {
                ratioTypeSelect.value = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.ratioChartType || 'line');
            }
            syncUtilReportChartTypeToggleButton(ratioTypeToggleBtn, UtilReportBuilderVizState.ratioChartType || 'line');
            syncUtilReportChartTypeToggleButton(ratioActualTypeToggleBtn, ratioActualChartType);
            syncUtilReportChartTypeToggleButton(ratioAppliedTypeToggleBtn, ratioAppliedChartType);
            if (ratioTypeField) {
                ratioTypeField.hidden = UtilReportBuilderVizState.appliedModeEnabled === true;
                ratioTypeField.setAttribute('aria-hidden', ratioTypeField.hidden ? 'true' : 'false');
            }
            if (ratioActualTypeField) {
                ratioActualTypeField.hidden = UtilReportBuilderVizState.appliedModeEnabled !== true;
                ratioActualTypeField.setAttribute('aria-hidden', ratioActualTypeField.hidden ? 'true' : 'false');
            }
            if (ratioAppliedTypeField) {
                ratioAppliedTypeField.hidden = UtilReportBuilderVizState.appliedModeEnabled !== true;
                ratioAppliedTypeField.setAttribute('aria-hidden', ratioAppliedTypeField.hidden ? 'true' : 'false');
            }
            modal.querySelectorAll('[data-role="util-report-builder-viz-label-toggle"]').forEach(button => {
                syncUtilReportBuilderVizLabelToggleButton(button, UtilReportBuilderVizState.showLabels === true);
            });
            syncUtilReportBuilderVizChartView(modal);
        }

        function syncUtilReportBuilderVizChartView(modal) {
            if (!modal) return;
            const currentView = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            UtilReportBuilderVizState.chartViewKey = currentView;
            const nextView = currentView === 'main' ? 'ratio' : 'main';
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportBuilderVizState.itemKey);
            const ratioConfig = resolveUtilReportBuilderVizRatioConfig(itemKey);
            const ratioTitle = getUtilReportBuilderVizRatioTitle(
                itemKey,
                ratioConfig.numeratorMetric,
                ratioConfig.denominatorMetric,
                ratioConfig.useDenominator
            );
            const nextLabel = nextView === 'ratio'
                ? ratioTitle
                : '사용량 · 비용 · 생산량';

            const toggleBtn = modal.querySelector('[data-role="util-report-builder-viz-chart-view-toggle"]');
            if (toggleBtn) {
                toggleBtn.textContent = nextLabel;
                toggleBtn.setAttribute('aria-label', nextLabel);
            }

            const mainPanelEl = modal.querySelector('[data-role="util-report-builder-viz-main-panel"]');
            const ratioPanelEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-panel"]');
            if (mainPanelEl) mainPanelEl.hidden = currentView !== 'main';
            if (ratioPanelEl) ratioPanelEl.hidden = currentView !== 'ratio';
        }

        function closeUtilReportBuilderVizUnitPopover(modal) {
            if (!modal) return;
            const popover = modal.querySelector('[data-role="util-report-builder-viz-unit-popover"]');
            const toggleButton = modal.querySelector('[data-role="util-report-builder-viz-unit-toggle"]');
            if (popover) popover.hidden = true;
            if (toggleButton) {
                toggleButton.setAttribute('aria-expanded', 'false');
                toggleButton.classList.remove('is-open');
            }
        }

        function toggleUtilReportBuilderVizUnitPopover(modal) {
            if (!modal) return;
            const popover = modal.querySelector('[data-role="util-report-builder-viz-unit-popover"]');
            const toggleButton = modal.querySelector('[data-role="util-report-builder-viz-unit-toggle"]');
            if (!popover || !toggleButton) return;
            const shouldOpen = popover.hidden;
            closeUtilReportBuilderVizUnitPopover(modal);
            if (!shouldOpen) return;
            popover.hidden = false;
            toggleButton.setAttribute('aria-expanded', 'true');
            toggleButton.classList.add('is-open');
        }

        function toggleUtilReportBuilderVizChartView(modal) {
            if (!modal) return;
            const currentView = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            UtilReportBuilderVizState.chartViewKey = currentView === 'main' ? 'ratio' : 'main';
            syncUtilReportBuilderVizChartView(modal);
        }

        function getUtilReportBuilderVizActivePanelSelector() {
            return normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey) === 'ratio'
                ? '[data-role="util-report-builder-viz-ratio-panel"]'
                : '[data-role="util-report-builder-viz-main-panel"]';
        }

        function buildUtilReportBuilderVizData() {
            const range = normalizeMonthRange(UtilReportBuilderVizState.from, UtilReportBuilderVizState.to);
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportBuilderVizState.itemKey || UtilReportState.builderItemKey || UtilReportState.scopeKey);
            const team = normalizeUtilReportBuilderTeam(UtilReportBuilderVizState.team, itemKey);
            const itemLabel = getUtilReportBuilderVizItemLabel(itemKey);
            const teamFilter = resolveUtilReportBuilderTeamFilter(team, itemKey);
            const productionTeam = team === '전체'
                ? 'all'
                : normalizeUtilReportProductionTeam(team);
            const usageUnitKey = normalizeUtilReportBuilderVizUsageUnitKey(UtilReportBuilderVizState.usageUnitKey, itemKey);
            const costUnitKey = normalizeUtilReportCostUnitKey(UtilReportBuilderVizState.costUnitKey);
            const productionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportBuilderVizState.productionUnitKey);
            const usageChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar');
            const costChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line');
            const productionChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line');
            const scopedTeams = applyUtilReportScopeToTeams(itemKey, {
                electricTeam: teamFilter,
                gasTeam: teamFilter,
                wasteTeam: teamFilter
            });
            const usageMetricKey = itemKey === 'gas'
                ? 'gas_usage'
                : (itemKey === 'waste' ? 'waste_usage' : 'electric_usage');
            const costMetricKey = itemKey === 'gas'
                ? 'gas_cost'
                : (itemKey === 'waste' ? 'waste_cost' : 'electric_cost');
            const usagePropKey = itemKey === 'gas'
                ? 'gasUsage'
                : (itemKey === 'waste' ? 'wasteUsage' : 'electricUsage');
            const costPropKey = itemKey === 'gas'
                ? 'gasCost'
                : (itemKey === 'waste' ? 'wasteCost' : 'electricCost');

            const reportState = {
                ...UtilReportState,
                from: range.start,
                to: range.end,
                scopeKey: itemKey,
                selectedScopeKeys: [itemKey],
                categoryKey: 'cost',
                electricTeam: scopedTeams.electricTeam,
                gasTeam: scopedTeams.gasTeam,
                wasteTeam: scopedTeams.wasteTeam,
                wasteCostModeKey: itemKey === 'waste' ? 'total' : UtilReportState.wasteCostModeKey,
                productionTeam
            };
            const result = buildUtilReportMonthlyRows(reportState);
            const usageScale = getUtilReportBuilderVizUsageScale(usageUnitKey, itemKey);
            const costScale = getUtilReportScale(costUnitKey);
            const productionScale = getUtilReportProductionScale(productionUnitKey);
            const usageUnitLabel = getUtilReportBuilderVizUsageLabel(usageUnitKey, itemKey);
            const costUnitLabel = getUtilReportUnitLabel(costUnitKey);
            const productionUnitLabel = getUtilReportProductionUnitLabel(productionUnitKey);
            const usageEnabled = usageChartType !== 'none';
            const costEnabled = costChartType !== 'none';
            const productionEnabled = productionChartType !== 'none';
            const ratioConfig = resolveUtilReportBuilderVizRatioConfig(itemKey);
            const ratioNumeratorMetric = ratioConfig.numeratorMetric;
            const ratioDenominatorMetric = ratioConfig.denominatorMetric;
            const ratioUseDenominator = ratioConfig.useDenominator === true;
            const ratioNumeratorScale = getUtilReportBuilderVizMetricScale(ratioNumeratorMetric, itemKey);
            const ratioDenominatorScale = getUtilReportBuilderVizMetricScale(ratioDenominatorMetric, itemKey);
            const ratioNumeratorEnabled = isUtilReportBuilderVizMetricEnabled(ratioNumeratorMetric, itemKey);
            const ratioDenominatorEnabled = ratioUseDenominator
                ? isUtilReportBuilderVizMetricEnabled(ratioDenominatorMetric, itemKey)
                : true;
            const ratioMeta = buildUtilReportBuilderVizRatioMeta(
                itemKey,
                ratioNumeratorMetric,
                ratioDenominatorMetric,
                ratioUseDenominator
            );
            const ratioEnabled = ratioNumeratorEnabled && ratioDenominatorEnabled;
            const ratioUnitLabel = ratioMeta.unitLabel;
            const ratioTitle = ratioMeta.title;
            const ratioAxisLabel = ratioMeta.axisLabel;
            const availableYears = getUtilReportBuilderVizAvailableYears(range);
            const appliedBaseYear = normalizeUtilReportBuilderVizAppliedBaseYear(
                UtilReportBuilderVizState.appliedBaseYear,
                range
            );
            const appliedCompareYear = normalizeUtilReportBuilderVizAppliedCompareYear(
                UtilReportBuilderVizState.appliedCompareYear,
                appliedBaseYear,
                range
            );
            const appliedModeEnabled = UtilReportBuilderVizState.appliedModeEnabled === true;
            UtilReportBuilderVizState.appliedBaseYear = appliedBaseYear;
            UtilReportBuilderVizState.appliedCompareYear = appliedCompareYear;
            const ratioValueDigits = isUtilReportCostMetric(ratioNumeratorMetric)
                ? getUtilReportBuilderVizMetricDecimals('cost')
                : (ratioNumeratorMetric === 'production'
                    ? getUtilReportBuilderVizMetricDecimals('production')
                    : getUtilReportBuilderVizMetricDecimals('usage'));
            const appliedComparisonEnabled = appliedModeEnabled && !!appliedBaseYear && !!appliedCompareYear && ratioEnabled && ratioUseDenominator;
            const baseRatioMapByMonth = new Map();
            if (appliedComparisonEnabled) {
                (result.rows || []).forEach(row => {
                    const rowYear = Number(row?.year);
                    const rowMonth = Number(row?.month);
                    if (!Number.isFinite(rowYear) || !Number.isFinite(rowMonth)) return;
                    if (String(rowYear) !== appliedBaseYear) return;
                    const numeratorRaw = Number(getUtilReportMetricValue(row, ratioNumeratorMetric));
                    const denominatorRaw = Number(getUtilReportMetricValue(row, ratioDenominatorMetric));
                    if (!Number.isFinite(numeratorRaw) || !Number.isFinite(denominatorRaw) || denominatorRaw === 0) return;
                    baseRatioMapByMonth.set(rowMonth, numeratorRaw / denominatorRaw);
                });
            }

            const usagePoints = [];
            const costPoints = [];
            const productionPoints = [];
            const ratioPoints = [];
            const actualComparePoints = [];
            const appliedComparePoints = [];
            const deltaComparePoints = [];
            (result.rows || []).forEach(row => {
                const key = row?.monthKey;
                const label = formatUtilReportMonthShort(row?.monthKey);
                const rowYear = Number(row?.year);
                const rowMonth = Number(row?.month);
                const usageRaw = Number(row?.[usagePropKey]);
                const costRaw = Number(row?.[costPropKey]);
                const productionRaw = Number(row?.production);
                const ratioNumeratorRaw = Number(getUtilReportMetricValue(row, ratioNumeratorMetric));
                const ratioDenominatorRaw = Number(getUtilReportMetricValue(row, ratioDenominatorMetric));
                const usage = usageEnabled && Number.isFinite(usageRaw) ? usageRaw / usageScale : NaN;
                const cost = costEnabled && Number.isFinite(costRaw) ? costRaw / costScale : NaN;
                const production = productionEnabled && Number.isFinite(productionRaw) ? productionRaw / productionScale : NaN;
                const ratioNumerator = ratioNumeratorEnabled && Number.isFinite(ratioNumeratorRaw)
                    ? ratioNumeratorRaw / ratioNumeratorScale
                    : NaN;
                const ratioDenominator = ratioUseDenominator && ratioDenominatorEnabled && Number.isFinite(ratioDenominatorRaw)
                    ? ratioDenominatorRaw / ratioDenominatorScale
                    : NaN;
                const ratio = !ratioEnabled
                    ? NaN
                    : (ratioUseDenominator
                        ? ((Number.isFinite(ratioNumerator) && Number.isFinite(ratioDenominator) && ratioDenominator !== 0)
                            ? (ratioNumerator / ratioDenominator)
                            : NaN)
                        : ratioNumerator);
                usagePoints.push({ key, label, value: usage });
                costPoints.push({ key, label, value: cost });
                productionPoints.push({ key, label, value: production });
                ratioPoints.push({
                    key,
                    label,
                    value: ratio,
                    numerator: ratioNumerator,
                    denominator: ratioDenominator
                });
                if (appliedComparisonEnabled && String(rowYear) === appliedCompareYear) {
                    const actualValue = ratioNumeratorEnabled && Number.isFinite(ratioNumeratorRaw)
                        ? ratioNumeratorRaw / ratioNumeratorScale
                        : NaN;
                    const baseRatio = Number(baseRatioMapByMonth.get(rowMonth));
                    const appliedRaw = Number.isFinite(baseRatio) && Number.isFinite(ratioDenominatorRaw)
                        ? (baseRatio * ratioDenominatorRaw)
                        : NaN;
                    const appliedValue = ratioNumeratorEnabled && Number.isFinite(appliedRaw)
                        ? appliedRaw / ratioNumeratorScale
                        : NaN;
                    const deltaValue = Number.isFinite(actualValue) && Number.isFinite(appliedValue)
                        ? (actualValue - appliedValue)
                        : NaN;
                    actualComparePoints.push({ key, label, value: actualValue });
                    appliedComparePoints.push({ key, label, value: appliedValue });
                    deltaComparePoints.push({ key, label, value: deltaValue });
                }
            });
            const appliedComparison = {
                enabled: appliedComparisonEnabled,
                hasData: appliedComparisonEnabled && appliedComparePoints.some(point => Number.isFinite(point?.value)),
                baseYear: appliedBaseYear,
                compareYear: appliedCompareYear,
                years: availableYears,
                digits: ratioValueDigits,
                numeratorLabel: ratioMeta.numeratorLabel,
                numeratorUnitLabel: ratioMeta.numeratorUnitLabel,
                actualTitle: `${appliedCompareYear}년 실제 ${ratioMeta.numeratorLabel}`,
                appliedTitle: appliedBaseYear
                    ? `${appliedBaseYear}년 기준 적용 ${ratioMeta.numeratorLabel}`
                    : '',
                deltaTitle: appliedBaseYear
                    ? `${appliedCompareYear}년 실제 - ${appliedBaseYear}년 기준 적용`
                    : '',
                axisLabel: formatUtilLabelWithUnit(ratioMeta.numeratorLabel, ratioMeta.numeratorUnitLabel),
                actualPoints: actualComparePoints,
                appliedPoints: appliedComparePoints,
                deltaPoints: deltaComparePoints
            };
            if (appliedCompareYear) {
                appliedComparison.actualTitle = `${appliedCompareYear}년 실제 ${ratioMeta.numeratorLabel}`;
                appliedComparison.appliedTitle = appliedBaseYear
                    ? `${appliedBaseYear}년 기준 적용 ${ratioMeta.numeratorLabel}`
                    : '';
                appliedComparison.deltaTitle = appliedBaseYear
                    ? `${appliedCompareYear}년 실제 - ${appliedBaseYear}년 기준 적용`
                    : '';
            }

            return {
                range,
                team,
                itemKey,
                itemLabel,
                result,
                usageMetricKey,
                costMetricKey,
                usageEnabled,
                costEnabled,
                productionEnabled,
                ratioEnabled,
                usageUnitLabel,
                costUnitLabel,
                productionUnitLabel,
                ratioNumeratorMetric,
                ratioDenominatorMetric,
                ratioUseDenominator,
                ratioUnitLabel,
                ratioTitle,
                ratioAxisLabel,
                ratioMeta,
                availableYears,
                appliedModeEnabled,
                appliedBaseYear,
                appliedCompareYear,
                appliedComparison,
                usagePoints,
                costPoints,
                productionPoints,
                ratioPoints
            };
        }

        function buildUtilReportBuilderVizRelativeMonthKey(monthKey, monthOffset) {
            const parsed = parseUtilMonthValue(monthKey);
            const offset = Number(monthOffset);
            if (!parsed || !Number.isFinite(offset)) return '';
            const base = (parsed.year * 12) + (parsed.month - 1) + offset;
            const year = Math.floor(base / 12);
            const month = (base % 12) + 1;
            if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return '';
            return `${year}-${String(month).padStart(2, '0')}`;
        }

        function buildUtilReportBuilderVizPointValueMap(points = []) {
            const map = new Map();
            const rows = Array.isArray(points) ? points : [];
            rows.forEach(point => {
                const monthKey = normalizeUtilReportMonthKey(point?.key || point?.label || '');
                const value = Number(point?.value);
                if (!monthKey || !Number.isFinite(value)) return;
                map.set(monthKey, value);
            });
            return map;
        }

        function resolveUtilReportBuilderVizMetricSnapshot(points, targetMonthKey = '') {
            const list = Array.isArray(points) ? points : [];
            const valueMap = buildUtilReportBuilderVizPointValueMap(list);
            if (!valueMap.size) {
                return { monthKey: '', value: NaN, momDelta: NaN, yoyDelta: NaN, label: '-' };
            }
            let resolvedMonthKey = normalizeUtilReportMonthKey(targetMonthKey);
            if (!resolvedMonthKey || !valueMap.has(resolvedMonthKey)) {
                for (let index = list.length - 1; index >= 0; index -= 1) {
                    const candidateKey = normalizeUtilReportMonthKey(list[index]?.key || list[index]?.label || '');
                    if (candidateKey && valueMap.has(candidateKey)) {
                        resolvedMonthKey = candidateKey;
                        break;
                    }
                }
            }
            if (!resolvedMonthKey || !valueMap.has(resolvedMonthKey)) {
                return { monthKey: '', value: NaN, momDelta: NaN, yoyDelta: NaN, label: '-' };
            }
            const currentValue = Number(valueMap.get(resolvedMonthKey));
            const previousMonthKey = buildUtilReportBuilderVizRelativeMonthKey(resolvedMonthKey, -1);
            const previousYearKey = buildUtilReportBuilderVizRelativeMonthKey(resolvedMonthKey, -12);
            const previousMonthValue = previousMonthKey && valueMap.has(previousMonthKey)
                ? Number(valueMap.get(previousMonthKey))
                : NaN;
            const previousYearValue = previousYearKey && valueMap.has(previousYearKey)
                ? Number(valueMap.get(previousYearKey))
                : NaN;
            return {
                monthKey: resolvedMonthKey,
                value: currentValue,
                momDelta: Number.isFinite(previousMonthValue) ? (currentValue - previousMonthValue) : NaN,
                yoyDelta: Number.isFinite(previousYearValue) ? (currentValue - previousYearValue) : NaN,
                label: formatUtilReportMonthShort(resolvedMonthKey) || resolvedMonthKey
            };
        }

        function renderUtilReportBuilderVizKpiCards(data) {
            const digitsMap = {
                usage: getUtilReportBuilderVizMetricDecimals('usage'),
                cost: getUtilReportBuilderVizMetricDecimals('cost'),
                production: getUtilReportBuilderVizMetricDecimals('production'),
                ratio: getUtilReportBuilderVizMetricDecimals('ratio')
            };
            const metrics = [
                {
                    key: 'usage',
                    title: '사용량',
                    unit: data.usageUnitLabel,
                    summary: resolveUtilReportBuilderVizMetricSnapshot(data.usagePoints)
                },
                {
                    key: 'cost',
                    title: '비용',
                    unit: data.costUnitLabel,
                    summary: resolveUtilReportBuilderVizMetricSnapshot(data.costPoints)
                },
                {
                    key: 'production',
                    title: '생산량',
                    unit: data.productionUnitLabel,
                    summary: resolveUtilReportBuilderVizMetricSnapshot(data.productionPoints)
                },
                {
                    key: 'ratio',
                    title: data?.ratioTitle
                        || getUtilReportBuilderVizRatioTitle(
                            data?.itemKey,
                            data?.ratioNumeratorMetric,
                            data?.ratioDenominatorMetric,
                            data?.ratioUseDenominator
                        )
                        || '비율',
                    unit: data.ratioUnitLabel,
                    summary: resolveUtilReportBuilderVizMetricSnapshot(data.ratioPoints)
                }
            ].filter(item => {
                if (item.key === 'usage') return data?.usageEnabled !== false;
                if (item.key === 'cost') return data?.costEnabled !== false;
                if (item.key === 'production') return data?.productionEnabled !== false;
                if (item.key === 'ratio') return data?.ratioEnabled === true;
                return true;
            });

            const formatDelta = (value, unitLabel, digits) => {
                if (!Number.isFinite(value)) return '-';
                const sign = value > 0 ? '+' : '';
                const deltaText = `${sign}${formatUtilNumber(value, digits)}`;
                const normalizedUnit = String(unitLabel || '').trim();
                return normalizedUnit ? `${deltaText} ${normalizedUnit}` : deltaText;
            };
            const resolveDeltaClass = (value) => {
                if (!Number.isFinite(value) || value === 0) return 'is-flat';
                return value > 0 ? 'is-up' : 'is-down';
            };

            return metrics.map(item => {
                const summary = item.summary || {};
                const digits = digitsMap[item.key] ?? digitsMap.usage;
                const valueText = Number.isFinite(summary.value)
                    ? formatUtilNumberWithUnit(summary.value, item.unit, digits)
                    : '-';
                const momText = Number.isFinite(summary.momDelta)
                    ? `전월 대비 ${formatDelta(summary.momDelta, item.unit, digits)}`
                    : '';
                const yoyText = Number.isFinite(summary.yoyDelta)
                    ? `전년 대비 ${formatDelta(summary.yoyDelta, item.unit, digits)}`
                    : '';
                return `
                    <div class="util-report-builder-viz-kpi">
                        <div class="name">${escapeHtml(item.title)}</div>
                        <div class="value">${escapeHtml(valueText)}</div>
                        <div class="delta ${resolveDeltaClass(summary.momDelta)}">${escapeHtml(momText)}</div>
                        <div class="delta ${resolveDeltaClass(summary.yoyDelta)}">${escapeHtml(yoyText)}</div>
                    </div>
                `;
            }).join('');
        }

        function formatUtilReportBuilderVizDetailMonthLabel(item) {
            const monthKey = normalizeUtilReportMonthKey(item?.key || item?.label || '');
            return monthKey || String(item?.label || '-');
        }

        function buildUtilReportBuilderVizPivotData(points = []) {
            const yearSet = new Set();
            const monthSet = new Set();
            const valueMap = new Map();
            const rows = Array.isArray(points) ? points : [];
            rows.forEach(point => {
                const value = Number(point?.value);
                if (!Number.isFinite(value)) return;
                const parsed = parseUtilMonthValue(point?.key || point?.label || '');
                if (!parsed) return;
                const year = Number(parsed.year);
                const month = Number(parsed.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                yearSet.add(year);
                monthSet.add(month);
                const mapKey = `${year}-${month}`;
                valueMap.set(mapKey, (Number(valueMap.get(mapKey)) || 0) + value);
            });
            return {
                years: Array.from(yearSet).sort((a, b) => a - b),
                months: Array.from(monthSet).sort((a, b) => a - b),
                valueMap
            };
        }
