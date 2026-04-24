        function getQuarterOptions(yearStart, yearEnd, selected, placeholder) {
            const options = [`<option value="">${escapeHtml(placeholder || '전체')}</option>`];
            for (let y = yearStart; y <= yearEnd; y += 1) {
                for (let q = 1; q <= 4; q += 1) {
                    const key = makeQuarterKey(y, q);
                    const label = `${y}년 ${q}분기`;
                    const sel = key === selected ? 'selected' : '';
                    options.push(`<option value="${key}" ${sel}>${label}</option>`);
                }
            }
            return options.join('');
        }

        function getQuarterOptionsFromList(keys, selected, placeholder) {
            const options = [`<option value="">${escapeHtml(placeholder || '전체')}</option>`];
            keys.forEach(key => {
                const parsed = parseQuarterKey(key);
                if (!parsed) return;
                const label = `${parsed.year}년 ${parsed.quarter}분기`;
                const sel = key === selected ? 'selected' : '';
                options.push(`<option value="${key}" ${sel}>${label}</option>`);
            });
            return options.join('');
        }

        function getYearOptions(yearStart, yearEnd, selected, placeholder) {
            const options = [`<option value="">${escapeHtml(placeholder || '년도')}</option>`];
            for (let y = yearStart; y <= yearEnd; y += 1) {
                const sel = y === selected ? 'selected' : '';
                options.push(`<option value="${y}" ${sel}>${y}년</option>`);
            }
            return options.join('');
        }

        function getYearOptionsDesc(yearStart, yearEnd, selected, placeholder) {
            const options = [`<option value="">${escapeHtml(placeholder || '년도')}</option>`];
            for (let y = yearEnd; y >= yearStart; y -= 1) {
                const sel = y === selected ? 'selected' : '';
                options.push(`<option value="${y}" ${sel}>${y}년</option>`);
            }
            return options.join('');
        }

        function getQuarterSelectOptions(selected) {
            const options = [`<option value="">분기</option>`];
            for (let q = 1; q <= 4; q += 1) {
                const sel = q === selected ? 'selected' : '';
                options.push(`<option value="${q}" ${sel}>${q}분기</option>`);
            }
            return options.join('');
        }

        function buildQuarterKeyRange(startKey, endKey) {
            const startIdx = quarterIndex(startKey);
            const endIdx = quarterIndex(endKey);
            if (startIdx === null || endIdx === null || startIdx > endIdx) return [];
            const keys = [];
            for (let idx = startIdx; idx <= endIdx; idx += 1) {
                const year = Math.floor(idx / 4);
                const quarter = (idx % 4) + 1;
                keys.push(makeQuarterKey(year, quarter));
            }
            return keys;
        }

        function getQuarterValuesForYear(keys, year) {
            const normalizedYear = Number(year);
            if (!Number.isFinite(normalizedYear)) return [];
            return Array.from(new Set(
                (Array.isArray(keys) ? keys : [])
                    .map(parseQuarterKey)
                    .filter(parsed => parsed && parsed.year === normalizedYear)
                    .map(parsed => parsed.quarter)
                    .filter(quarter => quarter >= 1 && quarter <= 4)
            )).sort((a, b) => a - b);
        }

        function getQuarterSelectOptionsForYear(keys, year, selected, placeholder) {
            const quarters = getQuarterValuesForYear(keys, year);
            const options = [`<option value="">${escapeHtml(placeholder || (quarters.length ? '분기' : '분기 없음'))}</option>`];
            quarters.forEach(quarter => {
                const sel = Number(selected) === quarter ? 'selected' : '';
                options.push(`<option value="${quarter}" ${sel}>${quarter}분기</option>`);
            });
            return options.join('');
        }

        function getAuditFilterSourceItems(dataKey) {
            const data = typeof getAuditData === 'function'
                ? getAuditData(dataKey, '')
                : (window.PortalData?.[dataKey] || {});
            const standards = Array.isArray(data?.standards) ? data.standards : [];
            const entries = Array.isArray(data?.entries) ? data.entries : [];
            return standards.concat(entries).filter(item => item && typeof item === 'object');
        }

        function getAuditFilterTeams(dataKey) {
            if (String(dataKey || '').trim() !== 'audit_lux') {
                return getEquipTeams();
            }
            return Array.from(new Set(
                getAuditFilterSourceItems(dataKey)
                    .map(item => String(item.team || '').trim())
                    .filter(Boolean)
            )).sort((a, b) => a.localeCompare(b, 'ko'));
        }

        function getAuditFilterRooms(dataKey, teamName = '') {
            const normalizedTeam = String(teamName || '').trim();
            if (!normalizedTeam) return [];
            if (String(dataKey || '').trim() !== 'audit_lux') {
                return getEquipRooms(normalizedTeam);
            }
            return Array.from(new Set(
                getAuditFilterSourceItems(dataKey)
                    .filter(item => String(item.team || '').trim() === normalizedTeam)
                    .map(item => String(item.room || '').trim())
                    .filter(Boolean)
            )).sort((a, b) => a.localeCompare(b, 'ko'));
        }

        function isAuditLuxDataKey(dataKey) {
            return String(dataKey || '').trim() === 'audit_lux';
        }

        function getAuditLuxEntryTeams(dataKey, year = null, quarter = null) {
            if (!isAuditLuxDataKey(dataKey)) return getEquipTeams();
            const data = typeof getAuditData === 'function'
                ? getAuditData(dataKey, '')
                : (window.PortalData?.[dataKey] || {});
            const targetYear = Number.isFinite(Number(year)) ? Number(year) : null;
            const targetQuarter = Number.isFinite(Number(quarter)) ? Number(quarter) : null;
            const teams = new Set();
            (Array.isArray(data?.standards) ? data.standards : []).forEach(item => {
                const team = String(item?.team || '').trim();
                if (team) teams.add(team);
            });
            (Array.isArray(data?.entries) ? data.entries : []).forEach(item => {
                const team = String(item?.team || '').trim();
                if (!team) return;
                if (targetYear !== null && Number(item?.year) !== targetYear) return;
                if (targetQuarter !== null && Number(item?.quarter) !== targetQuarter) return;
                teams.add(team);
            });
            return Array.from(teams).sort((a, b) => {
                if (a === 'Line Gamma' && b !== 'Line Gamma') return -1;
                if (b === 'Line Gamma' && a !== 'Line Gamma') return 1;
                if (a === 'Line Delta' && b !== 'Line Delta') return -1;
                if (b === 'Line Delta' && a !== 'Line Delta') return 1;
                return a.localeCompare(b, 'ko');
            });
        }

        function cycleAuditLuxEntryTeam(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const entryForm = getAuditEntryFormState(dataKey);
            const teams = getAuditLuxEntryTeams(dataKey, entryForm.year, entryForm.quarter);
            if (!teams.length) return;
            const currentIndex = teams.indexOf(String(entryForm.team || '').trim());
            const nextIndex = currentIndex >= 0
                ? (currentIndex + 1) % teams.length
                : 0;
            entryForm.team = teams[nextIndex];
            entryForm.note = '';
            entryForm.batchActive = false;
            entryForm.batchValues = {};
            entryForm.batchFocusKey = '';
            entryForm.batchShouldFocus = false;
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function makeAuditLuxEntryTargetKey(year, quarter, team) {
            const safeTeam = encodeURIComponent(String(team || '').trim());
            return `${year}-Q${quarter}::${safeTeam}`;
        }

        function parseAuditLuxEntryTargetKey(value) {
            const match = String(value || '').match(/^(\d{4})-Q([1-4])::(.+)$/);
            if (!match) return null;
            return {
                year: Number(match[1]),
                quarter: Number(match[2]),
                team: decodeURIComponent(match[3] || '')
            };
        }

        function getAuditLuxEntryTargets(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return [];
            const now = getAuditCurrentQuarterInfo();
            const quarterKeys = buildQuarterKeyRange(makeQuarterKey(2023, 1), makeQuarterKey(now.year, now.quarter)).reverse();
            const targets = [];
            quarterKeys.forEach(key => {
                const parsed = parseQuarterKey(key);
                if (!parsed) return;
                const teams = getAuditLuxEntryTeams(dataKey, parsed.year, parsed.quarter);
                teams.forEach(team => {
                    targets.push({
                        key: makeAuditLuxEntryTargetKey(parsed.year, parsed.quarter, team),
                        label: `${parsed.year}년 ${parsed.quarter}분기 ${team}`,
                        year: parsed.year,
                        quarter: parsed.quarter,
                        team
                    });
                });
            });
            return targets;
        }

        function getAuditCurrentQuarterInfo() {
            return getQuarterInfo(new Date());
        }

        function getAuditAvailableQuarterKeys(dataKey) {
            if (isAuditLuxDataKey(dataKey)) {
                const now = getAuditCurrentQuarterInfo();
                return buildQuarterKeyRange(makeQuarterKey(2023, 1), makeQuarterKey(now.year, now.quarter));
            }
            const data = typeof getAuditData === 'function'
                ? getAuditData(dataKey, '')
                : (window.PortalData?.[dataKey] || {});
            return Array.from(new Set(
                (Array.isArray(data?.entries) ? data.entries : [])
                    .map(entry => makeQuarterKey(entry.year, entry.quarter))
                    .filter(Boolean)
            )).sort();
        }

        function syncAuditLuxCurrentQuarterState(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const now = getAuditCurrentQuarterInfo();
            const currentQuarterKey = makeQuarterKey(now.year, now.quarter);
            const currentQuarterIdx = quarterIndex(currentQuarterKey);
            const filter = getAuditFilterState(dataKey);
            const trackedFilterQuarterKey = String(filter.__trackedCurrentQuarterKey || '').trim();
            const startIdx = quarterIndex(filter.startQuarter);
            const endIdx = quarterIndex(filter.endQuarter);
            const shouldRefreshFilter = !filter.startQuarter
                || !filter.endQuarter
                || (trackedFilterQuarterKey && filter.startQuarter === trackedFilterQuarterKey && filter.endQuarter === trackedFilterQuarterKey)
                || startIdx === null
                || endIdx === null
                || startIdx > currentQuarterIdx
                || endIdx > currentQuarterIdx;
            if (shouldRefreshFilter) {
                filter.startQuarter = currentQuarterKey;
                filter.endQuarter = currentQuarterKey;
            }
            filter.__trackedCurrentQuarterKey = currentQuarterKey;

            const entryForm = getAuditEntryFormState(dataKey);
            const trackedEntryQuarterKey = String(entryForm.__trackedCurrentQuarterKey || '').trim();
            const entryQuarterKey = makeQuarterKey(entryForm.year, entryForm.quarter);
            const entryQuarterIdx = quarterIndex(entryQuarterKey);
            const shouldRefreshEntryQuarter = !entryForm.year
                || !entryForm.quarter
                || (trackedEntryQuarterKey && entryQuarterKey === trackedEntryQuarterKey)
                || entryQuarterIdx === null
                || entryQuarterIdx > currentQuarterIdx;
            if (shouldRefreshEntryQuarter) {
                entryForm.year = now.year;
                entryForm.quarter = now.quarter;
            }
            entryForm.__trackedCurrentQuarterKey = currentQuarterKey;
        }

        function syncAuditLuxEntryFormFromTarget(dataKey, targetKey) {
            const parsed = parseAuditLuxEntryTargetKey(targetKey);
            if (!parsed) return false;
            const entryForm = getAuditEntryFormState(dataKey);
            entryForm.year = parsed.year;
            entryForm.quarter = parsed.quarter;
            entryForm.team = parsed.team;
            entryForm.room = '';
            entryForm.type = '';
            entryForm.value = '';
            entryForm.note = '';
            entryForm.editIndex = null;
            entryForm.batchActive = false;
            entryForm.batchValues = {};
            entryForm.batchFocusKey = '';
            entryForm.batchShouldFocus = false;
            return true;
        }

        function getAuditLuxSelectedTargetKey(dataKey) {
            const entryForm = getAuditEntryFormState(dataKey);
            const team = String(entryForm.team || '').trim();
            if (!team || !entryForm.year || !entryForm.quarter) return '';
            return makeAuditLuxEntryTargetKey(entryForm.year, entryForm.quarter, team);
        }

        function makeAuditLuxBatchRowKey(team, room, type) {
            return [
                normalizeAuditZone(team || ''),
                normalizeAuditZone(room || ''),
                normalizeAuditZone(type || '')
            ].join('::');
        }

        function getAuditLuxBatchRows(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return [];
            const entryForm = getAuditEntryFormState(dataKey);
            const team = String(entryForm.team || '').trim();
            if (!team || !entryForm.year || !entryForm.quarter) return [];
            const data = typeof getAuditData === 'function'
                ? getAuditData(dataKey, '')
                : (window.PortalData?.[dataKey] || {});
            const standards = (Array.isArray(data?.standards) ? data.standards : [])
                .filter(item => String(item?.team || '').trim() === team);
            const entryMap = new Map();
            (Array.isArray(data?.entries) ? data.entries : []).forEach((item, index) => {
                if (Number(item?.year) !== Number(entryForm.year)) return;
                if (Number(item?.quarter) !== Number(entryForm.quarter)) return;
                if (String(item?.team || '').trim() !== team) return;
                entryMap.set(makeAuditLuxBatchRowKey(item.team, item.room, item.type), { item, index });
            });
            const draftValues = entryForm.batchValues || {};
            return standards.map((item, index) => {
                const rowKey = makeAuditLuxBatchRowKey(item.team, item.room, item.type);
                const existing = entryMap.get(rowKey)?.item || null;
                const hasDraft = Object.prototype.hasOwnProperty.call(draftValues, rowKey);
                return {
                    order: index + 1,
                    rowKey,
                    team: String(item.team || '').trim(),
                    room: String(item.room || '').trim(),
                    type: String(item.type || item.zone || '').trim(),
                    standard: String(item.standard || '').trim(),
                    value: hasDraft ? String(draftValues[rowKey] ?? '') : String(existing?.value || ''),
                    note: hasDraft ? String(entryForm.note || '') : String(existing?.note || ''),
                    existing
                };
            });
        }

        function getAuditFilterState(dataKey) {
            if (!AuditState.filters[dataKey]) {
                const now = getAuditCurrentQuarterInfo();
                const current = makeQuarterKey(now.year, now.quarter);
                AuditState.filters[dataKey] = { startQuarter: current, endQuarter: current, team: '', room: '', onlyFail: false };
            }
            return AuditState.filters[dataKey];
        }

        function getAuditEntryFormState(dataKey) {
            if (!AuditState.entryForm[dataKey]) {
                const now = getAuditCurrentQuarterInfo();
                AuditState.entryForm[dataKey] = {
                    year: now.year,
                    quarter: now.quarter,
                    team: '',
                    room: '',
                    type: '',
                    value: '',
                    note: '',
                    editIndex: null,
                    batchActive: false,
                    batchValues: {},
                    batchFocusKey: '',
                    batchShouldFocus: false
                };
            }
            return AuditState.entryForm[dataKey];
        }

        function getAuditStandardFormState(dataKey) {
            if (!AuditState.standardForm[dataKey]) {
                AuditState.standardForm[dataKey] = {
                    team: '',
                    room: '',
                    type: '',
                    standard: '',
                    editIndex: null
                };
            }
            return AuditState.standardForm[dataKey];
        }

        function isAuditStandardsOpen(dataKey) {
            return !!AuditState.standardsOpen[dataKey];
        }

        function setAuditFilter(dataKey, field, value) {
            const filter = getAuditFilterState(dataKey);
            filter[field] = value;
            if (field === 'team') {
                const rooms = getAuditFilterRooms(dataKey, value);
                if (!rooms.length || !rooms.includes(filter.room)) {
                    filter.room = '';
                }
            }
            if (field === 'startQuarter' || field === 'endQuarter') {
                const normalized = normalizeQuarterRange(filter.startQuarter, filter.endQuarter);
                filter.startQuarter = normalized.start;
                filter.endQuarter = normalized.end;
            }
            if (!AuditState.evidenceApplied) AuditState.evidenceApplied = {};
            AuditState.evidenceApplied[dataKey] = false;
        }

        function updateAuditFilter(dataKey, field, value) {
            setAuditFilter(dataKey, field, value);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function updateAuditFilterQuarterPart(dataKey, boundary, part, value) {
            const field = String(boundary || '').trim() === 'end' ? 'endQuarter' : 'startQuarter';
            const availableQuarterKeys = getAuditAvailableQuarterKeys(dataKey);
            if (!availableQuarterKeys.length) return;
            const fallbackKey = field === 'endQuarter'
                ? availableQuarterKeys[availableQuarterKeys.length - 1]
                : availableQuarterKeys[0];
            const filter = getAuditFilterState(dataKey);
            const current = parseQuarterKey(filter[field]) || parseQuarterKey(fallbackKey);
            if (!current) return;
            let nextYear = current.year;
            let nextQuarter = current.quarter;
            if (part === 'year') {
                const parsedYear = parseInt(value, 10);
                if (Number.isFinite(parsedYear)) nextYear = parsedYear;
            } else if (part === 'quarter') {
                const parsedQuarter = parseInt(value, 10);
                if (Number.isFinite(parsedQuarter)) nextQuarter = parsedQuarter;
            }
            const availableQuarters = getQuarterValuesForYear(availableQuarterKeys, nextYear);
            if (!availableQuarters.length) return;
            if (!availableQuarters.includes(nextQuarter)) {
                nextQuarter = field === 'endQuarter'
                    ? availableQuarters[availableQuarters.length - 1]
                    : availableQuarters[0];
            }
            setAuditFilter(dataKey, field, makeQuarterKey(nextYear, nextQuarter));
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function toggleAuditFilterTeam(dataKey, teamName) {
            const filter = getAuditFilterState(dataKey);
            const nextTeam = filter.team === teamName ? '' : teamName;
            setAuditFilter(dataKey, 'team', nextTeam);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) {
                AuditState.evidenceApplied[dataKey] = true;
                renderAuditContent(category);
            }
        }

        function cycleAuditLuxFilterTeam(dataKey) {
            const filter = getAuditFilterState(dataKey);
            const availableTeams = getAuditFilterTeams(dataKey);
            const cycle = ['Line Gamma', 'Line Delta', ''];
            const currentTeam = cycle.includes(filter.team) ? filter.team : '';
            const currentIndex = cycle.indexOf(currentTeam);
            let nextTeam = '';
            for (let offset = 1; offset <= cycle.length; offset += 1) {
                const candidate = cycle[(currentIndex + offset) % cycle.length];
                if (!candidate || availableTeams.includes(candidate)) {
                    nextTeam = candidate;
                    break;
                }
            }
            setAuditFilter(dataKey, 'team', nextTeam);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) {
                AuditState.evidenceApplied[dataKey] = true;
                renderAuditContent(category);
            }
        }

        function applyAuditFilter(dataKey) {
            if (!AuditState.evidenceApplied) AuditState.evidenceApplied = {};
            AuditState.evidenceApplied[dataKey] = true;
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function auditEntryMatches(entry, filter) {
            if (filter.team && entry.team !== filter.team) return false;
            if (filter.room && entry.room !== filter.room) return false;
            const entryKey = makeQuarterKey(entry.year, entry.quarter);
            const range = normalizeQuarterRange(filter.startQuarter, filter.endQuarter);
            const idx = quarterIndex(entryKey);
            const startIdx = quarterIndex(range.start);
            const endIdx = quarterIndex(range.end);
            if (idx === null || startIdx === null || endIdx === null) return true;
            return idx >= startIdx && idx <= endIdx;
        }
