(function registerUtilReportSheetAnalysisRangeRatio(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisRangeRatio) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.analysis.range-ratio.js');
    }

    const {
        UTIL_GAS_RATIO_CHART_COLORS
    } = utilReportSheetConfig;

    const runtime = {
        compareUtilSheetMonthKeys: null,
        formatUtilReportMonthShort: null,
        getUtilGasAnalysisDisplayMode: null,
        getUtilGasAnalysisUnitKey: null,
        getUtilGasAnalysisChartUnitLabel: null,
        getUtilGasAnalysisChartDecimals: null,
        getUtilGasAnalysisUnitOptions: null,
        scaleUtilGasAnalysisChartValue: null,
        buildUtilGasAnalysisCompareSub: null,
        formatUtilSheetRatio: null,
        formatUtilSheetPercent: null,
        formatUtilElectricAnalysisLineMetricValue: null,
        formatUtilElectricAnalysisSignedLineMetric: null,
        renderUtilMultiSeriesChart: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisRangeRatio;
    }

    function compareMonthKeys(left = '', right = '') {
        if (typeof runtime.compareUtilSheetMonthKeys === 'function') {
            return runtime.compareUtilSheetMonthKeys(left, right);
        }
        return String(left || '').localeCompare(String(right || ''), 'ko');
    }

    function formatMonthShort(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthShort === 'function') {
            return runtime.formatUtilReportMonthShort(monthKey);
        }
        return String(monthKey || '');
    }

    function getGasDisplayMode(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisDisplayMode === 'function') {
            return runtime.getUtilGasAnalysisDisplayMode(chartKey);
        }
        return 'bar';
    }

    function getGasUnitKey(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisUnitKey === 'function') {
            return runtime.getUtilGasAnalysisUnitKey(chartKey);
        }
        return '';
    }

    function getGasUnitLabel(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartUnitLabel === 'function') {
            return runtime.getUtilGasAnalysisChartUnitLabel(chartKey, unitKey);
        }
        return '';
    }

    function getGasChartDecimals(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartDecimals === 'function') {
            return runtime.getUtilGasAnalysisChartDecimals(chartKey, unitKey);
        }
        return 0;
    }

    function getGasUnitOptions(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisUnitOptions === 'function') {
            return runtime.getUtilGasAnalysisUnitOptions(chartKey);
        }
        return [];
    }

    function scaleGasValue(chartKey = '', value, unitKey = '') {
        if (typeof runtime.scaleUtilGasAnalysisChartValue === 'function') {
            return runtime.scaleUtilGasAnalysisChartValue(chartKey, value, unitKey);
        }
        return Number.isFinite(value) ? value : NaN;
    }

    function buildCompareSub(compareLabel, monthKey, deltaText) {
        if (typeof runtime.buildUtilGasAnalysisCompareSub === 'function') {
            return runtime.buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText);
        }
        return `${compareLabel} ${deltaText}`;
    }

    function formatRatio(value, digits = 3, fallback = '-') {
        if (typeof runtime.formatUtilSheetRatio === 'function') {
            return runtime.formatUtilSheetRatio(value, digits, fallback);
        }
        return fallback;
    }

    function formatPercent(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetPercent === 'function') {
            return runtime.formatUtilSheetPercent(value, fallback);
        }
        return fallback;
    }

    function formatLineMetricValue(value, unitKey = '') {
        if (typeof runtime.formatUtilElectricAnalysisLineMetricValue === 'function') {
            return runtime.formatUtilElectricAnalysisLineMetricValue(value, unitKey);
        }
        return '-';
    }

    function formatSignedLineMetric(value, unitKey = '') {
        if (typeof runtime.formatUtilElectricAnalysisSignedLineMetric === 'function') {
            return runtime.formatUtilElectricAnalysisSignedLineMetric(value, unitKey);
        }
        return '-';
    }

    function renderMultiSeriesChart(series = [], options = {}) {
        if (typeof runtime.renderUtilMultiSeriesChart === 'function') {
            return runtime.renderUtilMultiSeriesChart(series, options);
        }
        return '';
    }

    function buildUtilGasAnalysisRangeTables(rangeKeys = [], ratioUsageMap = new Map(), productionMap = new Map()) {
        const activeMonthSet = new Set(Array.isArray(rangeKeys) ? rangeKeys : []);
        const years = Array.from(new Set(
            Array.from(activeMonthSet)
                .map(monthKey => Number.parseInt(String(monthKey || '').slice(0, 4), 10))
                .filter(year => Number.isFinite(year))
        )).sort((a, b) => a - b);
        const buildRows = (label, unitLabel, valueResolver) => years.map(year => ({
            year,
            label,
            unitLabel,
            cells: Array.from({ length: 12 }, (_, index) => {
                const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                if (!activeMonthSet.has(monthKey)) return null;
                const usageBucket = ratioUsageMap.get(monthKey) || { lpg: NaN, lng: NaN };
                const productionBucket = productionMap.get(monthKey) || { lpg: NaN, lng: NaN };
                return valueResolver(usageBucket, productionBucket);
            })
        }));

        return [
            {
                key: 'lpg',
                title: 'LPG 소모량',
                unitLabel: 'kg/kg',
                rows: buildRows('LPG소모량', 'kg/kg', (usageBucket, productionBucket) => {
                    const usage = Number(usageBucket?.lpg);
                    const production = Number(productionBucket?.lpg);
                    if (!Number.isFinite(production) || production <= 0) return null;
                    return Number.isFinite(usage) ? usage / production : null;
                })
            },
            {
                key: 'lng',
                title: 'LNG 소모량',
                unitLabel: 'Nm3/kg',
                rows: buildRows('LNG소모량', 'Nm3/kg', (usageBucket, productionBucket) => {
                    const usage = Number(usageBucket?.lng);
                    const production = Number(productionBucket?.lng);
                    if (!Number.isFinite(production) || production <= 0) return null;
                    return Number.isFinite(usage) ? usage / production : null;
                })
            }
        ].filter(table => table.rows.some(row => (
            Array.isArray(row?.cells) && row.cells.some(Number.isFinite)
        )));
    }

    function buildUtilGasAnalysisRangeChartHtml(table) {
        const rows = Array.isArray(table?.rows) ? table.rows : [];
        if (!rows.length) return '';

        const series = rows.map((row, index) => ({
            label: `${String(row?.year || '').slice(-2)}년`,
            color: UTIL_GAS_RATIO_CHART_COLORS[index % UTIL_GAS_RATIO_CHART_COLORS.length],
            type: 'line',
            lineWidth: 3,
            seriesKey: `${table?.key || 'ratio'}-${row?.year || index}`,
            points: Array.from({ length: 12 }, (_, monthIndex) => {
                const monthKey = `${row?.year || ''}-${String(monthIndex + 1).padStart(2, '0')}`;
                const rawValue = Array.isArray(row?.cells) ? row.cells[monthIndex] : null;
                return {
                    key: monthKey,
                    monthKey,
                    label: `${monthIndex + 1}월`,
                    value: Number.isFinite(rawValue) ? rawValue : NaN
                };
            })
        }));

        return renderMultiSeriesChart(series, {
            chartTitle: `${table?.title || ''} 추이`,
            periodLabel: '연도별 추이',
            inlinePeriodLegend: true,
            decimals: 3,
            showLabelToggle: false,
            showLabels: false,
            tightRange: true,
            tightPadding: 0.18,
            hideUnit: true,
            axisXLabel: '월',
            axisYLabel: String(table?.unitLabel || '').trim(),
            showYearBands: false,
            maxXAxisLabels: 12,
            forceWidth: 900,
            height: 276,
            rightPad: 28
        });
    }

    function buildUtilGasAnalysisRatioCombinedChartModel(ratioTables = [], rangeLabel = '', options = {}) {
        const lineRatioSeries = Array.isArray(options?.lineRatioSeries)
            ? options.lineRatioSeries.filter(series => series && Array.isArray(series.points))
            : [];
        if ((!Array.isArray(ratioTables) || !ratioTables.length) && !lineRatioSeries.length) return null;

        const buildPointMap = (table) => {
            const rows = Array.isArray(table?.rows) ? table.rows : [];
            const pointMap = new Map();
            rows.forEach(row => {
                const year = Number.parseInt(row?.year, 10);
                if (!Number.isFinite(year)) return;
                const cells = Array.isArray(row?.cells) ? row.cells : [];
                cells.forEach((cell, index) => {
                    if (!Number.isFinite(cell)) return;
                    const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                    pointMap.set(monthKey, cell);
                });
            });
            return pointMap;
        };

        const lpgTable = ratioTables.find(table => table?.key === 'lpg') || null;
        const lngTable = ratioTables.find(table => table?.key === 'lng') || null;
        const lpgPointMap = buildPointMap(lpgTable);
        const lngPointMap = buildPointMap(lngTable);
        const monthKeys = Array.from(new Set([
            ...Array.from(lpgPointMap.keys()),
            ...Array.from(lngPointMap.keys()),
            ...lineRatioSeries.flatMap(series => (
                Array.isArray(series?.points)
                    ? series.points.map(point => String(point?.monthKey || point?.key || '').trim()).filter(Boolean)
                    : []
            ))
        ])).sort(compareMonthKeys);
        if (!monthKeys.length) return null;

        const controlItems = [
            lpgTable ? {
                key: 'ratio-lpg',
                title: 'LPG 소모량',
                label: 'LPG 소모량 (kg/kg)',
                color: UTIL_GAS_RATIO_CHART_COLORS[0],
                displayMode: getGasDisplayMode('ratio-lpg'),
                popupTableKey: 'lpg',
                points: monthKeys.map(monthKey => ({
                    key: monthKey,
                    monthKey,
                    label: formatMonthShort(monthKey),
                    value: lpgPointMap.has(monthKey) ? lpgPointMap.get(monthKey) : NaN
                }))
            } : null,
            lngTable ? {
                key: 'ratio-lng',
                title: 'LNG 소모량',
                label: 'LNG 소모량 (Nm3/kg)',
                color: UTIL_GAS_RATIO_CHART_COLORS[1],
                displayMode: getGasDisplayMode('ratio-lng'),
                popupTableKey: 'lng',
                points: monthKeys.map(monthKey => ({
                    key: monthKey,
                    monthKey,
                    label: formatMonthShort(monthKey),
                    value: lngPointMap.has(monthKey) ? lngPointMap.get(monthKey) : NaN
                }))
            } : null,
            ...lineRatioSeries.map(series => {
                const unitKey = getGasUnitKey(series.key);
                const unitLabel = getGasUnitLabel(series.key, unitKey);
                const isAmountMode = unitKey === 'kg' || unitKey === 'ton';
                return {
                    key: series.key,
                    title: `${series.title} 라인 비율`,
                    label: isAmountMode
                        ? `${series.title} 생산량(${unitLabel})`
                        : `${series.title} 비율(%)`,
                    color: series.color,
                    displayMode: getGasDisplayMode(series.key),
                    popupTableKey: series.key,
                    lineWidth: Number.isFinite(series?.lineWidth) ? series.lineWidth : 2.8,
                    decimals: getGasChartDecimals(series.key, unitKey),
                    unitKey,
                    unitOptions: getGasUnitOptions(series.key),
                    unitLabel,
                    points: monthKeys.map(monthKey => {
                        const sourcePoint = (Array.isArray(series?.points) ? series.points : [])
                            .find(point => String(point?.monthKey || point?.key || '').trim() === monthKey);
                        const ratioValue = Number.isFinite(sourcePoint?.ratioValue)
                            ? sourcePoint.ratioValue
                            : (Number.isFinite(sourcePoint?.value) ? sourcePoint.value : NaN);
                        const amountValue = Number.isFinite(sourcePoint?.amountValue)
                            ? sourcePoint.amountValue
                            : NaN;
                        const rawValue = isAmountMode ? amountValue : ratioValue;
                        return {
                            key: monthKey,
                            monthKey,
                            label: formatMonthShort(monthKey),
                            ratioValue,
                            amountValue,
                            value: scaleGasValue(series.key, rawValue, unitKey)
                        };
                    })
                };
            })
        ].filter(Boolean);

        const series = controlItems
            .filter(item => item.displayMode !== 'none')
            .map(item => ({
                label: item.label,
                color: item.color,
                type: item.displayMode,
                lineWidth: Number.isFinite(item?.lineWidth) ? item.lineWidth : 3,
                decimals: Number.isFinite(item?.decimals) ? item.decimals : 3,
                seriesKey: item.key,
                points: item.points
            }));

        const buildRatioSummaryItem = (table, icon, tone = 'gas') => {
            if (!table) return null;
            const controlItem = controlItems.find(item => item?.key === `ratio-${table.key}`) || null;
            const activePoint = (Array.isArray(controlItem?.points) ? controlItem.points : [])
                .find(point => String(point?.monthKey || point?.key || '').trim() === String(options?.activeMonthKey || '').trim());
            const referencePoint = (Array.isArray(controlItem?.points) ? controlItem.points : [])
                .find(point => String(point?.monthKey || point?.key || '').trim() === String(options?.referenceMonthKey || '').trim());
            const finiteValues = (Array.isArray(controlItem?.points) ? controlItem.points : [])
                .map(point => Number(point?.value))
                .filter(Number.isFinite);
            const averageValue = finiteValues.length
                ? finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length
                : null;
            const deltaValue = Number.isFinite(Number(activePoint?.value)) && Number.isFinite(Number(referencePoint?.value))
                ? Number(activePoint.value) - Number(referencePoint.value)
                : null;
            const deltaText = Number.isFinite(deltaValue)
                ? `${deltaValue > 0 ? '+' : ''}${Number(deltaValue).toFixed(3)}`
                : '-';
            return {
                key: `ratio-${table.key}`,
                title: table.title,
                valueText: formatRatio(activePoint?.value, 3, '-'),
                secondaryLabelText: '범위 평균',
                secondaryValueText: formatRatio(averageValue, 3, '-'),
                subText: buildCompareSub(
                    options?.compareLabel || '전월대비',
                    options?.activeMonthKey || '',
                    deltaText
                ),
                icon,
                tone,
                metaText: options?.categoryLabel
                    ? `${table.unitLabel} · 기준 ${options.categoryLabel}`
                    : table.unitLabel
            };
        };

        const ratioSummaryItems = [
            buildRatioSummaryItem(lpgTable, 'fa-fire-flame-curved'),
            buildRatioSummaryItem(lngTable, 'fa-fire')
        ].filter(Boolean);

        const lineRatioSummaryItems = lineRatioSeries.map(series => {
            const unitKey = getGasUnitKey(series?.key);
            const isAmountMode = unitKey === 'kg' || unitKey === 'ton';
            return {
                key: series.key,
                title: series.title,
                valueText: formatLineMetricValue(
                    isAmountMode ? series?.totalAmount : series?.totalRatio,
                    unitKey
                ),
                secondaryLabelText: isAmountMode ? '%' : 'kg',
                secondaryValueText: isAmountMode
                    ? formatPercent(series?.totalRatio)
                    : formatLineMetricValue(series?.totalAmount, 'kg'),
                subText: buildCompareSub(
                    options?.compareLabel || '전월대비',
                    options?.activeMonthKey || '',
                    formatSignedLineMetric(
                        isAmountMode ? series?.deltaAmount : series?.deltaRatio,
                        unitKey
                    )
                ),
                icon: 'fa-chart-pie',
                tone: 'production',
                popupTableKey: series.key,
                metaText: options?.categoryLabel
                    ? `범위 누적 · ${rangeLabel} · 기준 ${options.categoryLabel}`
                    : `범위 누적 · ${rangeLabel}`
            };
        });

        const summaryControlItems = controlItems.filter(item => (
            ratioSummaryItems.some(summaryItem => summaryItem.key === item.key)
            || lineRatioSummaryItems.some(summaryItem => summaryItem.key === item.key)
        ));

        return {
            key: 'ratio-combined',
            title: 'LPG/LNG 소모량 추이',
            icon: 'fa-chart-line',
            tone: 'combined',
            periodLabel: rangeLabel,
            decimals: 3,
            series,
            controlItems,
            summaryItems: ratioSummaryItems.concat(lineRatioSummaryItems),
            summaryControlItems,
            hasVisibleSeries: series.length > 0
        };
    }

    globalScope.KPIUtilReportSheetAnalysisRangeRatio = {
        setRuntimeAdapters,
        buildUtilGasAnalysisRangeTables,
        buildUtilGasAnalysisRangeChartHtml,
        buildUtilGasAnalysisRatioCombinedChartModel
    };
})(globalThis);
