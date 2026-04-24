        function renderWorkTeamCalendarSelectedMembersHtml(members) {
            const list = Array.isArray(members) ? members : [];
            if (!list.length) {
                return '<span class="work-team-calendar-selected-empty">담당자 미선택</span>';
            }
            return list.map(name => `<span class="work-team-calendar-selected-chip">${escapeHtml(name)}</span>`).join('');
        }

        function getWorkTeamCalendarDraftForDates(dataKey, dateKeys) {
            const list = normalizeWorkTeamCalendarDateKeys(dateKeys);
            if (!list.length) {
                return { title: '', note: '', remark: '', members: [], attachments: [] };
            }
            if (list.length === 1) {
                return getWorkTeamCalendarDraftSnapshot(dataKey, list[0]);
            }
            const drafts = list.map(dateKey => getWorkTeamCalendarDraftSnapshot(dataKey, dateKey));
            const base = drafts[0];
            return {
                title: drafts.every(draft => draft.title === base.title) ? base.title : '',
                note: drafts.every(draft => draft.note === base.note) ? base.note : '',
                remark: drafts.every(draft => draft.remark === base.remark) ? base.remark : '',
                members: drafts.every(draft => arraysEqual(draft.members, base.members)) ? base.members.slice() : [],
                attachments: []
            };
        }

        function renderWorkTeamCalendarAttachmentListHtml(attachments, options = {}) {
            if (options.batch === true) {
                return '<span class="work-team-calendar-attachment-empty">여러 날짜 선택 중에는 새 첨부만 일괄 추가됩니다. 기존 첨부 확인과 삭제는 단일 날짜 선택에서 가능합니다.</span>';
            }
            const list = normalizeWorkTeamCalendarAttachments(attachments);
            if (!list.length) {
                return '<span class="work-team-calendar-attachment-empty">첨부 파일이 없습니다.</span>';
            }
            return list.map(item => {
                const lowerName = String(item.name || '').toLowerCase();
                const ext = lowerName.includes('.') ? lowerName.split('.').pop() : (item.type || 'file');
                const refKey = encodeURIComponent(String(item.documentId || item.assetId || item.fileName || item.relativePath || ''));
                const locationText = item.storage === 'server'
                    ? '중앙 서버'
                    : (item.relativePath || '브라우저 저장소');
                return `
                    <div class="work-team-calendar-attachment-item">
                        <div class="work-team-calendar-attachment-main">
                            <span class="work-team-calendar-attachment-name">${escapeHtml(item.name)}</span>
                            <span class="work-team-calendar-attachment-meta">${escapeHtml(String(ext || 'file').toUpperCase())} · ${escapeHtml(locationText)}</span>
                        </div>
                        <div class="work-team-calendar-attachment-actions">
                            <button type="button" class="work-team-calendar-attachment-btn" onclick="openWorkTeamCalendarAttachment('${refKey}')"><i class="fas fa-up-right-from-square"></i>열기</button>
                            <button type="button" class="work-team-calendar-attachment-btn" onclick="removeWorkTeamCalendarAttachment('${refKey}')"><i class="fas fa-trash-can"></i>삭제</button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        let workEntryHandleDbPromise = null;

        function openWorkEntryHandleDb() {
            if (!('indexedDB' in window)) return Promise.resolve(null);
            if (workEntryHandleDbPromise) return workEntryHandleDbPromise;
            workEntryHandleDbPromise = new Promise((resolve, reject) => {
                const request = window.indexedDB.open(WORK_ENTRY_HANDLE_DB_NAME, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    if (!db.objectStoreNames.contains(WORK_ENTRY_HANDLE_STORE_NAME)) {
                        db.createObjectStore(WORK_ENTRY_HANDLE_STORE_NAME, { keyPath: 'id' });
                    }
                };
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error || new Error('work entry handle db open failed'));
            }).catch(error => {
                console.error('작업내역 폴더 핸들 저장소 초기화 실패:', error);
                workEntryHandleDbPromise = null;
                return null;
            });
            return workEntryHandleDbPromise;
        }

        async function getStoredWorkEntryRootHandle() {
            const db = await openWorkEntryHandleDb();
            if (!db) return null;
            return new Promise((resolve, reject) => {
                const tx = db.transaction(WORK_ENTRY_HANDLE_STORE_NAME, 'readonly');
                const request = tx.objectStore(WORK_ENTRY_HANDLE_STORE_NAME).get('root');
                request.onsuccess = () => resolve(request.result?.handle || null);
                request.onerror = () => reject(request.error || new Error('work entry root get failed'));
            }).catch(error => {
                console.error('작업내역 루트 핸들 조회 실패:', error);
                return null;
            });
        }

        async function setStoredWorkEntryRootHandle(handle) {
            const db = await openWorkEntryHandleDb();
            if (!db) return false;
            return new Promise((resolve, reject) => {
                const tx = db.transaction(WORK_ENTRY_HANDLE_STORE_NAME, 'readwrite');
                tx.objectStore(WORK_ENTRY_HANDLE_STORE_NAME).put({ id: 'root', handle, updatedAt: new Date().toISOString() });
                tx.oncomplete = () => resolve(true);
                tx.onerror = () => reject(tx.error || new Error('work entry root put failed'));
            }).catch(error => {
                console.error('작업내역 루트 핸들 저장 실패:', error);
                return false;
            });
        }

        async function verifyWorkEntryHandlePermission(handle, readWrite = false) {
            if (!handle) return false;
            const options = readWrite ? { mode: 'readwrite' } : {};
            try {
                if (typeof handle.queryPermission === 'function') {
                    const queried = await handle.queryPermission(options);
                    if (queried === 'granted') return true;
                }
                if (typeof handle.requestPermission === 'function') {
                    const requested = await handle.requestPermission(options);
                    return requested === 'granted';
                }
                return true;
            } catch (error) {
                return false;
            }
        }

        async function getWorkEntryRootHandle(options = {}) {
            let handle = await getStoredWorkEntryRootHandle();
            if (handle && await verifyWorkEntryHandlePermission(handle, true)) {
                return handle;
            }
            if (options.prompt !== true) return null;
            if (!('showDirectoryPicker' in window)) {
                throw new Error('현재 브라우저는 폴더 직접 저장을 지원하지 않습니다.');
            }
            alert('처음 한 번 현재 3월 작업 폴더를 선택하면, 그 안의 작업내역 폴더에 자동 저장됩니다.');
            handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'kpi-work-entry-root' });
            if (!handle || !await verifyWorkEntryHandlePermission(handle, true)) {
                throw new Error('작업내역 폴더에 대한 쓰기 권한이 필요합니다.');
            }
            await setStoredWorkEntryRootHandle(handle);
            return handle;
        }

        async function getWorkEntryFolderHandle(options = {}) {
            const rootHandle = await getWorkEntryRootHandle(options);
            if (!rootHandle) return null;
            return rootHandle.getDirectoryHandle(WORK_ENTRY_FOLDER_NAME, { create: true });
        }

        async function refreshWorkTeamCalendarStorageStatus(modal) {
            const targetModal = modal || document.getElementById('work-team-calendar-modal');
            if (!targetModal) return;
            const statusEl = targetModal.querySelector('[data-work-team-storage-status]');
            const buttonEl = targetModal.querySelector('[data-work-team-connect-btn]');
            if (!statusEl && !buttonEl) return;
            const dataKey = String(WorkState.teamCalendarModal || '').trim();
            const serverRuntime = getWorkAttachmentServerRuntimeConfig(dataKey);
            if (serverRuntime && (serverRuntime.readEnabled === true || serverRuntime.writeEnabled === true)) {
                WorkState.workEntryRootConnected = true;
                if (statusEl) {
                    statusEl.textContent = '중앙 서버 저장 사용 중';
                    statusEl.classList.add('is-connected');
                }
                if (buttonEl) {
                    buttonEl.innerHTML = '<i class="fas fa-server"></i>중앙 서버 저장';
                    buttonEl.disabled = true;
                    buttonEl.title = '현재 서버 주소로 연 KPI에서는 첨부파일이 중앙 서버에 저장됩니다.';
                }
                return;
            }
            let connected = false;
            try {
                const handle = await getStoredWorkEntryRootHandle();
                connected = !!(handle && await verifyWorkEntryHandlePermission(handle, true));
            } catch (error) {
                connected = false;
            }
            WorkState.workEntryRootConnected = connected;
            if (statusEl) {
                statusEl.textContent = connected ? '현재 3월 폴더 연결됨' : '최초 1회 폴더 연결 필요';
                statusEl.classList.toggle('is-connected', connected);
            }
            if (buttonEl) {
                buttonEl.disabled = false;
                buttonEl.title = '';
                buttonEl.innerHTML = connected
                    ? '<i class="fas fa-rotate-right"></i>폴더 다시 연결'
                    : '<i class="fas fa-link"></i>작업내역 폴더 연결';
            }
        }

        async function connectWorkEntryFolderFromCalendar() {
            const dataKey = String(WorkState.teamCalendarModal || '').trim();
            const serverRuntime = getWorkAttachmentServerRuntimeConfig(dataKey);
            if (serverRuntime && serverRuntime.writeEnabled === true) {
                WorkState.workEntryRootConnected = true;
                await refreshWorkTeamCalendarStorageStatus();
                alert('현재 작업내역 첨부는 중앙 서버 저장을 사용합니다.');
                return;
            }
            try {
                await getWorkEntryFolderHandle({ prompt: true });
                WorkState.workEntryRootConnected = true;
                await refreshWorkTeamCalendarStorageStatus();
                alert('현재 3월 폴더 연결을 저장했습니다. 이후에는 첨부 시 작업내역 폴더에 바로 저장됩니다.');
            } catch (error) {
                alert(`폴더 연결 실패: ${error?.message || '알 수 없는 오류'}`);
            }
        }

        async function ensureUniqueWorkEntryFileName(folderHandle, requestedName) {
            const rawName = String(requestedName || '').trim();
            if (!folderHandle || !rawName) return rawName;
            const match = /^(.*?)(\.[^.]+)?$/.exec(rawName) || [];
            const base = match[1] || '첨부파일';
            const ext = match[2] || '';
            let attempt = 0;
            while (attempt < 200) {
                const candidate = attempt === 0 ? `${base}${ext}` : `${base} (${attempt})${ext}`;
                try {
                    await folderHandle.getFileHandle(candidate, { create: false });
                    attempt += 1;
                } catch (error) {
                    return candidate;
                }
            }
            return `${base}_${Date.now()}${ext}`;
        }

        function findWorkTeamCalendarAttachment(draft, refKey) {
            const decoded = decodeURIComponent(String(refKey || ''));
            return normalizeWorkTeamCalendarAttachments(draft.attachments).find(item => {
                return item.documentId === decoded || item.assetId === decoded || item.fileName === decoded || item.relativePath === decoded;
            }) || null;
        }

        function syncWorkTeamCalendarDraftUi(dataKey, dateKey) {
            const modal = document.getElementById('work-team-calendar-modal');
            if (!modal || !modal.classList.contains('is-open')) return;
            if (WorkState.teamCalendarModal !== dataKey) return;
            const currentMonth = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDateKeys = getWorkTeamCalendarEditorDateKeys(dataKey, currentMonth);
            const primaryDateKey = getWorkTeamCalendarPrimarySelectedDate(dataKey, currentMonth);
            if (dateKey && selectedDateKeys.length === 1 && primaryDateKey !== dateKey) return;
            const category = getWorkTeamCalendarCategory(dataKey);
            const draft = getWorkTeamCalendarDraftForDates(dataKey, selectedDateKeys);
            const isBatchSelection = selectedDateKeys.length > 1;
            const selectedSet = new Set(draft.members);
            modal.querySelectorAll('[data-work-team-member-name]').forEach(button => {
                const name = button.getAttribute('data-work-team-member-name') || '';
                const isActive = selectedSet.has(name);
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
            });
            const countEl = modal.querySelector('[data-work-team-member-count]');
            if (countEl) countEl.textContent = getWorkTeamCalendarMemberCountLabel(draft.members.length);
            const listEl = modal.querySelector('[data-work-team-selected-list]');
            if (listEl) listEl.innerHTML = renderWorkTeamCalendarSelectedMembersHtml(draft.members);
            const attachmentListEl = modal.querySelector('[data-work-team-attachment-list]');
            if (attachmentListEl) attachmentListEl.innerHTML = renderWorkTeamCalendarAttachmentListHtml(draft.attachments, { batch: isBatchSelection });
            const titlePreviewEl = modal.querySelector('[data-work-team-title-preview]');
            if (titlePreviewEl) titlePreviewEl.textContent = buildWorkTeamCalendarEntryTitle(primaryDateKey, draft.title);
            const filePreviewEl = modal.querySelector('[data-work-team-file-preview]');
            if (filePreviewEl) filePreviewEl.textContent = getWorkTeamCalendarAttachmentPreviewLabel(primaryDateKey, draft.title);
        }

        function updateWorkTeamCalendarDraftField(fieldName, value) {
            const dataKey = WorkState.teamCalendarModal;
            if (!dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const dateKeys = getWorkTeamCalendarEditorDateKeys(dataKey, monthKey);
            if (!dateKeys.length) return;
            const field = String(fieldName || '').trim();
            if (!['title', 'note', 'remark'].includes(field)) return;
            const nextValue = field === 'title'
                ? String(value || '').trim()
                : String(value || '').replace(/\r\n/g, '\n');
            const data = getWorkTeamCalendarData(dataKey);
            let changed = false;
            dateKeys.forEach(dateKey => {
                if (isWorkTeamCalendarDateLocked(dateKey)) return;
                const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
                if (String(currentDraft[field] || '') === nextValue) return;
                const draft = ensureWorkTeamCalendarDraft(dataKey, dateKey);
                draft[field] = nextValue;
                cleanupWorkTeamCalendarDraft(dataKey, dateKey);
                changed = true;
            });
            if (!changed) return;
            saveWorkData(dataKey, data);
            syncWorkTeamCalendarDraftUi(dataKey, getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey));
            const category = getWorkTeamCalendarCategory(dataKey);
            setLastModified(category?.title || AppData?.work?.name || '팀별내역서');
        }

        function updateWorkTeamCalendarTitle(value) {
            updateWorkTeamCalendarDraftField('title', value);
        }

        function updateWorkTeamCalendarNote(value) {
            updateWorkTeamCalendarDraftField('note', value);
        }

        function updateWorkTeamCalendarRemark(value) {
            updateWorkTeamCalendarDraftField('remark', value);
        }

        function getWorkTeamCalendarNavigationTarget(dateKey, step, todayKey = formatDateKey(new Date())) {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
            if (!match) return '';
            const baseDate = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
            baseDate.setDate(baseDate.getDate() + Number(step || 0));
            const nextKey = formatDateKey(baseDate);
            const minKey = `${WORK_TEAM_CALENDAR_RANGE.start}-01`;
            if (nextKey < minKey) return '';
            if (nextKey > todayKey) return '';
            if (nextKey.slice(0, 7) > WORK_TEAM_CALENDAR_RANGE.end) return '';
            return nextKey;
        }

        function getWorkTeamCalendarArrowState(dataKey, selectedDate, step, todayKey = formatDateKey(new Date())) {
            const selectedDateKeys = getWorkTeamCalendarSelectedDateKeys(dataKey, String(selectedDate || '').slice(0, 7));
            if (hasWorkTeamCalendarExplicitDateSelection(dataKey) && selectedDateKeys.length === 1) {
                const target = getWorkTeamCalendarNavigationTarget(selectedDate, step, todayKey);
                return {
                    disabled: !target,
                    label: step < 0 ? '이전 날짜' : '다음 날짜'
                };
            }
            const currentMonth = getWorkTeamCalendarActiveMonth(dataKey);
            return {
                disabled: step < 0 ? currentMonth === WORK_TEAM_CALENDAR_RANGE.start : currentMonth === WORK_TEAM_CALENDAR_RANGE.end,
                label: step < 0 ? '이전 달' : '다음 달'
            };
        }

        function syncWorkTeamCalendarArrowUi(dataKey) {
            const modal = document.getElementById('work-team-calendar-modal');
            if (!modal || !modal.classList.contains('is-open') || WorkState.teamCalendarModal !== dataKey) return;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const selectedDate = getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey);
            const todayKey = formatDateKey(new Date());
            modal.querySelectorAll('[data-work-team-arrow-step]').forEach(button => {
                const step = Number(button.getAttribute('data-work-team-arrow-step') || '0');
                if (!step) return;
                const arrowState = getWorkTeamCalendarArrowState(dataKey, selectedDate, step, todayKey);
                button.disabled = !!arrowState.disabled;
                button.setAttribute('aria-label', arrowState.label);
            });
        }

        function applyWorkTeamCalendarMembers(dataKey, dateKey, members, options = {}) {
            if (isWorkTeamCalendarDateLocked(dateKey)) return false;
            const nextMembers = normalizeWorkTeamCalendarMembers(members);
            const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
            if (arraysEqual(currentDraft.members, nextMembers)) return false;
            const data = getWorkTeamCalendarData(dataKey);
            const draft = ensureWorkTeamCalendarDraft(dataKey, dateKey);
            draft.members = nextMembers;
            cleanupWorkTeamCalendarDraft(dataKey, dateKey);
            saveWorkData(dataKey, data);
            syncWorkTeamCalendarDraftUi(dataKey, dateKey);
            if (options.markModified !== false) {
                const category = getWorkTeamCalendarCategory(dataKey);
                setLastModified(category?.title || AppData?.work?.name || '팀별내역서');
            }
            if (options.render === true) {
                renderWorkTeamCalendarModal();
            }
            return true;
        }

        function applyWorkTeamCalendarMembersToDates(dataKey, dateKeys, members, options = {}) {
            const targets = normalizeWorkTeamCalendarDateKeys(dateKeys);
            if (!targets.length) return false;
            const nextMembers = normalizeWorkTeamCalendarMembers(members);
            const data = getWorkTeamCalendarData(dataKey);
            let changed = false;
            targets.forEach(dateKey => {
                if (isWorkTeamCalendarDateLocked(dateKey)) return;
                const currentDraft = getWorkTeamCalendarDraftSnapshot(dataKey, dateKey);
                if (arraysEqual(currentDraft.members, nextMembers)) return;
                const draft = ensureWorkTeamCalendarDraft(dataKey, dateKey);
                draft.members = nextMembers;
                cleanupWorkTeamCalendarDraft(dataKey, dateKey);
                changed = true;
            });
            if (!changed) return false;
            saveWorkData(dataKey, data);
            syncWorkTeamCalendarDraftUi(dataKey, getWorkTeamCalendarPrimarySelectedDate(dataKey, getWorkTeamCalendarActiveMonth(dataKey)));
            if (options.markModified !== false) {
                const category = getWorkTeamCalendarCategory(dataKey);
                setLastModified(category?.title || AppData?.work?.name || '팀별내역서');
            }
            if (options.render === true) {
                renderWorkTeamCalendarModal();
            }
            return true;
        }

        function toggleWorkTeamCalendarMember(memberName, options = {}) {
            const dataKey = options.dataKey || WorkState.teamCalendarModal;
            if (!dataKey) return false;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const dateKeys = options.dateKeys || getWorkTeamCalendarEditorDateKeys(dataKey, monthKey);
            if (!dateKeys.length) return false;
            const primaryDateKey = options.dateKey || getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey);
            const draft = getWorkTeamCalendarDraftForDates(dataKey, dateKeys);
            const nextMembers = draft.members.includes(memberName)
                ? draft.members.filter(name => name !== memberName)
                : [...draft.members, memberName];
            const changed = applyWorkTeamCalendarMembersToDates(dataKey, dateKeys, nextMembers, {
                markModified: options.markModified !== false,
                render: options.render === true
            });
            setWorkTeamCalendarAnchor(dataKey, primaryDateKey, memberName);
            return changed;
        }
