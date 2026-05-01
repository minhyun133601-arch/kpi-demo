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
        isProductionReportWorkspace,
        escapeHtml,
        escapeAttribute
    } = history;

    function isProductionWorkspace() {
        return typeof isProductionReportWorkspace === 'function' && isProductionReportWorkspace();
    }

    function buildSummaryContent(record) {
        const info = view.getRecordTeamInfo(record);
        const categoryGroupText = typeof getRecordCategoryGroupLabel === 'function'
            ? getRecordCategoryGroupLabel(record)
            : '';
        const categoryText = view.getRecordCategoryText(record);
        const items = isProductionWorkspace()
            ? [
                ['보고 팀', info.name],
                ['보고 구분', categoryGroupText || '보고'],
                ['작성자', view.formatAssigneeText(record) || '미입력'],
                ['기간', view.formatDateRange(record.startDate, record.endDate)],
                ['종료예정일', view.formatDateKorean(record.plannedEndDate)],
                ['비용', view.formatCurrency(record.cost)]
            ]
            : [
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
        const slotKeys = typeof view.getVisibleAttachmentSlotKeys === 'function'
            ? view.getVisibleAttachmentSlotKeys()
            : ATTACHMENT_SLOT_KEYS;
        const items = slotKeys.map((slotKey) => {
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

    function getRecordSummaryTitle(record) {
        const categoryText = view.getRecordCategoryText(record);
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

    function buildRecordCard(record, showTeam) {
        const team = record.team || record._team;
        const info = view.getRecordTeamInfo(record);
        const summaryTitle = getRecordSummaryTitle(record);
        const isProductionReport = isProductionWorkspace();
        const summaryTitleLabel = isProductionReport ? '보고 제목' : '제목';
        const contentSectionTitle = isProductionReport ? '보고 내용' : '업무내용';
        const remarksSectionTitle = isProductionReport ? '보고 메모' : '비고';
        const attachmentSectionTitle = isProductionReport ? '보고 첨부' : '첨부 문서';
        const emptyContentText = isProductionReport ? '입력된 보고 내용이 없습니다.' : '입력된 업무내용이 없습니다.';
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
                                <span class="record-summary-label">${summaryTitleLabel}</span>
                                <span class="record-summary-value" title="${escapeAttribute(summaryTitle)}">${view.highlightText(escapeHtml(summaryTitle))}</span>
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
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('attachment')}</span>${attachmentSectionTitle}</div>
                            <div class="report-section-content attachment-view-list">${view.buildAttachmentLinks(record)}</div>
                        </div>
                        <div class="report-section record-content">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('work')}</span>${contentSectionTitle}</div>
                            <div class="report-section-content">${view.highlightText(escapeHtml(record.workContent) || emptyContentText)}</div>
                        </div>
                        <div class="report-section remarks">
                            <div class="report-section-title"><span class="section-icon">${view.getSectionIconSvg('remarks')}</span>${remarksSectionTitle}</div>
                            <div class="report-section-content">${escapeHtml(view.buildRecordRemarkText(record))}</div>
                        </div>
                    </div>
                </div>
            </details>
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
        buildRecordCard,
        buildCompactRecordCard,
        getRecordSummaryTitle,
        renderEmptyState
    });
})();
