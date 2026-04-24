        const UTIL_GAS_LPG_TO_LNG_FACTOR = 1.201;

        function getGasConversionFactor(section) {
            const normalizedDatasetKey = normalizeUtilDualDatasetKey(section?.dataset?.datasetKey || '');
            if (normalizedDatasetKey !== 'gas') return 1;
            const gasConvertMode = String(section?.dataset?.gasConvert || 'off').trim().toLowerCase();
            if (gasConvertMode !== 'on') return 1;
            const activeTeam = String(section?.dataset?.activeTeam || '');
            return getGasTypeByTeam(activeTeam) === 'lpg' ? UTIL_GAS_LPG_TO_LNG_FACTOR : 1;
        }

        function getGasConvertedUsageLabel(teamName) {
            const gasType = getGasTypeByTeam(teamName);
            if (gasType === 'lpg') return '환산 사용량 (LNG m³)';
            if (gasType === 'lng') return '사용량 (LNG m³)';
            return '환산 사용량 (LNG m³)';
        }

        function applyUtilDualConversion(section) {
            if (!section) return;
            const datasetKey = normalizeUtilDualDatasetKey(section.dataset.datasetKey || '');
            const usageUnitKey = normalizeUtilDualUsageUnitKey(section.dataset.usageUnitKey || '', datasetKey);
            const costUnitKey = normalizeUtilReportCostUnitKey(section.dataset.costUnitKey || 'krw');
            const productionUnitKey = normalizeUtilReportProductionUnitKey(section.dataset.productionUnitKey || 'kg');
            const usageFactor = getUtilDualUsageUnitScale(usageUnitKey, datasetKey);
            const costFactor = getUtilReportScale(costUnitKey);
            const productionFactor = getUtilReportProductionScale(productionUnitKey);
            const usageDecimals = parseInt(section.dataset.usageDecimals || section.querySelector('[data-decimals="usage"]')?.value || '0', 10);
            const costDecimals = parseInt(section.dataset.costDecimals || section.querySelector('[data-decimals="cost"]')?.value || '0', 10);
            const productionDecimals = parseInt(section.dataset.productionDecimals || section.querySelector('[data-decimals="production"]')?.value || '0', 10);
            const ratioNumerator = normalizeUtilDualRatioMetricKey(
                section.dataset.ratioNumerator || section.querySelector('[data-ratio-part="numerator"]')?.value || 'usage'
            );
            const ratioDenominator = normalizeUtilDualRatioMetricKey(
                section.dataset.ratioDenominator || section.querySelector('[data-ratio-part="denominator"]')?.value || 'production'
            );
            const ratioDecimals = parseInt(section.dataset.ratioDecimals || section.querySelector('[data-decimals="ratio"]')?.value || '3', 10);
            const gasFactor = getGasConversionFactor(section);
            const convertMetricValue = (metricKey, rawValue) => {
                const raw = parseUtilAmount(rawValue);
                if (!Number.isFinite(raw)) return NaN;
                const factor = metricKey === 'cost'
                    ? costFactor
                    : (metricKey === 'production' ? productionFactor : usageFactor);
                const scaled = factor ? raw / factor : raw;
                return scaled * gasFactor;
            };
            const getRatioRawValue = (cell, metricKey) => {
                if (!cell) return NaN;
                if (metricKey === 'cost') return parseUtilAmount(cell.dataset.ratioCost);
                if (metricKey === 'production') return parseUtilAmount(cell.dataset.ratioProduction);
                return parseUtilAmount(cell.dataset.ratioUsage);
            };
            section.querySelectorAll('.util-num').forEach(cell => {
                const col = cell.dataset.col;
                if (col === 'ratio') {
                    const numeratorRaw = getRatioRawValue(cell, ratioNumerator);
                    const denominatorRaw = getRatioRawValue(cell, ratioDenominator);
                    const numeratorValue = convertMetricValue(ratioNumerator, numeratorRaw);
                    const denominatorValue = convertMetricValue(ratioDenominator, denominatorRaw);
                    if (!Number.isFinite(numeratorValue) || !Number.isFinite(denominatorValue) || Math.abs(denominatorValue) < 1e-12) {
                        setUtilNumericCellDisplay(cell, '');
                        return;
                    }
                    setUtilNumericCellDisplay(cell, formatUtilNumber(numeratorValue / denominatorValue, ratioDecimals));
                    return;
                }
                const raw = parseUtilAmount(cell.dataset.value);
                if (!Number.isFinite(raw)) {
                    setUtilNumericCellDisplay(cell, '');
                    return;
                }
                const factor = col === 'cost' ? costFactor : (col === 'production' ? productionFactor : usageFactor);
                const decimals = col === 'cost' ? costDecimals : (col === 'production' ? productionDecimals : usageDecimals);
                const scaled = factor ? raw / factor : raw;
                const converted = scaled * gasFactor;
                setUtilNumericCellDisplay(cell, formatUtilNumber(converted, decimals));
            });
        }

        function parseUtilInputNumber(el) {
            if (!el) return 0;
            const parsed = parseUtilNumericValue(el.value);
            return parsed === null ? 0 : parsed;
        }

        function buildUtilEnergyMonthOptions() {
            const combined = UTIL_ELECTRIC_ENTRIES.concat(UTIL_GAS_ENTRIES);
            return buildUtilMonthOptions(combined);
        }

        function setUtilSelectOptions(select, options, defaultValue) {
            if (!select) return;
            select.innerHTML = options;
            if (defaultValue !== undefined && defaultValue !== null) {
                select.value = defaultValue;
            }
        }

        function getUtilEntryKey(entry) {
            const year = Number(entry?.year);
            const month = Number(entry?.month);
            if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
            return year * 12 + month;
        }

        function sumUtilEntries(entries, fromKey, toKey, teamVal) {
            let usage = 0;
            let cost = 0;
            let hasData = false;
            (entries || []).forEach(entry => {
                if (teamVal && teamVal !== 'all' && entry.team !== teamVal) return;
                const key = getUtilEntryKey(entry);
                if (!key || key < fromKey || key > toKey) return;
                const usageVal = Number(entry.usage);
                if (Number.isFinite(usageVal)) {
                    usage += usageVal;
                    hasData = true;
                }
                const costVal = Number(entry.cost);
                if (Number.isFinite(costVal)) cost += costVal;
            });
            return { usage, cost, hasData };
        }

        function getGasFactorByTeam(teamName, factors) {
            const name = String(teamName || '');
            if (name.includes('LPG')) return factors?.lpg ?? UTIL_ENERGY_DEFAULTS.gasLPG;
            if (name.includes('LNG')) return factors?.lng ?? UTIL_ENERGY_DEFAULTS.gasLNG;
            return factors?.lng ?? UTIL_ENERGY_DEFAULTS.gasLNG;
        }

        function getGasTypeByTeam(teamName) {
            const name = String(teamName || '');
            if (name.includes('LPG')) return 'lpg';
            if (name.includes('LNG')) return 'lng';
            return 'lng';
        }

        function sumUtilGasEnergy(entries, fromKey, toKey, teamVal, factors) {
            let mj = 0;
            let cost = 0;
            let hasData = false;
            (entries || []).forEach(entry => {
                if (teamVal && teamVal !== 'all' && entry.team !== teamVal) return;
                const key = getUtilEntryKey(entry);
                if (!key || key < fromKey || key > toKey) return;
                const usageVal = Number(entry.usage);
                if (Number.isFinite(usageVal)) {
                    const factor = getGasFactorByTeam(entry.team, factors);
                    mj += usageVal * factor;
                    hasData = true;
                }
                const costVal = Number(entry.cost);
                if (Number.isFinite(costVal)) cost += costVal;
            });
            return { mj, cost, hasData };
        }

        function sumUtilGasUsageByType(entries, fromKey, toKey, teamVal) {
            let lngUsage = 0;
            let lpgUsage = 0;
            let cost = 0;
            let hasLng = false;
            let hasLpg = false;
            (entries || []).forEach(entry => {
                if (teamVal && teamVal !== 'all' && entry.team !== teamVal) return;
                const key = getUtilEntryKey(entry);
                if (!key || key < fromKey || key > toKey) return;
                const usageVal = Number(entry.usage);
                if (Number.isFinite(usageVal)) {
                    const type = getGasTypeByTeam(entry.team);
                    if (type === 'lpg') {
                        lpgUsage += usageVal;
                        hasLpg = true;
                    } else {
                        lngUsage += usageVal;
                        hasLng = true;
                    }
                }
                const costVal = Number(entry.cost);
                if (Number.isFinite(costVal)) cost += costVal;
            });
            return { lngUsage, lpgUsage, cost, hasLng, hasLpg };
        }

        function ensureUtilEnergyRangeState() {
            const months = buildUtilEnergyMonthOptions();
            if (!months.length) return null;
            const fromDefault = months[0].value;
            const toDefault = months[months.length - 1].value;
            if (!UtilEnergyState.from || !months.some(item => item.value === UtilEnergyState.from)) {
                UtilEnergyState.from = fromDefault;
            }
            if (!UtilEnergyState.to || !months.some(item => item.value === UtilEnergyState.to)) {
                UtilEnergyState.to = toDefault;
            }
            if (!UtilEnergyState.chartFrom || !months.some(item => item.value === UtilEnergyState.chartFrom)) {
                UtilEnergyState.chartFrom = UtilEnergyState.from;
            }
            if (!UtilEnergyState.chartTo || !months.some(item => item.value === UtilEnergyState.chartTo)) {
                UtilEnergyState.chartTo = UtilEnergyState.to;
            }
            return months;
        }

        function getUtilEnergyTeamLabel(teamValue) {
            const value = String(teamValue || '').trim();
            return value && value !== 'all' ? value : '전체';
        }

        function getUtilEnergyRangeLabel() {
            const from = UtilEnergyState.from || UtilEnergyState.chartFrom || '';
            const to = UtilEnergyState.to || UtilEnergyState.chartTo || '';
            if (from && to) return `${from} ~ ${to}`;
            return '-';
        }

        function buildUtilEnergyLauncherSummaryText() {
            return `기간: ${getUtilEnergyRangeLabel()} / 전기 팀: ${getUtilEnergyTeamLabel(UtilEnergyState.electricTeam)} / 가스 팀: ${getUtilEnergyTeamLabel(UtilEnergyState.gasTeam)}`;
        }

        function refreshUtilEnergyLauncherSummary(scope) {
            const root = scope || document;
            const summary = buildUtilEnergyLauncherSummaryText();
            root.querySelectorAll('[data-role="util-energy-launcher-summary"]').forEach(el => {
                el.textContent = summary;
            });
        }

        function initUtilEnergyLauncher(scope) {
            const root = scope || document;
            refreshUtilEnergyLauncherSummary(root);
            syncUtilEnergyChartPopupControls(root);
        }

        function syncUtilEnergyChartPopupControls(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-role="util-energy-modal-enable-chart-popup"]').forEach(toggle => {
                toggle.checked = !!UtilEnergyState.chartPopupEnabled;
            });
            root.querySelectorAll('[data-role="energy-chart-open"]').forEach(button => {
                const enabled = !!UtilEnergyState.chartPopupEnabled;
                button.classList.toggle('is-hidden', !enabled);
                if (!enabled) {
                    button.disabled = true;
                    button.setAttribute('aria-hidden', 'true');
                } else {
                    button.removeAttribute('aria-hidden');
                }
            });
        }

        function syncUtilEnergyModalHeader(modal) {
            if (!modal) return;
            const subEl = modal.querySelector('[data-role="util-energy-modal-sub"]');
            if (!subEl) return;
            subEl.textContent = `기간: ${getUtilEnergyRangeLabel()} · 전기 팀: ${getUtilEnergyTeamLabel(UtilEnergyState.electricTeam)} · 가스 팀: ${getUtilEnergyTeamLabel(UtilEnergyState.gasTeam)}`;
        }

        function updateUtilEnergyStateFromPanel(panel) {
            if (!panel) return;
            const linkToggle = panel.querySelector('[data-role="energy-link-toggle"]');
            if (linkToggle) UtilEnergyState.linkEnabled = linkToggle.checked;
            const elecTeam = panel.querySelector('[data-role="energy-link-electric-team"]');
            if (elecTeam) UtilEnergyState.electricTeam = elecTeam.value || 'all';
            const gasTeam = panel.querySelector('[data-role="energy-link-gas-team"]');
            if (gasTeam) UtilEnergyState.gasTeam = gasTeam.value || 'all';
            const gasMode = panel.querySelector('[data-role="energy-link-gas-mode"]');
            if (gasMode) UtilEnergyState.linkGasMode = gasMode.value || 'mj';
            const fromSelect = panel.querySelector('[data-role="energy-link-from"]');
            if (fromSelect) UtilEnergyState.from = fromSelect.value || UtilEnergyState.from;
            const toSelect = panel.querySelector('[data-role="energy-link-to"]');
            if (toSelect) UtilEnergyState.to = toSelect.value || UtilEnergyState.to;
            const lngInput = panel.querySelector('[data-role="energy-link-lng-factor"]');
            if (lngInput) UtilEnergyState.gasLNG = parseUtilInputNumber(lngInput) || UtilEnergyState.gasLNG;
            const lpgInput = panel.querySelector('[data-role="energy-link-lpg-factor"]');
            if (lpgInput) UtilEnergyState.gasLPG = parseUtilInputNumber(lpgInput) || UtilEnergyState.gasLPG;
            const displayDecimalsSelect = panel.querySelector('[data-role="energy-display-decimals"]');
            if (displayDecimalsSelect) {
                UtilEnergyState.displayDecimals = normalizeUtilEnergyDecimals(displayDecimalsSelect.value, UtilEnergyState.displayDecimals);
            }
            UtilEnergyState.chartElectricTeam = UtilEnergyState.electricTeam;
            UtilEnergyState.chartGasTeam = UtilEnergyState.gasTeam;
            UtilEnergyState.chartFrom = UtilEnergyState.from;
            UtilEnergyState.chartTo = UtilEnergyState.to;
        }

        function syncUtilEnergyLinkedControls(scope) {
            const root = scope || document;
            const setFieldValue = (el, value) => {
                if (!el || value === undefined || value === null || value === '') return;
                const stringValue = String(value);
                if (el.tagName === 'SELECT') {
                    if (Array.from(el.options || []).some(option => option.value === stringValue)) {
                        el.value = stringValue;
                    }
                    return;
                }
                if (el.tagName === 'INPUT' && Object.prototype.hasOwnProperty.call(el.dataset || {}, 'formatDecimals')) {
                    const decimals = resolveUtilInputDecimals(el, null);
                    setUtilInputDisplayValue(el, value, decimals);
                    return;
                }
                el.value = stringValue;
            };

            root.querySelectorAll('[data-util-energy]').forEach(panel => {
                panel.dataset.energySyncing = 'true';
                const linkToggle = panel.querySelector('[data-role="energy-link-toggle"]');
                if (linkToggle) linkToggle.checked = !!UtilEnergyState.linkEnabled;
                setFieldValue(panel.querySelector('[data-role="energy-link-electric-team"]'), UtilEnergyState.electricTeam || 'all');
                setFieldValue(panel.querySelector('[data-role="energy-link-gas-team"]'), UtilEnergyState.gasTeam || 'all');
                setFieldValue(panel.querySelector('[data-role="energy-link-gas-mode"]'), UtilEnergyState.linkGasMode || 'mj');
                setFieldValue(panel.querySelector('[data-role="energy-link-from"]'), UtilEnergyState.from);
                setFieldValue(panel.querySelector('[data-role="energy-link-to"]'), UtilEnergyState.to);
                setFieldValue(panel.querySelector('[data-role="energy-link-lng-factor"]'), UtilEnergyState.gasLNG);
                setFieldValue(panel.querySelector('[data-role="energy-link-lpg-factor"]'), UtilEnergyState.gasLPG);
                setFieldValue(panel.querySelector('[data-role="energy-display-decimals"]'), UtilEnergyState.displayDecimals);

                const basisSelect = panel.querySelector('[data-role="electric-basis"]');
                const factorInput = panel.querySelector('[data-role="electric-factor"]');
                const diffFinal = Math.abs(UtilEnergyState.electricFactor - UTIL_ENERGY_DEFAULTS.electricFinal);
                const diffPrimary = Math.abs(UtilEnergyState.electricFactor - UTIL_ENERGY_DEFAULTS.electricPrimary);
                if (basisSelect) {
                    if (diffFinal < 0.01) basisSelect.value = String(UTIL_ENERGY_DEFAULTS.electricFinal);
                    else if (diffPrimary < 0.01) basisSelect.value = String(UTIL_ENERGY_DEFAULTS.electricPrimary);
                    else basisSelect.value = 'custom';
                }
                if (factorInput && basisSelect?.value === 'custom') {
                    const factorDecimals = resolveUtilInputDecimals(factorInput, null);
                    setUtilInputDisplayValue(factorInput, UtilEnergyState.electricFactor, factorDecimals);
                }
                setFieldValue(panel.querySelector('[data-role="toe-factor"]'), UtilEnergyState.toeFactor);
                panel.dataset.energySyncing = 'false';
                syncUtilEnergyFields(panel);
            });

            root.querySelectorAll('[data-util-energy-chart]').forEach(panel => {
                const electricTeam = UtilEnergyState.chartElectricTeam || UtilEnergyState.electricTeam || 'all';
                const gasTeam = UtilEnergyState.chartGasTeam || UtilEnergyState.gasTeam || 'all';
                const fromValue = UtilEnergyState.chartFrom || UtilEnergyState.from;
                const toValue = UtilEnergyState.chartTo || UtilEnergyState.to;
                setFieldValue(panel.querySelector('[data-role="energy-chart-electric-team"]'), electricTeam);
                setFieldValue(panel.querySelector('[data-role="energy-chart-gas-team"]'), gasTeam);
                setFieldValue(panel.querySelector('[data-role="energy-chart-from"]'), fromValue);
                setFieldValue(panel.querySelector('[data-role="energy-chart-to"]'), toValue);
                setFieldValue(panel.querySelector('[data-role="energy-chart-metric"]'), UtilEnergyState.chartMetric || 'total_mj');
                setFieldValue(panel.querySelector('[data-role="energy-chart-electric-factor"]'), UtilEnergyState.electricFactor);
                setFieldValue(panel.querySelector('[data-role="energy-chart-lng-factor"]'), UtilEnergyState.gasLNG);
                setFieldValue(panel.querySelector('[data-role="energy-chart-lpg-factor"]'), UtilEnergyState.gasLPG);
                setFieldValue(panel.querySelector('[data-role="energy-chart-toe-factor"]'), UtilEnergyState.toeFactor);
                setFieldValue(panel.querySelector('[data-role="energy-chart-display-decimals"]'), UtilEnergyState.displayDecimals);
            });

            syncUtilEnergyChartPopupControls(root);
            refreshUtilEnergyLauncherSummary(root);
        }

        function applyUtilEnergyLink(panel) {
            if (!panel) return;
            const manualFields = [
                panel.querySelector('[data-role="electric-kwh"]'),
                panel.querySelector('[data-role="gas-amount"]'),
                panel.querySelector('[data-role="electric-cost"]'),
                panel.querySelector('[data-role="gas-cost"]'),
                panel.querySelector('[data-role="gas-unit"]')
            ];
            const warningEl = panel.querySelector('[data-role="energy-link-warning"]');
            const setWarning = (message) => {
                if (!warningEl) return;
                if (message) {
                    warningEl.textContent = message;
                    warningEl.style.display = 'block';
                } else {
                    warningEl.textContent = '';
                    warningEl.style.display = 'none';
                }
            };
            if (!UtilEnergyState.linkEnabled) {
                manualFields.forEach(field => { if (field) field.disabled = false; });
                setWarning('');
                return;
            }
            const months = ensureUtilEnergyRangeState();
            if (!months || !months.length) return;
            const fromVal = UtilEnergyState.from;
            const toVal = UtilEnergyState.to;
            const from = parseUtilMonthValue(fromVal);
            const to = parseUtilMonthValue(toVal);
            if (!from || !to) return;
            const fromKey = from.year * 12 + from.month;
            const toKey = to.year * 12 + to.month;
            const electric = sumUtilEntries(UTIL_ELECTRIC_ENTRIES, fromKey, toKey, UtilEnergyState.electricTeam);
            let gasAmount = 0;
            let gasCost = 0;
            let gasHasData = false;
            let gasUnitMode = 'mj';
            let gasFactor = 1;
            const gasMode = UtilEnergyState.linkGasMode || 'mj';
            if (gasMode === 'raw') {
                const raw = sumUtilGasUsageByType(UTIL_GAS_ENTRIES, fromKey, toKey, UtilEnergyState.gasTeam);
                gasCost = raw.cost;
                if (raw.hasLng && raw.hasLpg) {
                    setWarning('LNG/LPG가 혼합되어 원단위 합산이 불가합니다. 열량(MJ) 합산으로 표시합니다.');
                    const gas = sumUtilGasEnergy(
                        UTIL_GAS_ENTRIES,
                        fromKey,
                        toKey,
                        UtilEnergyState.gasTeam,
                        { lng: UtilEnergyState.gasLNG, lpg: UtilEnergyState.gasLPG }
                    );
                    gasAmount = gas.mj;
                    gasCost = gas.cost;
                    gasHasData = gas.hasData;
                    gasUnitMode = 'mj';
                    gasFactor = 1;
                } else if (raw.hasLpg) {
                    setWarning('');
                    gasAmount = raw.lpgUsage;
                    gasHasData = true;
                    gasUnitMode = 'lpg';
                    gasFactor = UtilEnergyState.gasLPG;
                } else if (raw.hasLng) {
                    setWarning('');
                    gasAmount = raw.lngUsage;
                    gasHasData = true;
                    gasUnitMode = 'lng';
                    gasFactor = UtilEnergyState.gasLNG;
                } else {
                    setWarning('');
                }
            } else {
                setWarning('');
                const gas = sumUtilGasEnergy(
                    UTIL_GAS_ENTRIES,
                    fromKey,
                    toKey,
                    UtilEnergyState.gasTeam,
                    { lng: UtilEnergyState.gasLNG, lpg: UtilEnergyState.gasLPG }
                );
                gasAmount = gas.mj;
                gasCost = gas.cost;
                gasHasData = gas.hasData;
                gasUnitMode = 'mj';
                gasFactor = 1;
            }
            const electricInput = panel.querySelector('[data-role="electric-kwh"]');
            const gasInput = panel.querySelector('[data-role="gas-amount"]');
            const electricCostInput = panel.querySelector('[data-role="electric-cost"]');
            const gasCostInput = panel.querySelector('[data-role="gas-cost"]');
            const gasUnitSelect = panel.querySelector('[data-role="gas-unit"]');
            const gasFactorInput = panel.querySelector('[data-role="gas-factor"]');

            panel.dataset.energySyncing = 'true';
            if (electricInput) setUtilInputDisplayValue(electricInput, electric.hasData ? Math.round(electric.usage) : '', resolveUtilInputDecimals(electricInput, 0));
            if (electricCostInput) setUtilInputDisplayValue(electricCostInput, electric.hasData ? Math.round(electric.cost) : '', resolveUtilInputDecimals(electricCostInput, 0));
            if (gasUnitSelect) gasUnitSelect.value = gasUnitMode;
            if (gasInput) setUtilInputDisplayValue(gasInput, gasHasData ? Math.round(gasAmount) : '', resolveUtilInputDecimals(gasInput, 0));
            if (gasCostInput) setUtilInputDisplayValue(gasCostInput, gasHasData ? Math.round(gasCost) : '', resolveUtilInputDecimals(gasCostInput, 0));
            if (gasFactorInput) setUtilInputDisplayValue(gasFactorInput, gasFactor, resolveUtilInputDecimals(gasFactorInput, 3));
            manualFields.forEach(field => { if (field) field.disabled = true; });
            panel.dataset.energySyncing = 'false';
            syncUtilEnergyFields(panel);
        }

        function syncUtilEnergyFields(panel) {
            if (!panel) return;
            const basisSelect = panel.querySelector('[data-role="electric-basis"]');
            const factorInput = panel.querySelector('[data-role="electric-factor"]');
            if (basisSelect && factorInput) {
                if (basisSelect.value === 'custom') {
                    factorInput.disabled = false;
                    if (!factorInput.value) {
                        setUtilInputDisplayValue(factorInput, UTIL_ENERGY_DEFAULTS.electricFinal, resolveUtilInputDecimals(factorInput, 2));
                    }
                } else {
                    setUtilInputDisplayValue(factorInput, basisSelect.value, resolveUtilInputDecimals(factorInput, 2));
                    factorInput.disabled = true;
                }
            }

            const gasUnitSelect = panel.querySelector('[data-role="gas-unit"]');
            const gasFactorInput = panel.querySelector('[data-role="gas-factor"]');
            const gasAmountLabel = panel.querySelector('[data-role="gas-amount-label"]');
            const gasFactorLabel = panel.querySelector('[data-role="gas-factor-label"]');
            const unit = gasUnitSelect?.value || 'lng';
            const prevUnit = panel.dataset.gasUnit;
            if (gasAmountLabel) {
                gasAmountLabel.textContent = unit === 'lpg'
                    ? '가스 사용량 (LPG kg)'
                    : (unit === 'mj' ? '가스 사용량 (MJ)' : '가스 사용량 (LNG m³)');
            }
            if (gasFactorLabel) {
                gasFactorLabel.textContent = unit === 'lpg'
                    ? '가스 열량계수 (MJ/kg)'
                    : (unit === 'mj' ? '가스 열량계수 (MJ/MJ)' : '가스 열량계수 (MJ/m³)');
            }
            if (gasFactorInput) {
                if (unit === 'mj') {
                    setUtilInputDisplayValue(gasFactorInput, 1, resolveUtilInputDecimals(gasFactorInput, 3));
                    gasFactorInput.disabled = true;
                } else {
                    gasFactorInput.disabled = false;
                    if (unit !== prevUnit || !gasFactorInput.value) {
                        const defaultFactor = unit === 'lpg' ? UTIL_ENERGY_DEFAULTS.gasLPG : UTIL_ENERGY_DEFAULTS.gasLNG;
                        setUtilInputDisplayValue(gasFactorInput, defaultFactor, resolveUtilInputDecimals(gasFactorInput, 3));
                    }
                }
            }
            panel.dataset.gasUnit = unit;
        }

        function updateUtilEnergyPanel(panel) {
            if (!panel) return;
            const kwhInput = panel.querySelector('[data-role="electric-kwh"]');
            const gasInput = panel.querySelector('[data-role="gas-amount"]');
            const electricCostInput = panel.querySelector('[data-role="electric-cost"]');
            const gasCostInput = panel.querySelector('[data-role="gas-cost"]');
            const toeFactorInput = panel.querySelector('[data-role="toe-factor"]');
            const gasUnit = panel.querySelector('[data-role="gas-unit"]')?.value || 'lng';

            const hasInput = [kwhInput, gasInput, electricCostInput, gasCostInput]
                .some(el => el && String(el.value ?? '').trim() !== '');

            const electricKwh = parseUtilInputNumber(kwhInput);
            const electricFactorInput = panel.querySelector('[data-role="electric-factor"]');
            const electricFactor = parseUtilInputNumber(electricFactorInput) || 0;
            const gasAmount = parseUtilInputNumber(gasInput);
            const gasFactor = parseUtilInputNumber(panel.querySelector('[data-role="gas-factor"]')) || 0;
            const electricCost = parseUtilInputNumber(electricCostInput);
            const gasCost = parseUtilInputNumber(gasCostInput);
            const toeFactor = parseUtilInputNumber(toeFactorInput) || UTIL_ENERGY_DEFAULTS.toeMJ;
            const displayDecimals = normalizeUtilEnergyDecimals(
                panel.querySelector('[data-role="energy-display-decimals"]')?.value,
                UtilEnergyState.displayDecimals
            );

            UtilEnergyState.electricFactor = electricFactor || UtilEnergyState.electricFactor;
            UtilEnergyState.toeFactor = toeFactor || UtilEnergyState.toeFactor;
            UtilEnergyState.displayDecimals = displayDecimals;

            const electricMJ = electricKwh * electricFactor;
            const gasMJ = gasUnit === 'mj' ? gasAmount : gasAmount * gasFactor;
            const totalMJ = electricMJ + gasMJ;
            const totalGJ = totalMJ / 1000;
            const electricToe = toeFactor ? electricMJ / toeFactor : 0;
            const gasToe = toeFactor ? gasMJ / toeFactor : 0;
            const totalToe = toeFactor ? totalMJ / toeFactor : 0;
            const costElectric = electricMJ ? electricCost / electricMJ : 0;
            const costGas = gasMJ ? gasCost / gasMJ : 0;
            const totalCost = electricCost + gasCost;
            const costTotal = totalMJ ? totalCost / totalMJ : 0;

            const setValue = (role, value, decimals = 2, enabled = true) => {
                const el = panel.querySelector(`[data-role="${role}"]`);
                if (!el) return;
                if (!hasInput || !enabled) {
                    el.textContent = '-';
                    return;
                }
                el.textContent = formatUtilNumber(value, decimals);
            };

            setValue('energy-electric-mj', electricMJ, displayDecimals);
            setValue('energy-gas-mj', gasMJ, displayDecimals);
            setValue('energy-total-mj', totalMJ, displayDecimals);
            setValue('energy-total-gj', totalGJ, displayDecimals);
            setValue('toe-electric', electricToe, displayDecimals);
            setValue('toe-gas', gasToe, displayDecimals);
            setValue('toe-total', totalToe, displayDecimals);
            setValue('cost-electric', costElectric, displayDecimals, electricCost > 0);
            setValue('cost-gas', costGas, displayDecimals, gasCost > 0);
            setValue('cost-total', costTotal, displayDecimals, totalCost > 0);

            const toeDisplay = panel.querySelector('[data-role="toe-factor-display"]');
            if (toeDisplay) {
                toeDisplay.textContent = formatUtilNumber(toeFactor, 0);
            }
        }

        function initUtilEnergyConverter(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-energy]').forEach(panel => {
                bindUtilEnergyFormattedInputs(panel);
                const monthOptions = ensureUtilEnergyRangeState();
                const electricTeams = buildUtilTeamOptions(UTIL_ELECTRIC_ENTRIES);
                const gasTeams = buildUtilTeamOptions(UTIL_GAS_ENTRIES);
                const elecSelect = panel.querySelector('[data-role="energy-link-electric-team"]');
                const gasSelect = panel.querySelector('[data-role="energy-link-gas-team"]');
                const gasModeSelect = panel.querySelector('[data-role="energy-link-gas-mode"]');
                const fromSelect = panel.querySelector('[data-role="energy-link-from"]');
                const toSelect = panel.querySelector('[data-role="energy-link-to"]');
                const lngInput = panel.querySelector('[data-role="energy-link-lng-factor"]');
                const lpgInput = panel.querySelector('[data-role="energy-link-lpg-factor"]');
                const linkToggle = panel.querySelector('[data-role="energy-link-toggle"]');
                const warningEl = panel.querySelector('[data-role="energy-link-warning"]');
                const basisSelect = panel.querySelector('[data-role="electric-basis"]');
                const factorInput = panel.querySelector('[data-role="electric-factor"]');
                const toeInput = panel.querySelector('[data-role="toe-factor"]');
                const displayDecimalsSelect = panel.querySelector('[data-role="energy-display-decimals"]');
                if (elecSelect) {
                    const options = ['<option value="all">전체</option>']
                        .concat(electricTeams.map(team => `<option value="${team}">${team}</option>`))
                        .join('');
                    setUtilSelectOptions(elecSelect, options, UtilEnergyState.electricTeam);
                }
                if (gasSelect) {
                    const options = ['<option value="all">전체</option>']
                        .concat(gasTeams.map(team => `<option value="${team}">${team}</option>`))
                        .join('');
                    setUtilSelectOptions(gasSelect, options, UtilEnergyState.gasTeam);
                }
                if (gasModeSelect) gasModeSelect.value = UtilEnergyState.linkGasMode || 'mj';
                if (monthOptions && monthOptions.length) {
                    const monthHtml = monthOptions.map(month => `<option value="${month.value}">${month.label}</option>`).join('');
                    setUtilSelectOptions(fromSelect, monthHtml, UtilEnergyState.from);
                    setUtilSelectOptions(toSelect, monthHtml, UtilEnergyState.to);
                }
                if (lngInput) setUtilInputDisplayValue(lngInput, UtilEnergyState.gasLNG, resolveUtilInputDecimals(lngInput, 3));
                if (lpgInput) setUtilInputDisplayValue(lpgInput, UtilEnergyState.gasLPG, resolveUtilInputDecimals(lpgInput, 3));
                if (linkToggle) linkToggle.checked = UtilEnergyState.linkEnabled;
                if (warningEl) {
                    warningEl.textContent = '';
                    warningEl.style.display = 'none';
                }
                if (basisSelect) {
                    const diffFinal = Math.abs(UtilEnergyState.electricFactor - UTIL_ENERGY_DEFAULTS.electricFinal);
                    const diffPrimary = Math.abs(UtilEnergyState.electricFactor - UTIL_ENERGY_DEFAULTS.electricPrimary);
                    if (diffFinal < 0.01) {
                        basisSelect.value = String(UTIL_ENERGY_DEFAULTS.electricFinal);
                    } else if (diffPrimary < 0.01) {
                        basisSelect.value = String(UTIL_ENERGY_DEFAULTS.electricPrimary);
                    } else {
                        basisSelect.value = 'custom';
                        if (factorInput) {
                            setUtilInputDisplayValue(factorInput, UtilEnergyState.electricFactor, resolveUtilInputDecimals(factorInput, 2));
                        }
                    }
                }
                if (toeInput) setUtilInputDisplayValue(toeInput, UtilEnergyState.toeFactor, resolveUtilInputDecimals(toeInput, 0));
                if (displayDecimalsSelect) displayDecimalsSelect.value = String(normalizeUtilEnergyDecimals(UtilEnergyState.displayDecimals, 2));

                const refresh = () => {
                    if (panel.dataset.energySyncing === 'true') return;
                    updateUtilEnergyStateFromPanel(panel);
                    syncUtilEnergyFields(panel);
                    applyUtilEnergyLink(panel);
                    updateUtilEnergyPanel(panel);
                    syncUtilEnergyLinkedControls(root);
                    syncUtilEnergyModalHeader(panel.closest('#util-energy-modal'));
                    root.querySelectorAll('[data-util-energy-chart]').forEach(chartPanel => {
                        renderUtilEnergyChart(chartPanel);
                    });
                };

                refresh();

                panel.querySelectorAll('input, select').forEach(el => {
                    const handler = () => refresh();
                    el.addEventListener('input', handler);
                    el.addEventListener('change', handler);
                });
            });
        }

        function buildUtilEnergyMonthlySeries(options) {
            const points = [];
            const entriesElectric = UTIL_ELECTRIC_ENTRIES || [];
            const entriesGas = UTIL_GAS_ENTRIES || [];
            const { fromKey, toKey, electricTeam, gasTeam, electricFactor, gasLNG, gasLPG } = options;
            const dataMap = new Map();

            for (let key = fromKey; key <= toKey; key += 1) {
                dataMap.set(key, { electricMJ: 0, gasMJ: 0, hasElectric: false, hasGas: false });
            }

            entriesElectric.forEach(entry => {
                if (electricTeam && electricTeam !== 'all' && entry.team !== electricTeam) return;
                const key = getUtilEntryKey(entry);
                if (!key || key < fromKey || key > toKey) return;
                const usageVal = Number(entry.usage);
                if (!Number.isFinite(usageVal)) return;
                const row = dataMap.get(key);
                if (!row) return;
                row.electricMJ += usageVal * electricFactor;
                row.hasElectric = true;
            });

            entriesGas.forEach(entry => {
                if (gasTeam && gasTeam !== 'all' && entry.team !== gasTeam) return;
                const key = getUtilEntryKey(entry);
                if (!key || key < fromKey || key > toKey) return;
                const usageVal = Number(entry.usage);
                if (!Number.isFinite(usageVal)) return;
                const row = dataMap.get(key);
                if (!row) return;
                const factor = getGasFactorByTeam(entry.team, { lng: gasLNG, lpg: gasLPG });
                row.gasMJ += usageVal * factor;
                row.hasGas = true;
            });

            let total = 0;
            let count = 0;
            for (let key = fromKey; key <= toKey; key += 1) {
                const year = Math.floor((key - 1) / 12);
                const month = key - year * 12;
                const label = `${year}-${String(month).padStart(2, '0')}`;
                const row = dataMap.get(key);
                const hasData = row && (row.hasElectric || row.hasGas);
                const electricMJ = row?.electricMJ || 0;
                const gasMJ = row?.gasMJ || 0;
                const totalMJ = electricMJ + gasMJ;
                points.push({
                    key,
                    label,
                    electricMJ,
                    gasMJ,
                    totalMJ,
                    hasData
                });
                if (hasData) {
                    total += totalMJ;
                    count += 1;
                }
            }
            return { points, totalMJ: total, count };
        }
