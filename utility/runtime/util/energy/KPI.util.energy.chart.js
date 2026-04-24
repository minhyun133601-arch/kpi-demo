        function renderUtilEnergyChart(panel) {
            if (!panel) return;
            const fromVal = panel.querySelector('[data-role="energy-chart-from"]')?.value;
            const toVal = panel.querySelector('[data-role="energy-chart-to"]')?.value;
            const electricTeam = panel.querySelector('[data-role="energy-chart-electric-team"]')?.value || 'all';
            const gasTeam = panel.querySelector('[data-role="energy-chart-gas-team"]')?.value || 'all';
            const metric = panel.querySelector('[data-role="energy-chart-metric"]')?.value || 'total_mj';
            const displayDecimals = normalizeUtilEnergyDecimals(
                panel.querySelector('[data-role="energy-chart-display-decimals"]')?.value,
                UtilEnergyState.displayDecimals
            );
            const electricFactor = parseUtilInputNumber(panel.querySelector('[data-role="energy-chart-electric-factor"]')) || UtilEnergyState.electricFactor;
            const gasLNG = parseUtilInputNumber(panel.querySelector('[data-role="energy-chart-lng-factor"]')) || UtilEnergyState.gasLNG;
            const gasLPG = parseUtilInputNumber(panel.querySelector('[data-role="energy-chart-lpg-factor"]')) || UtilEnergyState.gasLPG;
            const toeFactor = parseUtilInputNumber(panel.querySelector('[data-role="energy-chart-toe-factor"]')) || UtilEnergyState.toeFactor;

            UtilEnergyState.chartMetric = metric;
            UtilEnergyState.chartElectricTeam = electricTeam;
            UtilEnergyState.chartGasTeam = gasTeam;
            UtilEnergyState.electricTeam = electricTeam;
            UtilEnergyState.gasTeam = gasTeam;
            if (fromVal) UtilEnergyState.chartFrom = fromVal;
            if (toVal) UtilEnergyState.chartTo = toVal;
            if (fromVal) UtilEnergyState.from = fromVal;
            if (toVal) UtilEnergyState.to = toVal;
            UtilEnergyState.electricFactor = electricFactor;
            UtilEnergyState.gasLNG = gasLNG;
            UtilEnergyState.gasLPG = gasLPG;
            UtilEnergyState.toeFactor = toeFactor;
            UtilEnergyState.displayDecimals = displayDecimals;

            const from = parseUtilMonthValue(fromVal);
            const to = parseUtilMonthValue(toVal);
            if (!from || !to) return;
            const fromKey = from.year * 12 + from.month;
            const toKey = to.year * 12 + to.month;
            if (fromKey > toKey) return;

            const series = buildUtilEnergyMonthlySeries({
                fromKey,
                toKey,
                electricTeam,
                gasTeam,
                electricFactor,
                gasLNG,
                gasLPG
            });

            const metricLabelMap = {
                total_mj: '총열량 (MJ)',
                total_gj: '총열량 (GJ)',
                total_toe: '총열량 (TOE)',
                electric_mj: '전기 (MJ)',
                gas_mj: '가스 (MJ)'
            };
            const metricLabel = metricLabelMap[metric] || '총열량 (MJ)';
            const points = series.points.map(point => {
                let value = NaN;
                if (point.hasData) {
                    if (metric === 'electric_mj') value = point.electricMJ;
                    else if (metric === 'gas_mj') value = point.gasMJ;
                    else if (metric === 'total_gj') value = point.totalMJ / 1000;
                    else if (metric === 'total_toe') value = toeFactor ? point.totalMJ / toeFactor : 0;
                    else value = point.totalMJ;
                }
                return { label: point.label, value };
            });
            const summaryDecimals = displayDecimals;
            const electricTeamLabel = panel.querySelector('[data-role="energy-chart-electric-team"] option:checked')?.textContent || electricTeam;
            const gasTeamLabel = panel.querySelector('[data-role="energy-chart-gas-team"] option:checked')?.textContent || gasTeam;
            panel._energyChartData = {
                points,
                metricLabel,
                datasetLabel: '열량/TOE',
                teamLabel: `전기 ${electricTeamLabel} / 가스 ${gasTeamLabel}`,
                from: fromVal,
                to: toVal,
                decimals: summaryDecimals,
                chartType: 'line'
            };

            const totalValue = (() => {
                if (metric === 'electric_mj') return series.points.reduce((acc, p) => acc + (p.hasData ? p.electricMJ : 0), 0);
                if (metric === 'gas_mj') return series.points.reduce((acc, p) => acc + (p.hasData ? p.gasMJ : 0), 0);
                if (metric === 'total_gj') return series.totalMJ / 1000;
                if (metric === 'total_toe') return toeFactor ? series.totalMJ / toeFactor : 0;
                return series.totalMJ;
            })();
            const avgValue = series.count ? totalValue / series.count : 0;

            const rangeEl = panel.querySelector('[data-role="energy-chart-range"]');
            if (rangeEl) rangeEl.textContent = `${fromVal} ~ ${toVal}`;
            const totalEl = panel.querySelector('[data-role="energy-chart-total"]');
            if (totalEl) totalEl.textContent = series.count ? formatUtilNumber(totalValue, summaryDecimals) : '-';
            const avgEl = panel.querySelector('[data-role="energy-chart-avg"]');
            if (avgEl) avgEl.textContent = series.count ? formatUtilNumber(avgValue, summaryDecimals) : '-';
            const countEl = panel.querySelector('[data-role="energy-chart-count"]');
            if (countEl) countEl.textContent = formatUtilNumber(series.count || 0, 0);

            const chartEl = panel.querySelector('[data-role="energy-chart"]');
            if (chartEl) {
                chartEl.innerHTML = renderUtilTrendChart(points, metricLabel, {
                    showTypeSelect: false,
                    decimals: summaryDecimals
                });
            }
            const openBtn = panel.querySelector('[data-role="energy-chart-open"]');
            if (openBtn) {
                const hasValues = points.some(point => Number.isFinite(point.value));
                const popupEnabled = !!UtilEnergyState.chartPopupEnabled;
                openBtn.classList.toggle('is-hidden', !popupEnabled);
                openBtn.disabled = !hasValues || !popupEnabled;
            }
        }

        function initUtilEnergyChart(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-energy-chart]').forEach(panel => {
                bindUtilEnergyFormattedInputs(panel);
                const monthOptions = ensureUtilEnergyRangeState();
                const electricTeams = buildUtilTeamOptions(UTIL_ELECTRIC_ENTRIES);
                const gasTeams = buildUtilTeamOptions(UTIL_GAS_ENTRIES);
                const elecSelect = panel.querySelector('[data-role="energy-chart-electric-team"]');
                const gasSelect = panel.querySelector('[data-role="energy-chart-gas-team"]');
                const fromSelect = panel.querySelector('[data-role="energy-chart-from"]');
                const toSelect = panel.querySelector('[data-role="energy-chart-to"]');
                const metricSelect = panel.querySelector('[data-role="energy-chart-metric"]');
                const decimalsSelect = panel.querySelector('[data-role="energy-chart-display-decimals"]');
                if (elecSelect) {
                    const options = ['<option value="all">전체</option>']
                        .concat(electricTeams.map(team => `<option value="${team}">${team}</option>`))
                        .join('');
                    setUtilSelectOptions(elecSelect, options, UtilEnergyState.chartElectricTeam || UtilEnergyState.electricTeam || 'all');
                }
                if (gasSelect) {
                    const options = ['<option value="all">전체</option>']
                        .concat(gasTeams.map(team => `<option value="${team}">${team}</option>`))
                        .join('');
                    setUtilSelectOptions(gasSelect, options, UtilEnergyState.chartGasTeam || UtilEnergyState.gasTeam || 'all');
                }
                if (monthOptions && monthOptions.length) {
                    const monthHtml = monthOptions.map(month => `<option value="${month.value}">${month.label}</option>`).join('');
                    setUtilSelectOptions(fromSelect, monthHtml, UtilEnergyState.chartFrom || UtilEnergyState.from);
                    setUtilSelectOptions(toSelect, monthHtml, UtilEnergyState.chartTo || UtilEnergyState.to);
                }
                const elecFactor = panel.querySelector('[data-role="energy-chart-electric-factor"]');
                const lngFactor = panel.querySelector('[data-role="energy-chart-lng-factor"]');
                const lpgFactor = panel.querySelector('[data-role="energy-chart-lpg-factor"]');
                const toeFactor = panel.querySelector('[data-role="energy-chart-toe-factor"]');
                if (elecFactor) setUtilInputDisplayValue(elecFactor, UtilEnergyState.electricFactor, resolveUtilInputDecimals(elecFactor, 2));
                if (lngFactor) setUtilInputDisplayValue(lngFactor, UtilEnergyState.gasLNG, resolveUtilInputDecimals(lngFactor, 3));
                if (lpgFactor) setUtilInputDisplayValue(lpgFactor, UtilEnergyState.gasLPG, resolveUtilInputDecimals(lpgFactor, 3));
                if (toeFactor) setUtilInputDisplayValue(toeFactor, UtilEnergyState.toeFactor, resolveUtilInputDecimals(toeFactor, 0));
                if (metricSelect) metricSelect.value = UtilEnergyState.chartMetric || 'total_mj';
                if (decimalsSelect) decimalsSelect.value = String(normalizeUtilEnergyDecimals(UtilEnergyState.displayDecimals, 2));

                const handler = () => {
                    renderUtilEnergyChart(panel);
                    syncUtilEnergyLinkedControls(root);
                    syncUtilEnergyModalHeader(panel.closest('#util-energy-modal'));
                    root.querySelectorAll('[data-util-energy]').forEach(converterPanel => {
                        applyUtilEnergyLink(converterPanel);
                        syncUtilEnergyFields(converterPanel);
                        updateUtilEnergyPanel(converterPanel);
                    });
                };
                panel.querySelectorAll('input, select').forEach(el => {
                    el.addEventListener('input', handler);
                    el.addEventListener('change', handler);
                });
                const openBtn = panel.querySelector('[data-role="energy-chart-open"]');
                if (openBtn) {
                    openBtn.addEventListener('click', () => {
                        if (!UtilEnergyState.chartPopupEnabled) return;
                        if (panel._energyChartData) openUtilChartModal(panel._energyChartData);
                    });
                }
                handler();
            });
        }

        function syncUtilDualSelects(section) {
            if (!section) return;
            const datasetKey = normalizeUtilDualDatasetKey(section.dataset.datasetKey || '');
            const usageValue = normalizeUtilDualUsageUnitKey(section.dataset.usageUnitKey || '', datasetKey);
            const costValue = normalizeUtilReportCostUnitKey(section.dataset.costUnitKey || 'krw');
            const productionValue = normalizeUtilReportProductionUnitKey(section.dataset.productionUnitKey || 'kg');
            const ratioNumerator = normalizeUtilDualRatioMetricKey(section.dataset.ratioNumerator || 'usage');
            const ratioDenominator = normalizeUtilDualRatioMetricKey(section.dataset.ratioDenominator || 'production');
            const usageDecimals = section.dataset.usageDecimals || '0';
            const costDecimals = section.dataset.costDecimals || '0';
            const productionDecimals = section.dataset.productionDecimals || '0';
            const ratioDecimals = section.dataset.ratioDecimals || '3';
            const costModeValue = section.dataset.costMode || '';
            section.querySelectorAll('[data-unit="usage"]').forEach(select => {
                select.value = usageValue;
            });
            section.querySelectorAll('[data-unit="cost"]').forEach(select => {
                select.value = costValue;
            });
            section.querySelectorAll('[data-unit="production"]').forEach(select => {
                select.value = productionValue;
            });
            section.querySelectorAll('[data-decimals="usage"]').forEach(select => {
                select.value = usageDecimals;
            });
            section.querySelectorAll('[data-decimals="cost"]').forEach(select => {
                select.value = costDecimals;
            });
            section.querySelectorAll('[data-decimals="production"]').forEach(select => {
                select.value = productionDecimals;
            });
            section.querySelectorAll('[data-ratio-part="numerator"]').forEach(select => {
                select.value = ratioNumerator;
            });
            section.querySelectorAll('[data-ratio-part="denominator"]').forEach(select => {
                select.value = ratioDenominator;
            });
            section.querySelectorAll('[data-decimals="ratio"]').forEach(select => {
                select.value = ratioDecimals;
            });
            if (costModeValue) {
                section.querySelectorAll('[data-cost-mode]').forEach(select => {
                    select.value = costModeValue;
                });
            }
            syncUtilDualHeaderLabels(section);
        }

        function syncUtilDualHeaderLabels(section) {
            if (!section) return;
            const datasetKey = normalizeUtilDualDatasetKey(section.dataset.datasetKey || '');
            const usageUnitLabel = getUtilDualUsageUnitLabel(section.dataset.usageUnitKey || '', datasetKey);
            const costUnitLabel = getUtilReportUnitLabel(section.dataset.costUnitKey || 'krw');
            const productionUnitLabel = getUtilReportProductionUnitLabel(section.dataset.productionUnitKey || 'kg');
            section.querySelectorAll('[data-unit-label="usage"]').forEach(el => {
                const baseLabel = stripUtilLabelUnitSuffix(el.dataset.baseLabel || el.textContent || '사용량');
                el.textContent = usageUnitLabel ? `${baseLabel} (${usageUnitLabel})` : baseLabel;
            });
            section.querySelectorAll('[data-unit-label="production"]').forEach(el => {
                const baseLabel = stripUtilLabelUnitSuffix(el.dataset.baseLabel || el.textContent || '생산량');
                el.textContent = productionUnitLabel ? `${baseLabel} (${productionUnitLabel})` : baseLabel;
            });
            section.querySelectorAll('[data-cost-label]').forEach(el => {
                const selectedText = section.querySelector('[data-cost-mode]')?.options?.[section.querySelector('[data-cost-mode]')?.selectedIndex || 0]?.textContent || el.dataset.baseLabel || el.textContent || '비용';
                const baseLabel = stripUtilLabelUnitSuffix(selectedText);
                el.textContent = costUnitLabel ? `${baseLabel} (${costUnitLabel})` : baseLabel;
            });
        }

        function closeUtilDualDecimalsPopovers(scope = document) {
            if (!scope || typeof scope.querySelectorAll !== 'function') return;
            scope.querySelectorAll('[data-decimals-popover]').forEach(popover => {
                popover.hidden = true;
            });
            scope.querySelectorAll('[data-decimals-toggle]').forEach(button => {
                button.setAttribute('aria-expanded', 'false');
            });
        }

        if (!window.__utilDualDecimalsPopoverBound) {
            window.__utilDualDecimalsPopoverBound = true;
            document.addEventListener('click', () => {
                closeUtilDualDecimalsPopovers(document);
            });
        }

        function closeUtilActionMenus(scope = document) {
            if (!scope || typeof scope.querySelectorAll !== 'function') return;
            scope.querySelectorAll('[data-util-action-menu]').forEach(menu => {
                menu.open = false;
            });
        }

        if (!window.__utilActionMenuBound) {
            window.__utilActionMenuBound = true;
            document.addEventListener('click', event => {
                const target = event?.target;
                if (target && typeof target.closest === 'function' && target.closest('[data-util-action-menu]')) return;
                closeUtilActionMenus(document);
            });
        }

        function applyUtilCostMode(section) {
            if (!section) return;
            const costMode = section.dataset.costMode || 'total';
            section.querySelectorAll('[data-cost-mode]').forEach(select => {
                select.value = costMode;
            });
            section.querySelectorAll('.util-cost-cell').forEach(cell => {
                const key = `cost${costMode.charAt(0).toUpperCase()}${costMode.slice(1)}`;
                let raw = cell.dataset[key];
                if (raw === undefined || raw === '') {
                    raw = cell.dataset.costTotal ?? cell.dataset.value;
                }
                cell.dataset.value = raw ?? '';
                setUtilNumericCellDisplay(cell, formatUtilNumber(raw));
            });
            section.querySelectorAll('.util-ratio-cell').forEach(cell => {
                const key = `cost${costMode.charAt(0).toUpperCase()}${costMode.slice(1)}`;
                let raw = cell.dataset[key];
                if (raw === undefined || raw === '') {
                    raw = cell.dataset.costTotal ?? cell.dataset.ratioCost;
                }
                cell.dataset.ratioCost = raw ?? '';
            });
            syncUtilDualHeaderLabels(section);
        }

        function makeUtilYearKey(label, index) {
            const safe = String(label ?? '')
                .trim()
                .replace(/[^0-9a-zA-Z_-]/g, '');
            const token = safe || String(index || 0);
            return `y-${token}-${index}`;
        }

        function buildUtilDayOptions(selectedDay) {
            void selectedDay;
            const fixedDay = DEFAULT_UTIL_PRODUCTION_PERIOD.startDay;
            return `<option value="${fixedDay}" selected>${fixedDay}일</option>`;
        }

        function buildUtilSummaryStats(values) {
            let total = 0;
            let count = 0;
            (Array.isArray(values) ? values : []).forEach(value => {
                const numeric = parseUtilAmount(value);
                if (!Number.isFinite(numeric)) return;
                total += numeric;
                count += 1;
            });
            return {
                total: count ? total : null,
                average: count ? (total / count) : null,
                count
            };
        }

        function buildUtilDynamicSummaryRows(dataRows, productionMetaMap, costModes) {
            const rows = Array.isArray(dataRows) ? dataRows : [];
            const safeProductionMap = productionMetaMap instanceof Map ? productionMetaMap : new Map();
            const costKeys = Array.from(new Set(['total'].concat(
                (Array.isArray(costModes) ? costModes : [])
                    .map(mode => String(mode?.key || '').trim())
                    .filter(Boolean)
            )));
            const usageStats = buildUtilSummaryStats(rows.map(row => row?.usage));
            const costStats = buildUtilSummaryStats(rows.map(row => row?.cost));
            const productionStats = buildUtilSummaryStats(rows.map(row => safeProductionMap.get(row)?.value));
            const averageCosts = {};
            const totalCosts = {};
            costKeys.forEach(key => {
                const values = rows.map(row => {
                    if (key === 'total') {
                        return row?.costs?.total ?? row?.cost;
                    }
                    return row?.costs?.[key];
                });
                const stats = buildUtilSummaryStats(values);
                averageCosts[key] = stats.average;
                totalCosts[key] = stats.total;
            });
            return {
                average: {
                    label: '평균',
                    usage: usageStats.average,
                    cost: costStats.average,
                    production: productionStats.average,
                    costs: averageCosts
                },
                total: {
                    label: '계',
                    usage: usageStats.total,
                    cost: costStats.total,
                    production: productionStats.total,
                    costs: totalCosts
                }
            };
        }

        function normalizeUtilDualRatioMetricKey(metricKey) {
            const raw = String(metricKey || '').trim().toLowerCase();
            if (raw === 'cost') return 'cost';
            if (raw === 'production') return 'production';
            return 'usage';
        }

        function getUtilDualRatioMetricLabel(metricKey) {
            if (normalizeUtilDualRatioMetricKey(metricKey) === 'cost') return '비용';
            if (normalizeUtilDualRatioMetricKey(metricKey) === 'production') return '생산량';
            return '사용량';
        }

        function getUtilDualRatioMetricOptionsHtml(selectedKey = 'usage', disabledKey = '') {
            const normalized = normalizeUtilDualRatioMetricKey(selectedKey);
            return ['usage', 'cost', 'production']
                .map(key => `<option value="${key}"${key === normalized ? ' selected' : ''}>${getUtilDualRatioMetricLabel(key)}</option>`)
                .join('');
        }

        function normalizeUtilDualDatasetKey(datasetKey) {
            const raw = String(datasetKey || '').trim().toLowerCase();
            if (raw === 'gas' || raw === 'waste') return raw;
            return 'electric';
        }

        function stripUtilLabelUnitSuffix(label) {
            return String(label || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
        }

        function getUtilDualUsageUnitOptions(datasetKey) {
            return getUtilReportBuilderVizUsageUnitOptions(normalizeUtilDualDatasetKey(datasetKey))
                .filter(item => item.key !== 'none');
        }

        function normalizeUtilDualUsageUnitKey(unitKey, datasetKey) {
            const normalizedDatasetKey = normalizeUtilDualDatasetKey(datasetKey);
            const raw = String(unitKey || '').trim().toLowerCase();
            const options = getUtilDualUsageUnitOptions(normalizedDatasetKey);
            if (options.some(item => item.key === raw)) return raw;
            return String(options[0]?.key || 'kwh');
        }

        function getUtilDualUsageUnitScale(unitKey, datasetKey) {
            const key = normalizeUtilDualUsageUnitKey(unitKey, datasetKey);
            return getUtilReportBuilderVizUsageScale(key, normalizeUtilDualDatasetKey(datasetKey));
        }

        function getUtilDualUsageUnitLabel(unitKey, datasetKey) {
            const key = normalizeUtilDualUsageUnitKey(unitKey, datasetKey);
            return getUtilReportBuilderVizUsageLabel(key, normalizeUtilDualDatasetKey(datasetKey));
        }

        function getUtilDualUsageUnitOptionsHtml(datasetKey, selectedKey = '') {
            const normalized = normalizeUtilDualUsageUnitKey(selectedKey, datasetKey);
            return getUtilDualUsageUnitOptions(datasetKey)
                .map(item => `<option value="${item.key}"${item.key === normalized ? ' selected' : ''}>${item.label}</option>`)
                .join('');
        }

        function getUtilDualCostUnitOptionsHtml(selectedKey = 'krw') {
            const normalized = normalizeUtilReportCostUnitKey(selectedKey);
            return [
                { key: 'krw', label: '원' },
                { key: 'thousand', label: '천원' },
                { key: 'million', label: '백만원' }
            ].map(item => `<option value="${item.key}"${item.key === normalized ? ' selected' : ''}>${item.label}</option>`).join('');
        }

        function getUtilDualProductionUnitOptionsHtml(selectedKey = 'kg') {
            const normalized = normalizeUtilReportProductionUnitKey(selectedKey);
            return UTIL_REPORT_PRODUCTION_UNIT_OPTIONS
                .map(item => `<option value="${item.key}"${item.key === normalized ? ' selected' : ''}>${item.label}</option>`)
                .join('');
        }

        function getUtilDualDecimalsOptionsHtml(selectedValue = '0') {
            const normalized = String(selectedValue || '0').trim() || '0';
            return ['0', '1', '2', '3', '4']
                .map(value => `<option value="${value}"${value === normalized ? ' selected' : ''}>${value}</option>`)
                .join('');
        }

        function buildUtilDualUnitControlHtml(datasetKey) {
            return `
                <div class="util-year-decimals" data-util-shared-units>
                    <button type="button" class="util-year-decimals-btn" data-decimals-toggle aria-expanded="false">단위</button>
                    <div class="util-year-decimals-popover" data-decimals-popover hidden>
                        <div class="util-year-decimals-grid">
                            <div class="util-year-decimals-row">
                                <span class="name">사용량</span>
                                <select class="util-table-select util-table-select-sm" data-unit="usage">${getUtilDualUsageUnitOptionsHtml(datasetKey)}</select>
                                <select class="util-table-select util-table-select-sm" data-decimals="usage">${getUtilDualDecimalsOptionsHtml('0')}</select>
                            </div>
                            <div class="util-year-decimals-row">
                                <span class="name">비용</span>
                                <select class="util-table-select util-table-select-sm" data-unit="cost">${getUtilDualCostUnitOptionsHtml('krw')}</select>
                                <select class="util-table-select util-table-select-sm" data-decimals="cost">${getUtilDualDecimalsOptionsHtml('0')}</select>
                            </div>
                            <div class="util-year-decimals-row">
                                <span class="name">생산량</span>
                                <select class="util-table-select util-table-select-sm" data-unit="production">${getUtilDualProductionUnitOptionsHtml('kg')}</select>
                                <select class="util-table-select util-table-select-sm" data-decimals="production">${getUtilDualDecimalsOptionsHtml('0')}</select>
                            </div>
                            <div class="util-year-decimals-row is-ratio-decimals">
                                <span class="meta">소수</span>
                                <select class="util-table-select util-table-select-sm" data-decimals="ratio">${getUtilDualDecimalsOptionsHtml('3')}</select>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function renderUtilDualTable(year, config, teamName, options = {}) {
            const yearValue = parseUtilYearLabel(year?.label);
            const datasetKey = normalizeUtilDualDatasetKey(options.datasetKey || '');
            let usageLabel = config?.usageLabelByTeam ? config.usageLabelByTeam(teamName) : (config?.usageLabel || '사용량');
            if (options.gasConvert === 'on') {
                usageLabel = getGasConvertedUsageLabel(teamName);
            }
            const costModes = config?.costModesByTeam
                ? (config.costModesByTeam(teamName) || [])
                : (Array.isArray(config?.costModes) ? config.costModes : []);
            const columns = [
                { key: 'label', label: '구분' },
                { key: 'usage', label: usageLabel },
                { key: 'cost', label: config?.costLabel || '비용' },
                { key: 'production', label: config?.productionLabel || '생산량' },
                { key: 'ratio', label: '비율' }
            ];
            const rows = (year.rows || []).filter(row => {
                if (row.label === '계' || row.label === '평균') return true;
                const month = parseUtilMonthLabel(row.label);
                if (!month || !Number.isFinite(yearValue)) return false;
                return isUtilYearMonthWithinToday(yearValue, month);
            });
            const costModeEnabled = costModes.length > 0 && rows.some(row => row && row.costs);
            const costModeKey = costModeEnabled ? (config.costModeKey || costModes[0].key) : '';
            const costModeLabel = costModeEnabled
                ? (costModes.find(mode => mode.key === costModeKey)?.label || columns[2].label)
                : columns[2].label;
            const costLabelVisible = !(config?.hideCostLabel && costModeEnabled);
            const hasAvgRow = rows.some(row => row.label === '평균');
            const hasTotalRow = rows.some(row => row.label === '계');
            const dataRows = rows.filter(row => row.label !== '계' && row.label !== '평균');

            const teamToken = encodeURIComponent(String(teamName || ''));
            const teamTokenForYearAction = encodeURIComponent(String(teamName || ''));
            const detailType = 'production';
            const productionMetaMap = new Map();
            const productionOptions = datasetKey === 'gas' ? { gasContext: true } : {};
            dataRows.forEach(row => {
                productionMetaMap.set(row, resolveUtilProductionCell(teamName, yearValue, row, productionOptions));
            });
            const productionValues = dataRows
                .map(row => Number(productionMetaMap.get(row)?.value))
                .filter(value => Number.isFinite(value));
            const productionTotal = productionValues.reduce((acc, value) => acc + value, 0);
            const productionAverage = productionValues.length ? (productionTotal / productionValues.length) : null;
            const summaryRows = buildUtilDynamicSummaryRows(dataRows, productionMetaMap, costModes);
            const avgRow = hasAvgRow ? summaryRows.average : null;
            const totalRow = hasTotalRow ? summaryRows.total : null;

            const ratioMetricOptions = getUtilDualRatioMetricOptionsHtml('usage');
            const ratioDenominatorOptions = getUtilDualRatioMetricOptionsHtml('production');

            const buildClearButton = (metricKey, rawValue, monthValue, extra = {}) => {
                if (metricKey !== 'production') return '';
                if (!datasetKey) return '';
                if (!Number.isFinite(yearValue) || !Number.isFinite(monthValue)) return '';
                const parsedValue = parseUtilAmount(rawValue);
                if (!Number.isFinite(parsedValue)) return '';
                const metricLabelMap = { usage: '사용량', cost: '비용', production: '생산량' };
                const metricLabel = metricLabelMap[metricKey] || '값';
                const ariaLabel = `${metricLabel} 삭제`;
                const costSubKey = String(extra.costSubKey || '').trim();
                const costSubKeyAttr = costSubKey ? ` data-cost-sub-key="${escapeHtml(costSubKey)}"` : '';
                return `<button type="button" class="util-num-clear" data-cell-clear="${metricKey}" data-dataset-key="${escapeHtml(datasetKey)}" data-team="${escapeHtml(teamTokenForYearAction)}" data-year="${yearValue}" data-month="${monthValue}"${costSubKeyAttr} aria-label="${escapeHtml(ariaLabel)}">x</button>`;
            };

            const buildRow = (row, className, labelOverride, productionMeta) => {
                const rowClassName = String(className || '').trim();
                const isSummaryRow = rowClassName.includes('util-row-average') || rowClassName.includes('util-row-total');
                const label = labelOverride || row.label;
                const monthValue = parseUtilMonthLabel(row?.label);
                const productionValue = productionMeta ? productionMeta.value : row?.production;
                const cells = columns.map(col => {
                    if (col.key === 'label') {
                        const labelText = escapeHtml(String(label || ''));
                        const detailButton = (!isSummaryRow && Number.isFinite(yearValue) && monthValue)
                            ? `<button type="button" class="util-detail-btn" onclick="openUtilProductionDailyDetail('${teamToken}', ${yearValue}, ${monthValue}, '${detailType}')">일별</button>`
                            : '';
                        const labelMain = detailButton
                            ? `<div class="util-row-head"><div class="util-row-label">${labelText}</div>${detailButton}</div>`
                            : `<div class="util-row-label">${labelText}</div>`;
                        const notes = [];
                        if (productionMeta?.source === 'daily') {
                            if (productionMeta.periodLabel) notes.push(productionMeta.periodLabel);
                        }
                        const noteHtml = notes.map(note => `<span class="util-row-note">${escapeHtml(note)}</span>`).join('');
                        if (noteHtml) return `<td>${labelMain}<div class="util-row-meta">${noteHtml}</div></td>`;
                        return `<td>${labelMain}</td>`;
                    }
                    if (col.key === 'ratio') {
                        const costs = row.costs || {};
                        const ratioCostValue = costModeEnabled && costModeKey ? (costs[costModeKey] ?? row.cost ?? '') : (row.cost ?? '');
                        const costAttrs = costModeEnabled
                            ? costModes.map(mode => `data-cost-${mode.key}="${costs[mode.key] ?? ''}"`).join(' ')
                            : '';
                        return `<td class="util-num util-ratio-cell" data-col="ratio" data-ratio-usage="${row?.usage ?? ''}" data-ratio-cost="${ratioCostValue ?? ''}" data-ratio-production="${productionValue ?? ''}" ${costAttrs}><div class="util-num-cell"><span class="util-num-value"></span></div></td>`;
                    }
                    const val = col.key === 'production'
                        ? productionValue
                        : row[col.key];
                    if (col.key !== 'cost') {
                        const clearButton = buildClearButton(col.key, val, monthValue);
                        return `<td class="util-num" data-col="${col.key}" data-value="${val ?? ''}"><div class="util-num-cell"><span class="util-num-value">${formatUtilNumber(val)}</span>${clearButton}</div></td>`;
                    }
                    const costs = row.costs || {};
                    const costAttrs = costModeEnabled
                        ? costModes.map(mode => `data-cost-${mode.key}="${costs[mode.key] ?? ''}"`).join(' ')
                        : '';
                    const costVal = costModeEnabled && costModeKey ? (costs[costModeKey] ?? row.cost ?? '') : (row.cost ?? '');
                    const clearButton = buildClearButton('cost', costVal, monthValue, {
                        costSubKey: costModeEnabled && costModeKey && costModeKey !== 'total' ? costModeKey : ''
                    });
                    return `<td class="util-num util-cost-cell" data-col="cost" ${costAttrs} data-value="${costVal}"><div class="util-num-cell"><span class="util-num-value">${formatUtilNumber(costVal)}</span>${clearButton}</div></td>`;
                }).join('');
                return rowClassName ? `<tr class="${rowClassName}">${cells}</tr>` : `<tr>${cells}</tr>`;
            };

            const avgProductionMeta = avgRow
                ? { value: productionValues.length ? productionAverage : null, source: 'summary', periodLabel: '', count: 0 }
                : null;
            const totalProductionMeta = totalRow
                ? { value: productionValues.length ? productionTotal : null, source: 'summary', periodLabel: '', count: 0 }
                : null;
            const dataHtml = dataRows.map(row => buildRow(row, '', null, productionMetaMap.get(row))).join('');
            const avgHtml = avgRow ? buildRow(avgRow, 'util-row-average', '평균', avgProductionMeta) : '';
            const totalHtml = totalRow ? buildRow(totalRow, 'util-row-total', '합계', totalProductionMeta) : '';
            const yearKey = String(options.yearKey || makeUtilYearKey(year?.label, 0));
            const isYearOpen = options.isYearOpen !== false;
            const costModeControl = costModeEnabled ? `
                <select class="util-table-select util-table-select-wide" data-cost-mode>
                    ${costModes.map(mode => `<option value="${mode.key}">${mode.label}</option>`).join('')}
                </select>
            ` : '';
            const costLabelHtml = costLabelVisible ? `<span class="util-head-label" data-cost-label data-base-label="${escapeHtml(stripUtilLabelUnitSuffix(costModeLabel))}">${costModeLabel}</span>` : '';
            const costHeadClass = costModeEnabled && !costLabelVisible ? 'util-head-cell util-head-cell-cost-mode' : 'util-head-cell';
            const costThClass = costModeEnabled && !costLabelVisible ? 'util-th-cost-mode' : '';
            const yearHeadSub = year?.label ? `${year.label} 월별 데이터` : '월별 데이터';
            const footerHtml = (avgHtml || totalHtml)
                ? `<tfoot>${avgHtml}${totalHtml}</tfoot>`
                : '';
            const head = `
                <thead>
                    <tr class="util-table-head">
                        <th>
                            <div class="util-head-cell">
                                <span class="util-head-label">${columns[0].label}</span>
                            </div>
                        </th>
                        <th>
                            <div class="util-head-cell">
                                <span class="util-head-label" data-unit-label="usage" data-base-label="${escapeHtml(stripUtilLabelUnitSuffix(columns[1].label))}">${columns[1].label}</span>
                            </div>
                        </th>
                        <th${costThClass ? ` class="${costThClass}"` : ''}>
                            <div class="${costHeadClass}">
                                ${costModeControl}
                                ${costLabelHtml}
                            </div>
                        </th>
                        <th>
                            <div class="util-head-cell">
                                <span class="util-head-label" data-unit-label="production" data-base-label="${escapeHtml(stripUtilLabelUnitSuffix(columns[3].label))}">${columns[3].label}</span>
                            </div>
                        </th>
                        <th>
                            <div class="util-head-cell util-head-cell-ratio">
                                <div class="util-head-row">
                                    <div class="util-head-inline is-ratio">
                                        <select class="util-table-select util-table-select-sm is-ratio-metric" data-ratio-part="numerator">${ratioMetricOptions}</select>
                                        <span class="util-head-sub is-ratio-divider">/</span>
                                        <select class="util-table-select util-table-select-sm is-ratio-metric" data-ratio-part="denominator">${ratioDenominatorOptions}</select>
                                    </div>
                                </div>
                            </div>
                        </th>
                    </tr>
                </thead>
            `;
            return `
                <div class="util-year-card ${isYearOpen ? '' : 'is-collapsed'}" data-util-year-card="${yearKey}">
                    <div class="util-year-head">
                        <div class="util-year-title">${year.label}</div>
                        <div class="util-year-head-controls">
                            <button type="button" class="util-year-toggle-btn" data-year-toggle="${yearKey}" aria-label="${isYearOpen ? '닫기' : '열기'}">${isYearOpen ? '-' : '+'}</button>
                        </div>
                    </div>
                    <div class="util-year-body">
                        <table class="util-table util-dual-data-table">
                            <colgroup>
                                <col style="width:20%">
                                <col style="width:18%">
                            <col style="width:18%">
                            <col style="width:18%">
                            <col style="width:26%">
                            </colgroup>
                            ${head}
                            <tbody>${dataHtml}${avgHtml}${totalHtml}</tbody>
                        </table>
                    </div>
                </div>
            `;
        }
