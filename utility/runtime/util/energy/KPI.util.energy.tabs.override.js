        const UTIL_SIDEBAR_SELECTOR_KEYS = Object.freeze({
            team1Part1: 'work_team_calendar_team1_part1',
            team1Part2: 'work_team_calendar_team1_part2',
            team2: 'work_team_calendar_team2',
            team3: 'work_team_calendar_team3',
            processDry: 'work_team_calendar_process_dry',
            processStick: 'work_team_calendar_process_stick',
            processLiquid: 'work_team_calendar_process_liquid',
            groupPlantB: 'work_team_calendar_group_plantB',
            groupPlantA: 'work_team_calendar_group_plantA',
            overview: 'work_team_calendar_overview'
        });

        const originalRenderUtilDualTabs = typeof window.renderUtilDualTabs === 'function'
            ? window.renderUtilDualTabs
            : (typeof renderUtilDualTabs === 'function' ? renderUtilDualTabs : null);
        const utilSidebarSelectionState = {
            gasTeamView: 'total'
        };

        function escapeUtilSidebarHtml(value = '') {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function buildUtilSidebarPromptHtml(datasetKey = '') {
            const labelMap = {
                electric: '전기',
                gas: '가스',
                waste: '폐수'
            };
            const label = labelMap[normalizeUtilDualDatasetKey(datasetKey)] || '유틸리티';
            return `
                <div class="py-8 text-center text-slate-500">
                    <p class="text-base font-semibold text-slate-700 mb-2">${label} 팀을 선택해주세요.</p>
                    <p class="text-sm">왼쪽 팀별내역서에서 팀, 공정, 권역 중 하나를 선택하면 해당 내역이 열립니다.</p>
                </div>
            `;
        }

        function createUtilSidebarSyntheticRows() {
            const rows = Array.from({ length: 12 }, (_, index) => ({
                label: `${index + 1}월`,
                usage: null,
                cost: null,
                production: null
            }));
            rows.push(
                { label: '평균', usage: null, cost: null, production: null },
                { label: '계', usage: null, cost: null, production: null }
            );
            return rows;
        }

        function mergeUtilSidebarValue(currentValue, nextValue) {
            const current = Number(currentValue);
            const next = Number(nextValue);
            if (!Number.isFinite(next)) return Number.isFinite(current) ? current : null;
            if (!Number.isFinite(current)) return next;
            return current + next;
        }

        function findUtilSidebarTeamNode(datasetKey, teamName) {
            const source = Array.isArray(UTIL_DUAL_CONFIG?.[datasetKey]?.data) ? UTIL_DUAL_CONFIG[datasetKey].data : [];
            const rawTeam = String(teamName || '').trim();
            if (!rawTeam) return null;
            const exact = source.find(item => String(item?.name || '').trim() === rawTeam);
            if (exact) return exact;
            const canonical = canonicalizeUtilTeamName(rawTeam);
            const fuelKey = inferUtilFuelType(rawTeam);
            if (canonical) {
                const canonicalMatches = source.filter(item => canonicalizeUtilTeamName(item?.name) === canonical);
                if (fuelKey) {
                    const fuelMatch = canonicalMatches.find(item => inferUtilFuelType(item?.name) === fuelKey);
                    if (fuelMatch) return fuelMatch;
                }
                if (canonicalMatches.length === 1) return canonicalMatches[0];
            }
            const normalized = normalizeUtilTeamName(rawTeam);
            return source.find(item => normalizeUtilTeamName(item?.name) === normalized) || null;
        }

        function buildUtilSidebarSyntheticTeam(datasetKey, teamName, sourceTeamNames) {
            const sourceTeams = (Array.isArray(sourceTeamNames) ? sourceTeamNames : [])
                .map(name => findUtilSidebarTeamNode(datasetKey, name))
                .filter(Boolean);
            if (!sourceTeams.length) return null;
            const yearValues = Array.from(new Set(
                sourceTeams.flatMap(team => (team?.years || []).map(year => parseUtilYearLabel(year?.label)))
            )).filter(Number.isFinite).sort((a, b) => a - b);
            const years = yearValues.map(yearValue => {
                const rows = createUtilSidebarSyntheticRows();
                let hasPayload = false;
                sourceTeams.forEach(team => {
                    const yearNode = (team?.years || []).find(item => parseUtilYearLabel(item?.label) === yearValue);
                    (yearNode?.rows || []).forEach(row => {
                        const monthValue = parseUtilMonthLabel(row?.label);
                        if (!monthValue) return;
                        const targetRow = rows[monthValue - 1];
                        if (!targetRow) return;
                        targetRow.usage = mergeUtilSidebarValue(targetRow.usage, row?.usage);
                        targetRow.cost = mergeUtilSidebarValue(targetRow.cost, row?.cost);
                        targetRow.production = mergeUtilSidebarValue(targetRow.production, row?.production);
                        if (row?.costs && typeof row.costs === 'object') {
                            targetRow.costs = targetRow.costs || {};
                            Object.entries(row.costs).forEach(([costKey, costValue]) => {
                                targetRow.costs[costKey] = mergeUtilSidebarValue(targetRow.costs[costKey], costValue);
                            });
                        }
                        if (
                            Number.isFinite(Number(targetRow.usage))
                            || Number.isFinite(Number(targetRow.cost))
                            || Number.isFinite(Number(targetRow.production))
                            || Object.values(targetRow.costs || {}).some(value => Number.isFinite(Number(value)))
                        ) {
                            hasPayload = true;
                        }
                    });
                });
                return hasPayload ? { label: String(yearValue), rows } : null;
            }).filter(Boolean);
            if (!years.length) return null;
            return { name: teamName, years, __utilSidebarSynthetic: true };
        }

        function normalizeUtilSidebarWorkKey(itemKey = '', workDataKey = '') {
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey);
            const rawKey = String(workDataKey || '').trim();
            if (!rawKey) return '';
            if (normalizedItemKey !== 'waste') return rawKey;
            if (rawKey === UTIL_SIDEBAR_SELECTOR_KEYS.overview) return UTIL_SIDEBAR_SELECTOR_KEYS.overview;
            if (rawKey === UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB || rawKey === UTIL_SIDEBAR_SELECTOR_KEYS.team1Part1) return UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB;
            if (rawKey === UTIL_SIDEBAR_SELECTOR_KEYS.processDry) return UTIL_SIDEBAR_SELECTOR_KEYS.overview;
            return UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA;
        }

        function getUtilSidebarSelectionWorkDataKey(itemKey = '') {
            const workDataKey = typeof WorkState !== 'undefined' && WorkState
                ? String(WorkState.teamCalendarHubDataKey || '').trim()
                : '';
            return normalizeUtilSidebarWorkKey(itemKey, workDataKey);
        }

        function buildUtilSidebarGasGroupedSelectionSpec(workDataKey = '', gasTeamView = 'total') {
            const plantALngSources = ['Line Beta (LNG)', 'Line Delta (LNG)'];
            const plantALpgSources = ['Line Beta (LPG)'];
            const plantATotalSources = ['Line Beta (LNG)', 'Line Beta (LPG)', 'Line Delta (LNG)'];
            const overviewLngSources = ['Line Alpha (LNG)'].concat(plantALngSources);
            const overviewLpgSources = ['Line Beta (LPG)'];
            const overviewTotalSources = ['Line Alpha (LNG)'].concat(plantATotalSources);
            if ([UTIL_SIDEBAR_SELECTOR_KEYS.team2, UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA].includes(workDataKey)) {
                if (gasTeamView === 'lng') {
                    return {
                        teamName: UTIL_REPORT_GAS_PLANT_A_LNG_LABEL,
                        syntheticSources: plantALngSources,
                        title: 'Plant A / LNG',
                        reportTeam: UTIL_REPORT_GAS_PLANT_A_LNG_LABEL,
                        allowMutation: false,
                        showGasToggle: true
                    };
                }
                if (gasTeamView === 'lpg') {
                    return {
                        teamName: UTIL_REPORT_GAS_PLANT_A_LPG_LABEL,
                        syntheticSources: plantALpgSources,
                        title: 'Plant A / LPG',
                        reportTeam: UTIL_REPORT_GAS_PLANT_A_LPG_LABEL,
                        allowMutation: false,
                        showGasToggle: true
                    };
                }
                return {
                    teamName: 'Plant A',
                    syntheticSources: plantATotalSources,
                    title: 'Plant A / 합산',
                    reportTeam: 'Plant A',
                    allowMutation: false,
                    showGasToggle: true
                };
            }
            if (workDataKey === UTIL_SIDEBAR_SELECTOR_KEYS.overview) {
                if (gasTeamView === 'lng') {
                    return {
                        teamName: UTIL_REPORT_GAS_OVERALL_LNG_LABEL,
                        syntheticSources: overviewLngSources,
                        title: '통합 / LNG',
                        reportTeam: UTIL_REPORT_GAS_OVERALL_LNG_LABEL,
                        allowMutation: false,
                        showGasToggle: true
                    };
                }
                if (gasTeamView === 'lpg') {
                    return {
                        teamName: UTIL_REPORT_GAS_OVERALL_LPG_LABEL,
                        syntheticSources: overviewLpgSources,
                        title: '통합 / LPG',
                        reportTeam: UTIL_REPORT_GAS_OVERALL_LPG_LABEL,
                        allowMutation: false,
                        showGasToggle: true
                    };
                }
                return {
                    teamName: '전체',
                    syntheticSources: overviewTotalSources,
                    title: '통합 / 합산',
                    reportTeam: '전체',
                    allowMutation: false,
                    showGasToggle: true
                };
            }
            return null;
        }

        function getUtilSidebarProcessSelectionKey(teamName = '') {
            const raw = String(teamName || '').trim();
            if (!raw) return '';
            if (raw === UTIL_SIDEBAR_SELECTOR_KEYS.processDry || /Process Alpha/i.test(raw)) return UTIL_SIDEBAR_SELECTOR_KEYS.processDry;
            if (raw === UTIL_SIDEBAR_SELECTOR_KEYS.processStick || /Process Beta B/i.test(raw) || /Process Beta A/i.test(raw)) return UTIL_SIDEBAR_SELECTOR_KEYS.processStick;
            if (raw === UTIL_SIDEBAR_SELECTOR_KEYS.processLiquid || /Process Gamma/i.test(raw)) return UTIL_SIDEBAR_SELECTOR_KEYS.processLiquid;
            return '';
        }

        function resolveUtilSidebarSelectionSpec(datasetKey, workDataKey, section) {
            const normalizedItemKey = normalizeUtilDualDatasetKey(datasetKey);
            const normalizedWorkKey = normalizeUtilSidebarWorkKey(normalizedItemKey, workDataKey);
            const gasTeamView = (() => {
                const rawValue = String(section?.dataset?.utilGasTeamView || utilSidebarSelectionState.gasTeamView || 'total').trim().toLowerCase();
                return ['lng', 'lpg', 'total'].includes(rawValue) ? rawValue : 'total';
            })();
            if (normalizedItemKey === 'gas') {
                utilSidebarSelectionState.gasTeamView = gasTeamView;
            }
            if (!normalizedWorkKey) return null;
            if (normalizedItemKey === 'electric') {
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.processDry) return { teamName: 'Process Alpha', syntheticSources: ['Line Alpha', 'Line Beta'], title: 'Process Alpha', reportTeam: 'Process Alpha', allowMutation: false };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.processStick) return { teamName: 'Process Beta B,Process Beta A', syntheticSources: ['Line Gamma'], title: 'Process Beta B,Process Beta A', reportTeam: 'Process Beta B,Process Beta A', allowMutation: false };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.processLiquid) return { teamName: 'Process Gamma', syntheticSources: ['Line Delta'], title: 'Process Gamma', reportTeam: 'Process Gamma', allowMutation: false };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team1Part1) return { teamName: 'Line Alpha', title: 'Line Alpha', reportTeam: 'Line Alpha', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team1Part2) return { teamName: 'Line Beta', title: 'Line Beta', reportTeam: 'Line Beta', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team2) return { teamName: 'Line Gamma', title: 'Line Gamma', reportTeam: 'Line Gamma', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team3) return { teamName: 'Line Delta', title: 'Line Delta', reportTeam: 'Line Delta', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB) return { teamName: 'Plant B', syntheticSources: ['Line Alpha'], title: 'Plant B', reportTeam: 'Plant B', allowMutation: false };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA) return { teamName: 'Plant A', syntheticSources: ['Line Beta', 'Line Gamma', 'Line Delta'], title: 'Plant A', reportTeam: 'Plant A', allowMutation: false };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.overview) return { teamName: '전체', syntheticSources: ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta'], title: '통합', reportTeam: '전체', allowMutation: false };
                return null;
            }
            if (normalizedItemKey === 'gas') {
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.processDry) {
                    return {
                        teamName: 'Process Alpha',
                        syntheticSources: ['Line Alpha (LNG)', 'Line Beta (LNG)', 'Line Beta (LPG)'],
                        title: 'Process Alpha',
                        reportTeam: 'Process Alpha',
                        allowMutation: false
                    };
                }
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.processLiquid) {
                    return {
                        teamName: 'Process Gamma',
                        syntheticSources: ['Line Delta (LNG)'],
                        title: 'Process Gamma',
                        reportTeam: 'Process Gamma',
                        allowMutation: false
                    };
                }
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team1Part1) return { teamName: 'Line Alpha (LNG)', title: 'Line Alpha / LNG', reportTeam: 'Line Alpha', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team1Part2) {
                    if (gasTeamView === 'lpg') {
                        return { teamName: 'Line Beta (LPG)', title: 'Line Beta / LPG', reportTeam: 'Line Beta LPG', allowMutation: true, showGasToggle: true };
                    }
                    if (gasTeamView === 'lng') {
                        return { teamName: 'Line Beta (LNG)', title: 'Line Beta / LNG', reportTeam: 'Line Beta LNG', allowMutation: true, showGasToggle: true };
                    }
                    return {
                        teamName: 'Line Beta',
                        syntheticSources: ['Line Beta (LNG)', 'Line Beta (LPG)'],
                        title: 'Line Beta / 합산',
                        reportTeam: 'Line Beta LNG+LPG',
                        allowMutation: false,
                        showGasToggle: true
                    };
                }
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.team3) return { teamName: 'Line Delta (LNG)', title: 'Line Delta / LNG', reportTeam: 'Line Delta', allowMutation: true };
                if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB) return { teamName: 'Plant B', syntheticSources: ['Line Alpha (LNG)'], title: 'Plant B', reportTeam: 'Plant B', allowMutation: false };
                const groupedGasSpec = buildUtilSidebarGasGroupedSelectionSpec(normalizedWorkKey, gasTeamView);
                if (groupedGasSpec) return groupedGasSpec;
                return null;
            }
            if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.overview) return { teamName: '전체', syntheticSources: ['Plant B', 'Plant A'], title: '통합', reportTeam: '전체', allowMutation: false };
            if (normalizedWorkKey === UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB) return { teamName: 'Plant B', title: 'Plant B', reportTeam: 'Plant B', allowMutation: true };
            return { teamName: 'Plant A', title: 'Plant A', reportTeam: 'Plant A', allowMutation: true };
        }

        function rerenderActiveUtilCategory() {
            if (typeof selectCategory !== 'function' || typeof getNavigationSelectionCategoryIndex !== 'function') return false;
            const categoryIndex = getNavigationSelectionCategoryIndex('util');
            if (categoryIndex < 0) return false;
            selectCategory('util', categoryIndex, { __skipShortcut: true });
            return true;
        }

        function applyUtilSidebarSelectionToCurrentView(itemKey = '', teamDataKey = '') {
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey);
            const normalizedWorkKey = normalizeUtilSidebarWorkKey(normalizedItemKey, teamDataKey);
            if (!normalizedWorkKey) return false;
            if (typeof applyWorkTeamCalendarMode === 'function') {
                if (normalizedItemKey === 'waste') {
                    applyWorkTeamCalendarMode('group');
                } else if ([
                    UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB,
                    UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA,
                    UTIL_SIDEBAR_SELECTOR_KEYS.overview
                ].includes(normalizedWorkKey)) {
                    applyWorkTeamCalendarMode('group');
                } else if ([
                    UTIL_SIDEBAR_SELECTOR_KEYS.processDry,
                    UTIL_SIDEBAR_SELECTOR_KEYS.processStick,
                    UTIL_SIDEBAR_SELECTOR_KEYS.processLiquid
                ].includes(normalizedWorkKey)) {
                    applyWorkTeamCalendarMode('process');
                } else {
                    applyWorkTeamCalendarMode('detail');
                }
            }
            if (typeof WorkState !== 'undefined' && WorkState) WorkState.teamCalendarHubDataKey = normalizedWorkKey;
            return rerenderActiveUtilCategory();
        }

        function applyUtilReportTeamToUtilitySelection(itemKey = '', teamName = '') {
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey);
            const rawTeam = String(teamName || '').trim();
            if (!rawTeam || rawTeam === 'all' || rawTeam === '전체' || rawTeam === '통합') {
                return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.overview);
            }
            const processKey = getUtilSidebarProcessSelectionKey(rawTeam);
            if (processKey) {
                if (normalizedItemKey === 'gas' && processKey === UTIL_SIDEBAR_SELECTOR_KEYS.processStick) {
                    return false;
                }
                return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, processKey);
            }
            const canonical = canonicalizeUtilTeamName(rawTeam);
            if (normalizedItemKey === 'gas') {
                const section = typeof getUtilDualCombinedSection === 'function' ? getUtilDualCombinedSection('gas') : null;
                const aggregate = typeof parseUtilReportGasAggregateTeamLabel === 'function'
                    ? parseUtilReportGasAggregateTeamLabel(rawTeam)
                    : null;
                if (aggregate) {
                    utilSidebarSelectionState.gasTeamView = aggregate.fuelKey === 'lpg' ? 'lpg' : 'lng';
                    if (section) section.dataset.utilGasTeamView = utilSidebarSelectionState.gasTeamView;
                    return applyUtilSidebarSelectionToCurrentView(
                        'gas',
                        aggregate.groupKey === 'overview'
                            ? UTIL_SIDEBAR_SELECTOR_KEYS.overview
                            : UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA
                    );
                }
                if (canonical === '1팀1파트') {
                    utilSidebarSelectionState.gasTeamView = 'lng';
                    if (section) section.dataset.utilGasTeamView = 'lng';
                    return applyUtilSidebarSelectionToCurrentView('gas', UTIL_SIDEBAR_SELECTOR_KEYS.team1Part1);
                }
                if (canonical === '1팀2파트') {
                    const fuelKey = inferUtilFuelType(rawTeam);
                    utilSidebarSelectionState.gasTeamView = /합산|lng\+lpg/i.test(rawTeam)
                        ? 'total'
                        : (fuelKey === 'lpg' ? 'lpg' : (fuelKey === 'lng' ? 'lng' : 'total'));
                    if (section) section.dataset.utilGasTeamView = utilSidebarSelectionState.gasTeamView;
                    return applyUtilSidebarSelectionToCurrentView('gas', UTIL_SIDEBAR_SELECTOR_KEYS.team1Part2);
                }
                if (canonical === 'Line Gamma') return applyUtilSidebarSelectionToCurrentView('gas', UTIL_SIDEBAR_SELECTOR_KEYS.team2);
                if (canonical === 'Line Delta') return applyUtilSidebarSelectionToCurrentView('gas', UTIL_SIDEBAR_SELECTOR_KEYS.team3);
                const gasSiteKey = normalizeUtilReportSiteKey(rawTeam);
                if (gasSiteKey === 'Plant B') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB);
                if (gasSiteKey === 'Plant A') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA);
                return false;
            }
            const siteKey = normalizeUtilReportSiteKey(rawTeam);
            if (siteKey === 'Plant B') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantB);
            if (siteKey === 'Plant A') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.groupPlantA);
            if (canonical === '1팀1파트') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.team1Part1);
            if (canonical === '1팀2파트') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.team1Part2);
            if (canonical === 'Line Gamma') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.team2);
            if (canonical === 'Line Delta') return applyUtilSidebarSelectionToCurrentView(normalizedItemKey, UTIL_SIDEBAR_SELECTOR_KEYS.team3);
            return false;
        }

        window.getUtilSidebarSelectionWorkDataKey = getUtilSidebarSelectionWorkDataKey;
        window.applyUtilSidebarSelectionToCurrentView = applyUtilSidebarSelectionToCurrentView;
        window.applyUtilReportTeamToUtilitySelection = applyUtilReportTeamToUtilitySelection;

        function renderUtilDualTabsWithSidebarSelection(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-dual]').forEach(wrapper => {
                const key = normalizeUtilDualDatasetKey(wrapper.dataset.utilDual);
                const config = UTIL_DUAL_CONFIG[key];
                if (!config || !Array.isArray(config.data)) return;
                config.data = config.data.filter(item => !item?.__utilSidebarSynthetic);
                const combinedSection = wrapper.querySelector('[data-util-dual-section="combined"]');
                const selectionSpec = resolveUtilSidebarSelectionSpec(key, getUtilSidebarSelectionWorkDataKey(key), combinedSection);
                if (selectionSpec?.syntheticSources) {
                    const syntheticTeam = buildUtilSidebarSyntheticTeam(key, selectionSpec.teamName, selectionSpec.syntheticSources);
                    if (syntheticTeam) config.data.push(syntheticTeam);
                }
            });

            originalRenderUtilDualTabs(root);

            root.querySelectorAll('[data-util-dual]').forEach(wrapper => {
                const key = normalizeUtilDualDatasetKey(wrapper.dataset.utilDual);
                const tabs = wrapper.querySelector('[data-util-dual-tabs]');
                const combinedSection = wrapper.querySelector('[data-util-dual-section="combined"]');
                const combinedContent = wrapper.querySelector('[data-util-dual-content="combined"]');
                const controls = combinedSection?.querySelector('[data-util-dual-controls]');
                const titleEl = combinedSection?.querySelector('.util-dual-title');
                const selectionSpec = resolveUtilSidebarSelectionSpec(key, getUtilSidebarSelectionWorkDataKey(key), combinedSection);
                if (!tabs || !combinedSection || !combinedContent) return;
                tabs.hidden = true;
                if (!selectionSpec) {
                    combinedSection.dataset.activeTeam = '';
                    combinedSection.dataset.reportTeam = '';
                    tabs.innerHTML = '';
                    combinedContent.innerHTML = buildUtilSidebarPromptHtml(key);
                    if (titleEl) titleEl.textContent = '팀을 선택해주세요';
                    if (controls) controls.hidden = true;
                    return;
                }
                const targetButton = Array.from(tabs.querySelectorAll('[data-team]'))
                    .find(button => String(button.dataset.team || '').trim() === selectionSpec.teamName) || null;
                if (targetButton && !targetButton.classList.contains('active')) {
                    targetButton.click();
                }
                tabs.innerHTML = '';
                combinedSection.dataset.reportTeam = selectionSpec.reportTeam || selectionSpec.teamName || '';
                if (titleEl) titleEl.textContent = selectionSpec.title || selectionSpec.teamName || '유틸리티';
                if (selectionSpec.note && !combinedContent.querySelector('[data-util-sidebar-note]')) {
                    combinedContent.insertAdjacentHTML('afterbegin', `<p class="mb-3 text-sm text-amber-600" data-util-sidebar-note>${escapeUtilSidebarHtml(selectionSpec.note)}</p>`);
                }
                combinedSection.dataset.allowDirectMutation = selectionSpec.allowMutation ? 'true' : 'false';
                if (controls) {
                    controls.hidden = false;
                    const uploadButton = controls.querySelector('[data-production-upload-open]');
                    const deleteButton = controls.querySelector('[data-util-delete-open]');
                    if (uploadButton) uploadButton.disabled = selectionSpec.allowMutation !== true;
                    if (deleteButton) deleteButton.disabled = selectionSpec.allowMutation !== true;
                    if (key === 'gas') {
                        let gasToggleWrap = controls.querySelector('[data-gas-team-view-wrap]');
                        if (selectionSpec.showGasToggle === true) {
                            if (!gasToggleWrap) {
                                gasToggleWrap = document.createElement('label');
                                gasToggleWrap.className = 'util-dual-control';
                                gasToggleWrap.setAttribute('data-gas-team-view-wrap', '');
                                gasToggleWrap.innerHTML = `Line Beta<select class="util-table-select util-table-select-sm" data-gas-team-view><option value="lng">LNG</option><option value="lpg">LPG</option><option value="total">합산</option></select>`;
                                const convertControl = controls.querySelector('[data-gas-convert]')?.closest('.util-dual-control');
                                if (convertControl) controls.insertBefore(gasToggleWrap, convertControl);
                                else controls.appendChild(gasToggleWrap);
                                gasToggleWrap.querySelector('[data-gas-team-view]')?.addEventListener('change', () => {
                                    const nextValue = String(gasToggleWrap.querySelector('[data-gas-team-view]')?.value || 'total').trim().toLowerCase();
                                    combinedSection.dataset.utilGasTeamView = ['lng', 'lpg', 'total'].includes(nextValue) ? nextValue : 'total';
                                    utilSidebarSelectionState.gasTeamView = combinedSection.dataset.utilGasTeamView;
                                    rerenderActiveUtilCategory();
                                });
                            }
                            const gasToggleSelect = gasToggleWrap.querySelector('[data-gas-team-view]');
                            if (gasToggleSelect) {
                                const nextValue = String(combinedSection.dataset.utilGasTeamView || utilSidebarSelectionState.gasTeamView || 'total').trim().toLowerCase();
                                gasToggleSelect.value = ['lng', 'lpg', 'total'].includes(nextValue) ? nextValue : 'total';
                            }
                        } else if (gasToggleWrap) {
                            gasToggleWrap.remove();
                        }
                    }
                }
            });
        }

        if (typeof originalRenderUtilDualTabs === 'function') {
            window.renderUtilDualTabs = renderUtilDualTabsWithSidebarSelection;
            renderUtilDualTabs = renderUtilDualTabsWithSidebarSelection;
        }

        const originalSyncUtilReportBuilderVizStateFromDualSection = syncUtilReportBuilderVizStateFromDualSection;
        syncUtilReportBuilderVizStateFromDualSection = function overrideSyncUtilReportBuilderVizStateFromDualSection(section, datasetKey = '') {
            if (section?.dataset?.reportTeam) {
                const originalActiveTeam = section.dataset.activeTeam;
                section.dataset.activeTeam = section.dataset.reportTeam;
                try {
                    return originalSyncUtilReportBuilderVizStateFromDualSection(section, datasetKey);
                } finally {
                    section.dataset.activeTeam = originalActiveTeam;
                }
            }
            return originalSyncUtilReportBuilderVizStateFromDualSection(section, datasetKey);
        };

        const originalToggleUtilInlineReport = toggleUtilInlineReport;
        toggleUtilInlineReport = function overrideToggleUtilInlineReport(itemKey = '', teamName = '') {
            const normalizedItemKey = normalizeUtilDualDatasetKey(
                itemKey || UtilReportBuilderVizState.itemKey || UtilReportState.builderItemKey || 'electric'
            );
            const section = typeof getUtilDualCombinedSection === 'function'
                ? getUtilDualCombinedSection(normalizedItemKey)
                : null;
            const popup = typeof getUtilReportBuilderVizPopupWindow === 'function'
                ? getUtilReportBuilderVizPopupWindow()
                : null;
            const inlineModal = document.getElementById('util-report-builder-viz-modal');
            const isFreshOpen = (!popup || popup.closed)
                && !inlineModal?.classList?.contains?.('is-open');
            if (section) {
                syncUtilReportBuilderVizStateFromDualSection(section, normalizedItemKey);
            }
            if (isFreshOpen && typeof resetUtilReportBuilderVizRangeToFull === 'function') {
                resetUtilReportBuilderVizRangeToFull();
            }
            if (isFreshOpen) {
                UtilReportBuilderVizState.hasGenerated = true;
                UtilReportBuilderVizState.isDirty = false;
                UtilReportBuilderVizState.focusMonthKey = '';
                UtilReportBuilderVizState.focusSeriesKey = '';
                UtilReportBuilderVizState.detailFocusSeriesKey = '';
                UtilReportBuilderVizState.pendingDetailScroll = false;
            }
            const nextTeam = String(section?.dataset?.reportTeam || teamName || '').trim();
            return originalToggleUtilInlineReport(normalizedItemKey, nextTeam);
        };

        const originalSyncUtilDualSectionFromReportBuilderViz = syncUtilDualSectionFromReportBuilderViz;
        syncUtilDualSectionFromReportBuilderViz = function overrideSyncUtilDualSectionFromReportBuilderViz(itemKey = UtilReportBuilderVizState.itemKey) {
            const normalizedItemKey = normalizeUtilDualDatasetKey(itemKey);
            const section = getUtilDualCombinedSection(normalizedItemKey);
            if (section) {
                section.dataset.datasetKey = normalizedItemKey;
                section.dataset.usageUnitKey = normalizeUtilDualUsageUnitKey(UtilReportBuilderVizState.usageUnitKey, normalizedItemKey);
                section.dataset.costUnitKey = normalizeUtilReportCostUnitKey(UtilReportBuilderVizState.costUnitKey);
                section.dataset.productionUnitKey = normalizeUtilReportProductionUnitKey(UtilReportBuilderVizState.productionUnitKey);
                section.dataset.usageDecimals = String(getUtilReportBuilderVizMetricDecimals('usage'));
                section.dataset.costDecimals = String(getUtilReportBuilderVizMetricDecimals('cost'));
                section.dataset.productionDecimals = String(getUtilReportBuilderVizMetricDecimals('production'));
                section.dataset.ratioDecimals = String(getUtilReportBuilderVizMetricDecimals('ratio'));
                section.dataset.reportDecimals = section.dataset.usageDecimals;
                section.dataset.reportShowLabels = UtilReportBuilderVizState.showLabels === true ? 'true' : 'false';
                section.dataset.ratioNumerator = resolveUtilDualRatioMetricKeyByGraphMetric(normalizedItemKey, UtilReportState.graphNumeratorMetric, 'usage');
                section.dataset.ratioDenominator = resolveUtilDualRatioMetricKeyByGraphMetric(normalizedItemKey, UtilReportState.graphDenominatorMetric, 'production');
                const nextTeam = normalizeUtilReportBuilderTeam(UtilReportBuilderVizState.team, normalizedItemKey);
                if (applyUtilReportTeamToUtilitySelection(normalizedItemKey, nextTeam)) {
                    return;
                }
            }
            return originalSyncUtilDualSectionFromReportBuilderViz(itemKey);
        };
