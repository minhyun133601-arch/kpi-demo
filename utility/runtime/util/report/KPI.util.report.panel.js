        function initUtilReportPanel(scope) {
            const root = scope || document;
            const panel = root.querySelector('[data-role="util-report-panel"]');
            if (!panel) return;

            ensureUtilReportStateRange();
            UtilReportState.scopeKey = normalizeUtilReportScope(UtilReportState.scopeKey || getUtilReportScopeFromMetric(UtilReportState.metricKey));
            UtilReportState.categoryKey = normalizeUtilReportCategory(UtilReportState.categoryKey);
            if (UtilReportState.scopeKey === 'total') {
                UtilReportState.selectedScopeKeys = normalizeUtilReportSelectedScopeKeys(UtilReportState.selectedScopeKeys);
                if (UtilReportState.selectedScopeKeys.length === 1) {
                    UtilReportState.scopeKey = UtilReportState.selectedScopeKeys[0];
                }
            } else {
                UtilReportState.selectedScopeKeys = [UtilReportState.scopeKey];
            }
            if (UtilReportState.builderCustomMode) {
                const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey || UtilReportState.scopeKey);
                const valueKeys = normalizeUtilReportBuilderValueKeys(itemKey, UtilReportState.builderValueKeys);
                UtilReportState.metricKey = valueKeys.length
                    ? valueKeys[0]
                    : resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            } else {
                UtilReportState.metricKey = resolveUtilReportMetricKey(UtilReportState.scopeKey, UtilReportState.categoryKey);
            }
            UtilReportState.activeMetricCard = UtilReportState.metricKey;
            syncUtilReportGraphMetricDefaults();

            const openModalButton = panel.querySelector('[data-role="util-report-open-modal"]');
            if (openModalButton && openModalButton.dataset.bound !== 'true') {
                openModalButton.dataset.bound = 'true';
                openModalButton.addEventListener('click', () => {
                    closeUtilActionMenus(document);
                    const result = runUtilReportFromState({ renderModal: false });
                    openUtilReportModal(result);
                });
            }

            runUtilReportFromState({ renderModal: false });
        }
        function runUnifiedUtilAnalytics(block) {
            const datasetKey = block.querySelector('[data-role="dataset"]')?.value;
            const dataset = UTIL_ANALYTICS_UNIFIED[datasetKey];
            if (!dataset) return;
            const entries = dataset.entries || [];
            const fromVal = block.querySelector('[data-role="from"]')?.value;
            const toVal = block.querySelector('[data-role="to"]')?.value;
            const teamPrimaryVal = block.querySelector('[data-role="team-primary"]')?.value;
            const teamSecondaryVal = block.querySelector('[data-role="team-secondary"]')?.value;
            const metricNumeratorVal = block.querySelector('[data-role="metric-numerator"]')?.value;
            const metricDenominatorVal = block.querySelector('[data-role="metric-denominator"]')?.value;
            const denominatorActive = !!block.querySelector('[data-role="denominator-toggle"]')?.checked;
            const scaleVal = parseFloat(block.querySelector('[data-role="scale"]')?.value || '1');
            const decimalsVal = parseInt(block.querySelector('[data-role="decimals"]')?.value || '0', 10);
            const costDetailVal = block.querySelector('[data-role="cost-detail"]')?.value;
            const chartTypeVal = block.querySelector('[data-role="chart-type"]')?.value || 'line';
            const gasConvertNumerator = datasetKey === 'gas' && block.querySelector('[data-role="gas-convert-numerator"]')?.checked;
            const gasConvertDenominator = datasetKey === 'gas' && block.querySelector('[data-role="gas-convert-denominator"]')?.checked;
            const resultEl = block.querySelector('[data-role="result"]');

            if (!fromVal || !toVal || !metricNumeratorVal) {
                block._utilResult = null;
                return null;
            }

            const from = parseUtilMonthValue(fromVal);
            const to = parseUtilMonthValue(toVal);
            if (!from || !to) return;
            const fromKey = from.year * 12 + from.month;
            const toKey = to.year * 12 + to.month;
            const minKey = Math.min(fromKey, toKey);
            const maxKey = Math.max(fromKey, toKey);

                const filtered = entries.filter(entry => {
                    const entryKey = entry.year * 12 + entry.month;
                    if (entryKey < minKey || entryKey > maxKey) return false;
                    const teamA = String(teamPrimaryVal || '').trim();
                    const teamB = String(teamSecondaryVal || '').trim();
                    if (teamA && teamA !== 'all') {
                        if (teamA === 'group:plantA') {
                            if (String(entry.team || '').includes('Line Alpha')) return false;
                            return true;
                        }
                        if (entry.team !== teamA && (!teamB || entry.team !== teamB)) return false;
                    } else if (teamB) {
                        if (entry.team !== teamB) return false;
                    }
                    return true;
                });

            const resolveValue = (entry, metricKey) => {
                if (datasetKey === 'waste' && metricKey === 'cost') {
                    if (costDetailVal && costDetailVal !== 'total') {
                        return entry.costs ? entry.costs[costDetailVal] : entry.cost;
                    }
                    return entry.cost;
                }
                return entry[metricKey];
            };

            const resolveConvertedValue = (entry, metricKey, applyGas) => {
                const raw = resolveValue(entry, metricKey);
                if (!Number.isFinite(raw)) return raw;
                if (!applyGas) return raw;
                return raw * getGasEntryConversionFactor(entry.team);
            };

            const numeratorValues = filtered
                .map(entry => resolveConvertedValue(entry, metricNumeratorVal, gasConvertNumerator))
                .filter(val => Number.isFinite(val));
            const denominatorValues = denominatorActive
                ? filtered
                    .map(entry => resolveConvertedValue(entry, metricDenominatorVal, gasConvertDenominator))
                    .filter(val => Number.isFinite(val))
                : [];
            const ratioEntries = denominatorActive
                ? filtered.map(entry => ({
                    year: entry.year,
                    month: entry.month,
                    numerator: resolveConvertedValue(entry, metricNumeratorVal, gasConvertNumerator),
                    denominator: resolveConvertedValue(entry, metricDenominatorVal, gasConvertDenominator)
                }))
                : [];
            const values = denominatorActive
                ? ratioEntries
                    .map(item => (Number.isFinite(item.numerator) && Number.isFinite(item.denominator) && item.denominator !== 0)
                        ? (item.numerator / item.denominator)
                        : null)
                    .filter(val => Number.isFinite(val))
                : numeratorValues;

            if (!values.length) {
                resultEl.innerHTML = `<span class="text-slate-500">해당 기간에 데이터가 없습니다.</span>`;
                block._utilResult = null;
                return null;
            }

            const sum = values.reduce((acc, val) => acc + val, 0);
            const avg = sum / values.length;
            const getMetricLabel = (metricKey) => {
                if (datasetKey === 'waste' && metricKey === 'cost') {
                    const hasPrimary = teamPrimaryVal && teamPrimaryVal !== 'all' && teamPrimaryVal !== 'group:plantA';
                    const hasSecondary = !!teamSecondaryVal;
                    const costTeam = (hasPrimary && !hasSecondary) ? teamPrimaryVal : (hasSecondary && !hasPrimary ? teamSecondaryVal : 'all');
                    const costOptions = buildUtilCostOptions(datasetKey, costTeam);
                    const option = costOptions.find(item => item.key === costDetailVal) || costOptions.find(item => item.key === 'total');
                    return option ? option.label : '비용';
                }
                return (dataset.metrics || []).find(metric => metric.key === metricKey)?.label || metricKey;
            };
            const numeratorLabel = getMetricLabel(metricNumeratorVal);
            const denominatorLabel = denominatorActive ? getMetricLabel(metricDenominatorVal) : '';
            const metricLabel = denominatorActive ? `${numeratorLabel} / ${denominatorLabel}` : numeratorLabel;
            const teamLabel = (() => {
                const teamA = String(teamPrimaryVal || '').trim();
                const teamB = String(teamSecondaryVal || '').trim();
                if (teamA === 'group:plantA') return 'Plant A';
                if (!teamA || teamA === 'all') {
                    return teamB ? teamB : '전체';
                }
                if (teamB && teamB !== teamA) return `${teamA} + ${teamB}`;
                return teamA;
            })();
            const sorted = [...filtered].sort((a, b) => {
                const keyA = a.year * 12 + a.month;
                const keyB = b.year * 12 + b.month;
                if (keyA !== keyB) return keyA - keyB;
                return String(a.team || '').localeCompare(String(b.team || ''), 'ko');
            }).map(entry => ({
                ...entry,
                value: resolveConvertedValue(entry, metricNumeratorVal, gasConvertNumerator)
            }));

            let scaledSum = scaleVal ? sum / scaleVal : sum;
            let scaledAvg = scaleVal ? avg / scaleVal : avg;
            const numeratorSum = numeratorValues.reduce((acc, val) => acc + val, 0);
            const numeratorAvg = numeratorValues.length ? numeratorSum / numeratorValues.length : 0;
            const denominatorSum = denominatorValues.reduce((acc, val) => acc + val, 0);
            const denominatorAvg = denominatorValues.length ? denominatorSum / denominatorValues.length : 0;
            const scaledNumeratorSum = scaleVal ? numeratorSum / scaleVal : numeratorSum;
            const scaledNumeratorAvg = scaleVal ? numeratorAvg / scaleVal : numeratorAvg;
            const scaledDenominatorSum = scaleVal ? denominatorSum / scaleVal : denominatorSum;
            const scaledDenominatorAvg = scaleVal ? denominatorAvg / scaleVal : denominatorAvg;

            let trendPoints;
            if (denominatorActive) {
                const ratioSum = ratioEntries.reduce((acc, item) => acc + (Number.isFinite(item.numerator) ? item.numerator : 0), 0);
                const ratioDen = ratioEntries.reduce((acc, item) => acc + (Number.isFinite(item.denominator) ? item.denominator : 0), 0);
                if (Number.isFinite(ratioSum) && Number.isFinite(ratioDen) && ratioDen !== 0) {
                    scaledSum = (ratioSum / ratioDen) / (Number.isFinite(scaleVal) && scaleVal ? scaleVal : 1);
                }
                const ratioPoints = buildUtilRatioSeries(ratioEntries, minKey, maxKey, scaleVal);
                const ratioValues = ratioPoints.map(point => point.value).filter(val => Number.isFinite(val));
                scaledAvg = ratioValues.length
                    ? ratioValues.reduce((acc, val) => acc + val, 0) / ratioValues.length
                    : scaledAvg;
                trendPoints = ratioPoints;
            } else {
                trendPoints = buildUtilTrendSeries(sorted, minKey, maxKey, scaleVal);
            }
            const countVal = trendPoints.filter(point => Number.isFinite(point.value)).length || values.length;
            const summaryValues = denominatorActive
                ? `
                    <span class="util-analytics-values">
                        <span class="util-analytics-value">분자 합계: ${formatUtilNumber(scaledNumeratorSum, decimalsVal)}</span>
                        <span class="util-analytics-value">분자 평균: ${formatUtilNumber(scaledNumeratorAvg, decimalsVal)}</span>
                        <span class="util-analytics-value">분모 합계: ${formatUtilNumber(scaledDenominatorSum, decimalsVal)}</span>
                        <span class="util-analytics-value">분모 평균: ${formatUtilNumber(scaledDenominatorAvg, decimalsVal)}</span>
                    </span>
                `
                : `
                    <span class="util-analytics-values">
                        <span class="util-analytics-value">합계: ${formatUtilNumber(scaledSum, decimalsVal)}</span>
                        <span class="util-analytics-value">평균: ${formatUtilNumber(scaledAvg, decimalsVal)}</span>
                    </span>
                `;
            block._utilChartData = {
                points: trendPoints,
                metricLabel,
                datasetLabel: dataset.label,
                teamLabel,
                from: fromVal,
                to: toVal,
                decimals: decimalsVal,
                datasetKey,
                entries: filtered,
                numeratorMetricKey: metricNumeratorVal,
                denominatorMetricKey: metricDenominatorVal,
                denominatorActive,
                costDetailVal,
                minKey,
                maxKey,
                scaleVal,
                numeratorLabel,
                denominatorLabel,
                chartType: chartTypeVal
            };

            const hasChart = trendPoints.some(point => Number.isFinite(point.value));
            resultEl.innerHTML = `
                <div class="util-analytics-summary">
                    <span class="util-analytics-tag"><i class="fa-solid fa-layer-group"></i>${dataset.label}</span>
                    <span class="util-analytics-tag"><i class="fa-solid fa-calendar-days"></i>${fromVal} ~ ${toVal}</span>
                    <span class="util-analytics-tag"><i class="fa-solid fa-people-group"></i>${teamLabel}</span>
                    <span class="util-analytics-tag"><i class="fa-solid fa-filter"></i>${metricLabel}</span>
                    <span class="util-analytics-tag"><i class="fa-solid fa-list"></i>${countVal}건</span>
                    ${summaryValues}
                    <button type="button" class="util-analytics-toggle" onclick="toggleUtilChartView(this)" ${hasChart ? '' : 'disabled'}>그래프 보기</button>
                </div>
            `;
            updateUtilGraphToggleVisibility(block.closest('[data-role="util-analytics-list"]'));

            const result = {
                datasetKey,
                datasetLabel: dataset.label,
                metricKey: 'value',
                metricLabel,
                from: fromVal,
                to: toVal,
                team: teamLabel,
                scale: scaleVal,
                decimals: decimalsVal,
                count: countVal,
                sum,
                avg,
                entries: sorted
            };
            block._utilResult = result;
            return result;
        }

        function initUnifiedUtilAnalytics(scope) {
            const root = scope || document;
            const blocks = [];
            if (root.matches && root.matches('[data-util-analytics-unified]')) {
                blocks.push(root);
            }
            root.querySelectorAll('[data-util-analytics-unified]').forEach(block => blocks.push(block));
            blocks.forEach(block => {
                const datasetOptions = buildUtilDatasetOptions();
                const initialDataset = datasetOptions[0]?.key || 'electric';
                const months = buildUnifiedMonthOptions(initialDataset);
                const teams = buildUnifiedTeamOptions(initialDataset);
                const metrics = buildUtilMetricOptions(initialDataset);
                const hasData = months.length && teams.length && metrics.length;

                const isClosable = block.dataset.closable === 'true';
                block.innerHTML = `
                    <div class="util-analytics-header">
                        <div class="util-analytics-header-title">
                            <i class="fa-solid fa-chart-column"></i>
                            유틸리티 통합 분석
                        </div>
                        ${isClosable ? '<button type="button" class="util-analytics-remove" data-role="remove-block">- 삭제</button>' : ''}
                    </div>
                    <div class="util-analytics-desc">전기/가스/폐수 데이터를 한 번에 검색하여 합계와 평균을 확인합니다.</div>
                    <div class="util-analytics-form">
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">구분</span>
                            <select class="util-analytics-select" data-role="dataset" ${hasData ? '' : 'disabled'}>
                                ${datasetOptions.map(option => `<option value="${option.key}">${option.label}</option>`).join('')}
                            </select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">기간</span>
                            <div class="util-analytics-range">
                                <select class="util-analytics-select" data-role="from" ${hasData ? '' : 'disabled'}></select>
                                <span class="util-analytics-divider">~</span>
                                <select class="util-analytics-select" data-role="to" ${hasData ? '' : 'disabled'}></select>
                            </div>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">팀 1</span>
                            <select class="util-analytics-select" data-role="team-primary" ${hasData ? '' : 'disabled'}></select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">팀 2</span>
                            <select class="util-analytics-select" data-role="team-secondary" ${hasData ? '' : 'disabled'}></select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">분자</span>
                            <select class="util-analytics-select" data-role="metric-numerator" ${hasData ? '' : 'disabled'}></select>
                            <label class="util-analytics-gas-toggle" data-role="gas-convert-numerator-wrap" style="display:none;">
                                <input type="checkbox" data-role="gas-convert-numerator" />
                                가스 환산
                            </label>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">분모 사용</span>
                            <label class="util-analytics-inline-symbol">
                                <input type="checkbox" data-role="denominator-toggle" />
                                분모 켜기
                            </label>
                        </div>
                        <div class="util-analytics-field" data-role="denominator-field" style="display:none;">
                            <span class="util-analytics-label">분모</span>
                            <select class="util-analytics-select" data-role="metric-denominator" ${hasData ? '' : 'disabled'}></select>
                            <label class="util-analytics-gas-toggle" data-role="gas-convert-denominator-wrap" style="display:none;">
                                <input type="checkbox" data-role="gas-convert-denominator" />
                                가스 환산
                            </label>
                        </div>
                        <div class="util-analytics-field util-analytics-cost" style="display:none;">
                            <span class="util-analytics-label">비용 항목</span>
                            <select class="util-analytics-select" data-role="cost-detail"></select>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">단위</span>
                            <div class="util-analytics-inline">
                                <span class="util-analytics-inline-symbol">÷</span>
                                <select class="util-analytics-select util-analytics-select-compact" data-role="scale" ${hasData ? '' : 'disabled'}>
                                    <option value="1">1</option>
                                    <option value="10">10</option>
                                    <option value="100">100</option>
                                    <option value="1000">1,000</option>
                                    <option value="10000">10,000</option>
                                </select>
                                <span class="util-analytics-inline-symbol">소수</span>
                                <select class="util-analytics-select util-analytics-select-compact" data-role="decimals" ${hasData ? '' : 'disabled'}>
                                    <option value="0">0</option>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3">3</option>
                                    <option value="4">4</option>
                                </select>
                            </div>
                        </div>
                        <div class="util-analytics-field">
                            <span class="util-analytics-label">작업</span>
                            <div class="util-analytics-actions">
                                <button type="button" class="work-btn primary" data-role="run" ${hasData ? '' : 'disabled'}>
                                    <i class="fa-solid fa-magnifying-glass"></i> 검색
                                </button>
                                <button type="button" class="work-btn" data-role="print" ${hasData ? '' : 'disabled'}>
                                    <i class="fa-solid fa-print"></i> 인쇄
                                </button>
                                <div class="util-analytics-inline">
                                    <span class="util-analytics-inline-symbol">그래프</span>
                                    <select class="util-analytics-select util-analytics-select-compact" data-role="chart-type" ${hasData ? '' : 'disabled'}>
                                        <option value="line">꺾은선</option>
                                        <option value="bar">막대</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="util-analytics-result" data-role="result">
                        ${hasData ? '<span class="text-slate-500">조건을 선택하고 검색을 눌러주세요.</span>' : '데이터가 아직 없습니다.'}
                    </div>
                `;

                if (!hasData) return;
                const datasetSelect = block.querySelector('[data-role="dataset"]');
                const fromSelect = block.querySelector('[data-role="from"]');
                const toSelect = block.querySelector('[data-role="to"]');
                const teamPrimarySelect = block.querySelector('[data-role="team-primary"]');
                const teamSecondarySelect = block.querySelector('[data-role="team-secondary"]');
                const metricNumeratorSelect = block.querySelector('[data-role="metric-numerator"]');
                const metricDenominatorSelect = block.querySelector('[data-role="metric-denominator"]');
                const denominatorToggle = block.querySelector('[data-role="denominator-toggle"]');
                const denominatorField = block.querySelector('[data-role="denominator-field"]');
                const gasNumeratorToggle = block.querySelector('[data-role="gas-convert-numerator"]');
                const gasDenominatorToggle = block.querySelector('[data-role="gas-convert-denominator"]');
                const gasNumeratorWrap = block.querySelector('[data-role="gas-convert-numerator-wrap"]');
                const gasDenominatorWrap = block.querySelector('[data-role="gas-convert-denominator-wrap"]');
                const costDetailSelect = block.querySelector('[data-role="cost-detail"]');
                const costField = block.querySelector('.util-analytics-cost');
                const runButton = block.querySelector('[data-role="run"]');
                const printButton = block.querySelector('[data-role="print"]');
                const chartTypeSelect = block.querySelector('[data-role="chart-type"]');
                const removeButton = block.querySelector('[data-role="remove-block"]');

                const refreshMonths = (datasetKey) => {
                    const monthList = buildUnifiedMonthOptions(datasetKey);
                    const monthOptions = monthList.map(month => `<option value="${month.value}">${month.label}</option>`).join('');
                    fromSelect.innerHTML = monthOptions;
                    toSelect.innerHTML = monthOptions;
                    if (monthList.length) {
                        fromSelect.value = monthList[0].value;
                        toSelect.value = monthList[monthList.length - 1].value;
                    }
                };

                const refreshTeams = (datasetKey, preserve = {}) => {
                    const teamList = buildUnifiedTeamOptions(datasetKey);
                    const keepPrimary = preserve.primary;
                    const keepSecondary = preserve.secondary;
                    const allowPlantAGroup = teamList.some(team => String(team || '').includes('Line Alpha'));
                    const plantAOption = allowPlantAGroup ? `<option value="group:plantA">Plant A</option>` : '';
                    const primaryOptions = `<option value="all">전체</option>${plantAOption}` + teamList.map(team => `<option value="${team}">${team}</option>`).join('');
                    teamPrimarySelect.innerHTML = primaryOptions;
                    if (keepPrimary && ((keepPrimary === 'group:plantA' && allowPlantAGroup) || teamList.includes(keepPrimary))) {
                        teamPrimarySelect.value = keepPrimary;
                    } else {
                        teamPrimarySelect.value = 'all';
                    }
                    const primaryVal = teamPrimarySelect.value;
                    const secondaryTeams = teamList.filter(team => team !== primaryVal);
                    const secondaryOptions = `<option value="">추가 선택 없음</option>` + secondaryTeams.map(team => `<option value="${team}">${team}</option>`).join('');
                    teamSecondarySelect.innerHTML = secondaryOptions;
                    if (primaryVal === 'all' || primaryVal === 'group:plantA') {
                        teamSecondarySelect.value = '';
                        teamSecondarySelect.disabled = true;
                    } else {
                        teamSecondarySelect.disabled = false;
                        if (keepSecondary && secondaryTeams.includes(keepSecondary)) {
                            teamSecondarySelect.value = keepSecondary;
                        } else {
                            teamSecondarySelect.value = '';
                        }
                    }
                };

                const refreshMetrics = (datasetKey, preserve = {}) => {
                    const metricList = buildUtilMetricOptions(datasetKey);
                    const numeratorVal = preserve.numerator;
                    const denominatorVal = preserve.denominator;
                    metricNumeratorSelect.innerHTML = metricList.map(metric => `<option value="${metric.key}">${metric.label}</option>`).join('');
                    metricDenominatorSelect.innerHTML = metricList.map(metric => `<option value="${metric.key}">${metric.label}</option>`).join('');
                    if (numeratorVal && metricList.some(metric => metric.key === numeratorVal)) {
                        metricNumeratorSelect.value = numeratorVal;
                    }
                    if (denominatorVal && metricList.some(metric => metric.key === denominatorVal)) {
                        metricDenominatorSelect.value = denominatorVal;
                    }
                };

                const refreshCostDetail = () => {
                    const datasetKey = datasetSelect.value;
                    const metricNumeratorVal = metricNumeratorSelect.value;
                    const metricDenominatorVal = denominatorToggle?.checked ? metricDenominatorSelect.value : '';
                    const teamPrimaryVal = teamPrimarySelect.value;
                    const teamSecondaryVal = teamSecondarySelect.value;
                    const needsCost = datasetKey === 'waste' && (metricNumeratorVal === 'cost' || metricDenominatorVal === 'cost');
                    if (needsCost) {
                        const hasPrimary = teamPrimaryVal && teamPrimaryVal !== 'all' && teamPrimaryVal !== 'group:plantA';
                        const hasSecondary = !!teamSecondaryVal;
                        const costTeam = (hasPrimary && !hasSecondary) ? teamPrimaryVal : (hasSecondary && !hasPrimary ? teamSecondaryVal : 'all');
                        const options = buildUtilCostOptions(datasetKey, costTeam);
                        costDetailSelect.innerHTML = options.map(item => `<option value="${item.key}">${item.label}</option>`).join('');
                        costField.style.display = '';
                    } else {
                        costField.style.display = 'none';
                    }
                };

                const refreshDenominator = () => {
                    if (!denominatorToggle || !metricDenominatorSelect) return;
                    const active = denominatorToggle.checked;
                    if (denominatorField) denominatorField.style.display = active ? '' : 'none';
                    metricDenominatorSelect.disabled = !active;
                    refreshGasToggles();
                };

                const refreshGasToggles = () => {
                    const isGas = datasetSelect.value === 'gas';
                    if (gasNumeratorWrap) gasNumeratorWrap.style.display = isGas ? 'inline-flex' : 'none';
                    if (gasDenominatorWrap) gasDenominatorWrap.style.display = (isGas && denominatorToggle?.checked) ? 'inline-flex' : 'none';
                    if (!isGas) {
                        if (gasNumeratorToggle) gasNumeratorToggle.checked = false;
                        if (gasDenominatorToggle) gasDenominatorToggle.checked = false;
                        block.dataset.gasConvertNumerator = 'off';
                        block.dataset.gasConvertDenominator = 'off';
                        return;
                    }
                    if (gasNumeratorToggle) {
                        block.dataset.gasConvertNumerator = gasNumeratorToggle.checked ? 'on' : 'off';
                    }
                    if (gasDenominatorToggle) {
                        if (!denominatorToggle?.checked) gasDenominatorToggle.checked = false;
                        block.dataset.gasConvertDenominator = gasDenominatorToggle.checked ? 'on' : 'off';
                    }
                };

                const refreshStraightFields = () => {
                    const isGas = datasetSelect.value === 'gas';
                    block.classList.toggle('is-gas', isGas);
                    teamSecondarySelect?.classList.toggle('is-straight', isGas);
                    metricNumeratorSelect?.classList.toggle('is-straight', isGas);
                };

                datasetSelect.value = initialDataset;
                refreshMonths(initialDataset);
                refreshTeams(initialDataset);
                refreshMetrics(initialDataset);
                refreshDenominator();
                refreshGasToggles();
                refreshStraightFields();
                refreshCostDetail();

                datasetSelect.addEventListener('change', () => {
                    const key = datasetSelect.value;
                    const keepPrimary = teamPrimarySelect.value;
                    const keepSecondary = teamSecondarySelect.value;
                    const keepNumerator = metricNumeratorSelect.value;
                    const keepDenominator = metricDenominatorSelect.value;
                    refreshMonths(key);
                    refreshTeams(key, { primary: keepPrimary, secondary: keepSecondary });
                    refreshMetrics(key, { numerator: keepNumerator, denominator: keepDenominator });
                    refreshGasToggles();
                    refreshStraightFields();
                    refreshCostDetail();
                });
                teamPrimarySelect.addEventListener('change', () => {
                    const keepPrimary = teamPrimarySelect.value;
                    const keepSecondary = teamSecondarySelect.value;
                    refreshTeams(datasetSelect.value, { primary: keepPrimary, secondary: keepSecondary });
                    refreshCostDetail();
                });
                teamSecondarySelect.addEventListener('change', refreshCostDetail);
                metricNumeratorSelect.addEventListener('change', refreshCostDetail);
                metricDenominatorSelect.addEventListener('change', refreshCostDetail);
                denominatorToggle?.addEventListener('change', () => {
                    refreshDenominator();
                    refreshCostDetail();
                });
                gasNumeratorToggle?.addEventListener('change', () => {
                    block.dataset.gasConvertNumerator = gasNumeratorToggle.checked ? 'on' : 'off';
                });
                gasDenominatorToggle?.addEventListener('change', () => {
                    block.dataset.gasConvertDenominator = gasDenominatorToggle.checked ? 'on' : 'off';
                });
                chartTypeSelect?.addEventListener('change', () => {
                    block.dataset.chartType = chartTypeSelect.value;
                    if (block._utilChartData) {
                        block._utilChartData.chartType = chartTypeSelect.value;
                    }
                });
                if (chartTypeSelect) {
                    block.dataset.chartType = chartTypeSelect.value;
                }

                runButton.addEventListener('click', () => runUnifiedUtilAnalytics(block));
                printButton?.addEventListener('click', () => {
                    const result = block._utilResult || runUnifiedUtilAnalytics(block);
                    if (result) printUtilAnalytics(result);
                });
                removeButton?.addEventListener('click', () => {
                    const list = block.closest('[data-role="util-analytics-list"]');
                    block.remove();
                    updateUtilGraphToggleVisibility(list);
                    updateUtilAnalyticsAddState(list);
                });
            });
        }
