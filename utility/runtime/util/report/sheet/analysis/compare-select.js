(function registerUtilReportSheetAnalysisCompareSelect(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisCompareSelect) {
        return;
    }

    const runtime = {
        formatUtilReportMonthShort: null,
        getUtilGasAnalysisCategoryOption: null,
        isUtilGasAnalysisFuelInactive: null,
        getUtilSheetActiveAnalysisDatasetKey: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisCompareSelect;
    }

    function formatMonthShort(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthShort === 'function') {
            return runtime.formatUtilReportMonthShort(monthKey);
        }
        return String(monthKey || '');
    }

    function getGasCategoryOption(categoryKey = '') {
        if (typeof runtime.getUtilGasAnalysisCategoryOption === 'function') {
            return runtime.getUtilGasAnalysisCategoryOption(categoryKey);
        }
        return {
            key: String(categoryKey || 'plantA').trim() || 'plantA',
            showLpgCard: false
        };
    }

    function isGasFuelInactive(fuelKey = '') {
        if (typeof runtime.isUtilGasAnalysisFuelInactive === 'function') {
            return runtime.isUtilGasAnalysisFuelInactive(fuelKey);
        }
        return false;
    }

    function getActiveAnalysisDatasetKey(modal) {
        if (typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function') {
            return runtime.getUtilSheetActiveAnalysisDatasetKey(modal);
        }
        return 'gas';
    }

    function buildUtilGasAnalysisCostModeText(categoryOption = null) {
        const option = getGasCategoryOption(categoryOption?.key || categoryOption);
        const activeFuelLabels = [];
        if (!isGasFuelInactive('lng')) activeFuelLabels.push('LNG');
        if (option.showLpgCard && !isGasFuelInactive('lpg')) activeFuelLabels.push('LPG');
        if (!activeFuelLabels.length) return '비용 계산 · 미반영';
        return `비용 계산 · ${activeFuelLabels.join(' + ')} 반영`;
    }

    function buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
        const monthLabel = formatMonthShort(monthKey);
        if (!monthKey || deltaText === '-') return `${compareLabel} 비교값 없음`;
        return `${monthLabel} ${compareLabel} ${deltaText}`;
    }

    function resolveUtilSheetAnalysisLabelToggleChartKey(toggleEl) {
        const card = toggleEl?.closest?.('[data-analysis-chart-key]');
        const chartKey = String(card?.dataset?.analysisChartKey || '').trim();
        if (chartKey) return chartKey;
        const summaryCard = toggleEl?.closest?.('[data-role="util-sheet-analysis-summary-grid"] [data-tone]');
        const summaryTitle = String(summaryCard?.querySelector?.('.util-sheet-analysis-summary-label')?.textContent || '').trim();
        if (summaryTitle.includes('생산량 대비 전기 사용량')) return 'electricIntensity';
        return 'combined';
    }

    function resolveUtilSheetAnalysisLabelToggleContext(target, modal) {
        const electricIntensityToggle = target?.closest?.('[data-role="util-sheet-analysis-electric-intensity-label-toggle"]');
        if (electricIntensityToggle) {
            return {
                datasetKey: 'electric',
                chartKey: 'electricIntensity',
                toggleEl: electricIntensityToggle
            };
        }
        const electricCombinedToggle = target?.closest?.('[data-role="util-sheet-analysis-electric-combined-label-toggle"]');
        if (electricCombinedToggle) {
            return {
                datasetKey: 'electric',
                chartKey: 'combined',
                toggleEl: electricCombinedToggle
            };
        }
        const labelToggle = target?.closest?.('[data-chart-label-toggle]');
        if (!labelToggle) return null;
        return {
            datasetKey: getActiveAnalysisDatasetKey(modal),
            chartKey: resolveUtilSheetAnalysisLabelToggleChartKey(labelToggle),
            toggleEl: labelToggle
        };
    }

    globalScope.KPIUtilReportSheetAnalysisCompareSelect = {
        setRuntimeAdapters,
        buildUtilGasAnalysisCostModeText,
        buildUtilGasAnalysisCompareSub,
        resolveUtilSheetAnalysisLabelToggleContext
    };
})(globalThis);
