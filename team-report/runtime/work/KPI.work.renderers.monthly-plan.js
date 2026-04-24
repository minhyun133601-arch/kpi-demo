        function renderMonthlyPlan(category, data, headerHtml) {
            const now = new Date();
            const activeMonthKey = WorkState.activeMonth[category.dataKey] || `${now.getFullYear()}-${now.getMonth() + 1}`;
            const parts = activeMonthKey.split('-');
            const year = parseInt(parts[0], 10);
            const monthIndex = parseInt(parts[1], 10) - 1;
            const monthDays = getMonthMatrix(year, monthIndex);

            const filter = getMonthlyFilterState(category.dataKey);
            const normalizedRange = normalizeMonthRange(filter.startMonth, filter.endMonth);
            filter.startMonth = normalizedRange.start;
            filter.endMonth = normalizedRange.end;
            const entriesByDateRange = collectEntriesByDateRange(filter.startMonth, filter.endMonth);
            const filteredEntriesByDate = {};
            Object.entries(entriesByDateRange).forEach(([dateKey, entries]) => {
                if (!isDateInRange(dateKey, filter.startMonth, filter.endMonth)) return;
                const filtered = entries.filter(entry => entryMatchesFilter(entry, filter));
                if (filtered.length) filteredEntriesByDate[dateKey] = filtered;
            });
            const todayKey = formatDateKey(now);
            const selectedDate = WorkState.activeDate[category.dataKey] || todayKey;

            const weekdayLabels = WORK_DAY_LABELS.map(label => `<div class="month-weekday">${label}</div>`).join('');

            const dayCells = monthDays.map(date => {
                const inMonth = date.getMonth() === monthIndex;
                const dateKey = formatDateKey(date);
                const entries = filteredEntriesByDate[dateKey] || [];
                const isToday = dateKey === todayKey;
                const isSelected = dateKey === selectedDate;
                const classes = [
                    'month-day',
                    inMonth ? '' : 'is-out',
                    isToday ? 'is-today' : '',
                    isSelected ? 'is-selected' : '',
                    entries.length ? 'has-note' : ''
                ].filter(Boolean).join(' ');
                const preview = entries.length ? `${entries.length}건` : '';
                return `
                    <button class="${classes}" ${inMonth ? `onclick="monthSelectDate('${category.dataKey}','${dateKey}')"` : ''} data-date="${dateKey}">
                        <div class="month-day-number">${date.getDate()}</div>
                        <div class="month-dot"></div>
                        <div class="month-note-preview">${preview}</div>
                    </button>
                `;
            }).join('');

            const selectedEntries = filteredEntriesByDate[selectedDate] || [];
            const flattenedEntries = Object.entries(filteredEntriesByDate).flatMap(([dateKey, list]) => (
                list.map(item => ({ ...item, dateKey }))
            ));
            const sortedEntries = flattenedEntries.slice().sort((a, b) => {
                if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
                if ((a.team || '') !== (b.team || '')) return (a.team || '').localeCompare(b.team || '');
                return (a.owner || '').localeCompare(b.owner || '');
            });
            const teamCounts = {};
            const ownerCounts = {};
            flattenedEntries.forEach(entry => {
                const teamKey = entry.team || '미지정';
                const ownerKey = entry.owner || '미지정';
                teamCounts[teamKey] = (teamCounts[teamKey] || 0) + 1;
                ownerCounts[ownerKey] = (ownerCounts[ownerKey] || 0) + 1;
            });
            const sortedTeamCounts = Object.entries(teamCounts).sort((a, b) => b[1] - a[1]);
            const sortedOwnerCounts = Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]);
            const teamChips = sortedTeamCounts.length ? sortedTeamCounts.map(([key, count]) => (
                `<span class="month-chip">${escapeHtml(key)} <span class="month-chip-count">${count}</span></span>`
            )).join('') : `<span class="month-hint">데이터 없음</span>`;
            const ownerChips = sortedOwnerCounts.length ? sortedOwnerCounts.map(([key, count]) => (
                `<span class="month-chip">${escapeHtml(key)} <span class="month-chip-count">${count}</span></span>`
            )).join('') : `<span class="month-hint">데이터 없음</span>`;
            const entryList = selectedEntries.length ? selectedEntries.map(item => {
                const iconInfo = getEquipIconInfo(item.team);
                const icon = iconInfo.icon || 'fa-folder';
                const color = iconInfo.color || '#64748b';
                return `
                    <div class="month-entry">
                        <div class="month-entry-head">
                            <span class="month-entry-icon" style="background:${color}1a; color:${color};">
                                <i class="fas ${icon}"></i>
                            </span>
                            <div class="month-entry-meta">
                                <div class="month-entry-team">${escapeHtml(item.team || '미지정')}</div>
                                <div class="month-entry-room">${escapeHtml(item.room || '')}</div>
                            </div>
                            <div class="month-entry-owner">${escapeHtml(item.owner || '')}</div>
                        </div>
                        <div class="month-entry-task">${escapeHtml(item.task || '')}</div>
                    </div>
                `;
            }).join('') : `<div class="month-hint">선택한 날짜에 기록된 작업이 없습니다.</div>`;

            const dateKeysSorted = Object.keys(filteredEntriesByDate).sort();
            const listBlocks = dateKeysSorted.length ? dateKeysSorted.map(dateKey => {
                const items = filteredEntriesByDate[dateKey] || [];
                const itemList = items.map(item => {
                    const iconInfo = getEquipIconInfo(item.team);
                    const icon = iconInfo.icon || 'fa-folder';
                    const color = iconInfo.color || '#64748b';
                    return `
                        <div class="month-list-entry">
                            <span class="month-list-icon" style="background:${color}1a; color:${color};">
                                <i class="fas ${icon}"></i>
                            </span>
                            <div class="month-list-main">${escapeHtml(item.team || '미지정')} · ${escapeHtml(item.room || '')} · ${escapeHtml(item.task || '')}</div>
                            <div class="month-list-owner">${escapeHtml(item.owner || '')}</div>
                        </div>
                    `;
                }).join('');
                return `
                    <div class="month-list-item">
                        <div class="month-list-date">${dateKey}</div>
                        ${itemList}
                    </div>
                `;
            }).join('') : `<div class="month-hint">검색 조건에 맞는 작업이 없습니다.</div>`;

            const contentContainer = document.getElementById('content-container');
            const totalCount = sortedEntries.length;
            const rangeLabel = `${filter.startMonth} ~ ${filter.endMonth}`;
            WorkState.monthReportCache[category.dataKey] = {
                rangeLabel,
                totalCount,
                filters: { ...filter },
                entries: sortedEntries
            };

            contentContainer.innerHTML = `
                ${headerHtml}
                <div class="month-panel">
                    <div class="month-card">
                        <div class="month-card-header">
                            <div class="month-header-row">
                                <div>
                                    <div class="month-title">${formatMonthLabel(year, monthIndex)}</div>
                                    <div class="month-subtitle">팀 작업 실적 통합</div>
                                </div>
                                <div class="month-actions">
                                    <button class="work-btn" onclick="monthPrev('${category.dataKey}')">이전 달</button>
                                    <button class="work-btn" onclick="monthNext('${category.dataKey}')">다음 달</button>
                                    <button class="work-btn primary" onclick="printMonthlyReport('${category.dataKey}')">인쇄/PDF</button>
                                </div>
                            </div>
                            <div class="month-filters">
                                <input type="month" class="month-filter-input" value="${filter.startMonth}" oninput="updateMonthlyFilter('${category.dataKey}', 'startMonth', this.value)" />
                                <input type="month" class="month-filter-input" value="${filter.endMonth}" oninput="updateMonthlyFilter('${category.dataKey}', 'endMonth', this.value)" />
                                <select class="month-filter-input" onchange="updateMonthlyFilter('${category.dataKey}', 'team', this.value)">
                                    ${buildSelectOptions(getWorkTeamOptions(), filter.team, '전체')}
                                </select>
                                <select class="month-filter-input" ${filter.team ? '' : 'disabled'} onchange="updateMonthlyFilter('${category.dataKey}', 'room', this.value)">
                                    ${buildSelectOptions(filter.team ? getEquipRooms(filter.team) : [], filter.room, filter.team ? '실 전체' : '실 선택')}
                                </select>
                                <select class="month-filter-input" onchange="updateMonthlyFilter('${category.dataKey}', 'owner', this.value)">
                                    ${buildSelectOptions(getWorkOwners(), filter.owner, '전체')}
                                </select>
                                <input class="month-filter-input" placeholder="내용 검색" value="${escapeHtml(filter.keyword)}" oninput="updateMonthlyFilter('${category.dataKey}', 'keyword', this.value)" />
                                <button class="work-btn" onclick="clearMonthlyFilter('${category.dataKey}')">초기화</button>
                            </div>
                            <div class="month-range-summary">기간: ${rangeLabel} · 총 ${totalCount}건</div>
                        </div>
                        <div class="month-grid">
                            ${weekdayLabels}
                            ${dayCells}
                        </div>
                        <div class="month-list">
                            <div class="month-list-title">검색 결과 목록</div>
                            ${listBlocks}
                        </div>
                    </div>
                    <div class="month-card">
                        <div class="month-editor">
                            <div class="month-summary">
                                <div class="month-summary-title">요약</div>
                                <div class="month-summary-grid">
                                    <div class="month-summary-block">
                                        <div class="month-subtitle">팀별 건수</div>
                                        <div class="month-chip-list">${teamChips}</div>
                                    </div>
                                    <div class="month-summary-block">
                                        <div class="month-subtitle">인원별 건수</div>
                                        <div class="month-chip-list">${ownerChips}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="month-editor-title">실적 상세</div>
                            <div class="month-editor-date">${selectedDate}</div>
                            <div class="month-entry-list">
                                ${entryList}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function monthPrev(dataKey) {
            const current = WorkState.activeMonth[dataKey] || `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
            const parts = current.split('-');
            let year = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            month -= 1;
            if (month < 0) {
                month = 11;
                year -= 1;
            }
            WorkState.activeMonth[dataKey] = `${year}-${month + 1}`;
            rerenderWorkCategory(dataKey);
        }

        function monthNext(dataKey) {
            const current = WorkState.activeMonth[dataKey] || `${new Date().getFullYear()}-${new Date().getMonth() + 1}`;
            const parts = current.split('-');
            let year = parseInt(parts[0], 10);
            let month = parseInt(parts[1], 10) - 1;
            month += 1;
            if (month > 11) {
                month = 0;
                year += 1;
            }
            WorkState.activeMonth[dataKey] = `${year}-${month + 1}`;
            rerenderWorkCategory(dataKey);
        }

        function monthSelectDate(dataKey, dateKey) {
            WorkState.activeDate[dataKey] = dateKey;
            rerenderWorkCategory(dataKey);
        }

        function monthUpdate(dataKey, dateKey, value) {
            const data = getWorkData(dataKey);
            const monthly = ensureMonthly(data);
            if (value && value.trim().length > 0) {
                monthly.entries[dateKey] = value;
            } else {
                delete monthly.entries[dateKey];
            }
            saveWorkData(dataKey, data);
            const cell = document.querySelector(`.month-day[data-date='${dateKey}']`);
            if (cell) {
                if (monthly.entries[dateKey]) {
                    cell.classList.add('has-note');
                } else {
                    cell.classList.remove('has-note');
                }
            }
        }
