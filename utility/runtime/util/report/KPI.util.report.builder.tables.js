        function renderUtilReportBuilderVizPivotSection(options = {}) {
            const title = String(options?.title || '상세지표').trim() || '상세지표';
            const unitLabel = String(options?.unitLabel || '-').trim() || '-';
            const digits = Number.isFinite(Number(options?.digits)) ? Number(options.digits) : 0;
            const selectedMonthKey = normalizeUtilReportMonthKey(options?.focusMonthKey || '');
            const pivot = buildUtilReportBuilderVizPivotData(options?.points || []);
            if (!pivot.years.length || !pivot.months.length) return '';
            const summary = selectedMonthKey
                ? resolveUtilReportBuilderVizMetricSnapshot(options?.points || [], selectedMonthKey)
                : null;
            const summaryValueText = Number.isFinite(summary?.value)
                ? formatUtilNumber(summary.value, digits)
                : '';
            const summaryMomText = Number.isFinite(summary?.momDelta)
                ? formatUtilNumber(summary.momDelta, digits)
                : '';
            const summaryYoyText = Number.isFinite(summary?.yoyDelta)
                ? formatUtilNumber(summary.yoyDelta, digits)
                : '';
            const summaryHtml = selectedMonthKey && summary?.monthKey
                ? `
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table">
                            <thead>
                                <tr>
                                    <th>선택월</th>
                                    <th>값 (${escapeHtml(unitLabel)})</th>
                                    <th>전월대비</th>
                                    <th>전년대비</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>${escapeHtml(summary.monthKey)}</td>
                                    <td>${escapeHtml(summaryValueText)}</td>
                                    <td>${escapeHtml(summaryMomText)}</td>
                                    <td>${escapeHtml(summaryYoyText)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                `
                : '';

            const yearHeaderHtml = pivot.years
                .map(year => `<th>${year} (${escapeHtml(unitLabel)})</th>`)
                .join('');
            const bodyHtml = pivot.months.map(month => {
                const monthToken = String(month).padStart(2, '0');
                const rowFocused = selectedMonthKey
                    && formatUtilReportMonthOnly(selectedMonthKey) === monthToken;
                const rowClass = rowFocused ? ' class="is-focused"' : '';
                const cellsHtml = pivot.years.map(year => {
                    const rawValue = Number(pivot.valueMap.get(`${year}-${month}`));
                    return `<td>${Number.isFinite(rawValue) ? formatUtilNumber(rawValue, digits) : '-'}</td>`;
                }).join('');
                return `<tr${rowClass}><td>${monthToken}</td>${cellsHtml}</tr>`;
            }).join('');
            const footerHtml = pivot.years.map(year => {
                let sum = 0;
                let hasValue = false;
                pivot.months.forEach(month => {
                    const rawValue = Number(pivot.valueMap.get(`${year}-${month}`));
                    if (!Number.isFinite(rawValue)) return;
                    sum += rawValue;
                    hasValue = true;
                });
                return `<td>${hasValue ? formatUtilNumber(sum, digits) : '-'}</td>`;
            }).join('');
            const selectedSuffix = selectedMonthKey ? ` · 선택 ${selectedMonthKey}` : '';
            return `
                <div class="util-report-builder-viz-detail-block">
                    <div class="util-report-builder-viz-detail-title">${escapeHtml(title)}${escapeHtml(selectedSuffix)}</div>
                    ${summaryHtml}
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table">
                            <thead>
                                <tr>
                                    <th>월</th>
                                    ${yearHeaderHtml}
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr>
                                    <td>합계</td>
                                    ${footerHtml}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function renderUtilReportBuilderVizCombinedDetailTable(data, focusMonthKey = '', focusSeriesKey = '') {
            const normalizedFocusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(focusSeriesKey);
            const selectedMonthKey = normalizeUtilReportMonthKey(focusMonthKey);
            const range = normalizeMonthRange(UtilReportBuilderVizState.from, UtilReportBuilderVizState.to);
            const metrics = [
                { key: 'usage', label: formatUtilLabelWithUnit('사용량', data?.usageUnitLabel || ''), points: data?.usagePoints || [], digits: getUtilReportBuilderVizMetricDecimals('usage') },
                { key: 'cost', label: formatUtilLabelWithUnit('비용', data?.costUnitLabel || ''), points: data?.costPoints || [], digits: getUtilReportBuilderVizMetricDecimals('cost') },
                { key: 'production', label: formatUtilLabelWithUnit('생산량', data?.productionUnitLabel || ''), points: data?.productionPoints || [], digits: getUtilReportBuilderVizMetricDecimals('production') }
            ].filter(metric => {
                if (metric.key === 'usage') return data?.usageEnabled !== false;
                if (metric.key === 'cost') return data?.costEnabled !== false;
                if (metric.key === 'production') return data?.productionEnabled !== false;
                return true;
            });
            if (!metrics.length) {
                return '<div class="util-report-builder-viz-detail-empty">표시할 월별 데이터가 없습니다.</div>';
            }
            const monthKeySet = new Set();
            const metricValueMaps = {};
            metrics.forEach(metric => {
                const valueMap = new Map();
                metricValueMaps[metric.key] = valueMap;
                (Array.isArray(metric.points) ? metric.points : []).forEach(point => {
                    const monthKey = normalizeUtilReportMonthKey(point?.key || point?.label || '');
                    if (!monthKey) return;
                    monthKeySet.add(monthKey);
                    const rawValue = Number(point?.value);
                    valueMap.set(monthKey, Number.isFinite(rawValue) ? rawValue : NaN);
                });
            });
            let timelineKeys = [];
            const startParsed = parseUtilMonthValue(range.start);
            const endParsed = parseUtilMonthValue(range.end);
            if (startParsed && endParsed) {
                let year = startParsed.year;
                let month = startParsed.month;
                const lastKey = (endParsed.year * 12) + endParsed.month;
                while (((year * 12) + month) <= lastKey) {
                    timelineKeys.push(`${year}-${String(month).padStart(2, '0')}`);
                    month += 1;
                    if (month > 12) {
                        year += 1;
                        month = 1;
                    }
                }
            }
            if (!timelineKeys.length) {
                timelineKeys = Array.from(monthKeySet).sort(compareUtilReportMonthKeys);
            }
            if (!timelineKeys.length) {
                return '<div class="util-report-builder-viz-detail-empty">표시할 월별 데이터가 없습니다.</div>';
            }
            const bodyHtml = timelineKeys.map(monthKey => {
                const rowFocused = selectedMonthKey === monthKey;
                const rowClass = rowFocused ? ' class="is-row-focused"' : '';
                const cellsHtml = metrics.map(metric => {
                    const rawValue = Number(metricValueMaps[metric.key].get(monthKey));
                    const cellFocused = rowFocused && normalizedFocusSeriesKey === metric.key;
                    const cellClass = cellFocused ? ' class="is-cell-focused"' : '';
                    return `<td${cellClass}>${Number.isFinite(rawValue) ? formatUtilNumber(rawValue, metric.digits) : '-'}</td>`;
                }).join('');
                return `<tr${rowClass}><td>${escapeHtml(formatUtilReportMonthLong(monthKey))}</td>${cellsHtml}</tr>`;
            }).join('');
            const footerHtml = metrics.map(metric => {
                let sum = 0;
                let hasValue = false;
                timelineKeys.forEach(monthKey => {
                    const rawValue = Number(metricValueMaps[metric.key].get(monthKey));
                    if (!Number.isFinite(rawValue)) return;
                    sum += rawValue;
                    hasValue = true;
                });
                return `<td>${hasValue ? formatUtilNumber(sum, metric.digits) : '-'}</td>`;
            }).join('');
            return `
                <div class="util-report-builder-viz-detail-block">
                    <div class="util-report-builder-viz-detail-title">상세지표 · 월별 세로표</div>
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table util-report-builder-viz-timeline-table">
                            <thead>
                                <tr>
                                    <th>월</th>
                                    ${metrics.map(metric => `<th>${metric.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr>
                                    <td>합계</td>
                                    ${footerHtml}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function renderUtilReportBuilderVizSeriesDetailTable(data, focusSeriesKey, focusMonthKey = '') {
            return renderUtilReportBuilderVizCombinedDetailTable(data, focusMonthKey, focusSeriesKey);
        }

        function renderUtilReportBuilderVizAppliedComparisonChart(data, options = {}) {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            return renderUtilMultiSeriesChart([
                {
                    label: comparison.actualTitle,
                    color: '#2563eb',
                    type: 'bar',
                    points: comparison.actualPoints,
                    seriesKey: 'actual'
                },
                {
                    label: comparison.appliedTitle,
                    color: '#f97316',
                    type: 'line',
                    lineDash: '7 5',
                    lineWidth: 3,
                    points: comparison.appliedPoints,
                    seriesKey: 'applied'
                }
            ], {
                mode: 'modal',
                hideHeader: true,
                hideUnit: true,
                showLabels: options.showLabels === true,
                decimals: comparison.digits,
                minWidth: 0,
                forceWidth: options.forceWidth,
                pointSpacing: options.pointSpacing,
                height: options.height,
                frameExtraHeight: 148,
                topCenterTitle: `${comparison.compareYear}년 실제 / ${comparison.baseYear}년 기준 적용`,
                periodLabel: `기준년도 ${comparison.baseYear} | 비교년도 ${comparison.compareYear}`,
                inlinePeriodLegend: true,
                axisXLabel: '월',
                axisYLabel: comparison.axisLabel,
                axisXIcon: '📅',
                axisYIcon: '📈'
            });
        }

        function renderUtilReportBuilderVizAppliedComparisonDetail(data, focusMonthKey = '') {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const selectedMonthKey = normalizeUtilReportMonthKey(focusMonthKey);
            const actualMap = buildUtilReportBuilderVizPointValueMap(comparison.actualPoints);
            const appliedMap = buildUtilReportBuilderVizPointValueMap(comparison.appliedPoints);
            const deltaMap = buildUtilReportBuilderVizPointValueMap(comparison.deltaPoints);
            const timelineKeys = Array.from(
                new Set(
                    []
                        .concat(comparison.actualPoints || [])
                        .concat(comparison.appliedPoints || [])
                        .map(point => normalizeUtilReportMonthKey(point?.key || point?.label || ''))
                        .filter(Boolean)
                )
            ).sort(compareUtilReportMonthKeys);
            if (!timelineKeys.length) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const bodyHtml = timelineKeys.map(monthKey => {
                const actualValue = Number(actualMap.get(monthKey));
                const appliedValue = Number(appliedMap.get(monthKey));
                const deltaValue = Number(deltaMap.get(monthKey));
                const rowFocused = selectedMonthKey === monthKey;
                const rowClass = rowFocused ? ' class="is-row-focused"' : '';
                return `
                    <tr${rowClass}>
                        <td>${escapeHtml(formatUtilReportMonthLong(monthKey))}</td>
                        <td>${Number.isFinite(actualValue) ? formatUtilNumber(actualValue, comparison.digits) : '-'}</td>
                        <td>${Number.isFinite(appliedValue) ? formatUtilNumber(appliedValue, comparison.digits) : '-'}</td>
                        <td>${Number.isFinite(deltaValue) ? formatUtilNumber(deltaValue, comparison.digits) : '-'}</td>
                    </tr>
                `;
            }).join('');
            const actualTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(actualMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const appliedTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(appliedMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const deltaTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(deltaMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            return `
                <div class="util-report-builder-viz-detail-block">
                    <div class="util-report-builder-viz-detail-title">${escapeHtml(`${comparison.baseYear}년 기준 원단위 적용 비교`)}</div>
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table util-report-builder-viz-timeline-table">
                            <thead>
                                <tr>
                                    <th>월</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit(comparison.actualTitle, comparison.numeratorUnitLabel || ''))}</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit(comparison.appliedTitle, comparison.numeratorUnitLabel || ''))}</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit('차이', comparison.numeratorUnitLabel || ''))}</th>
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr>
                                    <td>합계</td>
                                    <td>${formatUtilNumber(actualTotal, comparison.digits)}</td>
                                    <td>${formatUtilNumber(appliedTotal, comparison.digits)}</td>
                                    <td>${formatUtilNumber(deltaTotal, comparison.digits)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function renderUtilReportBuilderVizAppliedComparisonChart(data, options = {}) {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            return renderUtilMultiSeriesChart([
                {
                    label: comparison.actualTitle,
                    color: '#2563eb',
                    type: 'bar',
                    points: comparison.actualPoints,
                    seriesKey: 'actual'
                },
                {
                    label: comparison.appliedTitle,
                    color: '#f97316',
                    type: 'line',
                    lineDash: '7 5',
                    lineWidth: 3,
                    points: comparison.appliedPoints,
                    seriesKey: 'applied'
                }
            ], {
                mode: 'modal',
                hideHeader: true,
                hideUnit: true,
                showLabels: options.showLabels === true,
                decimals: comparison.digits,
                minWidth: 0,
                forceWidth: options.forceWidth,
                pointSpacing: options.pointSpacing,
                height: options.height,
                frameExtraHeight: 148,
                topCenterTitle: `${comparison.compareYear}년 실제 / ${comparison.baseYear}년 기준 적용`,
                periodLabel: `기준년도 ${comparison.baseYear} | 비교년도 ${comparison.compareYear}`,
                inlinePeriodLegend: true,
                axisXLabel: '월',
                axisYLabel: comparison.axisLabel,
                axisXIcon: '',
                axisYIcon: '값'
            });
        }

        function renderUtilReportBuilderVizAppliedComparisonDetail(data, focusMonthKey = '') {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const selectedMonthKey = normalizeUtilReportMonthKey(focusMonthKey);
            const actualMap = buildUtilReportBuilderVizPointValueMap(comparison.actualPoints);
            const appliedMap = buildUtilReportBuilderVizPointValueMap(comparison.appliedPoints);
            const deltaMap = buildUtilReportBuilderVizPointValueMap(comparison.deltaPoints);
            const timelineKeys = Array.from(
                new Set(
                    []
                        .concat(comparison.actualPoints || [])
                        .concat(comparison.appliedPoints || [])
                        .map(point => normalizeUtilReportMonthKey(point?.key || point?.label || ''))
                        .filter(Boolean)
                )
            ).sort(compareUtilReportMonthKeys);
            if (!timelineKeys.length) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const bodyHtml = timelineKeys.map(monthKey => {
                const actualValue = Number(actualMap.get(monthKey));
                const appliedValue = Number(appliedMap.get(monthKey));
                const deltaValue = Number(deltaMap.get(monthKey));
                const rowFocused = selectedMonthKey === monthKey;
                const rowClass = rowFocused ? ' class="is-row-focused"' : '';
                return `
                    <tr${rowClass}>
                        <td>${escapeHtml(formatUtilReportMonthLong(monthKey))}</td>
                        <td>${Number.isFinite(actualValue) ? formatUtilNumber(actualValue, comparison.digits) : '-'}</td>
                        <td>${Number.isFinite(appliedValue) ? formatUtilNumber(appliedValue, comparison.digits) : '-'}</td>
                        <td>${Number.isFinite(deltaValue) ? formatUtilNumber(deltaValue, comparison.digits) : '-'}</td>
                    </tr>
                `;
            }).join('');
            const actualTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(actualMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const appliedTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(appliedMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const deltaTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(deltaMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            return `
                <div class="util-report-builder-viz-detail-block">
                    <div class="util-report-builder-viz-detail-title">${escapeHtml(`${comparison.baseYear}년 기준 원단위 적용 비교`)}</div>
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table util-report-builder-viz-timeline-table">
                            <thead>
                                <tr>
                                    <th>월</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit(comparison.actualTitle, comparison.numeratorUnitLabel || ''))}</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit(comparison.appliedTitle, comparison.numeratorUnitLabel || ''))}</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit('차이', comparison.numeratorUnitLabel || ''))}</th>
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr>
                                    <td>합계</td>
                                    <td>${formatUtilNumber(actualTotal, comparison.digits)}</td>
                                    <td>${formatUtilNumber(appliedTotal, comparison.digits)}</td>
                                    <td>${formatUtilNumber(deltaTotal, comparison.digits)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function renderUtilReportBuilderVizRatioDetailTable(data, focusMonthKey = '') {
            const digits = getUtilReportBuilderVizMetricDecimals('ratio');
            const selectedMonthKey = normalizeUtilReportMonthKey(focusMonthKey);
            const ratioTitle = String(
                data?.ratioTitle
                || getUtilReportBuilderVizRatioTitle(
                    data?.itemKey,
                    data?.ratioNumeratorMetric,
                    data?.ratioDenominatorMetric,
                    data?.ratioUseDenominator
                )
                || '비율'
            );
            const range = normalizeMonthRange(UtilReportBuilderVizState.from, UtilReportBuilderVizState.to);
            const ratioMap = new Map();
            (Array.isArray(data?.ratioPoints) ? data.ratioPoints : []).forEach(point => {
                const monthKey = normalizeUtilReportMonthKey(point?.key || point?.label || '');
                if (!monthKey) return;
                const rawValue = Number(point?.value);
                ratioMap.set(monthKey, Number.isFinite(rawValue) ? rawValue : NaN);
            });
            let timelineKeys = [];
            const startParsed = parseUtilMonthValue(range.start);
            const endParsed = parseUtilMonthValue(range.end);
            if (startParsed && endParsed) {
                let year = startParsed.year;
                let month = startParsed.month;
                const lastKey = (endParsed.year * 12) + endParsed.month;
                while (((year * 12) + month) <= lastKey) {
                    timelineKeys.push(`${year}-${String(month).padStart(2, '0')}`);
                    month += 1;
                    if (month > 12) {
                        year += 1;
                        month = 1;
                    }
                }
            }
            if (!timelineKeys.length) {
                timelineKeys = Array.from(ratioMap.keys()).sort(compareUtilReportMonthKeys);
            }
            if (!timelineKeys.length) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(ratioTitle)} 상세표를 표시할 데이터가 없습니다.</div>`;
            }
            const bodyHtml = timelineKeys.map(monthKey => {
                const rawValue = Number(ratioMap.get(monthKey));
                const rowFocused = selectedMonthKey === monthKey;
                const rowClass = rowFocused ? ' class="is-row-focused"' : '';
                const cellClass = rowFocused ? ' class="is-cell-focused"' : '';
                return `<tr${rowClass}><td>${escapeHtml(formatUtilReportMonthLong(monthKey))}</td><td${cellClass}>${Number.isFinite(rawValue) ? formatUtilNumber(rawValue, digits) : '-'}</td></tr>`;
            }).join('');
            const validValues = timelineKeys.map(monthKey => Number(ratioMap.get(monthKey))).filter(Number.isFinite);
            const averageValue = validValues.length
                ? formatUtilNumber(validValues.reduce((sum, value) => sum + value, 0) / validValues.length, digits)
                : '-';
            return `
                <div class="util-report-builder-viz-detail-block">
                    <div class="util-report-builder-viz-detail-title">상세지표 · ${escapeHtml(ratioTitle)}</div>
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table util-report-builder-viz-timeline-table">
                            <thead>
                                <tr>
                                    <th>월</th>
                                    <th>${escapeHtml(formatUtilLabelWithUnit(ratioTitle, data?.ratioUnitLabel || ''))}</th>
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr>
                                    <td>평균</td>
                                    <td>${averageValue}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function getUtilReportBuilderVizAppliedDeltaClass(value) {
            if (!Number.isFinite(value) || value === 0) return '';
            return value > 0
                ? 'util-report-builder-viz-detail-delta-up'
                : 'util-report-builder-viz-detail-delta-down';
        }

        function formatUtilReportBuilderVizAppliedDeltaValue(value, digits) {
            if (!Number.isFinite(value)) return '-';
            return `${value > 0 ? '+' : ''}${formatUtilNumber(value, digits)}`;
        }

        function formatUtilReportBuilderVizAppliedDeltaRate(deltaValue, appliedValue) {
            if (!Number.isFinite(deltaValue) || !Number.isFinite(appliedValue) || appliedValue === 0) return '';
            const rate = (deltaValue / appliedValue) * 100;
            return `${rate > 0 ? '+' : ''}${formatUtilNumber(rate, 1)}%`;
        }

        function buildUtilReportBuilderVizAppliedComparisonStats(comparison) {
            if (!comparison || comparison.enabled !== true) return null;
            const actualMap = buildUtilReportBuilderVizPointValueMap(comparison.actualPoints);
            const appliedMap = buildUtilReportBuilderVizPointValueMap(comparison.appliedPoints);
            const deltaMap = buildUtilReportBuilderVizPointValueMap(comparison.deltaPoints);
            const timelineKeys = Array.from(
                new Set(
                    []
                        .concat(comparison.actualPoints || [])
                        .concat(comparison.appliedPoints || [])
                        .map(point => normalizeUtilReportMonthKey(point?.key || point?.label || ''))
                        .filter(Boolean)
                )
            ).sort(compareUtilReportMonthKeys);
            const actualTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(actualMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const appliedTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(appliedMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            const deltaTotal = timelineKeys.reduce((sum, monthKey) => {
                const value = Number(deltaMap.get(monthKey));
                return Number.isFinite(value) ? (sum + value) : sum;
            }, 0);
            let peakMonthKey = '';
            let peakDeltaValue = NaN;
            timelineKeys.forEach(monthKey => {
                const deltaValue = Number(deltaMap.get(monthKey));
                if (!Number.isFinite(deltaValue)) return;
                if (!Number.isFinite(peakDeltaValue) || Math.abs(deltaValue) > Math.abs(peakDeltaValue)) {
                    peakMonthKey = monthKey;
                    peakDeltaValue = deltaValue;
                }
            });
            const peakAppliedValue = peakMonthKey ? Number(appliedMap.get(peakMonthKey)) : NaN;
            return {
                actualMap,
                appliedMap,
                deltaMap,
                timelineKeys,
                actualTotal,
                appliedTotal,
                deltaTotal,
                deltaTotalClass: getUtilReportBuilderVizAppliedDeltaClass(deltaTotal),
                deltaTotalRateText: formatUtilReportBuilderVizAppliedDeltaRate(deltaTotal, appliedTotal),
                peakMonthKey,
                peakDeltaValue,
                peakDeltaClass: getUtilReportBuilderVizAppliedDeltaClass(peakDeltaValue),
                peakDeltaRateText: formatUtilReportBuilderVizAppliedDeltaRate(peakDeltaValue, peakAppliedValue)
            };
        }

        function renderUtilReportBuilderVizAppliedComparisonMeta(comparison, stats, options = {}) {
            if (!comparison || !stats) return '';
            const includePeak = options.includePeak === true && !!stats.peakMonthKey;
            const chips = [
                {
                    tone: `delta ${stats.deltaTotalClass}`.trim(),
                    label: '실제 - 적용',
                    value: formatUtilReportBuilderVizAppliedDeltaValue(stats.deltaTotal, comparison.digits),
                    meta: stats.deltaTotalRateText || comparison.deltaTitle || ''
                },
                {
                    tone: 'actual',
                    label: '실제값 합계',
                    value: formatUtilNumber(stats.actualTotal, comparison.digits),
                    meta: comparison.actualTitle || ''
                },
                {
                    tone: 'applied',
                    label: '적용값 합계',
                    value: formatUtilNumber(stats.appliedTotal, comparison.digits),
                    meta: comparison.appliedTitle || ''
                }
            ];
            if (includePeak) {
                chips.push({
                    tone: `peak ${stats.peakDeltaClass}`.trim(),
                    label: '가장 큰 차이 월',
                    value: `${formatUtilReportMonthLong(stats.peakMonthKey)} ${formatUtilReportBuilderVizAppliedDeltaValue(stats.peakDeltaValue, comparison.digits)}`,
                    meta: stats.peakDeltaRateText || comparison.deltaTitle || ''
                });
            }
            return `
                <div class="util-report-builder-viz-compare-meta${options.compact === true ? ' is-compact' : ''}">
                    ${chips.map(item => `
                        <div class="util-report-builder-viz-compare-chip is-${escapeHtml(item.tone)}">
                            <div class="label">${escapeHtml(item.label)}</div>
                            <div class="value">${escapeHtml(item.value)}</div>
                            ${item.meta ? `<div class="meta">${escapeHtml(item.meta)}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        function renderUtilReportBuilderVizAppliedComparisonChartNext(data, options = {}) {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const actualChartType = normalizeUtilReportBuilderVizChartType(options.actualChartType || options.chartType || 'bar');
            const appliedChartType = normalizeUtilReportBuilderVizChartType(options.appliedChartType || options.chartType || actualChartType);
            const stats = buildUtilReportBuilderVizAppliedComparisonStats(comparison);
            const chartHtml = renderUtilMultiSeriesChart([
                {
                    label: comparison.actualTitle,
                    color: '#2563eb',
                    type: actualChartType,
                    lineWidth: actualChartType === 'line' ? 4 : undefined,
                    points: comparison.actualPoints,
                    seriesKey: 'actual'
                },
                {
                    label: comparison.appliedTitle,
                    color: '#f97316',
                    type: appliedChartType,
                    lineDash: appliedChartType === 'line' ? '7 5' : '',
                    lineWidth: appliedChartType === 'line' ? 3.2 : undefined,
                    points: comparison.appliedPoints,
                    seriesKey: 'applied'
                }
            ], {
                mode: 'modal',
                hideHeader: true,
                hideUnit: true,
                showLabels: options.showLabels === true,
                decimals: comparison.digits,
                minWidth: 0,
                forceWidth: options.forceWidth,
                pointSpacing: options.pointSpacing,
                height: options.height,
                frameExtraHeight: 148,
                topCenterTitle: comparison.deltaTitle || `${comparison.compareYear} 실제값 vs ${comparison.baseYear} 기준 적용값`,
                periodLabel: `${comparison.actualTitle} / ${comparison.appliedTitle}${stats?.deltaTotalRateText ? ` | 실제-적용 ${formatUtilReportBuilderVizAppliedDeltaValue(stats.deltaTotal, comparison.digits)}` : ''}`,
                inlinePeriodLegend: true,
                axisXLabel: '월',
                axisYLabel: comparison.axisLabel,
                axisXIcon: '',
                axisYIcon: '값'
            });
            return chartHtml;
        }

        function renderUtilReportBuilderVizAppliedComparisonDetailNext(data, focusMonthKey = '') {
            const comparison = data?.appliedComparison;
            if (!comparison || comparison.enabled !== true || !comparison.baseYear || !comparison.compareYear) return '';
            if (comparison.hasData !== true) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const selectedMonthKey = normalizeUtilReportMonthKey(focusMonthKey);
            const stats = buildUtilReportBuilderVizAppliedComparisonStats(comparison);
            if (!stats || !stats.timelineKeys.length) {
                return `<div class="util-report-builder-viz-detail-empty">${escapeHtml(`${comparison.baseYear}년 원단위를 ${comparison.compareYear}년에 적용할 데이터가 없습니다.`)}</div>`;
            }
            const bodyHtml = stats.timelineKeys.map(monthKey => {
                const actualValue = Number(stats.actualMap.get(monthKey));
                const appliedValue = Number(stats.appliedMap.get(monthKey));
                const deltaValue = Number(stats.deltaMap.get(monthKey));
                const deltaClass = getUtilReportBuilderVizAppliedDeltaClass(deltaValue);
                const deltaRateText = formatUtilReportBuilderVizAppliedDeltaRate(deltaValue, appliedValue);
                const rowFocused = selectedMonthKey === monthKey;
                const rowClass = rowFocused ? ' class="is-row-focused"' : '';
                return `
                    <tr${rowClass}>
                        <td>${escapeHtml(formatUtilReportMonthLong(monthKey))}</td>
                        <td class="is-actual">${Number.isFinite(actualValue) ? formatUtilNumber(actualValue, comparison.digits) : '-'}</td>
                        <td class="is-applied">${Number.isFinite(appliedValue) ? formatUtilNumber(appliedValue, comparison.digits) : '-'}</td>
                        <td class="util-report-builder-viz-compare-delta-cell ${deltaClass}">
                            <div class="util-report-builder-viz-compare-delta-value">${escapeHtml(formatUtilReportBuilderVizAppliedDeltaValue(deltaValue, comparison.digits))}</div>
                            ${deltaRateText ? `<div class="util-report-builder-viz-compare-delta-rate">${escapeHtml(deltaRateText)}</div>` : ''}
                        </td>
                    </tr>
                `;
            }).join('');
            return `
                <div class="util-report-builder-viz-detail-block util-report-builder-viz-compare-block">
                    <div class="util-report-builder-viz-detail-title">${escapeHtml(`${comparison.baseYear} 원단위 적용 분석`)}</div>
                    ${renderUtilReportBuilderVizAppliedComparisonMeta(comparison, stats, { includePeak: true })}
                    <div class="util-report-table-shell">
                        <table class="util-report-yoy-table util-report-builder-viz-timeline-table util-report-builder-viz-compare-table">
                            <thead>
                                <tr>
                                    <th>
                                        <div class="util-head-cell">
                                            <div class="util-head-label">월</div>
                                            <div class="util-head-sub">${escapeHtml(`${comparison.compareYear} 적용 대상`)}</div>
                                        </div>
                                    </th>
                                    <th class="is-actual">
                                        <div class="util-head-cell">
                                            <div class="util-head-label">실제값</div>
                                            <div class="util-head-sub">${escapeHtml(formatUtilLabelWithUnit(comparison.actualTitle, comparison.numeratorUnitLabel || ''))}</div>
                                        </div>
                                    </th>
                                    <th class="is-applied">
                                        <div class="util-head-cell">
                                            <div class="util-head-label">적용값</div>
                                            <div class="util-head-sub">${escapeHtml(formatUtilLabelWithUnit(comparison.appliedTitle, comparison.numeratorUnitLabel || ''))}</div>
                                        </div>
                                    </th>
                                    <th class="is-delta">
                                        <div class="util-head-cell">
                                            <div class="util-head-label">차이</div>
                                            <div class="util-head-sub">${escapeHtml(formatUtilLabelWithUnit(comparison.deltaTitle || '실제 - 적용', comparison.numeratorUnitLabel || ''))}</div>
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>${bodyHtml}</tbody>
                            <tfoot>
                                <tr class="util-report-builder-viz-compare-total">
                                    <td>합계</td>
                                    <td class="is-actual">${formatUtilNumber(stats.actualTotal, comparison.digits)}</td>
                                    <td class="is-applied">${formatUtilNumber(stats.appliedTotal, comparison.digits)}</td>
                                    <td class="util-report-builder-viz-compare-delta-cell ${stats.deltaTotalClass}">
                                        <div class="util-report-builder-viz-compare-delta-value">${escapeHtml(formatUtilReportBuilderVizAppliedDeltaValue(stats.deltaTotal, comparison.digits))}</div>
                                        ${stats.deltaTotalRateText ? `<div class="util-report-builder-viz-compare-delta-rate">${escapeHtml(stats.deltaTotalRateText)}</div>` : ''}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            `;
        }

        function setUtilReportBuilderVizDirtyMessage(modal, message = '') {
            if (!modal) return;
            const dirtyEl = modal.querySelector('[data-role="util-report-builder-viz-dirty"]');
            if (!dirtyEl) return;
            const text = String(message || '').trim();
            dirtyEl.textContent = text;
            dirtyEl.classList.toggle('is-show', !!text);
        }

        function renderUtilReportBuilderVizPendingState(modal, message = '조건을 조정하면 그래프가 자동으로 반영됩니다.') {
            if (!modal) return;
            modal._builderVizData = null;
            const subEl = modal.querySelector('[data-role="util-report-builder-viz-sub"]');
            const kpiEl = modal.querySelector('[data-role="util-report-builder-viz-kpis"]');
            const mainChartEl = modal.querySelector('[data-role="util-report-builder-viz-main-chart"]');
            const mainDetailEl = modal.querySelector('[data-role="util-report-builder-viz-main-detail"]');
            const ratioChartEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-chart"]');
            const ratioDetailEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-detail"]');
            const mainPanelEl = modal.querySelector('[data-role="util-report-builder-viz-main-panel"]');
            const ratioPanelEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-panel"]');
            const ratioTitleEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-title"]');
            const range = normalizeMonthRange(UtilReportBuilderVizState.from, UtilReportBuilderVizState.to);
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportBuilderVizState.itemKey);
            const teamLabel = normalizeUtilReportBuilderTeam(UtilReportBuilderVizState.team, itemKey);
            const itemLabel = getUtilReportBuilderVizItemLabel(itemKey);
            const ratioConfig = resolveUtilReportBuilderVizRatioConfig(itemKey);
            const ratioTitle = getUtilReportBuilderVizRatioTitle(
                itemKey,
                ratioConfig.numeratorMetric,
                ratioConfig.denominatorMetric,
                ratioConfig.useDenominator
            );
            if (subEl) {
                subEl.textContent = `기간: ${range.start} ~ ${range.end} · 항목: ${itemLabel} · 팀: ${teamLabel}`;
            }
            if (ratioTitleEl) ratioTitleEl.textContent = ratioTitle;
            if (mainPanelEl) mainPanelEl.style.minWidth = '';
            if (ratioPanelEl) ratioPanelEl.style.minWidth = '';
            if (mainChartEl) mainChartEl.style.minHeight = '';
            if (ratioChartEl) ratioChartEl.style.minHeight = '';
            if (kpiEl) kpiEl.innerHTML = '';
            if (mainChartEl) mainChartEl.innerHTML = `<div class="util-report-builder-viz-empty">${escapeHtml(message)}</div>`;
            if (mainDetailEl) mainDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                ? renderUtilReportBuilderVizDetachedPlaceholder()
                : '<div class="util-report-builder-viz-detail-empty">그래프나 범례를 클릭하면 월별 상세표가 아래에 표시됩니다.</div>';
            if (ratioChartEl) ratioChartEl.innerHTML = `<div class="util-report-builder-viz-empty">${escapeHtml(message)}</div>`;
            if (ratioDetailEl) ratioDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                ? renderUtilReportBuilderVizDetachedPlaceholder()
                : `<div class="util-report-builder-viz-detail-empty">그래프를 클릭하면 ${escapeHtml(ratioTitle)} 상세표가 아래에 표시됩니다.</div>`;
            syncUtilReportBuilderVizChartView(modal);
            syncUtilReportBuilderVizActionState(modal);
            syncUtilReportBuilderVizDetachedTableWindow(null);
            const dirtyText = UtilReportBuilderVizState.hasGenerated && UtilReportBuilderVizState.isDirty
                ? '설정이 변경되었습니다. 드롭다운 변경이 자동 반영됩니다.'
                : '조건을 조정하면 그래프가 자동으로 반영됩니다.';
            setUtilReportBuilderVizDirtyMessage(modal, dirtyText);
        }

        function renderUtilReportBuilderVizHost(modal) {
            if (!modal) return;
            const subEl = modal.querySelector('[data-role="util-report-builder-viz-sub"]');
            const kpiEl = modal.querySelector('[data-role="util-report-builder-viz-kpis"]');
            const mainChartEl = modal.querySelector('[data-role="util-report-builder-viz-main-chart"]');
            const mainDetailEl = modal.querySelector('[data-role="util-report-builder-viz-main-detail"]');
            const ratioChartEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-chart"]');
            const ratioDetailEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-detail"]');
            const mainPanelEl = modal.querySelector('[data-role="util-report-builder-viz-main-panel"]');
            const ratioPanelEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-panel"]');
            const mainNoteEl = modal.querySelector('[data-role="util-report-builder-viz-main-note"]');
            const ratioTitleEl = modal.querySelector('[data-role="util-report-builder-viz-ratio-title"]');
            if (!kpiEl || !mainChartEl || !ratioChartEl) return;
            modal.classList.toggle('is-chart-fullscreen', UtilReportBuilderVizState.chartFullscreen === true);
            syncUtilReportBuilderVizControls(modal);
            syncUtilReportBuilderVizChartView(modal);
            syncUtilReportBuilderVizActionState(modal);
            if (UtilReportBuilderVizState.hasGenerated !== true) {
                renderUtilReportBuilderVizPendingState(modal);
                return;
            }

            const data = buildUtilReportBuilderVizData();
            modal._builderVizData = data;
            const rowCount = Array.isArray(data?.result?.rows) ? data.result.rows.length : 0;
            const rangeLabel = String(data?.result?.rangeLabel || `${data.range.start} ~ ${data.range.end}`);
            const teamLabel = normalizeUtilReportBuilderTeam(data.team, data.itemKey);
            const ratioTitle = String(
                data?.ratioTitle
                || getUtilReportBuilderVizRatioTitle(
                    data?.itemKey,
                    data?.ratioNumeratorMetric,
                    data?.ratioDenominatorMetric,
                    data?.ratioUseDenominator
                )
                || '비율'
            );
            const normalizedFocusMonthKey = normalizeUtilReportMonthKey(UtilReportBuilderVizState.focusMonthKey);
            const appliedModeEnabled = data?.appliedModeEnabled === true;
            const availableMonthKeys = new Set(
                [
                    ...(Array.isArray(data?.usagePoints) ? data.usagePoints : []),
                    ...(Array.isArray(data?.costPoints) ? data.costPoints : []),
                    ...(Array.isArray(data?.productionPoints) ? data.productionPoints : []),
                    ...(Array.isArray(data?.ratioPoints) ? data.ratioPoints : [])
                ]
                    .map(point => getUtilChartPointMonthKey(point, point?.label || ''))
                    .filter(Boolean)
            );
            const focusMonthKey = availableMonthKeys.has(normalizedFocusMonthKey) ? normalizedFocusMonthKey : '';
            UtilReportBuilderVizState.focusMonthKey = focusMonthKey;
            if (subEl) {
                const monthFocusText = focusMonthKey ? ` · 선택 월: ${focusMonthKey}` : '';
                subEl.textContent = `기간: ${rangeLabel} · 항목: ${data?.itemLabel || '-'} · 팀: ${teamLabel} · 총 ${formatUtilNumber(data?.result?.monthCount || rowCount)}개월${monthFocusText}`;
            }
            if (ratioTitleEl) {
                ratioTitleEl.textContent = appliedModeEnabled
                    ? `${ratioTitle} 적용 분석`
                    : ratioTitle;
            }

            if (!rowCount) {
                setUtilReportBuilderVizDirtyMessage(modal, '');
                if (mainPanelEl) mainPanelEl.style.minWidth = '';
                if (ratioPanelEl) ratioPanelEl.style.minWidth = '';
                if (mainChartEl) mainChartEl.style.minHeight = '';
                if (ratioChartEl) ratioChartEl.style.minHeight = '';
                kpiEl.innerHTML = '';
                mainChartEl.innerHTML = '<div class="util-report-builder-viz-empty">표시할 월별 데이터가 없습니다.</div>';
                if (mainDetailEl) mainDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                    ? renderUtilReportBuilderVizDetachedPlaceholder(data)
                    : '<div class="util-report-builder-viz-detail-empty">표시할 데이터가 없습니다.</div>';
                ratioChartEl.innerHTML = `<div class="util-report-builder-viz-empty">${escapeHtml(ratioTitle)} 데이터를 계산할 수 없습니다.</div>`;
                if (ratioDetailEl) ratioDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                    ? renderUtilReportBuilderVizDetachedPlaceholder(data)
                    : '<div class="util-report-builder-viz-detail-empty">표시할 데이터가 없습니다.</div>';
                syncUtilReportBuilderVizActionState(modal, data);
                syncUtilReportBuilderVizDetachedTableWindow(data);
                return;
            }
            setUtilReportBuilderVizDirtyMessage(modal, '');

            const hasMainData = [data.usagePoints, data.costPoints, data.productionPoints]
                .some(points => points.some(point => Number.isFinite(point?.value)));
            const hasRatioData = data.ratioPoints.some(point => Number.isFinite(point?.value));
            kpiEl.innerHTML = renderUtilReportBuilderVizKpiCards(data);
            syncUtilReportBuilderVizActionState(modal, data);

            const hostWindow = modal.ownerDocument?.defaultView || window;
            const viewportWidth = Number(hostWindow.innerWidth) || 0;
            const viewportHeight = Number(hostWindow.innerHeight) || 0;
            const headHeight = Math.ceil(modal.querySelector('.util-report-builder-viz-head')?.getBoundingClientRect?.().height || 0);
            const controlsHeight = Math.ceil(modal.querySelector('.util-report-builder-viz-controls')?.getBoundingClientRect?.().height || 0);
            const bodyHeight = Math.ceil(modal.querySelector('.util-report-builder-viz-body')?.getBoundingClientRect?.().height || 0);
            const kpiHeight = Math.ceil(kpiEl.getBoundingClientRect?.().height || 0);
            const isChartFullscreen = UtilReportBuilderVizState.chartFullscreen === true;
            const fallbackChartArea = Math.max(
                isChartFullscreen ? 520 : 360,
                viewportHeight - headHeight - controlsHeight - (isChartFullscreen ? 116 : 170)
            );
            const chartAreaHeight = bodyHeight > 0
                ? Math.max(
                    isChartFullscreen ? 500 : 360,
                    bodyHeight - (isChartFullscreen ? 8 : kpiHeight) - (isChartFullscreen ? 8 : 24)
                )
                : fallbackChartArea;
            const fullChartHeight = isChartFullscreen
                ? Math.max(560, Math.min(760, chartAreaHeight - 10))
                : Math.max(380, Math.min(500, chartAreaHeight - 64));
            const mainChartHeight = fullChartHeight;
            const ratioChartHeight = isChartFullscreen
                ? Math.max(500, Math.min(700, fullChartHeight - 18))
                : Math.max(320, Math.min(420, fullChartHeight - 36));
            const fitViewportWidth = Math.max(720, Math.round(viewportWidth - 44));
            const bodyClientWidth = Number(modal.querySelector('.util-report-builder-viz-body')?.clientWidth) || 0;
            const panelClientWidth = Math.max(
                Number(mainPanelEl?.clientWidth) || 0,
                Number(ratioPanelEl?.clientWidth) || 0,
                Number(mainChartEl?.clientWidth) || 0,
                Number(ratioChartEl?.clientWidth) || 0,
                bodyClientWidth > 0 ? (bodyClientWidth - 8) : 0
            );
            const chartWidth = Math.max(720, Math.floor((panelClientWidth > 0 ? panelClientWidth : fitViewportWidth) - 6));
            const pointSpacing = rowCount <= 24 ? 36 : 30;
            const isolatedSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.isolatedSeriesKey);
            const chartFrameMinHeight = isChartFullscreen
                ? Math.max(780, mainChartHeight + 120)
                : (isolatedSeriesKey
                ? Math.max(560, mainChartHeight + 120)
                : Math.max(720, mainChartHeight + 250));
            const ratioFrameMinHeight = isChartFullscreen
                ? Math.max(appliedModeEnabled ? 760 : 720, ratioChartHeight + (appliedModeEnabled ? 138 : 110))
                : Math.max(appliedModeEnabled ? 700 : 600, ratioChartHeight + (appliedModeEnabled ? 224 : 200));
            const activeView = normalizeUtilReportBuilderVizChartView(UtilReportBuilderVizState.chartViewKey);
            const shouldAutoScrollDetails = UtilReportBuilderVizState.pendingDetailScroll === true;
            if (mainPanelEl) mainPanelEl.style.minWidth = '';
            if (ratioPanelEl) ratioPanelEl.style.minWidth = '';
            if (mainChartEl) mainChartEl.style.minHeight = activeView === 'main' ? `${chartFrameMinHeight}px` : '';
            if (ratioChartEl) ratioChartEl.style.minHeight = activeView === 'ratio' ? `${ratioFrameMinHeight}px` : '';
            const usageDecimals = getUtilReportBuilderVizMetricDecimals('usage');
            const costDecimals = getUtilReportBuilderVizMetricDecimals('cost');
            const productionDecimals = getUtilReportBuilderVizMetricDecimals('production');
            const ratioDecimals = getUtilReportBuilderVizMetricDecimals('ratio');
            const usageChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.usageChartType || 'bar');
            const costChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.costChartType || 'line');
            const productionChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.productionChartType || 'line');
            const ratioChartType = normalizeUtilReportBuilderVizChartType(UtilReportBuilderVizState.ratioChartType || 'line');
            const ratioActualChartType = normalizeUtilReportBuilderVizChartType(
                normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioActualChartType)
                || ratioChartType
            );
            const ratioAppliedChartType = normalizeUtilReportBuilderVizChartType(
                normalizeUtilReportBuilderVizOptionalChartType(UtilReportBuilderVizState.ratioAppliedChartType)
                || ratioChartType
            );
            const focusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.focusSeriesKey);
            const detailFocusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(UtilReportBuilderVizState.detailFocusSeriesKey || isolatedSeriesKey);
            const typeLabelMap = { bar: '막대', line: '선', none: '없음' };
            const activeSeriesKey = isolatedSeriesKey || focusSeriesKey;
            if (mainNoteEl) {
                const focusLabelMap = { usage: '사용량', cost: '비용', production: '생산량' };
                const focusLabel = isolatedSeriesKey
                    ? ` · 단일:${focusLabelMap[isolatedSeriesKey]}`
                    : (focusSeriesKey ? ` · 선택:${focusLabelMap[focusSeriesKey]} 강조` : '');
                const monthFocusLabel = focusMonthKey ? ` · 월:${focusMonthKey}` : '';
                mainNoteEl.textContent = `사용량:${typeLabelMap[usageChartType]} · 비용:${typeLabelMap[costChartType]} · 생산량:${typeLabelMap[productionChartType]}${focusLabel}${monthFocusLabel} · 클릭: 강조 · 더블클릭: 단일`;
            }
            mainChartEl.innerHTML = hasMainData
                ? renderUtilReportBuilderElectricCombinedChart(data.usagePoints, data.costPoints, data.productionPoints, {
                    showLabels: UtilReportBuilderVizState.showLabels === true,
                    decimals: usageDecimals,
                    secondaryDecimals: productionDecimals,
                    decimalsMap: {
                        usage: usageDecimals,
                        cost: costDecimals,
                        production: productionDecimals
                    },
                    forceWidth: chartWidth,
                    minWidth: 0,
                    pointSpacing,
                    height: isolatedSeriesKey ? Math.max(440, mainChartHeight + 12) : Math.max(490, mainChartHeight + 56),
                    topCenterTitle: '사용량 · 비용 · 생산량 통합 차트',
                    usageLabel: formatUtilLabelWithUnit('사용량', data.usageUnitLabel),
                    costLabel: formatUtilLabelWithUnit('비용', data.costUnitLabel),
                    productionLabel: formatUtilLabelWithUnit('생산량', data.productionUnitLabel),
                    axisXLabel: '월',
                    axisYLabel: data.usageUnitLabel ? `${data.usageUnitLabel} (사용량)` : '사용량',
                    secondaryAxisLabel: data.productionUnitLabel || '생산량',
                    perSeriesBounds: true,
                    usageAxisOptions: { tightRange: true, tightPadding: 0.24 },
                    costAxisOptions: { tightRange: true, tightPadding: 0.24 },
                    productionAxisOptions: { tightRange: true, tightPadding: 0.2 },
                    seriesTypeMap: {
                        usage: usageChartType,
                        cost: costChartType,
                        production: productionChartType
                    },
                    focusSeriesKey,
                    isolatedSeriesKey,
                    focusMonthKey
                })
                : '<div class="util-report-builder-viz-empty">사용량, 비용, 생산량 데이터가 없습니다.</div>';
            if (activeView === 'main') syncUtilAnalyticsChartHostHeight(mainChartEl, 40);
            if (mainDetailEl) {
                mainDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                    ? renderUtilReportBuilderVizDetachedPlaceholder(data)
                    : renderUtilReportBuilderVizSeriesDetailTable(data, detailFocusSeriesKey || activeSeriesKey, focusMonthKey);
                if (!UtilReportBuilderVizDetachedTableState.detached && shouldAutoScrollDetails && activeView === 'main') {
                    scrollUtilReportFocusedElementIntoView(mainDetailEl);
                }
            }
            const ratioChartHtml = appliedModeEnabled
                ? (renderUtilReportBuilderVizAppliedComparisonChartNext(data, {
                    actualChartType: ratioActualChartType,
                    appliedChartType: ratioAppliedChartType,
                    showLabels: UtilReportBuilderVizState.showLabels === true,
                    forceWidth: chartWidth,
                    pointSpacing,
                    height: Math.max(410, ratioChartHeight + 56)
                }) || '<div class="util-report-builder-viz-empty">원단위 기준과 적용 대상을 선택하면 적용 분석 그래프가 표시됩니다.</div>')
                : (hasRatioData
                    ? renderUtilTrendChart(data.ratioPoints, data.ratioUnitLabel, {
                        mode: 'modal',
                        chartType: ratioChartType,
                        showTypeSelect: false,
                        showLabelToggle: false,
                        showLabels: UtilReportBuilderVizState.showLabels === true,
                        decimals: ratioDecimals,
                        minWidth: 0,
                        forceWidth: chartWidth,
                        pointSpacing,
                        height: Math.max(380, ratioChartHeight + 34),
                        topCenterTitle: formatUtilLabelWithUnit(ratioTitle, data.ratioUnitLabel),
                        axisXLabel: '월',
                        axisYLabel: data.ratioAxisLabel
                            || getUtilReportBuilderVizRatioAxisLabel(
                                data?.itemKey,
                                data?.ratioUnitLabel,
                                data?.ratioNumeratorMetric,
                                data?.ratioDenominatorMetric,
                                data?.ratioUseDenominator
                            ),
                        axisXIcon: '',
                        axisYIcon: '값',
                        seriesKey: 'ratio',
                        focusMonthKey
                    })
                    : `<div class="util-report-builder-viz-empty">${escapeHtml(ratioTitle)}을(를) 계산할 수 있는 데이터가 없습니다.</div>`);
            ratioChartEl.innerHTML = ratioChartHtml;
            if (activeView === 'ratio') syncUtilAnalyticsChartHostHeight(ratioChartEl, appliedModeEnabled ? 42 : 36);
            if (ratioDetailEl) {
                ratioDetailEl.innerHTML = UtilReportBuilderVizDetachedTableState.detached
                    ? renderUtilReportBuilderVizDetachedPlaceholder(data)
                    : (appliedModeEnabled
                        ? (renderUtilReportBuilderVizAppliedComparisonDetailNext(data, focusMonthKey)
                            || '<div class="util-report-builder-viz-detail-empty">원단위 기준과 적용 대상을 선택하면 적용 분석 상세표가 표시됩니다.</div>')
                        : renderUtilReportBuilderVizRatioDetailTable(data, focusMonthKey));
                if (!UtilReportBuilderVizDetachedTableState.detached && shouldAutoScrollDetails && activeView === 'ratio') {
                    scrollUtilReportFocusedElementIntoView(ratioDetailEl);
                }
            }
            syncUtilReportBuilderVizDetachedTableWindow(data);
            UtilReportBuilderVizState.pendingDetailScroll = false;
        }

        function renderUtilReportBuilderVizModal() {
            renderUtilReportBuilderVizHost(document.getElementById('util-report-builder-viz-modal'));
        }
