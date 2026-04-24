(function registerUtilReportSheetElectricComparisonSummary(globalScope) {
    if (globalScope.KPIUtilReportSheetElectricComparisonSummary) {
        return;
    }

    const utilReportSheetOptions = globalScope.KPIUtilReportSheetOptions;
    if (!utilReportSheetOptions) {
        throw new Error('KPIUtilReportSheetOptions must load before KPI.util.report.sheet.electric.comparison-summary.js');
    }

    const {
        UTIL_ELECTRIC_ALLOCATION_GROUPS,
        UTIL_ELECTRIC_TEAM_SUMMARY_OPTIONS,
        UTIL_ELECTRIC_BILLING_SUMMARY_FIELDS,
        normalizeUtilElectricMeterViewKey,
        getUtilElectricMeterTeamOption
    } = utilReportSheetOptions;
    const utilReportSheetElectricTableRender = globalScope.KPIUtilReportSheetElectricTableRender;
    if (!utilReportSheetElectricTableRender) {
        throw new Error('KPIUtilReportSheetElectricTableRender must load before KPI.util.report.sheet.electric.comparison-summary.js');
    }

    const runtime = {
        getUtilElectricMeteringStore: null,
        getLocalAppStore: null,
        isUtilSheetPlainObject: null,
        parseUtilGasMeterNumber: null,
        buildUtilElectricMeterTeamDatasetResult: null,
        buildUtilElectricScopedDatasetResult: null,
        normalizeUtilSheetCompareKey: null,
        shiftUtilSheetMonthKey: null,
        buildUtilElectricMeterViewToggleHtml: null,
        resolveUtilSheetBillingDocumentDescriptor: null,
        escapeUtilSheetHtml: null,
        formatUtilReportMonthLong: null,
        formatUtilSheetCost: null,
        formatUtilSheetDecimal: null,
        formatUtilSheetInteger: null,
        formatUtilSheetSignedCost: null,
        formatUtilSheetSignedInteger: null,
        formatUtilSheetQuantity: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetElectricComparisonSummary;
    }

    function getElectricMeteringStore() {
        return typeof runtime.getUtilElectricMeteringStore === 'function'
            ? runtime.getUtilElectricMeteringStore()
            : null;
    }

    function getLocalAppStore() {
        return typeof runtime.getLocalAppStore === 'function'
            ? runtime.getLocalAppStore()
            : null;
    }

    function isPlainObject(value) {
        if (typeof runtime.isUtilSheetPlainObject === 'function') {
            return runtime.isUtilSheetPlainObject(value);
        }
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function parseNumber(value) {
        if (typeof runtime.parseUtilGasMeterNumber === 'function') {
            return runtime.parseUtilGasMeterNumber(value);
        }
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : NaN;
    }

    function buildTeamDatasetResult(activeMonthKey = '', teamKey = 'combined') {
        return typeof runtime.buildUtilElectricMeterTeamDatasetResult === 'function'
            ? runtime.buildUtilElectricMeterTeamDatasetResult(activeMonthKey, teamKey)
            : null;
    }

    function buildScopedDatasetResult(activeMonthKey = '', reportTeamFilters = [], productionTeamNames = []) {
        return typeof runtime.buildUtilElectricScopedDatasetResult === 'function'
            ? runtime.buildUtilElectricScopedDatasetResult(activeMonthKey, reportTeamFilters, productionTeamNames)
            : null;
    }

    function normalizeCompareKey(compareKey = 'month') {
        return typeof runtime.normalizeUtilSheetCompareKey === 'function'
            ? runtime.normalizeUtilSheetCompareKey(compareKey)
            : String(compareKey || 'month').trim() || 'month';
    }

    function shiftMonthKey(monthKey = '', delta = 0) {
        return typeof runtime.shiftUtilSheetMonthKey === 'function'
            ? runtime.shiftUtilSheetMonthKey(monthKey, delta)
            : String(monthKey || '').trim();
    }

    function buildViewToggleHtml(viewKey = 'meter') {
        return typeof runtime.buildUtilElectricMeterViewToggleHtml === 'function'
            ? runtime.buildUtilElectricMeterViewToggleHtml(viewKey)
            : '';
    }

    function resolveBillingDocumentDescriptor(datasetKey = '', monthKey = '', scopeKey = '') {
        return typeof runtime.resolveUtilSheetBillingDocumentDescriptor === 'function'
            ? runtime.resolveUtilSheetBillingDocumentDescriptor(datasetKey, monthKey, scopeKey)
            : null;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function formatMonthLong(monthKey = '') {
        if (typeof runtime.formatUtilReportMonthLong === 'function') {
            return runtime.formatUtilReportMonthLong(monthKey);
        }
        return String(monthKey || '');
    }

    function formatCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetCost === 'function') {
            return runtime.formatUtilSheetCost(value, fallback);
        }
        return String(value ?? fallback);
    }

    function formatDecimal(value, digits = 0, fallback = '-') {
        if (typeof runtime.formatUtilSheetDecimal === 'function') {
            return runtime.formatUtilSheetDecimal(value, digits, fallback);
        }
        return Number.isFinite(value) ? Number(value).toFixed(digits) : fallback;
    }

    function formatInteger(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetInteger === 'function') {
            return runtime.formatUtilSheetInteger(value, fallback);
        }
        return Number.isFinite(value) ? String(Math.round(Number(value))) : fallback;
    }

    function formatSignedCost(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedCost === 'function') {
            return runtime.formatUtilSheetSignedCost(value, fallback);
        }
        return formatCost(value, fallback);
    }

    function formatSignedInteger(value, fallback = '-') {
        if (typeof runtime.formatUtilSheetSignedInteger === 'function') {
            return runtime.formatUtilSheetSignedInteger(value, fallback);
        }
        return formatInteger(value, fallback);
    }

    function formatQuantity(value, unit = '') {
        if (typeof runtime.formatUtilSheetQuantity === 'function') {
            return runtime.formatUtilSheetQuantity(value, unit);
        }
        return Number.isFinite(value) ? `${formatInteger(value)}${unit}` : '-';
    }

    utilReportSheetElectricTableRender.setRuntimeAdapters({
        escapeUtilSheetHtml: (...args) => escapeHtml(...args),
        formatUtilSheetDecimal: (...args) => formatDecimal(...args),
        formatUtilSheetInteger: (...args) => formatInteger(...args)
    });
    const {
        buildUtilElectricMeterDetailRowsTableHtml,
        buildUtilElectricMeterDetailDisclosureHtml,
        buildUtilElectricSummaryTableHtml,
        buildUtilElectricMeterTableHtml
    } = utilReportSheetElectricTableRender;

    function getUtilElectricBillingScopeEntry(monthKey = '', scopeKey = 'plantA') {
        const normalizedMonthKey = String(monthKey || '').trim();
        if (!normalizedMonthKey) return null;
        const store = getElectricMeteringStore();
        const storeEntries = isPlainObject(store?.billingSettlementEntries)
            ? store.billingSettlementEntries
            : null;
        const localEntries = isPlainObject(getLocalAppStore()?.billingSettlementEntries)
            ? getLocalAppStore().billingSettlementEntries
            : null;
        const rawEntries = {
            ...(isPlainObject(localEntries) ? localEntries : {}),
            ...(isPlainObject(storeEntries) ? storeEntries : {})
        };
        const rawEntry = rawEntries?.[normalizedMonthKey];
        if (!isPlainObject(rawEntry)) return null;
        if (isPlainObject(rawEntry.scopes)) {
            const scopedEntry = rawEntry.scopes?.[scopeKey];
            if (isPlainObject(scopedEntry)) {
                return scopedEntry;
            }
            const fallbackScopedEntry = Object.values(rawEntry.scopes).find(isPlainObject);
            return isPlainObject(fallbackScopedEntry) ? fallbackScopedEntry : null;
        }
        return scopeKey === 'plantA' ? rawEntry : null;
    }

    function getUtilElectricBillingFields(monthKey = '', scopeKey = 'plantA') {
        const entry = getUtilElectricBillingScopeEntry(monthKey, scopeKey);
        return isPlainObject(entry?.fields) ? entry.fields : {};
    }

    function getUtilElectricBillingNumericField(monthKey = '', fieldKey = '', scopeKey = 'plantA') {
        return parseNumber(getUtilElectricBillingFields(monthKey, scopeKey)?.[fieldKey]);
    }

    function resolveUtilElectricityChargeTotalValue(monthKey = '', scopeKey = 'plantA') {
        const fields = getUtilElectricBillingFields(monthKey, scopeKey);
        const existingValue = parseNumber(fields?.electricity_charge_total);
        if (Number.isFinite(existingValue)) return existingValue;
        const components = [
            { key: 'power_charge', sign: 1 },
            { key: 'climate_environment_charge', sign: 1 },
            { key: 'fuel_adjustment_charge', sign: 1 },
            { key: 'operation_fee', sign: 1 },
            { key: 'lagging_power_factor_charge', sign: 1 },
            { key: 'internet_discount', sign: -1 }
        ];
        let total = 0;
        let hasValue = false;
        components.forEach(component => {
            const value = parseNumber(fields?.[component.key]);
            if (!Number.isFinite(value)) return;
            total += value * component.sign;
            hasValue = true;
        });
        return hasValue ? total : null;
    }

    function resolveUtilElectricBillingAmountValue(monthKey = '', scopeKey = 'plantA') {
        const directValue = getUtilElectricBillingNumericField(monthKey, 'billing_amount', scopeKey);
        if (Number.isFinite(directValue)) return directValue;
        const components = [
            getUtilElectricBillingNumericField(monthKey, 'base_charge', scopeKey),
            resolveUtilElectricityChargeTotalValue(monthKey, scopeKey),
            getUtilElectricBillingNumericField(monthKey, 'vat', scopeKey),
            getUtilElectricBillingNumericField(monthKey, 'electric_power_fund', scopeKey),
            getUtilElectricBillingNumericField(monthKey, 'tv_reception_fee', scopeKey)
        ].filter(Number.isFinite);
        const roundingAdjustment = getUtilElectricBillingNumericField(monthKey, 'rounding_adjustment', scopeKey);
        if (!components.length) return null;
        return components.reduce((sum, value) => sum + value, 0) - (Number.isFinite(roundingAdjustment) ? roundingAdjustment : 0);
    }

    function getUtilElectricTableColumnValue(table, columnId = '', key = 'usage') {
        const column = (Array.isArray(table?.columns) ? table.columns : []).find(item => item?.id === columnId) || null;
        return Number.isFinite(column?.[key]) ? column[key] : null;
    }

    function resolveUtilElectricBillingUnitPriceValue(monthKey = '', selectedTable = null, scopeKey = 'plantA') {
        const directValue = getUtilElectricBillingNumericField(monthKey, 'unit_price', scopeKey);
        if (Number.isFinite(directValue)) return directValue;
        const electricityChargeTotal = resolveUtilElectricityChargeTotalValue(monthKey, scopeKey);
        const usage = getUtilElectricTableColumnValue(selectedTable, 'combined_total', 'usage')
            ?? getUtilElectricTableColumnValue(selectedTable, 'power_total', 'usage');
        if (!Number.isFinite(electricityChargeTotal) || !Number.isFinite(usage) || usage <= 0) {
            return null;
        }
        return electricityChargeTotal / usage;
    }

    function buildUtilElectricAllocationGroupColumns(table) {
        const detailColumns = Array.isArray(table?.detailColumns) ? table.detailColumns : [];
        const detailColumnMap = new Map(detailColumns.map(column => [String(column?.id || '').trim(), column]));
        const totalUsage = getUtilElectricTableColumnValue(table, 'power_total', 'usage');
        let groupedUsageSum = 0;
        const groups = UTIL_ELECTRIC_ALLOCATION_GROUPS.map(group => {
            const sourceColumns = group.sourceIds
                .map(sourceId => detailColumnMap.get(sourceId))
                .filter(Boolean);
            const usageValues = sourceColumns
                .map(column => Number.isFinite(column?.usage) ? column.usage : null)
                .filter(Number.isFinite);
            if (!usageValues.length) return null;
            const usage = usageValues.reduce((sum, value) => sum + value, 0);
            const groupTeamKeys = Array.from(new Set(
                sourceColumns
                    .map(column => String(column?.teamKey || '').trim())
                    .filter(Boolean)
                    .filter(teamKey => teamKey !== 'combined')
            ));
            groupedUsageSum += usage;
            return {
                key: group.key,
                label: group.label,
                caption: group.caption,
                usage,
                teamKey: groupTeamKeys.length === 1
                    ? groupTeamKeys[0]
                    : (String(table?.optionKey || '').trim() || 'combined')
            };
        }).filter(Boolean);
        const otherUsage = Number.isFinite(totalUsage) ? Math.max(totalUsage - groupedUsageSum, 0) : null;
        if (Number.isFinite(otherUsage) && otherUsage > 0) {
            groups.push({
                key: 'other',
                label: '기타',
                caption: '전력총량 잔여분',
                usage: otherUsage,
                teamKey: 'team_04'
            });
        }
        return {
            totalUsage,
            groups
        };
    }

    function getUtilElectricAllocationTeamAggregate(summaryModel = null, teamKey = '') {
        const normalizedTeamKey = String(teamKey || '').trim();
        if (!normalizedTeamKey || !Array.isArray(summaryModel?.columns)) return null;
        const targetColumns = summaryModel.columns.filter(column => (
            String(column?.teamKey || '').trim() === normalizedTeamKey
            && String(column?.key || '').trim() !== 'total'
        ));
        if (!targetColumns.length) return null;
        const sumFinite = key => {
            const values = targetColumns.map(column => column?.[key]).filter(Number.isFinite);
            if (!values.length) return null;
            return values.reduce((sum, value) => sum + value, 0);
        };
        return {
            usage: sumFinite('usage'),
            cost: sumFinite('cost'),
            compareCost: sumFinite('compareCost')
        };
    }

    function calculateUtilElectricDistributedCost(usage = null, totalUsage = null, totalCost = null) {
        if (!Number.isFinite(usage) || !Number.isFinite(totalUsage) || totalUsage <= 0 || !Number.isFinite(totalCost)) {
            return null;
        }
        return Math.round(totalCost * (usage / totalUsage));
    }

    function buildUtilElectricAllocationSummaryModel(model, teamDatasetResult = null) {
        if (!model?.ready || !model?.option) return null;
        const selectedTable = model.selectedTable;
        const referenceTable = model.referenceTable;
        const selectedGroups = buildUtilElectricAllocationGroupColumns(selectedTable);
        const referenceGroups = buildUtilElectricAllocationGroupColumns(referenceTable);
        const selectedTeamDataset = teamDatasetResult?.option?.key === model.option.key
            ? teamDatasetResult
            : buildTeamDatasetResult(selectedTable.monthKey, model.option.key);
        const referenceTeamDataset = buildTeamDatasetResult(referenceTable.monthKey, model.option.key);
        const selectedTotalCost = Number.isFinite(selectedTeamDataset?.latestCost) ? selectedTeamDataset.latestCost : null;
        const referenceTotalCost = Number.isFinite(referenceTeamDataset?.latestCost) ? referenceTeamDataset.latestCost : null;
        const referenceGroupMap = new Map((Array.isArray(referenceGroups?.groups) ? referenceGroups.groups : []).map(group => [group.key, group]));
        const columns = (Array.isArray(selectedGroups?.groups) ? selectedGroups.groups : []).map(group => {
            const referenceGroup = referenceGroupMap.get(group.key) || null;
            const currentUsage = Number(group?.usage);
            const referenceUsage = Number(referenceGroup?.usage);
            const currentCost = calculateUtilElectricDistributedCost(currentUsage, selectedGroups.totalUsage, selectedTotalCost);
            const referenceCost = calculateUtilElectricDistributedCost(referenceUsage, referenceGroups.totalUsage, referenceTotalCost);
            return {
                key: group.key,
                label: group.label,
                caption: group.caption,
                teamKey: group.teamKey,
                usage: Number.isFinite(currentUsage) ? currentUsage : null,
                share: Number.isFinite(currentUsage) && Number.isFinite(selectedGroups.totalUsage) && selectedGroups.totalUsage > 0
                    ? currentUsage / selectedGroups.totalUsage
                    : null,
                cost: Number.isFinite(currentCost) ? Math.round(currentCost) : null,
                compareCost: Number.isFinite(currentCost) && Number.isFinite(referenceCost)
                    ? Math.round(currentCost - referenceCost)
                    : null
            };
        });
        columns.push({
            key: 'total',
            label: '총 사용량',
            caption: `${model.option.label} 기준`,
            teamKey: model.option.key !== 'combined' ? model.option.key : 'combined',
            usage: selectedGroups.totalUsage,
            share: Number.isFinite(selectedGroups.totalUsage) && selectedGroups.totalUsage > 0 ? 1 : null,
            cost: selectedTotalCost,
            compareCost: Number.isFinite(selectedTotalCost) && Number.isFinite(referenceTotalCost)
                ? Math.round(selectedTotalCost - referenceTotalCost)
                : null
        });
        return {
            currentMonthKey: selectedTable.monthKey,
            referenceMonthKey: referenceTable.monthKey,
            columns,
            option: model.option
        };
    }

    function buildUtilElectricTeamSummaryColumn(option, datasetResult, compareKey = 'month', overrides = null) {
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        return {
            key: option.key,
            label: option.label,
            teamKey: option.key,
            usage: Number.isFinite(overrides?.usage) ? overrides.usage : (datasetResult?.latestUsage ?? null),
            cost: Number.isFinite(overrides?.cost) ? overrides.cost : (datasetResult?.latestCost ?? null),
            production: Number.isFinite(overrides?.production) ? overrides.production : (datasetResult?.latestProduction ?? null),
            compareCost: normalizedCompareKey === 'year'
                ? (Number.isFinite(overrides?.compareCost) ? overrides.compareCost : (datasetResult?.deltaCostVsPrevYear ?? null))
                : (Number.isFinite(overrides?.compareCost) ? overrides.compareCost : (datasetResult?.deltaCostVsPrevMonth ?? null))
        };
    }

    function buildUtilElectricTeamSummaryModel(teamDatasetResult = null, compareKey = 'month', comparisonModel = null) {
        const normalizedCompareKey = normalizeCompareKey(compareKey);
        if (!teamDatasetResult?.option) return null;
        const activeMonthKey = String(teamDatasetResult?.latestRow?.monthKey || '').trim();
        const allocationSummaryModel = teamDatasetResult.option.key === 'combined'
            ? buildUtilElectricAllocationSummaryModel(comparisonModel, teamDatasetResult)
            : null;
        const columns = teamDatasetResult.option.key === 'combined'
            ? UTIL_ELECTRIC_TEAM_SUMMARY_OPTIONS.map(option => {
                const datasetResult = buildScopedDatasetResult(
                    activeMonthKey,
                    option.reportTeamFilters,
                    option.productionTeamNames
                );
                const overrides = option.key === 'team_04'
                    ? getUtilElectricAllocationTeamAggregate(allocationSummaryModel, 'team_04')
                    : null;
                return buildUtilElectricTeamSummaryColumn(
                    option,
                    datasetResult,
                    normalizedCompareKey,
                    overrides
                );
            })
            : [buildUtilElectricTeamSummaryColumn(teamDatasetResult.option, teamDatasetResult, normalizedCompareKey)];
        return {
            compareKey: normalizedCompareKey,
            columns,
            option: teamDatasetResult.option
        };
    }

    function buildUtilElectricBillingSummaryModel(model = null) {
        const monthKey = String(model?.selectedTable?.monthKey || '').trim();
        if (!monthKey) return null;
        const monthLabel = formatMonthLong(monthKey);
        const fields = getUtilElectricBillingFields(monthKey, 'plantA');
        const electricityChargeTotal = resolveUtilElectricityChargeTotalValue(monthKey, 'plantA');
        const unitPrice = resolveUtilElectricBillingUnitPriceValue(monthKey, model?.selectedTable, 'plantA');
        const billingAmount = resolveUtilElectricBillingAmountValue(monthKey, 'plantA');
        const detailValues = UTIL_ELECTRIC_BILLING_SUMMARY_FIELDS.map(field => {
            if (field.key === 'electricity_charge_total') {
                return { key: field.key, label: field.label, value: electricityChargeTotal };
            }
            if (field.key === 'billing_amount') {
                return { key: field.key, label: field.label, value: billingAmount };
            }
            if (field.key === 'unit_price') {
                return { key: field.key, label: field.label, value: unitPrice };
            }
            return {
                key: field.key,
                label: field.label,
                value: parseNumber(fields?.[field.key])
            };
        });
        return {
            monthKey,
            monthLabel,
            scopeLabel: 'Plant A 정산항목 · Plant B 제외',
            items: [
                {
                    key: 'electricity_charge_total',
                    title: '전기요금계',
                    valueText: formatCost(electricityChargeTotal),
                    metaText: `${monthLabel} · Plant A 기준`,
                    subText: '전기 정산항목 자동 계산값',
                    helpText: '전력량요금 + 기후환경요금 + 연료비조정액 + 조작수수료 + 지상역률료 - 인터넷할인',
                    tone: 'cost',
                    icon: 'fa-bolt'
                },
                {
                    key: 'unit_price',
                    title: '단가',
                    valueText: formatUtilElectricBillingUnitPrice(unitPrice),
                    metaText: `${monthLabel} · Plant A 기준`,
                    subText: '전력총량 기준 단가',
                    helpText: '유틸리티 기입 정산항목의 단가를 우선 사용하고, 값이 없으면 전기요금계 ÷ 해당 월 전력총량으로 계산',
                    tone: 'electric',
                    icon: 'fa-calculator'
                },
                {
                    key: 'billing_amount',
                    title: '청구금액',
                    valueText: formatCost(billingAmount),
                    metaText: `${monthLabel} · Plant A 기준`,
                    subText: '실청구 기준 합계',
                    helpText: '기본요금 + 전기요금계 + 부가가치세 + 전력기금 + TV수신료 - 원단위 절삭',
                    tone: 'cost',
                    icon: 'fa-file-invoice'
                }
            ],
            detailValues
        };
    }

    function formatUtilElectricPercent(value) {
        if (!Number.isFinite(value)) return '-';
        return `${formatDecimal(value * 100, 0)}%`;
    }

    function formatUtilElectricMeterFactorValue(value) {
        return Number.isFinite(value) ? formatDecimal(value, 2) : '-';
    }

    function formatUtilElectricMeterReadingValue(value) {
        return Number.isFinite(value) ? formatDecimal(value, 2) : '-';
    }

    function formatUtilElectricMeterUsageValue(value) {
        return Number.isFinite(value) ? formatInteger(value) : '-';
    }

    function formatUtilElectricBillingUnitPrice(value) {
        return Number.isFinite(value)
            ? `${formatDecimal(value, 2)}원/kWh`
            : '-';
    }

    function buildUtilElectricAllocationSummaryHtml(model, teamDatasetResult = null) {
        const summaryModel = buildUtilElectricAllocationSummaryModel(model, teamDatasetResult);
        if (!summaryModel || !Array.isArray(summaryModel.columns) || !summaryModel.columns.length) return '';
        return buildUtilElectricSummaryTableHtml(summaryModel.columns, [
            { key: 'usage', label: '사용량(kWh)', formatter: formatUtilElectricMeterUsageValue },
            { key: 'share', label: '비중(%)', formatter: formatUtilElectricPercent },
            { key: 'cost', label: '사용요금(원)', formatter: formatCost },
            { key: 'compareCost', label: model.compareKey === 'year' ? '전년동월대비(원)' : '전월대비(원)', formatter: formatSignedCost }
        ], {
            title: '설비 배부 요약',
            subText: '합산 기준으로 설비별 사용량, 비중, 배부 금액을 정리했습니다.',
            note: '전력총량 기준으로 비율을 계산했고, 사용요금은 Plant A 기본요금과 전기요금계를 기준으로 배부했습니다.'
        });
    }

    function buildUtilElectricTeamSummaryHtml(model, teamDatasetResult = null) {
        const summaryModel = buildUtilElectricTeamSummaryModel(teamDatasetResult, model?.compareKey, model);
        if (!summaryModel || !Array.isArray(summaryModel.columns) || !summaryModel.columns.length) return '';
        return buildUtilElectricSummaryTableHtml(summaryModel.columns, [
            { key: 'usage', label: '총 사용량(kWh)', formatter: formatUtilElectricMeterUsageValue },
            { key: 'cost', label: '금액 합계(원)', formatter: formatCost },
            { key: 'production', label: '생산량(kg)', formatter: value => formatQuantity(value, 'kg') },
            { key: 'compareCost', label: summaryModel.compareKey === 'year' ? '전년 동월대비' : '전월대비', formatter: formatSignedCost }
        ], {
            title: '팀 요약',
            subText: 'Line Alpha를 제외한 전기 사용량, 금액, 생산량 기준입니다.',
            note: '생산량은 Line Beta, Line Gamma, Line Delta만 집계하고 Admin Area(기타 포함)은 생산량에서 제외합니다.'
        });
    }

    function buildUtilElectricBillingSummaryHtml(model) {
        const summaryModel = buildUtilElectricBillingSummaryModel(model);
        if (!summaryModel || !Array.isArray(summaryModel.items) || !summaryModel.items.length) return '';
        const detailColumns = Array.isArray(summaryModel.detailValues)
            ? summaryModel.detailValues.map(item => ({ label: item.label, caption: '', value: item.value }))
            : [];
        const billingDescriptor = resolveBillingDocumentDescriptor(
            'electric',
            summaryModel.monthKey || '',
            'plantA'
        );
        const billingButtonTitle = billingDescriptor
            ? `${summaryModel.monthLabel || ''} Plant A 청구서 보기`
            : `${summaryModel.monthLabel || ''} Plant A 청구서가 없습니다.`;
        const detailTableHtml = detailColumns.length
            ? buildUtilElectricSummaryTableHtml(detailColumns, [
                {
                    key: 'value',
                    label: 'Plant A 청구 기준',
                    formatter: (value, column) => (
                        column?.key === 'unit_price'
                            ? formatUtilElectricBillingUnitPrice(value)
                            : formatCost(value)
                    )
                }
            ], {
                title: '청구 요약',
                subText: 'Plant A 전기 청구 입력값을 그대로 정리했습니다.',
                note: '전기요금계와 청구금액은 입력값이 없을 경우 청구 항목으로 다시 계산합니다.',
                actionsHtml: `
                    <button
                        type="button"
                        class="util-sheet-gas-summary-doc-btn"
                        data-role="util-sheet-billing-preview-toggle"
                        data-billing-dataset-key="electric"
                        data-month-key="${escapeHtml(summaryModel.monthKey || '')}"
                        data-billing-scope-key="plantA"
                        title="${escapeHtml(billingButtonTitle)}"
                        aria-label="${escapeHtml(billingButtonTitle)}"
                        ${billingDescriptor ? '' : 'disabled'}
                    >
                        <i class="fa-solid fa-file-invoice" aria-hidden="true"></i>
                        <span>청구서</span>
                    </button>
                `
            })
            : '';
        return `
            ${detailTableHtml}
            <article class="util-sheet-meter-table-card is-current">
                <div class="util-sheet-meter-table-head">
                    <div>
                        <div class="util-sheet-meter-table-title">정산 기준</div>
                        <div class="util-sheet-meter-table-sub">${escapeHtml(summaryModel.scopeLabel || '')}</div>
                    </div>
                    <div class="util-sheet-meter-table-sub">${escapeHtml(summaryModel.monthLabel || '')}</div>
                </div>
                <div class="util-sheet-analysis-summary-grid">
                    ${summaryModel.items.map(item => `
                        <article class="util-sheet-analysis-summary-card" data-tone="${escapeHtml(item.tone || 'neutral')}">
                            <div class="util-sheet-analysis-summary-head util-sheet-analysis-summary-head-with-help">
                                <span class="util-sheet-analysis-summary-head-main">
                                    <span class="util-sheet-analysis-summary-icon" aria-hidden="true"><i class="fa-solid ${escapeHtml(item.icon || 'fa-circle')}"></i></span>
                                    <span class="util-sheet-analysis-summary-label">${escapeHtml(item.title || '')}</span>
                                </span>
                                ${item.helpText ? `
                                    <details class="util-sheet-inline-help">
                                        <summary aria-label="${escapeHtml(`${item.title || ''} 기준`)}">?</summary>
                                        <div class="util-sheet-inline-help-body">${escapeHtml(item.helpText)}</div>
                                    </details>
                                ` : ''}
                            </div>
                            <div class="util-sheet-analysis-summary-value">${escapeHtml(item.valueText || '-')}</div>
                            ${item.metaText ? `<div class="util-sheet-analysis-summary-meta">${escapeHtml(item.metaText)}</div>` : ''}
                            ${item.subText ? `<div class="util-sheet-analysis-summary-sub">${escapeHtml(item.subText)}</div>` : ''}
                        </article>
                    `).join('')}
                </div>
                <div class="util-sheet-electric-summary-note">데이터 관리 &gt; 유틸리티 기입 &gt; 전기 정산항목 값을 그대로 사용합니다.</div>
            </article>
        `;
    }

    function buildUtilElectricMeterComparisonSectionHtml(model, teamDatasetResult = null, viewKey = 'meter') {
        if (!model?.ready) {
            return `
                <section class="util-sheet-section">
                    <div class="util-sheet-empty">${escapeHtml(model?.message || '전기 검침표를 준비하지 못했습니다.')}</div>
                </section>
            `;
        }

        const normalizedViewKey = normalizeUtilElectricMeterViewKey(viewKey);
        const selectedMonthLabel = formatMonthLong(model.selectedTable.monthKey);
        const referenceMonthLabel = formatMonthLong(model.referenceTable.monthKey);
        const isYearCompare = model.compareKey === 'year';
        const baseColumns = Array.isArray(model.selectedTable?.columns) ? model.selectedTable.columns : [];
        const referenceColumnMap = new Map(
            (Array.isArray(model.referenceTable?.columns) ? model.referenceTable.columns : []).map(column => [column.id, column])
        );
        const comparisonColumns = baseColumns.map(column => {
            const referenceColumn = referenceColumnMap.get(column.id);
            const currentUsage = Number(column?.usage);
            const referenceUsage = Number(referenceColumn?.usage);
            return {
                label: column.label,
                teamKey: column.teamKey,
                value: Number.isFinite(currentUsage) && Number.isFinite(referenceUsage)
                    ? currentUsage - referenceUsage
                    : null
            };
        });
        const referenceUsageColumns = baseColumns.map(column => ({
            label: column.label,
            teamKey: column.teamKey,
            value: referenceColumnMap.get(column.id)?.usage ?? null
        }));
        const detailSectionHtml = `
            ${buildUtilElectricMeterDetailDisclosureHtml(
                '비교결과',
                `${selectedMonthLabel} 사용량과 ${referenceMonthLabel} 전력량을 함께 비교합니다.`,
                buildUtilElectricMeterDetailRowsTableHtml(baseColumns, [
                    {
                        label: isYearCompare ? '전년 동월 전력량' : '전월 전력량',
                        formatter: formatUtilElectricMeterUsageValue,
                        columns: referenceUsageColumns
                    },
                    {
                        label: '비교 결과',
                        formatter: formatSignedInteger,
                        columns: comparisonColumns
                    }
                ])
            )}
            ${buildUtilElectricBillingSummaryHtml(model)}
        `;
        const mergedMeterSectionHtml = `
            ${buildUtilElectricMeterTableHtml(model.selectedTable, `${selectedMonthLabel} 검침표`, {
                startReadingLabel: '선택월 지침',
                endReadingLabel: '익월 지침'
            })}
            ${detailSectionHtml}
        `;

        return `
            <section class="util-sheet-section">
                <div class="util-sheet-section-head">
                    <div>
                        <div class="util-sheet-section-title">전기 검침표</div>
                        <div class="util-sheet-section-sub">전기 검침표, 설비 배부 요약, 팀 요약을 전환해서 볼 수 있습니다.</div>
                    </div>
                    ${buildViewToggleHtml(normalizedViewKey)}
                </div>
                <div class="util-sheet-meter-table-stack">
                    ${normalizedViewKey === 'allocation'
                        ? `${buildUtilElectricAllocationSummaryHtml(model, teamDatasetResult)}${detailSectionHtml}`
                        : normalizedViewKey === 'team'
                            ? `${buildUtilElectricTeamSummaryHtml(model, teamDatasetResult)}${detailSectionHtml}`
                            : mergedMeterSectionHtml}
                </div>
            </section>
        `;
    }

    globalScope.KPIUtilReportSheetElectricComparisonSummary = Object.freeze({
        setRuntimeAdapters,
        getUtilElectricBillingScopeEntry,
        getUtilElectricBillingFields,
        getUtilElectricBillingNumericField,
        resolveUtilElectricityChargeTotalValue,
        resolveUtilElectricBillingAmountValue,
        resolveUtilElectricBillingUnitPriceValue,
        buildUtilElectricAllocationSummaryModel,
        buildUtilElectricTeamSummaryModel,
        buildUtilElectricBillingSummaryModel,
        buildUtilElectricMeterComparisonSectionHtml
    });
})(typeof window !== 'undefined' ? window : globalThis);
