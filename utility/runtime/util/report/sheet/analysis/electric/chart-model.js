(function registerUtilReportSheetAnalysisElectricChartModel(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisElectricChartModel) {
        return;
    }
    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.analysis.electric.chart-model.js');
    }
    const {
        UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX
    } = utilReportSheetConfig;
    const runtime = {
        getUtilElectricAnalysisUnitKey: null,
        getUtilElectricAnalysisChartUnitLabel: null,
        getUtilElectricAnalysisChartDecimals: null,
        scaleUtilElectricAnalysisChartValue: null,
        formatUtilSheetDecimal: null,
        getUtilElectricAnalysisUnitOption: null,
        formatUtilSheetPercent: null,
        formatUtilSheetSignedPercentPoint: null,
        getUtilElectricAnalysisDisplayMode: null,
        getUtilElectricAnalysisUnitOptions: null,
        buildUtilGasAnalysisSeriesLabel: null
    };
    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisElectricChartModel;
    }
    function getElectricUnitKey(chartKey = '') {
        if (typeof runtime.getUtilElectricAnalysisUnitKey === 'function') {
            return runtime.getUtilElectricAnalysisUnitKey(chartKey);
        }
        return '';
    }
    function getElectricUnitLabel(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilElectricAnalysisChartUnitLabel === 'function') {
            return runtime.getUtilElectricAnalysisChartUnitLabel(chartKey, unitKey);
        }
        return '';
    }
    function getElectricChartDecimals(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilElectricAnalysisChartDecimals === 'function') {
            return runtime.getUtilElectricAnalysisChartDecimals(chartKey, unitKey);
        }
        return 0;
    }
    function scaleElectricChartValue(chartKey = '', value, unitKey = '') {
        if (typeof runtime.scaleUtilElectricAnalysisChartValue === 'function') {
            return runtime.scaleUtilElectricAnalysisChartValue(chartKey, value, unitKey);
        }
        return value;
    }
    function formatDecimal(value, decimals = 0, fallback = '-') {
        if (typeof runtime.formatUtilSheetDecimal === 'function') {
            return runtime.formatUtilSheetDecimal(value, decimals, fallback);
        }
        return fallback;
    }
    function getElectricUnitOption(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilElectricAnalysisUnitOption === 'function') {
            return runtime.getUtilElectricAnalysisUnitOption(chartKey, unitKey);
        }
        return { key: '', label: '', scale: 1, decimals: 0 };
    }
    function formatPercent(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetPercent === 'function') {
            return runtime.formatUtilSheetPercent(value, fallback);
        }
        return fallback;
    }
    function formatSignedPercentPoint(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedPercentPoint === 'function') {
            return runtime.formatUtilSheetSignedPercentPoint(value, fallback);
        }
        return fallback;
    }
    function getElectricDisplayMode(chartKey = '') {
        if (typeof runtime.getUtilElectricAnalysisDisplayMode === 'function') {
            return runtime.getUtilElectricAnalysisDisplayMode(chartKey);
        }
        return 'bar';
    }
    function getElectricUnitOptions(chartKey = '') {
        if (typeof runtime.getUtilElectricAnalysisUnitOptions === 'function') {
            return runtime.getUtilElectricAnalysisUnitOptions(chartKey);
        }
        return [];
    }
    function buildSeriesLabel(chart = {}) {
        if (typeof runtime.buildUtilGasAnalysisSeriesLabel === 'function') {
            return runtime.buildUtilGasAnalysisSeriesLabel(chart);
        }
        return String(chart?.title || '');
    }
    function isUtilElectricAnalysisLineRatioKey(chartKey = '') {
        return String(chartKey || '').trim().startsWith(UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX);
    }

    function resolveUtilElectricAnalysisPointValue(chart = {}, point = null, unitKey = '') {
        if (isUtilElectricAnalysisLineRatioKey(chart?.key)) {
            if (unitKey === 'kg' || unitKey === 'ton') {
                return Number(point?.amountValue);
            }
            return Number(point?.ratioValue);
        }
        return Number(point?.value);
    }

    function formatUtilElectricAnalysisLineMetricValue(value, unitKey = 'percent', fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        if (unitKey === 'percent') {
            return formatPercent(value, fallback);
        }
        const option = getElectricUnitOption(`${UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX}metric`, unitKey);
        const scale = Number(option?.scale) || 1;
        const decimals = Number.isFinite(option?.decimals) ? option.decimals : 0;
        const unitLabel = String(option?.label || unitKey || '').trim();
        return `${formatDecimal(value / scale, decimals)}${unitLabel}`;
    }

    function formatUtilElectricAnalysisSignedLineMetric(value, unitKey = 'percent', fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        if (unitKey === 'percent') {
            return formatSignedPercentPoint(value, fallback);
        }
        const option = getElectricUnitOption(`${UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX}metric`, unitKey);
        const scale = Number(option?.scale) || 1;
        const decimals = Number.isFinite(option?.decimals) ? option.decimals : 0;
        const unitLabel = String(option?.label || unitKey || '').trim();
        const sign = value > 0 ? '+' : '';
        return `${sign}${formatDecimal(value / scale, decimals)}${unitLabel}`;
    }

    function parseUtilElectricAnalysisProductionLineMetric(metricKey = '') {
        const raw = String(metricKey || '').trim();
        if (!raw.startsWith('생산라인::')) {
            return {
                raw,
                teamName: '',
                lineName: ''
            };
        }
        const body = raw.slice('생산라인::'.length);
        const parts = body.split('::');
        return {
            raw,
            teamName: String(parts[0] || '').trim(),
            lineName: String(parts.slice(1).join('::') || '').trim()
        };
    }

    function getUtilElectricAnalysisLineRatioOrderRank(teamName = '', lineName = '') {
        const normalizedTeamName = String(teamName || '').trim();
        const normalizedLineName = String(lineName || '').trim();
        const orderMap = {
            'Line Alpha': ['SD', 'MSD'],
            'Line Beta': ['지대', 'ICA'],
            'Line Gamma': ['로터리·버티컬', 'Process Beta B'],
            'Line Delta': ['Bottle', '기타']
        };
        const rank = orderMap[normalizedTeamName]?.findIndex(label => label === normalizedLineName);
        return Number.isFinite(rank) && rank >= 0 ? rank : 99;
    }

    function getUtilElectricAnalysisLineRatioColor(teamName = '', lineName = '', index = 0) {
        const lineColorMap = {
            'Line Alpha::SD': '#2563eb',
            'Line Alpha::MSD': '#ec4899',
            'Line Beta::지대': '#f97316',
            'Line Beta::ICA': '#14b8a6',
            'Line Gamma::로터리·버티컬': '#7c3aed',
            'Line Gamma::Process Beta B': '#22c55e',
            'Line Delta::Bottle': '#ef4444',
            'Line Delta::기타': '#0ea5e9'
        };
        const normalizedKey = `${String(teamName || '').trim()}::${String(lineName || '').trim()}`;
        if (lineColorMap[normalizedKey]) {
            return lineColorMap[normalizedKey];
        }
        const fallbackPalette = ['#2563eb', '#ec4899', '#14b8a6', '#f97316', '#7c3aed', '#22c55e', '#ef4444', '#0ea5e9'];
        return fallbackPalette[index % fallbackPalette.length];
    }

    function buildUtilElectricAnalysisLineRatioSeries(rangeKeys = [], teamOption = null, activeMonthKey = '', referenceMonthKey = '') {
        const productionTeamNames = Array.isArray(teamOption?.productionTeamNames)
            ? Array.from(new Set(teamOption.productionTeamNames.map(teamName => String(teamName || '').trim()).filter(Boolean)))
            : [];
        if (productionTeamNames.length !== 1) return [];
        if (typeof globalScope.buildUtilReportProductionProductMonthlyValueMap !== 'function') return [];
        const teamName = productionTeamNames[0];
        const lineNames = new Set();
        const monthLineValueMap = new Map();

        (Array.isArray(rangeKeys) ? rangeKeys : []).forEach(monthKey => {
            const parsedMonth = typeof globalScope.parseUtilMonthValue === 'function'
                ? globalScope.parseUtilMonthValue(monthKey)
                : /^(\d{4})-(\d{2})$/.exec(String(monthKey || '').trim());
            const yearValue = Number(parsedMonth?.year ?? parsedMonth?.[1]);
            const monthValue = Number(parsedMonth?.month ?? parsedMonth?.[2]);
            if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) return;
            const rawValueMap = globalScope.buildUtilReportProductionProductMonthlyValueMap(yearValue, monthValue, teamName);
            const lineValueMap = new Map();
            Object.entries(rawValueMap || {}).forEach(([metricKey, rawValue]) => {
                const value = Number(rawValue);
                if (!Number.isFinite(value) || value <= 0) return;
                const parsedMetric = parseUtilElectricAnalysisProductionLineMetric(metricKey);
                const lineName = String(parsedMetric?.lineName || '').trim();
                if (!lineName) return;
                if (parsedMetric.teamName && parsedMetric.teamName !== teamName) return;
                lineValueMap.set(lineName, (Number(lineValueMap.get(lineName)) || 0) + value);
                lineNames.add(lineName);
            });
            monthLineValueMap.set(monthKey, lineValueMap);
        });

        const orderedLineNames = Array.from(lineNames).sort((left, right) => {
            const rankDiff = getUtilElectricAnalysisLineRatioOrderRank(teamName, left) - getUtilElectricAnalysisLineRatioOrderRank(teamName, right);
            if (rankDiff !== 0) return rankDiff;
            return String(left || '').localeCompare(String(right || ''), 'ko');
        });
        if (!orderedLineNames.length) return [];

        const createPoint = (monthKey, value) => ({
            key: monthKey,
            monthKey,
            label: typeof globalScope.formatUtilReportMonthShort === 'function' ? globalScope.formatUtilReportMonthShort(monthKey) : monthKey,
            value: Number.isFinite(value) ? value : NaN
        });
        const totalRangeAmount = Array.from(monthLineValueMap.values()).reduce((grandTotal, lineValueMap) => (
            grandTotal + Array.from(lineValueMap.values()).filter(Number.isFinite).reduce((sum, value) => sum + value, 0)
        ), 0);
        const activeLineValueMap = monthLineValueMap.get(String(activeMonthKey || '').trim()) || new Map();
        const activeTotalAmount = Array.from(activeLineValueMap.values()).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
        const referenceLineValueMap = monthLineValueMap.get(String(referenceMonthKey || '').trim()) || new Map();
        const referenceTotalAmount = Array.from(referenceLineValueMap.values()).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
        return orderedLineNames.map((lineName, index) => ({
            key: `${UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX}${teamName}::${lineName}`,
            title: lineName,
            icon: 'fa-chart-pie',
            tone: 'production',
            metricLabel: '%',
            decimals: 1,
            color: getUtilElectricAnalysisLineRatioColor(teamName, lineName, index),
            chartType: 'line',
            lineWidth: 2.8,
            totalAmount: Array.from(monthLineValueMap.values()).reduce((sum, lineValueMap) => (
                sum + (Number(lineValueMap.get(lineName)) || 0)
            ), 0),
            totalRatio: totalRangeAmount > 0
                ? (Array.from(monthLineValueMap.values()).reduce((sum, lineValueMap) => (
                    sum + (Number(lineValueMap.get(lineName)) || 0)
                ), 0) / totalRangeAmount) * 100
                : null,
            activeRatio: activeTotalAmount > 0 && Number.isFinite(Number(activeLineValueMap.get(lineName)))
                ? (Number(activeLineValueMap.get(lineName)) / activeTotalAmount) * 100
                : null,
            activeAmount: Number.isFinite(Number(activeLineValueMap.get(lineName))) ? Number(activeLineValueMap.get(lineName)) : null,
            referenceRatio: referenceTotalAmount > 0 && Number.isFinite(Number(referenceLineValueMap.get(lineName)))
                ? (Number(referenceLineValueMap.get(lineName)) / referenceTotalAmount) * 100
                : null,
            referenceAmount: Number.isFinite(Number(referenceLineValueMap.get(lineName))) ? Number(referenceLineValueMap.get(lineName)) : null,
            points: (Array.isArray(rangeKeys) ? rangeKeys : []).map(monthKey => {
                const lineValueMap = monthLineValueMap.get(monthKey) || new Map();
                const totalValue = Array.from(lineValueMap.values())
                    .filter(Number.isFinite)
                    .reduce((sum, value) => sum + value, 0);
                const lineValue = Number(lineValueMap.get(lineName));
                const ratioValue = totalValue > 0 && Number.isFinite(lineValue)
                    ? (lineValue / totalValue) * 100
                    : NaN;
                return {
                    ...createPoint(monthKey, ratioValue),
                    ratioValue,
                    amountValue: Number.isFinite(lineValue) ? lineValue : NaN
                };
            }),
            deltaRatio: null,
            deltaAmount: null
        })).map(series => ({
            ...series,
            deltaRatio: Number.isFinite(series.activeRatio) && Number.isFinite(series.referenceRatio)
                ? series.activeRatio - series.referenceRatio
                : null,
            deltaAmount: Number.isFinite(series.activeAmount) && Number.isFinite(series.referenceAmount)
                ? series.activeAmount - series.referenceAmount
                : null
        }));
    }

    function buildUtilElectricAnalysisCombinedChart(charts = [], rangeLabel = '', options = {}) {
        const baseCharts = Array.isArray(charts) ? charts.filter(chart => chart && Array.isArray(chart.points)) : [];
        if (!baseCharts.length) return null;

        const controlItems = baseCharts.map(chart => {
            const unitKey = getElectricUnitKey(chart.key);
            const displayMode = getElectricDisplayMode(chart.key);
            const chartUnitLabel = getElectricUnitLabel(chart.key, unitKey) || String(chart?.metricLabel || '').trim();
            const chartDecimals = getElectricChartDecimals(chart.key, unitKey);
            const resolvedDecimals = Number.isFinite(chartDecimals) && chartDecimals > 0
                ? chartDecimals
                : (Number.isFinite(chart?.decimals) ? chart.decimals : 0);
            return {
                ...chart,
                unitKey,
                unitLabel: chartUnitLabel,
                decimals: resolvedDecimals,
                displayMode,
                popupTableKey: chart.key,
                unitOptions: chart.key === 'electricIntensity'
                    ? []
                    : getElectricUnitOptions(chart.key)
            };
        });
        const visibleCharts = controlItems.filter(chart => chart.displayMode !== 'none' && Array.isArray(chart.points) && chart.points.length);

        const series = visibleCharts.map(chart => ({
            label: buildSeriesLabel({ title: chart.title, metricLabel: chart.unitLabel }),
            color: chart.color,
            decimals: Number.isFinite(chart?.decimals) ? chart.decimals : 0,
            type: chart.displayMode,
            lineWidth: chart.displayMode === 'line' ? chart.lineWidth : undefined,
            lineDash: chart.displayMode === 'line' ? chart.lineDash : '',
            seriesKey: chart.key,
            points: chart.points.map(point => ({
                key: point?.monthKey || point?.key || point?.label || '',
                monthKey: point?.monthKey || point?.key || '',
                label: point?.label || '',
                value: scaleElectricChartValue(
                    chart.key,
                    resolveUtilElectricAnalysisPointValue(chart, point, chart.unitKey),
                    chart.unitKey
                )
            }))
        }));

        const chartDataList = visibleCharts.map(chart => ({
            datasetLabel: '',
            teamLabel: chart.title,
            metricLabel: chart.unitLabel,
            legendLabel: buildSeriesLabel({ title: chart.title, metricLabel: chart.unitLabel }),
            decimals: Number.isFinite(chart?.decimals) ? chart.decimals : 0,
            chartType: chart.displayMode,
            color: chart.color,
            lineWidth: chart.displayMode === 'line' ? chart.lineWidth : undefined,
            lineDash: chart.displayMode === 'line' ? chart.lineDash : '',
            seriesKey: chart.key,
            points: chart.points.map(point => {
                const pointKey = point?.monthKey || point?.key || point?.label || '';
                return {
                    key: pointKey,
                    monthKey: pointKey,
                    label: typeof globalScope.formatUtilReportMonthLong === 'function'
                        ? globalScope.formatUtilReportMonthLong(pointKey)
                        : (point?.label || pointKey),
                    value: scaleElectricChartValue(
                        chart.key,
                        resolveUtilElectricAnalysisPointValue(chart, point, chart.unitKey),
                        chart.unitKey
                    )
                };
            })
        }));

        const maxDecimals = visibleCharts.reduce((acc, chart) => Math.max(acc, Number.isFinite(chart?.decimals) ? chart.decimals : 0), 0);
        return {
            key: String(options?.key || 'combined').trim() || 'combined',
            title: String(options?.title || '').trim() || '전기 사용량 · 금액 · 생산량',
            icon: String(options?.icon || '').trim() || 'fa-chart-column',
            tone: String(options?.tone || '').trim() || 'electric',
            periodLabel: rangeLabel,
            decimals: maxDecimals,
            series,
            chartDataList,
            controlItems,
            hasVisibleSeries: visibleCharts.length > 0
        };
    }    globalScope.KPIUtilReportSheetAnalysisElectricChartModel = Object.freeze({
        setRuntimeAdapters,
        resolveUtilElectricAnalysisPointValue,
        formatUtilElectricAnalysisLineMetricValue,
        formatUtilElectricAnalysisSignedLineMetric,
        parseUtilElectricAnalysisProductionLineMetric,
        getUtilElectricAnalysisLineRatioOrderRank,
        getUtilElectricAnalysisLineRatioColor,
        buildUtilElectricAnalysisLineRatioSeries,
        buildUtilElectricAnalysisCombinedChart
    });
})(typeof window !== 'undefined' ? window : globalThis);