(function initKpiWorkHistoryCore() {
    const history = window.KpiWorkHistory || {};

    const DATA_KEY = 'work_history_records';
    const TEAM_KEYS = ['team1part1', 'team1part2', 'team2', 'team3', 'team4'];
    const TEAM_DATA_VAR_NAMES = Object.freeze({
        team1part1: 'Team1Part1Data',
        team1part2: 'Team1Part2Data',
        team2: 'Team2Data',
        team3: 'Team3Data',
        team4: 'Team4Data'
    });
    const TeamInfo = Object.freeze({
        team1part1: { name: 'Line Alpha', desc: 'Process Alpha', class: 'team1part1' },
        team1part2: { name: 'Line Beta', desc: 'Process Alpha', class: 'team1part2' },
        team2: { name: 'Line Gamma', desc: 'Process Beta B·Process Beta A', class: 'team2' },
        team3: { name: 'Line Delta', desc: 'Process Gamma', class: 'team3' },
        team4: { name: '공무환경팀', desc: '폐수 · 전체 · 기타', class: 'team4' }
    });
    const LOCAL_BACKUP_KEY = `workhistory:${DATA_KEY}`;
    const ATTACHMENT_SLOT_KEYS = ['billing', 'report'];
    const ATTACHMENT_SLOT_META = Object.freeze({
        billing: {
            label: '청구서',
            fileCategory: 'billing_pdf'
        },
        report: {
            label: '보고자료',
            fileCategory: 'report_pdf'
        }
    });
    const WORK_HISTORY_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;
    const WORK_HISTORY_ATTACHMENT_RULES = Object.freeze({
        '.pdf': Object.freeze(['application/pdf']),
        '.xls': Object.freeze(['application/vnd.ms-excel']),
        '.xlsx': Object.freeze(['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
        '.ppt': Object.freeze(['application/vnd.ms-powerpoint']),
        '.pptx': Object.freeze(['application/vnd.openxmlformats-officedocument.presentationml.presentation']),
        '.doc': Object.freeze(['application/msword']),
        '.docx': Object.freeze(['application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
        '.hwp': Object.freeze(['application/x-hwp', 'application/haansofthwp']),
        '.hwpx': Object.freeze(['application/x-hwp+zip', 'application/haansofthwpx'])
    });
    const WORK_HISTORY_ATTACHMENT_ALLOWED_EXTENSIONS = Object.freeze(Object.keys(WORK_HISTORY_ATTACHMENT_RULES));
    const WORK_HISTORY_ATTACHMENT_EXTENSION_BY_MIME = Object.freeze(
        Object.fromEntries(
            WORK_HISTORY_ATTACHMENT_ALLOWED_EXTENSIONS.flatMap((ext) => (
                (WORK_HISTORY_ATTACHMENT_RULES[ext] || []).map((mimeType) => [mimeType, ext])
            ))
        )
    );
    const WORK_HISTORY_ATTACHMENT_ACCEPT = WORK_HISTORY_ATTACHMENT_ALLOWED_EXTENSIONS.join(',');
    const KPI_FLAG_LABEL = '★';
    const KPI_FLAG_PILL_LABEL = '★';
    const IMPORTANT_FLAG_LABEL = '★';
    const IMPORTANT_FLAG_PILL_LABEL = '★';
    const ACTUAL_ACHIEVEMENT_RULES = Object.freeze([
        Object.freeze({
            team: 'team2',
            startDate: '2026-02-22',
            endDate: '2026-02-22',
            workIncludes: Object.freeze(['배합실 무중력혼합기 핀밀 축 점검'])
        }),
        Object.freeze({
            team: 'team1part2',
            startDate: '2026-03-31',
            endDate: '2026-03-31',
            workIncludes: Object.freeze(['Process Alpha기 V/F 안전발판 개선'])
        })
    ]);
    const RECORD_CATEGORY_GROUP_ORDER = Object.freeze(['kpi', 'focus', 'report']);
    const RECORD_CATEGORY_GROUPS = Object.freeze({
        kpi: Object.freeze({
            label: 'KPI',
            categories: Object.freeze([
                '설비 가동률 증대',
                '자체 정비',
                '계획 이행률',
                'Process Alpha기 설치',
                '법규 준수'
            ])
        }),
        focus: Object.freeze({
            label: '중점 추진 과제',
            categories: Object.freeze([
                '모니터링 운영 체계',
                '데이터 관리 체계',
                '법규 리스크 제로'
            ])
        }),
        report: Object.freeze({
            label: '보고',
            categories: Object.freeze([])
        })
    });
    const RECORD_CATEGORY_ALIAS_MAP = Object.freeze({
        '계획 이행': '계획 이행률',
        '운영 체계 구축': '모니터링 운영 체계'
    });
    const RECORD_CATEGORY_OPTIONS = Object.freeze(
        RECORD_CATEGORY_GROUP_ORDER.flatMap(groupKey => RECORD_CATEGORY_GROUPS[groupKey]?.categories || [])
    );
    const DEFAULT_WORKSPACE_MODE = 'default';
    const PRODUCTION_REPORT_WORKSPACE_MODE = 'production-report';

    const state = history.state || {
        loaded: false,
        payload: null,
        shadowHost: null,
        shadowRoot: null,
        currentTeam: 'overview',
        currentKeyword: '',
        currentCategoryFilter: '',
        pendingDelete: { team: null, index: null },
        formState: {
            sourceTeam: '',
            existingAttachments: {
                billing: null,
                report: null
            },
            pendingFiles: {
                billing: null,
                report: null
            },
            removedAttachments: []
        },
        toastTimer: null,
        workspaceMode: DEFAULT_WORKSPACE_MODE,
        workspaceTitle: '',
        workspaceSubtitle: ''
    };
    if (typeof state.currentCategoryFilter !== 'string') state.currentCategoryFilter = '';
    if (typeof state.workspaceMode !== 'string') state.workspaceMode = DEFAULT_WORKSPACE_MODE;
    if (typeof state.workspaceTitle !== 'string') state.workspaceTitle = '';
    if (typeof state.workspaceSubtitle !== 'string') state.workspaceSubtitle = '';

    const writeState = history.writeState || {
        timer: null,
        payload: null,
        flushPromise: Promise.resolve(true),
        writeChain: Promise.resolve(true)
    };

    function cloneJson(value) {
        return JSON.parse(JSON.stringify(value ?? null));
    }

    function getTimeValue(value) {
        const timeValue = Date.parse(String(value || ''));
        return Number.isFinite(timeValue) ? timeValue : 0;
    }

    function getShadowRoot() {
        return state.shadowRoot || state.shadowHost?.shadowRoot || null;
    }

    function getElement(id) {
        return getShadowRoot()?.getElementById(id) || null;
    }

    function queryAll(selector) {
        return Array.from(getShadowRoot()?.querySelectorAll(selector) || []);
    }

    function setShadowHost(host) {
        state.shadowHost = host || null;
        state.shadowRoot = host?.shadowRoot || null;
    }

    function getWorkspaceMode() {
        return state.workspaceMode === PRODUCTION_REPORT_WORKSPACE_MODE
            ? PRODUCTION_REPORT_WORKSPACE_MODE
            : DEFAULT_WORKSPACE_MODE;
    }

    function isProductionReportWorkspace() {
        return getWorkspaceMode() === PRODUCTION_REPORT_WORKSPACE_MODE;
    }

    function getFixedCategoryFilter() {
        return isProductionReportWorkspace() ? '보고' : '';
    }

    function applyWorkspaceOptions(options = {}) {
        const requestedMode = String(options.workspaceMode || '').trim();
        const nextMode = requestedMode === PRODUCTION_REPORT_WORKSPACE_MODE
            ? PRODUCTION_REPORT_WORKSPACE_MODE
            : DEFAULT_WORKSPACE_MODE;
        const modeChanged = getWorkspaceMode() !== nextMode;
        state.workspaceMode = nextMode;
        state.workspaceTitle = String(options.workspaceTitle || '').trim();
        state.workspaceSubtitle = String(options.workspaceSubtitle || '').trim();

        if (modeChanged) {
            state.currentKeyword = '';
            state.currentTeam = 'overview';
            if (nextMode === DEFAULT_WORKSPACE_MODE) {
                state.currentCategoryFilter = '';
            }
        }

        const fixedCategoryFilter = getFixedCategoryFilter();
        if (fixedCategoryFilter) {
            state.currentCategoryFilter = fixedCategoryFilter;
        }

        return nextMode;
    }

    function getTeamRecords(team) {
        const payload = history.getPayload();
        return payload.teams[team] || [];
    }

    Object.assign(history, {
        DATA_KEY,
        TEAM_KEYS,
        TEAM_DATA_VAR_NAMES,
        TeamInfo,
        LOCAL_BACKUP_KEY,
        state,
        writeState,
        cloneJson,
        getTimeValue,
        KPI_FLAG_LABEL,
        KPI_FLAG_PILL_LABEL,
        IMPORTANT_FLAG_LABEL,
        IMPORTANT_FLAG_PILL_LABEL,
        ACTUAL_ACHIEVEMENT_RULES,
        RECORD_CATEGORY_GROUP_ORDER,
        RECORD_CATEGORY_GROUPS,
        RECORD_CATEGORY_ALIAS_MAP,
        RECORD_CATEGORY_OPTIONS,
        ATTACHMENT_SLOT_KEYS,
        ATTACHMENT_SLOT_META,
        WORK_HISTORY_ATTACHMENT_MAX_BYTES,
        WORK_HISTORY_ATTACHMENT_ACCEPT,
        DEFAULT_WORKSPACE_MODE,
        PRODUCTION_REPORT_WORKSPACE_MODE,
        getElement,
        queryAll,
        setShadowHost,
        getTeamRecords,
        getWorkspaceMode,
        isProductionReportWorkspace,
        getFixedCategoryFilter,
        applyWorkspaceOptions
    });

    window.KpiWorkHistory = history;
})();
