        function formatUtilReportMonthShort(value) {
            const parsed = parseUtilMonthValue(value);
            if (!parsed) return String(value || '-');
            const year2 = String(parsed.year).slice(-2);
            return `${year2}.${String(parsed.month).padStart(2, '0')}`;
        }

        function formatUtilReportMonthLong(value) {
            const parsed = parseUtilMonthValue(value);
            if (!parsed) return String(value || '-');
            return `${parsed.year}.${String(parsed.month).padStart(2, '0')}`;
        }

        function formatUtilReportMonthOnly(value) {
            const parsed = parseUtilMonthValue(value);
            if (parsed && Number.isFinite(parsed.month)) {
                return String(parsed.month).padStart(2, '0');
            }
            const raw = String(value || '').trim();
            const match = raw.match(/(?:^|[./-])(\d{1,2})$/);
            if (match) return String(match[1]).padStart(2, '0');
            return raw || '-';
        }

        function normalizeUtilReportMonthToken(value) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            const parsed = parseUtilMonthValue(raw);
            if (parsed && Number.isFinite(parsed.month)) {
                return String(parsed.month).padStart(2, '0');
            }
            const match = raw.match(/(?:^|[./-])(\d{1,2})$/);
            if (match) return String(match[1]).padStart(2, '0');
            return '';
        }

        function normalizeUtilReportMonthKey(value) {
            const raw = String(value || '').trim();
            if (!raw) return '';
            const parsed = parseUtilMonthValue(raw);
            if (parsed && Number.isFinite(parsed.year) && Number.isFinite(parsed.month)) {
                return `${parsed.year}-${String(parsed.month).padStart(2, '0')}`;
            }
            const match = raw.match(/(\d{4})[./-](\d{1,2})/);
            if (match) return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
            return '';
        }

        function compareUtilReportMonthKeys(a, b) {
            const parsedA = parseUtilMonthValue(a);
            const parsedB = parseUtilMonthValue(b);
            if (!parsedA && !parsedB) return 0;
            if (!parsedA) return 1;
            if (!parsedB) return -1;
            return ((parsedA.year * 12) + parsedA.month) - ((parsedB.year * 12) + parsedB.month);
        }

        function getUtilChartPointYear(point, fallbackLabel = '') {
            const keyCandidate = String(point?.key || '').trim();
            const keyParsed = parseUtilMonthValue(keyCandidate);
            if (keyParsed && Number.isFinite(keyParsed.year)) return String(keyParsed.year);
            const labelCandidate = String(point?.label || fallbackLabel || '').trim();
            const labelParsed = parseUtilMonthValue(labelCandidate);
            if (labelParsed && Number.isFinite(labelParsed.year)) return String(labelParsed.year);
            const match = labelCandidate.match(/^(\d{4})[.-]/);
            return match ? match[1] : '';
        }

        function getUtilChartPointMonthToken(point, fallbackLabel = '') {
            const keyCandidate = String(point?.key || '').trim();
            const keyParsed = parseUtilMonthValue(keyCandidate);
            if (keyParsed && Number.isFinite(keyParsed.month)) return String(keyParsed.month).padStart(2, '0');
            const labelCandidate = String(point?.label || fallbackLabel || '').trim();
            const labelParsed = parseUtilMonthValue(labelCandidate);
            if (labelParsed && Number.isFinite(labelParsed.month)) return String(labelParsed.month).padStart(2, '0');
            const match = labelCandidate.match(/(?:^|[./-])(\d{1,2})$/);
            return match ? String(match[1]).padStart(2, '0') : '';
        }

        function getUtilChartPointMonthKey(point, fallbackLabel = '') {
            const keyCandidate = normalizeUtilReportMonthKey(point?.key || '');
            if (keyCandidate) return keyCandidate;
            const labelCandidate = normalizeUtilReportMonthKey(point?.label || fallbackLabel || '');
            if (labelCandidate) return labelCandidate;
            return '';
        }

        function buildUtilChartPointDataAttrs(point, fallbackLabel = '', options = {}) {
            const attrs = [];
            const monthToken = getUtilChartPointMonthToken(point, fallbackLabel);
            if (monthToken) {
                attrs.push(`data-role="util-chart-month-hit"`);
                attrs.push(`data-month-token="${escapeHtml(monthToken)}"`);
            }
            const monthKey = getUtilChartPointMonthKey(point, fallbackLabel);
            if (monthKey) {
                attrs.push(`data-month-key="${escapeHtml(monthKey)}"`);
            }
            const seriesKey = String(options.seriesKey || '').trim().toLowerCase();
            if (['usage', 'cost', 'production', 'prev', 'current', 'delta', 'rate'].includes(seriesKey)) {
                attrs.push(`data-series-key="${escapeHtml(seriesKey)}"`);
            }
            return attrs.length ? ` ${attrs.join(' ')}` : '';
        }

        function getUtilReportCompareYearOptions(result) {
            const rows = Array.isArray(result?.rows) ? result.rows : [];
            if (!rows.length) return [];
            const rangeYearSet = new Set(rows.map(row => Number(row?.year)).filter(Number.isFinite));
            const allYearSet = new Set(buildUtilReportMonthOptions().map(item => Number(item?.year)).filter(Number.isFinite));
            return Array.from(rangeYearSet)
                .sort((a, b) => a - b)
                .filter(year => allYearSet.has(year - 1))
                .map(year => ({
                    value: String(year),
                    label: `${year}`
                }));
        }

        function normalizeUtilReportCompareYear(compareYear, options = []) {
            const values = (options || []).map(item => String(item.value));
            const raw = String(compareYear || '').trim();
            if (!raw) return '';
            if (values.includes(raw)) return raw;
            if (values.length) return values[values.length - 1];
            return '';
        }
        function getUtilReportAllYearOptions(result) {
            const rows = Array.isArray(result?.rows) ? result.rows : [];
            if (!rows.length) return [];
            return Array.from(new Set(rows.map(row => Number(row?.year)).filter(Number.isFinite)))
                .sort((a, b) => a - b)
                .map(year => ({ value: String(year), label: String(year) }));
        }

        function normalizeUtilReportYear(value, options = []) {
            const values = (options || []).map(item => String(item.value));
            const raw = String(value || '').trim();
            if (raw && values.includes(raw)) return raw;
            if (values.length) return values[values.length - 1];
            return '';
        }

        function getUtilReportMetricTheme(metricKey) {
            const totalExcludeWasteDescriptor = getUtilReportTotalExcludeWasteMetricDescriptor(metricKey);
            if (totalExcludeWasteDescriptor) {
                return {
                    scope: 'total',
                    label: totalExcludeWasteDescriptor.shortLabel,
                    icon: totalExcludeWasteDescriptor.icon,
                    watermark: totalExcludeWasteDescriptor.watermark,
                    color: totalExcludeWasteDescriptor.color
                };
            }
            const selectedDetailDescriptor = getUtilReportSelectedDetailMetricDescriptor(metricKey);
            if (selectedDetailDescriptor) {
                return {
                    scope: selectedDetailDescriptor.scope,
                    label: selectedDetailDescriptor.shortLabel,
                    icon: selectedDetailDescriptor.icon,
                    watermark: selectedDetailDescriptor.watermark,
                    color: selectedDetailDescriptor.color
                };
            }
            const productionProductDetailMetric = parseUtilReportProductionProductDetailMetric(metricKey);
            if (productionProductDetailMetric && !productionProductDetailMetric.isTotal) {
                return { scope: 'total', label: getUtilReportProductionProductDetailMetricLabel(productionProductDetailMetric), icon: '🏭', watermark: '▦' };
            }
            switch (metricKey) {
                case 'electric_usage':
                case 'electric_cost':
                    return { scope: 'electric', label: '전기', icon: '⚡', watermark: '⚡' };
                case 'gas_usage':
                case 'gas_cost':
                    return { scope: 'gas', label: '가스', icon: '🔥', watermark: '🔥' };
                case 'waste_usage':
                case 'waste_cost':
                    return { scope: 'waste', label: '폐수', icon: '💧', watermark: '💧' };
                case 'production': {
                    const productionScope = normalizeUtilReportScope(UtilReportState.scopeKey);
                    if (productionScope === 'electric') return { scope: 'electric', label: '생산량(전기)', icon: '⚡', watermark: '⚡' };
                    if (productionScope === 'gas') return { scope: 'gas', label: '생산량(가스)', icon: '🔥', watermark: '🔥' };
                    if (productionScope === 'waste') return { scope: 'waste', label: '생산량(폐수)', icon: '💧', watermark: '💧' };
                    return { scope: 'total', label: '생산량', icon: '🏭', watermark: '▦' };
                }
                case 'total_cost':
                default:
                    return { scope: 'total', label: '총합', icon: '◉', watermark: '◉' };
            }
        }

        const UTIL_REPORT_CURRENT_COLOR_MAP = {
            total: '#1d4ed8',
            electric: '#f59e0b',
            gas: '#ef4444',
            waste: '#0f766e'
        };

        const UTIL_REPORT_PREV_COLOR_MAP = {
            total: '#334155',
            electric: '#334155',
            gas: '#334155',
            waste: '#334155'
        };

        function normalizeUtilReportColor(value, fallback) {
            const raw = String(value || '').trim();
            if (/^#[0-9a-fA-F]{6}$/u.test(raw)) return raw.toLowerCase();
            return fallback;
        }

        function getUtilReportSeriesColors(metricKey) {
            const theme = getUtilReportMetricTheme(metricKey);
            const defaultCurrent = normalizeUtilReportColor(theme.color, UTIL_REPORT_CURRENT_COLOR_MAP[theme.scope] || '#1d4ed8');
            const defaultPrev = UTIL_REPORT_PREV_COLOR_MAP[theme.scope] || '#334155';
            return {
                current: normalizeUtilReportColor(UtilReportState.currentYearColor, defaultCurrent),
                prev: normalizeUtilReportColor(UtilReportState.prevYearColor, defaultPrev),
                scope: theme.scope
            };
        }

        function getUtilReportMetricLabel(metricKey, unitKey) {
            const metric = getUtilReportMetricOption(metricKey);
            const unitLabel = getUtilReportUnitLabel(unitKey);
            if (metric.type === 'production') {
                return formatUtilLabelWithUnit(metric.label, getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey));
            }
            if (metric.key === 'waste_cost') {
                const modeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                if (modeKey !== 'total') {
                    const modeLabelRaw = getUtilReportWasteCostModeLabel(modeKey, UtilReportState.wasteTeam);
                    const modeLabel = String(modeLabelRaw || '').replace(/\s*\(원\)\s*$/u, '');
                    return formatUtilLabelWithUnit(`폐수 ${modeLabel}`, unitLabel);
                }
            }
            if (metric.type === 'cost') return formatUtilLabelWithUnit(metric.label, unitLabel);
            if (metric.type === 'usage') return formatUtilLabelWithUnit(metric.label, getUtilReportBuilderMetricUnit(metric.key));
            return metric.label;
        }

        function isUtilReportCostMetric(metricKey) {
            return String(metricKey || '').endsWith('_cost') || metricKey === 'total_cost';
        }

        function getUtilReportGraphMetricOptions(scopeKey = UtilReportState.scopeKey) {
            const scope = normalizeUtilReportScope(scopeKey);
            if (scope === 'electric') {
                return [
                    { key: 'electric_cost', label: '전기 비용' },
                    { key: 'electric_usage', label: '전기 사용량' },
                    { key: 'production', label: '생산량' }
                ];
            }
            if (scope === 'gas') {
                return [
                    { key: 'gas_cost', label: '가스 비용' },
                    { key: 'gas_usage', label: '가스 사용량' },
                    { key: 'production', label: '생산량' }
                ];
            }
            if (scope === 'waste') {
                return [
                    { key: 'waste_cost', label: '폐수 비용' },
                    { key: 'waste_usage', label: '폐수 사용량' },
                    { key: 'production', label: '생산량' }
                ];
            }
            return [
                { key: 'total_cost', label: '총합 비용' },
                { key: 'electric_cost', label: '전기 비용' },
                { key: 'gas_cost', label: '가스 비용' },
                { key: 'waste_cost', label: '폐수 비용' },
                { key: 'production', label: '생산량' }
            ];
        }

        function normalizeUtilReportGraphMetric(metricKey, options = [], fallbackKey = '') {
            const values = (options || []).map(item => String(item.key));
            const raw = String(metricKey || '').trim();
            if (raw && values.includes(raw)) return raw;
            if (fallbackKey && values.includes(String(fallbackKey))) return String(fallbackKey);
            if (values.length) return values[0];
            return '';
        }

        function getUtilReportGraphMetricLabel(metricKey, scopeKey = UtilReportState.scopeKey) {
            if (metricKey === 'waste_cost') {
                const modeKey = normalizeUtilReportWasteCostModeKey(UtilReportState.wasteCostModeKey, UtilReportState.wasteTeam);
                if (modeKey !== 'total') {
                    const modeLabel = getUtilReportWasteCostModeLabel(modeKey, UtilReportState.wasteTeam).replace(/\s*\(원\)\s*$/u, '');
                    return `폐수 ${modeLabel}`;
                }
            }
            const options = getUtilReportGraphMetricOptions(scopeKey);
            const matched = options.find(item => item.key === metricKey);
            return matched ? matched.label : String(metricKey || '-');
        }

        function getUtilReportGraphMetricUnit(metricKey) {
            if (isUtilReportCostMetric(metricKey)) return getUtilReportUnitLabel(UtilReportState.unitKey);
            switch (String(metricKey || '')) {
                case 'electric_usage': return 'kWh';
                case 'gas_usage': return 'm³';
                case 'waste_usage': return '㎥';
                case 'production': return getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey);
                default: return '-';
            }
        }

        function syncUtilReportGraphMetricDefaults() {
            const options = getUtilReportGraphMetricOptions(UtilReportState.scopeKey);
            const defaultNumerator = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            UtilReportState.graphNumeratorMetric = normalizeUtilReportGraphMetric(UtilReportState.graphNumeratorMetric, options, defaultNumerator);
            const fallbackDenominator = options.some(item => item.key === 'production') ? 'production' : UtilReportState.graphNumeratorMetric;
            UtilReportState.graphDenominatorMetric = normalizeUtilReportGraphMetric(UtilReportState.graphDenominatorMetric, options, fallbackDenominator);
        }

        function isUtilMonthInReportRange(year, month, state, yearFilter = '') {
            if (String(yearFilter || '').trim() && String(year) !== String(yearFilter)) return false;
            const fromParsed = parseUtilMonthValue(state?.from);
            const toParsed = parseUtilMonthValue(state?.to);
            if (!fromParsed || !toParsed) return false;
            const start = Math.min(fromParsed.year * 12 + fromParsed.month, toParsed.year * 12 + toParsed.month);
            const end = Math.max(fromParsed.year * 12 + fromParsed.month, toParsed.year * 12 + toParsed.month);
            const current = year * 12 + month;
            return current >= start && current <= end;
        }

        function normalizeUtilReportSiteKey(value) {
            const text = String(value || '').trim();
            if (!text || text === 'all') return 'all';
            const canonical = canonicalizeUtilTeamName(text);
            if (canonical === 'Plant A') return 'Plant A';
            if (canonical === 'Plant B') return 'Plant B';
            return 'all';
        }

        function resolveUtilReportSiteKeyFromTeamFilter(teamFilter = '') {
            const directSiteKey = normalizeUtilReportSiteKey(teamFilter);
            if (directSiteKey !== 'all') return directSiteKey;
            return resolveUtilReportSiteKeyByTeam(teamFilter) || 'all';
        }

        function resolveUtilReportSiteKeyByTeam(teamName) {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (!canonical) return '';
            if (canonical === 'Plant B' || canonical === '1팀1파트') return 'Plant B';
            if (canonical === 'Plant A' || canonical === '1팀2파트' || canonical === 'Line Gamma' || canonical === 'Line Delta') return 'Plant A';
            return '';
        }

        function resolveUtilReportSelectedSiteContextKey(scopeKey = UtilReportState.scopeKey, categoryKey = UtilReportState.categoryKey) {
            const compositionCategory = getUtilReportCompositionCategory(categoryKey);
            if (compositionCategory === 'production') {
                const productionSiteKey = resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.productionTeam);
                if (productionSiteKey !== 'all') return productionSiteKey;
                const parsedMetric = parseUtilReportSiteCompositionMetric(UtilReportState.activeSiteCompositionKey);
                return parsedMetric.siteKey !== 'all' ? parsedMetric.siteKey : 'all';
            }
            const scope = normalizeUtilReportScope(scopeKey);
            if (scope === 'electric') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.electricTeam);
            if (scope === 'gas') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.gasTeam);
            if (scope === 'waste') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.wasteTeam);
            const parsedMetric = parseUtilReportSiteCompositionMetric(UtilReportState.activeSiteCompositionKey);
            if (parsedMetric.siteKey !== 'all') return parsedMetric.siteKey;
            return 'all';
        }

        function matchesUtilReportSiteContext(teamName, siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'all') return true;
            return resolveUtilReportSiteKeyByTeam(teamName) === normalizedSite;
        }

        function getUtilReportDisplayTeamLabel(teamName, options = {}) {
            const raw = String(teamName || '').trim();
            if (!raw) return '';
            const canonical = canonicalizeUtilTeamName(raw);
            const categoryKey = getUtilReportCompositionCategory(options.categoryKey || UtilReportState.categoryKey);
            const scopeKey = normalizeUtilReportScope(options.scopeKey || UtilReportState.scopeKey);
            if (canonical === '1팀1파트' && (categoryKey === 'production' || scopeKey === 'electric' || scopeKey === 'gas')) {
                return 'Plant B';
            }
            return raw;
        }

        function buildUtilReportSiteMetricKey(siteKey) {
            const normalized = normalizeUtilReportSiteKey(siteKey);
            if (normalized === 'all') return '';
            return `site::${normalized}`;
        }

        function parseUtilReportSiteCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = 'site::';
            if (!raw.startsWith(prefix)) {
                return { raw, siteKey: 'all' };
            }
            const siteKey = normalizeUtilReportSiteKey(raw.slice(prefix.length).trim());
            return { raw, siteKey };
        }

        function getUtilReportElectricScopeTotalLabel(siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            return normalizedSite === 'all' ? '전기 전체' : `${normalizedSite} 전체`;
        }

        function getUtilReportGasScopeTotalLabel(siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            return normalizedSite === 'all' ? '가스 전체' : `${normalizedSite} 가스`;
        }

        function getUtilReportWasteScopeTotalLabel(siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            return normalizedSite === 'all' ? '폐수 전체' : `${normalizedSite} 폐수`;
        }

        function getUtilReportSiteCompositionItemLabel(scopeKey, siteKey) {
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedScope === 'waste') {
                return getUtilReportWasteScopeTotalLabel(normalizedSite);
            }
            return normalizedSite === 'all' ? '전체' : normalizedSite;
        }

        function buildUtilReportTeamTotalExcludeWasteMetricKey(teamName = '') {
            const normalizedTeamName = String(teamName || '').trim();
            return `${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::${normalizedTeamName || 'total'}`;
        }

        function parseUtilReportTeamTotalExcludeWasteCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = `${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::`;
            if (!raw.startsWith(prefix)) {
                return { raw, teamName: '', isTotal: false };
            }
            const teamName = String(raw.slice(prefix.length) || '').trim();
            if (!teamName || teamName === 'total') {
                return { raw, teamName: '', isTotal: true };
            }
            return { raw, teamName, isTotal: false };
        }

        function buildUtilReportProcessTotalExcludeWasteMetricKey(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return `${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::${normalizedProcessKey || 'total'}`;
        }

        function parseUtilReportProcessTotalExcludeWasteCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = `${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::`;
            if (!raw.startsWith(prefix)) {
                return { raw, processKey: '', isTotal: false };
            }
            const processKey = String(raw.slice(prefix.length) || '').trim();
            if (!processKey || processKey === 'total') {
                return { raw, processKey: '', isTotal: true };
            }
            return { raw, processKey, isTotal: false };
        }

        function getUtilReportTeamTotalExcludeWasteSpec(teamName = '') {
            const normalizedTeamName = String(teamName || '').trim();
            return UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TEAM_SPECS.find(item => String(item.teamName || '').trim() === normalizedTeamName) || null;
        }

        function getUtilReportProcessTotalExcludeWasteSpec(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.find(item => String(item.processKey || '').trim() === normalizedProcessKey) || null;
        }

        function buildUtilReportElectricProcessMetricKey(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return `${UTIL_REPORT_ELECTRIC_PROCESS_PREFIX}::${normalizedProcessKey || 'total'}`;
        }

        function parseUtilReportElectricProcessCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = `${UTIL_REPORT_ELECTRIC_PROCESS_PREFIX}::`;
            if (!raw.startsWith(prefix)) {
                return { raw, processKey: '', isTotal: false };
            }
            const processKey = String(raw.slice(prefix.length) || '').trim();
            if (!processKey || processKey === 'total') {
                return { raw, processKey: '', isTotal: true };
            }
            return { raw, processKey, isTotal: false };
        }

        function getUtilReportElectricProcessSpec(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.find(item => String(item.processKey || '').trim() === normalizedProcessKey) || null;
        }

        function buildUtilReportGasProcessMetricKey(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return `${UTIL_REPORT_GAS_PROCESS_PREFIX}::${normalizedProcessKey || 'total'}`;
        }

        function parseUtilReportGasProcessCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = `${UTIL_REPORT_GAS_PROCESS_PREFIX}::`;
            if (!raw.startsWith(prefix)) {
                return { raw, processKey: '', isTotal: false };
            }
            const processKey = String(raw.slice(prefix.length) || '').trim();
            if (!processKey || processKey === 'total') {
                return { raw, processKey: '', isTotal: true };
            }
            return { raw, processKey, isTotal: false };
        }

        function getUtilReportGasProcessSpec(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return UTIL_REPORT_GAS_PROCESS_SPECS.find(item => String(item.processKey || '').trim() === normalizedProcessKey) || null;
        }

        function buildUtilReportProductionProcessMetricKey(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return `${UTIL_REPORT_PRODUCTION_PROCESS_PREFIX}::${normalizedProcessKey || 'total'}`;
        }

        function parseUtilReportProductionProcessCompositionMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = `${UTIL_REPORT_PRODUCTION_PROCESS_PREFIX}::`;
            if (!raw.startsWith(prefix)) {
                return { raw, processKey: '', isTotal: false };
            }
            const processKey = String(raw.slice(prefix.length) || '').trim();
            if (!processKey || processKey === 'total') {
                return { raw, processKey: '', isTotal: true };
            }
            return { raw, processKey, isTotal: false };
        }

        function getUtilReportProductionProcessSpec(processKey = '') {
            const normalizedProcessKey = String(processKey || '').trim();
            return UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.find(item => String(item.processKey || '').trim() === normalizedProcessKey) || null;
        }

        function resolveUtilReportElectricProcessTeamFilters(processKey = 'all', siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const spec = getUtilReportElectricProcessSpec(processKey);
            const teamFilters = spec
                ? spec.teamFilters.slice()
                : UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_SPECS.flatMap(item => item.teamFilters);
            if (normalizedSite === 'all') return teamFilters;
            return teamFilters.filter(teamFilter => resolveUtilReportSiteKeyFromTeamFilter(teamFilter) === normalizedSite);
        }

        function resolveUtilReportGasProcessTeamFilters(processKey = 'all', siteKey = 'all') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const spec = getUtilReportGasProcessSpec(processKey);
            const teamFilters = spec
                ? spec.teamFilters.slice()
                : UTIL_REPORT_GAS_PROCESS_SPECS.flatMap(item => item.teamFilters);
            if (normalizedSite === 'all') return teamFilters;
            return teamFilters.filter(teamFilter => resolveUtilReportSiteKeyFromTeamFilter(teamFilter) === normalizedSite);
        }

        function getUtilReportTotalExcludeWasteMetricDescriptor(metricKey) {
            const rawMetric = String(metricKey || '').trim();
            const teamParsed = parseUtilReportTeamTotalExcludeWasteCompositionMetric(rawMetric);
            if (rawMetric.startsWith(`${UTIL_REPORT_TEAM_TOTAL_EX_WASTE_PREFIX}::`)) {
                const spec = getUtilReportTeamTotalExcludeWasteSpec(teamParsed.teamName);
                return {
                    key: teamParsed.isTotal ? UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY : teamParsed.raw,
                    label: teamParsed.isTotal ? '총액 전기+가스' : `${spec?.label || teamParsed.teamName} 전기+가스`,
                    shortLabel: teamParsed.isTotal ? '총액' : String(spec?.label || teamParsed.teamName || '팀별'),
                    type: 'cost',
                    color: spec?.color || '#1d4ed8',
                    icon: '🏭',
                    watermark: '◉'
                };
            }
            const processParsed = parseUtilReportProcessTotalExcludeWasteCompositionMetric(rawMetric);
            if (rawMetric.startsWith(`${UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_PREFIX}::`)) {
                const spec = getUtilReportProcessTotalExcludeWasteSpec(processParsed.processKey);
                return {
                    key: processParsed.isTotal ? UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY : processParsed.raw,
                    label: processParsed.isTotal ? '총액 전기+가스' : `${spec?.label || processParsed.processKey} 전기+가스`,
                    shortLabel: processParsed.isTotal ? '총액' : String(spec?.label || processParsed.processKey || '공정별'),
                    type: 'cost',
                    color: spec?.color || '#1d4ed8',
                    icon: '⚙',
                    watermark: '◎'
                };
            }
            return null;
        }

        function isUtilReportSelectedTotalDetailScope() {
            return getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'cost'
                && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total';
        }

        function isUtilReportCostTotalSelectedPlantAView() {
            return isUtilReportSelectedTotalDetailScope()
                && String(UtilReportState.costTotalSelectedCompositionView || 'total').trim() === 'plantA';
        }

        function resolveUtilReportSelectedTotalDetailOverrideMetric(metricKey = '') {
            const compositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
            const fallbackKey = String(compositionKeys.total || 'total_cost').trim() || 'total_cost';
            const rawMetric = String(metricKey || fallbackKey).trim() || fallbackKey;
            if (isUtilReportCostTotalSelectedPlantAView() && rawMetric === fallbackKey) {
                return buildUtilReportSiteMetricKey('Plant A') || rawMetric;
            }
            return rawMetric;
        }

        function resolveUtilReportSelectedScopeDetailOverrideMetric(metricKey = '', scopeKey = UtilReportState.scopeKey) {
            const compositionKeys = getUtilReportCompositionMetricKeys(UtilReportState.categoryKey);
            const fallbackKey = String(compositionKeys.total || '').trim();
            const rawMetric = String(metricKey || fallbackKey).trim() || fallbackKey;
            const normalizedScope = normalizeUtilReportScope(scopeKey);
            if (!['electric', 'gas', 'waste'].includes(normalizedScope)) {
                return rawMetric;
            }
            if (rawMetric !== fallbackKey) {
                return rawMetric;
            }
            const siteContextKey = resolveUtilReportSelectedSiteContextKey(normalizedScope, UtilReportState.categoryKey);
            return siteContextKey !== 'all'
                ? (buildUtilReportSiteMetricKey(siteContextKey) || '')
                : '';
        }

        function getUtilReportSelectedDetailMetricDescriptor(metricKey) {
            const rawMetric = String(metricKey || '').trim();
            const siteParsed = parseUtilReportSiteCompositionMetric(rawMetric);
            if (siteParsed.siteKey !== 'all') {
                return {
                    key: buildUtilReportSiteMetricKey(siteParsed.siteKey),
                    label: `${siteParsed.siteKey} 전체`,
                    shortLabel: `${siteParsed.siteKey} 전체`,
                    type: 'cost',
                    scope: 'total',
                    color: siteParsed.siteKey === 'Plant A' ? UTIL_REPORT_SITE_COLORS.plantA : UTIL_REPORT_SITE_COLORS.plantB,
                    icon: '🏭',
                    watermark: '◈'
                };
            }
            const parsed = parseUtilReportTeamCompositionMetric(rawMetric);
            if (!parsed.teamName || parsed.sourceLabel === '생산량') return null;
            const scopeKey = normalizeUtilReportScope(parsed.scopeKey);
            if (!['electric', 'gas', 'waste'].includes(scopeKey)) return null;
            const teamLabel = getUtilReportDisplayTeamLabel(parsed.teamName, {
                categoryKey: 'cost',
                scopeKey,
                sourceLabel: parsed.sourceLabel
            });
            const displayLabel = parsed.sourceLabel === '폐수'
                ? `${teamLabel} 폐수`
                : `${teamLabel} ${parsed.sourceLabel}`;
            return {
                key: parsed.raw,
                label: displayLabel,
                shortLabel: displayLabel,
                type: 'cost',
                scope: scopeKey,
                color: UTIL_REPORT_DONUT_COLORS[`${scopeKey}_cost`] || '#1d4ed8',
                icon: scopeKey === 'electric' ? '⚡' : (scopeKey === 'gas' ? '🔥' : '💧'),
                watermark: scopeKey === 'electric' ? '⚡' : (scopeKey === 'gas' ? '🔥' : '💧')
            };
        }

        function sumUtilReportSelectedTotalCostByMonth(year, month) {
            const scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey);
            const scopeKeys = scopeKey === 'total'
                ? normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys)
                : [scopeKey];
            let total = 0;
            let hasValue = false;
            scopeKeys.forEach(selectedScopeKey => {
                const value = Number(sumUtilReportScopeTeamCostByMonth(selectedScopeKey, 'all', year, month));
                if (!Number.isFinite(value)) return;
                total += value;
                hasValue = true;
            });
            return hasValue ? total : null;
        }

        function sumUtilReportSelectedSiteCostByMonth(siteKey = 'all', year, month) {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            if (normalizedSite === 'all') return sumUtilReportSelectedTotalCostByMonth(year, month);
            const scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey);
            const scopeKeys = scopeKey === 'total'
                ? normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys)
                : [scopeKey];
            let total = 0;
            let hasValue = false;
            scopeKeys.forEach(selectedScopeKey => {
                const value = Number(sumUtilReportScopeTeamCostByMonth(selectedScopeKey, normalizedSite, year, month));
                if (!Number.isFinite(value)) return;
                total += value;
                hasValue = true;
            });
            return hasValue ? total : null;
        }

        function getUtilReportSelectedDetailCostByMetric(metricKey, year, month) {
            const rawMetric = String(metricKey || '').trim();
            if (!Number.isFinite(Number(year)) || !Number.isFinite(Number(month))) return null;
            const siteParsed = parseUtilReportSiteCompositionMetric(rawMetric);
            if (siteParsed.siteKey !== 'all') {
                return sumUtilReportSelectedSiteCostByMonth(siteParsed.siteKey, year, month);
            }
            if (rawMetric === 'total_cost') {
                return sumUtilReportSelectedTotalCostByMonth(year, month);
            }
            const descriptor = getUtilReportSelectedDetailMetricDescriptor(rawMetric);
            if (!descriptor) return null;
            const parsed = parseUtilReportTeamCompositionMetric(rawMetric);
            return sumUtilReportScopeTeamCostByMonth(parsed.scopeKey, parsed.teamName, year, month);
        }

        function buildUtilReportSelectedDetailCostSeries(metricKey, yearFilter = '') {
            return getUtilReportMonthRange(UtilReportState.from, UtilReportState.to)
                .filter(item => !yearFilter || String(item.year) === String(yearFilter))
                .map(item => ({
                    year: Number(item.year),
                    month: Number(item.month),
                    monthKey: String(item.key || ''),
                    value: getUtilReportSelectedDetailCostByMetric(metricKey, item.year, item.month)
                }))
                .filter(item => Number.isFinite(item.value));
        }

        function normalizeUtilReportDetailMetricOverrideKey(metricKey) {
            const rawMetric = String(metricKey || '').trim();
            if (
                normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                && ['total_cost', 'electric_cost', 'gas_cost', 'waste_cost'].includes(rawMetric)
            ) {
                return rawMetric;
            }
            return String(
                getUtilReportTotalExcludeWasteMetricDescriptor(rawMetric)?.key
                || getUtilReportSelectedDetailMetricDescriptor(rawMetric)?.key
                || ''
            ).trim();
        }

        function setUtilReportDetailMetricOverride(metricKey = '') {
            UtilReportState.detailMetricOverrideKey = normalizeUtilReportDetailMetricOverrideKey(metricKey);
        }

        function clearUtilReportDetailMetricOverride() {
            UtilReportState.detailMetricOverrideKey = '';
        }

        function getUtilReportSiteFilterByScope(scopeKey = UtilReportState.scopeKey) {
            if (getUtilReportCompositionCategory(UtilReportState.categoryKey) === 'production') {
                const productionTeam = normalizeUtilReportProductionTeam(UtilReportState.productionTeam);
                if (productionTeam === 'all') return 'all';
                const resolved = resolveUtilReportSiteKeyFromTeamFilter(productionTeam);
                if (resolved !== 'all') return resolved;
                const sourceTeams = resolveUtilProductionSourceTeams(productionTeam);
                const siteSet = new Set(sourceTeams
                    .map(name => resolveUtilReportSiteKeyByTeam(name))
                    .filter(Boolean));
                if (siteSet.size === 1) return Array.from(siteSet)[0];
                return 'all';
            }
            const scope = normalizeUtilReportScope(scopeKey);
            if (scope === 'electric') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.electricTeam);
            if (scope === 'gas') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.gasTeam);
            if (scope === 'waste') return resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.wasteTeam);
            const electricSite = resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.electricTeam);
            const gasSite = resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.gasTeam);
            const wasteSite = resolveUtilReportSiteKeyFromTeamFilter(UtilReportState.wasteTeam);
            if (electricSite === 'all' || gasSite === 'all' || wasteSite === 'all') return 'all';
            if (electricSite === gasSite && gasSite === wasteSite) return electricSite;
            return 'all';
        }
