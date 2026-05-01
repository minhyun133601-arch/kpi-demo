(function initKpiWorkHistoryViewLayout() {
    const history = window.KpiWorkHistory;
    if (!history) return;

    const view = history.view || (history.view = {});
    const {
        TEAM_KEYS,
        isImportantRecord,
        isReportRecord,
        state,
        getElement,
        queryAll,
        setShadowHost,
        isProductionReportWorkspace
    } = history;

    const CSS_PATH = 'team-report/runtime/work/history/KPI.work.history.css?v=246';
    const COMPANY_LOGO_SRC = '/shared-assets/kpi-demo-logo.svg';
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
            tags: ['1파트', 'Process Alpha']
        },
        team1part2: {
            kicker: 'TEAM 1-B',
            title: 'Line Beta',
            desc: 'Process Alpha',
            tags: ['2파트', 'Process Alpha']
        },
        team2: {
            kicker: 'TEAM 2',
            title: 'Line Gamma',
            desc: 'Process Beta B·Process Beta A',
            tags: ['Process Beta B', 'Process Beta A']
        },
        team3: {
            kicker: 'TEAM 3',
            title: 'Line Delta',
            desc: 'Process Gamma',
            tags: ['Process Gamma']
        },
        team4: {
            kicker: 'TEAM 4',
            title: '공무환경팀',
            desc: '용수 및 공장 기타',
            tags: ['용수', '공장', '기타']
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

    function isProductionWorkspace() {
        return typeof isProductionReportWorkspace === 'function' && isProductionReportWorkspace();
    }

    function initDateFilterLimits() {
        const today = typeof view.todayInputValue === 'function' ? view.todayInputValue() : '';
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

    Object.assign(view, {
        CSS_PATH,
        COMPANY_LOGO_SRC,
        OVERVIEW_KEY,
        DRAG_SCROLL_THRESHOLD,
        TAB_META,
        getShadowRoot,
        getRenderContainer,
        ensureShadowMount,
        syncViewportLayout,
        renderShell,
        isProductionWorkspace,
        initDateFilterLimits,
        updateHeaderSummary,
        minInputValue
    });
})();
