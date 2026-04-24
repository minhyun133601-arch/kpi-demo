        function renderUtilReportTableHeadCell(label, subLabel) {
            const mainLabel = String(label || '').trim();
            const secondaryLabel = String(subLabel || '').trim();
            return `
                <div class="util-head-cell">
                    <span class="util-head-label">${escapeHtml(mainLabel || '-')}</span>
                    ${secondaryLabel ? `<span class="util-head-sub">${escapeHtml(secondaryLabel)}</span>` : ''}
                </div>
            `;
        }

        function renderUtilReportTableSummaryLabel(title, subLabel) {
            const mainLabel = String(title || '').trim();
            const secondaryLabel = String(subLabel || '').trim();
            return `
                <div class="util-report-yoy-summary">
                    <span class="util-report-yoy-summary-title">${escapeHtml(mainLabel || '-')}</span>
                    ${secondaryLabel ? `<span class="util-report-yoy-summary-sub">${escapeHtml(secondaryLabel)}</span>` : ''}
                </div>
            `;
        }

        function renderUtilReportAllYearsTableLegacy(result, metricKey) {
            if (!result || !Array.isArray(result.rows) || !result.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">표시할 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const headerUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const metricHeaderLabel = formatUtilLabelWithUnit(metricLabel, headerUnitLabel);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '없음') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;

            const rows = result.rows
                .map(row => {
                    const monthKey = normalizeUtilReportMonthKey(row?.monthKey || toUtilMonthKey(row?.year, row?.month));
                    const rawValue = Number(getUtilReportMetricValue(row, metricKey));
                    return {
                        monthKey,
                        rawValue: Number.isFinite(rawValue) ? rawValue : null
                    };
                })
                .filter(item => item.monthKey)
                .sort((a, b) => compareUtilReportMonthKeys(a.monthKey, b.monthKey));
            if (!rows.length) {
                return '<div class="p-4 text-sm text-slate-300">표시할 데이터가 없습니다.</div>';
            }
            const bodyHtml = rows.map(item => {
                const monthToken = formatUtilReportMonthOnly(item.monthKey);
                return `
                    <tr data-month-token="${escapeHtml(monthToken)}" data-month-key="${escapeHtml(item.monthKey)}">
                        <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthLong(item.monthKey))}</span></td>
                        <td class="is-primary"><span class="util-report-yoy-value">${valueFormatter(item.rawValue)}</span></td>
                    </tr>
                `;
            }).join('');
            const sum = rows.reduce((acc, item) => acc + (Number.isFinite(item.rawValue) ? item.rawValue : 0), 0);
            const hasValue = rows.some(item => Number.isFinite(item.rawValue));

            return `
                <table class="util-report-yoy-table is-timeline is-structured" data-role="util-report-modal-yoy-table">
                    <thead>
                        <tr>
                            <th>연월</th>
                            <th>${renderUtilReportTableHeadCell('연월', '월별 기준')}</th>
                            <th class="is-primary">${renderUtilReportTableHeadCell(metricHeaderLabel, '월별 집계')}</th>
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                    <tfoot>
                        <tr>
                            <td>합계</td>
                            <td>${hasValue ? valueFormatter(sum) : '없음'}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        function renderUtilReportYoYTableLegacy(result, metricKey, compareYear) {
            const compareYearToken = String(compareYear || '').trim();
            if (!compareYearToken) {
                return renderUtilReportAllYearsTable(result, metricKey);
            }
            const yoy = buildUtilReportYoYRows(result, metricKey, compareYear);
            if (!Array.isArray(yoy.rows) || !yoy.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">전년도 비교 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const signedFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportSignedValueByType(value, valueType, decimals, metric.key)
                : emptyText;

            const currentHeader = yoy.pair ? `${yoy.pair.currentYear}` : '올해';
            const prevHeader = yoy.pair ? `${yoy.pair.prevYear}` : '전년도';
            const yearUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const currentHeaderLabel = formatUtilLabelWithUnit(currentHeader, yearUnitLabel);
            const prevHeaderLabel = formatUtilLabelWithUnit(prevHeader, yearUnitLabel);

            const rowsHtml = yoy.rows.map(item => {
                const hasPrev = Number.isFinite(item.prev);
                const deltaClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateText = hasPrev && Number.isFinite(item.rate)
                    ? `${item.rate > 0 ? '+' : ''}${formatUtilNumber(item.rate, 1)}%`
                    : '없음';
                const monthToken = formatUtilReportMonthOnly(item.monthKey);
                return `
                    <tr data-month-token="${escapeHtml(monthToken)}" data-month-key="${escapeHtml(String(item.monthKey || ''))}">
                        <td>${escapeHtml(monthToken)}</td>
                        <td>${valueFormatter(item.current)}</td>
                        <td>${valueFormatter(item.prev, '없음')}</td>
                        <td class="util-report-delta ${deltaClass}">${hasPrev ? signedFormatter(item.delta, '없음') : '없음'}</td>
                        <td class="util-report-delta ${rateClass}">${rateText}</td>
                    </tr>
                `;
            }).join('');

            const summary = yoy.summary;
            const summaryHasPrev = Number.isFinite(summary?.prev) && Number(summary?.missingPrevCount || 0) === 0;
            const summaryDeltaClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateText = summaryHasPrev && Number.isFinite(summary?.rate)
                ? `${summary.rate > 0 ? '+' : ''}${formatUtilNumber(summary.rate, 1)}%`
                : '없음';

            return `
                <table class="util-report-yoy-table" data-role="util-report-modal-yoy-table">
                    <thead>
                        <tr>
                            <th>월</th>
                            <th>${escapeHtml(currentHeaderLabel)}</th>
                            <th>${escapeHtml(prevHeaderLabel)}</th>
                            <th>증감</th>
                            <th>증감률</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr>
                            <td>합계 (${escapeHtml(metricLabel)})</td>
                            <td>${valueFormatter(summary?.current)}</td>
                            <td>${valueFormatter(summary?.prev, '없음')}</td>
                            <td class="util-report-delta ${summaryDeltaClass}">${summaryHasPrev ? signedFormatter(summary?.delta, '없음') : '없음'}</td>
                            <td class="util-report-delta ${summaryRateClass}">${summaryRateText}</td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        function renderUtilReportAllYearsTable(result, metricKey) {
            if (!result || !Array.isArray(result.rows) || !result.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">표시할 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const headerUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const metricHeaderLabel = formatUtilLabelWithUnit(metricLabel, headerUnitLabel);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '없음') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;

            const rows = result.rows
                .map(row => {
                    const monthKey = normalizeUtilReportMonthKey(row?.monthKey || toUtilMonthKey(row?.year, row?.month));
                    const rawValue = Number(getUtilReportMetricValue(row, metricKey));
                    return {
                        monthKey,
                        rawValue: Number.isFinite(rawValue) ? rawValue : null
                    };
                })
                .filter(item => item.monthKey)
                .sort((a, b) => compareUtilReportMonthKeys(a.monthKey, b.monthKey));
            if (!rows.length) {
                return '<div class="p-4 text-sm text-slate-300">표시할 데이터가 없습니다.</div>';
            }

            const bodyHtml = rows.map(item => `
                <tr data-month-token="${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}" data-month-key="${escapeHtml(item.monthKey)}">
                    <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthLong(item.monthKey))}</span></td>
                    <td class="is-primary"><span class="util-report-yoy-value">${valueFormatter(item.rawValue)}</span></td>
                </tr>
            `).join('');
            const sum = rows.reduce((acc, item) => acc + (Number.isFinite(item.rawValue) ? item.rawValue : 0), 0);
            const hasValue = rows.some(item => Number.isFinite(item.rawValue));

            return `
                <table class="util-report-yoy-table is-timeline is-structured" data-role="util-report-modal-yoy-table">
                    <thead>
                        <tr>
                            <th>${renderUtilReportTableHeadCell('연월', '월별 기준')}</th>
                            <th class="is-primary">${renderUtilReportTableHeadCell(metricHeaderLabel, '월별 집계')}</th>
                        </tr>
                    </thead>
                    <tbody>${bodyHtml}</tbody>
                    <tfoot>
                        <tr class="util-report-yoy-total">
                            <td>${renderUtilReportTableSummaryLabel('합계', '전체 기간')}</td>
                            <td class="is-primary"><span class="util-report-yoy-value">${hasValue ? valueFormatter(sum) : '없음'}</span></td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        function buildUtilReportYoYPeakInfo(yoy) {
            if (!Array.isArray(yoy?.rows) || !yoy.rows.length) return null;
            return yoy.rows.reduce((best, item) => {
                if (!item || !item.monthKey || !Number.isFinite(item.prev) || !Number.isFinite(item.delta)) {
                    return best;
                }
                const magnitude = Math.abs(item.delta);
                if (!best || magnitude > best.magnitude) {
                    return {
                        monthKey: String(item.monthKey || ''),
                        delta: item.delta,
                        rate: Number.isFinite(item.rate) ? item.rate : NaN,
                        magnitude
                    };
                }
                return best;
            }, null);
        }

        function renderUtilReportYoYPeakMeta(peakInfo, options = {}) {
            if (!peakInfo?.monthKey || !Number.isFinite(peakInfo.delta)) return '';
            const deltaClass = getUtilDeltaClass(peakInfo.delta);
            const deltaToneClass = deltaClass === 'is-up'
                ? 'util-report-builder-viz-detail-delta-up'
                : (deltaClass === 'is-down' ? 'util-report-builder-viz-detail-delta-down' : '');
            const rateText = Number.isFinite(peakInfo.rate)
                ? `${peakInfo.rate > 0 ? '+' : ''}${formatUtilNumber(peakInfo.rate, 1)}%`
                : '';
            const metaParts = [rateText, String(options.meta || '').trim()].filter(Boolean);
            return `
                <div class="util-report-builder-viz-compare-meta is-compact">
                    <div class="util-report-builder-viz-compare-chip is-peak ${escapeHtml(deltaToneClass)}">
                        <div class="label">가장 큰 차이 월</div>
                        <div class="value">${escapeHtml(`${formatUtilReportMonthLong(peakInfo.monthKey)} ${options.signedFormatter(peakInfo.delta, '-')}`)}</div>
                        ${metaParts.length ? `<div class="meta">${escapeHtml(metaParts.join(' · '))}</div>` : ''}
                    </div>
                </div>
            `;
        }

        function renderUtilReportYoYTable(result, metricKey, compareYear) {
            const compareYearToken = String(compareYear || '').trim();
            if (!compareYearToken) {
                return renderUtilReportAllYearsTable(result, metricKey);
            }
            const yoy = buildUtilReportYoYRows(result, metricKey, compareYear);
            if (!Array.isArray(yoy.rows) || !yoy.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">전년 비교 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const signedFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportSignedValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const currentHeader = yoy.pair ? `${yoy.pair.currentYear}` : '올해';
            const prevHeader = yoy.pair ? `${yoy.pair.prevYear}` : '전년';
            const yearUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const valueHeadSub = formatUtilLabelWithUnit(metricLabel, yearUnitLabel);

            const rowsHtml = yoy.rows.map(item => {
                const hasPrev = Number.isFinite(item.prev);
                const deltaClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateText = hasPrev && Number.isFinite(item.rate)
                    ? `${item.rate > 0 ? '+' : ''}${formatUtilNumber(item.rate, 1)}%`
                    : '없음';
                return `
                    <tr data-month-token="${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}" data-month-key="${escapeHtml(String(item.monthKey || ''))}">
                        <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}</span></td>
                        <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(item.current)}</span></td>
                        <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(item.prev, '없음')}</span></td>
                        <td class="is-delta-cell"><span class="util-report-yoy-pill ${deltaClass}">${hasPrev ? signedFormatter(item.delta, '없음') : '없음'}</span></td>
                        <td class="is-rate-cell"><span class="util-report-yoy-pill is-rate ${rateClass}">${rateText}</span></td>
                    </tr>
                `;
            }).join('');

            const summary = yoy.summary;
            const summaryHasPrev = Number.isFinite(summary?.prev) && Number(summary?.missingPrevCount || 0) === 0;
            const summaryDeltaClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateText = summaryHasPrev && Number.isFinite(summary?.rate)
                ? `${summary.rate > 0 ? '+' : ''}${formatUtilNumber(summary.rate, 1)}%`
                : '없음';

            return `
                <table class="util-report-yoy-table is-structured" data-role="util-report-modal-yoy-table">
                    <thead>
                        <tr>
                            <th>${renderUtilReportTableHeadCell('월', '동일 월 기준')}</th>
                            <th class="is-current">${renderUtilReportTableHeadCell(currentHeader, valueHeadSub)}</th>
                            <th class="is-prev">${renderUtilReportTableHeadCell(prevHeader, valueHeadSub)}</th>
                            <th class="is-delta">${renderUtilReportTableHeadCell('증감', `${currentHeader} - ${prevHeader}`)}</th>
                            <th class="is-rate">${renderUtilReportTableHeadCell('증감률', '변화 비율')}</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr class="util-report-yoy-total">
                            <td>${renderUtilReportTableSummaryLabel('합계', metricLabel)}</td>
                            <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(summary?.current)}</span></td>
                            <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(summary?.prev, '없음')}</span></td>
                            <td class="is-delta-cell"><span class="util-report-yoy-pill ${summaryDeltaClass}">${summaryHasPrev ? signedFormatter(summary?.delta, '없음') : '없음'}</span></td>
                            <td class="is-rate-cell"><span class="util-report-yoy-pill is-rate ${summaryRateClass}">${summaryRateText}</span></td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        function renderUtilReportYoYTable(result, metricKey, compareYear) {
            const compareYearToken = String(compareYear || '').trim();
            if (!compareYearToken) {
                return renderUtilReportAllYearsTable(result, metricKey);
            }
            const yoy = buildUtilReportYoYRows(result, metricKey, compareYear);
            if (!Array.isArray(yoy.rows) || !yoy.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">전년 비교 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const signedFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportSignedValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const currentHeader = yoy.pair ? `${yoy.pair.currentYear}` : '올해';
            const prevHeader = yoy.pair ? `${yoy.pair.prevYear}` : '전년';
            const yearUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const valueHeadSub = formatUtilLabelWithUnit(metricLabel, yearUnitLabel);

            const rowsHtml = yoy.rows.map(item => {
                const hasPrev = Number.isFinite(item.prev);
                const deltaClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateText = hasPrev && Number.isFinite(item.rate)
                    ? `${item.rate > 0 ? '+' : ''}${formatUtilNumber(item.rate, 1)}%`
                    : '';
                return `
                    <tr data-month-token="${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}" data-month-key="${escapeHtml(String(item.monthKey || ''))}">
                        <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}</span></td>
                        <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(item.current)}</span></td>
                        <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(item.prev, '없음')}</span></td>
                        <td class="is-delta-cell">
                            <div class="util-report-yoy-delta-stack ${deltaClass}">
                                <div class="util-report-yoy-delta-value">${hasPrev ? escapeHtml(signedFormatter(item.delta, '없음')) : '없음'}</div>
                                ${rateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(rateText)}</div>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            const summary = yoy.summary;
            const summaryHasPrev = Number.isFinite(summary?.prev) && Number(summary?.missingPrevCount || 0) === 0;
            const summaryDeltaClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateText = summaryHasPrev && Number.isFinite(summary?.rate)
                ? `${summary.rate > 0 ? '+' : ''}${formatUtilNumber(summary.rate, 1)}%`
                : '';

            return `
                <table class="util-report-yoy-table is-structured" data-role="util-report-modal-yoy-table">
                    <thead>
                        <tr>
                            <th>${renderUtilReportTableHeadCell('월', '동일 월 기준')}</th>
                            <th class="is-current">${renderUtilReportTableHeadCell(currentHeader, valueHeadSub)}</th>
                            <th class="is-prev">${renderUtilReportTableHeadCell(prevHeader, valueHeadSub)}</th>
                            <th class="is-delta">${renderUtilReportTableHeadCell('증감', `${currentHeader} - ${prevHeader}`)}</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                    <tfoot>
                        <tr class="util-report-yoy-total">
                            <td>${renderUtilReportTableSummaryLabel('합계', metricLabel)}</td>
                            <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(summary?.current)}</span></td>
                            <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(summary?.prev, '없음')}</span></td>
                            <td class="is-delta-cell">
                                <div class="util-report-yoy-delta-stack ${summaryDeltaClass}">
                                    <div class="util-report-yoy-delta-value">${summaryHasPrev ? escapeHtml(signedFormatter(summary?.delta, '없음')) : '없음'}</div>
                                    ${summaryRateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(summaryRateText)}</div>` : ''}
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
            `;
        }

        function renderUtilReportYoYTable(result, metricKey, compareYear) {
            const compareYearToken = String(compareYear || '').trim();
            if (!compareYearToken) {
                return renderUtilReportAllYearsTable(result, metricKey);
            }
            const yoy = buildUtilReportYoYRows(result, metricKey, compareYear);
            if (!Array.isArray(yoy.rows) || !yoy.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">전년 비교 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const signedFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportSignedValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const currentHeader = yoy.pair ? `${yoy.pair.currentYear}` : '올해';
            const prevHeader = yoy.pair ? `${yoy.pair.prevYear}` : '전년';
            const yearUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const valueHeadSub = formatUtilLabelWithUnit(metricLabel, yearUnitLabel);

            const rowsHtml = yoy.rows.map(item => {
                const hasPrev = Number.isFinite(item.prev);
                const deltaClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateText = hasPrev && Number.isFinite(item.rate)
                    ? `${item.rate > 0 ? '+' : ''}${formatUtilNumber(item.rate, 1)}%`
                    : '';
                return `
                    <tr data-month-token="${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}" data-month-key="${escapeHtml(String(item.monthKey || ''))}">
                        <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}</span></td>
                        <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(item.current)}</span></td>
                        <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(item.prev, '없음')}</span></td>
                        <td class="is-delta-cell">
                            <div class="util-report-yoy-delta-stack ${deltaClass}">
                                <div class="util-report-yoy-delta-value">${hasPrev ? escapeHtml(signedFormatter(item.delta, '없음')) : '없음'}</div>
                                ${rateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(rateText)}</div>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            const summary = yoy.summary;
            const summaryHasPrev = Number.isFinite(summary?.prev) && Number(summary?.missingPrevCount || 0) === 0;
            const summaryDeltaClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateText = summaryHasPrev && Number.isFinite(summary?.rate)
                ? `${summary.rate > 0 ? '+' : ''}${formatUtilNumber(summary.rate, 1)}%`
                : '';
            const peakInfo = buildUtilReportYoYPeakInfo(yoy);
            const peakMetaHtml = renderUtilReportYoYPeakMeta(peakInfo, {
                signedFormatter,
                meta: `${currentHeader} - ${prevHeader}`
            });

            return `
                <div class="util-report-yoy-compare-block">
                    ${peakMetaHtml}
                    <table class="util-report-yoy-table is-structured" data-role="util-report-modal-yoy-table">
                        <thead>
                            <tr>
                                <th>${renderUtilReportTableHeadCell('월', '동일 월 기준')}</th>
                                <th class="is-current">${renderUtilReportTableHeadCell(currentHeader, valueHeadSub)}</th>
                                <th class="is-prev">${renderUtilReportTableHeadCell(prevHeader, valueHeadSub)}</th>
                                <th class="is-delta">${renderUtilReportTableHeadCell('증감', `${currentHeader} - ${prevHeader}`)}</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr class="util-report-yoy-total">
                                <td>${renderUtilReportTableSummaryLabel('합계', metricLabel)}</td>
                                <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(summary?.current)}</span></td>
                                <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(summary?.prev, '없음')}</span></td>
                                <td class="is-delta-cell">
                                    <div class="util-report-yoy-delta-stack ${summaryDeltaClass}">
                                        <div class="util-report-yoy-delta-value">${summaryHasPrev ? escapeHtml(signedFormatter(summary?.delta, '없음')) : '없음'}</div>
                                        ${summaryRateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(summaryRateText)}</div>` : ''}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }

        function renderUtilReportYoYSummaryMeta(yoy, options = {}) {
            const rows = Array.isArray(yoy?.rows) ? yoy.rows : [];
            const comparableRows = rows.filter(item => Number.isFinite(item?.current) && Number.isFinite(item?.prev));
            const comparableCount = comparableRows.length;
            const averageCurrent = comparableCount
                ? comparableRows.reduce((sum, item) => sum + Number(item.current), 0) / comparableCount
                : NaN;
            const averagePrev = comparableCount
                ? comparableRows.reduce((sum, item) => sum + Number(item.prev), 0) / comparableCount
                : NaN;
            const averageDelta = Number.isFinite(averageCurrent) && Number.isFinite(averagePrev)
                ? averageCurrent - averagePrev
                : NaN;
            const averageRate = Number.isFinite(averagePrev) && averagePrev !== 0
                ? (averageDelta / averagePrev) * 100
                : NaN;
            const totalDelta = Number(yoy?.summary?.delta);
            const totalRate = Number(yoy?.summary?.rate);
            const peakInfo = buildUtilReportYoYPeakInfo(yoy);

            const toToneClass = (deltaValue) => {
                const deltaClass = getUtilDeltaClass(deltaValue);
                if (deltaClass === 'is-up') return 'util-report-builder-viz-detail-delta-up';
                if (deltaClass === 'is-down') return 'util-report-builder-viz-detail-delta-down';
                return '';
            };
            const formatRateText = (rateValue) => Number.isFinite(rateValue)
                ? `${rateValue > 0 ? '+' : ''}${formatUtilNumber(rateValue, 1)}%`
                : '';

            const chips = [
                {
                    tone: `delta ${toToneClass(averageDelta)}`.trim(),
                    label: '평균 차이',
                    value: Number.isFinite(averageDelta) ? options.signedFormatter(averageDelta, '-') : '-',
                    meta: [formatRateText(averageRate), comparableCount ? `동일 월 ${comparableCount}개월 평균` : ''].filter(Boolean).join(' / ')
                },
                {
                    tone: `delta ${toToneClass(totalDelta)}`.trim(),
                    label: '총 차이',
                    value: Number.isFinite(totalDelta) ? options.signedFormatter(totalDelta, '-') : '-',
                    meta: [formatRateText(totalRate), String(options.meta || '').trim()].filter(Boolean).join(' / ')
                },
                {
                    tone: `peak ${toToneClass(peakInfo?.delta)}`.trim(),
                    label: '가장 큰 차이 월',
                    value: peakInfo?.monthKey && Number.isFinite(peakInfo.delta)
                        ? `${formatUtilReportMonthLong(peakInfo.monthKey)} ${options.signedFormatter(peakInfo.delta, '-')}`
                        : '-',
                    meta: [formatRateText(peakInfo?.rate), String(options.meta || '').trim()].filter(Boolean).join(' / ')
                }
            ];

            return `
                <div class="util-report-builder-viz-compare-meta">
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

        function renderUtilReportYoYTable(result, metricKey, compareYear) {
            const compareYearToken = String(compareYear || '').trim();
            if (!compareYearToken) {
                return renderUtilReportAllYearsTable(result, metricKey);
            }
            const yoy = buildUtilReportYoYRows(result, metricKey, compareYear);
            if (!Array.isArray(yoy.rows) || !yoy.rows.length) {
                return '<div class="p-4 text-sm text-slate-300">전년 비교 데이터가 없습니다.</div>';
            }
            const metricLabel = getUtilReportMetricLabel(metricKey, UtilReportState.unitKey);
            const metric = getUtilReportMetricOption(metricKey);
            const valueType = metric.type === 'production'
                ? 'production'
                : (metric.type === 'usage' ? 'usage' : 'cost');
            const unitLabel = getUtilReportValueUnitLabelByType(valueType, metric.key);
            const decimals = UtilReportState.decimals;
            const valueFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const signedFormatter = (value, emptyText = '-') => Number.isFinite(value)
                ? formatUtilReportSignedValueByType(value, valueType, decimals, metric.key)
                : emptyText;
            const currentHeader = yoy.pair ? `${yoy.pair.currentYear}` : '올해';
            const prevHeader = yoy.pair ? `${yoy.pair.prevYear}` : '전년';
            const yearUnitLabel = metric.type === 'unit' ? `${unitLabel}/kg` : unitLabel;
            const valueHeadSub = formatUtilLabelWithUnit(metricLabel, yearUnitLabel);

            const rowsHtml = yoy.rows.map(item => {
                const hasPrev = Number.isFinite(item.prev);
                const deltaClass = hasPrev ? getUtilDeltaClass(item.delta) : 'is-flat';
                const rateText = hasPrev && Number.isFinite(item.rate)
                    ? `${item.rate > 0 ? '+' : ''}${formatUtilNumber(item.rate, 1)}%`
                    : '';
                return `
                    <tr data-month-token="${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}" data-month-key="${escapeHtml(String(item.monthKey || ''))}">
                        <td><span class="util-report-yoy-row-label">${escapeHtml(formatUtilReportMonthOnly(item.monthKey))}</span></td>
                        <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(item.current)}</span></td>
                        <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(item.prev, '없음')}</span></td>
                        <td class="is-delta-cell">
                            <div class="util-report-yoy-delta-stack ${deltaClass}">
                                <div class="util-report-yoy-delta-value">${hasPrev ? escapeHtml(signedFormatter(item.delta, '없음')) : '없음'}</div>
                                ${rateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(rateText)}</div>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            const summary = yoy.summary;
            const summaryHasPrev = Number.isFinite(summary?.prev) && Number(summary?.missingPrevCount || 0) === 0;
            const summaryDeltaClass = summaryHasPrev ? getUtilDeltaClass(summary?.delta) : 'is-flat';
            const summaryRateText = summaryHasPrev && Number.isFinite(summary?.rate)
                ? `${summary.rate > 0 ? '+' : ''}${formatUtilNumber(summary.rate, 1)}%`
                : '';
            const summaryMetaHtml = renderUtilReportYoYSummaryMeta(yoy, {
                signedFormatter,
                meta: `${currentHeader} - ${prevHeader}`
            });

            return `
                <div class="util-report-yoy-compare-block">
                    ${summaryMetaHtml}
                    <table class="util-report-yoy-table is-structured" data-role="util-report-modal-yoy-table">
                        <thead>
                            <tr>
                                <th>${renderUtilReportTableHeadCell('월', '동일 월 기준')}</th>
                                <th class="is-current">${renderUtilReportTableHeadCell(currentHeader, valueHeadSub)}</th>
                                <th class="is-prev">${renderUtilReportTableHeadCell(prevHeader, valueHeadSub)}</th>
                                <th class="is-delta">${renderUtilReportTableHeadCell('증감', `${currentHeader} - ${prevHeader}`)}</th>
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                        <tfoot>
                            <tr class="util-report-yoy-total">
                                <td>${renderUtilReportTableSummaryLabel('합계', metricLabel)}</td>
                                <td class="is-current"><span class="util-report-yoy-value">${valueFormatter(summary?.current)}</span></td>
                                <td class="is-prev"><span class="util-report-yoy-value">${valueFormatter(summary?.prev, '없음')}</span></td>
                                <td class="is-delta-cell">
                                    <div class="util-report-yoy-delta-stack ${summaryDeltaClass}">
                                        <div class="util-report-yoy-delta-value">${summaryHasPrev ? escapeHtml(signedFormatter(summary?.delta, '없음')) : '없음'}</div>
                                        ${summaryRateText ? `<div class="util-report-yoy-delta-rate">${escapeHtml(summaryRateText)}</div>` : ''}
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            `;
        }

        function renderUtilReportYoYLauncher(result) {
            const compareOptions = getUtilReportCompareYearOptions(result || UtilReportState.lastResult || {});
            const selectedCompare = compareOptions.find(item => item.value === UtilReportState.compareYear);
            const compareLabel = selectedCompare ? selectedCompare.label : '기준년도 미선택';
            const metricLabel = getUtilReportMetricLabel(resolveUtilReportChartMetricKey(), UtilReportState.unitKey);
            return `
                <div class="util-report-yoy-launcher">
                    <div>
                        <div class="util-report-yoy-launcher-title">전년도 비교표</div>
                        <div class="util-report-yoy-launcher-sub">지표: ${escapeHtml(metricLabel)} / 기준: ${escapeHtml(compareLabel)}</div>
                    </div>
                    <button type="button" class="util-report-yoy-open" data-role="util-report-yoy-open">표 팝업 열기</button>
                </div>
            `;
        }
        function getUtilReportLatestDelta(result, metricKey, targetYear = '') {
            const sourceRows = Array.isArray(result?.rows) ? result.rows : [];
            const rows = targetYear
                ? sourceRows.filter(row => String(row?.year) === String(targetYear)).sort((a, b) => Number(a.month) - Number(b.month))
                : sourceRows;
            if (rows.length < 2) return null;
            const current = Number(getUtilReportMetricValue(rows[rows.length - 1], metricKey));
            const prev = Number(getUtilReportMetricValue(rows[rows.length - 2], metricKey));
            if (!Number.isFinite(current) || !Number.isFinite(prev)) return null;
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: String(rows[rows.length - 1]?.monthKey || '') };
        }

        function bindUtilReportProductionInputs(tableEl) {
            if (!tableEl) return;
            tableEl.querySelectorAll('[data-role="util-report-production-override"]').forEach(input => {
                const apply = () => {
                    const monthKey = input.dataset.month;
                    const ok = setUtilReportProductionOverride(monthKey, input.value);
                    if (!ok) {
                        alert('생산량은 0 이상의 숫자만 입력해 주세요.');
                        const previous = UtilReportOverrideState.productionByMonth[monthKey];
                        input.value = previous ?? '';
                        input.focus();
                        return;
                    }
                    runUtilReportFromState({ renderModal: true });
                };
                input.addEventListener('change', apply);
                input.addEventListener('blur', apply);
                input.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        apply();
                    }
                });
            });
        }

        function bindUtilReportChartDragScroll(scrollEl) {
            if (!scrollEl || scrollEl.dataset.dragBound === 'true') return;
            scrollEl.dataset.dragBound = 'true';

            let activePointerId = null;
            let startX = 0;
            let startScrollLeft = 0;

            const endDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                scrollEl.classList.remove('is-dragging');
            };

            const isInteractiveTarget = (target) => !!target?.closest?.('input, select, textarea, button, label, a, [data-role="util-chart-month-hit"]');

            scrollEl.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                activePointerId = event.pointerId;
                startX = event.clientX;
                startScrollLeft = scrollEl.scrollLeft;
                scrollEl.classList.add('is-dragging');
                if (typeof scrollEl.setPointerCapture === 'function') {
                    try { scrollEl.setPointerCapture(activePointerId); } catch (err) {}
                }
            });

            scrollEl.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.clientX - startX;
                scrollEl.scrollLeft = startScrollLeft - diffX;
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
            scrollEl.addEventListener('dragstart', event => event.preventDefault());
        }

        function syncUtilReportChartScrollState(modal) {
            if (!modal) return;
            const hostWrap = modal.querySelector('[data-role="util-report-modal-chart-wrap"]')
                || modal.querySelector('.util-report-chart-host-wrap');
            const chartHost = modal.querySelector('[data-role="util-report-modal-chart"]');
            if (!hostWrap || !chartHost) return;

            bindUtilReportChartDragScroll(hostWrap);

            const allowScroll = hostWrap.dataset.allowScroll !== 'false';
            if (!allowScroll) {
                chartHost.style.width = '100%';
                chartHost.style.minWidth = '100%';
                hostWrap.scrollLeft = 0;
                hostWrap.classList.remove('is-scrollable');
                hostWrap.classList.remove('is-dragging');
                hostWrap.style.overflowX = 'hidden';
                return;
            }

            const chartSvg = chartHost.querySelector('svg');
            let chartWidth = 0;
            if (chartSvg) {
                const viewBox = String(chartSvg.getAttribute('viewBox') || '').trim().split(/\s+/).map(Number);
                if (viewBox.length === 4 && Number.isFinite(viewBox[2])) {
                    chartWidth = viewBox[2];
                }
                if (!Number.isFinite(chartWidth) || chartWidth <= 0) {
                    const widthAttr = Number(chartSvg.getAttribute('width'));
                    if (Number.isFinite(widthAttr) && widthAttr > 0) chartWidth = widthAttr;
                }
            }

            const wrapWidth = hostWrap.clientWidth || 0;
            const useHorizontalScroll = Number.isFinite(chartWidth) && chartWidth > (wrapWidth + 1);
            if (useHorizontalScroll) {
                const nextWidth = Math.ceil(chartWidth);
                chartHost.style.width = `${nextWidth}px`;
                chartHost.style.minWidth = `${nextWidth}px`;
                hostWrap.style.overflowX = 'auto';
            } else {
                chartHost.style.width = '100%';
                chartHost.style.minWidth = '100%';
                hostWrap.scrollLeft = 0;
                hostWrap.style.overflowX = 'hidden';
            }
            hostWrap.classList.toggle('is-scrollable', !!useHorizontalScroll);
        }

        function bindUtilReportModalBodyDrag(modal) {
            if (!modal || modal.dataset.bodyDragBound === 'true') return;
            const bodyEl = modal.querySelector('.util-report-modal-body');
            if (!bodyEl) return;
            modal.dataset.bodyDragBound = 'true';

            let activePointerId = null;
            let startX = 0;
            let startY = 0;
            let startScrollTop = 0;
            let moved = false;

            const endDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                bodyEl.classList.remove('is-dragging');
            };

            const isInteractiveTarget = (target) => !!target?.closest?.('input, select, textarea, button, label, a, summary, details, [contenteditable], [data-role="util-report-inline-body"]');

            bodyEl.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (!modal.classList.contains('is-chart-fullscreen')) return;
                if (modal.classList.contains('is-inline-table-detached')) return;
                if (isInteractiveTarget(event.target)) return;
                if (bodyEl.scrollHeight <= (bodyEl.clientHeight + 1)) return;
                activePointerId = event.pointerId;
                startX = event.clientX;
                startY = event.clientY;
                startScrollTop = bodyEl.scrollTop;
                moved = false;
                bodyEl.classList.add('is-dragging');
                if (typeof bodyEl.setPointerCapture === 'function') {
                    try { bodyEl.setPointerCapture(activePointerId); } catch (err) {}
                }
            });

            bodyEl.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.clientX - startX;
                const diffY = event.clientY - startY;
                if (Math.abs(diffX) > 2 || Math.abs(diffY) > 2) moved = true;
                bodyEl.scrollTop = startScrollTop - diffY;
                if (moved) event.preventDefault();
            });

            bodyEl.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            bodyEl.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            bodyEl.addEventListener('lostpointercapture', endDrag);
            bodyEl.addEventListener('dragstart', event => event.preventDefault());
        }

        function bindUtilReportDonutRowDrag(modal) {
            if (!modal || modal.dataset.donutRowDragBound === 'true') return;
            const donutRow = modal.querySelector('.util-report-donut-row');
            const bodyEl = modal.querySelector('.util-report-modal-body');
            if (!donutRow) return;
            modal.dataset.donutRowDragBound = 'true';

            let activePointerId = null;
            let startX = 0;
            let startY = 0;
            let startScrollTop = 0;
            let moved = false;
            let scrollTarget = donutRow;

            const endDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                donutRow.classList.remove('is-dragging');
            };

            const isInteractiveTarget = (target) => !!target?.closest?.('button, input, select, textarea, label, a, summary, details, [contenteditable]');

            donutRow.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                const useBodyScroll = !donutRow
                    || donutRow.scrollHeight <= (donutRow.clientHeight + 1)
                    || getComputedStyle(donutRow).overflowY === 'visible';
                scrollTarget = useBodyScroll && bodyEl ? bodyEl : donutRow;
                if (!scrollTarget || scrollTarget.scrollHeight <= (scrollTarget.clientHeight + 1)) return;
                activePointerId = event.pointerId;
                startX = event.clientX;
                startY = event.clientY;
                startScrollTop = scrollTarget.scrollTop;
                moved = false;
                donutRow.classList.add('is-dragging');
                if (typeof donutRow.setPointerCapture === 'function') {
                    try { donutRow.setPointerCapture(activePointerId); } catch (err) {}
                }
            });

            donutRow.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.clientX - startX;
                const diffY = event.clientY - startY;
                if (Math.abs(diffX) > 2 || Math.abs(diffY) > 2) moved = true;
                if (scrollTarget) {
                    scrollTarget.scrollTop = startScrollTop - diffY;
                }
                if (moved) event.preventDefault();
            });

            donutRow.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            donutRow.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            donutRow.addEventListener('lostpointercapture', endDrag);
            donutRow.addEventListener('dragstart', event => event.preventDefault());
        }

        function bindUtilReportBuilderVizViewportDrag(modal) {
            if (!modal || modal.dataset.viewportDragBound === 'true') return;
            const card = modal.querySelector('.util-report-builder-viz-card');
            const body = modal.querySelector('.util-report-builder-viz-body');
            if (!card || !body) return;
            modal.dataset.viewportDragBound = 'true';
            card.classList.add('is-drag-ready');

            let activePointerId = null;
            let startX = 0;
            let startY = 0;
            let startScrollLeft = 0;
            let startScrollTop = 0;

            const endDrag = () => {
                if (activePointerId === null) return;
                activePointerId = null;
                card.classList.remove('is-dragging');
            };

            const isInteractiveTarget = (target) => !!target?.closest?.('input, select, textarea, button, label, a, summary, details, [contenteditable], [data-role="util-chart-month-hit"]');

            card.addEventListener('pointerdown', event => {
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                activePointerId = event.pointerId;
                startX = event.clientX;
                startY = event.clientY;
                startScrollLeft = body.scrollLeft;
                startScrollTop = body.scrollTop;
                card.classList.add('is-dragging');
                if (typeof card.setPointerCapture === 'function') {
                    try { card.setPointerCapture(activePointerId); } catch (err) {}
                }
            });

            card.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.clientX - startX;
                const diffY = event.clientY - startY;
                body.scrollLeft = startScrollLeft - diffX;
                body.scrollTop = startScrollTop - diffY;
                if (Math.abs(diffX) > 2 || Math.abs(diffY) > 2) event.preventDefault();
            });

            card.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            card.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                endDrag();
            });
            card.addEventListener('lostpointercapture', endDrag);
            card.addEventListener('dragstart', event => event.preventDefault());
        }

        function getUtilReportScrollableAncestors(target) {
            const containers = [];
            const seen = new Set();
            let node = target?.parentElement || null;
            while (node && node !== document.body && node !== document.documentElement) {
                const style = window.getComputedStyle(node);
                const overflowY = style?.overflowY || '';
                const overflowX = style?.overflowX || '';
                const canScrollY = /(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > (node.clientHeight + 1);
                const canScrollX = /(auto|scroll|overlay)/.test(overflowX) && node.scrollWidth > (node.clientWidth + 1);
                if ((canScrollY || canScrollX) && !seen.has(node)) {
                    containers.push(node);
                    seen.add(node);
                }
                node = node.parentElement;
            }
            const docScroller = document.scrollingElement || document.documentElement;
            if (docScroller && !seen.has(docScroller)) {
                containers.push(docScroller);
            }
            return containers;
        }

        function scrollUtilReportElementIntoContainer(container, target, options = {}) {
            if (!container || !target) return false;
            const behavior = options.behavior || 'smooth';
            const block = options.block || 'center';
            const inline = options.inline || 'center';
            const margin = Number.isFinite(options.margin) ? options.margin : 20;
            const isViewport = container === (document.scrollingElement || document.documentElement);
            const containerRect = isViewport
                ? { top: 0, left: 0, width: window.innerWidth || document.documentElement.clientWidth || 0, height: window.innerHeight || document.documentElement.clientHeight || 0 }
                : container.getBoundingClientRect();
            const targetRect = target.getBoundingClientRect();
            const deltaTop = targetRect.top - containerRect.top;
            const deltaLeft = targetRect.left - containerRect.left;
            let nextTop = container.scrollTop;
            let nextLeft = container.scrollLeft;

            if (block === 'start') {
                nextTop += deltaTop - margin;
            } else if (block === 'nearest') {
                const topVisible = deltaTop >= margin;
                const bottomVisible = (deltaTop + targetRect.height) <= (containerRect.height - margin);
                if (!topVisible) nextTop += deltaTop - margin;
                else if (!bottomVisible) nextTop += (deltaTop + targetRect.height) - containerRect.height + margin;
            } else {
                nextTop += deltaTop - ((containerRect.height - targetRect.height) / 2);
            }

            if (inline === 'start' || inline === 'nearest') {
                const leftVisible = deltaLeft >= margin;
                const rightVisible = (deltaLeft + targetRect.width) <= (containerRect.width - margin);
                if (!leftVisible) nextLeft += deltaLeft - margin;
                else if (!rightVisible) nextLeft += (deltaLeft + targetRect.width) - containerRect.width + margin;
            } else {
                nextLeft += deltaLeft - ((containerRect.width - targetRect.width) / 2);
            }

            const maxTop = Math.max(0, container.scrollHeight - container.clientHeight);
            const maxLeft = Math.max(0, container.scrollWidth - container.clientWidth);
            nextTop = Math.max(0, Math.min(maxTop, nextTop));
            nextLeft = Math.max(0, Math.min(maxLeft, nextLeft));
            if (Math.abs(nextTop - container.scrollTop) < 1 && Math.abs(nextLeft - container.scrollLeft) < 1) {
                return false;
            }
            if (typeof container.scrollTo === 'function') {
                container.scrollTo({ top: nextTop, left: nextLeft, behavior });
            } else {
                container.scrollTop = nextTop;
                container.scrollLeft = nextLeft;
            }
            return true;
        }

        function scrollUtilReportFocusTarget(target, options = {}) {
            if (!target) return false;
            const mergedOptions = {
                block: 'start',
                inline: 'nearest',
                margin: 76,
                behavior: options.behavior || 'smooth',
                ...options
            };
            const containers = getUtilReportScrollableAncestors(target);
            if (!containers.length && typeof target.scrollIntoView === 'function') {
                try {
                    target.scrollIntoView({
                        behavior: mergedOptions.behavior,
                        block: mergedOptions.block,
                        inline: mergedOptions.inline
                    });
                } catch (err) {
                    target.scrollIntoView();
                }
                return true;
            }
            const runScroll = (behaviorValue) => {
                let didScroll = false;
                containers.forEach(container => {
                    didScroll = scrollUtilReportElementIntoContainer(container, target, {
                        ...mergedOptions,
                        behavior: behaviorValue
                    }) || didScroll;
                });
                return didScroll;
            };
            const didScroll = runScroll(mergedOptions.behavior);
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => runScroll('auto'));
            }
            return didScroll;
        }

        function scrollUtilReportFocusedElementIntoView(scope, options = {}) {
            if (!scope || typeof scope.querySelector !== 'function') return false;
            const target = scope.querySelector('.is-cell-focused')
                || scope.querySelector('tbody tr.is-row-focused td.is-cell-focused')
                || scope.querySelector('tbody tr.is-focused td.is-cell-focused')
                || scope.querySelector('tbody tr.is-row-focused')
                || scope.querySelector('tbody tr.is-focused');
            return scrollUtilReportFocusTarget(target, options);
        }

        function resolveUtilReportYoYFocusCell(tableEl, targetRow, options = {}) {
            if (!tableEl || !targetRow) return null;
            const cells = Array.from(targetRow.querySelectorAll('td'));
            if (!cells.length) return null;
            if (cells.length === 1) return cells[0];
            const compareYear = String(UtilReportState.compareYear || '').trim();
            const seriesKey = String(options.seriesKey || UtilReportState.focusSeriesKey || '').trim().toLowerCase();
            if (compareYear) {
                if (seriesKey === 'prev') return cells[2] || cells[1] || cells[cells.length - 1] || null;
                if (seriesKey === 'delta') return cells[3] || cells[1] || cells[cells.length - 1] || null;
                if (seriesKey === 'rate') return cells[4] || cells[cells.length - 1] || null;
                return cells[1] || cells[cells.length - 1] || null;
            }
            const chartYear = String(UtilReportState.chartYear || '').trim();
            const headers = Array.from(tableEl.querySelectorAll('thead th'));
            if (chartYear && headers.length > 1) {
                const headerIndex = headers.findIndex((cell, index) => index > 0 && String(cell.textContent || '').trim().startsWith(chartYear));
                if (headerIndex > 0 && headerIndex < cells.length) {
                    return cells[headerIndex];
                }
            }
            return cells[cells.length - 1] || cells[1] || null;
        }

        function syncUtilAnalyticsChartHostHeight(host, extraPadding = 20) {
            if (!host || typeof host.querySelector !== 'function') return;
            const applyHeight = () => {
                const chart = host.querySelector('.util-analytics-chart');
                if (!chart) {
                    host.style.minHeight = '';
                    return;
                }
                const scrollHeight = Math.ceil(chart.scrollHeight || 0);
                const rectHeight = Math.ceil(chart.getBoundingClientRect?.().height || 0);
                const childHeight = Array.from(chart.children || []).reduce((sum, child) => {
                    return sum + Math.ceil(child.getBoundingClientRect?.().height || 0);
                }, 0);
                const nextHeight = Math.max(scrollHeight, rectHeight, childHeight);
                if (nextHeight > 0) {
                    host.style.minHeight = `${nextHeight + extraPadding}px`;
                }
            };
            applyHeight();
            if (typeof window.requestAnimationFrame === 'function') {
                window.requestAnimationFrame(() => {
                    applyHeight();
                    window.requestAnimationFrame(applyHeight);
                });
            }
        }

        function focusUtilReportDetailTableByMonth(tableEl, selection, options = {}) {
            if (!tableEl) return false;
            const normalizedMonthKey = normalizeUtilReportMonthKey(
                typeof selection === 'object' && selection !== null
                    ? (selection.monthKey || '')
                    : ''
            );
            const normalizedToken = normalizeUtilReportMonthToken(
                typeof selection === 'object' && selection !== null
                    ? (selection.monthToken || selection.monthKey || '')
                    : selection
            );
            const seriesKey = String(
                typeof selection === 'object' && selection !== null
                    ? (selection.seriesKey || '')
                    : ''
            ).trim().toLowerCase();
            if (!normalizedMonthKey && !normalizedToken) return false;
            const rows = Array.from(tableEl.querySelectorAll('tbody tr[data-month-token]'));
            rows.forEach(row => row.classList.remove('is-focused'));
            Array.from(tableEl.querySelectorAll('.is-cell-focused')).forEach(cell => cell.classList.remove('is-cell-focused'));
            const targetRow = rows.find(row => {
                const rowMonthKey = normalizeUtilReportMonthKey(row.getAttribute('data-month-key') || '');
                if (normalizedMonthKey && rowMonthKey) return rowMonthKey === normalizedMonthKey;
                return normalizeUtilReportMonthToken(row.getAttribute('data-month-token')) === normalizedToken;
            }) || null;
            if (!targetRow) return false;
            targetRow.classList.add('is-focused');
            const focusCell = resolveUtilReportYoYFocusCell(tableEl, targetRow, { seriesKey });
            if (focusCell) focusCell.classList.add('is-cell-focused');
            if (options.scroll !== false) {
                scrollUtilReportFocusTarget(focusCell || targetRow, { block: 'start', inline: 'nearest', margin: 84 });
            }
            return true;
        }

        function getUtilReportDetachedTableWindow() {
            const popup = UtilReportDetachedTableState.win;
            if (popup && !popup.closed) return popup;
            UtilReportDetachedTableState.win = null;
            return null;
        }

        function focusUtilReportDetachedTableByMonth(selection, options = {}) {
            const popup = getUtilReportDetachedTableWindow();
            const popupTable = popup?.document?.querySelector?.('[data-role="util-report-modal-yoy-table"]');
            if (!popupTable) return false;
            return focusUtilReportDetailTableByMonth(popupTable, selection, options);
        }

        function focusUtilReportDetailRowByMonth(modal, selection, options = {}) {
            const rawSelection = typeof selection === 'object' && selection !== null
                ? selection
                : { monthToken: selection };
            const normalizedMonthKey = normalizeUtilReportMonthKey(rawSelection.monthKey || '');
            const normalizedToken = normalizeUtilReportMonthToken(rawSelection.monthToken || rawSelection.monthKey || '');
            const normalizedSeriesKey = String(rawSelection.seriesKey || '').trim().toLowerCase();
            if (!normalizedMonthKey && !normalizedToken) return false;
            UtilReportDetachedTableState.focusMonthToken = normalizedToken;
            UtilReportDetachedTableState.focusMonthKey = normalizedMonthKey;
            UtilReportDetachedTableState.focusSeriesKey = normalizedSeriesKey;
            UtilReportState.focusMonthKey = normalizedMonthKey;
            UtilReportState.focusSeriesKey = normalizedSeriesKey;
            if (UtilReportDetachedTableState.detached) {
                return focusUtilReportDetachedTableByMonth({
                    monthToken: normalizedToken,
                    monthKey: normalizedMonthKey,
                    seriesKey: normalizedSeriesKey
                }, {
                    scroll: options.detachedScroll !== false
                });
            }
            if (!modal) return false;
            const tableEl = modal.querySelector('[data-role="util-report-modal-yoy-table"]');
            return focusUtilReportDetailTableByMonth(tableEl, {
                monthToken: normalizedToken,
                monthKey: normalizedMonthKey,
                seriesKey: normalizedSeriesKey
            }, options);
        }
