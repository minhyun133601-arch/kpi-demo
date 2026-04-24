        collectUtilEntries(UTIL_ELECTRIC_DATA, UTIL_ELECTRIC_ENTRIES);
        collectUtilEntries(UTIL_GAS_DATA, UTIL_GAS_ENTRIES);
        collectUtilEntries(UTIL_WASTE_DATA, UTIL_WASTE_ENTRIES);

        const UTIL_WASTE_COST_BASE = [
            { key: 'total', label: '총 운용비용 (원)' },
            { key: 'water', label: '상수비 (원)' },
            { key: 'share', label: '폐수 분담금 (원)' },
            { key: 'sludge', label: '폐수오니 처리비용 (원)' },
            { key: 'resin', label: '폐합성 수지 처리비용 (원)' }
        ];

        function getWasteCostModesByTeam(teamName) {
            const selection = resolveUtilDeleteTeamSelectionValue(teamName);
            const includeLabor = selection === '전체' || selection === 'Line Alpha' || String(teamName || '').includes('Plant B');
            const includeOutsourcing = selection === '전체'
                || selection === 'Plant A'
                || selection === 'Line Beta'
                || selection === 'Line Gamma'
                || selection === 'Line Delta'
                || String(teamName || '').includes('Plant A');
            const modes = UTIL_WASTE_COST_BASE.slice();
            if (includeLabor) {
                modes.push({ key: 'labor', label: '인건비 (원)' });
            }
            if (includeOutsourcing) {
                modes.push({ key: 'outsourcing', label: '위탁관리비 (원)' });
            }
            return modes;
        }

        const UTIL_DUAL_CONFIG = {
            electric: {
                data: UTIL_ELECTRIC_DATA,
                usageLabel: '사용량 (kWh)',
                costLabel: '비용 (원)',
                productionLabel: '생산량 (kg)',
                emptyText: '전기 사용량 및 비용 데이터를 월별로 공식 기록해 주세요. (kWh, 비용, 생산량 등)'
            },
            gas: {
                data: UTIL_GAS_DATA,
                usageLabel: '사용량 (LNG m³ / LPG kg)',
                usageLabelByTeam: (teamName) => {
                    const name = String(teamName || '');
                    if (name.includes('LPG')) return 'LPG 사용량 (kg)';
                    if (name.includes('LNG')) return 'LNG 사용량 (m³)';
                    return '사용량 (LNG m³ / LPG kg)';
                },
                costLabel: '비용 (원)',
                productionLabel: '생산량 (kg)',
                emptyText: '가스 사용량 및 비용 데이터를 월별로 공식 기록해 주세요. (사용량, 비용, 생산량 등)'
            },
            waste: {
                data: UTIL_WASTE_DATA,
                usageLabel: '방류량 (㎥)',
                costLabel: '총 운용비용 (원)',
                hideCostLabel: true,
                costModesByTeam: getWasteCostModesByTeam,
                costModeKey: 'total',
                productionLabel: '생산량 (kg)',
                emptyText: '폐수 발생 및 처리 데이터를 월별로 공식 기록해 주세요. (배출량, 처리비, 관련 비용 등)'
            }
        };

        const UTIL_ANALYTICS_DATASETS = {
            electric: {
                label: '전기',
                metrics: [
                    { key: 'usage', label: '사용량 (kWh)' },
                    { key: 'cost', label: '비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_ELECTRIC_ENTRIES
            },
            gas: {
                label: '가스',
                metrics: [
                    { key: 'usage', label: '사용량 (LNG m³ / LPG kg)' },
                    { key: 'cost', label: '비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_GAS_ENTRIES
            },
            waste: {
                label: '폐수',
                metrics: [
                    { key: 'usage', label: '방류량 (㎥)' },
                    { key: 'cost', label: '총 운용비용 (원)' },
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_WASTE_ENTRIES
            },
            production: {
                label: '생산량',
                metrics: [
                    { key: 'production', label: '생산량 (kg)' }
                ],
                entries: UTIL_PRODUCTION_ENTRIES
            }
        };

        const UTIL_ANALYTICS_UNIFIED = {
            electric: { key: 'electric', label: '전기', metrics: UTIL_ANALYTICS_DATASETS.electric.metrics, entries: UTIL_ANALYTICS_DATASETS.electric.entries },
            gas: { key: 'gas', label: '가스', metrics: UTIL_ANALYTICS_DATASETS.gas.metrics, entries: UTIL_ANALYTICS_DATASETS.gas.entries },
            waste: { key: 'waste', label: '폐수', metrics: UTIL_ANALYTICS_DATASETS.waste.metrics, entries: UTIL_ANALYTICS_DATASETS.waste.entries, costModesByTeam: getWasteCostModesByTeam }
        };
        const UTIL_CHART_COLORS = ['#0f172a', '#2563eb', '#ef4444', '#16a34a', '#f59e0b', '#7c3aed'];

