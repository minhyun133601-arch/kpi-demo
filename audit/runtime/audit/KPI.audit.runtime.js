(function registerAuditRuntime() {
    const runtime = window.KpiRuntime;
    if (!runtime) return;

    function getAuditSaveCapability(dataKey) {
        const serverRuntime = typeof getAuditServerRuntimeConfig === 'function'
            ? getAuditServerRuntimeConfig(dataKey)
            : null;
        const serverMode = runtime.hasServerAuthority();
        const canWrite = runtime.canUseServerWrite(serverRuntime?.writeEnabled === true);
        return {
            serverMode,
            canWrite
        };
    }

    function hasAuditEntryDraft(dataKey) {
        if (typeof getAuditEntryFormState !== 'function') return false;
        const form = getAuditEntryFormState(dataKey);
        if (!form || typeof form !== 'object') return false;
        if (form.editIndex !== null && form.editIndex !== undefined) return true;
        return ['team', 'room', 'type', 'value', 'note'].some((field) => String(form[field] || '').trim());
    }

    function hasAuditStandardDraft(dataKey, options = {}) {
        if (typeof getAuditStandardFormState !== 'function') return false;
        const form = getAuditStandardFormState(dataKey);
        if (!form || typeof form !== 'object') return false;
        const isEditing = form.editIndex !== null && form.editIndex !== undefined;
        if (isEditing) return true;
        const hasAnyValue = ['team', 'room', 'type', 'standard'].some((field) => String(form[field] || '').trim());
        if (!hasAnyValue) return false;
        if (options.requireComplete === true) {
            return ['team', 'room', 'type', 'standard'].every((field) => String(form[field] || '').trim());
        }
        return true;
    }

    runtime.registerSectionRenderer('audit', (category) => {
        renderAuditContent(category);
    });

    runtime.registerSaveProvider('audit-record-save', (context = {}) => {
        if (context.sectionId !== 'audit') return null;
        const dataKey = String(context.category?.dataKey || '').trim();
        if (context.category?.isPlaceholder === true) return null;
        if (!dataKey || typeof getAuditData !== 'function' || typeof saveAuditData !== 'function') {
            return null;
        }
        const saveCapability = getAuditSaveCapability(dataKey);
        return {
            priority: 90,
            canSave: saveCapability.canWrite,
            buttonLabel: '저장',
            historyLabel: 'Audit 저장',
            title: 'Audit 저장',
            statusText: saveCapability.canWrite
                ? '현재 Audit 기록을 중앙 서버에 저장합니다.'
                : '서버 기록이 가능한 환경에서만 Audit 기록을 저장할 수 있습니다.',
            perform: async () => {
                if (!saveCapability.canWrite) return false;
                if (dataKey === 'audit_lux' && typeof saveAuditLuxWorkspace === 'function') {
                    return saveAuditLuxWorkspace(dataKey, { silent: true });
                }
                let flushed = false;
                if (hasAuditEntryDraft(dataKey) && typeof addAuditEntry === 'function') {
                    addAuditEntry(dataKey);
                    flushed = true;
                }
                if (hasAuditStandardDraft(dataKey, { requireComplete: true }) && typeof addAuditTypeStandard === 'function') {
                    addAuditTypeStandard(dataKey);
                    flushed = true;
                }
                if (flushed) {
                    if (!saveCapability.canWrite) return false;
                    return typeof waitForAuditServerWrite === 'function'
                        ? waitForAuditServerWrite(dataKey)
                        : true;
                }
                const data = getAuditData(dataKey, context.category?.title || dataKey);
                return saveAuditData(dataKey, data);
            }
        };
    });
})();
