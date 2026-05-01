(function registerUtilReportSheetMeteringRuntime(globalScope) {
    if (globalScope.KPIUtilReportSheetMeteringRuntime) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.metering-runtime.js');
    }

    const {
        UTIL_SHEET_CUTOFF,
        UTIL_GAS_METER_FIELD_ORDER,
        UTIL_GAS_METER_FIELD_LABELS,
        UTIL_GAS_METER_LPG_FACTOR,
        UTIL_GAS_METER_CORRECTION_TARGET_IDS,
        UtilSheetRuntimeState
    } = utilReportSheetConfig;

    const runtime = {
        isUtilSheetPlainObject: null,
        parseUtilGasMeterNumber: null,
        normalizeUtilGasMeterDate: null,
        compareUtilSheetMonthKeys: null,
        shiftUtilSheetMonthKey: null,
        normalizeUtilSheetCompareKey: null,
        parseUtilMonthValue: null,
        getUtilSheetEntries: null,
        buildUtilMonthOptions: null,
        buildUtilGasBillingSummaryModel: null,
        getUtilGasMeterColumn: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetMeteringRuntime;
    }

    function isPlainObject(value) {
        if (typeof runtime.isUtilSheetPlainObject === 'function') {
            return runtime.isUtilSheetPlainObject(value);
        }
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function parseGasMeterNumber(value) {
        if (typeof runtime.parseUtilGasMeterNumber === 'function') {
            return runtime.parseUtilGasMeterNumber(value);
        }
        if (value === null || value === undefined || value === '') return null;
        const parsed = Number.parseFloat(String(value).replace(/,/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function normalizeGasMeterDate(value) {
        if (typeof runtime.normalizeUtilGasMeterDate === 'function') {
            return runtime.normalizeUtilGasMeterDate(value);
        }
        const text = String(value || '').trim();
        return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
    }

    function compareMonthKeys(leftValue = '', rightValue = '') {
        if (typeof runtime.compareUtilSheetMonthKeys === 'function') {
            return runtime.compareUtilSheetMonthKeys(leftValue, rightValue);
        }
        return String(leftValue || '').localeCompare(String(rightValue || ''));
    }

    function shiftMonthKey(monthKey, offset = 0) {
        if (typeof runtime.shiftUtilSheetMonthKey === 'function') {
            return runtime.shiftUtilSheetMonthKey(monthKey, offset);
        }
        const parsed = typeof runtime.parseUtilMonthValue === 'function'
            ? runtime.parseUtilMonthValue(monthKey)
            : null;
        if (!parsed || !Number.isFinite(offset)) return '';
        const shifted = new Date(parsed.year, parsed.month - 1 + offset, 1);
        return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}`;
    }

    function normalizeCompareKey(compareKey = '') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function buildGasBillingSummary(monthKey, monthTable) {
        if (typeof runtime.buildUtilGasBillingSummaryModel === 'function') {
            return runtime.buildUtilGasBillingSummaryModel(monthKey, monthTable);
        }
        return null;
    }

    function getGasMeterColumn(monthTable, fieldId = '') {
        if (typeof runtime.getUtilGasMeterColumn === 'function') {
            return runtime.getUtilGasMeterColumn(monthTable, fieldId);
        }
        return Array.isArray(monthTable?.columns)
            ? monthTable.columns.find(column => column?.id === fieldId) || null
            : null;
    }

    function getUtilMeteringDataset(datasetKey = '') {
        const normalizedDatasetKey = String(datasetKey || '').trim();
        const rootStore = isPlainObject(globalScope.__LOCAL_APP_STORE__)
            ? globalScope.__LOCAL_APP_STORE__
            : null;
        const dataset = rootStore?.resourceDatasets?.[normalizedDatasetKey];
        if (isPlainObject(dataset)) {
            return dataset;
        }
        if (
            normalizedDatasetKey === 'electric'
            && rootStore
            && (
                Array.isArray(rootStore.equipmentItems)
                || isPlainObject(rootStore.equipmentEntries)
                || isPlainObject(rootStore.teamAssignments)
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
        if (!globalScope.KpiMeteringBridge || typeof globalScope.KpiMeteringBridge.ensureIntegratedMeteringRuntime !== 'function') {
            return Promise.resolve(false);
        }
        const nextPromise = Promise.resolve()
            .then(() => globalScope.KpiMeteringBridge.ensureIntegratedMeteringRuntime())
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
                readingAdjustmentValue: parseGasMeterNumber(item.readingAdjustmentValue) || 0,
                readingAdjustmentStartDate: normalizeGasMeterDate(item.readingAdjustmentStartDate)
            };
        });
    }

    function buildUtilGasMeterTimelineMap(fieldDefs = []) {
        const store = getUtilGasMeteringStore();
        const entries = isPlainObject(store?.equipmentEntries)
            ? store.equipmentEntries
            : (isPlainObject(globalScope.__PRESET_GAS_ENTRIES__) ? globalScope.__PRESET_GAS_ENTRIES__ : {});
        const sortedDates = Object.keys(entries).sort();
        const timelineMap = new Map(fieldDefs.map(field => [field.id, []]));

        sortedDates.forEach(dateString => {
            const entry = entries[dateString];
            const values = isPlainObject(entry?.values) ? entry.values : null;
            if (!values) return;
            fieldDefs.forEach(field => {
                const rawValue = parseGasMeterNumber(values[field.id]);
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

    function buildUtilGasMeterMonthTable(monthKey, fieldDefs = [], timelineMap = new Map()) {
        const startMonthKey = String(monthKey || '').trim();
        const endMonthKey = shiftMonthKey(startMonthKey, 1);
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

        const normalizedCompareKey = normalizeCompareKey(compareKey);
        const referenceMonthKey = normalizedCompareKey === 'year'
            ? shiftMonthKey(normalizedSelectedMonthKey, -12)
            : shiftMonthKey(normalizedSelectedMonthKey, -1);
        const fieldDefs = buildUtilGasMeterFieldDefinitions();
        const timelineMap = buildUtilGasMeterTimelineMap(fieldDefs);
        const referenceTable = buildUtilGasMeterMonthTable(referenceMonthKey, fieldDefs, timelineMap);
        const selectedTable = buildUtilGasMeterMonthTable(normalizedSelectedMonthKey, fieldDefs, timelineMap);
        return {
            ready: true,
            compareKey: normalizedCompareKey,
            referenceTable,
            selectedTable,
            billingSummary: buildGasBillingSummary(normalizedSelectedMonthKey, selectedTable)
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
                lpg: Number(getGasMeterColumn(monthTable, 'gas_field_02')?.usage),
                lng: Number(getGasMeterColumn(monthTable, 'gas_field_01')?.usage)
            });
        });
        return usageMap;
    }

    function buildUtilSheetMonthBounds(datasetKey) {
        const monthOptions = typeof runtime.buildUtilMonthOptions === 'function'
            ? runtime.buildUtilMonthOptions(
                typeof runtime.getUtilSheetEntries === 'function'
                    ? runtime.getUtilSheetEntries(datasetKey)
                    : []
            )
            : [];
        const monthKeys = monthOptions
            .map(item => item?.value || item?.key || '')
            .filter(Boolean)
            .sort(compareMonthKeys);
        if (!monthKeys.length) return null;
        const from = monthKeys[0];
        const latest = monthKeys[monthKeys.length - 1];
        const to = compareMonthKeys(latest, UTIL_SHEET_CUTOFF) > 0
            ? UTIL_SHEET_CUTOFF
            : latest;
        if (compareMonthKeys(from, to) > 0) return null;
        return { from, to };
    }

    globalScope.KPIUtilReportSheetMeteringRuntime = {
        setRuntimeAdapters,
        getUtilMeteringDataset,
        ensureUtilMeteringDataset,
        getUtilGasMeteringStore,
        hasUtilGasMeteringStore,
        ensureUtilGasMeteringStore,
        buildUtilGasMeterFieldDefinitions,
        buildUtilGasMeterTimelineMap,
        buildUtilGasMeterMonthTable,
        buildUtilGasMeterComparisonModel,
        buildUtilGasAnalysisUsageMap,
        buildUtilSheetMonthBounds
    };
})(globalThis);
