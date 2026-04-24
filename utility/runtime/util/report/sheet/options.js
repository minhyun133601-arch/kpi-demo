(function registerUtilReportSheetOptions(globalScope) {
    if (globalScope.KPIUtilReportSheetOptions) {
        return;
    }

    const UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS = Object.freeze([
        Object.freeze({
            key: 'team_01_01',
            label: 'Line Alpha',
            reportTeamFilters: Object.freeze(['Line Alpha']),
            productionTeamNames: Object.freeze(['Line Alpha'])
        }),
        Object.freeze({
            key: 'team_01_02',
            label: 'Line Beta',
            reportTeamFilters: Object.freeze(['Line Beta']),
            productionTeamNames: Object.freeze(['Line Beta'])
        }),
        Object.freeze({
            key: 'team_02',
            label: 'Line Gamma',
            reportTeamFilters: Object.freeze(['Line Gamma']),
            productionTeamNames: Object.freeze(['Line Gamma'])
        }),
        Object.freeze({
            key: 'team_03',
            label: 'Line Delta',
            reportTeamFilters: Object.freeze(['Line Delta']),
            productionTeamNames: Object.freeze(['Line Delta'])
        }),
        Object.freeze({
            key: 'combined',
            label: '합산',
            reportTeamFilters: Object.freeze(['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta']),
            productionTeamNames: Object.freeze(['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta'])
        })
    ]);
    const UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS = Object.freeze([
        Object.freeze({
            key: 'team_01_01',
            label: 'Line Alpha',
            usageTeams: Object.freeze({
                lng: Object.freeze(['Line Alpha (LNG)']),
                lpg: Object.freeze([])
            }),
            productionTeamNames: Object.freeze(['Line Alpha']),
            ratioProductionTeamNames: Object.freeze({
                lng: Object.freeze(['Line Alpha']),
                lpg: Object.freeze([])
            }),
            meterScopeKey: '',
            includePlantBLngCost: true,
            includePlantALngCost: false,
            showLpgCard: false
        }),
        Object.freeze({
            key: 'team_01_02',
            label: 'Line Beta',
            usageTeams: Object.freeze({
                lng: Object.freeze(['Line Beta (LNG)']),
                lpg: Object.freeze(['Line Beta (LPG)'])
            }),
            productionTeamNames: Object.freeze(['Line Beta']),
            ratioProductionTeamNames: Object.freeze({
                lng: Object.freeze(['Line Beta']),
                lpg: Object.freeze(['Line Beta'])
            }),
            meterScopeKey: 'team_01_02',
            includePlantBLngCost: false,
            includePlantALngCost: true,
            showLpgCard: true
        }),
        Object.freeze({
            key: 'team_03',
            label: 'Line Delta',
            usageTeams: Object.freeze({
                lng: Object.freeze(['Line Delta (LNG)']),
                lpg: Object.freeze([])
            }),
            productionTeamNames: Object.freeze(['Line Delta']),
            ratioProductionTeamNames: Object.freeze({
                lng: Object.freeze(['Line Delta']),
                lpg: Object.freeze([])
            }),
            meterScopeKey: 'team_03',
            includePlantBLngCost: false,
            includePlantALngCost: true,
            showLpgCard: false
        }),
        Object.freeze({
            key: 'plantA',
            label: 'Plant A',
            selectLabel: 'Plant A (Line Beta + Line Delta 합산)',
            usageTeams: Object.freeze({
                lng: Object.freeze(['Line Beta (LNG)', 'Line Delta (LNG)']),
                lpg: Object.freeze(['Line Beta (LPG)'])
            }),
            productionTeamNames: Object.freeze(['Line Beta', 'Line Delta']),
            ratioProductionTeamNames: Object.freeze({
                lng: Object.freeze(['Line Beta', 'Line Delta']),
                lpg: Object.freeze(['Line Beta'])
            }),
            meterScopeKey: 'combined',
            includePlantBLngCost: false,
            includePlantALngCost: true,
            showLpgCard: true
        }),
        Object.freeze({
            key: 'combined',
            label: '합계',
            usageTeams: Object.freeze({
                lng: Object.freeze(['Line Alpha (LNG)', 'Line Beta (LNG)', 'Line Delta (LNG)']),
                lpg: Object.freeze(['Line Beta (LPG)'])
            }),
            productionTeamNames: Object.freeze(['Line Alpha', 'Line Beta', 'Line Delta']),
            ratioProductionTeamNames: Object.freeze({
                lng: Object.freeze(['Line Alpha', 'Line Beta', 'Line Delta']),
                lpg: Object.freeze(['Line Beta'])
            }),
            meterScopeKey: 'combined',
            includePlantBLngCost: true,
            includePlantALngCost: true,
            showLpgCard: true
        })
    ]);
    const UTIL_ELECTRIC_METER_TEAM_OPTIONS = Object.freeze([
        Object.freeze({
            key: 'team_01_02',
            label: 'Line Beta',
            reportTeamFilters: Object.freeze(['Line Beta']),
            productionTeamNames: Object.freeze(['Line Beta']),
            detailTeamKeys: Object.freeze(['team_01_02'])
        }),
        Object.freeze({
            key: 'team_02',
            label: 'Line Gamma',
            reportTeamFilters: Object.freeze(['Line Gamma']),
            productionTeamNames: Object.freeze(['Line Gamma']),
            detailTeamKeys: Object.freeze(['team_02'])
        }),
        Object.freeze({
            key: 'team_03',
            label: 'Line Delta',
            reportTeamFilters: Object.freeze(['Line Delta']),
            productionTeamNames: Object.freeze(['Line Delta']),
            detailTeamKeys: Object.freeze(['team_03'])
        }),
        Object.freeze({
            key: 'combined',
            label: '합산',
            reportTeamFilters: Object.freeze(['Line Beta', 'Line Gamma', 'Line Delta', 'Admin Area']),
            productionTeamNames: Object.freeze(['Line Beta', 'Line Gamma', 'Line Delta']),
            detailTeamKeys: Object.freeze(['team_01_02', 'team_02', 'team_03', 'team_04'])
        })
    ]);
    const UTIL_ELECTRIC_METER_TOTAL_POWER_FIELD_ID = 'field_24';
    const UTIL_ELECTRIC_METER_ACTIVE_POWER_FIELD_IDS = Object.freeze(['field_21', 'field_22', 'field_23']);
    const UTIL_ELECTRIC_METER_EXCLUDED_DETAIL_FIELD_IDS = new Set([
        'field_20',
        'field_21',
        'field_22',
        'field_23',
        'field_24',
        'field_25',
        'field_26',
        'field_27'
    ]);
    const UTIL_ELECTRIC_METER_FIELD_LABEL_OVERRIDES = Object.freeze({
        field_14: 'Line Gamma Compressor',
        field_15: 'Process Gamma#1',
        field_16: 'Process Gamma#2',
        field_24: '전력총량'
    });
    const UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS = Object.freeze({
        team_04: Object.freeze(['field_17', 'field_18', 'field_19', 'field_28'])
    });
    const UTIL_ELECTRIC_ALLOCATION_GROUPS = Object.freeze([
        Object.freeze({ key: 'zone', label: 'Process Alpha', caption: 'Exhaust Fan + Supply Fan + Process Alpha', sourceIds: Object.freeze(['field_01', 'field_02', 'field_03']) }),
        Object.freeze({ key: 'mixing', label: 'Process Delta', caption: '', sourceIds: Object.freeze(['field_04']) }),
        Object.freeze({ key: 'loading', label: 'Auto Loader', caption: '', sourceIds: Object.freeze(['field_05']) }),
        Object.freeze({ key: 'clean', label: 'Cleanroom', caption: '220v + 380v', sourceIds: Object.freeze(['field_08', 'field_09']) }),
        Object.freeze({ key: 'compressor', label: 'Compressor', caption: '220v + 380v', sourceIds: Object.freeze(['field_10', 'field_11']) }),
        Object.freeze({ key: 'boiler3t', label: 'Demo Boiler A', caption: '', sourceIds: Object.freeze(['field_06']) }),
        Object.freeze({ key: 'boilerB', label: 'Demo Boiler B', caption: '', sourceIds: Object.freeze(['field_07']) }),
        Object.freeze({ key: 'smallpack', label: 'Process Beta', caption: '', sourceIds: Object.freeze(['field_12']) }),
        Object.freeze({ key: 'stick', label: 'Process Beta', caption: '', sourceIds: Object.freeze(['field_13']) }),
        Object.freeze({ key: 'team2Compressor', label: 'Line Gamma Compressor', caption: '', sourceIds: Object.freeze(['field_14']) }),
        Object.freeze({ key: 'liquid', label: 'Process Gamma', caption: 'Process Gamma#1 + Process Gamma#2', sourceIds: Object.freeze(['field_15', 'field_16']) }),
        Object.freeze({ key: 'office', label: 'Admin Area', caption: '', sourceIds: Object.freeze(['field_17']) }),
        Object.freeze({ key: 'hvac', label: 'Admin Area HVAC', caption: '', sourceIds: Object.freeze(['field_18']) }),
        Object.freeze({ key: 'cafe', label: 'Break Area', caption: '', sourceIds: Object.freeze(['field_19']) })
    ]);
    const UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY = Object.freeze({
        'Line Beta': 'team_01_02',
        'Line Gamma': 'team_02',
        'Line Delta': 'team_03',
        'Admin Area': 'team_04'
    });
    const UTIL_ELECTRIC_TEAM_SUMMARY_OPTIONS = (() => {
        const officeLabel = Object.keys(UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY).find(label => (
            UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY[label] === 'team_04'
        )) || 'Admin Area';
        const baseTeamOptions = ['team_01_02', 'team_02', 'team_03'].map(teamKey => {
            const baseOption = UTIL_ELECTRIC_METER_TEAM_OPTIONS.find(option => option.key === teamKey);
            return Object.freeze({
                key: baseOption?.key || teamKey,
                label: baseOption?.label || teamKey,
                reportTeamFilters: Array.isArray(baseOption?.reportTeamFilters) ? baseOption.reportTeamFilters : Object.freeze([]),
                productionTeamNames: Array.isArray(baseOption?.productionTeamNames) ? baseOption.productionTeamNames : Object.freeze([])
            });
        });
        return Object.freeze(baseTeamOptions.concat([
            Object.freeze({
                key: 'team_04',
                label: officeLabel,
                reportTeamFilters: Object.freeze([officeLabel]),
                productionTeamNames: Object.freeze([])
            })
        ]));
    })();
    const UTIL_ELECTRIC_TEAM_COLOR_META = Object.freeze({
        team_01_02: Object.freeze({ color: '#f59e0b', soft: '#fffbeb' }),
        team_02: Object.freeze({ color: '#059669', soft: '#ecfdf5' }),
        team_03: Object.freeze({ color: '#7c3aed', soft: '#f5f3ff' }),
        team_04: Object.freeze({ color: '#dc2626', soft: '#fef2f2' }),
        combined: Object.freeze({ color: '#0f172a', soft: '#f8fafc' })
    });
    const UTIL_ELECTRIC_BILLING_SUMMARY_FIELDS = Object.freeze([
        Object.freeze({ key: 'base_charge', label: '기본요금' }),
        Object.freeze({ key: 'power_charge', label: '전력량요금' }),
        Object.freeze({ key: 'climate_environment_charge', label: '기후환경요금' }),
        Object.freeze({ key: 'fuel_adjustment_charge', label: '연료비조정액' }),
        Object.freeze({ key: 'lagging_power_factor_charge', label: '지상역률료' }),
        Object.freeze({ key: 'operation_fee', label: '조작수수료' }),
        Object.freeze({ key: 'internet_discount', label: '인터넷할인' }),
        Object.freeze({ key: 'electricity_charge_total', label: '전기요금계' }),
        Object.freeze({ key: 'vat', label: '부가가치세' }),
        Object.freeze({ key: 'electric_power_fund', label: '전력기금' }),
        Object.freeze({ key: 'tv_reception_fee', label: 'TV수신료' }),
        Object.freeze({ key: 'rounding_adjustment', label: '원단위 절삭' }),
        Object.freeze({ key: 'billing_amount', label: '청구금액' })
    ]);

    function normalizeUtilElectricMeterTeamKey(value = '') {
        const normalizedValue = String(value || '').trim();
        return UTIL_ELECTRIC_METER_TEAM_OPTIONS.some(option => option.key === normalizedValue)
            ? normalizedValue
            : 'combined';
    }

    function getUtilElectricMeterTeamOption(value = '') {
        const normalizedKey = normalizeUtilElectricMeterTeamKey(value);
        return UTIL_ELECTRIC_METER_TEAM_OPTIONS.find(option => option.key === normalizedKey)
            || UTIL_ELECTRIC_METER_TEAM_OPTIONS[UTIL_ELECTRIC_METER_TEAM_OPTIONS.length - 1];
    }

    function normalizeUtilElectricAnalysisTeamKey(value = '') {
        const normalizedValue = String(value || '').trim();
        return UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS.some(option => option.key === normalizedValue)
            ? normalizedValue
            : 'combined';
    }

    function getUtilElectricAnalysisTeamOption(value = '') {
        const normalizedKey = normalizeUtilElectricAnalysisTeamKey(value);
        return UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS.find(option => option.key === normalizedKey)
            || UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS[UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS.length - 1];
    }

    function normalizeUtilGasAnalysisCategoryKey(value = '') {
        const normalizedValue = String(value || '').trim();
        return UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS.some(option => option.key === normalizedValue)
            ? normalizedValue
            : 'plantA';
    }

    function getUtilGasAnalysisCategoryOption(value = '') {
        const normalizedKey = normalizeUtilGasAnalysisCategoryKey(value);
        return UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS.find(option => option.key === normalizedKey)
            || UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS[UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS.length - 1];
    }

    function normalizeUtilElectricMeterViewKey(value = '') {
        const normalizedValue = String(value || '').trim().toLowerCase();
        if (normalizedValue === 'allocation' || normalizedValue === 'team') return normalizedValue;
        return 'meter';
    }

    globalScope.KPIUtilReportSheetOptions = {
        UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS,
        UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS,
        UTIL_ELECTRIC_METER_TEAM_OPTIONS,
        UTIL_ELECTRIC_METER_TOTAL_POWER_FIELD_ID,
        UTIL_ELECTRIC_METER_ACTIVE_POWER_FIELD_IDS,
        UTIL_ELECTRIC_METER_EXCLUDED_DETAIL_FIELD_IDS,
        UTIL_ELECTRIC_METER_FIELD_LABEL_OVERRIDES,
        UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS,
        UTIL_ELECTRIC_ALLOCATION_GROUPS,
        UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY,
        UTIL_ELECTRIC_TEAM_SUMMARY_OPTIONS,
        UTIL_ELECTRIC_TEAM_COLOR_META,
        UTIL_ELECTRIC_BILLING_SUMMARY_FIELDS,
        normalizeUtilElectricMeterTeamKey,
        getUtilElectricMeterTeamOption,
        normalizeUtilElectricAnalysisTeamKey,
        getUtilElectricAnalysisTeamOption,
        normalizeUtilGasAnalysisCategoryKey,
        getUtilGasAnalysisCategoryOption,
        normalizeUtilElectricMeterViewKey
    };
})(typeof window !== 'undefined' ? window : globalThis);
