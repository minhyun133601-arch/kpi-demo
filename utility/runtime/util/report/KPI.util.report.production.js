        function getUtilReportProductionProductColor(teamName, index) {
            const paletteByTeam = {
                'Line Alpha': ['#2563eb', '#22d3ee', '#7c3aed', '#10b981', '#f97316', '#0ea5e9', '#14b8a6', '#8b5cf6'],
                'Line Beta': ['#f97316', '#ec4899', '#eab308', '#dc2626', '#8b5cf6', '#fb923c', '#f43f5e', '#d97706'],
                'Line Gamma': ['#16a34a', '#84cc16', '#0ea5e9', '#06b6d4', '#f59e0b', '#22c55e', '#65a30d', '#14b8a6'],
                'Line Delta': ['#db2777', '#a855f7', '#ef4444', '#f472b6', '#9333ea', '#e11d48', '#ec4899', '#c026d3']
            };
            const palette = paletteByTeam[teamName] || ['#334155', '#475569', '#64748b', '#0ea5e9', '#f43f5e', '#16a34a'];
            if (Number.isFinite(index) && index >= 0 && index < palette.length) {
                return palette[index];
            }
            const baseHueMap = {
                'Line Alpha': 210,
                'Line Beta': 28,
                'Line Gamma': 145,
                'Line Delta': 318
            };
            const seed = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
            const hueBase = Number(baseHueMap[teamName]);
            const hue = Number.isFinite(hueBase) ? ((hueBase + (seed * 19)) % 360) : ((seed * 31) % 360);
            const saturation = Math.max(54, 74 - ((seed % 4) * 4));
            const lightness = Math.min(68, 42 + ((seed % 5) * 5));
            return `hsl(${hue} ${saturation}% ${lightness}%)`;
        }

        function buildUtilReportProductionProductCompositionData(yearFilter = '', teamFilter = UtilReportState.productionTeam) {
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter));
            const targetTeams = resolveUtilReportProductionTeamsByFilter(teamFilter);
            const teamOrder = new Map(UTIL_REPORT_PRODUCTION_TEAM_BASE.map((teamName, index) => [teamName, index]));
            const productMap = new Map();
            const dedupeSet = new Set();
            const showTeamPrefix = targetTeams.length > 1;

            months.forEach(monthInfo => {
                const year = Number(monthInfo.year);
                const month = Number(monthInfo.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                targetTeams.forEach(teamName => {
                    const listed = listUtilDailyEntriesByMetric(teamName, year, month, 'amount');
                    const entries = Array.isArray(listed?.entries) ? listed.entries : [];
                    entries.forEach(entry => {
                        const amount = Number(entry?.amount);
                        if (!Number.isFinite(amount) || amount <= 0) return;
                        const lineNameRaw = String(entry?.lineName || '').trim();
                        const productNameRaw = String(entry?.productName || '').trim();
                        const lineName = normalizeUtilReportProductionLineBucket(teamName, lineNameRaw, productNameRaw);
                        const entryKey = String(entry?.entryKey || '').trim();
                        const dedupeKey = entryKey || [
                            teamName,
                            String(entry?.dateLabel || '').trim(),
                            normalizeUtilDedupeText(lineNameRaw || ''),
                            normalizeUtilDedupeText(productNameRaw || ''),
                            canonicalizeUtilDedupeMetric(amount)
                        ].join('|');
                        if (dedupeSet.has(dedupeKey)) return;
                        dedupeSet.add(dedupeKey);
                        const key = `생산라인::${teamName}::${lineName}`;
                        const prev = productMap.get(key) || {
                            key,
                            label: showTeamPrefix
                                ? `${getUtilReportDisplayTeamLabel(teamName, { categoryKey: 'production', scopeKey: 'total' })} · ${lineName}`
                                : lineName,
                            sourceLabel: '생산량',
                            teamName,
                            lineName,
                            value: 0
                        };
                        prev.value += amount;
                        productMap.set(key, prev);
                    });
                });
            });

            const teamColorIndex = new Map();
            const items = Array.from(productMap.values())
                .filter(item => Number(item?.value) > 0)
                .sort((a, b) => {
                    const rankA = teamOrder.has(a.teamName) ? teamOrder.get(a.teamName) : 99;
                    const rankB = teamOrder.has(b.teamName) ? teamOrder.get(b.teamName) : 99;
                    if (rankA !== rankB) return rankA - rankB;
                    const lineDiff = String(a.lineName || '').localeCompare(String(b.lineName || ''), 'ko');
                    if (lineDiff !== 0) return lineDiff;
                    const valueDiff = Number(b.value) - Number(a.value);
                    if (valueDiff !== 0) return valueDiff;
                    return 0;
                })
                .map(item => {
                    const index = teamColorIndex.get(item.teamName) || 0;
                    teamColorIndex.set(item.teamName, index + 1);
                    return {
                        ...item,
                        color: getUtilReportProductionProductColor(item.teamName, index)
                    };
                });

            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            const teamLabel = targetTeams.length
                ? targetTeams.map(teamName => getUtilReportDisplayTeamLabel(teamName, { categoryKey: 'production', scopeKey: 'total' })).join(' / ')
                : 'Plant B / Line Beta / Line Gamma / Line Delta';
            const title = targetTeams.length === 1
                ? `${teamLabel} 라인 생산량 구성비`
                : `라인 생산량 구성비 (${teamLabel})`;
            return {
                title,
                total,
                items,
                valueType: 'production'
            };
        }

        function buildUtilReportProductionProductSeriesMap(yearFilter = '', teamFilter = UtilReportState.productionTeam) {
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter));
            const targetTeams = resolveUtilReportProductionTeamsByFilter(teamFilter);
            const seriesMap = new Map();
            const totalSeriesMap = new Map();
            const dedupeSet = new Set();

            months.forEach(monthInfo => {
                const year = Number(monthInfo.year);
                const month = Number(monthInfo.month);
                const monthKey = String(monthInfo.key || toUtilMonthKey(year, month));
                if (!Number.isFinite(year) || !Number.isFinite(month) || !monthKey) return;
                targetTeams.forEach(teamName => {
                    const listed = listUtilDailyEntriesByMetric(teamName, year, month, 'amount');
                    const entries = Array.isArray(listed?.entries) ? listed.entries : [];
                    entries.forEach(entry => {
                        const amount = Number(entry?.amount);
                        if (!Number.isFinite(amount) || amount <= 0) return;
                        const lineNameRaw = String(entry?.lineName || '').trim();
                        const productNameRaw = String(entry?.productName || '').trim();
                        const lineName = normalizeUtilReportProductionLineBucket(teamName, lineNameRaw, productNameRaw);
                        const entryKey = String(entry?.entryKey || '').trim();
                        const dedupeKey = entryKey || [
                            teamName,
                            String(entry?.dateLabel || '').trim(),
                            normalizeUtilDedupeText(lineNameRaw || ''),
                            normalizeUtilDedupeText(productNameRaw || ''),
                            canonicalizeUtilDedupeMetric(amount)
                        ].join('|');
                        if (dedupeSet.has(dedupeKey)) return;
                        dedupeSet.add(dedupeKey);
                        const key = `생산라인::${teamName}::${lineName}`;
                        const itemMonthMap = seriesMap.get(key) || new Map();
                        itemMonthMap.set(monthKey, (Number(itemMonthMap.get(monthKey)) || 0) + amount);
                        seriesMap.set(key, itemMonthMap);
                        totalSeriesMap.set(monthKey, (Number(totalSeriesMap.get(monthKey)) || 0) + amount);
                    });
                });
            });

            return { seriesMap, totalSeriesMap };
        }

        function buildUtilReportSeriesFromMonthValueMap(valueMap) {
            if (!(valueMap instanceof Map) || !valueMap.size) return [];
            return Array.from(valueMap.entries())
                .map(([monthKey, value]) => {
                    const parsed = parseUtilMonthValue(monthKey);
                    if (!parsed) return null;
                    return {
                        year: Number(parsed.year),
                        month: Number(parsed.month),
                        monthKey: String(monthKey || ''),
                        value: Number(value)
                    };
                })
                .filter(item => item && Number.isFinite(item.value))
                .sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.month - b.month;
                });
        }

        function buildUtilReportProductionProductMetricMetaMap(composition, yearFilter = '', teamFilter = UtilReportState.productionTeam) {
            const map = {};
            const valueType = 'production';
            const { seriesMap, totalSeriesMap } = buildUtilReportProductionProductSeriesMap(yearFilter, teamFilter);
            const totalPair = buildUtilReportDeltaPairFromSeries(buildUtilReportSeriesFromMonthValueMap(totalSeriesMap));
            map.total_production_product = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const itemKey = String(item?.key || '').trim();
                if (!itemKey) return;
                const series = buildUtilReportSeriesFromMonthValueMap(seriesMap.get(itemKey));
                const deltaPair = buildUtilReportDeltaPairFromSeries(series);
                map[itemKey] = [
                    buildUtilReportDeltaMeta(deltaPair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(deltaPair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function resolveUtilReportProductionLineTeamFilter(selectedComposition, siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'Plant B') return 'Line Alpha';

            const activeTeam = normalizeUtilReportProductionTeam(parseUtilReportTeamCompositionMetric(UtilReportState.activeTeamCompositionKey).teamName);
            if (normalizedSite === 'all') {
                return activeTeam === 'all' ? 'all' : activeTeam;
            }

            const allowedTeams = resolveUtilReportProductionTeamsBySite(normalizedSite);
            if (activeTeam !== 'all' && allowedTeams.includes(activeTeam)) {
                return activeTeam;
            }

            const items = Array.isArray(selectedComposition?.items) ? selectedComposition.items : [];
            for (let index = 0; index < items.length; index += 1) {
                const parsed = parseUtilReportTeamCompositionMetric(items[index]?.key);
                const teamName = normalizeUtilReportProductionTeam(parsed.teamName);
                if (teamName !== 'all' && allowedTeams.includes(teamName)) {
                    return teamName;
                }
            }

            return allowedTeams[0] || 'all';
        }

        function collectUtilReportScopeSourceTeamsByMonth(scopeKey, year, month, teamFilter = 'all') {
            const entries = getUtilReportEntriesByScope(scopeKey);
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const sourceTeams = new Set();
            (entries || []).forEach(entry => {
                if (Number(entry?.year) !== Number(year) || Number(entry?.month) !== Number(month)) return;
                const entryTeam = String(entry?.team || '').trim();
                if (!matchesUtilReportTeamFilter(normalizedScope, teamFilter, entryTeam)) return;
                const teamCandidates = resolveUtilProductionSourceTeams(entryTeam)
                    .map(name => normalizeUtilReportProductionSourceTeamName(name))
                    .filter(Boolean);
                teamCandidates.forEach(name => sourceTeams.add(name));
            });
            return Array.from(sourceTeams.values());
        }

        function getUtilReportTeamMonthlyProductionFallback(year, month, teamName) {
            const team = normalizeUtilReportProductionSourceTeamName(teamName);
            if (!team) return null;
            const sources = [UTIL_ELECTRIC_ENTRIES, UTIL_GAS_ENTRIES, UTIL_WASTE_ENTRIES];
            for (let i = 0; i < sources.length; i += 1) {
                const value = Number(sumUtilReportProductionFallback(sources[i], year, month, team));
                if (Number.isFinite(value) && value > 0) return value;
            }
            return null;
        }

        function sumUtilReportProductionBySourceTeams(year, month, sourceTeams = []) {
            const uniqueTeams = Array.from(new Set((sourceTeams || [])
                .map(name => normalizeUtilReportProductionSourceTeamName(name))
                .filter(Boolean)));
            if (!uniqueTeams.length) return null;
            let total = 0;
            let hasValue = false;
            uniqueTeams.forEach(teamName => {
                const daily = getUtilDailyProductionValue(teamName, year, month);
                const dailyValue = Number(daily?.value);
                if (Number.isFinite(dailyValue) && dailyValue > 0) {
                    total += dailyValue;
                    hasValue = true;
                    return;
                }
                const fallbackValue = Number(getUtilReportTeamMonthlyProductionFallback(year, month, teamName));
                if (Number.isFinite(fallbackValue) && fallbackValue > 0) {
                    total += fallbackValue;
                    hasValue = true;
                }
            });
            return hasValue ? total : null;
        }

        function sumUtilReportMultiScopeTeamCostByMonth(scopeKeys = [], teamName, year, month) {
            const scopes = Array.isArray(scopeKeys) ? scopeKeys : [];
            let total = 0;
            let hasValue = false;
            scopes.forEach(scopeKey => {
                const value = Number(sumUtilReportScopeTeamCostByMonth(scopeKey, teamName, year, month));
                if (!Number.isFinite(value)) return;
                total += value;
                hasValue = true;
            });
            return hasValue ? total : null;
        }

        function sumUtilReportMultiScopeTeamGroupCostByMonth(scopeKeys = [], teamFilters = [], year, month) {
            const filters = Array.isArray(teamFilters) ? teamFilters : [];
            let total = 0;
            let hasValue = false;
            filters.forEach(teamFilter => {
                const value = Number(sumUtilReportMultiScopeTeamCostByMonth(scopeKeys, teamFilter, year, month));
                if (!Number.isFinite(value)) return;
                total += value;
                hasValue = true;
            });
            return hasValue ? total : null;
        }

        function getUtilReportScopeMonthlyProductionValue(scopeKey, year, month, teamFilter = 'all') {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const filterRaw = String(teamFilter || 'all').trim();
            const sourceTeams = normalizedScope === 'total'
                ? (filterRaw && filterRaw !== 'all'
                    ? resolveUtilProductionSourceTeams(filterRaw).map(name => normalizeUtilReportProductionSourceTeamName(name)).filter(Boolean)
                    : UTIL_REPORT_PRODUCTION_TEAM_BASE.slice())
                : collectUtilReportScopeSourceTeamsByMonth(normalizedScope, year, month, filterRaw);
            if (!sourceTeams.length && filterRaw && filterRaw !== 'all') {
                return sumUtilReportProductionBySourceTeams(
                    year,
                    month,
                    resolveUtilProductionSourceTeams(filterRaw)
                );
            }
            return sumUtilReportProductionBySourceTeams(year, month, sourceTeams);
        }

        function buildUtilReportScopeProductionTotals(yearFilter = '', scopeTeamFilters = {}) {
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to);
            const selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(scopeTeamFilters.selectedScopeKeys || UtilReportState.selectedScopeKeys);
            const selectedScopeSet = new Set(selectedScopeKeys);
            const totalProductionTeams = Array.from(new Set(
                resolveUtilReportProductionTeamsBySite('Plant B')
                    .concat(resolveUtilReportProductionTeamsBySite('Plant A'))
            ));
            const totals = {
                total: 0,
                electric: 0,
                gas: 0,
                waste: 0
            };
            months.forEach(item => {
                if (yearFilter && String(item.year) !== String(yearFilter)) return;
                const electricValue = selectedScopeSet.has('electric')
                    ? Number(getUtilReportScopeMonthlyProductionValue('electric', item.year, item.month, scopeTeamFilters.electricTeam || 'all'))
                    : NaN;
                const gasValue = selectedScopeSet.has('gas')
                    ? Number(getUtilReportScopeMonthlyProductionValue('gas', item.year, item.month, scopeTeamFilters.gasTeam || 'all'))
                    : NaN;
                const wasteValue = selectedScopeSet.has('waste')
                    ? Number(getUtilReportScopeMonthlyProductionValue('waste', item.year, item.month, scopeTeamFilters.wasteTeam || 'all'))
                    : NaN;
                const totalValue = Number(sumUtilReportProductionBySourceTeams(item.year, item.month, totalProductionTeams));
                if (Number.isFinite(electricValue) && electricValue > 0) totals.electric += electricValue;
                if (Number.isFinite(gasValue) && gasValue > 0) totals.gas += gasValue;
                if (Number.isFinite(wasteValue) && wasteValue > 0) totals.waste += wasteValue;
                if (Number.isFinite(totalValue) && totalValue > 0) totals.total += totalValue;
            });
            return totals;
        }

        function buildUtilReportScopeProductionSeries(scopeKey, yearFilter = '', scopeTeamFilters = {}) {
            const scope = normalizeUtilReportScope(scopeKey);
            const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter));
            const rows = [];
            months.forEach(item => {
                const year = Number(item.year);
                const month = Number(item.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                const value = scope === 'total'
                    ? Number(sumUtilReportProductionBySourceTeams(year, month, UTIL_REPORT_PRODUCTION_TEAM_BASE))
                    : Number(getUtilReportScopeMonthlyProductionValue(scope, year, month, scopeTeamFilters[`${scope}Team`] || 'all'));
                if (!Number.isFinite(value) || value <= 0) return;
                rows.push({
                    year,
                    month,
                    monthKey: String(item.key || ''),
                    value
                });
            });
            return rows;
        }

        function sumUtilReportWasteCostDetails(year, month, teamName) {
            const totals = {};
            (UTIL_WASTE_ENTRIES || []).forEach(entry => {
                if (entry?.year !== year || entry?.month !== month) return;
                if (teamName && teamName !== 'all' && entry?.team !== teamName) return;
                const costs = (entry?.costs && typeof entry.costs === 'object') ? entry.costs : null;
                if (costs) {
                    Object.entries(costs).forEach(([rawKey, rawValue]) => {
                        const key = String(rawKey || '').trim();
                        if (!key) return;
                        const value = Number(rawValue);
                        if (!Number.isFinite(value)) return;
                        totals[key] = (totals[key] || 0) + value;
                    });
                    if (!Number.isFinite(Number(costs.total))) {
                        const fallbackTotal = Number(entry?.cost);
                        if (Number.isFinite(fallbackTotal)) {
                            totals.total = (totals.total || 0) + fallbackTotal;
                        }
                    }
                    return;
                }
                const fallback = Number(entry?.cost);
                if (Number.isFinite(fallback)) {
                    totals.total = (totals.total || 0) + fallback;
                }
            });
            return totals;
        }

        function resolveUtilReportProductionAuto(year, month, teamFilters, forcedTeam = 'all') {
            const normalizedForcedTeam = normalizeUtilReportProductionTeam(forcedTeam);
            const selectedTeams = [teamFilters.electricTeam, teamFilters.gasTeam, teamFilters.wasteTeam]
                .filter(team => team && team !== 'all')
                .filter((team, index, arr) => arr.indexOf(team) === index);
            const dailyTeams = normalizedForcedTeam !== 'all'
                ? [normalizedForcedTeam]
                : (selectedTeams.length
                    ? selectedTeams
                    : (UTIL_PRODUCTION_DAILY_DATA || []).map(item => String(item?.name || '').trim()).filter(Boolean));

            let dailyTotal = 0;
            let dailyCount = 0;
            dailyTeams.forEach(teamName => {
                const daily = getUtilDailyProductionValue(teamName, year, month);
                const value = Number(daily?.value);
                if (!Number.isFinite(value)) return;
                dailyTotal += value;
                dailyCount += 1;
            });
            if (dailyCount > 0) {
                return { value: dailyTotal, source: 'daily' };
            }
            return { value: null, source: 'none' };
        }

        function getUtilReportMetricValue(row, metricKey) {
            const totalExcludeWasteDescriptor = getUtilReportTotalExcludeWasteMetricDescriptor(metricKey);
            if (totalExcludeWasteDescriptor) {
                const year = Number(row?.year);
                const month = Number(row?.month);
                if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
                const teamParsed = parseUtilReportTeamTotalExcludeWasteCompositionMetric(metricKey);
                if (String(teamParsed.raw || '').startsWith(`${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::`)) {
                    return sumUtilReportMultiScopeTeamCostByMonth(['electric', 'gas'], teamParsed.isTotal ? 'all' : teamParsed.teamName, year, month);
                }
                const processParsed = parseUtilReportProcessTotalExcludeWasteCompositionMetric(metricKey);
                if (String(processParsed.raw || '').startsWith(`${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::`)) {
                    const spec = processParsed.isTotal ? null : getUtilReportProcessTotalExcludeWasteSpec(processParsed.processKey);
                    const teamFilters = spec
                        ? spec.teamFilters
                        : UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.flatMap(item => item.teamFilters);
                    return sumUtilReportMultiScopeTeamGroupCostByMonth(['electric', 'gas'], teamFilters, year, month);
                }
            }
            const selectedDetailDescriptor = getUtilReportSelectedDetailMetricDescriptor(metricKey);
            const isSelectedTotalMetric = String(metricKey || '').trim() === 'total_cost'
                && isUtilReportSelectedTotalDetailScope()
                && normalizeUtilReportDetailMetricOverrideKey(UtilReportState.detailMetricOverrideKey) === 'total_cost';
            if (selectedDetailDescriptor || isSelectedTotalMetric) {
                const year = Number(row?.year);
                const month = Number(row?.month);
                return getUtilReportSelectedDetailCostByMetric(metricKey, year, month);
            }
            const productionProductDetailMetric = parseUtilReportProductionProductDetailMetric(metricKey);
            if (productionProductDetailMetric) {
                if (productionProductDetailMetric.isTotal) return row?.production;
                const detailMap = (row?.productionProductValues && typeof row.productionProductValues === 'object')
                    ? row.productionProductValues
                    : null;
                const detailValue = Number(detailMap?.[productionProductDetailMetric.compositionMetric]);
                return Number.isFinite(detailValue) ? detailValue : null;
            }
            switch (metricKey) {
                case 'electric_cost': return row?.electricCost;
                case 'gas_cost': return row?.gasCost;
                case 'waste_cost': {
                    const modeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                    if (modeKey !== 'total') {
                        const detailMap = row?.wasteCostDetails;
                        const detailValue = Number(detailMap?.[modeKey]);
                        if (Number.isFinite(detailValue)) return detailValue;
                    }
                    return row?.wasteCost;
                }
                case 'electric_usage': return row?.electricUsage;
                case 'gas_usage': return row?.gasUsage;
                case 'waste_usage': return row?.wasteUsage;
                case 'production': return row?.production;
                case 'total_unit': return row?.totalUnit;
                case 'electric_unit': return row?.electricUnit;
                case 'gas_unit': return row?.gasUnit;
                case 'waste_unit': return row?.wasteUnit;
                case 'total_cost':
                default:
                    return row?.totalCost;
            }
        }

        function buildUtilReportMetricPoints(result, metricKey, unitKey) {
            if (!result || !Array.isArray(result.rows)) return [];
            const scale = getUtilReportMetricScale(metricKey, unitKey, UtilReportState.productionUnitKey);
            return result.rows.map(row => {
                const rawValue = Number(getUtilReportMetricValue(row, metricKey));
                return {
                    key: row.monthKey,
                    label: formatUtilReportMonthShort(row.monthKey),
                    value: Number.isFinite(rawValue) ? rawValue / scale : NaN
                };
            });
        }
        function buildUtilReportMetricPointsByYear(result, metricKey, unitKey, yearValue = '') {
            if (!result || !Array.isArray(result.rows)) return [];
            const scale = getUtilReportMetricScale(metricKey, unitKey, UtilReportState.productionUnitKey);
            const rows = String(yearValue || '').trim()
                ? result.rows.filter(row => String(row?.year) === String(yearValue)).sort((a, b) => Number(a.month) - Number(b.month))
                : result.rows;
            return rows.map(row => {
                const rawValue = Number(getUtilReportMetricValue(row, metricKey));
                return {
                    key: row.monthKey,
                    label: String(row.month).padStart(2, '0'),
                    value: Number.isFinite(rawValue) ? rawValue / scale : NaN
                };
            });
        }

        function buildUtilReportCustomGraphPoints(result, numeratorMetric, denominatorMetric, useDenominator, yearValue = '') {
            if (!result || !Array.isArray(result.rows)) return [];
            const rows = String(yearValue || '').trim()
                ? result.rows.filter(row => String(row?.year) === String(yearValue)).sort((a, b) => Number(a.month) - Number(b.month))
                : result.rows;
            const numeratorScale = getUtilReportMetricScale(numeratorMetric, UtilReportState.unitKey, UtilReportState.productionUnitKey);
            const denominatorScale = getUtilReportMetricScale(denominatorMetric, UtilReportState.unitKey, UtilReportState.productionUnitKey);
            return rows.map(row => {
                const rawNumerator = Number(getUtilReportMetricValue(row, numeratorMetric));
                const rawDenominator = Number(getUtilReportMetricValue(row, denominatorMetric));
                const numerator = Number.isFinite(rawNumerator) ? (rawNumerator / numeratorScale) : NaN;
                const denominator = Number.isFinite(rawDenominator) ? (rawDenominator / denominatorScale) : NaN;
                const value = useDenominator
                    ? ((Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) ? (numerator / denominator) : NaN)
                    : numerator;
                return {
                    key: row.monthKey,
                    label: String(row.month).padStart(2, '0'),
                    value,
                    numerator,
                    denominator
                };
            });
        }

        function buildUtilReportCustomGraphMeta(scopeKey, numeratorMetric, denominatorMetric, useDenominator) {
            const numeratorLabel = getUtilReportGraphMetricLabel(numeratorMetric, scopeKey);
            const denominatorLabel = getUtilReportGraphMetricLabel(denominatorMetric, scopeKey);
            const numeratorUnit = getUtilReportGraphMetricUnit(numeratorMetric);
            const denominatorUnit = getUtilReportGraphMetricUnit(denominatorMetric);
            const metricLabel = useDenominator
                ? `${numeratorLabel} / ${denominatorLabel}`
                : numeratorLabel;
            const unitLabel = useDenominator
                ? `${numeratorUnit}/${denominatorUnit}`
                : numeratorUnit;
            return {
                metricLabel,
                unitLabel,
                numeratorLabel,
                denominatorLabel,
                numeratorUnit,
                denominatorUnit
            };
        }

        function buildUtilReportCompareSeries(result, metricKey, unitKey, compareYear) {
            if (!result || !Array.isArray(result.rows) || !result.rows.length) return null;
            const targetYear = Number(compareYear);
            if (!Number.isFinite(targetYear)) return null;

            const targetRows = result.rows
                .filter(row => row.year === targetYear)
                .sort((a, b) => Number(a.month) - Number(b.month));
            if (!targetRows.length) return null;

            const monthNumbers = targetRows.map(row => Number(row.month)).filter(Number.isFinite);
            if (!monthNumbers.length) return null;
            const minMonth = Math.min(...monthNumbers);
            const maxMonth = Math.max(...monthNumbers);

            const prevState = {
                ...UtilReportState,
                from: toUtilMonthKey(targetYear - 1, minMonth),
                to: toUtilMonthKey(targetYear - 1, maxMonth)
            };
            const prevResult = buildUtilReportMonthlyRows(prevState);
            const prevRowByMonth = new Map((prevResult.rows || []).map(row => [row.month, row]));

            const scale = getUtilReportMetricScale(metricKey, unitKey, UtilReportState.productionUnitKey);
            const monthLabel = (month) => String(month).padStart(2, '0');
            const toPoint = (row, value) => ({
                key: row.monthKey,
                label: monthLabel(row.month),
                value
            });

            const currentSeries = targetRows.map(row => {
                const raw = Number(getUtilReportMetricValue(row, metricKey));
                const scaled = Number.isFinite(raw) ? (raw / scale) : NaN;
                return toPoint(row, scaled);
            });

            const prevSeries = targetRows.map(row => {
                const prevRow = prevRowByMonth.get(row.month);
                const raw = Number(getUtilReportMetricValue(prevRow, metricKey));
                const scaled = Number.isFinite(raw) ? (raw / scale) : NaN;
                return toPoint(row, scaled);
            });

            if (!prevSeries.some(point => Number.isFinite(point.value))) return null;

            const seriesColors = getUtilReportSeriesColors(metricKey);
            const currentColor = seriesColors.current;
            const prevColor = seriesColors.prev;

            return [
                {
                    label: `${targetYear - 1}`,
                    color: prevColor,
                    seriesKey: 'prev',
                    type: UtilReportState.chartType,
                    lineClass: 'util-analytics-chart-line-prev',
                    pointClass: 'util-analytics-chart-point-prev',
                    lineDash: '7 5',
                    points: prevSeries
                },
                {
                    label: `${targetYear}`,
                    color: currentColor,
                    seriesKey: 'current',
                    type: UtilReportState.chartType,
                    lineClass: 'util-analytics-chart-line',
                    points: currentSeries
                }
            ];
        }

        function buildUtilReportMonthlyRows(state) {
            const months = getUtilReportMonthRange(state.from, state.to);
            const selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(state.selectedScopeKeys);
            const includeElectric = selectedScopeKeys.includes('electric');
            const includeGas = selectedScopeKeys.includes('gas');
            const includeWaste = selectedScopeKeys.includes('waste');
            const rows = months.map(monthInfo => {
                const { year, month, key: monthKey } = monthInfo;

                const electricUsage = includeElectric ? sumUtilReportMetric(UTIL_ELECTRIC_ENTRIES, year, month, state.electricTeam, 'usage') : 0;
                const electricCost = includeElectric ? sumUtilReportMetric(UTIL_ELECTRIC_ENTRIES, year, month, state.electricTeam, 'cost') : 0;
                const gasUsage = includeGas ? sumUtilReportMetric(UTIL_GAS_ENTRIES, year, month, state.gasTeam, 'usage') : 0;
                const gasCost = includeGas ? sumUtilReportMetric(UTIL_GAS_ENTRIES, year, month, state.gasTeam, 'cost') : 0;
                const wasteUsage = includeWaste ? sumUtilReportMetric(UTIL_WASTE_ENTRIES, year, month, state.wasteTeam, 'usage') : 0;
                const wasteCostDetails = includeWaste ? sumUtilReportWasteCostDetails(year, month, state.wasteTeam) : {};
                const wasteCostFromDetail = Number(wasteCostDetails.total);
                const wasteCost = includeWaste && Number.isFinite(wasteCostFromDetail)
                    ? wasteCostFromDetail
                    : (includeWaste ? sumUtilReportMetric(UTIL_WASTE_ENTRIES, year, month, state.wasteTeam, 'cost') : 0);

                const autoProduction = resolveUtilReportProductionAuto(year, month, {
                    electricTeam: includeElectric ? state.electricTeam : 'all',
                    gasTeam: includeGas ? state.gasTeam : 'all',
                    wasteTeam: includeWaste ? state.wasteTeam : 'all'
                }, state.categoryKey === 'production' ? state.productionTeam : 'all');

                const overrideRaw = UtilReportOverrideState.productionByMonth[monthKey];
                const manualProduction = Number(overrideRaw);
                const hasManualOverride = overrideRaw !== undefined
                    && overrideRaw !== null
                    && String(overrideRaw).trim() !== ''
                    && Number.isFinite(manualProduction);
                const production = hasManualOverride
                    ? manualProduction
                    : (Number.isFinite(autoProduction.value) ? autoProduction.value : null);
                const productionProductValues = state.categoryKey === 'production'
                    ? buildUtilReportProductionProductMonthlyValueMap(year, month, state.productionTeam)
                    : {};

                const totalCost = electricCost + gasCost + wasteCost;
                const electricUnit = Number.isFinite(production) && production > 0 ? electricCost / production : null;
                const gasUnit = Number.isFinite(production) && production > 0 ? gasCost / production : null;
                const wasteUnit = Number.isFinite(production) && production > 0 ? wasteCost / production : null;
                const totalUnit = Number.isFinite(production) && production > 0 ? totalCost / production : null;

                return {
                    monthKey,
                    year,
                    month,
                    electricUsage,
                    electricCost,
                    electricUnit,
                    gasUsage,
                    gasCost,
                    gasUnit,
                    wasteUsage,
                    wasteCost,
                    wasteCostDetails,
                    wasteUnit,
                    production,
                    productionProductValues,
                    productionAuto: Number.isFinite(autoProduction.value) ? autoProduction.value : null,
                    productionAutoSource: autoProduction.source,
                    productionManual: hasManualOverride ? manualProduction : null,
                    totalCost,
                    totalUnit
                };
            });

            const summary = rows.reduce((acc, row) => {
                acc.electricCost += Number.isFinite(row.electricCost) ? row.electricCost : 0;
                acc.gasCost += Number.isFinite(row.gasCost) ? row.gasCost : 0;
                acc.wasteCost += Number.isFinite(row.wasteCost) ? row.wasteCost : 0;
                acc.totalCost += Number.isFinite(row.totalCost) ? row.totalCost : 0;
                if (Number.isFinite(row.production) && row.production > 0) {
                    acc.production += row.production;
                }
                return acc;
            }, {
                electricCost: 0,
                gasCost: 0,
                wasteCost: 0,
                totalCost: 0,
                production: 0
            });

            const monthCount = rows.length;
            const averageCost = monthCount > 0 ? summary.totalCost / monthCount : 0;
            const electricUnit = summary.production > 0 ? summary.electricCost / summary.production : null;
            const gasUnit = summary.production > 0 ? summary.gasCost / summary.production : null;
            const wasteUnit = summary.production > 0 ? summary.wasteCost / summary.production : null;
            const totalUnit = summary.production > 0 ? summary.totalCost / summary.production : null;

            return {
                rows,
                monthCount,
                rangeLabel: months.length ? `${formatUtilReportMonthShort(months[0].key)} ~ ${formatUtilReportMonthShort(months[months.length - 1].key)}` : '-',
                summary: {
                    electricCost: summary.electricCost,
                    gasCost: summary.gasCost,
                    wasteCost: summary.wasteCost,
                    totalCost: summary.totalCost,
                    averageCost,
                    production: summary.production,
                    electricUnit,
                    gasUnit,
                    wasteUnit,
                    totalUnit
                }
            };
        }

        function enhanceUtilReportOverviewCards(panel) {
            if (!panel || panel.dataset.overviewCardsEnhanced === 'true') return;
            [
                { valueRole: 'util-report-total-cost', shareRole: 'util-report-total-share', label: '총액', icon: 'fa-chart-pie', tone: 'overview-total' },
                { valueRole: 'util-report-electric-cost', shareRole: 'util-report-electric-share', label: '전기', icon: 'fa-bolt', tone: 'overview-electric' },
                { valueRole: 'util-report-gas-cost', shareRole: 'util-report-gas-share', label: '가스', icon: 'fa-fire-flame-curved', tone: 'overview-gas' },
                { valueRole: 'util-report-waste-cost', shareRole: 'util-report-waste-share', label: '폐수', icon: 'fa-water', tone: 'overview-waste' }
            ].forEach(item => {
                const valueEl = panel.querySelector(`[data-role="${item.valueRole}"]`);
                const shareEl = panel.querySelector(`[data-role="${item.shareRole}"]`);
                const cardEl = valueEl?.closest('.util-report-kpi');
                if (!valueEl || !shareEl || !cardEl) return;
                cardEl.dataset.tone = item.tone;
                cardEl.innerHTML = `
                    <div class="util-report-kpi-head">
                        <span class="util-report-kpi-icon" aria-hidden="true"><i class="fa-solid ${item.icon}"></i></span>
                        <span class="util-report-kpi-label">${item.label}</span>
                    </div>
                    <strong class="util-report-kpi-value" data-role="${item.valueRole}">${valueEl.textContent || '-'}</strong>
                    <span class="util-report-kpi-sub" data-role="${item.shareRole}">${shareEl.textContent || '-'}</span>
                `;
            });
            panel.dataset.overviewCardsEnhanced = 'true';
        }

        function renderUtilReportPreview(panel, result) {
            if (!panel) return;
            const kpiGridEl = panel.querySelector('.util-report-kpi-grid');
            const rangeEl = panel.querySelector('[data-role="util-report-range"]');
            const monthCountEl = panel.querySelector('[data-role="util-report-month-count"]');
            const totalCostEl = panel.querySelector('[data-role="util-report-total-cost"]');
            const avgCostEl = panel.querySelector('[data-role="util-report-avg-cost"]');
            const electricCostEl = panel.querySelector('[data-role="util-report-electric-cost"]');
            const gasCostEl = panel.querySelector('[data-role="util-report-gas-cost"]');
            const wasteCostEl = panel.querySelector('[data-role="util-report-waste-cost"]');
            const totalShareEl = panel.querySelector('[data-role="util-report-total-share"]');
            const electricShareEl = panel.querySelector('[data-role="util-report-electric-share"]');
            const gasShareEl = panel.querySelector('[data-role="util-report-gas-share"]');
            const wasteShareEl = panel.querySelector('[data-role="util-report-waste-share"]');
            const electricUnitEl = panel.querySelector('[data-role="util-report-electric-unit"]');
            const gasUnitEl = panel.querySelector('[data-role="util-report-gas-unit"]');
            const wasteUnitEl = panel.querySelector('[data-role="util-report-waste-unit"]');
            const totalUnitEl = panel.querySelector('[data-role="util-report-total-unit"]');
            const noteEl = panel.querySelector('[data-role="util-report-note"]');

            if (kpiGridEl) {
                kpiGridEl.innerHTML = '';
                kpiGridEl.hidden = true;
            }

            const unitLabel = getUtilReportUnitLabel(UtilReportState.unitKey);
            const decimals = UtilReportState.decimals;

            if (!result || !Array.isArray(result.rows) || !result.rows.length) {
                if (rangeEl) rangeEl.textContent = '-';
                if (monthCountEl) monthCountEl.textContent = '0';
                if (totalCostEl) totalCostEl.textContent = '-';
                if (avgCostEl) avgCostEl.textContent = '-';
                if (electricCostEl) electricCostEl.textContent = '-';
                if (gasCostEl) gasCostEl.textContent = '-';
                if (wasteCostEl) wasteCostEl.textContent = '-';
                if (totalShareEl) totalShareEl.textContent = '-';
                if (electricShareEl) electricShareEl.textContent = '-';
                if (gasShareEl) gasShareEl.textContent = '-';
                if (wasteShareEl) wasteShareEl.textContent = '-';
                if (electricUnitEl) electricUnitEl.textContent = '-';
                if (gasUnitEl) gasUnitEl.textContent = '-';
                if (wasteUnitEl) wasteUnitEl.textContent = '-';
                if (totalUnitEl) totalUnitEl.textContent = '-';
                if (noteEl) noteEl.textContent = '총괄 비율을 불러올 데이터가 없습니다.';
                return;
            }

            const totalCost = Number(result.summary.totalCost) || 0;
            const electricCost = Number(result.summary.electricCost) || 0;
            const gasCost = Number(result.summary.gasCost) || 0;
            const wasteCost = Number(result.summary.wasteCost) || 0;
            const formatShare = value => totalCost > 0
                ? `구성비 ${formatUtilNumber((value / totalCost) * 100, 1)}%`
                : '구성비 -';

            if (rangeEl) rangeEl.textContent = result.rangeLabel;
            if (monthCountEl) monthCountEl.textContent = `${formatUtilNumber(result.monthCount)}개월`;
            if (totalCostEl) totalCostEl.textContent = `${formatUtilReportScaled(totalCost, UtilReportState.unitKey, decimals)} ${unitLabel}`;
            if (avgCostEl) avgCostEl.textContent = `${formatUtilReportScaled(result.summary.averageCost, UtilReportState.unitKey, decimals)} ${unitLabel}`;
            if (electricCostEl) electricCostEl.textContent = `${formatUtilReportScaled(electricCost, UtilReportState.unitKey, decimals)} ${unitLabel}`;
            if (gasCostEl) gasCostEl.textContent = `${formatUtilReportScaled(gasCost, UtilReportState.unitKey, decimals)} ${unitLabel}`;
            if (wasteCostEl) wasteCostEl.textContent = `${formatUtilReportScaled(wasteCost, UtilReportState.unitKey, decimals)} ${unitLabel}`;
            if (totalShareEl) totalShareEl.textContent = totalCost > 0 ? '구성비 100.0%' : '구성비 -';
            if (electricShareEl) electricShareEl.textContent = formatShare(electricCost);
            if (gasShareEl) gasShareEl.textContent = formatShare(gasCost);
            if (wasteShareEl) wasteShareEl.textContent = formatShare(wasteCost);
            if (electricUnitEl) electricUnitEl.textContent = Number.isFinite(result.summary.electricUnit)
                ? `${formatUtilReportScaled(result.summary.electricUnit, UtilReportState.unitKey, decimals)} ${unitLabel}/kg`
                : '-';
            if (gasUnitEl) gasUnitEl.textContent = Number.isFinite(result.summary.gasUnit)
                ? `${formatUtilReportScaled(result.summary.gasUnit, UtilReportState.unitKey, decimals)} ${unitLabel}/kg`
                : '-';
            if (wasteUnitEl) wasteUnitEl.textContent = Number.isFinite(result.summary.wasteUnit)
                ? `${formatUtilReportScaled(result.summary.wasteUnit, UtilReportState.unitKey, decimals)} ${unitLabel}/kg`
                : '-';
            if (totalUnitEl) totalUnitEl.textContent = Number.isFinite(result.summary.totalUnit)
                ? `${formatUtilReportScaled(result.summary.totalUnit, UtilReportState.unitKey, decimals)} ${unitLabel}/kg`
                : '-';
            if (noteEl) noteEl.textContent = '';
        }
