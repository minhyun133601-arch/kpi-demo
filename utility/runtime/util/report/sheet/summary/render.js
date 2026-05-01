(function registerUtilReportSheetSummaryRender(globalScope) {
    if (globalScope.KPIUtilReportSheetSummaryRender) {
        return;
    }

    const runtime = {
        escapeUtilSheetHtml: null,
        normalizeUtilSheetCompareKey: null,
        buildUtilSheetCompareSub: null,
        getUtilSheetCompareLabel: null,
        shiftUtilSheetMonthKey: null,
        getUtilGasMeterProductionOption: null,
        getUtilGasMeterScopedUsageMetric: null,
        getUtilGasMeterScopedCost: null,
        getUtilGasProductionMetric: null,
        getUtilGasMeterColumn: null,
        buildUtilGasAnalysisCompareSub: null,
        buildUtilElectricMeterTeamDatasetResult: null,
        getUtilElectricMeterTeamOption: null,
        buildUtilSheetAnalysisSummaryGridHtml: null,
        calculateUtilSheetPercentDelta: null,
        formatUtilSheetSignedPercent: null,
        getGasAnalysisProductionStartDay: null,
        formatUtilReportMonthShort: null,
        formatUtilReportMonthLong: null,
        formatUtilSheetQuantity: null,
        formatUtilSheetSignedQuantity: null,
        formatUtilSheetInteger: null,
        formatUtilSheetCost: null,
        formatUtilSheetSignedCost: null,
        formatUtilSheetUnit: null,
        formatUtilSheetSignedUnit: null
    };

    const utilReportSheetControls = globalScope.KPIUtilReportSheetControls;
    if (!utilReportSheetControls) {
        throw new Error('KPIUtilReportSheetControls must load before KPI.util.report.sheet.summary.render.js');
    }
    const {
        buildUtilGasMeterProductionSelectHtml: buildGasMeterProductionSelectControlHtml,
        buildUtilElectricMeterTeamSelectHtml: buildElectricMeterTeamSelectControlHtml
    } = utilReportSheetControls;

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetSummaryRender;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function normalizeCompareKey(compareKey = 'month') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function buildCompareSub(compareMeta, formattedDelta) {
        if (typeof runtime.buildUtilSheetCompareSub === 'function') {
            return runtime.buildUtilSheetCompareSub(compareMeta, formattedDelta);
        }
        return formattedDelta === '-'
            ? `${compareMeta.label} ${compareMeta.referenceLabel || ''}`.trim()
            : `${compareMeta.label} ${formattedDelta} · ${compareMeta.referenceLabel || ''}`.trim();
    }

    function formatMonthShort(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthShort === 'function') {
            return runtime.formatUtilReportMonthShort(monthKey);
        }
        return String(monthKey || '');
    }

    function formatMonthLong(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthLong === 'function') {
            return runtime.formatUtilReportMonthLong(monthKey);
        }
        return String(monthKey || '');
    }

    function formatQuantity(value, unit, fallback = '-') {
        if (typeof runtime.formatUtilSheetQuantity === 'function') {
            return runtime.formatUtilSheetQuantity(value, unit, fallback);
        }
        return String(value ?? fallback);
    }

    function formatSignedQuantity(value, unit, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedQuantity === 'function') {
            return runtime.formatUtilSheetSignedQuantity(value, unit, fallback);
        }
        return String(value ?? fallback);
    }

    function formatInteger(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetInteger === 'function') {
            return runtime.formatUtilSheetInteger(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetCost === 'function') {
            return runtime.formatUtilSheetCost(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatSignedCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedCost === 'function') {
            return runtime.formatUtilSheetSignedCost(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatUnit(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetUnit === 'function') {
            return runtime.formatUtilSheetUnit(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatSignedUnit(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedUnit === 'function') {
            return runtime.formatUtilSheetSignedUnit(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatSignedPercent(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedPercent === 'function') {
            return runtime.formatUtilSheetSignedPercent(value, fallback);
        }
        return String(value ?? fallback);
    }

    function calculatePercentDelta(currentValue, referenceValue) {
        if (typeof runtime.calculateUtilSheetPercentDelta === 'function') {
            return runtime.calculateUtilSheetPercentDelta(currentValue, referenceValue);
        }
        return null;
    }

    function getCompareLabel(compareKey = 'month') {
        if (typeof runtime.getUtilSheetCompareLabel === 'function') {
            return runtime.getUtilSheetCompareLabel(compareKey);
        }
        return normalizeCompareKey(compareKey) === 'year' ? '전년대비' : '전월대비';
    }

    function shiftMonthKey(monthKey = '', offset = 0) {
        if (typeof runtime.shiftUtilSheetMonthKey === 'function') {
            return runtime.shiftUtilSheetMonthKey(monthKey, offset);
        }
        return String(monthKey || '');
    }

    function getGasMeterProductionOption(productionKey = 'combined') {
        if (typeof runtime.getUtilGasMeterProductionOption === 'function') {
            return runtime.getUtilGasMeterProductionOption(productionKey);
        }
        return { key: 'combined', label: '전체', icon: 'fa-industry', teamNames: [] };
    }

    function getGasMeterScopedUsageMetric(monthKey = '', fuelKey = 'lng', productionOption = null) {
        if (typeof runtime.getUtilGasMeterScopedUsageMetric === 'function') {
            return runtime.getUtilGasMeterScopedUsageMetric(monthKey, fuelKey, productionOption);
        }
        return null;
    }

    function getGasMeterScopedCost(summary, table, fuelKey = 'lng', productionOption = null) {
        if (typeof runtime.getUtilGasMeterScopedCost === 'function') {
            return runtime.getUtilGasMeterScopedCost(summary, table, fuelKey, productionOption);
        }
        return null;
    }

    function getGasProductionMetric(monthKey = '', teamNames = []) {
        if (typeof runtime.getUtilGasProductionMetric === 'function') {
            return runtime.getUtilGasProductionMetric(monthKey, teamNames);
        }
        return null;
    }

    function getGasMeterColumn(table, fieldId = '') {
        if (typeof runtime.getUtilGasMeterColumn === 'function') {
            return runtime.getUtilGasMeterColumn(table, fieldId);
        }
        return null;
    }

    function buildGasAnalysisCompareSub(compareLabel, monthKey, deltaText) {
        if (typeof runtime.buildUtilGasAnalysisCompareSub === 'function') {
            return runtime.buildUtilGasAnalysisCompareSub(compareLabel, monthKey, deltaText);
        }
        return `${compareLabel} ${deltaText} · ${monthKey}`.trim();
    }

    function buildElectricMeterTeamDatasetResult(activeMonthKey = '', teamKey = 'combined') {
        if (typeof runtime.buildUtilElectricMeterTeamDatasetResult === 'function') {
            return runtime.buildUtilElectricMeterTeamDatasetResult(activeMonthKey, teamKey);
        }
        return null;
    }

    function getElectricMeterTeamOption(teamKey = 'combined') {
        if (typeof runtime.getUtilElectricMeterTeamOption === 'function') {
            return runtime.getUtilElectricMeterTeamOption(teamKey);
        }
        return { key: teamKey || 'combined', label: '전체' };
    }

    function buildGasMeterProductionSelectHtml(selectedKey = 'combined') {
        return buildGasMeterProductionSelectControlHtml(selectedKey);
    }

    function buildElectricMeterTeamSelectHtml(selectedKey = 'combined') {
        return buildElectricMeterTeamSelectControlHtml(selectedKey);
    }

    function buildUtilGasMeterUsageSplitItems(gasMeterComparisonModel, compareKey = 'month') {
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const compareLabel = getCompareLabel(normalizedCompareKey);
        const referenceMonthKey = String(gasMeterComparisonModel?.referenceTable?.monthKey || '').trim();
        const referenceLabel = referenceMonthKey
            ? formatMonthLong(referenceMonthKey)
            : (normalizedCompareKey === 'year' ? '전년 동월 없음' : '전월 없음');
        const compareMeta = { label: compareLabel, referenceLabel };
        const currentLpgUsage = getGasMeterColumn(gasMeterComparisonModel?.selectedTable, 'gas_field_02')?.usage;
        const referenceLpgUsage = getGasMeterColumn(gasMeterComparisonModel?.referenceTable, 'gas_field_02')?.usage;
        const currentLngUsage = Number.isFinite(gasMeterComparisonModel?.billingSummary?.lng?.totalUsage)
            ? gasMeterComparisonModel.billingSummary.lng.totalUsage
            : getGasMeterColumn(gasMeterComparisonModel?.selectedTable, 'gas_field_01')?.usage;
        const referenceLngUsage = getGasMeterColumn(gasMeterComparisonModel?.referenceTable, 'gas_field_01')?.usage;

        if (!gasMeterComparisonModel?.ready) {
            const loadingSub = gasMeterComparisonModel?.loading ? '원본 검침표 불러오는 중' : '비교 가능한 검침값 없음';
            return [
                { label: 'LPG', value: '-', sub: loadingSub, tone: 'lpg' },
                { label: 'LNG', value: '-', sub: loadingSub, tone: 'lng' }
            ];
        }

        return [
            {
                label: 'LPG',
                value: formatQuantity(currentLpgUsage, 'kg'),
                sub: buildCompareSub(compareMeta, formatSignedQuantity(
                    Number.isFinite(currentLpgUsage) && Number.isFinite(referenceLpgUsage)
                        ? currentLpgUsage - referenceLpgUsage
                        : null,
                    'kg'
                )),
                tone: 'lpg'
            },
            {
                label: 'LNG',
                value: formatQuantity(currentLngUsage, 'Nm3'),
                sub: buildCompareSub(compareMeta, formatSignedQuantity(
                    Number.isFinite(currentLngUsage) && Number.isFinite(referenceLngUsage)
                        ? currentLngUsage - referenceLngUsage
                        : null,
                    'Nm3'
                )),
                tone: 'lng'
            }
        ];
    }

    function buildAnalysisSummaryGridHtml(summaryItems = []) {
        if (typeof runtime.buildUtilSheetAnalysisSummaryGridHtml === 'function') {
            return runtime.buildUtilSheetAnalysisSummaryGridHtml(summaryItems);
        }
        return '';
    }

    function getGasAnalysisProductionStartDay() {
        if (typeof runtime.getGasAnalysisProductionStartDay === 'function') {
            return runtime.getGasAnalysisProductionStartDay();
        }
        return 1;
    }

    function buildUtilSheetCompareMeta(datasetResult, compareKey = 'month') {
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const isYearCompare = normalizedCompareKey === 'year';
        return {
            key: normalizedCompareKey,
            label: isYearCompare ? '전년대비' : '전월대비',
            referenceRow: isYearCompare ? datasetResult.prevYearRow : datasetResult.prevMonthRow,
            referenceLabel: isYearCompare
                ? (datasetResult.prevYearRow ? formatMonthLong(datasetResult.prevYearRow.monthKey) : '전년 동월 없음')
                : (datasetResult.prevMonthRow ? formatMonthLong(datasetResult.prevMonthRow.monthKey) : '전월 없음'),
            usageDelta: isYearCompare ? datasetResult.deltaUsageVsPrevYear : datasetResult.deltaUsageVsPrevMonth,
            costDelta: isYearCompare ? datasetResult.deltaCostVsPrevYear : datasetResult.deltaCostVsPrevMonth,
            productionDelta: isYearCompare ? datasetResult.deltaProductionVsPrevYear : datasetResult.deltaProductionVsPrevMonth,
            unitDelta: isYearCompare ? datasetResult.deltaUnitVsPrevYear : datasetResult.deltaUnitVsPrevMonth
        };
    }

    function buildHeadlineItems(datasetResult, compareKey = 'month') {
        const compareMeta = buildUtilSheetCompareMeta(datasetResult, compareKey);
        return [
            {
                label: '사용량',
                value: formatQuantity(datasetResult.latestUsage, datasetResult.spec.usageUnit),
                sub: buildCompareSub(compareMeta, formatSignedQuantity(compareMeta.usageDelta, datasetResult.spec.usageUnit)),
                icon: 'fa-gauge-high',
                tone: 'usage'
            },
            {
                label: '비용',
                value: formatCost(datasetResult.latestCost),
                sub: buildCompareSub(compareMeta, formatSignedCost(compareMeta.costDelta)),
                icon: 'fa-coins',
                tone: 'cost'
            },
            {
                label: '생산량',
                value: formatQuantity(datasetResult.latestProduction, 'kg'),
                sub: buildCompareSub(compareMeta, formatSignedQuantity(compareMeta.productionDelta, 'kg')),
                icon: 'fa-industry',
                tone: 'production'
            },
            {
                label: '원단위',
                value: formatUnit(datasetResult.latestUnit),
                sub: buildCompareSub(compareMeta, formatSignedUnit(compareMeta.unitDelta)),
                icon: 'fa-scale-balanced',
                tone: 'unit'
            }
        ];
    }

    function buildStatItems(sheetType, datasetResult, compareKey = 'month', gasMeterComparisonModel = null) {
        const stats = buildHeadlineItems(datasetResult, compareKey);
        if (sheetType === 'meter' && datasetResult?.spec?.key === 'gas' && stats.length) {
            return [
                {
                    label: '사용량',
                    layout: 'usage-pair',
                    splitItems: buildUtilGasMeterUsageSplitItems(gasMeterComparisonModel, compareKey)
                },
                ...stats.slice(1)
            ];
        }
        return stats;
    }

    function buildUtilSheetBadgesHtml(sheetType, datasetResult, compareKey = 'month') {
        void sheetType;
        const compareMeta = buildUtilSheetCompareMeta(datasetResult, compareKey);
        return [
            `고정 기준 ${formatMonthShort(datasetResult.activeMonthKey || datasetResult.bounds.to)}`,
            `${datasetResult.spec.label} 선택`,
            compareMeta.label
        ].map(label => `<span class="util-sheet-badge">${escapeHtml(label)}</span>`).join('');
    }

    function buildUtilSheetStatsHtml(sheetType, datasetResult, compareKey = 'month', gasMeterComparisonModel = null) {
        const stats = buildStatItems(sheetType, datasetResult, compareKey, gasMeterComparisonModel);
        return stats.map(item => `
            <div class="util-sheet-stat${Array.isArray(item.splitItems) && item.splitItems.length ? ' is-split' : ''}" data-layout="${escapeHtml(item.layout || '')}">
                <div class="util-sheet-stat-label">${escapeHtml(item.label)}</div>
                ${Array.isArray(item.splitItems) && item.splitItems.length ? `
                    <div class="util-sheet-stat-split-list">
                        ${item.splitItems.map(part => `
                            <div class="util-sheet-stat-split-item" data-tone="${escapeHtml(part.tone || '')}" title="${escapeHtml(part.label || '')}">
                                <div class="util-sheet-stat-split-head">
                                    <div class="util-sheet-stat-split-kicker">${escapeHtml(part.label || '')}</div>
                                    <div class="util-sheet-stat-split-value">${escapeHtml(part.value || '-')}</div>
                                </div>
                                <div class="util-sheet-stat-split-sub">${escapeHtml(part.sub || '')}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="util-sheet-stat-value">${escapeHtml(item.value)}</div>
                    <div class="util-sheet-stat-sub">${escapeHtml(item.sub || '')}</div>
                `}
            </div>
        `).join('');
    }

    function buildUtilSheetCompareCardsHtml(datasetResult) {
        const items = [
            { label: '전월 비용 증감', value: formatSignedCost(datasetResult.deltaCostVsPrevMonth), sub: datasetResult.prevMonthRow ? formatMonthLong(datasetResult.prevMonthRow.monthKey) : '비교월 없음' },
            { label: '전년 동월 비용 증감', value: formatSignedCost(datasetResult.deltaCostVsPrevYear), sub: datasetResult.prevYearRow ? formatMonthLong(datasetResult.prevYearRow.monthKey) : '전년 동월 없음' },
            { label: '전월 원단위 증감', value: formatSignedUnit(datasetResult.deltaUnitVsPrevMonth), sub: datasetResult.prevMonthRow ? formatMonthLong(datasetResult.prevMonthRow.monthKey) : '비교월 없음' },
            { label: '전년 동월 원단위 증감', value: formatSignedUnit(datasetResult.deltaUnitVsPrevYear), sub: datasetResult.prevYearRow ? formatMonthLong(datasetResult.prevYearRow.monthKey) : '전년 동월 없음' }
        ];
        return items.map(item => `
            <div class="util-sheet-compare-card">
                <div class="util-sheet-compare-label">${escapeHtml(item.label)}</div>
                <div class="util-sheet-compare-value">${escapeHtml(item.value)}</div>
                <div class="util-sheet-compare-sub">${escapeHtml(item.sub)}</div>
            </div>
        `).join('');
    }

    function buildUtilSheetMatrixHtml(datasetResult) {
        const monthHeaders = datasetResult.matrixMonths.map(month => `<th>${month}월</th>`).join('');
        const rowsHtml = datasetResult.matrixRows.map(item => `
            <tr>
                <th>${escapeHtml(String(item.year))}</th>
                ${item.cells.map(cell => `
                    <td class="${Number.isFinite(cell?.[datasetResult.spec.unitKey]) ? 'is-strong' : ''}">
                        ${escapeHtml(formatUnit(cell?.[datasetResult.spec.unitKey]))}
                    </td>
                `).join('')}
            </tr>
        `).join('');
        return `
            <div class="util-sheet-table-wrap">
                <table class="util-sheet-table is-matrix">
                    <thead>
                        <tr>
                            <th>연도</th>
                            ${monthHeaders}
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    }

    function buildUtilSheetRecentTableHtml(datasetResult) {
        const rowsHtml = datasetResult.recentRows.map(row => {
            const prevIndex = datasetResult.rows.findIndex(item => item.monthKey === row.monthKey) - 1;
            const prevRow = prevIndex >= 0 ? datasetResult.rows[prevIndex] : null;
            const deltaCost = Number.isFinite(row?.[datasetResult.spec.costKey]) && Number.isFinite(prevRow?.[datasetResult.spec.costKey])
                ? row[datasetResult.spec.costKey] - prevRow[datasetResult.spec.costKey]
                : null;
            return `
                <tr>
                    <td class="is-strong">${escapeHtml(formatMonthShort(row.monthKey))}</td>
                    <td>${escapeHtml(formatInteger(row?.[datasetResult.spec.usageKey]))}${escapeHtml(datasetResult.spec.usageUnit)}</td>
                    <td>${escapeHtml(formatCost(row?.[datasetResult.spec.costKey]))}</td>
                    <td>${escapeHtml(formatInteger(row?.production))}kg</td>
                    <td>${escapeHtml(formatUnit(row?.[datasetResult.spec.unitKey]))}</td>
                    <td>${escapeHtml(formatSignedCost(deltaCost))}</td>
                </tr>
            `;
        }).join('');
        return `
            <div class="util-sheet-table-wrap">
                <table class="util-sheet-table">
                    <thead>
                        <tr>
                            <th>월</th>
                            <th>사용량</th>
                            <th>비용</th>
                            <th>생산량</th>
                            <th>원단위</th>
                            <th>전월 비용 증감</th>
                        </tr>
                    </thead>
                    <tbody>${rowsHtml}</tbody>
                </table>
            </div>
        `;
    }

    function buildUtilSheetMemoSectionHtml(insights = []) {
        const items = Array.isArray(insights)
            ? insights.filter(item => String(item || '').trim())
            : [];
        if (!items.length) return '';
        return `
            <section class="util-sheet-section util-sheet-memo-section">
                <div class="util-sheet-section-head">
                    <div>
                        <div class="util-sheet-section-title">요약 메모</div>
                        <div class="util-sheet-section-sub">현재 집계 데이터를 기준으로 주요 변화만 짧게 정리했습니다.</div>
                    </div>
                </div>
                <ul class="util-sheet-note-list">
                    ${items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
                </ul>
            </section>
        `;
    }

    function buildUtilSheetInsights(sheetType, datasetResult) {
        const spec = datasetResult.spec;
        if (sheetType === 'meter') {
            return [
                `${datasetResult.latestMonthLabel} ${spec.label} 비용은 전월 대비 ${formatSignedCost(datasetResult.deltaCostVsPrevMonth)}입니다.`,
                `${datasetResult.latestMonthLabel} ${spec.label} 비용은 전년 동월 대비 ${formatSignedCost(datasetResult.deltaCostVsPrevYear)}입니다.`,
                `${datasetResult.latestRow.year}년 ${datasetResult.latestRow.month}월 누적 ${spec.label} 비용은 ${formatCost(datasetResult.currentYearSummary.cost)}입니다.`,
                `${datasetResult.latestMonthLabel} 생산량은 ${formatInteger(datasetResult.latestProduction)}kg입니다.`
            ];
        }

        const peakRow = datasetResult.rows.reduce((best, row) => {
            const nextValue = Number.isFinite(row?.[spec.unitKey]) ? row[spec.unitKey] : -Infinity;
            const bestValue = Number.isFinite(best?.[spec.unitKey]) ? best[spec.unitKey] : -Infinity;
            return nextValue > bestValue ? row : best;
        }, null);
        return [
            `${datasetResult.latestMonthLabel} ${spec.label} 원단위는 전년 동월 대비 ${formatSignedUnit(datasetResult.deltaUnitVsPrevYear)}입니다.`,
            `${datasetResult.latestMonthLabel} ${spec.label} 비용은 전년 동월 대비 ${formatSignedCost(datasetResult.deltaCostVsPrevYear)}입니다.`,
            `${datasetResult.latestRow.year}년 ${datasetResult.latestRow.month}월 누적 ${spec.label} 원단위는 ${formatUnit(datasetResult.currentYearSummary.unit)}입니다.`,
            peakRow ? `${formatMonthLong(peakRow.monthKey)}이 최근 범위에서 원단위 최고 구간입니다.` : '비교 가능한 원단위 데이터가 없습니다.'
        ];
    }

    function buildUtilGasMeterInsightLine(model, fieldId, label) {
        const currentValue = getGasMeterColumn(model?.selectedTable, fieldId)?.correctedUsage;
        const previousValue = getGasMeterColumn(model?.referenceTable, fieldId)?.correctedUsage;
        return `${label} ${formatSignedPercent(calculatePercentDelta(currentValue, previousValue))}`;
    }

    function buildUtilGasMeterInsights(datasetResult, gasMeterComparisonModel) {
        const costPercent = calculatePercentDelta(datasetResult.latestCost, datasetResult.prevMonthRow?.[datasetResult.spec.costKey]);
        const productionPercent = calculatePercentDelta(datasetResult.latestProduction, datasetResult.prevMonthRow?.production);
        const lineRates = [
            buildUtilGasMeterInsightLine(gasMeterComparisonModel, 'gas_field_02', 'Process Alpha(LPG)'),
            buildUtilGasMeterInsightLine(gasMeterComparisonModel, 'gas_field_03', 'Demo Boiler A'),
            buildUtilGasMeterInsightLine(gasMeterComparisonModel, 'gas_field_04', 'Demo Boiler B'),
            buildUtilGasMeterInsightLine(gasMeterComparisonModel, 'gas_field_06', 'Process Gamma보일러')
        ].join(' · ');
        return [
            `${datasetResult.latestMonthLabel} 가스비 비용 전월대비 증감율은 ${formatSignedPercent(costPercent)}입니다.`,
            `${datasetResult.latestRow.year}년 누적비용은 ${formatCost(datasetResult.currentYearSummary.cost)}입니다.`,
            `${datasetResult.latestMonthLabel} 생산량 전월대비 증감율은 ${formatSignedPercent(productionPercent)}입니다.`,
            `라인별 품목 변화율: ${lineRates}`
        ];
    }

    function resolveUtilSheetMemoItems(sheetType, datasetKey, datasetResult, compareKey = 'month', gasMeterComparisonModel = null) {
        void compareKey;
        if (datasetKey === 'gas' && gasMeterComparisonModel?.ready) {
            return buildUtilGasMeterInsights(datasetResult, gasMeterComparisonModel);
        }
        return buildUtilSheetInsights(sheetType, datasetResult, compareKey);
    }

    function buildUtilGasMeterSummaryItems(datasetResult, compareKey = 'month', gasMeterComparisonModel = null, productionKey = 'combined') {
        const activeMonthKey = String(datasetResult?.activeMonthKey || datasetResult?.latestRow?.monthKey || '').trim();
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const compareLabel = getCompareLabel(normalizedCompareKey);
        const referenceMonthKey = normalizedCompareKey === 'year'
            ? shiftMonthKey(activeMonthKey, -12)
            : shiftMonthKey(activeMonthKey, -1);
        const productionOption = getGasMeterProductionOption(productionKey);
        const activeMonthLabel = activeMonthKey ? formatMonthShort(activeMonthKey) : '-';
        const currentLpgUsage = productionOption.key === 'combined'
            ? getGasMeterColumn(gasMeterComparisonModel?.selectedTable, 'gas_field_02')?.usage
            : getGasMeterScopedUsageMetric(activeMonthKey, 'lpg', productionOption);
        const referenceLpgUsage = productionOption.key === 'combined'
            ? getGasMeterColumn(gasMeterComparisonModel?.referenceTable, 'gas_field_02')?.usage
            : getGasMeterScopedUsageMetric(referenceMonthKey, 'lpg', productionOption);
        const currentLpgCost = getGasMeterScopedCost(
            gasMeterComparisonModel?.billingSummary,
            gasMeterComparisonModel?.selectedTable,
            'lpg',
            productionOption
        );
        const currentLngUsage = productionOption.key === 'combined'
            ? (
                Number.isFinite(gasMeterComparisonModel?.billingSummary?.lng?.totalUsage)
                    ? gasMeterComparisonModel.billingSummary.lng.totalUsage
                    : getGasMeterColumn(gasMeterComparisonModel?.selectedTable, 'gas_field_01')?.usage
            )
            : getGasMeterScopedUsageMetric(activeMonthKey, 'lng', productionOption);
        const referenceLngUsage = productionOption.key === 'combined'
            ? getGasMeterColumn(gasMeterComparisonModel?.referenceTable, 'gas_field_01')?.usage
            : getGasMeterScopedUsageMetric(referenceMonthKey, 'lng', productionOption);
        const currentLngCost = getGasMeterScopedCost(
            gasMeterComparisonModel?.billingSummary,
            gasMeterComparisonModel?.selectedTable,
            'lng',
            productionOption
        );
        const currentProduction = getGasProductionMetric(activeMonthKey, productionOption.teamNames);
        const referenceProduction = getGasProductionMetric(referenceMonthKey, productionOption.teamNames);
        const productionDelta = Number.isFinite(currentProduction) && Number.isFinite(referenceProduction)
            ? currentProduction - referenceProduction
            : null;
        const scopeMetaText = `선택월 값 · ${activeMonthLabel} · 기준 ${productionOption.label}`;
        const productionMetaText = `${scopeMetaText} · 시작일 ${getGasAnalysisProductionStartDay()}일`;

        return [
            {
                key: 'lngUsage',
                title: 'LNG 사용량',
                valueText: formatQuantity(currentLngUsage, 'Nm3'),
                secondaryLabelText: '금액',
                secondaryValueText: formatCost(currentLngCost),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(
                        Number.isFinite(currentLngUsage) && Number.isFinite(referenceLngUsage)
                            ? currentLngUsage - referenceLngUsage
                            : null,
                        'Nm3'
                    )
                ),
                icon: 'fa-fire-burner',
                tone: 'usage',
                metaText: scopeMetaText
            },
            {
                key: 'lpgUsage',
                title: 'LPG 사용량',
                valueText: formatQuantity(currentLpgUsage, 'kg'),
                secondaryLabelText: '금액',
                secondaryValueText: formatCost(currentLpgCost),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(
                        Number.isFinite(currentLpgUsage) && Number.isFinite(referenceLpgUsage)
                            ? currentLpgUsage - referenceLpgUsage
                            : null,
                        'kg'
                    )
                ),
                icon: 'fa-fire-flame-curved',
                tone: 'gas',
                metaText: scopeMetaText
            },
            {
                key: 'production',
                title: '생산량',
                valueText: formatQuantity(currentProduction, 'kg'),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(productionDelta, 'kg')
                ),
                icon: productionOption.icon,
                tone: 'production',
                metaText: productionMetaText
            }
        ];
    }

    function buildUtilElectricMeterSummaryItems(datasetResult, compareKey = 'month', teamDatasetResult = null) {
        const activeMonthKey = String(datasetResult?.activeMonthKey || datasetResult?.latestRow?.monthKey || '').trim();
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const compareLabel = getCompareLabel(normalizedCompareKey);
        const activeMonthLabel = activeMonthKey ? formatMonthShort(activeMonthKey) : '-';
        const teamResult = teamDatasetResult?.option
            ? teamDatasetResult
            : buildElectricMeterTeamDatasetResult(activeMonthKey, 'combined');
        const teamOption = teamResult?.option || getElectricMeterTeamOption('combined');
        const usageDelta = normalizedCompareKey === 'year'
            ? teamResult?.deltaUsageVsPrevYear
            : teamResult?.deltaUsageVsPrevMonth;
        const costDelta = normalizedCompareKey === 'year'
            ? teamResult?.deltaCostVsPrevYear
            : teamResult?.deltaCostVsPrevMonth;
        const productionDelta = normalizedCompareKey === 'year'
            ? teamResult?.deltaProductionVsPrevYear
            : teamResult?.deltaProductionVsPrevMonth;
        const scopeMetaText = `선택월 값 · ${activeMonthLabel} · 기준 ${teamOption.label}`;

        return [
            {
                key: 'electricUsage',
                title: '전기',
                valueText: formatQuantity(teamResult?.latestUsage, 'kWh'),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(usageDelta, 'kWh')
                ),
                icon: 'fa-bolt',
                tone: 'usage',
                metaText: scopeMetaText
            },
            {
                key: 'electricCost',
                title: '비용',
                valueText: formatCost(teamResult?.latestCost),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedCost(costDelta)
                ),
                icon: 'fa-coins',
                tone: 'cost',
                metaText: scopeMetaText
            },
            {
                key: 'electricProduction',
                title: '생산량',
                valueText: formatQuantity(teamResult?.latestProduction, 'kg'),
                subText: buildGasAnalysisCompareSub(
                    compareLabel,
                    activeMonthKey,
                    formatSignedQuantity(productionDelta, 'kg')
                ),
                icon: 'fa-industry',
                tone: 'production',
                metaText: scopeMetaText
            }
        ];
    }

    function buildUtilGasMeterSummaryBlockHtml(summaryItems = [], selectedKey = 'combined') {
        return `
            <div class="util-sheet-meter-summary-stack">
                ${buildGasMeterProductionSelectHtml(selectedKey)}
                ${buildAnalysisSummaryGridHtml(summaryItems)}
            </div>
        `;
    }

    function buildUtilElectricMeterSummaryBlockHtml(summaryItems = [], selectedKey = 'combined') {
        return `
            <div class="util-sheet-meter-summary-stack">
                ${buildElectricMeterTeamSelectHtml(selectedKey)}
                ${buildAnalysisSummaryGridHtml(summaryItems)}
            </div>
        `;
    }

    globalScope.KPIUtilReportSheetSummaryRender = Object.freeze({
        setRuntimeAdapters,
        buildUtilSheetCompareMeta,
        resolveUtilSheetMemoItems,
        buildUtilGasMeterSummaryItems,
        buildUtilElectricMeterSummaryItems,
        buildUtilSheetBadgesHtml,
        buildUtilGasMeterSummaryBlockHtml,
        buildUtilElectricMeterSummaryBlockHtml,
        buildUtilSheetStatsHtml,
        buildUtilSheetCompareCardsHtml,
        buildUtilSheetMatrixHtml,
        buildUtilSheetRecentTableHtml,
        buildUtilSheetMemoSectionHtml
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
