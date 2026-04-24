        function applyUtilReportSiteFilterFromCompositionMetric(metricValue) {
            const parsed = parseUtilReportSiteCompositionMetric(metricValue);
            const scope = normalizeUtilReportScope(UtilReportState.scopeKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
            if (getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'production') {
                if (parsed.siteKey === 'all') {
                    UtilReportState.productionTeam = 'all';
                    UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                    UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                    UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                    return true;
                }
                UtilReportState.productionTeam = parsed.siteKey === 'Plant B' ? 'Line Alpha' : 'Plant A';
                UtilReportState.activeSiteCompositionKey = buildUtilReportSiteMetricKey(parsed.siteKey);
                UtilReportState.activeTeamCompositionKey = compositionKeys.total;
                UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                return true;
            }
                if (parsed.siteKey === 'all') {
                    const allowedTotalKeys = new Set(['total_cost', 'total_production', compositionKeys.total]);
                    if (!allowedTotalKeys.has(String(parsed.raw || ''))) return false;
                    if (scope === 'total') return false;
                    if (scope === 'electric') {
                        UtilReportState.electricTeam = 'all';
                        resetUtilReportSelectedProcessStates();
                    } else if (scope === 'gas') {
                        UtilReportState.gasTeam = 'all';
                        UtilReportState.gasSelectedCompositionView = 'team';
                        UtilReportState.activeGasProcessCompositionKey = UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
                    } else if (scope === 'waste') {
                        UtilReportState.wasteTeam = 'all';
                    } else {
                        UtilReportState.electricTeam = 'all';
                        UtilReportState.gasTeam = 'all';
                        UtilReportState.wasteTeam = 'all';
                        resetUtilReportSelectedProcessStates();
                    }
                    UtilReportState.activeSiteCompositionKey = compositionKeys.total;
                    return true;
                }
                if (scope === 'electric') {
                    UtilReportState.electricTeam = parsed.siteKey;
                    resetUtilReportSelectedProcessStates();
                } else if (scope === 'gas') {
                    UtilReportState.gasTeam = parsed.siteKey;
                    UtilReportState.gasSelectedCompositionView = 'team';
                    UtilReportState.activeGasProcessCompositionKey = UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
                } else if (scope === 'waste') {
                    UtilReportState.wasteTeam = parsed.siteKey;
                } else {
                    UtilReportState.electricTeam = parsed.siteKey;
                    UtilReportState.gasTeam = parsed.siteKey;
                    UtilReportState.wasteTeam = parsed.siteKey;
                    resetUtilReportSelectedProcessStates();
                }
                UtilReportState.activeSiteCompositionKey = buildUtilReportSiteMetricKey(parsed.siteKey);
                return true;
            }

        function isUtilReportGasCombinedTeamSelection(teamName) {
            const normalized = normalizeUtilTeamName(teamName).toLowerCase();
            if (!normalized) return false;
            return normalized.includes('linebeta') && normalized.includes('lng+lpg');
        }

        function matchesUtilReportTeamFilter(scopeKey, teamFilter, entryTeamName) {
            const filter = String(teamFilter || '').trim();
            if (!filter || filter === 'all') return true;
            const entry = String(entryTeamName || '').trim();
            if (entry === filter) return true;
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            if (normalizedScope === 'gas') {
                const aggregateSources = typeof getUtilReportGasAggregateSourceTeams === 'function'
                    ? getUtilReportGasAggregateSourceTeams(filter)
                    : [];
                if (aggregateSources.length) {
                    return aggregateSources.some(sourceTeamName => (
                        typeof matchesUtilReportGasSourceTeam === 'function'
                            ? matchesUtilReportGasSourceTeam(entry, sourceTeamName)
                            : entry === sourceTeamName
                    ));
                }
            }
            const filterSite = normalizeUtilReportSiteKey(filter);
            if (filterSite !== 'all') {
                const entrySite = resolveUtilReportSiteKeyByTeam(entry);
                if (entrySite && entrySite === filterSite) return true;
            }
            if (normalizedScope === 'gas' && isUtilReportGasCombinedTeamSelection(filter)) {
                return canonicalizeUtilTeamName(entry) === 'LineBeta';
            }
            const filterCanonical = canonicalizeUtilTeamName(filter);
            if (normalizedScope === 'gas' && filterCanonical) {
                const filterFuel = inferUtilFuelType(filter);
                if (filterFuel) {
                    return canonicalizeUtilTeamName(entry) === filterCanonical
                        && inferUtilFuelType(entry) === filterFuel;
                }
            }
            if (filterCanonical && canonicalizeUtilTeamName(entry) === filterCanonical) {
                return true;
            }
            return false;
        }

        function compressUtilReportCompositionItems(items, maxCount = 8) {
            const sorted = (items || []).filter(item => Number(item?.value) > 0).sort((a, b) => Number(b.value) - Number(a.value));
            if (sorted.length <= maxCount) return sorted;
            const keepCount = Math.max(1, maxCount - 1);
            const kept = sorted.slice(0, keepCount);
            const rest = sorted.slice(keepCount);
            const etcValue = rest.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            if (etcValue > 0) {
                kept.push({ key: 'etc', label: '기타', value: etcValue });
            }
            return kept;
        }

        function buildUtilReportSelectedCompositionData(result, yearFilter = '', scopeOverride = '', siteOverride = '') {
            const scope = normalizeUtilReportScope(scopeOverride || UtilReportState.scopeKey);
            const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
            const selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys);
            const selectedScopeSet = new Set(selectedScopeKeys);
            if (compositionCategory === 'production') {
                const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                    .filter(item => !yearFilter || String(item.year) === String(yearFilter));
                const activeSiteKey = resolveUtilReportSelectedSiteContextKey('total', 'production');
                const orderedTeams = resolveUtilReportProductionTeamsBySite(activeSiteKey);
                const colorMap = {
                    'Line Alpha': '#2563eb',
                    'Line Beta': '#f97316',
                    'Line Gamma': '#16a34a',
                    'Line Delta': '#db2777'
                };
                const totals = new Map(orderedTeams.map(team => [team, 0]));
                months.forEach(item => {
                    const year = Number(item.year);
                    const month = Number(item.month);
                    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                    orderedTeams.forEach(teamName => {
                        const value = Number(sumUtilReportProductionBySourceTeams(year, month, [teamName]));
                        if (!Number.isFinite(value) || value <= 0) return;
                        totals.set(teamName, (totals.get(teamName) || 0) + value);
                    });
                });
                const items = orderedTeams
                    .map(teamName => ({
                        key: `생산량::${teamName}`,
                        label: getUtilReportDisplayTeamLabel(teamName, { categoryKey: 'production', scopeKey: 'total' }),
                        sourceLabel: '생산량',
                        teamName,
                        value: Number(totals.get(teamName)) || 0,
                        color: colorMap[teamName] || '#2563eb'
                    }))
                    .filter(item => item.value > 0);
                const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
                const title = activeSiteKey === 'Plant B'
                    ? 'Plant B 생산량 구성비'
                    : (activeSiteKey === 'Plant A'
                        ? 'Plant A 팀별 생산량 구성비'
                        : '팀별 생산량 구성비 (Plant B / Line Beta / Line Gamma / Line Delta)');
                return {
                    title,
                    total,
                    items,
                    valueType: 'production'
                };
            }

            const forcedSiteKey = normalizeUtilReportSiteKey(siteOverride);
            const siteContextKey = forcedSiteKey !== 'all'
                ? forcedSiteKey
                : (['electric', 'gas'].includes(scope)
                    ? resolveUtilReportSelectedSiteContextKey(scope, compositionCategory)
                    : 'all');
            const teamMap = new Map();
            const addEntries = (entries, teamFilter, sourceLabel) => {
                (entries || []).forEach(entry => {
                    const year = Number(entry?.year);
                    const month = Number(entry?.month);
                    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                    if (!isUtilMonthInReportRange(year, month, UtilReportState, yearFilter)) return;
                    const teamName = String(entry?.team || '').trim() || '미지정';
                    if (!matchesUtilReportSiteContext(teamName, siteContextKey)) return;
                    if (!matchesUtilReportTeamFilter(scope, teamFilter, teamName)) return;
                    const cost = Number(entry?.cost);
                    if (!Number.isFinite(cost) || cost <= 0) return;
                    const key = `${sourceLabel}::${teamName}`;
                    const displayTeamLabel = getUtilReportDisplayTeamLabel(teamName, {
                        categoryKey: compositionCategory,
                        scopeKey: scope,
                        sourceLabel
                    });
                    const displayLabel = sourceLabel === '폐수' ? `${displayTeamLabel} 폐수` : displayTeamLabel;
                    const prev = teamMap.get(key) || { key, label: displayLabel, sourceLabel, teamName, value: 0 };
                    prev.value += cost;
                    teamMap.set(key, prev);
                });
            };

            if (scope === 'electric') {
                if (!selectedScopeSet.has('electric')) return { title: '세부 팀 구성비 (전기)', total: 0, items: [], valueType: 'cost' };
                addEntries(UTIL_ELECTRIC_ENTRIES, 'all', '전기');
            } else if (scope === 'gas') {
                if (!selectedScopeSet.has('gas')) return { title: '세부 팀 구성비 (가스)', total: 0, items: [], valueType: 'cost' };
                addEntries(UTIL_GAS_ENTRIES, 'all', '가스');
            } else if (scope === 'waste') {
                if (!selectedScopeSet.has('waste')) return { title: '세부 팀 구성비 (폐수)', total: 0, items: [], valueType: 'cost' };
                addEntries(UTIL_WASTE_ENTRIES, 'all', '폐수');
            } else {
                if (selectedScopeSet.has('electric')) addEntries(UTIL_ELECTRIC_ENTRIES, 'all', '전기');
                if (selectedScopeSet.has('gas')) addEntries(UTIL_GAS_ENTRIES, 'all', '가스');
                if (selectedScopeSet.has('waste')) addEntries(UTIL_WASTE_ENTRIES, 'all', '폐수');
            }

            const palette = ['#2563eb', '#f97316', '#16a34a', '#db2777', '#7c3aed', '#e11d48', '#0891b2', '#ca8a04', '#059669', '#dc2626'];
            const titleMap = {
                total: '세부 팀 구성비 (총합)',
                electric: '세부 팀 구성비 (전기)',
                gas: '세부 팀 구성비 (가스)',
                waste: '세부 팀 구성비 (폐수)'
            };
            let resolvedTitle = titleMap[scope] || '선택값 팀별 구성비';
            const baseItems = Array.from(teamMap.values())
                .filter(item => Number(item?.value) > 0)
                .sort((a, b) => Number(b.value) - Number(a.value));
            const total = baseItems.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            let items = baseItems.slice();
            let ratioTotal = total;
            let totalItemLabel = '';
            if (scope === 'total' && siteContextKey !== 'all') {
                resolvedTitle = `${siteContextKey} 세부팀 구성비`;
                totalItemLabel = `${siteContextKey} 전체`;
            }
            if (scope === 'gas') {
                const selectedSiteKey = normalizeUtilReportSiteKey(siteContextKey);
                totalItemLabel = getUtilReportGasScopeTotalLabel(selectedSiteKey);
                if (selectedSiteKey !== 'all') {
                    resolvedTitle = `${selectedSiteKey} 팀별 구성비 (가스)`;
                }
                const gasTotals = {
                    north: 0,
                    team12: 0,
                    team12Lpg: 0,
                    team12Lng: 0,
                    team3: 0
                };
                baseItems.forEach(item => {
                    const rawTeamName = String(item?.teamName || item?.label || '').trim();
                    const canonical = canonicalizeUtilTeamName(rawTeamName);
                    const fuelKey = inferUtilFuelType(rawTeamName);
                    const value = Number(item?.value) || 0;
                    if (!(value > 0)) return;
                    if (canonical === 'LineAlpha') {
                        gasTotals.north += value;
                        return;
                    }
                    if (canonical === 'LineBeta') {
                        gasTotals.team12 += value;
                        if (fuelKey === 'lpg') gasTotals.team12Lpg += value;
                        if (fuelKey === 'lng') gasTotals.team12Lng += value;
                        return;
                    }
                    if (canonical === 'LineDelta') {
                        gasTotals.team3 += value;
                    }
                });
                const gasItems = [];
                const pushGasItem = (item) => {
                    if (!(Number(item?.value) > 0)) return;
                    gasItems.push(item);
                };
                pushGasItem({
                    key: '가스::Plant B',
                    label: 'Plant B',
                    sourceLabel: '가스',
                    teamName: 'Plant B',
                    value: gasTotals.north,
                    color: '#2563eb'
                });
                pushGasItem({
                    key: '가스::Line Beta',
                    label: 'Line Beta',
                    sourceLabel: '가스',
                    teamName: 'Line Beta',
                    value: gasTotals.team12,
                    color: '#f97316',
                    excludeFromDonut: true
                });
                pushGasItem({
                    key: '가스::Line Beta LPG',
                    label: 'Line Beta LPG',
                    sourceLabel: '가스',
                    teamName: 'Line Beta LPG',
                    value: gasTotals.team12Lpg,
                    color: '#16a34a'
                });
                pushGasItem({
                    key: '가스::Line Beta LNG',
                    label: 'Line Beta LNG',
                    sourceLabel: '가스',
                    teamName: 'Line Beta LNG',
                    value: gasTotals.team12Lng,
                    color: '#db2777'
                });
                pushGasItem({
                    key: '가스::Line Delta',
                    label: 'Line Delta',
                    sourceLabel: '가스',
                    teamName: 'Line Delta',
                    value: gasTotals.team3,
                    color: '#7c3aed'
                });
                items = gasItems;
            }
            items = items.map((item, index) => ({
                ...item,
                color: item?.color || (item?.excludeFromDonut ? '#ea580c' : palette[index % palette.length])
            }));
            let highlightItemKeys = [];
            if (scope === 'electric') {
                const selectedSiteKey = normalizeUtilReportSiteKey(siteContextKey);
                totalItemLabel = getUtilReportElectricScopeTotalLabel(selectedSiteKey);
                if (selectedSiteKey !== 'all') {
                    ratioTotal = total;
                    resolvedTitle = `${selectedSiteKey} 팀별 구성비 (전기)`;
                }
            }
            if (!(ratioTotal > 0)) ratioTotal = total;
            return {
                title: resolvedTitle,
                total,
                ratioTotal,
                siteKey: siteContextKey,
                totalItemLabel,
                highlightItemKeys,
                items,
                valueType: 'cost'
            };
        }

        function buildUtilReportSiteCompositionData(result, yearFilter = '', scopeOverride = '') {
            const scope = normalizeUtilReportScope(scopeOverride || UtilReportState.scopeKey);
            const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
            const selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys);
            const selectedScopeSet = new Set(selectedScopeKeys);
            const siteTotals = new Map([
                ['Plant A', 0],
                ['Plant B', 0]
            ]);
            if (compositionCategory === 'production') {
                const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                    .filter(item => !yearFilter || String(item.year) === String(yearFilter));
                months.forEach(item => {
                    const year = Number(item.year);
                    const month = Number(item.month);
                    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                    ['Plant A', 'Plant B'].forEach(siteKey => {
                        const value = Number(sumUtilReportProductionBySourceTeams(year, month, resolveUtilReportProductionTeamsBySite(siteKey)));
                        if (!Number.isFinite(value) || value <= 0) return;
                        siteTotals.set(siteKey, (siteTotals.get(siteKey) || 0) + value);
                    });
                });

                const items = ['Plant A', 'Plant B']
                    .map(siteKey => ({
                        key: buildUtilReportSiteMetricKey(siteKey),
                        label: siteKey,
                        siteKey,
                        value: Number(siteTotals.get(siteKey)) || 0,
                        color: siteKey === 'Plant A' ? UTIL_REPORT_SITE_COLORS.plantA : UTIL_REPORT_SITE_COLORS.plantB
                    }))
                    .filter(item => item.value > 0);
                const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
                return {
                    title: '총생산량 공장별 구성비 (Plant A/Plant B)',
                    total,
                    items,
                    valueType: 'production'
                };
            }

            const addEntries = (entries, sourceScope) => {
                (entries || []).forEach(entry => {
                    const year = Number(entry?.year);
                    const month = Number(entry?.month);
                    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                    if (!isUtilMonthInReportRange(year, month, UtilReportState, yearFilter)) return;
                    const teamName = String(entry?.team || '').trim();
                    const siteKey = resolveUtilReportSiteKeyByTeam(teamName);
                    if (!siteKey || !siteTotals.has(siteKey)) return;
                    const value = Number(getUtilReportScopeCostFromEntry(entry, sourceScope));
                    if (!Number.isFinite(value) || value <= 0) return;
                    siteTotals.set(siteKey, (siteTotals.get(siteKey) || 0) + value);
                });
            };

            if (scope === 'electric') {
                if (!selectedScopeSet.has('electric')) {
                    return { title: '공장별 구성비 (Plant A/Plant B)', total: 0, items: [], valueType: 'cost' };
                }
                addEntries(UTIL_ELECTRIC_ENTRIES, 'electric');
            } else if (scope === 'gas') {
                if (!selectedScopeSet.has('gas')) {
                    return { title: '공장별 구성비 (Plant A/Plant B)', total: 0, items: [], valueType: 'cost' };
                }
                addEntries(UTIL_GAS_ENTRIES, 'gas');
            } else if (scope === 'waste') {
                if (!selectedScopeSet.has('waste')) {
                    return { title: '공장별 구성비 (Plant A/Plant B)', total: 0, items: [], valueType: 'cost' };
                }
                withUtilReportWasteCostMode('total', () => addEntries(UTIL_WASTE_ENTRIES, 'waste'));
            } else {
                if (selectedScopeSet.has('electric')) addEntries(UTIL_ELECTRIC_ENTRIES, 'electric');
                if (selectedScopeSet.has('gas')) addEntries(UTIL_GAS_ENTRIES, 'gas');
                if (selectedScopeSet.has('waste')) addEntries(UTIL_WASTE_ENTRIES, 'waste');
            }

            const items = ['Plant A', 'Plant B']
                .map(siteKey => ({
                    key: buildUtilReportSiteMetricKey(siteKey),
                    label: getUtilReportSiteCompositionItemLabel(scope, siteKey),
                    siteKey,
                    value: Number(siteTotals.get(siteKey)) || 0,
                    color: siteKey === 'Plant A' ? UTIL_REPORT_SITE_COLORS.plantA : UTIL_REPORT_SITE_COLORS.plantB
                }))
                .filter(item => item.value > 0);
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            const titleMap = {
                total: '총액 공장별 구성비 (Plant A/Plant B)',
                electric: '전기 공장별 구성비 (Plant A/Plant B)',
                gas: '가스 공장별 구성비 (Plant A/Plant B)',
                waste: '폐수 공장별 구성비 (Plant A/Plant B)'
            };
            return {
                title: titleMap[scope] || '공장별 구성비 (Plant A/Plant B)',
                total,
                items,
                valueType: 'cost'
            };
        }

        function buildUtilReportTeamTotalExcludeWasteCompositionData(yearFilter = '') {
            const items = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TEAM_SPECS.map(spec => {
                const series = buildUtilReportTeamTotalExcludeWasteSeries(spec.teamName, yearFilter);
                const value = series.reduce((acc, row) => acc + (Number(row?.value) || 0), 0);
                return {
                    key: buildUtilReportTeamTotalExcludeWasteMetricKey(spec.teamName),
                    label: spec.label,
                    teamName: spec.teamName,
                    value,
                    color: spec.color
                };
            });
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            return {
                title: '총액 팀별 구성비 (폐수제외)',
                total,
                items,
                valueType: 'cost'
            };
        }

        function buildUtilReportProcessTotalExcludeWasteCompositionData(yearFilter = '') {
            const items = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.map(spec => {
                const series = buildUtilReportProcessTotalExcludeWasteSeries(spec.processKey, yearFilter);
                const value = series.reduce((acc, row) => acc + (Number(row?.value) || 0), 0);
                return {
                    key: buildUtilReportProcessTotalExcludeWasteMetricKey(spec.processKey),
                    label: spec.label,
                    processKey: spec.processKey,
                    value,
                    color: spec.color
                };
            });
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            return {
                title: '총액 공정별 구성비 (폐수제외)',
                total,
                items,
                valueType: 'cost'
            };
        }

        function buildUtilReportWasteDetailCompositionData(result, yearFilter = '') {
            const detailMap = new Map();
            const teamFilter = String(UtilReportState.wasteTeam || 'all').trim();
            (UTIL_WASTE_ENTRIES || []).forEach(entry => {
                const year = Number(entry?.year);
                const month = Number(entry?.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                if (!isUtilMonthInReportRange(year, month, UtilReportState, yearFilter)) return;
                const teamName = String(entry?.team || '').trim() || '미지정';
                if (!matchesUtilReportTeamFilter('waste', teamFilter, teamName)) return;
                const costs = (entry?.costs && typeof entry.costs === 'object') ? entry.costs : null;
                if (!costs) return;
                Object.entries(costs).forEach(([rawKey, rawValue]) => {
                    const key = String(rawKey || '').trim();
                    if (!key || key === 'total') return;
                    const value = Number(rawValue);
                    if (!Number.isFinite(value) || value <= 0) return;
                    detailMap.set(key, (detailMap.get(key) || 0) + value);
                });
            });

            const fixedOrder = ['water', 'share', 'sludge', 'resin', 'outsourcing', 'labor'];
            const extraKeys = Array.from(detailMap.keys())
                .filter(key => !fixedOrder.includes(key))
                .sort((a, b) => a.localeCompare(b, 'ko'));
            const palette = ['#38bdf8', '#f97316', '#10b981', '#a855f7', '#ef4444', '#eab308', '#6366f1', '#06b6d4', '#ec4899'];
            const orderedKeys = fixedOrder.concat(extraKeys).filter(key => Number(detailMap.get(key)) > 0);
            const items = orderedKeys.map((key, index) => {
                const labelRaw = UTIL_REPORT_WASTE_DETAIL_LABELS[key] || key;
                const label = String(labelRaw).replace(/\s*\(원\)\s*$/u, '');
                return {
                    key: buildUtilReportWasteDetailMetricKey(key),
                    rawModeKey: key,
                    label,
                    value: Number(detailMap.get(key)) || 0,
                    color: UTIL_REPORT_WASTE_DETAIL_COLORS[key] || palette[index % palette.length]
                };
            });
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            const siteLabel = resolveUtilReportSiteKeyFromTeamFilter(teamFilter);
            const teamLabel = teamFilter && teamFilter !== 'all' ? `${teamFilter} 기준` : 'Plant A + Plant B';
            return {
                title: `폐수 세부 금액 구성비 (${teamLabel})`,
                total,
                totalItemLabel: getUtilReportWasteScopeTotalLabel(siteLabel),
                items,
                valueType: 'cost'
            };
        }

        function getUtilReportLatestYoYDelta(result, metricKey, targetYear = '') {
            const rows = Array.isArray(result?.rows) ? result.rows : [];
            if (!rows.length) return null;
            let currentRow = null;
            if (targetYear) {
                const yearRows = rows.filter(row => String(row?.year) === String(targetYear));
                if (yearRows.length) {
                    yearRows.sort((a, b) => Number(a.month) - Number(b.month));
                    currentRow = yearRows[yearRows.length - 1];
                }
            }
            if (!currentRow) currentRow = rows[rows.length - 1];
            const current = Number(getUtilReportMetricValue(currentRow, metricKey));
            if (!Number.isFinite(current)) return null;
            const prevMonthKey = toUtilMonthKey(Number(currentRow.year) - 1, Number(currentRow.month));
            const prevState = {
                ...UtilReportState,
                from: prevMonthKey,
                to: prevMonthKey
            };
            const prevResult = buildUtilReportMonthlyRows(prevState);
            const prevRow = (prevResult.rows || [])[0] || null;
            const prev = Number(getUtilReportMetricValue(prevRow, metricKey));
            if (!Number.isFinite(prev)) {
                return { delta: null, rate: null, hasPrev: false, currentMonthKey: currentRow.monthKey };
            }
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: currentRow.monthKey };
        }

        function formatUtilReportScaled(value, unitKey, decimals) {
            if (!Number.isFinite(value)) return '-';
            const scale = getUtilReportScale(unitKey);
            return formatUtilNumber(value / scale, decimals);
        }

        function formatUtilReportSignedScaled(value, unitKey, decimals) {
            if (!Number.isFinite(value)) return '-';
            const scaled = value / getUtilReportScale(unitKey);
            const sign = scaled > 0 ? '+' : '';
            return `${sign}${formatUtilNumber(scaled, decimals)}`;
        }

        function normalizeUtilReportValueType(valueType = 'cost') {
            const raw = String(valueType || '').trim().toLowerCase();
            if (raw === 'production') return 'production';
            if (raw === 'usage') return 'usage';
            return 'cost';
        }

        function formatUtilReportValueByType(value, valueType = 'cost', decimals = UtilReportState.decimals, metricKey = '') {
            if (!Number.isFinite(value)) return '-';
            if (valueType === 'production') {
                const scale = getUtilReportProductionScale(UtilReportState.productionUnitKey);
                return formatUtilNumber(value / scale, decimals);
            }
            if (valueType === 'usage') {
                return formatUtilNumber(value, decimals);
            }
            return formatUtilReportScaled(value, UtilReportState.unitKey, decimals);
        }

        function formatUtilReportSignedValueByType(value, valueType = 'cost', decimals = UtilReportState.decimals, metricKey = '') {
            if (!Number.isFinite(value)) return '-';
            if (valueType === 'production') {
                const scaled = value / getUtilReportProductionScale(UtilReportState.productionUnitKey);
                const sign = scaled > 0 ? '+' : '';
                return `${sign}${formatUtilNumber(scaled, decimals)}`;
            }
            if (valueType === 'usage') {
                const sign = value > 0 ? '+' : '';
                return `${sign}${formatUtilNumber(value, decimals)}`;
            }
            return formatUtilReportSignedScaled(value, UtilReportState.unitKey, decimals);
        }

        function getUtilReportValueUnitLabelByType(valueType = 'cost', metricKey = '') {
            if (valueType === 'production') {
                return getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey);
            }
            if (valueType === 'usage') {
                return getUtilReportBuilderMetricUnit(metricKey);
            }
            return getUtilReportUnitLabel(UtilReportState.unitKey);
        }

        function getUtilDeltaClass(delta) {
            if (!Number.isFinite(delta)) return 'is-flat';
            if (delta > 0) return 'is-up';
            if (delta < 0) return 'is-down';
            return 'is-flat';
        }

        function buildUtilReportDeltaMeta(deltaInfo, tag = '전월대비', options = {}) {
            if (!deltaInfo || !Number.isFinite(deltaInfo.delta)) {
                return { className: 'is-flat', text: `${tag}: 데이터 없음` };
            }
            const deltaClass = getUtilDeltaClass(deltaInfo.delta);
            const valueType = normalizeUtilReportValueType(options?.valueType);
            const unitLabel = getUtilReportValueUnitLabelByType(valueType);
            const decimals = UtilReportState.decimals;
            const deltaText = `${formatUtilReportSignedValueByType(deltaInfo.delta, valueType, decimals)} ${unitLabel}`;
            const rateText = Number.isFinite(deltaInfo.rate)
                ? ` (${deltaInfo.rate > 0 ? '+' : ''}${formatUtilNumber(deltaInfo.rate, 1)}%)`
                : '';
            return {
                className: deltaClass,
                text: `${tag}: ${deltaText}${rateText}`
            };
        }

        function getUtilReportEntriesByScope(scopeKey) {
            const normalized = normalizeUtilReportScope(scopeKey);
            if (normalized === 'electric') return UTIL_ELECTRIC_ENTRIES || [];
            if (normalized === 'gas') return UTIL_GAS_ENTRIES || [];
            if (normalized === 'waste') return UTIL_WASTE_ENTRIES || [];
            return [];
        }

        function getUtilReportScopeCostFromEntry(entry, scopeKey) {
            const normalized = normalizeUtilReportScope(scopeKey);
            if (normalized === 'waste') {
                const modeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                if (modeKey !== 'total') {
                    const detailVal = Number(entry?.costs?.[modeKey]);
                    if (Number.isFinite(detailVal)) return detailVal;
                }
            }
            const baseVal = Number(entry?.cost);
            return Number.isFinite(baseVal) ? baseVal : NaN;
        }

        function sumUtilReportScopeTeamCostByMonth(scopeKey, teamName, year, month) {
            const entries = getUtilReportEntriesByScope(scopeKey);
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            let total = 0;
            let hasValue = false;
            entries.forEach(entry => {
                if (Number(entry?.year) !== Number(year) || Number(entry?.month) !== Number(month)) return;
                const team = String(entry?.team || '').trim();
                if (!matchesUtilReportTeamFilter(normalizedScope, teamName, team)) return;
                const value = Number(getUtilReportScopeCostFromEntry(entry, scopeKey));
                if (!Number.isFinite(value)) return;
                total += value;
                hasValue = true;
            });
            return hasValue ? total : null;
        }

        function getUtilReportScopeTeamLatestDelta(scopeKey, teamName, targetYear = '') {
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to);
            const rows = months
                .filter(item => !targetYear || String(item.year) === String(targetYear))
                .map(item => ({
                    year: item.year,
                    month: item.month,
                    monthKey: item.key,
                    value: sumUtilReportScopeTeamCostByMonth(scopeKey, teamName, item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
            if (rows.length < 2) return null;
            const current = Number(rows[rows.length - 1].value);
            const prev = Number(rows[rows.length - 2].value);
            if (!Number.isFinite(current) || !Number.isFinite(prev)) return null;
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: rows[rows.length - 1].monthKey };
        }

        function getUtilReportScopeTeamLatestYoYDelta(scopeKey, teamName, targetYear = '') {
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !targetYear || String(item.year) === String(targetYear));
            if (!months.length) return null;
            const currentRows = months.map(item => ({
                year: item.year,
                month: item.month,
                monthKey: item.key,
                value: sumUtilReportScopeTeamCostByMonth(scopeKey, teamName, item.year, item.month)
            })).filter(item => Number.isFinite(item.value));
            if (!currentRows.length) return null;
            const currentRow = currentRows[currentRows.length - 1];
            const current = Number(currentRow.value);
            const prev = sumUtilReportScopeTeamCostByMonth(scopeKey, teamName, currentRow.year - 1, currentRow.month);
            if (!Number.isFinite(prev)) {
                return { delta: null, rate: null, hasPrev: false, currentMonthKey: currentRow.monthKey };
            }
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: currentRow.monthKey };
        }

        function buildUtilReportSiteScopedState(scopeKey, siteKey, overrides = {}) {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const teamFilter = normalizedSite === 'all' ? 'all' : normalizedSite;
            const state = {
                ...UtilReportState,
                ...overrides
            };
            if (normalizedScope === 'electric') {
                state.electricTeam = teamFilter;
                state.gasTeam = 'all';
                state.wasteTeam = 'all';
            } else if (normalizedScope === 'gas') {
                state.electricTeam = 'all';
                state.gasTeam = teamFilter;
                state.wasteTeam = 'all';
            } else if (normalizedScope === 'waste') {
                state.electricTeam = 'all';
                state.gasTeam = 'all';
                state.wasteTeam = teamFilter;
            } else {
                state.electricTeam = teamFilter;
                state.gasTeam = teamFilter;
                state.wasteTeam = teamFilter;
            }
            if (normalizedScope === 'waste' && !Object.prototype.hasOwnProperty.call(overrides, 'wasteCostModeKey')) {
                state.wasteCostModeKey = 'total';
            }
            return state;
        }

        function buildUtilReportSiteSeries(scopeKey, siteKey, targetYear = '') {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'all') return [];
            const metricKey = getUtilReportMetricFromScope(normalizedScope);
            const state = buildUtilReportSiteScopedState(normalizedScope, normalizedSite);
            const result = buildUtilReportMonthlyRows(state);
            return (result?.rows || [])
                .filter(row => !targetYear || String(row?.year) === String(targetYear))
                .map(row => ({
                    year: Number(row?.year),
                    month: Number(row?.month),
                    monthKey: String(row?.monthKey || ''),
                    value: Number(getUtilReportMetricValue(row, metricKey))
                }))
                .filter(row => Number.isFinite(row.value));
        }
