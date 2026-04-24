(function registerUtilReportSheetElectricRuntimeSync() {
    const utilReportSheetConfig = globalThis.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.electric.runtime-sync.js');
    }
    const { UtilSheetRuntimeState } = utilReportSheetConfig;

    const runtime = {
        getUtilMeteringDataset: null,
        ensureUtilMeteringDataset: null,
        isUtilSheetPlainObject: null,
        syncUtilElectricDataFromMetering: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters);
    }

    function getUtilElectricMeteringStore() {
        return typeof runtime.getUtilMeteringDataset === 'function'
            ? runtime.getUtilMeteringDataset('electric')
            : null;
    }

    function hasUtilElectricMeteringStore() {
        return Boolean(getUtilElectricMeteringStore());
    }

    function ensureUtilElectricMeteringStore() {
        if (typeof runtime.ensureUtilMeteringDataset !== 'function') {
            return Promise.resolve(false);
        }
        return runtime.ensureUtilMeteringDataset('electric', 'electricMeteringPromise');
    }

    function getUtilElectricUtilitySnapshot() {
        const getter = globalThis.KpiMeteringApp?.getElectricUtilityDatasetSnapshot;
        if (typeof getter !== 'function') return null;
        try {
            const snapshot = getter();
            return typeof runtime.isUtilSheetPlainObject === 'function'
                && runtime.isUtilSheetPlainObject(snapshot)
                && runtime.isUtilSheetPlainObject(snapshot?.teams)
                ? snapshot
                : null;
        } catch (error) {
            return null;
        }
    }

    function ensureUtilElectricReportDataSync() {
        if (UtilSheetRuntimeState.electricDataSyncedOnce) {
            return Promise.resolve({ changed: false });
        }
        if (UtilSheetRuntimeState.electricDataSyncPromise) {
            return UtilSheetRuntimeState.electricDataSyncPromise;
        }
        if (typeof runtime.syncUtilElectricDataFromMetering !== 'function') {
            UtilSheetRuntimeState.electricDataSyncedOnce = true;
            return Promise.resolve({ changed: false });
        }
        const nextPromise = Promise.resolve()
            .then(() => runtime.syncUtilElectricDataFromMetering())
            .then(changed => {
                UtilSheetRuntimeState.electricDataSyncedOnce = true;
                return { changed: Boolean(changed) };
            })
            .catch(() => {
                UtilSheetRuntimeState.electricDataSyncedOnce = true;
                return { changed: false };
            })
            .finally(() => {
                UtilSheetRuntimeState.electricDataSyncPromise = null;
            });
        UtilSheetRuntimeState.electricDataSyncPromise = nextPromise;
        return nextPromise;
    }

    globalThis.KPIUtilReportSheetElectricRuntimeSync = {
        setRuntimeAdapters,
        getUtilElectricMeteringStore,
        hasUtilElectricMeteringStore,
        ensureUtilElectricMeteringStore,
        getUtilElectricUtilitySnapshot,
        ensureUtilElectricReportDataSync
    };
})();
