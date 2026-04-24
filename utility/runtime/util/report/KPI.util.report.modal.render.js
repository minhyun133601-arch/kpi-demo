        function renderUtilReportModal(result) {
            const modal = ensureUtilReportModal();
            syncUtilReportModalControls(modal);
            const subEl = modal.querySelector('[data-role="util-report-modal-sub"]');
            const chartShellEl = modal.querySelector('[data-role="util-report-modal-chart-shell"]');
            const chartEl = modal.querySelector('[data-role="util-report-modal-chart"]');
            const chartMetaEl = modal.querySelector('[data-role="util-report-modal-chart-meta"]');
            const totalDonutEl = modal.querySelector('[data-role="util-report-modal-total-donut"]');
            const siteDonutEl = modal.querySelector('[data-role="util-report-modal-site-donut"]');
            const selectedDonutEl = modal.querySelector('[data-role="util-report-modal-selected-donut"]');
            const productionProductDonutEl = modal.querySelector('[data-role="util-report-modal-production-product-donut"]');
            const wasteDetailDonutEl = modal.querySelector('[data-role="util-report-modal-waste-detail-donut"]');
            const inlineInsightEl = modal.querySelector('[data-role="util-report-inline-insight"]');
            const inlineInsightBodyEl = modal.querySelector('[data-role="util-report-inline-body"]');
            const isBuilderCustomMode = UtilReportState.builderCustomMode === true;
            modal.classList.toggle('is-builder-custom', isBuilderCustomMode);
            modal.classList.toggle('is-chart-fullscreen', UtilReportState.chartFullscreen === true);
            syncUtilReportInlineInsightState(modal);

            if (subEl) {
                subEl.textContent = result && result.rows?.length
                    ? `기간: ${result.rangeLabel} (총 ${formatUtilNumber(result.monthCount)}개월)`
                    : '기간: 데이터 없음';
            }

            if (!result || !Array.isArray(result.rows) || !result.rows.length) {
                if (chartEl) chartEl.innerHTML = '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">표시할 데이터가 없습니다.</div></div>';
                if (chartMetaEl) chartMetaEl.innerHTML = '';
                if (totalDonutEl) totalDonutEl.innerHTML = '<div class="text-sm text-slate-300">구성비 데이터가 없습니다.</div>';
                if (siteDonutEl) {
                    siteDonutEl.classList.remove('is-hidden');
                    const siteEmptyText = normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                        && getUtilReportCompositionCategory(UtilReportState.categoryKey) !== 'production'
                        ? '팀별 구성비 데이터가 없습니다.'
                        : '공장별 구성비 데이터가 없습니다.';
                    siteDonutEl.innerHTML = `<div class="text-sm text-slate-300">${siteEmptyText}</div>`;
                }
                if (selectedDonutEl) selectedDonutEl.innerHTML = '<div class="text-sm text-slate-300">팀별 구성비 데이터가 없습니다.</div>';
                if (productionProductDonutEl) {
                    productionProductDonutEl.classList.add('is-hidden');
                    productionProductDonutEl.innerHTML = '';
                }
                if (inlineInsightBodyEl) {
                    inlineInsightBodyEl.innerHTML = UtilReportDetachedTableState.detached
                        ? renderUtilReportDetachedPlaceholder(result)
                        : '<div class="p-4 text-sm text-slate-300">상세 지표 데이터가 없습니다.</div>';
                }
                if (wasteDetailDonutEl) {
                    wasteDetailDonutEl.classList.add('is-hidden');
                    wasteDetailDonutEl.innerHTML = '';
                }
                syncUtilReportDetachedTableWindow(result);
                syncUtilReportChartScrollState(modal);
                return;
            }

            const yearOptions = getUtilReportAllYearOptions(result);
            UtilReportState.chartYear = normalizeUtilReportYear(UtilReportState.chartYear, yearOptions);
            UtilReportState.graphYear = normalizeUtilReportYear(UtilReportState.graphYear || UtilReportState.chartYear, yearOptions);

            const compareOptions = getUtilReportCompareYearOptions(result);
            UtilReportState.compareYear = normalizeUtilReportCompareYear(UtilReportState.compareYear, compareOptions);
            UtilReportState.chartYear = '';

            const chartMetricKey = resolveUtilReportChartMetricKey();
            const chartMetric = getUtilReportMetricOption(chartMetricKey);
            const chartLabel = getUtilReportMetricLabel(chartMetricKey, UtilReportState.unitKey);
            const chartPoints = buildUtilReportMetricPointsByYear(result, chartMetricKey, UtilReportState.unitKey, UtilReportState.chartYear);
            const chartCompareYear = UtilReportState.compareYear;
            const seriesColors = getUtilReportSeriesColors(chartMetricKey);
            const chartCurrentColor = seriesColors.current;
            const chartPrevColor = seriesColors.prev;
            const compareSeries = chartCompareYear
                ? buildUtilReportCompareSeries(result, chartMetricKey, UtilReportState.unitKey, chartCompareYear)
                : null;
            const compareSeriesForChart = Array.isArray(compareSeries) && compareSeries.length
                ? compareSeries.map((item, index) => ({
                    ...item,
                    color: index === 0 ? chartPrevColor : chartCurrentColor
                }))
                : null;
            const theme = getUtilReportMetricTheme(chartMetricKey);
            const visibleChartPointCount = compareSeriesForChart?.[0]?.points?.length || chartPoints.length || 0;
            const chartNeedsExtendedWidth = UtilReportState.chartFullscreen === true || visibleChartPointCount > 16;
            const modalMaxXAxisLabels = chartNeedsExtendedWidth ? Math.max(12, visibleChartPointCount) : 12;
            if (chartMetaEl) {
                const periodLabel = result?.rangeLabel ? `기간: ${result.rangeLabel}` : '기간: 데이터 없음';
                const periodBadge = `<span class="util-report-chart-inline-pill is-period">${escapeHtml(periodLabel)}</span>`;
                if (isBuilderCustomMode) {
                    const itemLabel = (UTIL_REPORT_BUILDER_ITEM_OPTIONS.find(item => item.key === UtilReportState.builderItemKey)?.label) || '전기';
                    chartMetaEl.innerHTML = `${periodBadge}<span class="util-report-chart-inline-pill">${escapeHtml(itemLabel)} 보고서</span>`;
                } else {
                    const legendSeries = compareSeriesForChart
                        ? compareSeriesForChart.map((item, index) => ({
                            ...item,
                            yearType: index === 0 ? 'prev' : 'current'
                        }))
                        : [{ label: String(UtilReportState.chartYear || '전체'), color: chartCurrentColor, yearType: 'current' }];
                    const yearBadges = legendSeries
                        .filter(item => item && String(item.label || '').trim())
                        .map(item => {
                            const yearType = item.yearType === 'prev' ? 'prev' : 'current';
                            const colorValue = normalizeUtilReportColor(
                                item.color,
                                yearType === 'prev' ? chartPrevColor : chartCurrentColor
                            );
                            return `
                                <span class="util-report-chart-inline-pill">
                                    <i style="background:${escapeHtml(colorValue)}"></i>
                                    ${escapeHtml(String(item.label || '-'))}
                                    <label class="util-report-chart-inline-color" title="색상 선택">
                                        <input
                                            type="color"
                                            value="${escapeHtml(colorValue)}"
                                            data-role="util-report-modal-year-color"
                                            data-year-type="${yearType}"
                                        />
                                    </label>
                                </span>
                            `;
                        })
                        .join('');
                    chartMetaEl.innerHTML = `${periodBadge}${yearBadges}`;
                }
            }

            if (chartShellEl) {
                chartShellEl.className = `util-report-chart-shell theme-${theme.scope}`;
                chartShellEl.style.setProperty('--util-chart-accent', chartCurrentColor);
                chartShellEl.style.setProperty('--util-chart-bar', chartCurrentColor);
            }
            const viewportWidth = Number(window.innerWidth) || Number(document.documentElement?.clientWidth) || 0;
            const viewportHeight = Number(window.innerHeight) || Number(document.documentElement?.clientHeight) || 0;
            const chartWrapEl = modal.querySelector('[data-role="util-report-modal-chart-wrap"]');
            const wrapClientWidth = Number(chartWrapEl?.clientWidth) || 0;
            const shellClientWidth = Number(chartShellEl?.clientWidth) || 0;
            const modalBodyEl = modal.querySelector('.util-report-modal-body');
            const bodyClientWidth = Number(modalBodyEl?.clientWidth) || 0;
            const bodyClientHeight = Number(modalBodyEl?.clientHeight) || 0;
            const cardClientWidth = Number(modal.querySelector('.util-report-modal-card')?.clientWidth) || 0;
            const shellStyle = chartShellEl ? window.getComputedStyle(chartShellEl) : null;
            const shellHorizontalPadding = shellStyle
                ? (parseFloat(shellStyle.paddingLeft || '0') + parseFloat(shellStyle.paddingRight || '0'))
                : 0;
            const shellInnerWidth = shellClientWidth > 0
                ? Math.max(0, Math.floor(shellClientWidth - shellHorizontalPadding))
                : 0;
            const visibleWrapWidth = wrapClientWidth > 0
                ? Math.max(0, Math.floor(wrapClientWidth - 2))
                : 0;
            const fallbackChartWidth = Math.max(
                shellInnerWidth > 0 ? Math.max(0, shellInnerWidth - 2) : 0,
                bodyClientWidth > 0 ? Math.max(0, Math.floor(bodyClientWidth - 18)) : 0,
                cardClientWidth > 0 ? Math.max(0, Math.floor(cardClientWidth - 24)) : 0,
                viewportWidth > 0 ? Math.max(0, Math.floor(viewportWidth - 28)) : 0
            );
            const fitChartWidth = visibleWrapWidth > 0 ? visibleWrapWidth : fallbackChartWidth;
            const reserveInlineTableHeight = 0;
            const chartFrameExtraHeight = UtilReportState.chartFullscreen === true ? 96 : 124;
            const headHeight = Math.ceil(modal.querySelector('.util-report-modal-head')?.getBoundingClientRect?.().height || 0);
            const shellClientHeight = Number(chartShellEl?.clientHeight) || 0;
            const wrapClientHeight = Number(chartWrapEl?.clientHeight) || 0;
            const fullscreenShellHeight = Math.max(
                shellClientHeight,
                wrapClientHeight > 0 ? (wrapClientHeight + 52) : 0,
                viewportHeight > 0 ? (viewportHeight - headHeight - reserveInlineTableHeight - 24) : 0
            );
            const normalShellHeight = Math.max(
                520,
                Math.min(
                    620,
                    bodyClientHeight > 0
                        ? Math.floor(bodyClientHeight * 0.62)
                        : (viewportHeight > 0 ? Math.floor((viewportHeight - headHeight - 24) * 0.62) : 560)
                )
            );
            const chartMinWidth = fitChartWidth > 0
                ? Math.max(UtilReportState.chartFullscreen === true ? 720 : 520, Math.floor(fitChartWidth - 4))
                : (UtilReportState.chartFullscreen === true ? 940 : 720);
            const chartPreferredWidth = visibleChartPointCount > 0
                ? visibleChartPointCount * (compareSeriesForChart ? 78 : 72)
                : 0;
            const chartForceWidth = fitChartWidth > 0
                ? Math.max(360, Math.floor(fitChartWidth - 2), chartNeedsExtendedWidth ? chartPreferredWidth : 0)
                : undefined;
            const chartHeight = UtilReportState.chartFullscreen === true
                ? Math.max(520, Math.floor(fullscreenShellHeight - chartFrameExtraHeight - 8))
                : Math.max(390, Math.min(470, Math.floor(normalShellHeight - chartFrameExtraHeight)));

            if (chartShellEl) {
                if (UtilReportState.chartFullscreen === true) {
                    chartShellEl.style.minHeight = '';
                    chartShellEl.style.height = '';
                } else {
                    chartShellEl.style.minHeight = `${Math.max(540, chartHeight + chartFrameExtraHeight + 18)}px`;
                    chartShellEl.style.height = 'auto';
                }
            }
            if (chartWrapEl) {
                if (UtilReportState.chartFullscreen === true) {
                    chartWrapEl.style.minHeight = '';
                } else {
                    chartWrapEl.style.minHeight = `${Math.max(420, chartHeight + 10)}px`;
                }
            }

            if (chartEl) {
                if (isBuilderCustomMode) {
                    chartEl.innerHTML = renderUtilReportBuilderCustomCharts(result);
                } else {
                    const isProductionMetric = chartMetric.type === 'production';
                    const yAxisLabel = isProductionMetric
                        ? `생산량 (${getUtilReportProductionUnitLabel(UtilReportState.productionUnitKey)})`
                        : `비용 (${getUtilReportUnitLabel(UtilReportState.unitKey)})`;
                    const yAxisIcon = isProductionMetric ? '🏭' : '💰';
                    const chartShowLabels = UtilReportState.showChartLabels === true;
                    chartEl.innerHTML = compareSeriesForChart
                        ? renderUtilMultiSeriesChart(compareSeriesForChart, {
                            mode: 'modal',
                            showLabelToggle: false,
                            showLabels: chartShowLabels,
                            tightRange: true,
                            tightPadding: 0.14,
                            decimals: UtilReportState.decimals,
                            unitLabel: chartLabel,
                            minWidth: chartMinWidth,
                            pointSpacing: 60,
                            height: chartHeight,
                            frameExtraHeight: chartFrameExtraHeight,
                            axisFontSize: 14,
                            yLabelOffset: 34,
                            tickCount: 3,
                            maxXAxisLabels: modalMaxXAxisLabels,
                            showYearBands: false,
                            hideHeader: true,
                            hideUnit: true,
                            hideLegend: true,
                            axisXLabel: '월',
                            axisYLabel: yAxisLabel,
                            axisXIcon: '📅',
                            axisYIcon: yAxisIcon,
                            rightPad: UtilReportState.chartFullscreen === true ? 108 : 86,
                            forceWidth: chartForceWidth
                        })
                        : renderUtilTrendChart(chartPoints, chartLabel, {
                            mode: 'modal',
                            chartType: UtilReportState.chartType,
                            showTypeSelect: false,
                            showLabelToggle: false,
                            showLabels: chartShowLabels,
                            tightRange: true,
                            tightPadding: 0.14,
                            decimals: UtilReportState.decimals,
                            minWidth: chartMinWidth,
                            pointSpacing: 72,
                            height: chartHeight,
                            frameExtraHeight: chartFrameExtraHeight,
                            axisFontSize: 14,
                            yLabelOffset: 34,
                            tickCount: 3,
                            maxXAxisLabels: modalMaxXAxisLabels,
                            showYearBands: false,
                            rightPad: UtilReportState.chartFullscreen === true ? 96 : 78,
                            axisXLabel: '월',
                            axisYLabel: yAxisLabel,
                            axisXIcon: '📅',
                            axisYIcon: yAxisIcon,
                            forceWidth: chartForceWidth
                        });
                }
            }
            if (chartWrapEl) {
                if (isBuilderCustomMode) {
                    chartWrapEl.dataset.allowScroll = 'false';
                } else {
                    chartWrapEl.dataset.allowScroll = compareSeriesForChart ? 'false' : 'true';
                }
            }
            syncUtilReportChartScrollState(modal);

            if (isBuilderCustomMode) {
                if (totalDonutEl) totalDonutEl.innerHTML = '';
                if (siteDonutEl) siteDonutEl.innerHTML = '';
                if (selectedDonutEl) selectedDonutEl.innerHTML = '';
                if (productionProductDonutEl) productionProductDonutEl.innerHTML = '';
                if (wasteDetailDonutEl) wasteDetailDonutEl.innerHTML = '';
                if (inlineInsightBodyEl) {
                    inlineInsightBodyEl.innerHTML = renderUtilReportInlineDetailContent(result);
                }
                syncUtilReportDetachedTableWindow(result);
                return;
            }

            const fixedCompositionResult = buildUtilReportMonthlyRows({
                ...UtilReportState,
                electricTeam: 'all',
                gasTeam: 'all',
                wasteTeam: 'all',
                productionTeam: 'all'
            });
            const compositionCategory = getUtilReportCompositionCategory(UtilReportState.categoryKey);
            const compositionKeys = getUtilReportCompositionMetricKeys(compositionCategory);
            const compositionValueType = getUtilReportCompositionValueType(compositionCategory);
            const isProductionCategory = compositionCategory === 'production';
            const totalSiteFilter = isProductionCategory ? 'all' : getUtilReportSiteFilterByScope('total');
            const hasCostSiteDrilldown = !isProductionCategory && UtilReportState.scopeKey === 'total' && totalSiteFilter !== 'all';
            const overviewCompositionResult = hasCostSiteDrilldown ? result : fixedCompositionResult;
            const productionSiteContextKey = isProductionCategory
                ? resolveUtilReportSelectedSiteContextKey('total', 'production')
                : 'all';
            const hideTotalCostDonut = !isProductionCategory && ['electric', 'gas', 'waste'].includes(UtilReportState.scopeKey);
            const composition = isProductionCategory
                ? buildUtilReportSiteCompositionData(fixedCompositionResult, UtilReportState.chartYear, 'total')
                : buildUtilReportCompositionData(overviewCompositionResult, {
                    year: UtilReportState.chartYear,
                    categoryKey: compositionCategory,
                    title: hasCostSiteDrilldown
                        ? `${totalSiteFilter} 총액 구성비 (전기/가스/폐수)`
                        : '총액 구성비 (전기/가스/폐수)'
                });
            UtilReportState.lastComposition = composition;

            let metricMetaMap = {};
            if (isProductionCategory) {
                metricMetaMap = buildUtilReportSiteMetricMetaMap('total', UtilReportState.chartYear, compositionCategory);
            } else {
                metricMetaMap = {
                    [compositionKeys.total]: [
                        buildUtilReportDeltaMeta(getUtilReportLatestDelta(result, 'total_cost', UtilReportState.chartYear), '전월대비', { valueType: compositionValueType }),
                        buildUtilReportDeltaMeta(getUtilReportLatestYoYDelta(result, 'total_cost', UtilReportState.chartYear), '전년대비', { valueType: compositionValueType })
                    ],
                    [compositionKeys.electric]: [
                        buildUtilReportDeltaMeta(getUtilReportLatestDelta(result, 'electric_cost', UtilReportState.chartYear), '전월대비', { valueType: compositionValueType }),
                        buildUtilReportDeltaMeta(getUtilReportLatestYoYDelta(result, 'electric_cost', UtilReportState.chartYear), '전년대비', { valueType: compositionValueType })
                    ],
                    [compositionKeys.gas]: [
                        buildUtilReportDeltaMeta(getUtilReportLatestDelta(result, 'gas_cost', UtilReportState.chartYear), '전월대비', { valueType: compositionValueType }),
                        buildUtilReportDeltaMeta(getUtilReportLatestYoYDelta(result, 'gas_cost', UtilReportState.chartYear), '전년대비', { valueType: compositionValueType })
                    ],
                    [compositionKeys.waste]: withUtilReportWasteCostMode('total', () => ([
                        buildUtilReportDeltaMeta(getUtilReportLatestDelta(result, 'waste_cost', UtilReportState.chartYear), '전월대비', { valueType: compositionValueType }),
                        buildUtilReportDeltaMeta(getUtilReportLatestYoYDelta(result, 'waste_cost', UtilReportState.chartYear), '전년대비', { valueType: compositionValueType })
                    ]))
                };
            }

            let activeCompositionMetric = compositionKeys.total;
            if (isProductionCategory) {
                const activeSiteFilter = getUtilReportSiteFilterByScope('total');
                const activeSiteMetric = buildUtilReportSiteMetricKey(activeSiteFilter);
                if (activeSiteMetric && composition.items.some(item => item.key === activeSiteMetric)) {
                    activeCompositionMetric = activeSiteMetric;
                } else if (
                    UtilReportState.activeSiteCompositionKey
                    && composition.items.some(item => item.key === UtilReportState.activeSiteCompositionKey)
                ) {
                    activeCompositionMetric = UtilReportState.activeSiteCompositionKey;
                }
                UtilReportState.activeSiteCompositionKey = activeCompositionMetric;
            } else {
                const scopedCompositionMetric = getUtilReportCompositionMetricKeyByScope(UtilReportState.scopeKey, compositionCategory);
                activeCompositionMetric = scopedCompositionMetric;
                if (
                    UtilReportState.activeMetricCard
                    && (
                        UtilReportState.activeMetricCard === compositionKeys.total
                        || composition.items.some(item => item.key === UtilReportState.activeMetricCard)
                    )
                ) {
                    activeCompositionMetric = UtilReportState.activeMetricCard;
                }
                if (UtilReportState.scopeKey === 'total') {
                    if (hasCostSiteDrilldown) {
                        const overrideMetric = normalizeUtilReportDetailMetricOverrideKey(UtilReportState.detailMetricOverrideKey);
                        const preferredMetric = overrideMetric || UtilReportState.activeMetricCard || compositionKeys.total;
                        activeCompositionMetric = (
                            preferredMetric === compositionKeys.total
                            || composition.items.some(item => item.key === preferredMetric)
                        )
                            ? preferredMetric
                            : compositionKeys.total;
                    } else {
                        activeCompositionMetric = compositionKeys.total;
                    }
                }
            }

            const enableTotalCompositionFlip = !isProductionCategory
                && compositionCategory === 'cost'
                && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total';
            const totalSiteCompositionForFlip = enableTotalCompositionFlip
                ? buildUtilReportSiteCompositionData(fixedCompositionResult, UtilReportState.chartYear, 'total')
                : null;
            const totalSiteMetricMetaMap = enableTotalCompositionFlip
                ? buildUtilReportSiteMetricMetaMap('total', UtilReportState.chartYear, compositionCategory)
                : {};
            let totalSiteFocusMetric = compositionKeys.total;
            if (
                enableTotalCompositionFlip
                && totalSiteCompositionForFlip
                && (
                    UtilReportState.activeSiteCompositionKey === compositionKeys.total
                    || totalSiteCompositionForFlip.items.some(item => item.key === UtilReportState.activeSiteCompositionKey)
                )
            ) {
                totalSiteFocusMetric = UtilReportState.activeSiteCompositionKey;
            }

            if (totalDonutEl) {
                if (hideTotalCostDonut) {
                    totalDonutEl.classList.add('is-hidden');
                    totalDonutEl.innerHTML = '';
                } else {
                    totalDonutEl.classList.remove('is-hidden');
                    if (enableTotalCompositionFlip && totalSiteCompositionForFlip) {
                        const frontTitle = composition.title || (hasCostSiteDrilldown ? `${totalSiteFilter} 총액 구성비 (전기/가스/폐수)` : '총액 구성비 (전기/가스/폐수)');
                        const frontHtml = renderUtilReportCompositionDonut(composition, {
                            activeMetric: activeCompositionMetric,
                            focusItemKey: '',
                            compositionKind: 'total',
                            metricMetaMap,
                            includeTotalItem: true,
                            totalItemKey: compositionKeys.total,
                            totalItemLabel: '총액',
                            showOpen: false,
                            size: 300,
                            centerLabel: hasCostSiteDrilldown ? `${totalSiteFilter} 총액` : '총액',
                            title: frontTitle,
                            valueType: compositionValueType,
                            centerControlHtml: buildUtilReportCompositionCenterToggleHtml('total', 'site', '공장별 전환')
                        });
                        const backHtml = renderUtilReportCompositionDonut(totalSiteCompositionForFlip, {
                            activeMetric: totalSiteFocusMetric,
                            focusItemKey: totalSiteFocusMetric,
                            compositionKind: 'site',
                            metricMetaMap: totalSiteMetricMetaMap,
                            includeTotalItem: true,
                            totalItemKey: compositionKeys.total,
                            totalItemLabel: '총액',
                            showOpen: false,
                            size: 300,
                            centerLabel: '공장별',
                            title: '총액 공장별 구성비 (Plant A/Plant B)',
                            valueType: compositionValueType,
                            centerControlHtml: buildUtilReportCompositionCenterToggleHtml('total', 'scope', '구성비 전환')
                        });
                        totalDonutEl.innerHTML = renderUtilReportCompositionFlipCard(frontHtml, backHtml, {
                            activeView: UtilReportState.totalCompositionView
                        });
                    } else {
                        totalDonutEl.innerHTML = renderUtilReportCompositionDonut(composition, {
                            activeMetric: activeCompositionMetric,
                            focusItemKey: isProductionCategory ? activeCompositionMetric : '',
                            compositionKind: isProductionCategory ? 'site' : 'total',
                            metricMetaMap,
                            includeTotalItem: true,
                            totalItemKey: compositionKeys.total,
                            totalItemLabel: compositionCategory === 'production' ? '총생산량' : '총액',
                            showOpen: false,
                            size: 300,
                            centerLabel: isProductionCategory ? '공장별' : (hasCostSiteDrilldown ? `${totalSiteFilter} 총액` : '총액'),
                            title: composition.title || (isProductionCategory ? '총생산량 공장별 구성비 (Plant A/Plant B)' : (hasCostSiteDrilldown ? `${totalSiteFilter} 총액 구성비 (전기/가스/폐수)` : '총액 구성비 (전기/가스/폐수)')),
                            valueType: compositionValueType
                        });
                    }
                }
            }

            const useTeamTotalExcludeWasteDonut = !isProductionCategory
                && compositionCategory === 'cost'
                && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total';
            const siteComposition = isProductionCategory
                ? null
                : (useTeamTotalExcludeWasteDonut
                    ? null
                    : buildUtilReportSiteCompositionData(fixedCompositionResult, UtilReportState.chartYear, UtilReportState.scopeKey));
            const processComposition = useTeamTotalExcludeWasteDonut
                ? buildUtilReportProcessTotalExcludeWasteCompositionData(UtilReportState.chartYear)
                : null;
            if (siteDonutEl) {
                if (isProductionCategory || useTeamTotalExcludeWasteDonut) {
                    siteDonutEl.classList.add('is-hidden');
                    siteDonutEl.innerHTML = '';
                } else {
                    let activeSiteMetricKey = compositionKeys.total;
                    const activeSiteFilter = getUtilReportSiteFilterByScope(UtilReportState.scopeKey);
                    const activeSiteMetricFromFilter = buildUtilReportSiteMetricKey(activeSiteFilter);
                    if (activeSiteMetricFromFilter && siteComposition.items.some(item => item.key === activeSiteMetricFromFilter)) {
                        activeSiteMetricKey = activeSiteMetricFromFilter;
                    } else if (
                        normalizeUtilReportScope(UtilReportState.scopeKey) === 'total'
                        && UtilReportState.activeSiteCompositionKey
                        && siteComposition.items.some(item => item.key === UtilReportState.activeSiteCompositionKey)
                    ) {
                        activeSiteMetricKey = UtilReportState.activeSiteCompositionKey;
                    }
                    UtilReportState.activeSiteCompositionKey = activeSiteMetricKey;
                    const siteMetricMetaMap = buildUtilReportSiteMetricMetaMap(
                        UtilReportState.scopeKey,
                        UtilReportState.chartYear,
                        compositionCategory
                    );
                    siteDonutEl.classList.remove('is-hidden');
                    siteDonutEl.innerHTML = renderUtilReportCompositionDonut(siteComposition, {
                        activeMetric: UtilReportState.activeSiteCompositionKey,
                        focusItemKey: UtilReportState.activeSiteCompositionKey,
                        compositionKind: 'site',
                        metricMetaMap: siteMetricMetaMap,
                        includeTotalItem: normalizeUtilReportScope(UtilReportState.scopeKey) !== 'total',
                        totalItemKey: compositionKeys.total,
                        totalItemLabel: compositionCategory === 'production'
                            ? '총생산량'
                            : (
                                normalizeUtilReportScope(UtilReportState.scopeKey) === 'electric'
                                    ? getUtilReportElectricScopeTotalLabel('all')
                                    : (
                                        normalizeUtilReportScope(UtilReportState.scopeKey) === 'gas'
                                            ? getUtilReportGasScopeTotalLabel('all')
                                            : (
                                                normalizeUtilReportScope(UtilReportState.scopeKey) === 'waste'
                                                    ? getUtilReportWasteScopeTotalLabel('all')
                                                    : '총액'
                                            )
                                    )
                            ),
                        showOpen: false,
                        size: 250,
                        centerLabel: '공장별',
                        title: siteComposition.title || '공장별 구성비 (Plant A/Plant B)',
                        valueType: compositionValueType
                    });
                }
            }

            const selectedComposition = buildUtilReportSelectedCompositionData(result, UtilReportState.chartYear);
            const sourceLabelMap = { electric: '전기', gas: '가스', waste: '폐수', total: '생산량' };
            if (
                UtilReportState.scopeKey === 'electric'
                && UtilReportState.electricTeam !== 'all'
                && normalizeUtilReportSiteKey(UtilReportState.electricTeam) === 'all'
            ) {
                UtilReportState.activeTeamCompositionKey = `${sourceLabelMap.electric}::${UtilReportState.electricTeam}`;
            } else if (
                UtilReportState.scopeKey === 'gas'
                && UtilReportState.gasTeam !== 'all'
                && normalizeUtilReportSiteKey(UtilReportState.gasTeam) === 'all'
            ) {
                UtilReportState.activeTeamCompositionKey = `${sourceLabelMap.gas}::${UtilReportState.gasTeam}`;
            } else if (UtilReportState.scopeKey === 'waste' && UtilReportState.wasteTeam !== 'all') {
                UtilReportState.activeTeamCompositionKey = `${sourceLabelMap.waste}::${UtilReportState.wasteTeam}`;
            } else if (compositionCategory === 'production' && UtilReportState.productionTeam !== 'all') {
                UtilReportState.activeTeamCompositionKey = `${sourceLabelMap.total}::${UtilReportState.productionTeam}`;
            }
            const selectedTotalMetricKey = compositionKeys.total;
            if (
                UtilReportState.activeTeamCompositionKey !== selectedTotalMetricKey
                && !selectedComposition.items.some(item => item.key === UtilReportState.activeTeamCompositionKey)
            ) {
                UtilReportState.activeTeamCompositionKey = selectedTotalMetricKey;
            }
            let selectedDonutMetric = UtilReportState.activeTeamCompositionKey;
            let productionLineTeamFilter = UtilReportState.productionTeam;
            const productionSelectedView = UtilReportState.productionSelectedCompositionView === 'process' ? 'process' : 'team';
            const productionProcessContextFilter = isProductionCategory
                ? resolveUtilReportProductionProcessContextFilter(productionSiteContextKey)
                : 'all';
            let productionProcessLineContext = null;
            const showProductionTeamDonut = isProductionCategory && productionSiteContextKey !== 'Plant B';
            const showProductionLineDonut = isProductionCategory && (
                productionSelectedView === 'process'
                || (
                productionSiteContextKey === 'Plant B'
                || isUtilReportProductionSpecificTeamSelection(UtilReportState.productionTeam)
                )
            );
            const hideWasteSelectedDonut = !isProductionCategory && UtilReportState.scopeKey === 'waste';
            const selectedElectricSiteKey = !isProductionCategory && UtilReportState.scopeKey === 'electric'
                ? resolveUtilReportSelectedSiteContextKey('electric', compositionCategory)
                : 'all';
            const selectedGasSiteKey = !isProductionCategory && UtilReportState.scopeKey === 'gas'
                ? resolveUtilReportSelectedSiteContextKey('gas', compositionCategory)
                : 'all';
            const selectedVisibleTeamItems = Array.isArray(selectedComposition?.items)
                ? selectedComposition.items.filter(item => item?.excludeFromLegend !== true)
                : [];
            const hideSelectedElectricDonut = !isProductionCategory
                && UtilReportState.scopeKey === 'electric'
                && selectedElectricSiteKey !== 'all'
                && selectedVisibleTeamItems.length <= 1;
            const hideSelectedGasDonut = !isProductionCategory
                && UtilReportState.scopeKey === 'gas'
                && selectedGasSiteKey !== 'all'
                && selectedVisibleTeamItems.length <= 1;
            if (isProductionCategory) {
                productionLineTeamFilter = resolveUtilReportProductionLineTeamFilter(selectedComposition, productionSiteContextKey);
                if (productionSiteContextKey === 'Plant B') {
                    selectedDonutMetric = '생산량::Line Alpha';
                }
            }
            const selectedTeamMetaMap = (compositionCategory !== 'production' && UtilReportState.scopeKey === 'total')
                ? {}
                : buildUtilReportSelectedTeamMetricMetaMap(selectedComposition, UtilReportState.chartYear, compositionCategory);

            if (selectedDonutEl) {
                if ((isProductionCategory && !showProductionTeamDonut) || hideWasteSelectedDonut || hideSelectedElectricDonut || hideSelectedGasDonut) {
                    selectedDonutEl.classList.add('is-hidden');
                    selectedDonutEl.innerHTML = '';
                } else {
                    const selectedDonutTotalValue = !isProductionCategory && UtilReportState.scopeKey === 'electric'
                        ? (Number(selectedComposition.ratioTotal) || Number(selectedComposition.total) || 0)
                        : (Number(selectedComposition.total) || 0);
                    const selectedDonutTotalLabel = !isProductionCategory && UtilReportState.scopeKey === 'electric'
                        ? (selectedComposition.totalItemLabel || getUtilReportElectricScopeTotalLabel(selectedElectricSiteKey))
                        : (compositionCategory === 'production' ? '총생산량' : '총액');
                    selectedDonutEl.classList.remove('is-hidden');
                    if (!isProductionCategory && normalizeUtilReportScope(UtilReportState.scopeKey) === 'total') {
                        let selectedTeamMetric = selectedDonutMetric;
                        if (
                            selectedTeamMetric !== selectedTotalMetricKey
                            && !selectedVisibleTeamItems.some(item => item.key === selectedTeamMetric)
                        ) {
                            selectedTeamMetric = selectedTotalMetricKey;
                        }
                        UtilReportState.activeTeamCompositionKey = selectedTeamMetric || selectedTotalMetricKey;

                        const totalCostTeamComposition = buildUtilReportTeamTotalExcludeWasteCompositionData(
                            UtilReportState.chartYear
                        );
                        const totalCostTeamMetricMetaMap = buildUtilReportTeamTotalExcludeWasteMetricMetaMap(
                            totalCostTeamComposition,
                            UtilReportState.chartYear
                        );
                        const totalCostTeamItems = Array.isArray(totalCostTeamComposition?.items)
                            ? totalCostTeamComposition.items
                            : [];
                        let activeTotalCostTeamMetric = String(
                            UtilReportState.activeTotalTeamCompositionKey || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY
                        ).trim() || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                        if (
                            activeTotalCostTeamMetric !== UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY
                            && !totalCostTeamItems.some(item => item.key === activeTotalCostTeamMetric)
                        ) {
                            activeTotalCostTeamMetric = UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;
                        }
                        UtilReportState.activeTotalTeamCompositionKey = activeTotalCostTeamMetric || UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY;

                        const totalCostProcessMetricMetaMap = buildUtilReportProcessTotalExcludeWasteMetricMetaMap(
                            processComposition,
                            UtilReportState.chartYear
                        );
                        const totalCostProcessItems = Array.isArray(processComposition?.items)
                            ? processComposition.items
                            : [];
                        let activeTotalCostProcessMetric = String(
                            UtilReportState.activeTotalProcessCompositionKey || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY
                        ).trim() || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                        if (
                            activeTotalCostProcessMetric !== UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY
                            && !totalCostProcessItems.some(item => item.key === activeTotalCostProcessMetric)
                        ) {
                            activeTotalCostProcessMetric = UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;
                        }
                        UtilReportState.activeTotalProcessCompositionKey = activeTotalCostProcessMetric || UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY;

                        const totalCostSelectedView = ['total', 'process', 'team', 'plantA'].includes(UtilReportState.costTotalSelectedCompositionView)
                            ? UtilReportState.costTotalSelectedCompositionView
                            : 'total';
                        UtilReportState.costTotalSelectedCompositionView = totalCostSelectedView;
                        const selectedPlantAComposition = buildUtilReportSelectedCompositionData(
                            result,
                            UtilReportState.chartYear,
                            'total',
                            'Plant A'
                        );
                        const selectedPlantAVisibleTeamItems = Array.isArray(selectedPlantAComposition?.items)
                            ? selectedPlantAComposition.items.filter(item => item?.excludeFromLegend !== true)
                            : [];

                        if (totalCostSelectedView === 'total') {
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(totalCostTeamComposition, {
                                activeMetric: activeTotalCostTeamMetric,
                                focusItemKey: activeTotalCostTeamMetric,
                                compositionKind: 'team-total-excl-waste',
                                metricMetaMap: totalCostTeamMetricMetaMap,
                                includeTotalItem: true,
                                totalItemKey: UTIL_REPORT_TEAM_TOTAL_EX_WASTE_TOTAL_KEY,
                                totalItemLabel: '총액 (폐수제외)',
                                totalItemValue: Number(totalCostTeamComposition.total) || 0,
                                ratioTotal: Number(totalCostTeamComposition.total) || 0,
                                showOpen: false,
                                size: 260,
                                centerLabel: '총액',
                                title: totalCostTeamComposition.title || '총액 팀별 구성비 (폐수제외)',
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('cost-total-selected', 'process', '공정별 전환')
                            });
                        } else if (totalCostSelectedView === 'process') {
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(processComposition, {
                                activeMetric: activeTotalCostProcessMetric,
                                focusItemKey: activeTotalCostProcessMetric,
                                compositionKind: 'process-total-excl-waste',
                                metricMetaMap: totalCostProcessMetricMetaMap,
                                includeTotalItem: true,
                                totalItemKey: UTIL_REPORT_PROCESS_TOTAL_EX_WASTE_TOTAL_KEY,
                                totalItemLabel: processComposition.totalItemLabel || '총액 (폐수제외)',
                                totalItemValue: Number(processComposition.total) || 0,
                                ratioTotal: Number(processComposition.ratioTotal) || Number(processComposition.total) || 0,
                                showOpen: false,
                                size: 260,
                                centerLabel: '공정별',
                                title: processComposition.title || '총액 공정별 구성비 (폐수제외)',
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('cost-total-selected', 'team', '총액 전환')
                            });
                        } else if (totalCostSelectedView === 'team') {
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(selectedComposition, {
                                activeMetric: selectedTeamMetric,
                                focusItemKey: selectedTeamMetric,
                                compositionKind: 'selected',
                                metricMetaMap: selectedTeamMetaMap,
                                includeTotalItem: true,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: selectedDonutTotalLabel,
                                totalItemValue: selectedDonutTotalValue,
                                ratioTotal: selectedDonutTotalValue,
                                showOpen: false,
                                size: 260,
                                centerLabel: '팀별',
                                title: selectedComposition.title || '세부 팀 구성비 (총합)',
                                appendSourceToRatio: true,
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('cost-total-selected', 'plantA', 'Plant A 전환')
                            });
                        } else {
                            let activePlantATeamMetric = selectedDonutMetric;
                            if (
                                activePlantATeamMetric !== selectedTotalMetricKey
                                && !selectedPlantAVisibleTeamItems.some(item => item.key === activePlantATeamMetric)
                            ) {
                                activePlantATeamMetric = selectedTotalMetricKey;
                            }
                            UtilReportState.activeTeamCompositionKey = activePlantATeamMetric || selectedTotalMetricKey;
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(selectedPlantAComposition, {
                                activeMetric: activePlantATeamMetric,
                                focusItemKey: activePlantATeamMetric,
                                compositionKind: 'selected',
                                metricMetaMap: {},
                                includeTotalItem: true,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: selectedPlantAComposition.totalItemLabel || 'Plant A 전체',
                                totalItemValue: Number(selectedPlantAComposition.total) || 0,
                                ratioTotal: Number(selectedPlantAComposition.ratioTotal) || Number(selectedPlantAComposition.total) || 0,
                                showOpen: false,
                                size: 260,
                                centerLabel: 'Plant A',
                                title: selectedPlantAComposition.title || 'Plant A 세부팀 구성비',
                                appendSourceToRatio: true,
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('cost-total-selected', 'total', '총액 전환')
                            });
                        }
                    } else if (!isProductionCategory && UtilReportState.scopeKey === 'electric') {
                        let selectedTeamMetric = selectedDonutMetric;
                        let includeSelectedTeamTotalItem = true;
                        if (selectedElectricSiteKey !== 'all' && selectedVisibleTeamItems.length === 1) {
                            includeSelectedTeamTotalItem = false;
                            selectedTeamMetric = String(selectedVisibleTeamItems[0]?.key || '');
                        } else if (
                            selectedTeamMetric !== selectedTotalMetricKey
                            && !selectedVisibleTeamItems.some(item => item.key === selectedTeamMetric)
                        ) {
                            selectedTeamMetric = selectedTotalMetricKey;
                        }
                        UtilReportState.activeTeamCompositionKey = selectedTeamMetric || selectedTotalMetricKey;
                        const showElectricProcessFlip = selectedElectricSiteKey === 'all';
                        if (!showElectricProcessFlip) {
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(selectedComposition, {
                                activeMetric: selectedTeamMetric,
                                focusItemKey: selectedTeamMetric,
                                highlightMetrics: selectedComposition.highlightItemKeys,
                                compositionKind: 'selected',
                                metricMetaMap: selectedTeamMetaMap,
                                includeTotalItem: includeSelectedTeamTotalItem,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: selectedDonutTotalLabel,
                                totalItemValue: selectedDonutTotalValue,
                                ratioTotal: selectedDonutTotalValue,
                                showOpen: false,
                                size: 260,
                                centerLabel: '팀 세부',
                                title: selectedComposition.title || '세부 팀 구성비 (전기)',
                                appendSourceToRatio: true,
                                valueType: compositionValueType
                            });
                        } else {
                            const electricProcessComposition = buildUtilReportElectricProcessCompositionData(
                                UtilReportState.chartYear,
                                selectedElectricSiteKey
                            );
                            const electricProcessMetricMetaMap = buildUtilReportElectricProcessMetricMetaMap(
                                electricProcessComposition,
                                UtilReportState.chartYear,
                                selectedElectricSiteKey
                            );
                            const electricProcessItems = Array.isArray(electricProcessComposition?.items)
                                ? electricProcessComposition.items
                                : [];
                            let activeElectricProcessMetric = String(
                                UtilReportState.activeElectricProcessCompositionKey || UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY
                            ).trim() || UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY;
                            let includeElectricProcessTotalItem = true;
                            if (
                                activeElectricProcessMetric !== UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY
                                && !electricProcessItems.some(item => item.key === activeElectricProcessMetric)
                            ) {
                                activeElectricProcessMetric = UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY;
                            }
                            UtilReportState.activeElectricProcessCompositionKey = activeElectricProcessMetric || UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY;

                            const teamHtml = renderUtilReportCompositionDonut(selectedComposition, {
                                activeMetric: selectedTeamMetric,
                                focusItemKey: selectedTeamMetric,
                                highlightMetrics: selectedComposition.highlightItemKeys,
                                compositionKind: 'selected',
                                metricMetaMap: selectedTeamMetaMap,
                                includeTotalItem: includeSelectedTeamTotalItem,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: selectedDonutTotalLabel,
                                totalItemValue: selectedDonutTotalValue,
                                ratioTotal: selectedDonutTotalValue,
                                showOpen: false,
                                size: 260,
                                centerLabel: '팀 세부',
                                title: selectedComposition.title || '세부 팀 구성비 (전기)',
                                appendSourceToRatio: true,
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('electric-selected', 'process', '공정별 전환')
                            });
                            const processHtml = renderUtilReportCompositionDonut(electricProcessComposition, {
                                activeMetric: activeElectricProcessMetric,
                                focusItemKey: activeElectricProcessMetric,
                                compositionKind: 'electric-process',
                                metricMetaMap: electricProcessMetricMetaMap,
                                includeTotalItem: includeElectricProcessTotalItem,
                                totalItemKey: UTIL_REPORT_ELECTRIC_PROCESS_TOTAL_KEY,
                                totalItemLabel: electricProcessComposition.totalItemLabel || selectedDonutTotalLabel,
                                totalItemValue: Number(electricProcessComposition.total) || 0,
                                ratioTotal: Number(electricProcessComposition.ratioTotal) || Number(electricProcessComposition.total) || 0,
                                showOpen: false,
                                size: 260,
                                centerLabel: '공정별',
                                title: electricProcessComposition.title || '세부 공정 구성비 (전기)',
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('electric-selected', 'team', '팀별 전환')
                            });
                            selectedDonutEl.innerHTML = renderUtilReportCompositionFlipCard(teamHtml, processHtml, {
                                activeView: UtilReportState.electricSelectedCompositionView === 'process' ? 'site' : 'scope'
                            });
                        }
                    } else if (!isProductionCategory && UtilReportState.scopeKey === 'gas') {
                        let selectedTeamMetric = selectedDonutMetric;
                        let includeSelectedTeamTotalItem = true;
                        if (selectedGasSiteKey !== 'all' && selectedVisibleTeamItems.length === 1) {
                            includeSelectedTeamTotalItem = false;
                            selectedTeamMetric = String(selectedVisibleTeamItems[0]?.key || '');
                        } else if (
                            selectedTeamMetric !== selectedTotalMetricKey
                            && !selectedVisibleTeamItems.some(item => item.key === selectedTeamMetric)
                        ) {
                            selectedTeamMetric = selectedTotalMetricKey;
                        }
                        UtilReportState.activeTeamCompositionKey = selectedTeamMetric || selectedTotalMetricKey;
                        const gasTotalLabel = selectedComposition.totalItemLabel
                            || getUtilReportGasScopeTotalLabel(selectedGasSiteKey);
                        const gasHighlightMetrics = selectedTeamMetric === '가스::Line Beta'
                            ? ['가스::Line Beta LPG', '가스::Line Beta LNG']
                            : [];
                        const showGasProcessFlip = selectedGasSiteKey === 'all';
                        if (!showGasProcessFlip) {
                            selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(selectedComposition, {
                                activeMetric: selectedTeamMetric,
                                focusItemKey: selectedTeamMetric,
                                highlightMetrics: gasHighlightMetrics,
                                compositionKind: 'selected',
                                metricMetaMap: selectedTeamMetaMap,
                                includeTotalItem: includeSelectedTeamTotalItem,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: gasTotalLabel,
                                totalItemValue: selectedDonutTotalValue,
                                ratioTotal: selectedDonutTotalValue,
                                showOpen: false,
                                size: 260,
                                centerLabel: '팀 세부',
                                title: selectedComposition.title || '세부 팀 구성비 (가스)',
                                appendSourceToRatio: true,
                                valueType: compositionValueType
                            });
                        } else {
                            const gasProcessComposition = buildUtilReportGasProcessCompositionData(
                                UtilReportState.chartYear,
                                selectedGasSiteKey
                            );
                            const gasProcessMetricMetaMap = buildUtilReportGasProcessMetricMetaMap(
                                gasProcessComposition,
                                UtilReportState.chartYear,
                                selectedGasSiteKey
                            );
                            const gasProcessItems = Array.isArray(gasProcessComposition?.items)
                                ? gasProcessComposition.items
                                : [];
                            let activeGasProcessMetric = String(
                                UtilReportState.activeGasProcessCompositionKey || UTIL_REPORT_GAS_PROCESS_TOTAL_KEY
                            ).trim() || UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
                            let includeGasProcessTotalItem = true;
                            if (
                                activeGasProcessMetric !== UTIL_REPORT_GAS_PROCESS_TOTAL_KEY
                                && !gasProcessItems.some(item => item.key === activeGasProcessMetric)
                            ) {
                                activeGasProcessMetric = UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;
                            }
                            UtilReportState.activeGasProcessCompositionKey = activeGasProcessMetric || UTIL_REPORT_GAS_PROCESS_TOTAL_KEY;

                            const teamHtml = renderUtilReportCompositionDonut(selectedComposition, {
                                activeMetric: selectedTeamMetric,
                                focusItemKey: selectedTeamMetric,
                                highlightMetrics: gasHighlightMetrics,
                                compositionKind: 'selected',
                                metricMetaMap: selectedTeamMetaMap,
                                includeTotalItem: includeSelectedTeamTotalItem,
                                totalItemKey: selectedTotalMetricKey,
                                totalItemLabel: gasTotalLabel,
                                totalItemValue: selectedDonutTotalValue,
                                ratioTotal: selectedDonutTotalValue,
                                showOpen: false,
                                size: 260,
                                centerLabel: '팀 세부',
                                title: selectedComposition.title || '세부 팀 구성비 (가스)',
                                appendSourceToRatio: true,
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('gas-selected', 'process', '공정별 전환')
                            });
                            const processHtml = renderUtilReportCompositionDonut(gasProcessComposition, {
                                activeMetric: activeGasProcessMetric,
                                focusItemKey: activeGasProcessMetric,
                                compositionKind: 'gas-process',
                                metricMetaMap: gasProcessMetricMetaMap,
                                includeTotalItem: includeGasProcessTotalItem,
                                totalItemKey: UTIL_REPORT_GAS_PROCESS_TOTAL_KEY,
                                totalItemLabel: gasProcessComposition.totalItemLabel || gasTotalLabel,
                                totalItemValue: Number(gasProcessComposition.total) || 0,
                                ratioTotal: Number(gasProcessComposition.ratioTotal) || Number(gasProcessComposition.total) || 0,
                                showOpen: false,
                                size: 260,
                                centerLabel: '공정별',
                                title: gasProcessComposition.title || '세부 공정 구성비 (가스)',
                                valueType: compositionValueType,
                                centerControlHtml: buildUtilReportCompositionCenterToggleHtml('gas-selected', 'team', '팀별 전환')
                            });
                            selectedDonutEl.innerHTML = renderUtilReportCompositionFlipCard(teamHtml, processHtml, {
                                activeView: UtilReportState.gasSelectedCompositionView === 'process' ? 'site' : 'scope'
                            });
                        }
                    } else if (isProductionCategory) {
                        let selectedTeamMetric = selectedDonutMetric;
                        if (
                            selectedTeamMetric !== selectedTotalMetricKey
                            && !selectedVisibleTeamItems.some(item => item.key === selectedTeamMetric)
                        ) {
                            selectedTeamMetric = selectedTotalMetricKey;
                        }
                        UtilReportState.activeTeamCompositionKey = selectedTeamMetric || selectedTotalMetricKey;

                        const productionProcessComposition = buildUtilReportProductionProcessCompositionData(
                            UtilReportState.chartYear,
                            productionProcessContextFilter
                        );
                        const productionProcessMetricMetaMap = buildUtilReportProductionProcessMetricMetaMap(
                            productionProcessComposition,
                            UtilReportState.chartYear,
                            productionProcessContextFilter
                        );
                        const productionProcessItems = Array.isArray(productionProcessComposition?.items)
                            ? productionProcessComposition.items
                            : [];
                        let activeProductionProcessMetric = String(
                            UtilReportState.activeProductionProcessCompositionKey || UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY
                        ).trim() || UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
                        let includeProductionProcessTotalItem = true;
                        if (productionProcessContextFilter !== 'all' && productionProcessItems.length === 1) {
                            includeProductionProcessTotalItem = false;
                            activeProductionProcessMetric = String(productionProcessItems[0]?.key || '');
                        } else if (
                            activeProductionProcessMetric !== UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY
                            && !productionProcessItems.some(item => item.key === activeProductionProcessMetric)
                        ) {
                            activeProductionProcessMetric = UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
                        }
                        UtilReportState.activeProductionProcessCompositionKey = activeProductionProcessMetric || UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY;
                        if (productionSelectedView === 'process') {
                            productionProcessLineContext = buildUtilReportProductionProcessLineContext(
                                UtilReportState.activeProductionProcessCompositionKey,
                                productionProcessContextFilter
                            );
                            productionLineTeamFilter = Array.isArray(productionProcessLineContext?.targetTeams)
                                ? productionProcessLineContext.targetTeams
                                : productionLineTeamFilter;
                        }

                        const teamHtml = renderUtilReportCompositionDonut(selectedComposition, {
                            activeMetric: selectedTeamMetric,
                            focusItemKey: selectedTeamMetric,
                            compositionKind: 'selected',
                            metricMetaMap: selectedTeamMetaMap,
                            includeTotalItem: true,
                            totalItemKey: selectedTotalMetricKey,
                            totalItemLabel: selectedDonutTotalLabel,
                            totalItemValue: selectedDonutTotalValue,
                            ratioTotal: selectedDonutTotalValue,
                            showOpen: false,
                            size: 260,
                            centerLabel: '생산팀',
                            title: selectedComposition.title || '팀별 생산량 구성비',
                            appendSourceToRatio: true,
                            valueType: compositionValueType,
                            centerControlHtml: buildUtilReportCompositionCenterToggleHtml('production-selected', 'process', '공정별 전환')
                        });
                        const processHtml = renderUtilReportCompositionDonut(productionProcessComposition, {
                            activeMetric: activeProductionProcessMetric,
                            focusItemKey: activeProductionProcessMetric,
                            compositionKind: 'production-process',
                            metricMetaMap: productionProcessMetricMetaMap,
                            includeTotalItem: includeProductionProcessTotalItem,
                            totalItemKey: UTIL_REPORT_PRODUCTION_PROCESS_TOTAL_KEY,
                            totalItemLabel: productionProcessComposition.totalItemLabel || selectedDonutTotalLabel,
                            totalItemValue: Number(productionProcessComposition.total) || 0,
                            ratioTotal: Number(productionProcessComposition.ratioTotal) || Number(productionProcessComposition.total) || 0,
                            showOpen: false,
                            size: 260,
                            centerLabel: '공정별',
                            title: productionProcessComposition.title || '공정별 생산량 구성비',
                            valueType: 'production',
                            centerControlHtml: buildUtilReportCompositionCenterToggleHtml('production-selected', 'team', '팀별 전환')
                        });
                        selectedDonutEl.innerHTML = renderUtilReportCompositionFlipCard(teamHtml, processHtml, {
                            activeView: productionSelectedView === 'process' ? 'site' : 'scope'
                        });
                    } else {
                        selectedDonutEl.innerHTML = renderUtilReportCompositionDonut(selectedComposition, {
                            activeMetric: selectedDonutMetric,
                            focusItemKey: selectedDonutMetric,
                            highlightMetrics: !isProductionCategory && UtilReportState.scopeKey === 'electric'
                                ? selectedComposition.highlightItemKeys
                                : [],
                            compositionKind: 'selected',
                            metricMetaMap: selectedTeamMetaMap,
                            includeTotalItem: true,
                            totalItemKey: selectedTotalMetricKey,
                            totalItemLabel: selectedDonutTotalLabel,
                            totalItemValue: selectedDonutTotalValue,
                            ratioTotal: selectedDonutTotalValue,
                            showOpen: false,
                            size: 260,
                            centerLabel: compositionCategory === 'production' ? '생산팀' : '팀 세부',
                            title: selectedComposition.title || (compositionCategory === 'production' ? '생산량 팀 구성비' : '세부 팀 구성비'),
                            appendSourceToRatio: true,
                            valueType: compositionValueType
                        });
                    }
                }
            }

            if (productionProductDonutEl) {
                if (compositionCategory === 'production' && showProductionLineDonut) {
                    if (productionSelectedView === 'process' && !productionProcessLineContext) {
                        productionProcessLineContext = buildUtilReportProductionProcessLineContext(
                            UtilReportState.activeProductionProcessCompositionKey,
                            productionProcessContextFilter
                        );
                        if (Array.isArray(productionProcessLineContext?.targetTeams) && productionProcessLineContext.targetTeams.length) {
                            productionLineTeamFilter = productionProcessLineContext.targetTeams;
                        }
                    }
                    const productionProductComposition = buildUtilReportProductionProductCompositionData(
                        UtilReportState.chartYear,
                        productionLineTeamFilter
                    );
                    const productionProductMetricMetaMap = buildUtilReportProductionProductMetricMetaMap(
                        productionProductComposition,
                        UtilReportState.chartYear,
                        productionLineTeamFilter
                    );
                    const productionProductTotalKey = 'total_production_product';
                    if (
                        UtilReportState.activeProductionProductCompositionKey !== productionProductTotalKey
                        && !productionProductComposition.items.some(item => item.key === UtilReportState.activeProductionProductCompositionKey)
                    ) {
                        UtilReportState.activeProductionProductCompositionKey = productionProductTotalKey;
                    }
                    productionProductDonutEl.classList.remove('is-hidden');
                    productionProductDonutEl.innerHTML = renderUtilReportCompositionDonut(productionProductComposition, {
                        activeMetric: UtilReportState.activeProductionProductCompositionKey,
                        focusItemKey: UtilReportState.activeProductionProductCompositionKey,
                        compositionKind: productionSelectedView === 'process' ? 'production-process-line' : 'production-product',
                        metricMetaMap: productionProductMetricMetaMap,
                        includeTotalItem: true,
                        totalItemKey: productionProductTotalKey,
                        totalItemLabel: productionSelectedView === 'process'
                            ? (productionProcessLineContext?.totalItemLabel || '총생산량')
                            : '총생산량',
                        showOpen: false,
                        size: 260,
                        centerLabel: '라인',
                        title: productionSelectedView === 'process'
                            ? (productionProcessLineContext?.title || productionProductComposition.title || '라인 생산량 구성비')
                            : (productionProductComposition.title || '라인 생산량 구성비'),
                        valueType: 'production'
                    });
                } else {
                    UtilReportState.activeProductionProductCompositionKey = 'total_production_product';
                    productionProductDonutEl.classList.add('is-hidden');
                    productionProductDonutEl.innerHTML = '';
                }
            }

            if (wasteDetailDonutEl) {
                if (compositionCategory !== 'production' && UtilReportState.scopeKey === 'waste') {
                    const wasteDetailComposition = buildUtilReportWasteDetailCompositionData(result, UtilReportState.chartYear);
                    const activeDetailMetric = buildUtilReportWasteDetailMetricKey(UtilReportState.wasteCostModeKey || 'total');
                    UtilReportState.activeWasteDetailCompositionKey = activeDetailMetric;
                    wasteDetailDonutEl.classList.remove('is-hidden');
                    wasteDetailDonutEl.innerHTML = renderUtilReportCompositionDonut(wasteDetailComposition, {
                        activeMetric: activeDetailMetric,
                        focusItemKey: activeDetailMetric,
                        compositionKind: 'waste-detail',
                        includeTotalItem: true,
                        totalItemKey: buildUtilReportWasteDetailMetricKey('total'),
                        totalItemLabel: wasteDetailComposition.totalItemLabel || getUtilReportWasteScopeTotalLabel(UtilReportState.wasteTeam),
                        showOpen: false,
                        size: 240,
                        centerLabel: '세부항목',
                        title: wasteDetailComposition.title || '폐수 세부 금액 구성비',
                        valueType: 'cost'
                    });
                } else {
                    wasteDetailDonutEl.classList.add('is-hidden');
                    wasteDetailDonutEl.innerHTML = '';
                }
            }
            if (inlineInsightBodyEl) {
                inlineInsightBodyEl.innerHTML = renderUtilReportInlineDetailContent(result);
            }
            syncUtilReportDetachedTableWindow(result);

        }

