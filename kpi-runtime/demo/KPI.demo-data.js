(function bootstrapKpiDemoData() {
    const UPDATED_AT = '2026-04-24T00:00:00.000Z';
    const MONTHS = [
        { key: '2026-01', electric: 48200, gas: 1620, lpg: 12.4, lng: 38.2, wasteB: 1380, wasteA: 920, production: 46600, electricCost: 19233000, gasCost: 1408000, wasteBCost: 3180000, wasteACost: 2110000 },
        { key: '2026-02', electric: 46350, gas: 1555, lpg: 11.7, lng: 36.8, wasteB: 1460, wasteA: 980, production: 45100, electricCost: 18715000, gasCost: 1362000, wasteBCost: 3330000, wasteACost: 2240000 },
        { key: '2026-03', electric: 49780, gas: 1710, lpg: 13.2, lng: 41.4, wasteB: 1510, wasteA: 1030, production: 48250, electricCost: 20273000, gasCost: 1510000, wasteBCost: 3460000, wasteACost: 2360000 },
        { key: '2026-04', electric: 45120, gas: 1840, lpg: 14.5, lng: 43.1, wasteB: 1580, wasteA: 1090, production: 49200, electricCost: 20108000, gasCost: 1606000, wasteBCost: 3620000, wasteACost: 2490000 }
    ];
    const WORK_TEAMS = [
        { dataKey: 'work_team_calendar_team1_part1', historyKey: 'team1part1', title: 'Line Alpha', teamName: 'Line Alpha', site: 'Plant B', room: 'Dry Line 1', process: 'dry', members: ['Operator A', 'Operator C'], date: '2026-04-20', day: 'mon', product: 'Demo Powder A', amount: 12800, task: 'Startup inspection and meter reading confirmation' },
        { dataKey: 'work_team_calendar_team1_part2', historyKey: 'team1part2', title: 'Line Beta', teamName: 'Line Beta', site: 'Plant A', room: 'Dry Room 2', process: 'dry', members: ['Operator D'], date: '2026-04-21', day: 'tue', product: 'Demo Blend A', amount: 10400, task: 'Compressor cycle check and material staging review' },
        { dataKey: 'work_team_calendar_team2', historyKey: 'team2', title: 'Line Gamma', teamName: 'Line Gamma', site: 'Plant A', room: 'Stick Line', process: 'stick', members: ['Operator F'], date: '2026-04-24', day: 'fri', product: 'Demo Stick A', amount: 7600, task: 'Heater balance and trim-loss corrective action review' },
        { dataKey: 'work_team_calendar_team3', historyKey: 'team3', title: 'Line Delta', teamName: 'Line Delta', site: 'Plant A', room: 'Liquid Line', process: 'liquid', members: ['Operator B', 'Operator G'], date: '2026-04-23', day: 'thu', product: 'Demo Liquid A', amount: 15800, task: 'CIP checklist and filling line run-rate variance check' },
        { dataKey: 'work_team_calendar_team4', historyKey: 'team4', title: 'Facility Support', teamName: 'Facility Support', site: 'Plant A', room: 'Utility Room', process: 'facility', members: ['Operator E'], date: '2026-04-22', day: 'wed', product: 'Facility KPI', amount: 0, task: 'Wastewater flow check and lighting corrective action' }
    ];
    const CALENDAR_GROUPS = [
        { key: 'work_team_calendar_process_dry', title: 'Dry Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'dry') },
        { key: 'work_team_calendar_process_stick', title: 'Stick Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'stick') },
        { key: 'work_team_calendar_process_liquid', title: 'Liquid Process Calendar', teams: WORK_TEAMS.filter((team) => team.process === 'liquid') },
        { key: 'work_team_calendar_group_plantB', title: 'Plant B Calendar', teams: WORK_TEAMS.filter((team) => team.site === 'Plant B') },
        { key: 'work_team_calendar_group_plantA', title: 'Plant A Calendar', teams: WORK_TEAMS.filter((team) => team.site === 'Plant A') },
        { key: 'work_team_calendar_overview', title: 'Integrated Operations Calendar', teams: WORK_TEAMS }
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

    function makeCompletedEntry(values) {
        return {
            values,
            completed: true,
            dayStatus: 'completed',
            updatedAt: UPDATED_AT
        };
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
            category: isKpi ? 'Energy efficiency improvement' : 'Operating monitoring',
            kpi: isKpi,
            assignees: team.members,
            assignee: team.members.join(', '),
            workContent: `${team.task}. Result was summarized for the ${team.title} dashboard.`,
            remarks: 'Demo work-history card.',
            attachmentSlots: { billing: null, report: null },
            cost: isKpi ? 0 : 250000 + index * 70000
        };
    }

    function makeProductionEntry(team, index) {
        return {
            date: team.date,
            team: team.teamName,
            teamName: team.teamName,
            lineName: team.room,
            productName: team.product,
            amount: team.amount,
            moistureExcludedYield: team.amount ? 92 + index : null,
            equipmentCapa: team.amount ? team.amount + 2200 : null,
            equipmentUtilization: team.amount ? 78 + index * 2 : null
        };
    }

    function makeWasteRows(siteKey) {
        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const rows = monthLabels.map((label, index) => {
            const month = MONTHS[index];
            const usage = month ? (siteKey === 'Plant B' ? month.wasteB : month.wasteA) : null;
            const cost = month ? (siteKey === 'Plant B' ? month.wasteBCost : month.wasteACost) : null;
            const baseCosts = siteKey === 'Plant B'
                ? { water: 920000, share: 480000, sludge: 1120000, resin: 500000, labor: 600000 }
                : { water: 710000, share: 330000, sludge: 630000, resin: 320000, outsourcing: 500000 };
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
                    base_charge: 1540000,
                    power_charge: Math.round(month.electricCost * 0.54),
                    climate_environment_charge: 318000,
                    fuel_adjustment_charge: 266000,
                    vat: Math.round(month.electricCost * 0.065),
                    electric_power_fund: 412000,
                    billing_amount: Math.round(month.electricCost * 0.72)
                }),
                plantB: makeSettlement({
                    base_charge: 720000,
                    power_charge: Math.round(month.electricCost * 0.21),
                    climate_environment_charge: 174000,
                    fuel_adjustment_charge: 144000,
                    vat: Math.round(month.electricCost * 0.023),
                    electric_power_fund: 224000,
                    billing_amount: Math.round(month.electricCost * 0.28)
                })
            }
        };
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
            version: 1,
            updatedAt: UPDATED_AT
        },
        teams: Object.fromEntries(WORK_TEAMS.map((team, index) => [team.historyKey, [makeHistoryRecord(team, index)]]))
    });
    setPortalDataDefault('util_production_daily', {
        meta: {
            moduleKey: 'util_production',
            recordKey: 'daily_state_v1',
            permissionKey: 'util.production.daily',
            moduleName: 'Demo Utility Production Daily',
            version: 3,
            updatedAt: UPDATED_AT
        },
        periodDefault: { startDay: 1 },
        teams: WORK_TEAMS.filter((team) => team.amount > 0).map((team, index) => ({
            name: team.teamName,
            entries: [makeProductionEntry(team, index)]
        })),
        archives: []
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

    const demoStore = {
        resourceType: 'electric',
        resourceDatasets: {
            electric: {
                mode: 'equipment',
                equipmentEntries: {
                    '2026-01-01': makeCompletedEntry({ field_01: '10240', field_02: '8840', field_05: '6130', field_09: '4200', field_13: '350' }),
                    '2026-04-24': makeCompletedEntry({ field_01: '16670', field_02: '14030', field_05: '11220', field_09: '8030', field_13: '604' })
                },
                teamAssignments: {
                    team_01_02: ['field_05'],
                    team_02: ['field_13'],
                    team_03: ['field_09'],
                    power_total: ['field_01', 'field_02', 'field_05', 'field_09', 'field_13']
                },
                teamMonthlyEntries: buildMonthlyMap((month) => ({ team_01_01: month.electric, power_plantB: Math.round(month.electric * 0.28) })),
                teamMonthlyAmountEntries: buildMonthlyMap((month) => ({ team_01_01: Math.round(month.electricCost * 0.72), power_plantB: Math.round(month.electricCost * 0.28) })),
                billingSettlementEntries: buildMonthlyMap(makeElectricBilling),
                billingDocuments: {}
            },
            gas: {
                mode: 'equipment',
                equipmentEntries: {
                    '2026-01-01': makeCompletedEntry({ gas_field_02: '58', gas_field_03: '1040', gas_field_04: '720', gas_field_06: '360' }),
                    '2026-04-24': makeCompletedEntry({ gas_field_02: '141', gas_field_03: '1388', gas_field_04: '1018', gas_field_06: '566' })
                },
                teamAssignments: {},
                teamMonthlyEntries: buildMonthlyMap((month) => ({ team_01_01: month.gas, plantA_lpg: month.lpg, plantA_lng: month.lng })),
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
                        waste_plantB: makeSettlement({ water: 920000, share: 480000, sludge: 1120000, resin: 500000, labor: month.wasteBCost - 3020000, billing_amount: month.wasteBCost }),
                        waste_plantA: makeSettlement({ water: 710000, share: 330000, sludge: 630000, resin: 320000, outsourcing: month.wasteACost - 1990000, billing_amount: month.wasteACost })
                    }
                })),
                billingDocuments: {}
            },
            production: {
                mode: 'equipment',
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
                contextLabel: 'Synthetic demo fixtures'
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
        company: 'Aster Demo Manufacturing',
        months: MONTHS.map((month) => month.key),
        updatedAt: UPDATED_AT,
        note: 'Synthetic portfolio fixtures. No company records are included.'
    });
})();
