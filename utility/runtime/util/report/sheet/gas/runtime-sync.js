(function registerUtilReportSheetGasRuntimeSync() {
    const utilReportSheetConfig = globalThis.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.gas.runtime-sync.js');
    }
    const { UtilSheetRuntimeState } = utilReportSheetConfig;

    const runtime = {
        syncUtilGasDataFromMetering: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
    }

    function ensureUtilGasReportDataSync() {
        if (UtilSheetRuntimeState.gasDataSyncedOnce) {
            return Promise.resolve({ changed: false });
        }
        if (UtilSheetRuntimeState.gasDataSyncPromise) {
            return UtilSheetRuntimeState.gasDataSyncPromise;
        }
        if (typeof runtime.syncUtilGasDataFromMetering !== 'function') {
            UtilSheetRuntimeState.gasDataSyncedOnce = true;
            return Promise.resolve({ changed: false });
        }
        const nextPromise = Promise.resolve()
            .then(() => runtime.syncUtilGasDataFromMetering({ force: true }))
            .then(changed => {
                UtilSheetRuntimeState.gasDataSyncedOnce = true;
                return { changed: Boolean(changed) };
            })
            .catch(() => {
                UtilSheetRuntimeState.gasDataSyncedOnce = true;
                return { changed: false };
            })
            .finally(() => {
                UtilSheetRuntimeState.gasDataSyncPromise = null;
            });
        UtilSheetRuntimeState.gasDataSyncPromise = nextPromise;
        return nextPromise;
    }

    globalThis.KPIUtilReportSheetGasRuntimeSync = {
        setRuntimeAdapters,
        ensureUtilGasReportDataSync
    };
})();
