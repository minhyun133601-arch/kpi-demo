(function initKpiWorkHistoryViewActions() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TeamInfo,
        state,
        getElement
    } = history;

    // Search, modal, document, and export helpers are split into sibling runtime files.
    function bindEvents() {
        const root = view.getShadowRoot?.();
        if (!root || root.__kpiWorkHistoryBound) return;
        root.__kpiWorkHistoryBound = true;
        root.addEventListener('click', handleRootClick);
        root.addEventListener('change', handleRootChange);
        root.addEventListener('input', handleRootInput);
        root.addEventListener('keydown', handleRootKeydown, true);
        if (!state.viewportResizeBound) {
            state.viewportResizeBound = true;
            window.addEventListener('resize', handleWindowResize);
        }
        if (!state.fullscreenChangeBound) {
            state.fullscreenChangeBound = true;
            document.addEventListener('fullscreenchange', handleFullscreenChange);
        }
        view.syncFullscreenButtons?.();
    }

    function handleWindowResize() {
        view.syncViewportLayout?.();
    }

    function getHistoryFullscreenTarget() {
        return getElement('history-main-content');
    }

    function getHistoryShadowFullscreenElement() {
        const root = view.getShadowRoot?.();
        return root && 'fullscreenElement' in root ? root.fullscreenElement : null;
    }

    function isHistoryFullscreen() {
        const target = getHistoryFullscreenTarget();
        if (!target) return false;
        return document.fullscreenElement === target || getHistoryShadowFullscreenElement() === target;
    }

    function getFullscreenButtonLabel(prefix, isActive = isHistoryFullscreen()) {
        const sectionTitle = prefix === view.OVERVIEW_KEY
            ? '전체 팀 작업내역'
            : `${TeamInfo[prefix]?.name || '팀'} 작업내역`;
        return isActive ? `${sectionTitle} 전체화면 종료` : `${sectionTitle} 전체화면`;
    }

    function syncFullscreenButtons() {
        const target = getHistoryFullscreenTarget();
        const isActive = isHistoryFullscreen();
        if (target) {
            target.classList.toggle('is-browser-fullscreen', isActive);
        }
        history.queryAll('[data-action="toggle-fullscreen"]').forEach(button => {
            const prefix = button.dataset.prefix || view.OVERVIEW_KEY;
            const label = getFullscreenButtonLabel(prefix, isActive);
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            button.setAttribute('aria-label', label);
            button.setAttribute('title', label);
            const icon = button.querySelector('[data-fullscreen-icon]');
            if (icon && typeof view.getFullscreenIconSvg === 'function') {
                icon.innerHTML = view.getFullscreenIconSvg(isActive);
            }
        });
    }

    function handleFullscreenChange() {
        syncFullscreenButtons();
        view.syncViewportLayout?.();
    }

    async function toggleHistoryFullscreen(prefix = view.OVERVIEW_KEY) {
        const target = getHistoryFullscreenTarget();
        if (!target) return;

        if (!isHistoryFullscreen() && prefix && state.currentTeam !== prefix) {
            view.switchTab?.(prefix);
        }

        if (isHistoryFullscreen()) {
            await document.exitFullscreen?.();
            return;
        }

        if (typeof target.requestFullscreen !== 'function') {
            view.showToast?.('이 브라우저에서는 전체화면을 지원하지 않습니다.');
            return;
        }

        try {
            if (document.fullscreenElement && document.fullscreenElement !== target) {
                await document.exitFullscreen?.();
            }
            await target.requestFullscreen();
        } catch (error) {
            console.warn('[KPI work history] fullscreen toggle failed', error);
            view.showToast?.('전체화면 전환에 실패했습니다.');
            syncFullscreenButtons();
        }
    }

    function handleRootClick(event) {
        const actionTarget = event.target.closest('[data-action]');
        if (actionTarget) {
            const action = actionTarget.dataset.action;
            if (action === 'switch-tab') {
                view.switchTab?.(actionTarget.dataset.team || view.OVERVIEW_KEY);
                return;
            }
            if (action === 'search') {
                view.searchByKeyword?.(actionTarget);
                return;
            }
            if (action === 'clear-search') {
                view.clearSearch?.(actionTarget);
                return;
            }
            if (action === 'reset-filter') {
                view.resetDateFilters?.(actionTarget.dataset.prefix || view.OVERVIEW_KEY);
                return;
            }
            if (action === 'toggle-fullscreen') {
                void view.toggleHistoryFullscreen?.(actionTarget.dataset.prefix || view.OVERVIEW_KEY);
                return;
            }
            if (action === 'add-record') {
                view.openRecordModal?.(actionTarget.dataset.team || 'team1part1');
                return;
            }
            if (action === 'edit-record') {
                view.openRecordModal?.(actionTarget.dataset.team || 'team1part1', Number(actionTarget.dataset.index));
                return;
            }
            if (action === 'delete-record') {
                view.openDeleteModal?.(actionTarget.dataset.team || 'team1part1', Number(actionTarget.dataset.index));
                return;
            }
            if (action === 'close-record-modal') {
                view.closeRecordModal?.();
                return;
            }
            if (action === 'save-record') {
                void view.saveRecord?.();
                return;
            }
            if (action === 'close-delete-modal') {
                view.closeDeleteModal?.();
                return;
            }
            if (action === 'confirm-delete') {
                void view.confirmDelete?.();
                return;
            }
            if (action === 'remove-existing-attachment') {
                view.removeExistingAttachment?.(actionTarget.dataset.slot || actionTarget.dataset.index);
                return;
            }
            if (action === 'remove-pending-attachment') {
                view.removePendingAttachment?.(actionTarget.dataset.slot || actionTarget.dataset.index);
                return;
            }
            if (action === 'pick-attachment') {
                view.openAttachmentPicker?.(actionTarget.dataset.slot || '');
                return;
            }
        }

        if (event.target.classList.contains('modal')) {
            if (event.target.id === 'recordModal') {
                view.closeRecordModal?.();
            }
            if (event.target.id === 'deleteModal') {
                view.closeDeleteModal?.();
            }
        }
    }

    function handleRootChange(event) {
        const target = event.target;
        if (!target) return;

        if (target.matches?.('[data-role="category-filter"]')) {
            state.currentCategoryFilter = String(target.value || '').trim();
            view.syncCategoryFilterInputs?.(state.currentCategoryFilter, target);
            view.renderCurrentView?.();
            return;
        }

        if (target.id === 'recordCategoryGroup') {
            view.syncRecordCategoryInputs?.(target.value, '');
            return;
        }

        if (target.id === 'recordAttachments' || target.id === 'recordBillingAttachment') {
            view.handleAttachmentSelection?.('billing', target.files);
            return;
        }

        if (target.id === 'recordReportAttachment') {
            view.handleAttachmentSelection?.('report', target.files);
            return;
        }

        const filterPrefix = target.dataset.filterPrefix;
        if (!filterPrefix) return;
        if (filterPrefix === view.OVERVIEW_KEY) {
            view.renderOverview?.();
            view.updateHeaderSummary?.();
            return;
        }
        view.renderTeam?.(filterPrefix);
        view.updateHeaderSummary?.();
    }

    function handleRootInput(event) {
        const target = event.target;
        if (!target) return;

        if (target.matches?.('[data-role="keyword-search"]')) {
            view.syncSearchInputs?.(target.value, target);
            return;
        }

        if (target.id === 'recordAssignee') {
            view.updateAssigneePreview?.(target.value);
            return;
        }

        if (target.id === 'recordCost') {
            target.value = view.formatCostInputValue(target.value);
        }
    }

    function handleRootKeydown(event) {
        const target = event.target;
        const isSaveShortcut = (event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 's';
        if (isSaveShortcut && view.isRecordModalOpen?.()) {
            event.preventDefault();
            event.stopPropagation();
            void view.saveRecord?.({ invokedByShortcut: true });
            return;
        }

        if (event.key === 'Escape') {
            if (view.isRecordModalOpen?.()) {
                event.preventDefault();
                view.closeRecordModal?.();
                return;
            }
            if (view.isDeleteModalOpen?.()) {
                event.preventDefault();
                view.closeDeleteModal?.();
                return;
            }
        }

        if ((target?.id === 'keywordSearch' || target?.matches?.('[data-role="keyword-search"]')) && event.key === 'Enter') {
            event.preventDefault();
            view.searchByKeyword?.(target);
        }
    }

    Object.assign(view, {
        bindEvents,
        handleWindowResize,
        getHistoryFullscreenTarget,
        getHistoryShadowFullscreenElement,
        isHistoryFullscreen,
        getFullscreenButtonLabel,
        syncFullscreenButtons,
        handleFullscreenChange,
        toggleHistoryFullscreen,
        handleRootClick,
        handleRootChange,
        handleRootInput,
        handleRootKeydown
    });
})();
