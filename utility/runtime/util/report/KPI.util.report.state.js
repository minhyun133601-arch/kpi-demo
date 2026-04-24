        const UTIL_REPORT_WASTE_DETAIL_COLORS = {
            water: '#38bdf8',
            share: '#f97316',
            sludge: '#10b981',
            resin: '#a855f7',
            outsourcing: '#ef4444',
            labor: '#eab308'
        };
        const UTIL_REPORT_GAS_COMBINED_TEAM_LABEL = 'Line Beta LNG+LPG';
        const UTIL_REPORT_GAS_PLANT_A_LNG_LABEL = 'Plant A LNG';
        const UTIL_REPORT_GAS_PLANT_A_LPG_LABEL = 'Plant A LPG';
        const UTIL_REPORT_GAS_OVERALL_LNG_LABEL = '통합 LNG';
        const UTIL_REPORT_GAS_OVERALL_LPG_LABEL = '통합 LPG';
        const UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX = 'team-total-excl-waste';
        const UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY = `${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::total`;
        const UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TEAM_SPECS = [
            { teamName: 'Plant B', label: 'Plant B', color: '#2563eb' },
            { teamName: 'Line Beta', label: 'Line Beta', color: '#f97316' },
            { teamName: 'Line Gamma', label: 'Line Gamma', color: '#16a34a' },
            { teamName: 'Line Delta', label: 'Line Delta', color: '#db2777' }
        ];
        const UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX = 'process-total-excl-waste';
        const UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY = `${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::total`;
        const UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS = [
            { processKey: 'drying', label: 'Process Alpha', teamFilters: ['Plant B', 'Line Beta'], color: '#2563eb' },
            { processKey: 'stick_pouch', label: 'Process Beta', teamFilters: ['Line Gamma'], color: '#16a34a' },
            { processKey: 'liquid', label: 'Process Gamma', teamFilters: ['Line Delta'], color: '#db2777' }
        ];
        const UTIL_REPORT_GAS_PROCESS_SPECS = [
            { processKey: 'drying', label: 'Process Alpha', teamFilters: ['Plant B', 'Line Beta'], color: '#2563eb' },
            { processKey: 'liquid', label: 'Process Gamma', teamFilters: ['Line Delta'], color: '#db2777' }
        ];
        const UTIL_REPORT_ELECTRIC_PROCESS_PREFIX = 'electric-process';
        const UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY = `${UTIL_REPORT_ELECTRIC_PROCESS_PREFIX}::total`;
        const UTIL_REPORT_GAS_PROCESS_PREFIX = 'gas-process';
        const UTIL_REPORT_GAS_PROCESS_TOTAL_KEY = `${UTIL_REPORT_GAS_PROCESS_PREFIX}::total`;
        const UTIL_REPORT_PRODUCTION_PROCESS_PREFIX = 'production-process';
        const UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY = `${UTIL_REPORT_PRODUCTION_PROCESS_PREFIX}::total`;

        const UtilReportState = {
            from: '',
            to: '',
            electricTeam: 'all',
            gasTeam: 'all',
            wasteTeam: 'all',
            productionTeam: 'all',
            wasteCostModeKey: 'total',
            categoryKey: 'cost',
            unitKey: 'krw',
            productionUnitKey: 'kg',
            selectedScopeKeys: ['electric', 'gas', 'waste'],
            decimals: 1,
            scopeKey: 'total',
            metricKey: 'total_cost',
            chartType: 'bar',
            chartFullscreen: false,
            showChartLabels: false,
            compareYear: '',
            chartYear: '',
            focusMonthKey: '',
            focusSeriesKey: '',
            prevYearColor: '',
            currentYearColor: '',
            graphYear: '',
            graphNumeratorMetric: '',
            graphDenominatorMetric: '',
            graphUseDenominator: true,
            graphChartType: 'line',
            openOnReportTab: false,
            builderCustomMode: false,
            builderItemKey: 'electric',
            builderValueKeys: ['electric_usage', 'electric_cost', 'production'],
            activeMetricCard: 'total_cost',
            activeTotalTeamCompositionKey: UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY,
            activeTotalProcessCompositionKey: UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY,
            activeSiteCompositionKey: 'total_cost',
            activeTeamCompositionKey: 'total_cost',
            activeElectricProcessCompositionKey: UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY,
            activeGasProcessCompositionKey: UTIL_REPORT_GAS_PROCESS_TOTAL_KEY,
            activeProductionProcessCompositionKey: UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY,
            activeProductionProductCompositionKey: 'total_production_product',
            activeWasteDetailCompositionKey: '',
            detailMetricOverrideKey: '',
            lastResult: null,
            lastComposition: null,
            totalCompositionView: 'scope',
            excludeWasteCompositionView: 'team',
            electricSelectedCompositionView: 'team',
            gasSelectedCompositionView: 'team',
            productionSelectedCompositionView: 'team',
            costTotalSelectedCompositionView: 'total',
            insightView: 'yoy',
            compositionScope: 'total'
        };
        const UtilReportDetachedTableState = {
            win: null,
            focusMonthToken: '',
            focusMonthKey: '',
            focusSeriesKey: '',
            detached: false
        };
        const UtilReportBuilderState = {
            from: '',
            to: '',
            team: '전체',
            itemKey: 'electric',
            appliedBaseYear: '',
            appliedCompareYear: '',
            valueKeys: ['electric_usage', 'electric_cost', 'production']
        };

        function resetUtilReportSelectedProcessStates() {
            UtilReportState.activeElectricProcessCompositionKey = UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY;
            UtilReportState.electricSelectedCompositionView = 'team';
            UtilReportState.activeGasProcessCompositionKey = UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
            UtilReportState.gasSelectedCompositionView = 'team';
            UtilReportState.activeProductionProcessCompositionKey = UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
            UtilReportState.productionSelectedCompositionView = 'team';
            UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
            UtilReportState.costTotalSelectedCompositionView = 'total';
        }

        const UTIL_REPORT_BUILDER_VIZ_USAGE_UNIT_OPTIONS = {
            electric: [
                { key: 'kwh', label: 'kWh', scale: 1 },
                { key: 'mwh', label: 'MWh', scale: 1000 }
            ],
            gas: [
                { key: 'm3', label: 'm³', scale: 1 },
                { key: 'km3', label: '천m³', scale: 1000 }
            ],
            waste: [
                { key: 'wm3', label: '㎥', scale: 1 },
                { key: 'kwm3', label: '천㎥', scale: 1000 }
            ]
        };
        const UtilReportBuilderVizState = {
            from: '',
            to: '',
            team: '전체',
            itemKey: 'electric',
            usageUnitKey: 'kwh',
            costUnitKey: 'krw',
            productionUnitKey: 'kg',
            usageDecimals: 1,
            costDecimals: 1,
            productionDecimals: 1,
            ratioDecimals: 3,
            decimals: 1,
            showLabels: false,
            usageChartType: 'bar',
            costChartType: 'line',
            productionChartType: 'line',
            ratioChartType: 'line',
            ratioActualChartType: '',
            ratioAppliedChartType: '',
            appliedModeEnabled: false,
            focusSeriesKey: '',
            isolatedSeriesKey: '',
            detailFocusSeriesKey: '',
            focusMonthKey: '',
            chartViewKey: 'main',
            chartFullscreen: false,
            pendingDetailScroll: false,
            hasGenerated: false,
            isDirty: true
        };
        const UtilReportBuilderVizDetachedTableState = {
            win: null,
            detached: false
        };
        const UtilReportBuilderVizPopupState = {
            win: null
        };

        const UTIL_REPORT_METRIC_OPTIONS = [
            { key: 'total_cost', label: '총합', type: 'cost' },
            { key: 'electric_cost', label: '전기', type: 'cost' },
            { key: 'gas_cost', label: '가스', type: 'cost' },
            { key: 'waste_cost', label: '폐수', type: 'cost' },
            { key: 'electric_usage', label: '전기 사용량', type: 'usage' },
            { key: 'gas_usage', label: '가스 사용량', type: 'usage' },
            { key: 'waste_usage', label: '폐수 사용량', type: 'usage' },
            { key: 'production', label: '생산량', type: 'production' }
        ];

        const UTIL_REPORT_SCOPE_OPTIONS = [
            { key: 'total', label: '총합', metricKey: 'total_cost' },
            { key: 'electric', label: '전기', metricKey: 'electric_cost' },
            { key: 'gas', label: '가스', metricKey: 'gas_cost' },
            { key: 'waste', label: '폐수', metricKey: 'waste_cost' }
        ];

        const UTIL_REPORT_CATEGORY_OPTIONS = [
            { key: 'cost', label: '비용' },
            { key: 'production', label: '생산량' }
        ];

        const UTIL_REPORT_PRODUCTION_UNIT_OPTIONS = [
            { key: 'kg', label: 'kg', scale: 1 },
            { key: '10kg', label: '10kg', scale: 10 },
            { key: '100kg', label: '100kg', scale: 100 },
            { key: 'ton', label: '톤', scale: 1000 }
        ];

        const UTIL_REPORT_PRODUCTION_TEAM_OPTIONS = ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta', 'Plant A'];
        const UTIL_REPORT_PRODUCTION_TEAM_BASE = ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta'];
        const UTIL_REPORT_BUILDER_TEAM_OPTIONS = ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta', 'Plant A', '전체'];
        const UTIL_REPORT_BUILDER_ITEM_OPTIONS = [
            { key: 'electric', label: '전기', enabled: true },
            { key: 'gas', label: '가스', enabled: true },
            { key: 'waste', label: '폐수', enabled: true }
        ];

        const UTIL_REPORT_BUILDER_VALUE_OPTIONS = {
            electric: [
                { key: 'electric_usage', label: '사용량 (kWh)' },
                { key: 'electric_cost', label: '비용 (원)' },
                { key: 'production', label: '생산량 (kg)' }
            ],
            gas: [
                { key: 'gas_usage', label: '사용량 (m³)' },
                { key: 'gas_cost', label: '비용 (원)' },
                { key: 'production', label: '생산량 (kg)' }
            ],
            waste: [
                { key: 'waste_usage', label: '사용량 (톤)' },
                { key: 'waste_cost', label: '비용 (원)' },
                { key: 'production', label: '생산량 (kg)' }
            ]
        };

        const UTIL_REPORT_DONUT_COLORS = {
            electric_cost: '#2563EB',
            gas_cost: '#DC2626',
            waste_cost: '#0EA5A3',
            electric_production: '#2563EB',
            gas_production: '#DC2626',
            waste_production: '#0EA5A3'
        };

        const UTIL_REPORT_COMPOSITION_KEYSETS = {
            cost: {
                total: 'total_cost',
                electric: 'electric_cost',
                gas: 'gas_cost',
                waste: 'waste_cost'
            },
            production: {
                total: 'total_production',
                electric: 'electric_production',
                gas: 'gas_production',
                waste: 'waste_production'
            }
        };

        const UTIL_REPORT_SITE_COLORS = {
            plantA: '#2563eb',
            plantB: '#f97316'
        };

        const UTIL_REPORT_WASTE_DETAIL_LABELS = {
            total: '총 폐수비용 (원)',
            water: '용수비 (원)',
            share: '폐수 부담금 (원)',
            sludge: '폐수 슬러지 처리비용 (원)',
            resin: '유합수지 처리비용 (원)',
            outsourcing: '위탁 관리비 (원)',
            labor: '인건비 (원)'
        };

        const UTIL_ENERGY_REPORT_SCOPE_OPTIONS = [
            { key: 'total', label: '총열량', metricKey: 'total_energy' },
            { key: 'electric', label: '전기', metricKey: 'electric_energy' },
            { key: 'gas', label: '가스', metricKey: 'gas_energy' }
        ];

        const UTIL_ENERGY_REPORT_DONUT_COLORS = {
            electric_energy: '#2563eb',
            gas_energy: '#dc2626'
        };

        const UtilEnergyReportState = {
            from: '',
            to: '',
            compareYear: '',
            chartYear: '',
            unitKey: 'gj',
            decimals: 1,
            chartType: 'bar',
            chartFullscreen: false,
            showChartLabels: false,
            electricBasis: 'final',
            electricFactor: UTIL_ENERGY_DEFAULTS.electricFinal,
            gasLNG: UTIL_ENERGY_DEFAULTS.gasLNG,
            gasLPG: UTIL_ENERGY_DEFAULTS.gasLPG,
            toeFactor: UTIL_ENERGY_DEFAULTS.toeMJ,
            showToe: true,
            electricTeam: 'all',
            gasTeam: 'all',
            scopeKey: 'total',
            metricKey: 'total_energy',
            activeMetricCard: 'total_energy',
            activeTeamCompositionKey: '',
            activeSiteKey: 'all',
            activeSourceKey: '',
            activeDetailKey: '',
            focusMonthKey: '',
            focusSeriesKey: '',
            pendingDetailScroll: false,
            prevYearColor: '',
            currentYearColor: '',
            lastResult: null
        };

        const UtilReportOverrideState = {
            productionByMonth: {}
        };

        function normalizeUtilEnergyReportScope(scopeKey) {
            const raw = String(scopeKey || '').trim();
            return UTIL_ENERGY_REPORT_SCOPE_OPTIONS.some(item => item.key === raw) ? raw : 'total';
        }

        function getUtilEnergyReportMetricFromScope(scopeKey) {
            return (UTIL_ENERGY_REPORT_SCOPE_OPTIONS.find(item => item.key === normalizeUtilEnergyReportScope(scopeKey)) || UTIL_ENERGY_REPORT_SCOPE_OPTIONS[0]).metricKey;
        }

        function getUtilEnergyReportScopeFromMetric(metricKey) {
            return (UTIL_ENERGY_REPORT_SCOPE_OPTIONS.find(item => item.metricKey === String(metricKey || '').trim()) || UTIL_ENERGY_REPORT_SCOPE_OPTIONS[0]).key;
        }

        function resolveUtilEnergyReportDisplayScopeKey() {
            const detailParsed = parseUtilEnergyReportDetailMetric(UtilEnergyReportState.activeDetailKey);
            if (detailParsed.sourceKey === 'gas') return 'gas';
            if (detailParsed.sourceKey === 'electric') return 'electric';
            const sourceParsed = parseUtilEnergyReportSourceMetric(UtilEnergyReportState.activeSourceKey);
            if (sourceParsed.siteKey === 'all' && sourceParsed.sourceKey === 'gas') return 'gas';
            if (sourceParsed.siteKey === 'all' && sourceParsed.sourceKey === 'electric') return 'electric';
            return 'total';
        }

        function normalizeUtilEnergyReportUnitKey(unitKey) {
            const raw = String(unitKey || '').trim().toLowerCase();
            return raw === 'mj' ? 'mj' : 'gj';
        }

        function getUtilEnergyReportUnitScale(unitKey) {
            return normalizeUtilEnergyReportUnitKey(unitKey) === 'mj' ? 1 : 1000;
        }

        function getUtilEnergyReportUnitLabel(unitKey) {
            return normalizeUtilEnergyReportUnitKey(unitKey) === 'mj' ? 'MJ' : 'GJ';
        }

        function normalizeUtilEnergyReportElectricBasis(value) {
            const raw = String(value || '').trim().toLowerCase();
            return raw === 'primary' ? 'primary' : 'final';
        }

        function resolveUtilEnergyReportElectricFactor(state = UtilEnergyReportState) {
            return normalizeUtilEnergyReportElectricBasis(state.electricBasis) === 'primary'
                ? UTIL_ENERGY_DEFAULTS.electricPrimary
                : UTIL_ENERGY_DEFAULTS.electricFinal;
        }

        function formatUtilEnergyReportScaled(value, unitKey, decimals) {
            if (!Number.isFinite(value)) return '-';
            return formatUtilNumber(value / getUtilEnergyReportUnitScale(unitKey), decimals);
        }

        function formatUtilEnergyReportSignedScaled(value, unitKey, decimals) {
            if (!Number.isFinite(value)) return '-';
            const scaled = value / getUtilEnergyReportUnitScale(unitKey);
            const sign = scaled > 0 ? '+' : '';
            return `${sign}${formatUtilNumber(scaled, decimals)}`;
        }

        function toUtilMonthKey(year, month) {
            return `${year}-${String(month).padStart(2, '0')}`;
        }

        function shiftUtilMonthKeyByYear(monthKey, diffYear) {
            const parsed = parseUtilMonthValue(monthKey);
            if (!parsed) return '';
            return toUtilMonthKey(parsed.year + diffYear, parsed.month);
        }

        function getUtilReportScale(unitKey) {
            switch (String(unitKey || 'krw')) {
                case 'none': return 1;
                case 'thousand': return 1000;
                case 'million': return 1000000;
                default: return 1;
            }
        }

        function getUtilReportUnitLabel(unitKey) {
            switch (String(unitKey || 'krw')) {
                case 'none': return '';
                case 'thousand': return '천원';
                case 'million': return '백만원';
                default: return '원';
            }
        }

        function normalizeUtilReportCostUnitKey(unitKey) {
            const raw = String(unitKey || '').trim().toLowerCase();
            if (raw === '1') return 'krw';
            if (raw === '1000') return 'thousand';
            if (raw === '1000000') return 'million';
            if (raw === 'krw' || raw === 'thousand' || raw === 'million') return raw;
            return 'krw';
        }

        function normalizeUtilReportProductionUnitKey(unitKey) {
            const raw = String(unitKey || '').trim();
            return UTIL_REPORT_PRODUCTION_UNIT_OPTIONS.some(item => item.key === raw) ? raw : 'kg';
        }

        function getUtilReportProductionScale(unitKey) {
            const normalized = normalizeUtilReportProductionUnitKey(unitKey);
            const matched = UTIL_REPORT_PRODUCTION_UNIT_OPTIONS.find(item => item.key === normalized);
            return matched ? matched.scale : 1;
        }

        function getUtilReportProductionUnitLabel(unitKey) {
            const normalized = normalizeUtilReportProductionUnitKey(unitKey);
            if (normalized === '10kg') return '10kg';
            if (normalized === '100kg') return '100kg';
            if (normalized === 'ton') return '톤';
            return 'kg';
        }

        function normalizeUtilReportProductionTeam(teamName) {
            const raw = String(teamName || '').trim();
            if (!raw || raw === 'all' || raw === '전체') return 'all';
            if (UTIL_REPORT_PRODUCTION_TEAM_OPTIONS.includes(raw)) return raw;
            const canonical = canonicalizeUtilTeamName(raw);
            if (canonical === 'LineAlpha') return 'Line Alpha';
            if (canonical === 'LineBeta') return 'Line Beta';
            if (canonical === 'LineGamma') return 'Line Gamma';
            if (canonical === 'LineDelta') return 'Line Delta';
            if (canonical === 'Plant B') return 'Line Alpha';
            if (canonical === 'Plant A') return 'Plant A';
            return 'all';
        }

        function syncUtilReportUnitSelectOptions(selectEl, categoryKey) {
            if (!selectEl) return;
            const category = normalizeUtilReportCategory(categoryKey);
            if (category === 'production') {
                const normalizedValue = normalizeUtilReportProductionUnitKey(UtilReportState.productionUnitKey);
                selectEl.innerHTML = UTIL_REPORT_PRODUCTION_UNIT_OPTIONS
                    .map(item => `<option value="${item.key}">${item.label}</option>`)
                    .join('');
                selectEl.value = normalizedValue;
                return;
            }
            const normalizedValue = normalizeUtilReportCostUnitKey(UtilReportState.unitKey);
            selectEl.innerHTML = `
                <option value="krw">원</option>
                <option value="thousand">천원</option>
                <option value="million">백만원</option>
            `;
            selectEl.value = normalizedValue;
        }

        function getUtilReportMetricOption(metricKey) {
            const totalExcludeWasteDescriptor = getUtilReportTotalExcludeWasteMetricDescriptor(metricKey);
            if (totalExcludeWasteDescriptor) {
                return {
                    key: totalExcludeWasteDescriptor.key,
                    label: totalExcludeWasteDescriptor.label,
                    type: 'cost'
                };
            }
            const selectedDetailDescriptor = getUtilReportSelectedDetailMetricDescriptor(metricKey);
            if (selectedDetailDescriptor) {
                return {
                    key: selectedDetailDescriptor.key,
                    label: selectedDetailDescriptor.label,
                    type: 'cost'
                };
            }
            const productionProductDetailMetric = parseUtilReportProductionProductDetailMetric(metricKey);
            if (productionProductDetailMetric && !productionProductDetailMetric.isTotal && productionProductDetailMetric.compositionMetric) {
                return {
                    key: productionProductDetailMetric.raw,
                    label: getUtilReportProductionProductDetailMetricLabel(productionProductDetailMetric),
                    type: 'production'
                };
            }
            return UTIL_REPORT_METRIC_OPTIONS.find(item => item.key === metricKey) || UTIL_REPORT_METRIC_OPTIONS[0];
        }

        function getUtilReportScopeOption(scopeKey) {
            return UTIL_REPORT_SCOPE_OPTIONS.find(item => item.key === scopeKey) || UTIL_REPORT_SCOPE_OPTIONS[0];
        }

        function normalizeUtilReportScope(scopeKey) {
            return getUtilReportScopeOption(String(scopeKey || '').trim()).key;
        }

        function normalizeUtilReportSelectedScopeKeys(scopeKeys) {
            const allowed = new Set(['electric', 'gas', 'waste']);
            const list = Array.isArray(scopeKeys) ? scopeKeys : [];
            const normalized = [];
            list.forEach(item => {
                const key = String(item || '').trim();
                if (!allowed.has(key)) return;
                if (normalized.includes(key)) return;
                normalized.push(key);
            });
            if (!normalized.length) return ['electric', 'gas', 'waste'];
            return normalized;
        }

        function normalizeUtilReportBuilderItemKey(itemKey) {
            const raw = String(itemKey || '').trim();
            const matched = UTIL_REPORT_BUILDER_ITEM_OPTIONS.find(item => item.key === raw);
            if (matched && matched.enabled !== false) return matched.key;
            const fallback = UTIL_REPORT_BUILDER_ITEM_OPTIONS.find(item => item.enabled !== false);
            return fallback ? fallback.key : 'electric';
        }

        function getUtilReportBaseTeamOrderRank(teamName) {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (canonical === 'LineAlpha') return 0;
            if (canonical === 'LineBeta') return 1;
            if (canonical === 'LineGamma') return 2;
            if (canonical === 'LineDelta') return 3;
            if (canonical === 'Plant B') return 4;
            if (canonical === 'Plant A') return 5;
            return 50;
        }

        function hasUtilReportTeamOption(entries, teamName) {
            const normalizedSite = normalizeUtilReportSiteKey(teamName);
            const canonical = canonicalizeUtilTeamName(teamName);
            return (entries || []).some(entry => {
                const entryTeam = String(entry?.team || '').trim();
                if (!entryTeam) return false;
                if (normalizedSite !== 'all' && resolveUtilReportSiteKeyByTeam(entryTeam) === normalizedSite) return true;
                if (canonical && canonicalizeUtilTeamName(entryTeam) === canonical) return true;
                return false;
            });
        }

        function parseUtilReportGasAggregateTeamLabel(teamName = '') {
            const normalized = normalizeUtilTeamName(teamName).toLowerCase();
            if (!normalized) return null;
            if (normalized === 'Plant Alng') {
                return { groupKey: 'plantA', fuelKey: 'lng', label: UTIL_REPORT_GAS_PLANT_A_LNG_LABEL };
            }
            if (normalized === 'Plant Alpg') {
                return { groupKey: 'plantA', fuelKey: 'lpg', label: UTIL_REPORT_GAS_PLANT_A_LPG_LABEL };
            }
            if (normalized === '통합lng' || normalized === '전체lng') {
                return { groupKey: 'overview', fuelKey: 'lng', label: UTIL_REPORT_GAS_OVERALL_LNG_LABEL };
            }
            if (normalized === '통합lpg' || normalized === '전체lpg') {
                return { groupKey: 'overview', fuelKey: 'lpg', label: UTIL_REPORT_GAS_OVERALL_LPG_LABEL };
            }
            return null;
        }

        function getUtilReportGasAggregateSourceTeams(teamName = '') {
            const parsed = parseUtilReportGasAggregateTeamLabel(teamName);
            if (!parsed) return [];
            const plantAFuelSource = parsed.fuelKey === 'lpg' ? 'Line Beta (LPG)' : 'Line Beta (LNG)';
            const plantASources = [plantAFuelSource, 'Line Delta (LNG)'];
            if (parsed.groupKey === 'overview') return ['Line Alpha (LNG)'].concat(plantASources);
            return plantASources;
        }

        function matchesUtilReportGasSourceTeam(entryTeamName, sourceTeamName) {
            const entry = String(entryTeamName || '').trim();
            const source = String(sourceTeamName || '').trim();
            if (!entry || !source) return false;
            if (entry === source) return true;
            const entryCanonical = canonicalizeUtilTeamName(entry);
            const sourceCanonical = canonicalizeUtilTeamName(source);
            if (!entryCanonical || !sourceCanonical || entryCanonical !== sourceCanonical) return false;
            const sourceFuel = inferUtilFuelType(source);
            if (!sourceFuel) return true;
            return inferUtilFuelType(entry) === sourceFuel;
        }

        function hasUtilReportGasTeamOption(entries, teamName, fuelKey = '') {
            const aggregateSources = getUtilReportGasAggregateSourceTeams(teamName);
            if (aggregateSources.length) {
                return aggregateSources.every(sourceTeamName =>
                    (entries || []).some(entry => matchesUtilReportGasSourceTeam(entry?.team, sourceTeamName))
                );
            }
            const normalizedSite = normalizeUtilReportSiteKey(teamName);
            const canonical = canonicalizeUtilTeamName(teamName);
            return (entries || []).some(entry => {
                const entryTeam = String(entry?.team || '').trim();
                if (!entryTeam) return false;
                if (normalizedSite !== 'all') return resolveUtilReportSiteKeyByTeam(entryTeam) === normalizedSite;
                if (canonical && canonicalizeUtilTeamName(entryTeam) !== canonical) return false;
                if (fuelKey && inferUtilFuelType(entryTeam) !== fuelKey) return false;
                return !!canonical;
            });
        }

        function getUtilReportGasOptionOrderRank(teamName) {
            const name = String(teamName || '').trim();
            const canonical = canonicalizeUtilTeamName(name);
            const isCombined = isUtilReportGasCombinedTeamSelection(name);
            const fuel = inferUtilFuelType(name);
            if (canonical === 'LineAlpha' && fuel === 'lng') return 0;
            if (canonical === 'LineBeta' && isCombined) return 1;
            if (canonical === 'LineBeta' && fuel === 'lng') return 2;
            if (canonical === 'LineBeta' && fuel === 'lpg') return 3;
            if (canonical === 'LineDelta' && fuel === 'lng') return 4;
            if (canonical === 'Plant B') return 5;
            if (canonical === 'Plant A') return 6;
            return 50;
        }

        function buildUtilReportGasTeamOptions(entries = UTIL_GAS_ENTRIES, includeSiteGroups = false) {
            const preferred = [];
            if (includeSiteGroups) {
                preferred.push(
                    { label: 'Plant B', teamName: 'Plant B' },
                    { label: 'Plant A', teamName: 'Plant A' },
                    { label: UTIL_REPORT_GAS_PLANT_A_LNG_LABEL, teamName: UTIL_REPORT_GAS_PLANT_A_LNG_LABEL },
                    { label: UTIL_REPORT_GAS_PLANT_A_LPG_LABEL, teamName: UTIL_REPORT_GAS_PLANT_A_LPG_LABEL }
                );
            }
            preferred.push(
                { label: 'Line Alpha', teamName: 'Line Alpha' },
                { label: UTIL_REPORT_GAS_COMBINED_TEAM_LABEL, teamName: 'Line Beta' },
                { label: 'Line Beta LNG', teamName: 'Line Beta', fuelKey: 'lng' },
                { label: 'Line Beta LPG', teamName: 'Line Beta', fuelKey: 'lpg' },
                { label: 'Line Delta', teamName: 'Line Delta' },
                { label: UTIL_REPORT_GAS_OVERALL_LNG_LABEL, teamName: UTIL_REPORT_GAS_OVERALL_LNG_LABEL },
                { label: UTIL_REPORT_GAS_OVERALL_LPG_LABEL, teamName: UTIL_REPORT_GAS_OVERALL_LPG_LABEL }
            );
            return preferred
                .filter(option => hasUtilReportGasTeamOption(entries, option.teamName, option.fuelKey || ''))
                .map(option => option.label);
        }

        function buildUtilReportElectricTeamOptions(entries = UTIL_ELECTRIC_ENTRIES, includeSiteGroups = true) {
            const preferred = (includeSiteGroups
                ? ['Plant B', 'Plant A']
                : []
            ).concat(['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta']);
            return preferred.filter(teamName => hasUtilReportTeamOption(entries, teamName));
        }

        function buildUtilReportWasteTeamOptions(entries = UTIL_WASTE_ENTRIES) {
            return ['Plant B', 'Plant A'].filter(siteKey => hasUtilReportTeamOption(entries, siteKey));
        }

        function buildUtilReportBuilderTeamOptions(itemKey = UtilReportBuilderState.itemKey) {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            let teams = [];
            if (normalizedItemKey === 'gas') {
                teams = buildUtilReportGasTeamOptions(UTIL_GAS_ENTRIES, true);
            } else if (normalizedItemKey === 'waste') {
                teams = buildUtilReportWasteTeamOptions(UTIL_WASTE_ENTRIES);
            } else {
                teams = buildUtilReportElectricTeamOptions(UTIL_ELECTRIC_ENTRIES, true);
            }
            return ['전체'].concat(teams.filter(Boolean));
        }

        function getUtilReportScopeTeamFilterByItem(itemKey, state = UtilReportState) {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            if (normalizedItemKey === 'gas') return String(state?.gasTeam || 'all');
            if (normalizedItemKey === 'waste') return String(state?.wasteTeam || 'all');
            return String(state?.electricTeam || 'all');
        }

        function findUtilReportBuilderTeamOption(teamName, itemKey = UtilReportBuilderState.itemKey) {
            const raw = String(teamName || '').trim();
            if (!raw) return '';
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const options = buildUtilReportBuilderTeamOptions(normalizedItemKey).filter(option => option !== '전체');
            const exact = options.find(option => String(option || '').trim() === raw);
            if (exact) return exact;
            const canonical = canonicalizeUtilTeamName(raw);
            if (!canonical) return '';

            if (normalizedItemKey === 'waste') {
                if (canonical === 'Plant B' || canonical === 'LineAlpha') {
                    return options.includes('Plant B') ? 'Plant B' : '';
                }
                if (['Plant A', 'LineBeta', 'LineGamma', 'LineDelta'].includes(canonical)) {
                    return options.includes('Plant A') ? 'Plant A' : '';
                }
                return '';
            }

            if (normalizedItemKey === 'gas') {
                const aggregate = parseUtilReportGasAggregateTeamLabel(raw);
                if (aggregate?.label && options.includes(aggregate.label)) return aggregate.label;
                const fuel = inferUtilFuelType(raw);
                if (canonical === 'LineGamma' && options.includes('Plant A')) return 'Plant A';
                const matchedByCanonical = options.filter(option => canonicalizeUtilTeamName(option) === canonical);
                if (!matchedByCanonical.length) return '';
                if (fuel) {
                    const fuelMatched = matchedByCanonical.find(option => inferUtilFuelType(option) === fuel);
                    if (fuelMatched) return fuelMatched;
                }
                const combinedMatched = matchedByCanonical.find(option => isUtilReportGasCombinedTeamSelection(option));
                if (combinedMatched) return combinedMatched;
                return matchedByCanonical.length === 1 ? matchedByCanonical[0] : '';
            }

            const direct = options.find(option => normalizeUtilTeamName(option).toLowerCase() === normalizeUtilTeamName(raw).toLowerCase());
            if (direct) return direct;
            if (canonical === 'Plant B' && options.includes('Plant B')) return 'Plant B';
            if (canonical === 'Plant A' && options.includes('Plant A')) return 'Plant A';
            return '';
        }

        function normalizeUtilReportBuilderTeam(teamName, itemKey = UtilReportBuilderState.itemKey) {
            const raw = String(teamName || '').trim();
            if (!raw || raw === '전체' || raw === 'all') return '전체';
            return findUtilReportBuilderTeamOption(raw, itemKey) || '전체';
        }

        function getUtilReportBuilderValueOptions(itemKey) {
            const key = normalizeUtilReportBuilderItemKey(itemKey);
            const options = Array.isArray(UTIL_REPORT_BUILDER_VALUE_OPTIONS[key])
                ? UTIL_REPORT_BUILDER_VALUE_OPTIONS[key]
                : [];
            return options.slice();
        }

        function normalizeUtilReportBuilderValueKeys(itemKey, valueKeys) {
            const options = getUtilReportBuilderValueOptions(itemKey);
            const allowed = new Set(options.map(item => item.key));
            const list = Array.isArray(valueKeys) ? valueKeys : [];
            const normalized = [];
            list.forEach(item => {
                const key = String(item || '').trim();
                if (!allowed.has(key)) return;
                if (normalized.includes(key)) return;
                normalized.push(key);
            });
            if (normalized.length) return normalized;
            if (options.length) return [options[0].key];
            return [];
        }

        function getUtilReportBuilderVizUsageUnitOptions(itemKey = UtilReportBuilderVizState.itemKey) {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const baseOptions = Array.isArray(UTIL_REPORT_BUILDER_VIZ_USAGE_UNIT_OPTIONS[normalizedItemKey])
                ? UTIL_REPORT_BUILDER_VIZ_USAGE_UNIT_OPTIONS[normalizedItemKey].slice()
                : UTIL_REPORT_BUILDER_VIZ_USAGE_UNIT_OPTIONS.electric.slice();
            return baseOptions;
        }

        function normalizeUtilReportBuilderVizUsageUnitKey(unitKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const raw = String(unitKey || '').trim().toLowerCase();
            const options = getUtilReportBuilderVizUsageUnitOptions(itemKey);
            if (options.some(item => item.key === raw)) return raw;
            return String(options[0]?.key || 'kwh');
        }

        function getUtilReportBuilderVizUsageUnitOption(unitKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const options = getUtilReportBuilderVizUsageUnitOptions(itemKey);
            const key = normalizeUtilReportBuilderVizUsageUnitKey(unitKey, itemKey);
            return options.find(item => item.key === key) || options[0] || { key: 'kwh', label: 'kWh', scale: 1 };
        }

        function getUtilReportBuilderVizUsageScale(unitKey, itemKey = UtilReportBuilderVizState.itemKey) {
            return Number(getUtilReportBuilderVizUsageUnitOption(unitKey, itemKey)?.scale) || 1;
        }

        function getUtilReportBuilderVizUsageLabel(unitKey, itemKey = UtilReportBuilderVizState.itemKey) {
            const key = normalizeUtilReportBuilderVizUsageUnitKey(unitKey, itemKey);
            return String(getUtilReportBuilderVizUsageUnitOption(key, itemKey)?.label || 'kWh');
        }

        function formatUtilLabelWithUnit(label, unitLabel) {
            const baseLabel = String(label || '').trim();
            const normalizedUnit = String(unitLabel || '').trim();
            if (!normalizedUnit) return baseLabel;
            const escapedUnit = normalizedUnit.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const trailingSameUnitPattern = new RegExp(`(?:\\s*\\(\\s*${escapedUnit}\\s*\\))+\\s*$`, 'u');
            if (trailingSameUnitPattern.test(baseLabel)) {
                const stripped = baseLabel.replace(trailingSameUnitPattern, '').trim();
                return stripped ? `${stripped} (${normalizedUnit})` : `(${normalizedUnit})`;
            }
            return `${baseLabel} (${normalizedUnit})`;
        }

        function formatUtilNumberWithUnit(value, unitLabel, digits = 0) {
            if (!Number.isFinite(value)) return '-';
            const numberText = formatUtilNumber(value, digits);
            const normalizedUnit = String(unitLabel || '').trim();
            return normalizedUnit ? `${numberText} ${normalizedUnit}` : numberText;
        }

        function buildUtilReportBuilderVizRatioUnitLabel(numeratorUnitLabel, denominatorUnitLabel, useDenominator = true) {
            const numeratorUnit = String(numeratorUnitLabel || '').trim();
            const denominatorUnit = String(denominatorUnitLabel || '').trim();
            if (useDenominator !== true) return numeratorUnit;
            if (numeratorUnit && denominatorUnit) return `${numeratorUnit}/${denominatorUnit}`;
            return numeratorUnit || '';
        }

        function getUtilReportBuilderVizItemOption(itemKey = UtilReportBuilderVizState.itemKey) {
            return UTIL_REPORT_BUILDER_ITEM_OPTIONS.find(item => item.key === normalizeUtilReportBuilderItemKey(itemKey))
                || UTIL_REPORT_BUILDER_ITEM_OPTIONS[0];
        }

        function getUtilReportBuilderVizItemLabel(itemKey = UtilReportBuilderVizState.itemKey) {
            return String(getUtilReportBuilderVizItemOption(itemKey)?.label || '전기');
        }

        function resolveUtilReportGraphMetricKeyByDualRatioMetric(itemKey = UtilReportBuilderVizState.itemKey, ratioMetric = 'usage') {
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const normalizedRatioMetric = normalizeUtilDualRatioMetricKey(ratioMetric);
            if (normalizedRatioMetric === 'production') return 'production';
            if (normalizedRatioMetric === 'cost') {
                if (normalizedItemKey === 'gas') return 'gas_cost';
                if (normalizedItemKey === 'waste') return 'waste_cost';
                return 'electric_cost';
            }
            if (normalizedItemKey === 'gas') return 'gas_usage';
            if (normalizedItemKey === 'waste') return 'waste_usage';
            return 'electric_usage';
        }

        function resolveUtilDualRatioMetricKeyByGraphMetric(itemKey = UtilReportBuilderVizState.itemKey, metricKey = '', fallback = 'usage') {
            const normalizedFallback = normalizeUtilDualRatioMetricKey(fallback);
            const rawMetric = String(metricKey || '').trim();
            if (!rawMetric) return normalizedFallback;
            if (rawMetric === 'production') return 'production';
            if (isUtilReportCostMetric(rawMetric)) return 'cost';
            if (['electric_usage', 'gas_usage', 'waste_usage'].includes(rawMetric)) return 'usage';
            return normalizedFallback;
        }

        function getUtilDualCombinedSection(datasetKey = '') {
            const normalizedItemKey = normalizeUtilDualDatasetKey(
                datasetKey || UtilReportBuilderVizState.itemKey || UtilReportState.builderItemKey || 'electric'
            );
            return document.querySelector(`[data-util-dual="${normalizedItemKey}"] [data-util-dual-section="combined"]`);
        }

        function getUtilDualReportSyncDecimals(section, metricKey = 'usage') {
            const metricDatasetKey = metricKey === 'ratio' ? 'ratioDecimals' : `${metricKey}Decimals`;
            const value = section?.dataset?.[metricDatasetKey] ?? section?.dataset?.reportDecimals ?? UtilReportState.decimals;
            return String(clampUtilReportBuilderVizDecimals(value));
        }
