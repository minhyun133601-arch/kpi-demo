        function selectWorkTeamCalendarSingle(memberName, options = {}) {
            const dataKey = options.dataKey || WorkState.teamCalendarModal;
            if (!dataKey) return false;
            const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
            const dateKeys = options.dateKeys || getWorkTeamCalendarEditorDateKeys(dataKey, monthKey);
            if (!dateKeys.length) return false;
            const primaryDateKey = options.dateKey || getWorkTeamCalendarPrimarySelectedDate(dataKey, monthKey);
            const draft = getWorkTeamCalendarDraftForDates(dataKey, dateKeys);
            const nextMembers = draft.members.length === 1 && draft.members[0] === memberName ? [] : [memberName];
            const changed = applyWorkTeamCalendarMembersToDates(dataKey, dateKeys, nextMembers, {
                markModified: options.markModified !== false,
                render: options.render === true
            });
            if (nextMembers.length) {
                setWorkTeamCalendarAnchor(dataKey, primaryDateKey, memberName);
            }
            return changed;
        }

        function selectWorkTeamCalendarRange(memberName, options = {}) {
            return selectWorkTeamCalendarSingle(memberName, options);
        }

        function selectWorkTeamCalendarDraggedMembers(dataKey, dateKey, members, options = {}) {
            const normalizedMembers = normalizeWorkTeamCalendarMembers(members);
            if (!normalizedMembers.length) return false;
            return applyWorkTeamCalendarMembers(dataKey, dateKey, normalizedMembers, options);
        }

        function formatWorkTeamCalendarDateLabel(dateKey) {
            const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateKey || ''));
            if (!match) return '-';
            const year = Number(match[1]);
            const month = Number(match[2]);
            const day = Number(match[3]);
            const date = new Date(year, month - 1, day);
            const weekday = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0'][date.getDay()];
            return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} (${weekday})`;
        }

        function getWorkTeamCalendarCategories() {
            return typeof getWorkTeamCalendarCategoryList === 'function'
                ? getWorkTeamCalendarCategoryList()
                : (AppData?.work?.categories || []).filter(cat => cat.view === 'team_calendar');
        }

        function getWorkTeamCalendarCategory(dataKey) {
            return getWorkTeamCalendarCategories().find(cat => cat.dataKey === dataKey) || null;
        }

        function getWorkTeamCalendarCategoryIndex(dataKey) {
            return getWorkTeamCalendarCategories().findIndex(cat => cat.dataKey === dataKey);
        }

        function formatWorkTeamCalendarMonthOptionLabel(monthKey) {
            const parsed = parseMonthKey(monthKey);
            if (!parsed) return monthKey || '';
            return `${parsed.year}.${String(parsed.monthIndex + 1).padStart(2, '0')}`;
        }

        function formatWorkTeamCalendarMonthShortLabel(monthKey) {
            const parsed = parseMonthKey(monthKey);
            if (!parsed) return monthKey || '';
            return String(parsed.monthIndex + 1).padStart(2, '0') + '\uC6D4';
        }

        function getWorkTeamCalendarYearOptions() {
            return Array.from(new Set(getWorkTeamCalendarMonthOptions().map(key => key.slice(0, 4))));
        }

        function getWorkTeamCalendarMonthOptionsForYear(year) {
            const yearText = String(year || '').trim();
            return getWorkTeamCalendarMonthOptions().filter(key => key.startsWith(`${yearText}-`));
        }

        function renderWorkTeamCalendarGlyph(type, size = 'md') {
            const visual = String(type || '').trim() || 'dry';
            let svg = '';
            if (visual === 'stick') {
                svg = `
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="11" y="14" width="16" height="36" rx="7" stroke="currentColor" stroke-width="3"/>
                        <rect x="37" y="10" width="16" height="40" rx="7" stroke="currentColor" stroke-width="3"/>
                        <path d="M15 24H23" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M41 20H49" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M41 28H49" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M15 32H23" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="32" cy="48" r="4" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2"/>
                    </svg>
                `;
            } else if (visual === 'liquid') {
                svg = `
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M26 11H38V18L42 22V48C42 52.418 38.418 56 34 56H30C25.582 56 22 52.418 22 48V22L26 18V11Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
                        <path d="M28 28H36" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M32 30C36.418 35.042 38 37.653 38 40.5C38 43.538 35.538 46 32.5 46C29.462 46 27 43.538 27 40.5C27 37.653 28.582 35.042 32 30Z" fill="currentColor" fill-opacity="0.22" stroke="currentColor" stroke-width="2"/>
                    </svg>
                `;
            } else {
                svg = `
                    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="16" y="10" width="32" height="44" rx="10" stroke="currentColor" stroke-width="3"/>
                        <path d="M21 22H43" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <path d="M22 42C26 35 38 35 42 42" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
                        <circle cx="27" cy="33" r="2.5" fill="currentColor"/>
                        <circle cx="36" cy="30" r="2" fill="currentColor" fill-opacity="0.55"/>
                        <circle cx="40" cy="36" r="1.8" fill="currentColor" fill-opacity="0.55"/>
                    </svg>
                `;
            }
            return `<span class="work-team-glyph is-${escapeHtml(size)}" aria-hidden="true">${svg}</span>`;
        }

        function getWorkTeamCalendarDialog() {
            return document.querySelector('#work-team-calendar-modal .work-team-calendar-dialog');
        }

        function getWorkTeamCalendarFullscreenTarget() {
            return document.getElementById('work-team-calendar-modal');
        }

        function getWorkTeamCalendarFullscreenIconSvg(isActive = false) {
            if (isActive) {
                return `
                    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9.5 4.5v4h-4" />
                        <path d="M14.5 4.5v4h4" />
                        <path d="M9.5 19.5v-4h-4" />
                        <path d="M14.5 19.5v-4h4" />
                    </svg>
                `;
            }
            return `
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 4.5H4.5V8" />
                    <path d="M16 4.5h3.5V8" />
                    <path d="M8 19.5H4.5V16" />
                    <path d="M16 19.5h3.5V16" />
                </svg>
            `;
        }

        function isWorkTeamCalendarFullscreen(target = getWorkTeamCalendarFullscreenTarget()) {
            return !!target && document.fullscreenElement === target;
        }

        function getWorkTeamCalendarFullscreenLabel(isActive = isWorkTeamCalendarFullscreen()) {
            return isActive ? '\uC804\uCCB4\uD654\uBA74 \uD574\uC81C' : '\uC804\uCCB4\uD654\uBA74';
        }

        function syncWorkTeamCalendarFullscreenUi() {
            const modal = getWorkTeamCalendarFullscreenTarget();
            const dialog = getWorkTeamCalendarDialog();
            const isActive = isWorkTeamCalendarFullscreen(modal);
            if (modal) {
                modal.classList.toggle('is-browser-fullscreen', isActive);
            }
            if (dialog) {
                dialog.classList.toggle('is-browser-fullscreen', isActive);
            }
            document.querySelectorAll('[data-action="work-team-calendar-toggle-fullscreen"]').forEach(button => {
                const label = getWorkTeamCalendarFullscreenLabel(isActive);
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                button.setAttribute('aria-label', label);
                button.setAttribute('title', label);
                const icon = button.querySelector('[data-work-team-fullscreen-icon]');
                if (icon) {
                    icon.innerHTML = getWorkTeamCalendarFullscreenIconSvg(isActive);
                }
            });
        }

        async function exitWorkTeamCalendarFullscreen() {
            if (!isWorkTeamCalendarFullscreen()) return;
            try {
                await document.exitFullscreen?.();
            } catch (error) {
                console.warn('[KPI work team calendar] fullscreen exit failed', error);
            } finally {
                syncWorkTeamCalendarFullscreenUi();
            }
        }

        async function toggleWorkTeamCalendarFullscreen() {
            const target = getWorkTeamCalendarFullscreenTarget();
            if (!target) return;
            if (isWorkTeamCalendarFullscreen(target)) {
                await exitWorkTeamCalendarFullscreen();
                return;
            }
            if (typeof target.requestFullscreen !== 'function') {
                showToast('이 브라우저에서는 전체화면 기능을 지원하지 않습니다.');
                return;
            }
            try {
                if (document.fullscreenElement && document.fullscreenElement !== target) {
                    await document.exitFullscreen?.();
                }
                await target.requestFullscreen();
            } catch (error) {
                console.warn('[KPI work team calendar] fullscreen toggle failed', error);
                showToast('전체화면 전환에 실패했습니다.');
            } finally {
                syncWorkTeamCalendarFullscreenUi();
            }
        }

        function ensureWorkTeamCalendarModal() {
            ensureWorkTeamCalendarDateRolloverWatcher();
            let modal = document.getElementById('work-team-calendar-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'work-team-calendar-modal';
            modal.className = 'work-team-calendar-modal';
            modal.addEventListener('click', event => {
                if (event.target === modal) return;
            });
            if (!window.__workTeamCalendarEscBound) {
                window.__workTeamCalendarEscBound = true;
                document.addEventListener('keydown', event => {
                    if (!document.getElementById('work-team-calendar-modal')?.classList.contains('is-open')) return;
                    if (event.key === 'Escape') {
                        if (isWorkTeamCalendarFullscreen()) {
                            event.preventDefault();
                            event.stopPropagation();
                            void exitWorkTeamCalendarFullscreen();
                            return;
                        }
                        event.preventDefault();
                        event.stopPropagation();
                        const dataKey = WorkState.teamCalendarModal;
                        if (!dataKey) return;
                        if (closeWorkTeamCalendarUtilityPopup(dataKey, { render: false })) {
                            renderWorkTeamCalendarModal();
                            return;
                        }
                        const cleared = clearWorkTeamCalendarSelection(dataKey, { render: false });
                        if (cleared) {
                            renderWorkTeamCalendarModal();
                        } else if (!isWorkTeamCalendarInlineMode()) {
                            closeWorkTeamCalendarModal();
                        }
                        return;
                    }
                    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
                    if (isEditableTarget(event.target)) return;
                    if (event.key >= '1' && event.key <= '9') {
                        if (switchWorkTeamCalendarTeamByNumber(event.key)) {
                            event.preventDefault();
                        }
                    } else if (event.key === 'Delete') {
                        event.preventDefault();
                        void deleteWorkTeamCalendarSelectedEntries();
                    } else if (event.key === 'ArrowLeft') {
                        event.preventDefault();
                        workTeamCalendarNavigateArrow(-1);
                    } else if (event.key === 'ArrowRight') {
                        event.preventDefault();
                        workTeamCalendarNavigateArrow(1);
                    } else if (event.key === 'ArrowUp') {
                        event.preventDefault();
                        workTeamCalendarNavigateArrow(-7);
                    } else if (event.key === 'ArrowDown') {
                        event.preventDefault();
                        workTeamCalendarNavigateArrow(7);
                    }
                });
            }
            if (!window.__workTeamCalendarFullscreenBound) {
                window.__workTeamCalendarFullscreenBound = true;
                document.addEventListener('fullscreenchange', () => {
                    syncWorkTeamCalendarFullscreenUi();
                });
            }
            document.body.appendChild(modal);
            return modal;
        }

        function getWorkTeamCalendarInlineHost() {
            return document.getElementById('work-team-calendar-inline-host');
        }

        function isWorkTeamCalendarInlineMode() {
            return WorkState.teamCalendarInline === true && !!getWorkTeamCalendarInlineHost();
        }

        function mountWorkTeamCalendarSurface(options = {}) {
            const modal = ensureWorkTeamCalendarModal();
            const inline = options.inline === true;
            const inlineHost = inline ? getWorkTeamCalendarInlineHost() : null;
            if (inline && inlineHost) {
                if (modal.parentElement !== inlineHost) {
                    inlineHost.appendChild(modal);
                }
                modal.classList.add('is-inline');
                WorkState.teamCalendarInline = true;
                return modal;
            }
            if (modal.parentElement !== document.body) {
                document.body.appendChild(modal);
            }
            modal.classList.remove('is-inline');
            WorkState.teamCalendarInline = false;
            return modal;
        }

        function syncWorkTeamCalendarInlineIndex(activeDataKey = '') {
            document.querySelectorAll('[data-work-team-index-key]').forEach(button => {
                const isActive = String(button.getAttribute('data-work-team-index-key') || '').trim() === String(activeDataKey || '').trim();
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-current', isActive ? 'page' : 'false');
            });
        }

        function getWorkTeamCalendarUtilityPopupMetric(dataKey = WorkState.teamCalendarModal) {
            const raw = String(WorkState.teamCalendarUtilityPopup?.[dataKey] || '').trim().toLowerCase();
            return ['electric', 'gas', 'work'].includes(raw) ? raw : '';
        }

        function closeWorkTeamCalendarUtilityPopup(dataKey = WorkState.teamCalendarModal, options = {}) {
            if (!dataKey || !WorkState.teamCalendarUtilityPopup) return false;
            const hadPopup = !!WorkState.teamCalendarUtilityPopup[dataKey];
            WorkState.teamCalendarUtilityPopup[dataKey] = '';
            if (hadPopup && options.render !== false) {
                renderWorkTeamCalendarModal();
            }
            return hadPopup;
        }

        function openWorkTeamCalendarUtilityPopup(metricKey, options = {}) {
            const dataKey = options.dataKey || WorkState.teamCalendarModal;
            if (!dataKey) return false;
            const normalizedMetric = String(metricKey || '').trim().toLowerCase();
            const isOverviewCalendar = typeof isWorkTeamCalendarOverview === 'function'
                ? isWorkTeamCalendarOverview(dataKey)
                : false;
            const allowedMetrics = isOverviewCalendar ? ['electric', 'gas', 'work'] : ['work'];
            if (!allowedMetrics.includes(normalizedMetric)) return false;
            if (!normalizedMetric) return false;
            const currentMetric = getWorkTeamCalendarUtilityPopupMetric(dataKey);
            const nextMetric = currentMetric === normalizedMetric ? '' : normalizedMetric;
            WorkState.teamCalendarUtilityPopup[dataKey] = nextMetric;
            if (nextMetric) {
                const monthKey = getWorkTeamCalendarActiveMonth(dataKey);
                const state = getWorkTeamCalendarEditorState(dataKey);
                state.open = false;
                state.dateKey = '';
                state.manual = false;
                WorkState.teamCalendarDate[dataKey] = '';
                setWorkTeamCalendarSelectedDateKeys(dataKey, [], monthKey);
                setWorkTeamCalendarExplicitDateSelection(dataKey, false);
            }
            if (options.render !== false) {
                renderWorkTeamCalendarModal();
            }
            return !!nextMetric;
        }
        // Team calendar selection, editor, attachment, and render flows are split into sibling runtime files.

        function getMonthlyFilterState(dataKey) {
            if (!WorkState.monthFilters[dataKey]) {
                const current = getCurrentMonthKey();
                WorkState.monthFilters[dataKey] = { startMonth: current, endMonth: current, team: '', room: '', owner: '', keyword: '' };
            }
            return WorkState.monthFilters[dataKey];
        }

        function updateMonthlyFilter(dataKey, field, value) {
            const filter = getMonthlyFilterState(dataKey);
            filter[field] = value;
            if (field === 'startMonth' || field === 'endMonth') {
                const normalized = normalizeMonthRange(filter.startMonth, filter.endMonth);
                filter.startMonth = normalized.start;
                filter.endMonth = normalized.end;
                WorkState.activeMonth[dataKey] = filter.startMonth;
            }
            if (field === 'team') {
                const rooms = value ? getEquipRooms(value) : [];
                if (!rooms.length || !rooms.includes(filter.room)) {
                    filter.room = '';
                }
            }
            const category = getWorkCategory(dataKey);
            if (category) renderWorkContent(category);
        }

        function clearMonthlyFilter(dataKey) {
            const current = getCurrentMonthKey();
            WorkState.monthFilters[dataKey] = { startMonth: current, endMonth: current, team: '', room: '', owner: '', keyword: '' };
            const category = getWorkCategory(dataKey);
            if (category) renderWorkContent(category);
        }

        function entryMatchesFilter(entry, filter) {
            if (filter.team && normalizeWorkTeamName(entry.team) !== normalizeWorkTeamName(filter.team)) return false;
            if (filter.room && entry.room !== filter.room) return false;
            if (filter.owner && entry.owner !== filter.owner) return false;
            if (filter.keyword) {
                const hay = `${entry.team || ''} ${entry.room || ''} ${entry.task || ''} ${entry.owner || ''}`.toLowerCase();
                if (!hay.includes(filter.keyword.toLowerCase())) return false;
            }
            return true;
        }

        function getWorkOwners() {
            const categories = typeof getWorkAllCategories === 'function'
                ? getWorkAllCategories()
                : (AppData?.work?.categories || []);
            return categories
                .filter(cat => cat.dataKey && cat.dataKey !== 'work_monthly_plan')
                .map(cat => cat.title);
        }
