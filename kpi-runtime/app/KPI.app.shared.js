        // ----------------------------------------------------------------
        // [\uC571 \uB85C\uC9C1]
        // ----------------------------------------------------------------

        const KpiRuntime = window.KpiRuntime;
        let activeRenderContext = null;
        let globalSaveRefreshTimer = null;
        const GlobalSaveUiState = {
            busy: false,
            activeAction: null,
            providerKey: '',
            message: '\uD604\uC7AC \uD654\uBA74\uC740 \uC800\uC7A5 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.',
            tone: ''
        };
        const OWNER_RECORDS_TAB_KEYS = Object.freeze({
            LOGIN: 'login',
            USERS: 'users'
        });
        const OwnerRecordsState = {
            isOwner: false,
            loading: false,
            loaded: false,
            activeTab: OWNER_RECORDS_TAB_KEYS.USERS,
            loginHistory: [],
            users: [],
            errorMessage: '',
            mountRoot: null
        };
        const RuntimeAuthState = {
            busy: false
        };
        const GLOBAL_RECENT_UPDATE_STORAGE_KEY = 'kpi:global-recent-update';
        const DASHBOARD_SECTION_ORDER = ['work', 'util', 'equip', 'audit', 'data', 'owner'];
        const DASHBOARD_SECTION_SOFT = Object.freeze({
            util: '#fff7ed',
            work: '#ecfdf5',
            equip: '#eff6ff',
            audit: '#fef2f2',
            data: '#f8fafc',
            owner: '#f5f3ff'
        });
        const COMPANY_LOGO_SRC = '/\u203B_\uACF5\uC6A9\uC790\uC0B0/\uB85C\uACE0.jpg';
        const DashboardHomeState = {
            sectionId: DASHBOARD_SECTION_ORDER[0]
        };
        const SidebarTreeState = {
            expandedSections: {
                work: true,
                util: false,
                equip: false,
                audit: false,
                data: false,
                owner: false
            }
        };
        const ViewerLayoutState = {
            sidebarCollapsed: false
        };
        const NavigationSelectionState = {
            sectionId: DashboardHomeState.sectionId,
            categoryIndex: -1,
            teamDataKey: ''
        };
        let activeCategoryIndex = -1;
        window.__KPI_GLOBAL_SAVE_SHELL__ = true;

        function escapeDashboardHtml(value) {
            return String(value ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function getDashboardSections() {
            const fallbackAccents = ['#f59e0b', '#16a34a', '#2563eb', '#ef4444', '#64748b'];
            return DASHBOARD_SECTION_ORDER.map((id, index) => {
                const section = AppData[id];
                if (!section) return null;
                if (section.ownerOnly === true && !canShowOwnerWorkspace()) return null;
                const categories = Array.isArray(section.categories) ? section.categories : [];
                return {
                    id,
                    index,
                    section,
                    categories,
                    accent: String(section.accent || fallbackAccents[index] || '#2563eb'),
                    softAccent: DASHBOARD_SECTION_SOFT[id] || '#eff6ff'
                };
            }).filter(Boolean);
        }

        function getDashboardSectionKey(value, sections = null) {
            const normalized = String(value || '').trim();
            const entries = Array.isArray(sections) ? sections : getDashboardSections();
            if (entries.some(entry => entry.id === normalized)) {
                return normalized;
            }
            return entries[0]?.id || '';
        }

        function getDashboardSelectedEntry(sections = null) {
            const entries = Array.isArray(sections) ? sections : getDashboardSections();
            const sectionId = getDashboardSectionKey(DashboardHomeState.sectionId, entries);
            DashboardHomeState.sectionId = sectionId;
            return entries.find(entry => entry.id === sectionId) || null;
        }

        function getNavigationSelectionSectionId() {
            return getDashboardSectionKey(NavigationSelectionState.sectionId || DashboardHomeState.sectionId);
        }

        function getNavigationSelectionCategoryIndex(sectionId = '') {
            return getNavigationSelectionSectionId() === getDashboardSectionKey(sectionId)
                ? Number(NavigationSelectionState.categoryIndex)
                : -1;
        }

        function getNavigationSelectionTeamDataKey(sectionId = '', categoryIndex = -1) {
            if (getNavigationSelectionSectionId() !== getDashboardSectionKey(sectionId)) return '';
            if (Number(NavigationSelectionState.categoryIndex) !== Number(categoryIndex)) return '';
            return String(NavigationSelectionState.teamDataKey || '').trim();
        }

        function setNavigationSelection(sectionId = '', categoryIndex = -1, options = {}) {
            const normalizedSectionId = getDashboardSectionKey(sectionId);
            NavigationSelectionState.sectionId = normalizedSectionId;
            NavigationSelectionState.categoryIndex = Number.isFinite(Number(categoryIndex)) ? Number(categoryIndex) : -1;
            NavigationSelectionState.teamDataKey = String(options.teamDataKey || '').trim();
            if (normalizedSectionId) {
                DashboardHomeState.sectionId = normalizedSectionId;
            }
        }

        function parseDashboardDate(value) {
            const date = value ? new Date(value) : null;
            if (!date || Number.isNaN(date.getTime())) return null;
            return date;
        }

        function formatDashboardDateTime(value) {
            const date = parseDashboardDate(value);
            if (!date) return '-';
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}.${month}.${day} ${hours}:${minutes}`;
        }

        function getStoredGlobalRecentUpdateRecord() {
            try {
                const raw = window.localStorage?.getItem?.(GLOBAL_RECENT_UPDATE_STORAGE_KEY);
                if (!raw) return null;
                const parsed = JSON.parse(raw);
                const savedAt = String(parsed?.savedAt || '').trim();
                if (!parseDashboardDate(savedAt)) return null;
                return {
                    savedAt,
                    providerKey: String(parsed?.providerKey || '').trim(),
                    sectionId: String(parsed?.sectionId || '').trim(),
                    categoryTitle: String(parsed?.categoryTitle || '').trim(),
                    label: String(parsed?.label || '').trim(),
                    trigger: String(parsed?.trigger || '').trim()
                };
            } catch (error) {
                return null;
            }
        }

        function persistGlobalRecentUpdateRecord(record = null) {
            const savedAt = String(record?.savedAt || '').trim();
            if (!parseDashboardDate(savedAt)) return;
            try {
                window.localStorage?.setItem?.(GLOBAL_RECENT_UPDATE_STORAGE_KEY, JSON.stringify({
                    savedAt,
                    providerKey: String(record?.providerKey || '').trim(),
                    sectionId: String(record?.sectionId || '').trim(),
                    categoryTitle: String(record?.categoryTitle || '').trim(),
                    label: String(record?.label || '').trim(),
                    trigger: String(record?.trigger || '').trim()
                }));
            } catch (error) {
                // Keep the recent update state in memory when localStorage is unavailable.
            }
        }

        function getLatestGlobalSaveRecord() {
            const records = KpiRuntime?.getSaveHistory?.();
            const runtimeRecord = Array.isArray(records)
                ? records.find(record => parseDashboardDate(record?.savedAt))
                : null;
            const storedRecord = getStoredGlobalRecentUpdateRecord();
            const runtimeTime = parseDashboardDate(runtimeRecord?.savedAt)?.getTime() || 0;
            const storedTime = parseDashboardDate(storedRecord?.savedAt)?.getTime() || 0;
            if (runtimeTime >= storedTime) {
                return runtimeRecord || storedRecord;
            }
            return storedRecord || runtimeRecord;
        }

        function getLatestRecentUpdateValue() {
            const latestSaveRecord = getLatestGlobalSaveRecord();
            const latestSaveTime = parseDashboardDate(latestSaveRecord?.savedAt)?.getTime() || 0;
            const documentTime = parseDashboardDate(document.lastModified)?.getTime() || 0;
            if (documentTime > latestSaveTime) {
                return document.lastModified;
            }
            return latestSaveRecord?.savedAt || document.lastModified || '';
        }

        function syncDashboardLastModified() {
            const target = document.getElementById('last-modified-text');
            if (!target) return;
            target.textContent = `최종 수정: ${formatDashboardDateTime(getLatestRecentUpdateValue())}`;
        }

        function getRuntimeCurrentUser() {
            const runtimeConfig = KpiRuntime?.getServerRuntimeConfig?.() || null;
            const currentUser = runtimeConfig?.auth?.currentUser;
            return currentUser && typeof currentUser === 'object' ? currentUser : null;
        }

        function isLocalDashboardPreviewMode() {
            const runtimeConfig = KpiRuntime?.getServerRuntimeConfig?.() || null;
            if (
                runtimeConfig
                && runtimeConfig.enabled === true
                && String(runtimeConfig.source || '').trim() === 'internal_server'
            ) {
                return false;
            }
            const protocol = String(window.location.protocol || '').trim().toLowerCase();
            if (protocol === 'file:') return true;
            if (!/^(http:|https:)$/.test(protocol)) return false;
            const hostname = String(window.location.hostname || '').trim().toLowerCase();
            return hostname === 'localhost' || hostname === '127.0.0.1';
        }

        function canShowOwnerWorkspace(user = null) {
            return hasOwnerRole(user) || isLocalDashboardPreviewMode();
        }

        function hasOwnerRole(user = null) {
            const currentUser = user || getRuntimeCurrentUser();
            if (!currentUser) return false;
            if (currentUser.isOwner === true) return true;
            return Array.isArray(currentUser.roles) && currentUser.roles.includes('owner');
        }
