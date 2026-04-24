(function registerUtilReportSheetGasScopedMetrics(globalScope) {
    if (globalScope.KPIUtilReportSheetGasScopedMetrics) {
        return;
    }

    const runtime = {
        getUtilGasBillingScopeKeys: null,
        getUtilGasAnalysisCategoryOption: null,
        isUtilGasAnalysisFuelInactive: null,
        getUtilGasBillingScopeFields: null,
        parseUtilGasMeterNumber: null,
        buildUtilGasMeterFieldDefinitions: null,
        buildUtilGasMeterTimelineMap: null,
        buildUtilGasMeterMonthTable: null,
        buildUtilGasBillingSummaryModel: null,
        sumUtilGasMeterColumnValues: null,
        parseUtilMonthValue: null,
        sumUtilReportMetric: null,
        getUtilGasEntries: null,
        getUtilDailyProductionValue: null
    };

    const UTIL_GAS_ANALYSIS_USAGE_TEAMS = Object.freeze({
        lpg: Object.freeze(['Line Beta (LPG)']),
        lng: Object.freeze(['Line Beta (LNG)', 'Line Delta (LNG)'])
    });

    const UTIL_GAS_ANALYSIS_PRODUCTION_START_DAY = 1;
    const UTIL_GAS_ANALYSIS_PRODUCTION_TEAMS = Object.freeze({
        lpg: Object.freeze(['Line Beta']),
        lng: Object.freeze(['Line Beta', 'Line Delta'])
    });
    const UTIL_GAS_METER_TOTAL_PRODUCTION_TEAMS = Object.freeze(['Line Beta', 'Line Delta']);
    const UTIL_GAS_METER_TOTAL_LNG_FIELD_IDS = Object.freeze(['gas_field_03', 'gas_field_04', 'gas_field_06']);
    const UTIL_GAS_METER_PRODUCTION_OPTIONS = Object.freeze([
        Object.freeze({
            key: 'team_01_02',
            label: 'Line Beta',
            teamNames: Object.freeze(['Line Beta']),
            usageTeams: Object.freeze({
                lpg: Object.freeze(['Line Beta (LPG)']),
                lng: Object.freeze(['Line Beta (LNG)'])
            }),
            lngFieldIds: Object.freeze(['gas_field_03', 'gas_field_04']),
            hasLpg: true,
            icon: 'fa-people-group'
        }),
        Object.freeze({
            key: 'team_03',
            label: 'Line Delta',
            teamNames: Object.freeze(['Line Delta']),
            usageTeams: Object.freeze({
                lpg: Object.freeze([]),
                lng: Object.freeze(['Line Delta (LNG)'])
            }),
            lngFieldIds: Object.freeze(['gas_field_06']),
            hasLpg: false,
            icon: 'fa-industry'
        }),
        Object.freeze({
            key: 'combined',
            label: '합산',
            teamNames: UTIL_GAS_METER_TOTAL_PRODUCTION_TEAMS,
            usageTeams: Object.freeze({
                lpg: Object.freeze(['Line Beta (LPG)']),
                lng: Object.freeze(['Line Beta (LNG)', 'Line Delta (LNG)'])
            }),
            lngFieldIds: UTIL_GAS_METER_TOTAL_LNG_FIELD_IDS,
            hasLpg: true,
            icon: 'fa-industry'
        })
    ]);

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetGasScopedMetrics;
    }

    function getGasEntries() {
        if (typeof runtime.getUtilGasEntries === 'function') {
            const entries = runtime.getUtilGasEntries();
            if (Array.isArray(entries)) {
                return entries;
            }
        }
        return [];
    }

    function parseMonthValue(monthKey = '') {
        if (typeof runtime.parseUtilMonthValue === 'function') {
            return runtime.parseUtilMonthValue(monthKey);
        }
        return null;
    }

    function sumReportMetric(entries, yearValue, monthValue, teamName, metricKey = 'usage') {
        if (typeof runtime.sumUtilReportMetric === 'function') {
            return runtime.sumUtilReportMetric(entries, yearValue, monthValue, teamName, metricKey);
        }
        return NaN;
    }

    function getGasCategoryOption(categoryOption = null) {
        if (typeof runtime.getUtilGasAnalysisCategoryOption === 'function') {
            return runtime.getUtilGasAnalysisCategoryOption(categoryOption?.key || categoryOption);
        }
        return categoryOption && typeof categoryOption === 'object'
            ? categoryOption
            : {
                key: String(categoryOption || '').trim(),
                usageTeams: {},
                productionTeamNames: [],
                ratioProductionTeamNames: {},
                includePlantBLngCost: false,
                includePlantALngCost: false,
                showLpgCard: false
            };
    }

    function isGasFuelInactive(fuelKey = '') {
        if (typeof runtime.isUtilGasAnalysisFuelInactive === 'function') {
            return runtime.isUtilGasAnalysisFuelInactive(fuelKey);
        }
        return false;
    }

    function getGasBillingScopeKeys() {
        if (typeof runtime.getUtilGasBillingScopeKeys === 'function') {
            return runtime.getUtilGasBillingScopeKeys() || {};
        }
        return {};
    }

    function getGasBillingScopeFields(monthKey = '', scopeKey = '') {
        if (typeof runtime.getUtilGasBillingScopeFields === 'function') {
            return runtime.getUtilGasBillingScopeFields(monthKey, scopeKey) || {};
        }
        return {};
    }

    function parseGasMeterNumber(value) {
        if (typeof runtime.parseUtilGasMeterNumber === 'function') {
            return runtime.parseUtilGasMeterNumber(value);
        }
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : NaN;
    }

    function buildGasMeterFieldDefinitions() {
        if (typeof runtime.buildUtilGasMeterFieldDefinitions === 'function') {
            return runtime.buildUtilGasMeterFieldDefinitions() || [];
        }
        return [];
    }

    function buildGasMeterTimelineMap(fieldDefs = []) {
        if (typeof runtime.buildUtilGasMeterTimelineMap === 'function') {
            return runtime.buildUtilGasMeterTimelineMap(fieldDefs) || new Map();
        }
        return new Map();
    }

    function buildGasMeterMonthTable(monthKey = '', fieldDefs = [], timelineMap = new Map()) {
        if (typeof runtime.buildUtilGasMeterMonthTable === 'function') {
            return runtime.buildUtilGasMeterMonthTable(monthKey, fieldDefs, timelineMap) || null;
        }
        return null;
    }

    function buildGasBillingSummaryModel(monthKey = '', monthTable = null) {
        if (typeof runtime.buildUtilGasBillingSummaryModel === 'function') {
            return runtime.buildUtilGasBillingSummaryModel(monthKey, monthTable) || null;
        }
        return null;
    }

    function sumGasMeterColumnValues(columns = [], valueKey = '', fieldIds = []) {
        if (typeof runtime.sumUtilGasMeterColumnValues === 'function') {
            return runtime.sumUtilGasMeterColumnValues(columns, valueKey, fieldIds);
        }
        return NaN;
    }

    function getDailyProductionValue(teamName = '', yearValue = 0, monthValue = 0, options = {}) {
        if (typeof runtime.getUtilDailyProductionValue === 'function') {
            return runtime.getUtilDailyProductionValue(teamName, yearValue, monthValue, options) || null;
        }
        return null;
    }

    function getUtilGasMeterProductionOptions() {
        return UTIL_GAS_METER_PRODUCTION_OPTIONS;
    }

    function getUtilGasAnalysisProductionStartDay() {
        return UTIL_GAS_ANALYSIS_PRODUCTION_START_DAY;
    }

    function normalizeUtilGasMeterProductionKey(value = '') {
        const normalizedValue = String(value || '').trim();
        return UTIL_GAS_METER_PRODUCTION_OPTIONS.some(option => option.key === normalizedValue)
            ? normalizedValue
            : 'combined';
    }

    function getUtilGasMeterProductionOption(value = '') {
        const normalizedKey = normalizeUtilGasMeterProductionKey(value);
        return UTIL_GAS_METER_PRODUCTION_OPTIONS.find(option => option.key === normalizedKey)
            || UTIL_GAS_METER_PRODUCTION_OPTIONS[UTIL_GAS_METER_PRODUCTION_OPTIONS.length - 1];
    }

    function getUtilGasAnalysisTeamUsageValue(monthKey = '', teamNames = []) {
        const parsed = parseMonthValue(monthKey);
        const sourceTeams = Array.isArray(teamNames) ? teamNames.filter(Boolean) : [];
        if (!parsed || !sourceTeams.length) return NaN;

        const entries = getGasEntries();
        let total = 0;
        let hasValue = false;
        sourceTeams.forEach(teamName => {
            let value = NaN;
            if (entries.length && typeof runtime.sumUtilReportMetric === 'function') {
                value = Number(sumReportMetric(entries, parsed.year, parsed.month, teamName, 'usage'));
            } else if (entries.length) {
                value = entries.reduce((sum, entry) => {
                    if (Number(entry?.year) !== parsed.year || Number(entry?.month) !== parsed.month) return sum;
                    if (String(entry?.team || '').trim() !== String(teamName).trim()) return sum;
                    const usage = Number(entry?.usage);
                    return Number.isFinite(usage) ? sum + usage : sum;
                }, 0);
            }
            if (!Number.isFinite(value)) return;
            total += value;
            hasValue = true;
        });
        return hasValue ? total : NaN;
    }

    function buildUtilGasAnalysisRatioUsageMap(monthKeys = []) {
        const usageMap = new Map();
        const normalizedMonthKeys = Array.isArray(monthKeys)
            ? monthKeys.map(monthKey => String(monthKey || '').trim()).filter(Boolean)
            : [];

        normalizedMonthKeys.forEach(monthKey => {
            usageMap.set(monthKey, {
                lpg: getUtilGasAnalysisTeamUsageValue(monthKey, UTIL_GAS_ANALYSIS_USAGE_TEAMS.lpg),
                lng: getUtilGasAnalysisTeamUsageValue(monthKey, UTIL_GAS_ANALYSIS_USAGE_TEAMS.lng)
            });
        });
        return usageMap;
    }

    function getUtilGasMeterScopedUsageMetric(monthKey = '', fuelKey = 'lng', scopeOption = null) {
        const option = scopeOption && typeof scopeOption === 'object'
            ? scopeOption
            : getUtilGasMeterProductionOption(scopeOption);
        const teamNames = Array.isArray(option?.usageTeams?.[fuelKey])
            ? option.usageTeams[fuelKey].filter(Boolean)
            : [];
        if (!teamNames.length) return 0;
        const value = getUtilGasAnalysisTeamUsageValue(monthKey, teamNames);
        return Number.isFinite(value) ? value : 0;
    }

    function getUtilGasMeterScopedCost(summary, table, fuelKey = 'lng', scopeOption = null) {
        const option = scopeOption && typeof scopeOption === 'object'
            ? scopeOption
            : getUtilGasMeterProductionOption(scopeOption);
        if (fuelKey === 'lpg') {
            const lpgAmount = Number(summary?.lpg?.totalAmount);
            if (!option?.hasLpg) return 0;
            return Number.isFinite(lpgAmount) ? lpgAmount : null;
        }

        const lngAmount = Number(summary?.lng?.totalAmount);
        if (!Number.isFinite(lngAmount)) return null;
        if (normalizeUtilGasMeterProductionKey(option?.key) === 'combined') {
            return lngAmount;
        }

        const columns = Array.isArray(table?.columns) ? table.columns : [];
        const totalCorrectedUsage = sumGasMeterColumnValues(columns, 'correctedUsage', UTIL_GAS_METER_TOTAL_LNG_FIELD_IDS);
        const scopedCorrectedUsage = sumGasMeterColumnValues(columns, 'correctedUsage', option?.lngFieldIds || []);
        if (Number.isFinite(scopedCorrectedUsage) && scopedCorrectedUsage === 0) return 0;
        if (!Number.isFinite(scopedCorrectedUsage) || !(Number.isFinite(totalCorrectedUsage) && totalCorrectedUsage > 0)) {
            return null;
        }
        return (lngAmount * scopedCorrectedUsage) / totalCorrectedUsage;
    }

    function getUtilGasProductionMetric(monthKey = '', teamNames = []) {
        const parsed = parseMonthValue(monthKey);
        if (!parsed) return NaN;
        const sourceTeams = Array.isArray(teamNames) ? teamNames.filter(Boolean) : [];
        if (!sourceTeams.length) return NaN;

        let total = 0;
        let hasValue = false;
        sourceTeams.forEach(teamName => {
            const daily = getDailyProductionValue(teamName, parsed.year, parsed.month, {
                startDay: UTIL_GAS_ANALYSIS_PRODUCTION_START_DAY
            });
            const value = Number(daily?.value);
            if (!Number.isFinite(value)) return;
            total += value;
            hasValue = true;
        });
        return hasValue ? total : NaN;
    }

    function getUtilGasAnalysisProductionValue(monthKey = '', teamNames = []) {
        return getUtilGasProductionMetric(monthKey, teamNames);
    }

    function buildUtilGasAnalysisProductionMap(monthKeys = []) {
        const productionMap = new Map();
        const normalizedMonthKeys = Array.isArray(monthKeys)
            ? monthKeys.map(monthKey => String(monthKey || '').trim()).filter(Boolean)
            : [];

        normalizedMonthKeys.forEach(monthKey => {
            productionMap.set(monthKey, {
                lpg: getUtilGasAnalysisProductionValue(monthKey, UTIL_GAS_ANALYSIS_PRODUCTION_TEAMS.lpg),
                lng: getUtilGasAnalysisProductionValue(monthKey, UTIL_GAS_ANALYSIS_PRODUCTION_TEAMS.lng)
            });
        });
        return productionMap;
    }

    function getUtilGasAnalysisPlantBBillingAmount(monthKey = '') {
        const scopeKeys = getGasBillingScopeKeys();
        const fields = getGasBillingScopeFields(monthKey, scopeKeys.plantB);
        return parseGasMeterNumber(fields?.billing_amount);
    }

    function buildUtilGasAnalysisMetricMap(monthKeys = [], categoryOption = null) {
        const option = getGasCategoryOption(categoryOption);
        const normalizedMonthKeys = Array.isArray(monthKeys)
            ? monthKeys.map(monthKey => String(monthKey || '').trim()).filter(Boolean)
            : [];
        const metricMap = new Map();
        const needsMeterScope = option.includePlantALngCost || option.showLpgCard;
        const fieldDefs = needsMeterScope ? buildGasMeterFieldDefinitions() : [];
        const timelineMap = needsMeterScope ? buildGasMeterTimelineMap(fieldDefs) : new Map();
        const meterScopeOption = option.meterScopeKey
            ? getUtilGasMeterProductionOption(option.meterScopeKey)
            : null;
        const buildFiniteSum = values => {
            const normalizedValues = (Array.isArray(values) ? values : []).filter(Number.isFinite);
            if (!normalizedValues.length) return null;
            return normalizedValues.reduce((sum, value) => sum + value, 0);
        };

        normalizedMonthKeys.forEach(monthKey => {
            const monthTable = needsMeterScope ? buildGasMeterMonthTable(monthKey, fieldDefs, timelineMap) : null;
            const billingSummary = needsMeterScope ? buildGasBillingSummaryModel(monthKey, monthTable) : null;
            const lngUsage = getUtilGasAnalysisTeamUsageValue(monthKey, option.usageTeams?.lng || []);
            const lpgUsage = option.showLpgCard
                ? getUtilGasAnalysisTeamUsageValue(monthKey, option.usageTeams?.lpg || [])
                : NaN;
            const production = getUtilGasAnalysisProductionValue(monthKey, option.productionTeamNames || []);
            const lngRatioProduction = getUtilGasAnalysisProductionValue(monthKey, option.ratioProductionTeamNames?.lng || []);
            const lpgRatioProduction = option.showLpgCard
                ? getUtilGasAnalysisProductionValue(monthKey, option.ratioProductionTeamNames?.lpg || [])
                : NaN;
            const lngCost = buildFiniteSum([
                option.includePlantBLngCost ? getUtilGasAnalysisPlantBBillingAmount(monthKey) : null,
                option.includePlantALngCost
                    ? getUtilGasMeterScopedCost(billingSummary, monthTable, 'lng', meterScopeOption)
                    : null
            ]);
            const lpgCost = option.showLpgCard
                ? getUtilGasMeterScopedCost(billingSummary, monthTable, 'lpg', meterScopeOption)
                : null;
            const activeCostValues = [];
            if (!isGasFuelInactive('lng') && Number.isFinite(lngCost)) {
                activeCostValues.push(lngCost);
            }
            if (option.showLpgCard && !isGasFuelInactive('lpg') && Number.isFinite(lpgCost)) {
                activeCostValues.push(lpgCost);
            }
            const gasCost = (
                isGasFuelInactive('lng')
                && (!option.showLpgCard || isGasFuelInactive('lpg'))
            )
                ? 0
                : buildFiniteSum(activeCostValues);

            metricMap.set(monthKey, {
                lngUsage,
                lpgUsage,
                production,
                ratioProduction: {
                    lng: lngRatioProduction,
                    lpg: lpgRatioProduction
                },
                lngCost,
                lpgCost,
                gasCost
            });
        });

        return metricMap;
    }

    globalScope.KPIUtilReportSheetGasScopedMetrics = Object.freeze({
        setRuntimeAdapters,
        getUtilGasAnalysisProductionStartDay,
        getUtilGasMeterProductionOptions,
        normalizeUtilGasMeterProductionKey,
        getUtilGasMeterProductionOption,
        getUtilGasAnalysisTeamUsageValue,
        buildUtilGasAnalysisRatioUsageMap,
        getUtilGasMeterScopedUsageMetric,
        getUtilGasMeterScopedCost,
        getUtilGasProductionMetric,
        getUtilGasAnalysisProductionValue,
        buildUtilGasAnalysisProductionMap,
        getUtilGasAnalysisPlantBBillingAmount,
        buildUtilGasAnalysisMetricMap
    });
})(globalThis);
