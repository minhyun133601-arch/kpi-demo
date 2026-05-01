        function renderWorkTeamCalendarInlineContent(category, headerHtml, options = {}) {
            const contentContainer = document.getElementById('content-container');
            const teamCategories = getWorkTeamCalendarCategories();
            const defaultDataKey = String(teamCategories[0]?.dataKey || category.dataKey || '').trim();
            const preferredDataKey = String(options.teamDataKey || WorkState.teamCalendarHubDataKey || category.dataKey || '').trim();
            const activeDataKey = teamCategories.some(item => item?.dataKey === preferredDataKey)
                ? preferredDataKey
                : defaultDataKey;
            contentContainer.innerHTML = `
                <div class="work-team-calendar-inline-shell">
                    <section class="work-team-inline-stage">
                        <div id="work-team-calendar-inline-host" class="work-team-calendar-inline-host"></div>
                    </section>
                </div>
            `;
            if (options.autoOpenModal === false) {
                closeWorkTeamCalendarModal();
            } else {
                syncWorkTeamCalendarInlineIndex(activeDataKey);
                openWorkTeamCalendarModal(activeDataKey, { inline: true });
            }
        }

        function renderWorkTeamCalendarContent(category, headerHtml, options = {}) {
            return renderWorkTeamCalendarInlineContent(category, headerHtml, options);
        }

        function renderWorkTeamCalendarModal() {
            const modal = ensureWorkTeamCalendarModal();
            const dataKey = WorkState.teamCalendarModal;
            const category = getWorkTeamCalendarCategory(dataKey);
            if (!category) {
                closeWorkTeamCalendarModal();
                return;
            }
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const parsed = parseMonthKey(monthKey);
            if (!parsed) return;
            const todayKey = formatDateKey(new Date());
            const focusedDate = getWorkTeamCalendarSelectedDate(dataKey, monthKey);
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            const hasDateSelection = selectedDateKeys.length > 0;
            const isBatchSelection = selectedDateKeys.length > 1;
            const selectedDate = getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey);
            const selectedDateLocked = hasDateSelection && isWorkTeamCalendarDateLocked(selectedDate, todayKey);
            const isOverviewCalendar = typeof isWorkTeamCalendarOverview === 'function'
                ? isWorkTeamCalendarOverview(dataKey)
                : false;
            const utilityPopupMetric = getWorkTeamCalendarUtilityPopupMetric(dataKey);
            const hasUtilityPopup = !!utilityPopupMetric;
            const prevDisabled = monthKey === WORK_TEAM_CALENDAR_RANGE.start ? 'disabled' : '';
            const nextDisabled = monthKey === WORK_TEAM_CALENDAR_RANGE.end ? 'disabled' : '';
            const editorState = getWorkTeamCalendarEditorState(dataKey);
            if (!hasDateSelection || selectedDateLocked) {
                editorState.open = false;
                editorState.dateKey = '';
                editorState.manual = false;
            } else if (editorState.open) {
                editorState.dateKey = selectedDate;
            }
            const workInputActive = false;
            const detailOverlayActive = hasDateSelection && !selectedDateLocked;
            const draft = getWorkTeamCalendarDraftForDates(dataKey, selectedDateKeys);
            const selectedHistoryRecords = getWorkTeamCalendarHistoryRecordsForDates(dataKey, selectedDateKeys);
            const isHistoryKpiRecord = (record) => {
                if (typeof isWorkTeamCalendarHistoryKpi === 'function') {
                    return isWorkTeamCalendarHistoryKpi(record);
                }
                if (typeof window.KpiWorkHistory?.isImportantRecord === 'function') {
                    return window.KpiWorkHistory.isImportantRecord(record);
                }
                if (typeof window.KpiWorkHistory?.isKpiRecord === 'function') {
                    return window.KpiWorkHistory.isKpiRecord(record);
                }
                return String(record?.category || '').trim() === 'KPI'
                    || String(record?.categoryGroup || record?.categoryType || '').trim() === 'report';
            };
            const hasSelectedEntryContent = selectedHistoryRecords.length > 0;
            const hasReadonlyEntryContent = hasSelectedEntryContent && !isOverviewCalendar;
            const selectedHistoryHasKpi = hasSelectedEntryContent && selectedHistoryRecords.some(isHistoryKpiRecord);
            const selectedHistoryKpiCount = hasSelectedEntryContent
                ? selectedHistoryRecords.filter(isHistoryKpiRecord).length
                : 0;
            const historyKpiLabel = window.KpiWorkHistory?.IMPORTANT_FLAG_LABEL || '★';
            const historyKpiPillLabel = window.KpiWorkHistory?.IMPORTANT_FLAG_PILL_LABEL || '★';
            const selectedHistoryCostSummary = hasSelectedEntryContent && typeof getWorkTeamCalendarHistoryCostSummary === 'function'
                ? getWorkTeamCalendarHistoryCostSummary(selectedHistoryRecords)
                : { totalCost: 0, costText: '-' };
            const readonlyEntriesHtml = hasReadonlyEntryContent
                ? (
                    renderWorkTeamCalendarReadonlyEntriesHtml(dataKey, selectedDateKeys)
                )
                : '';
            const memberCountText = getWorkTeamCalendarMemberCountLabel(draft.members.length);
            const selectedMembersHtml = renderWorkTeamCalendarSelectedMembersHtml(draft.members);
            const attachmentListHtml = renderWorkTeamCalendarAttachmentListHtml(draft.attachments, { batch: isBatchSelection });
            const entryTitlePreview = buildWorkTeamCalendarEntryTitle(selectedDate, draft.title);
            const attachmentPreviewLabel = getWorkTeamCalendarAttachmentPreviewLabel(selectedDate, draft.title);
            const monthDates = getMonthMatrix(parsed.year, parsed.monthIndex);
            const monthDateKeys = monthDates
                .filter(date => date.getMonth() === parsed.monthIndex)
                .map(date => formatDateKey(date));
            const productionSummaryMap = getWorkTeamCalendarProductionSummaryMap(dataKey, monthDateKeys);
            const historySummaryMap = getWorkTeamCalendarHistorySummaryMap(dataKey, monthDateKeys);
            const productionGroups = getWorkTeamCalendarProductionGroups(dataKey, selectedDateKeys);
            const productionGroupsHtml = isOverviewCalendar && typeof renderWorkTeamCalendarProductionTeamGroupsHtml === 'function'
                ? renderWorkTeamCalendarProductionTeamGroupsHtml(dataKey, selectedDateKeys, category)
                : renderWorkTeamCalendarProductionGroupsHtml(productionGroups, category, productionSummaryMap);
            const utilityBreakdownHtml = '';
            const productionItemCount = productionGroups.reduce((sum, group) => (
                sum + (Array.isArray(group?.items) ? group.items.length : 0)
            ), 0);
            const productionOverallSummary = summarizeWorkTeamCalendarProductionMetrics(
                productionGroups.flatMap(group => Array.isArray(group?.items) ? group.items : [])
            );
            const selectedProductionSummary = (!isBatchSelection && selectedDate)
                ? (productionSummaryMap.get(selectedDate) || null)
                : null;
            const productionMetricText = productionItemCount > 0
                ? getWorkTeamCalendarProductionMetricLine(productionOverallSummary)
                : (selectedProductionSummary?.isOffday ? '\uD734\uBB34' : '');
            const productionMetricClass = productionItemCount > 0
                ? ''
                : (selectedProductionSummary?.isOffday ? ' is-offday' : '');
            const detailTitle = hasDateSelection
                ? getWorkTeamCalendarSelectionLabel(selectedDateKeys, selectedDate)
                : '';
            let detailSub = isOverviewCalendar
                ? '\uD300\uBCC4 \uC0DD\uC0B0 \uD488\uBAA9 \uBCF4\uAE30'
                : (hasSelectedEntryContent ? '\uC791\uC5C5\uB0B4\uC5ED \uC0C1\uC138' : '');
            let detailCountText = hasSelectedEntryContent
                ? `${formatUtilNumber(selectedHistoryRecords.length, 0)}\uAC74`
                : (
                    productionItemCount > 0
                        ? `${formatUtilNumber(productionOverallSummary.totalAmount || 0, 0)}kg \u00B7 ${formatUtilNumber(productionItemCount, 0)}\uD488\uBAA9`
                        : (selectedProductionSummary?.isOffday ? '-' : (category.emptyProductionLabel || '\uD488\uBAA9 \uC5C6\uC74C'))
                );
            let detailCountBadgeText = hasSelectedEntryContent
                ? (formatUtilNumber(selectedHistoryRecords.length, 0) + '\uAC74' + (selectedHistoryHasKpi ? (' \u00B7 ' + historyKpiLabel + (selectedHistoryKpiCount > 1 ? (' ' + formatUtilNumber(selectedHistoryKpiCount, 0)) : '')) : '') + ' \u00B7 \uBE44\uC6A9 ' + (selectedHistoryCostSummary.costText || '-'))
                : detailCountText;
            if (isOverviewCalendar) {
                detailSub = '\uD300\uBCC4 \uC0DD\uC0B0 \uD488\uBAA9 \uBCF4\uAE30';
                detailCountText = productionItemCount > 0
                    ? `${formatUtilNumber(productionOverallSummary.totalAmount || 0, 0)}kg \u00B7 ${formatUtilNumber(productionItemCount, 0)}\uD488\uBAA9`
                    : (selectedProductionSummary?.isOffday ? '-' : (category.emptyProductionLabel || '\uD488\uBAA9 \uC5C6\uC74C'));
                detailCountBadgeText = detailCountText;
            }
            const isInline = isWorkTeamCalendarInlineMode();
            const isFullscreenActive = isWorkTeamCalendarFullscreen();
            const fullscreenToggleLabel = getWorkTeamCalendarFullscreenLabel(isFullscreenActive);
            const fullscreenToggleHtml = `
                <button
                    type="button"
                    class="work-team-calendar-fullscreen-toggle ${isFullscreenActive ? 'is-active' : ''}"
                    onclick="toggleWorkTeamCalendarFullscreen()"
                    data-action="work-team-calendar-toggle-fullscreen"
                    aria-pressed="${isFullscreenActive ? 'true' : 'false'}"
                    aria-label="${escapeHtml(fullscreenToggleLabel)}"
                    title="${escapeHtml(fullscreenToggleLabel)}"
                >
                    <span class="work-team-calendar-fullscreen-toggle-icon" data-work-team-fullscreen-icon>${getWorkTeamCalendarFullscreenIconSvg(isFullscreenActive)}</span>
                </button>
            `;
            const dialogRole = isInline ? 'region' : 'dialog';
            const dialogModalAttr = isInline ? '' : 'aria-modal="true"';
            const memberToggleHtml = WORK_TEAM_CALENDAR_MEMBERS.map(name => {
                const isActive = draft.members.includes(name);
                return `<button type="button" class="work-team-calendar-member-toggle ${isActive ? 'is-active' : ''}" data-work-team-member-name="${escapeHtml(name)}" aria-pressed="${isActive ? 'true' : 'false'}" ${!hasDateSelection || selectedDateLocked ? 'disabled' : ''}>${escapeHtml(name)}</button>`;
            }).join('');
            const teamSwitchHtml = getWorkTeamCalendarCategories().map(item => `
                <button type="button" class="work-team-calendar-switch ${item.dataKey === dataKey ? 'is-active' : ''}" onclick="switchWorkTeamCalendarTeam('${item.dataKey}')" style="--switch-accent:${item.color || '#2563eb'}; --switch-accent-2:${item.secondaryColor || item.color || '#38bdf8'}; --switch-soft:${item.tint || '#eff6ff'};">
                    <span class="work-team-calendar-switch-glyph">${renderWorkTeamCalendarGlyph(item.productVisual, 'sm')}</span>
                    <span class="work-team-calendar-switch-copy">
                        <span class="work-team-calendar-switch-text">${escapeHtml(item.title)}</span>
                        <span class="work-team-calendar-switch-sub">${escapeHtml(item.processLabel || item.title)}</span>
                    </span>
                </button>
            `).join('');
            const yearOptionHtml = getWorkTeamCalendarYearOptions().map(year => (
                `<option value="${year}" ${String(parsed.year) === String(year) ? 'selected' : ''}>${escapeHtml(String(year))}년</option>`
            )).join('');
            const monthOptionHtml = getWorkTeamCalendarMonthOptionsForYear(parsed.year).map(optionKey => (
                `<option value="${optionKey}" ${optionKey === monthKey ? 'selected' : ''}>${formatWorkTeamCalendarMonthShortLabel(optionKey)}</option>`
            )).join('');
            const utilitySummary = getWorkTeamCalendarUtilitySummary(dataKey, monthKey);
            const isOverviewSummary = isOverviewCalendar === true;
            const isWasteOnlySummary = !isOverviewSummary && !!utilitySummary.waste && !utilitySummary.electric && !utilitySummary.gas;
            const gasChoiceHtml = !isWasteOnlySummary && !isOverviewSummary && utilitySummary.gas.canSelect
                ? `
                    <div class="work-team-calendar-utility-choices" aria-label="가스 기준 선택">
                        <button type="button" class="work-team-calendar-utility-choice ${utilitySummary.gas.mode === 'all' ? 'is-active' : ''}" onclick="setWorkTeamCalendarGasMode('all')">전체</button>
                        <button type="button" class="work-team-calendar-utility-choice ${utilitySummary.gas.mode === 'lng' ? 'is-active' : ''}" onclick="setWorkTeamCalendarGasMode('lng')">LNG</button>
                        <button type="button" class="work-team-calendar-utility-choice ${utilitySummary.gas.mode === 'lpg' ? 'is-active' : ''}" onclick="setWorkTeamCalendarGasMode('lpg')">LPG</button>
                    </div>
                `
                : '';
            const isWorkPopupActive = utilityPopupMetric === 'work';
            const workUtilityChipHtml = `
                <button
                    type="button"
                    class="work-team-calendar-utility-chip is-button${isWorkPopupActive ? ' is-active' : ''}"
                    onclick="openWorkTeamCalendarUtilityPopup('work')"
                    aria-pressed="${isWorkPopupActive ? 'true' : 'false'}"
                    aria-label="작업내역 열기"
                >
                    <span class="work-team-calendar-utility-label">${escapeHtml(utilitySummary.workEntryLabel || '작업내역')}</span>
                    <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.workEntryCountText || '0건')}</span>
                    <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.workCostText || '-')}</span>
                    <span class="work-team-calendar-utility-hint">클릭하여 작업내역 보기</span>
                </button>
            `;
            const wasteUtilityChipHtml = utilitySummary.waste
                ? `
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">폐수 방류량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.waste?.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.waste?.costText || '-')}</span>
                        </div>
                    `
                : '';
            const utilitySummaryHtml = isWasteOnlySummary
                ? `
                    <div class="work-team-calendar-utility-strip">
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">폐수 방류량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.waste?.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.waste?.costText || '-')}</span>
                        </div>
                        ${workUtilityChipHtml}
                    </div>
                `
                : `
                    <div class="work-team-calendar-utility-strip">
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">전기 사용량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.electric.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.electric.costText || '-')}</span>
                        </div>
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">가스 사용량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.gas.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.gas.costText || '-')}</span>
                            ${gasChoiceHtml}
                        </div>
                        ${wasteUtilityChipHtml}
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">총 생산량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.production?.totalAmountText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">${escapeHtml(utilitySummary.production?.itemCountText || '-')}</span>
                        </div>
                        ${workUtilityChipHtml}
                    </div>
                `;
            let utilitySummaryHtmlResolved = isOverviewSummary
                ? `
                    <div class="work-team-calendar-utility-strip">
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">전기 사용량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.electric?.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.electric?.costText || '-')}</span>
                        </div>
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">가스 사용량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.gas?.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.gas?.costText || '-')}</span>
                            ${gasChoiceHtml}
                        </div>
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">폐수 방류량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.waste?.usageText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.waste?.costText || '-')}</span>
                        </div>
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">총생산량</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.production?.totalAmountText || '-')}</span>
                            <span class="work-team-calendar-utility-meta">${escapeHtml(utilitySummary.production?.itemCountText || '-')}</span>
                        </div>
                        <div class="work-team-calendar-utility-chip">
                            <span class="work-team-calendar-utility-label">작업내역</span>
                            <span class="work-team-calendar-utility-value">${escapeHtml(utilitySummary.workEntryCountText || '0 items')}</span>
                            <span class="work-team-calendar-utility-meta">비용 ${escapeHtml(utilitySummary.workCostText || '-')}</span>
                        </div>
                    </div>
                `
                : utilitySummaryHtml;
            let utilityPopupHtml = '';
            if (isOverviewSummary) {
                const utilityBreakdown = typeof buildWorkTeamCalendarOverviewUtilityBreakdown === 'function'
                    ? buildWorkTeamCalendarOverviewUtilityBreakdown(monthKey)
                    : { monthLabel: '', electric: [], gas: [] };
                const renderOverviewUtilityChip = (metricKey, label, valueText, metaText) => {
                    const isActionMetric = metricKey === 'electric' || metricKey === 'gas' || metricKey === 'work';
                    const activeClass = utilityPopupMetric === metricKey ? ' is-active' : '';
                    const hintText = metricKey === 'work'
                        ? '클릭하여 작업내역 보기'
                        : '클릭하여 팀별 상세 보기';
                    const bodyHtml = `
                        <span class="work-team-calendar-utility-label">${escapeHtml(label)}</span>
                        <span class="work-team-calendar-utility-value">${escapeHtml(valueText || '-')}</span>
                        <span class="work-team-calendar-utility-meta">${escapeHtml(metaText || '-')}</span>
                        ${isActionMetric ? `<span class="work-team-calendar-utility-hint">${escapeHtml(hintText)}</span>` : ''}
                    `;
                    if (!isActionMetric) {
                        return `<div class="work-team-calendar-utility-chip">${bodyHtml}</div>`;
                    }
                    return `
                        <button
                            type="button"
                            class="work-team-calendar-utility-chip is-button${activeClass}"
                            onclick="openWorkTeamCalendarUtilityPopup('${metricKey}')"
                            aria-pressed="${utilityPopupMetric === metricKey ? 'true' : 'false'}"
                        >
                            ${bodyHtml}
                        </button>
                    `;
                };
                utilitySummaryHtmlResolved = `
                    <div class="work-team-calendar-utility-strip">
                        ${renderOverviewUtilityChip('electric', '전기 사용량', utilitySummary.electric?.usageText || '-', `비용 ${utilitySummary.electric?.costText || '-'}`)}
                        ${renderOverviewUtilityChip('gas', '가스 사용량', utilitySummary.gas?.usageText || '-', `비용 ${utilitySummary.gas?.costText || '-'}`)}
                        ${renderOverviewUtilityChip('waste', '폐수 방류량', utilitySummary.waste?.usageText || '-', `비용 ${utilitySummary.waste?.costText || '-'}`)}
                        ${renderOverviewUtilityChip('production', '총생산량', utilitySummary.production?.totalAmountText || '-', utilitySummary.production?.itemCountText || '-')}
                        ${renderOverviewUtilityChip('work', '작업내역', utilitySummary.workEntryCountText || '0건', `비용 ${utilitySummary.workCostText || '-'}`)}
                    </div>
                `;
                if (hasUtilityPopup) {
                    if (utilityPopupMetric === 'work') {
                        const workPopupMonthLabel = utilityBreakdown.monthLabel || formatWorkTeamCalendarMonthOptionLabel(monthKey);
                        const workPopupHistoryHtml = renderWorkTeamCalendarGroupedHistoryHtml(dataKey, monthDateKeys);
                        utilityPopupHtml = `
                            <div class="work-team-calendar-overlay-layer">
                                <button type="button" class="work-team-calendar-overlay-backdrop" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="작업내역 팝업 닫기"></button>
                                <div class="work-team-calendar-editor is-floating is-utility-popup" data-work-team-editor>
                                    <div class="work-team-calendar-editor-head">
                                        <div class="work-team-calendar-editor-handle" data-work-team-editor-handle>
                                            <div class="work-team-calendar-editor-title">작업내역</div>
                                            <div class="work-team-calendar-editor-sub">${escapeHtml(workPopupMonthLabel + ' 정리')}</div>
                                        </div>
                                        <div class="work-team-calendar-editor-actions">
                                            <span class="work-team-calendar-editor-count">${escapeHtml(utilitySummary.workEntryCountText || '0건')}</span>
                                            <button type="button" class="work-team-calendar-editor-btn" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="작업내역 팝업 닫기"><i class="fas fa-xmark"></i>닫기</button>
                                        </div>
                                    </div>
                                    <div class="work-team-calendar-field">
                                        <div class="work-team-calendar-field-head">
                                            <span class="work-team-calendar-field-label">월간 작업내역</span>
                                        </div>
                                        <div class="work-team-calendar-utility-popup-total">
                                            <span class="work-team-calendar-utility-popup-total-value">${escapeHtml(utilitySummary.workEntryCountText || '0건')}</span>
                                            <span class="work-team-calendar-utility-popup-total-meta">${escapeHtml(`비용 ${utilitySummary.workCostText || '-'}`)}</span>
                                        </div>
                                        ${workPopupHistoryHtml || '<div class="work-team-calendar-production-empty">조회 가능한 작업내역이 없습니다.</div>'}
                                    </div>
                                </div>
                            </div>
                        `;
                    } else {
                        const utilityPopupItems = (utilityPopupMetric === 'electric'
                            ? (utilityBreakdown.electric || [])
                            : (utilityBreakdown.gas || []))
                            .filter(item => {
                                const detailRows = Array.isArray(item?.detailRows) ? item.detailRows.filter(detail => String(detail?.valueText || '').trim()) : [];
                                if (detailRows.length) return true;
                                return String(item?.valueText || '').trim() && String(item?.valueText || '').trim() !== '-';
                            });
                        const utilityPopupTitle = utilityPopupMetric === 'electric' ? '전기 사용량' : '가스 사용량';
                        const utilityPopupValue = utilityPopupMetric === 'electric'
                            ? (utilitySummary.electric?.usageText || '-')
                            : (utilitySummary.gas?.usageText || '-');
                        const utilityPopupCost = utilityPopupMetric === 'electric'
                            ? (utilitySummary.electric?.costText || '-')
                            : (utilitySummary.gas?.costText || '-');
                        const utilityPopupModeChoices = '';
                        const utilityPopupRowsHtml = utilityPopupItems.length
                            ? utilityPopupItems.map(item => {
                                const detailRows = Array.isArray(item?.detailRows)
                                    ? item.detailRows.filter(detail => String(detail?.valueText || '').trim())
                                    : [];
                                const hasDetailRows = detailRows.length > 0;
                                return `
                                    <div class="work-team-calendar-production-item${hasDetailRows ? ' is-utility-detail-card' : ''}">
                                        <div class="work-team-calendar-production-main">
                                            <div class="work-team-calendar-production-name">${escapeHtml(item.teamLabel || 'Unknown')}</div>
                                            ${hasDetailRows ? `
                                                <div class="work-team-calendar-utility-detail-list">
                                                    ${detailRows.map(detail => `
                                                        <div class="work-team-calendar-utility-detail-row">
                                                            <span class="work-team-calendar-utility-detail-label">${escapeHtml(detail.label || '')}</span>
                                                            <span class="work-team-calendar-utility-detail-value">${escapeHtml(detail.valueText || '-')}</span>
                                                            ${detail.metaText ? `<span class="work-team-calendar-utility-detail-meta">${escapeHtml(detail.metaText)}</span>` : ''}
                                                        </div>
                                                    `).join('')}
                                                </div>
                                            ` : `
                                                <div class="work-team-calendar-production-meta">${escapeHtml(item.metaText || '')}</div>
                                            `}
                                        </div>
                                        ${hasDetailRows ? '' : `<div class="work-team-calendar-production-amount">${escapeHtml(item.valueText || '-')}</div>`}
                                    </div>
                                `;
                            }).join('')
                            : `<div class="work-team-calendar-production-empty">조회 가능한 데이터가 없습니다.</div>`;
                        utilityPopupHtml = `
                            <div class="work-team-calendar-overlay-layer">
                                <button type="button" class="work-team-calendar-overlay-backdrop" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="유틸리티 팝업 닫기"></button>
                                <div class="work-team-calendar-editor is-floating is-utility-popup" data-work-team-editor>
                                    <div class="work-team-calendar-editor-head">
                                        <div class="work-team-calendar-editor-handle" data-work-team-editor-handle>
                                            <div class="work-team-calendar-editor-title">${escapeHtml(utilityPopupTitle)}</div>
                                            <div class="work-team-calendar-editor-sub">${escapeHtml((utilityBreakdown.monthLabel || formatWorkTeamCalendarMonthOptionLabel(monthKey)) + ' 상세')}</div>
                                        </div>
                                        <div class="work-team-calendar-editor-actions">
                                            <span class="work-team-calendar-editor-count">${escapeHtml(`${formatUtilNumber(utilityPopupItems.length, 0)}개`)}</span>
                                            <button type="button" class="work-team-calendar-editor-btn" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="유틸리티 팝업 닫기"><i class="fas fa-xmark"></i>닫기</button>
                                        </div>
                                    </div>
                                    <div class="work-team-calendar-field">
                                        <div class="work-team-calendar-field-head">
                                            <span class="work-team-calendar-field-label">${escapeHtml(utilityPopupTitle)} 상세</span>
                                        </div>
                                        ${utilityPopupModeChoices}
                                        <div class="work-team-calendar-utility-popup-total">
                                            <span class="work-team-calendar-utility-popup-total-value">${escapeHtml(utilityPopupValue)}</span>
                                            <span class="work-team-calendar-utility-popup-total-meta">${escapeHtml(`비용 ${utilityPopupCost}`)}</span>
                                        </div>
                                        <div class="work-team-calendar-team-groups">
                                            <div class="work-team-calendar-team-group">
                                                <div class="work-team-calendar-team-group-head">
                                                    <div class="work-team-calendar-team-group-title">${escapeHtml(utilityPopupTitle)}</div>
                                                    <div class="work-team-calendar-team-group-meta">${escapeHtml((utilityBreakdown.monthLabel || formatWorkTeamCalendarMonthOptionLabel(monthKey)) + ' 합계')}</div>
                                                </div>
                                                <div class="work-team-calendar-production-list">${utilityPopupRowsHtml}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }
                }
            }
            if (!isOverviewSummary && hasUtilityPopup && utilityPopupMetric === 'work') {
                const workPopupMonthLabel = formatWorkTeamCalendarMonthOptionLabel(monthKey);
                const workPopupHistoryHtml = renderWorkTeamCalendarGroupedHistoryHtml(dataKey, monthDateKeys);
                utilityPopupHtml = `
                    <div class="work-team-calendar-overlay-layer">
                        <button type="button" class="work-team-calendar-overlay-backdrop" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="작업내역 팝업 닫기"></button>
                        <div class="work-team-calendar-editor is-floating is-utility-popup" data-work-team-editor>
                            <div class="work-team-calendar-editor-head">
                                <div class="work-team-calendar-editor-handle" data-work-team-editor-handle>
                                    <div class="work-team-calendar-editor-title">${escapeHtml((category.title || '팀') + ' 작업내역')}</div>
                                    <div class="work-team-calendar-editor-sub">${escapeHtml(workPopupMonthLabel + ' 정리')}</div>
                                </div>
                                <div class="work-team-calendar-editor-actions">
                                    <span class="work-team-calendar-editor-count">${escapeHtml(utilitySummary.workEntryCountText || '0건')}</span>
                                    <button type="button" class="work-team-calendar-editor-btn" onclick="closeWorkTeamCalendarUtilityPopup()" aria-label="작업내역 팝업 닫기"><i class="fas fa-xmark"></i>닫기</button>
                                </div>
                            </div>
                            <div class="work-team-calendar-field">
                                <div class="work-team-calendar-field-head">
                                    <span class="work-team-calendar-field-label">월간 작업내역</span>
                                </div>
                                <div class="work-team-calendar-utility-popup-total">
                                    <span class="work-team-calendar-utility-popup-total-value">${escapeHtml(utilitySummary.workEntryCountText || '0건')}</span>
                                    <span class="work-team-calendar-utility-popup-total-meta">${escapeHtml(`비용 ${utilitySummary.workCostText || '-'}`)}</span>
                                </div>
                                ${workPopupHistoryHtml || '<div class="work-team-calendar-production-empty">조회 가능한 작업내역이 없습니다.</div>'}
                            </div>
                        </div>
                    </div>
                `;
            }
            function buildWorkTeamCalendarHistoryCueHtml(count, kpiCount) {
                const historyCount = Number(count || 0);
                const historyKpiCount = Number(kpiCount || 0);
                if (historyCount <= 0) return '';
                if (historyCount === 1 && historyKpiCount === 1) return '';
                return `<span class="work-team-calendar-day-summary">${escapeHtml(formatUtilNumber(historyCount, 0) + '건')}</span>`;
            }
            function buildWorkTeamCalendarProductionCueHtml(count, totalAmount) {
                const productionCount = Number(count || 0);
                const productionTotalAmount = Number(totalAmount || 0);
                if (productionCount <= 0) return '';
                const productionLabel = productionTotalAmount > 0
                    ? `${formatUtilNumber(productionTotalAmount, 0)}kg`
                    : `${formatUtilNumber(productionCount, 0)}품목`;
                return `<span class="work-team-calendar-day-summary">${escapeHtml(productionLabel)}</span>`;
            }
            const weekdayHtml = WORK_DAY_LABELS.map(label => `<div class="work-team-calendar-weekday">${label}</div>`).join('');
            const dayCells = monthDates.map(date => {
                const dateKey = formatDateKey(date);
                const inMonth = date.getMonth() === parsed.monthIndex;
                const isLocked = inMonth && isWorkTeamCalendarDateLocked(dateKey, todayKey);
                const productionSummary = inMonth ? (productionSummaryMap.get(dateKey) || null) : null;
                const historySummary = inMonth ? (historySummaryMap.get(dateKey) || null) : null;
                const historyCount = Number(historySummary?.count || 0);
                const historyKpiCount = Number(historySummary?.kpiCount || 0);
                const historyHasKpi = inMonth && historyKpiCount > 0;
                const hasHistory = inMonth && historyCount > 0;
                const isOffday = inMonth && !!productionSummary?.isOffday;
                const classes = [
                    'work-team-calendar-day',
                    inMonth ? '' : 'is-out',
                    dateKey === todayKey ? 'is-today' : '',
                    selectedDateKeys.includes(dateKey) ? 'is-selected' : '',
                    isLocked ? 'is-locked' : '',
                    hasHistory ? 'is-filled' : '',
                    isOffday ? 'is-offday' : ''
                ].filter(Boolean).join(' ');
                const productionCount = Number(productionSummary?.count || 0);
                const totalAmount = Number(productionSummary?.totalAmount || 0);
                const productionCueHtml = buildWorkTeamCalendarProductionCueHtml(productionCount, totalAmount);
                const historyCueHtml = hasHistory
                    ? buildWorkTeamCalendarHistoryCueHtml(historyCount, historyKpiCount)
                    : '';
                const flagParts = [];
                if (inMonth && isLocked) {
                    flagParts.push(`<span class="work-team-calendar-day-flag">잠금</span>`);
                } else {
                    if (inMonth && isOffday) {
                        flagParts.push(`<span class="work-team-calendar-day-flag is-offday"><i class="fas fa-calendar-minus"></i>휴무</span>`);
                    }
                    if (inMonth && dateKey === todayKey) {
                        flagParts.push(`<span class="work-team-calendar-day-flag">오늘</span>`);
                    }
                    if (historyHasKpi) {
                        const kpiFlagLabel = historyKpiCount > 1 ? `${historyKpiPillLabel} ${formatUtilNumber(historyKpiCount, 0)}` : historyKpiPillLabel;
                        flagParts.push(`<span class="work-team-calendar-day-flag is-kpi">${escapeHtml(kpiFlagLabel)}</span>`);
                    }
                    if (inMonth && isOffday) {
                        if (productionCueHtml) {
                            flagParts.push(productionCueHtml);
                        }
                        if (historyCueHtml) {
                            flagParts.push(historyCueHtml);
                        }
                    }
                }
                let cueHtml = '';
                if (!isOffday) {
                    if (productionCueHtml) {
                        cueHtml = productionCueHtml;
                    } else if (isLocked) {
                        cueHtml = `<span class="work-team-calendar-day-summary">\uAE30\uB85D \uC5C6\uC74C</span>`;
                    }
                    if (historyCueHtml) {
                        if (productionCueHtml) {
                            cueHtml = `${productionCueHtml}${historyCueHtml}`;
                        } else {
                            cueHtml = historyCueHtml;
                        }
                    }
                } else if (isLocked) {
                    cueHtml = `<span class="work-team-calendar-day-summary">\uAE30\uB85D \uC5C6\uC74C</span>`;
                }
                return `
                    <button type="button" class="${classes}" data-work-team-date="${inMonth ? escapeHtml(dateKey) : ''}" ${inMonth && !isLocked ? `onclick="workTeamCalendarSelectDate('${dateKey}', event)"` : 'disabled'}>
                        <div class="work-team-calendar-day-top">
                            <div class="work-team-calendar-day-main">
                                <span class="work-team-calendar-day-number">${date.getDate()}</span>
                                ${cueHtml}
                            </div>
                            <span class="work-team-calendar-day-flag-slot">${flagParts.join('') || '<span class="work-team-calendar-day-flag is-placeholder" aria-hidden="true">.</span>'}</span>
                        </div>
                    </button>
                `;
            }).join('');
            modal.innerHTML = `
                <div class="work-team-calendar-dialog ${isInline ? 'is-inline' : ''}" role="${dialogRole}" ${dialogModalAttr} aria-label="${escapeHtml(category.title)} \uCE98\uB9B0\uB354" style="--team-accent:${category.color || '#2563eb'}; --team-accent-2:${category.secondaryColor || category.color || '#38bdf8'}; --team-tint:${category.tint || '#eff6ff'};">
                    <div class="work-team-calendar-topbar">
                        <div class="work-team-calendar-head">
                            <div class="work-team-calendar-brand">
                                <div class="work-team-calendar-brand-copy">
                                    <div class="work-team-calendar-brand-title">${escapeHtml(category.title)} \uCE98\uB9B0\uB354</div>
                                    <div class="work-team-calendar-brand-sub">${escapeHtml(category.processLabel || category.title)} \u00B7 ${getWorkTeamCalendarRangeLabel()}</div>
                                </div>
                            </div>
                            ${isInline ? '' : `<div class="work-team-calendar-switches">${teamSwitchHtml}</div>`}
                            <div class="work-team-calendar-head-actions">
                                ${fullscreenToggleHtml}
                                ${isInline ? '' : `<button type="button" class="work-team-calendar-close" onclick="closeWorkTeamCalendarModal()" aria-label="\uB2EB\uAE30"><i class="fas fa-xmark"></i></button>`}
                            </div>
                        </div>
                        <div class="work-team-calendar-toolbar">
                            <div class="work-team-calendar-nav">
                                <button type="button" class="work-team-calendar-arrow" data-work-team-arrow-step="-1" onclick="workTeamCalendarMoveMonth(-1)" ${prevDisabled} aria-label="\uC774\uC804\uB2EC"><i class="fas fa-chevron-left"></i></button>
                                <select class="work-team-calendar-select" onchange="workTeamCalendarSelectYear(this.value)">${yearOptionHtml}</select>
                                <select class="work-team-calendar-select" onchange="workTeamCalendarSelectMonth(this.value)">${monthOptionHtml}</select>
                                <button type="button" class="work-team-calendar-arrow" data-work-team-arrow-step="1" onclick="workTeamCalendarMoveMonth(1)" ${nextDisabled} aria-label="\uB2E4\uC74C\uB2EC"><i class="fas fa-chevron-right"></i></button>
                                ${utilitySummaryHtmlResolved}
                            </div>
                            <div class="work-team-calendar-meta">
                                ${typeof renderWorkSaveStatusBadge === 'function' ? renderWorkSaveStatusBadge(dataKey) : `<span class="work-autosave work-save-status is-idle" data-work-save-status="${escapeHtml(dataKey)}"></span>`}
                            </div>
                        </div>
                    </div>
                    <div class="work-team-calendar-main">
                        <div class="work-team-calendar-board" data-work-team-board>
                            <div class="work-team-calendar-grid">
                                ${weekdayHtml}
                                ${dayCells}
                            </div>
                            ${detailOverlayActive ? `
                                <div class="work-team-calendar-overlay-layer">
                                    <button type="button" class="work-team-calendar-overlay-backdrop" onclick="clearWorkTeamCalendarSelection()" aria-label="선택 닫기"></button>
                                    <div class="work-team-calendar-editor is-floating ${workInputActive ? 'is-work-active' : ''}" data-work-team-editor>
                                        <div class="work-team-calendar-editor-head">
                                            <div class="work-team-calendar-editor-handle" data-work-team-editor-handle>
                                                ${detailTitle ? `<div class="work-team-calendar-editor-title">${escapeHtml(detailTitle)}</div>` : ''}
                                                ${detailSub ? `<div class="work-team-calendar-editor-sub">${escapeHtml(detailSub)}</div>` : ''}
                                            </div>
                                            <div class="work-team-calendar-editor-actions">
                                                <span class="work-team-calendar-editor-count" data-work-team-member-count>${escapeHtml(detailCountBadgeText)}</span>
                                                ${workInputActive ? `
                                                    <label class="work-team-calendar-editor-btn">
                                                        <i class="fas fa-paperclip"></i>첨부
                                                        <input type="file" class="work-team-calendar-file-input" accept=".ppt,.pptx,.xls,.xlsx,.pdf,.doc,.docx,.hwp,.hwpx" multiple onchange="handleWorkTeamCalendarAttachmentInput(this)">
                                                    </label>
                                                    <button type="button" class="work-team-calendar-editor-btn is-danger" onclick="deleteWorkTeamCalendarSelectedEntries()" ${hasSelectedEntryContent ? 'title="\uC120\uD0DD\uD55C \uC791\uC5C5\uB0B4\uC5ED\uC744 \uC0AD\uC81C\uD569\uB2C8\uB2E4."' : 'disabled title="\uC0AD\uC81C\uD560 \uC791\uC5C5\uB0B4\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4."'}><i class="fas fa-trash-can"></i>${escapeHtml(isBatchSelection ? '\uC120\uD0DD \uC0AD\uC81C' : '\uC791\uC5C5\uB0B4\uC5ED \uC0AD\uC81C')}</button>
                                                    <button type="button" class="work-team-calendar-editor-btn is-primary" onclick="completeWorkTeamCalendarEditor()"><i class="fas fa-check"></i>완료</button>
                                                    <button type="button" class="work-team-calendar-editor-btn" onclick="closeWorkTeamCalendarEditor()" aria-label="닫기"><i class="fas fa-xmark"></i></button>
                                                ` : ''}
                                            </div>
                                        </div>
                                        ${workInputActive ? `
                                            <div class="work-team-calendar-field">
                                                <div class="work-team-calendar-field-head">
                                                    <span class="work-team-calendar-field-label">인원</span>
                                                    <span class="work-team-calendar-field-hint">Ctrl+클릭으로 여러 날짜를 함께 선택할 수 있습니다.</span>
                                                </div>
                                                <div class="work-team-calendar-member-grid" data-work-team-member-grid>
                                                    ${memberToggleHtml}
                                                </div>
                                                <div class="work-team-calendar-selected-list" data-work-team-selected-list>${selectedMembersHtml}</div>
                                            </div>
                                            <div class="work-team-calendar-field is-split">
                                                <label class="work-team-calendar-field">
                                                    <span class="work-team-calendar-field-label">제목</span>
                                                    <input type="text" class="work-team-calendar-input" placeholder="제목 입력" value="${escapeHtml(draft.title)}" oninput="updateWorkTeamCalendarTitle(this.value)">
                                                </label>
                                                <div class="work-team-calendar-field">
                                                    <span class="work-team-calendar-field-label">제목 미리보기</span>
                                                    <span class="work-team-calendar-title-preview"><i class="fas fa-tag"></i><span data-work-team-title-preview>${escapeHtml(entryTitlePreview)}</span></span>
                                                </div>
                                            </div>
                                            <label class="work-team-calendar-field">
                                                <span class="work-team-calendar-field-label">작업내역</span>
                                                <textarea class="work-team-calendar-textarea is-main" placeholder="작업내역 입력" oninput="updateWorkTeamCalendarNote(this.value)">${escapeHtml(draft.note)}</textarea>
                                            </label>
                                            <div class="work-team-calendar-field">
                                                <div class="work-team-calendar-field-head">
                                                    <span class="work-team-calendar-field-label">첨부파일</span>
                                                    <span class="work-team-calendar-field-hint">작업내역 폴더를 연결해 첨부파일을 관리합니다.</span>
                                                </div>
                                                <div class="work-team-calendar-storage-actions">
                                                    <button type="button" class="work-team-calendar-attachment-btn" data-work-team-connect-btn onclick="connectWorkEntryFolderFromCalendar()"><i class="fas fa-link"></i>폴더 연결</button>
                                                    <span class="work-team-calendar-storage-status ${WorkState.workEntryRootConnected ? 'is-connected' : ''}" data-work-team-storage-status>${WorkState.workEntryRootConnected ? '폴더 연결됨' : '폴더 미연결'}</span>
                                                </div>
                                                <div class="work-team-calendar-storage-note">폴더: <strong>${escapeHtml(WORK_ENTRY_FOLDER_NAME)}</strong> / 미리보기: <strong data-work-team-file-preview>${escapeHtml(attachmentPreviewLabel)}</strong></div>
                                                <div class="work-team-calendar-attachment-list" data-work-team-attachment-list>${attachmentListHtml}</div>
                                            </div>
                                            <div class="work-team-calendar-field">
                                                <span class="work-team-calendar-field-label">특이사항</span>
                                                <textarea class="work-team-calendar-textarea is-remark" placeholder="특이사항 입력" oninput="updateWorkTeamCalendarRemark(this.value)">${escapeHtml(draft.remark)}</textarea>
                                            </div>
                                        ` : ''}
                                        ${utilityBreakdownHtml ? `
                                            <div class="work-team-calendar-field">
                                                <div class="work-team-calendar-field-head">
                                                    <span class="work-team-calendar-field-label">팀별 유틸리티 합계</span>
                                                </div>
                                                ${utilityBreakdownHtml}
                                            </div>
                                        ` : ''}
                                        ${readonlyEntriesHtml ? `
                                            <div class="work-team-calendar-field">
                                                <div class="work-team-calendar-field-head">
                                                    <span class="work-team-calendar-field-label">${isOverviewCalendar ? '통합 작업내역' : '작업내역'}</span>
                                                </div>
                                                ${readonlyEntriesHtml}
                                            </div>
                                        ` : ''}
                                        <div class="work-team-calendar-field">
                                            <div class="work-team-calendar-field-head" style="justify-content:${isOverviewCalendar ? 'space-between' : 'flex-end'};">
                                                ${isOverviewCalendar ? '<span class="work-team-calendar-field-label">팀별 생산 품목</span>' : ''}
                                                <button type="button" class="work-team-calendar-editor-btn" onclick="clearWorkTeamCalendarSelection()" aria-label="선택 해제"><i class="fas fa-xmark"></i>선택 해제</button>
                                            </div>
                                            ${productionMetricText ? `<div class="work-team-calendar-production-summary${productionMetricClass}">${escapeHtml(productionMetricText)}</div>` : ''}
                                            <div class="work-team-calendar-production-groups">${productionGroupsHtml}</div>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}
                            ${utilityPopupHtml}
                        </div>
                    </div>
                </div>
            `;
            bindWorkTeamCalendarMemberPicker(modal, dataKey, selectedDate);
            bindWorkTeamCalendarEditorOverlay(modal, dataKey);
            refreshWorkTeamCalendarStorageStatus(modal);
            syncWorkTeamCalendarInlineIndex(dataKey);
            syncWorkTeamCalendarFullscreenUi();
        }
