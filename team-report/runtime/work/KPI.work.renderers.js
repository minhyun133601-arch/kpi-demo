        function renderWorkContent(category, contextOrOptions = {}) {
            const context = contextOrOptions && typeof contextOrOptions === 'object'
                ? contextOrOptions
                : {};
            const options = context.options && typeof context.options === 'object'
                ? context.options
                : contextOrOptions;
            if (category.view === 'team_calendar') {
                renderWorkTeamCalendarContent(category, '', options);
                return;
            }
            const accent = category.color || AppData.work?.accent || '#2563eb';
            const headerHtml = `
                <div class="border-b pb-4 mb-6">
                    <h2 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <span class="w-2 h-8 rounded-sm inline-block" style="background:${accent};"></span>
                        ${category.title}
                    </h2>
                    <p class="text-slate-500 mt-1 pl-4 text-sm">${category.desc || ''}</p>
                </div>
            `;
            if (category.view === 'history_tool') {
                window.KpiWorkHistory?.render?.(category, context);
                return;
            }
            const dataKey = category.dataKey;
            const data = getWorkData(dataKey, category.title);
            if (dataKey === 'work_monthly_plan') {
                renderMonthlyPlan(category, data, headerHtml);
                return;
            }
            const now = getISOWeekInfo(new Date());
            ensureWeeksUpToCurrent(data, now.year, now.week);
            ensureWeek(data, now.year, now.week);
            saveWorkData(dataKey, data);

            const weeks = data.weeks.slice().sort((a, b) => (a.year - b.year) || (a.week - b.week));
            let activeKey = WorkState.activeWeek[dataKey] || makeWeekKey(now.year, now.week);
            let activeWeek = weeks.find(w => makeWeekKey(w.year, w.week) === activeKey);
            if (!activeWeek) {
                activeWeek = weeks[weeks.length - 1];
                activeKey = makeWeekKey(activeWeek.year, activeWeek.week);
            }
            WorkState.activeWeek[dataKey] = activeKey;

            const weekStart = getWeekStartDate(activeWeek.year, activeWeek.week);
            const weekLabel = `${activeWeek.year}년 ${activeWeek.week}주차`;
            const weekRange = formatWeekRange(weekStart);
            const weekOptions = weeks.map(w => {
                const key = makeWeekKey(w.year, w.week);
                return `<option value="${key}" ${key === activeKey ? 'selected' : ''}>${w.year}년 ${w.week}주차</option>`;
            }).join('');

            const dayCards = WORK_DAY_KEYS.map((key, idx) => {
                const date = new Date(weekStart.getTime());
                date.setDate(weekStart.getDate() + idx);
                const storedEntries = normalizeDayEntries(activeWeek.days ? activeWeek.days[key] : []);
                const entries = storedEntries.length ? storedEntries : [{ team: '', room: '', task: '' }];
                const teams = getWorkTeamOptions();
                const entryRows = entries.map((entry, entryIndex) => {
                    const teamValueNormalized = normalizeWorkTeamName(entry.team);
                    const teamValue = teams.includes(teamValueNormalized) ? teamValueNormalized : '';
                    const teamSelectId = `team-select-${dataKey}-${key}-${entryIndex}`;
                    const teamOptions = teams.map(team => {
                        const info = getEquipIconInfo(team);
                        const icon = info.icon || 'fa-folder';
                        const color = info.color || '#94a3b8';
                        const selected = team === teamValue ? 'is-selected' : '';
                        return `
                            <button class="work-team-option ${selected}" onclick="selectTeamOption('${dataKey}', '${key}', ${entryIndex}, '${escapeJs(team)}', event)">
                                <span class="work-team-option-icon" style="background:${color}1a; color:${color};">
                                    <i class="fas ${icon}"></i>
                                </span>
                                <span>${escapeHtml(team)}</span>
                            </button>
                        `;
                    }).join('');
                    const iconInfo = getEquipIconInfo(teamValue);
                    const teamIcon = iconInfo.icon || 'fa-folder';
                    const teamColor = iconInfo.color || '#94a3b8';
                    const canRemove = storedEntries.length > 1;
                    return `
                        <div class="work-entry">
                            <div class="work-entry-row" style="grid-template-columns: minmax(0, 1fr) auto;">
                                <div class="work-field">
                                    <span class="work-label">TEAM</span>
                                    <div class="work-team-select">
                                        <span class="work-team-icon" style="color:${teamColor}; background:${teamColor}1a;">
                                            <i class="fas ${teamIcon}"></i>
                                        </span>
                                        <div class="work-team-select-wrap" id="${teamSelectId}">
                                            <button class="work-team-trigger" onclick="toggleTeamDropdown('${teamSelectId}', event)">
                                                <span class="work-team-label">${teamValue ? escapeHtml(teamValue) : '팀 선택'}</span>
                                                <i class="fas fa-chevron-down work-team-chevron"></i>
                                            </button>
                                            <div class="work-team-menu">
                                                ${teamOptions}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button class="work-btn work-entry-remove" ${canRemove ? '' : 'disabled'} onclick="workRemoveEntry('${dataKey}', '${key}', ${entryIndex})">삭제</button>
                            </div>
                            <div class="work-field">
                                <span class="work-label">TASK</span>
                                <textarea class="work-textarea" placeholder="작업 내용을 입력하세요." oninput="workUpdateEntry('${dataKey}', '${key}', ${entryIndex}, 'task', this.value)">${escapeHtml(entry.task)}</textarea>
                            </div>
                        </div>
                    `;
                }).join('');
                return `
                    <div class="work-day-card" style="--day-color: ${WORK_DAY_COLORS[idx]};">
                        <div class="work-day-header">
                            <span class="work-day-label">${WORK_DAY_LABELS[idx]}</span>
                            <span class="work-day-date">${formatDate(date)}</span>
                        </div>
                        <div class="work-fields">
                            ${entryRows}
                            <button class="work-btn primary" onclick="workAddEntry('${dataKey}', '${key}')">+ 작업 추가</button>
                        </div>
                    </div>
                `;
            }).join('');

            const contentContainer = document.getElementById('content-container');
            contentContainer.innerHTML = `
                ${headerHtml}
                <div class="work-panel">
                    <div class="work-toolbar">
                        <div class="work-week-meta">
                            <div class="work-week-title">${weekLabel}</div>
                            <div class="work-week-range">${weekRange}</div>
                            ${typeof renderWorkSaveStatusBadge === 'function' ? renderWorkSaveStatusBadge(dataKey) : `<div class="work-autosave work-save-status is-idle" data-work-save-status="${escapeHtml(dataKey)}"></div>`}
                        </div>
                        <div class="work-controls">
                            <button class="work-btn" onclick="workPrev('${dataKey}')">이전 주</button>
                            <select class="work-select" onchange="workSelect('${dataKey}', this.value)">${weekOptions}</select>
                            <button class="work-btn" onclick="workNext('${dataKey}')">다음 주</button>
                            <button class="work-btn primary" onclick="workExport('${dataKey}')">데이터 저장</button>
                        </div>
                    </div>
                    <div class="work-grid">
                        ${dayCards}
                    </div>
                </div>
            `;
        }
