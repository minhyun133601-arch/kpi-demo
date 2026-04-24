        // ----------------------------------------------------------------
        // [작업내역 로컬 데이터/주차 처리]
        // ----------------------------------------------------------------
        const WorkCache = {};
        const WorkState = { activeWeek: {}, activeMonth: {}, activeDate: {}, monthFilters: {}, monthReportCache: {}, teamCalendarMonth: {}, teamCalendarSharedMonth: '', teamCalendarDate: {}, teamCalendarSharedDate: '', teamCalendarSelectedDates: {}, teamCalendarEditor: {}, teamCalendarDatePicked: {}, teamCalendarModal: '', teamCalendarHubDataKey: '', teamCalendarInline: false, teamCalendarMemberAnchor: {}, teamCalendarGasMode: {}, teamCalendarUtilityPopup: {}, teamCalendarMode: 'detail', workEntryRootConnected: false };
        const WORK_DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const WORK_DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
        const WORK_DAY_COLORS = ['#2563eb', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#8b5cf6', '#0ea5e9'];
        const WORK_TEAM_CALENDAR_MODE_DETAIL = 'detail';
        const WORK_TEAM_CALENDAR_MODE_PROCESS = 'process';
        const WORK_TEAM_CALENDAR_MODE_GROUP = 'group';
        const WORK_TEAM_CALENDAR_MODE_ORDER = Object.freeze([
            WORK_TEAM_CALENDAR_MODE_DETAIL,
            WORK_TEAM_CALENDAR_MODE_PROCESS,
            WORK_TEAM_CALENDAR_MODE_GROUP
        ]);
        const WORK_TEAM_CALENDAR_PROCESS_DRY_KEY = 'work_team_calendar_process_dry';
        const WORK_TEAM_CALENDAR_PROCESS_STICK_KEY = 'work_team_calendar_process_stick';
        const WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY = 'work_team_calendar_process_liquid';
        const WORK_TEAM_CALENDAR_GROUP_PLANT_B_KEY = 'work_team_calendar_group_plantB';
        const WORK_TEAM_CALENDAR_GROUP_PLANT_A_KEY = 'work_team_calendar_group_plantA';
        const WORK_TEAM_CALENDAR_PROCESS_KEYS = Object.freeze([
            WORK_TEAM_CALENDAR_PROCESS_DRY_KEY,
            WORK_TEAM_CALENDAR_PROCESS_STICK_KEY,
            WORK_TEAM_CALENDAR_PROCESS_LIQUID_KEY
        ]);
        const WORK_TEAM_CALENDAR_DETAIL_KEYS = Object.freeze([
            'work_team_calendar_team1_part1',
            'work_team_calendar_team1_part2',
            'work_team_calendar_team2',
            'work_team_calendar_team3',
            'work_team_calendar_team4'
        ]);
        const WORK_TEAM_CALENDAR_BASE_RANGE = Object.freeze({ start: '2024-01', minimumEnd: '2026-03' });
        const WORK_TEAM_CALENDAR_RANGE = Object.freeze({
            start: WORK_TEAM_CALENDAR_BASE_RANGE.start,
            get end() {
                return getWorkTeamCalendarEndMonth();
            }
        });
        const WORK_TEAM_CALENDAR_MEMBERS = ['Operator A', 'Operator B', 'Operator C', 'Operator D', 'Operator E', 'Operator F', 'Operator G'];
        const WORK_ENTRY_FOLDER_NAME = '작업내역';
        const WORK_ENTRY_HANDLE_DB_NAME = 'kpi-work-entry-folder-db';
        const WORK_ENTRY_HANDLE_STORE_NAME = 'handles';

        function makeWeekKey(year, week) {
            return `${year}-W${String(week).padStart(2, '0')}`;
        }

        function parseWeekKey(key) {
            const match = /^(\d{4})-W(\d{2})$/.exec(key || '');
            if (!match) return null;
            return { year: parseInt(match[1], 10), week: parseInt(match[2], 10) };
        }

        function getISOWeekInfo(date) {
            const d = new Date(date.getTime());
            d.setHours(0, 0, 0, 0);
            const day = (d.getDay() + 6) % 7; // Monday = 0
            d.setDate(d.getDate() - day + 3); // Thursday
            const isoYear = d.getFullYear();
            const firstThursday = new Date(isoYear, 0, 4);
            const firstDay = (firstThursday.getDay() + 6) % 7;
            firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
            const week = 1 + Math.round((d - firstThursday) / 604800000);
            const monday = getWeekStartDate(isoYear, week);
            return { year: isoYear, week, monday };
        }

        function getWeekStartDate(year, week) {
            const simple = new Date(year, 0, 4 + (week - 1) * 7);
            const day = (simple.getDay() + 6) % 7; // Monday = 0
            simple.setDate(simple.getDate() - day);
            simple.setHours(0, 0, 0, 0);
            return simple;
        }

        function formatDate(date) {
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            return `${mm}.${dd}`;
        }

        function formatWeekRange(startDate) {
            const end = new Date(startDate.getTime());
            end.setDate(end.getDate() + 6);
            return `${formatDate(startDate)}(${WORK_DAY_LABELS[0]}) ~ ${formatDate(end)}(${WORK_DAY_LABELS[6]})`;
        }

        function formatMonthLabel(year, monthIndex) {
            return `${year}년 ${monthIndex + 1}월`;
        }

        function formatDateKey(date) {
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }

        const LAST_MODIFIED_KEY = 'portal:lastModified';

        function setLastModified(tabName) {
            const payload = {
                date: new Date().toISOString().slice(0, 10),
                tab: tabName || ''
            };
            localStorage.setItem(LAST_MODIFIED_KEY, JSON.stringify(payload));
            renderLastModified();
        }

        function getLastModified() {
            const stored = localStorage.getItem(LAST_MODIFIED_KEY);
            if (!stored) return null;
            try {
                return JSON.parse(stored);
            } catch (err) {
                return null;
            }
        }

        function renderLastModified() {
            const el = document.getElementById('last-modified-text');
            if (!el) return;
            const info = getLastModified();
            if (!info || !info.date) {
                el.textContent = '최종 수정: -';
                return;
            }
            const tabLabel = info.tab ? ` · ${info.tab}` : '';
            el.textContent = `최종 수정: ${info.date}${tabLabel}`;
        }

        function escapeHtml(value) {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function escapeJs(value) {
            return String(value || '')
                .replace(/\\/g, '\\\\')
                .replace(/'/g, "\\'");
        }

        function buildSelectOptions(list, selectedValue, placeholder) {
            const safePlaceholder = escapeHtml(placeholder || '선택');
            const options = [`<option value="">${safePlaceholder}</option>`];
            (list || []).forEach(item => {
                const safe = escapeHtml(item);
                const selected = item === selectedValue ? 'selected' : '';
                options.push(`<option value="${safe}" ${selected}>${safe}</option>`);
            });
            return options.join('');
        }

        function getEquipTeams() {
            const source = Array.isArray(AppData?.equip?.teamCategories) && AppData.equip.teamCategories.length
                ? AppData.equip.teamCategories
                : (AppData?.equip?.categories || []);
            return source.map(cat => cat.title);
        }

        const WORK_TEAM_TOP = 'Plant A';
        const WORK_TEAM_ETC = '그 외';

        function normalizeWorkTeamName(teamName) {
            const name = String(teamName || '').trim();
            if (!name) return '';
            if (name === WORK_TEAM_ETC || name === '그외') return WORK_TEAM_ETC;
            if (name.includes('Plant A')) return WORK_TEAM_TOP;
            if (name.includes('Plant B')) return 'Plant B';
            return name;
        }

        function getWorkTeamOptions() {
            const base = getEquipTeams().map(team => normalizeWorkTeamName(team)).filter(Boolean);
            const unique = [];
            base.forEach(team => {
                if (!unique.includes(team)) unique.push(team);
            });
            const middle = unique.filter(team => team !== WORK_TEAM_TOP && team !== WORK_TEAM_ETC);
            return [WORK_TEAM_TOP, ...middle, WORK_TEAM_ETC];
        }

        function resolveEquipCategoryByTeam(team) {
            const categories = Array.isArray(AppData?.equip?.teamCategories) && AppData.equip.teamCategories.length
                ? AppData.equip.teamCategories
                : (AppData?.equip?.categories || []);
            const normalized = normalizeWorkTeamName(team);
            return categories.find(cat => (
                cat.title === team || normalizeWorkTeamName(cat.title) === normalized
            )) || null;
        }

        function getEquipRooms(team) {
            const cat = resolveEquipCategoryByTeam(team);
            return cat?.rooms || [];
        }

        function getEquipIconInfo(team) {
            const normalized = normalizeWorkTeamName(team);
            if (normalized === WORK_TEAM_ETC) {
                return {
                    icon: 'fa-ellipsis',
                    color: '#64748b'
                };
            }
            const cat = resolveEquipCategoryByTeam(team);
            return {
                icon: cat?.icon,
                color: cat?.color
            };
        }

        function getCurrentMonthKey() {
            const now = new Date();
            return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        function getWorkTeamCalendarEndMonth() {
            const minimumEnd = WORK_TEAM_CALENDAR_BASE_RANGE.minimumEnd;
            const currentMonth = getCurrentMonthKey();
            const minimumEndIndex = monthKeyToIndex(minimumEnd);
            const currentMonthIndex = monthKeyToIndex(currentMonth);
            if (currentMonthIndex === null) return minimumEnd;
            if (minimumEndIndex === null || currentMonthIndex > minimumEndIndex) {
                return currentMonth;
            }
            return minimumEnd;
        }

        function parseMonthKey(key) {
            const match = /^(\d{4})-(\d{2})$/.exec(key || '');
            if (!match) return null;
            return { year: parseInt(match[1], 10), monthIndex: parseInt(match[2], 10) - 1 };
        }

        function monthKeyToIndex(key) {
            const parsed = parseMonthKey(key);
            if (!parsed) return null;
            return parsed.year * 12 + parsed.monthIndex;
        }

        function normalizeMonthRange(startKey, endKey) {
            const fallback = getCurrentMonthKey();
            let start = startKey || fallback;
            let end = endKey || fallback;
            const startIndex = monthKeyToIndex(start);
            const endIndex = monthKeyToIndex(end);
            if (startIndex === null || endIndex === null) {
                start = fallback;
                end = fallback;
            } else if (startIndex > endIndex) {
                const tmp = start;
                start = end;
                end = tmp;
            }
            return { start, end };
        }

        function isDateInRange(dateKey, startMonthKey, endMonthKey) {
            const dateMonth = dateKey.slice(0, 7);
            const dateIndex = monthKeyToIndex(dateMonth);
            const startIndex = monthKeyToIndex(startMonthKey);
            const endIndex = monthKeyToIndex(endMonthKey);
            if (dateIndex === null || startIndex === null || endIndex === null) return true;
            return dateIndex >= startIndex && dateIndex <= endIndex;
        }

        function getWorkVisibleCategories() {
            return Array.isArray(AppData?.work?.categories) ? AppData.work.categories : [];
        }

        function getWorkHiddenTeamCategories() {
            return Array.isArray(AppData?.work?.teamCategories) ? AppData.work.teamCategories : [];
        }

        function getWorkTeamCalendarRawCategoryList() {
            const hiddenTeamCategories = getWorkHiddenTeamCategories().filter(cat => cat?.view === 'team_calendar');
            if (hiddenTeamCategories.length) return hiddenTeamCategories;
            return getWorkVisibleCategories().filter(cat => cat?.view === 'team_calendar');
        }

        function getWorkTeamCalendarRawCategoryByDataKey(dataKey) {
            const normalized = String(dataKey || '').trim();
            if (!normalized) return null;
            return getWorkTeamCalendarRawCategoryList().find(cat => String(cat?.dataKey || '').trim() === normalized) || null;
        }

