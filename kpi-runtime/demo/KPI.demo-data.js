(function bootstrapKpiDemoData() {
    const UPDATED_AT = '2026-04-26T06:00:00.000Z';
    const MONTHS = [
        { key: '2026-01', electric: 9460, gas: 1620, lpg: 12.4, lng: 38.2, wasteB: 1380, wasteA: 920, production: 46600, electricCost: 2530000, gasCost: 1408000, wasteBCost: 3180000, wasteACost: 2110000 },
        { key: '2026-02', electric: 9120, gas: 1555, lpg: 11.7, lng: 36.8, wasteB: 1460, wasteA: 980, production: 45100, electricCost: 2445000, gasCost: 1362000, wasteBCost: 3330000, wasteACost: 2240000 },
        { key: '2026-03', electric: 9840, gas: 1710, lpg: 13.2, lng: 41.4, wasteB: 1510, wasteA: 1030, production: 48250, electricCost: 2655000, gasCost: 1510000, wasteBCost: 3460000, wasteACost: 2360000 },
        { key: '2026-04', electric: 10180, gas: 1840, lpg: 14.5, lng: 43.1, wasteB: 1580, wasteA: 1090, production: 49200, electricCost: 2760000, gasCost: 1606000, wasteBCost: 3620000, wasteACost: 2490000 },
        { key: '2026-05', electric: 10440, gas: 1788, lpg: 13.9, lng: 42.6, wasteB: 1625, wasteA: 1115, production: 50640, electricCost: 2835000, gasCost: 1574000, wasteBCost: 3710000, wasteACost: 2550000 },
        { key: '2026-06', electric: 10710, gas: 1816, lpg: 14.2, lng: 43.9, wasteB: 1690, wasteA: 1160, production: 51980, electricCost: 2910000, gasCost: 1598000, wasteBCost: 3860000, wasteACost: 2660000 },
        { key: '2026-07', electric: 11020, gas: 1905, lpg: 15.0, lng: 45.7, wasteB: 1740, wasteA: 1195, production: 53120, electricCost: 3030000, gasCost: 1684000, wasteBCost: 3980000, wasteACost: 2740000 },
        { key: '2026-08', electric: 11140, gas: 1932, lpg: 15.4, lng: 46.1, wasteB: 1715, wasteA: 1180, production: 52680, electricCost: 3065000, gasCost: 1710000, wasteBCost: 3920000, wasteACost: 2710000 },
        { key: '2026-09', electric: 10680, gas: 1765, lpg: 13.6, lng: 42.0, wasteB: 1645, wasteA: 1135, production: 51220, electricCost: 2930000, gasCost: 1559000, wasteBCost: 3770000, wasteACost: 2610000 },
        { key: '2026-10', electric: 10260, gas: 1684, lpg: 12.8, lng: 39.7, wasteB: 1595, wasteA: 1095, production: 49740, electricCost: 2805000, gasCost: 1492000, wasteBCost: 3650000, wasteACost: 2510000 },
        { key: '2026-11', electric: 9940, gas: 1718, lpg: 13.1, lng: 40.4, wasteB: 1530, wasteA: 1050, production: 48680, electricCost: 2710000, gasCost: 1518000, wasteBCost: 3500000, wasteACost: 2410000 },
        { key: '2026-12', electric: 9660, gas: 1660, lpg: 12.6, lng: 38.9, wasteB: 1485, wasteA: 1015, production: 47240, electricCost: 2620000, gasCost: 1469000, wasteBCost: 3400000, wasteACost: 2330000 }
    ];
    const WORK_TEAMS = [
        { dataKey: 'work_team_calendar_team1_part1', historyKey: 'team1part1', title: 'Line Alpha', teamName: 'Line Alpha', site: 'Plant B', room: '건조 1라인', process: 'dry', members: ['작업자 A', '작업자 C'], date: '2026-04-20', day: 'mon', product: '제품 A 분말', amount: 12800, baseAmount: 11600, task: '시작 전 점검 및 계량기 확인' },
        { dataKey: 'work_team_calendar_team1_part2', historyKey: 'team1part2', title: 'Line Beta', teamName: 'Line Beta', site: 'Plant A', room: '건조 2라인', process: 'dry', members: ['작업자 D'], date: '2026-04-21', day: 'tue', product: '제품 B 혼합분말', amount: 10400, baseAmount: 9800, task: '컴프레서 사이클 점검 및 원료 대기상태 확인' },
        { dataKey: 'work_team_calendar_team2', historyKey: 'team2', title: 'Line Gamma', teamName: 'Line Gamma', site: 'Plant A', room: '스틱 포장라인', process: 'stick', members: ['작업자 F'], date: '2026-04-24', day: 'fri', product: '제품 C 스틱', amount: 7600, baseAmount: 7200, task: '히터 밸런스 및 트림 손실 개선 조치 확인' },
        { dataKey: 'work_team_calendar_team3', historyKey: 'team3', title: 'Line Delta', teamName: 'Line Delta', site: 'Plant A', room: '액상 충전라인', process: 'liquid', members: ['작업자 B', '작업자 G'], date: '2026-04-23', day: 'thu', product: '제품 D 액상', amount: 15800, baseAmount: 14200, task: 'CIP 체크리스트 및 충전 속도 편차 확인' },
        { dataKey: 'work_team_calendar_team4', historyKey: 'team4', title: 'Facility Support', teamName: 'Facility Support', site: 'Plant A', room: '유틸리티실', process: 'facility', members: ['작업자 E'], date: '2026-04-22', day: 'wed', product: '시설 KPI', amount: 0, baseAmount: 0, task: '폐수 유량 점검 및 조도 개선 조치' }
    ];
    const CALENDAR_GROUPS = [
        { key: 'work_team_calendar_process_dry', title: 'Dry Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'dry') },
        { key: 'work_team_calendar_process_stick', title: 'Stick Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'stick') },
        { key: 'work_team_calendar_process_liquid', title: 'Liquid Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'liquid') },
        { key: 'work_team_calendar_group_plantB', title: 'Plant B Calendar', teams: WORK_TEAMS.filter((team) => team.site === 'Plant B') },
        { key: 'work_team_calendar_group_plantA', title: 'Plant A Calendar', teams: WORK_TEAMS.filter((team) => team.site === 'Plant A') },
        { key: 'work_team_calendar_overview', title: 'Integrated Operations Calendar', teams: WORK_TEAMS }
    ];
    const GIT_CLONE_WORK_HISTORY = [
        {
            date: '2026-04-25',
            title: '포터블 DB 런타임 전환',
            categoryGroup: 'focus',
            category: '데이터 관리 체계',
            note: '로컬 git clone의 런타임 전환 이력을 공개 포트폴리오용 합성 작업내역으로 정리했습니다.',
            cost: 0,
            reportName: 'git-clone-runtime-transition-summary.pdf'
        },
        {
            date: '2026-04-25',
            title: '공개 KPI 데모 정리',
            categoryGroup: 'report',
            category: '',
            note: '로컬 git clone의 공개 데모 준비 이력을 개인정보 없는 합성 변경 기록으로 변환했습니다.',
            cost: 0,
            reportName: 'git-clone-public-demo-readiness.pdf'
        }
    ];
    const WORK_HISTORY_SCENARIOS = [
        {
            date: '2026-04-18',
            categoryGroup: 'kpi',
            category: '설비 가동률 증대',
            title: '일 생산 캘린더와 설비 가동 지표 대조',
            cost: 0,
            reportName: 'production-calendar-kpi-check.pdf'
        },
        {
            date: '2026-04-16',
            categoryGroup: 'focus',
            category: '모니터링 운영 체계',
            title: '유틸리티 검침값과 작업자 인계 메모 정합성 확인',
            cost: 180000,
            reportName: 'utility-handover-monitoring-note.pdf'
        },
        {
            date: '2026-04-12',
            categoryGroup: 'report',
            category: '',
            title: '주간 KPI 보고자료 정리 및 첨부 문서 등록',
            cost: 0,
            reportName: 'weekly-kpi-report-pack.pdf'
        },
        {
            date: '2026-04-08',
            categoryGroup: 'kpi',
            category: '자체 정비',
            title: '작업 전 점검 체크리스트와 예방정비 항목 연결',
            cost: 320000,
            reportName: 'self-maintenance-checklist.pdf'
        },
        {
            date: '2026-04-04',
            categoryGroup: 'focus',
            category: '법규 리스크 제로',
            title: '법정 설비 점검 일정과 작업내역 후속 조치 연결',
            cost: 0,
            reportName: 'legal-equipment-follow-up-note.pdf'
        }
    ];
    const ELECTRIC_READING_PROFILE = { precision: 1, offsetStep: 0.02 };
    const ELECTRIC_FIELD_DEFS = [
        { id: 'field_01', start: 124.0, step: 0.18, ...ELECTRIC_READING_PROFILE },
        { id: 'field_02', start: 118.5, step: 0.15, ...ELECTRIC_READING_PROFILE },
        { id: 'field_03', start: 96.0, step: 0.12, ...ELECTRIC_READING_PROFILE },
        { id: 'field_04', start: 82.5, step: 0.10, ...ELECTRIC_READING_PROFILE },
        { id: 'field_05', start: 74.0, step: 0.35, ...ELECTRIC_READING_PROFILE },
        { id: 'field_06', start: 61.5, step: 0.24, ...ELECTRIC_READING_PROFILE },
        { id: 'field_07', start: 58.0, step: 0.20, ...ELECTRIC_READING_PROFILE },
        { id: 'field_08', start: 67.0, step: 0.28, ...ELECTRIC_READING_PROFILE },
        { id: 'field_09', start: 69.5, step: 0.32, ...ELECTRIC_READING_PROFILE },
        { id: 'field_10', start: 52.5, step: 0.30, ...ELECTRIC_READING_PROFILE },
        { id: 'field_11', start: 49.5, step: 0.34, ...ELECTRIC_READING_PROFILE },
        { id: 'field_12', start: 44.0, step: 0.22, ...ELECTRIC_READING_PROFILE },
        { id: 'field_13', start: 22.0, step: 0.18, ...ELECTRIC_READING_PROFILE },
        { id: 'field_14', start: 38.5, step: 0.30, ...ELECTRIC_READING_PROFILE },
        { id: 'field_15', start: 42.0, step: 0.22, ...ELECTRIC_READING_PROFILE },
        { id: 'field_16', start: 31.0, step: 0.20, ...ELECTRIC_READING_PROFILE },
        { id: 'field_17', start: 36.5, step: 0.16, ...ELECTRIC_READING_PROFILE },
        { id: 'field_18', start: 33.0, step: 0.14, ...ELECTRIC_READING_PROFILE },
        { id: 'field_19', start: 18.5, step: 0.10, ...ELECTRIC_READING_PROFILE },
        { id: 'field_21', start: 12.0, step: 0.06, ...ELECTRIC_READING_PROFILE },
        { id: 'field_22', start: 13.5, step: 0.05, ...ELECTRIC_READING_PROFILE },
        { id: 'field_23', start: 11.8, step: 0.055, ...ELECTRIC_READING_PROFILE },
        { id: 'field_25', start: 8.4, step: 0.04, ...ELECTRIC_READING_PROFILE },
        { id: 'field_26', start: 7.6, step: 0.035, ...ELECTRIC_READING_PROFILE },
        { id: 'field_28', start: 10.0, step: 0.05, ...ELECTRIC_READING_PROFILE }
    ];
    const GAS_FIELD_DEFS = [
        { id: 'gas_field_01', start: 1040, step: 15 },
        { id: 'gas_field_02', start: 58, step: 3 },
        { id: 'gas_field_03', start: 720, step: 11 },
        { id: 'gas_field_04', start: 360, step: 7 },
        { id: 'gas_field_05', start: 128, step: 2 },
        { id: 'gas_field_06', start: 566, step: 9 }
    ];

    function isPlainObject(value) {
        return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
    }

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    function setPortalDataDefault(key, payload) {
        window.PortalData = isPlainObject(window.PortalData) ? window.PortalData : {};
        if (!Object.prototype.hasOwnProperty.call(window.PortalData, key)) {
            window.PortalData[key] = clone(payload);
        }
    }

    function makeSettlement(fields) {
        return {
            fields: Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, String(value)])),
            completed: true,
            updatedAt: UPDATED_AT
        };
    }

    function makeCompletedEntry(values, status = 'completed') {
        return {
            values: Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value)])),
            completed: status === 'completed',
            dayStatus: status,
            updatedAt: UPDATED_AT
        };
    }

    function makeDate(year, month, day) {
        return new Date(year, month - 1, day);
    }

    function formatYmd(date) {
        return [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, '0'),
            String(date.getDate()).padStart(2, '0')
        ].join('-');
    }

    function dateRange(startDate, endDate) {
        const dates = [];
        const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        while (cursor <= end) {
            dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
            cursor.setDate(cursor.getDate() + 1);
        }
        return dates;
    }

    function makeCalendarPayload(dataKey, title, teams) {
        const days = { mon: [], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] };
        const entries = {};
        teams.forEach((team) => {
            days[team.day].push({ team: team.site, room: team.room, task: team.task });
            entries[team.date] = {
                title: `${team.room} KPI follow-up`,
                note: team.task,
                remark: 'Synthetic portfolio entry. No operational record is included.',
                members: team.members,
                attachments: []
            };
        });
        return {
            meta: {
                moduleKey: dataKey,
                moduleName: title,
                version: 1,
                updatedAt: UPDATED_AT
            },
            teamCalendar: { entries },
            weeks: [
                {
                    year: 2026,
                    week: 17,
                    days
                }
            ],
            monthly: { entries: {} }
        };
    }

    function makeHistoryRecord(team, index) {
        const isKpi = index % 2 === 0;
        return {
            team: team.historyKey,
            startDate: team.date,
            endDate: team.date,
            plannedEndDate: '',
            categoryGroup: isKpi ? 'kpi' : 'focus',
            category: isKpi ? '에너지 효율 개선' : '운영 모니터링',
            kpi: isKpi,
            assignees: team.members,
            assignee: team.members.join(', '),
            workContent: `${team.task}. ${team.title} 대시보드에 결과를 요약했습니다.`,
            remarks: '포트폴리오용 합성 작업 이력 카드입니다.',
            attachmentSlots: { billing: null, report: null },
            cost: isKpi ? 0 : 250000 + index * 70000
        };
    }

    function makeDemoHistoryAttachment(team, slotKey, fileName, index) {
        const safeFileName = String(fileName || `work-history-${team.historyKey}-${slotKey}.pdf`)
            .replace(/[^\w가-힣.-]+/g, '-')
            .replace(/-+/g, '-');
        return {
            originalName: `${team.title}_${safeFileName}`,
            storedName: `${team.historyKey}-${safeFileName}`,
            url: `/demo-files/work-history/${team.historyKey}-${safeFileName}`,
            previewUrl: `/demo-files/work-history/${team.historyKey}-${safeFileName}`,
            downloadUrl: `/demo-files/work-history/${team.historyKey}-${safeFileName}`,
            size: 148000 + index * 17300,
            mimeType: 'application/pdf',
            attachmentType: slotKey,
            fileCategory: slotKey === 'billing' ? 'billing_pdf' : 'report_pdf'
        };
    }

    function makeScenarioHistoryRecord(team, scenario, teamIndex, scenarioIndex) {
        const hasBilling = scenario.categoryGroup !== 'report' && scenario.cost > 0;
        const attachmentIndex = teamIndex * 10 + scenarioIndex + 1;
        const billingName = `synthetic-billing-${String(scenarioIndex + 1).padStart(2, '0')}.pdf`;
        return {
            team: team.historyKey,
            startDate: scenario.date,
            endDate: scenario.date,
            plannedEndDate: '',
            categoryGroup: scenario.categoryGroup,
            category: scenario.category,
            kpi: scenario.categoryGroup === 'kpi',
            assignees: team.members,
            assignee: team.members.join(', '),
            workContent: `${team.title} ${scenario.title}. 대상 품목은 ${team.product}이며 ${team.room} 기준으로 합성 작업내역을 작성했습니다.`,
            remarks: '포트폴리오 캡처용 더미 작업내역입니다. 실제 설비명, 생산량, 청구서, 내부 보고서는 포함하지 않았습니다.',
            attachmentSlots: {
                billing: hasBilling ? makeDemoHistoryAttachment(team, 'billing', billingName, attachmentIndex) : null,
                report: makeDemoHistoryAttachment(team, 'report', scenario.reportName, attachmentIndex)
            },
            cost: scenario.cost
        };
    }

    function makeGitCloneHistoryRecord(team, gitItem, teamIndex, gitIndex) {
        const attachmentIndex = 80 + teamIndex * 10 + gitIndex;
        return {
            team: team.historyKey,
            startDate: gitItem.date,
            endDate: gitItem.date,
            plannedEndDate: '',
            categoryGroup: gitItem.categoryGroup,
            category: gitItem.category,
            kpi: gitItem.categoryGroup === 'kpi',
            assignees: team.members,
            assignee: team.members.join(', '),
            workContent: `${team.title} ${gitItem.title}. ${gitItem.note}`,
            remarks: 'Source: local git clone history, rewritten as synthetic portfolio work-log data.',
            attachmentSlots: {
                billing: null,
                report: makeDemoHistoryAttachment(team, 'report', gitItem.reportName, attachmentIndex)
            },
            cost: gitItem.cost
        };
    }

    function makeHistoryRecords(team, index) {
        const scenarioStart = index % WORK_HISTORY_SCENARIOS.length;
        const scenarios = [
            WORK_HISTORY_SCENARIOS[scenarioStart],
            WORK_HISTORY_SCENARIOS[(scenarioStart + 1) % WORK_HISTORY_SCENARIOS.length],
            WORK_HISTORY_SCENARIOS[(scenarioStart + 2) % WORK_HISTORY_SCENARIOS.length]
        ];
        return [
            makeHistoryRecord(team, index),
            ...GIT_CLONE_WORK_HISTORY.map((gitItem, gitIndex) => makeGitCloneHistoryRecord(team, gitItem, index, gitIndex)),
            ...scenarios.map((scenario, scenarioIndex) => makeScenarioHistoryRecord(team, scenario, index, scenarioIndex))
        ];
    }

    function makeProductionEntry(team, date, dayIndex) {
        const dayFactor = [0, 220, -140, 180, 320, -90, 110][date.getDay()] || 0;
        const amount = Math.max(0, Math.round(team.baseAmount + dayFactor + (dayIndex % 4) * 120));
        return {
            date: formatYmd(date),
            team: team.teamName,
            teamName: team.teamName,
            lineName: team.room,
            productName: team.product,
            amount,
            moistureExcludedYield: amount ? Number((91.5 + (dayIndex % 5) * 0.7).toFixed(1)) : null,
            equipmentCapa: amount ? Math.round(amount * 1.14) : null,
            equipmentUtilization: amount ? Number((74 + (dayIndex % 6) * 2.4).toFixed(1)) : null,
            sourceArchiveId: 'portfolio-production-april-2026',
            sourceFingerprint: 'portfolio-production-april-2026|synthetic',
            sourceFileName: 'portfolio-production-april-2026.xlsx'
        };
    }

    function makeProductionEntries(team) {
        if (!team.baseAmount) return [];
        return dateRange(makeDate(2026, 4, 1), makeDate(2026, 4, 24))
            .filter((date) => date.getDay() !== 0)
            .map((date, index) => makeProductionEntry(team, date, index));
    }

    function makeWasteRows(siteKey) {
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const rows = monthLabels.map((label, index) => {
            const month = MONTHS[index];
            const usage = month ? (siteKey === 'Plant B' ? month.wasteB : month.wasteA) : null;
            const cost = month ? (siteKey === 'Plant B' ? month.wasteBCost : month.wasteACost) : null;
            const baseCosts = siteKey === 'Plant B'
                ? { water: 920000, share: 480000, sludge: 1120000, resin: 500000, labor: Math.max(0, (cost || 0) - 3020000) }
                : { water: 710000, share: 330000, sludge: 630000, resin: 320000, outsourcing: Math.max(0, (cost || 0) - 1990000) };
            return {
                label,
                usage,
                production: month?.production || null,
                cost,
                costs: cost ? { ...baseCosts, total: cost } : {}
            };
        });
        const active = rows.filter((row) => Number.isFinite(Number(row.usage)));
        rows.push(
            {
                label: 'Average',
                usage: Math.round(active.reduce((sum, row) => sum + row.usage, 0) / active.length),
                production: Math.round(active.reduce((sum, row) => sum + row.production, 0) / active.length),
                cost: Math.round(active.reduce((sum, row) => sum + row.cost, 0) / active.length)
            },
            {
                label: 'Total',
                usage: active.reduce((sum, row) => sum + row.usage, 0),
                production: active.reduce((sum, row) => sum + row.production, 0),
                cost: active.reduce((sum, row) => sum + row.cost, 0)
            }
        );
        return rows;
    }

    function buildMonthlyMap(selector) {
        return Object.fromEntries(MONTHS.map((month) => [month.key, selector(month)]));
    }

    function makeElectricBilling(month) {
        return {
            scopes: {
                plantA: makeSettlement({
                    base_charge: Math.round(month.electricCost * 0.06),
                    power_charge: Math.round(month.electricCost * 0.548),
                    climate_environment_charge: Math.round(month.electricCost * 0.018),
                    fuel_adjustment_charge: Math.round(month.electricCost * 0.015),
                    lagging_power_factor_charge: 0,
                    operation_fee: 0,
                    internet_discount: 0,
                    vat: Math.round(month.electricCost * 0.064),
                    electric_power_fund: Math.round(month.electricCost * 0.014),
                    tv_reception_fee: 2500,
                    rounding_adjustment: 0,
                    billing_amount: Math.round(month.electricCost * 0.72)
                }),
                plantB: makeSettlement({
                    base_charge: Math.round(month.electricCost * 0.03),
                    power_charge: Math.round(month.electricCost * 0.2),
                    climate_environment_charge: Math.round(month.electricCost * 0.009),
                    fuel_adjustment_charge: Math.round(month.electricCost * 0.006),
                    lagging_power_factor_charge: 0,
                    operation_fee: 0,
                    internet_discount: 0,
                    vat: Math.round(month.electricCost * 0.023),
                    electric_power_fund: Math.round(month.electricCost * 0.01),
                    tv_reception_fee: 2500,
                    rounding_adjustment: 0,
                    billing_amount: Math.round(month.electricCost * 0.28)
                })
            }
        };
    }

    function makeEquipmentValues(fieldDefs, dayIndex) {
        return Object.fromEntries(fieldDefs.map((field, index) => {
            const offsetStep = Number.isFinite(field.offsetStep) ? field.offsetStep : index + 2;
            const precision = Number.isInteger(field.precision) ? Math.max(0, field.precision) : 0;
            const offset = Math.floor(dayIndex / 5) * offsetStep;
            const rawValue = field.start + field.step * dayIndex + offset;
            return [field.id, Number(rawValue.toFixed(precision))];
        }));
    }

    function makeEquipmentEntries(fieldDefs) {
        const entries = {
            '2026-01-01': makeCompletedEntry(makeEquipmentValues(fieldDefs, 0)),
            '2026-03-31': makeCompletedEntry(makeEquipmentValues(fieldDefs, 88))
        };
        dateRange(makeDate(2026, 4, 1), makeDate(2026, 4, 24)).forEach((date, index) => {
            entries[formatYmd(date)] = makeCompletedEntry(makeEquipmentValues(fieldDefs, 89 + index));
        });
        return entries;
    }

    WORK_TEAMS.forEach((team) => {
        setPortalDataDefault(team.dataKey, makeCalendarPayload(team.dataKey, `${team.title} Weekly Calendar`, [team]));
    });
    CALENDAR_GROUPS.forEach((group) => {
        setPortalDataDefault(group.key, makeCalendarPayload(group.key, group.title, group.teams));
    });
    setPortalDataDefault('work_history_records', {
        meta: {
            moduleKey: 'work_history_records',
            moduleName: 'Demo Work History',
            version: 2,
            updatedAt: UPDATED_AT
        },
        teams: Object.fromEntries(WORK_TEAMS.map((team, index) => [team.historyKey, makeHistoryRecords(team, index)]))
    });
    setPortalDataDefault('util_production_daily', {
        meta: {
            moduleKey: 'util_production',
            recordKey: 'daily_state_v1',
            permissionKey: 'util.production.daily',
            moduleName: 'Demo Utility Production Daily',
            version: 4,
            updatedAt: UPDATED_AT
        },
        periodDefault: { startDay: 1 },
        teams: WORK_TEAMS.filter((team) => team.baseAmount > 0).map((team) => ({
            name: team.teamName,
            entries: makeProductionEntries(team)
        })),
        archives: [
            {
                id: 'portfolio-production-april-2026',
                fileName: 'portfolio-production-april-2026.xlsx',
                size: 184320,
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                lastModified: 1777200000000,
                savedAt: UPDATED_AT,
                folder: 'portfolio-demo',
                fingerprint: 'portfolio-production-april-2026|synthetic',
                storage: 'local',
                years: [2026],
                yearMonths: ['2026-04'],
                teams: ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta']
            }
        ]
    });
    setPortalDataDefault('util_wastewater_data', {
        meta: {
            moduleKey: 'util_wastewater_data',
            moduleName: 'Demo Wastewater Data',
            version: 1,
            updatedAt: UPDATED_AT
        },
        teams: [
            { name: 'Plant B', years: [{ label: '2026', rows: makeWasteRows('Plant B') }] },
            { name: 'Plant A', years: [{ label: '2026', rows: makeWasteRows('Plant A') }] }
        ]
    });
    setPortalDataDefault('audit_lux', {
        meta: {
            moduleKey: 'audit_lux',
            moduleName: 'Demo Audit Lux',
            version: 1,
            updatedAt: UPDATED_AT
        },
        standards: [
            { team: 'Plant A', room: 'Dry Room 2', type: 'Workbench', standard: '500' },
            { team: 'Plant A', room: 'Liquid Line', type: 'Inspection Point', standard: '450' },
            { team: 'Plant B', room: 'Dry Line 1', type: 'Workbench', standard: '500' },
            { team: 'Plant B', room: 'Utility Room', type: 'Panel Front', standard: '300' }
        ],
        entries: [
            { year: 2026, quarter: 2, team: 'Plant A', room: 'Dry Room 2', type: 'Workbench', value: '548', note: 'Demo reading after LED replacement.' },
            { year: 2026, quarter: 2, team: 'Plant A', room: 'Liquid Line', type: 'Inspection Point', value: '472', note: 'Meets internal inspection standard.' },
            { year: 2026, quarter: 2, team: 'Plant B', room: 'Dry Line 1', type: 'Workbench', value: '526', note: 'Measured during normal shift condition.' },
            { year: 2026, quarter: 2, team: 'Plant B', room: 'Utility Room', type: 'Panel Front', value: '318', note: 'Monitoring only.' }
        ],
        evidence: []
    });
    setPortalDataDefault('audit_legal_facility', {
        meta: {
            moduleKey: 'audit_legal_facility',
            moduleName: 'Demo Audit Legal Facility',
            version: 2,
            updatedAt: UPDATED_AT
        },
        facilities: [
            { id: 'legal-boiler-a', plant: '공장 A', facility: '데모 보일러 A', itemType: 'gasboiler', statutoryItem: '보일러 안전검사', responsible: '운영팀', agency: '점검기관 A', cycle: '6개월', lastDate: '2026-02-14', nextDate: '2026-08-14', documentStatus: '필증 준비 완료', previewTitle: '보일러 검사 필증', note: '포트폴리오 캡처용 합성 법정 설비 기록입니다.' },
            { id: 'legal-boiler-b', plant: '공장 A', facility: '데모 보일러 B', itemType: 'gasboiler', statutoryItem: '연소 안전검사', responsible: '유틸리티팀', agency: '점검기관 A', cycle: '6개월', lastDate: '2025-12-02', nextDate: '2026-06-02', documentStatus: '체크리스트 준비', previewTitle: '연소 안전 점검표', note: '임박 점검 상태를 보여주는 합성 예시입니다.' },
            { id: 'legal-hoist-a', plant: '공장 A', facility: '샘플 호이스트 A', itemType: 'other', statutoryItem: '양중기 정기검사', responsible: '보전팀', agency: '점검기관 B', cycle: '12개월', lastDate: '2025-05-20', nextDate: '2026-05-20', documentStatus: '갱신 일정 등록', previewTitle: '양중기 정기검사표', note: '예정 검사 마감일을 추적하는 합성 기록입니다.' },
            { id: 'legal-pressure-a', plant: '공장 B', facility: '샘플 압력용기 A', itemType: 'other', statutoryItem: '압력용기 정기검사', responsible: '보전팀', agency: '점검기관 B', cycle: '12개월', lastDate: '2025-05-15', nextDate: '2026-05-15', documentStatus: '기관 예약 완료', previewTitle: '압력용기 검사 예약서', note: '공개용 더미 압력용기 기록입니다.' },
            { id: 'legal-fire-panel-b', plant: '공장 B', facility: '샘플 소방수신반 B', itemType: 'fire', statutoryItem: '소방설비 작동점검', responsible: '안전팀', agency: '점검기관 C', cycle: '12개월', lastDate: '2025-04-10', nextDate: '2026-04-10', documentStatus: '조치 필요', previewTitle: '소방 점검 조치 메모', note: '기한 초과 상태를 보여주는 합성 예시입니다.' },
            { id: 'legal-fire-pump-a', plant: '공장 A', facility: '샘플 소방펌프 A', itemType: 'fire', statutoryItem: '소방펌프 성능점검', responsible: '안전팀', agency: '점검기관 C', cycle: '12개월', lastDate: '2025-07-12', nextDate: '2026-07-12', documentStatus: '모니터링', previewTitle: '소방펌프 시험 성적서', note: '연간 소방설비 합성 기록입니다.' },
            { id: 'legal-environment-a', plant: '공장 B', facility: '폐수 샘플 지점', itemType: 'environment', statutoryItem: '환경 준수 점검', responsible: '유틸리티팀', agency: '점검기관 D', cycle: '분기', lastDate: '2026-03-28', nextDate: '2026-06-28', documentStatus: '모니터링', previewTitle: '환경 준수 점검 요약', note: '분기 후속관리 항목을 합성 날짜로 구성했습니다.' },
            { id: 'legal-air-emission-a', plant: '공장 A', facility: '샘플 배출구 A', itemType: 'environment', statutoryItem: '대기 배출 측정', responsible: '유틸리티팀', agency: '점검기관 D', cycle: '분기', lastDate: '2026-02-28', nextDate: '2026-05-28', documentStatus: '측정 일정 예약', previewTitle: '대기 배출 측정 계획서', note: '환경 모니터링 합성 항목입니다.' },
            { id: 'legal-electric-panel-a', plant: '공장 A', facility: '메인 분전반 A', itemType: 'electric', statutoryItem: '전기 안전검사', responsible: '보전팀', agency: '점검기관 E', cycle: '12개월', lastDate: '2025-11-18', nextDate: '2026-11-18', documentStatus: '필증 준비 완료', previewTitle: '전기 안전검사 필증', note: '포트폴리오용 전기 점검 기록입니다.' },
            { id: 'legal-cooling-a', plant: '공장 B', facility: '냉각 유닛 A', itemType: 'cooling', statutoryItem: '냉매 설비 점검', responsible: '시설지원팀', agency: '점검기관 F', cycle: '12개월', lastDate: '2025-09-06', nextDate: '2026-09-06', documentStatus: '정상', previewTitle: '냉각 유닛 점검 요약', note: '합성 냉각설비 기록입니다.' }
        ],
        calendar: {
            year: 2026,
            month: 5,
            label: '2026년 5월'
        },
        equipment: [
            { id: 'legal-equipment-boiler', title: '보일러 그룹', itemType: 'gasboiler', icon: 'fa-fire-flame-simple', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 1 }, { label: '준비 완료', value: 1 }], statuses: [{ key: 'safe', label: '준비 완료', count: 1 }, { key: 'warning', label: '임박', count: 1 }] },
            { id: 'legal-equipment-hoist', title: '호이스트·압력용기', itemType: 'other', icon: 'fa-up-down-left-right', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 2 }, { label: '준비 완료', value: 0 }], statuses: [{ key: 'warning', label: '임박', count: 2 }] },
            { id: 'legal-equipment-fire', title: '소방 설비', itemType: 'fire', icon: 'fa-fire-extinguisher', metrics: [{ label: '대상 설비', value: 2 }, { label: '기한 초과', value: 1 }, { label: '정상', value: 1 }], statuses: [{ key: 'danger', label: '조치 필요', count: 1 }, { key: 'safe', label: '정상', count: 1 }] },
            { id: 'legal-equipment-environment', title: '환경 설비', itemType: 'environment', icon: 'fa-seedling', metrics: [{ label: '대상 설비', value: 2 }, { label: '예정', value: 1 }, { label: '관리 중', value: 2 }], statuses: [{ key: 'warning', label: '예약됨', count: 1 }, { key: 'safe', label: '정상', count: 1 }] },
            { id: 'legal-equipment-electric', title: '전기 안전', itemType: 'electric', icon: 'fa-bolt', metrics: [{ label: '대상 설비', value: 1 }, { label: '예정', value: 0 }, { label: '준비 완료', value: 1 }], statuses: [{ key: 'safe', label: '준비 완료', count: 1 }] },
            { id: 'legal-equipment-cooling', title: '냉각 설비', itemType: 'cooling', icon: 'fa-snowflake', metrics: [{ label: '대상 설비', value: 1 }, { label: '예정', value: 0 }, { label: '정상', value: 1 }], statuses: [{ key: 'safe', label: '정상', count: 1 }] }
        ],
        alerts: [
            { id: 'legal-alert-review', title: '검토 필요', countKey: 'needsReview', unit: '건', icon: 'fa-triangle-exclamation', severity: 'danger' },
            { id: 'legal-alert-near', title: '45일 이내 도래', countKey: 'near', unit: '건', icon: 'fa-calendar-day', severity: 'warning' },
            { id: 'legal-alert-doc', title: '문서 후속관리', countKey: 'needsReview', unit: '건', icon: 'fa-file-circle-check', severity: 'info' }
        ],
        docs: [
            { id: 'legal-doc-cert', title: '검사 필증', icon: 'fa-file-lines', uploaded: 8, missing: 2, rate: 80 },
            { id: 'legal-doc-training', title: '교육 기록', icon: 'fa-graduation-cap', uploaded: 6, missing: 1, rate: 86 },
            { id: 'legal-doc-action', title: '개선 조치서', icon: 'fa-clipboard-check', uploaded: 4, missing: 2, rate: 67 },
            { id: 'legal-doc-agency', title: '기관 예약서', icon: 'fa-calendar-check', uploaded: 5, missing: 1, rate: 83 }
        ],
        events: [
            { id: 'legal-event-fire', date: '2026-04-10', title: '소방수신반 B 조치 마감', type: 'deadline' },
            { id: 'legal-event-pressure', date: '2026-05-15', title: '압력용기 A 정기검사', type: 'inspection' },
            { id: 'legal-event-hoist', date: '2026-05-20', title: '호이스트 A 정기검사', type: 'inspection' },
            { id: 'legal-event-emission', date: '2026-05-28', title: '대기 배출 측정 계획', type: 'document' },
            { id: 'legal-event-boiler-b', date: '2026-06-02', title: '보일러 B 연소 안전검사', type: 'inspection' },
            { id: 'legal-event-env', date: '2026-06-28', title: '폐수 준수 점검', type: 'inspection' },
            { id: 'legal-event-fire-pump', date: '2026-07-12', title: '소방펌프 A 성능점검', type: 'inspection' }
        ]
    });
    setPortalDataDefault('data_equipment_history_card', {
        meta: {
            moduleKey: 'data_equipment_history_card',
            moduleName: 'Demo Equipment History Card',
            version: 2,
            updatedAt: UPDATED_AT
        },
        header: {
            brandName: 'KPI Demo',
            brandSub: '공개 포트폴리오용 합성 기록',
            title: '설비 이력 카드',
            subtitle: 'EQUIPMENT HISTORY CARD',
            status: '운영중',
            updatedAt: '2026.04.26 10:30',
            owner: '작업자 A',
            equipmentName: '샘플 혼합기 A',
            note: '본 설비 이력카드는 공개 포트폴리오용 합성 데이터로 구성했습니다.'
        },
        operationInfo: [
            { label: '제품명', value: '제품 A 분말' },
            { label: '생산라인', value: '라인 알파' },
            { label: '공정 단계', value: '혼합 공정' },
            { label: '최근 24H 생산량', value: '2,680 kg' },
            { label: '공정 흐름', value: '원료 투입 -> 혼합 -> 배출 -> 건조' },
            { label: '목표 생산량', value: '3,000 kg / 일' },
            { label: '주요 원료', value: '합성 원료 A, 첨가 샘플' },
            { label: '핵심 KPI', value: '가동률 86.4% / 수율 94.8%' },
            { label: '최근 점검', value: '2026.04.20 정기점검' },
            { label: '다음 점검', value: '2026.05.20 예방정비' }
        ],
        detailInfo: [
            { label: '설비명', value: '샘플 혼합기 A' },
            { label: '전원', value: '380V / 3P / 60Hz' },
            { label: '구동 방식', value: '모터 구동' },
            { label: '설비코드', value: 'EQ-MIX-001' },
            { label: '소비 전력', value: '7.5 kW' },
            { label: '회전 속도', value: '0.8 - 1.2 m/min' },
            { label: '설치일', value: '2024.06.15' },
            { label: '제어 압력', value: '0.6 MPa' },
            { label: '생산 능력', value: '3,000 kg / 일' },
            { label: '제조사', value: '샘플 제조사 A' },
            { label: '본체 소재', value: 'SUS304' },
            { label: '입자 크기', value: '2.0 - 3.0 mm' },
            { label: '모델명', value: 'MX-Demo-01' },
            { label: '외형 치수', value: '1600 x 800 x 2100 mm' },
            { label: '스크린 규격', value: '4.0 mm' },
            { label: '설치 장소', value: '공장 A / 공정 알파' },
            { label: '설비 중량', value: '680 kg' },
            { label: '호퍼 용량', value: '50 L' },
            { label: '관리 부서', value: '운영팀' },
            { label: '접촉부 소재', value: 'SUS304' },
            { label: '베어링 규격', value: '6205-2RS / 6204-2RS' },
            { label: '책임자', value: '작업자 A' },
            { label: '예비품 위치', value: '샘플 예비품 캐비닛 A' },
            { label: '위험성 등급', value: '중간 / 회전체 가드 적용' }
        ],
        maintenanceHistory: [
            { date: '2026.04.20', type: '정기점검', content: '모터 진동 확인 및 베어링 온도 점검', worker: '작업자 A', note: '정상' },
            { date: '2026.04.12', type: '운전점검', content: '호퍼 센서 응답 및 배출 게이트 동작 시험', worker: '작업자 C', note: '이상 없음' },
            { date: '2026.03.28', type: '예방정비', content: '구동 벨트 장력 조정 및 가드 볼트 체결 확인', worker: '작업자 B', note: '조정 완료' },
            { date: '2026.03.18', type: '예방정비', content: '베어링 급유 및 벨트 장력 조정', worker: '작업자 B', note: '급유 완료' },
            { date: '2026.02.27', type: '정기점검', content: '비상정지 스위치와 인터록 응답 시험', worker: '작업자 D', note: '합격' },
            { date: '2026.02.15', type: '정기점검', content: '전원 케이블 및 제어반 상태 점검', worker: '작업자 C', note: '정상' },
            { date: '2026.01.30', type: '소모품교체', content: '스크린 가스켓 및 샘플 블레이드 체결구 교체', worker: '작업자 A', note: '교체 완료' },
            { date: '2026.01.12', type: '고장수리', content: '이상 소음 발생 후 롤러 정렬 보정', worker: '작업자 B', note: '추적 관찰' },
            { date: '2025.12.16', type: '예방정비', content: '호퍼 세척 및 스크린 교체', worker: '작업자 A', note: '스크린 교체' },
            { date: '2025.11.22', type: '개선작업', content: '배출 커버에 육안점검 표시 추가', worker: '작업자 E', note: '포트폴리오 예시' }
        ],
        documents: [
            { title: '사용 설명서', file: '샘플혼합기_사용설명서.pdf', ext: 'pdf', modified: '2026.04.20' },
            { title: '설비 도면', file: '샘플혼합기_도면_rev02.pdf', ext: 'pdf', modified: '2026.03.18' },
            { title: '점검 체크리스트', file: '샘플혼합기_점검표.xlsx', ext: 'xlsx', modified: '2026.04.15' },
            { title: '예방정비 매뉴얼', file: '예방정비_매뉴얼.pdf', ext: 'pdf', modified: '2026.02.10' },
            { title: '부품 리스트', file: '샘플_예비품_리스트.pdf', ext: 'pdf', modified: '2025.12.01' },
            { title: '위험성 평가표', file: '샘플_위험성평가표.pdf', ext: 'pdf', modified: '2026.01.30' },
            { title: '전기 점검표', file: '샘플_전기점검표.xlsx', ext: 'xlsx', modified: '2026.02.15' },
            { title: '교육 기록', file: '작업자_교육기록.pdf', ext: 'pdf', modified: '2026.04.02' }
        ]
    });

    const demoStore = {
        resourceType: 'electric',
        resourceDatasets: {
            electric: {
                mode: 'equipment',
                equipmentEntries: makeEquipmentEntries(ELECTRIC_FIELD_DEFS),
                teamAssignments: {
                    team_01_01: ['field_03', 'field_04', 'field_05'],
                    team_01_02: ['field_01', 'field_02', 'field_06', 'field_07', 'field_08', 'field_09', 'field_10', 'field_11'],
                    team_02: ['field_12', 'field_13', 'field_14', 'field_15', 'field_16'],
                    team_03: ['field_17', 'field_18'],
                    team_04: ['field_19', 'field_28'],
                    power_total: ['field_21', 'field_22', 'field_23'],
                    power_reactive: ['field_25', 'field_26']
                },
                teamMonthlyEntries: buildMonthlyMap((month) => ({
                    team_01_01: Math.round(month.electric * 0.32),
                    power_plantB: Math.round(month.electric * 0.28)
                })),
                teamMonthlyAmountEntries: buildMonthlyMap((month) => ({
                    team_01_01: Math.round(month.electricCost * 0.72),
                    power_plantB: Math.round(month.electricCost * 0.28)
                })),
                billingSettlementEntries: buildMonthlyMap(makeElectricBilling),
                billingDocuments: {},
                presetImportVersion: 6,
                entryResetVersion: 1,
                entryStatusBaselineVersion: 3,
                equipmentFactorMigrationVersion: 2,
                teamAssignmentBaselineVersion: 1,
                historicalEntryValueFixVersion: 4,
                stickMeterSplitVersion: 3
            },
            gas: {
                mode: 'equipment',
                equipmentEntries: makeEquipmentEntries(GAS_FIELD_DEFS),
                teamAssignments: {},
                teamMonthlyEntries: buildMonthlyMap((month) => ({
                    team_01_01: month.gas,
                    plantA_lpg: month.lpg,
                    plantA_lng: month.lng
                })),
                teamMonthlyAmountEntries: {},
                billingSettlementEntries: buildMonthlyMap((month) => ({
                    scopes: {
                        gas_plantB: makeSettlement({ power_charge: month.gasCost, operation_fee: 0, vat: Math.round(month.gasCost * 0.1), fuel_adjustment_charge: 0, rounding_adjustment: 0, billing_amount: Math.round(month.gasCost * 1.1) }),
                        plantA_lng: makeSettlement({ power_charge: Math.round(month.gasCost * 0.72), operation_fee: 0, vat: Math.round(month.gasCost * 0.072), fuel_adjustment_charge: 0, rounding_adjustment: 0, calorific_value: 42.9, billing_amount: Math.round(month.gasCost * 0.792) }),
                        plantA_lpg: makeSettlement({ power_charge: Math.round(month.gasCost * 0.31), vat: Math.round(month.gasCost * 0.031), billing_amount: Math.round(month.gasCost * 0.341) })
                    }
                })),
                billingDocuments: {}
            },
            waste: {
                mode: 'team',
                equipmentEntries: {},
                teamAssignments: {},
                teamMonthlyEntries: buildMonthlyMap((month) => ({ waste_plantB: month.wasteB, waste_plantA: month.wasteA })),
                teamMonthlyAmountEntries: {},
                billingSettlementEntries: buildMonthlyMap((month) => ({
                    scopes: {
                        waste_plantB: makeSettlement({ water: 920000, share: 480000, sludge: 1120000, resin: 500000, labor: Math.max(0, month.wasteBCost - 3020000), billing_amount: month.wasteBCost }),
                        waste_plantA: makeSettlement({ water: 710000, share: 330000, sludge: 630000, resin: 320000, outsourcing: Math.max(0, month.wasteACost - 1990000), billing_amount: month.wasteACost })
                    }
                })),
                billingDocuments: {}
            },
            production: {
                mode: 'team',
                equipmentEntries: {},
                teamAssignments: {},
                teamMonthlyEntries: buildMonthlyMap((month) => ({ combined: month.production })),
                teamMonthlyAmountEntries: {},
                billingSettlementEntries: {},
                billingDocuments: {}
            }
        },
        manualSaveHistory: [
            {
                savedAt: UPDATED_AT,
                trigger: 'demo-bootstrap',
                resourceType: 'electric',
                mode: 'equipment',
                contextLabel: 'Synthetic portfolio fixtures'
            },
            {
                savedAt: '2026-04-24T08:30:00.000Z',
                trigger: 'demo-production-import',
                resourceType: 'production',
                mode: 'team',
                contextLabel: 'Portfolio utility entry seed'
            }
        ]
    };

    const hasServerMeteringRuntime = window.__KPI_SERVER_RUNTIME_CONFIG__?.metering?.enabled === true;
    if (!hasServerMeteringRuntime && !isPlainObject(window.__SHARED_APP_CONFIG__) && !isPlainObject(window.__SHARED_APP_CONFIG)) {
        window.__SHARED_APP_CONFIG__ = { enabled: false, apiBase: '/api' };
        window.__SHARED_APP_CONFIG = window.__SHARED_APP_CONFIG__;
    }
    if (!hasServerMeteringRuntime && !isPlainObject(window.__LOCAL_APP_STORE__)) {
        window.__LOCAL_APP_STORE__ = clone(demoStore);
    }
    if (isPlainObject(window.__LOCAL_APP_STORE__)) {
        const electricDataset = window.__LOCAL_APP_STORE__.resourceDatasets?.electric || {};
        const gasDataset = window.__LOCAL_APP_STORE__.resourceDatasets?.gas || {};
        window.__PRESET_ELECTRIC_ENTRIES__ = isPlainObject(window.__PRESET_ELECTRIC_ENTRIES__)
            ? window.__PRESET_ELECTRIC_ENTRIES__
            : (electricDataset.equipmentEntries || {});
        window.__PRESET_GAS_ENTRIES__ = isPlainObject(window.__PRESET_GAS_ENTRIES__)
            ? window.__PRESET_GAS_ENTRIES__
            : (gasDataset.equipmentEntries || {});
    }
    window.__KPI_DEMO_DATA__ = Object.freeze({
        enabled: true,
        company: 'Demo Organization',
        months: MONTHS.map((month) => month.key),
        updatedAt: UPDATED_AT,
        note: 'Synthetic portfolio fixtures. No company records are included.'
    });
})();
