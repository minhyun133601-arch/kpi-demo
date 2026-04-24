(function registerUtilReportSheetAnalysisGasModel(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisGasModel) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.analysis.gas.model.js');
    }

    const {
        UTIL_SHEET_DATASET_SPECS,
        UtilSheetAnalysisState
    } = utilReportSheetConfig;

    const runtime = {
        buildUtilSheetMonthBounds: null,
        hasUtilGasMeteringStore: null,
        normalizeUtilSheetCompareKey: null,
        getUtilGasAnalysisCategoryOption: null,
        normalizeUtilSheetAnalysisRange: null,
        buildUtilSheetRangeMonthKeys: null,
        buildUtilSheetRangeLabel: null,
        buildUtilGasAnalysisMetricMap: null,
        shiftUtilSheetMonthKey: null,
        buildUtilElectricAnalysisLineRatioSeries: null,
        getUtilGasAnalysisChartUnitLabel: null,
        getUtilGasAnalysisChartDecimals: null,
        isUtilGasAnalysisFuelInactive: null,
        buildUtilGasAnalysisCompareSub: null,
        formatUtilSheetQuantity: null,
        formatUtilSheetSignedQuantity: null,
        formatUtilSheetCost: null,
        formatUtilSheetSignedCost: null,
        buildUtilGasAnalysisCostModeText: null,
        buildUtilGasAnalysisCombinedChart: null,
        buildUtilGasAnalysisRangeTables: null,
        buildUtilGasAnalysisRatioCombinedChartModel: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisGasModel;
    }

    function buildMonthBounds(datasetKey = 'gas') {
        if (typeof runtime.buildUtilSheetMonthBounds === 'function') {
            return runtime.buildUtilSheetMonthBounds(datasetKey);
        }
        return null;
    }

    function hasGasMeteringStore() {
        if (typeof runtime.hasUtilGasMeteringStore === 'function') {
            return runtime.hasUtilGasMeteringStore();
        }
        return false;
    }

    function normalizeCompareKey(compareKey = 'month') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function getGasCategoryOption(categoryKey = '') {
        if (typeof runtime.getUtilGasAnalysisCategoryOption === 'function') {
            return runtime.getUtilGasAnalysisCategoryOption(categoryKey);
        }
        return { key: 'plantA', label: 'Plant A', productionTeamNames: [], showLpgCard: false };
    }

    function normalizeRange(monthOptions, fromValue = '', toValue = '', fallbackToValue = '') {
        if (typeof runtime.normalizeUtilSheetAnalysisRange === 'function') {
            return runtime.normalizeUtilSheetAnalysisRange(monthOptions, fromValue, toValue, fallbackToValue);
        }
        return { from: '', to: '', monthKeys: [] };
    }

    function buildRangeMonthKeys(monthOptions, fromValue = '', toValue = '') {
        if (typeof runtime.buildUtilSheetRangeMonthKeys === 'function') {
            return runtime.buildUtilSheetRangeMonthKeys(monthOptions, fromValue, toValue);
        }
        return [];
    }

    function buildRangeLabel(fromValue = '', toValue = '') {
        if (typeof runtime.buildUtilSheetRangeLabel === 'function') {
            return runtime.buildUtilSheetRangeLabel(fromValue, toValue);
        }
        return `${fromValue} ~ ${toValue}`;
    }

    function buildGasMetricMap(monthKeys = [], categoryOption = null) {
        if (typeof runtime.buildUtilGasAnalysisMetricMap === 'function') {
            return runtime.buildUtilGasAnalysisMetricMap(monthKeys, categoryOption);
        }
        return new Map();
    }

    function shiftMonthKey(monthKey = '', offset = 0) {
        if (typeof runtime.shiftUtilSheetMonthKey === 'function') {
            return runtime.shiftUtilSheetMonthKey(monthKey, offset);
        }
        return monthKey;
    }

    function buildElectricLineRatioSeries(rangeKeys = [], teamOption = null, activeMonthKey = '', referenceMonthKey = '') {
        if (typeof runtime.buildUtilElectricAnalysisLineRatioSeries === 'function') {
            return runtime.buildUtilElectricAnalysisLineRatioSeries(rangeKeys, teamOption, activeMonthKey, referenceMonthKey);
        }
        return [];
    }

    function getGasChartUnitLabel(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartUnitLabel === 'function') {
            return runtime.getUtilGasAnalysisChartUnitLabel(chartKey);
        }
        return '';
    }

    function getGasChartDecimals(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartDecimals === 'function') {
            return runtime.getUtilGasAnalysisChartDecimals(chartKey);
        }
        return 0;
    }

    function isGasFuelInactive(fuelKey = '') {
        if (typeof runtime.isUtilGasAnalysisFuelInactive === 'function') {
            return runtime.isUtilGasAnalysisFuelInactive(fuelKey);
        }
        return false;
    }

    function buildCompareSub(compareLabel, monthKey, deltaText) {
        if (typeof runtime.buildUtilGasAnalysisCompareSub === 'function') {
            return runtime.buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText);
        }
        return `${compareLabel} ${deltaText}`;
    }

    function formatQuantity(value, unit, fallback = '-') {
        if (typeof runtime.formatUtilSheetQuantity === 'function') {
            return runtime.formatUtilSheetQuantity(value, unit, fallback);
        }
        return fallback;
    }

    function formatSignedQuantity(value, unit, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedQuantity === 'function') {
            return runtime.formatUtilSheetSignedQuantity(value, unit, fallback);
        }
        return fallback;
    }

    function formatCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetCost === 'function') {
            return runtime.formatUtilSheetCost(value, fallback);
        }
        return fallback;
    }

    function formatSignedCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedCost === 'function') {
            return runtime.formatUtilSheetSignedCost(value, fallback);
        }
        return fallback;
    }

    function buildCostModeText(categoryOption = null) {
        if (typeof runtime.buildUtilGasAnalysisCostModeText === 'function') {
            return runtime.buildUtilGasAnalysisCostModeText(categoryOption);
        }
        return '';
    }

    function buildCombinedChart(charts = [], rangeLabel = '') {
        if (typeof runtime.buildUtilGasAnalysisCombinedChart === 'function') {
            return runtime.buildUtilGasAnalysisCombinedChart(charts, rangeLabel);
        }
        return null;
    }

    function buildRangeTables(rangeKeys = [], ratioUsageMap = new Map(), productionMap = new Map()) {
        if (typeof runtime.buildUtilGasAnalysisRangeTables === 'function') {
            return runtime.buildUtilGasAnalysisRangeTables(rangeKeys, ratioUsageMap, productionMap);
        }
        return [];
    }

    function buildRatioCombinedChart(ratioTables = [], rangeLabel = '', options = {}) {
        if (typeof runtime.buildUtilGasAnalysisRatioCombinedChartModel === 'function') {
            return runtime.buildUtilGasAnalysisRatioCombinedChartModel(ratioTables, rangeLabel, options);
        }
        return null;
    }

    function buildUtilGasAnalysisModel(selectedMonthKey = '', compareKey = 'month') {
        const spec = UTIL_SHEET_DATASET_SPECS.gas;
        const bounds = buildMonthBounds('gas');
        if (!spec || !bounds || typeof globalScope.buildUtilReportMonthlyRows !== 'function') {
            return {
                hasData: false,
                monthOptions: [],
                range: { from: '', to: '' },
                charts: [],
                summaryItems: []
            };
        }
        if (!hasGasMeteringStore()) {
            return {
                hasData: false,
                loading: true,
                monthOptions: [],
                range: { from: '', to: '' },
                charts: [],
                summaryItems: [],
                message: '가스 검침 데이터를 불러오는 중입니다.'
            };
        }

        const baseState = {
            from: bounds.from,
            to: bounds.to,
            electricTeam: 'all',
            gasTeam: 'all',
            wasteTeam: 'all',
            productionTeam: 'all',
            categoryKey: 'cost',
            selectedScopeKeys: [spec.scopeKey]
        };
        const fullResult = globalScope.buildUtilReportMonthlyRows(baseState);
        const fullRows = Array.isArray(fullResult?.rows) ? fullResult.rows : [];
        const settledRows = fullRows.filter(row => Boolean(row?.monthKey));
        const monthOptions = settledRows.map(row => ({
            value: row.monthKey,
            label: typeof globalScope.formatUtilReportMonthLong === 'function' ? globalScope.formatUtilReportMonthLong(row.monthKey) : row.monthKey
        }));
        if (!monthOptions.length) {
            return {
                hasData: false,
                monthOptions: [],
                range: { from: '', to: '' },
                charts: [],
                summaryItems: []
            };
        }

        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const categoryOption = getGasCategoryOption(UtilSheetAnalysisState.gas.categoryKey);
        const fallbackTo = monthOptions.some(item => item.value === selectedMonthKey)
            ? selectedMonthKey
            : monthOptions[monthOptions.length - 1].value;
        const range = normalizeRange(
            monthOptions,
            UtilSheetAnalysisState.gas.from,
            UtilSheetAnalysisState.gas.to,
            fallbackTo
        );
        const rangeKeys = buildRangeMonthKeys(monthOptions, range.from, range.to);
        const rangeLabel = buildRangeLabel(range.from, range.to);
        const monthMetricMap = buildGasMetricMap(
            monthOptions.map(item => item.value),
            categoryOption
        );
        const usageMap = new Map(
            monthOptions.map(item => {
                const metric = monthMetricMap.get(item.value) || {};
                return [item.value, {
                    lpg: metric.lpgUsage,
                    lng: metric.lngUsage
                }];
            })
        );
        const ratioUsageMap = new Map(
            monthOptions.map(item => {
                const metric = monthMetricMap.get(item.value) || {};
                return [item.value, {
                    lpg: metric.lpgUsage,
                    lng: metric.lngUsage
                }];
            })
        );
        const productionMap = new Map(
            monthOptions.map(item => {
                const metric = monthMetricMap.get(item.value) || {};
                return [item.value, {
                    lpg: metric?.ratioProduction?.lpg,
                    lng: metric?.ratioProduction?.lng
                }];
            })
        );

        const createPoint = (monthKey, value) => ({
            key: monthKey,
            monthKey,
            label: typeof globalScope.formatUtilReportMonthShort === 'function' ? globalScope.formatUtilReportMonthShort(monthKey) : monthKey,
            value: Number.isFinite(value) ? value : NaN
        });
        const buildCompareKey = monthKey => normalizedCompareKey === 'year'
            ? shiftMonthKey(monthKey, -12)
            : shiftMonthKey(monthKey, -1);
        const buildQuantityTotal = (points, unit) => formatQuantity(
            points.reduce((sum, point) => sum + (Number.isFinite(point?.value) ? point.value : 0), 0),
            unit
        );
        const activeMonthKey = range.to;
        const referenceMonthKey = buildCompareKey(activeMonthKey);
        const activeMetric = monthMetricMap.get(activeMonthKey) || {};
        const referenceMetric = monthMetricMap.get(referenceMonthKey) || {};
        const compareLabel = normalizedCompareKey === 'year' ? '전년대비' : '전월대비';
        const scopeMetaText = `범위 합계 · ${rangeLabel} · 기준 ${categoryOption.label}`;
        const costMetaText = `${scopeMetaText} · ${buildCostModeText(categoryOption)}`;
        const lineRatioSeries = buildElectricLineRatioSeries(
            rangeKeys,
            { productionTeamNames: categoryOption.productionTeamNames || [] },
            activeMonthKey,
            referenceMonthKey
        );

        const charts = [
            categoryOption.showLpgCard ? {
                key: 'lpgUsage',
                title: 'LPG 사용량',
                icon: 'fa-fire-flame-curved',
                tone: 'gas',
                metricLabel: getGasChartUnitLabel('lpgUsage'),
                decimals: getGasChartDecimals('lpgUsage'),
                color: '#f97316',
                chartType: 'bar',
                fuelKey: 'lpg',
                allowInactiveToggle: true,
                isInactive: isGasFuelInactive('lpg'),
                points: rangeKeys.map(monthKey => createPoint(monthKey, usageMap.get(monthKey)?.lpg))
            } : null,
            {
                key: 'lngUsage',
                title: 'LNG 사용량',
                icon: 'fa-fire-burner',
                tone: 'usage',
                metricLabel: getGasChartUnitLabel('lngUsage'),
                decimals: getGasChartDecimals('lngUsage'),
                color: '#2563eb',
                chartType: 'bar',
                fuelKey: 'lng',
                allowInactiveToggle: true,
                isInactive: isGasFuelInactive('lng'),
                points: rangeKeys.map(monthKey => createPoint(monthKey, usageMap.get(monthKey)?.lng))
            },
            {
                key: 'gasCost',
                title: '금액',
                icon: 'fa-coins',
                tone: 'cost',
                metricLabel: getGasChartUnitLabel('gasCost'),
                decimals: getGasChartDecimals('gasCost'),
                color: '#dc2626',
                chartType: 'line',
                lineWidth: 3.2,
                points: rangeKeys.map(monthKey => createPoint(monthKey, monthMetricMap.get(monthKey)?.gasCost))
            },
            {
                key: 'production',
                title: '생산량',
                icon: 'fa-industry',
                tone: 'production',
                metricLabel: getGasChartUnitLabel('production'),
                decimals: getGasChartDecimals('production'),
                color: '#16a34a',
                chartType: 'line',
                lineWidth: 3,
                lineDash: '8 6',
                points: rangeKeys.map(monthKey => createPoint(monthKey, monthMetricMap.get(monthKey)?.production))
            }
        ].filter(Boolean).map(chart => {
            let valueText = '-';
            let subText = `${compareLabel} 비교값 없음`;
            let metaText = scopeMetaText;

            if (chart.key === 'lpgUsage') {
                valueText = buildQuantityTotal(chart.points, 'kg');
                subText = buildCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(
                        Number(activeMetric?.lpgUsage) - Number(referenceMetric?.lpgUsage),
                        'kg'
                    )
                );
            } else if (chart.key === 'lngUsage') {
                valueText = buildQuantityTotal(chart.points, 'Nm3');
                subText = buildCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(
                        Number(activeMetric?.lngUsage) - Number(referenceMetric?.lngUsage),
                        'Nm3'
                    )
                );
            } else if (chart.key === 'gasCost') {
                valueText = formatCost(
                    chart.points.reduce((sum, point) => sum + (Number.isFinite(point?.value) ? point.value : 0), 0)
                );
                subText = buildCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedCost(Number(activeMetric?.gasCost) - Number(referenceMetric?.gasCost))
                );
                metaText = costMetaText;
            } else if (chart.key === 'production') {
                valueText = formatQuantity(
                    chart.points.reduce((sum, point) => sum + (Number.isFinite(point?.value) ? point.value : 0), 0),
                    'kg'
                );
                subText = buildCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(Number(activeMetric?.production) - Number(referenceMetric?.production), 'kg')
                );
            }

            return {
                ...chart,
                valueText,
                subText,
                metaText,
                datasetLabel: '가스비 분석표',
                teamLabel: chart.title,
                from: range.from,
                to: range.to
            };
        });

        const combinedChart = buildCombinedChart(charts, rangeLabel);
        const ratioTables = buildRangeTables(rangeKeys, ratioUsageMap, productionMap);
        const ratioCombinedChart = buildRatioCombinedChart(ratioTables, rangeLabel, {
            lineRatioSeries,
            compareLabel,
            activeMonthKey,
            referenceMonthKey,
            categoryLabel: categoryOption.label
        });

        UtilSheetAnalysisState.gas.from = range.from;
        UtilSheetAnalysisState.gas.to = range.to;
        UtilSheetAnalysisState.gas.categoryKey = categoryOption.key;

        return {
            hasData: true,
            datasetKey: 'gas',
            categoryOption,
            range,
            rangeLabel,
            monthOptions,
            compareLabel,
            charts,
            combinedChart,
            ratioCombinedChart,
            ratioTables,
            summaryItems: charts.map(chart => ({
                key: chart.key,
                title: chart.title,
                valueText: chart.valueText,
                subText: chart.subText,
                icon: chart.icon,
                tone: chart.tone,
                metaText: chart.metaText
            }))
        };
    }

    globalScope.KPIUtilReportSheetAnalysisGasModel = Object.freeze({
        setRuntimeAdapters,
        buildUtilGasAnalysisModel
    });
})(typeof window !== 'undefined' ? window : globalThis);
