(function registerUtilReportSheetAnalysisPopupTables(globalScope) {
    if (globalScope.KPIUtilReportSheetAnalysisPopupTables) {
        return;
    }

    const runtime = {
        escapeUtilSheetHtml: null,
        buildUtilGasAnalysisRatioTableControlHtml: null,
        formatUtilSheetRatio: null,
        formatUtilSheetDecimal: null,
        normalizeUtilSheetAnalysisDatasetKey: null,
        getUtilElectricAnalysisUnitKey: null,
        getUtilElectricAnalysisChartUnitLabel: null,
        getUtilElectricAnalysisChartDecimals: null,
        scaleUtilElectricAnalysisChartValue: null,
        resolveUtilElectricAnalysisPointValue: null,
        getUtilGasAnalysisUnitKey: null,
        getUtilGasAnalysisChartUnitLabel: null,
        getUtilGasAnalysisChartDecimals: null,
        scaleUtilGasAnalysisChartValue: null,
        resolveUtilGasAnalysisPointValue: null,
        getUtilSheetActiveAnalysisDatasetKey: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetAnalysisPopupTables;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function buildRatioTableControlHtml(controlItem = null, options = {}) {
        if (typeof runtime.buildUtilGasAnalysisRatioTableControlHtml === 'function') {
            return runtime.buildUtilGasAnalysisRatioTableControlHtml(controlItem, options);
        }
        return '';
    }

    function formatRatio(value, decimals = 0, fallback = '-') {
        if (typeof runtime.formatUtilSheetRatio === 'function') {
            return runtime.formatUtilSheetRatio(value, decimals, fallback);
        }
        return Number.isFinite(value) ? Number(value).toFixed(decimals) : fallback;
    }

    function formatDecimal(value, decimals = 0, fallback = '-') {
        if (typeof runtime.formatUtilSheetDecimal === 'function') {
            return runtime.formatUtilSheetDecimal(value, decimals, fallback);
        }
        return Number.isFinite(value) ? Number(value).toFixed(decimals) : fallback;
    }

    function normalizeDatasetKey(datasetKey = 'gas') {
        if (typeof runtime.normalizeUtilSheetAnalysisDatasetKey === 'function') {
            return runtime.normalizeUtilSheetAnalysisDatasetKey(datasetKey);
        }
        return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    }

    function getElectricUnitKey(chartKey = '') {
        if (typeof runtime.getUtilElectricAnalysisUnitKey === 'function') {
            return runtime.getUtilElectricAnalysisUnitKey(chartKey);
        }
        return '';
    }

    function getElectricUnitLabel(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilElectricAnalysisChartUnitLabel === 'function') {
            return runtime.getUtilElectricAnalysisChartUnitLabel(chartKey, unitKey);
        }
        return '';
    }

    function getElectricDecimals(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilElectricAnalysisChartDecimals === 'function') {
            return runtime.getUtilElectricAnalysisChartDecimals(chartKey, unitKey);
        }
        return 0;
    }

    function scaleElectricValue(chartKey = '', value, unitKey = '') {
        if (typeof runtime.scaleUtilElectricAnalysisChartValue === 'function') {
            return runtime.scaleUtilElectricAnalysisChartValue(chartKey, value, unitKey);
        }
        return Number.isFinite(value) ? value : null;
    }

    function resolveElectricPointValue(controlItem, point, unitKey = '') {
        if (typeof runtime.resolveUtilElectricAnalysisPointValue === 'function') {
            return runtime.resolveUtilElectricAnalysisPointValue(controlItem, point, unitKey);
        }
        return point?.value;
    }

    function getGasUnitKey(chartKey = '') {
        if (typeof runtime.getUtilGasAnalysisUnitKey === 'function') {
            return runtime.getUtilGasAnalysisUnitKey(chartKey);
        }
        return '';
    }

    function getGasUnitLabel(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartUnitLabel === 'function') {
            return runtime.getUtilGasAnalysisChartUnitLabel(chartKey, unitKey);
        }
        return '';
    }

    function getGasDecimals(chartKey = '', unitKey = '') {
        if (typeof runtime.getUtilGasAnalysisChartDecimals === 'function') {
            return runtime.getUtilGasAnalysisChartDecimals(chartKey, unitKey);
        }
        return 0;
    }

    function scaleGasValue(chartKey = '', value, unitKey = '') {
        if (typeof runtime.scaleUtilGasAnalysisChartValue === 'function') {
            return runtime.scaleUtilGasAnalysisChartValue(chartKey, value, unitKey);
        }
        return Number.isFinite(value) ? value : null;
    }

    function resolveGasPointValue(controlItem, point, unitKey = '') {
        if (typeof runtime.resolveUtilGasAnalysisPointValue === 'function') {
            return runtime.resolveUtilGasAnalysisPointValue(controlItem, point, unitKey);
        }
        return point?.value;
    }

    function getActiveAnalysisDatasetKey(modal) {
        if (typeof runtime.getUtilSheetActiveAnalysisDatasetKey === 'function') {
            return runtime.getUtilSheetActiveAnalysisDatasetKey(modal);
        }
        return 'gas';
    }

    function buildUtilGasAnalysisRangeTableHtml(table, controlItem = null, options = {}) {
        const monthHeaders = Array.from({ length: 12 }, (_, index) => `<th>${index + 1}월</th>`).join('');
        const rowsHtml = (Array.isArray(table?.rows) ? table.rows : []).map(row => `
            <tr>
                <th>
                    <div class="util-sheet-analysis-table-row-title">${escapeHtml(String(row.year).slice(-2))}年 ${escapeHtml(row.label)}</div>
                    <div class="util-sheet-analysis-table-row-unit">(${escapeHtml(row.unitLabel)})</div>
                </th>
                ${(Array.isArray(row.cells) ? row.cells : []).map(cell => `
                    <td class="${Number.isFinite(cell) ? 'is-strong' : 'is-empty'}">${escapeHtml(formatRatio(cell, 3, ''))}</td>
                `).join('')}
            </tr>
        `).join('');
        const cardClassName = [
            'util-sheet-analysis-table-card',
            options.hidden === true ? 'is-fullscreen-hidden' : ''
        ].filter(Boolean).join(' ');
        return `
            <article class="${escapeHtml(cardClassName)}" data-tone="${escapeHtml(table?.key || '')}">
                <div class="util-sheet-analysis-table-head">
                    <div class="util-sheet-analysis-table-title">${escapeHtml(table?.title || '')}</div>
                    <div class="util-sheet-analysis-table-sub">유틸리티 기입 사용량을 생산량으로 나눈 값입니다.</div>
                </div>
                ${buildRatioTableControlHtml(controlItem, options)}
                <div class="util-sheet-table-wrap">
                    <table class="util-sheet-table util-sheet-analysis-table">
                        <thead>
                            <tr>
                                <th>구분</th>
                                ${monthHeaders}
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </article>
        `;
    }

    function getUtilElectricAnalysisAllControlItems(model = null) {
        return [
            ...(Array.isArray(model?.combinedChart?.controlItems) ? model.combinedChart.controlItems : []),
            ...(Array.isArray(model?.charts)
                ? model.charts.flatMap(chart => Array.isArray(chart?.controlItems) ? chart.controlItems : [])
                : [])
        ];
    }

    function buildUtilGasAnalysisMetricTableModel(controlItem = null, datasetKey = 'gas') {
        const chartKey = String(controlItem?.key || '').trim();
        const points = Array.isArray(controlItem?.points) ? controlItem.points : [];
        if (!chartKey || !points.length) return null;
        const normalizedDatasetKey = normalizeDatasetKey(datasetKey);
        const monthKeys = points
            .map(point => String(point?.monthKey || point?.key || '').trim())
            .filter(Boolean);
        if (!monthKeys.length) return null;
        const activeMonthSet = new Set(monthKeys);
        const years = Array.from(new Set(
            monthKeys
                .map(monthKey => Number.parseInt(String(monthKey || '').slice(0, 4), 10))
                .filter(year => Number.isFinite(year))
        )).sort((a, b) => a - b);
        const pointMap = new Map(
            points.map(point => [String(point?.monthKey || point?.key || '').trim(), point])
        );
        const unitKey = normalizedDatasetKey === 'electric'
            ? getElectricUnitKey(chartKey)
            : getGasUnitKey(chartKey);
        const unitLabel = normalizedDatasetKey === 'electric'
            ? (getElectricUnitLabel(chartKey, unitKey)
                || String(controlItem?.unitLabel || controlItem?.metricLabel || '').trim())
            : (getGasUnitLabel(chartKey, unitKey)
                || String(controlItem?.unitLabel || controlItem?.metricLabel || '').trim());
        const decimals = normalizedDatasetKey === 'electric'
            ? getElectricDecimals(chartKey, unitKey)
            : getGasDecimals(chartKey, unitKey);
        const resolveScaledValue = (point) => {
            if (!point) return null;
            if (normalizedDatasetKey === 'electric') {
                return scaleElectricValue(
                    chartKey,
                    resolveElectricPointValue(controlItem, point, unitKey),
                    unitKey
                );
            }
            return scaleGasValue(
                chartKey,
                resolveGasPointValue(controlItem, point, unitKey),
                unitKey
            );
        };
        return {
            key: chartKey,
            title: String(controlItem?.title || '').trim(),
            unitLabel,
            decimals,
            tone: controlItem?.tone || 'neutral',
            rows: years.map(year => ({
                year,
                label: String(controlItem?.title || '').trim(),
                unitLabel,
                decimals,
                cells: Array.from({ length: 12 }, (_, index) => {
                    const monthKey = `${year}-${String(index + 1).padStart(2, '0')}`;
                    if (!activeMonthSet.has(monthKey)) return null;
                    const point = pointMap.get(monthKey);
                    const scaledValue = resolveScaledValue(point);
                    return Number.isFinite(scaledValue) ? scaledValue : null;
                })
            }))
        };
    }

    function buildUtilGasAnalysisMetricTableHtml(table, options = {}) {
        const monthHeaders = Array.from({ length: 12 }, (_, index) => `<th>${index + 1}월</th>`).join('');
        const rowsHtml = (Array.isArray(table?.rows) ? table.rows : []).map(row => `
            <tr>
                <th>
                    <div class="util-sheet-analysis-table-row-title">${escapeHtml(String(row.year).slice(-2))}年 ${escapeHtml(row.label)}</div>
                    <div class="util-sheet-analysis-table-row-unit">(${escapeHtml(row.unitLabel)})</div>
                </th>
                ${(Array.isArray(row.cells) ? row.cells : []).map(cell => `
                    <td class="${Number.isFinite(cell) ? 'is-strong' : 'is-empty'}">${escapeHtml(formatDecimal(cell, row?.decimals ?? table?.decimals ?? 0, ''))}</td>
                `).join('')}
            </tr>
        `).join('');
        const cardClassName = [
            'util-sheet-analysis-table-card',
            options.hidden === true ? 'is-fullscreen-hidden' : ''
        ].filter(Boolean).join(' ');
        return `
            <article class="${escapeHtml(cardClassName)}" data-tone="${escapeHtml(table?.tone || table?.key || '')}">
                <div class="util-sheet-analysis-table-head">
                    <div class="util-sheet-analysis-table-title">${escapeHtml(table?.title || '')}</div>
                    <div class="util-sheet-analysis-table-sub">현재 차트 값을 월별 표로 펼친 값입니다.</div>
                </div>
                <div class="util-sheet-table-wrap">
                    <table class="util-sheet-table util-sheet-analysis-table">
                        <thead>
                            <tr>
                                <th>구분</th>
                                ${monthHeaders}
                            </tr>
                        </thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>
            </article>
        `;
    }

    function getUtilGasAnalysisRatioTableByKey(modal, tableKey = '') {
        const normalizedTableKey = String(tableKey || '').trim().toLowerCase();
        if (!modal || !normalizedTableKey) return null;
        return (Array.isArray(modal._utilSheetAnalysisModel?.ratioTables) ? modal._utilSheetAnalysisModel.ratioTables : [])
            .find(table => String(table?.key || '').trim().toLowerCase() === normalizedTableKey) || null;
    }

    function getUtilGasAnalysisInlineTableEntry(modal, tableKey = '') {
        const normalizedTableKey = String(tableKey || '').trim().toLowerCase();
        if (!modal || !normalizedTableKey) return null;
        const datasetKey = getActiveAnalysisDatasetKey(modal);
        if (datasetKey === 'electric') {
            const electricControlItem = getUtilElectricAnalysisAllControlItems(modal._utilSheetAnalysisModel)
                .find(item => String(item?.key || '').trim().toLowerCase() === normalizedTableKey) || null;
            const electricTable = buildUtilGasAnalysisMetricTableModel(electricControlItem, 'electric');
            if (!electricTable) return null;
            return {
                key: normalizedTableKey,
                kind: 'metric',
                table: electricTable,
                controlItem: electricControlItem
            };
        }
        const ratioTable = getUtilGasAnalysisRatioTableByKey(modal, normalizedTableKey);
        if (ratioTable) {
            const ratioControlItem = (Array.isArray(modal._utilSheetAnalysisModel?.ratioCombinedChart?.controlItems)
                ? modal._utilSheetAnalysisModel.ratioCombinedChart.controlItems
                : []).find(item => String(item?.key || '').trim() === `ratio-${normalizedTableKey}`) || null;
            return {
                key: normalizedTableKey,
                kind: 'ratio',
                table: ratioTable,
                controlItem: ratioControlItem
            };
        }
        const ratioMetricControlItem = (Array.isArray(modal._utilSheetAnalysisModel?.ratioCombinedChart?.controlItems)
            ? modal._utilSheetAnalysisModel.ratioCombinedChart.controlItems
            : []).find(item => String(item?.key || '').trim().toLowerCase() === normalizedTableKey) || null;
        const ratioMetricTable = buildUtilGasAnalysisMetricTableModel(ratioMetricControlItem, 'gas');
        if (ratioMetricTable) {
            return {
                key: normalizedTableKey,
                kind: 'metric',
                table: ratioMetricTable,
                controlItem: ratioMetricControlItem
            };
        }
        const metricControlItem = (Array.isArray(modal._utilSheetAnalysisModel?.combinedChart?.controlItems)
            ? modal._utilSheetAnalysisModel.combinedChart.controlItems
            : []).find(item => String(item?.key || '').trim().toLowerCase() === normalizedTableKey) || null;
        const metricTable = buildUtilGasAnalysisMetricTableModel(metricControlItem, 'gas');
        if (!metricTable) return null;
        return {
            key: normalizedTableKey,
            kind: 'metric',
            table: metricTable,
            controlItem: metricControlItem
        };
    }

    function getUtilGasAnalysisInlineTablePosition(modal) {
        const rawX = Number(modal?.dataset?.analysisInlineRatioTableX);
        const rawY = Number(modal?.dataset?.analysisInlineRatioTableY);
        if (!Number.isFinite(rawX) || !Number.isFinite(rawY)) return null;
        return {
            x: rawX,
            y: rawY
        };
    }

    function getUtilGasAnalysisInlineRatioTableKey(modal, tableKey = '') {
        const normalizedTableKey = String(tableKey || modal?.dataset?.analysisInlineRatioTableKey || '').trim().toLowerCase();
        if (!normalizedTableKey) return '';
        return getUtilGasAnalysisInlineTableEntry(modal, normalizedTableKey) ? normalizedTableKey : '';
    }

    function buildUtilGasAnalysisFloatingTablePanelHtml(modal, model, tableKey = '') {
        const normalizedTableKey = getUtilGasAnalysisInlineRatioTableKey(modal, tableKey);
        if (!normalizedTableKey) return '';
        const tableEntry = getUtilGasAnalysisInlineTableEntry(modal, normalizedTableKey);
        const panelPosition = getUtilGasAnalysisInlineTablePosition(modal);
        const styleAttr = panelPosition
            ? ` style="left:${escapeHtml(String(panelPosition.x))}px;top:${escapeHtml(String(panelPosition.y))}px;right:auto;"`
            : '';
        if (!tableEntry?.table) return '';
        const bodyHtml = tableEntry.kind === 'ratio'
            ? buildUtilGasAnalysisRangeTableHtml(tableEntry.table, tableEntry.controlItem, { hideDisplayModeControls: true })
            : buildUtilGasAnalysisMetricTableHtml(tableEntry.table);
        return `
            <div class="util-sheet-analysis-inline-table-panel" data-role="util-sheet-analysis-inline-table-panel" data-table-key="${escapeHtml(normalizedTableKey)}"${styleAttr}>
                <div class="util-sheet-analysis-inline-table-panel-body">
                    <div class="util-sheet-analysis-inline-table-toolbar">
                        <button type="button" class="util-sheet-analysis-inline-table-handle" data-role="util-sheet-analysis-inline-table-drag" aria-label="표 이동" title="표 이동">
                            <i class="fa-solid fa-grip-lines" aria-hidden="true"></i>
                        </button>
                        <button type="button" class="util-sheet-analysis-inline-table-close" data-role="util-sheet-analysis-inline-table-close" aria-label="표 닫기" title="표 닫기">
                            <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                        </button>
                    </div>
                    ${bodyHtml}
                </div>
            </div>
        `;
    }

    function getUtilGasAnalysisChartModelByKey(modal, chartKey = '') {
        const normalizedChartKey = String(chartKey || '').trim();
        if (!modal || !normalizedChartKey) return null;
        if (normalizedChartKey === 'combined') {
            return modal._utilSheetAnalysisModel?.combinedChart || null;
        }
        if (normalizedChartKey === 'ratio-combined') {
            return modal._utilSheetAnalysisModel?.ratioCombinedChart || null;
        }
        return (Array.isArray(modal._utilSheetAnalysisModel?.charts) ? modal._utilSheetAnalysisModel.charts : [])
            .find(item => String(item?.key || '').trim() === normalizedChartKey) || null;
    }

    function buildUtilGasAnalysisRatioTablePopupKey(tableKey = '') {
        const normalizedTableKey = String(tableKey || '').trim().toLowerCase();
        return normalizedTableKey ? `ratio-table-${normalizedTableKey}` : '';
    }

    function parseUtilGasAnalysisRatioTablePopupKey(popupKey = '') {
        const match = /^ratio-table-(.+)$/iu.exec(String(popupKey || '').trim());
        return match ? String(match[1] || '').trim().toLowerCase() : '';
    }

    function normalizeUtilGasAnalysisFullscreenChartKey(modal, chartKey = '') {
        if (!modal) return '';
        const candidates = [];
        const preferredKey = String(chartKey || '').trim();
        if (preferredKey) candidates.push(preferredKey);
        candidates.push('combined');
        if (modal._utilSheetAnalysisModel?.ratioCombinedChart) candidates.push('ratio-combined');
        (Array.isArray(modal._utilSheetAnalysisModel?.charts) ? modal._utilSheetAnalysisModel.charts : []).forEach(item => {
            const nextKey = String(item?.key || '').trim();
            if (nextKey) candidates.push(nextKey);
        });
        const uniqueKeys = Array.from(new Set(candidates.filter(Boolean)));
        const matchedKey = uniqueKeys.find(candidateKey => isUtilGasAnalysisChartRenderable(getUtilGasAnalysisChartModelByKey(modal, candidateKey)));
        return matchedKey || '';
    }

    function normalizeUtilGasAnalysisPopupKey(modal, popupKey = '') {
        const tableKey = parseUtilGasAnalysisRatioTablePopupKey(popupKey);
        if (tableKey) {
            return getUtilGasAnalysisRatioTableByKey(modal, tableKey)
                ? buildUtilGasAnalysisRatioTablePopupKey(tableKey)
                : '';
        }
        return normalizeUtilGasAnalysisFullscreenChartKey(modal, popupKey);
    }

    function isUtilGasAnalysisChartRenderable(chart) {
        if (!chart || typeof chart !== 'object') return false;
        if (Array.isArray(chart.chartDataList)) return chart.chartDataList.length > 0;
        if (Array.isArray(chart.series)) return chart.series.length > 0;
        return Array.isArray(chart.points) && chart.points.some(point => Number.isFinite(point?.value));
    }

    globalScope.KPIUtilReportSheetAnalysisPopupTables = {
        setRuntimeAdapters,
        buildUtilGasAnalysisRangeTableHtml,
        getUtilElectricAnalysisAllControlItems,
        buildUtilGasAnalysisMetricTableModel,
        buildUtilGasAnalysisMetricTableHtml,
        getUtilGasAnalysisInlineTableEntry,
        buildUtilGasAnalysisFloatingTablePanelHtml,
        getUtilGasAnalysisChartModelByKey,
        buildUtilGasAnalysisRatioTablePopupKey,
        parseUtilGasAnalysisRatioTablePopupKey,
        getUtilGasAnalysisRatioTableByKey,
        getUtilGasAnalysisInlineRatioTableKey,
        getUtilGasAnalysisInlineTablePosition,
        normalizeUtilGasAnalysisPopupKey,
        isUtilGasAnalysisChartRenderable,
        normalizeUtilGasAnalysisFullscreenChartKey
    };
})(globalThis);
