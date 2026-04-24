(function registerUtilReportSheetElectricMeterModel(globalScope) {
    if (globalScope.KPIUtilReportSheetElectricMeterModel) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.electric.meter-model.js');
    }
    const {
        UtilSheetRuntimeState
    } = utilReportSheetConfig;
    const utilReportSheetOptions = globalScope.KPIUtilReportSheetOptions;
    if (!utilReportSheetOptions) {
        throw new Error('KPIUtilReportSheetOptions must load before KPI.util.report.sheet.electric.meter-model.js');
    }
    const {
        UTIL_ELECTRIC_METER_TOTAL_POWER_FIELD_ID,
        UTIL_ELECTRIC_METER_ACTIVE_POWER_FIELD_IDS,
        UTIL_ELECTRIC_METER_EXCLUDED_DETAIL_FIELD_IDS,
        UTIL_ELECTRIC_METER_FIELD_LABEL_OVERRIDES,
        UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS,
        UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY,
        getUtilElectricMeterTeamOption
    } = utilReportSheetOptions;

    const runtime = {
        getUtilElectricMeteringStore: null,
        hasUtilElectricMeteringStore: null,
        getUtilElectricUtilitySnapshot: null,
        parseUtilGasMeterNumber: null,
        normalizeUtilGasMeterDate: null,
        isUtilSheetPlainObject: null,
        compareUtilSheetMonthKeys: null,
        shiftUtilSheetMonthKey: null,
        normalizeUtilSheetCompareKey: null,
        buildUtilSheetMonthBounds: null,
        buildUtilReportMonthlyRows: null,
        getUtilGasProductionMetric: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetElectricMeterModel;
    }

    function getElectricMeteringStore() {
        return typeof runtime.getUtilElectricMeteringStore === 'function'
            ? runtime.getUtilElectricMeteringStore()
            : null;
    }

    function hasElectricMeteringStore() {
        if (typeof runtime.hasUtilElectricMeteringStore === 'function') {
            return Boolean(runtime.hasUtilElectricMeteringStore());
        }
        return Boolean(getElectricMeteringStore());
    }

    function getElectricUtilitySnapshot() {
        return typeof runtime.getUtilElectricUtilitySnapshot === 'function'
            ? runtime.getUtilElectricUtilitySnapshot()
            : null;
    }

    function parseGasMeterNumber(value) {
        if (typeof runtime.parseUtilGasMeterNumber === 'function') {
            return runtime.parseUtilGasMeterNumber(value);
        }
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : NaN;
    }

    function normalizeGasMeterDate(value) {
        if (typeof runtime.normalizeUtilGasMeterDate === 'function') {
            return runtime.normalizeUtilGasMeterDate(value);
        }
        return String(value || '').trim();
    }

    function isPlainObject(value) {
        if (typeof runtime.isUtilSheetPlainObject === 'function') {
            return runtime.isUtilSheetPlainObject(value);
        }
        return !!value && typeof value === 'object' && !Array.isArray(value);
    }

    function compareMonthKeys(left = '', right = '') {
        if (typeof runtime.compareUtilSheetMonthKeys === 'function') {
            return runtime.compareUtilSheetMonthKeys(left, right);
        }
        return String(left || '').localeCompare(String(right || ''), 'ko');
    }

    function shiftMonthKey(monthKey = '', delta = 0) {
        if (typeof runtime.shiftUtilSheetMonthKey === 'function') {
            return runtime.shiftUtilSheetMonthKey(monthKey, delta);
        }
        return String(monthKey || '').trim();
    }

    function normalizeCompareKey(compareKey = 'month') {
        if (typeof runtime.normalizeUtilSheetCompareKey === 'function') {
            return runtime.normalizeUtilSheetCompareKey(compareKey);
        }
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function buildMonthBounds(datasetKey = 'electric') {
        return typeof runtime.buildUtilSheetMonthBounds === 'function'
            ? runtime.buildUtilSheetMonthBounds(datasetKey)
            : null;
    }

    function buildReportMonthlyRows(state = {}) {
        return typeof runtime.buildUtilReportMonthlyRows === 'function'
            ? runtime.buildUtilReportMonthlyRows(state) || null
            : null;
    }

    function getGasProductionMetric(monthKey = '', teamNames = []) {
        return typeof runtime.getUtilGasProductionMetric === 'function'
            ? runtime.getUtilGasProductionMetric(monthKey, teamNames)
            : NaN;
    }

    function buildUtilElectricMeterFieldDefinitions() {
        const store = getElectricMeteringStore();
        const equipmentItems = Array.isArray(store?.equipmentItems) ? store.equipmentItems : [];
        return equipmentItems
            .filter(item => item && typeof item === 'object')
            .map(item => ({
                id: String(item.id || '').trim(),
                label: String(
                    UTIL_ELECTRIC_METER_FIELD_LABEL_OVERRIDES[item.id]
                    || item.label
                    || item.id
                ).trim(),
                factor: Number.isFinite(parseGasMeterNumber(item.factor))
                    ? parseGasMeterNumber(item.factor)
                    : 1,
                readingAdjustmentValue: parseGasMeterNumber(item.readingAdjustmentValue) || 0,
                readingAdjustmentStartDate: normalizeGasMeterDate(item.readingAdjustmentStartDate),
                visibleFromMonth: String(item.visibleFromMonth || '').trim()
            }))
            .filter(item => item.id);
    }

    function getUtilElectricMeterStructure() {
        const store = getElectricMeteringStore();
        if (!store) {
            return {
                fieldDefs: [],
                fieldMap: new Map(),
                timelineMap: new Map()
            };
        }
        const cache = UtilSheetRuntimeState.electricMeterStructureCache;
        if (cache && cache.store === store) {
            return cache;
        }
        const fieldDefs = buildUtilElectricMeterFieldDefinitions();
        const fieldMap = new Map(fieldDefs.map(field => [field.id, field]));
        const timelineMap = buildUtilElectricMeterTimelineMap(fieldDefs);
        const nextCache = {
            store,
            fieldDefs,
            fieldMap,
            timelineMap
        };
        UtilSheetRuntimeState.electricMeterStructureCache = nextCache;
        return nextCache;
    }

    function buildUtilElectricMeterFieldTeamKeyMap(option) {
        const store = getElectricMeteringStore();
        const teamAssignments = isPlainObject(store?.teamAssignments) ? store.teamAssignments : {};
        const detailTeamKeys = Array.isArray(option?.detailTeamKeys) ? option.detailTeamKeys : [];
        const teamKeyMap = new Map();

        detailTeamKeys.forEach(teamKey => {
            const equipmentIds = Array.isArray(teamAssignments?.[teamKey]) ? teamAssignments[teamKey] : [];
            equipmentIds.forEach(equipmentId => {
                const normalizedId = String(equipmentId || '').trim();
                if (!normalizedId || teamKeyMap.has(normalizedId)) return;
                teamKeyMap.set(normalizedId, teamKey);
            });
        });

        detailTeamKeys.forEach(teamKey => {
            const fallbackFieldIds = Array.isArray(UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS?.[teamKey])
                ? UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS[teamKey]
                : [];
            fallbackFieldIds.forEach(fieldId => {
                const normalizedId = String(fieldId || '').trim();
                if (!normalizedId || teamKeyMap.has(normalizedId)) return;
                teamKeyMap.set(normalizedId, teamKey);
            });
        });

        return teamKeyMap;
    }

    function unwrapUtilElectricMeterReadingValue(fieldId, rawValue, minimumValue = null) {
        if (fieldId !== 'field_13' || !Number.isFinite(minimumValue)) {
            return rawValue;
        }
        let candidateValue = rawValue;
        while (candidateValue < minimumValue) {
            candidateValue += 10000;
        }
        return candidateValue;
    }

    function buildUtilElectricMeterTimelineMap(fieldDefs) {
        const store = getElectricMeteringStore();
        const entries = isPlainObject(store?.equipmentEntries)
            ? store.equipmentEntries
            : (isPlainObject(globalScope.__PRESET_ELECTRIC_ENTRIES__) ? globalScope.__PRESET_ELECTRIC_ENTRIES__ : {});
        const sortedDates = Object.keys(entries).sort();
        const timelineMap = new Map(fieldDefs.map(field => [field.id, []]));
        const previousValueMap = new Map();

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
                const resolvedValue = unwrapUtilElectricMeterReadingValue(
                    field.id,
                    adjustedValue,
                    previousValueMap.get(field.id)
                );
                previousValueMap.set(field.id, resolvedValue);
                timelineMap.get(field.id).push({
                    dateString,
                    rawValue,
                    value: resolvedValue
                });
            });
        });

        return timelineMap;
    }

    function getUtilElectricMeterFirstDetailInMonth(timeline, monthKey) {
        if (!Array.isArray(timeline)) return null;
        const prefix = `${monthKey}-`;
        return timeline.find(item => String(item?.dateString || '').startsWith(prefix)) || null;
    }

    function shouldIncludeUtilElectricMeterField(field, monthKey) {
        if (!field?.id || UTIL_ELECTRIC_METER_EXCLUDED_DETAIL_FIELD_IDS.has(field.id)) {
            return false;
        }
        if (!field.visibleFromMonth) {
            return true;
        }
        return compareMonthKeys(monthKey, field.visibleFromMonth) >= 0;
    }

    function resolveUtilElectricMeterDetailFieldIds(option, monthKey, fieldMap) {
        const store = getElectricMeteringStore();
        const teamAssignments = isPlainObject(store?.teamAssignments) ? store.teamAssignments : {};
        const orderedIds = [];
        const seen = new Set();
        const detailTeamKeys = Array.isArray(option?.detailTeamKeys) ? option.detailTeamKeys : [];

        detailTeamKeys.forEach(teamKey => {
            const equipmentIds = Array.isArray(teamAssignments?.[teamKey]) ? teamAssignments[teamKey] : [];
            equipmentIds.forEach(equipmentId => {
                const normalizedId = String(equipmentId || '').trim();
                if (!normalizedId || seen.has(normalizedId)) return;
                const field = fieldMap.get(normalizedId);
                if (!shouldIncludeUtilElectricMeterField(field, monthKey)) return;
                seen.add(normalizedId);
                orderedIds.push(normalizedId);
            });
        });

        detailTeamKeys.forEach(teamKey => {
            const fallbackFieldIds = Array.isArray(UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS?.[teamKey])
                ? UTIL_ELECTRIC_METER_TEAM_FALLBACK_FIELD_IDS[teamKey]
                : [];
            fallbackFieldIds.forEach(fieldId => {
                const normalizedId = String(fieldId || '').trim();
                if (!normalizedId || seen.has(normalizedId)) return;
                const field = fieldMap.get(normalizedId);
                if (!shouldIncludeUtilElectricMeterField(field, monthKey)) return;
                seen.add(normalizedId);
                orderedIds.push(normalizedId);
            });
        });

        return orderedIds;
    }

    function getUtilElectricMeterPowerReading(fieldMap, timelineMap, monthKey) {
        const totalField = fieldMap.get(UTIL_ELECTRIC_METER_TOTAL_POWER_FIELD_ID) || null;
        const directValue = totalField
            ? getUtilElectricMeterFirstDetailInMonth(timelineMap.get(totalField.id) || [], monthKey)?.value
            : null;
        if (Number.isFinite(directValue)) {
            return directValue;
        }
        const fallbackValues = UTIL_ELECTRIC_METER_ACTIVE_POWER_FIELD_IDS
            .map(fieldId => getUtilElectricMeterFirstDetailInMonth(timelineMap.get(fieldId) || [], monthKey)?.value);
        if (fallbackValues.some(value => !Number.isFinite(value))) {
            return null;
        }
        return fallbackValues.reduce((sum, value) => sum + value, 0);
    }

    function buildUtilElectricMeterPowerColumn(startMonthKey, endMonthKey, fieldMap, timelineMap) {
        const startReading = getUtilElectricMeterPowerReading(fieldMap, timelineMap, startMonthKey);
        const endReading = getUtilElectricMeterPowerReading(fieldMap, timelineMap, endMonthKey);
        const safeStartReading = Number.isFinite(startReading) ? startReading : null;
        const safeEndReading = Number.isFinite(endReading) ? endReading : null;
        const rawDifference = Number.isFinite(safeStartReading) && Number.isFinite(safeEndReading)
            ? safeEndReading - safeStartReading
            : null;
        return {
            id: 'power_total',
            label: '전력총량',
            teamKey: 'combined',
            factor: 1800,
            startReading: safeStartReading,
            endReading: safeEndReading,
            usage: Number.isFinite(rawDifference) ? rawDifference * 1800 : null
        };
    }

    function buildUtilElectricMeterFieldColumn(field, startMonthKey, endMonthKey, timelineMap, teamKey = '') {
        const timeline = timelineMap.get(field.id) || [];
        const startDetail = getUtilElectricMeterFirstDetailInMonth(timeline, startMonthKey);
        const endDetail = getUtilElectricMeterFirstDetailInMonth(timeline, endMonthKey);
        const startReading = Number.isFinite(startDetail?.value) ? startDetail.value : null;
        const endReading = Number.isFinite(endDetail?.value) ? endDetail.value : null;
        const rawDifference = Number.isFinite(startReading) && Number.isFinite(endReading)
            ? endReading - startReading
            : null;
        return {
            id: field.id,
            label: field.label,
            teamKey: String(teamKey || '').trim() || 'combined',
            factor: Number.isFinite(field.factor) ? field.factor : 1,
            startReading,
            endReading,
            usage: Number.isFinite(rawDifference) ? rawDifference * (Number.isFinite(field.factor) ? field.factor : 1) : null
        };
    }

    function buildUtilElectricMeterTotalColumn(detailColumns = [], teamKey = 'combined') {
        const validColumns = Array.isArray(detailColumns) ? detailColumns : [];
        const startValues = validColumns.map(column => column?.startReading).filter(Number.isFinite);
        const endValues = validColumns.map(column => column?.endReading).filter(Number.isFinite);
        const usageValues = validColumns.map(column => column?.usage).filter(Number.isFinite);
        return {
            id: 'combined_total',
            label: '합계',
            teamKey: String(teamKey || '').trim() || 'combined',
            factor: null,
            startReading: startValues.length ? startValues.reduce((sum, value) => sum + value, 0) : null,
            endReading: endValues.length ? endValues.reduce((sum, value) => sum + value, 0) : null,
            usage: usageValues.length ? usageValues.reduce((sum, value) => sum + value, 0) : null
        };
    }

    function buildUtilElectricMeterOtherColumn(powerColumn = null, totalColumn = null) {
        const startReading = Number.isFinite(powerColumn?.startReading) && Number.isFinite(totalColumn?.startReading)
            ? powerColumn.startReading - totalColumn.startReading
            : null;
        const endReading = Number.isFinite(powerColumn?.endReading) && Number.isFinite(totalColumn?.endReading)
            ? powerColumn.endReading - totalColumn.endReading
            : null;
        const usage = Number.isFinite(powerColumn?.usage) && Number.isFinite(totalColumn?.usage)
            ? powerColumn.usage - totalColumn.usage
            : null;
        return {
            id: 'other_total',
            label: '기타',
            teamKey: 'combined',
            factor: null,
            startReading,
            endReading,
            usage
        };
    }

    function buildUtilElectricMeterMonthTable(monthKey, option, detailFieldIds = null) {
        const startMonthKey = String(monthKey || '').trim();
        const endMonthKey = shiftMonthKey(startMonthKey, 1);
        const structure = getUtilElectricMeterStructure();
        const fieldMap = structure.fieldMap;
        const timelineMap = structure.timelineMap;
        const resolvedFieldIds = Array.isArray(detailFieldIds) && detailFieldIds.length
            ? detailFieldIds.slice()
            : resolveUtilElectricMeterDetailFieldIds(option, monthKey, fieldMap);
        const displayFieldIds = (String(option?.key || '').trim() || 'combined') === 'combined'
            ? resolvedFieldIds.filter(fieldId => String(fieldId || '').trim() !== 'field_28')
            : resolvedFieldIds;
        const detailFieldTeamKeyMap = buildUtilElectricMeterFieldTeamKeyMap(option);
        const powerColumn = buildUtilElectricMeterPowerColumn(startMonthKey, endMonthKey, fieldMap, timelineMap);
        const detailColumns = displayFieldIds
            .map(fieldId => fieldMap.get(fieldId))
            .filter(Boolean)
            .map(field => buildUtilElectricMeterFieldColumn(
                field,
                startMonthKey,
                endMonthKey,
                timelineMap,
                detailFieldTeamKeyMap.get(field.id) || (option?.key !== 'combined' ? option?.key : 'combined')
            ));
        const totalColumn = buildUtilElectricMeterTotalColumn(
            detailColumns,
            option?.key !== 'combined' ? option?.key : 'combined'
        );
        const otherColumn = (String(option?.key || '').trim() || 'combined') === 'combined'
            ? buildUtilElectricMeterOtherColumn(powerColumn, totalColumn)
            : null;
        return {
            monthKey,
            startMonthKey,
            endMonthKey,
            optionKey: String(option?.key || '').trim() || 'combined',
            detailFieldIds: resolvedFieldIds,
            detailColumns,
            columns: [powerColumn]
                .concat(detailColumns)
                .concat(otherColumn ? [otherColumn] : [])
                .concat([totalColumn])
        };
    }

    function buildUtilElectricMeterRows(filters = [], targetMonthKey = '') {
        const bounds = buildMonthBounds('electric');
        if (!bounds) return [];
        const normalizedFilters = Array.isArray(filters)
            ? Array.from(new Set(filters.map(filter => String(filter || '').trim()).filter(Boolean)))
            : [];
        if (!normalizedFilters.length) return [];

        const rowMap = new Map();
        normalizedFilters.forEach(teamFilter => {
            const result = buildReportMonthlyRows({
                from: bounds.from,
                to: String(targetMonthKey || bounds.to).trim() || bounds.to,
                electricTeam: teamFilter,
                gasTeam: 'all',
                wasteTeam: 'all',
                productionTeam: 'all',
                categoryKey: 'cost',
                selectedScopeKeys: ['electric']
            });
            const rows = Array.isArray(result?.rows) ? result.rows : [];
            rows.forEach(row => {
                const monthKey = String(row?.monthKey || '').trim();
                if (!monthKey) return;
                const current = rowMap.get(monthKey) || {
                    monthKey,
                    year: Number(row?.year),
                    month: Number(row?.month),
                    electricUsage: 0,
                    electricCost: 0
                };
                current.electricUsage += Number.isFinite(row?.electricUsage) ? row.electricUsage : 0;
                current.electricCost += Number.isFinite(row?.electricCost) ? row.electricCost : 0;
                rowMap.set(monthKey, current);
            });
        });
        return Array.from(rowMap.values()).sort((left, right) => compareMonthKeys(left.monthKey, right.monthKey));
    }

    function resolveUtilElectricSnapshotTeamKeys(reportTeamFilters = []) {
        const filters = Array.isArray(reportTeamFilters) ? reportTeamFilters : [];
        return Array.from(new Set(
            filters
                .map(filter => UTIL_ELECTRIC_TEAM_FILTER_TO_SNAPSHOT_KEY[String(filter || '').trim()] || '')
                .filter(Boolean)
        ));
    }

    function buildUtilElectricRowsFromSnapshot(snapshotTeamKeys = [], targetMonthKey = '') {
        const snapshot = getElectricUtilitySnapshot();
        if (!snapshot) return [];
        const teamKeys = Array.isArray(snapshotTeamKeys) ? snapshotTeamKeys.filter(Boolean) : [];
        if (!teamKeys.length) return [];
        const hasAllRequestedTeams = teamKeys.every(teamKey => {
            const teamSnapshot = snapshot?.teams?.[teamKey];
            return isPlainObject(teamSnapshot) && Object.keys(teamSnapshot).length > 0;
        });
        if (!hasAllRequestedTeams) return [];
        const normalizedTargetMonthKey = String(targetMonthKey || '').trim();
        let cache = UtilSheetRuntimeState.electricSnapshotRowsCache;
        if (!cache || cache.snapshot !== snapshot) {
            cache = {
                snapshot,
                rowsByKey: new Map()
            };
            UtilSheetRuntimeState.electricSnapshotRowsCache = cache;
        }
        const cacheKey = `${teamKeys.join('|')}::${normalizedTargetMonthKey}`;
        if (cache.rowsByKey.has(cacheKey)) {
            return cache.rowsByKey.get(cacheKey);
        }
        const monthSet = new Set();
        teamKeys.forEach(teamKey => {
            Object.keys(snapshot?.teams?.[teamKey] || {}).forEach(monthKey => {
                const normalizedMonthKey = String(monthKey || '').trim();
                if (normalizedMonthKey) monthSet.add(normalizedMonthKey);
            });
        });
        if (!monthSet.size) return [];
        if (normalizedTargetMonthKey) monthSet.add(normalizedTargetMonthKey);
        const rows = Array.from(monthSet)
            .filter(Boolean)
            .sort(compareMonthKeys)
            .map(monthKey => {
                const bucket = teamKeys.reduce((acc, teamKey) => {
                    const entry = snapshot?.teams?.[teamKey]?.[monthKey] || null;
                    if (Number.isFinite(entry?.usage)) {
                        acc.electricUsage += entry.usage;
                        acc.hasUsage = true;
                    }
                    if (Number.isFinite(entry?.cost)) {
                        acc.electricCost += entry.cost;
                        acc.hasCost = true;
                    }
                    return acc;
                }, {
                    monthKey,
                    year: Number.parseInt(String(monthKey).slice(0, 4), 10),
                    month: Number.parseInt(String(monthKey).slice(5, 7), 10),
                    electricUsage: 0,
                    electricCost: 0,
                    hasUsage: false,
                    hasCost: false
                });
                const { hasUsage, hasCost, ...baseRow } = bucket;
                return {
                    ...baseRow,
                    electricUsage: hasUsage ? baseRow.electricUsage : null,
                    electricCost: hasCost ? baseRow.electricCost : null
                };
            });
        cache.rowsByKey.set(cacheKey, rows);
        return rows;
    }

    function resolveUtilElectricMetricValue(primaryValue, fallbackValue) {
        const hasPrimary = Number.isFinite(primaryValue);
        const hasFallback = Number.isFinite(fallbackValue);
        if (hasPrimary) return primaryValue;
        return hasFallback ? fallbackValue : null;
    }

    function buildUtilElectricScopedDatasetResult(activeMonthKey = '', reportTeamFilters = [], productionTeamNames = []) {
        const emptyResult = {
            latestRow: null,
            prevMonthRow: null,
            prevYearRow: null,
            latestUsage: null,
            latestCost: null,
            latestProduction: null,
            deltaUsageVsPrevMonth: null,
            deltaCostVsPrevMonth: null,
            deltaProductionVsPrevMonth: null,
            deltaUsageVsPrevYear: null,
            deltaCostVsPrevYear: null,
            deltaProductionVsPrevYear: null
        };
        const normalizedReportTeamFilters = Array.isArray(reportTeamFilters)
            ? Array.from(new Set(reportTeamFilters.map(filter => String(filter || '').trim()).filter(Boolean)))
            : [];
        const normalizedProductionTeamNames = Array.isArray(productionTeamNames)
            ? Array.from(new Set(productionTeamNames.map(teamName => String(teamName || '').trim()).filter(Boolean)))
            : [];
        if (!normalizedReportTeamFilters.length) {
            return emptyResult;
        }

        const snapshotTeamKeys = resolveUtilElectricSnapshotTeamKeys(normalizedReportTeamFilters);
        const requestedMonthKey = String(activeMonthKey || '').trim();
        const sourceRows = buildUtilElectricRowsFromSnapshot(snapshotTeamKeys, requestedMonthKey);
        const bounds = buildMonthBounds('electric');
        const fallbackTargetMonthKey = String(
            requestedMonthKey
            || bounds?.to
            || sourceRows[sourceRows.length - 1]?.monthKey
            || ''
        ).trim();
        const targetMonthKey = fallbackTargetMonthKey
            || requestedMonthKey;
        const fallbackRows = buildUtilElectricMeterRows(normalizedReportTeamFilters, targetMonthKey);
        const hasUsableSourceRows = sourceRows.some(row => (
            Number.isFinite(row?.electricUsage) || Number.isFinite(row?.electricCost)
        ));
        const baseRows = hasUsableSourceRows
            ? (() => {
                const fallbackRowMap = new Map(
                    fallbackRows.map(row => [String(row?.monthKey || '').trim(), row])
                );
                const mergedRows = sourceRows.map(row => {
                    const fallbackRow = fallbackRowMap.get(String(row?.monthKey || '').trim()) || null;
                    return {
                        ...row,
                        electricUsage: resolveUtilElectricMetricValue(row?.electricUsage, fallbackRow?.electricUsage),
                        electricCost: resolveUtilElectricMetricValue(row?.electricCost, fallbackRow?.electricCost)
                    };
                });
                const sourceMonthKeys = new Set(
                    sourceRows.map(row => String(row?.monthKey || '').trim()).filter(Boolean)
                );
                fallbackRows.forEach(row => {
                    const monthKey = String(row?.monthKey || '').trim();
                    if (!monthKey || sourceMonthKeys.has(monthKey)) return;
                    mergedRows.push(row);
                });
                return mergedRows.sort((left, right) => compareMonthKeys(left?.monthKey, right?.monthKey));
            })()
            : fallbackRows;
        if (!baseRows.length) {
            return emptyResult;
        }
        const rows = baseRows.map(row => {
            const production = getGasProductionMetric(row.monthKey, normalizedProductionTeamNames);
            return {
                ...row,
                production: Number.isFinite(production) ? production : null
            };
        });
        const latestRow = rows.find(row => row.monthKey === targetMonthKey) || rows[rows.length - 1] || null;
        const latestIndex = latestRow ? rows.findIndex(row => row.monthKey === latestRow.monthKey) : -1;
        const prevMonthRow = latestIndex > 0 ? rows[latestIndex - 1] : null;
        const prevYearRow = latestRow
            ? rows.find(row => row.year === latestRow.year - 1 && row.month === latestRow.month) || null
            : null;
        const latestUsage = Number.isFinite(latestRow?.electricUsage) ? latestRow.electricUsage : null;
        const latestCost = Number.isFinite(latestRow?.electricCost) ? latestRow.electricCost : null;
        const latestProduction = Number.isFinite(latestRow?.production) ? latestRow.production : null;
        const prevMonthUsage = Number.isFinite(prevMonthRow?.electricUsage) ? prevMonthRow.electricUsage : null;
        const prevMonthCost = Number.isFinite(prevMonthRow?.electricCost) ? prevMonthRow.electricCost : null;
        const prevMonthProduction = Number.isFinite(prevMonthRow?.production) ? prevMonthRow.production : null;
        const prevYearUsage = Number.isFinite(prevYearRow?.electricUsage) ? prevYearRow.electricUsage : null;
        const prevYearCost = Number.isFinite(prevYearRow?.electricCost) ? prevYearRow.electricCost : null;
        const prevYearProduction = Number.isFinite(prevYearRow?.production) ? prevYearRow.production : null;

        return {
            latestRow,
            prevMonthRow,
            prevYearRow,
            latestUsage,
            latestCost,
            latestProduction,
            deltaUsageVsPrevMonth: Number.isFinite(latestUsage) && Number.isFinite(prevMonthUsage) ? latestUsage - prevMonthUsage : null,
            deltaCostVsPrevMonth: Number.isFinite(latestCost) && Number.isFinite(prevMonthCost) ? latestCost - prevMonthCost : null,
            deltaProductionVsPrevMonth: Number.isFinite(latestProduction) && Number.isFinite(prevMonthProduction) ? latestProduction - prevMonthProduction : null,
            deltaUsageVsPrevYear: Number.isFinite(latestUsage) && Number.isFinite(prevYearUsage) ? latestUsage - prevYearUsage : null,
            deltaCostVsPrevYear: Number.isFinite(latestCost) && Number.isFinite(prevYearCost) ? latestCost - prevYearCost : null,
            deltaProductionVsPrevYear: Number.isFinite(latestProduction) && Number.isFinite(prevYearProduction) ? latestProduction - prevYearProduction : null
        };
    }

    function buildUtilElectricMeterTeamDatasetResult(activeMonthKey = '', teamKey = 'combined') {
        const option = getUtilElectricMeterTeamOption(teamKey);
        return {
            option,
            ...buildUtilElectricScopedDatasetResult(activeMonthKey, option.reportTeamFilters, option.productionTeamNames)
        };
    }

    function buildUtilElectricMeterComparisonModel(selectedMonthKey, compareKey = 'month', teamKey = 'combined') {
        if (!hasElectricMeteringStore()) {
            return {
                ready: false,
                loading: true,
                message: '전기 검침표 데이터를 불러오는 중입니다.'
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
        const option = getUtilElectricMeterTeamOption(teamKey);
        const referenceMonthKey = normalizedCompareKey === 'year'
            ? shiftMonthKey(normalizedSelectedMonthKey, -12)
            : shiftMonthKey(normalizedSelectedMonthKey, -1);
        const selectedTable = buildUtilElectricMeterMonthTable(normalizedSelectedMonthKey, option);
        const referenceTable = buildUtilElectricMeterMonthTable(referenceMonthKey, option, selectedTable.detailFieldIds);
        return {
            ready: true,
            loading: false,
            compareKey: normalizedCompareKey,
            option,
            referenceTable,
            selectedTable
        };
    }

    globalScope.KPIUtilReportSheetElectricMeterModel = Object.freeze({
        setRuntimeAdapters,
        buildUtilElectricMeterFieldDefinitions,
        getUtilElectricMeterStructure,
        buildUtilElectricMeterTimelineMap,
        buildUtilElectricMeterMonthTable,
        buildUtilElectricScopedDatasetResult,
        buildUtilElectricMeterTeamDatasetResult,
        buildUtilElectricMeterComparisonModel
    });
})(globalThis);
