        function getWorkTeamCalendarUtilitySummary(dataKey, monthKey) {
            const parsed = parseMonthKey(monthKey);
            const normalizedDataKey = String(dataKey || '').trim();
            const emptyGas = { usageText: '-', costText: '-', detailRows: [], availableModes: [], canSelect: false, mode: getWorkTeamCalendarGasMode(dataKey) };
            const emptyWaste = { usageText: '-', costText: '-' };
            const includeWasteSummary = shouldWorkTeamCalendarIncludeWasteSummary(normalizedDataKey);
            const isWasteOnlySummary = normalizedDataKey === 'work_team_calendar_team4';
            if (!parsed) {
                if (includeWasteSummary && !isWasteOnlySummary) {
                    return {
                        electric: { usageText: '-', costText: '-' },
                        gas: emptyGas,
                        waste: emptyWaste,
                        production: { totalAmountText: '-', itemCountText: '-' },
                        workEntryCountText: '0건',
                        workCostText: '-'
                    };
                }
                if (isWasteOnlySummary) {
                    return {
                        waste: emptyWaste,
                        workEntryLabel: '작업내역',
                        workEntryCountText: '0건',
                        workCostText: '-'
                    };
                }
                return {
                    electric: { usageText: '-', costText: '-' },
                    gas: emptyGas,
                    workEntryCountText: '0건',
                    workCostText: '-'
                };
            }
            if (includeWasteSummary && !isWasteOnlySummary) {
                const workEntryCostSummary = getWorkTeamCalendarMonthEntryCostSummary(dataKey, monthKey);
                return {
                    electric: buildWorkTeamCalendarElectricMonthSummary(
                        getWorkTeamCalendarUtilityTeamNames(dataKey, 'electric'),
                        parsed.year,
                        parsed.monthIndex + 1
                    ),
                    gas: buildWorkTeamCalendarGasMonthSummary(
                        getWorkTeamCalendarUtilityTeamNames(dataKey, 'gas'),
                        parsed.year,
                        parsed.monthIndex + 1,
                        'all'
                    ),
                    waste: buildWorkTeamCalendarWasteMonthSummary(dataKey, parsed.year, parsed.monthIndex + 1),
                    production: buildWorkTeamCalendarProductionMonthSummary(dataKey, monthKey),
                        workEntryCountText: formatWorkTeamCalendarMonthEntryText(dataKey, monthKey),
                    workCostText: workEntryCostSummary.costText
                };
            }
            if (isWasteOnlySummary) {
                const workEntryCostSummary = getWorkTeamCalendarMonthEntryCostSummary(dataKey, monthKey);
                return {
                    waste: buildWorkTeamCalendarWasteMonthSummary(dataKey, parsed.year, parsed.monthIndex + 1),
                    workEntryLabel: '작업내역',
                    workEntryCountText: formatWorkTeamCalendarMonthEntryText(dataKey, monthKey),
                    workCostText: workEntryCostSummary.costText
                };
            }
            const electricTeamNames = getWorkTeamCalendarUtilityTeamNames(dataKey, 'electric');
            const gasTeamNames = getWorkTeamCalendarUtilityTeamNames(dataKey, 'gas');
            const productionMonthSummary = buildWorkTeamCalendarProductionMonthSummary(dataKey, monthKey);
            const workEntryCostSummary = getWorkTeamCalendarMonthEntryCostSummary(dataKey, monthKey);
            return {
                electric: buildWorkTeamCalendarElectricMonthSummary(electricTeamNames, parsed.year, parsed.monthIndex + 1),
                gas: buildWorkTeamCalendarGasMonthSummary(gasTeamNames, parsed.year, parsed.monthIndex + 1, getWorkTeamCalendarGasMode(dataKey)),
                production: productionMonthSummary,
                workEntryCountText: formatWorkTeamCalendarMonthEntryText(dataKey, monthKey),
                workCostText: workEntryCostSummary.costText
            };
        }

        function getWorkTeamCalendarProductionTeamGroups(dataKey, dateKeys) {
            const dateGroups = getWorkTeamCalendarProductionGroups(dataKey, dateKeys);
            const grouped = new Map();
            dateGroups.forEach(group => {
                (group?.items || []).forEach(item => {
                    const matchedCategory = getWorkTeamCalendarDisplayCategoryByTeamName(item?.teamName);
                    const teamKey = String(matchedCategory?.dataKey || item?.teamName || '').trim();
                    const teamLabel = String(matchedCategory?.title || item?.teamName || '미분류').trim();
                    if (!teamKey) return;
                    if (!grouped.has(teamKey)) {
                        grouped.set(teamKey, {
                            teamKey,
                            teamLabel,
                            items: []
                        });
                    }
                    grouped.get(teamKey).items.push(item);
                });
            });
            return Array.from(grouped.values())
                .map(group => ({
                    ...group,
                    ...summarizeWorkTeamCalendarProductionMetrics(group.items)
                }))
                .sort((a, b) => {
                    const displayDiff = getWorkTeamCalendarDisplayOrderIndex(a?.teamKey) - getWorkTeamCalendarDisplayOrderIndex(b?.teamKey);
                    if (displayDiff !== 0) return displayDiff;
                    return String(a?.teamLabel || '').localeCompare(String(b?.teamLabel || ''), 'ko');
                });
        }

        function renderWorkTeamCalendarProductionTeamGroupsHtml(dataKey, dateKeys, category) {
            const groups = getWorkTeamCalendarProductionTeamGroups(dataKey, dateKeys);
            const emptyLabel = category?.emptyProductionLabel || '생산량 없음';
            const selectedDateCount = normalizeWorkTeamCalendarDateKeys(dateKeys).length;
            if (!groups.length) {
                return `<div class="work-team-calendar-production-empty">${escapeHtml(emptyLabel)}</div>`;
            }
            return `
                <div class="work-team-calendar-team-groups">
                    ${groups.map(group => {
                        const countLabel = `${formatUtilNumber(group.items.length, 0)}건 · ${formatUtilNumber(group.totalAmount || 0, 0)} kg`;
                        const metricLine = getWorkTeamCalendarProductionMetricLine(group);
                        return `
                            <div class="work-team-calendar-team-group">
                                <div class="work-team-calendar-team-group-head">
                                    <div class="work-team-calendar-team-group-title">${escapeHtml(group.teamLabel || '미분류')}</div>
                                    <div class="work-team-calendar-team-group-meta">${escapeHtml(countLabel)}</div>
                                </div>
                                ${metricLine ? `<div class="work-team-calendar-production-summary">${escapeHtml(metricLine)}</div>` : ''}
                                <div class="work-team-calendar-production-list">
                                    ${group.items.map(item => {
                                        const productName = item.productName || emptyLabel;
                                        const itemYieldLabel = formatWorkTeamCalendarYieldLabel(item?.moistureExcludedYield);
                                        const itemCapaLabel = formatWorkTeamCalendarCapaLabel(item?.equipmentCapa);
                                        const itemUtilizationLabel = formatWorkTeamCalendarUtilizationLabel(item?.equipmentUtilization);
                                        const metricParts = [itemYieldLabel || '수율 -', itemCapaLabel || 'CAPA -', itemUtilizationLabel || '가동률 -'];
                                        const metricChipHtml = metricParts.map(label => `<span class="work-team-calendar-production-chip">${escapeHtml(label)}</span>`).join('');
                                        const amountLabel = Number.isFinite(Number(item.amount))
                                            ? `${formatUtilNumber(Number(item.amount), 0)} kg`
                                            : '-';
                                        const lineMeta = selectedDateCount > 1
                                            ? `${String(item.dateKey || '').trim()} · ${String(item.lineName || '라인 미입력').trim()}`
                                            : String(item.lineName || '라인 미입력').trim();
                                        return `
                                            <div class="work-team-calendar-production-item">
                                                <div class="work-team-calendar-production-main">
                                                    <div class="work-team-calendar-production-name">${escapeHtml(productName)}</div>
                                                    <div class="work-team-calendar-production-meta">${escapeHtml(lineMeta)}</div>
                                                    <div class="work-team-calendar-production-stat-row">${metricChipHtml}</div>
                                                </div>
                                                <div class="work-team-calendar-production-amount">${escapeHtml(amountLabel)}</div>
                                            </div>
                                        `;
                                    }).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }

        function buildWorkTeamCalendarOverviewUtilityBreakdown(monthKey) {
            const parsed = parseMonthKey(monthKey);
            const sections = {
                monthLabel: parsed ? formatWorkTeamCalendarMonthOptionLabel(monthKey) : '',
                electric: [],
                gas: [],
                waste: []
            };
            if (!parsed) return sections;
            getWorkTeamCalendarSourceCategories('work_team_calendar_overview').forEach(category => {
                const teamLabel = String(category?.title || '').trim();
                if (!teamLabel) return;
                if (String(category?.dataKey || '').trim() === 'work_team_calendar_team4') {
                    const wasteSummary = buildWorkTeamCalendarWasteMonthSummary(category.dataKey, parsed.year, parsed.monthIndex + 1);
                    sections.waste.push({
                        teamLabel,
                        valueText: wasteSummary.usageText || '-',
                        metaText: `비용 ${wasteSummary.costText || '-'}`
                    });
                    return;
                }
                const electricSummary = buildWorkTeamCalendarElectricMonthSummary(
                    getWorkTeamCalendarUtilityTeamNames(category.dataKey, 'electric'),
                    parsed.year,
                    parsed.monthIndex + 1
                );
                sections.electric.push({
                    teamLabel,
                    valueText: electricSummary.usageText || '-',
                    metaText: `비용 ${electricSummary.costText || '-'}`,
                    detailRows: Array.isArray(electricSummary.detailRows) ? electricSummary.detailRows.slice() : []
                });
                const gasSummary = buildWorkTeamCalendarGasMonthSummary(
                    getWorkTeamCalendarUtilityTeamNames(category.dataKey, 'gas'),
                    parsed.year,
                    parsed.monthIndex + 1,
                    'all'
                );
                sections.gas.push({
                    teamLabel,
                    valueText: gasSummary.usageText || '-',
                    metaText: `비용 ${gasSummary.costText || '-'}`,
                    detailRows: Array.isArray(gasSummary.detailRows) ? gasSummary.detailRows.slice() : []
                });
            });
            return sections;
        }

        function renderWorkTeamCalendarOverviewMetricSectionHtml(title, monthLabel, items) {
            if (!Array.isArray(items) || !items.length) return '';
            return `
                <div class="work-team-calendar-team-group">
                    <div class="work-team-calendar-team-group-head">
                        <div class="work-team-calendar-team-group-title">${escapeHtml(title)}</div>
                        <div class="work-team-calendar-team-group-meta">${escapeHtml(monthLabel)}</div>
                    </div>
                    <div class="work-team-calendar-production-list">
                        ${items.map(item => `
                            <div class="work-team-calendar-production-item">
                                <div class="work-team-calendar-production-main">
                                    <div class="work-team-calendar-production-name">${escapeHtml(item.teamLabel || '미분류')}</div>
                                    <div class="work-team-calendar-production-meta">${escapeHtml(item.metaText || '')}</div>
                                </div>
                                <div class="work-team-calendar-production-amount">${escapeHtml(item.valueText || '-')}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        function renderWorkTeamCalendarOverviewBreakdownHtml(monthKey) {
            const breakdown = buildWorkTeamCalendarOverviewUtilityBreakdown(monthKey);
            const monthLabel = breakdown.monthLabel ? `${breakdown.monthLabel} 월합계` : '월합계';
            const sectionsHtml = [
                renderWorkTeamCalendarOverviewMetricSectionHtml('전기', monthLabel, breakdown.electric),
                renderWorkTeamCalendarOverviewMetricSectionHtml('가스', monthLabel, breakdown.gas),
                renderWorkTeamCalendarOverviewMetricSectionHtml('폐수', monthLabel, breakdown.waste)
            ].filter(Boolean).join('');
            if (!sectionsHtml) return '';
            return `<div class="work-team-calendar-team-groups">${sectionsHtml}</div>`;
        }
