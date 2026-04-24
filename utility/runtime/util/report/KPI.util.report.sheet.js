(function registerUtilSheetReports() {
    const utilReportSheetConfig = globalThis.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.js');
    }
    const {
        UTIL_SHEET_CUTOFF,
        utilSheetNumberFormatter,
        UTIL_SHEET_DATASET_SPECS,
        UTIL_SHEET_TYPE_SPECS,
        UtilSheetReportState,
        UtilSheetReportMonthState,
        UtilSheetCompareState,
        UtilSheetMeterState,
        UtilSheetRuntimeState,
        UtilSheetDetachedReportState,
        UtilSheetAnalysisChartPopupState,
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
    } = utilReportSheetConfig;
    const utilReportSheetOptions = globalThis.KPIUtilReportSheetOptions;
    if (!utilReportSheetOptions) {
        throw new Error('KPIUtilReportSheetOptions must load before KPI.util.report.sheet.js');
    }
    const {
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
    } = utilReportSheetOptions;
    const utilReportSheetControls = globalThis.KPIUtilReportSheetControls;
    if (!utilReportSheetControls) {
        throw new Error('KPIUtilReportSheetControls must load before KPI.util.report.sheet.js');
    }
    const utilReportSheetBilling = globalThis.KPIUtilReportSheetBilling;
    if (!utilReportSheetBilling) {
        throw new Error('KPIUtilReportSheetBilling must load before KPI.util.report.sheet.js');
    }
    utilReportSheetBilling.setRuntimeAdapters({
        getGasMeteringStore: () => getUtilGasMeteringStore(),
        getElectricMeteringStore: () => getUtilElectricMeteringStore(),
        getLocalAppStore: () => window.__LOCAL_APP_STORE__ || null,
        isPlainObject: (value) => isUtilSheetPlainObject(value),
        formatMonthLabel: (monthKey) => (
            typeof formatUtilReportMonthLong === 'function'
                ? formatUtilReportMonthLong(monthKey || '')
                : String(monthKey || '')
        )
    });
    const {
        getUtilGasBillingSettlementEntries,
        getUtilGasBillingScopeFields,
        getUtilGasBillingDocuments,
        getUtilElectricBillingDocuments,
        isUtilGasBillingDocumentLeafRecord,
        getUtilGasBillingDocument,
        getUtilElectricBillingDocument,
        normalizeUtilGasBillingDocumentRelativePath,
        getUtilGasBillingDocumentFileNameFromPath,
        buildUtilGasBillingDocumentRelativePath,
        normalizeUtilGasBillingDocumentAssetRelativePath,
        getUtilGasBillingDocumentMimeTypeFromFileName,
        getUtilGasBillingDocumentMimeType,
        isUtilGasBillingImageDocument,
        buildUtilGasBillingDocumentDataUrl,
        encodeUtilGasBillingDocumentRelativePath,
        resolveUtilSheetAssetUrl,
        resolveUtilGasBillingDocumentUrl,
        resolveUtilGasBillingDocumentDownloadUrl,
        resolveUtilGasBillingDocumentDescriptor,
        resolveUtilElectricBillingDocumentDescriptor,
        resolveUtilSheetBillingDocumentDescriptor,
        buildUtilSheetBillingPreviewModalHtml,
        resetUtilSheetBillingPreviewModal,
        closeUtilSheetBillingPreview,
        ensureUtilSheetBillingPreviewModal,
        openUtilSheetBillingPreview
    } = utilReportSheetBilling;
    const utilReportSheetGasComparisonSummary = globalThis.KPIUtilReportSheetGasComparisonSummary;
    if (!utilReportSheetGasComparisonSummary) {
        throw new Error('KPIUtilReportSheetGasComparisonSummary must load before KPI.util.report.sheet.js');
    }
    utilReportSheetGasComparisonSummary.setRuntimeAdapters({
        escapeUtilSheetHtml,
        formatUtilSheetCost,
        formatUtilSheetInteger,
        formatUtilReportMonthLong,
        parseUtilGasMeterNumber: (...args) => parseUtilGasMeterNumber(...args),
        getUtilGasBillingScopeFields: (...args) => getUtilGasBillingScopeFields(...args),
        resolveUtilGasBillingDocumentDescriptor: (...args) => resolveUtilGasBillingDocumentDescriptor(...args)
    });
    const {
        getUtilGasMeterColumn,
        sumUtilGasMeterColumnValues,
        buildUtilGasBillingSummaryModel,
        buildUtilGasMeterComparisonSectionHtml
    } = utilReportSheetGasComparisonSummary;
    const utilReportSheetGasScopedMetrics = globalThis.KPIUtilReportSheetGasScopedMetrics;
    if (!utilReportSheetGasScopedMetrics) {
        throw new Error('KPIUtilReportSheetGasScopedMetrics must load before KPI.util.report.sheet.js');
    }
    utilReportSheetGasScopedMetrics.setRuntimeAdapters({
        getUtilGasBillingScopeKeys: () => UTIL_GAS_BILLING_SCOPE_KEYS,
        getUtilGasAnalysisCategoryOption,
        isUtilGasAnalysisFuelInactive: (...args) => isUtilGasAnalysisFuelInactive(...args),
        getUtilGasBillingScopeFields: (...args) => getUtilGasBillingScopeFields(...args),
        parseUtilGasMeterNumber: (...args) => parseUtilGasMeterNumber(...args),
        buildUtilGasMeterFieldDefinitions,
        buildUtilGasMeterTimelineMap,
        buildUtilGasMeterMonthTable,
        buildUtilGasBillingSummaryModel,
        sumUtilGasMeterColumnValues,
        parseUtilMonthValue,
        sumUtilReportMetric: typeof sumUtilReportMetric === 'function' ? sumUtilReportMetric : null,
        getUtilGasEntries: () => (Array.isArray(UTIL_GAS_ENTRIES) ? UTIL_GAS_ENTRIES : []),
        getUtilDailyProductionValue: typeof getUtilDailyProductionValue === 'function' ? getUtilDailyProductionValue : null
    });
    const {
        getUtilGasAnalysisProductionStartDay,
        getUtilGasMeterProductionOptions,
        normalizeUtilGasMeterProductionKey,
        getUtilGasMeterProductionOption,
        getUtilGasMeterScopedUsageMetric,
        getUtilGasMeterScopedCost,
        getUtilGasProductionMetric,
        buildUtilGasAnalysisMetricMap
    } = utilReportSheetGasScopedMetrics;
    const utilReportSheetGasRuntimeSync = globalThis.KPIUtilReportSheetGasRuntimeSync;
    if (!utilReportSheetGasRuntimeSync) {
        throw new Error('KPIUtilReportSheetGasRuntimeSync must load before KPI.util.report.sheet.js');
    }
    utilReportSheetGasRuntimeSync.setRuntimeAdapters({
        syncUtilGasDataFromMetering: typeof globalThis.syncUtilGasDataFromMetering === 'function'
            ? (...args) => globalThis.syncUtilGasDataFromMetering(...args)
            : null
    });
    const {
        ensureUtilGasReportDataSync
    } = utilReportSheetGasRuntimeSync;
    utilReportSheetControls.setRuntimeAdapters({
        escapeUtilSheetHtml,
        normalizeUtilGasMeterProductionKey,
        getUtilGasMeterProductionOptions: () => getUtilGasMeterProductionOptions()
    });
    const {
        buildUtilElectricMeterViewToggleHtml
    } = utilReportSheetControls;
    const utilReportSheetElectricRuntimeSync = globalThis.KPIUtilReportSheetElectricRuntimeSync;
    if (!utilReportSheetElectricRuntimeSync) {
        throw new Error('KPIUtilReportSheetElectricRuntimeSync must load before KPI.util.report.sheet.js');
    }
    utilReportSheetElectricRuntimeSync.setRuntimeAdapters({
        getUtilMeteringDataset,
        ensureUtilMeteringDataset,
        isUtilSheetPlainObject,
        syncUtilElectricDataFromMetering: typeof globalThis.syncUtilElectricDataFromMetering === 'function'
            ? (...args) => globalThis.syncUtilElectricDataFromMetering(...args)
            : null
    });
    const {
        getUtilElectricMeteringStore,
        hasUtilElectricMeteringStore,
        ensureUtilElectricMeteringStore,
        getUtilElectricUtilitySnapshot,
        ensureUtilElectricReportDataSync
    } = utilReportSheetElectricRuntimeSync;
    const utilReportSheetElectricMeterModel = globalThis.KPIUtilReportSheetElectricMeterModel;
    if (!utilReportSheetElectricMeterModel) {
        throw new Error('KPIUtilReportSheetElectricMeterModel must load before KPI.util.report.sheet.js');
    }
    utilReportSheetElectricMeterModel.setRuntimeAdapters({
        getUtilElectricMeteringStore: () => getUtilElectricMeteringStore(),
        hasUtilElectricMeteringStore: () => hasUtilElectricMeteringStore(),
        getUtilElectricUtilitySnapshot,
        parseUtilGasMeterNumber: (...args) => parseUtilGasMeterNumber(...args),
        normalizeUtilGasMeterDate: (...args) => normalizeUtilGasMeterDate(...args),
        isUtilSheetPlainObject,
        compareUtilSheetMonthKeys,
        shiftUtilSheetMonthKey: (...args) => shiftUtilSheetMonthKey(...args),
        normalizeUtilSheetCompareKey: (...args) => normalizeUtilSheetCompareKey(...args),
        buildUtilSheetMonthBounds,
        buildUtilReportMonthlyRows: typeof buildUtilReportMonthlyRows === 'function'
            ? (...args) => buildUtilReportMonthlyRows(...args)
            : null,
        getUtilGasProductionMetric: (...args) => getUtilGasProductionMetric(...args)
    });
    const {
        buildUtilElectricMeterFieldDefinitions,
        buildUtilElectricMeterTimelineMap,
        buildUtilElectricMeterMonthTable,
        buildUtilElectricScopedDatasetResult,
        buildUtilElectricMeterTeamDatasetResult,
        buildUtilElectricMeterComparisonModel
    } = utilReportSheetElectricMeterModel;
    const utilReportSheetElectricComparisonSummary = globalThis.KPIUtilReportSheetElectricComparisonSummary;
    if (!utilReportSheetElectricComparisonSummary) {
        throw new Error('KPIUtilReportSheetElectricComparisonSummary must load before KPI.util.report.sheet.js');
    }
    utilReportSheetElectricComparisonSummary.setRuntimeAdapters({
        getUtilElectricMeteringStore: () => getUtilElectricMeteringStore(),
        getLocalAppStore: () => window.__LOCAL_APP_STORE__ || null,
        isUtilSheetPlainObject,
        parseUtilGasMeterNumber: (...args) => parseUtilGasMeterNumber(...args),
        buildUtilElectricMeterTeamDatasetResult,
        buildUtilElectricScopedDatasetResult,
        normalizeUtilSheetCompareKey: (...args) => normalizeUtilSheetCompareKey(...args),
        shiftUtilSheetMonthKey: (...args) => shiftUtilSheetMonthKey(...args),
        buildUtilElectricMeterViewToggleHtml: (...args) => buildUtilElectricMeterViewToggleHtml(...args),
        resolveUtilSheetBillingDocumentDescriptor,
        escapeUtilSheetHtml,
        formatUtilReportMonthLong,
        formatUtilSheetCost,
        formatUtilSheetDecimal,
        formatUtilSheetInteger,
        formatUtilSheetSignedCost,
        formatUtilSheetSignedInteger,
        formatUtilSheetQuantity
    });
    const {
        buildUtilElectricBillingSummaryModel,
        buildUtilElectricMeterComparisonSectionHtml
    } = utilReportSheetElectricComparisonSummary;
    const utilReportSheetPanelRuntime = globalThis.KPIUtilReportSheetPanelRuntime;
    if (!utilReportSheetPanelRuntime) {
        throw new Error('KPIUtilReportSheetPanelRuntime must load before KPI.util.report.sheet.js');
    }
    const {
        normalizeUtilSheetCompareKey,
        normalizeUtilSheetType,
        getUtilSheetAlternateType,
        getUtilSheetCompareLabel,
        buildUtilSheetDetachedCompareToggleHtml,
        syncUtilSheetCompareButtons,
        resolveUtilSheetReportDatasetKey,
        getUtilSheetAlternateDatasetKey,
        pruneUtilSheetDatasetToggles,
        getUtilSheetPresentation,
        syncUtilSheetTypeButtons,
        syncUtilSheetDatasetButtons,
        syncUtilSheetPanelChrome,
        syncUtilSheetPanelSelection,
        relocateUtilGasGuidanceNote,
        initUtilSheetReports
    } = utilReportSheetPanelRuntime;
    const utilReportSheetPanelPreview = globalThis.KPIUtilReportSheetPanelPreview;
    if (!utilReportSheetPanelPreview) {
        throw new Error('KPIUtilReportSheetPanelPreview must load before KPI.util.report.sheet.js');
    }
    utilReportSheetPanelPreview.setRuntimeAdapters({
        escapeUtilSheetHtml,
        buildUtilSheetMonthBounds,
        buildUtilReportMonthlyRows,
        isUtilSheetSettledRow,
        summarizeUtilSheetRows,
        formatUtilReportMonthLong,
        parseUtilMonthValue
    });
    const {
        buildUtilSheetDatasetResult,
        renderUtilSheetPanel
    } = utilReportSheetPanelPreview;
    utilReportSheetPanelRuntime.setRuntimeAdapters({
        escapeUtilSheetHtml,
        renderUtilSheetPanel
    });
    const utilReportSheetWindows = globalThis.KPIUtilReportSheetWindows;
    if (!utilReportSheetWindows) {
        throw new Error('KPIUtilReportSheetWindows must load before KPI.util.report.sheet.js');
    }
    const utilReportSheetModalActions = globalThis.KPIUtilReportSheetModalActions;
    if (!utilReportSheetModalActions) {
        throw new Error('KPIUtilReportSheetModalActions must load before KPI.util.report.sheet.js');
    }
    const utilReportSheetModalShell = globalThis.KPIUtilReportSheetModalShell;
    if (!utilReportSheetModalShell) {
        throw new Error('KPIUtilReportSheetModalShell must load before KPI.util.report.sheet.js');
    }
    const utilReportSheetModalRender = globalThis.KPIUtilReportSheetModalRender;
    if (!utilReportSheetModalRender) {
        throw new Error('KPIUtilReportSheetModalRender must load before KPI.util.report.sheet.js');
    }
    const utilReportSheetAnalysisState = globalThis.KPIUtilReportSheetAnalysisState;
    if (!utilReportSheetAnalysisState) {
        throw new Error('KPIUtilReportSheetAnalysisState must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisState.setRuntimeAdapters({
        compareUtilSheetMonthKeys,
        formatUtilReportMonthShort,
        resolveUtilSheetReportDatasetKey,
        getUtilSheetCurrentAnalysisDatasetKey: () => UtilSheetReportState.analysis
    });
    const {
        buildUtilSheetRangeLabel,
        normalizeUtilSheetAnalysisRange,
        buildUtilSheetRangeMonthKeys,
        normalizeUtilSheetAnalysisDatasetKey,
        isUtilSheetCustomAnalysisDataset,
        getUtilSheetAnalysisRangeState,
        setUtilSheetAnalysisRangeState,
        setUtilSheetAnalysisToMonth,
        isUtilGasAnalysisFuelInactive,
        setUtilGasAnalysisFuelInactive,
        getUtilGasAnalysisUnitOptions,
        normalizeUtilGasAnalysisDisplayMode,
        isUtilGasAnalysisRatioSeriesKey,
        getUtilGasAnalysisUnitKey,
        getUtilGasAnalysisDisplayMode,
        getUtilGasAnalysisShowLabels,
        setUtilGasAnalysisRatioShowLabels,
        getUtilGasAnalysisRatioShowLabels,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        scaleUtilGasAnalysisChartValue,
        resolveUtilGasAnalysisPointValue,
        isUtilElectricAnalysisLineRatioKey,
        getUtilElectricAnalysisUnitOptions,
        getUtilElectricAnalysisUnitOption,
        getUtilElectricAnalysisUnitKey,
        getUtilElectricAnalysisDisplayMode,
        getUtilElectricAnalysisShowLabels,
        getUtilElectricAnalysisChartUnitLabel,
        getUtilElectricAnalysisChartDecimals,
        scaleUtilElectricAnalysisChartValue,
        getUtilSheetAnalysisShowLabels,
        setUtilSheetAnalysisShowLabels,
        setUtilSheetAnalysisUnitKey,
        setUtilSheetAnalysisDisplayMode,
        getUtilSheetActiveAnalysisDatasetKey
    } = utilReportSheetAnalysisState;
    const utilReportSheetAnalysisCompareSelect = globalThis.KPIUtilReportSheetAnalysisCompareSelect;
    if (!utilReportSheetAnalysisCompareSelect) {
        throw new Error('KPIUtilReportSheetAnalysisCompareSelect must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisCompareSelect.setRuntimeAdapters({
        formatUtilReportMonthShort,
        getUtilGasAnalysisCategoryOption,
        isUtilGasAnalysisFuelInactive,
        getUtilSheetActiveAnalysisDatasetKey
    });
    const {
        buildUtilGasAnalysisCostModeText,
        buildUtilGasAnalysisCompareSub,
        resolveUtilSheetAnalysisLabelToggleContext
    } = utilReportSheetAnalysisCompareSelect;
    const utilReportSheetAnalysisChartControls = globalThis.KPIUtilReportSheetAnalysisChartControls;
    if (!utilReportSheetAnalysisChartControls) {
        throw new Error('KPIUtilReportSheetAnalysisChartControls must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisChartControls.setRuntimeAdapters({
        escapeUtilSheetHtml,
        formatUtilReportMonthLong,
        formatUtilLabelWithUnit: typeof formatUtilLabelWithUnit === 'function' ? formatUtilLabelWithUnit : null,
        getUtilGasAnalysisUnitKey,
        getUtilGasAnalysisDisplayMode,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        getUtilGasAnalysisUnitOptions,
        scaleUtilGasAnalysisChartValue
    });
    const {
        buildUtilGasAnalysisSeriesLabel,
        buildUtilGasAnalysisCombinedChart,
        buildUtilGasAnalysisCombinedControlsHtml,
        buildUtilGasAnalysisSeriesControlHtml,
        buildUtilGasAnalysisPopupOnlyControlHtml,
        buildUtilGasAnalysisRatioTableControlHtml
    } = utilReportSheetAnalysisChartControls;
    const utilReportSheetAnalysisRangeRatio = globalThis.KPIUtilReportSheetAnalysisRangeRatio;
    if (!utilReportSheetAnalysisRangeRatio) {
        throw new Error('KPIUtilReportSheetAnalysisRangeRatio must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisRangeRatio.setRuntimeAdapters({
        compareUtilSheetMonthKeys,
        formatUtilReportMonthShort,
        getUtilGasAnalysisDisplayMode,
        getUtilGasAnalysisUnitKey,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        getUtilGasAnalysisUnitOptions,
        scaleUtilGasAnalysisChartValue,
        buildUtilGasAnalysisCompareSub,
        formatUtilSheetRatio,
        formatUtilSheetPercent,
        formatUtilElectricAnalysisLineMetricValue: (...args) => formatUtilElectricAnalysisLineMetricValue(...args),
        formatUtilElectricAnalysisSignedLineMetric: (...args) => formatUtilElectricAnalysisSignedLineMetric(...args),
        renderUtilMultiSeriesChart: typeof renderUtilMultiSeriesChart === 'function' ? renderUtilMultiSeriesChart : null
    });
    const {
        buildUtilGasAnalysisRangeTables,
        buildUtilGasAnalysisRatioCombinedChartModel
    } = utilReportSheetAnalysisRangeRatio;
    const utilReportSheetAnalysisElectricModel = globalThis.KPIUtilReportSheetAnalysisElectricModel;
    if (!utilReportSheetAnalysisElectricModel) {
        throw new Error('KPIUtilReportSheetAnalysisElectricModel must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisElectricModel.setRuntimeAdapters({
        getUtilElectricAnalysisTeamOption,
        buildUtilSheetMonthBounds,
        isUtilSheetSettledRow,
        compareUtilSheetMonthKeys,
        summarizeUtilSheetRows,
        getUtilSheetAnalysisRangeState,
        normalizeUtilSheetCompareKey,
        normalizeUtilSheetAnalysisRange,
        buildUtilSheetRangeMonthKeys,
        buildUtilSheetRangeLabel,
        shiftUtilSheetMonthKey,
        getUtilSheetCompareLabel,
        buildUtilGasAnalysisCompareSub,
        formatUtilSheetQuantity,
        formatUtilSheetSignedQuantity,
        formatUtilSheetCost,
        formatUtilSheetSignedCost,
        getUtilElectricAnalysisUnitKey,
        getUtilElectricAnalysisChartUnitLabel,
        getUtilElectricAnalysisChartDecimals,
        scaleUtilElectricAnalysisChartValue,
        formatUtilSheetDecimal,
        getUtilElectricAnalysisUnitOption,
        formatUtilSheetPercent,
        formatUtilSheetSignedPercentPoint,
        getUtilElectricAnalysisDisplayMode,
        getUtilElectricAnalysisUnitOptions,
        buildUtilGasAnalysisSeriesLabel,
        setUtilSheetAnalysisRangeState
    });
    const {
        buildUtilElectricAnalysisLineRatioSeries,
        formatUtilElectricAnalysisLineMetricValue,
        formatUtilElectricAnalysisSignedLineMetric,
        resolveUtilElectricAnalysisPointValue,
        buildUtilElectricAnalysisModel
    } = utilReportSheetAnalysisElectricModel;
    const utilReportSheetAnalysisGasModel = globalThis.KPIUtilReportSheetAnalysisGasModel;
    if (!utilReportSheetAnalysisGasModel) {
        throw new Error('KPIUtilReportSheetAnalysisGasModel must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisGasModel.setRuntimeAdapters({
        buildUtilSheetMonthBounds,
        hasUtilGasMeteringStore,
        normalizeUtilSheetCompareKey,
        getUtilGasAnalysisCategoryOption,
        normalizeUtilSheetAnalysisRange,
        buildUtilSheetRangeMonthKeys,
        buildUtilSheetRangeLabel,
        buildUtilGasAnalysisMetricMap,
        shiftUtilSheetMonthKey,
        buildUtilElectricAnalysisLineRatioSeries,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        isUtilGasAnalysisFuelInactive,
        buildUtilGasAnalysisCompareSub,
        formatUtilSheetQuantity,
        formatUtilSheetSignedQuantity,
        formatUtilSheetCost,
        formatUtilSheetSignedCost,
        buildUtilGasAnalysisCostModeText,
        buildUtilGasAnalysisCombinedChart,
        buildUtilGasAnalysisRangeTables,
        buildUtilGasAnalysisRatioCombinedChartModel
    });
    const {
        buildUtilGasAnalysisModel
    } = utilReportSheetAnalysisGasModel;
    const utilReportSheetAnalysisPopupTables = globalThis.KPIUtilReportSheetAnalysisPopupTables;
    if (!utilReportSheetAnalysisPopupTables) {
        throw new Error('KPIUtilReportSheetAnalysisPopupTables must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisPopupTables.setRuntimeAdapters({
        escapeUtilSheetHtml,
        buildUtilGasAnalysisRatioTableControlHtml,
        formatUtilSheetRatio,
        formatUtilSheetDecimal,
        normalizeUtilSheetAnalysisDatasetKey,
        getUtilElectricAnalysisUnitKey,
        getUtilElectricAnalysisChartUnitLabel,
        getUtilElectricAnalysisChartDecimals,
        scaleUtilElectricAnalysisChartValue,
        resolveUtilElectricAnalysisPointValue,
        getUtilGasAnalysisUnitKey,
        getUtilGasAnalysisChartUnitLabel,
        getUtilGasAnalysisChartDecimals,
        scaleUtilGasAnalysisChartValue,
        resolveUtilGasAnalysisPointValue,
        getUtilSheetActiveAnalysisDatasetKey
    });
    const {
        buildUtilGasAnalysisRangeTableHtml,
        getUtilGasAnalysisInlineRatioTableKey,
        buildUtilGasAnalysisFloatingTablePanelHtml,
        getUtilGasAnalysisChartModelByKey,
        parseUtilGasAnalysisRatioTablePopupKey,
        getUtilGasAnalysisRatioTableByKey,
        normalizeUtilGasAnalysisPopupKey,
        isUtilGasAnalysisChartRenderable,
        normalizeUtilGasAnalysisFullscreenChartKey
    } = utilReportSheetAnalysisPopupTables;
    const utilReportSheetAnalysisRender = globalThis.KPIUtilReportSheetAnalysisRender;
    if (!utilReportSheetAnalysisRender) {
        throw new Error('KPIUtilReportSheetAnalysisRender must load before KPI.util.report.sheet.js');
    }
    utilReportSheetAnalysisRender.setRuntimeAdapters({
        escapeUtilSheetHtml,
        buildUtilGasAnalysisCombinedControlsHtml,
        normalizeUtilSheetAnalysisDatasetKey,
        getUtilSheetAnalysisShowLabels,
        getUtilGasAnalysisRatioShowLabels,
        buildUtilGasAnalysisSeriesControlHtml,
        buildUtilGasAnalysisPopupOnlyControlHtml,
        getUtilGasAnalysisInlineRatioTableKey,
        buildUtilGasAnalysisFloatingTablePanelHtml
    });
    const {
        buildUtilGasAnalysisChartCardHtml,
        buildUtilGasAnalysisChartCardHtmlV2,
        buildUtilGasAnalysisRatioCombinedChartCardHtmlV2,
        buildUtilSheetAnalysisSummaryGridHtml,
        buildUtilGasAnalysisBodyHtmlV2,
        buildUtilElectricAnalysisBodyHtmlV2,
        buildUtilGasAnalysisBodyHtml
    } = utilReportSheetAnalysisRender;
    const utilReportSheetSummaryRender = globalThis.KPIUtilReportSheetSummaryRender;
    if (!utilReportSheetSummaryRender) {
        throw new Error('KPIUtilReportSheetSummaryRender must load before KPI.util.report.sheet.js');
    }
    utilReportSheetSummaryRender.setRuntimeAdapters({
        escapeUtilSheetHtml,
        normalizeUtilSheetCompareKey,
        buildUtilSheetCompareSub,
        getUtilSheetCompareLabel,
        shiftUtilSheetMonthKey,
        getUtilGasMeterProductionOption,
        getUtilGasMeterScopedUsageMetric,
        getUtilGasMeterScopedCost,
        getUtilGasProductionMetric,
        getUtilGasMeterColumn,
        buildUtilGasAnalysisCompareSub,
        buildUtilElectricMeterTeamDatasetResult,
        getUtilElectricMeterTeamOption,
        buildUtilSheetAnalysisSummaryGridHtml,
        calculateUtilSheetPercentDelta,
        formatUtilSheetSignedPercent,
        getGasAnalysisProductionStartDay: () => getUtilGasAnalysisProductionStartDay(),
        formatUtilReportMonthShort,
        formatUtilReportMonthLong,
        formatUtilSheetQuantity,
        formatUtilSheetSignedQuantity,
        formatUtilSheetInteger,
        formatUtilSheetCost,
        formatUtilSheetSignedCost,
        formatUtilSheetUnit,
        formatUtilSheetSignedUnit
    });
    const {
        buildUtilSheetCompareMeta,
        resolveUtilSheetMemoItems,
        buildUtilGasMeterSummaryItems,
        buildUtilElectricMeterSummaryItems,
        buildUtilSheetBadgesHtml,
        buildUtilGasMeterSummaryBlockHtml,
        buildUtilElectricMeterSummaryBlockHtml,
        buildUtilSheetStatsHtml,
        buildUtilSheetMatrixHtml,
        buildUtilSheetMemoSectionHtml
    } = utilReportSheetSummaryRender;
    utilReportSheetModalRender.setRuntimeAdapters({
        normalizeUtilSheetType,
        resolveUtilSheetReportDatasetKey,
        getUtilSheetPresentation,
        normalizeUtilSheetCompareKey,
        normalizeUtilGasMeterProductionKey,
        normalizeUtilGasAnalysisCategoryKey,
        normalizeUtilElectricMeterTeamKey,
        normalizeUtilElectricAnalysisTeamKey,
        normalizeUtilElectricMeterViewKey,
        buildUtilSheetDatasetResult,
        pruneUtilSheetDatasetToggles,
        isUtilSheetCustomAnalysisDataset,
        syncUtilSheetTypeButtons,
        syncUtilSheetDatasetButtons,
        syncUtilSheetCompareButtons,
        escapeUtilSheetHtml,
        syncUtilSheetAnalysisChartPopup: (...args) => utilReportSheetWindows.syncUtilSheetAnalysisChartPopup(...args),
        syncUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.syncUtilSheetDetachedReportWindow(...args),
        syncUtilSheetReportWindowState: (...args) => utilReportSheetWindows.syncUtilSheetReportWindowState(...args),
        ensureUtilElectricReportDataSync,
        ensureUtilGasReportDataSync,
        ensureUtilGasMeteringStore,
        ensureUtilElectricMeteringStore,
        getUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.getUtilSheetDetachedReportWindow(...args),
        getUtilElectricUtilitySnapshot,
        hasUtilElectricMeteringStore,
        buildUtilGasAnalysisModel,
        normalizeUtilGasAnalysisFullscreenChartKey,
        getUtilGasAnalysisInlineRatioTableKey,
        buildUtilGasAnalysisBodyHtmlV2,
        buildUtilSheetMemoSectionHtml,
        buildUtilSheetCompareMeta,
        buildUtilGasMeterComparisonModel,
        resolveUtilSheetMemoItems,
        bindUtilSheetAnalysisChartDragScroll: (...args) => utilReportSheetWindows.bindUtilSheetAnalysisChartDragScroll(...args),
        bindUtilSheetAnalysisInlineTableDrag: (...args) => utilReportSheetWindows.bindUtilSheetAnalysisInlineTableDrag(...args),
        buildUtilElectricAnalysisModel,
        buildUtilElectricAnalysisBodyHtmlV2,
        buildUtilElectricMeterComparisonModel,
        buildUtilElectricMeterTeamDatasetResult,
        buildUtilGasMeterSummaryItems,
        buildUtilElectricMeterSummaryItems,
        buildUtilSheetBadgesHtml,
        buildUtilElectricMeterSummaryBlockHtml,
        buildUtilGasMeterSummaryBlockHtml,
        buildUtilSheetStatsHtml,
        buildUtilGasMeterComparisonSectionHtml,
        buildUtilElectricMeterComparisonSectionHtml,
        buildUtilSheetMatrixHtml,
        relocateUtilGasGuidanceNote
    });
    const {
        rerenderUtilSheetReportModalIfActive,
        renderUtilSheetReportModal
    } = utilReportSheetModalRender;
    utilReportSheetModalActions.setRuntimeAdapters({
        normalizeUtilSheetCompareKey,
        normalizeUtilSheetType,
        resolveUtilSheetReportDatasetKey,
        normalizeUtilGasMeterProductionKey,
        normalizeUtilElectricMeterTeamKey,
        normalizeUtilElectricAnalysisTeamKey,
        normalizeUtilGasAnalysisCategoryKey,
        normalizeUtilElectricMeterViewKey,
        getUtilGasAnalysisInlineRatioTableKey,
        normalizeUtilGasAnalysisFullscreenChartKey,
        isUtilSheetCustomAnalysisDataset,
        setUtilSheetAnalysisToMonth,
        setUtilSheetAnalysisRangeState,
        renderUtilSheetReportModal,
        syncUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.syncUtilSheetDetachedReportWindow(...args),
        syncUtilSheetReportWindowState: (...args) => utilReportSheetWindows.syncUtilSheetReportWindowState(...args),
        syncUtilSheetPanelSelection,
        ensureUtilSheetReportModal: (...args) => utilReportSheetModalShell.ensureUtilSheetReportModal(...args),
        ensureUtilGasMeteringStore,
        getUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.getUtilSheetDetachedReportWindow(...args),
        closeUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.closeUtilSheetDetachedReportWindow(...args),
        closeUtilSheetAnalysisChartPopupWindow: (...args) => utilReportSheetWindows.closeUtilSheetAnalysisChartPopupWindow(...args),
        openUtilSheetAnalysisChartPopup: (...args) => utilReportSheetWindows.openUtilSheetAnalysisChartPopup(...args),
        closeUtilSheetBillingPreview
    });
    const {
        applyUtilSheetCompareSelection,
        applyUtilGasMeterProductionSelection,
        applyUtilElectricMeterTeamSelection,
        applyUtilElectricAnalysisTeamSelection,
        applyUtilGasAnalysisCategorySelection,
        applyUtilElectricMeterViewSelection,
        setUtilGasAnalysisInlineTablePositionFromTrigger,
        setUtilGasAnalysisChartFullscreen,
        openUtilGasAnalysisChartModal,
        openUtilGasAnalysisRatioTablePopup,
        applyUtilGasAnalysisRangeSelection,
        toggleUtilSheetReportExpanded,
        openUtilSheetReportModal,
        closeUtilSheetReportModal
    } = utilReportSheetModalActions;
    utilReportSheetPanelRuntime.setRuntimeAdapters({
        openUtilSheetReportModal,
        closeUtilActionMenus
    });
    utilReportSheetModalShell.setRuntimeAdapters({
        pruneUtilSheetDatasetToggles,
        closeUtilSheetReportModal,
        renderUtilSheetReportModal,
        syncUtilSheetDetachedReportWindow: (...args) => utilReportSheetWindows.syncUtilSheetDetachedReportWindow(...args),
        syncUtilSheetReportWindowState: (...args) => utilReportSheetWindows.syncUtilSheetReportWindowState(...args),
        toggleUtilSheetReportExpanded,
        getUtilSheetAlternateType,
        getUtilSheetAlternateDatasetKey,
        resolveUtilSheetReportDatasetKey,
        normalizeUtilSheetCompareKey,
        normalizeUtilSheetType,
        openUtilGasAnalysisChartModal,
        openUtilGasAnalysisRatioTablePopup,
        openUtilSheetBillingPreview,
        getUtilSheetActiveAnalysisDatasetKey,
        setUtilSheetAnalysisDisplayMode,
        applyUtilSheetCompareSelection,
        applyUtilGasAnalysisCategorySelection,
        applyUtilElectricMeterViewSelection,
        setUtilGasAnalysisChartFullscreen,
        resolveUtilSheetAnalysisLabelToggleContext,
        setUtilSheetAnalysisShowLabels,
        setUtilGasAnalysisRatioShowLabels,
        setUtilGasAnalysisFuelInactive,
        applyUtilGasAnalysisRangeSelection,
        setUtilSheetAnalysisUnitKey,
        applyUtilGasMeterProductionSelection,
        applyUtilElectricMeterTeamSelection,
        applyUtilElectricAnalysisTeamSelection,
        isUtilSheetCustomAnalysisDataset,
        setUtilSheetAnalysisToMonth,
        syncUtilSheetPanelSelection
    });
    const { ensureUtilSheetReportModal } = utilReportSheetModalShell;
    utilReportSheetWindows.setRuntimeAdapters({
        buildUtilSheetDetachedCompareToggleHtml,
        normalizeUtilSheetCompareKey,
        syncUtilSheetCompareButtons,
        normalizeUtilSheetType,
        isUtilSheetCustomAnalysisDataset,
        getUtilSheetActiveAnalysisDatasetKey,
        normalizeUtilGasAnalysisPopupKey,
        parseUtilGasAnalysisRatioTablePopupKey,
        getUtilGasAnalysisChartModelByKey,
        getUtilGasAnalysisRatioTableByKey,
        isUtilGasAnalysisChartRenderable,
        buildUtilGasAnalysisRangeTableHtml,
        buildUtilGasAnalysisRatioCombinedChartCardHtmlV2,
        buildUtilGasAnalysisChartCardHtmlV2,
        resolveUtilSheetAnalysisLabelToggleContext,
        setUtilSheetAnalysisShowLabels,
        renderUtilSheetReportModal,
        openUtilGasAnalysisRatioTablePopup,
        setUtilGasAnalysisRatioShowLabels,
        setUtilGasAnalysisFuelInactive,
        setUtilSheetAnalysisUnitKey,
        setUtilSheetAnalysisDisplayMode,
        applyUtilGasMeterProductionSelection,
        applyUtilElectricMeterTeamSelection,
        applyUtilElectricAnalysisTeamSelection,
        applyUtilGasAnalysisCategorySelection,
        applyUtilGasAnalysisRangeSelection,
        applyUtilSheetCompareSelection,
        applyUtilElectricMeterViewSelection,
        openUtilSheetBillingPreview,
        closeUtilSheetBillingPreview,
        openUtilGasAnalysisChartModal
    });
    const {
        getUtilSheetDetachedReportWindow,
        closeUtilSheetDetachedReportWindow,
        getUtilSheetAnalysisChartPopupWindow,
        closeUtilSheetAnalysisChartPopupWindow,
        syncUtilSheetDetachedReportWindow,
        syncUtilSheetAnalysisChartPopup,
        bindUtilSheetAnalysisChartDragScroll,
        bindUtilSheetAnalysisInlineTableDrag,
        openUtilSheetDetachedReportWindow,
        openUtilSheetAnalysisChartPopup,
        syncUtilSheetReportWindowState
    } = utilReportSheetWindows;

    function escapeUtilSheetHtml(value) {
        if (typeof escapeHtml === 'function') return escapeHtml(value);
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function compareUtilSheetMonthKeys(a, b) {
        const parsedA = parseUtilMonthValue(a);
        const parsedB = parseUtilMonthValue(b);
        if (!parsedA && !parsedB) return 0;
        if (!parsedA) return -1;
        if (!parsedB) return 1;
        return (parsedA.year * 100 + parsedA.month) - (parsedB.year * 100 + parsedB.month);
    }

    function formatUtilSheetInteger(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        return utilSheetNumberFormatter.format(Math.round(value));
    }

    function formatUtilSheetCost(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        return `${utilSheetNumberFormatter.format(Math.round(value))}원`;
    }

    function formatUtilSheetDecimal(value, decimals = 2, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        return Number(value).toLocaleString('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        });
    }

    function formatUtilSheetSignedInteger(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        const sign = value > 0 ? '+' : '';
        return `${sign}${utilSheetNumberFormatter.format(Math.round(value))}`;
    }

    function formatUtilSheetSignedCost(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        const sign = value > 0 ? '+' : '';
        return `${sign}${utilSheetNumberFormatter.format(Math.round(value))}원`;
    }

    function formatUtilSheetUnit(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        return `${Number(value).toFixed(1)}원/kg`;
    }

    function formatUtilSheetSignedUnit(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        const sign = value > 0 ? '+' : '';
        return `${sign}${Number(value).toFixed(1)}원/kg`;
    }

    function formatUtilSheetPercent(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        return `${Number(value).toFixed(1)}%`;
    }

    function formatUtilSheetRatio(value, digits = 3, fallback = '') {
        if (!Number.isFinite(value)) return fallback;
        return Number(value).toFixed(digits);
    }

    function calculateUtilSheetPercentDelta(currentValue, referenceValue) {
        if (!Number.isFinite(currentValue) || !Number.isFinite(referenceValue) || referenceValue === 0) return null;
        return ((currentValue - referenceValue) / referenceValue) * 100;
    }

    function formatUtilSheetSignedPercent(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        const sign = value > 0 ? '+' : '';
        return `${sign}${Number(value).toFixed(1)}%`;
    }

    function formatUtilSheetSignedPercentPoint(value, fallback = '-') {
        if (!Number.isFinite(value)) return fallback;
        const sign = value > 0 ? '+' : '';
        return `${sign}${Number(value).toFixed(1)}%p`;
    }

    function getUtilSheetEntries(datasetKey) {
        if (datasetKey === 'gas') return Array.isArray(UTIL_GAS_ENTRIES) ? UTIL_GAS_ENTRIES : [];
        if (datasetKey === 'electric') return Array.isArray(UTIL_ELECTRIC_ENTRIES) ? UTIL_ELECTRIC_ENTRIES : [];
        return [];
    }

    function isUtilSheetSettledRow(row, spec) {
        if (!row || !spec) return false;
        const hasCost = Number.isFinite(row?.[spec.costKey]);
        const hasProduction = Number.isFinite(row?.production) && row.production > 0;
        return hasCost && hasProduction;
    }

    function appendUtilSheetUnit(text, unit) {
        return text === '-' ? text : `${text}${unit}`;
    }

    function formatUtilSheetQuantity(value, unit, fallback = '-') {
        return appendUtilSheetUnit(formatUtilSheetInteger(value, fallback), unit);
    }

    function formatUtilSheetSignedQuantity(value, unit, fallback = '-') {
        return appendUtilSheetUnit(formatUtilSheetSignedInteger(value, fallback), unit);
    }

    function buildUtilSheetCompareSub(compareMeta, formattedDelta) {
        return formattedDelta === '-'
            ? `${compareMeta.label} ${compareMeta.referenceLabel}`
            : `${compareMeta.label} ${formattedDelta} · ${compareMeta.referenceLabel}`;
    }

    function isUtilSheetPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function shiftUtilSheetMonthKey(monthKey, offset = 0) {
        const parsed = parseUtilMonthValue(monthKey);
        if (!parsed || !Number.isFinite(offset)) return '';
        const shifted = new Date(parsed.year, parsed.month - 1 + offset, 1);
        return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
    }

    function parseUtilGasMeterNumber(value) {
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function normalizeUtilGasMeterDate(value) {
        const text = String(value || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
    }

    function getUtilMeteringDataset(datasetKey = '') {
        const normalizedDatasetKey = String(datasetKey || '').trim();
        const rootStore = isUtilSheetPlainObject(window.__LOCAL_APP_STORE__)
            ? window.__LOCAL_APP_STORE__
            : null;
        const dataset = rootStore?.resourceDatasets?.[normalizedDatasetKey];
        if (isUtilSheetPlainObject(dataset)) {
            return dataset;
        }
        if (
            normalizedDatasetKey === 'electric'
            && rootStore
            && (
                Array.isArray(rootStore.equipmentItems)
                || isUtilSheetPlainObject(rootStore.equipmentEntries)
                || isUtilSheetPlainObject(rootStore.teamAssignments)
            )
        ) {
            return rootStore;
        }
        return null;
    }

    function ensureUtilMeteringDataset(datasetKey = '', promiseKey = '') {
        if (getUtilMeteringDataset(datasetKey)) {
            return Promise.resolve(true);
        }
        const normalizedPromiseKey = String(promiseKey || '').trim();
        if (normalizedPromiseKey && UtilSheetRuntimeState[normalizedPromiseKey]) {
            return UtilSheetRuntimeState[normalizedPromiseKey];
        }
        if (!window.KpiMeteringBridge || typeof window.KpiMeteringBridge.ensureIntegratedMeteringRuntime !== 'function') {
            return Promise.resolve(false);
        }
        const nextPromise = Promise.resolve()
            .then(() => window.KpiMeteringBridge.ensureIntegratedMeteringRuntime())
            .then(() => Boolean(getUtilMeteringDataset(datasetKey)))
            .catch(() => false)
            .finally(() => {
                if (normalizedPromiseKey) {
                    UtilSheetRuntimeState[normalizedPromiseKey] = null;
                }
            });
        if (normalizedPromiseKey) {
            UtilSheetRuntimeState[normalizedPromiseKey] = nextPromise;
        }
        return nextPromise;
    }

    function getUtilGasMeteringStore() {
        return getUtilMeteringDataset('gas');
    }

    function hasUtilGasMeteringStore() {
        return Boolean(getUtilGasMeteringStore());
    }

    function ensureUtilGasMeteringStore() {
        return ensureUtilMeteringDataset('gas', 'gasMeteringPromise');
    }

    function buildUtilGasMeterFieldDefinitions() {
        const store = getUtilGasMeteringStore();
        const equipmentItems = Array.isArray(store?.equipmentItems) ? store.equipmentItems : [];
        const itemMap = new Map(
            equipmentItems
                .filter(item => item && typeof item === 'object')
                .map(item => [String(item.id || '').trim(), item])
        );
        return UTIL_GAS_METER_FIELD_ORDER.map(fieldId => {
            const item = itemMap.get(fieldId) || {};
            return {
                id: fieldId,
                label: String(item.label || UTIL_GAS_METER_FIELD_LABELS[fieldId] || fieldId).trim(),
                readingAdjustmentValue: parseUtilGasMeterNumber(item.readingAdjustmentValue) || 0,
                readingAdjustmentStartDate: normalizeUtilGasMeterDate(item.readingAdjustmentStartDate)
            };
        });
    }

    function buildUtilGasMeterTimelineMap(fieldDefs) {
        const store = getUtilGasMeteringStore();
        const entries = isUtilSheetPlainObject(store?.equipmentEntries)
            ? store.equipmentEntries
            : (isUtilSheetPlainObject(window.__PRESET_GAS_ENTRIES__) ? window.__PRESET_GAS_ENTRIES__ : {});
        const sortedDates = Object.keys(entries).sort();
        const timelineMap = new Map(fieldDefs.map(field => [field.id, []]));

        sortedDates.forEach(dateString => {
            const entry = entries[dateString];
            const values = isUtilSheetPlainObject(entry?.values) ? entry.values : null;
            if (!values) return;
            fieldDefs.forEach(field => {
                const rawValue = parseUtilGasMeterNumber(values[field.id]);
                if (!Number.isFinite(rawValue)) return;
                const adjustedValue = field.readingAdjustmentStartDate && dateString >= field.readingAdjustmentStartDate
                    ? rawValue + field.readingAdjustmentValue
                    : rawValue;
                timelineMap.get(field.id).push({
                    dateString,
                    rawValue,
                    value: adjustedValue
                });
            });
        });

        return timelineMap;
    }

    function getUtilGasMeterFirstDetailInMonth(timeline, monthKey) {
        if (!Array.isArray(timeline)) return null;
        const prefix = `${monthKey}-`;
        return timeline.find(item => String(item?.dateString || '').startsWith(prefix)) || null;
    }

    function resolveUtilGasMeterDisplayFactor(fieldId, correctionFactor) {
        if (fieldId === 'gas_field_02') return UTIL_GAS_METER_LPG_FACTOR;
        if (UTIL_GAS_METER_CORRECTION_TARGET_IDS.has(fieldId)) {
            return Number.isFinite(correctionFactor) ? correctionFactor : 1;
        }
        return 1;
    }

    function buildUtilGasMeterMonthTable(monthKey, fieldDefs, timelineMap) {
        const startMonthKey = String(monthKey || '').trim();
        const endMonthKey = shiftUtilSheetMonthKey(startMonthKey, 1);
        const columns = fieldDefs.map(field => {
            const timeline = timelineMap.get(field.id) || [];
            const startDetail = getUtilGasMeterFirstDetailInMonth(timeline, startMonthKey);
            const endDetail = getUtilGasMeterFirstDetailInMonth(timeline, endMonthKey);
            const startReading = Number.isFinite(startDetail?.value) ? startDetail.value : null;
            const endReading = Number.isFinite(endDetail?.value) ? endDetail.value : null;
            const usage = Number.isFinite(startReading) && Number.isFinite(endReading)
                ? endReading - startReading
                : null;
            return {
                id: field.id,
                label: field.label,
                startReading,
                endReading,
                usage
            };
        });

        const totalUsage = columns.find(column => column.id === 'gas_field_01')?.usage;
        const correctionSourceTotal = columns
            .filter(column => UTIL_GAS_METER_CORRECTION_TARGET_IDS.has(column.id))
            .map(column => column.usage)
            .filter(value => Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0);
        const correctionFactor = Number.isFinite(totalUsage) && correctionSourceTotal > 0
            ? totalUsage / correctionSourceTotal
            : null;

        columns.forEach(column => {
            const factor = resolveUtilGasMeterDisplayFactor(column.id, correctionFactor);
            column.factor = factor;
            column.correctedUsage = Number.isFinite(column.usage) ? column.usage * factor : null;
            column.adjustment = Number.isFinite(column.correctedUsage) && Number.isFinite(column.usage)
                ? column.correctedUsage - column.usage
                : null;
        });

        return {
            monthKey,
            startMonthKey,
            endMonthKey,
            columns,
            correctionFactor
        };
    }

    function buildUtilGasMeterComparisonModel(selectedMonthKey, compareKey = 'month') {
        if (!hasUtilGasMeteringStore()) {
            return {
                ready: false,
                loading: true,
                message: '가스 검침 원본 데이터를 불러오는 중입니다.'
            };
        }

        const normalizedSelectedMonthKey = String(selectedMonthKey || '').trim();
        if (!normalizedSelectedMonthKey) {
            return {
                ready: false,
                loading: false,
                message: '기준월이 아직 선택되지 않았습니다.'
            };
        }

        const normalizedCompareKey = normalizeUtilSheetCompareKey(compareKey);
        const referenceMonthKey = normalizedCompareKey === 'year'
            ? shiftUtilSheetMonthKey(normalizedSelectedMonthKey, -12)
            : shiftUtilSheetMonthKey(normalizedSelectedMonthKey, -1);
        const fieldDefs = buildUtilGasMeterFieldDefinitions();
        const timelineMap = buildUtilGasMeterTimelineMap(fieldDefs);
        const referenceTable = buildUtilGasMeterMonthTable(referenceMonthKey, fieldDefs, timelineMap);
        const selectedTable = buildUtilGasMeterMonthTable(normalizedSelectedMonthKey, fieldDefs, timelineMap);
        const billingSummary = buildUtilGasBillingSummaryModel(normalizedSelectedMonthKey, selectedTable);

        return {
            ready: true,
            compareKey: normalizedCompareKey,
            referenceTable,
            selectedTable,
            billingSummary
        };
    }

    function buildUtilGasAnalysisUsageMap(monthKeys = []) {
        const usageMap = new Map();
        const normalizedMonthKeys = Array.isArray(monthKeys)
            ? monthKeys.map(monthKey => String(monthKey || '').trim()).filter(Boolean)
            : [];

        normalizedMonthKeys.forEach(monthKey => {
            usageMap.set(monthKey, { lpg: NaN, lng: NaN });
        });
        if (!normalizedMonthKeys.length || !hasUtilGasMeteringStore()) {
            return usageMap;
        }

        const fieldDefs = buildUtilGasMeterFieldDefinitions();
        const timelineMap = buildUtilGasMeterTimelineMap(fieldDefs);
        normalizedMonthKeys.forEach(monthKey => {
            const monthTable = buildUtilGasMeterMonthTable(monthKey, fieldDefs, timelineMap);
            usageMap.set(monthKey, {
                lpg: Number(getUtilGasMeterColumn(monthTable, 'gas_field_02')?.usage),
                lng: Number(getUtilGasMeterColumn(monthTable, 'gas_field_01')?.usage)
            });
        });
        return usageMap;
    }

    function buildUtilSheetMonthBounds(datasetKey) {
        const monthOptions = typeof buildUtilMonthOptions === 'function'
            ? buildUtilMonthOptions(getUtilSheetEntries(datasetKey))
            : [];
        const monthKeys = monthOptions
            .map(item => item?.value || item?.key || '')
            .filter(Boolean)
            .sort(compareUtilSheetMonthKeys);
        if (!monthKeys.length) return null;
        const from = monthKeys[0];
        const latest = monthKeys[monthKeys.length - 1];
        const to = compareUtilSheetMonthKeys(latest, UTIL_SHEET_CUTOFF) > 0
            ? UTIL_SHEET_CUTOFF
            : latest;
        if (compareUtilSheetMonthKeys(from, to) > 0) return null;
        return { from, to };
    }

    function summarizeUtilSheetRows(rows, spec) {
        const summary = rows.reduce((acc, row) => {
            acc.usage += Number.isFinite(row?.[spec.usageKey]) ? row[spec.usageKey] : 0;
            acc.cost += Number.isFinite(row?.[spec.costKey]) ? row[spec.costKey] : 0;
            if (Number.isFinite(row?.production) && row.production > 0) acc.production += row.production;
            return acc;
        }, {
            usage: 0,
            cost: 0,
            production: 0
        });
        summary.unit = summary.production > 0 ? summary.cost / summary.production : null;
        return summary;
    }

    function getUtilSheetEntryMonthKey(entry) {
        const year = Number(entry?.year);
        const month = Number(entry?.month);
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return '';
        return `${year}-${String(month).padStart(2, '0')}`;
    }

    function isUtilSheetGasLpgTeam(teamName = '') {
        return /LPG/iu.test(String(teamName || '').trim());
    }

    window.initUtilSheetReports = initUtilSheetReports;
    window.openUtilSheetReportModal = openUtilSheetReportModal;
    window.closeUtilSheetReportModal = closeUtilSheetReportModal;
})();

