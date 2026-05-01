(function initKpiWorkHistoryCorePayload() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const {
        DATA_KEY,
        TEAM_KEYS,
        LOCAL_BACKUP_KEY,
        state,
        cloneJson,
        getTimeValue
    } = history;

    function createFallbackPayload() {
        return typeof history.createDefaultPayload === 'function'
            ? history.createDefaultPayload()
            : {
                meta: {
                    moduleKey: DATA_KEY,
                    moduleName: '팀별내역서 - 작업내역',
                    version: 1,
                    updatedAt: new Date().toISOString()
                },
                teams: Object.fromEntries(TEAM_KEYS.map(team => [team, []]))
            };
    }

    function getSeedPayload() {
        const portalData = window.PortalData && typeof window.PortalData === 'object'
            ? window.PortalData
            : null;
        if (portalData && Object.prototype.hasOwnProperty.call(portalData, DATA_KEY)) {
            return portalData[DATA_KEY];
        }
        return createFallbackPayload();
    }

    function syncPortalDataCache(payload) {
        window.PortalData = window.PortalData || {};
        window.PortalData[DATA_KEY] = cloneJson(payload);
    }

    function normalizePayloadWithRegistry(payload) {
        const normalizePayload = typeof history.normalizePayload === 'function'
            ? history.normalizePayload
            : null;
        if (normalizePayload) {
            return normalizePayload(payload);
        }
        return payload && typeof payload === 'object'
            ? cloneJson(payload)
            : createFallbackPayload();
    }

    function loadData() {
        if (state.loaded && state.payload) return state.payload;
        let seedPayload = null;
        let localPayload = null;
        try {
            seedPayload = getSeedPayload();
        } catch (_error) {
            seedPayload = null;
        }
        const stored = localStorage.getItem(LOCAL_BACKUP_KEY);
        if (stored) {
            try {
                localPayload = JSON.parse(stored);
            } catch (_error) {
                localPayload = null;
            }
        }
        let payload = seedPayload;
        if (!payload || (localPayload && getTimeValue(localPayload?.meta?.updatedAt) > getTimeValue(seedPayload?.meta?.updatedAt))) {
            payload = localPayload;
        }
        state.payload = normalizePayloadWithRegistry(payload);
        syncPortalDataCache(state.payload);
        state.loaded = true;
        return state.payload;
    }

    function getPayload() {
        return loadData();
    }

    function replacePayload(payload) {
        state.payload = normalizePayloadWithRegistry(payload);
        state.loaded = true;
        syncPortalDataCache(state.payload);
        return state.payload;
    }

    Object.assign(history, {
        getSeedPayload,
        syncPortalDataCache,
        loadData,
        getPayload,
        replacePayload
    });

    window.KpiWorkHistory = history;
})();
