(function initKpiWorkHistoryViewLayout() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TEAM_KEYS,
        TeamInfo,
        RECORD_CATEGORY_OPTIONS,
        RECORD_CATEGORY_GROUP_ORDER,
        RECORD_CATEGORY_GROUPS,
        isImportantRecord,
        isReportRecord,
        state,
        WORK_HISTORY_ATTACHMENT_ACCEPT,
        escapeHtml,
        escapeAttribute,
        getElement,
        queryAll,
        setShadowHost
    } = history;

    const CSS_PATH = 'team-report/runtime/work/history/KPI.work.history.css?v=243';
    const COMPANY_LOGO_SRC = '/shared-assets/kpi-demo-logo.svg';
    const DEFAULT_SUBTITLE = '기간, 팀, 작업자, 업무내용, 첨부 문서, 비용까지 기록하는 KPI 작업내역 화면';
    const OVERVIEW_KEY = 'overview';
    const DRAG_SCROLL_THRESHOLD = 6;
    const HISTORY_MIN_DATE = '2024-01-01';
    const TAB_META = Object.freeze({
        overview: {
            kicker: 'ALL',
            title: '통합 현황',
            desc: '전체 팀 기록을 모아 보는 화면',
            tags: ['전체', '통합']
        },
        team1part1: {
            kicker: 'TEAM 1-A',
            title: 'Line Alpha',
            desc: 'Process Alpha',
            tags: ['Line Alpha', 'Process Alpha']
        },
        team1part2: {
            kicker: 'TEAM 1-B',
            title: 'Line Beta',
            desc: 'Process Alpha',
            tags: ['Line Beta', 'Process Alpha']
        },
        team2: {
            kicker: 'TEAM 2',
            title: 'Line Gamma',
            desc: 'Process Beta',
            tags: ['Process Beta']
        },
        team3: {
            kicker: 'TEAM 3',
            title: 'Line Delta',
            desc: 'Process Gamma',
            tags: ['Process Gamma']
        },
        team4: {
            kicker: 'TEAM 4',
            title: '시설팀',
            desc: '폐수 · 전체 · 기타',
            tags: ['폐수', '전체', '기타']
        }
    });

    function getShadowRoot() {
        return state.shadowRoot || state.shadowHost?.shadowRoot || null;
    }

    function getRenderContainer(context = {}) {
        return context.container || document.getElementById('content-container') || null;
    }

    function ensureShadowMount(context = {}) {
        const container = getRenderContainer(context);
        if (!container) return null;

        let host = container.querySelector('.kpi-work-history-host');
        if (!host || !host.shadowRoot) {
            container.innerHTML = '';
            host = document.createElement('div');
            host.className = 'kpi-work-history-host';
            host.style.display = 'block';
            host.style.width = '100%';
            host.style.height = '100%';
            host.style.minHeight = '0';
            host.attachShadow({ mode: 'open' });
            container.appendChild(host);
            setShadowHost(host);
            renderShell();
            view.bindEvents?.();
        } else {
            setShadowHost(host);
        }

        view.syncViewportLayout?.(context);
        return host;
    }

    function syncViewportLayout(context = {}) {
        const host = state.shadowHost;
        if (!host) return;
        const mainScroll = context.mainScroll || document.getElementById('main-scroll');
        const viewportHeight = Number(mainScroll?.clientHeight) || 0;

        host.style.width = '100%';
        host.style.minHeight = '0';
        host.style.height = viewportHeight > 0 ? `${viewportHeight}px` : '100%';
    }

    function renderShell() {
        const root = getShadowRoot();
        if (!root) return;
        root.innerHTML = `
            <link rel="stylesheet" href="${CSS_PATH}">
            <div id="work-history-root" class="work-history-app">
                ${view.buildShellHtml?.() || ''}
            </div>
        `;
    }

    function updateTitleState(category) {
        const titleEl = getElement('history-title');
        const subtitleEl = getElement('history-subtitle');
        if (titleEl) {
            titleEl.textContent = category?.title ? `팀별내역서 ${category.title}` : '팀별내역서 작업내역';
        }
        if (subtitleEl) {
            subtitleEl.textContent = category?.desc || DEFAULT_SUBTITLE;
        }
    }

    function initDateFilterLimits() {
        const today = todayInputValue();
        const minDate = HISTORY_MIN_DATE;
        queryAll('.date-range-selector input[type="date"]').forEach(input => {
            input.max = today;
            input.min = minDate;
            if (input.value && input.value > today) input.value = today;
            if (input.value && input.value < minDate) input.value = minDate;
        });
        const endDateInput = getElement('recordEndDate');
        if (endDateInput) {
            endDateInput.max = today;
            endDateInput.min = minDate;
        }
        const startDateInput = getElement('recordStartDate');
        if (startDateInput) {
            startDateInput.max = today;
            startDateInput.min = minDate;
        }
    }

    function minInputValue() {
        return HISTORY_MIN_DATE;
    }

    function updateHeaderSummary() {
        const today = new Date();
        const todayText = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
        queryAll('[data-role="current-date"]').forEach((node) => {
            node.textContent = todayText;
        });
        const currentDateEl = getElement('currentDate');
        const recordCountEl = getElement('recordCount');
        if (currentDateEl) currentDateEl.textContent = todayText;
        const overviewRecords = Array.isArray(view.getFilteredOverviewRecords?.())
            ? view.getFilteredOverviewRecords()
            : (Array.isArray(view.getAllRecords?.()) ? view.getAllRecords() : []);
        if (recordCountEl) recordCountEl.textContent = `${overviewRecords.length || 0}건`;
        const totalsByTeam = new Map();
        totalsByTeam.set(OVERVIEW_KEY, {
            count: overviewRecords.length,
            kpi: overviewRecords.filter(record => typeof isImportantRecord === 'function' && isImportantRecord(record)).length,
            report: overviewRecords.filter(record => typeof isReportRecord === 'function' && isReportRecord(record)).length,
            cost: overviewRecords.reduce((sum, record) => sum + (Number(record?.cost) || 0), 0)
        });
        TEAM_KEYS.forEach(teamKey => {
            const records = Array.isArray(view.getFilteredTeamRecords?.(teamKey))
                ? view.getFilteredTeamRecords(teamKey)
                : [];
            totalsByTeam.set(teamKey, {
                count: records.length,
                kpi: records.filter(record => typeof isImportantRecord === 'function' && isImportantRecord(record)).length,
                report: records.filter(record => typeof isReportRecord === 'function' && isReportRecord(record)).length,
                cost: records.reduce((sum, record) => sum + (Number(record?.cost) || 0), 0)
            });
        });
        queryAll('[data-team-metrics]').forEach((node) => {
            const teamKey = node.dataset.teamMetrics || OVERVIEW_KEY;
            const totals = totalsByTeam.get(teamKey) || { count: 0, kpi: 0, report: 0, cost: 0 };
            const countEl = node.querySelector('.tab-metrics-count');
            const kpiEl = node.querySelector('.tab-metrics-kpi');
            const reportEl = node.querySelector('.tab-metrics-report');
            const costEl = node.querySelector('.tab-metrics-cost');
            if (countEl) countEl.textContent = `${totals.count}건`;
            if (kpiEl) kpiEl.textContent = `${totals.kpi}건`;
            if (reportEl) reportEl.textContent = `${totals.report}건`;
            if (costEl) costEl.textContent = view.formatCurrency(totals.cost);
        });
        view.updateSearchCount?.();
    }

    function todayInputValue() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const date = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${date}`;
    }

    function formatAssigneeText(record, separator = ', ') {
        const assignees = Array.isArray(record?.assignees)
            ? record.assignees.filter(Boolean)
            : history.normalizeAssignees(record?.assignee || record?.worker || '');
        return assignees.join(separator);
    }

    function formatDateRange(startDate, endDate) {
        if (!startDate && !endDate) return '기간 미입력';
        if (startDate && endDate && startDate === endDate) return formatDateKorean(startDate);
        return `${formatDateKorean(startDate)} ~ ${formatDateKorean(endDate)}`;
    }

    function formatDateKorean(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) return '-';
        return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatCurrency(cost) {
        if (cost === null || cost === undefined || cost === '') return '자체처리';
        return `${Number(cost).toLocaleString('ko-KR')}원`;
    }

    function formatFileSize(bytes) {
        if (!bytes) return '저장됨';
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    function formatCostInputValue(value) {
        if (value === null || value === undefined || value === '') return '';
        const digits = String(value).replace(/[^\d]/g, '');
        if (!digits) return '';
        return Number(digits).toLocaleString('ko-KR');
    }

    function buildTimestampLabel() {
        const now = new Date();
        return [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, '0'),
            String(now.getDate()).padStart(2, '0'),
            '_',
            String(now.getHours()).padStart(2, '0'),
            String(now.getMinutes()).padStart(2, '0'),
            String(now.getSeconds()).padStart(2, '0')
        ].join('');
    }

    function escapeRegExp(text) {
        return String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    Object.assign(view, {
        CSS_PATH,
        COMPANY_LOGO_SRC,
        DEFAULT_SUBTITLE,
        OVERVIEW_KEY,
        DRAG_SCROLL_THRESHOLD,
        TAB_META,
        getShadowRoot,
        getRenderContainer,
        ensureShadowMount,
        syncViewportLayout,
        renderShell,
        updateTitleState,
        initDateFilterLimits,
        updateHeaderSummary,
        minInputValue,
        todayInputValue,
        formatAssigneeText,
        formatDateRange,
        formatDateKorean,
        formatCurrency,
        formatFileSize,
        formatCostInputValue,
        buildTimestampLabel,
        escapeRegExp
    });
})();
