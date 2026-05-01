(function registerUtilReportSheetConfig(globalScope) {
    if (globalScope.KPIUtilReportSheetConfig) {
        return;
    }

    const UTIL_SHEET_CUTOFF = '2026-02';
    const utilSheetNumberFormatter = new Intl.NumberFormat('ko-KR');
    const UTIL_SHEET_DATASET_SPECS = {
        gas: {
            key: 'gas',
            label: '가스비',
            scopeKey: 'gas',
            usageKey: 'gasUsage',
            costKey: 'gasCost',
            unitKey: 'gasUnit',
            usageUnit: 'Nm3',
            color: '#f97316'
        },
        electric: {
            key: 'electric',
            label: '전력비',
            scopeKey: 'electric',
            usageKey: 'electricUsage',
            costKey: 'electricCost',
            unitKey: 'electricUnit',
            usageUnit: 'kWh',
            color: '#2563eb'
        }
    };
    const UTIL_SHEET_TYPE_SPECS = {
        meter: {
            key: 'meter',
            title: '검침표',
            description: '가스비 검침표와 전력비 검침표를 한 화면에서 전환합니다.',
            buttonLabel: '이동'
        },
        analysis: {
            key: 'analysis',
            title: '분석표',
            description: '가스비 분석표와 전력비 분석표를 한 화면에서 전환합니다.',
            buttonLabel: '이동'
        }
    };
    const UtilSheetReportState = {
        meter: 'gas',
        analysis: 'gas'
    };
    const UtilSheetReportMonthState = {
        meter: '',
        analysis: ''
    };
    const UtilSheetCompareState = {
        meter: 'month',
        analysis: 'month'
    };
    const UtilSheetMeterState = {
        gasProductionKey: 'combined',
        electricTeamKey: 'combined',
        electricViewKey: 'meter'
    };
    const UtilSheetRuntimeState = {
        gasMeteringPromise: null,
        gasDataSyncPromise: null,
        gasDataSyncedOnce: false,
        electricMeteringPromise: null,
        electricDataSyncPromise: null,
        electricDataSyncedOnce: false,
        electricMeterStructureCache: null,
        electricSnapshotRowsCache: null
    };
    const UtilSheetAnalysisState = {
        gas: {
            from: '',
            to: '',
            categoryKey: 'plantA',
            showLabels: null,
            ratioShowLabels: false,
            inactiveFuels: {
                lng: false,
                lpg: false
            },
            unitKeys: {
                lpgUsage: 'ton',
                lngUsage: 'km3',
                gasCost: 'million',
                production: 'ton'
            },
            displayModes: {
                lpgUsage: 'bar',
                lngUsage: 'bar',
                gasCost: 'line',
                production: 'line'
            },
            ratioDisplayModes: {
                'ratio-lpg': 'line',
                'ratio-lng': 'line'
            }
        },
        electric: {
            from: '',
            to: '',
            teamKey: 'combined',
            showLabels: null,
            intensityShowLabels: null,
            unitKeys: {
                electricUsage: 'mwh',
                electricCost: 'million',
                production: 'ton',
                electricIntensity: 'kwhkg'
            },
            displayModes: {
                electricUsage: 'bar',
                electricCost: 'line',
                production: 'line',
                electricIntensity: 'line'
            }
        }
    };
    const UtilSheetDetachedReportState = {
        win: null
    };
    const UtilSheetAnalysisChartPopupState = {
        win: null,
        chartKey: '',
        datasetKey: 'gas'
    };
    const UTIL_GAS_ANALYSIS_UNIT_OPTIONS = Object.freeze({
        lpgUsage: Object.freeze([
            { key: 'kg', label: 'kg', scale: 1, decimals: 0 },
            { key: 'ton', label: '톤', scale: 1000, decimals: 1 }
        ]),
        lngUsage: Object.freeze([
            { key: 'm3', label: 'm³', scale: 1, decimals: 0 },
            { key: 'km3', label: '천m³', scale: 1000, decimals: 1 }
        ]),
        gasCost: Object.freeze([
            { key: 'krw', label: '원', scale: 1, decimals: 0 },
            { key: 'thousand', label: '천원', scale: 1000, decimals: 1 },
            { key: 'million', label: '백만원', scale: 1000000, decimals: 1 }
        ]),
        production: Object.freeze([
            { key: 'kg', label: 'kg', scale: 1, decimals: 0 },
            { key: 'ton', label: '톤', scale: 1000, decimals: 1 }
        ])
    });
    const UTIL_GAS_ANALYSIS_DEFAULT_UNITS = Object.freeze({
        lpgUsage: 'ton',
        lngUsage: 'km3',
        gasCost: 'million',
        production: 'ton'
    });
    const UTIL_GAS_ANALYSIS_DEFAULT_DISPLAY_MODES = Object.freeze({
        lpgUsage: 'bar',
        lngUsage: 'bar',
        gasCost: 'line',
        production: 'line'
    });
    const UTIL_GAS_ANALYSIS_RATIO_DEFAULT_DISPLAY_MODES = Object.freeze({
        'ratio-lpg': 'line',
        'ratio-lng': 'line'
    });
    const UTIL_ELECTRIC_ANALYSIS_UNIT_OPTIONS = Object.freeze({
        electricUsage: Object.freeze([
            { key: 'kwh', label: 'kWh', scale: 1, decimals: 0 },
            { key: 'mwh', label: 'MWh', scale: 1000, decimals: 1 }
        ]),
        electricCost: Object.freeze([
            { key: 'krw', label: '원', scale: 1, decimals: 0 },
            { key: 'thousand', label: '천원', scale: 1000, decimals: 1 },
            { key: 'million', label: '백만원', scale: 1000000, decimals: 1 }
        ]),
        production: Object.freeze([
            { key: 'kg', label: 'kg', scale: 1, decimals: 0 },
            { key: 'ton', label: 'ton', scale: 1000, decimals: 1 }
        ]),
        electricIntensity: Object.freeze([
            { key: 'kwhkg', label: 'kWh/kg', scale: 1, decimals: 3 },
            { key: 'kwhton', label: 'kWh/ton', scale: 0.001, decimals: 1 }
        ])
    });
    const UTIL_ELECTRIC_ANALYSIS_DEFAULT_UNITS = Object.freeze({
        electricUsage: 'mwh',
        electricCost: 'million',
        production: 'ton',
        electricIntensity: 'kwhkg'
    });
    const UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_UNIT_OPTIONS = Object.freeze([
        Object.freeze({ key: 'percent', label: '%', scale: 1, decimals: 1 }),
        Object.freeze({ key: 'kg', label: 'kg', scale: 1, decimals: 0 }),
        Object.freeze({ key: 'ton', label: 'ton', scale: 1000, decimals: 1 })
    ]);
    const UTIL_ELECTRIC_ANALYSIS_DEFAULT_DISPLAY_MODES = Object.freeze({
        electricUsage: 'bar',
        electricCost: 'line',
        production: 'line',
        electricIntensity: 'line'
    });
    const UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX = 'productionLineRatio::';
    const UTIL_GAS_ANALYSIS_DISPLAY_OPTIONS = Object.freeze([
        { key: 'bar', label: '막대' },
        { key: 'line', label: '선' },
        { key: 'none', label: '표시없음' }
    ]);
    const UTIL_GAS_METER_FIELD_ORDER = Object.freeze([
        'gas_field_01',
        'gas_field_02',
        'gas_field_03',
        'gas_field_04',
        'gas_field_05',
        'gas_field_06'
    ]);
    const UTIL_GAS_METER_FIELD_LABELS = Object.freeze({
        gas_field_01: 'Line Gamma LNG 합계',
        gas_field_02: 'Demo Heater (LPG)',
        gas_field_03: 'Demo Boiler A',
        gas_field_04: 'Demo Boiler B',
        gas_field_05: 'Admin Area',
        gas_field_06: 'Process Gamma보일러'
    });
    const UTIL_GAS_METER_LPG_FACTOR = 3.35;
    const UTIL_GAS_METER_CORRECTION_TARGET_IDS = new Set(['gas_field_03', 'gas_field_04', 'gas_field_06']);
    const UTIL_GAS_BILLING_SCOPE_KEYS = Object.freeze({
        plantB: 'gas_plantB',
        plantALng: 'plantA_lng',
        plantALpg: 'plantA_lpg'
    });
    const UTIL_ELECTRIC_BILLING_DOCUMENT_DIRECTORY = '전기 청구서';
    const UTIL_GAS_BILLING_DOCUMENT_DIRECTORY = '가스 청구서';
    const UTIL_GAS_BILLING_ASSET_BASE_DIRECTORY = 'utility/apps/metering';
    const UTIL_ELECTRIC_BILLING_SCOPE_LABELS = Object.freeze({
        plantA: 'Plant A',
        plantB: 'Plant B'
    });
    const UTIL_GAS_BILLING_SCOPE_LABELS = Object.freeze({
        [UTIL_GAS_BILLING_SCOPE_KEYS.plantB]: 'Plant B',
        [UTIL_GAS_BILLING_SCOPE_KEYS.plantALng]: 'LNG',
        [UTIL_GAS_BILLING_SCOPE_KEYS.plantALpg]: 'LPG'
    });
    const UTIL_GAS_RATIO_CHART_COLORS = Object.freeze([
        '#ea580c',
        '#2563eb',
        '#16a34a',
        '#7c3aed'
    ]);
    const UTIL_GAS_METER_FIELD_ICONS = Object.freeze({
        gas_field_01: 'fa-fire-flame-curved',
        gas_field_02: 'fa-fan',
        gas_field_03: 'fa-fire-burner',
        gas_field_04: 'fa-industry',
        gas_field_05: 'fa-building',
        gas_field_06: 'fa-oil-can'
    });

    globalScope.KPIUtilReportSheetConfig = {
        UTIL_SHEET_CUTOFF,
        utilSheetNumberFormatter,
        UTIL_SHEET_DATASET_SPECS,
        UTIL_SHEET_TYPE_SPECS,
        UtilSheetReportState,
        UtilSheetReportMonthState,
        UtilSheetCompareState,
        UtilSheetMeterState,
        UtilSheetRuntimeState,
        UtilSheetAnalysisState,
        UtilSheetDetachedReportState,
        UtilSheetAnalysisChartPopupState,
        UTIL_GAS_ANALYSIS_UNIT_OPTIONS,
        UTIL_GAS_ANALYSIS_DEFAULT_UNITS,
        UTIL_GAS_ANALYSIS_DEFAULT_DISPLAY_MODES,
        UTIL_GAS_ANALYSIS_RATIO_DEFAULT_DISPLAY_MODES,
        UTIL_ELECTRIC_ANALYSIS_UNIT_OPTIONS,
        UTIL_ELECTRIC_ANALYSIS_DEFAULT_UNITS,
        UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_UNIT_OPTIONS,
        UTIL_ELECTRIC_ANALYSIS_DEFAULT_DISPLAY_MODES,
        UTIL_ELECTRIC_ANALYSIS_LINE_RATIO_PREFIX,
        UTIL_GAS_ANALYSIS_DISPLAY_OPTIONS,
        UTIL_GAS_METER_FIELD_ORDER,
        UTIL_GAS_METER_FIELD_LABELS,
        UTIL_GAS_METER_LPG_FACTOR,
        UTIL_GAS_METER_CORRECTION_TARGET_IDS,
        UTIL_GAS_BILLING_SCOPE_KEYS,
        UTIL_ELECTRIC_BILLING_DOCUMENT_DIRECTORY,
        UTIL_GAS_BILLING_DOCUMENT_DIRECTORY,
        UTIL_GAS_BILLING_ASSET_BASE_DIRECTORY,
        UTIL_ELECTRIC_BILLING_SCOPE_LABELS,
        UTIL_GAS_BILLING_SCOPE_LABELS,
        UTIL_GAS_RATIO_CHART_COLORS,
        UTIL_GAS_METER_FIELD_ICONS
    };
})(typeof window !== 'undefined' ? window : globalThis);
