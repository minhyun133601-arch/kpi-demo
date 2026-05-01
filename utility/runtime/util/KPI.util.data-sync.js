
        // ----------------------------------------------------------------
        // 유틸리티 데이터 - 전기
        // ----------------------------------------------------------------
        const createUtilTeamData = (teams) => teams.map(name => ({ name, years: [] }));

        function cloneUtilDatasetValue(value) {
            if (!Array.isArray(value)) return [];
            try {
                return JSON.parse(JSON.stringify(value));
            } catch (error) {
                return value.map(item => ({ ...item }));
            }
        }

        function readLegacyUtilPortalTeams(recordKey, fallbackTeamNames = []) {
            const portalData = isUtilPlainObject(window.PortalData) ? window.PortalData : {};
            const record = isUtilPlainObject(portalData[recordKey]) ? portalData[recordKey] : {};
            return Array.isArray(record.teams)
                ? cloneUtilDatasetValue(record.teams)
                : createUtilTeamData(fallbackTeamNames);
        }

        function writeLegacyUtilPortalTeams(recordKey, dataset) {
            const key = String(recordKey || '').trim();
            if (!key) return;
            window.PortalData = isUtilPlainObject(window.PortalData) ? window.PortalData : {};
            const previous = isUtilPlainObject(window.PortalData[key]) ? window.PortalData[key] : {};
            window.PortalData[key] = {
                ...previous,
                teams: cloneUtilDatasetValue(dataset)
            };
        }

        function hasUtilDatasetPayload(dataset) {
            return (Array.isArray(dataset) ? dataset : []).some(teamNode =>
                (Array.isArray(teamNode?.years) ? teamNode.years : []).some(yearNode =>
                    (Array.isArray(yearNode?.rows) ? yearNode.rows : []).some(row => hasUtilEntryPayload(row))
                )
            );
        }

        function isEmptyUtilMeteringSnapshot(snapshot) {
            if (!isUtilPlainObject(snapshot) || !isUtilPlainObject(snapshot.teams)) {
                return true;
            }
            return !Object.values(snapshot.teams).some(teamSnapshot =>
                isUtilPlainObject(teamSnapshot) && Object.keys(teamSnapshot).length > 0
            );
        }

        function hasHydratedIntegratedMeteringStore() {
            return isUtilPlainObject(window.__LOCAL_APP_STORE__);
        }

        const UTIL_ELECTRIC_METERING_TEAM_MAP = Object.freeze({
            'Line Alpha': 'team_01_01',
            'Line Beta': 'team_01_02',
            'Line Gamma': 'team_02',
            'Line Delta': 'team_03'
        });
        const UTIL_ELECTRIC_METERING_TEAM_NAME_BY_KEY = Object.freeze(
            Object.entries(UTIL_ELECTRIC_METERING_TEAM_MAP).reduce((acc, [teamName, teamKey]) => {
                acc[teamKey] = teamName;
                return acc;
            }, {})
        );
        const UTIL_ELECTRIC_METERING_TEAM_NAMES = Object.freeze(Object.keys(UTIL_ELECTRIC_METERING_TEAM_MAP));
        const UTIL_GAS_METERING_TEAM_NAMES = Object.freeze([
            'Line Alpha (LNG)',
            'Line Beta (LNG)',
            'Line Beta (LPG)',
            'Line Delta (LNG)'
        ]);
        const UTIL_WASTE_METERING_TEAM_NAMES = Object.freeze(['Plant A', 'Plant B']);
        const UTIL_ELECTRIC_DATA = createUtilTeamData(UTIL_ELECTRIC_METERING_TEAM_NAMES);
        const UTIL_GAS_DATA = createUtilTeamData(UTIL_GAS_METERING_TEAM_NAMES);
        const UTIL_WASTE_DATA = readLegacyUtilPortalTeams('util_wastewater_data', UTIL_WASTE_METERING_TEAM_NAMES);
        const UTIL_ELECTRIC_ENTRIES = [];
        const UTIL_GAS_ENTRIES = [];
        const UTIL_WASTE_ENTRIES = [];
        const UTIL_PRODUCTION_ENTRIES = [];
        const UtilElectricMeteringSyncState = {
            bootstrapped: false,
            timerId: 0,
            syncPromise: null,
            pending: false,
            forceNext: false,
            lastSignature: ''
        };
        const UtilGasMeteringSyncState = {
            bootstrapped: false,
            timerId: 0,
            syncPromise: null,
            pending: false,
            forceNext: false,
            lastSignature: ''
        };
        const UtilWasteMeteringSyncState = {
            bootstrapped: false,
            timerId: 0,
            syncPromise: null,
            pending: false,
            forceNext: false,
            lastSignature: ''
        };

        function createDefaultUtilYearRows() {
            const rows = Array.from({ length: 12 }, (_, index) => ({
                label: `${index + 1}월`,
                usage: null,
                production: null,
                cost: null
            }));
            rows.push(
                { label: '평균', usage: null, production: null, cost: null },
                { label: '계', usage: null, production: null, cost: null }
            );
            return rows;
        }

        function ensureUtilDatasetTeamNode(dataset, teamName) {
            if (!Array.isArray(dataset)) return null;
            const normalizedTeamName = String(teamName || '').trim();
            if (!normalizedTeamName) return null;
            let teamNode = dataset.find(item => String(item?.name || '').trim() === normalizedTeamName) || null;
            if (teamNode) return teamNode;
            teamNode = { name: normalizedTeamName, years: [] };
            dataset.push(teamNode);
            return teamNode;
        }

        function ensureUtilDatasetYearNode(dataset, teamName, yearValue) {
            const teamNode = ensureUtilDatasetTeamNode(dataset, teamName);
            if (!teamNode) return null;
            if (!Array.isArray(teamNode.years)) teamNode.years = [];
            let yearNode = teamNode.years.find(item => Number(item?.label) === Number(yearValue)) || null;
            if (!yearNode) {
                yearNode = { label: String(yearValue), rows: createDefaultUtilYearRows() };
                teamNode.years.push(yearNode);
                teamNode.years.sort((a, b) => Number(a?.label) - Number(b?.label));
            }
            if (!Array.isArray(yearNode.rows)) yearNode.rows = createDefaultUtilYearRows();
            return yearNode;
        }

        function ensureUtilMonthRow(rows, monthNumber) {
            const label = `${monthNumber}월`;
            let row = (rows || []).find(item => item?.label === label) || null;
            if (row) return row;
            row = { label, usage: null, production: null, cost: null };
            rows.splice(Math.max(0, Math.min(12, monthNumber - 1)), 0, row);
            return row;
        }

        function ensureUtilSummaryRow(rows, label) {
            let row = (rows || []).find(item => item?.label === label) || null;
            if (row) return row;
            row = { label, usage: null, production: null, cost: null };
            rows.push(row);
            return row;
        }

        function normalizeUtilMetricValue(value) {
            if (value === null || value === undefined || value === '') return null;
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric < 0) return null;
            return numeric;
        }

        function setUtilMetricValue(row, key, value) {
            if (!row) return false;
            const nextValue = normalizeUtilMetricValue(value);
            const currentValue = normalizeUtilMetricValue(row[key]);
            if (currentValue === nextValue) return false;
            row[key] = nextValue;
            return true;
        }

        function recalculateUtilYearSummaryRows(rows) {
            if (!Array.isArray(rows)) return false;
            let changed = false;
            const monthRows = Array.from({ length: 12 }, (_, index) => ensureUtilMonthRow(rows, index + 1));
            const averageRow = ensureUtilSummaryRow(rows, '평균');
            const totalRow = ensureUtilSummaryRow(rows, '계');

            ['usage', 'production', 'cost'].forEach((key) => {
                const numericValues = monthRows
                    .map(row => normalizeUtilMetricValue(row?.[key]))
                    .filter(value => Number.isFinite(value));
                const totalValue = numericValues.length
                    ? Math.round(numericValues.reduce((sum, value) => sum + value, 0))
                    : null;
                const averageValue = numericValues.length
                    ? Math.round(totalValue / numericValues.length)
                    : null;
                changed = setUtilMetricValue(averageRow, key, averageValue) || changed;
                changed = setUtilMetricValue(totalRow, key, totalValue) || changed;
            });

            return changed;
        }

        function buildUtilDatasetFromSnapshot(snapshot, defaultTeamNames, options = {}) {
            const teamNames = Array.isArray(defaultTeamNames) ? defaultTeamNames : [];
            const dataset = createUtilTeamData(teamNames);
            if (!snapshot || typeof snapshot !== 'object' || !snapshot.teams || typeof snapshot.teams !== 'object') {
                return dataset;
            }

            const resolveTeamName = typeof options.resolveTeamName === 'function'
                ? options.resolveTeamName
                : ((teamKey) => teamKey);
            const hasAdditionalMonthData = typeof options.hasAdditionalMonthData === 'function'
                ? options.hasAdditionalMonthData
                : (() => false);
            const applyAdditionalMonthData = typeof options.applyAdditionalMonthData === 'function'
                ? options.applyAdditionalMonthData
                : null;

            Object.entries(snapshot.teams).forEach(([teamKey, teamSnapshot]) => {
                if (!teamSnapshot || typeof teamSnapshot !== 'object') return;
                const teamName = String(resolveTeamName(teamKey, teamSnapshot) || '').trim();
                if (!teamName) return;

                Object.entries(teamSnapshot).forEach(([monthValue, monthData]) => {
                    const match = /^(\d{4})-(\d{2})$/.exec(String(monthValue || '').trim());
                    if (!match || !monthData || typeof monthData !== 'object') return;

                    const usageValue = normalizeUtilMetricValue(monthData?.usage);
                    const costValue = normalizeUtilMetricValue(monthData?.cost);
                    if (usageValue === null && costValue === null && !hasAdditionalMonthData(monthData, teamName)) {
                        return;
                    }

                    const yearValue = Number(match[1]);
                    const monthNumber = Number(match[2]);
                    if (!Number.isFinite(yearValue) || !Number.isFinite(monthNumber)) return;

                    const yearNode = ensureUtilDatasetYearNode(dataset, teamName, yearValue);
                    if (!yearNode) return;
                    const monthRow = ensureUtilMonthRow(yearNode.rows, monthNumber);
                    setUtilMetricValue(monthRow, 'usage', usageValue);
                    setUtilMetricValue(monthRow, 'cost', costValue);
                    if (applyAdditionalMonthData) {
                        applyAdditionalMonthData(monthRow, monthData, teamName);
                    }
                });
            });

            dataset.forEach((teamNode) => {
                if (!Array.isArray(teamNode?.years)) {
                    teamNode.years = [];
                    return;
                }
                teamNode.years.sort((a, b) => Number(a?.label) - Number(b?.label));
                teamNode.years.forEach((yearNode) => {
                    if (!Array.isArray(yearNode?.rows)) {
                        yearNode.rows = createDefaultUtilYearRows();
                    }
                    recalculateUtilYearSummaryRows(yearNode.rows);
                });
            });

            return dataset;
        }

        function replaceUtilDataset(target, nextDataset) {
            if (!Array.isArray(target)) return false;
            const nextValue = Array.isArray(nextDataset) ? nextDataset : [];
            const previousSignature = JSON.stringify(target);
            const nextSignature = JSON.stringify(nextValue);
            if (previousSignature === nextSignature) return false;
            target.splice(0, target.length, ...nextValue);
            return true;
        }

        function refreshUtilAuthorityDerivedViews() {
            const scope = document;
            try {
                const renderer = typeof window.renderUtilDualTabs === 'function'
                    ? window.renderUtilDualTabs
                    : (typeof renderUtilDualTabs === 'function' ? renderUtilDualTabs : null);
                if (renderer) {
                    renderer(scope);
                }
            } catch (error) {
                console.error('Failed to refresh utility tabs after authority sync.', error);
            }
            try {
                if (typeof refreshUtilViewsAfterDataMutation === 'function') {
                    refreshUtilViewsAfterDataMutation(scope);
                }
            } catch (error) {
                console.error('Failed to refresh utility analytics after authority sync.', error);
            }
        }

        function applyUtilElectricMeteringSnapshot(snapshot) {
            const nextDataset = buildUtilDatasetFromSnapshot(snapshot, UTIL_ELECTRIC_METERING_TEAM_NAMES, {
                resolveTeamName: (teamKey) => UTIL_ELECTRIC_METERING_TEAM_NAME_BY_KEY[String(teamKey || '').trim()] || teamKey
            });
            return replaceUtilDataset(UTIL_ELECTRIC_DATA, nextDataset);
        }

        async function syncUtilElectricDataFromMetering(options = {}) {
            const { force = false } = options;
            try {
                const runtime = await window.KpiMeteringBridge?.ensureIntegratedMeteringRuntime?.();
                const snapshot = runtime && typeof runtime.getElectricUtilityDatasetSnapshot === 'function'
                    ? runtime.getElectricUtilityDatasetSnapshot()
                    : null;
                if (!snapshot) return false;

                const signature = JSON.stringify(snapshot);
                if (!force && signature === UtilElectricMeteringSyncState.lastSignature) {
                    return false;
                }

                const changed = applyUtilElectricMeteringSnapshot(snapshot);
                UtilElectricMeteringSyncState.lastSignature = signature;

                if (changed) {
                    rebuildUtilEntryCollections();
                    refreshUtilAuthorityDerivedViews();
                }

                return changed;
            } catch (error) {
                console.error('Failed to sync electric utility data from metering runtime.', error);
                return false;
            }
        }

        function queueUtilElectricDataSync(options = {}) {
            const { delay = 120, force = false } = options;
            UtilElectricMeteringSyncState.forceNext = UtilElectricMeteringSyncState.forceNext || force;
            if (UtilElectricMeteringSyncState.timerId) {
                window.clearTimeout(UtilElectricMeteringSyncState.timerId);
            }

            UtilElectricMeteringSyncState.timerId = window.setTimeout(async () => {
                UtilElectricMeteringSyncState.timerId = 0;
                if (UtilElectricMeteringSyncState.syncPromise) {
                    UtilElectricMeteringSyncState.pending = true;
                    return;
                }

                const nextForce = UtilElectricMeteringSyncState.forceNext;
                UtilElectricMeteringSyncState.forceNext = false;
                UtilElectricMeteringSyncState.syncPromise = syncUtilElectricDataFromMetering({ force: nextForce });

                try {
                    await UtilElectricMeteringSyncState.syncPromise;
                } finally {
                    UtilElectricMeteringSyncState.syncPromise = null;
                    if (UtilElectricMeteringSyncState.pending) {
                        UtilElectricMeteringSyncState.pending = false;
                        queueUtilElectricDataSync();
                    }
                }
            }, Math.max(0, Number(delay) || 0));
        }

        function bootUtilElectricMeteringSync() {
            if (UtilElectricMeteringSyncState.bootstrapped) return;
            UtilElectricMeteringSyncState.bootstrapped = true;
            window.addEventListener('kpi:metering-store-updated', () => {
                queueUtilElectricDataSync({ force: true, delay: 0 });
            });
            queueUtilElectricDataSync({ force: true, delay: 0 });
        }

        const DEFAULT_UTIL_PRODUCTION_PERIOD = { startDay: 1 };
        const UTIL_PRODUCTION_ARCHIVE_DB_NAME = 'kpi-util-production';
        const UTIL_PRODUCTION_ARCHIVE_STORE = 'production_files';
        const UTIL_PRODUCTION_ARCHIVE_MAX_COUNT = 200;
        let utilProductionArchiveDbPromise = null;
        let utilProductionResetPending = false;
        const utilProductionServerPersistenceState = {
            writeChain: Promise.resolve(),
            lastErrorMessage: ''
        };

        function isUtilPlainObject(value) {
            return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
        }

        function getKpiServerRuntimeConfig() {
            return isUtilPlainObject(window.__KPI_SERVER_RUNTIME_CONFIG__)
                ? window.__KPI_SERVER_RUNTIME_CONFIG__
                : {};
        }

        function getUtilProductionServerRuntimeConfig() {
            const runtimeConfig = getKpiServerRuntimeConfig();
            const utilProduction = isUtilPlainObject(runtimeConfig.utilProduction)
                ? runtimeConfig.utilProduction
                : {};
            const apiBaseRaw = String(utilProduction.apiBase || runtimeConfig.apiBase || '/api').trim();
            const apiBase = apiBaseRaw.startsWith('/') ? apiBaseRaw : `/${apiBaseRaw.replace(/^\/+/, '')}`;
            const endpointRaw = String(utilProduction.endpoint || '').trim();
            const endpoint = /^https?:\/\//i.test(endpointRaw)
                ? endpointRaw
                : (endpointRaw
                    ? (endpointRaw.startsWith('/') ? endpointRaw : `/${endpointRaw.replace(/^\/+/, '')}`)
                    : '');
            return {
                enabled: Boolean(utilProduction.enabled),
                apiBase,
                endpoint,
                moduleKey: String(utilProduction.moduleKey || 'util_production').trim() || 'util_production',
                recordKey: String(utilProduction.recordKey || 'daily_state_v1').trim() || 'daily_state_v1',
                permissionKey: String(utilProduction.permissionKey || 'util.production.daily').trim() || 'util.production.daily',
                readEnabled: Boolean(utilProduction.readEnabled),
                writeEnabled: Boolean(utilProduction.writeEnabled),
                archive: { enabled: false, apiBase, permissionKey: '', readEnabled: false, writeEnabled: false }
            };
        }

        function isUtilProductionServerMode() {
            const config = getUtilProductionServerRuntimeConfig();
            return Boolean(config.enabled) && /^(http:|https:)$/.test(window.location.protocol);
        }

        function supportsUtilProductionServerPersistence() {
            const config = getUtilProductionServerRuntimeConfig();
            return isUtilProductionServerMode() && Boolean(config.writeEnabled);
        }

        function getUtilProductionArchiveServerRuntimeConfig() {
            const config = getUtilProductionServerRuntimeConfig();
            return {
                enabled: false,
                apiBase: String(config.apiBase || '/api').trim() || '/api',
                permissionKey: '',
                readEnabled: false,
                writeEnabled: false
            };
        }

        function supportsUtilProductionArchiveServerPersistence() {
            return false;
        }

        function buildUtilProductionServerRecordEndpoint() {
            const config = getUtilProductionServerRuntimeConfig();
            if (config.endpoint) {
                return config.endpoint;
            }
            return `${config.apiBase.replace(/\/+$/, '')}/modules/${encodeURIComponent(config.moduleKey)}/records/${encodeURIComponent(config.recordKey)}`;
        }

        function cloneUtilProductionStateForServer(value) {
            try {
                return JSON.parse(JSON.stringify(value ?? {}));
            } catch (error) {
                return value ?? {};
            }
        }

        async function writeUtilProductionDailyStateToServer(stateSnapshot) {
            if (!supportsUtilProductionServerPersistence()) return false;
            const config = getUtilProductionServerRuntimeConfig();
            const snapshot = cloneUtilProductionStateForServer(stateSnapshot);
            const response = await window.fetch(buildUtilProductionServerRecordEndpoint(), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                cache: 'no-store',
                credentials: 'same-origin',
                body: JSON.stringify({
                    permissionKey: config.permissionKey,
                    payload: snapshot,
                    state: snapshot
                })
            });

            if (!response.ok) {
                throw new Error(`util_production_daily_write_failed:${response.status}`);
            }

            utilProductionServerPersistenceState.lastErrorMessage = '';
            if (window.KpiUtilityServerRuntime) {
                window.KpiUtilityServerRuntime.lastErrorMessage = '';
            }
            return true;
        }

        function queueUtilProductionDailyServerWrite(stateSnapshot) {
            if (!supportsUtilProductionServerPersistence()) {
                return Promise.resolve(false);
            }

            const snapshot = cloneUtilProductionStateForServer(stateSnapshot);
            utilProductionServerPersistenceState.writeChain = utilProductionServerPersistenceState.writeChain
                .then(() => writeUtilProductionDailyStateToServer(snapshot))
                .catch((error) => {
                    utilProductionServerPersistenceState.lastErrorMessage = '유틸 생산 일계 데이터를 중앙 서버에 저장하지 못했습니다.';
                    if (window.KpiUtilityServerRuntime) {
                        window.KpiUtilityServerRuntime.lastErrorMessage = utilProductionServerPersistenceState.lastErrorMessage;
                    }
                    console.error(utilProductionServerPersistenceState.lastErrorMessage, error);
                    return false;
                });
            return utilProductionServerPersistenceState.writeChain;
        }

        function applyUtilProductionDailyState(normalized) {
            if (!normalized || typeof normalized !== 'object') return;
            UTIL_PRODUCTION_DAILY_STATE.meta = normalized.meta;
            UTIL_PRODUCTION_DAILY_STATE.periodDefault = normalized.periodDefault;
            UTIL_PRODUCTION_DAILY_STATE.teams.length = 0;
            UTIL_PRODUCTION_DAILY_STATE.archives.length = 0;
            if (Array.isArray(normalized.teams)) {
                UTIL_PRODUCTION_DAILY_STATE.teams.push(...normalized.teams);
            }
            normalized.archives = [];
            window.PortalData = window.PortalData || {};
            window.PortalData.util_production_daily = normalized;
        }

        window.KpiUtilityServerRuntime = Object.assign(window.KpiUtilityServerRuntime || {}, {
            getUtilProductionServerRuntimeConfig,
            getUtilProductionArchiveServerRuntimeConfig,
            isUtilProductionServerMode,
            supportsUtilProductionServerPersistence,
            supportsUtilProductionArchiveServerPersistence,
            queueUtilProductionDailyServerWrite,
            get lastErrorMessage() {
                return utilProductionServerPersistenceState.lastErrorMessage;
            }
        });

        function normalizeUtilProductionStartDay(value, fallback = DEFAULT_UTIL_PRODUCTION_PERIOD.startDay) {
            const num = Number(value);
            if (!Number.isFinite(num)) return fallback;
            return Math.max(1, Math.min(31, Math.floor(num)));
        }

        function applyUtilGasMeteringSnapshot(snapshot) {
            const nextDataset = buildUtilDatasetFromSnapshot(snapshot, UTIL_GAS_METERING_TEAM_NAMES, {
                resolveTeamName: (teamName) => teamName
            });
            return replaceUtilDataset(UTIL_GAS_DATA, nextDataset);
        }

        async function syncUtilGasDataFromMetering(options = {}) {
            const { force = false } = options;
            try {
                const runtime = await window.KpiMeteringBridge?.ensureIntegratedMeteringRuntime?.();
                const snapshot = runtime && typeof runtime.getGasUtilityDatasetSnapshot === 'function'
                    ? runtime.getGasUtilityDatasetSnapshot()
                    : null;
                if (!snapshot) return false;

                const signature = JSON.stringify(snapshot);
                if (!force && signature === UtilGasMeteringSyncState.lastSignature) {
                    return false;
                }

                const changed = applyUtilGasMeteringSnapshot(snapshot);
                UtilGasMeteringSyncState.lastSignature = signature;

                if (changed) {
                    rebuildUtilEntryCollections();
                    refreshUtilAuthorityDerivedViews();
                }

                return changed;
            } catch (error) {
                console.error('Failed to sync gas utility data from metering runtime.', error);
                return false;
            }
        }

        function queueUtilGasDataSync(options = {}) {
            const { delay = 120, force = false } = options;
            UtilGasMeteringSyncState.forceNext = UtilGasMeteringSyncState.forceNext || force;
            if (UtilGasMeteringSyncState.timerId) {
                window.clearTimeout(UtilGasMeteringSyncState.timerId);
            }

            UtilGasMeteringSyncState.timerId = window.setTimeout(async () => {
                UtilGasMeteringSyncState.timerId = 0;
                if (UtilGasMeteringSyncState.syncPromise) {
                    UtilGasMeteringSyncState.pending = true;
                    return;
                }

                const nextForce = UtilGasMeteringSyncState.forceNext;
                UtilGasMeteringSyncState.forceNext = false;
                UtilGasMeteringSyncState.syncPromise = syncUtilGasDataFromMetering({ force: nextForce });

                try {
                    await UtilGasMeteringSyncState.syncPromise;
                } finally {
                    UtilGasMeteringSyncState.syncPromise = null;
                    if (UtilGasMeteringSyncState.pending) {
                        UtilGasMeteringSyncState.pending = false;
                        queueUtilGasDataSync();
                    }
                }
            }, Math.max(0, Number(delay) || 0));
        }

        function bootUtilGasMeteringSync() {
            if (UtilGasMeteringSyncState.bootstrapped) return;
            UtilGasMeteringSyncState.bootstrapped = true;
            window.addEventListener('kpi:metering-store-updated', () => {
                queueUtilGasDataSync({ force: true, delay: 0 });
            });
            queueUtilGasDataSync({ force: true, delay: 0 });
        }

        function setUtilWasteCostDetails(row, costs) {
            if (!row || !costs || typeof costs !== 'object') return false;
            let changed = false;
            const currentCosts = row.costs && typeof row.costs === 'object' ? row.costs : {};
            const nextKeys = new Set([...Object.keys(currentCosts), ...Object.keys(costs)]);
            if (!row.costs || typeof row.costs !== 'object') {
                row.costs = {};
                changed = true;
            }

            let componentTotal = 0;
            let hasComponentValue = false;
            nextKeys.forEach((key) => {
                if (key === 'total') return;
                const nextValue = normalizeUtilMetricValue(costs[key]);
                const currentValue = normalizeUtilMetricValue(row.costs[key]);
                if (currentValue !== nextValue) {
                    row.costs[key] = nextValue;
                    changed = true;
                }
                if (nextValue !== null) {
                    componentTotal += nextValue;
                    hasComponentValue = true;
                }
            });

            const explicitTotal = normalizeUtilMetricValue(costs.total);
            const resolvedTotal = explicitTotal !== null
                ? explicitTotal
                : hasComponentValue
                    ? Math.round(componentTotal)
                    : null;
            const currentTotal = normalizeUtilMetricValue(row.costs.total);
            if (currentTotal !== resolvedTotal) {
                row.costs.total = resolvedTotal;
                changed = true;
            }
            if (normalizeUtilMetricValue(row.cost) !== resolvedTotal) {
                row.cost = resolvedTotal;
                changed = true;
            }
            return changed;
        }

        function applyUtilWasteMeteringSnapshot(snapshot) {
            if (
                isEmptyUtilMeteringSnapshot(snapshot)
                && !hasHydratedIntegratedMeteringStore()
                && hasUtilDatasetPayload(UTIL_WASTE_DATA)
            ) {
                writeLegacyUtilPortalTeams('util_wastewater_data', UTIL_WASTE_DATA);
                return false;
            }

            const nextDataset = buildUtilDatasetFromSnapshot(snapshot, UTIL_WASTE_METERING_TEAM_NAMES, {
                resolveTeamName: (teamName) => teamName,
                hasAdditionalMonthData: (monthData) => Boolean(monthData?.costs && typeof monthData.costs === 'object'),
                applyAdditionalMonthData: (monthRow, monthData) => {
                    if (monthData?.costs && typeof monthData.costs === 'object') {
                        setUtilWasteCostDetails(monthRow, monthData.costs);
                    }
                }
            });
            const changed = replaceUtilDataset(UTIL_WASTE_DATA, nextDataset);
            writeLegacyUtilPortalTeams('util_wastewater_data', UTIL_WASTE_DATA);
            return changed;
        }

        async function syncUtilWasteDataFromMetering(options = {}) {
            const { force = false } = options;
            try {
                const runtime = await window.KpiMeteringBridge?.ensureIntegratedMeteringRuntime?.();
                const snapshot = runtime && typeof runtime.getWasteUtilityDatasetSnapshot === 'function'
                    ? runtime.getWasteUtilityDatasetSnapshot()
                    : null;
                if (!snapshot) return false;

                const signature = JSON.stringify(snapshot);
                if (!force && signature === UtilWasteMeteringSyncState.lastSignature) {
                    return false;
                }

                const changed = applyUtilWasteMeteringSnapshot(snapshot);
                UtilWasteMeteringSyncState.lastSignature = signature;

                if (changed) {
                    rebuildUtilEntryCollections();
                    refreshUtilAuthorityDerivedViews();
                }

                return changed;
            } catch (error) {
                console.error('Failed to sync wastewater utility data from metering runtime.', error);
                return false;
            }
        }

        function queueUtilWasteDataSync(options = {}) {
            const { delay = 120, force = false } = options;
            UtilWasteMeteringSyncState.forceNext = UtilWasteMeteringSyncState.forceNext || force;
            if (UtilWasteMeteringSyncState.timerId) {
                window.clearTimeout(UtilWasteMeteringSyncState.timerId);
            }

            UtilWasteMeteringSyncState.timerId = window.setTimeout(async () => {
                UtilWasteMeteringSyncState.timerId = 0;
                if (UtilWasteMeteringSyncState.syncPromise) {
                    UtilWasteMeteringSyncState.pending = true;
                    return;
                }

                const nextForce = UtilWasteMeteringSyncState.forceNext;
                UtilWasteMeteringSyncState.forceNext = false;
                UtilWasteMeteringSyncState.syncPromise = syncUtilWasteDataFromMetering({ force: nextForce });

                try {
                    await UtilWasteMeteringSyncState.syncPromise;
                } finally {
                    UtilWasteMeteringSyncState.syncPromise = null;
                    if (UtilWasteMeteringSyncState.pending) {
                        UtilWasteMeteringSyncState.pending = false;
                        queueUtilWasteDataSync();
                    }
                }
            }, Math.max(0, Number(delay) || 0));
        }

        function bootUtilWasteMeteringSync() {
            if (UtilWasteMeteringSyncState.bootstrapped) return;
            UtilWasteMeteringSyncState.bootstrapped = true;
            window.addEventListener('kpi:metering-store-updated', () => {
                queueUtilWasteDataSync({ force: true, delay: 0 });
            });
            queueUtilWasteDataSync({ force: true, delay: 0 });
        }

        function cloneUtilProductionTeamEntry(entry, fallbackTeam = '') {
            if (!entry || typeof entry !== 'object') return null;
            const date = String(entry.date || '').trim();
            const team = String(entry.team || fallbackTeam || '').trim();
            if (!date || !team) return null;
            const normalized = {
                date,
                amount: entry.amount ?? entry.production ?? entry.value ?? null,
                lineName: String(entry.lineName ?? entry.line ?? entry.lineNm ?? '').trim(),
                productName: String(entry.productName ?? entry.itemName ?? entry.product ?? '').trim(),
                moistureExcludedYield: entry.moistureExcludedYield ?? entry.moistureFreeYield ?? entry.yieldExcludingMoisture ?? entry.yieldRate ?? null,
                equipmentCapa: entry.equipmentCapa ?? entry.capa ?? entry.equipmentCapacity ?? null,
                equipmentUtilization: entry.equipmentUtilization ?? entry.operationRate ?? entry.equipmentRate ?? entry.utilizationRate ?? null,
                team,
                sourceArchiveId: String(entry.sourceArchiveId || '').trim(),
                sourceFingerprint: String(entry.sourceFingerprint || '').trim(),
                sourceFileName: String(entry.sourceFileName || entry.fileName || '').trim()
            };
            return normalized;
        }

        function cloneUtilProductionTeamRecord(team) {
            if (!team || typeof team !== 'object') return null;
            const name = String(team.name || '').trim();
            if (!name) return null;
            const entries = Array.isArray(team.entries)
                ? team.entries
                    .map(entry => cloneUtilProductionTeamEntry(entry, name))
                    .filter(Boolean)
                : [];
            return { name, entries };
        }

        function buildUtilProductionArchiveFingerprint(fileName, size, lastModified) {
            const safeName = String(fileName || '').trim().toLowerCase();
            const safeSize = Number.isFinite(Number(size)) ? Number(size) : 0;
            const safeLastModified = Number.isFinite(Number(lastModified)) ? Number(lastModified) : 0;
            if (!safeName) return '';
            return `${safeName}|${safeSize}|${safeLastModified}`;
        }

        function normalizeUtilProductionArchiveYears(years) {
            const set = new Set();
            (Array.isArray(years) ? years : []).forEach(value => {
                const year = Number(value);
                if (!Number.isFinite(year) || year < 1900 || year > 2999) return;
                set.add(Math.floor(year));
            });
            return Array.from(set).sort((a, b) => b - a);
        }

        function normalizeUtilProductionArchiveYearMonths(values) {
            const set = new Set();
            (Array.isArray(values) ? values : []).forEach(value => {
                const text = String(value || '').trim();
                const match = /^(\d{4})-(\d{2})$/.exec(text);
                if (!match) return;
                const year = Number(match[1]);
                const month = Number(match[2]);
                if (!Number.isFinite(year) || year < 1900 || year > 2999) return;
                if (!Number.isFinite(month) || month < 1 || month > 12) return;
                set.add(`${year}-${String(month).padStart(2, '0')}`);
            });
            return Array.from(set).sort((a, b) => b.localeCompare(a, 'ko'));
        }

        function buildUtilProductionArchiveYearMonthFromSavedAt(savedAt) {
            const savedTime = new Date(savedAt || '').getTime();
            if (!Number.isFinite(savedTime)) return '';
            const savedDate = new Date(savedTime);
            return `${savedDate.getFullYear()}-${String(savedDate.getMonth() + 1).padStart(2, '0')}`;
        }

        function deriveUtilProductionArchiveYearMonths(item, years) {
            const explicit = normalizeUtilProductionArchiveYearMonths(item?.yearMonths);
            if (explicit.length) return explicit;

            const monthSet = new Set();
            (Array.isArray(item?.months) ? item.months : []).forEach(value => {
                const month = Number(value);
                if (!Number.isFinite(month) || month < 1 || month > 12) return;
                monthSet.add(String(Math.floor(month)).padStart(2, '0'));
            });
            if (Array.isArray(years) && years.length && monthSet.size) {
                const candidates = [];
                years.forEach(year => {
                    const safeYear = Number(year);
                    if (!Number.isFinite(safeYear)) return;
                    monthSet.forEach(month => {
                        candidates.push(`${safeYear}-${month}`);
                    });
                });
                const normalized = normalizeUtilProductionArchiveYearMonths(candidates);
                if (normalized.length) return normalized;
            }

            const savedYearMonth = buildUtilProductionArchiveYearMonthFromSavedAt(item?.savedAt);
            if (savedYearMonth) return [savedYearMonth];
            return [];
        }

        function normalizeUtilProductionArchiveTeams(teams) {
            const set = new Set();
            (Array.isArray(teams) ? teams : []).forEach(value => {
                const team = String(value || '').trim();
                if (!team) return;
                set.add(team);
            });
            return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
        }

        const UTIL_PRODUCTION_ARCHIVE_SOURCE_LABEL_DEFAULT = '원본 보관 안 함';

        function normalizeUtilProductionArchiveSourceLabel(value) {
            const label = String(value || '').trim();
            if (!label || label === '생산량') return UTIL_PRODUCTION_ARCHIVE_SOURCE_LABEL_DEFAULT;
            return label;
        }

        function normalizeUtilProductionArchiveMeta(item) {
            if (!item || typeof item !== 'object') return null;
            const fileName = String(item.fileName || item.name || '').trim();
            if (!fileName) return null;
            const size = Number.isFinite(Number(item.size)) ? Number(item.size) : 0;
            const lastModified = Number.isFinite(Number(item.lastModified)) ? Number(item.lastModified) : 0;
            const fingerprint = String(item.fingerprint || '').trim() || buildUtilProductionArchiveFingerprint(fileName, size, lastModified);
            const documentId = String(item.documentId || item.fileId || '').trim();
            const storage = String(item.storage || (documentId || item.previewUrl || item.downloadUrl ? 'server' : 'local')).trim() === 'server'
                ? 'server'
                : 'local';
            const id = String(item.id || documentId || '').trim() || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
            const years = normalizeUtilProductionArchiveYears(item.years);
            const yearMonths = deriveUtilProductionArchiveYearMonths(item, years);
            return {
                id,
                fileName,
                size,
                type: String(item.type || 'application/octet-stream'),
                lastModified,
                savedAt: String(item.savedAt || new Date().toISOString()),
                folder: normalizeUtilProductionArchiveSourceLabel(item.folder),
                fingerprint,
                documentId: documentId || (storage === 'server' ? id : ''),
                storage,
                previewUrl: String(item.previewUrl || '').trim(),
                downloadUrl: String(item.downloadUrl || '').trim(),
                years,
                yearMonths,
                teams: normalizeUtilProductionArchiveTeams(item.teams)
            };
        }

        function normalizeUtilProductionDailyState(raw) {
            const source = (raw && typeof raw === 'object') ? raw : {};
            const meta = (source.meta && typeof source.meta === 'object') ? source.meta : {};
            const teams = Array.isArray(source.teams)
                ? source.teams
                    .map(team => cloneUtilProductionTeamRecord(team))
                    .filter(Boolean)
                : [];
            const periodDefault = (source.periodDefault && typeof source.periodDefault === 'object') ? source.periodDefault : {};
            return {
                meta: {
                    moduleKey: String(meta.moduleKey || 'util_production').trim() || 'util_production',
                    recordKey: String(meta.recordKey || 'daily_state_v1').trim() || 'daily_state_v1',
                    permissionKey: String(meta.permissionKey || 'util.production.daily').trim() || 'util.production.daily',
                    moduleName: '유틸리티 - 생산량 일별',
                    version: Number.isFinite(Number(meta.version)) ? Number(meta.version) : 3,
                    updatedAt: String(meta.updatedAt || new Date().toISOString())
                },
                periodDefault: {
                    startDay: normalizeUtilProductionStartDay(periodDefault.startDay, DEFAULT_UTIL_PRODUCTION_PERIOD.startDay)
                },
                teams,
                archives: []
            };
        }

        function loadUtilProductionDailyState() {
            const serverConfig = getUtilProductionServerRuntimeConfig();
            const portalRaw = (window.PortalData && window.PortalData.util_production_daily)
                ? window.PortalData.util_production_daily
                : {};
            const serverMode = isUtilProductionServerMode();
            const serverReadBlocked = serverMode && serverConfig.readEnabled !== true;
            const hasPortalState = isUtilPlainObject(portalRaw) && Object.keys(portalRaw).length > 0;
            const source = serverReadBlocked ? {} : (hasPortalState ? portalRaw : {});
            const normalized = normalizeUtilProductionDailyState(source);
            utilProductionResetPending = false;
            window.PortalData = window.PortalData || {};
            window.PortalData.util_production_daily = normalized;
            return normalized;
        }
        const UTIL_PRODUCTION_DAILY_STATE = loadUtilProductionDailyState();
        const UTIL_PRODUCTION_DAILY_DATA = UTIL_PRODUCTION_DAILY_STATE.teams;
        const UTIL_PRODUCTION_ARCHIVE_META = UTIL_PRODUCTION_DAILY_STATE.archives;

        function parseUtilMonthLabel(label) {
            const match = String(label || '').match(/(\d+)/);
            if (!match) return null;
            const month = Number(match[1]);
            return Number.isFinite(month) ? month : null;
        }

        function parseUtilYearLabel(label) {
            const match = String(label || '').match(/(\d{4})/);
            if (match) {
                const year = Number(match[1]);
                return Number.isFinite(year) ? year : null;
            }
            const year = Number(String(label || '').replace(/[^\d.-]/g, ''));
            return Number.isFinite(year) ? year : null;
        }

        function getUtilTodayYearMonth() {
            const now = new Date();
            return { year: now.getFullYear(), month: now.getMonth() + 1 };
        }

        function isUtilYearMonthWithinToday(year, month) {
            if (!Number.isFinite(year) || !Number.isFinite(month)) return false;
            const today = getUtilTodayYearMonth();
            if (year < today.year) return true;
            if (year > today.year) return false;
            return month <= today.month;
        }

        function hasUtilValueInput(value, requireNonZero = false) {
            if (value === null || value === undefined) return false;
            if (typeof value === 'number') {
                if (!Number.isFinite(value)) return false;
                return requireNonZero ? value !== 0 : true;
            }
            const text = String(value).replace(/,/g, '').trim();
            if (!text) return false;
            const num = Number(text);
            if (!Number.isFinite(num)) return false;
            return requireNonZero ? num !== 0 : true;
        }

        function hasUtilEntryPayload(entry, requireNonZero = false) {
            if (!entry || typeof entry !== 'object') return false;
            if (hasUtilValueInput(entry.usage, requireNonZero)) return true;
            if (hasUtilValueInput(entry.cost, requireNonZero)) return true;
            if (hasUtilValueInput(entry.production, requireNonZero)) return true;
            const costs = entry.costs;
            if (costs && typeof costs === 'object') {
                return Object.values(costs).some(value => hasUtilValueInput(value, requireNonZero));
            }
            return false;
        }

        function clampUtilDay(value, fallback = 1) {
            const num = Number(value);
            if (!Number.isFinite(num)) return fallback;
            return Math.max(1, Math.min(31, Math.floor(num)));
        }

        function parseUtilDateKey(value) {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
            if (!match) return null;
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
            return { year, month, day, date };
        }

        function parseUtilAmount(value) {
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            const normalized = String(value ?? '')
                .replace(/,/g, '')
                .trim();
            if (!normalized) return null;
            const matched = normalized.match(/-?\d+(?:\.\d+)?/);
            if (!matched) return null;
            const parsed = Number(matched[0]);
            return Number.isFinite(parsed) ? parsed : null;
        }

        function parseUtilPercentAmount(value) {
            const parsed = parseUtilAmount(value);
            if (!Number.isFinite(parsed)) return null;
            const text = String(value ?? '').trim();
            if (text.includes('%')) return parsed;
            if (parsed >= 0 && parsed <= 1) return parsed * 100;
            return parsed;
        }

        const UTIL_PRODUCTION_UPLOAD_COLS = ['A', 'B', 'C', 'E', 'F'];
        const UTIL_PRODUCTION_UPLOAD_HEADER_ROW = 3;
        const UTIL_PRODUCTION_UPLOAD_DATA_START_ROW = 4;
        const UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS = 0;
        const UTIL_PRODUCTION_UPLOAD_HEADER_RULES = {
            A: [/생산일자/],
            B: [/팀/],
            C: [/라인명/, /라인/],
            E: [/품명/],
            F: [/생산량/]
        };

        function formatUtilYmd(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        function applyUtilDateOffset(date, offsetDays) {
            if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
            const safeOffset = Number.isFinite(Number(offsetDays)) ? Number(offsetDays) : 0;
            const shifted = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            shifted.setDate(shifted.getDate() + safeOffset);
            return shifted;
        }

        function normalizeUtilExcelJsDate(date) {
            if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
            const isUtcMidnight = date.getUTCHours() === 0
                && date.getUTCMinutes() === 0
                && date.getUTCSeconds() === 0
                && date.getUTCMilliseconds() === 0;
            if (isUtcMidnight) {
                return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
            }
            return new Date(date.getFullYear(), date.getMonth(), date.getDate());
        }

        function isUtilDateFormattedCell(cell) {
            const format = String(cell?.z || '').toLowerCase();
            return format.includes('yy') || format.includes('mm') || format.includes('dd');
        }

        function isUtilLikelyExcelDateSerial(value) {
            if (typeof value !== 'number' || !Number.isFinite(value)) return false;
            return value >= 30000 && value <= 80000;
        }

        function getUtilExcelCellDisplayValue(worksheet, address) {
            const cell = worksheet?.[address];
            if (!cell) return '';
            if (cell.v instanceof Date) {
                const normalizedDate = normalizeUtilExcelJsDate(cell.v);
                if (normalizedDate) return formatUtilYmd(normalizedDate);
                return formatUtilYmd(cell.v);
            }
            if (typeof cell.v === 'number' && isUtilDateFormattedCell(cell)) {
                const parsed = XLSX.SSF.parse_date_code(cell.v);
                if (parsed) return formatUtilYmd(new Date(parsed.y, parsed.m - 1, parsed.d));
            }
            if (cell.w !== undefined && cell.w !== null && String(cell.w).trim() !== '') return cell.w;
            if (cell.v === undefined || cell.v === null) return '';
            return cell.v;
        }

        function parseUtilExcelDateText(value) {
            if (value === null || value === undefined) return null;
            const text = String(value).trim();
            const match = text.match(/(\d{4})[./-](\d{1,2})[./-](\d{1,2})/);
            if (!match) return null;
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            const date = new Date(year, month - 1, day);
            if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
            if (year < 1990 || year > 2100) return null;
            return date;
        }





