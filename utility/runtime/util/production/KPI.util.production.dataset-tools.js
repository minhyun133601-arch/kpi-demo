        function collectUtilEntries(source, target) {
            (source || []).forEach(team => {
                (team.years || []).forEach(year => {
                    const yearValue = parseUtilYearLabel(year?.label);
                    if (!Number.isFinite(yearValue)) return;
                    (year.rows || []).forEach(row => {
                        if (row.label === '계' || row.label === '평균') return;
                        const month = parseUtilMonthLabel(row.label);
                        if (!month) return;
                        if (!isUtilYearMonthWithinToday(yearValue, month)) return;
                        target.push({
                            team: team.name,
                            year: yearValue,
                            month,
                            usage: row.usage,
                            production: row.production,
                            cost: row.cost,
                            costs: row.costs || null
                        });
                    });
                });
            });
        }

        function rebuildUtilEntryCollections() {
            UTIL_ELECTRIC_ENTRIES.length = 0;
            UTIL_GAS_ENTRIES.length = 0;
            UTIL_WASTE_ENTRIES.length = 0;
            UTIL_PRODUCTION_ENTRIES.length = 0;
            collectUtilEntries(UTIL_ELECTRIC_DATA, UTIL_ELECTRIC_ENTRIES);
            collectUtilEntries(UTIL_GAS_DATA, UTIL_GAS_ENTRIES);
            collectUtilEntries(UTIL_WASTE_DATA, UTIL_WASTE_ENTRIES);
        }

        function getUtilDatasetSourceByKey(datasetKey) {
            if (datasetKey === 'electric') return UTIL_ELECTRIC_DATA;
            if (datasetKey === 'gas') return UTIL_GAS_DATA;
            if (datasetKey === 'waste') return UTIL_WASTE_DATA;
            return null;
        }

        function findUtilDatasetTeamYearRows(datasetKey, teamName, yearValue) {
            const source = getUtilDatasetSourceByKey(datasetKey);
            if (!Array.isArray(source) || !source.length) return null;
            const rawTeam = String(teamName || '').trim();
            const rawLower = rawTeam.toLowerCase();
            const teamKey = normalizeUtilTeamName(teamName);
            const canonical = canonicalizeUtilTeamName(teamName);
            const fuelKey = inferUtilFuelType(teamName);
            let targetTeam = source.find(item => String(item?.name || '').trim().toLowerCase() === rawLower) || null;
            if (!targetTeam && canonical) {
                const canonicalMatches = source.filter(item => canonicalizeUtilTeamName(item?.name) === canonical);
                if (fuelKey) {
                    targetTeam = canonicalMatches.find(item => inferUtilFuelType(item?.name) === fuelKey) || null;
                }
                if (!targetTeam && canonicalMatches.length === 1) {
                    targetTeam = canonicalMatches[0];
                }
            }
            if (!targetTeam) {
                targetTeam = source.find(item => normalizeUtilTeamName(item?.name) === teamKey) || null;
            }
            if (!targetTeam) return null;
            const yearNode = (targetTeam?.years || []).find(item => parseUtilYearLabel(item?.label) === yearValue);
            if (!yearNode || !Array.isArray(yearNode.rows)) return null;
            return yearNode.rows;
        }

        function clearUtilYearUsageValues(datasetKey, teamName, yearValue) {
            const rows = findUtilDatasetTeamYearRows(datasetKey, teamName, yearValue);
            if (!rows) return false;
            let changed = false;
            rows.forEach(row => {
                if (!row || typeof row !== 'object') return;
                if (row.usage !== null) {
                    row.usage = null;
                    changed = true;
                }
            });
            return changed;
        }

        function clearUtilYearCostValues(datasetKey, teamName, yearValue) {
            const rows = findUtilDatasetTeamYearRows(datasetKey, teamName, yearValue);
            if (!rows) return false;
            let changed = false;
            rows.forEach(row => {
                if (!row || typeof row !== 'object') return;
                if (row.cost !== null) {
                    row.cost = null;
                    changed = true;
                }
                if (row.costs && typeof row.costs === 'object') {
                    Object.keys(row.costs).forEach(key => {
                        if (row.costs[key] !== null) {
                            row.costs[key] = null;
                            changed = true;
                        }
                    });
                }
            });
            return changed;
        }

        function clearUtilYearProductionValues(datasetKey, teamName, yearValue) {
            const rows = findUtilDatasetTeamYearRows(datasetKey, teamName, yearValue);
            if (!rows) return false;
            let changed = false;
            rows.forEach(row => {
                if (!row || typeof row !== 'object') return;
                if (row.production !== null) {
                    row.production = null;
                    changed = true;
                }
            });
            return changed;
        }

        function findUtilDatasetMonthRow(datasetKey, teamName, yearValue, monthValue) {
            const rows = findUtilDatasetTeamYearRows(datasetKey, teamName, yearValue);
            if (!rows) return null;
            return rows.find(row => {
                if (!row || typeof row !== 'object') return false;
                const label = String(row.label || '');
                if (label === '계' || label === '평균') return false;
                return parseUtilMonthLabel(label) === monthValue;
            }) || null;
        }

        function buildUtilProductionMonthKeySet(teamName, yearValue, monthValue) {
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

