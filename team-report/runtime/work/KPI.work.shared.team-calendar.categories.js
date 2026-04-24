        function getWorkTeamCalendarMode() {
            const normalized = String(WorkState?.teamCalendarMode || '').trim().toLowerCase();
            return WORK_TEAM_CALENDAR_MODE_ORDER.includes(normalized)
                ? normalized
                : WORK_TEAM_CALENDAR_MODE_DETAIL;
        }

        function setWorkTeamCalendarMode(mode) {
            const normalized = String(mode || '').trim().toLowerCase();
            const nextMode = WORK_TEAM_CALENDAR_MODE_ORDER.includes(normalized)
                ? normalized
                : WORK_TEAM_CALENDAR_MODE_DETAIL;
            WorkState.teamCalendarMode = nextMode;
            return nextMode;
        }

        function getNextWorkTeamCalendarMode(mode = '') {
            const currentMode = WORK_TEAM_CALENDAR_MODE_ORDER.includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : getWorkTeamCalendarMode();
            const currentIndex = WORK_TEAM_CALENDAR_MODE_ORDER.indexOf(currentMode);
            return WORK_TEAM_CALENDAR_MODE_ORDER[(currentIndex + 1) % WORK_TEAM_CALENDAR_MODE_ORDER.length];
        }

        function getWorkTeamCalendarModeMeta(mode = '') {
            const currentMode = WORK_TEAM_CALENDAR_MODE_ORDER.includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : getWorkTeamCalendarMode();
            const labelMap = {
                [WORK_TEAM_CALENDAR_MODE_DETAIL]: '\uD300\uBCC4',
                [WORK_TEAM_CALENDAR_MODE_PROCESS]: '\uACF5\uC815\uBCC4',
                [WORK_TEAM_CALENDAR_MODE_GROUP]: '\uACF5\uC7A5\uBCC4'
            };
            return {
                mode: currentMode,
                label: labelMap[currentMode] || labelMap[WORK_TEAM_CALENDAR_MODE_DETAIL],
                nextMode: getNextWorkTeamCalendarMode(currentMode),
                nextLabel: labelMap[getNextWorkTeamCalendarMode(currentMode)] || labelMap[WORK_TEAM_CALENDAR_MODE_DETAIL]
            };
        }

        function getWorkTeamCalendarUtilityVisibleDataKeys(mode = '', itemKey = '') {
            const normalizedMode = WORK_TEAM_CALENDAR_MODE_ORDER.includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : getWorkTeamCalendarMode();
            const normalizedItemKey = String(itemKey || '').trim().toLowerCase();
            if (normalizedItemKey === 'waste') {
                return [
                    WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY,
                    WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY,
                    'work_team_calendar_overview'
                ];
            }
            if (normalizedMode === WORK_TEAM_CALENDAR_MODE_GROUP) {
                return [
                    WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY,
                    WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY,
                    'work_team_calendar_overview'
                ];
            }
            if (normalizedMode === WORK_TEAM_CALENDAR_MODE_PROCESS) {
                return normalizedItemKey === 'gas'
                    ? [WORK_TEAM_CALENDAR_PROCESS_DRY_KEY, WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY, 'work_team_calendar_overview']
                    : WORK_TEAM_CALENDAR_PROCESS_KEYS.concat('work_team_calendar_overview');
            }
            return normalizedItemKey === 'gas'
                ? ['work_team_calendar_team1_part1', 'work_team_calendar_team1_part2', 'work_team_calendar_team3', 'work_team_calendar_overview']
                : ['work_team_calendar_team1_part1', 'work_team_calendar_team1_part2', 'work_team_calendar_team2', 'work_team_calendar_team3', 'work_team_calendar_overview'];
        }

        function resolveWorkTeamCalendarSourceDataKeys(dataKey) {
            const normalized = String(dataKey || '').trim();
            if (!normalized) return [];
            if (normalized === WORK_TEAM_CALENDAR_PROCESS_DRY_KEY) {
                return ['work_team_calendar_team1_part1', 'work_team_calendar_team1_part2'];
            }
            if (normalized === WORK_TEAM_CALENDAR_PROCESS_STICK_KEY) {
                return ['work_team_calendar_team2'];
            }
            if (normalized === WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY) {
                return ['work_team_calendar_team3'];
            }
            if (normalized === WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY) {
                return ['work_team_calendar_team1_part1'];
            }
            if (normalized === WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY) {
                return ['work_team_calendar_team1_part2', 'work_team_calendar_team2', 'work_team_calendar_team3'];
            }
            if (normalized === 'work_team_calendar_overview') {
                return WORK_TEAM_CALENDAR_DETAIL_KEYS.slice();
            }
            return [normalized];
        }

        function buildWorkTeamCalendarGroupCategory(dataKey) {
            if (dataKey === WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY) {
                const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team1_part1');
                if (!source) return null;
                return {
                    ...source,
                    title: 'Plant B',
                    dataKey,
                    processLabel: 'Plant B',
                    processTag: 'Plant B',
                    desc: 'Line Alpha 기준 Plant B 통합 현황',
                    processDesc: 'Line Alpha를 기준으로 묶은 Plant B 통합 현황입니다.',
                    emptyProductionLabel: '생산량 없음',
                    emptyWorkLabel: '작업 내역 미입력'
                };
            }
            if (dataKey === WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY) {
                const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team2')
                    || getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team1_part2');
                if (!source) return null;
                return {
                    ...source,
                    title: 'Plant A',
                    dataKey,
                    icon: 'fa-layer-group',
                    color: '#059669',
                    secondaryColor: '#047857',
                    tint: '#ecfdf5',
                    processLabel: 'Plant A',
                    processTag: 'Plant A',
                    desc: 'Line Beta, Line Gamma, Line Delta 기준 Plant A 통합 현황',
                    processDesc: 'Line Beta, Line Gamma, Line Delta을 묶은 Plant A 통합 현황입니다.',
                    emptyProductionLabel: '생산량 없음',
                    emptyWorkLabel: '작업 내역 미입력'
                };
            }
            return null;
        }

        function buildWorkTeamCalendarProcessCategory(dataKey) {
            if (dataKey === WORK_TEAM_CALENDAR_PROCESS_DRY_KEY) {
                const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team1_part2')
                    || getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team1_part1');
                if (!source) return null;
                return {
                    ...source,
                    title: '\uAC74\uC870',
                    dataKey,
                    icon: 'fa-cheese',
                    color: '#f59e0b',
                    secondaryColor: '#d97706',
                    tint: '#fff7ed',
                    processLabel: '\uAC74\uC870',
                    processTag: '\uACF5\uC815',
                    desc: '\uAC74\uC870 \uACF5\uC815 \uD1B5\uD569 \uB0B4\uC5ED',
                    processDesc: '1\uD300 1\uD30C\uD2B8\uC640 1\uD300 2\uD30C\uD2B8\uB97C \uD568\uAED8 \uBCF4\uB294 \uAC74\uC870 \uACF5\uC815 \uB0B4\uC5ED\uC785\uB2C8\uB2E4.',
                    emptyProductionLabel: source.emptyProductionLabel,
                    emptyWorkLabel: source.emptyWorkLabel
                };
            }
            if (dataKey === WORK_TEAM_CALENDAR_PROCESS_STICK_KEY) {
                const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team2');
                if (!source) return null;
                return {
                    ...source,
                    title: '\uC2A4\uD2F1,\uC18C\uD3EC\uC7A5',
                    dataKey,
                    processLabel: '\uC2A4\uD2F1,\uC18C\uD3EC\uC7A5',
                    processTag: '\uACF5\uC815',
                    desc: '\uC2A4\uD2F1,\uC18C\uD3EC\uC7A5 \uACF5\uC815 \uB0B4\uC5ED',
                    processDesc: '2\uD300 \uAE30\uC900\uC73C\uB85C \uC2A4\uD2F1,\uC18C\uD3EC\uC7A5 \uACF5\uC815\uC744 \uBCF4\uB294 \uB0B4\uC5ED\uC785\uB2C8\uB2E4.',
                    emptyProductionLabel: source.emptyProductionLabel,
                    emptyWorkLabel: source.emptyWorkLabel
                };
            }
            if (dataKey === WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY) {
                const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team3');
                if (!source) return null;
                return {
                    ...source,
                    title: '\uC561\uC0C1',
                    dataKey,
                    processLabel: '\uC561\uC0C1',
                    processTag: '\uACF5\uC815',
                    desc: '\uC561\uC0C1 \uACF5\uC815 \uB0B4\uC5ED',
                    processDesc: '3\uD300 \uAE30\uC900\uC73C\uB85C \uC561\uC0C1 \uACF5\uC815\uC744 \uBCF4\uB294 \uB0B4\uC5ED\uC785\uB2C8\uB2E4.',
                    emptyProductionLabel: source.emptyProductionLabel,
                    emptyWorkLabel: source.emptyWorkLabel
                };
            }
            return null;
        }

        function getWorkTeamCalendarOverviewCategory() {
            const source = getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_overview');
            if (!source) return null;
            return {
                ...source,
                title: '\uD1B5\uD569 \uD604\uD669',
                processLabel: '\uD1B5\uD569 \uD604\uD669',
                processTag: '\uC804\uCCB4'
            };
        }

        function appendWorkTeamCalendarOverviewCategory(categories = []) {
            const overviewCategory = getWorkTeamCalendarOverviewCategory();
            const filtered = Array.isArray(categories)
                ? categories.filter(Boolean).filter(category => String(category?.dataKey || '').trim() !== 'work_team_calendar_overview')
                : [];
            if (overviewCategory) filtered.push(overviewCategory);
            return filtered;
        }

        function getWorkTeamCalendarDisplayCategoryList() {
            if (getWorkTeamCalendarMode() === WORK_TEAM_CALENDAR_MODE_PROCESS) {
                return appendWorkTeamCalendarOverviewCategory([
                    buildWorkTeamCalendarProcessCategory(WORK_TEAM_CALENDAR_PROCESS_DRY_KEY),
                    buildWorkTeamCalendarProcessCategory(WORK_TEAM_CALENDAR_PROCESS_STICK_KEY),
                    buildWorkTeamCalendarProcessCategory(WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY)
                ]);
            }
            if (getWorkTeamCalendarMode() === WORK_TEAM_CALENDAR_MODE_GROUP) {
                return appendWorkTeamCalendarOverviewCategory([
                    buildWorkTeamCalendarGroupCategory(WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY),
                    buildWorkTeamCalendarGroupCategory(WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY),
                    getWorkTeamCalendarRawCategoryByDataKey('work_team_calendar_team4')
                ]);
            }
            return appendWorkTeamCalendarOverviewCategory(getWorkTeamCalendarRawCategoryList().filter(category => {
                const dataKey = String(category?.dataKey || '').trim();
                return dataKey !== 'work_team_calendar_overview' && dataKey !== 'work_team_calendar_team4';
            }));
        }

        function mapWorkTeamCalendarDataKeyForMode(dataKey, mode) {
            const normalizedMode = WORK_TEAM_CALENDAR_MODE_ORDER.includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : WORK_TEAM_CALENDAR_MODE_DETAIL;
            const normalizedKey = String(dataKey || '').trim();
            if (normalizedKey === 'work_team_calendar_overview') {
                return 'work_team_calendar_overview';
            }
            if (normalizedMode === WORK_TEAM_CALENDAR_MODE_GROUP) {
                if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_DRY_KEY) {
                    return 'work_team_calendar_overview';
                }
                if (normalizedKey === 'work_team_calendar_team1_part1' || normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY) {
                    return WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY;
                }
                if (
                    normalizedKey === 'work_team_calendar_team1_part2'
                    || normalizedKey === 'work_team_calendar_team2'
                    || normalizedKey === 'work_team_calendar_team3'
                    || normalizedKey === WORK_TEAM_CALENDAR_PROCESS_STICK_KEY
                    || normalizedKey === WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY
                    || normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY
                ) {
                    return WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY;
                }
                if (normalizedKey === 'work_team_calendar_team4') {
                    return 'work_team_calendar_team4';
                }
                return WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY;
            }
            if (normalizedMode === WORK_TEAM_CALENDAR_MODE_PROCESS) {
                if (
                    normalizedKey === WORK_TEAM_CALENDAR_PROCESS_DRY_KEY
                    || normalizedKey === 'work_team_calendar_team1_part1'
                    || normalizedKey === 'work_team_calendar_team1_part2'
                    || normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY
                    || normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY
                    || normalizedKey === 'work_team_calendar_team4'
                ) {
                    return WORK_TEAM_CALENDAR_PROCESS_DRY_KEY;
                }
                if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_STICK_KEY || normalizedKey === 'work_team_calendar_team2') {
                    return WORK_TEAM_CALENDAR_PROCESS_STICK_KEY;
                }
                if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY || normalizedKey === 'work_team_calendar_team3') {
                    return WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY;
                }
                return WORK_TEAM_CALENDAR_PROCESS_DRY_KEY;
            }
            if (normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY || normalizedKey === 'work_team_calendar_team1_part1') {
                return 'work_team_calendar_team1_part1';
            }
            if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_DRY_KEY) {
                return 'work_team_calendar_team1_part1';
            }
            if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_STICK_KEY) {
                return 'work_team_calendar_team2';
            }
            if (normalizedKey === WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY) {
                return 'work_team_calendar_team3';
            }
            if (normalizedKey === WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY) {
                return 'work_team_calendar_team1_part2';
            }
            if (normalizedKey === 'work_team_calendar_team4') {
                return 'work_team_calendar_team1_part1';
            }
            return WORK_TEAM_CALENDAR_DETAIL_KEYS.includes(normalizedKey)
                ? normalizedKey
                : 'work_team_calendar_team1_part1';
        }

        function applyWorkTeamCalendarMode(mode) {
            const nextMode = setWorkTeamCalendarMode(mode);
            const modalOpen = !!document.getElementById('work-team-calendar-modal')?.classList.contains('is-open');
            const currentModalKey = modalOpen ? String(WorkState.teamCalendarModal || '').trim() : '';
            const currentKey = String(
                WorkState.teamCalendarHubDataKey
                || currentModalKey
                || (nextMode === WORK_TEAM_CALENDAR_MODE_GROUP ? WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY : 'work_team_calendar_team1_part1')
            ).trim();
            const targetDataKey = mapWorkTeamCalendarDataKeyForMode(currentKey, nextMode);
            WorkState.teamCalendarHubDataKey = targetDataKey;
            if (modalOpen) {
                WorkState.teamCalendarModal = targetDataKey;
            }
            return targetDataKey;
        }

        function toggleWorkTeamCalendarDisplayMode() {
            const nextMode = getNextWorkTeamCalendarMode();
            const targetDataKey = applyWorkTeamCalendarMode(nextMode);
            if (typeof selectCategory === 'function' && getNavigationSelectionSectionId?.() === 'work' && getNavigationSelectionCategoryIndex?.('work') === 0) {
                selectCategory('work', 0, { teamDataKey: targetDataKey });
                return targetDataKey;
            }
            if (typeof renderSidebar === 'function') renderSidebar();
            return targetDataKey;
        }

        function getWorkAllCategories() {
            const deduped = new Map();
            [...getWorkHiddenTeamCategories(), ...getWorkTeamCalendarDisplayCategoryList(), ...getWorkVisibleCategories()].forEach(category => {
                const dataKey = String(category?.dataKey || '').trim();
                const dedupeKey = dataKey || String(category?.title || '').trim();
                if (!dedupeKey || deduped.has(dedupeKey)) return;
                deduped.set(dedupeKey, category);
            });
            return Array.from(deduped.values());
        }

        function getWorkCategoryByDataKey(dataKey) {
            const normalized = String(dataKey || '').trim();
            if (!normalized) return null;
            return getWorkAllCategories().find(cat => String(cat?.dataKey || '').trim() === normalized) || null;
        }

        function getWorkTeamCalendarCategoryList() {
            return getWorkTeamCalendarDisplayCategoryList();
        }

        function getWorkTeamCalendarCategory(dataKey) {
            const category = getWorkCategoryByDataKey(dataKey);
            return category?.view === 'team_calendar' ? category : null;
        }

