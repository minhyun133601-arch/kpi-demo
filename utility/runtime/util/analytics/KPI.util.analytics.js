        function runUtilAnalytics(block) {
            const dataset = UTIL_ANALYTICS_DATASETS[block.dataset.utilAnalytics];
            if (!dataset) return;
            const entries = dataset.entries || [];
            const resultEl = block.querySelector('[data-role="result"]');
            const fromVal = block.querySelector('[data-role="from"]')?.value;
            const toVal = block.querySelector('[data-role="to"]')?.value;
            const teamVal = block.querySelector('[data-role="team"]')?.value;
            const metricVal = block.querySelector('[data-role="metric"]')?.value;
            const scaleVal = parseFloat(block.querySelector('[data-role="scale"]')?.value || '1');
            if (!fromVal || !toVal || !metricVal) {
                block._utilResult = null;
                return null;
            }

            const from = parseUtilMonthValue(fromVal);
            const to = parseUtilMonthValue(toVal);
            if (!from || !to) return;
            const fromKey = from.year * 12 + from.month;
            const toKey = to.year * 12 + to.month;
            const minKey = Math.min(fromKey, toKey);
            const maxKey = Math.max(fromKey, toKey);
            const filtered = entries.filter(entry => {
                const entryKey = entry.year * 12 + entry.month;
                if (entryKey < minKey || entryKey > maxKey) return false;
                if (teamVal && teamVal !== 'all' && entry.team !== teamVal) return false;
                return true;
            });

            const values = filtered.map(entry => entry[metricVal]).filter(val => Number.isFinite(val));
            if (!values.length) {
                resultEl.innerHTML = `<span class="text-slate-500">해당 기간에 데이터가 없습니다.</span>`;
                block._utilResult = null;
                return null;
            }
            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const metricLabel = dataset.metrics.find(metric => metric.key === metricVal)?.label || metricVal;
            const teamLabel = teamVal === 'all' ? '전체' : teamVal;
            const scaledSum = scaleVal ? sum / scaleVal : sum;
            const scaledAvg = scaleVal ? avg / scaleVal : avg;
            resultEl.innerHTML = `
                <span class="util-analytics-tag"><i class="fa-solid fa-calendar-days"></i>${fromVal} ~ ${toVal}</span>
                <span class="util-analytics-tag"><i class="fa-solid fa-people-group"></i>${teamLabel}</span>
                <span class="util-analytics-tag"><i class="fa-solid fa-filter"></i>${metricLabel}</span>
                <span class="util-analytics-tag"><i class="fa-solid fa-list"></i>${values.length}건</span>
                <span class="util-analytics-value">합계: ${formatUtilNumber(scaledSum, decimalsVal)}</span>
                <span class="util-analytics-value">평균: ${formatUtilNumber(scaledAvg, decimalsVal)}</span>
            `;

            const sorted = [...filtered].sort((a, b) => {
                const keyA = a.year * 12 + a.month;
                const keyB = b.year * 12 + b.month;
                if (keyA !== keyB) return keyA - keyB;
                return String(a.team || '').localeCompare(String(b.team || ''), 'ko');
            });

            const result = {
                datasetKey: block.dataset.utilAnalytics,
                datasetLabel: dataset.label,
                metricKey: metricVal,
                metricLabel,
                from: fromVal,
                to: toVal,
                team: teamLabel,
                scale: scaleVal,
                decimals: decimalsVal,
                count: values.length,
                sum,
                avg,
                entries: sorted
            };
            block._utilResult = result;
            return result;
        }

        function initUtilAnalytics(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-analytics]').forEach(block => {
                const key = block.dataset.utilAnalytics;
                const dataset = UTIL_ANALYTICS_DATASETS[key];
                if (!dataset) return;
                const entries = dataset.entries || [];
                const months = buildUtilMonthOptions(entries);
                const teams = buildUtilTeamOptions(entries);
                const metrics = dataset.metrics || [];
                const hasData = months.length && teams.length && metrics.length;

                block.innerHTML = `
                    <div class="util-analytics-header">
                        <i class="fa-solid fa-chart-column"></i>
                        기간별 합계 · 평균 분석
                    </div>
                    <div class="util-analytics-desc">${dataset.label} 항목을 기간/팀/항목 기준으로 집계합니다.</div>
                    <div class="util-analytics-form">
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">기간</span>
                            <div class="util-analytics-range">
                                <select class="util-analytics-select" data-role="from" ${hasData ? '' : 'disabled'}></select>
                                <span class="util-analytics-divider">~</span>
                                <select class="util-analytics-select" data-role="to" ${hasData ? '' : 'disabled'}></select>
                            </div>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">팀</span>
                            <select class="util-analytics-select" data-role="team" ${hasData ? '' : 'disabled'}></select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">항목</span>
                            <select class="util-analytics-select" data-role="metric" ${hasData ? '' : 'disabled'}></select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">단위</span>
                            <div class="util-analytics-inline">
                                <span class="util-analytics-inline-symbol">÷</span>
                                <select class="util-analytics-select util-analytics-select-compact" data-role="scale" ${hasData ? '' : 'disabled'}>
                                    <option value="1">1</option>
                                    <option value="10">10</option>
                                    <option value="100">100</option>
                                    <option value="1000">1,000</option>
                                    <option value="10000">10,000</option>
                                </select>
                                <span class="util-analytics-inline-symbol">소수</span>
                                <select class="util-analytics-select util-analytics-select-compact" data-role="decimals" ${hasData ? '' : 'disabled'}>
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                </select>
                            </div>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">작업</span>
                            <div class="util-analytics-actions">
                                <button type="button" class="work-btn primary" data-role="run" ${hasData ? '' : 'disabled'}>
                                    <i class="fa-solid fa-magnifying-glass"></i> 검색
                                </button>
                                <button type="button" class="work-btn" data-role="print" ${hasData ? '' : 'disabled'}>
                                    <i class="fa-solid fa-print"></i> 인쇄
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="util-analytics-result" data-role="result">
                        ${hasData ? '<span class="text-slate-500">조건을 선택하고 검색을 눌러주세요.</span>' : '데이터가 아직 없습니다.'}
                    </div>
                `;

                if (!hasData) return;
                const fromSelect = block.querySelector('[data-role="from"]');
                const toSelect = block.querySelector('[data-role="to"]');
                const teamSelect = block.querySelector('[data-role="team"]');
                const metricSelect = block.querySelector('[data-role="metric"]');
                const runButton = block.querySelector('[data-role="run"]');
                const printButton = block.querySelector('[data-role="print"]');

                const monthOptions = months.map(month => `<option value="${month.value}">${month.label}</option>`).join('');
                fromSelect.innerHTML = monthOptions;
                toSelect.innerHTML = monthOptions;
                fromSelect.value = months[0].value;
                toSelect.value = months[months.length - 1].value;

                teamSelect.innerHTML = `<option value="all">전체</option>` + teams.map(team => `<option value="${team}">${team}</option>`).join('');
                metricSelect.innerHTML = metrics.map(metric => `<option value="${metric.key}">${metric.label}</option>`).join('');

                runButton.addEventListener('click', () => runUtilAnalytics(block));
                printButton?.addEventListener('click', () => {
                    const result = block._utilResult || runUtilAnalytics(block);
                    if (result) printUtilAnalytics(result);
                });
            });
        }

        function initUtilTabs(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-tabs]').forEach(block => {
                const buttons = Array.from(block.querySelectorAll('[data-tab]'));
                const panels = Array.from(block.querySelectorAll('[data-panel]'));
                if (!buttons.length || !panels.length) return;
                const defaultKey = block.dataset.utilTabs || buttons[0].dataset.tab;
                const activate = (key) => {
                    buttons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === key));
                    panels.forEach(panel => panel.classList.toggle('active', panel.dataset.panel === key));
                    const activePanel = panels.find(panel => panel.dataset.panel === key);
                    applyUtilConversion(activePanel);
                };
                activate(defaultKey);
                buttons.forEach(btn => {
                    btn.addEventListener('click', () => activate(btn.dataset.tab));
                });
                block.querySelectorAll('.util-convert-select').forEach(select => {
                    select.addEventListener('change', () => {
                        const panel = select.closest('.util-tab-panel');
                        applyUtilConversion(panel);
                    });
                });
            });
        }

        function initUtilAnalyticsRepeaters(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-role="util-analytics-list"]').forEach(list => {
                const stack = list.closest('.util-graph-stack');
                const addBtn = stack?.querySelector('[data-role="add-analytics"]');
                if (!addBtn) return;
                const updateState = () => {
                    const count = list.querySelectorAll('[data-util-analytics-unified]').length;
                    addBtn.disabled = count >= 4;
                };
                addBtn.addEventListener('click', () => {
                    const count = list.querySelectorAll('[data-util-analytics-unified]').length;
                    if (count >= 4) return;
                    const block = document.createElement('div');
                    block.className = 'util-analytics';
                    block.setAttribute('data-util-analytics-unified', '');
                    block.dataset.closable = 'true';
                    list.appendChild(block);
                    initUnifiedUtilAnalytics(block);
                    updateUtilGraphToggleVisibility(list);
                    updateState();
                });
                updateState();
                updateUtilAnalyticsAddState(list);
            });
        }

        function closeAllAuditActionMenus() {
            document.querySelectorAll('.audit-action-menu.open').forEach(el => el.classList.remove('open'));
        }

        function toggleAuditMenuById(id, evt) {
            if (evt) evt.stopPropagation();
            const el = document.getElementById(id);
            if (!el) return;
            const isOpen = el.classList.contains('open');
            closeAllAuditActionMenus();
            if (!isOpen) el.classList.add('open');
        }

        function editAuditEntry(dataKey, index) {
            const data = getAuditData(dataKey);
            if (!data.entries || index < 0 || index >= data.entries.length) return;
            const entry = data.entries[index];
            const entryForm = getAuditEntryFormState(dataKey);
            entryForm.year = entry.year;
            entryForm.quarter = entry.quarter;
            entryForm.team = entry.team || '';
            entryForm.note = entry.note || '';
            if (String(dataKey || '').trim() === 'audit_lux') {
                entryForm.room = '';
                entryForm.type = '';
                entryForm.value = '';
                entryForm.editIndex = null;
                entryForm.batchActive = true;
                entryForm.batchValues = {};
                entryForm.batchFocusKey = typeof makeAuditLuxBatchRowKey === 'function'
                    ? makeAuditLuxBatchRowKey(entry.team, entry.room, entry.type)
                    : '';
                entryForm.batchShouldFocus = true;
            } else {
                entryForm.room = entry.room || '';
                entryForm.type = entry.type || '';
                entryForm.value = entry.value || '';
                AuditState.entryForm[dataKey].editIndex = index;
            }
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function toggleAuditStandards(dataKey) {
            const wrap = document.querySelector(`[data-audit-standards="${dataKey}"]`);
            if (!wrap) return;
            const collapsed = wrap.classList.toggle('is-collapsed');
            AuditState.standardsOpen[dataKey] = !collapsed;
            const label = wrap.querySelector('.audit-standards-toggle span');
            if (label) label.textContent = collapsed ? '기준 보기' : '기준 접기';
        }

        function printAuditLux(dataKey) {
            const report = AuditState.printCache[dataKey];
            if (!report) return;
            const { range, total, filters, rows } = report;
            const filterText = [
                filters?.team ? `팀: ${filters.team}` : '팀: 전체',
                filters?.room ? `실: ${filters.room}` : '실: 전체',
                filters?.startQuarter ? `시작: ${filters.startQuarter}` : '',
                filters?.endQuarter ? `종료: ${filters.endQuarter}` : ''
            ].filter(Boolean);
            const tableRows = rows.length ? rows.map(entry => {
                const key = makeQuarterKey(entry.year, entry.quarter);
                return `
                    <tr>
                        <td>${escapeHtml(key)}</td>
                        <td>${escapeHtml(entry.team || '')}</td>
                        <td>${escapeHtml(entry.room || '')}</td>
                        <td>${escapeHtml(entry.type || '')}</td>
                        <td>${escapeHtml(entry.value || '')}</td>
                        <td>${escapeHtml(entry.note || '')}</td>
                    </tr>
                `;
            }).join('') : `
                <tr>
                    <td colspan="6">해당 기간에 표시할 데이터가 없습니다.</td>
                </tr>
            `;
            const sheet = document.getElementById('print-sheet');
            sheet.setAttribute('data-mode', 'audit');
            sheet.innerHTML = `
                <div class="print-header">
                    <div>
                        <div class="print-title">조도(Lux) 분기별 기록</div>
                        <div class="print-meta">기간: ${range} · 총 ${total}건</div>
                    </div>
                    <div class="print-meta">${new Date().toISOString().slice(0, 10)}</div>
                </div>
                <div class="print-summary">
                    ${filterText.map(item => `<span>${escapeHtml(item)}</span>`).join('')}
                    <span>단위: Lux</span>
                </div>
                <table class="print-table">
                    <thead>
                        <tr>
                            <th class="print-col-date">분기</th>
                            <th class="print-col-team">팀</th>
                            <th class="print-col-room">실</th>
                            <th class="print-col-owner">분류</th>
                            <th class="print-col-task">값 (Lux)</th>
                            <th class="print-col-task">특이사항</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            `;
            document.documentElement.classList.add('printing');
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.documentElement.classList.remove('printing');
                }, 500);
            }, 100);
        }

        function collectEntriesByDateRange(startKey, endKey) {
            const start = parseMonthKey(startKey);
            const end = parseMonthKey(endKey);
            if (!start || !end) return {};
            let year = start.year;
            let monthIndex = start.monthIndex;
            const endIndex = end.year * 12 + end.monthIndex;
            const entriesByDate = {};
            while (year * 12 + monthIndex <= endIndex) {
                const monthEntries = collectMonthlyEntries(year, monthIndex);
                Object.entries(monthEntries).forEach(([dateKey, entries]) => {
                    entriesByDate[dateKey] = (entriesByDate[dateKey] || []).concat(entries);
                });
                monthIndex += 1;
                if (monthIndex > 11) {
                    monthIndex = 0;
                    year += 1;
                }
            }
            return entriesByDate;
        }

        function collectMonthlyEntries(year, monthIndex) {
            const entriesByDate = {};
            const categories = typeof getWorkAllCategories === 'function'
                ? getWorkAllCategories()
                : (AppData?.work?.categories || []);
            const workCategories = categories.filter(cat => cat.dataKey && cat.dataKey !== 'work_monthly_plan');
            workCategories.forEach(cat => {
                const data = getWorkData(cat.dataKey, cat.title);
                (data.weeks || []).forEach(week => {
                    const weekStart = getWeekStartDate(week.year, week.week);
                    WORK_DAY_KEYS.forEach((dayKey, idx) => {
                        const date = new Date(weekStart.getTime());
                        date.setDate(weekStart.getDate() + idx);
                        if (date.getFullYear() !== year || date.getMonth() !== monthIndex) return;
                        const dayEntries = normalizeDayEntries(week.days ? week.days[dayKey] : []);
                        const meaningfulEntries = dayEntries.filter(entry => entry.team || entry.room || entry.task);
                        if (!meaningfulEntries.length) return;
                        const dateKey = formatDateKey(date);
                        entriesByDate[dateKey] = entriesByDate[dateKey] || [];
                        meaningfulEntries.forEach(entry => {
                            entriesByDate[dateKey].push({
                                team: normalizeWorkTeamName(entry.team),
                                room: entry.room,
                                task: entry.task,
                                owner: cat.title
                            });
                        });
                    });
                });
            });
            return entriesByDate;
        }

        function getWorkCategory(dataKey) {
            if (typeof getWorkCategoryByDataKey === 'function') {
                return getWorkCategoryByDataKey(dataKey);
            }
            return AppData?.work?.categories?.find(cat => cat.dataKey === dataKey) || null;
        }

        const WorkServerWriteQueue = {};

        function cloneWorkDataPayload(value) {
            return JSON.parse(JSON.stringify(value || {}));
        }

        function getWorkSaveStatusRegistry() {
            if (typeof WorkSaveStatusState !== 'undefined') return WorkSaveStatusState;
            window.__KPI_WORK_SAVE_STATUS_STATE__ = window.__KPI_WORK_SAVE_STATUS_STATE__ || {};
            return window.__KPI_WORK_SAVE_STATUS_STATE__;
        }

        function getWorkSaveStatus(dataKey) {
            const key = String(dataKey || '').trim();
            const registry = getWorkSaveStatusRegistry();
            const stored = registry[key] || {};
            const state = String(stored.state || 'idle').trim() || 'idle';
            return {
                state,
                message: String(stored.message || '').trim(),
                updatedAt: String(stored.updatedAt || '').trim(),
                token: stored.token || ''
            };
        }

        function formatWorkSaveStatusTime(value) {
            const parsed = value ? new Date(value) : null;
            if (!parsed || Number.isNaN(parsed.getTime())) return '';
            return parsed.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
        }

        function escapeWorkSaveHtml(value) {
            if (typeof escapeHtml === 'function') return escapeHtml(value);
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getWorkSaveStatusText(dataKey) {
            const status = getWorkSaveStatus(dataKey);
            if (status.message) return status.message;
            if (status.state === 'pending') return '자동 저장 중...';
            if (status.state === 'saved') {
                const timeText = formatWorkSaveStatusTime(status.updatedAt);
                return timeText ? `서버 저장됨 ${timeText}` : '서버 저장됨';
            }
            if (status.state === 'failed') return '서버 저장 실패 - 다음 입력 때 다시 시도됩니다.';
            if (status.state === 'blocked') return '서버 저장 불가';
            return '';
        }

        function setWorkSaveStatus(dataKey, state, message = '', token = null) {
            const key = String(dataKey || '').trim();
            if (!key) return null;
            const registry = getWorkSaveStatusRegistry();
            const previous = registry[key] || {};
            if (token !== null && previous.token && previous.token !== token) {
                return previous;
            }
            registry[key] = {
                ...previous,
                state: String(state || 'idle').trim() || 'idle',
                message: String(message || '').trim(),
                updatedAt: new Date().toISOString(),
                token: token !== null ? token : (previous.token || '')
            };
            syncWorkSaveStatusUi(key);
            return registry[key];
        }

        function syncWorkSaveStatusUi(dataKey) {
            const key = String(dataKey || '').trim();
            if (!key || typeof document === 'undefined' || !document?.querySelectorAll) return;
            const status = getWorkSaveStatus(key);
            const text = getWorkSaveStatusText(key);
            document.querySelectorAll('[data-work-save-status]').forEach((element) => {
                if (String(element.getAttribute('data-work-save-status') || '').trim() !== key) return;
                element.textContent = text;
                element.title = text;
                ['idle', 'pending', 'saved', 'failed', 'blocked'].forEach(item => {
                    element.classList.remove(`is-${item}`);
                });
                element.classList.add(`is-${status.state}`);
            });
        }

        function renderWorkSaveStatusBadge(dataKey) {
            const key = String(dataKey || '').trim();
            const status = getWorkSaveStatus(key);
            const text = getWorkSaveStatusText(key);
            return `<span class="work-autosave work-save-status is-${escapeWorkSaveHtml(status.state)}" data-work-save-status="${escapeWorkSaveHtml(key)}" title="${escapeWorkSaveHtml(text)}">${escapeWorkSaveHtml(text)}</span>`;
        }

        function trackWorkSaveResult(dataKey, result, token) {
            if (result && typeof result.then === 'function') {
                return result.then((saved) => {
                    if (saved === true) {
                        setWorkSaveStatus(dataKey, 'saved', '', token);
                    } else {
                        setWorkSaveStatus(dataKey, 'failed', '서버 저장 실패 - 다음 입력 때 다시 시도됩니다.', token);
                    }
                    return saved;
                }).catch((error) => {
                    console.warn('[kpi] work save tracking failed', dataKey, error);
                    setWorkSaveStatus(dataKey, 'failed', '서버 저장 실패 - 다음 입력 때 다시 시도됩니다.', token);
                    return false;
                });
            }
            if (result === true) {
                setWorkSaveStatus(dataKey, 'saved', '', token);
                return true;
            }
            setWorkSaveStatus(dataKey, 'blocked', '서버 저장 불가', token);
            return false;
        }

        async function saveWorkDataConfirmed(dataKey, data, options = {}) {
            const saved = await Promise.resolve(saveWorkData(dataKey, data));
            if (saved !== true) {
                throw new Error(String(options.message || 'work_server_write_failed'));
            }
            return true;
        }

        function isWorkTeamCalendarDataKey(dataKey) {
            return /^work_team_calendar_/.test(String(dataKey || '').trim());
        }

        function getWorkServerRuntimeConfig(dataKey) {
            const runtime = window.__KPI_SERVER_RUNTIME_CONFIG__?.work;
            if (!runtime || runtime.enabled !== true) return null;
            const normalizedKey = String(dataKey || '').trim();
            const records = runtime.records && typeof runtime.records === 'object'
                ? runtime.records
                : null;
            const record = records ? records[normalizedKey] : null;
            if (!record) return null;
            const permissionMap = runtime.permissionKeyByDataKey || {};
            return {
                apiBase: record.apiBase || runtime.apiBase || '/api',
                moduleKey: record.moduleKey || runtime.moduleKey || (isWorkTeamCalendarDataKey(normalizedKey) ? 'work_runtime' : 'portal_data'),
                recordKey: record.recordKey || normalizedKey,
                permissionKey: record.permissionKey || permissionMap[normalizedKey] || runtime.defaultPermissionKey || 'work.team_calendar',
                readEnabled: record.readEnabled === true,
                writeEnabled: record.writeEnabled === true
            };
        }

        function syncWorkPortalDataCache(dataKey, data) {
            window.PortalData = window.PortalData || {};
            window.PortalData[dataKey] = cloneWorkDataPayload(data);
        }

        function queueWorkServerWrite(dataKey, data) {
            const runtime = getWorkServerRuntimeConfig(dataKey);
            if (!(window.KpiRuntime?.canUseServerWrite?.(runtime?.writeEnabled === true))) return Promise.resolve(false);

            const queueState = WorkServerWriteQueue[dataKey] || (WorkServerWriteQueue[dataKey] = {
                timer: null,
                payload: null,
                flushPromise: Promise.resolve(true),
                writeChain: Promise.resolve(true)
            });
            queueState.payload = cloneWorkDataPayload(data);

            if (queueState.timer) {
                clearTimeout(queueState.timer);
            }

            queueState.flushPromise = new Promise((resolve) => {
                queueState.timer = setTimeout(() => {
                    const payload = cloneWorkDataPayload(queueState.payload);
                    queueState.timer = null;
                    queueState.writeChain = Promise.resolve(queueState.writeChain)
                        .catch(() => false)
                        .then(async () => {
                            try {
                                const response = await fetch(`${runtime.apiBase}/modules/${encodeURIComponent(runtime.moduleKey)}/records/${encodeURIComponent(runtime.recordKey || dataKey)}`, {
                                    method: 'PUT',
                                    credentials: 'same-origin',
                                    headers: {
                                        'Content-Type': 'application/json'
                                    },
                                    body: JSON.stringify({
                                        permissionKey: runtime.permissionKey,
                                        payload
                                    })
                                });

                                if (!response.ok) {
                                    throw new Error(`http_${response.status}`);
                                }

                                const result = await response.json();
                                if (result?.record?.payload) {
                                    syncWorkPortalDataCache(dataKey, result.record.payload);
                                    WorkCache[dataKey] = result.record.payload;
                                }
                                window.__KPI_WORK_SAVE_LAST_ERROR__ = null;
                                return true;
                            } catch (error) {
                                window.__KPI_WORK_SAVE_LAST_ERROR__ = {
                                    dataKey,
                                    message: String(error?.message || 'work_server_write_failed'),
                                    savedAt: new Date().toISOString()
                                };
                                console.warn('[kpi] work server write failed', dataKey, error);
                                return false;
                            }
                        });
                    queueState.writeChain.then(resolve);
                }, 250);
            });

            return queueState.flushPromise;
        }

        function waitForWorkServerWrite(dataKey) {
            const queueState = WorkServerWriteQueue[dataKey];
            if (!queueState) return Promise.resolve(true);
            if (queueState.timer) return queueState.flushPromise || Promise.resolve(true);
            return queueState.writeChain || Promise.resolve(true);
        }

        function getWorkData(dataKey, moduleName) {
            if (WorkCache[dataKey]) return WorkCache[dataKey];
            let data = null;
            const serverRuntime = getWorkServerRuntimeConfig(dataKey);
            const serverReadBlocked = !!(serverRuntime && serverRuntime.readEnabled !== true);
            const hasServerPayload = !!(serverRuntime && serverRuntime.readEnabled === true && window.PortalData && Object.prototype.hasOwnProperty.call(window.PortalData, dataKey));

            if (hasServerPayload) {
                data = cloneWorkDataPayload(window.PortalData[dataKey]);
            }
            if (!data && !serverReadBlocked && window.PortalData && window.PortalData[dataKey]) {
                data = cloneWorkDataPayload(window.PortalData[dataKey]);
            }
            if (!data) {
                data = {
                    meta: {
                        moduleKey: dataKey,
                        moduleName: moduleName || dataKey,
                        version: 1,
                        updatedAt: new Date().toISOString()
                    },
                    weeks: []
                };
            }
            data.weeks = data.weeks || [];
            normalizeWorkData(data);
            WorkCache[dataKey] = data;
            return data;
        }

        function saveWorkData(dataKey, data) {
            const serverRuntime = getWorkServerRuntimeConfig(dataKey);
            if (!(window.KpiRuntime?.canUseServerWrite?.(serverRuntime?.writeEnabled === true))) {
                setWorkSaveStatus(dataKey, 'blocked', '서버 저장 불가');
                return false;
            }
            data.meta = data.meta || {};
            data.meta.updatedAt = new Date().toISOString();
            WorkCache[dataKey] = data;
            syncWorkPortalDataCache(dataKey, data);
            const token = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            setWorkSaveStatus(dataKey, 'pending', '자동 저장 중...', token);
            return trackWorkSaveResult(dataKey, queueWorkServerWrite(dataKey, data), token);
        }

        function normalizeWorkData(data) {
            (data.weeks || []).forEach(week => {
                if (!week.days) week.days = {};
                WORK_DAY_KEYS.forEach(dayKey => {
                    const normalized = normalizeDayEntries(week.days[dayKey] || []);
                    week.days[dayKey] = normalized;
                });
            });
        }

        function ensureWeek(data, year, week) {
            data.weeks = data.weeks || [];
            const exists = data.weeks.some(w => w.year === year && w.week === week);
            if (!exists) {
                const days = {};
                WORK_DAY_KEYS.forEach(key => {
                    days[key] = { team: '', room: '', task: '' };
                });
                data.weeks.push({ year, week, days });
                data.weeks.sort((a, b) => (a.year - b.year) || (a.week - b.week));
            }
        }

        function normalizeDayEntry(entry) {
            if (!entry || typeof entry !== 'object') {
                return { team: '', room: '', task: entry ? String(entry) : '' };
            }
            return {
                team: entry.team || '',
                room: entry.room || '',
                task: entry.task || ''
            };
        }

        function normalizeDayEntries(entry) {
            if (!entry) return [];
            if (Array.isArray(entry)) {
                return entry.map(item => normalizeDayEntry(item));
            }
            if (typeof entry === 'object') {
                return [normalizeDayEntry(entry)];
            }
            const single = normalizeDayEntry(entry);
            return (single.task || '').trim() ? [single] : [];
        }

        function ensureWeeksUpToCurrent(data, year, currentWeek) {
            for (let w = 1; w <= currentWeek; w += 1) {
                ensureWeek(data, year, w);
            }
        }

        function ensureMonthly(data) {
            data.monthly = data.monthly || {};
            data.monthly.entries = data.monthly.entries || {};
            return data.monthly;
        }

        function getMonthMatrix(year, monthIndex) {
            const first = new Date(year, monthIndex, 1);
            const firstDay = (first.getDay() + 6) % 7; // Monday = 0
            const start = new Date(first);
            start.setDate(first.getDate() - firstDay);
            const days = [];
            for (let i = 0; i < 42; i++) {
                const date = new Date(start);
                date.setDate(start.getDate() + i);
                days.push(date);
            }
            return days;
        }
