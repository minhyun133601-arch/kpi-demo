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
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        getRecordAttachments,
        getRecordAttachment,
        KPI_FLAG_LABEL,
        KPI_FLAG_PILL_LABEL,
        normalizeRecordCategory,
        getRecordCategoryGroupLabel,
        isKpiRecord,
        isImportantRecord,
        getRecordTagLabels,
        escapeHtml,
        escapeAttribute
    } = history;

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
        return tagPrefix || remarks || '입력된 비고가 없습니다.';
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
            ? records.map(record => buildRecordCard(record, true)).join('')
            : view.renderEmptyState('조건에 맞는 작업내역이 없습니다.');
    }

    function renderTeam(team) {
        const container = getElement(`${team}-records`);
        if (!container) return;
        const records = getFilteredTeamRecords(team);
        container.innerHTML = records.length
            ? records.map(record => buildRecordCard(record, false)).join('')
            : view.renderEmptyState('조건에 맞는 작업내역이 없습니다.');
    }

    function buildRecordCard(record, showTeam) {
        const team = record.team || record._team;
        const info = getRecordTeamInfo(record);
        const summaryTitle = getRecordSummaryTitle(record);
        void showTeam;
        return `
            <details class="report-card ${escapeHtml(info.class || '')}">
                <summary class="report-card-summary">
                    <div class="record-summary-main">
                        <span class="record-team-icon">${view.getTeamIconSvg(team)}</span>
                        <div class="record-summary-fields">
                            <div class="record-summary-field record-summary-team">
                                <span class="record-summary-label">팀</span>
                                <span class="record-summary-value">
                                    <span class="team-badge ${escapeHtml(info.class || '')}">${escapeHtml(info.name)}</span>
                                </span>
                            </div>
                            <div class="record-summary-field record-summary-title">
                                <span class="record-summary-label">제목</span>
                                <span class="record-summary-value" title="${escapeAttribute(summaryTitle)}">${highlightText(escapeHtml(summaryTitle))}</span>
                            </div>
                            <div class="record-summary-field record-summary-date">
                                <span class="record-summary-label">날짜</span>
                                <span class="record-summary-value">${escapeHtml(view.formatDateRange(record.startDate, record.endDate))}</span>
                            </div>
                            <div class="record-summary-field record-summary-cost">
                                <span class="record-summary-label">비용</span>
                                <span class="record-summary-value">${escapeHtml(view.formatCurrency(record.cost))}</span>
                            </div>
                        </div>
                    </div>
                    <span class="record-summary-chevron" aria-hidden="true"></span>
                </summary>
                <div class="report-card-body-shell">
                    <div class="report-card-actions">
                        <button class="btn-icon btn-icon-edit" type="button" data-action="edit-record" data-team="${team}" data-index="${record._index}" title="수정">수정</button>
                        <button class="btn-icon btn-icon-delete" type="button" data-action="delete-record" data-team="${team}" data-index="${record._index}" title="삭제">삭제</button>
                    </div>
                    <div class="report-card-body">
                        <div class="report-section summary-section">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('summary')}</span>기본 정보</div>
                            <div class="report-section-content">${view.buildSummaryContent(record)}</div>
                        </div>
                        <div class="report-section attachment-section">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('attachment')}</span>첨부 문서</div>
                            <div class="report-section-content attachment-view-list">${view.buildAttachmentLinks(record)}</div>
                        </div>
                        <div class="report-section record-content">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('work')}</span>업무내용</div>
                            <div class="report-section-content">${highlightText(escapeHtml(record.workContent) || '입력된 업무내용이 없습니다.')}</div>
                        </div>
                        <div class="report-section remarks">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('remarks')}</span>비고</div>
                            <div class="report-section-content">${escapeHtml(buildRecordRemarkText(record))}</div>
                        </div>
                    </div>
                </div>
            </details>
        `;
    }

    function getRecordSummaryTitle(record) {
        const categoryText = getRecordCategoryText(record);
        const importantPrefix = isImportantRecord(record) ? `${KPI_FLAG_LABEL} · ` : '';
        const workTitle = String(record?.workContent || '')
            .split(/\r?\n/)
            .map(line => String(line || '').trim())
            .find(Boolean);
        const billing = getRecordAttachment(record, 'billing');
        const report = getRecordAttachment(record, 'report');
        const attachmentLabel = billing && report
            ? '청구서/보고자료'
            : (billing ? '청구서' : (report ? '보고자료' : ''));

        if (attachmentLabel && workTitle) return `${importantPrefix}${attachmentLabel} · ${workTitle}`;
        if (attachmentLabel && categoryText) return `${importantPrefix}${attachmentLabel} · ${categoryText}`;
        if (workTitle) return `${importantPrefix}${workTitle}`;
        if (attachmentLabel) return `${importantPrefix}${attachmentLabel} 첨부`;
        if (categoryText) return `${importantPrefix}${categoryText}`;
        const remarksTitle = String(record?.remarks || '')
            .split(/\r?\n/)
            .map(line => String(line || '').trim())
            .find(Boolean);
        return `${importantPrefix}${remarksTitle || '제목 미입력'}`;
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
        buildRecordCard,
        getRecordTags,
        getRecordTeamInfo,
        getRecordCategoryText,
        getRecordSummaryTitle,
        buildRecordRemarkText,
        updateSearchCount,
        highlightText
    });
})();
