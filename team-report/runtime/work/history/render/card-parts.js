(function initKpiWorkHistoryViewRenderCardParts() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        getRecordAttachment,
        getRecordCategoryGroupLabel,
        KPI_FLAG_LABEL,
        KPI_FLAG_PILL_LABEL,
        isImportantRecord,
        escapeHtml,
        escapeAttribute
    } = history;

    function buildSummaryContent(record) {
        const info = view.getRecordTeamInfo(record);
        const categoryGroupText = typeof getRecordCategoryGroupLabel === 'function'
            ? getRecordCategoryGroupLabel(record)
            : '';
        const categoryText = view.getRecordCategoryText(record);
        const items = [
            ['작업 팀', info.name],
            ['구분', categoryGroupText || '-'],
            ['카테고리', categoryText || '-'],
            ['실적 표시', isImportantRecord(record) ? KPI_FLAG_LABEL : '-'],
            ['작업자', view.formatAssigneeText(record) || '미입력'],
            ['기간', view.formatDateRange(record.startDate, record.endDate)],
            ['종료예정일', view.formatDateKorean(record.plannedEndDate)],
            ['비용', view.formatCurrency(record.cost)]
        ];
        return `
            <div class="summary-grid">
                ${items.map(([label, value]) => `
                    <div class="summary-item">
                        <span class="summary-label">${escapeHtml(label)}</span>
                        <span class="summary-value">${escapeHtml(value)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function buildAttachmentLinks(record) {
        const items = ATTACHMENT_SLOT_KEYS.map((slotKey) => {
            const meta = ATTACHMENT_SLOT_META[slotKey];
            const attachment = getRecordAttachment(record, slotKey);
            if (!attachment) {
                return `
                    <div class="attachment-view-item is-empty">
                        <span class="attachment-type-label">${escapeHtml(meta.label)}</span>
                        <span class="attachment-empty">첨부 없음</span>
                    </div>
                `;
            }

            const previewUrl = attachment.previewUrl || attachment.url || attachment.downloadUrl || '#';
            const downloadUrl = attachment.downloadUrl || attachment.url || previewUrl;
            return `
                <div class="attachment-view-item">
                    <span class="attachment-type-label">${escapeHtml(meta.label)}</span>
                    <div class="attachment-view-meta">
                        <span class="attachment-file-label">${escapeHtml(attachment.originalName)}</span>
                        <span class="attachment-view-actions">
                            <a class="attachment-view-btn" href="${escapeAttribute(downloadUrl)}" download="${escapeAttribute(attachment.originalName || 'attachment')}" target="_blank" rel="noopener">다운로드</a>
                            <span class="attachment-size">${escapeHtml(view.formatFileSize(attachment.size))}</span>
                        </span>
                    </div>
                </div>
            `;
        });

        return items.join('');
    }

    function buildCompactRecordCard(record, options = {}) {
        const info = view.getRecordTeamInfo(record);
        const summaryTitle = view.getRecordSummaryTitle(record);
        const costText = view.formatCurrency(record?.cost);
        const workSummary = String(record?.workContent || '')
            .split(/\r?\n/)
            .map(line => String(line || '').trim())
            .find(Boolean) || '';
        const includeTeamTag = options.includeTeamTag !== false;
        const importantFlagLabel = String(options.importantFlagLabel || KPI_FLAG_LABEL);
        const importantPillLabel = String(options.importantPillLabel || options.kpiLabel || KPI_FLAG_PILL_LABEL);
        const tagItems = Array.isArray(options.tagItems) ? options.tagItems : view.getRecordTags(record);
        const hasImportant = typeof options.isImportant === 'boolean'
            ? options.isImportant
            : isImportantRecord(record);
        const metaItems = [
            includeTeamTag ? info.name : '',
            ...tagItems
        ].filter(Boolean);
        const outerClassName = [
            options.baseClassName || 'work-team-calendar-work-card',
            options.variantClassName || 'is-history-compact',
            info.class || '',
            hasImportant ? 'is-important' : '',
            options.className || ''
        ].filter(Boolean).join(' ');
        const metaClassName = options.metaClassName || 'work-team-calendar-work-meta';
        const pillClassName = options.pillClassName || 'work-team-calendar-work-pill';
        const pillKpiClassName = options.pillKpiClassName || 'is-kpi';
        const dateClassName = options.dateClassName || 'work-team-calendar-work-date';
        const costClassName = options.costClassName || 'work-team-calendar-work-cost';
        const summaryClassName = options.summaryClassName || 'work-team-calendar-work-summary';

        return `
            <div class="${escapeAttribute(outerClassName)}">
                <div class="work-team-calendar-work-head">
                    <div class="${escapeAttribute(dateClassName)}">${escapeHtml(view.formatDateRange(record?.startDate, record?.endDate))}</div>
                    <span class="${escapeAttribute(costClassName)}">${escapeHtml(costText)}</span>
                </div>
                ${metaItems.length ? `
                        <div class="${escapeAttribute(metaClassName)}">
                        ${metaItems.map(item => {
                            const isImportant = String(item || '').trim() === importantFlagLabel;
                            const label = isImportant ? importantPillLabel : item;
                            return `<span class="${escapeAttribute(`${pillClassName}${isImportant ? ` ${pillKpiClassName}` : ''}`)}">${escapeHtml(label)}</span>`;
                        }).join('')}
                    </div>
                ` : ''}
                ${workSummary ? `
                    <div class="${escapeAttribute(summaryClassName)}" title="${escapeAttribute(summaryTitle)}">${escapeHtml(workSummary)}</div>
                ` : ''}
            </div>
        `;
    }

    function renderEmptyState(message) {
        return `
            <div class="no-reports">
                <div class="no-reports-text">${escapeHtml(message)}</div>
            </div>
        `;
    }

    Object.assign(view, {
        buildSummaryContent,
        buildAttachmentLinks,
        buildCompactRecordCard,
        renderEmptyState
    });
})();
