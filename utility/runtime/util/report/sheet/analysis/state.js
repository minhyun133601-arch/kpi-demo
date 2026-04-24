(function registerUtilReportSheetAnalysisState(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisState) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.analysis.state.js');
    }

    const {
        UtilSheetAnalysisState,
        UTIL_GAS_ANALYSIS_UNIT_OPTIONS,
        UTIL_GAS_ANALYSIS_DEFAULT_UNITS,
        UTIL_GAS_ANALYSIS_DEFAULT_DISPLAY_MODES,
        UTIL_GAS_ANALYSIS_RATIO_DEFAULT_DISPLAY_MODES,
        UTIL_ELECTRIC_ANALYSIS_UNIT_OPTIONS,
        UTIL_ELECTRIC_ANALYSIS_DEFAULT_UNITS,
        UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_UNIT_OPTIONS,
        UTIL_ELECTRIC_ANALYSIS_DEFAULT_DISPLAY_MODES,
        UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX
    } = utilReportSheetConfig;

    const runtime = {
        compareUtilSheetMonthKeys: null,
        formatUtilReportMonthShort: null,
        resolveUtilSheetReportDatasetKey: null,
        getUtilSheetCurrentAnalysisDatasetKey: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisState;
    }

    function compareMonthKeys(left, right) {
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

    function resolveReportDatasetKey(sheetType, datasetKey) {
        if (typeof runtime.resolveUtilSheetReportDatasetKey === 'function') {
            return runtime.resolveUtilSheetReportDatasetKey(sheetType, datasetKey);
        }
        return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    }

    function buildUtilSheetRangeLabel(fromKey = '', toKey = '') {
        if (!fromKey && !toKey) return '-';
        const fromLabel = formatMonthShort(fromKey);
        const toLabel = formatMonthShort(toKey);
        if (!fromKey || fromKey === toKey) return toLabel || fromLabel || '-';
        return `${fromLabel} ~ ${toLabel}`;
    }

    function normalizeUtilSheetAnalysisRange(monthOptions, fromValue = '', toValue = '', fallbackToValue = '') {
        const monthKeys = (Array.isArray(monthOptions) ? monthOptions : [])
            .map(item => String(item?.value || '').trim())
            .filter(Boolean)
            .sort(compareMonthKeys);
        if (!monthKeys.length) {
            return {
                from: '',
                to: '',
                monthKeys: []
            };
        }

        const safeTo = monthKeys.includes(toValue)
            ? toValue
            : (monthKeys.includes(fallbackToValue) ? fallbackToValue : monthKeys[monthKeys.length - 1]);
        let safeFrom = monthKeys.includes(fromValue) ? fromValue : monthKeys[0];
        if (compareMonthKeys(safeFrom, safeTo) > 0) {
            safeFrom = safeTo;
        }

        return {
            from: safeFrom,
            to: safeTo,
            monthKeys
        };
    }

    function buildUtilSheetRangeMonthKeys(monthOptions, fromValue = '', toValue = '') {
        return (Array.isArray(monthOptions) ? monthOptions : [])
            .map(item => String(item?.value || '').trim())
            .filter(value => value
                && compareMonthKeys(value, fromValue) >= 0
                && compareMonthKeys(value, toValue) <= 0);
    }

    function normalizeUtilSheetAnalysisDatasetKey(datasetKey = 'gas') {
        return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    }

    function isUtilSheetCustomAnalysisDataset(datasetKey = '') {
        const normalizedKey = String(datasetKey || '').trim();
        return normalizedKey === 'gas' || normalizedKey === 'electric';
    }

    function getUtilSheetAnalysisRangeState(datasetKey = 'gas') {
        const normalizedKey = normalizeUtilSheetAnalysisDatasetKey(datasetKey);
        return UtilSheetAnalysisState[normalizedKey] || UtilSheetAnalysisState.gas;
    }

    function setUtilSheetAnalysisRangeState(datasetKey = 'gas', fromValue = '', toValue = '') {
        const rangeState = getUtilSheetAnalysisRangeState(datasetKey);
        rangeState.from = String(fromValue || '').trim();
        rangeState.to = String(toValue || '').trim();
    }

    function setUtilSheetAnalysisToMonth(datasetKey = 'gas', monthKey = '') {
        const rangeState = getUtilSheetAnalysisRangeState(datasetKey);
        rangeState.to = String(monthKey || '').trim();
    }

    function normalizeUtilGasAnalysisFuelKey(fuelKey = '') {
        return String(fuelKey || '').trim().toLowerCase() === 'lpg' ? 'lpg' : 'lng';
    }

    function isUtilGasAnalysisFuelInactive(fuelKey = '') {
        const normalizedFuelKey = normalizeUtilGasAnalysisFuelKey(fuelKey);
        return UtilSheetAnalysisState.gas.inactiveFuels?.[normalizedFuelKey] === true;
    }

    function setUtilGasAnalysisFuelInactive(fuelKey = '', inactive = false) {
        const normalizedFuelKey = normalizeUtilGasAnalysisFuelKey(fuelKey);
        if (!UtilSheetAnalysisState.gas.inactiveFuels || typeof UtilSheetAnalysisState.gas.inactiveFuels !== 'object') {
            UtilSheetAnalysisState.gas.inactiveFuels = { lng: false, lpg: false };
        }
        UtilSheetAnalysisState.gas.inactiveFuels[normalizedFuelKey] = inactive === true;
    }

    function getUtilGasAnalysisUnitOptions(chartKey = '') {
        if (isUtilElectricAnalysisLineRatioKey(chartKey)) {
            return UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_UNIT_OPTIONS;
        }
        return Array.isArray(UTIL_GAS_ANALYSIS_UNIT_OPTIONS[chartKey])
            ? UTIL_GAS_ANALYSIS_UNIT_OPTIONS[chartKey]
            : [];
    }

    function normalizeUtilGasAnalysisUnitKey(chartKey = '', unitKey = '') {
        const options = getUtilGasAnalysisUnitOptions(chartKey);
        const raw = String(unitKey || '').trim().toLowerCase();
        if (options.some(option => option.key === raw)) return raw;
        if (isUtilElectricAnalysisLineRatioKey(chartKey)) return 'percent';
        return String(UTIL_GAS_ANALYSIS_DEFAULT_UNITS[chartKey] || options[0]?.key || '');
    }

    function getUtilGasAnalysisUnitOption(chartKey = '', unitKey = '') {
        const options = getUtilGasAnalysisUnitOptions(chartKey);
        const normalizedKey = normalizeUtilGasAnalysisUnitKey(chartKey, unitKey);
        return options.find(option => option.key === normalizedKey) || options[0] || { key: '', label: '', scale: 1, decimals: 0 };
    }

    function normalizeUtilGasAnalysisDisplayMode(displayMode = '') {
        const normalized = String(displayMode || '').trim().toLowerCase();
        if (normalized === 'line' || normalized === 'none') return normalized;
        return 'bar';
    }

    function isUtilGasAnalysisRatioSeriesKey(chartKey = '') {
        const normalizedKey = String(chartKey || '').trim().toLowerCase();
        return normalizedKey === 'ratio-lpg'
            || normalizedKey === 'ratio-lng'
            || normalizedKey.startsWith(String(UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX || '').trim().toLowerCase());
    }

    function getUtilGasAnalysisUnitKey(chartKey = '') {
        return normalizeUtilGasAnalysisUnitKey(chartKey, UtilSheetAnalysisState.gas.unitKeys?.[chartKey]);
    }

    function getUtilGasAnalysisDisplayMode(chartKey = '') {
        if (isUtilGasAnalysisRatioSeriesKey(chartKey)) {
            return normalizeUtilGasAnalysisDisplayMode(
                UtilSheetAnalysisState.gas.ratioDisplayModes?.[chartKey]
                || UTIL_GAS_ANALYSIS_RATIO_DEFAULT_DISPLAY_MODES[chartKey]
                || 'line'
            );
        }
        return normalizeUtilGasAnalysisDisplayMode(UtilSheetAnalysisState.gas.displayModes?.[chartKey] || UTIL_GAS_ANALYSIS_DEFAULT_DISPLAY_MODES[chartKey] || 'bar');
    }

    function getUtilGasAnalysisShowLabels(isFullscreenChart = false) {
        if (UtilSheetAnalysisState.gas.showLabels === true) return true;
        if (UtilSheetAnalysisState.gas.showLabels === false) return false;
        return isFullscreenChart === true;
    }

    function setUtilGasAnalysisUnitKey(chartKey = '', unitKey = '') {
        if (!chartKey) return;
        UtilSheetAnalysisState.gas.unitKeys[chartKey] = normalizeUtilGasAnalysisUnitKey(chartKey, unitKey);
    }

    function setUtilGasAnalysisDisplayMode(chartKey = '', displayMode = '') {
        if (!chartKey) return;
        if (isUtilGasAnalysisRatioSeriesKey(chartKey)) {
            UtilSheetAnalysisState.gas.ratioDisplayModes[chartKey] = normalizeUtilGasAnalysisDisplayMode(displayMode);
            return;
        }
        UtilSheetAnalysisState.gas.displayModes[chartKey] = normalizeUtilGasAnalysisDisplayMode(displayMode);
    }

    function setUtilGasAnalysisShowLabels(showLabels) {
        UtilSheetAnalysisState.gas.showLabels = showLabels === true;
    }

    function getUtilGasAnalysisRatioShowLabels() {
        return UtilSheetAnalysisState.gas.ratioShowLabels === true;
    }

    function setUtilGasAnalysisRatioShowLabels(showLabels) {
        UtilSheetAnalysisState.gas.ratioShowLabels = showLabels === true;
    }

    function getUtilGasAnalysisChartUnitLabel(chartKey = '', unitKey = getUtilGasAnalysisUnitKey(chartKey)) {
        return String(getUtilGasAnalysisUnitOption(chartKey, unitKey)?.label || '');
    }

    function getUtilGasAnalysisChartDecimals(chartKey = '', unitKey = getUtilGasAnalysisUnitKey(chartKey)) {
        return Number(getUtilGasAnalysisUnitOption(chartKey, unitKey)?.decimals) || 0;
    }

    function scaleUtilGasAnalysisChartValue(chartKey = '', value, unitKey = getUtilGasAnalysisUnitKey(chartKey)) {
        if (!Number.isFinite(value)) return NaN;
        const scale = Number(getUtilGasAnalysisUnitOption(chartKey, unitKey)?.scale) || 1;
        return value / scale;
    }

    function resolveUtilGasAnalysisPointValue(chart = {}, point = null, unitKey = '') {
        if (isUtilElectricAnalysisLineRatioKey(chart?.key)) {
            if (unitKey === 'kg' || unitKey === 'ton') {
                return Number(point?.amountValue);
            }
            return Number(point?.ratioValue);
        }
        return Number(point?.value);
    }

    function isUtilElectricAnalysisLineRatioKey(chartKey = '') {
        return String(chartKey || '').trim().startsWith(UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX);
    }

    function getUtilElectricAnalysisUnitOptions(chartKey = '') {
        if (isUtilElectricAnalysisLineRatioKey(chartKey)) {
            return UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_UNIT_OPTIONS;
        }
        return Array.isArray(UTIL_ELECTRIC_ANALYSIS_UNIT_OPTIONS[chartKey])
            ? UTIL_ELECTRIC_ANALYSIS_UNIT_OPTIONS[chartKey]
            : [];
    }

    function normalizeUtilElectricAnalysisUnitKey(chartKey = '', unitKey = '') {
        if (chartKey === 'electricIntensity') {
            const productionUnitKey = normalizeUtilElectricAnalysisUnitKey('production', UtilSheetAnalysisState.electric.unitKeys?.production);
            return productionUnitKey === 'ton' ? 'kwhton' : 'kwhkg';
        }
        if (isUtilElectricAnalysisLineRatioKey(chartKey)) {
            const options = getUtilElectricAnalysisUnitOptions(chartKey);
            const raw = String(unitKey || '').trim().toLowerCase();
            if (options.some(option => option.key === raw)) return raw;
            return 'percent';
        }
        const options = getUtilElectricAnalysisUnitOptions(chartKey);
        const raw = String(unitKey || '').trim().toLowerCase();
        if (options.some(option => option.key === raw)) return raw;
        return String(UTIL_ELECTRIC_ANALYSIS_DEFAULT_UNITS[chartKey] || options[0]?.key || '');
    }

    function getUtilElectricAnalysisUnitOption(chartKey = '', unitKey = '') {
        const options = getUtilElectricAnalysisUnitOptions(chartKey);
        const normalizedKey = normalizeUtilElectricAnalysisUnitKey(chartKey, unitKey);
        return options.find(option => option.key === normalizedKey) || options[0] || { key: '', label: '', scale: 1, decimals: 0 };
    }

    function getUtilElectricAnalysisUnitKey(chartKey = '') {
        return normalizeUtilElectricAnalysisUnitKey(chartKey, UtilSheetAnalysisState.electric.unitKeys?.[chartKey]);
    }

    function getUtilElectricAnalysisDisplayMode(chartKey = '') {
        const normalizedChartKey = String(chartKey || '').trim();
        const defaultDisplayMode = normalizedChartKey.startsWith(UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX)
            ? 'line'
            : (UTIL_ELECTRIC_ANALYSIS_DEFAULT_DISPLAY_MODES[chartKey] || 'bar');
        return normalizeUtilGasAnalysisDisplayMode(
            UtilSheetAnalysisState.electric.displayModes?.[chartKey]
            || defaultDisplayMode
        );
    }

    function getUtilElectricAnalysisShowLabels(chartKey = '', isFullscreenChart = false) {
        const stateKey = chartKey === 'electricIntensity' ? 'intensityShowLabels' : 'showLabels';
        if (UtilSheetAnalysisState.electric[stateKey] === true) return true;
        if (UtilSheetAnalysisState.electric[stateKey] === false) return false;
        return isFullscreenChart === true;
    }

    function setUtilElectricAnalysisUnitKey(chartKey = '', unitKey = '') {
        if (!chartKey) return;
        if (chartKey === 'electricIntensity') return;
        UtilSheetAnalysisState.electric.unitKeys[chartKey] = normalizeUtilElectricAnalysisUnitKey(chartKey, unitKey);
    }

    function setUtilElectricAnalysisDisplayMode(chartKey = '', displayMode = '') {
        if (!chartKey) return;
        UtilSheetAnalysisState.electric.displayModes[chartKey] = normalizeUtilGasAnalysisDisplayMode(displayMode);
    }

    function setUtilElectricAnalysisShowLabels(chartKey = '', showLabels) {
        const stateKey = chartKey === 'electricIntensity' ? 'intensityShowLabels' : 'showLabels';
        UtilSheetAnalysisState.electric[stateKey] = showLabels === true;
    }

    function getUtilElectricAnalysisChartUnitLabel(chartKey = '', unitKey = getUtilElectricAnalysisUnitKey(chartKey)) {
        return String(getUtilElectricAnalysisUnitOption(chartKey, unitKey)?.label || '');
    }

    function getUtilElectricAnalysisChartDecimals(chartKey = '', unitKey = getUtilElectricAnalysisUnitKey(chartKey)) {
        return Number(getUtilElectricAnalysisUnitOption(chartKey, unitKey)?.decimals) || 0;
    }

    function scaleUtilElectricAnalysisChartValue(chartKey = '', value, unitKey = getUtilElectricAnalysisUnitKey(chartKey)) {
        if (!Number.isFinite(value)) return NaN;
        const scale = Number(getUtilElectricAnalysisUnitOption(chartKey, unitKey)?.scale) || 1;
        return value / scale;
    }

    function getUtilSheetAnalysisShowLabels(datasetKey = 'gas', chartKey = '', isFullscreenChart = false) {
        return normalizeUtilSheetAnalysisDatasetKey(datasetKey) === 'electric'
            ? getUtilElectricAnalysisShowLabels(chartKey, isFullscreenChart)
            : getUtilGasAnalysisShowLabels(isFullscreenChart);
    }

    function setUtilSheetAnalysisShowLabels(datasetKey = 'gas', chartKey = '', showLabels) {
        if (normalizeUtilSheetAnalysisDatasetKey(datasetKey) === 'electric') {
            setUtilElectricAnalysisShowLabels(chartKey, showLabels);
            return;
        }
        setUtilGasAnalysisShowLabels(showLabels);
    }

    function setUtilSheetAnalysisUnitKey(datasetKey = 'gas', chartKey = '', unitKey = '') {
        if (normalizeUtilSheetAnalysisDatasetKey(datasetKey) === 'electric') {
            setUtilElectricAnalysisUnitKey(chartKey, unitKey);
            return;
        }
        setUtilGasAnalysisUnitKey(chartKey, unitKey);
    }

    function setUtilSheetAnalysisDisplayMode(datasetKey = 'gas', chartKey = '', displayMode = '') {
        if (normalizeUtilSheetAnalysisDatasetKey(datasetKey) === 'electric') {
            setUtilElectricAnalysisDisplayMode(chartKey, displayMode);
            return;
        }
        setUtilGasAnalysisDisplayMode(chartKey, displayMode);
    }

    function getUtilSheetActiveAnalysisDatasetKey(modal) {
        const fallbackDatasetKey = typeof runtime.getUtilSheetCurrentAnalysisDatasetKey === 'function'
            ? runtime.getUtilSheetCurrentAnalysisDatasetKey()
            : 'gas';
        return resolveReportDatasetKey(
            'analysis',
            modal?.dataset?.datasetKey || fallbackDatasetKey || 'gas'
        );
    }

    globalScope.KPIUtilReportSheetAnalysisState = {
        setRuntimeAdapters,
        buildUtilSheetRangeLabel,
        normalizeUtilSheetAnalysisRange,
        buildUtilSheetRangeMonthKeys,
        normalizeUtilSheetAnalysisDatasetKey,
        isUtilSheetCustomAnalysisDataset,
        getUtilSheetAnalysisRangeState,
        setUtilSheetAnalysisRangeState,
        setUtilSheetAnalysisToMonth,
        normalizeUtilGasAnalysisFuelKey,
        isUtilGasAnalysisFuelInactive,
        setUtilGasAnalysisFuelInactive,
        getUtilGasAnalysisUnitOptions,
        normalizeUtilGasAnalysisUnitKey,
        getUtilGasAnalysisUnitOption,
        normalizeUtilGasAnalysisDisplayMode,
        isUtilGasAnalysisRatioSeriesKey,
        getUtilGasAnalysisUnitKey,
        getUtilGasAnalysisDisplayMode,
        getUtilGasAnalysisShowLabels,
        setUtilGasAnalysisUnitKey,
        setUtilGasAnalysisDisplayMode,
        setUtilGasAnalysisShowLabels,
        getUtilGasAnalysisRatioShowLabels,
        setUtilGasAnalysisRatioShowLabels,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        scaleUtilGasAnalysisChartValue,
        resolveUtilGasAnalysisPointValue,
        isUtilElectricAnalysisLineRatioKey,
        getUtilElectricAnalysisUnitOptions,
        normalizeUtilElectricAnalysisUnitKey,
        getUtilElectricAnalysisUnitOption,
        getUtilElectricAnalysisUnitKey,
        getUtilElectricAnalysisDisplayMode,
        getUtilElectricAnalysisShowLabels,
        setUtilElectricAnalysisUnitKey,
        setUtilElectricAnalysisDisplayMode,
        setUtilElectricAnalysisShowLabels,
        getUtilElectricAnalysisChartUnitLabel,
        getUtilElectricAnalysisChartDecimals,
        scaleUtilElectricAnalysisChartValue,
        getUtilSheetAnalysisShowLabels,
        setUtilSheetAnalysisShowLabels,
        setUtilSheetAnalysisUnitKey,
        setUtilSheetAnalysisDisplayMode,
        getUtilSheetActiveAnalysisDatasetKey
    };
})(typeof window !== 'undefined' ? window : globalThis);
