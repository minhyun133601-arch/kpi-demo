(function registerUtilRuntime() {
    const runtime = window.KpiRuntime;
    if (!runtime) return;

    runtime.registerSectionInitializer('util', ({ category, container }) => {
        renderUtilDualTabs(container);
        initUnifiedUtilAnalytics(container);
        initUtilAnalyticsRepeaters(container);
        initUtilTabs(container);
        initUtilEnergyLauncher(container);
        initUtilReportPanel(container);
        initUtilSheetReports(container);

        const isUtilReportPanel = typeof category?.content === 'string'
            && category.content.includes('data-role="util-report-panel"');
        if (isUtilReportPanel && typeof UtilReportState !== 'undefined' && UtilReportState.openOnReportTab !== false) {
            const result = runUtilReport(container, { renderModal: false });
            openUtilReportModal(result);
        }

        void window.KpiMeteringBridge?.initIntegratedMetering?.(container);
    });

    runtime.registerBootTask('util-electric-metering-sync', () => {
        bootUtilElectricMeteringSync();
    });

    runtime.registerBootTask('util-gas-metering-sync', () => {
        bootUtilGasMeteringSync();
    });

    runtime.registerBootTask('util-waste-metering-sync', () => {
        bootUtilWasteMeteringSync();
    });

    runtime.registerSaveProvider('util-shared-save', (context = {}) => {
        if (context.sectionId !== 'util') return null;

        const meteringHost = context.container?.querySelector?.('[data-kpi-metering-root]');
        const meteringMounted = !!(meteringHost && meteringHost.shadowRoot);
        if (meteringMounted && window.KpiMeteringApp && typeof window.KpiMeteringApp.manualSave === 'function') {
            const meteringRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.metering;
            const canWrite = runtime.canUseServerWrite(meteringRuntime?.writeEnabled === true);
            return {
                priority: 120,
                canSave: canWrite,
                buttonLabel: '저장',
                historyLabel: '검침 저장',
                title: '검침 데이터 저장',
                statusText: canWrite
                    ? '검침 데이터를 중앙 서버에 저장합니다.'
                    : '서버 기록이 가능한 환경에서만 검침 데이터를 저장할 수 있습니다.',
                perform: ({ trigger } = {}) => {
                    if (!canWrite) return false;
                    return window.KpiMeteringApp.manualSave({ trigger });
                }
            };
        }

        if (typeof persistUtilProductionDailyState === 'function') {
            const productionRuntime = typeof getUtilProductionServerRuntimeConfig === 'function'
                ? getUtilProductionServerRuntimeConfig()
                : null;
            const canWrite = runtime.canUseServerWrite(productionRuntime?.writeEnabled === true);
            return {
                priority: 40,
                canSave: canWrite,
                buttonLabel: '저장',
                historyLabel: '유틸리티 저장',
                title: '유틸리티 상태 저장',
                statusText: canWrite
                    ? '현재 유틸리티 상태를 중앙 서버에 저장합니다.'
                    : '서버 기록이 가능한 환경에서만 유틸리티 데이터를 저장할 수 있습니다.',
                perform: () => {
                    if (!canWrite) return false;
                    return persistUtilProductionDailyState();
                }
            };
        }

        return null;
    });

    [
        ['util-report-builder-viz', () => typeof closeUtilReportBuilderVizModal === 'function' && closeUtilReportBuilderVizModal()],
        ['util-report-builder', () => typeof closeUtilReportBuilderModal === 'function' && closeUtilReportBuilderModal()],
        ['util-report-graph', () => typeof closeUtilReportGraphModal === 'function' && closeUtilReportGraphModal()],
        ['util-report-composition', () => typeof closeUtilReportCompositionModal === 'function' && closeUtilReportCompositionModal()],
        ['util-report-yoy', () => typeof closeUtilReportYoYModal === 'function' && closeUtilReportYoYModal()],
        ['util-sheet-report', () => typeof closeUtilSheetReportModal === 'function' && closeUtilSheetReportModal()],
        ['util-report', () => typeof closeUtilReportModal === 'function' && closeUtilReportModal()],
        ['util-energy', () => typeof closeUtilEnergyModal === 'function' && closeUtilEnergyModal()],
        ['util-chart', () => typeof closeUtilChartModal === 'function' && closeUtilChartModal()],
        ['util-metric-export', () => typeof closeUtilMetricExportModal === 'function' && closeUtilMetricExportModal()],
        ['util-selective-delete', () => typeof closeUtilSelectiveDeleteModal === 'function' && closeUtilSelectiveDeleteModal()],
        ['util-production-detail', () => typeof closeUtilProductionDetailModal === 'function' && closeUtilProductionDetailModal()],
        ['util-production-extractor', () => typeof closeUtilProductionExtractorModal === 'function' && closeUtilProductionExtractorModal()],
        ['util-production-archive', () => typeof closeUtilProductionArchiveModal === 'function' && closeUtilProductionArchiveModal()]
    ].forEach(([key, closer]) => {
        runtime.registerShortcutCloser(key, closer);
    });
})();
