(function registerUtilReportSheetWindowDetachedInteractions(globalScope) {
    if (globalScope.KPIUtilReportSheetWindowDetachedInteractions) {
        return;
    }

    const runtime = {
        getReportModal: null,
        rerenderAndSync: null,
        resolveUtilSheetAnalysisLabelToggleContext: null,
        setUtilSheetAnalysisShowLabels: null,
        setUtilGasAnalysisRatioShowLabels: null,
        applyUtilGasMeterProductionSelection: null,
        applyUtilElectricMeterTeamSelection: null,
        applyUtilElectricAnalysisTeamSelection: null,
        applyUtilGasAnalysisCategorySelection: null,
        setUtilGasAnalysisFuelInactive: null,
        setUtilSheetAnalysisUnitKey: null,
        getUtilSheetActiveAnalysisDatasetKey: null,
        applyUtilGasAnalysisRangeSelection: null,
        applyUtilSheetCompareSelection: null,
        applyUtilElectricMeterViewSelection: null,
        openUtilSheetBillingPreview: null,
        setUtilSheetAnalysisDisplayMode: null,
        openUtilGasAnalysisRatioTablePopup: null,
        openUtilGasAnalysisChartModal: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetWindowDetachedInteractions;
    }

    function getReportModal() {
        return typeof runtime.getReportModal === 'function' ? runtime.getReportModal() : null;
    }

    function rerenderAndSync(modal) {
        if (typeof runtime.rerenderAndSync === 'function') {
            runtime.rerenderAndSync(modal);
        }
    }

    function bindUtilSheetDetachedReportWindowDrag(popup) {
        if (!popup || popup.__utilSheetDetachedDragBound) return;
        popup.__utilSheetDetachedDragBound = true;

        let activePointerId = null;
        let startScreenX = 0;
        let startScreenY = 0;
        let headEl = null;

        const isInteractiveTarget = target => !!target?.closest?.('button, input, select, textarea, label, a, summary, details, [contenteditable]');
        const finishDrag = () => {
            if (headEl) headEl.classList.remove('is-window-dragging');
            activePointerId = null;
            headEl = null;
        };

        popup.document.addEventListener('pointerdown', event => {
            const nextHead = event.target?.closest?.('.util-sheet-report-detached-head');
            if (!nextHead) return;
            if (event.pointerType === 'mouse' && event.button !== 0) return;
            if (isInteractiveTarget(event.target)) return;
            activePointerId = event.pointerId;
            startScreenX = event.screenX;
            startScreenY = event.screenY;
            headEl = nextHead;
            headEl.classList.add('is-window-dragging');
            if (typeof headEl.setPointerCapture === 'function') {
                try {
                    headEl.setPointerCapture(activePointerId);
                } catch (error) {
                    void error;
                }
            }
            event.preventDefault();
        });

        popup.document.addEventListener('pointermove', event => {
            if (activePointerId === null || event.pointerId !== activePointerId) return;
            const diffX = event.screenX - startScreenX;
            const diffY = event.screenY - startScreenY;
            startScreenX = event.screenX;
            startScreenY = event.screenY;
            if (!diffX && !diffY) return;
            try {
                popup.moveBy(diffX, diffY);
            } catch (error) {
                void error;
            }
            event.preventDefault();
        });

        popup.document.addEventListener('pointerup', event => {
            if (event.pointerId !== activePointerId) return;
            finishDrag();
        });
        popup.document.addEventListener('pointercancel', event => {
            if (event.pointerId !== activePointerId) return;
            finishDrag();
        });
        popup.document.addEventListener('lostpointercapture', finishDrag, true);
        popup.addEventListener('blur', finishDrag);
    }

    function bindUtilSheetDetachedReportWindowInteractions(popup) {
        if (!popup || popup.__utilSheetDetachedInteractionBound) return;
        popup.__utilSheetDetachedInteractionBound = true;

        popup.document.addEventListener('change', event => {
            const modal = getReportModal();
            const labelToggleContext = typeof runtime.resolveUtilSheetAnalysisLabelToggleContext === 'function'
                ? runtime.resolveUtilSheetAnalysisLabelToggleContext(event.target, modal)
                : null;
            if (labelToggleContext?.toggleEl) {
                if (!modal) return;
                if (typeof runtime.setUtilSheetAnalysisShowLabels === 'function') {
                    runtime.setUtilSheetAnalysisShowLabels(
                        labelToggleContext.datasetKey,
                        labelToggleContext.chartKey,
                        labelToggleContext.toggleEl.checked === true
                    );
                }
                rerenderAndSync(modal);
                return;
            }
            if (!modal) return;

            const ratioLabelToggle = event.target?.closest?.('[data-role="util-sheet-analysis-ratio-label-toggle"]');
            if (ratioLabelToggle) {
                if (typeof runtime.setUtilGasAnalysisRatioShowLabels === 'function') {
                    runtime.setUtilGasAnalysisRatioShowLabels(ratioLabelToggle.checked === true);
                }
                rerenderAndSync(modal);
                return;
            }
            const productionSelect = event.target?.closest?.('[data-role="util-sheet-meter-production-select"]');
            if (productionSelect) {
                if (typeof runtime.applyUtilGasMeterProductionSelection === 'function') {
                    runtime.applyUtilGasMeterProductionSelection(modal, productionSelect.value || 'combined');
                }
                return;
            }
            const electricTeamSelect = event.target?.closest?.('[data-role="util-sheet-meter-electric-team-select"]');
            if (electricTeamSelect) {
                if (typeof runtime.applyUtilElectricMeterTeamSelection === 'function') {
                    runtime.applyUtilElectricMeterTeamSelection(modal, electricTeamSelect.value || 'combined');
                }
                return;
            }
            const electricAnalysisTeamSelect = event.target?.closest?.('[data-role="util-sheet-analysis-electric-team-select"]');
            if (electricAnalysisTeamSelect) {
                if (typeof runtime.applyUtilElectricAnalysisTeamSelection === 'function') {
                    runtime.applyUtilElectricAnalysisTeamSelection(modal, electricAnalysisTeamSelect.value || 'combined');
                }
                return;
            }
            const gasCategorySelect = event.target?.closest?.('[data-role="util-sheet-analysis-gas-category-select"]');
            if (gasCategorySelect) {
                if (typeof runtime.applyUtilGasAnalysisCategorySelection === 'function') {
                    runtime.applyUtilGasAnalysisCategorySelection(modal, gasCategorySelect.value || 'plantA');
                }
                return;
            }
            const fuelInactiveToggle = event.target?.closest?.('[data-role="util-sheet-analysis-fuel-inactive"]');
            if (fuelInactiveToggle) {
                if (typeof runtime.setUtilGasAnalysisFuelInactive === 'function') {
                    runtime.setUtilGasAnalysisFuelInactive(fuelInactiveToggle.dataset.fuelKey || '', fuelInactiveToggle.checked === true);
                }
                rerenderAndSync(modal);
                return;
            }
            const unitSelect = event.target?.closest?.('[data-role="util-sheet-analysis-unit"]');
            if (unitSelect) {
                if (typeof runtime.setUtilSheetAnalysisUnitKey === 'function') {
                    runtime.setUtilSheetAnalysisUnitKey(
                        typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
                            ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
                            : '',
                        unitSelect.dataset.chartKey || '',
                        unitSelect.value || ''
                    );
                }
                rerenderAndSync(modal);
                return;
            }
            const rangeField = event.target?.closest?.('[data-role="util-sheet-analysis-from"], [data-role="util-sheet-analysis-to"]');
            if (!rangeField) return;
            if (typeof runtime.applyUtilGasAnalysisRangeSelection === 'function') {
                runtime.applyUtilGasAnalysisRangeSelection(popup.document, modal);
            }
        });

        popup.document.addEventListener('click', event => {
            const modal = getReportModal();
            const inlineTableCloseButton = event.target?.closest?.('[data-role="util-sheet-analysis-inline-table-close"]');
            if (inlineTableCloseButton) {
                if (!modal) return;
                modal.dataset.analysisInlineRatioTableKey = '';
                rerenderAndSync(modal);
                return;
            }
            const compareButton = event.target?.closest?.('[data-role="util-sheet-report-detached-compare-select"]');
            if (compareButton) {
                if (modal && typeof runtime.applyUtilSheetCompareSelection === 'function') {
                    runtime.applyUtilSheetCompareSelection(modal, compareButton.dataset.compareKey || 'month');
                }
                return;
            }
            const electricViewButton = event.target?.closest?.('[data-role="util-sheet-meter-electric-view-select"]');
            if (electricViewButton) {
                if (modal && typeof runtime.applyUtilElectricMeterViewSelection === 'function') {
                    runtime.applyUtilElectricMeterViewSelection(modal, electricViewButton.dataset.viewKey || 'meter');
                }
                return;
            }
            const gasCategoryButton = event.target?.closest?.('[data-role="util-sheet-analysis-gas-category-select"][data-category-key]');
            if (gasCategoryButton) {
                if (modal && typeof runtime.applyUtilGasAnalysisCategorySelection === 'function') {
                    runtime.applyUtilGasAnalysisCategorySelection(modal, gasCategoryButton.dataset.categoryKey || 'plantA');
                }
                return;
            }
            const billingPreviewButton = event.target?.closest?.('[data-role="util-sheet-billing-preview-toggle"]');
            if (billingPreviewButton) {
                if (typeof runtime.openUtilSheetBillingPreview === 'function') {
                    runtime.openUtilSheetBillingPreview(
                        billingPreviewButton.dataset.monthKey || '',
                        billingPreviewButton.dataset.billingScopeKey || '',
                        {
                            datasetKey: billingPreviewButton.dataset.billingDatasetKey || 'gas',
                            rootDoc: popup.document,
                            focusTarget: billingPreviewButton
                        }
                    );
                }
                return;
            }
            const chartTypeButton = event.target?.closest?.('[data-role="util-sheet-analysis-series-type"]');
            if (chartTypeButton) {
                if (!modal) return;
                if (typeof runtime.setUtilSheetAnalysisDisplayMode === 'function') {
                    runtime.setUtilSheetAnalysisDisplayMode(
                        typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function'
                            ? runtime.getUtilSheetActiveAnalysisDatasetKey(modal)
                            : '',
                        chartTypeButton.dataset.chartKey || '',
                        chartTypeButton.dataset.chartType || 'bar'
                    );
                }
                rerenderAndSync(modal);
                return;
            }
            const ratioTableButton = event.target?.closest?.('[data-role="util-sheet-analysis-open-ratio-table"]');
            if (ratioTableButton) {
                if (modal && typeof runtime.openUtilGasAnalysisRatioTablePopup === 'function') {
                    runtime.openUtilGasAnalysisRatioTablePopup(modal, ratioTableButton.dataset.tableKey || '', ratioTableButton);
                }
                return;
            }
            const chartButton = event.target?.closest?.('[data-role="util-sheet-analysis-open-chart"]');
            if (chartButton && modal && typeof runtime.openUtilGasAnalysisChartModal === 'function') {
                runtime.openUtilGasAnalysisChartModal(modal, chartButton.dataset.chartKey || '');
            }
        });
    }

    globalScope.KPIUtilReportSheetWindowDetachedInteractions = {
        setRuntimeAdapters,
        bindUtilSheetDetachedReportWindowDrag,
        bindUtilSheetDetachedReportWindowInteractions
    };
})(typeof window !== 'undefined' ? window : globalThis);
