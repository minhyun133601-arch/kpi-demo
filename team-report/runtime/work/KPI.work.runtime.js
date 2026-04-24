(function registerWorkRuntime() {
    const runtime = window.KpiRuntime;
    if (!runtime) return;

    function getWorkSaveCapability(dataKey) {
        const serverRuntime = typeof getWorkServerRuntimeConfig === 'function'
            ? getWorkServerRuntimeConfig(dataKey)
            : null;
        const serverMode = runtime.hasServerAuthority();
        const canWrite = runtime.canUseServerWrite(serverRuntime?.writeEnabled === true);
        return {
            serverMode,
            canWrite
        };
    }

    runtime.registerDefaultOpenOptions('work', { autoOpenModal: false });

    runtime.registerSectionRenderer('work', (category, context = {}) => {
        renderWorkContent(category, context);
    });

    runtime.registerBootTask('work-last-modified', () => {
        renderLastModified();
    });

    runtime.registerSaveProvider('work-team-calendar-save', () => null);

    runtime.registerSaveProvider('work-history-save', (context = {}) => {
        if (context.sectionId !== 'work') return null;
        if (context.category?.view !== 'history_tool') return null;
        const runtimeConfig = window.KpiWorkHistory?.getRecordRuntimeConfig?.() || null;
        const serverWritable = runtime.canUseServerWrite(runtimeConfig?.writeEnabled === true);

        return {
            priority: 120,
            canSave: serverWritable && typeof window.KpiWorkHistory?.performPrimarySave === 'function',
            buttonLabel: '저장',
            historyLabel: '작업내역 저장',
            title: '작업내역 저장',
            statusText: !serverWritable
                ? '서버 기록이 가능한 환경에서만 작업내역을 저장할 수 있습니다.'
                : (window.KpiWorkHistory?.isRecordModalOpen?.()
                    ? '현재 입력 중인 작업내역을 중앙 서버에 저장합니다.'
                    : '현재 작업내역 탭 전체를 중앙 서버에 저장합니다.'),
            perform: async () => {
                if (!serverWritable) return false;
                const result = await window.KpiWorkHistory?.performPrimarySave?.();
                if (result !== false && typeof setLastModified === 'function') {
                    setLastModified(context.category?.title || AppData?.work?.name || '작업내역 문서');
                }
                return result !== false;
            }
        };
    });

    runtime.registerShortcutCloser('work-team-calendar', () => {
        if (typeof closeWorkTeamCalendarModal === 'function') {
            closeWorkTeamCalendarModal();
        }
    });

    runtime.registerShortcutCloser('work-history', () => {
        window.KpiWorkHistory?.closeOverlays?.();
    });
})();
