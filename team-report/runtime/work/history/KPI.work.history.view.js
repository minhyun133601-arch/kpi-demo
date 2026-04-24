(function initKpiWorkHistoryView() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || {};
    if (
        typeof history.loadData !== 'function'
        || typeof view.ensureShadowMount !== 'function'
        || typeof view.renderCurrentView !== 'function'
    ) {
        return;
    }

    const { state, loadData } = history;

    function render(category, context = {}) {
        state.activeCategory = category || null;
        loadData();
        view.ensureShadowMount(context);
        if (!view.getShadowRoot?.()) return;
        view.syncViewportLayout?.(context);
        view.updateTitleState?.(category);
        view.initDateFilterLimits?.();
        view.syncActiveTabUi?.();
        view.renderCurrentView?.();
    }

    Object.assign(history, {
        render,
        switchTab: view.switchTab,
        openRecordModal: view.openRecordModal,
        closeRecordModal: view.closeRecordModal,
        openDeleteModal: view.openDeleteModal,
        closeDeleteModal: view.closeDeleteModal,
        saveRecord: view.saveRecord,
        confirmDelete: view.confirmDelete,
        searchByKeyword: view.searchByKeyword,
        clearSearch: view.clearSearch,
        resetDateFilters: view.resetDateFilters,
        exportAllData: view.exportAllData,
        performPrimarySave: view.performPrimarySave,
        downloadBackupSnapshot: view.downloadBackupSnapshot,
        printCurrentView: view.printCurrentView,
        closeOverlays: view.closeOverlays,
        isRecordModalOpen: view.isRecordModalOpen,
        isDeleteModalOpen: view.isDeleteModalOpen
    });
})();
