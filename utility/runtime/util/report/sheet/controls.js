(function registerUtilReportSheetControls(globalScope) {
    if (globalScope.KPIUtilReportSheetControls) {
        return;
    }

    const utilReportSheetOptions = globalScope.KPIUtilReportSheetOptions;
    if (!utilReportSheetOptions) {
        throw new Error('KPIUtilReportSheetOptions must load before KPI.util.report.sheet.controls.js');
    }

    const {
        UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS,
        UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS,
        UTIL_ELECTRIC_METER_TEAM_OPTIONS,
        normalizeUtilElectricMeterTeamKey,
        normalizeUtilElectricAnalysisTeamKey,
        normalizeUtilGasAnalysisCategoryKey,
        normalizeUtilElectricMeterViewKey
    } = utilReportSheetOptions;

    const runtime = {
        escapeUtilSheetHtml: null,
        normalizeUtilGasMeterProductionKey: null,
        getUtilGasMeterProductionOptions: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetControls;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function normalizeGasMeterProductionKey(value = '') {
        if (typeof runtime.normalizeUtilGasMeterProductionKey === 'function') {
            return runtime.normalizeUtilGasMeterProductionKey(value);
        }
        return 'combined';
    }

    function getGasMeterProductionOptions() {
        if (typeof runtime.getUtilGasMeterProductionOptions === 'function') {
            const options = runtime.getUtilGasMeterProductionOptions();
            if (Array.isArray(options)) {
                return options;
            }
        }
        return [];
    }

    function buildUtilGasMeterProductionSelectHtml(selectedKey = 'combined') {
        const normalizedKey = normalizeGasMeterProductionKey(selectedKey);
        return `
            <div class="util-sheet-meter-summary-toolbar">
                <label class="util-sheet-meter-summary-control">
                    <span class="util-sheet-meter-summary-control-label">기준</span>
                    <select class="util-sheet-meter-summary-select" data-role="util-sheet-meter-production-select" aria-label="가스 검침표 기준">
                        ${getGasMeterProductionOptions().map(option => `
                            <option value="${escapeHtml(option.key)}"${option.key === normalizedKey ? ' selected' : ''}>${escapeHtml(option.label)}</option>
                        `).join('')}
                    </select>
                </label>
            </div>
        `;
    }

    function buildUtilElectricMeterTeamSelectHtml(selectedKey = 'combined') {
        const normalizedKey = normalizeUtilElectricMeterTeamKey(selectedKey);
        return `
            <div class="util-sheet-meter-summary-toolbar">
                <label class="util-sheet-meter-summary-control">
                    <span class="util-sheet-meter-summary-control-label">기준</span>
                    <select class="util-sheet-meter-summary-select" data-role="util-sheet-meter-electric-team-select" aria-label="전기 검침표 기준">
                        ${UTIL_ELECTRIC_METER_TEAM_OPTIONS.map(option => `
                            <option value="${escapeHtml(option.key)}"${option.key === normalizedKey ? ' selected' : ''}>${escapeHtml(option.label)}</option>
                        `).join('')}
                    </select>
                </label>
            </div>
        `;
    }

    function buildUtilElectricAnalysisTeamSelectHtml(selectedKey = 'combined') {
        const normalizedKey = normalizeUtilElectricAnalysisTeamKey(selectedKey);
        return `
            <div class="util-sheet-meter-summary-toolbar">
                <label class="util-sheet-meter-summary-control">
                    <span class="util-sheet-meter-summary-control-label">기준</span>
                    <select class="util-sheet-meter-summary-select" data-role="util-sheet-analysis-electric-team-select" aria-label="전기 분석표 기준">
                        ${UTIL_ELECTRIC_ANALYSIS_TEAM_OPTIONS.map(option => `
                            <option value="${escapeHtml(option.key)}"${option.key === normalizedKey ? ' selected' : ''}>${escapeHtml(option.label)}</option>
                        `).join('')}
                    </select>
                </label>
            </div>
        `;
    }

    function buildUtilGasAnalysisCategorySelectHtml(selectedKey = 'plantA') {
        const normalizedKey = normalizeUtilGasAnalysisCategoryKey(selectedKey);
        return `
            <div class="util-sheet-meter-summary-toolbar">
                <label class="util-sheet-meter-summary-control">
                    <select class="util-sheet-meter-summary-select" data-role="util-sheet-analysis-gas-category-select" aria-label="가스 분석표 기준">
                        ${UTIL_GAS_ANALYSIS_CATEGORY_OPTIONS.map(option => `
                            <option value="${escapeHtml(option.key)}"${option.key === normalizedKey ? ' selected' : ''}>${escapeHtml(option.selectLabel || option.label)}</option>
                        `).join('')}
                    </select>
                </label>
            </div>
        `;
    }

    function buildUtilElectricMeterViewToggleHtml(selectedViewKey = 'meter') {
        const normalizedViewKey = normalizeUtilElectricMeterViewKey(selectedViewKey);
        return `
            <div class="util-sheet-segment" data-role="util-sheet-meter-electric-view-toggle" aria-label="전기 검침표 보기 선택">
                <button type="button" class="util-sheet-segment-btn${normalizedViewKey === 'meter' ? ' is-active' : ''}" data-role="util-sheet-meter-electric-view-select" data-view-key="meter" aria-pressed="${normalizedViewKey === 'meter' ? 'true' : 'false'}">검침표</button>
                <button type="button" class="util-sheet-segment-btn${normalizedViewKey === 'allocation' ? ' is-active' : ''}" data-role="util-sheet-meter-electric-view-select" data-view-key="allocation" aria-pressed="${normalizedViewKey === 'allocation' ? 'true' : 'false'}">설비 배부 요약</button>
                <button type="button" class="util-sheet-segment-btn${normalizedViewKey === 'team' ? ' is-active' : ''}" data-role="util-sheet-meter-electric-view-select" data-view-key="team" aria-pressed="${normalizedViewKey === 'team' ? 'true' : 'false'}">팀 요약</button>
            </div>
        `;
    }

    function buildUtilSheetMonthOptionHtml(monthOptions, selectedValue = '') {
        return (Array.isArray(monthOptions) ? monthOptions : []).map(item => `
            <option value="${escapeHtml(item.value)}"${item.value === selectedValue ? ' selected' : ''}>${escapeHtml(item.label)}</option>
        `).join('');
    }

    globalScope.KPIUtilReportSheetControls = {
        setRuntimeAdapters,
        buildUtilGasMeterProductionSelectHtml,
        buildUtilElectricMeterTeamSelectHtml,
        buildUtilElectricAnalysisTeamSelectHtml,
        buildUtilGasAnalysisCategorySelectHtml,
        buildUtilElectricMeterViewToggleHtml,
        buildUtilSheetMonthOptionHtml
    };
})(globalThis);
