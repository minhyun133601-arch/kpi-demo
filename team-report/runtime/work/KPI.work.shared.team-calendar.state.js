        function formatWorkTeamCalendarMonthOptionLabel(monthKey) {
            const parsed = parseMonthKey(monthKey);
            if (!parsed) return monthKey || '';
            return `${parsed.year}.${String(parsed.monthIndex + 1).padStart(2, '0')}`;
        }

        function getWorkTeamCalendarRangeLabel() {
            return `${WORK_TEAM_CALENDAR_RANGE.start.slice(2).replace('-', '.')} ~ ${WORK_TEAM_CALENDAR_RANGE.end.slice(2).replace('-', '.')}`;
        }

        function clampWorkTeamCalendarMonthKey(monthKey) {
            const parsed = parseMonthKey(monthKey);
            const fallback = WORK_TEAM_CALENDAR_RANGE.start;
            if (!parsed) return fallback;
            const normalized = `${parsed.year}-${String(parsed.monthIndex + 1).padStart(2, '0')}`;
            const index = monthKeyToIndex(normalized);
            const startIndex = monthKeyToIndex(WORK_TEAM_CALENDAR_RANGE.start);
            const endIndex = monthKeyToIndex(WORK_TEAM_CALENDAR_RANGE.end);
            if (index === null || startIndex === null || endIndex === null) return fallback;
            if (index < startIndex) return WORK_TEAM_CALENDAR_RANGE.start;
            if (index > endIndex) return WORK_TEAM_CALENDAR_RANGE.end;
            return normalized;
        }

        function getWorkTeamCalendarMonthOptions() {
            const options = [];
            const start = parseMonthKey(WORK_TEAM_CALENDAR_RANGE.start);
            const end = parseMonthKey(WORK_TEAM_CALENDAR_RANGE.end);
            if (!start || !end) return options;
            let year = start.year;
            let monthIndex = start.monthIndex;
            const endValue = end.year * 12 + end.monthIndex;
            while (year * 12 + monthIndex <= endValue) {
                options.push(`${year}-${String(monthIndex + 1).padStart(2, '0')}`);
                monthIndex += 1;
                if (monthIndex > 11) {
                    monthIndex = 0;
                    year += 1;
                }
            }
            return options;
        }

        function getWorkTeamCalendarDefaultMonth() {
            return clampWorkTeamCalendarMonthKey(getCurrentMonthKey());
        }

        function setWorkTeamCalendarActiveMonthState(dataKey, monthKey) {
            const normalizedMonth = clampWorkTeamCalendarMonthKey(monthKey || getWorkTeamCalendarDefaultMonth());
            if (dataKey) {
                WorkState.teamCalendarMonth[dataKey] = normalizedMonth;
            }
            WorkState.teamCalendarSharedMonth = normalizedMonth;
            return normalizedMonth;
        }

        function setWorkTeamCalendarFocusedDateState(dataKey, dateKey) {
            const normalizedDate = String(dateKey || '').trim();
            if (dataKey) {
                WorkState.teamCalendarDate[dataKey] = normalizedDate;
            }
            WorkState.teamCalendarSharedDate = normalizedDate;
            return normalizedDate;
        }

        function getWorkTeamCalendarActiveMonth(dataKey) {
            const saved = WorkState.teamCalendarMonth[dataKey];
            const shared = WorkState.teamCalendarSharedMonth;
            return setWorkTeamCalendarActiveMonthState(dataKey, shared || saved || getWorkTeamCalendarDefaultMonth());
        }

        function getWorkTeamCalendarSelectedDate(dataKey, monthKey) {
            const normalizedMonth = clampWorkTeamCalendarMonthKey(monthKey);
            const todayKey = formatDateKey(new Date());
            let selected = WorkState.teamCalendarDate[dataKey] || WorkState.teamCalendarSharedDate || '';
            if (!selected || selected.slice(0, 7) !== normalizedMonth) {
                selected = todayKey.slice(0, 7) === normalizedMonth ? todayKey : `${normalizedMonth}-01`;
                setWorkTeamCalendarFocusedDateState(dataKey, selected);
            }
            if (normalizedMonth === todayKey.slice(0, 7) && selected > todayKey) {
                selected = todayKey;
                setWorkTeamCalendarFocusedDateState(dataKey, selected);
            }
            return selected;
        }

        function isWorkTeamCalendarDateLocked(dateKey, todayKey = formatDateKey(new Date())) {
            const normalized = String(dateKey || '').trim();
            return /^\d{4}-\d{2}-\d{2}$/.test(normalized) && normalized > todayKey;
        }

        function ensureWorkTeamCalendarDateRolloverWatcher() {
            if (window.__workTeamCalendarDateRolloverWatcher) return;
            window.__workTeamCalendarDateRolloverWatcher = true;
            const schedule = () => {
                const now = new Date();
                const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 2, 0);
                const delay = Math.max(1000, next.getTime() - now.getTime());
                window.setTimeout(() => {
                    const modal = document.getElementById('work-team-calendar-modal');
                    if (modal?.classList.contains('is-open')) {
                        renderWorkTeamCalendarModal();
                    }
                    schedule();
                }, delay);
            };
            schedule();
        }

        function normalizeWorkTeamCalendarMembers(list) {
            const normalized = [];
            (Array.isArray(list) ? list : []).forEach(name => {
                const memberName = String(name || '').trim();
                if (!memberName || !WORK_TEAM_CALENDAR_MEMBERS.includes(memberName)) return;
                if (!normalized.includes(memberName)) normalized.push(memberName);
            });
            return normalized;
        }

        function normalizeWorkTeamCalendarAttachments(list) {
            const normalized = [];
            (Array.isArray(list) ? list : []).forEach(item => {
                if (!item || typeof item !== 'object') return;
                const assetId = String(item.assetId || '').trim();
                const documentId = String(item.documentId || item.fileId || '').trim();
                const fileName = String(item.fileName || item.name || item.relativePath || item.originalName || documentId || assetId).trim();
                const relativePath = String(item.relativePath || '').trim();
                const previewUrl = String(item.previewUrl || item.viewUrl || '').trim();
                const downloadUrl = String(item.downloadUrl || '').trim();
                if (!assetId && !documentId && !fileName) return;
                const name = fileName || documentId || assetId;
                const type = normalizeAreaAssetType(item.type, name);
                const storage = documentId
                    ? 'server'
                    : (String(item.storage || '').trim() || (assetId ? 'indexeddb' : 'directory'));
                const uniqueKey = documentId || assetId || relativePath || name;
                if (!normalized.some(entry => ((entry.documentId || entry.assetId || entry.relativePath || entry.name) === uniqueKey))) {
                    normalized.push({
                        assetId,
                        documentId,
                        fileName: fileName || name,
                        name,
                        type,
                        relativePath,
                        storage,
                        originalName: String(item.originalName || '').trim(),
                        previewUrl,
                        downloadUrl
                    });
                }
            });
            return normalized;
        }

        function getWorkAttachmentServerRuntimeConfig(dataKey) {
            const runtime = window.__KPI_SERVER_RUNTIME_CONFIG__?.work;
            if (!runtime || runtime.enabled !== true) return null;
            const record = typeof getWorkServerRuntimeConfig === 'function'
                ? getWorkServerRuntimeConfig(dataKey)
                : null;
            const assetConfig = runtime.assets && typeof runtime.assets === 'object' ? runtime.assets : null;
            const permissionKey = String(assetConfig?.permissionKey || record?.permissionKey || runtime.defaultPermissionKey || 'work.team_calendar').trim();
            if (!permissionKey) return null;
            return {
                enabled: true,
                apiBase: String(record?.apiBase || runtime.apiBase || '/api').trim() || '/api',
                permissionKey,
                readEnabled: assetConfig?.readEnabled === true || record?.readEnabled === true || runtime.readEnabled === true,
                writeEnabled: assetConfig?.writeEnabled === true || record?.writeEnabled === true || runtime.writeEnabled === true
            };
        }

        function readWorkAttachmentAsBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const result = String(reader.result || '');
                    const commaIndex = result.indexOf(',');
                    resolve(commaIndex >= 0 ? result.slice(commaIndex + 1) : result);
                };
                reader.onerror = () => reject(reader.error || new Error('work_attachment_read_failed'));
                reader.readAsDataURL(file);
            });
        }

        async function uploadWorkAttachmentToServer(dataKey, dateKey, file, options = {}) {
            const runtime = getWorkAttachmentServerRuntimeConfig(dataKey);
            if (!runtime || runtime.writeEnabled !== true || typeof fetch !== 'function') {
                return null;
            }
            const originalName = String(options.fileName || file?.name || 'attachment.bin').trim() || 'attachment.bin';
            const mimeType = String(file?.type || options.mimeType || '').trim() || 'application/octet-stream';
            const base64Data = await readWorkAttachmentAsBase64(file);
            const response = await fetch(`${runtime.apiBase.replace(/\/+$/, '')}/files/base64`, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    permissionKey: runtime.permissionKey,
                    ownerDomain: 'work.team_calendar',
                    ownerKey: `${String(dataKey || '').trim()}:${String(dateKey || '').trim()}`,
                    fileCategory: 'attachment',
                    originalName,
                    mimeType,
                    base64Data,
                    metadata: {
                        dataKey: String(dataKey || '').trim(),
                        dateKey: String(dateKey || '').trim(),
                        originalName: String(file?.name || originalName).trim()
                    }
                })
            });

            const payload = await response.json().catch(() => ({}));
            if (!response.ok || !payload?.ok || !payload.document?.id) {
                throw new Error(payload?.error || `http_${response.status}`);
            }

            const document = payload.document;
            return {
                documentId: String(document.id || '').trim(),
                fileName: String(document.original_name || originalName).trim(),
                name: String(document.original_name || originalName).trim(),
                type: normalizeAreaAssetType(document.mime_type || mimeType, document.original_name || originalName),
                storage: 'server',
                originalName: String(file?.name || originalName).trim(),
                previewUrl: String(document.preview_url || `/api/files/${document.id}/view`).trim(),
                downloadUrl: String(document.download_url || `/api/files/${document.id}/download`).trim()
            };
        }

        async function deleteWorkAttachmentFromServer(target) {
            const documentId = String(target?.documentId || target?.fileId || '').trim();
            if (!documentId || typeof fetch !== 'function') return false;
            const response = await fetch(`/api/files/${encodeURIComponent(documentId)}`, {
                method: 'DELETE',
                credentials: 'same-origin'
            });
            if (response.status === 404) return true;
            if (!response.ok) {
                throw new Error(`http_${response.status}`);
            }
            return true;
        }

        function getWorkAttachmentViewUrl(target) {
            const previewUrl = String(target?.previewUrl || target?.viewUrl || '').trim();
            if (previewUrl) return previewUrl;
            const documentId = String(target?.documentId || target?.fileId || '').trim();
            return documentId ? `/api/files/${encodeURIComponent(documentId)}/view` : '';
        }

        function normalizeWorkTeamCalendarDraft(entry) {
            const raw = entry && typeof entry === 'object' ? entry : {};
            return {
                title: String(raw.title || '').trim(),
                note: String(raw.note || '').replace(/\r\n/g, '\n'),
                remark: String(raw.remark || '').replace(/\r\n/g, '\n'),
                members: normalizeWorkTeamCalendarMembers(raw.members),
                attachments: normalizeWorkTeamCalendarAttachments(raw.attachments)
            };
        }

        function getWorkTeamCalendarData(dataKey) {
            const category = getWorkTeamCalendarCategory(dataKey);
            const moduleName = category ? `${category.title} 팀별내역서` : dataKey;
            return getWorkData(dataKey, moduleName);
        }

        function ensureWorkTeamCalendarEntries(dataKey) {
            const data = getWorkTeamCalendarData(dataKey);
            data.teamCalendar = data.teamCalendar || {};
            data.teamCalendar.entries = data.teamCalendar.entries || {};
            Object.keys(data.teamCalendar.entries).forEach(dateKey => {
                data.teamCalendar.entries[dateKey] = normalizeWorkTeamCalendarDraft(data.teamCalendar.entries[dateKey]);
            });
            return data.teamCalendar.entries;
        }

        function getWorkTeamCalendarDraftSnapshot(dataKey, dateKey) {
            const entries = ensureWorkTeamCalendarEntries(dataKey);
            return normalizeWorkTeamCalendarDraft(entries[dateKey]);
        }

        function ensureWorkTeamCalendarDraft(dataKey, dateKey) {
            const entries = ensureWorkTeamCalendarEntries(dataKey);
            const key = String(dateKey || '').trim();
            if (!key) return { title: '', note: '', remark: '', members: [], attachments: [] };
            entries[key] = normalizeWorkTeamCalendarDraft(entries[key]);
            if (!entries[key].title && !entries[key].note && !entries[key].remark && !entries[key].members.length && !entries[key].attachments.length) {
                entries[key] = { title: '', note: '', remark: '', members: [], attachments: [] };
            }
            return entries[key];
        }

        function cleanupWorkTeamCalendarDraft(dataKey, dateKey) {
            const entries = ensureWorkTeamCalendarEntries(dataKey);
            const key = String(dateKey || '').trim();
            if (!key || !entries[key]) return;
            const normalized = normalizeWorkTeamCalendarDraft(entries[key]);
            if (!normalized.title.trim() && !normalized.note.trim() && !normalized.remark.trim() && !normalized.members.length && !normalized.attachments.length) {
                delete entries[key];
                return;
            }
            entries[key] = normalized;
        }

        function getWorkTeamCalendarAnchorKey(dataKey, dateKey) {
            return `${dataKey}::${dateKey}`;
        }

        function getWorkTeamCalendarAnchor(dataKey, dateKey) {
            return WorkState.teamCalendarMemberAnchor[getWorkTeamCalendarAnchorKey(dataKey, dateKey)] || '';
        }

        function setWorkTeamCalendarAnchor(dataKey, dateKey, memberName) {
            const normalized = String(memberName || '').trim();
            if (!normalized || !WORK_TEAM_CALENDAR_MEMBERS.includes(normalized)) return;
            WorkState.teamCalendarMemberAnchor[getWorkTeamCalendarAnchorKey(dataKey, dateKey)] = normalized;
        }

        function getWorkTeamCalendarEditorState(dataKey) {
            if (!WorkState.teamCalendarEditor[dataKey] || typeof WorkState.teamCalendarEditor[dataKey] !== 'object') {
                WorkState.teamCalendarEditor[dataKey] = { open: false, dateKey: '', x: 18, y: 18, manual: false };
            }
            const state = WorkState.teamCalendarEditor[dataKey];
            if (!Number.isFinite(state.x)) state.x = 18;
            if (!Number.isFinite(state.y)) state.y = 18;
            state.open = !!state.open;
            state.dateKey = String(state.dateKey || '').trim();
            state.manual = !!state.manual;
            return state;
        }

        function isWorkTeamCalendarEditorOpen(dataKey, dateKey = '') {
            const state = getWorkTeamCalendarEditorState(dataKey);
            if (!state.open) return false;
            const requested = String(dateKey || '').trim();
            return !requested || state.dateKey === requested;
        }

        function resetWorkTeamCalendarEditorPosition(dataKey) {
            const state = getWorkTeamCalendarEditorState(dataKey);
            state.x = 18;
            state.y = 18;
        }

        function hasWorkTeamCalendarExplicitDateSelection(dataKey) {
            return !!WorkState.teamCalendarDatePicked[dataKey];
        }

        function setWorkTeamCalendarExplicitDateSelection(dataKey, selected) {
            WorkState.teamCalendarDatePicked[dataKey] = !!selected;
        }

        function normalizeWorkTeamCalendarDateKeys(list, monthKey = '') {
            const normalizedMonth = monthKey ? clampWorkTeamCalendarMonthKey(monthKey) : '';
            const todayKey = formatDateKey(new Date());
            const normalized = [];
            (Array.isArray(list) ? list : []).forEach(value => {
                const dateKey = String(value || '').trim();
                if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return;
                if (normalizedMonth && dateKey.slice(0, 7) !== normalizedMonth) return;
                if (isWorkTeamCalendarDateLocked(dateKey, todayKey)) return;
                if (!normalized.includes(dateKey)) normalized.push(dateKey);
            });
            normalized.sort();
            return normalized;
        }

        function getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey = '') {
            const normalizedMonth = monthKey ? clampWorkTeamCalendarMonthKey(monthKey) : '';
            const nextDates = normalizeWorkTeamCalendarDateKeys(WorkState.teamCalendarSelectedDates[dataKey], normalizedMonth);
            if (!arraysEqual(WorkState.teamCalendarSelectedDates[dataKey], nextDates)) {
                WorkState.teamCalendarSelectedDates[dataKey] = nextDates;
            }
            return nextDates;
        }

        function setWorkTeamCalendarSelectedDateKeys(dataKey, dateKeys, monthKey = '') {
            const normalizedMonth = monthKey ? clampWorkTeamCalendarMonthKey(monthKey) : '';
            const nextDates = normalizeWorkTeamCalendarDateKeys(dateKeys, normalizedMonth);
            WorkState.teamCalendarSelectedDates[dataKey] = nextDates;
            return nextDates;
        }

        function getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey) {
            const selectedDates = getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
            const focusedDate = getWorkTeamCalendarSelectedDate(dataKey, monthKey);
            const currentDate = String(WorkState.teamCalendarDate[dataKey] || '').trim();
            if (selectedDates.includes(currentDate)) return currentDate;
            return selectedDates[0] || focusedDate;
        }

        function getWorkTeamCalendarEditorDateKeys(dataKey, monthKey) {
            return getWorkTeamCalendarSelectedDateKeys(dataKey, monthKey);
        }

        function getWorkTeamCalendarSelectionLabel(dateKeys, primaryDateKey = '') {
            const list = normalizeWorkTeamCalendarDateKeys(dateKeys);
            if (!list.length) return '날짜 미선택';
            if (list.length === 1) return formatWorkTeamCalendarDateLabel(list[0]);
            const anchor = list.includes(primaryDateKey) ? primaryDateKey : list[0];
            return `${formatWorkTeamCalendarDateLabel(anchor)} 외 ${list.length - 1}일`;
        }

        function getWorkTeamCalendarSelectionSummary(dateKeys) {
            const list = normalizeWorkTeamCalendarDateKeys(dateKeys);
            if (!list.length) return '날짜를 선택하세요. Ctrl+클릭으로 여러 날짜를 함께 선택할 수 있습니다.';
            if (list.length === 1) return '';
            return `${list.length}일 선택 · 작업자, 제목, 작업내역, 비고는 선택한 날짜에 일괄 저장됩니다. 첨부파일은 각 날짜별로 각각 저장됩니다.`;
        }

        function arraysEqual(left, right) {
            const a = Array.isArray(left) ? left : [];
            const b = Array.isArray(right) ? right : [];
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i += 1) {
                if (a[i] !== b[i]) return false;
            }
            return true;
        }
