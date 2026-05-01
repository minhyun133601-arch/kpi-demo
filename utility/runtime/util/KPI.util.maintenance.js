        function syncUtilCostRowTotal(row) {
            if (!row?.costs || typeof row.costs !== 'object') return false;
            let total = 0;
            let hasValue = false;
            Object.keys(row.costs).forEach(key => {
                if (key === 'total') return;
                const numeric = parseUtilAmount(row.costs[key]);
                if (!Number.isFinite(numeric)) return;
                total += numeric;
                hasValue = true;
            });
            const nextTotal = hasValue ? total : null;
            let changed = false;
            if (row.cost !== nextTotal) {
                row.cost = nextTotal;
                changed = true;
            }
            if (row.costs.total !== nextTotal) {
                row.costs.total = nextTotal;
                changed = true;
            }
            return changed;
        }

        function clearUtilMonthMetricValue(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const teamName = String(options.teamName || '').trim();
            const yearValue = Number(options.yearValue);
            const monthValue = Number(options.monthValue);
            const metricKey = String(options.metricKey || '').trim();
            const costSubKeys = Array.isArray(options.costSubKeys)
                ? options.costSubKeys.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            const deferRebuild = options.deferRebuild === true;
            if (!datasetKey || !teamName || !Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !metricKey) {
                return { changed: false, removedProductionCount: 0 };
            }
            const row = findUtilDatasetMonthRow(datasetKey, teamName, yearValue, monthValue);
            let changed = false;
            let removedProductionCount = 0;

            if (metricKey === 'usage') {
                if (row && row.usage !== null) {
                    row.usage = null;
                    changed = true;
                }
            } else if (metricKey === 'cost') {
                const hasSelectiveCostKeys = costSubKeys.length > 0;
                const hasCostObject = row?.costs && typeof row.costs === 'object';
                if (hasSelectiveCostKeys) {
                    const keySet = new Set(costSubKeys);
                    if (hasCostObject && keySet.has('total')) {
                        Object.keys(row.costs).forEach(key => keySet.add(key));
                    }
                    if (row && keySet.has('total') && row.cost !== null) {
                        row.cost = null;
                        changed = true;
                    }
                    if (hasCostObject) {
                        Object.keys(row.costs).forEach(key => {
                            if (!keySet.has(key)) return;
                            if (row.costs[key] !== null) {
                                row.costs[key] = null;
                                changed = true;
                            }
                        });
                        if (syncUtilCostRowTotal(row)) {
                            changed = true;
                        }
                    }
                } else {
                    if (row && row.cost !== null) {
                        row.cost = null;
                        changed = true;
                    }
                    if (hasCostObject) {
                        Object.keys(row.costs).forEach(key => {
                            if (row.costs[key] !== null) {
                                row.costs[key] = null;
                                changed = true;
                            }
                        });
                        if (syncUtilCostRowTotal(row)) {
                            changed = true;
                        }
                    }
                }
            } else if (metricKey === 'production') {
                if (row && row.production !== null) {
                    row.production = null;
                    changed = true;
                }
                const keySet = buildUtilProductionMonthKeySet(teamName, yearValue, monthValue);
                const removed = removeUtilProductionEntriesByKeySet(keySet);
                if (removed > 0) {
                    removedProductionCount = removed;
                    changed = true;
                }
            } else {
                return { changed: false, removedProductionCount: 0 };
            }

            if (changed && !deferRebuild) {
                rebuildUtilEntryCollections();
            }
            return { changed, removedProductionCount };
        }

        function clearUtilRangeMetricValues(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const teamName = String(options.teamName || '').trim();
            const fromYm = String(options.fromYm || '').trim();
            const toYm = String(options.toYm || '').trim();
            const metricKeys = Array.isArray(options.metricKeys)
                ? options.metricKeys.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            const wasteCostSubKeys = Array.isArray(options.wasteCostSubKeys)
                ? options.wasteCostSubKeys.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            if (!datasetKey || !teamName || !fromYm || !toYm || !metricKeys.length) {
                return { changed: false, removedProductionCount: 0, touchedMonthCount: 0 };
            }
            const range = buildUtilYearMonthRange(fromYm, toYm);
            if (!range.length) {
                return { changed: false, removedProductionCount: 0, touchedMonthCount: 0 };
            }
            const metricSet = Array.from(new Set(metricKeys.filter(key => ['usage', 'cost', 'production'].includes(key))));
            if (!metricSet.length) {
                return { changed: false, removedProductionCount: 0, touchedMonthCount: 0 };
            }

            let changed = false;
            let removedProductionCount = 0;
            range.forEach(point => {
                metricSet.forEach(metricKey => {
                    const result = clearUtilDeleteSelectionMonthMetricValue({
                        datasetKey,
                        teamName,
                        yearValue: point.year,
                        monthValue: point.month,
                        metricKey,
                        costSubKeys: metricKey === 'cost' ? wasteCostSubKeys : [],
                        deferRebuild: true
                    });
                    if (result.changed) changed = true;
                    if (result.removedProductionCount > 0) {
                        removedProductionCount += Number(result.removedProductionCount) || 0;
                    }
                });
            });

            if (changed) {
                rebuildUtilEntryCollections();
            }
            return {
                changed,
                removedProductionCount,
                touchedMonthCount: range.length
            };
        }

        function buildUtilProductionCalendarYearKeySet(yearValue, sourceTeams) {
            const keySet = new Set();
            const safeYear = Number(yearValue);
            if (!Number.isFinite(safeYear)) return keySet;
            const normalizedSourceTeams = new Set(
                (Array.isArray(sourceTeams) ? sourceTeams : [])
                    .map(name => normalizeUtilTeamName(name).toLowerCase())
                    .filter(Boolean)
            );
            if (!normalizedSourceTeams.size) return keySet;
            (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                (team?.entries || []).forEach(entry => {
                    const parsed = parseUtilDateKey(entry?.date);
                    if (!parsed || parsed.year !== safeYear) return;
                    const teamName = String(entry?.team ?? team?.name ?? '').trim();
                    const teamKey = normalizeUtilTeamName(teamName).toLowerCase();
                    if (!teamKey || !normalizedSourceTeams.has(teamKey)) return;
                    const key = buildUtilProductionDailyEntryKey({
                        ...entry,
                        team: teamName
                    });
                    if (key) keySet.add(key);
                });
            });
            return keySet;
        }

        function applyUtilYearDeleteActions(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const teamName = String(options.teamName || '').trim();
            const yearValue = Number(options.yearValue);
            if (!datasetKey || !teamName || !Number.isFinite(yearValue)) {
                return { changed: false, removedProductionCount: 0 };
            }
            let changed = false;
            let removedProductionCount = 0;
            if (options.clearUsage && clearUtilYearUsageValues(datasetKey, teamName, yearValue)) {
                changed = true;
            }
            if (options.clearCost && clearUtilYearCostValues(datasetKey, teamName, yearValue)) {
                changed = true;
            }
            if (options.clearProduction) {
                if (clearUtilYearProductionValues(datasetKey, teamName, yearValue)) {
                    changed = true;
                }
                const sourceTeams = resolveUtilProductionSourceTeams(teamName);
                const keySet = buildUtilProductionCalendarYearKeySet(yearValue, sourceTeams);
                const removed = removeUtilProductionEntriesByKeySet(keySet);
                if (removed > 0) {
                    removedProductionCount = removed;
                    changed = true;
                }
            }
            if (changed) {
                rebuildUtilEntryCollections();
            }
            return { changed, removedProductionCount };
        }

        function refreshUtilViewsAfterDataMutation(scope) {
            const root = scope || document;
            try {
                initUnifiedUtilAnalytics(root);
                initUtilAnalyticsRepeaters(root);
                initUtilEnergyLauncher(root);
                if (typeof runUtilReportFromState === 'function') {
                    runUtilReportFromState({ renderModal: false });
                }
            } catch (error) {
                // 일부 패널이 없는 경우는 무시
            }
        }

        const UTIL_EXPORT_TEAM_OPTIONS = {
            default: ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta', 'Plant A'],
            waste: ['전체', 'Plant A', 'Plant B']
        };
        const UTIL_EXPORT_ITEM_OPTIONS = [
            { key: 'all', label: '전체' },
            { key: 'usage', label: '사용량' },
            { key: 'cost', label: '비용' },
            { key: 'production', label: '생산량' }
        ];

        function normalizeUtilMetricSelectionKeys(value, fallback = []) {
            const fallbackKeys = Array.isArray(fallback) ? fallback : [fallback];
            const rawList = Array.isArray(value)
                ? value
                : String(value || '')
                    .split(',')
                    .map(item => String(item || '').trim())
                    .filter(Boolean);
            const metricKeys = ['usage', 'cost', 'production'];
            const fallbackList = fallbackKeys.map(item => String(item || '').trim()).filter(Boolean);
            if (rawList.includes('none')) return [];
            if (rawList.includes('all')) return metricKeys.slice();
            const selected = Array.from(new Set(rawList.filter(key => metricKeys.includes(key))));
            const ordered = metricKeys.filter(key => selected.includes(key));
            if (ordered.length) return ordered;
            if (fallbackList.includes('none')) return [];
            if (fallbackList.includes('all')) return metricKeys.slice();
            const fallbackSelected = Array.from(new Set(fallbackList.filter(key => metricKeys.includes(key))));
            return metricKeys.filter(key => fallbackSelected.includes(key));
        }

        function expandUtilMetricSelectionKeys(value, fallback = []) {
            return normalizeUtilMetricSelectionKeys(value, fallback);
        }

        function isUtilMetricSelectionAllSelected(value) {
            const normalized = normalizeUtilMetricSelectionKeys(value, []);
            return normalized.length === 3;
        }

        function serializeUtilMetricSelectionKeys(value, fallback = []) {
            const normalized = normalizeUtilMetricSelectionKeys(value, fallback);
            return normalized.length ? normalized.join(',') : 'none';
        }

        function toggleUtilMetricSelectionKeys(currentValue, toggleKey) {
            const rawKey = String(toggleKey || '').trim();
            if (!rawKey) return normalizeUtilMetricSelectionKeys(currentValue, []);
            const current = expandUtilMetricSelectionKeys(currentValue);
            if (rawKey === 'all') {
                return isUtilMetricSelectionAllSelected(current) ? [] : ['usage', 'cost', 'production'];
            }
            const nextSet = new Set(current);
            if (nextSet.has(rawKey)) nextSet.delete(rawKey);
            else nextSet.add(rawKey);
            return ['usage', 'cost', 'production'].filter(key => nextSet.has(key));
        }

        function getUtilMetricSelectionLabels(value, fallback = []) {
            const normalized = normalizeUtilMetricSelectionKeys(value, fallback);
            if (normalized.length === 3) return ['전체'];
            return UTIL_EXPORT_ITEM_OPTIONS
                .filter(item => item.key !== 'all' && normalized.includes(item.key))
                .map(item => item.label);
        }

        function buildUtilMetricToggleButtonsHtml(value, role = 'item-toggle') {
            const normalized = normalizeUtilMetricSelectionKeys(value);
            return `
                <div class="util-production-toggle-grid" data-role="${role}-grid">
                    ${UTIL_EXPORT_ITEM_OPTIONS.map(item => {
                        const isActive = item.key === 'all'
                            ? normalized.length === 3
                            : normalized.includes(item.key);
                        return `<button type="button" class="util-production-toggle-btn ${isActive ? 'is-active' : ''}" data-role="${role}" data-item-key="${item.key}" aria-pressed="${isActive ? 'true' : 'false'}">${item.label}</button>`;
                    }).join('')}
                </div>
            `;
        }

        function syncUtilMetricToggleButtons(scope, value, role = 'item-toggle') {
            if (!scope || typeof scope.querySelectorAll !== 'function') return;
            const normalized = normalizeUtilMetricSelectionKeys(value);
            scope.querySelectorAll(`[data-role="${role}"]`).forEach(button => {
                const key = String(button.dataset.itemKey || '').trim();
                const isActive = key === 'all'
                    ? normalized.length === 3
                    : normalized.includes(key);
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
        }

        function getUtilMetricSelectionFileLabel(value, fallback = []) {
            const labels = getUtilMetricSelectionLabels(value, fallback);
            return labels.join('+') || '미선택';
        }

        function buildUtilExportTeamOptions(datasetKey) {
            const normalizedDatasetKey = String(datasetKey || '').trim();
            if (normalizedDatasetKey === 'waste') {
                return UTIL_EXPORT_TEAM_OPTIONS.waste.filter(teamName => teamName === '전체' || hasUtilReportTeamOption(UTIL_WASTE_ENTRIES, teamName));
            }
            return UTIL_EXPORT_TEAM_OPTIONS.default.slice();
        }

        function normalizeUtilExportTeamFilter(teamName) {
            const raw = String(teamName || '').trim();
            if (!raw) return '';
            const normalized = normalizeUtilTeamName(raw).toLowerCase();
            if (!normalized) return '';
            if (normalized === 'all' || normalized.includes('전체')) return 'all';
            return raw;
        }

        function matchesUtilExportTeamSelection(datasetKey, selectedTeamName, entryTeamName) {
            const filter = normalizeUtilExportTeamFilter(selectedTeamName);
            if (!filter || filter === 'all') return true;
            return matchesUtilReportTeamFilter(datasetKey, filter, entryTeamName);
        }

        function buildUtilDeleteItemOptions(datasetKey, teamName = '') {
            return [
                { key: 'production', label: '생산량', metricKey: 'production', wasteCostSubKeys: [] }
            ];
        }

        function resolveUtilDeleteItemConfig(itemKey, datasetKey, teamName = '') {
            const options = buildUtilDeleteItemOptions(datasetKey, teamName);
            const raw = String(itemKey || '').trim();
            if (!options.length) return null;
            const direct = options.find(item => item.key === raw);
            if (direct) return direct;
            if (raw.startsWith('cost')) {
                return options.find(item => item.metricKey === 'cost') || options[0];
            }
            return options[0];
        }

        function resolveUtilDeleteItemSelectionValue(itemKey, datasetKey, teamName = '') {
            return String(resolveUtilDeleteItemConfig(itemKey, datasetKey, teamName)?.key || '').trim();
        }

        function getUtilDatasetLabel(datasetKey) {
            if (datasetKey === 'electric') return '전기';
            if (datasetKey === 'gas') return '가스';
            if (datasetKey === 'waste') return '폐수';
            return datasetKey || '유틸리티';
        }

        function resolveUtilExportCanonicalTeamName(teamName) {
            const normalized = normalizeUtilTeamName(teamName).toLowerCase();
            if (!normalized) return '';
            if (normalized.includes('Plant B')) return 'Line Alpha';
            if (normalized.includes('Plant A')) return 'Plant A';
            if (normalized.includes('1팀') && normalized.includes('1파트')) return 'Line Alpha';
            if (normalized.includes('1팀') && normalized.includes('2파트')) return 'Line Beta';
            if (normalized.includes('Line Gamma')) return 'Line Gamma';
            if (normalized.includes('Line Delta')) return 'Line Delta';
            return '';
        }

        const UTIL_DELETE_MIN_MONTH = '2024-01';

        function listUtilDatasetYearMonths(datasetKey) {
            const source = getUtilDatasetSourceByKey(datasetKey);
            if (!Array.isArray(source)) return [];
            const monthSet = new Set();
            source.forEach(team => {
                (team?.years || []).forEach(yearNode => {
                    const yearValue = parseUtilYearLabel(yearNode?.label);
                    if (!Number.isFinite(yearValue)) return;
                    (yearNode?.rows || []).forEach(row => {
                        if (!row || typeof row !== 'object') return;
                        if (row.label === '계' || row.label === '평균') return;
                        const monthValue = parseUtilMonthLabel(row.label);
                        if (!monthValue) return;
                        if (!isUtilYearMonthWithinToday(yearValue, monthValue)) return;
                        monthSet.add(`${yearValue}-${String(monthValue).padStart(2, '0')}`);
                    });
                });
            });
            return Array.from(monthSet).sort((a, b) => a.localeCompare(b, 'ko'));
        }

        function listUtilDeleteYearMonths() {
            const currentMonth = getCurrentMonthKey();
            const ranged = buildUtilYearMonthRange(UTIL_DELETE_MIN_MONTH, currentMonth).map(item => item.key);
            return ranged.length ? ranged : [currentMonth].filter(Boolean);
        }

        function getUtilDeleteDefaultRange(datasetKey = '') {
            const datasetMonthOptions = listUtilDatasetYearMonths(datasetKey);
            const monthOptions = datasetMonthOptions.length
                ? datasetMonthOptions
                : listUtilDeleteYearMonths();
            return {
                fromYm: monthOptions[0] || UTIL_DELETE_MIN_MONTH,
                toYm: monthOptions[monthOptions.length - 1] || getCurrentMonthKey()
            };
        }

        function parseUtilYearMonthText(value) {
            const match = /^(\d{4})-(\d{2})$/.exec(String(value || '').trim());
            if (!match) return null;
            const year = Number(match[1]);
            const month = Number(match[2]);
            if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
            return { year, month };
        }

        function buildUtilYearMonthRange(fromYm, toYm) {
            const from = parseUtilYearMonthText(fromYm);
            const to = parseUtilYearMonthText(toYm);
            if (!from || !to) return [];
            const fromKey = from.year * 12 + from.month;
            const toKey = to.year * 12 + to.month;
            if (fromKey > toKey) return [];
            const result = [];
            for (let key = fromKey; key <= toKey; key += 1) {
                const year = Math.floor((key - 1) / 12);
                const month = key - year * 12;
                result.push({
                    year,
                    month,
                    key: `${year}-${String(month).padStart(2, '0')}`
                });
            }
            return result;
        }

        const UTIL_DELETE_DATASET_OPTIONS = [
            { key: 'electric', label: '전기' },
            { key: 'gas', label: '가스' },
            { key: 'waste', label: '폐수' }
        ];
        const UTIL_DELETE_TEAM_OPTIONS = {
            default: ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta', 'Plant A', '전체'],
            waste: ['Plant A', 'Plant B', '전체']
        };

        function listUtilDatasetTeamNames(datasetKey) {
            return String(datasetKey || '').trim() === 'waste'
                ? UTIL_DELETE_TEAM_OPTIONS.waste.slice()
                : UTIL_DELETE_TEAM_OPTIONS.default.slice();
        }

        function resolveUtilDeleteTeamSelectionValue(teamName, datasetKey = '') {
            const raw = String(teamName || '').trim();
            if (!raw) return '';
            const normalized = normalizeUtilTeamName(raw).toLowerCase();
            const options = listUtilDatasetTeamNames(datasetKey);
            if (normalized.includes('전체')) return options.includes('전체') ? '전체' : '';
            const direct = options.find(item => normalizeUtilTeamName(item).toLowerCase() === normalized);
            if (direct) return direct;
            if (String(datasetKey || '').trim() === 'waste') {
                const siteKey = canonicalizeUtilTeamName(raw);
                if (siteKey === 'Plant A' && options.includes('Plant A')) return 'Plant A';
                if (siteKey === 'Plant B' && options.includes('Plant B')) return 'Plant B';
                return '';
            }
            const canonical = resolveUtilExportCanonicalTeamName(raw);
            return options.includes(canonical) ? canonical : '';
        }

        function matchesUtilDeleteTeamSelection(selectedTeamName, candidateTeamName, datasetKey = '') {
            const selectedTeam = resolveUtilDeleteTeamSelectionValue(selectedTeamName, datasetKey);
            if (!selectedTeam) return false;
            if (selectedTeam === '전체') return true;
            if (String(datasetKey || '').trim() === 'waste') {
                return canonicalizeUtilTeamName(candidateTeamName) === selectedTeam;
            }
            const candidateTeam = resolveUtilDeleteTeamSelectionValue(candidateTeamName, datasetKey);
            if (!candidateTeam) return false;
            if (selectedTeam === 'Plant A') {
                return candidateTeam !== 'Line Alpha' && candidateTeam !== '전체';
            }
            return candidateTeam === selectedTeam;
        }

        function findUtilDatasetDeleteMonthRows(datasetKey, teamName, yearValue, monthValue) {
            const source = getUtilDatasetSourceByKey(datasetKey);
            if (!Array.isArray(source) || !source.length) return [];
            const matchedRows = [];
            source.forEach(team => {
                if (!matchesUtilDeleteTeamSelection(teamName, team?.name, datasetKey)) return;
                const yearNode = (team?.years || []).find(item => parseUtilYearLabel(item?.label) === yearValue);
                if (!yearNode || !Array.isArray(yearNode.rows)) return;
                const row = yearNode.rows.find(item => {
                    if (!item || typeof item !== 'object') return false;
                    if (item.label === '계' || item.label === '평균') return false;
                    return parseUtilMonthLabel(item.label) === monthValue;
                });
                if (row) matchedRows.push(row);
            });
            return matchedRows;
        }

        function buildUtilDeleteProductionMonthKeySet(teamName, yearValue, monthValue) {
            const keySet = new Set();
            const sourceTeams = resolveUtilProductionSourceTeams(teamName);
            sourceTeams.forEach(sourceTeam => {
                const listed = listUtilDailyEntriesByMetric(sourceTeam, yearValue, monthValue, 'amount');
                (listed?.entries || []).forEach(entry => {
                    if (entry?.entryKey) keySet.add(String(entry.entryKey));
                });
            });
            return keySet;
        }

        function clearUtilDeleteSelectionMonthMetricValue(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const teamName = String(options.teamName || '').trim();
            const yearValue = Number(options.yearValue);
            const monthValue = Number(options.monthValue);
            const metricKey = String(options.metricKey || '').trim();
            const costSubKeys = Array.isArray(options.costSubKeys)
                ? options.costSubKeys.map(item => String(item || '').trim()).filter(Boolean)
                : [];
            const deferRebuild = options.deferRebuild === true;
            if (!datasetKey || !teamName || !Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !metricKey) {
                return { changed: false, removedProductionCount: 0 };
            }

            const rows = findUtilDatasetDeleteMonthRows(datasetKey, teamName, yearValue, monthValue);
            let changed = false;
            let removedProductionCount = 0;

            if (metricKey === 'usage') {
                rows.forEach(row => {
                    if (row && row.usage !== null) {
                        row.usage = null;
                        changed = true;
                    }
                });
            } else if (metricKey === 'cost') {
                const hasSelectiveCostKeys = costSubKeys.length > 0;
                rows.forEach(row => {
                    const hasCostObject = row?.costs && typeof row.costs === 'object';
                    if (hasSelectiveCostKeys) {
                        const keySet = new Set(costSubKeys);
                        if (hasCostObject && keySet.has('total')) {
                            Object.keys(row.costs).forEach(key => keySet.add(key));
                        }
                        if (keySet.has('total') && row?.cost !== null) {
                            row.cost = null;
                            changed = true;
                        }
                        if (hasCostObject) {
                            Object.keys(row.costs).forEach(key => {
                                if (!keySet.has(key)) return;
                                if (row.costs[key] !== null) {
                                    row.costs[key] = null;
                                    changed = true;
                                }
                            });
                            if (syncUtilCostRowTotal(row)) {
                                changed = true;
                            }
                        }
                        return;
                    }
                    if (row?.cost !== null) {
                        row.cost = null;
                        changed = true;
                    }
                    if (hasCostObject) {
                        Object.keys(row.costs).forEach(key => {
                            if (row.costs[key] !== null) {
                                row.costs[key] = null;
                                changed = true;
                            }
                        });
                        if (syncUtilCostRowTotal(row)) {
                            changed = true;
                        }
                    }
                });
            } else if (metricKey === 'production') {
                rows.forEach(row => {
                    if (row && row.production !== null) {
                        row.production = null;
                        changed = true;
                    }
                });
                const keySet = buildUtilDeleteProductionMonthKeySet(teamName, yearValue, monthValue);
                const removed = removeUtilProductionEntriesByKeySet(keySet);
                if (removed > 0) {
                    removedProductionCount = removed;
                    changed = true;
                }
            } else {
                return { changed: false, removedProductionCount: 0 };
            }

            if (changed && !deferRebuild) {
                rebuildUtilEntryCollections();
            }
            return { changed, removedProductionCount };
        }

        function ensureUtilSelectiveDeleteModal() {
            let modal = document.getElementById('util-selective-delete-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-selective-delete-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 선택 삭제">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title">유틸리티 선택 삭제</div>
                        <div class="util-production-modal-header-actions">
                            <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                        </div>
                    </div>
                    <div class="util-production-modal-body">
                        <div class="util-production-modal-meta">
                            <span data-role="dataset"></span>
                            <span data-role="summary"></span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                            <label class="util-dual-control">
                                시작
                                <select class="util-table-select util-table-select-sm" data-role="from"></select>
                            </label>
                            <label class="util-dual-control">
                                종료
                                <select class="util-table-select util-table-select-sm" data-role="to"></select>
                            </label>
                            <label class="util-dual-control">
                                팀
                                <select class="util-table-select util-table-select-sm" data-role="team"></select>
                            </label>
                        </div>
                        <div style="display:grid; gap:0.32rem;">
                            <div style="font-size:0.72rem; font-weight:800; color:#475569;">품목</div>
                            <div class="util-production-toggle-grid">
                                <button type="button" class="util-production-toggle-btn is-active" aria-pressed="true" disabled>생산량</button>
                            </div>
                            <div style="font-size:0.72rem; color:#64748b;">사용량과 비용은 이 삭제 창에서 지우지 않습니다.</div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:0.4rem; margin-top:0.7rem;">
                            <button type="button" class="util-detail-btn" data-role="apply">삭제</button>
                        </div>
                    </div>
                </div>
            `;
            modal.addEventListener('click', event => {
                if (event.target === modal) closeUtilSelectiveDeleteModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) closeBtn.addEventListener('click', () => closeUtilSelectiveDeleteModal());
            document.body.appendChild(modal);
            return modal;
        }

        function closeUtilSelectiveDeleteModal() {
            const modal = document.getElementById('util-selective-delete-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

        function syncUtilSelectiveDeleteModalControls(modal, options = {}) {
            if (!modal) return;
            const datasetBadge = modal.querySelector('[data-role="dataset"]');
            const teamSelect = modal.querySelector('[data-role="team"]');
            const fromSelect = modal.querySelector('[data-role="from"]');
            const toSelect = modal.querySelector('[data-role="to"]');
            const summaryEl = modal.querySelector('[data-role="summary"]');

            const preferredDataset = String(options.preferredDataset || '').trim();
            const preferredFrom = String(options.preferredFrom || '').trim();
            const preferredTo = String(options.preferredTo || '').trim();
            const currentDataset = String(modal.dataset.datasetKey || '').trim();
            const currentTeam = String(teamSelect?.value || '').trim();
            const currentFrom = String(fromSelect?.value || '').trim();
            const currentTo = String(toSelect?.value || '').trim();
            const datasetKey = preferredDataset || currentDataset || 'electric';
            const safeDataset = UTIL_DELETE_DATASET_OPTIONS.some(item => item.key === datasetKey) ? datasetKey : 'electric';
            modal.dataset.datasetKey = safeDataset;
            if (datasetBadge) datasetBadge.textContent = `구분: ${getUtilDatasetLabel(safeDataset)}`;

            const teamNames = listUtilDatasetTeamNames(safeDataset);
            if (teamSelect) {
                const teamHtml = teamNames.map(team => `<option value="${escapeHtml(team)}">${escapeHtml(team)}</option>`).join('');
                if (teamSelect.innerHTML !== teamHtml) {
                    teamSelect.innerHTML = teamHtml;
                }
                const preferredTeam = resolveUtilDeleteTeamSelectionValue(options.preferredTeam, safeDataset);
                const normalizedCurrentTeam = resolveUtilDeleteTeamSelectionValue(currentTeam, safeDataset) || currentTeam;
                const safeTeam = preferredTeam && teamNames.includes(preferredTeam)
                    ? preferredTeam
                    : (teamNames.includes(normalizedCurrentTeam) ? normalizedCurrentTeam : (teamNames[0] || ''));
                teamSelect.value = safeTeam;
            }

            const datasetMonthOptions = listUtilDatasetYearMonths(safeDataset);
            const monthOptions = datasetMonthOptions.length
                ? datasetMonthOptions
                : listUtilDeleteYearMonths();
            const monthHtml = monthOptions.map(month => `<option value="${month}">${month}</option>`).join('');
            if (fromSelect) {
                if (fromSelect.innerHTML !== monthHtml) {
                    fromSelect.innerHTML = monthHtml;
                }
            }
            if (toSelect) {
                if (toSelect.innerHTML !== monthHtml) {
                    toSelect.innerHTML = monthHtml;
                }
            }

            const safeFrom = preferredFrom && monthOptions.includes(preferredFrom)
                ? preferredFrom
                : (monthOptions.includes(currentFrom) ? currentFrom : (monthOptions[0] || ''));
            const safeTo = preferredTo && monthOptions.includes(preferredTo)
                ? preferredTo
                : (monthOptions.includes(currentTo) ? currentTo : (monthOptions[monthOptions.length - 1] || ''));
            if (fromSelect) {
                fromSelect.value = safeFrom;
            }
            if (toSelect) {
                toSelect.value = safeTo;
            }
            if (fromSelect && toSelect && fromSelect.value && toSelect.value && fromSelect.value > toSelect.value) {
                toSelect.value = fromSelect.value;
            }

            const selectedItemKeys = ['production'];
            modal.dataset.selectedItemKeys = 'production';

            if (summaryEl) {
                const selectedTeam = String(teamSelect?.value || '').trim();
                const fromVal = String(fromSelect?.value || '').trim() || '-';
                const toVal = String(toSelect?.value || '').trim() || '-';
                const itemSummary = getUtilMetricSelectionLabels(selectedItemKeys).join(', ');
                summaryEl.textContent = `${selectedTeam || '-'} · ${itemSummary || '-'} · ${fromVal} ~ ${toVal}`;
            }
        }

function openUtilSelectiveDeleteModal(options = {}) {
            const modal = ensureUtilSelectiveDeleteModal();
            modal._onApplied = typeof options.onApplied === 'function' ? options.onApplied : null;
            const teamSelect = modal.querySelector('[data-role="team"]');
            const fromSelect = modal.querySelector('[data-role="from"]');
            const toSelect = modal.querySelector('[data-role="to"]');
            const applyButton = modal.querySelector('[data-role="apply"]');
            const datasetKey = String(options.datasetKey || modal.dataset.datasetKey || '').trim();
            const defaultRange = getUtilDeleteDefaultRange(datasetKey);

            syncUtilSelectiveDeleteModalControls(modal, {
                preferredDataset: datasetKey,
                preferredTeam: options.teamName,
                preferredFrom: options.fromYm || defaultRange.fromYm,
                preferredTo: options.toYm || defaultRange.toYm
            });

            const resync = (nextOptions = {}) => {
                syncUtilSelectiveDeleteModalControls(modal, nextOptions);
            };
            if (teamSelect) teamSelect.onchange = () => {
                resync();
            };
            if (fromSelect) fromSelect.onchange = () => {
                if (toSelect && fromSelect.value && toSelect.value && fromSelect.value > toSelect.value) {
                    toSelect.value = fromSelect.value;
                }
                resync();
            };
            if (toSelect) toSelect.onchange = () => {
                if (fromSelect && fromSelect.value && toSelect.value && fromSelect.value > toSelect.value) {
                    fromSelect.value = toSelect.value;
                }
                resync();
            };
            resync();

            if (applyButton) {
                applyButton.onclick = () => {
                    const datasetKey = String(modal.dataset.datasetKey || '').trim();
                    const teamName = String(teamSelect?.value || '').trim();
                    const fromYm = String(fromSelect?.value || '').trim();
                    const toYm = String(toSelect?.value || '').trim();
                    const selectedItemKeys = ['production'];
                    const metricKeys = ['production'];
                    if (!datasetKey || !teamName || !fromYm || !toYm || !metricKeys.length) {
                        alert('팀/기간/품목을 모두 선택해주세요.');
                        return;
                    }
                    if (fromYm > toYm) {
                        alert('시작 기간은 종료 기간보다 늦을 수 없습니다.');
                        return;
                    }
                    const wasteCostSubKeys = [];
                    const selectedLabels = getUtilMetricSelectionLabels(selectedItemKeys).join(', ');
                    const confirmMessage = `${getUtilDatasetLabel(datasetKey)} / ${teamName}\n${fromYm} ~ ${toYm}\n품목: ${selectedLabels}\n삭제를 진행할까요?`;
                    const ok = confirm(confirmMessage);
                    if (!ok) return;
                    const result = clearUtilRangeMetricValues({
                        datasetKey,
                        teamName,
                        fromYm,
                        toYm,
                        metricKeys,
                        wasteCostSubKeys
                    });
                    if (!result.changed) {
                        alert('삭제할 데이터가 없습니다.');
                        return;
                    }
                    if (typeof modal._onApplied === 'function') {
                        modal._onApplied(result, {
                            datasetKey,
                            teamName,
                            fromYm,
                            toYm,
                            itemKeys: selectedItemKeys,
                            metricKeys,
                            wasteCostSubKeys
                        });
                    }
                    closeUtilSelectiveDeleteModal();
                };
            }

            modal.classList.add('is-open');
        }

        function sumUtilDatasetMetricForExport(datasetKey, teamName, yearValue, monthValue, metricKey) {
            const dataset = UTIL_ANALYTICS_UNIFIED[String(datasetKey || '').trim()];
            const entries = Array.isArray(dataset?.entries) ? dataset.entries : [];
            if (!entries.length) return null;
            let sum = 0;
            let hasValue = false;
            entries.forEach(entry => {
                if (Number(entry?.year) !== Number(yearValue) || Number(entry?.month) !== Number(monthValue)) return;
                if (!matchesUtilExportTeamSelection(datasetKey, teamName, entry?.team)) return;
                const rawValue = metricKey === 'cost'
                    ? entry?.cost
                    : entry?.[metricKey];
                const numeric = parseUtilAmount(rawValue);
                if (!Number.isFinite(numeric)) return;
                sum += numeric;
                hasValue = true;
            });
            return hasValue ? sum : null;
        }

        function sumUtilWasteCostDetailsForExport(teamName, yearValue, monthValue) {
            const totals = {};
            let hasValue = false;
            (UTIL_WASTE_ENTRIES || []).forEach(entry => {
                if (Number(entry?.year) !== Number(yearValue) || Number(entry?.month) !== Number(monthValue)) return;
                if (!matchesUtilExportTeamSelection('waste', teamName, entry?.team)) return;
                const costs = entry?.costs && typeof entry.costs === 'object'
                    ? entry.costs
                    : null;
                if (costs) {
                    let hasDetailValue = false;
                    Object.keys(costs).forEach(key => {
                        const numeric = parseUtilAmount(costs[key]);
                        if (!Number.isFinite(numeric)) return;
                        totals[key] = (Number(totals[key]) || 0) + numeric;
                        hasValue = true;
                        hasDetailValue = true;
                    });
                    if (hasDetailValue) return;
                }
                const totalNumeric = parseUtilAmount(entry?.cost);
                if (!Number.isFinite(totalNumeric)) return;
                totals.total = (Number(totals.total) || 0) + totalNumeric;
                hasValue = true;
            });
            return hasValue ? totals : null;
        }

        function resolveUtilExportProductionValue(teamName, yearValue, monthValue) {
            const metric = getUtilDailyMetricValue(teamName, yearValue, monthValue, 'amount');
            const value = Number(metric?.value);
            return Number.isFinite(value) ? value : null;
        }

        function buildUtilMetricExportRows(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const fromYm = String(options.fromYm || '').trim();
            const toYm = String(options.toYm || '').trim();
            const teamName = String(options.teamName || '').trim();
            const selectedItemKeys = normalizeUtilMetricSelectionKeys(
                Array.isArray(options.itemKeys) ? options.itemKeys : (options.itemKey || 'none'),
                []
            );
            const metricKeys = expandUtilMetricSelectionKeys(selectedItemKeys, []);
            if (!datasetKey || !fromYm || !toYm || !teamName || !metricKeys.length) return [];
            const range = buildUtilYearMonthRange(fromYm, toYm);
            if (!range.length) return [];
            const rows = [];
            const wasteCostModes = datasetKey === 'waste'
                ? getWasteCostModesByTeam(teamName).filter(mode => String(mode?.key || '').trim())
                : [];
            range.forEach(point => {
                metricKeys.forEach(targetItemKey => {
                    if (datasetKey === 'waste' && targetItemKey === 'cost') {
                        const detailValues = sumUtilWasteCostDetailsForExport(teamName, point.year, point.month);
                        const totalValue = parseUtilAmount(detailValues?.total);
                        if (Number.isFinite(totalValue)) {
                            rows.push({
                                period: point.key,
                                team: teamName,
                                itemKey: 'cost',
                                value: totalValue
                            });
                        } else {
                            const fallbackTotal = sumUtilDatasetMetricForExport(datasetKey, teamName, point.year, point.month, 'cost');
                            if (Number.isFinite(fallbackTotal)) {
                                rows.push({
                                    period: point.key,
                                    team: teamName,
                                    itemKey: 'cost',
                                    value: fallbackTotal
                                });
                            }
                        }
                        wasteCostModes.forEach(mode => {
                            const subKey = String(mode?.key || '').trim();
                            if (!subKey || subKey === 'total') return;
                            const numeric = parseUtilAmount(detailValues?.[subKey]);
                            if (!Number.isFinite(numeric)) return;
                            rows.push({
                                period: point.key,
                                team: teamName,
                                itemKey: `cost:${subKey}`,
                                value: numeric
                            });
                        });
                        return;
                    }
                    const value = targetItemKey === 'production'
                        ? resolveUtilExportProductionValue(teamName, point.year, point.month)
                        : sumUtilDatasetMetricForExport(datasetKey, teamName, point.year, point.month, targetItemKey);
                    if (!Number.isFinite(value)) return;
                    rows.push({
                        period: point.key,
                        team: teamName,
                        itemKey: targetItemKey,
                        value
                    });
                });
            });
            return rows;
        }

        function sanitizeUtilExportFileToken(value, fallback = '전체') {
            const text = String(value || '').trim() || fallback;
            return text.replace(/[\\/:*?"<>|]/g, '_');
        }

        function downloadUtilMetricExportXlsx(rows, options = {}) {
            if (!window.XLSX) throw new Error('엑셀 라이브러리 로드 실패');
            const datasetKey = String(options.datasetKey || '').trim();
            const datasetLabel = getUtilDatasetLabel(datasetKey);
            const selectedItemKeys = normalizeUtilMetricSelectionKeys(
                Array.isArray(options.itemKeys) ? options.itemKeys : (options.itemKey || 'none'),
                []
            );
            const metricKeys = expandUtilMetricSelectionKeys(selectedItemKeys, []);
            const itemLabel = getUtilMetricSelectionFileLabel(selectedItemKeys);
            const formatExportMetricValue = (metricKey, rawValue) => {
                const numeric = parseUtilAmount(rawValue);
                if (!Number.isFinite(numeric)) return '';
                if (metricKey === 'cost') return formatUtilNumber(numeric, 0);
                if (metricKey === 'usage') return formatUtilNumber(numeric, 3);
                if (metricKey === 'production') return formatUtilNumber(numeric, 3);
                return formatUtilNumber(numeric, 3);
            };
            const teamName = String(options.teamName || '').trim();
            const fromYm = String(options.fromYm || '').trim();
            const toYm = String(options.toYm || '').trim();
            const sortedRows = (Array.isArray(rows) ? rows : [])
                .slice()
                .sort((a, b) => {
                    const periodDiff = String(a?.period || '').localeCompare(String(b?.period || ''), 'ko');
                    if (periodDiff !== 0) return periodDiff;
                    const teamDiff = String(a?.team || '').localeCompare(String(b?.team || ''), 'ko');
                    if (teamDiff !== 0) return teamDiff;
                    const orderMap = { usage: 1, cost: 2, production: 3 };
                    const aOrder = orderMap[String(a?.itemKey || '')] || 99;
                    const bOrder = orderMap[String(b?.itemKey || '')] || 99;
                    return aOrder - bOrder;
                });
            const includeUsage = metricKeys.includes('usage');
            const includeCost = metricKeys.includes('cost');
            const includeProduction = metricKeys.includes('production');
            const isWasteDetailedCostExport = datasetKey === 'waste'
                && includeCost
                && sortedRows.some(row => String(row?.itemKey || '').startsWith('cost:'));
            const wasteCostModes = isWasteDetailedCostExport
                ? getWasteCostModesByTeam(teamName).filter(mode => String(mode?.key || '').trim())
                : [];
            const wasteCostDetailModes = wasteCostModes.filter(mode => String(mode?.key || '').trim() !== 'total');
            const buildGroupedExportRows = () => {
                const grouped = new Map();
                sortedRows.forEach(row => {
                    const period = String(row?.period || '');
                    const team = String(row?.team || '');
                    const key = `${period}||${team}`;
                    if (!grouped.has(key)) {
                        grouped.set(key, {
                            period,
                            team,
                            usage: null,
                            cost: null,
                            production: null,
                            costDetails: {}
                        });
                    }
                    const target = grouped.get(key);
                    const metricKey = String(row?.itemKey || '').trim();
                    const metricValue = parseUtilAmount(row?.value);
                    if (!Number.isFinite(metricValue)) return;
                    if (metricKey === 'usage') {
                        target.usage = metricValue;
                        return;
                    }
                    if (metricKey === 'cost') {
                        target.cost = metricValue;
                        return;
                    }
                    if (metricKey === 'production') {
                        target.production = metricValue;
                        return;
                    }
                    if (metricKey.startsWith('cost:')) {
                        target.costDetails[metricKey.slice(5)] = metricValue;
                    }
                });
                return Array.from(grouped.values()).sort((a, b) => {
                    const periodDiff = String(a.period || '').localeCompare(String(b.period || ''), 'ko');
                    if (periodDiff !== 0) return periodDiff;
                    return String(a.team || '').localeCompare(String(b.team || ''), 'ko');
                });
            };

            const sheetRows = [];
            let dataSheetCols = [];
            let usageTotal = 0;
            let costTotal = 0;
            let productionTotal = 0;
            const wasteDetailTotals = {};
            const groupedRows = buildGroupedExportRows();
            const headerRow = ['기간', '팀'];
            if (includeUsage) headerRow.push('사용량');
            if (includeCost) {
                headerRow.push('비용');
                if (isWasteDetailedCostExport) {
                    headerRow.push(...wasteCostDetailModes.map(mode => stripUtilLabelUnitSuffix(mode?.label || mode?.key || '')));
                }
            }
            if (includeProduction) headerRow.push('생산량');
            sheetRows.push(headerRow);

            groupedRows.forEach(row => {
                const line = [row.period, row.team];
                const usageValue = Number(row.usage);
                const costValue = Number(row.cost);
                const productionValue = Number(row.production);
                if (includeUsage) {
                    if (Number.isFinite(usageValue)) usageTotal += usageValue;
                    line.push(formatExportMetricValue('usage', row.usage));
                }
                if (includeCost) {
                    if (Number.isFinite(costValue)) costTotal += costValue;
                    line.push(formatExportMetricValue('cost', row.cost));
                    if (isWasteDetailedCostExport) {
                        wasteCostDetailModes.forEach(mode => {
                            const key = String(mode?.key || '').trim();
                            const detailValue = Number(row.costDetails?.[key]);
                            if (Number.isFinite(detailValue)) {
                                wasteDetailTotals[key] = (Number(wasteDetailTotals[key]) || 0) + detailValue;
                            }
                            line.push(formatExportMetricValue('cost', row.costDetails?.[key]));
                        });
                    }
                }
                if (includeProduction) {
                    if (Number.isFinite(productionValue)) productionTotal += productionValue;
                    line.push(formatExportMetricValue('production', row.production));
                }
                sheetRows.push(line);
            });

            dataSheetCols = [
                { wch: 10 },
                { wch: 12 },
                ...(includeUsage ? [{ wch: 14 }] : []),
                ...(includeCost ? [{ wch: 16 }] : []),
                ...(includeCost && isWasteDetailedCostExport ? wasteCostDetailModes.map(() => ({ wch: 18 })) : []),
                ...(includeProduction ? [{ wch: 14 }] : [])
            ];
            const dataSheet = XLSX.utils.aoa_to_sheet(sheetRows);
            dataSheet['!cols'] = dataSheetCols;

            const summaryRows = [
                ['생성일시', new Date().toLocaleString('ko-KR')],
                ['구분', datasetLabel],
                ['기간', `${fromYm} ~ ${toYm}`],
                ['팀', teamName],
                ['품목', itemLabel],
                ['데이터 행수', formatUtilNumber(Math.max(0, sheetRows.length - 1), 0)]
            ];
            if (includeUsage) {
                summaryRows.push(['사용량 합계', formatExportMetricValue('usage', usageTotal)]);
            }
            if (includeCost) {
                summaryRows.push(['비용 합계', formatExportMetricValue('cost', costTotal)]);
                if (isWasteDetailedCostExport) {
                    wasteCostDetailModes.forEach(mode => {
                        const key = String(mode?.key || '').trim();
                        summaryRows.push([`${stripUtilLabelUnitSuffix(mode?.label || key)} 합계`, formatExportMetricValue('cost', wasteDetailTotals[key])]);
                    });
                }
            }
            if (includeProduction) {
                summaryRows.push(['생산량 합계', formatExportMetricValue('production', productionTotal)]);
            }
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, dataSheet, '추출데이터');
            XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');
            const periodToken = `${sanitizeUtilExportFileToken(fromYm)}-${sanitizeUtilExportFileToken(toYm)}`;
            const fileName = `유틸리티추출_${periodToken}_${sanitizeUtilExportFileToken(teamName)}_${sanitizeUtilExportFileToken(itemLabel)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            return fileName;
        }

        function ensureUtilMetricExportModal() {
            let modal = document.getElementById('util-metric-export-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-metric-export-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 엑셀 추출">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title">유틸리티 엑셀 추출</div>
                        <div class="util-production-modal-header-actions">
                            <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                        </div>
                    </div>
                    <div class="util-production-modal-body">
                        <div class="util-production-modal-meta">
                            <span data-role="dataset"></span>
                            <span data-role="summary">기간 / 팀 / 품목 선택 후 추출</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                            <label class="util-dual-control">
                                시작
                                <select class="util-table-select util-table-select-sm" data-role="start"></select>
                            </label>
                            <label class="util-dual-control">
                                종료
                                <select class="util-table-select util-table-select-sm" data-role="end"></select>
                            </label>
                            <label class="util-dual-control">
                                팀
                                <select class="util-table-select util-table-select-sm" data-role="team"></select>
                            </label>
                        </div>
                        <div style="display:grid; gap:0.32rem;">
                            <div style="font-size:0.72rem; font-weight:800; color:#475569;">품목</div>
                            ${buildUtilMetricToggleButtonsHtml(['all'], 'export-item-toggle')}
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
                            <button type="button" class="util-detail-btn" data-role="download">엑셀 추출</button>
                        </div>
                    </div>
                </div>
            `;
            modal.addEventListener('click', event => {
                if (event.target === modal) closeUtilMetricExportModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) closeBtn.addEventListener('click', () => closeUtilMetricExportModal());
            document.body.appendChild(modal);
            return modal;
        }

        function closeUtilMetricExportModal() {
            const modal = document.getElementById('util-metric-export-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

        function openUtilMetricExportModal(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            if (!datasetKey) return;
            const monthOptions = listUtilDatasetYearMonths(datasetKey);
            if (!monthOptions.length) {
                alert('추출 가능한 기간 데이터가 없습니다.');
                return;
            }
            const modal = ensureUtilMetricExportModal();
            modal.dataset.datasetKey = datasetKey;
            const datasetBadge = modal.querySelector('[data-role="dataset"]');
            const summaryEl = modal.querySelector('[data-role="summary"]');
            if (datasetBadge) datasetBadge.textContent = `구분: ${getUtilDatasetLabel(datasetKey)}`;
            const startSelect = modal.querySelector('[data-role="start"]');
            const endSelect = modal.querySelector('[data-role="end"]');
            const teamSelect = modal.querySelector('[data-role="team"]');
            if (startSelect) {
                startSelect.innerHTML = monthOptions.map(month => `<option value="${month}">${month}</option>`).join('');
                startSelect.value = monthOptions[0];
            }
            if (endSelect) {
                endSelect.innerHTML = monthOptions.map(month => `<option value="${month}">${month}</option>`).join('');
                endSelect.value = monthOptions[monthOptions.length - 1];
            }
            if (teamSelect) {
                const teamOptions = buildUtilExportTeamOptions(datasetKey);
                teamSelect.innerHTML = teamOptions.map(team => `<option value="${team}">${team}</option>`).join('');
                teamSelect.value = teamOptions[0] || '';
            }
            modal.dataset.selectedItemKeys = serializeUtilMetricSelectionKeys(['all'], ['all']);
            syncUtilMetricToggleButtons(modal, ['all'], 'export-item-toggle');
            const syncExportSummary = () => {
                const selectedItemKeys = normalizeUtilMetricSelectionKeys(modal.dataset.selectedItemKeys || 'none', []);
                syncUtilMetricToggleButtons(modal, selectedItemKeys, 'export-item-toggle');
                if (summaryEl) {
                    const fromYm = String(startSelect?.value || '').trim() || '-';
                    const toYm = String(endSelect?.value || '').trim() || '-';
                    const teamName = String(teamSelect?.value || '').trim() || '-';
                    const itemSummary = getUtilMetricSelectionLabels(selectedItemKeys).join(', ');
                    summaryEl.textContent = `${teamName} · ${itemSummary || '-'} · ${fromYm} ~ ${toYm}`;
                }
            };
            if (startSelect) {
                startSelect.onchange = () => {
                    if (endSelect && startSelect.value && endSelect.value && startSelect.value > endSelect.value) {
                        endSelect.value = startSelect.value;
                    }
                    syncExportSummary();
                };
            }
            if (endSelect) {
                endSelect.onchange = () => {
                    if (startSelect && startSelect.value && endSelect.value && startSelect.value > endSelect.value) {
                        startSelect.value = endSelect.value;
                    }
                    syncExportSummary();
                };
            }
            if (teamSelect) {
                teamSelect.onchange = () => {
                    syncExportSummary();
                };
            }
            modal.querySelectorAll('[data-role="export-item-toggle"]').forEach(button => {
                button.onclick = () => {
                    const current = String(modal.dataset.selectedItemKeys || '').trim();
                    const next = toggleUtilMetricSelectionKeys(current, button.dataset.itemKey || '');
                    modal.dataset.selectedItemKeys = serializeUtilMetricSelectionKeys(next);
                    syncExportSummary();
                };
            });
            syncExportSummary();
            const downloadBtn = modal.querySelector('[data-role="download"]');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    if (!window.XLSX) {
                        alert('엑셀 라이브러리 로드 실패: 네트워크 상태를 확인해주세요.');
                        return;
                    }
                    const fromYm = String(startSelect?.value || '').trim();
                    const toYm = String(endSelect?.value || '').trim();
                    const teamName = String(teamSelect?.value || '').trim();
                    const selectedItemKeys = normalizeUtilMetricSelectionKeys(modal.dataset.selectedItemKeys || 'none', []);
                    if (!fromYm || !toYm || !teamName || !selectedItemKeys.length) {
                        alert('시작/종료/팀/품목을 선택해주세요.');
                        return;
                    }
                    if (fromYm > toYm) {
                        alert('시작 기간은 종료 기간보다 늦을 수 없습니다.');
                        return;
                    }
                    const rows = buildUtilMetricExportRows({
                        datasetKey,
                        fromYm,
                        toYm,
                        teamName,
                        itemKeys: selectedItemKeys
                    });
                    if (!rows.length) {
                        alert('선택한 조건에 맞는 데이터가 없습니다.');
                        return;
                    }
                    try {
                        const fileName = downloadUtilMetricExportXlsx(rows, {
                            datasetKey,
                            fromYm,
                            toYm,
                            teamName,
                            itemKeys: selectedItemKeys
                        });
                        alert(`엑셀 추출 완료: ${fileName}`);
                        closeUtilMetricExportModal();
                    } catch (error) {
                        alert(`엑셀 추출 실패: ${error?.message || '알 수 없는 오류'}`);
                    }
                };
            }
            modal.classList.add('is-open');
        }

        collectUtilEntries(UTIL_ELECTRIC_DATA, UTIL_ELECTRIC_ENTRIES);
        collectUtilEntries(UTIL_GAS_DATA, UTIL_GAS_ENTRIES);
        collectUtilEntries(UTIL_WASTE_DATA, UTIL_WASTE_ENTRIES);

        const UTIL_WASTE_COST_BASE = [
            { key: 'total', label: '총 운용비용 (원)' },
            { key: 'water', label: '상수비 (원)' },
            { key: 'share', label: '폐수 분담금 (원)' },
            { key: 'sludge', label: '폐수오니 처리비용 (원)' },
            { key: 'resin', label: '폐합성 수지 처리비용 (원)' }
        ];

        function getWasteCostModesByTeam(teamName) {
            const selection = resolveUtilDeleteTeamSelectionValue(teamName);
            const includeLabor = selection === '전체' || selection === 'Line Alpha' || String(teamName || '').includes('Plant B');
            const includeOutsourcing = selection === '전체'
                || selection === 'Plant A'
                || selection === 'Line Beta'
                || selection === 'Line Gamma'
                || selection === 'Line Delta'
                || String(teamName || '').includes('Plant A');
            const modes = UTIL_WASTE_COST_BASE.slice();
            if (includeLabor) {
                modes.push({ key: 'labor', label: '인건비 (원)' });
            }
            if (includeOutsourcing) {
                modes.push({ key: 'outsourcing', label: '위탁관리비 (원)' });
            }
            return modes;
        }

        const UTIL_DUAL_CONFIG = {
            electric: {
                data: UTIL_ELECTRIC_DATA,
                usageLabel: '사용량 (kWh)',
                costLabel: '비용 (원)',
                productionLabel: '생산량 (kg)',
                emptyText: '전기 사용량 및 비용 데이터를 월별로 공식 기록해 주세요. (kWh, 비용, 생산량 등)'
            },
            gas: {
                data: UTIL_GAS_DATA,
                usageLabel: '사용량 (LNG m³ / LPG kg)',
                usageLabelByTeam: (teamName) => {
                    const name = String(teamName || '');
                    if (name.includes('LPG')) return 'LPG 사용량 (kg)';
                    if (name.includes('LNG')) return 'LNG 사용량 (m³)';
                    return '사용량 (LNG m³ / LPG kg)';
                },
                costLabel: '비용 (원)',
                productionLabel: '생산량 (kg)',
                emptyText: '가스 사용량 및 비용 데이터를 월별로 공식 기록해 주세요. (사용량, 비용, 생산량 등)'
            },
            waste: {
                data: UTIL_WASTE_DATA,
                usageLabel: '방류량 (㎥)',
                costLabel: '총 운용비용 (원)',
                hideCostLabel: true,
                costModesByTeam: getWasteCostModesByTeam,
                costModeKey: 'total',
                productionLabel: '생산량 (kg)',
                emptyText: '폐수 발생 및 처리 데이터를 월별로 공식 기록해 주세요. (배출량, 처리비, 관련 비용 등)'
            }
        };

        const UTIL_ANALYTICS_DATASETS = {
            electric: {
                label: '전기',
                metrics: [
                    { key: 'usage', label: '사용량 (kWh)' },
                    { key: 'cost', label: '비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_ELECTRIC_ENTRIES
            },
            gas: {
                label: '가스',
                metrics: [
                    { key: 'usage', label: '사용량 (LNG m³ / LPG kg)' },
                    { key: 'cost', label: '비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_GAS_ENTRIES
            },
            waste: {
                label: '폐수',
                metrics: [
                    { key: 'usage', label: '방류량 (㎥)' },
                    { key: 'cost', label: '총 운용비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_WASTE_ENTRIES
            },
            production: {
                label: '생산량',
                metrics: [
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_PRODUCTION_ENTRIES
            }
        };

        const UTIL_ANALYTICS_UNIFIED = {
            electric: { key: 'electric', label: '전기', metrics: UTIL_ANALYTICS_DATASETS.electric.metrics, entries: UTIL_ANALYTICS_DATASETS.electric.entries },
            gas: { key: 'gas', label: '가스', metrics: UTIL_ANALYTICS_DATASETS.gas.metrics, entries: UTIL_ANALYTICS_DATASETS.gas.entries },
            waste: { key: 'waste', label: '폐수', metrics: UTIL_ANALYTICS_DATASETS.waste.metrics, entries: UTIL_ANALYTICS_DATASETS.waste.entries, costModesByTeam: getWasteCostModesByTeam }
        };
        const UTIL_CHART_COLORS = ['#0f172a', '#2563eb', '#ef4444', '#16a34a', '#f59e0b', '#7c3aed'];

