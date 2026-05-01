        function getUtilReportSiteLatestDelta(scopeKey, siteKey, targetYear = '') {
            const rows = buildUtilReportSiteSeries(scopeKey, siteKey, targetYear);
            if (rows.length < 2) return null;
            const current = Number(rows[rows.length - 1].value);
            const prev = Number(rows[rows.length - 2].value);
            if (!Number.isFinite(current) || !Number.isFinite(prev)) return null;
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: rows[rows.length - 1].monthKey };
        }

        function getUtilReportSiteLatestYoYDelta(scopeKey, siteKey, targetYear = '') {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'all') return null;
            const rows = buildUtilReportSiteSeries(normalizedScope, normalizedSite, targetYear);
            if (!rows.length) return null;
            const currentRow = rows[rows.length - 1];
            const current = Number(currentRow.value);
            if (!Number.isFinite(current)) return null;
            const prevMonthKey = toUtilMonthKey(Number(currentRow.year) - 1, Number(currentRow.month));
            const prevState = buildUtilReportSiteScopedState(normalizedScope, normalizedSite, {
                from: prevMonthKey,
                to: prevMonthKey
            });
            const prevResult = buildUtilReportMonthlyRows(prevState);
            const metricKey = getUtilReportMetricFromScope(normalizedScope);
            const prev = Number(getUtilReportMetricValue((prevResult?.rows || [])[0], metricKey));
            if (!Number.isFinite(prev)) {
                return { delta: null, rate: null, hasPrev: false, currentMonthKey: currentRow.monthKey };
            }
            const delta = current - prev;
            const rate = prev !== 0 ? (delta / prev) * 100 : null;
            return { delta, rate, hasPrev: true, currentMonthKey: currentRow.monthKey };
        }

        function buildUtilReportDeltaPairFromSeries(rows) {
            const seriesRows = Array.isArray(rows) ? rows : [];
            const validRows = seriesRows.filter(row => Number.isFinite(Number(row?.value)));
            if (!validRows.length) return { mom: null, yoy: null };
            let mom = null;
            if (validRows.length >= 2) {
                const current = Number(validRows[validRows.length - 1].value);
                const prev = Number(validRows[validRows.length - 2].value);
                if (Number.isFinite(current) && Number.isFinite(prev)) {
                    const delta = current - prev;
                    const rate = prev !== 0 ? (delta / prev) * 100 : null;
                    mom = {
                        delta,
                        rate,
                        hasPrev: true,
                        currentMonthKey: String(validRows[validRows.length - 1].monthKey || '')
                    };
                }
            }
            const currentRow = validRows[validRows.length - 1];
            let yoy = null;
            if (currentRow) {
                const prevRow = validRows.find(row =>
                    Number(row?.year) === Number(currentRow.year) - 1
                    && Number(row?.month) === Number(currentRow.month)
                );
                if (prevRow && Number.isFinite(Number(prevRow.value))) {
                    const current = Number(currentRow.value);
                    const prev = Number(prevRow.value);
                    const delta = current - prev;
                    const rate = prev !== 0 ? (delta / prev) * 100 : null;
                    yoy = {
                        delta,
                        rate,
                        hasPrev: true,
                        currentMonthKey: String(currentRow.monthKey || '')
                    };
                } else {
                    yoy = {
                        delta: null,
                        rate: null,
                        hasPrev: false,
                        currentMonthKey: String(currentRow?.monthKey || '')
                    };
                }
            }
            return { mom, yoy };
        }

        function buildUtilReportSiteMetricMetaMap(scopeKey, yearFilter = '', categoryKey = UtilReportState.categoryKey) {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const compositionCategory = getUtilReportCompositionCategory(categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            const valueType = getUtilReportCompositionValueType(compositionCategory);
            const map = {};
            if (compositionCategory === 'production') {
                const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                    .filter(item => !yearFilter || String(item.year) === String(yearFilter));
                const totalSeries = [];
                const siteSeriesMap = new Map([
                    ['Plant A', []],
                    ['Plant B', []]
                ]);

                months.forEach(item => {
                    const year = Number(item.year);
                    const month = Number(item.month);
                    if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                    let monthTotal = 0;
                    let hasMonthValue = false;
                    ['Plant A', 'Plant B'].forEach(siteKey => {
                        const value = Number(sumUtilReportProductionBySourceTeams(year, month, resolveUtilReportProductionTeamsBySite(siteKey)));
                        if (Number.isFinite(value) && value > 0) {
                            siteSeriesMap.get(siteKey).push({
                                year,
                                month,
                                monthKey: String(item.key || ''),
                                value
                            });
                            monthTotal += value;
                            hasMonthValue = true;
                        }
                    });
                    if (hasMonthValue) {
                        totalSeries.push({
                            year,
                            month,
                            monthKey: String(item.key || ''),
                            value: monthTotal
                        });
                    }
                });

                const totalDeltaPair = buildUtilReportDeltaPairFromSeries(totalSeries);
                map[compositionKeys.total] = [
                    buildUtilReportDeltaMeta(totalDeltaPair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(totalDeltaPair.yoy, '전년대비', { valueType })
                ];
                ['Plant A', 'Plant B'].forEach(siteKey => {
                    const metricKey = buildUtilReportSiteMetricKey(siteKey);
                    if (!metricKey) return;
                    const pair = buildUtilReportDeltaPairFromSeries(siteSeriesMap.get(siteKey) || []);
                    map[metricKey] = [
                        buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                        buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                    ];
                });
                return map;
            }

            const metricKey = getUtilReportMetricFromScope(normalizedScope);
            const totalState = buildUtilReportSiteScopedState(normalizedScope, 'all');
            const totalRows = (buildUtilReportMonthlyRows(totalState)?.rows || [])
                .filter(row => !yearFilter || String(row?.year) === String(yearFilter))
                .map(row => ({
                    year: Number(row?.year),
                    month: Number(row?.month),
                    monthKey: String(row?.monthKey || ''),
                    value: Number(getUtilReportMetricValue(row, metricKey))
                }))
                .filter(row => Number.isFinite(row.value));
            if (totalRows.length) {
                const totalDeltaPair = buildUtilReportDeltaPairFromSeries(totalRows);
                map[compositionKeys.total] = [
                    buildUtilReportDeltaMeta(totalDeltaPair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(totalDeltaPair.yoy, '전년대비', { valueType })
                ];
            }
            ['Plant A', 'Plant B'].forEach(siteKey => {
                const metricKey = buildUtilReportSiteMetricKey(siteKey);
                if (!metricKey) return;
                const mom = getUtilReportSiteLatestDelta(normalizedScope, siteKey, yearFilter);
                const yoy = getUtilReportSiteLatestYoYDelta(normalizedScope, siteKey, yearFilter);
                map[metricKey] = [
                    buildUtilReportDeltaMeta(mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportTeamTotalExcludeWasteSeries(teamName = 'all', yearFilter = '') {
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: sumUtilReportMultiScopeTeamCostByMonth(['electric', 'gas'], teamName || 'all', item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
        }

        function buildUtilReportProcessTotalExcludeWasteSeries(processKey = 'all', yearFilter = '') {
            const spec = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.find(item => item.processKey === processKey) || null;
            const teamFilters = spec
                ? spec.teamFilters
                : UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.flatMap(item => item.teamFilters);
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: sumUtilReportMultiScopeTeamGroupCostByMonth(['electric', 'gas'], teamFilters, item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
        }

        function buildUtilReportTeamTotalExcludeWasteMetricMetaMap(composition, yearFilter = '') {
            const map = {};
            const valueType = 'cost';
            const totalPair = buildUtilReportDeltaPairFromSeries(buildUtilReportTeamTotalExcludeWasteSeries('all', yearFilter));
            map[UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const parsed = parseUtilReportTeamTotalExcludeWasteCompositionMetric(item?.key);
                if (!parsed.teamName) return;
                const pair = buildUtilReportDeltaPairFromSeries(buildUtilReportTeamTotalExcludeWasteSeries(parsed.teamName, yearFilter));
                map[item.key] = [
                    buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportProcessTotalExcludeWasteMetricMetaMap(composition, yearFilter = '') {
            const map = {};
            const valueType = 'cost';
            const totalPair = buildUtilReportDeltaPairFromSeries(buildUtilReportProcessTotalExcludeWasteSeries('all', yearFilter));
            map[UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const parsed = parseUtilReportProcessTotalExcludeWasteCompositionMetric(item?.key);
                if (!parsed.processKey) return;
                const pair = buildUtilReportDeltaPairFromSeries(buildUtilReportProcessTotalExcludeWasteSeries(parsed.processKey, yearFilter));
                map[item.key] = [
                    buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportElectricProcessSeries(processKey = 'all', yearFilter = '', siteKey = 'all') {
            const teamFilters = resolveUtilReportElectricProcessTeamFilters(processKey, siteKey);
            if (!teamFilters.length) return [];
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: sumUtilReportMultiScopeTeamGroupCostByMonth(['electric'], teamFilters, item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
        }

        function buildUtilReportElectricProcessCompositionData(yearFilter = '', siteOverride = '') {
            const selectedSiteKey = normalizeUtilReportSiteKey(
                siteOverride || resolveUtilReportSelectedSiteContextKey('electric', 'cost')
            );
            const items = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.map(spec => {
                const series = buildUtilReportElectricProcessSeries(spec.processKey, yearFilter, selectedSiteKey);
                const value = series.reduce((acc, row) => acc + (Number(row?.value) || 0), 0);
                return {
                    key: buildUtilReportElectricProcessMetricKey(spec.processKey),
                    label: spec.label,
                    processKey: spec.processKey,
                    siteKey: selectedSiteKey,
                    value,
                    color: spec.color
                };
            }).filter(item => item.value > 0);
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            return {
                title: selectedSiteKey === 'all' ? '세부 공정 구성비 (전기)' : `${selectedSiteKey} 공정 구성비 (전기)`,
                total,
                ratioTotal: total,
                totalItemLabel: getUtilReportElectricScopeTotalLabel(selectedSiteKey),
                items,
                valueType: 'cost',
                siteKey: selectedSiteKey
            };
        }

        function buildUtilReportGasProcessSeries(processKey = 'all', yearFilter = '', siteKey = 'all') {
            const teamFilters = resolveUtilReportGasProcessTeamFilters(processKey, siteKey);
            if (!teamFilters.length) return [];
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: sumUtilReportMultiScopeTeamGroupCostByMonth(['gas'], teamFilters, item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
        }

        function buildUtilReportGasProcessCompositionData(yearFilter = '', siteOverride = '') {
            const selectedSiteKey = normalizeUtilReportSiteKey(
                siteOverride || resolveUtilReportSelectedSiteContextKey('gas', 'cost')
            );
            const items = UTIL_REPORT_GAS_PROCESS_SPECS.map(spec => {
                const series = buildUtilReportGasProcessSeries(spec.processKey, yearFilter, selectedSiteKey);
                const value = series.reduce((acc, row) => acc + (Number(row?.value) || 0), 0);
                return {
                    key: buildUtilReportGasProcessMetricKey(spec.processKey),
                    label: spec.label,
                    processKey: spec.processKey,
                    siteKey: selectedSiteKey,
                    value,
                    color: spec.color
                };
            }).filter(item => item.value > 0);
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            return {
                title: selectedSiteKey === 'all' ? '세부 공정 구성비 (가스)' : `${selectedSiteKey} 공정 구성비 (가스)`,
                total,
                ratioTotal: total,
                totalItemLabel: getUtilReportGasScopeTotalLabel(selectedSiteKey),
                items,
                valueType: 'cost',
                siteKey: selectedSiteKey
            };
        }

        function buildUtilReportElectricProcessMetricMetaMap(composition, yearFilter = '', siteKey = 'all') {
            const map = {};
            const valueType = 'cost';
            const normalizedSite = normalizeUtilReportSiteKey(siteKey || composition?.siteKey || 'all');
            const totalPair = buildUtilReportDeltaPairFromSeries(
                buildUtilReportElectricProcessSeries('all', yearFilter, normalizedSite)
            );
            map[UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const parsed = parseUtilReportElectricProcessCompositionMetric(item?.key);
                if (!parsed.processKey) return;
                const pair = buildUtilReportDeltaPairFromSeries(
                    buildUtilReportElectricProcessSeries(parsed.processKey, yearFilter, normalizedSite)
                );
                map[item.key] = [
                    buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportGasProcessMetricMetaMap(composition, yearFilter = '', siteKey = 'all') {
            const map = {};
            const valueType = 'cost';
            const normalizedSite = normalizeUtilReportSiteKey(siteKey || composition?.siteKey || 'all');
            const totalPair = buildUtilReportDeltaPairFromSeries(
                buildUtilReportGasProcessSeries('all', yearFilter, normalizedSite)
            );
            map[UTIL_REPORT_GAS_PROCESS_TOTAL_KEY] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const parsed = parseUtilReportGasProcessCompositionMetric(item?.key);
                if (!parsed.processKey) return;
                const pair = buildUtilReportDeltaPairFromSeries(
                    buildUtilReportGasProcessSeries(parsed.processKey, yearFilter, normalizedSite)
                );
                map[item.key] = [
                    buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportProductionProcessSeries(processKey = 'all', yearFilter = '', contextFilter = 'all') {
            const targetTeams = resolveUtilReportProductionProcessTeams(processKey, contextFilter);
            if (!targetTeams.length) return [];
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: Number(sumUtilReportProductionBySourceTeams(item.year, item.month, targetTeams))
                }))
                .filter(item => Number.isFinite(item.value) && item.value > 0);
        }

        function buildUtilReportProductionProcessCompositionData(yearFilter = '', contextFilterOverride = '') {
            const siteContextKey = resolveUtilReportSelectedSiteContextKey('total', 'production');
            const contextFilter = contextFilterOverride || resolveUtilReportProductionProcessContextFilter(siteContextKey);
            const contextLabel = getUtilReportProductionProcessContextLabel(contextFilter);
            const items = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.map(spec => {
                const series = buildUtilReportProductionProcessSeries(spec.processKey, yearFilter, contextFilter);
                const value = series.reduce((acc, row) => acc + (Number(row?.value) || 0), 0);
                return {
                    key: buildUtilReportProductionProcessMetricKey(spec.processKey),
                    label: spec.label,
                    processKey: spec.processKey,
                    value,
                    color: spec.color
                };
            }).filter(item => item.value > 0);
            const total = items.reduce((acc, item) => acc + (Number(item?.value) || 0), 0);
            const title = contextFilter === 'all'
                ? '공정별 생산량 구성비 (Process Alpha / Process Beta B,Process Beta A / Process Gamma)'
                : `${contextLabel} 공정 생산량 구성비`;
            return {
                title,
                total,
                ratioTotal: total,
                totalItemLabel: contextFilter === 'all' ? '총생산량' : `${contextLabel} 생산량`,
                items,
                valueType: 'production',
                contextFilter
            };
        }

        function buildUtilReportProductionProcessMetricMetaMap(composition, yearFilter = '', contextFilter = 'all') {
            const map = {};
            const valueType = 'production';
            const normalizedContextFilter = Array.isArray(contextFilter)
                ? resolveUtilReportProductionTeamsByFilter(contextFilter)
                : (contextFilter || composition?.contextFilter || 'all');
            const totalPair = buildUtilReportDeltaPairFromSeries(
                buildUtilReportProductionProcessSeries('all', yearFilter, normalizedContextFilter)
            );
            map[UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            const items = Array.isArray(composition?.items) ? composition.items : [];
            items.forEach(item => {
                const parsed = parseUtilReportProductionProcessCompositionMetric(item?.key);
                if (!parsed.processKey) return;
                const pair = buildUtilReportDeltaPairFromSeries(
                    buildUtilReportProductionProcessSeries(parsed.processKey, yearFilter, normalizedContextFilter)
                );
                map[item.key] = [
                    buildUtilReportDeltaMeta(pair.mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(pair.yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function buildUtilReportProductionProcessLineContext(processMetric = UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY, contextFilter = 'all') {
            const parsed = parseUtilReportProductionProcessCompositionMetric(processMetric);
            const targetTeams = resolveUtilReportProductionProcessTeams(parsed.processKey || 'all', contextFilter);
            const spec = getUtilReportProductionProcessSpec(parsed.processKey);
            const contextLabel = getUtilReportProductionProcessContextLabel(contextFilter);
            const title = parsed.processKey
                ? (contextFilter === 'all'
                    ? `${spec?.label || '공정'} 라인 생산량 구성비`
                    : `${contextLabel} ${spec?.label || '공정'} 라인 생산량 구성비`)
                : (contextFilter === 'all'
                    ? '라인 생산량 구성비'
                    : `${contextLabel} 라인 생산량 구성비`);
            return {
                contextFilter,
                targetTeams,
                processKey: parsed.processKey || '',
                processLabel: spec?.label || '',
                title,
                totalItemLabel: parsed.processKey ? `${spec?.label || '공정'} 생산량` : (contextFilter === 'all' ? '총생산량' : `${contextLabel} 생산량`)
            };
        }

        function buildUtilReportSelectedTeamMetricMetaMap(composition, yearFilter = '', categoryKey = UtilReportState.categoryKey) {
            const compositionCategory = getUtilReportCompositionCategory(categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            const valueType = getUtilReportCompositionValueType(compositionCategory);
            const map = {};
            const items = Array.isArray(composition?.items) ? composition.items : [];
            if (compositionCategory === 'production') {
                const months = getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                    .filter(item => !yearFilter || String(item.year) === String(yearFilter));
                items.forEach(item => {
                    const parsed = parseUtilReportTeamCompositionMetric(item?.key);
                    if (parsed.sourceLabel !== '생산량' || !parsed.teamName) return;
                    const series = [];
                    months.forEach(monthInfo => {
                        const year = Number(monthInfo.year);
                        const month = Number(monthInfo.month);
                        if (!Number.isFinite(year) || !Number.isFinite(month)) return;
                        const value = Number(sumUtilReportProductionBySourceTeams(year, month, [parsed.teamName]));
                        if (!Number.isFinite(value) || value <= 0) return;
                        series.push({
                            year,
                            month,
                            monthKey: String(monthInfo.key || ''),
                            value
                        });
                    });
                    const deltaPair = buildUtilReportDeltaPairFromSeries(series);
                    map[item.key] = [
                        buildUtilReportDeltaMeta(deltaPair.mom, '전월대비', { valueType }),
                        buildUtilReportDeltaMeta(deltaPair.yoy, '전년대비', { valueType })
                    ];
                });
                return map;
            }

            const selectedScope = normalizeUtilReportScope(UtilReportState.scopeKey);
            const totalSeries = ['electric', 'gas'].includes(selectedScope)
                ? getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                    .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                    .map(item => ({
                        year: Number(item.year),
                        month: Number(item.month),
                        monthKey: String(item.key || ''),
                        value: sumUtilReportScopeTeamCostByMonth(
                            selectedScope,
                            resolveUtilReportSelectedSiteContextKey(selectedScope, categoryKey),
                            item.year,
                            item.month
                        )
                    }))
                    .filter(item => Number.isFinite(item.value))
                : buildUtilReportSelectedDetailCostSeries(compositionKeys.total, yearFilter);
            const totalPair = buildUtilReportDeltaPairFromSeries(totalSeries);
            map[compositionKeys.total] = [
                buildUtilReportDeltaMeta(totalPair.mom, '전월대비', { valueType }),
                buildUtilReportDeltaMeta(totalPair.yoy, '전년대비', { valueType })
            ];
            items.forEach(item => {
                const parsed = parseUtilReportTeamCompositionMetric(item?.key);
                if (!parsed.scopeKey || !parsed.teamName) return;
                const scopeKey = normalizeUtilReportScope(parsed.scopeKey);
                if (!['electric', 'gas', 'waste'].includes(scopeKey)) return;
                const mom = getUtilReportScopeTeamLatestDelta(scopeKey, parsed.teamName, yearFilter);
                const yoy = getUtilReportScopeTeamLatestYoYDelta(scopeKey, parsed.teamName, yearFilter);
                map[item.key] = [
                    buildUtilReportDeltaMeta(mom, '전월대비', { valueType }),
                    buildUtilReportDeltaMeta(yoy, '전년대비', { valueType })
                ];
            });
            return map;
        }

        function withUtilReportWasteCostMode(tempModeKey, callback) {
            const previousMode = UtilReportState.wasteCostModeKey;
            const normalized = normalizeUtilReportWasteCostModeKey(tempModeKey, UtilReportState.wasteTeam);
            UtilReportState.wasteCostModeKey = normalized;
            try {
                return callback();
            } finally {
                UtilReportState.wasteCostModeKey = previousMode;
            }
        }

        function buildUtilReportMonthOptions() {
            const allEntries = []
                .concat(UTIL_ELECTRIC_ENTRIES || [])
                .concat(UTIL_GAS_ENTRIES || [])
                .concat(UTIL_WASTE_ENTRIES || []);
            const options = buildUtilMonthOptions(allEntries).map(item => ({
                ...item,
                label: formatUtilReportMonthShort(item.value)
            }));
            if (options.length) return options;
            const current = getCurrentMonthKey();
            const parsed = parseUtilMonthValue(current);
            if (!parsed) return [];
            return [{
                value: current,
                label: formatUtilReportMonthShort(current),
                year: parsed.year,
                month: parsed.month
            }];
        }

        function ensureUtilReportStateRange() {
            const monthOptions = buildUtilReportMonthOptions();
            if (!monthOptions.length) return monthOptions;
            const monthSet = new Set(monthOptions.map(item => item.value));
            const defaultFrom = monthOptions[0].value;
            const defaultTo = monthOptions[monthOptions.length - 1].value;

            if (!monthSet.has(UtilReportState.from)) UtilReportState.from = defaultFrom;
            if (!monthSet.has(UtilReportState.to)) UtilReportState.to = defaultTo;

            const normalized = normalizeMonthRange(UtilReportState.from, UtilReportState.to);
            UtilReportState.from = monthSet.has(normalized.start) ? normalized.start : defaultFrom;
            UtilReportState.to = monthSet.has(normalized.end) ? normalized.end : defaultTo;
            return monthOptions;
        }
        function getUtilReportMonthRange(fromVal, toVal) {
            const range = normalizeMonthRange(fromVal, toVal);
            const startIndex = monthKeyToIndex(range.start);
            const endIndex = monthKeyToIndex(range.end);
            if (!Number.isFinite(startIndex) || !Number.isFinite(endIndex)) return [];
            const months = [];
            for (let index = startIndex; index <= endIndex; index += 1) {
                const year = Math.floor(index / 12);
                const month = (index % 12) + 1;
                const key = toUtilMonthKey(year, month);
                months.push({ year, month, key });
            }
            return months;
        }

        function sumUtilReportMetric(entries, year, month, teamName, metricKey) {
            let total = 0;
            const scopeKey = entries === UTIL_GAS_ENTRIES
                ? 'gas'
                : (entries === UTIL_ELECTRIC_ENTRIES ? 'electric' : (entries === UTIL_WASTE_ENTRIES ? 'waste' : 'total'));
            (entries || []).forEach(entry => {
                if (entry?.year !== year || entry?.month !== month) return;
                if (!matchesUtilReportTeamFilter(scopeKey, teamName, entry?.team)) return;
                const value = Number(entry?.[metricKey]);
                if (!Number.isFinite(value)) return;
                total += value;
            });
            return total;
        }

        function sumUtilReportProductionFallback(entries, year, month, teamName) {
            return sumUtilReportMetric(entries, year, month, teamName, 'production');
        }

        function normalizeUtilReportProductionSourceTeamName(teamName) {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (canonical === '1팀1파트') return 'Line Alpha';
            if (canonical === '1팀2파트') return 'Line Beta';
            if (canonical === 'Line Gamma') return 'Line Gamma';
            if (canonical === 'Line Delta') return 'Line Delta';
            return String(teamName || '').trim();
        }

        function resolveUtilReportProductionTeamsBySite(siteKey) {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'Plant B') return ['Line Alpha'];
            if (normalizedSite === 'Plant A') return ['Line Beta', 'Line Gamma', 'Line Delta'];
            return UTIL_REPORT_PRODUCTION_TEAM_BASE.slice();
        }

        function resolveUtilReportProductionTeamsByFilter(teamFilter = 'all') {
            if (Array.isArray(teamFilter)) {
                const normalizedList = teamFilter
                    .map(teamName => normalizeUtilReportProductionSourceTeamName(teamName))
                    .filter(teamName => UTIL_REPORT_PRODUCTION_TEAM_BASE.includes(teamName));
                return Array.from(new Set(normalizedList));
            }
            const normalizedFilter = normalizeUtilReportProductionTeam(teamFilter);
            if (!normalizedFilter || normalizedFilter === 'all') {
                return UTIL_REPORT_PRODUCTION_TEAM_BASE.slice();
            }
            const candidates = resolveUtilProductionSourceTeams(normalizedFilter)
                .map(teamName => normalizeUtilReportProductionSourceTeamName(teamName))
                .filter(teamName => UTIL_REPORT_PRODUCTION_TEAM_BASE.includes(teamName));
            const unique = Array.from(new Set(candidates));
            return unique.length ? unique : UTIL_REPORT_PRODUCTION_TEAM_BASE.slice();
        }

        function resolveUtilReportProductionProcessContextFilter(siteKey = 'all') {
            const activeTeam = normalizeUtilReportProductionTeam(UtilReportState.productionTeam);
            if (activeTeam !== 'all') return activeTeam;
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            return normalizedSite !== 'all' ? normalizedSite : 'all';
        }

        function resolveUtilReportProductionProcessTeams(processKey = 'all', contextFilter = 'all') {
            const allowedTeams = resolveUtilReportProductionTeamsByFilter(contextFilter);
            if (!allowedTeams.length) return [];
            const spec = getUtilReportProductionProcessSpec(processKey);
            if (!spec) return allowedTeams;
            const specTeams = spec.teamFilters
                .flatMap(teamFilter => resolveUtilProductionSourceTeams(teamFilter))
                .map(teamName => normalizeUtilReportProductionSourceTeamName(teamName))
                .filter(teamName => UTIL_REPORT_PRODUCTION_TEAM_BASE.includes(teamName));
            const uniqueSpecTeams = Array.from(new Set(specTeams));
            return allowedTeams.filter(teamName => uniqueSpecTeams.includes(teamName));
        }

        function getUtilReportProductionProcessContextLabel(contextFilter = 'all') {
            if (Array.isArray(contextFilter)) {
                const labels = resolveUtilReportProductionTeamsByFilter(contextFilter)
                    .map(teamName => getUtilReportDisplayTeamLabel(teamName, { categoryKey: 'production', scopeKey: 'total' }));
                return labels.length ? labels.join(' / ') : '전체';
            }
            const normalizedTeam = normalizeUtilReportProductionTeam(contextFilter);
            if (normalizedTeam !== 'all') {
                return getUtilReportDisplayTeamLabel(normalizedTeam, { categoryKey: 'production', scopeKey: 'total' });
            }
            const normalizedSite = normalizeUtilReportSiteKey(contextFilter);
            if (normalizedSite !== 'all') return normalizedSite;
            return '전체';
        }

        function normalizeUtilReportProductionLineBucket(teamName, rawLineName = '', rawProductName = '') {
            const sourceTeam = normalizeUtilReportProductionSourceTeamName(teamName);
            const lineName = String(rawLineName || '').trim();
            const productName = String(rawProductName || '').trim();
            const mergedText = normalizeUtilDedupeText(`${lineName} ${productName}`).replace(/\s+/g, '');
            const mergedToken = mergedText.replace(/[^a-z0-9가-힣]/gi, '');
            const mergedTokenLower = mergedToken.toLowerCase();

            if (sourceTeam === 'Line Alpha') {
                if (mergedTokenLower.includes('msd')) return 'MSD';
                if (mergedTokenLower.includes('sd')) return 'SD';
            }

            if (sourceTeam === 'Line Beta') {
                if (/(?:ica|이카)(?:1|2|3)(?:호기)?/i.test(mergedToken)) {
                    return 'ICA';
                }
            }

            if (sourceTeam === 'Line Gamma') {
                if (mergedText.includes('Process Beta B') || mergedText.includes('stick')) {
                    return 'Process Beta B';
                }
                return '로터리·버티컬';
            }

            if (sourceTeam === 'Line Delta') {
                if (mergedText.includes('bottle') || mergedText.includes('보틀')) {
                    return 'Bottle';
                }
                return '기타';
            }

            return lineName || productName || '라인 미지정';
        }

        function buildUtilReportProductionProductMonthlyValueMap(year, month, teamFilter = 'all') {
            const yearValue = Number(year);
            const monthValue = Number(month);
            if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) return {};
            const targetTeams = resolveUtilReportProductionTeamsByFilter(teamFilter);
            const valueMap = {};
            const dedupeSet = new Set();

            targetTeams.forEach(teamName => {
                const listed = listUtilDailyEntriesByMetric(teamName, yearValue, monthValue, 'amount');
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
                    valueMap[key] = (Number(valueMap[key]) || 0) + amount;
                });
            });
            return valueMap;
        }

