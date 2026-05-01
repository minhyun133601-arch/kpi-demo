(function initKpiWorkHistoryViewRender() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TEAM_KEYS,
        TeamInfo,
        state,
        getPayload,
        getElement,
        getRecordAttachments,
        normalizeRecordCategory,
        getRecordCategoryGroupLabel,
        isProductionReportWorkspace,
        getRecordTagLabels
    } = history;

    function isProductionWorkspace() {
        return typeof isProductionReportWorkspace === 'function' && isProductionReportWorkspace();
    }

    function getAllRecords() {
        const payload = getPayload();
        const allRecords = [];
        TEAM_KEYS.forEach(team => {
            (payload.teams?.[team] || []).forEach((record, index) => {
                allRecords.push({ ...record, _team: team, _index: index });
            });
        });
        return allRecords;
    }

    function getFilteredTeamRecords(team) {
        const payload = getPayload();
        return sortRecords(
            (payload.teams?.[team] || [])
                .map((record, index) => ({ ...record, _team: team, _index: index }))
                .filter(record => recordMatchesFilters(record, team))
        );
    }

    function getFilteredOverviewRecords() {
        return sortRecords(
            getAllRecords().filter(record => recordMatchesFilters(record, view.OVERVIEW_KEY))
        );
    }

    function sortRecords(records) {
        return records.slice().sort((a, b) => {
            const endCompare = String(b.endDate || '').localeCompare(String(a.endDate || ''));
            if (endCompare !== 0) return endCompare;
            const startCompare = String(b.startDate || '').localeCompare(String(a.startDate || ''));
            if (startCompare !== 0) return startCompare;
            return view.formatAssigneeText(a).localeCompare(view.formatAssigneeText(b), 'ko');
        });
    }

    function recordMatchesFilters(record, prefix) {
        const start = getElement(`${prefix}FilterStart`)?.value || '';
        const end = getElement(`${prefix}FilterEnd`)?.value || '';
        const recordStart = record.startDate || '';
        const recordEnd = record.endDate || recordStart;
        const categoryFilter = String(state.currentCategoryFilter || '').trim();

        if (start && recordEnd < start) return false;
        if (end && recordStart > end) return false;
        if (categoryFilter && getRecordCategoryFilterText(record) !== categoryFilter) return false;
        if (!state.currentKeyword) return true;
        return buildSearchHaystack(record).includes(state.currentKeyword.toLowerCase());
    }

    function getRecordTags(record) {
        return typeof getRecordTagLabels === 'function'
            ? getRecordTagLabels(record)
            : [];
    }

    function getRecordCategoryText(record) {
        return typeof normalizeRecordCategory === 'function'
            ? normalizeRecordCategory(record?.category)
            : String(record?.category || '').trim();
    }

    function getRecordCategoryFilterText(record) {
        const categoryText = getRecordCategoryText(record);
        if (categoryText) return categoryText;
        return typeof getRecordCategoryGroupLabel === 'function'
            ? getRecordCategoryGroupLabel(record)
            : '';
    }

    function getRecordTeamInfo(record) {
        const teamKey = record?.team || record?._team;
        return TeamInfo[teamKey] || TeamInfo.team1part1;
    }

    function buildRecordRemarkText(record) {
        const tagPrefix = getRecordTags(record)
            .map(tag => `[${tag}]`)
            .join(' ');
        const remarks = String(record?.remarks || '').trim();
        if (tagPrefix && remarks) return `${tagPrefix} ${remarks}`;
        return tagPrefix || remarks || (isProductionWorkspace() ? '입력된 보고 메모가 없습니다.' : '입력된 비고가 없습니다.');
    }

    function buildSearchHaystack(record) {
        const attachmentNames = getRecordAttachments(record)
            .map(attachment => attachment.originalName || '')
            .join(' ');
        const categoryText = getRecordCategoryText(record);
        const categoryGroupText = typeof getRecordCategoryGroupLabel === 'function'
            ? getRecordCategoryGroupLabel(record)
            : '';
        const tagText = getRecordTags(record).join(' ');
        return [
            TeamInfo[record.team]?.name || '',
            TeamInfo[record.team]?.desc || '',
            categoryGroupText,
            categoryText,
            tagText,
            view.formatAssigneeText(record),
            record.workContent || '',
            record.remarks || '',
            attachmentNames,
            view.formatCurrency(record.cost)
        ].join(' ').toLowerCase();
    }

    function renderCurrentView() {
        renderOverview();
        TEAM_KEYS.forEach(team => renderTeam(team));
        view.syncActiveTabUi?.();
        view.updateHeaderSummary?.();
    }

    function renderOverview() {
        const container = getElement('overview-records');
        if (!container) return;
        const records = getFilteredOverviewRecords();
        container.innerHTML = records.length
            ? records.map(record => view.buildRecordCard?.(record, true) || '').join('')
            : view.renderEmptyState(view.getEmptyStateMessage?.() || '조건에 맞는 작업내역이 없습니다.');
    }

    function renderTeam(team) {
        const container = getElement(`${team}-records`);
        if (!container) return;
        const records = getFilteredTeamRecords(team);
        container.innerHTML = records.length
            ? records.map(record => view.buildRecordCard?.(record, false) || '').join('')
            : view.renderEmptyState(view.getEmptyStateMessage?.() || '조건에 맞는 작업내역이 없습니다.');
    }

    function updateSearchCount() {
        const badges = [
            ...history.queryAll('[data-role="search-result-count"]'),
            ...history.queryAll('#searchResultCount')
        ];
        if (!badges.length) return;
        if (!state.currentKeyword && !state.currentCategoryFilter) {
            badges.forEach((badge) => {
                badge.style.display = 'none';
                badge.textContent = '';
            });
            return;
        }
        const count = state.currentTeam === view.OVERVIEW_KEY
            ? getFilteredOverviewRecords().length
            : getFilteredTeamRecords(state.currentTeam).length;
        badges.forEach((badge) => {
            badge.textContent = `${count}건`;
            badge.style.display = 'inline-flex';
        });
    }

    function highlightText(text) {
        if (!state.currentKeyword || !text) return text;
        const escapedKeyword = view.escapeRegExp(state.currentKeyword);
        return text.replace(new RegExp(`(${escapedKeyword})`, 'gi'), '<mark>$1</mark>');
    }

    Object.assign(view, {
        getAllRecords,
        getFilteredTeamRecords,
        getFilteredOverviewRecords,
        sortRecords,
        recordMatchesFilters,
        buildSearchHaystack,
        renderCurrentView,
        renderOverview,
        renderTeam,
        getRecordTags,
        getRecordTeamInfo,
        getRecordCategoryText,
        buildRecordRemarkText,
        updateSearchCount,
        highlightText
    });
})();
