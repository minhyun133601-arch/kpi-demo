        function parseUtilExcelDate(cell, fallbackValue) {
            if (cell) {
                if (cell.v instanceof Date) {
                    const normalizedDate = normalizeUtilExcelJsDate(cell.v);
                    if (normalizedDate) return normalizedDate;
                    return new Date(cell.v.getFullYear(), cell.v.getMonth(), cell.v.getDate());
                }
                if (typeof cell.v === 'number' && (isUtilDateFormattedCell(cell) || isUtilLikelyExcelDateSerial(cell.v))) {
                    const parsed = XLSX.SSF.parse_date_code(cell.v);
                    if (parsed) {
                        const date = new Date(parsed.y, parsed.m - 1, parsed.d);
                        if (date.getFullYear() >= 1990 && date.getFullYear() <= 2100) return date;
                    }
                }
                const fromDisplay = parseUtilExcelDateText(cell.w);
                if (fromDisplay) return fromDisplay;
            }
            return parseUtilExcelDateText(fallbackValue);
        }

        function normalizeUtilUploadHeader(text) {
            return String(text || '')
                .toLowerCase()
                .replace(/\s+/g, '')
                .replace(/[._\-()]/g, '');
        }

        function normalizeUtilUploadValue(value) {
            if (value === null || value === undefined) return '';
            if (typeof value === 'string') return value.trim();
            return value;
        }

        function normalizeUtilDedupeText(value) {
            return String(value ?? '')
                .trim()
                .replace(/\s+/g, ' ')
                .toLowerCase();
        }

        function canonicalizeUtilDedupeMetric(value) {
            const parsed = parseUtilAmount(value);
            return Number.isFinite(parsed) ? String(parsed) : '';
        }

        function hasUtilUploadData(values) {
            return values.some(value => {
                if (value === null || value === undefined) return false;
                if (typeof value === 'string') return value.trim() !== '';
                return true;
            });
        }

        function validateUtilProductionUploadHeaders(fileName, sheetName, headers) {
            for (let index = 0; index < UTIL_PRODUCTION_UPLOAD_COLS.length; index += 1) {
                const col = UTIL_PRODUCTION_UPLOAD_COLS[index];
                const rawHeader = String(headers[index] || '').trim();
                const normalized = normalizeUtilUploadHeader(rawHeader);
                const patterns = UTIL_PRODUCTION_UPLOAD_HEADER_RULES[col] || [];
                if (normalized === '' || !patterns.length) {
                    throw new Error(`[${fileName} - ${sheetName}] ${col}${UTIL_PRODUCTION_UPLOAD_HEADER_ROW} 헤더가 비어있습니다.`);
                }
                const isValid = patterns.some(pattern => pattern.test(normalized));
                if (!isValid) {
                    throw new Error(`[${fileName} - ${sheetName}] ${col}${UTIL_PRODUCTION_UPLOAD_HEADER_ROW} 헤더 형식이 다릅니다. 현재: "${rawHeader}"`);
                }
            }
        }

        async function parseUtilProductionExcelFile(file, fallbackTeamName) {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
            if (!Array.isArray(workbook.SheetNames) || !workbook.SheetNames.length) {
                throw new Error(`[${file.name}] 시트가 없습니다.`);
            }
            const sourceFileName = String(file?.name || '').trim();
            const sourceFingerprint = buildUtilProductionArchiveFingerprint(
                sourceFileName,
                file?.size,
                file?.lastModified
            );
            const rows = [];
            let parsedSheetCount = 0;
            workbook.SheetNames.forEach(sheetName => {
                const worksheet = workbook.Sheets[sheetName];
                if (!worksheet) return;
                const rawHeaders = UTIL_PRODUCTION_UPLOAD_COLS.map(col =>
                    String(getUtilExcelCellDisplayValue(worksheet, `${col}${UTIL_PRODUCTION_UPLOAD_HEADER_ROW}`) || '').trim()
                );
                if (rawHeaders.every(header => header === '')) return;
                validateUtilProductionUploadHeaders(file.name, sheetName, rawHeaders);
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
                const lastRow = range.e.r + 1;
                for (let rowNumber = UTIL_PRODUCTION_UPLOAD_DATA_START_ROW; rowNumber <= lastRow; rowNumber += 1) {
                    const values = UTIL_PRODUCTION_UPLOAD_COLS.map(col => getUtilExcelCellDisplayValue(worksheet, `${col}${rowNumber}`));
                    if (!hasUtilUploadData(values)) continue;
                    const dateCell = worksheet[`A${rowNumber}`];
                    const parsedDate = parseUtilExcelDate(dateCell, values[0]);
                    const dateObj = applyUtilDateOffset(parsedDate, UTIL_PRODUCTION_UPLOAD_DATE_OFFSET_DAYS);
                    const amount = parseUtilAmount(values[4]);
                    const hasMetricValue = Number.isFinite(amount);
                    if (!dateObj || !hasMetricValue) continue;
                    const teamValue = normalizeUtilUploadValue(values[1]);
                    const lineValue = normalizeUtilUploadValue(values[2]);
                    const productValue = normalizeUtilUploadValue(values[3]);
                    const moistureExcludedYield = parseUtilPercentAmount(getUtilExcelCellDisplayValue(worksheet, `N${rowNumber}`));
                    const equipmentCapa = parseUtilAmount(getUtilExcelCellDisplayValue(worksheet, `V${rowNumber}`));
                    const equipmentUtilization = parseUtilPercentAmount(getUtilExcelCellDisplayValue(worksheet, `W${rowNumber}`));
                    const lineName = String(lineValue || '').trim();
                    const productName = String(productValue || '').trim();
                    const resolvedTeam = resolveUtilUploadTeamName(teamValue, fallbackTeamName, `${lineName} ${productName}`, lineName);
                    rows.push({
                        date: formatUtilYmd(dateObj),
                        team: String(resolvedTeam || fallbackTeamName || teamValue || '').trim(),
                        lineName,
                        productName,
                        amount: Number.isFinite(amount) ? amount : null,
                        moistureExcludedYield: Number.isFinite(moistureExcludedYield) ? moistureExcludedYield : null,
                        equipmentCapa: Number.isFinite(equipmentCapa) ? equipmentCapa : null,
                        equipmentUtilization: Number.isFinite(equipmentUtilization) ? equipmentUtilization : null,
                        sourceFileName,
                        sourceFingerprint
                    });
                }
                parsedSheetCount += 1;
            });
            if (!parsedSheetCount) {
                throw new Error(`[${file.name}] 형식에 맞는 시트를 찾지 못했습니다. (3행 A/B/C/E/F 헤더 확인)`);
            }
            return rows;
        }

        async function parseUtilProductionExcelFiles(files, fallbackTeamName) {
            const normalizedFallbackTeam = String(fallbackTeamName || '').trim();
            const targetFiles = Array.isArray(files) ? files : [];
            const parsedList = await Promise.all(targetFiles.map(async file => {
                try {
                    const rows = await parseUtilProductionExcelFile(file, normalizedFallbackTeam);
                    return {
                        ok: true,
                        fileName: String(file?.name || '').trim(),
                        rows
                    };
                } catch (error) {
                    return {
                        ok: false,
                        fileName: String(file?.name || '').trim(),
                        message: String(error?.message || '형식 오류')
                    };
                }
            }));
            const failedFiles = parsedList
                .filter(item => !item.ok)
                .map(item => ({
                    fileName: item.fileName || '알 수 없는 파일',
                    message: item.message || '형식 오류'
                }));
            const rows = parsedList
                .filter(item => item.ok)
                .flatMap(item => Array.isArray(item.rows) ? item.rows : [])
                .filter(row => {
                    if (!row || !row.team || !row.date) return false;
                    return [row.amount].some(value => {
                        if (value === null || value === undefined) return false;
                        if (typeof value === 'string' && value.trim() === '') return false;
                        return Number.isFinite(Number(value));
                    });
                });
            if (!rows.length) {
                if (failedFiles.length) {
                    const names = failedFiles.map(item => item.fileName).filter(Boolean).join(', ');
                    throw new Error(`형식 오류 파일을 제외한 뒤 기입 가능한 데이터가 없습니다. 오류 파일: ${names}`);
                }
                throw new Error('기입 가능한 데이터가 없습니다.');
            }
            return {
                rows,
                failedFiles,
                totalFileCount: targetFiles.length,
                successFileCount: targetFiles.length - failedFiles.length
            };
        }

        function formatUtilDateLabel(date) {
            if (!(date instanceof Date)) return '';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}.${month}.${day}`;
        }

        function normalizeUtilTeamName(name) {
            return String(name || '')
                .replace(/\([^)]*\)/g, '')
                .replace(/\s+/g, '')
                .trim();
        }

        function canonicalizeUtilTeamName(name) {
            const text = normalizeUtilTeamName(name).toLowerCase();
            if (!text) return '';
            if (text.includes('linealpha')) return 'LineAlpha';
            if (text.includes('linebeta')) return 'LineBeta';
            if (text.includes('linegamma')) return 'LineGamma';
            if (text.includes('linedelta')) return 'LineDelta';
            if (text.includes('planta')) return 'Plant A';
            if (text.includes('plantb')) return 'Plant B';
            return text;
        }

        function sanitizeUtilUploadTeamName(name) {
            const text = String(name || '').trim();
            if (!text) return '';
            const normalized = text.replace(/\s+/g, '').toLowerCase();
            if (!normalized) return '';
            if (normalized === '-' || normalized === '없음' || normalized === '팀없음' || normalized === '미입력' || normalized === 'na' || normalized === 'n/a') {
                return '';
            }
            return text;
        }

        function shouldForceTeam3ForProduction(rawTeamName, contextText = '', lineName = '') {
            const raw = sanitizeUtilUploadTeamName(rawTeamName);
            const rawNormalized = normalizeUtilTeamName(raw).toLowerCase();
            const lineNormalized = normalizeUtilTeamName(lineName).toLowerCase();
            const contextNormalized = normalizeUtilTeamName(contextText).toLowerCase();
            if (!raw) return true;
            if (rawNormalized.includes('linedelta')) return true;
            if (lineNormalized.includes('processgamma')) return true;
            if (!lineNormalized && contextNormalized.includes('processgamma')) return true;
            return false;
        }

        function resolveUtilExplicitTeamAlias(rawTeamName, contextText = '') {
            const merged = normalizeUtilTeamName(`${rawTeamName || ''}${contextText || ''}`).toLowerCase();
            if (!merged) return '';
            const hasLineAlpha = merged.includes('linealpha');
            const hasLineBeta = merged.includes('linebeta');
            const hasPlantB = merged.includes('plantb');
            const hasPlantA = merged.includes('planta');
            if (hasLineAlpha || (hasPlantB && !hasLineBeta)) return 'LineAlpha';
            if (hasLineBeta || (hasPlantA && !hasLineAlpha)) return 'LineBeta';
            return '';
        }

        function inferUtilFuelType(text) {
            const lower = String(text || '').toLowerCase();
            if (lower.includes('lpg')) return 'lpg';
            if (lower.includes('lng')) return 'lng';
            return '';
        }

        function collectUtilKnownTeamNames() {
            const names = [];
            const sources = [UTIL_ELECTRIC_DATA, UTIL_GAS_DATA, UTIL_WASTE_DATA, UTIL_PRODUCTION_DAILY_DATA];
            sources.forEach(source => {
                (source || []).forEach(item => {
                    const name = String(item?.name || '').trim();
                    if (!name || names.includes(name)) return;
                    names.push(name);
                });
            });
            return names;
        }

        function resolveUtilUploadTeamName(rawTeamName, fallbackTeamName, contextText = '', lineName = '') {
            const raw = sanitizeUtilUploadTeamName(rawTeamName);
            if (shouldForceTeam3ForProduction(raw, contextText, lineName)) return 'Line Delta';
            const rawNormalized = normalizeUtilTeamName(raw).toLowerCase();
            if (rawNormalized.includes('linegamma')) return 'Line Gamma';
            const fallback = sanitizeUtilUploadTeamName(fallbackTeamName);
            const rawCanonical = canonicalizeUtilTeamName(raw || contextText);
            const fallbackCanonical = canonicalizeUtilTeamName(fallback);
            const fuelHint = inferUtilFuelType(`${raw} ${contextText}`);
            const knownTeams = collectUtilKnownTeamNames();
            const pickKnownTeam = (canonical) => {
                const candidates = knownTeams.filter(name => canonicalizeUtilTeamName(name) === canonical);
                if (!candidates.length) return '';
                if (fuelHint) {
                    const preferred = candidates.find(name => name.toLowerCase().includes(fuelHint));
                    if (preferred) return preferred;
                }
                if (fallback && candidates.includes(fallback)) return fallback;
                return candidates[0];
            };
            const aliasCanonical = resolveUtilExplicitTeamAlias(raw, contextText);
            if (aliasCanonical) {
                const aliasTeam = pickKnownTeam(aliasCanonical);
                if (aliasTeam) return aliasTeam;
                if (aliasCanonical === 'LineAlpha') return 'Line Alpha';
                if (aliasCanonical === 'LineBeta') return 'Line Beta';
            }
            if (rawCanonical) {
                const mappedKnown = pickKnownTeam(rawCanonical);
                if (mappedKnown) return mappedKnown;
                if (fallback && rawCanonical === fallbackCanonical) return fallback;
                if (raw) return raw;
            }
            return fallback || raw;
        }

        function buildUtilProductionDailyIndex(teams) {
            const index = {};
            const dedupe = new Set();
            (teams || []).forEach(team => {
                const key = normalizeUtilTeamName(team?.name);
                if (!key) return;
                if (!index[key]) index[key] = [];
                (team.entries || []).forEach(entry => {
                    const parsed = parseUtilDateKey(entry?.date);
                    const amount = parseUtilAmount(entry?.amount ?? entry?.production ?? entry?.value);
                    const moistureExcludedYield = parseUtilPercentAmount(entry?.moistureExcludedYield ?? entry?.moistureFreeYield ?? entry?.yieldExcludingMoisture ?? entry?.yieldRate);
                    const equipmentCapa = parseUtilAmount(entry?.equipmentCapa ?? entry?.capa ?? entry?.equipmentCapacity);
                    const equipmentUtilization = parseUtilPercentAmount(entry?.equipmentUtilization ?? entry?.operationRate ?? entry?.equipmentRate ?? entry?.utilizationRate);
                    const hasMetricValue = Number.isFinite(amount);
                    if (!parsed || !hasMetricValue) return;
                    const lineName = String(entry?.lineName ?? entry?.line ?? entry?.lineNm ?? '').trim();
                    const productName = String(entry?.productName ?? entry?.itemName ?? entry?.product ?? '').trim();
                    const teamName = String(entry?.team ?? team?.name ?? '').trim();
                    const dedupeKey = buildUtilProductionDailyEntryKey({
                        date: formatUtilDailyDateKey(parsed),
                        team: teamName || team?.name || '',
                        lineName,
                        productName,
                        amount
                    });
                    if (!dedupeKey || dedupe.has(dedupeKey)) return;
                    dedupe.add(dedupeKey);
                    index[key].push({
                        time: parsed.date.getTime(),
                        dateLabel: `${parsed.year}-${String(parsed.month).padStart(2, '0')}-${String(parsed.day).padStart(2, '0')}`,
                        amount: Number.isFinite(amount) ? amount : null,
                        moistureExcludedYield: Number.isFinite(moistureExcludedYield) ? moistureExcludedYield : null,
                        equipmentCapa: Number.isFinite(equipmentCapa) ? equipmentCapa : null,
                        equipmentUtilization: Number.isFinite(equipmentUtilization) ? equipmentUtilization : null,
                        lineName,
                        productName,
                        teamName,
                        entryKey: dedupeKey
                    });
                });
                index[key].sort((a, b) => a.time - b.time);
            });
            return index;
        }

        function getUtilProductionRuleText(startDay) {
            const safeStart = clampUtilDay(startDay, DEFAULT_UTIL_PRODUCTION_PERIOD.startDay);
            if (safeStart === 1) return '당월 1일 ~ 당월 말일';
            return `당월 ${safeStart}일 ~ 익월 ${safeStart - 1}일`;
        }

        function getUtilProductionPeriod(year, month, startDay) {
            if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
            const safeStart = clampUtilDay(startDay, DEFAULT_UTIL_PRODUCTION_PERIOD.startDay);
            const startMonthMax = new Date(year, month, 0).getDate();
            const startDate = new Date(year, month - 1, Math.min(safeStart, startMonthMax));

            let nextYear = year;
            let nextMonth = month + 1;
            if (nextMonth > 12) {
                nextMonth = 1;
                nextYear += 1;
            }
            const nextMonthMax = new Date(nextYear, nextMonth, 0).getDate();
            const nextStartDay = Math.min(safeStart, nextMonthMax);
            const endDate = new Date(nextYear, nextMonth - 1, nextStartDay);
            endDate.setDate(endDate.getDate() - 1);
            if (startDate.getTime() > endDate.getTime()) return null;
            return { startDate, endDate };
        }

        function getUtilProductionPeriodLabel(year, month, startDay) {
            const period = getUtilProductionPeriod(year, month, startDay);
            if (!period) return '';
            return `${formatUtilDateLabel(period.startDate)} ~ ${formatUtilDateLabel(period.endDate)}`;
        }

        const defaultProductionPeriod = UTIL_PRODUCTION_DAILY_STATE.periodDefault || {};
        const UtilProductionState = {
            startDay: DEFAULT_UTIL_PRODUCTION_PERIOD.startDay
        };
        defaultProductionPeriod.startDay = UtilProductionState.startDay;
        let UTIL_PRODUCTION_DAILY_INDEX = buildUtilProductionDailyIndex(UTIL_PRODUCTION_DAILY_DATA);
        const UtilProductionBridgeState = {
            activeTeam: '',
            onApplied: null
        };
        const UtilProductionArchiveState = {
            folderName: UTIL_PRODUCTION_ARCHIVE_SOURCE_LABEL_DEFAULT,
            view: 'year',
            selectedYear: '',
            selectedMonth: '',
            selectedTeam: ''
        };

        function persistUtilProductionDailyState() {
            if (!window.KpiUtilityServerRuntime || typeof window.KpiUtilityServerRuntime.queueUtilProductionDailyServerWrite !== 'function') {
                return false;
            }
            if (typeof window.KpiUtilityServerRuntime.supportsUtilProductionServerPersistence === 'function'
                && !window.KpiUtilityServerRuntime.supportsUtilProductionServerPersistence()) {
                return false;
            }
            UTIL_PRODUCTION_DAILY_STATE.meta = UTIL_PRODUCTION_DAILY_STATE.meta || {};
            UTIL_PRODUCTION_DAILY_STATE.meta.moduleKey = 'util_production';
            UTIL_PRODUCTION_DAILY_STATE.meta.recordKey = 'daily_state_v1';
            UTIL_PRODUCTION_DAILY_STATE.meta.permissionKey = 'util.production.daily';
            UTIL_PRODUCTION_DAILY_STATE.meta.moduleName = '유틸리티 - 생산량 일별';
            UTIL_PRODUCTION_DAILY_STATE.meta.version = Number.isFinite(Number(UTIL_PRODUCTION_DAILY_STATE.meta.version))
                ? Number(UTIL_PRODUCTION_DAILY_STATE.meta.version)
                : 3;
            UTIL_PRODUCTION_DAILY_STATE.meta.updatedAt = new Date().toISOString();
            UTIL_PRODUCTION_DAILY_STATE.periodDefault = UTIL_PRODUCTION_DAILY_STATE.periodDefault || {};
            UTIL_PRODUCTION_DAILY_STATE.periodDefault.startDay = clampUtilDay(UtilProductionState.startDay, DEFAULT_UTIL_PRODUCTION_PERIOD.startDay);
            if (!Array.isArray(UTIL_PRODUCTION_DAILY_STATE.teams)) UTIL_PRODUCTION_DAILY_STATE.teams = [];
            if (UTIL_PRODUCTION_DAILY_STATE.teams !== UTIL_PRODUCTION_DAILY_DATA) {
                UTIL_PRODUCTION_DAILY_STATE.teams = UTIL_PRODUCTION_DAILY_DATA;
            }
            if (!Array.isArray(UTIL_PRODUCTION_DAILY_STATE.archives)) UTIL_PRODUCTION_DAILY_STATE.archives = [];
            const normalizedArchives = (UTIL_PRODUCTION_ARCHIVE_META || [])
                .map(item => normalizeUtilProductionArchiveMeta(item))
                .filter(Boolean);
            UTIL_PRODUCTION_ARCHIVE_META.length = 0;
            UTIL_PRODUCTION_ARCHIVE_META.push(...normalizedArchives);
            UTIL_PRODUCTION_DAILY_STATE.archives = UTIL_PRODUCTION_ARCHIVE_META;
            window.PortalData = window.PortalData || {};
            window.PortalData.util_production_daily = UTIL_PRODUCTION_DAILY_STATE;
            if (window.KpiUtilityServerRuntime && typeof window.KpiUtilityServerRuntime.queueUtilProductionDailyServerWrite === 'function') {
                return window.KpiUtilityServerRuntime.queueUtilProductionDailyServerWrite(UTIL_PRODUCTION_DAILY_STATE);
            }
            return false;
        }

        function refreshUtilProductionDailyIndex() {
            UTIL_PRODUCTION_DAILY_INDEX = buildUtilProductionDailyIndex(UTIL_PRODUCTION_DAILY_DATA);
        }

        function formatUtilDailyDateKey(parsedDate) {
            return `${parsedDate.year}-${String(parsedDate.month).padStart(2, '0')}-${String(parsedDate.day).padStart(2, '0')}`;
        }

        function ensureUtilProductionDailyTeamRecord(teamName) {
            const safeName = String(teamName || '').trim();
            const normalized = normalizeUtilTeamName(safeName);
            if (!normalized) return null;
            let team = (UTIL_PRODUCTION_DAILY_DATA || []).find(item => normalizeUtilTeamName(item?.name) === normalized);
            if (!team) {
                team = { name: safeName, entries: [] };
                UTIL_PRODUCTION_DAILY_DATA.push(team);
            }
            if (!Array.isArray(team.entries)) team.entries = [];
            return team;
        }

        function buildUtilProductionDailyEntryKey(entry) {
            const parsedDate = parseUtilDateKey(entry?.date);
            const amount = canonicalizeUtilDedupeMetric(entry?.amount ?? entry?.production ?? entry?.value);
            const teamKey = normalizeUtilTeamName(entry?.team ?? entry?.teamName ?? '').toLowerCase();
            const hasMetricValue = amount !== '';
            if (!parsedDate || !hasMetricValue || !teamKey) return '';
            const lineName = normalizeUtilDedupeText(entry?.lineName ?? entry?.line ?? entry?.lineNm ?? '');
            const productName = normalizeUtilDedupeText(entry?.productName ?? entry?.itemName ?? entry?.product ?? '');
            return [
                formatUtilDailyDateKey(parsedDate),
                teamKey,
                lineName,
                productName,
                amount
            ].join('|');
        }

        function mergeUtilProductionExtractorRows(rows, options = {}) {
            const fallbackTeam = sanitizeUtilUploadTeamName(options?.fallbackTeam || UtilProductionBridgeState.activeTeam || '');
            let skippedCount = 0;
            let patchedCount = 0;
            const addedTeamSet = new Set();
            const pendingEntryMap = new Map();
            (rows || []).forEach(row => {
                const rawDate = row?.date ?? row?.values?.[0] ?? '';
                const parsedDate = parseUtilDateKey(rawDate);
                const amount = parseUtilAmount(row?.amount ?? row?.production ?? row?.value ?? row?.values?.[4]);
                const moistureExcludedYield = parseUtilPercentAmount(row?.moistureExcludedYield ?? row?.moistureFreeYield ?? row?.yieldExcludingMoisture ?? row?.yieldRate);
                const equipmentCapa = parseUtilAmount(row?.equipmentCapa ?? row?.capa ?? row?.equipmentCapacity);
                const equipmentUtilization = parseUtilPercentAmount(row?.equipmentUtilization ?? row?.operationRate ?? row?.equipmentRate ?? row?.utilizationRate);
                const lineName = String(row?.lineName ?? row?.line ?? row?.values?.[2] ?? '').trim();
                const productName = String(row?.productName ?? row?.product ?? row?.itemName ?? row?.values?.[3] ?? '').trim();
                const rawTeamName = String(row?.team ?? row?.teamName ?? row?.values?.[1] ?? '').trim();
                const teamName = resolveUtilUploadTeamName(rawTeamName, fallbackTeam, `${lineName} ${productName}`, lineName);
                const hasMetricValue = Number.isFinite(amount);
                if (!parsedDate || !hasMetricValue || !teamName) {
                    skippedCount += 1;
                    return;
                }
                const entry = {
                    date: formatUtilDailyDateKey(parsedDate),
                    amount: Number.isFinite(amount) ? amount : null,
                    moistureExcludedYield: Number.isFinite(moistureExcludedYield) ? moistureExcludedYield : null,
                    equipmentCapa: Number.isFinite(equipmentCapa) ? equipmentCapa : null,
                    equipmentUtilization: Number.isFinite(equipmentUtilization) ? equipmentUtilization : null,
                    lineName,
                    productName,
                    team: teamName,
                    sourceArchiveId: '',
                    sourceFingerprint: '',
                    sourceFileName: ''
                };
                const dedupeKey = buildUtilProductionDailyEntryKey(entry);
                if (!dedupeKey) {
                    skippedCount += 1;
                    return;
                }
                if (pendingEntryMap.has(dedupeKey)) {
                    const existingEntry = pendingEntryMap.get(dedupeKey);
                    let patched = false;
                    if (Number.isFinite(moistureExcludedYield) && !Number.isFinite(parseUtilPercentAmount(existingEntry?.moistureExcludedYield))) {
                        existingEntry.moistureExcludedYield = moistureExcludedYield;
                        patched = true;
                    }
                    if (Number.isFinite(equipmentCapa) && !Number.isFinite(parseUtilAmount(existingEntry?.equipmentCapa))) {
                        existingEntry.equipmentCapa = equipmentCapa;
                        patched = true;
                    }
                    if (Number.isFinite(equipmentUtilization) && !Number.isFinite(parseUtilPercentAmount(existingEntry?.equipmentUtilization))) {
                        existingEntry.equipmentUtilization = equipmentUtilization;
                        patched = true;
                    }
                    if (patched) {
                        patchedCount += 1;
                    } else {
                        skippedCount += 1;
                    }
                    return;
                }
                pendingEntryMap.set(dedupeKey, entry);
                addedTeamSet.add(teamName);
            });
            const nextEntries = Array.from(pendingEntryMap.values());
            const addedCount = nextEntries.length;
            if (addedCount > 0) {
                UTIL_PRODUCTION_DAILY_DATA.length = 0;
                UTIL_PRODUCTION_ARCHIVE_META.length = 0;
                nextEntries.forEach(entry => {
                    const targetTeam = ensureUtilProductionDailyTeamRecord(entry.team);
                    if (!targetTeam) return;
                    targetTeam.entries.push(entry);
                });
                refreshUtilProductionDailyIndex();
                persistUtilProductionDailyState();
                if (typeof refreshUtilProductionArchiveCountBadges === 'function') {
                    refreshUtilProductionArchiveCountBadges();
                }
            }
            return {
                addedCount,
                skippedCount,
                patchedCount,
                addedTeams: Array.from(addedTeamSet).filter(Boolean)
            };
        }

        function formatUtilArchiveFileSize(value) {
            const bytes = Number(value);
            if (!Number.isFinite(bytes) || bytes < 0) return '-';
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
            if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
            return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
        }

        function formatUtilArchiveDateTime(value) {
            if (!value) return '-';
            const date = new Date(value);
            if (!Number.isFinite(date.getTime())) return '-';
            return date.toLocaleString('ko-KR');
        }

        function buildUtilProductionArchiveLookupMap() {
            const byFingerprint = {};
            const byFileName = {};
            sortUtilProductionArchiveMeta();
            (UTIL_PRODUCTION_ARCHIVE_META || []).forEach(item => {
                const id = String(item?.id || '').trim();
                if (!id) return;
                const fingerprint = String(item?.fingerprint || '').trim();
                const fileNameKey = normalizeUtilArchiveLookupByFileName(item?.fileName);
                if (fingerprint && !byFingerprint[fingerprint]) byFingerprint[fingerprint] = id;
                if (fileNameKey && !byFileName[fileNameKey]) byFileName[fileNameKey] = id;
            });
            return { byFingerprint, byFileName };
        }

        function buildUtilProductionArchiveRowSummaryMap(rows) {
            const mapByFingerprint = new Map();
            const mapByFileName = new Map();
            const append = (targetMap, key, row) => {
                if (!key) return;
                let summary = targetMap.get(key);
                if (!summary) {
                    summary = { years: new Set(), yearMonths: new Set(), teams: new Set() };
                    targetMap.set(key, summary);
                }
                const rawDate = row?.date ?? row?.values?.[0] ?? '';
                const parsedDate = parseUtilDateKey(rawDate);
                if (parsedDate?.year) {
                    summary.years.add(parsedDate.year);
                    summary.yearMonths.add(`${parsedDate.year}-${String(parsedDate.month).padStart(2, '0')}`);
                }
                const team = String(row?.team ?? row?.teamName ?? row?.values?.[1] ?? '').trim();
                if (team) summary.teams.add(team);
            };
            (Array.isArray(rows) ? rows : []).forEach(row => {
                const fingerprint = String(
                    row?.sourceFingerprint
                    || row?.fingerprint
                    || row?.fileFingerprint
                    || ''
                ).trim();
                const fileName = normalizeUtilArchiveLookupByFileName(
                    row?.sourceFileName
                    || row?.fileName
                    || ''
                );
                append(mapByFingerprint, fingerprint, row);
                append(mapByFileName, fileName, row);
            });
            return { mapByFingerprint, mapByFileName };
        }

        function getUtilProductionArchiveSummaryForSource(sourceInfo, summaryMap) {
            const mapByFingerprint = summaryMap?.mapByFingerprint instanceof Map ? summaryMap.mapByFingerprint : new Map();
            const mapByFileName = summaryMap?.mapByFileName instanceof Map ? summaryMap.mapByFileName : new Map();
            const byFingerprint = sourceInfo?.fingerprint ? mapByFingerprint.get(sourceInfo.fingerprint) : null;
            const byFileName = sourceInfo?.fileName ? mapByFileName.get(normalizeUtilArchiveLookupByFileName(sourceInfo.fileName)) : null;
            const years = normalizeUtilProductionArchiveYears([
                ...(byFingerprint?.years ? Array.from(byFingerprint.years) : []),
                ...(byFileName?.years ? Array.from(byFileName.years) : [])
            ]);
            const yearMonths = normalizeUtilProductionArchiveYearMonths([
                ...(byFingerprint?.yearMonths ? Array.from(byFingerprint.yearMonths) : []),
                ...(byFileName?.yearMonths ? Array.from(byFileName.yearMonths) : [])
            ]);
            const teams = normalizeUtilProductionArchiveTeams([
                ...(byFingerprint?.teams ? Array.from(byFingerprint.teams) : []),
                ...(byFileName?.teams ? Array.from(byFileName.teams) : [])
            ]);
            return { years, yearMonths, teams };
        }

        function mergeUtilProductionArchiveMetaSummary(meta, summary) {
            if (!meta || typeof meta !== 'object') return false;
            const yearMonths = normalizeUtilProductionArchiveYearMonths([
                ...(Array.isArray(meta.yearMonths) ? meta.yearMonths : []),
                ...(Array.isArray(summary?.yearMonths) ? summary.yearMonths : [])
            ]);
            const yearsFromYearMonths = yearMonths
                .map(value => Number(String(value).slice(0, 4)))
                .filter(value => Number.isFinite(value));
            const years = normalizeUtilProductionArchiveYears([
                ...(Array.isArray(meta.years) ? meta.years : []),
                ...(Array.isArray(summary?.years) ? summary.years : []),
                ...yearsFromYearMonths
            ]);
            const teams = normalizeUtilProductionArchiveTeams([
                ...(Array.isArray(meta.teams) ? meta.teams : []),
                ...(Array.isArray(summary?.teams) ? summary.teams : [])
            ]);
            const prevYears = JSON.stringify(Array.isArray(meta.years) ? meta.years : []);
            const prevYearMonths = JSON.stringify(Array.isArray(meta.yearMonths) ? meta.yearMonths : []);
            const prevTeams = JSON.stringify(Array.isArray(meta.teams) ? meta.teams : []);
            meta.years = years;
            meta.yearMonths = yearMonths;
            meta.teams = teams;
            return prevYears !== JSON.stringify(years)
                || prevYearMonths !== JSON.stringify(yearMonths)
                || prevTeams !== JSON.stringify(teams);
        }

        function sortUtilProductionArchiveMeta() {
            UTIL_PRODUCTION_ARCHIVE_META.sort((a, b) => {
                const timeA = new Date(a?.savedAt || 0).getTime();
                const timeB = new Date(b?.savedAt || 0).getTime();
                return timeB - timeA;
            });
        }

        function refreshUtilProductionArchiveCountBadges() {
            const countText = `보관 파일 ${UTIL_PRODUCTION_ARCHIVE_META.length.toLocaleString('ko-KR')}개`;
            document.querySelectorAll('[data-production-archive-count]').forEach(node => {
                node.textContent = countText;
            });
        }
