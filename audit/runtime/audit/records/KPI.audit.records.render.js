        function renderAuditContent(category) {
            const dataKey = category.dataKey;
            if (category?.isPlaceholder === true) {
                renderAuditPlaceholderContent(category);
                return;
            }
            const data = getAuditData(dataKey, category.title);
            if (isAuditLuxDataKey(dataKey)) {
                renderAuditLuxWorkspace(category, data);
                return;
            }
            const filter = getAuditFilterState(dataKey);
            if (typeof syncAuditLuxCurrentQuarterState === 'function') {
                syncAuditLuxCurrentQuarterState(dataKey);
            }
            const now = typeof getAuditCurrentQuarterInfo === 'function'
                ? getAuditCurrentQuarterInfo()
                : getQuarterInfo(new Date());
            const availableQuarterKeys = typeof getAuditAvailableQuarterKeys === 'function'
                ? getAuditAvailableQuarterKeys(dataKey)
                : (dataKey === 'audit_lux'
                    ? buildQuarterKeyRange(makeQuarterKey(2023, 1), makeQuarterKey(now.year, now.quarter))
                    : Array.from(new Set((data.entries || []).map(entry => makeQuarterKey(entry.year, entry.quarter))))
                        .filter(Boolean)
                        .sort());
            if (!availableQuarterKeys.length) {
                filter.startQuarter = '';
                filter.endQuarter = '';
            } else {
                if (!availableQuarterKeys.includes(filter.startQuarter)) filter.startQuarter = availableQuarterKeys[0];
                if (!availableQuarterKeys.includes(filter.endQuarter)) filter.endQuarter = availableQuarterKeys[availableQuarterKeys.length - 1];
                const normalized = normalizeQuarterRange(filter.startQuarter, filter.endQuarter);
                filter.startQuarter = normalized.start;
                filter.endQuarter = normalized.end;
            }

            const luxFilterAudit = isAuditLuxDataKey(dataKey);
            const yearStart = isAuditLuxDataKey(dataKey) ? 2023 : 2020;
            const yearEnd = now.year;
            const entryForm = getAuditEntryFormState(dataKey);
            if (!entryForm.year || entryForm.year < yearStart || entryForm.year > yearEnd) entryForm.year = now.year;
            if (!entryForm.quarter || entryForm.quarter < 1 || entryForm.quarter > 4) entryForm.quarter = now.quarter;
            const yearOptions = getYearOptionsDesc(yearStart, yearEnd, entryForm.year, '년도');
            const quarterSelectOptions = getQuarterSelectOptions(entryForm.quarter);
            const startOptions = getQuarterOptionsFromList(availableQuarterKeys, filter.startQuarter, '기간 시작');
            const endOptions = getQuarterOptionsFromList(availableQuarterKeys, filter.endQuarter, '기간 종료');
            const filterStartQuarter = parseQuarterKey(filter.startQuarter) || parseQuarterKey(availableQuarterKeys[0]) || { year: now.year, quarter: now.quarter };
            const filterEndQuarter = parseQuarterKey(filter.endQuarter) || parseQuarterKey(availableQuarterKeys[availableQuarterKeys.length - 1]) || { year: now.year, quarter: now.quarter };
            const luxStartYearOptions = luxFilterAudit ? getYearOptionsDesc(2023, now.year, filterStartQuarter.year, '시작 년도') : '';
            const luxEndYearOptions = luxFilterAudit ? getYearOptionsDesc(2023, now.year, filterEndQuarter.year, '끝 년도') : '';
            const luxStartQuarterOptions = luxFilterAudit ? getQuarterSelectOptionsForYear(availableQuarterKeys, filterStartQuarter.year, filterStartQuarter.quarter, '분기') : '';
            const luxEndQuarterOptions = luxFilterAudit ? getQuarterSelectOptionsForYear(availableQuarterKeys, filterEndQuarter.year, filterEndQuarter.quarter, '분기') : '';
            const teams = getAuditFilterTeams(dataKey);
            if (luxFilterAudit && filter.room) {
                filter.room = '';
            }
            if (filter.team && !teams.includes(filter.team)) {
                filter.team = '';
                filter.room = '';
            }
            const luxCycleTeamLabel = luxFilterAudit && (filter.team === 'Line Gamma' || filter.team === 'Line Delta')
                ? filter.team
                : '전체';
            const teamOptions = buildSelectOptions(teams, filter.team, '전체');
            const roomOptions = buildSelectOptions(getAuditFilterRooms(dataKey, filter.team), filter.room, filter.team ? '전체' : '실 선택');
            const roomDisabled = filter.team ? '' : 'disabled';
            const standards = data.standards || [];
            const isLuxAudit = isAuditLuxDataKey(dataKey);
            const luxTeamToggleHtml = luxFilterAudit ? `
                <div class="audit-team-toggle-group" role="group" aria-label="조도 팀 선택">
                    <button
                        type="button"
                        class="audit-team-toggle is-active"
                        aria-label="조도 팀 전환"
                        title="클릭할 때마다 Line Gamma, Line Delta, 전체로 전환"
                        onclick="cycleAuditLuxFilterTeam('${dataKey}')"
                    >${escapeHtml(luxCycleTeamLabel)}</button>
                </div>
            ` : '';
            let entryRooms = entryForm.team ? getEquipRooms(entryForm.team) : [];
            let entryTypes = getAuditTypeOptions(standards, entryForm.team, entryForm.room);
            let entryTeamOptions = buildSelectOptions(teams, entryForm.team, '팀 선택');
            let entryRoomOptions = buildSelectOptions(entryRooms, entryForm.room, entryForm.team ? '실 선택' : '실 선택');
            let entryTypeOptions = buildSelectOptions(entryTypes, entryForm.type, entryTypes.length ? '분류 선택' : '분류 없음');
            let luxEntryTeams = [];
            let luxEntryTeamCount = 0;
            let luxEntryTeamLabel = '팀 없음';
            let luxBatchAllRows = [];
            let luxBatchRows = [];
            if (isLuxAudit) {
                luxEntryTeams = getAuditLuxEntryTeams(dataKey, entryForm.year, entryForm.quarter);
                if (entryForm.team && !luxEntryTeams.includes(entryForm.team)) {
                    entryForm.team = '';
                    entryForm.batchActive = false;
                    entryForm.batchValues = {};
                    entryForm.batchFocusKey = '';
                    entryForm.batchShouldFocus = false;
                }
                if (!entryForm.team && luxEntryTeams.length) {
                    entryForm.team = luxEntryTeams[0];
                }
                luxEntryTeamCount = luxEntryTeams.length;
                luxEntryTeamLabel = entryForm.team || (luxEntryTeams[0] || '팀 없음');
                luxBatchAllRows = getAuditLuxBatchRows(dataKey);
                if (!String(entryForm.note || '').trim()) {
                    const existingNote = luxBatchAllRows.find(item => String(item.note || '').trim())?.note || '';
                    if (existingNote) entryForm.note = existingNote;
                }
                if (entryForm.batchActive) {
                    luxBatchRows = luxBatchAllRows;
                }
                if (!luxEntryTeams.length) {
                    entryForm.team = '';
                    entryForm.batchActive = false;
                }
            } else {
                entryRooms = entryForm.team ? getEquipRooms(entryForm.team) : [];
                if (entryForm.room && !entryRooms.includes(entryForm.room)) entryForm.room = '';
                entryTypes = getAuditTypeOptions(standards, entryForm.team, entryForm.room);
                if (entryForm.type && !entryTypes.includes(entryForm.type)) entryForm.type = '';
                entryTeamOptions = buildSelectOptions(teams, entryForm.team, '팀 선택');
                entryRoomOptions = buildSelectOptions(entryRooms, entryForm.room, entryForm.team ? '실 선택' : '실 선택');
                entryTypeOptions = buildSelectOptions(entryTypes, entryForm.type, entryTypes.length ? '분류 선택' : '분류 없음');
            }
            const standardForm = getAuditStandardFormState(dataKey);
            if (standardForm.team && !teams.includes(standardForm.team)) standardForm.team = '';
            const standardRooms = standardForm.team ? getEquipRooms(standardForm.team) : [];
            if (standardForm.room && !standardRooms.includes(standardForm.room)) standardForm.room = '';
            const standardTeamOptions = buildSelectOptions(teams, standardForm.team, '팀 선택');
            const standardRoomOptions = buildSelectOptions(standardRooms, standardForm.room, standardForm.team ? '실 선택' : '실 선택');
            const standardsOpen = isAuditStandardsOpen(dataKey);
            const standardsToggleLabel = standardsOpen ? '기준 접기' : '기준 보기';
            const standardsBody = standards.length ? `
                <div class="audit-standards-head">
                    <span>팀</span>
                    <span>작업장/실</span>
                    <span>측정 구역</span>
                    <span>조도 기준 (Lux)</span>
                    <span></span>
                </div>
                ${standards.map((item, idx) => `
                    <div class="audit-standards-row">
                        ${renderAuditTeamChip(item.team)}
                        <span class="audit-room-chip">${escapeHtml(item.room || '')}</span>
                        <span class="audit-type-text">${escapeHtml(item.type || item.zone || '')}</span>
                        <span class="audit-standard-pill">${escapeHtml(item.standard || '')}</span>
                        <div class="audit-action-menu" id="audit-standard-action-${dataKey}-${idx}" onclick="event.stopPropagation()">
                            <button class="work-btn audit-action-btn" onclick="toggleAuditMenuById('audit-standard-action-${dataKey}-${idx}', event)">
                                관리 <i class="fas fa-chevron-down"></i>
                            </button>
                            <div class="audit-action-panel">
                                <button class="audit-action-item" onclick="editAuditStandard('${dataKey}', ${idx}); event.stopPropagation();">수정</button>
                                <button class="audit-action-item" onclick="removeAuditStandard('${dataKey}', ${idx}); event.stopPropagation();">삭제</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            ` : `<div class="audit-standards-empty">등록된 기준이 없습니다.</div>`;
            const defaultStatusHtml = renderAuditStatusBadge({ state: 'none', label: '기준 없음' });
            const luxBatchCanOpen = isLuxAudit && !!String(entryForm.team || '').trim() && (luxBatchAllRows.length > 0);
            const luxBatchToggleLabel = '기입';
            const luxBatchSummary = isLuxAudit && entryForm.team
                ? `${entryForm.year}년 ${entryForm.quarter}분기 ${entryForm.team}`
                : '선택 대상 없음';
            const luxPreviewHtml = isLuxAudit
                ? renderAuditLuxEntryPreviewHtml(dataKey, entryForm.year, entryForm.team)
                : '';
            const luxBatchRowsHtml = isLuxAudit && entryForm.batchActive
                ? (luxBatchRows.length
                    ? luxBatchRows.map((item, idx) => {
                        const standardValue = parseFloat(item.standard);
                        const status = getAuditValueStatus(item.value, Number.isNaN(standardValue) ? null : { value: standardValue, label: item.standard });
                        const isBelowStandard = status.state === 'fail';
                        return `
                            <div class="audit-lux-batch-row ${isBelowStandard ? 'is-fail' : ''}">
                                <div class="audit-lux-batch-order">${item.order}</div>
                                <div class="audit-lux-batch-copy">
                                    <div class="audit-lux-batch-room">${escapeHtml(item.room || '')}</div>
                                    <div class="audit-lux-batch-type">${escapeHtml(item.type || '')}</div>
                                </div>
                                <div class="audit-lux-batch-standard">${escapeHtml(item.standard || '-')}</div>
                                <div class="audit-lux-batch-field">
                                    <input
                                        class="audit-input audit-lux-batch-input ${isBelowStandard ? 'is-fail' : ''}"
                                        id="audit-lux-input-${dataKey}-${idx}"
                                        data-audit-lux-input="${dataKey}"
                                        data-row-key="${escapeHtml(item.rowKey)}"
                                        data-standard-value="${escapeHtml(item.standard || '')}"
                                        data-standard-label="${escapeHtml(item.standard || '')}"
                                        placeholder="Lux"
                                        value="${escapeHtml(item.value || '')}"
                                    />
                                    <div class="audit-lux-batch-feedback ${isBelowStandard ? 'is-fail' : ''}" data-audit-lux-feedback>${isBelowStandard ? '기준치 미달' : ''}</div>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : `<div class="audit-standards-empty">선택한 팀에 등록된 조도 기준이 없습니다.</div>`)
                : '';
            const evidenceList = getAuditEvidenceList(dataKey);
            const evidenceApplied = !!AuditState.evidenceApplied?.[dataKey];
            const evidenceFiltered = evidenceApplied ? filterAuditEvidence(evidenceList, filter) : [];
            AuditState.evidenceCache[dataKey] = evidenceFiltered.slice();
            initAuditEvidenceState(dataKey, evidenceFiltered);
            const evidenceTeams = Array.from(new Set((evidenceFiltered || []).map(item => item.team).filter(Boolean)));
            const evidenceOpenState = AuditState.evidenceOpen[dataKey] || {};
            const hasSelection = !!AuditState.evidenceSelected[dataKey];
            const selectionValid = hasSelection && evidenceFiltered.some(item => item.id === AuditState.evidenceSelected[dataKey]);
            if (evidenceApplied && evidenceFiltered.length && !selectionValid) {
                AuditState.evidenceSelected[dataKey] = evidenceFiltered[0].id;
            }
            if (!evidenceApplied) {
                AuditState.evidenceSelected[dataKey] = '';
            }
            const selectedEvidenceId = AuditState.evidenceSelected[dataKey];
            const selectedEvidence = evidenceFiltered.find(item => item.id === selectedEvidenceId);
            const evidencePreviewHtml = evidenceApplied
                ? (selectedEvidence
                    ? renderAuditEvidencePreviewHtml(dataKey, selectedEvidence)
                    : (evidenceFiltered.length
                        ? `<div class="audit-ref-empty">좌측에서 항목을 선택하세요.</div>`
                        : `<div class="audit-ref-empty">검색 결과가 없습니다.</div>`))
                : `<div class="audit-ref-empty">검색 후 표시됩니다.</div>`;
            const evidenceGroupsHtml = evidenceApplied ? evidenceTeams.map(team => {
                const items = evidenceFiltered
                    .filter(item => item.team === team)
                    .sort((a, b) => (b.year || 0) - (a.year || 0));
                const groupId = `audit-evidence-${dataKey}-${encodeURIComponent(team)}`;
                const isOpen = !!evidenceOpenState[team];
                return `
                    <div class="audit-evidence-group ${isOpen ? '' : 'is-collapsed'}" id="${groupId}">
                        <button class="audit-evidence-toggle" onclick="toggleAuditEvidenceGroup('${dataKey}', '${encodeURIComponent(team)}', '${groupId}')">
                            <span>${escapeHtml(team)} 스캔본</span>
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="audit-evidence-list">
                            ${items.map(item => `
                                <button class="audit-evidence-item ${item.id === selectedEvidenceId ? 'is-selected' : ''}" data-evidence-item data-evidence-id="${item.id}" onclick="selectAuditEvidence('${dataKey}', '${encodeURIComponent(item.id)}')">
                                    <span class="audit-evidence-date">${item.year ? item.year + '년' : ''}</span>
                                    <span class="audit-evidence-team">${escapeHtml(item.team || '')}</span>
                                </button>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('') : '';
            const evidenceSectionHtml = `
                    <div class="audit-section audit-section-evidence">
                        <div class="audit-section-header">
                            <div class="audit-section-title">
                                <span class="audit-section-icon"><i class="fas fa-folder-open"></i></span>
                                <span>조도 근거자료</span>
                            </div>
                        <div class="audit-standards-controls">
                            <span class="audit-badge">총 ${evidenceApplied ? evidenceFiltered.length : 0}건</span>
                            <button class="work-btn" onclick="printAuditEvidence('${dataKey}')">스캔본 인쇄</button>
                        </div>
                        </div>
                    <div class="audit-section-body">
                        <div class="audit-reference" data-audit-evidence="${dataKey}">
                            <div class="audit-ref-card">
                                <div class="audit-ref-title">스캔본 목록</div>
                                <div class="audit-evidence-groups">
                                    ${evidenceApplied ? (evidenceGroupsHtml || `<div class="audit-ref-empty">검색 결과가 없습니다.</div>`) : `<div class="audit-ref-empty">검색 후 표시됩니다.</div>`}
                                </div>
                            </div>
                            <div class="audit-ref-card">
                                <div class="audit-ref-title">스캔본 결과</div>
                                <div class="audit-ref-media ${selectedEvidence ? 'has-image' : ''}" data-evidence-preview>
                                    ${evidencePreviewHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const enriched = data.entries
                .map((entry, index) => ({ entry, index }))
                .filter(({ entry }) => auditEntryMatches(entry, filter))
                .map(({ entry, index }) => {
                    const standardInfo = getAuditStandardInfo(standards, entry.team, entry.room, entry.type);
                    const status = getAuditValueStatus(entry.value, standardInfo);
                    return { entry, status, index };
                });
            const failCount = enriched.filter(item => item.status.state === 'fail').length;
            const filteredEnriched = filter.onlyFail ? enriched.filter(item => item.status.state === 'fail') : enriched;
            const teamPriority = (team) => {
                if (team === 'Line Gamma') return 0;
                if (team === 'Line Delta') return 1;
                return 2;
            };
            const sortedFiltered = filteredEnriched.slice().sort((a, b) => {
                const teamA = a.entry.team || '';
                const teamB = b.entry.team || '';
                const teamDiff = teamPriority(teamA) - teamPriority(teamB);
                if (teamDiff !== 0) return teamDiff;
                if (teamA !== teamB) return teamA.localeCompare(teamB);
                const aIdx = quarterIndex(makeQuarterKey(a.entry.year, a.entry.quarter));
                const bIdx = quarterIndex(makeQuarterKey(b.entry.year, b.entry.quarter));
                if (aIdx !== bIdx) return (aIdx ?? 0) - (bIdx ?? 0);
                const roomDiff = (a.entry.room || '').localeCompare(b.entry.room || '');
                if (roomDiff !== 0) return roomDiff;
                return (a.entry.type || '').localeCompare(b.entry.type || '');
            });
            const rows = sortedFiltered.length ? sortedFiltered.map((item) => {
                const entry = item.entry;
                const key = makeQuarterKey(entry.year, entry.quarter);
                const status = item.status;
                const statusBadge = renderAuditStatusBadge(status);
                return `
                    <tr>
                        <td>${escapeHtml(key)}</td>
                        <td>${escapeHtml(entry.team || '')}</td>
                        <td>${escapeHtml(entry.room || '')}</td>
                        <td>${escapeHtml(entry.type || '')}</td>
                        <td>
                            <div class="audit-value-cell">
                                <span>${escapeHtml(entry.value || '')}</span>
                                ${statusBadge}
                            </div>
                        </td>
                        <td>${escapeHtml(entry.note || '')}</td>
                        <td>
                            <div class="audit-action-menu" id="audit-action-${dataKey}-${item.index}" onclick="event.stopPropagation()">
                                <button class="work-btn audit-action-btn" onclick="toggleAuditMenuById('audit-action-${dataKey}-${item.index}', event)">
                                    관리 <i class="fas fa-chevron-down"></i>
                                </button>
                                <div class="audit-action-panel">
                                    <button class="audit-action-item" onclick="editAuditEntry('${dataKey}', ${item.index}); event.stopPropagation();">수정</button>
                                    <button class="audit-action-item" onclick="removeAuditEntry('${dataKey}', ${item.index}); event.stopPropagation();">삭제</button>
                                </div>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('') : `
                <tr><td colspan="7">데이터가 없습니다.</td></tr>
            `;
            AuditState.printCache[dataKey] = {
                range: `${filter.startQuarter} ~ ${filter.endQuarter}`,
                total: sortedFiltered.length,
                filters: { ...filter },
                rows: sortedFiltered.map(item => item.entry)
            };

            const contentContainer = document.getElementById('content-container');
            contentContainer.innerHTML = `
                <div class="border-b pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-8 rounded-sm inline-block" style="background:${category.color || '#f59e0b'};"></span>
                        ${category.title}
                    </h2>
                    <p class="text-slate-500 mt-1 pl-4 text-sm">${category.desc || ''}</p>
                </div>
                <div class="audit-panel">
                    <div class="audit-section audit-section-filter">
                        <div class="audit-section-header">
                            <div class="audit-section-title">
                                <span class="audit-section-icon"><i class="fas fa-filter"></i></span>
                                <span>기간별 검색</span>
                            </div>
                            <span class="audit-badge">총 ${sortedFiltered.length}건</span>
                        </div>
                        <div class="audit-section-body">
                            <div class="audit-filters">
                                ${luxFilterAudit ? `
                                    <div class="audit-quarter-range">
                                        <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="updateAuditFilterQuarterPart('${dataKey}', 'start', 'year', this.value)">${luxStartYearOptions}</select>
                                        <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="updateAuditFilterQuarterPart('${dataKey}', 'start', 'quarter', this.value)">${luxStartQuarterOptions}</select>
                                        <span class="audit-quarter-range-sep">~</span>
                                        <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="updateAuditFilterQuarterPart('${dataKey}', 'end', 'year', this.value)">${luxEndYearOptions}</select>
                                        <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="updateAuditFilterQuarterPart('${dataKey}', 'end', 'quarter', this.value)">${luxEndQuarterOptions}</select>
                                    </div>
                                    ${luxTeamToggleHtml}
                                ` : `
                                    <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="setAuditFilter('${dataKey}', 'startQuarter', this.value)">${startOptions}</select>
                                    <select class="audit-select" ${availableQuarterKeys.length ? '' : 'disabled'} onchange="setAuditFilter('${dataKey}', 'endQuarter', this.value)">${endOptions}</select>
                                    <select class="audit-select" onchange="setAuditFilter('${dataKey}', 'team', this.value)">${teamOptions}</select>
                                    <select class="audit-select" ${roomDisabled} onchange="setAuditFilter('${dataKey}', 'room', this.value)">${roomOptions}</select>
                                `}
                                <div class="audit-filter-actions">
                                    <button class="work-btn audit-search-btn" onclick="applyAuditFilter('${dataKey}')"><i class="fas fa-magnifying-glass"></i>검색</button>
                                    <button class="work-btn primary" onclick="printAuditLux('${dataKey}')">인쇄/PDF</button>
                                </div>
                                <label class="audit-fail-toggle">
                                    <input type="checkbox" ${filter.onlyFail ? 'checked' : ''} onchange="setAuditFilter('${dataKey}', 'onlyFail', this.checked); applyAuditFilter('${dataKey}')" />
                                    <span>기준 미달 (${failCount}건)</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    <div class="audit-section audit-section-entry">
                        <div class="audit-section-header">
                            <div class="audit-section-title">
                                <span class="audit-section-icon"><i class="fas fa-pen"></i></span>
                                <span>값 기입</span>
                            </div>
                        </div>
                        <div class="audit-section-body">
                            <div class="audit-entry-grid">
                                <div class="audit-entry-card">
                                    <div class="audit-entry-card-header">
                                        <span class="audit-section-icon"><i class="fas fa-sun"></i></span>
                                        <span>조도 값 기입</span>
                                        ${isLuxAudit ? `
                                            <button
                                                type="button"
                                                class="audit-help-toggle"
                                                id="audit-notice-toggle-${dataKey}"
                                                aria-expanded="false"
                                                aria-controls="audit-notice-panel-${dataKey}"
                                                onclick="toggleAuditNotice('${dataKey}')"
                                                title="주의사항 보기"
                                            >?</button>
                                        ` : ''}
                                    </div>
                                    ${isLuxAudit ? `
                                        <div class="audit-notice audit-help-panel" id="audit-notice-panel-${dataKey}">
                                            <div class="audit-help-panel-header">
                                                <div class="audit-notice-header">
                                                    <span class="audit-notice-icon"><i class="fa-solid fa-circle-dot"></i></span>
                                                    <div>
                                                        <div class="audit-notice-title">조도 측정 주의사항</div>
                                                        <div class="audit-notice-sub">측정 기준을 동일하게 유지하세요.</div>
                                                    </div>
                                                </div>
                                                <button type="button" class="audit-help-close" onclick="toggleAuditNotice('${dataKey}')">닫기</button>
                                            </div>
                                            <div class="audit-notice-list">
                                                <div class="audit-notice-item">
                                                    <span class="audit-notice-chip"><i class="fa-solid fa-bullseye"></i></span>
                                                    <div>
                                                        <div class="audit-notice-label">조도계 사용</div>
                                                        <div class="audit-notice-desc">측정 시 조도계 센서를 정확히 고정합니다.</div>
                                                    </div>
                                                </div>
                                                <div class="audit-notice-item">
                                                    <span class="audit-notice-chip" style="background:#fef3c7;color:#b45309;"><i class="fa-solid fa-ruler-vertical"></i></span>
                                                    <div>
                                                        <div class="audit-notice-label">측정 높이 기준</div>
                                                        <div class="audit-notice-desc">바닥으로부터 0.6 ~ 1.0 m 범위에서 측정합니다.</div>
                                                    </div>
                                                </div>
                                                <div class="audit-notice-item">
                                                    <span class="audit-notice-chip" style="background:#dcfce7;color:#166534;"><i class="fa-solid fa-calendar-check"></i></span>
                                                    <div>
                                                        <div class="audit-notice-label">정기 검교정</div>
                                                        <div class="audit-notice-desc">조도계 연 1회 검교정을 실시합니다.</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ` : ''}
                                    <div class="audit-add">
                                        ${isLuxAudit ? `
                                            <div class="audit-add-row audit-lux-launch-row">
                                                <select class="audit-select" id="audit-year">${yearOptions}</select>
                                                <select class="audit-select" id="audit-quarter">${quarterSelectOptions}</select>
                                                <div class="audit-team-toggle-group" role="group" aria-label="조도 값 기입 팀 선택">
                                                    <button
                                                        type="button"
                                                        class="audit-team-toggle ${luxEntryTeamCount ? 'is-active' : ''}"
                                                        id="audit-lux-entry-team-toggle-${dataKey}"
                                                        title="${luxEntryTeamCount > 1 ? '클릭할 때마다 Line Gamma과 Line Delta이 전환됩니다.' : ''}"
                                                        onclick="cycleAuditLuxEntryTeam('${dataKey}')"
                                                        ${luxEntryTeamCount ? '' : 'disabled'}
                                                    >${escapeHtml(luxEntryTeamLabel)}</button>
                                                </div>
                                                <button class="work-btn primary" type="button" id="audit-lux-batch-toggle-${dataKey}" ${luxBatchCanOpen ? '' : 'disabled'}>${luxBatchToggleLabel}</button>
                                            </div>
                                            ${entryForm.batchActive ? `
                                                <div class="audit-lux-modal" id="audit-lux-modal-${dataKey}">
                                                    <button class="audit-lux-modal-backdrop" type="button" onclick="toggleAuditLuxBatchEntry('${dataKey}')" aria-label="조도 값 기입 닫기"></button>
                                                    <div class="audit-lux-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-lux-modal-title-${dataKey}">
                                                        <div class="audit-lux-modal-header">
                                                            <div class="audit-lux-modal-copy">
                                                                <span class="audit-lux-batch-summary-label">입력 대상</span>
                                                                <strong id="audit-lux-modal-title-${dataKey}">${escapeHtml(luxBatchSummary)}</strong>
                                                                <div class="audit-lux-batch-tip">엔터로 다음 칸 이동, 마지막 칸에서 자동 저장, 기준치 미달도 저장 가능</div>
                                                            </div>
                                                            <div class="audit-filter-actions">
                                                                <button class="work-btn primary" type="button" onclick="saveAuditLuxBatchEntries('${dataKey}')">일괄 저장</button>
                                                                <button class="work-btn" type="button" onclick="toggleAuditLuxBatchEntry('${dataKey}')">닫기</button>
                                                            </div>
                                                        </div>
                                                        <div class="audit-lux-modal-body">
                                                            <div class="audit-lux-modal-layout">
                                                                <div class="audit-lux-preview-panel">
                                                                    ${luxPreviewHtml}
                                                                </div>
                                                                <div class="audit-lux-batch">
                                                                    <div class="audit-lux-batch-list">
                                                                        ${luxBatchRowsHtml}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="audit-lux-modal-footer">
                                                            <label class="audit-lux-note-field" for="audit-note-${dataKey}">
                                                                <span class="audit-lux-note-label">특이사항</span>
                                                                <textarea class="audit-input audit-note-area" id="audit-note-${dataKey}" placeholder="입력한 항목에 공통으로 적용할 특이사항">${escapeHtml(entryForm.note || '')}</textarea>
                                                            </label>
                                                        </div>
                                                    </div>
                                                </div>
                                            ` : `
                                                <div class="audit-standards-hint">년도, 분기를 고른 뒤 팀 토글을 확인하고 기입을 누르면 전체화면에서 스캔본 순서대로 값을 넣을 수 있습니다.</div>
                                            `}
                                        ` : `
                                            <div class="audit-add-row audit-entry-selects">
                                                <select class="audit-select" id="audit-year">${yearOptions}</select>
                                                <select class="audit-select" id="audit-quarter">${quarterSelectOptions}</select>
                                                <select class="audit-select" id="audit-team">${entryTeamOptions}</select>
                                                <select class="audit-select" id="audit-room" ${entryForm.team ? '' : 'disabled'}>${entryRoomOptions}</select>
                                                <select class="audit-select" id="audit-type" ${entryTypes.length ? '' : 'disabled'}>${entryTypeOptions}</select>
                                            </div>
                                            <div class="audit-add-row value-row">
                                                <div class="audit-value-wrap">
                                                    <div class="audit-value-field">
                                                        <input class="audit-input" id="audit-value" placeholder="값" value="${escapeHtml(entryForm.value || '')}" />
                                                    </div>
                                                    <div id="audit-value-status">${defaultStatusHtml}</div>
                                                </div>
                                                <button class="work-btn primary" onclick="addAuditEntry('${dataKey}')">추가</button>
                                            </div>
                                            <div class="audit-add-row">
                                                <button class="work-btn" onclick="toggleAuditNote('${dataKey}')">특이사항</button>
                                            </div>
                                        `}
                                        ${isLuxAudit ? '' : `
                                            <div class="audit-note-panel ${entryForm.note ? 'open' : ''}" id="audit-note-panel-${dataKey}">
                                                <textarea class="audit-input audit-note-area" id="audit-note-${dataKey}" placeholder="특이사항">${escapeHtml(entryForm.note || '')}</textarea>
                                            </div>
                                        `}
                                    </div>
                                    <div class="audit-unit">단위: Lux</div>
                                </div>
                                <div class="audit-entry-card">
                                    <div class="audit-entry-card-header">
                                        <span class="audit-section-icon"><i class="fas fa-layer-group"></i></span>
                                        <span>분류 / 기준 값 기입</span>
                                    </div>
                                    <div class="audit-add">
                                        <div class="audit-add-row type-add-row">
                                            <div class="audit-type-add">
                                                <select class="audit-select" id="audit-standard-team">${standardTeamOptions}</select>
                                                <select class="audit-select" id="audit-standard-room" ${standardForm.team ? '' : 'disabled'}>${standardRoomOptions}</select>
                                                <input class="audit-input" id="audit-standard-type" placeholder="분류" value="${escapeHtml(standardForm.type || '')}" />
                                                <input class="audit-input" id="audit-standard-value" placeholder="기준값 (Lux)" value="${escapeHtml(standardForm.standard || '')}" />
                                            </div>
                                            <button class="work-btn" onclick="addAuditTypeStandard('${dataKey}')">추가</button>
                                        </div>
                                        <div class="audit-standards-hint">팀/실/분류/기준값을 입력한 뒤 추가하세요.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    ${evidenceSectionHtml}
                    <div class="audit-standards ${standardsOpen ? '' : 'is-collapsed'}" data-audit-standards="${dataKey}">
                        <div class="audit-standards-header">
                            <div>
                                <div class="audit-standards-title">측정 기준</div>
                                <div class="audit-standards-sub">측정 구역별 기준(Lux)을 입력하세요.</div>
                            </div>
                            <div class="audit-standards-controls">
                                <span class="audit-badge">총 ${standards.length}건</span>
                                <button class="work-btn audit-standards-toggle" onclick="toggleAuditStandards('${dataKey}')">
                                    <i class="fas fa-plus"></i>
                                    <i class="fas fa-minus"></i>
                                    <span>${standardsToggleLabel}</span>
                                </button>
                            </div>
                        </div>
                        <div class="audit-standards-body">
                            <div class="audit-standards-table">
                                ${standardsBody}
                            </div>
                        </div>
                    </div>
                    <table class="audit-table">
                        <thead>
                            <tr>
                                <th>분기</th>
                                <th>팀</th>
                                <th>실</th>
                                <th>분류</th>
                                <th>값 (Lux)</th>
                                <th>특이사항</th>
                                <th>관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rows}
                        </tbody>
                    </table>
                </div>
            `;

            const teamSelect = document.getElementById('audit-team');
            const roomSelect = document.getElementById('audit-room');
            const typeSelect = document.getElementById('audit-type');
            const yearSelect = document.getElementById('audit-year');
            const quarterSelect = document.getElementById('audit-quarter');
            const noteEl = document.getElementById(`audit-note-${dataKey}`);
            if (noteEl) {
                noteEl.addEventListener('input', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.note = noteEl.value;
                });
            }
            const standardTeamSelect = document.getElementById('audit-standard-team');
            const standardRoomSelect = document.getElementById('audit-standard-room');
            const standardTypeInput = document.getElementById('audit-standard-type');
            const standardValueInput = document.getElementById('audit-standard-value');
            if (standardTeamSelect) {
                standardTeamSelect.addEventListener('change', () => {
                    const standardForm = getAuditStandardFormState(dataKey);
                    standardForm.team = standardTeamSelect.value;
                    standardForm.room = '';
                    const rooms = getEquipRooms(standardTeamSelect.value);
                    if (standardRoomSelect) {
                        standardRoomSelect.innerHTML = buildSelectOptions(rooms, '', rooms.length ? '실 선택' : '실 목록 없음');
                        standardRoomSelect.disabled = rooms.length === 0;
                    }
                });
            }
            if (standardRoomSelect) {
                standardRoomSelect.addEventListener('change', () => {
                    const standardForm = getAuditStandardFormState(dataKey);
                    standardForm.room = standardRoomSelect.value;
                });
            }
            if (standardTypeInput) {
                standardTypeInput.addEventListener('input', () => {
                    const standardForm = getAuditStandardFormState(dataKey);
                    standardForm.type = standardTypeInput.value;
                });
            }
            if (standardValueInput) {
                standardValueInput.addEventListener('input', () => {
                    const standardForm = getAuditStandardFormState(dataKey);
                    standardForm.standard = standardValueInput.value;
                });
            }
            if (yearSelect) {
                yearSelect.addEventListener('change', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.year = parseInt(yearSelect.value, 10) || entryForm.year;
                    if (isLuxAudit) {
                        entryForm.team = '';
                        entryForm.note = '';
                        entryForm.batchActive = false;
                        entryForm.batchValues = {};
                        entryForm.batchFocusKey = '';
                        entryForm.batchShouldFocus = false;
                        const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
                        if (category) renderAuditContent(category);
                    }
                });
            }
            if (quarterSelect) {
                quarterSelect.addEventListener('change', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.quarter = parseInt(quarterSelect.value, 10) || entryForm.quarter;
                    if (isLuxAudit) {
                        entryForm.team = '';
                        entryForm.note = '';
                        entryForm.batchActive = false;
                        entryForm.batchValues = {};
                        entryForm.batchFocusKey = '';
                        entryForm.batchShouldFocus = false;
                        const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
                        if (category) renderAuditContent(category);
                    }
                });
            }
            if (isLuxAudit) {
                const luxBatchToggle = document.getElementById(`audit-lux-batch-toggle-${dataKey}`);
                if (luxBatchToggle) {
                    luxBatchToggle.addEventListener('click', () => {
                        toggleAuditLuxBatchEntry(dataKey);
                    });
                }
                const batchInputs = Array.from(document.querySelectorAll(`[data-audit-lux-input="${dataKey}"]`));
                batchInputs.forEach((input, index) => {
                    updateAuditLuxBatchInputStatus(input);
                    input.addEventListener('input', () => {
                        const entryState = getAuditEntryFormState(dataKey);
                        entryState.batchValues = entryState.batchValues || {};
                        entryState.batchValues[input.dataset.rowKey || ''] = input.value;
                        updateAuditLuxBatchInputStatus(input);
                    });
                    input.addEventListener('keydown', (event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        const nextInput = batchInputs[index + 1];
                        if (nextInput) {
                            nextInput.focus();
                            nextInput.select();
                            return;
                        }
                        saveAuditLuxBatchEntries(dataKey);
                    });
                });
                if (entryForm.batchActive && batchInputs.length && entryForm.batchShouldFocus) {
                    const targetInput = batchInputs.find(input => input.dataset.rowKey === entryForm.batchFocusKey) || batchInputs[0];
                    if (targetInput) {
                        targetInput.focus();
                        targetInput.select();
                    }
                    entryForm.batchShouldFocus = false;
                    entryForm.batchFocusKey = '';
                }
                return;
            }
            if (teamSelect && roomSelect) {
                teamSelect.addEventListener('change', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.team = teamSelect.value;
                    entryForm.room = '';
                    entryForm.type = '';
                    const rooms = getEquipRooms(teamSelect.value);
                    roomSelect.innerHTML = buildSelectOptions(rooms, '', rooms.length ? '실 선택' : '실 목록 없음');
                    roomSelect.disabled = rooms.length === 0;
                    const types = getAuditTypeOptions(standards, teamSelect.value, roomSelect.value);
                    typeSelect.innerHTML = buildSelectOptions(types, '', types.length ? '분류 선택' : '분류 없음');
                    typeSelect.disabled = types.length === 0;
                    updateAuditValueStatus(dataKey);
                });
            }
            if (roomSelect && typeSelect) {
                roomSelect.addEventListener('change', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.room = roomSelect.value;
                    entryForm.type = '';
                    const types = getAuditTypeOptions(standards, teamSelect?.value, roomSelect.value);
                    typeSelect.innerHTML = buildSelectOptions(types, '', types.length ? '분류 선택' : '분류 없음');
                    typeSelect.disabled = types.length === 0;
                    updateAuditValueStatus(dataKey);
                });
                typeSelect.addEventListener('change', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.type = typeSelect.value;
                    updateAuditValueStatus(dataKey);
                });
            }
            const valueEl = document.getElementById('audit-value');
            if (valueEl) {
                valueEl.addEventListener('input', () => {
                    const entryForm = getAuditEntryFormState(dataKey);
                    entryForm.value = valueEl.value;
                    updateAuditValueStatus(dataKey);
                });
            }
            updateAuditValueStatus(dataKey);
        }

        function toggleAuditLuxBatchEntry(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const entryForm = getAuditEntryFormState(dataKey);
            if (!entryForm.batchActive) {
                const team = String(entryForm.team || '').trim();
                const batchRows = getAuditLuxBatchRows(dataKey);
                if (!entryForm.year || !entryForm.quarter || !team || !batchRows.length) return;
            }
            entryForm.batchActive = !entryForm.batchActive;
            entryForm.batchShouldFocus = entryForm.batchActive;
            if (!entryForm.batchActive) {
                entryForm.batchFocusKey = '';
            }
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function updateAuditLuxBatchInputStatus(input) {
            if (!input) return;
            const rowEl = input.closest('.audit-lux-batch-row');
            const feedbackEl = input.parentElement?.querySelector('[data-audit-lux-feedback]');
            const standardText = String(input.dataset.standardValue || '').trim();
            const numericStandard = parseFloat(standardText);
            const standardInfo = Number.isNaN(numericStandard) ? null : { value: numericStandard, label: String(input.dataset.standardLabel || standardText) };
            const status = getAuditValueStatus(input.value, standardInfo);
            const isBelowStandard = status.state === 'fail';
            input.classList.toggle('is-fail', isBelowStandard);
            if (rowEl) rowEl.classList.toggle('is-fail', isBelowStandard);
            if (feedbackEl) {
                feedbackEl.textContent = isBelowStandard ? '기준치 미달' : '';
                feedbackEl.classList.toggle('is-fail', isBelowStandard);
            }
        }

        function saveAuditLuxBatchEntries(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const entryForm = getAuditEntryFormState(dataKey);
            const year = Number(entryForm.year);
            const quarter = Number(entryForm.quarter);
            const team = String(entryForm.team || '').trim();
            if (!year || !quarter || !team) return;
            const data = getAuditData(dataKey);
            const batchRows = getAuditLuxBatchRows(dataKey);
            if (!batchRows.length) return;
            const noteEl = document.getElementById(`audit-note-${dataKey}`);
            const appliedNote = String(noteEl?.value || entryForm.note || '').trim();
            const batchInputs = Array.from(document.querySelectorAll(`[data-audit-lux-input="${dataKey}"]`));
            const inputMap = new Map(batchInputs.map(input => [String(input.dataset.rowKey || ''), String(input.value || '').trim()]));
            const targetRowKeys = new Set(batchRows.map(item => item.rowKey));
            const preservedEntries = (Array.isArray(data.entries) ? data.entries : []).filter(entry => {
                if (Number(entry?.year) !== year) return true;
                if (Number(entry?.quarter) !== quarter) return true;
                if (String(entry?.team || '').trim() !== team) return true;
                return !targetRowKeys.has(makeAuditLuxBatchRowKey(entry.team, entry.room, entry.type));
            });
            const nextEntries = batchRows.reduce((acc, row) => {
                const value = inputMap.get(row.rowKey) || '';
                if (!value) return acc;
                acc.push({
                    year,
                    quarter,
                    team,
                    room: row.room,
                    type: row.type,
                    value,
                    note: appliedNote
                });
                return acc;
            }, []);
            data.entries = preservedEntries.concat(nextEntries);
            if (!saveAuditData(dataKey, data)) return;
            entryForm.note = appliedNote;
            entryForm.batchValues = {};
            entryForm.batchShouldFocus = false;
            entryForm.batchFocusKey = '';
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
        }

        function renderAuditPlaceholderContent(category) {
            const contentContainer = document.getElementById('content-container');
            if (!contentContainer) return;
            const placeholderHtml = String(category?.content || '').trim() || `
                <div class="p-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-600">
                    추후 추가예정입니다.
                </div>
            `;
            contentContainer.innerHTML = `
                <div class="border-b pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-8 rounded-sm inline-block" style="background:${category.color || '#94a3b8'};"></span>
                        ${escapeHtml(category.title || '오디트')}
                    </h2>
                    <p class="text-slate-500 mt-1 pl-4 text-sm">${escapeHtml(category.desc || '추후 추가예정')}</p>
                </div>
                <div class="audit-panel">
                    ${placeholderHtml}
                </div>
            `;
        }

        function addAuditEntry(dataKey) {
            if (isAuditLuxDataKey(dataKey)) {
                saveAuditLuxBatchEntries(dataKey);
                return;
            }
            const data = getAuditData(dataKey);
            const yearEl = document.getElementById('audit-year');
            const quarterEl = document.getElementById('audit-quarter');
            const teamEl = document.getElementById('audit-team');
            const roomEl = document.getElementById('audit-room');
            const typeEl = document.getElementById('audit-type');
            const valueEl = document.getElementById('audit-value');
            const noteEl = document.getElementById(`audit-note-${dataKey}`);
            const year = parseInt(yearEl?.value, 10);
            const quarter = parseInt(quarterEl?.value, 10);
            if (!year || quarter < 1 || quarter > 4) return;
            const payload = {
                year,
                quarter,
                team: teamEl?.value || '',
                room: roomEl?.value || '',
                type: typeEl?.value || '',
                value: valueEl?.value || '',
                note: noteEl?.value || ''
            };
            const editIndex = AuditState.entryForm[dataKey]?.editIndex;
            if (editIndex !== undefined && editIndex !== null && editIndex >= 0 && editIndex < data.entries.length) {
                data.entries[editIndex] = payload;
                AuditState.entryForm[dataKey].editIndex = null;
            } else {
                data.entries.push(payload);
            }
            saveAuditData(dataKey, data);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
        }

        function removeAuditEntry(dataKey, index) {
            const data = getAuditData(dataKey);
            if (index < 0 || index >= data.entries.length) return;
            data.entries.splice(index, 1);
            saveAuditData(dataKey, data);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
        }

        function addAuditTypeStandard(dataKey) {
            const data = getAuditData(dataKey);
            const teamEl = document.getElementById('audit-standard-team');
            const roomEl = document.getElementById('audit-standard-room');
            const typeEl = document.getElementById('audit-standard-type');
            const valueEl = document.getElementById('audit-standard-value');
            const team = teamEl?.value?.trim() || '';
            const room = roomEl?.value?.trim() || '';
            const type = typeEl?.value?.trim() || '';
            const standard = valueEl?.value?.trim() || '';
            if (!team || !room || !type || !standard) return;
            const standardForm = getAuditStandardFormState(dataKey);
            const payload = { team, room, type, standard };
            if (standardForm.editIndex !== null && standardForm.editIndex >= 0 && standardForm.editIndex < data.standards.length) {
                data.standards[standardForm.editIndex] = payload;
                standardForm.editIndex = null;
            } else {
                data.standards.push(payload);
            }
            saveAuditData(dataKey, data);
            standardForm.team = team;
            standardForm.room = room;
            standardForm.type = '';
            standardForm.standard = '';
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
        }

        function editAuditStandard(dataKey, index) {
            const data = getAuditData(dataKey);
            if (!data.standards || index < 0 || index >= data.standards.length) return;
            const item = data.standards[index];
            const standardForm = getAuditStandardFormState(dataKey);
            standardForm.team = item.team || '';
            standardForm.room = item.room || '';
            standardForm.type = item.type || '';
            standardForm.standard = item.standard || '';
            standardForm.editIndex = index;
            AuditState.standardsOpen[dataKey] = true;
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function removeAuditStandard(dataKey, index) {
            const data = getAuditData(dataKey);
            if (!Array.isArray(data.standards) || index < 0 || index >= data.standards.length) return;
            data.standards.splice(index, 1);
            saveAuditData(dataKey, data);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
        }

        function updateAuditValueStatus(dataKey) {
            const data = getAuditData(dataKey);
            const teamEl = document.getElementById('audit-team');
            const roomEl = document.getElementById('audit-room');
            const valueEl = document.getElementById('audit-value');
            const statusEl = document.getElementById('audit-value-status');
            if (!statusEl) return;
            const typeEl = document.getElementById('audit-type');
            const standardInfo = getAuditStandardInfo(data.standards || [], teamEl?.value, roomEl?.value, typeEl?.value);
            const status = getAuditValueStatus(valueEl?.value, standardInfo);
            statusEl.innerHTML = renderAuditStatusBadge(status);
        }

        function toggleAuditNote(dataKey) {
            const panel = document.getElementById(`audit-note-panel-${dataKey}`);
            if (!panel) return;
            panel.classList.toggle('open');
            const textarea = document.getElementById(`audit-note-${dataKey}`);
            if (textarea) textarea.focus();
        }

        function toggleAuditNotice(dataKey) {
            const modal = document.getElementById(`audit-notice-modal-${dataKey}`);
            if (modal) {
                const button = document.getElementById(`audit-notice-toggle-${dataKey}`);
                const willOpen = !modal.classList.contains('is-open');
                modal.classList.toggle('is-open', willOpen);
                modal.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
                if (button) {
                    button.classList.toggle('is-open', willOpen);
                    button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
                    button.setAttribute('title', willOpen ? '주의사항 닫기' : '주의사항 보기');
                }
                return;
            }
            const panel = document.getElementById(`audit-notice-panel-${dataKey}`);
            const button = document.getElementById(`audit-notice-toggle-${dataKey}`);
            if (!panel || !button) return;
            const willOpen = !panel.classList.contains('open');
            panel.classList.toggle('open', willOpen);
            button.classList.toggle('is-open', willOpen);
            button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            button.setAttribute('title', willOpen ? '주의사항 닫기' : '주의사항 보기');
        }

        function formatUtilNumber(value, decimals) {
            if (value === null || value === undefined || value === '') return '';
            const num = Number(value);
            if (!Number.isFinite(num)) return value;
            const fixedDecimals = Number.isFinite(decimals) ? Math.max(0, Math.min(4, Math.floor(decimals))) : null;
            const hasDecimals = Math.abs(num % 1) > 0.0001;
            return num.toLocaleString('ko-KR', {
                minimumFractionDigits: fixedDecimals !== null ? fixedDecimals : 0,
                maximumFractionDigits: fixedDecimals !== null ? fixedDecimals : (hasDecimals ? 2 : 0)
            });
        }

        const GAS_LPG_TO_LNG_FACTOR = 1.201;
        const UTIL_ENERGY_DEFAULTS = {
            electricFinal: 3.6,
            electricPrimary: 9.59,
            gasLNG: 42.705,
            gasLPG: 50.0,
            toeMJ: 41868
        };
        const UtilEnergyState = {
            linkEnabled: true,
            linkGasMode: 'mj',
            chartPopupEnabled: false,
            displayDecimals: 2,
            electricTeam: 'all',
            gasTeam: 'all',
            from: '',
            to: '',
            electricFactor: UTIL_ENERGY_DEFAULTS.electricFinal,
            gasLNG: UTIL_ENERGY_DEFAULTS.gasLNG,
            gasLPG: UTIL_ENERGY_DEFAULTS.gasLPG,
            toeFactor: UTIL_ENERGY_DEFAULTS.toeMJ,
            chartMetric: 'total_mj',
            chartElectricTeam: 'all',
            chartGasTeam: 'all',
            chartFrom: '',
            chartTo: ''
        };

        function normalizeUtilEnergyDecimals(value, fallback = 2) {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return fallback;
            return Math.max(0, Math.min(4, Math.floor(parsed)));
        }

        function parseUtilNumericValue(value) {
            const raw = String(value ?? '').trim();
            if (!raw) return null;
            const num = Number(raw.replace(/,/g, ''));
            return Number.isFinite(num) ? num : null;
        }

        function resolveUtilInputDecimals(input, fallback = null) {
            if (!input) return fallback;
            if (!Object.prototype.hasOwnProperty.call(input.dataset || {}, 'formatDecimals')) return fallback;
            return normalizeUtilEnergyDecimals(input.dataset.formatDecimals, fallback);
        }

        function setUtilInputDisplayValue(input, value, decimals = null) {
            if (!input) return;
            if (value === null || value === undefined || value === '') {
                input.value = '';
                return;
            }
            const parsed = parseUtilNumericValue(value);
            if (parsed === null) {
                input.value = String(value);
                return;
            }
            input.value = formatUtilNumber(parsed, decimals);
        }

        function bindUtilFormattedInput(input) {
            if (!input || input.dataset.utilFormatted === 'true') return;
            input.dataset.utilFormatted = 'true';
            input.addEventListener('focus', () => {
                if (input.disabled || input.readOnly) return;
                const raw = String(input.value ?? '');
                if (!raw) return;
                const plain = raw.replace(/,/g, '');
                if (plain !== raw) input.value = plain;
            });
            input.addEventListener('blur', () => {
                const parsed = parseUtilNumericValue(input.value);
                if (parsed === null) {
                    input.value = '';
                    return;
                }
                const decimals = resolveUtilInputDecimals(input, null);
                setUtilInputDisplayValue(input, parsed, decimals);
            });
        }

        function bindUtilEnergyFormattedInputs(scope) {
            const root = scope || document;
            root.querySelectorAll('input[data-format-decimals]').forEach(input => {
                bindUtilFormattedInput(input);
            });
        }

        function getGasEntryConversionFactor(teamName) {
            const name = String(teamName || '');
            if (name.includes('LNG')) return 1 / GAS_LPG_TO_LNG_FACTOR;
            if (name.includes('LPG')) return GAS_LPG_TO_LNG_FACTOR;
            return 1;
        }

        function getGasConversionFactor(section) {
            if (!section || section.dataset.gasConvert !== 'on') return 1;
            return getGasEntryConversionFactor(section.dataset.activeTeam || '');
        }

        function getGasConvertedUsageLabel(teamName) {
            const name = String(teamName || '');
            if (name.includes('LNG')) return 'LPG 환산 사용량 (kg)';
            if (name.includes('LPG')) return 'LNG 환산 사용량 (m³)';
            return '환산 사용량';
        }

        function applyUtilConversion(panel) {
            if (!panel) return;
            const factor = parseFloat(panel.querySelector('.util-convert-select')?.value || '1');
            panel.querySelectorAll('.util-num').forEach(cell => {
                const raw = Number(cell.dataset.value || 0);
                const converted = factor ? raw / factor : raw;
                setUtilNumericCellDisplay(cell, formatUtilNumber(converted));
            });
        }

        function setUtilNumericCellDisplay(cell, text) {
            if (!cell) return;
            const node = cell.querySelector('.util-num-value');
            if (node) {
                node.textContent = String(text ?? '');
                return;
            }
            cell.textContent = String(text ?? '');
        }
