(function () {
    const SECTION_ORDER = ['work', 'util', 'audit', 'data', 'productionReport', 'owner'];

    function registerSections(AppData) {
        const factories = window.KpiSectionFactories || {};
        SECTION_ORDER.forEach(sectionKey => {
            const factory = factories[sectionKey];
            if (typeof factory === 'function') {
                AppData[sectionKey] = factory();
            }
        });
        return AppData;
    }

    window.KpiSectionRegistry = Object.freeze({
        registerSections
    });
})();
