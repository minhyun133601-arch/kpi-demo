(function registerUtilReportSheetGasComparisonSummary(globalScope) {
    if (globalScope.KPIUtilReportSheetGasComparisonSummary) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.gas.comparison-summary.js');
    }

    const {
        utilSheetNumberFormatter,
        UTIL_GAS_BILLING_SCOPE_KEYS,
        UTIL_GAS_METER_CORRECTION_TARGET_IDS,
        UTIL_GAS_METER_FIELD_LABELS,
        UTIL_GAS_METER_FIELD_ICONS
    } = utilReportSheetConfig;

    const runtime = {
        escapeUtilSheetHtml: null,
        formatUtilSheetCost: null,
        formatUtilSheetInteger: null,
        formatUtilReportMonthLong: null,
        parseUtilGasMeterNumber: null,
        getUtilGasBillingScopeFields: null,
        resolveUtilGasBillingDocumentDescriptor: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetGasComparisonSummary;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function formatCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetCost === 'function') {
            return runtime.formatUtilSheetCost(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatInteger(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetInteger === 'function') {
            return runtime.formatUtilSheetInteger(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatMonthLong(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthLong === 'function') {
            return runtime.formatUtilReportMonthLong(monthKey);
        }
        return String(monthKey || '');
    }

    function parseGasMeterNumber(value) {
        if (typeof runtime.parseUtilGasMeterNumber === 'function') {
            return runtime.parseUtilGasMeterNumber(value);
        }
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : NaN;
    }

    function getGasBillingScopeFields(monthKey = '', scopeKey = '') {
        if (typeof runtime.getUtilGasBillingScopeFields === 'function') {
            return runtime.getUtilGasBillingScopeFields(monthKey, scopeKey) || {};
        }
        return {};
    }

    function resolveGasBillingDocumentDescriptor(monthKey = '', scopeKey = '') {
        if (typeof runtime.resolveUtilGasBillingDocumentDescriptor === 'function') {
            return runtime.resolveUtilGasBillingDocumentDescriptor(monthKey, scopeKey) || null;
        }
        return null;
    }

    function getUtilGasMeterColumn(table, fieldId) {
        if (!Array.isArray(table?.columns)) return null;
        return table.columns.find(column => String(column?.id || '') === fieldId) || null;
    }

    function sumUtilGasMeterColumnValues(columns, valueKey, fieldIds) {
        return (Array.isArray(columns) ? columns : [])
            .filter(column => Array.isArray(fieldIds) ? fieldIds.includes(column.id) : true)
            .map(column => column?.[valueKey])
            .filter(value => Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0);
    }

    function formatUtilGasSummaryUnitPrice(value, decimals = 0) {
        if (!Number.isFinite(value)) return '-';
        return `${Number(value).toLocaleString('ko-KR', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        })}원`;
    }

    function resolveUtilGasMeterCaption(column) {
        if (!column?.id) return '';
        if (column.id === 'gas_field_01') return '총량 기준';
        if (column.id === 'gas_field_02') return 'LPG 환산';
        if (UTIL_GAS_METER_CORRECTION_TARGET_IDS.has(column.id)) return '보정 적용';
        return '직접 사용';
    }

    function formatUtilGasMeterFactorValue(value) {
        if (!Number.isFinite(value)) return 'x-';
        const normalizedValue = Number(value).toFixed(4).replace(/\.?0+$/, '');
        return `x${normalizedValue}`;
    }

    function resolveUtilGasMeterAdjustmentNote(column) {
        const factorText = formatUtilGasMeterFactorValue(column?.factor);
        if (column?.id === 'gas_field_02') return `LPG 환산 ${factorText}`;
        if (UTIL_GAS_METER_CORRECTION_TARGET_IDS.has(column?.id)) return `전자식 보정 ${factorText}`;
        return `보정 없음 ${factorText}`;
    }

    function buildUtilGasAllocationItems(totalCost, columns, fieldIds) {
        const totalCorrectedUsage = sumUtilGasMeterColumnValues(columns, 'correctedUsage', fieldIds);
        return fieldIds.map(fieldId => {
            const column = columns.find(item => item.id === fieldId) || null;
            const correctedUsage = column?.correctedUsage;
            const cost = Number.isFinite(totalCost) && Number.isFinite(correctedUsage) && totalCorrectedUsage > 0
                ? (totalCost * correctedUsage) / totalCorrectedUsage
                : null;
            return {
                id: fieldId,
                label: column?.label || UTIL_GAS_METER_FIELD_LABELS[fieldId] || fieldId,
                icon: UTIL_GAS_METER_FIELD_ICONS[fieldId] || 'fa-gauge-high',
                correctedUsage,
                cost
            };
        });
    }

    function buildUtilGasBillingSummaryModel(monthKey, selectedTable) {
        const normalizedMonthKey = String(monthKey || '').trim();
        const lpgFields = getGasBillingScopeFields(normalizedMonthKey, UTIL_GAS_BILLING_SCOPE_KEYS.plantALpg);
        const lngFields = getGasBillingScopeFields(normalizedMonthKey, UTIL_GAS_BILLING_SCOPE_KEYS.plantALng);
        const columns = Array.isArray(selectedTable?.columns) ? selectedTable.columns : [];
        const lpgColumn = getUtilGasMeterColumn(selectedTable, 'gas_field_02');
        const lpgSupplyAmount = parseGasMeterNumber(lpgFields.power_charge);
        const lpgVat = parseGasMeterNumber(lpgFields.vat);
        const lpgTotalAmount = parseGasMeterNumber(lpgFields.billing_amount);
        const lpgKgUsage = lpgColumn?.usage;
        const lpgNm3Usage = lpgColumn?.correctedUsage;
        const lpgKgUnitPrice = Number.isFinite(lpgSupplyAmount) && Number.isFinite(lpgKgUsage) && lpgKgUsage > 0
            ? lpgSupplyAmount / lpgKgUsage
            : null;
        const lpgNm3UnitPrice = Number.isFinite(lpgSupplyAmount) && Number.isFinite(lpgNm3Usage) && lpgNm3Usage > 0
            ? lpgSupplyAmount / lpgNm3Usage
            : null;

        const lngSupplyAmount = parseGasMeterNumber(lngFields.power_charge);
        const lngVat = parseGasMeterNumber(lngFields.vat);
        const lngFuelAdjustment = parseGasMeterNumber(lngFields.fuel_adjustment_charge);
        const lngOperationFee = parseGasMeterNumber(lngFields.operation_fee);
        const lngTotalAmount = parseGasMeterNumber(lngFields.billing_amount);
        const lngFieldIds = ['gas_field_03', 'gas_field_04', 'gas_field_06'];
        const lngTotalUsage = getUtilGasMeterColumn(selectedTable, 'gas_field_01')?.usage;
        const lngRawUsage = sumUtilGasMeterColumnValues(columns, 'usage', lngFieldIds);
        const lngCorrectedUsage = sumUtilGasMeterColumnValues(columns, 'correctedUsage', lngFieldIds);
        const lngUnitPrice = Number.isFinite(lngSupplyAmount) && Number.isFinite(lngCorrectedUsage) && lngCorrectedUsage > 0
            ? lngSupplyAmount / lngCorrectedUsage
            : null;
        const lngTaxTotal = [lngVat, lngFuelAdjustment]
            .filter(value => Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0);

        return {
            monthKey: normalizedMonthKey,
            lpg: {
                supplyAmount: lpgSupplyAmount,
                vat: lpgVat,
                totalAmount: lpgTotalAmount,
                kgUnitPrice: lpgKgUnitPrice,
                nm3UnitPrice: lpgNm3UnitPrice
            },
            lng: {
                supplyAmount: lngSupplyAmount,
                vat: lngVat,
                fuelAdjustment: lngFuelAdjustment,
                taxTotal: lngTaxTotal,
                operationFee: lngOperationFee,
                totalAmount: lngTotalAmount,
                unitPrice: lngUnitPrice,
                allocations: buildUtilGasAllocationItems(lngSupplyAmount, columns, lngFieldIds),
                correctionFactor: selectedTable?.correctionFactor,
                totalUsage: lngTotalUsage,
                rawUsage: lngRawUsage,
                correctionLines: lngFieldIds.map(fieldId => {
                    const column = getUtilGasMeterColumn(selectedTable, fieldId);
                    return {
                        id: fieldId,
                        label: column?.label || UTIL_GAS_METER_FIELD_LABELS[fieldId] || fieldId,
                        usage: column?.usage,
                        correctedUsage: column?.correctedUsage
                    };
                })
            },
            grandTotal: [lpgTotalAmount, lngTotalAmount]
                .filter(value => Number.isFinite(value))
                .reduce((sum, value) => sum + value, 0)
        };
    }

    function buildUtilGasSummaryRows(summary) {
        return [
            {
                title: 'LPG',
                icon: 'fa-gas-pump',
                accentClass: 'is-lpg',
                scopeKey: UTIL_GAS_BILLING_SCOPE_KEYS.plantALpg,
                rows: [
                    {
                        label: 'LPG가스비',
                        icon: 'fa-sack-dollar',
                        value: formatCost(summary?.lpg?.supplyAmount),
                        meta: `LPG Kg 단가 ${formatUtilGasSummaryUnitPrice(summary?.lpg?.kgUnitPrice, 0)}`
                    },
                    {
                        label: 'Process Alpha(LPG)',
                        icon: 'fa-fan',
                        value: formatCost(summary?.lpg?.supplyAmount),
                        meta: `LPG Nm3 단가 ${formatUtilGasSummaryUnitPrice(summary?.lpg?.nm3UnitPrice, 1)}`
                    },
                    {
                        label: 'LPG세액',
                        icon: 'fa-percent',
                        value: formatCost(summary?.lpg?.vat),
                        meta: ''
                    },
                    {
                        label: 'LPG사용합계',
                        icon: 'fa-receipt',
                        value: formatCost(summary?.lpg?.totalAmount),
                        meta: ''
                    }
                ]
            },
            {
                title: 'LNG',
                icon: 'fa-fire-flame-curved',
                accentClass: 'is-lng',
                scopeKey: UTIL_GAS_BILLING_SCOPE_KEYS.plantALng,
                rows: [
                    {
                        label: 'LNG가스비',
                        icon: 'fa-fire',
                        value: formatCost(summary?.lng?.supplyAmount),
                        meta: `LNG Nm3 단가 ${formatUtilGasSummaryUnitPrice(summary?.lng?.unitPrice, 0)}`
                    },
                    ...((summary?.lng?.allocations || []).map(item => ({
                        label: item.label,
                        icon: item.icon,
                        value: formatCost(item.cost),
                        meta: Number.isFinite(item.correctedUsage)
                            ? `실사용량 ${formatInteger(item.correctedUsage)}Nm3`
                            : ''
                    }))),
                    {
                        label: '계량기교체비',
                        icon: 'fa-wrench',
                        value: formatCost(summary?.lng?.operationFee),
                        meta: ''
                    },
                    {
                        label: 'LNG세액',
                        icon: 'fa-file-invoice-dollar',
                        value: formatCost(summary?.lng?.taxTotal),
                        meta: `부가세 ${formatCost(summary?.lng?.vat)} · 가산세 ${formatCost(summary?.lng?.fuelAdjustment)}`
                    },
                    {
                        label: 'LNG사용합계',
                        icon: 'fa-receipt',
                        value: formatCost(summary?.lng?.totalAmount),
                        meta: ''
                    }
                ]
            }
        ];
    }

    function buildUtilGasCorrectionNoteHtml(summary) {
        return `
            <section class="util-sheet-gas-guidance">
                <div class="util-sheet-gas-guidance-head">
                    <span class="util-sheet-gas-guidance-icon"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></span>
                    <div>
                        <div class="util-sheet-gas-guidance-title">보정 기준</div>
                        <div class="util-sheet-gas-guidance-sub">가스 검침표의 실사용량은 아래 공식으로 계산합니다.</div>
                    </div>
                </div>
                <div class="util-sheet-gas-guidance-copy">
                    <div class="util-sheet-gas-guidance-line">Demo Heater (LPG): 사용량 x 3.35 = 실사용량</div>
                    <div class="util-sheet-gas-guidance-line">Demo Boiler A, Demo Boiler B, Process Gamma Boiler는 전자식 기준 보정 후 실사용량으로 배분합니다.</div>
                    <div class="util-sheet-gas-guidance-line">사용량 x (Line Gamma LNG Total 사용량 ÷ (Demo Boiler A + Demo Boiler B + Process Gamma Boiler 사용량)) = 실사용량</div>
                </div>
            </section>
        `;
    }

    function formatUtilGasMeterCellValue(value) {
        return Number.isFinite(value) ? utilSheetNumberFormatter.format(Math.round(value)) : '-';
    }

    function buildUtilGasBillingSummaryHtml(summary) {
        const groups = buildUtilGasSummaryRows(summary);
        const monthLabel = formatMonthLong(summary?.monthKey || '');
        return `
            <aside class="util-sheet-gas-summary">
                <div class="util-sheet-gas-summary-shell">
                    <div class="util-sheet-gas-summary-shell-head">
                        <div class="util-sheet-gas-summary-shell-title">
                            <i class="fa-solid fa-file-invoice-dollar" aria-hidden="true"></i>
                            <span>${escapeHtml(monthLabel)} 정산 요약</span>
                        </div>
                        <div class="util-sheet-gas-summary-shell-sub">유틸리티 기입 정산값으로 가스비와 설비 배분을 함께 봅니다.</div>
                    </div>
                    ${groups.map(group => `
                        <section class="util-sheet-gas-summary-group ${escapeHtml(group.accentClass)}">
                            ${(() => {
                                const billingDescriptor = resolveGasBillingDocumentDescriptor(summary?.monthKey || '', group.scopeKey || '');
                                const buttonTitle = billingDescriptor
                                    ? `${group.title} 청구서 보기`
                                    : `${group.title} 청구서가 없습니다.`;
                                return `
                            <div class="util-sheet-gas-summary-head">
                                <div class="util-sheet-gas-summary-title">
                                    <span class="util-sheet-gas-summary-icon"><i class="fa-solid ${escapeHtml(group.icon)}" aria-hidden="true"></i></span>
                                    <span>${escapeHtml(group.title)} 정산</span>
                                </div>
                                <div class="util-sheet-gas-summary-actions">
                                    <button
                                        type="button"
                                        class="util-sheet-gas-summary-doc-btn"
                                        data-role="util-sheet-billing-preview-toggle"
                                        data-billing-dataset-key="gas"
                                        data-month-key="${escapeHtml(summary?.monthKey || '')}"
                                        data-billing-scope-key="${escapeHtml(group.scopeKey || '')}"
                                        title="${escapeHtml(buttonTitle)}"
                                        aria-label="${escapeHtml(buttonTitle)}"
                                        ${billingDescriptor ? '' : 'disabled'}
                                    >
                                        <i class="fa-solid fa-file-invoice" aria-hidden="true"></i>
                                        <span>청구서</span>
                                    </button>
                                </div>
                            </div>
                                `;
                            })()}
                            <div class="util-sheet-gas-summary-list">
                                ${group.rows.map(row => `
                                    <article class="util-sheet-gas-summary-row">
                                        <div class="util-sheet-gas-summary-row-main">
                                            <span class="util-sheet-gas-summary-row-icon"><i class="fa-solid ${escapeHtml(row.icon)}" aria-hidden="true"></i></span>
                                            <span class="util-sheet-gas-summary-row-label">${escapeHtml(row.label)}</span>
                                        </div>
                                        <div class="util-sheet-gas-summary-row-value">${escapeHtml(row.value)}</div>
                                        ${row.meta ? `<div class="util-sheet-gas-summary-row-meta">${escapeHtml(row.meta)}</div>` : ''}
                                    </article>
                                `).join('')}
                            </div>
                        </section>
                    `).join('')}
                    <div class="util-sheet-gas-summary-total">
                        <div class="util-sheet-gas-summary-total-label">
                            <i class="fa-solid fa-won-sign" aria-hidden="true"></i>
                            <span>총합계</span>
                        </div>
                        <div class="util-sheet-gas-summary-total-value">${escapeHtml(formatCost(summary?.grandTotal))}</div>
                    </div>
                </div>
            </aside>
        `;
    }

    function buildUtilGasMeterTableHtml(table, title, accentClass = '') {
        const columns = Array.isArray(table?.columns) ? table.columns : [];
        const rowHtml = columns.map(column => `
            <tr>
                <th>
                    <div class="util-sheet-meter-name">
                        <span class="util-sheet-meter-icon"><i class="fa-solid ${escapeHtml(UTIL_GAS_METER_FIELD_ICONS[column.id] || 'fa-gauge-high')}" aria-hidden="true"></i></span>
                        <span class="util-sheet-meter-name-copy">
                            <span class="util-sheet-meter-label">${escapeHtml(column.label)}</span>
                            <span class="util-sheet-meter-caption">${escapeHtml(resolveUtilGasMeterCaption(column))}</span>
                        </span>
                    </div>
                </th>
                <td>${escapeHtml(formatUtilGasMeterCellValue(column.startReading))}</td>
                <td>${escapeHtml(formatUtilGasMeterCellValue(column.endReading))}</td>
                <td class="is-soft">${escapeHtml(formatUtilGasMeterCellValue(column.usage))}</td>
                <td class="is-soft">
                    <div class="util-sheet-meter-cell-stack">
                        <span class="util-sheet-meter-cell-value">${escapeHtml(formatUtilGasMeterCellValue(column.adjustment))}</span>
                        <span class="util-sheet-meter-cell-meta">${escapeHtml(resolveUtilGasMeterAdjustmentNote(column))}</span>
                    </div>
                </td>
                <td class="is-accent">${escapeHtml(formatUtilGasMeterCellValue(column.correctedUsage))}</td>
            </tr>
        `).join('');
        return `
            <article class="util-sheet-meter-table-card ${escapeHtml(accentClass)}">
                <div class="util-sheet-meter-table-head">
                    <div class="util-sheet-meter-table-title-wrap">
                        <span class="util-sheet-meter-table-badge"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i></span>
                        <div>
                            <div class="util-sheet-meter-table-title">${escapeHtml(title)}</div>
                            <div class="util-sheet-meter-table-sub">선택월 지침, 익월 지침, 사용량, 보정, 실사용량을 설비 기준으로 정리했습니다.</div>
                        </div>
                    </div>
                </div>
                <div class="util-sheet-table-wrap">
                    <table class="util-sheet-table util-sheet-meter-table">
                        <thead>
                            <tr>
                                <th>설비</th>
                                <th>선택월 지침</th>
                                <th>익월 지침</th>
                                <th>사용량</th>
                                <th>보정</th>
                                <th>실사용량</th>
                            </tr>
                        </thead>
                        <tbody>${rowHtml}</tbody>
                    </table>
                </div>
            </article>
        `;
    }

    function buildUtilGasMeterComparisonSectionHtml(model) {
        if (!model?.ready) {
            return `
                <section class="util-sheet-section">
                    <div class="util-sheet-empty">${escapeHtml(model?.message || '가스 검침표를 준비하지 못했습니다.')}</div>
                </section>
            `;
        }

        const referenceLabel = formatMonthLong(model.referenceTable.monthKey);
        const selectedLabel = formatMonthLong(model.selectedTable.monthKey);

        return `
            <section class="util-sheet-section">
                <div class="util-sheet-section-head">
                    <div>
                        <div class="util-sheet-section-title">가스 검침표</div>
                        <div class="util-sheet-section-sub">선택월 검침표 두 장과 해당 월 정산 항목을 한 화면에서 함께 봅니다. 검침값은 선택월 시작과 익월 시작 기준입니다.</div>
                    </div>
                </div>
                <div class="util-sheet-gas-layout">
                    <div class="util-sheet-meter-table-stack">
                        ${buildUtilGasMeterTableHtml(model.referenceTable, `${referenceLabel} 검침표`, 'is-reference')}
                        ${buildUtilGasMeterTableHtml(model.selectedTable, `${selectedLabel} 검침표`, 'is-current')}
                    </div>
                    ${buildUtilGasBillingSummaryHtml(model.billingSummary)}
                </div>
                ${buildUtilGasCorrectionNoteHtml(model.billingSummary)}
            </section>
        `;
    }

    globalScope.KPIUtilReportSheetGasComparisonSummary = Object.freeze({
        setRuntimeAdapters,
        getUtilGasMeterColumn,
        sumUtilGasMeterColumnValues,
        buildUtilGasBillingSummaryModel,
        buildUtilGasMeterComparisonSectionHtml
    });
})(typeof window !== 'undefined' ? window : globalThis);
