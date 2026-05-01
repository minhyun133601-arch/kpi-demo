(function () {
    const runtime = window.KpiRuntime;
    if (!runtime) return;

    const EQUIPMENT_HISTORY_DATA_KEY = 'data_equipment_history_card';

    function getEquipmentHistoryData() {
        const payload = window.PortalData?.[EQUIPMENT_HISTORY_DATA_KEY];
        return payload && typeof payload === 'object' ? payload : {};
    }

    runtime.registerSectionRenderer('data', (category, context = {}) => {
        if (String(category?.dataKey || '').trim() === EQUIPMENT_HISTORY_DATA_KEY) {
            if (typeof window.KpiDataEquipmentHistory?.render === 'function') {
                window.KpiDataEquipmentHistory.render(category, context, getEquipmentHistoryData());
                return;
            }
        }

        const container = context.container || document.getElementById('content-container');
        if (container) container.innerHTML = category?.content || '';
    });
})();
