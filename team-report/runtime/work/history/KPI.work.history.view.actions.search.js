(function initKpiWorkHistoryViewActionSearch() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TEAM_KEYS,
        state,
        normalizeRecordCategory,
        normalizeRecordCategoryGroup,
        getElement
    } = history;

    function getActiveSearchInput(triggerTarget = null) {
        const panel = triggerTarget?.closest?.('.history-search-panel') || null;
        if (panel) {
            const panelInput = panel.querySelector('[data-role="keyword-search"]');
            if (panelInput) return panelInput;
        }

        const activeSection = history.queryAll('.team-section.active')[0] || null;
        if (activeSection) {
            const activeInput = activeSection.querySelector('[data-role="keyword-search"]');
            if (activeInput) return activeInput;
        }

        return getElement('keywordSearch');
    }

    function getActiveCategoryFilterSelect(triggerTarget = null) {
        const panel = triggerTarget?.closest?.('.history-search-panel') || null;
        if (panel) {
            const panelSelect = panel.querySelector('[data-role="category-filter"]');
            if (panelSelect) return panelSelect;
        }

        const activeSection = history.queryAll('.team-section.active')[0] || null;
        if (activeSection) {
            const activeSelect = activeSection.querySelector('[data-role="category-filter"]');
            if (activeSelect) return activeSelect;
        }

        return history.queryAll('[data-role="category-filter"]')[0] || null;
    }

    function syncSearchInputs(value, sourceInput = null) {
        const normalizedValue = String(value || '');
        const legacyInput = getElement('keywordSearch');
        if (legacyInput && legacyInput !== sourceInput) {
            legacyInput.value = normalizedValue;
        }
        history.queryAll('[data-role="keyword-search"]').forEach((input) => {
            if (input === sourceInput) return;
            input.value = normalizedValue;
        });
        if (sourceInput) {
            sourceInput.value = normalizedValue;
        }
    }

    function syncCategoryFilterInputs(value, sourceSelect = null) {
        const normalizedValue = String(value || '');
        history.queryAll('[data-role="category-filter"]').forEach((select) => {
            if (select === sourceSelect) return;
            select.value = normalizedValue;
        });
        if (sourceSelect) {
            sourceSelect.value = normalizedValue;
        }
    }

    function syncRecordCategoryInputs(groupValue = '', categoryValue = '') {
        const groupSelect = getElement('recordCategoryGroup');
        const categorySelect = getElement('recordCategory');
        if (!groupSelect || !categorySelect) return;

        const rawCategoryValue = String(categoryValue || '').trim();
        const normalizedCategoryValue = normalizeRecordCategory(rawCategoryValue, { preserveLegacy: true }) || rawCategoryValue;
        const normalizedGroupValue = normalizeRecordCategoryGroup(groupValue, {
            category: normalizedCategoryValue
        });

        if (typeof view.buildCategoryOptionsMarkup === 'function') {
            categorySelect.innerHTML = view.buildCategoryOptionsMarkup(normalizedGroupValue, normalizedCategoryValue);
        }

        const hasSelectableCategories = Array.from(categorySelect.options || []).some(option => (
            String(option.value || '').trim()
        ));
        categorySelect.disabled = !normalizedGroupValue || !hasSelectableCategories;
        groupSelect.value = normalizedGroupValue;

        const optionValues = Array.from(categorySelect.options || [])
            .map(option => String(option.value || '').trim())
            .filter(Boolean);
        categorySelect.value = optionValues.includes(normalizedCategoryValue)
            ? normalizedCategoryValue
            : '';
    }

    function switchTab(teamKey) {
        state.currentTeam = TEAM_KEYS.includes(teamKey) || teamKey === view.OVERVIEW_KEY
            ? teamKey
            : view.OVERVIEW_KEY;
        syncSearchInputs(state.currentKeyword);
        syncCategoryFilterInputs(state.currentCategoryFilter);
        syncActiveTabUi();
        view.updateSearchCount?.();
    }

    function syncActiveTabUi() {
        history.queryAll('.tab-btn').forEach(button => {
            button.classList.toggle('active', button.dataset.team === state.currentTeam);
        });
        history.queryAll('.team-section').forEach(section => {
            section.classList.toggle('active', section.id === state.currentTeam);
        });
        view.syncFullscreenButtons?.();
    }

    function resetDateFilters(prefix) {
        const startInput = getElement(`${prefix}FilterStart`);
        const endInput = getElement(`${prefix}FilterEnd`);
        if (startInput) startInput.value = '';
        if (endInput) endInput.value = '';
        state.currentKeyword = '';
        state.currentCategoryFilter = '';
        syncSearchInputs('');
        syncCategoryFilterInputs('');
        view.renderCurrentView?.();
    }

    function searchByKeyword(triggerTarget = null) {
        const input = getActiveSearchInput(triggerTarget);
        const categorySelect = getActiveCategoryFilterSelect(triggerTarget);
        state.currentKeyword = String(input?.value || getElement('keywordSearch')?.value || '').trim();
        state.currentCategoryFilter = String(categorySelect?.value || '').trim();
        syncSearchInputs(state.currentKeyword, input);
        syncCategoryFilterInputs(state.currentCategoryFilter, categorySelect);
        view.renderCurrentView?.();
    }

    function clearSearch(triggerTarget = null) {
        const input = getActiveSearchInput(triggerTarget);
        syncSearchInputs('', input);
        state.currentKeyword = '';
        view.renderCurrentView?.();
    }

    Object.assign(view, {
        getActiveSearchInput,
        getActiveCategoryFilterSelect,
        syncSearchInputs,
        syncCategoryFilterInputs,
        syncRecordCategoryInputs,
        switchTab,
        syncActiveTabUi,
        resetDateFilters,
        searchByKeyword,
        clearSearch
    });
})();
