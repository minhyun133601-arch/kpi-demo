        const WORK_TEAM_CALENDAR_OVERVIEW_KEY = 'work_team_calendar_overview';

        function isWorkTeamCalendarOverview(dataKey) {
            return String(dataKey || '').trim() === WORK_TEAM_CALENDAR_OVERVIEW_KEY;
        }

        function shouldWorkTeamCalendarIncludeWasteSummary(dataKey) {
            const normalized = String(dataKey || '').trim();
            return normalized === WORK_TEAM_CALENDAR_OVERVIEW_KEY
                || normalized === 'work_team_calendar_team4'
                || normalized === 'work_team_calendar_group_plantB'
                || normalized === 'work_team_calendar_group_plantA';
        }

        function getWorkTeamCalendarWasteSiteLabels(dataKey) {
            const normalized = String(dataKey || '').trim();
            if (!normalized) return [];
            if (normalized === 'work_team_calendar_team4') {
                return ['Plant A', 'Plant B'];
            }
            const labels = [];
            const seen = new Set();
            getWorkTeamCalendarSourceCategories(dataKey).forEach(category => {
                const sourceKey = String(category?.dataKey || '').trim();
                let siteLabel = '';
                if (sourceKey === 'work_team_calendar_team1_part1') {
                    siteLabel = 'Plant B';
                } else if (
                    sourceKey === 'work_team_calendar_team1_part2'
                    || sourceKey === 'work_team_calendar_team2'
                    || sourceKey === 'work_team_calendar_team3'
                ) {
                    siteLabel = 'Plant A';
                }
                if (!siteLabel || seen.has(siteLabel)) return;
                seen.add(siteLabel);
                labels.push(siteLabel);
            });
            return labels;
        }

        function getWorkTeamCalendarSourceCategories(dataKey) {
            const rawCategories = typeof getWorkTeamCalendarRawCategoryList === 'function'
                ? getWorkTeamCalendarRawCategoryList()
                : [];
            const sourceDataKeys = typeof resolveWorkTeamCalendarSourceDataKeys === 'function'
                ? resolveWorkTeamCalendarSourceDataKeys(dataKey)
                : [String(dataKey || '').trim()];
            return sourceDataKeys
                .map(sourceDataKey => rawCategories.find(category => String(category?.dataKey || '').trim() === sourceDataKey) || null)
                .filter(Boolean);
        }

        function getWorkTeamCalendarProductionSourceTeams(dataKey) {
            const seen = new Set();
            const sourceTeams = [];
            getWorkTeamCalendarSourceCategories(dataKey).forEach(category => {
                resolveUtilProductionSourceTeams(category?.title).forEach(sourceTeam => {
                    const normalized = normalizeUtilTeamName(sourceTeam);
                    if (!normalized || seen.has(normalized)) return;
                    seen.add(normalized);
                    sourceTeams.push(sourceTeam);
                });
            });
            return sourceTeams;
        }

        function getWorkTeamCalendarDisplayCategoryByTeamName(teamName) {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (!canonical) return null;
            return getWorkTeamCalendarSourceCategories(WORK_TEAM_CALENDAR_OVERVIEW_KEY).find(category => (
                canonicalizeUtilTeamName(category?.title) === canonical
            )) || null;
        }

        function getWorkTeamCalendarProductionGroups(dataKey, dateKeys) {
            const category = getWorkTeamCalendarCategory(dataKey);
            const targets = normalizeWorkTeamCalendarDateKeys(dateKeys);
            if (!category || !targets.length) return [];
            const sourceTeams = getWorkTeamCalendarProductionSourceTeams(dataKey);
            const dateKeySet = new Set(targets);
            const seen = new Set();
            const grouped = new Map(targets.map(dateKey => [dateKey, []]));
            sourceTeams.forEach(sourceTeam => {
                const teamKey = normalizeUtilTeamName(sourceTeam);
                const entries = Array.isArray(UTIL_PRODUCTION_DAILY_INDEX?.[teamKey]) ? UTIL_PRODUCTION_DAILY_INDEX[teamKey] : [];
                entries.forEach(entry => {
                    const dateKey = String(entry?.dateLabel || '').trim();
                    if (!dateKeySet.has(dateKey)) return;
                    const amount = parseUtilAmount(entry?.amount);
                    const dedupeKey = String(entry?.entryKey || '').trim() || [
                        dateKey,
                        String(entry?.teamName || sourceTeam || '').trim(),
                        String(entry?.lineName || '').trim(),
                        String(entry?.productName || '').trim(),
                        Number.isFinite(amount) ? amount : ''
                    ].join('::');
                    if (seen.has(dedupeKey)) return;
                    seen.add(dedupeKey);
                    grouped.get(dateKey).push({
                        dateKey,
                        teamName: String(entry?.teamName || sourceTeam || '').trim(),
                        lineName: String(entry?.lineName || '').trim(),
                        productName: String(entry?.productName || '').trim(),
                        amount: Number.isFinite(amount) ? amount : null,
                        moistureExcludedYield: Number.isFinite(parseUtilPercentAmount(entry?.moistureExcludedYield)) ? parseUtilPercentAmount(entry?.moistureExcludedYield) : null,
                        equipmentCapa: Number.isFinite(parseUtilAmount(entry?.equipmentCapa)) ? parseUtilAmount(entry?.equipmentCapa) : null,
                        equipmentUtilization: Number.isFinite(parseUtilPercentAmount(entry?.equipmentUtilization)) ? parseUtilPercentAmount(entry?.equipmentUtilization) : null,
                        entryKey: dedupeKey
                    });
                });
            });
            return targets.map(dateKey => {
                const items = grouped.get(dateKey) || [];
                items.sort((a, b) => {
                    const lineDiff = String(a.lineName || '').localeCompare(String(b.lineName || ''), 'ko');
                    if (lineDiff !== 0) return lineDiff;
                    return String(a.productName || '').localeCompare(String(b.productName || ''), 'ko');
                });
                return {
                    dateKey,
                    items,
                    ...summarizeWorkTeamCalendarProductionMetrics(items)
                };
            });
        }

        function renderWorkTeamCalendarProductionGroupsHtml(groups, category, summaryMap = null) {
            const list = Array.isArray(groups) ? groups : [];
            const emptyLabel = category?.emptyProductionLabel || '품목 미입력';
            if (!list.length) {
                return `<div class="work-team-calendar-production-empty">${escapeHtml(emptyLabel)}</div>`;
            }
            return list.map(group => {
                const items = Array.isArray(group?.items) ? group.items : [];
                const hasItems = items.length > 0;
                const groupSummary = summaryMap instanceof Map ? (summaryMap.get(String(group?.dateKey || '').trim()) || null) : null;
                const isOffday = !hasItems && !!groupSummary?.isOffday;
                const totalLabel = hasItems
                    ? `${items.length}건 · ${formatUtilNumber(group?.totalAmount || 0, 0)} kg`
                    : (isOffday ? '-' : emptyLabel);
                const metricLine = isOffday ? '휴무' : getWorkTeamCalendarProductionMetricLine(group);
                const rowsHtml = hasItems
                    ? items.map(item => {
                        const productName = item.productName || emptyLabel;
                        const itemYieldLabel = formatWorkTeamCalendarYieldLabel(item?.moistureExcludedYield);
                        const itemCapaLabel = formatWorkTeamCalendarCapaLabel(item?.equipmentCapa);
                        const itemUtilizationLabel = formatWorkTeamCalendarUtilizationLabel(item?.equipmentUtilization);
                        const metricParts = [itemYieldLabel || '수율 -', itemCapaLabel || 'CAPA -', itemUtilizationLabel || '가동률 -'];
                        const metricChipHtml = metricParts.map(label => `<span class="work-team-calendar-production-chip">${escapeHtml(label)}</span>`).join('');
                        const amountLabel = Number.isFinite(Number(item.amount))
                            ? `${formatUtilNumber(Number(item.amount), 0)} kg`
                            : '-';
                        return `
                            <div class="work-team-calendar-production-item">
                                <div class="work-team-calendar-production-main">
                                    <div class="work-team-calendar-production-name">${escapeHtml(productName)}</div>
                                    <div class="work-team-calendar-production-meta">${escapeHtml(item.lineName || '라인 미입력')}</div>
                                    <div class="work-team-calendar-production-stat-row">${metricChipHtml}</div>
                                </div>
                                <div class="work-team-calendar-production-amount">${escapeHtml(amountLabel)}</div>
                            </div>
                        `;
                    }).join('')
                    : (
                        isOffday
                            ? `<div class="work-team-calendar-production-empty is-offday"><i class="fas fa-calendar-minus"></i><span>휴무</span></div>`
                            : `<div class="work-team-calendar-production-empty">${escapeHtml(emptyLabel)}</div>`
                    );
                return `
                    <div class="work-team-calendar-production-group ${isOffday ? 'is-offday' : ''}">
                        <div class="work-team-calendar-production-group-head">
                            <div class="work-team-calendar-production-count">${escapeHtml(totalLabel)}</div>
                        </div>
                        <div class="work-team-calendar-production-summary ${isOffday ? 'is-offday' : ''}">${escapeHtml(metricLine)}</div>
                        <div class="work-team-calendar-production-list">${rowsHtml}</div>
                    </div>
                `;
            }).join('');
        }

        function getWorkTeamCalendarProductionSummaryMap(dataKey, dateKeys) {
            const groups = getWorkTeamCalendarProductionGroups(dataKey, dateKeys);
            const summaryMap = new Map();
            groups.forEach(group => {
                const dateKey = String(group?.dateKey || '').trim();
                if (!dateKey) return;
                summaryMap.set(dateKey, {
                    count: Array.isArray(group?.items) ? group.items.length : 0,
                    leadProductName: String(group?.items?.[0]?.productName || '').trim(),
                    totalAmount: Number.isFinite(Number(group?.totalAmount)) ? Number(group.totalAmount) : 0,
                    moistureExcludedYieldRate: Number.isFinite(parseUtilPercentAmount(group?.moistureExcludedYieldRate)) ? parseUtilPercentAmount(group?.moistureExcludedYieldRate) : null,
                    totalEquipmentCapa: Number.isFinite(parseUtilAmount(group?.totalEquipmentCapa)) ? parseUtilAmount(group?.totalEquipmentCapa) : null,
                    utilizationRate: Number.isFinite(parseUtilPercentAmount(group?.utilizationRate)) ? parseUtilPercentAmount(group?.utilizationRate) : null,
                    isOffday: false
                });
            });
            // Collect ALL production dates for this team across all months
            const category = getWorkTeamCalendarCategory(dataKey);
            const allActiveDates = new Set();
            if (category) {
                const sourceTeams = getWorkTeamCalendarProductionSourceTeams(dataKey);
                sourceTeams.forEach(sourceTeam => {
                    const teamKey = normalizeUtilTeamName(sourceTeam);
                    const entries = Array.isArray(UTIL_PRODUCTION_DAILY_INDEX?.[teamKey]) ? UTIL_PRODUCTION_DAILY_INDEX[teamKey] : [];
                    entries.forEach(entry => {
                        const dk = String(entry?.dateLabel || '').trim();
                        if (dk) allActiveDates.add(dk);
                    });
                });
            }
            const sortedAllActive = Array.from(allActiveDates).sort();
            if (sortedAllActive.length >= 1) {
                const globalFirst = sortedAllActive[0];
                const globalLast = sortedAllActive[sortedAllActive.length - 1];
                summaryMap.forEach((summary, dateKey) => {
                    if (Number(summary?.count || 0) > 0) return;
                    if (dateKey > globalFirst && dateKey < globalLast) {
                        summary.isOffday = true;
                    }
                });
            }
            return summaryMap;
        }

        function getWorkTeamCalendarGasMode(dataKey = WorkState.teamCalendarModal) {
            const raw = String(WorkState.teamCalendarGasMode?.[dataKey] || 'all').trim().toLowerCase();
            return ['all', 'lng', 'lpg'].includes(raw) ? raw : 'all';
        }

        function setWorkTeamCalendarGasMode(mode, dataKey = WorkState.teamCalendarModal) {
            if (!dataKey) return;
            const normalized = ['all', 'lng', 'lpg'].includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : 'all';
            WorkState.teamCalendarGasMode[dataKey] = normalized;
            renderWorkTeamCalendarModal();
        }

        function formatWorkTeamCalendarUtilityCostLabel(value) {
            const numeric = parseUtilAmount(value);
            if (!Number.isFinite(numeric)) return '-';
            return `${formatUtilNumber(numeric, 0)}원`;
        }

        function getWorkTeamCalendarUtilityTeamNamesForCategory(category, datasetKey) {
            const source = getUtilDatasetSourceByKey(datasetKey);
            if (!category || !Array.isArray(source) || !source.length) return [];
            const canonical = canonicalizeUtilTeamName(category.title);
            if (!canonical) return [];
            return source
                .map(item => String(item?.name || '').trim())
                .filter(Boolean)
                .filter(name => canonicalizeUtilTeamName(name) === canonical);
        }

        function getWorkTeamCalendarUtilityTeamNames(dataKey, datasetKey) {
            const categories = getWorkTeamCalendarSourceCategories(dataKey);
            const seen = new Set();
            const names = [];
            categories.forEach(category => {
                getWorkTeamCalendarUtilityTeamNamesForCategory(category, datasetKey).forEach(teamName => {
                    const normalized = normalizeUtilTeamName(teamName);
                    if (!normalized) return;
                    const dedupeKey = datasetKey === 'gas'
                        ? `${normalized}::${inferUtilFuelType(teamName) || String(teamName || '').trim().toLowerCase()}`
                        : normalized;
                    if (seen.has(dedupeKey)) return;
                    seen.add(dedupeKey);
                    names.push(teamName);
                });
            });
            return names;
        }

        function buildWorkTeamCalendarElectricMonthSummary(teamNames, yearValue, monthValue) {
            let usageTotal = 0;
            let costTotal = 0;
            let hasUsage = false;
            let hasCost = false;
            (teamNames || []).forEach(teamName => {
                const row = findUtilDatasetMonthRow('electric', teamName, yearValue, monthValue);
                if (!row) return;
                const usageValue = parseUtilAmount(row?.usage);
                const costValue = parseUtilAmount(row?.costs?.total ?? row?.cost);
                if (Number.isFinite(usageValue)) {
                    usageTotal += usageValue;
                    hasUsage = true;
                }
                if (Number.isFinite(costValue)) {
                    costTotal += costValue;
                    hasCost = true;
                }
            });
            const usageText = hasUsage ? formatUtilNumberWithUnit(usageTotal, 'kWh', 0) : '-';
            const costText = hasCost ? formatWorkTeamCalendarUtilityCostLabel(costTotal) : '-';
            return {
                usageText,
                costText,
                detailRows: (hasUsage || hasCost)
                    ? [{
                        label: '전력량',
                        metaText: hasCost ? costText : '',
                        valueText: usageText
                    }]
                    : []
            };
        }

        function buildWorkTeamCalendarGasMonthSummary(teamNames, yearValue, monthValue, mode = 'all') {
            const normalizedMode = ['all', 'lng', 'lpg'].includes(String(mode || '').trim().toLowerCase())
                ? String(mode || '').trim().toLowerCase()
                : 'all';
            let lngUsage = 0;
            let lpgUsage = 0;
            let totalCost = 0;
            let lngCost = 0;
            let lpgCost = 0;
            let hasLng = false;
            let hasLpg = false;
            let hasCost = false;
            let hasLngCost = false;
            let hasLpgCost = false;
            const availableModes = new Set();
            (teamNames || []).forEach(teamName => {
                const fuelType = inferUtilFuelType(teamName);
                if (fuelType) availableModes.add(fuelType);
                if (normalizedMode !== 'all' && fuelType && fuelType !== normalizedMode) return;
                const row = findUtilDatasetMonthRow('gas', teamName, yearValue, monthValue);
                if (!row) return;
                const usageValue = parseUtilAmount(row?.usage);
                const costValue = parseUtilAmount(row?.costs?.total ?? row?.cost);
                if (fuelType === 'lpg') {
                    if (Number.isFinite(usageValue)) {
                        lpgUsage += usageValue;
                        hasLpg = true;
                    }
                } else {
                    if (Number.isFinite(usageValue)) {
                        lngUsage += usageValue;
                        hasLng = true;
                    }
                }
                if (Number.isFinite(costValue)) {
                    totalCost += costValue;
                    hasCost = true;
                    if (fuelType === 'lpg') {
                        lpgCost += costValue;
                        hasLpgCost = true;
                    } else {
                        lngCost += costValue;
                        hasLngCost = true;
                    }
                }
            });
            const usageParts = [];
            if (normalizedMode === 'lpg') {
                if (hasLpg) usageParts.push(`${formatUtilNumber(lpgUsage, 0)}kg`);
            } else if (normalizedMode === 'lng') {
                if (hasLng) usageParts.push(`${formatUtilNumber(lngUsage, 0)}m³`);
            } else {
                if (hasLng) usageParts.push(`LNG ${formatUtilNumber(lngUsage, 0)}m³`);
                if (hasLpg) usageParts.push(`LPG ${formatUtilNumber(lpgUsage, 0)}kg`);
            }
            const detailRows = [];
            if (hasLng) {
                detailRows.push({
                    label: 'LNG',
                    metaText: hasLngCost ? formatWorkTeamCalendarUtilityCostLabel(lngCost) : '',
                    valueText: `${formatUtilNumber(lngUsage, 0)}m³`
                });
            }
            if (hasLpg) {
                detailRows.push({
                    label: 'LPG',
                    metaText: hasLpgCost ? formatWorkTeamCalendarUtilityCostLabel(lpgCost) : '',
                    valueText: `${formatUtilNumber(lpgUsage, 0)}kg`
                });
            }
            return {
                usageText: usageParts.length ? usageParts.join(' · ') : '-',
                costText: hasCost ? formatWorkTeamCalendarUtilityCostLabel(totalCost) : '-',
                detailRows,
                availableModes: Array.from(availableModes),
                canSelect: availableModes.has('lng') && availableModes.has('lpg'),
                mode: normalizedMode
            };
        }

        function buildWorkTeamCalendarWasteMonthSummary(dataKey, yearValue, monthValue) {
            const siteLabels = getWorkTeamCalendarWasteSiteLabels(dataKey);
            let usageTotal = 0;
            let costTotal = 0;
            let hasUsage = false;
            let hasCost = false;
            siteLabels.forEach(siteLabel => {
                const row = findUtilDatasetMonthRow('waste', siteLabel, yearValue, monthValue);
                if (!row) return;
                const usageValue = parseUtilAmount(row?.usage);
                const costValue = parseUtilAmount(row?.costs?.total ?? row?.cost);
                if (Number.isFinite(usageValue)) {
                    usageTotal += usageValue;
                    hasUsage = true;
                }
                if (Number.isFinite(costValue)) {
                    costTotal += costValue;
                    hasCost = true;
                }
            });
            return {
                usageText: hasUsage
                    ? `${siteLabels.length > 1 ? '총 ' : ''}${formatUtilNumber(usageTotal, 0)}㎥`
                    : '-',
                costText: hasCost ? formatWorkTeamCalendarUtilityCostLabel(costTotal) : '-'
            };
        }

        function buildWorkTeamCalendarProductionMonthSummary(dataKey, monthKey) {
            const parsed = parseMonthKey(monthKey);
            if (!parsed) return { totalAmountText: '-', itemCountText: '-' };
            const category = getWorkTeamCalendarCategory(dataKey);
            if (!category) return { totalAmountText: '-', itemCountText: '-' };
            const sourceTeams = getWorkTeamCalendarProductionSourceTeams(dataKey);
            const prefix = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`;
            let totalAmount = 0;
            let itemCount = 0;
            const seen = new Set();
            sourceTeams.forEach(sourceTeam => {
                const teamKey = normalizeUtilTeamName(sourceTeam);
                const entries = Array.isArray(UTIL_PRODUCTION_DAILY_INDEX?.[teamKey]) ? UTIL_PRODUCTION_DAILY_INDEX[teamKey] : [];
                entries.forEach(entry => {
                    const dateKey = String(entry?.dateLabel || '').trim();
                    if (!dateKey.startsWith(prefix)) return;
                    const dedupeKey = String(entry?.entryKey || '').trim() || [dateKey, String(entry?.teamName || sourceTeam || '').trim(), String(entry?.lineName || '').trim(), String(entry?.productName || '').trim()].join('::');
                    if (seen.has(dedupeKey)) return;
                    seen.add(dedupeKey);
                    const amount = parseUtilAmount(entry?.amount);
                    if (Number.isFinite(amount)) totalAmount += amount;
                    itemCount += 1;
                });
            });
            return {
                totalAmountText: totalAmount > 0 ? `${formatUtilNumber(totalAmount, 0)}kg` : '-',
                itemCountText: itemCount > 0 ? `${formatUtilNumber(itemCount, 0)}품목` : '-'
            };
        }
