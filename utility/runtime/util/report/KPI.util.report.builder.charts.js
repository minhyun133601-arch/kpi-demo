        function renderUtilReportBuilderElectricCombinedChart(usagePoints, costPoints, productionPoints, options = {}) {
            const usageList = Array.isArray(usagePoints) ? usagePoints : [];
            const costList = Array.isArray(costPoints) ? costPoints : [];
            const productionList = Array.isArray(productionPoints) ? productionPoints : [];
            const isModal = options.mode === 'modal';
            const enableUsage = options.enableUsage !== false;
            const enableCost = options.enableCost !== false;
            const enableProduction = options.enableProduction !== false;
            const pointCount = Math.max(usageList.length, costList.length, productionList.length);
            if (!pointCount) {
                return '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div></div>';
            }

            const points = Array.from({ length: pointCount }).map((_, index) => {
                const usagePoint = usageList[index] || {};
                const costPoint = costList[index] || {};
                const productionPoint = productionList[index] || {};
                return {
                    key: usagePoint.key || costPoint.key || productionPoint.key || '',
                    label: usagePoint.label || costPoint.label || productionPoint.label || '',
                    usage: Number(usagePoint.value),
                    cost: Number(costPoint.value),
                    production: Number(productionPoint.value)
                };
            });

            const seriesTypeMap = options?.seriesTypeMap && typeof options.seriesTypeMap === 'object'
                ? options.seriesTypeMap
                : {};
            const usageChartType = normalizeUtilReportBuilderVizChartType(seriesTypeMap.usage || 'bar');
            const costChartType = normalizeUtilReportBuilderVizChartType(seriesTypeMap.cost || 'line');
            const productionChartType = normalizeUtilReportBuilderVizChartType(seriesTypeMap.production || 'line');

            const usageValues = [];
            const costValues = [];
            const productionValues = [];
            points.forEach(point => {
                if (enableUsage && Number.isFinite(point.usage)) usageValues.push(point.usage);
                if (enableCost && Number.isFinite(point.cost)) costValues.push(point.cost);
                if (enableProduction && Number.isFinite(point.production)) productionValues.push(point.production);
            });
            if (!usageValues.length && !costValues.length && !productionValues.length) {
                return '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div></div>';
            }

            const showLabels = options.showLabels === true;
            const defaultDigits = Number.isFinite(options.decimals) ? Number(options.decimals) : 1;
            const decimalsMap = options?.decimalsMap && typeof options.decimalsMap === 'object'
                ? options.decimalsMap
                : {};
            const usageDecimals = Number.isFinite(Number(decimalsMap.usage)) ? Number(decimalsMap.usage) : defaultDigits;
            const costDecimals = Number.isFinite(Number(decimalsMap.cost)) ? Number(decimalsMap.cost) : defaultDigits;
            const productionDecimals = Number.isFinite(Number(decimalsMap.production))
                ? Number(decimalsMap.production)
                : (Number.isFinite(options.secondaryDecimals) ? Number(options.secondaryDecimals) : defaultDigits);
            const secondaryDecimals = productionDecimals;
            const focusSeriesKey = normalizeUtilReportBuilderVizSeriesKey(options.focusSeriesKey);
            const isolatedSeriesKey = normalizeUtilReportBuilderVizSeriesKey(options.isolatedSeriesKey);
            const focusMonthKey = normalizeUtilReportMonthKey(options.focusMonthKey);
            const hasFocusSeries = !!focusSeriesKey;
            if (isolatedSeriesKey) {
                return renderUtilReportBuilderVizIsolatedChart(points, isolatedSeriesKey, options);
            }
            const seriesBaseColors = {
                usage: '#EAB308',
                cost: '#2563EB',
                production: '#DC2626'
            };
            const resolveSeriesColor = (seriesKey) => {
                const base = seriesBaseColors[seriesKey] || '#111827';
                return base;
            };
            const resolveSeriesOpacity = (seriesKey, activeOpacity = 0.88, dimOpacity = 0.24) => {
                if (!hasFocusSeries) return activeOpacity;
                return focusSeriesKey === seriesKey ? activeOpacity : dimOpacity;
            };
            const perSeriesBounds = options.perSeriesBounds === true;
            const pointSpacing = options.pointSpacing || 58;
            const minWidth = Number.isFinite(options.minWidth) ? options.minWidth : 0;
            const forcedWidth = Number(options.forceWidth);
            const width = Number.isFinite(forcedWidth) && forcedWidth > 0
                ? Math.floor(forcedWidth)
                : Math.max(minWidth, points.length * pointSpacing);
            const height = Number.isFinite(options.height) ? Math.floor(options.height) : 360;

            const usageAxisOptions = perSeriesBounds
                ? { tightRange: true, tightPadding: 0.24, ...(options.usageAxisOptions || {}) }
                : options;
            const costAxisOptions = perSeriesBounds
                ? { tightRange: true, tightPadding: 0.24, ...(options.costAxisOptions || {}) }
                : options;
            const productionAxisOptions = perSeriesBounds
                ? { tightRange: true, tightPadding: 0.2, ...(options.productionAxisOptions || {}) }
                : (options.secondaryAxisOptions || {});

            const usageBounds = getUtilChartAxisBounds(usageValues.length ? usageValues : [0], usageAxisOptions);
            const costBounds = getUtilChartAxisBounds(costValues.length ? costValues : [0], costAxisOptions);
            const productionBounds = getUtilChartAxisBounds(productionValues.length ? productionValues : [0], productionAxisOptions);
            const usageMinVal = usageBounds.min;
            const usageMaxVal = usageBounds.max;
            const costMinVal = costBounds.min;
            const costMaxVal = costBounds.max;
            const productionMinVal = productionBounds.min;
            const productionMaxVal = productionBounds.max;
            const primarySeriesKey = usageValues.length
                ? 'usage'
                : (costValues.length ? 'cost' : 'production');
            const primaryMinVal = primarySeriesKey === 'cost'
                ? costMinVal
                : (primarySeriesKey === 'production' ? productionMinVal : usageMinVal);
            const primaryMaxVal = primarySeriesKey === 'cost'
                ? costMaxVal
                : (primarySeriesKey === 'production' ? productionMaxVal : usageMaxVal);
            const primaryRange = primaryMaxVal - primaryMinVal || 1;
            const primaryDigits = primarySeriesKey === 'usage'
                ? usageDecimals
                : (primarySeriesKey === 'cost' ? costDecimals : productionDecimals);

            const axisFontSize = Number.isFinite(options.axisFontSize) ? options.axisFontSize : 13;
            const yLabelOffset = Number.isFinite(options.yLabelOffset) ? options.yLabelOffset : 16;
            const leftPad = getUtilChartLeftPad(primaryMinVal, primaryMaxVal, primaryDigits, {
                fallback: 170,
                minPad: 186,
                fontSize: axisFontSize,
                anchorOffset: yLabelOffset,
                extra: 36
            });
            const rightPadEstimate = enableProduction && primarySeriesKey !== 'production'
                ? getUtilChartLeftPad(productionMinVal, productionMaxVal, secondaryDecimals, {
                fallback: 104,
                minPad: 120,
                fontSize: axisFontSize,
                anchorOffset: 12,
                extra: 18
                })
                : 0;
            const pad = {
                left: leftPad,
                right: Math.max(48, rightPadEstimate > 0 ? (rightPadEstimate + 22) : 48),
                top: 24,
                bottom: 96
            };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const usageRange = usageMaxVal - usageMinVal || 1;
            const costRange = costMaxVal - costMinVal || 1;
            const productionRange = productionMaxVal - productionMinVal || 1;
            const xStep = points.length > 1 ? plotW / (points.length - 1) : 0;
            const mapX = (index) => pad.left + (points.length > 1 ? xStep * index : plotW / 2);
            const mapUsageY = (value) => pad.top + ((usageMaxVal - value) / usageRange) * plotH;
            const mapCostY = (value) => pad.top + ((costMaxVal - value) / costRange) * plotH;
            const mapProductionY = (value) => pad.top + ((productionMaxVal - value) / productionRange) * plotH;
            const mapPrimaryY = (value) => {
                if (primarySeriesKey === 'cost') return mapCostY(value);
                if (primarySeriesKey === 'production') return mapProductionY(value);
                return mapUsageY(value);
            };
            const usageBaseValue = (usageMinVal <= 0 && usageMaxVal >= 0) ? 0 : usageMinVal;
            const costBaseValue = (costMinVal <= 0 && costMaxVal >= 0) ? 0 : costMinVal;
            const productionBaseValue = (productionMinVal <= 0 && productionMaxVal >= 0) ? 0 : productionMinVal;
            const usageBaseY = mapUsageY(usageBaseValue);
            const costBaseY = mapCostY(costBaseValue);
            const productionBaseY = mapProductionY(productionBaseValue);
            const primaryBaseY = mapPrimaryY(primarySeriesKey === 'cost'
                ? costBaseValue
                : (primarySeriesKey === 'production' ? productionBaseValue : usageBaseValue));
            const hitZoneBaseY = Math.max(
                enableUsage ? usageBaseY : primaryBaseY,
                enableCost ? costBaseY : primaryBaseY,
                enableProduction ? productionBaseY : primaryBaseY
            );

            const tickCount = Number.isFinite(options.tickCount) ? Math.max(2, Math.floor(options.tickCount)) : (isModal ? 3 : 4);
            const primaryGridLines = Array.from({ length: tickCount + 1 }).map((_, index) => {
                const value = primaryMaxVal - (primaryRange * (index / tickCount));
                const y = mapPrimaryY(value);
                return `
                    <line class="util-analytics-chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />
                    <text class="util-analytics-chart-label" x="${pad.left - yLabelOffset}" y="${y + 4}" text-anchor="end">${formatUtilNumber(value, primaryDigits)}</text>
                `;
            }).join('');
            const secondaryTickLabels = !enableProduction || primarySeriesKey === 'production' ? '' : Array.from({ length: tickCount + 1 }).map((_, index) => {
                const value = productionMaxVal - (productionRange * (index / tickCount));
                const y = mapProductionY(value);
                return `<text class="util-analytics-chart-label" x="${width - pad.right + 12}" y="${y + 4}" text-anchor="start">${formatUtilNumber(value, secondaryDecimals)}</text>`;
            }).join('');
            const focusTickLabels = !hasFocusSeries
                ? ''
                : Array.from({ length: tickCount + 1 }).map((_, index) => {
                    const tickColor = resolveSeriesColor(focusSeriesKey);
                    let value = 0;
                    let y = pad.top;
                    let x = pad.left - yLabelOffset;
                    let anchor = 'end';
                    let digits = usageDecimals;
                    if (focusSeriesKey === 'usage') {
                        value = usageMaxVal - (usageRange * (index / tickCount));
                        y = mapUsageY(value);
                        digits = usageDecimals;
                    } else if (focusSeriesKey === 'cost') {
                        value = costMaxVal - (costRange * (index / tickCount));
                        y = mapCostY(value);
                        digits = costDecimals;
                    } else {
                        value = productionMaxVal - (productionRange * (index / tickCount));
                        y = mapProductionY(value);
                        x = width - pad.right + 12;
                        anchor = 'start';
                        digits = productionDecimals;
                    }
                    return `<text class="util-analytics-chart-label" x="${x}" y="${y + 4}" text-anchor="${anchor}" style="fill:${tickColor};font-weight:900;">${formatUtilNumber(value, digits)}</text>`;
                }).join('');

            const yearGroups = [];
            let currentYear = null;
            let yearStart = 0;
            points.forEach((point, index) => {
                const year = getUtilChartPointYear(point, point.label);
                if (year !== currentYear) {
                    if (currentYear !== null) {
                        yearGroups.push({ year: currentYear, start: yearStart, end: index - 1 });
                    }
                    currentYear = year;
                    yearStart = index;
                }
            });
            if (currentYear !== null) {
                yearGroups.push({ year: currentYear, start: yearStart, end: points.length - 1 });
            }
            const yearBands = yearGroups.map(group => {
                const left = group.start === 0
                    ? pad.left
                    : (mapX(group.start - 1) + mapX(group.start)) / 2;
                const right = group.end === points.length - 1
                    ? (width - pad.right)
                    : (mapX(group.end) + mapX(group.end + 1)) / 2;
                const yearLabelX = (left + right) / 2;
                const sepLine = group.start === 0
                    ? ''
                    : `<line class="util-analytics-chart-year-sep" x1="${left}" y1="${pad.top}" x2="${left}" y2="${hitZoneBaseY}" />`;
                const yearLabel = group.year
                    ? `<text class="util-analytics-chart-year" x="${yearLabelX}" y="${pad.top + 16}" text-anchor="middle">${escapeHtml(group.year)}</text>`
                    : '';
                return `${sepLine}${yearLabel}`;
            }).join('');
            const focusMonthOverlay = !focusMonthKey
                ? ''
                : (() => {
                    const targetIndex = points.findIndex(point => getUtilChartPointMonthKey(point, point.label) === focusMonthKey);
                    if (targetIndex < 0) return '';
                    const x = mapX(targetIndex);
                    const left = targetIndex === 0 ? pad.left : (mapX(targetIndex - 1) + x) / 2;
                    const right = targetIndex === points.length - 1 ? width - pad.right : (x + mapX(targetIndex + 1)) / 2;
                    const rectWidth = Math.max(0, right - left);
                    if (rectWidth <= 0.5) return '';
                    return `
                        <rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${plotH}" fill="rgba(37, 99, 235, 0.12)"></rect>
                        <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${hitZoneBaseY}" stroke="rgba(37, 99, 235, 0.4)" stroke-width="1.3" stroke-dasharray="4 4"></line>
                    `;
                })();

            const labelEvery = points.length > 24 ? 2 : 1;
            const xLabels = points.map((point, index) => {
                if (index !== 0 && index !== points.length - 1 && index % labelEvery !== 0) return '';
                const x = mapX(index);
                const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                return `<text class="util-analytics-chart-label" x="${x}" y="${height - 12}" text-anchor="middle"${monthAttr}>${escapeHtml(point.label)}</text>`;
            }).join('');

            const buildMonthAttr = (point, seriesKey = '') => {
                return buildUtilChartPointDataAttrs(point, point.label, { seriesKey });
            };
            const buildSeriesAttr = (seriesKey = '') => {
                if (!seriesKey) return '';
                return ` data-role="util-chart-month-hit" data-series-key="${escapeHtml(seriesKey)}"`;
            };
            const barSeriesKeys = [];
            if (usageChartType === 'bar') barSeriesKeys.push('usage');
            if (costChartType === 'bar') barSeriesKeys.push('cost');
            if (productionChartType === 'bar') barSeriesKeys.push('production');
            const barIndexMap = {};
            barSeriesKeys.forEach((key, index) => { barIndexMap[key] = index; });
            const barCount = Math.max(1, barSeriesKeys.length);
            const barGroupWidth = xStep > 0 ? Math.min(44, xStep * 0.72) : 30;
            const barWidth = barSeriesKeys.length
                ? Math.max(8, Math.min(22, barGroupWidth / barCount))
                : 0;
            const resolveBarLeft = (seriesKey, index) => {
                const xCenter = mapX(index);
                if (!barSeriesKeys.length) return xCenter;
                const totalWidth = barWidth * barSeriesKeys.length;
                const offset = (barIndexMap[seriesKey] || 0) * barWidth;
                return xCenter - (totalWidth / 2) + offset;
            };
            const usageColor = resolveSeriesColor('usage');
            const costColor = resolveSeriesColor('cost');
            const productionColor = resolveSeriesColor('production');
            const usageBars = usageChartType !== 'bar' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.usage)) return '';
                const left = resolveBarLeft('usage', index);
                const y = mapUsageY(point.usage);
                const rectTop = Math.min(usageBaseY, y);
                const heightVal = Math.abs(usageBaseY - y);
                if (heightVal <= 0.5) return '';
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${heightVal}" rx="6" ry="6" fill="${usageColor}" opacity="${isFocusMonth ? 1 : resolveSeriesOpacity('usage', 0.9, 0.22)}" stroke="${isFocusMonth ? '#1d4ed8' : 'rgba(15, 23, 42, 0.12)'}" stroke-width="${isFocusMonth ? 1.6 : 0.8}"${buildMonthAttr(point, 'usage')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.usage, usageDecimals)}`)}</title></rect>`;
            }).join('');
            const costBars = costChartType !== 'bar' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.cost)) return '';
                const left = resolveBarLeft('cost', index);
                const y = mapCostY(point.cost);
                const rectTop = Math.min(costBaseY, y);
                const heightVal = Math.abs(costBaseY - y);
                if (heightVal <= 0.5) return '';
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${heightVal}" rx="6" ry="6" fill="${costColor}" opacity="${isFocusMonth ? 1 : resolveSeriesOpacity('cost', 0.86, 0.22)}" stroke="${isFocusMonth ? '#1d4ed8' : 'rgba(15, 23, 42, 0.12)'}" stroke-width="${isFocusMonth ? 1.6 : 0.8}"${buildMonthAttr(point, 'cost')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.cost, costDecimals)}`)}</title></rect>`;
            }).join('');
            const productionBars = productionChartType !== 'bar' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.production)) return '';
                const left = resolveBarLeft('production', index);
                const y = mapProductionY(point.production);
                const rectTop = Math.min(productionBaseY, y);
                const heightVal = Math.abs(productionBaseY - y);
                if (heightVal <= 0.5) return '';
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${heightVal}" rx="6" ry="6" fill="${productionColor}" opacity="${isFocusMonth ? 1 : resolveSeriesOpacity('production', 0.84, 0.22)}" stroke="${isFocusMonth ? '#1d4ed8' : 'rgba(15, 23, 42, 0.12)'}" stroke-width="${isFocusMonth ? 1.6 : 0.8}"${buildMonthAttr(point, 'production')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.production, secondaryDecimals)}`)}</title></rect>`;
            }).join('');

            const buildLinePath = (valueKey, mapFn) => {
                let path = '';
                let startNew = true;
                points.forEach((point, index) => {
                    const value = Number(point?.[valueKey]);
                    if (!Number.isFinite(value)) {
                        startNew = true;
                        return;
                    }
                    const x = mapX(index);
                    const y = mapFn(value);
                    if (startNew) {
                        path += `M ${x} ${y}`;
                        startNew = false;
                    } else {
                        path += ` L ${x} ${y}`;
                    }
                });
                return path;
            };
            const usagePath = usageChartType === 'line' ? buildLinePath('usage', mapUsageY) : '';
            const costPath = costChartType === 'line' ? buildLinePath('cost', mapCostY) : '';
            const productionPath = productionChartType === 'line' ? buildLinePath('production', mapProductionY) : '';
            const usagePathHit = usagePath
                ? `<path d="${usagePath}" stroke="rgba(255,255,255,0.001)" stroke-width="18" stroke-linecap="round" fill="none" pointer-events="stroke"${buildSeriesAttr('usage')}></path>`
                : '';
            const costPathHit = costPath
                ? `<path d="${costPath}" stroke="rgba(255,255,255,0.001)" stroke-width="18" stroke-linecap="round" fill="none" pointer-events="stroke"${buildSeriesAttr('cost')}></path>`
                : '';
            const productionPathHit = productionPath
                ? `<path d="${productionPath}" stroke="rgba(255,255,255,0.001)" stroke-width="18" stroke-linecap="round" fill="none" pointer-events="stroke"${buildSeriesAttr('production')}></path>`
                : '';
            const buildLinePointHitCircles = (valueKey, mapFn, seriesKey) => points.map((point, index) => {
                const value = Number(point?.[valueKey]);
                if (!Number.isFinite(value)) return '';
                const x = mapX(index);
                const y = mapFn(value);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<circle cx="${x}" cy="${y}" r="${isFocusMonth ? 12 : 10}" fill="rgba(255,255,255,0.001)" stroke="none" pointer-events="all"${buildMonthAttr(point, seriesKey)}></circle>`;
            }).join('');
            const usagePointHits = usageChartType === 'line'
                ? buildLinePointHitCircles('usage', mapUsageY, 'usage')
                : '';
            const costPointHits = costChartType === 'line'
                ? buildLinePointHitCircles('cost', mapCostY, 'cost')
                : '';
            const productionPointHits = productionChartType === 'line'
                ? buildLinePointHitCircles('production', mapProductionY, 'production')
                : '';

            const usagePointsSvg = usageChartType !== 'line' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.usage)) return '';
                const x = mapX(index);
                const y = mapUsageY(point.usage);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<circle class="util-analytics-chart-point" cx="${x}" cy="${y}" r="${isFocusMonth ? 7 : 5}" style="fill:${usageColor};opacity:${resolveSeriesOpacity('usage', 1, 0.26)};" stroke="${isFocusMonth ? '#1d4ed8' : '#ffffff'}" stroke-width="${isFocusMonth ? 2 : 1}"${buildMonthAttr(point, 'usage')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.usage, usageDecimals)}`)}</title></circle>`;
            }).join('');
            const costPointsSvg = costChartType !== 'line' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.cost)) return '';
                const x = mapX(index);
                const y = mapCostY(point.cost);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<circle class="util-analytics-chart-point" cx="${x}" cy="${y}" r="${isFocusMonth ? 7 : 5}" style="fill:${costColor};opacity:${resolveSeriesOpacity('cost', 1, 0.26)};" stroke="${isFocusMonth ? '#1d4ed8' : '#ffffff'}" stroke-width="${isFocusMonth ? 2 : 1}"${buildMonthAttr(point, 'cost')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.cost, costDecimals)}`)}</title></circle>`;
            }).join('');
            const productionPointsSvg = productionChartType !== 'line' ? '' : points.map((point, index) => {
                if (!Number.isFinite(point.production)) return '';
                const x = mapX(index);
                const y = mapProductionY(point.production);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<circle class="util-analytics-chart-point" cx="${x}" cy="${y}" r="${isFocusMonth ? 7 : 5}" style="fill:${productionColor};opacity:${resolveSeriesOpacity('production', 1, 0.26)};" stroke="${isFocusMonth ? '#1d4ed8' : '#ffffff'}" stroke-width="${isFocusMonth ? 2 : 1}"${buildMonthAttr(point, 'production')}><title>${escapeHtml(`${point.label} · ${formatUtilNumber(point.production, secondaryDecimals)}`)}</title></circle>`;
            }).join('');

            const showUsageLabels = showLabels && (!hasFocusSeries || focusSeriesKey === 'usage');
            const showCostLabels = showLabels && (!hasFocusSeries || focusSeriesKey === 'cost');
            const showProductionLabels = showLabels && (!hasFocusSeries || focusSeriesKey === 'production');
            const usageLabels = showUsageLabels ? points.map((point, index) => {
                if (!Number.isFinite(point.usage)) return '';
                const x = usageChartType === 'bar'
                    ? resolveBarLeft('usage', index) + (barWidth / 2)
                    : mapX(index);
                const y = mapUsageY(point.usage);
                const labelY = usageChartType === 'bar'
                    ? Math.max(pad.top + 12, Math.min(usageBaseY, y) - 6)
                    : Math.max(pad.top + 12, y - 8);
                return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle" style="fill:${usageColor};opacity:${resolveSeriesOpacity('usage', 1, 0.28)};"${buildMonthAttr(point, 'usage')}>${formatUtilNumber(point.usage, usageDecimals)}</text>`;
            }).join('') : '';
            const costLabels = showCostLabels ? points.map((point, index) => {
                if (!Number.isFinite(point.cost)) return '';
                const x = costChartType === 'bar'
                    ? resolveBarLeft('cost', index) + (barWidth / 2)
                    : mapX(index);
                const y = mapCostY(point.cost);
                const labelY = costChartType === 'bar'
                    ? Math.max(pad.top + 12, Math.min(costBaseY, y) - 6)
                    : Math.max(pad.top + 12, y - 10);
                return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle" style="fill:${costColor};opacity:${resolveSeriesOpacity('cost', 1, 0.28)};"${buildMonthAttr(point, 'cost')}>${formatUtilNumber(point.cost, costDecimals)}</text>`;
            }).join('') : '';
            const productionLabels = showProductionLabels ? points.map((point, index) => {
                if (!Number.isFinite(point.production)) return '';
                const x = productionChartType === 'bar'
                    ? resolveBarLeft('production', index) + (barWidth / 2)
                    : mapX(index);
                const y = mapProductionY(point.production);
                const labelY = productionChartType === 'bar'
                    ? Math.max(pad.top + 12, Math.min(productionBaseY, y) - 6)
                    : Math.max(pad.top + 14, y + 14);
                return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle" style="fill:${productionColor};opacity:${resolveSeriesOpacity('production', 1, 0.28)};"${buildMonthAttr(point, 'production')}>${formatUtilNumber(point.production, secondaryDecimals)}</text>`;
            }).join('') : '';

            const monthHitZones = points.map((point, index) => {
                const monthToken = getUtilChartPointMonthToken(point, point.label);
                if (!monthToken) return '';
                const left = index === 0
                    ? pad.left
                    : (mapX(index - 1) + mapX(index)) / 2;
                const right = index === points.length - 1
                    ? width - pad.right
                    : (mapX(index) + mapX(index + 1)) / 2;
                const rectWidth = Math.max(0, right - left);
                const rectHeight = Math.max(0, plotH);
                if (rectWidth <= 0.5 || rectHeight <= 0.5) return '';
                return `<rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${rectHeight}" fill="rgba(0, 0, 0, 0.001)"${buildMonthAttr(point)}></rect>`;
            }).join('');

            const topCenterTitle = options.topCenterTitle
                ? `<div class="util-analytics-chart-top-title">${escapeHtml(options.topCenterTitle)}</div>`
                : '';
            const chartTypeLabel = (type) => (type === 'line' ? '선' : (type === 'none' ? '없음' : '막대'));
            const legendItems = [
                { key: 'usage', color: usageColor, label: options.usageLabel || '사용량', type: usageChartType },
                { key: 'cost', color: costColor, label: options.costLabel || '비용', type: costChartType },
                { key: 'production', color: productionColor, label: options.productionLabel || '생산량', type: productionChartType }
            ];
            const legend = `
                <div class="util-analytics-chart-legend">
                    ${legendItems.map(item => {
                        const isActive = hasFocusSeries && focusSeriesKey === item.key;
                        const isDim = hasFocusSeries && focusSeriesKey !== item.key;
                        const cls = `util-analytics-chart-legend-item${isActive ? ' is-active' : ''}${isDim ? ' is-dim' : ''}`;
                        return `<button type="button" class="${cls}" data-role="util-report-builder-viz-series-item" data-series-key="${item.key}" title="더블클릭: ${escapeHtml(item.label)}만 단일 보기"><i style="background:${item.color};"></i>${escapeHtml(item.label)} (${chartTypeLabel(item.type)})</button>`;
                    }).join('')}
                </div>
            `;
            const activeRangeSeriesKey = focusSeriesKey || isolatedSeriesKey;
            const rangeMeta = !perSeriesBounds || !activeRangeSeriesKey ? '' : (() => {
                if (activeRangeSeriesKey === 'usage') {
                    return `
                        <div class="util-analytics-chart-meta-row">
                            <span class="util-analytics-chart-period">사용량 ${formatUtilNumber(usageMinVal, usageDecimals)} ~ ${formatUtilNumber(usageMaxVal, usageDecimals)}</span>
                        </div>
                    `;
                }
                if (activeRangeSeriesKey === 'cost') {
                    return `
                        <div class="util-analytics-chart-meta-row">
                            <span class="util-analytics-chart-period">비용 ${formatUtilNumber(costMinVal, costDecimals)} ~ ${formatUtilNumber(costMaxVal, costDecimals)}</span>
                        </div>
                    `;
                }
                return `
                    <div class="util-analytics-chart-meta-row">
                        <span class="util-analytics-chart-period">생산량 ${formatUtilNumber(productionMinVal, secondaryDecimals)} ~ ${formatUtilNumber(productionMaxVal, secondaryDecimals)}</span>
                    </div>
                `;
            })();
            const axisXTitle = String(options.axisXLabel || '월').trim();
            const axisYTitle = String(options.axisYLabel || '').trim();
            const axisYSecondaryTitle = String(options.secondaryAxisLabel || '').trim();
            const axisTitleXPos = Math.max(10, pad.left - 120);
            const axisTitleXText = axisXTitle
                ? `<text class="util-analytics-chart-axis-title" x="${axisTitleXPos}" y="${height - 8}" text-anchor="start">${escapeHtml(axisXTitle)}</text>`
                : '';
            const axisTitleYText = axisYTitle
                ? `<text class="util-analytics-chart-axis-title" x="18" y="${pad.top + (plotH / 2)}" text-anchor="middle" transform="rotate(-90 18 ${pad.top + (plotH / 2)})">${escapeHtml(axisYTitle)}</text>`
                : '';
            const axisTitleYSecondaryText = axisYSecondaryTitle
                ? `<text class="util-analytics-chart-axis-title" x="${width - 18}" y="${pad.top + (plotH / 2)}" text-anchor="middle" transform="rotate(90 ${width - 18} ${pad.top + (plotH / 2)})">${escapeHtml(axisYSecondaryTitle)}</text>`
                : '';

            return `
                <div class="util-analytics-chart is-modal" style="--chart-width:${width}px; --chart-height:${height}px; min-height:${height + 220}px;">
                    ${topCenterTitle}
                    ${legend}
                    ${rangeMeta}
                    <div class="util-analytics-chart-canvas">
                        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:block;" role="img" aria-label="사용량, 비용, 생산량 통합 그래프">
                            ${yearBands}
                            ${focusMonthOverlay}
                            ${primaryGridLines}
                            ${secondaryTickLabels}
                            ${focusTickLabels}
                            <line class="util-analytics-chart-axis" x1="${pad.left}" y1="${usageBaseY}" x2="${width - pad.right}" y2="${usageBaseY}" />
                            ${perSeriesBounds ? `<line class="util-analytics-chart-axis" x1="${pad.left}" y1="${costBaseY}" x2="${width - pad.right}" y2="${costBaseY}" style="stroke:${costColor};stroke-dasharray:4 4;opacity:${resolveSeriesOpacity('cost', 0.45, 0.18)};" />` : ''}
                            ${monthHitZones}
                            ${usageBars}
                            ${costBars}
                            ${productionBars}
                            ${usagePathHit}
                            ${costPathHit}
                            ${productionPathHit}
                            ${usagePointHits}
                            ${costPointHits}
                            ${productionPointHits}
                            ${usagePath ? `<path class="util-analytics-chart-line" d="${usagePath}" stroke="${usageColor}" stroke-width="2.8" fill="none" opacity="${resolveSeriesOpacity('usage', 1, 0.28)}"></path>` : ''}
                            ${costPath ? `<path class="util-analytics-chart-line" d="${costPath}" stroke="${costColor}" stroke-width="2.8" fill="none" opacity="${resolveSeriesOpacity('cost', 1, 0.28)}"></path>` : ''}
                            ${productionPath ? `<path class="util-analytics-chart-line" d="${productionPath}" stroke="${productionColor}" stroke-width="2.8" fill="none" stroke-dasharray="6 4" opacity="${resolveSeriesOpacity('production', 1, 0.28)}"></path>` : ''}
                            ${usagePointsSvg}
                            ${costPointsSvg}
                            ${productionPointsSvg}
                            ${usageLabels}
                            ${costLabels}
                            ${productionLabels}
                            ${xLabels}
                            ${axisTitleXText}
                            ${axisTitleYText}
                            ${axisTitleYSecondaryText}
                        </svg>
                    </div>
                </div>
            `;
        }

        function renderUtilIndependentBoundsMultiSeriesChart(seriesList, options = {}) {
            const isModal = options.mode === 'modal';
            const frameExtraHeight = Number.isFinite(options.frameExtraHeight) ? Number(options.frameExtraHeight) : (isModal ? 176 : 92);
            const showLabels = options.showLabels === true && options.tooltipOnly !== true;
            const hideHeader = options.hideHeader === true;
            const hideUnit = options.hideUnit === true;
            const axisXLabel = String(options.axisXLabel || '').trim();
            const chartTitle = options.chartTitle || '통합 그래프';
            const topCenterTitle = options.topCenterTitle
                ? `<div class="util-analytics-chart-top-title">${escapeHtml(options.topCenterTitle)}</div>`
                : '';
            const periodLabel = String(options.periodLabel || '').trim();
            const inlinePeriodLegend = options.inlinePeriodLegend === true;
            const filteredSeries = (Array.isArray(seriesList) ? seriesList : [])
                .filter(item => item && Array.isArray(item.points) && item.points.length)
                .map((item, index) => ({
                    ...item,
                    label: String(item.label || `그래프 ${index + 1}`).trim(),
                    color: item.color || UTIL_CHART_COLORS[index % UTIL_CHART_COLORS.length],
                    type: normalizeUtilReportBuilderVizChartType(item.type || 'line'),
                    decimals: Number.isFinite(item.decimals)
                        ? Number(item.decimals)
                        : (Number.isFinite(options.decimals) ? Number(options.decimals) : 0),
                    lineWidth: Number.isFinite(item.lineWidth) ? Number(item.lineWidth) : 3
                }));
            if (!filteredSeries.length) {
                return renderUtilTrendChart([], '', options);
            }

            const labels = filteredSeries[0].points.map(point => point?.label || '');
            const pointCount = labels.length;
            if (!pointCount) {
                return renderUtilTrendChart([], '', options);
            }

            const pointSpacing = Number.isFinite(options.pointSpacing) ? Number(options.pointSpacing) : (isModal ? 86 : 64);
            const minWidth = Number.isFinite(options.minWidth) ? Number(options.minWidth) : 900;
            const forcedWidth = Number(options.forceWidth);
            const width = Number.isFinite(forcedWidth) && forcedWidth > 0
                ? Math.floor(forcedWidth)
                : Math.max(minWidth, pointCount * pointSpacing);
            const height = Number.isFinite(options.height)
                ? Math.floor(options.height)
                : (isModal ? 560 : 360);
            const pad = {
                left: Number.isFinite(options.leftPad) ? Number(options.leftPad) : (isModal ? 72 : 56),
                right: Number.isFinite(options.rightPad) ? Number(options.rightPad) : (isModal ? 44 : 26),
                top: Number.isFinite(options.topPad) ? Number(options.topPad) : (isModal ? 30 : 28),
                bottom: Number.isFinite(options.bottomPad)
                    ? Number(options.bottomPad)
                    : (axisXLabel ? (isModal ? 118 : 68) : (isModal ? 86 : 54))
            };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const xStep = pointCount > 1 ? plotW / (pointCount - 1) : 0;
            const mapX = (index) => pad.left + (pointCount > 1 ? xStep * index : plotW / 2);
            const axisOptionsBySeries = options.perSeriesAxisOptions && typeof options.perSeriesAxisOptions === 'object'
                ? options.perSeriesAxisOptions
                : {};
            const defaultAxisOptions = {
                tightRange: options.tightRange !== false,
                tightPadding: Number.isFinite(options.tightPadding) ? Number(options.tightPadding) : 0.16,
                ...(options.seriesAxisOptions || {})
            };

            const series = filteredSeries.map(item => {
                const values = item.points
                    .map(point => Number(point?.value))
                    .filter(value => Number.isFinite(value));
                const axisOptions = {
                    ...defaultAxisOptions,
                    ...((axisOptionsBySeries[item.seriesKey] && typeof axisOptionsBySeries[item.seriesKey] === 'object')
                        ? axisOptionsBySeries[item.seriesKey]
                        : {})
                };
                const bounds = values.length ? getUtilChartAxisBounds(values, axisOptions) : { min: 0, max: 1 };
                const minVal = Number.isFinite(bounds?.min) ? Number(bounds.min) : 0;
                const maxVal = Number.isFinite(bounds?.max) ? Number(bounds.max) : 1;
                const valueRange = maxVal - minVal || 1;
                const baseValue = (minVal <= 0 && maxVal >= 0) ? 0 : minVal;
                return {
                    ...item,
                    minVal,
                    maxVal,
                    valueRange,
                    baseValue,
                    baseY: pad.top + ((maxVal - baseValue) / valueRange) * plotH,
                    mapY(value) {
                        return pad.top + ((maxVal - value) / valueRange) * plotH;
                    }
                };
            });

            const tickCount = Number.isFinite(options.tickCount) ? Math.max(2, Math.floor(options.tickCount)) : 4;
            const gridLines = Array.from({ length: tickCount + 1 }).map((_, index) => {
                const y = pad.top + ((plotH * index) / tickCount);
                return `<line class="util-analytics-chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />`;
            }).join('');

            const showYearBands = options.showYearBands !== false;
            const yearGroups = [];
            let currentYear = null;
            let yearStart = 0;
            filteredSeries[0].points.forEach((point, index) => {
                const year = getUtilChartPointYear(point, point?.label || '');
                if (year !== currentYear) {
                    if (currentYear !== null) {
                        yearGroups.push({ year: currentYear, start: yearStart, end: index - 1 });
                    }
                    currentYear = year;
                    yearStart = index;
                }
            });
            if (currentYear !== null) {
                yearGroups.push({ year: currentYear, start: yearStart, end: pointCount - 1 });
            }
            const yearBands = showYearBands ? yearGroups.map(group => {
                const left = group.start === 0
                    ? pad.left
                    : (mapX(group.start - 1) + mapX(group.start)) / 2;
                const right = group.end === pointCount - 1
                    ? (width - pad.right)
                    : (mapX(group.end) + mapX(group.end + 1)) / 2;
                const yearLabelX = (left + right) / 2;
                const sepLine = group.start === 0
                    ? ''
                    : `<line class="util-analytics-chart-year-sep" x1="${left}" y1="${pad.top}" x2="${left}" y2="${pad.top + plotH}" />`;
                const yearLabel = group.year
                    ? `<text class="util-analytics-chart-year" x="${yearLabelX}" y="${pad.top + 16}" text-anchor="middle">${escapeHtml(group.year)}</text>`
                    : '';
                return `${sepLine}${yearLabel}`;
            }).join('') : '';

            const barSeries = series.filter(item => item.type === 'bar');
            const lineSeries = series.filter(item => item.type !== 'bar');
            const barGroupWidth = xStep > 0
                ? Math.min(isModal ? 56 : 42, xStep * 0.74)
                : (isModal ? 36 : 28);
            const barWidth = barSeries.length
                ? Math.max(10, Math.min(isModal ? 24 : 18, barGroupWidth / barSeries.length))
                : 0;
            const resolveBarLeft = (seriesIndex, pointIndex) => {
                const xCenter = mapX(pointIndex);
                const totalWidth = barWidth * Math.max(1, barSeries.length);
                return xCenter - (totalWidth / 2) + (seriesIndex * barWidth);
            };

            const barRects = barSeries.map((item, seriesIndex) => item.points.map((point, pointIndex) => {
                const value = Number(point?.value);
                if (!Number.isFinite(value)) return '';
                const left = resolveBarLeft(seriesIndex, pointIndex);
                const y = item.mapY(value);
                const rectTop = Math.min(item.baseY, y);
                const rectHeight = Math.abs(item.baseY - y);
                if (rectHeight <= 0.5) return '';
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '', { seriesKey: item.seriesKey });
                const tooltipLabel = `${item.label} · ${point?.label || ''} · ${formatUtilNumber(value, item.decimals)}`;
                return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${rectHeight}" rx="6" ry="6" fill="${item.color}" opacity="0.86" stroke="rgba(15, 23, 42, 0.12)" stroke-width="0.8"${monthAttr}><title>${escapeHtml(tooltipLabel)}</title></rect>`;
            }).join('')).join('');

            const linePaths = lineSeries.map(item => {
                let path = '';
                let startNew = true;
                item.points.forEach((point, pointIndex) => {
                    const value = Number(point?.value);
                    if (!Number.isFinite(value)) {
                        startNew = true;
                        return;
                    }
                    const x = mapX(pointIndex);
                    const y = item.mapY(value);
                    if (startNew) {
                        path += `M ${x} ${y}`;
                        startNew = false;
                    } else {
                        path += ` L ${x} ${y}`;
                    }
                });
                const dash = item.lineDash ? ` stroke-dasharray="${item.lineDash}"` : '';
                return `<path class="util-analytics-chart-line" d="${path}" stroke="${item.color}" stroke-width="${item.lineWidth}" fill="none"${dash}></path>`;
            }).join('');

            const linePoints = lineSeries.map(item => item.points.map((point, pointIndex) => {
                const value = Number(point?.value);
                if (!Number.isFinite(value)) return '';
                const x = mapX(pointIndex);
                const y = item.mapY(value);
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '', { seriesKey: item.seriesKey });
                const tooltipLabel = `${item.label} · ${point?.label || ''} · ${formatUtilNumber(value, item.decimals)}`;
                return `<circle class="util-analytics-chart-point" cx="${x}" cy="${y}" r="4" style="fill:${item.color}"${monthAttr}><title>${escapeHtml(tooltipLabel)}</title></circle>`;
            }).join('')).join('');

            const barLabels = showLabels ? barSeries.map((item, seriesIndex) => item.points.map((point, pointIndex) => {
                const value = Number(point?.value);
                if (!Number.isFinite(value)) return '';
                const x = resolveBarLeft(seriesIndex, pointIndex) + (barWidth / 2);
                const y = item.mapY(value);
                const labelY = Math.max(pad.top + 12, Math.min(item.baseY, y) - 6);
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '', { seriesKey: item.seriesKey });
                return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle" style="fill:${item.color}"${monthAttr}>${formatUtilNumber(value, item.decimals)}</text>`;
            }).join('')).join('') : '';

            const lineLabels = showLabels ? lineSeries.map((item, seriesIndex) => item.points.map((point, pointIndex) => {
                const value = Number(point?.value);
                if (!Number.isFinite(value)) return '';
                const x = mapX(pointIndex);
                const y = item.mapY(value);
                const offset = seriesIndex % 2 === 0 ? -10 : 16;
                const labelY = Math.max(pad.top + 12, Math.min(pad.top + plotH - 6, y + offset));
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '', { seriesKey: item.seriesKey });
                return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle" style="fill:${item.color}"${monthAttr}>${formatUtilNumber(value, item.decimals)}</text>`;
            }).join('')).join('') : '';

            const maxXAxisLabels = Number.isFinite(options.maxXAxisLabels)
                ? Math.max(2, Math.floor(options.maxXAxisLabels))
                : (isModal ? 12 : 6);
            const labelEvery = Math.max(1, Math.ceil(pointCount / maxXAxisLabels));
            const xAxisLabelY = height - (isModal ? 48 : 20);
            const axisTitleY = height - (isModal ? 22 : 8);
            const xLabels = filteredSeries[0].points.map((point, pointIndex) => {
                if (pointIndex !== 0 && pointIndex !== pointCount - 1 && pointIndex % labelEvery !== 0) return '';
                const xBase = mapX(pointIndex);
                const isFirst = pointIndex === 0;
                const isLast = pointIndex === pointCount - 1;
                const edgeOffset = isModal ? 10 : 6;
                const x = isFirst ? (xBase + edgeOffset) : (isLast ? (xBase - edgeOffset) : xBase);
                const anchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '');
                return `<text class="util-analytics-chart-label" x="${x}" y="${xAxisLabelY}" text-anchor="${anchor}"${monthAttr}>${escapeHtml(point?.label || '')}</text>`;
            }).join('');

            const monthHitZones = filteredSeries[0].points.map((point, pointIndex) => {
                const monthAttr = buildUtilChartPointDataAttrs(point, point?.label || '');
                if (!monthAttr) return '';
                const left = pointIndex === 0
                    ? pad.left
                    : (mapX(pointIndex - 1) + mapX(pointIndex)) / 2;
                const right = pointIndex === pointCount - 1
                    ? width - pad.right
                    : (mapX(pointIndex) + mapX(pointIndex + 1)) / 2;
                const rectWidth = Math.max(0, right - left);
                if (rectWidth <= 0.5 || plotH <= 0.5) return '';
                return `<rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${plotH}" fill="rgba(0, 0, 0, 0.001)"${monthAttr}></rect>`;
            }).join('');

            const legend = filteredSeries.map(item => (
                `<span><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`
            )).join('');
            const legendClassName = `util-analytics-chart-legend${inlinePeriodLegend ? ' util-analytics-chart-legend-inline' : ''}`;
            const hasLegend = options.hideLegend === true ? false : (legend.length > 0);
            const periodBadge = periodLabel
                ? `<span class="util-analytics-chart-period">${escapeHtml(periodLabel)}</span>`
                : '';
            const chartMeta = inlinePeriodLegend
                ? ((periodBadge || hasLegend)
                    ? `<div class="util-analytics-chart-meta-row">${periodBadge}${hasLegend ? `<div class="${legendClassName}">${legend}</div>` : ''}</div>`
                    : '')
                : `${periodBadge ? `<div class="util-analytics-chart-meta-row">${periodBadge}</div>` : ''}${hasLegend ? `<div class="${legendClassName}">${legend}</div>` : ''}`;
            const rangeMeta = `
                <div class="util-analytics-chart-meta-row">
                    ${series.map(item => `<span class="util-analytics-chart-period">${escapeHtml(`${item.label} ${formatUtilNumber(item.minVal, item.decimals)} ~ ${formatUtilNumber(item.maxVal, item.decimals)}`)}</span>`).join('')}
                </div>
            `;
            const axisTitleXPos = Math.max(10, pad.left - 120);
            const axisTitleXText = axisXLabel
                ? `<text class="util-analytics-chart-axis-title" x="${axisTitleXPos}" y="${axisTitleY}" text-anchor="start">${escapeHtml(axisXLabel)}</text>`
                : '';
            const labelToggleText = String(options.labelToggleText || '').trim() || '레이블';
            const labelToggleRole = String(options.labelToggleRole || '').trim();
            const labelToggleAttrs = labelToggleRole
                ? ` data-role="${escapeHtml(labelToggleRole)}"`
                : ' data-chart-label-toggle';

            return `
                <div class="util-analytics-chart ${isModal ? 'is-modal' : ''}" style="--chart-width:${width}px; --chart-height:${height}px; min-height:${height + frameExtraHeight}px;">
                    ${hideHeader ? '' : `
                    <div class="util-analytics-chart-head">
                        <div class="util-analytics-chart-head-left">
                            <span class="util-analytics-chart-title"><i class="fa-solid fa-chart-line"></i> ${escapeHtml(chartTitle)}</span>
                            ${options.showLabelToggle ? `
                                <div class="util-analytics-chart-controls">
                                    <label class="util-analytics-chart-checkbox">
                                        <input type="checkbox"${labelToggleAttrs} ${showLabels ? 'checked' : ''} />
                                        ${escapeHtml(labelToggleText)}
                                    </label>
                                </div>
                            ` : ''}
                        </div>
                        ${hideUnit ? '' : `<span class="util-analytics-chart-unit">${escapeHtml(options.unitLabel || '')}</span>`}
                    </div>`}
                    ${topCenterTitle}
                    ${chartMeta}
                    ${rangeMeta}
                    <div class="util-analytics-chart-canvas">
                        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:block;overflow:visible;" role="img" aria-label="${escapeHtml(chartTitle)}">
                            ${yearBands}
                            ${gridLines}
                            ${monthHitZones}
                            ${barRects}
                            ${barLabels}
                            ${linePaths}
                            ${linePoints}
                            ${lineLabels}
                            ${xLabels}
                            ${axisTitleXText}
                        </svg>
                    </div>
                </div>
            `;
        }

        function renderUtilReportBuilderCustomCharts(result) {
            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey);
            const metricKeys = normalizeUtilReportBuilderValueKeys(itemKey, UtilReportState.builderValueKeys);
            const showLabels = UtilReportState.showChartLabels === true;
            const chartBlocks = [];
            const modal = document.getElementById('util-report-modal');
            const chartWrapEl = modal?.querySelector?.('[data-role="util-report-modal-chart-wrap"]');
            const wrapClientWidth = chartWrapEl?.clientWidth || 0;
            const fitChartWidth = wrapClientWidth > 0
                ? Math.max(360, Math.floor(wrapClientWidth - 6))
                : null;

            const usageMetricKey = itemKey === 'gas'
                ? 'gas_usage'
                : (itemKey === 'waste' ? 'waste_usage' : 'electric_usage');
            const costMetricKey = itemKey === 'gas'
                ? 'gas_cost'
                : (itemKey === 'waste' ? 'waste_cost' : 'electric_cost');
            const compositeKeys = [usageMetricKey, costMetricKey, 'production'];
            const useComposite = compositeKeys.every(key => metricKeys.includes(key));
            if (useComposite) {
                const usagePoints = buildUtilReportMetricPoints(result, usageMetricKey, UtilReportState.unitKey);
                const costPoints = buildUtilReportMetricPoints(result, costMetricKey, UtilReportState.unitKey);
                const productionPoints = buildUtilReportMetricPoints(result, 'production', UtilReportState.unitKey);
                const hasComposite = [usagePoints, costPoints, productionPoints]
                    .some(points => points.some(point => Number.isFinite(point?.value)));
                if (hasComposite) {
                    chartBlocks.push(
                        renderUtilReportBuilderElectricCombinedChart(usagePoints, costPoints, productionPoints, {
                            showLabels,
                            decimals: UtilReportState.decimals,
                            secondaryDecimals: UtilReportState.decimals,
                            minWidth: 0,
                            forceWidth: fitChartWidth || undefined,
                            pointSpacing: 58,
                            height: 360,
                            topCenterTitle: '사용량·비용·생산량 통합 추이',
                            usageLabel: getUtilReportBuilderMetricTitle(usageMetricKey),
                            costLabel: getUtilReportBuilderMetricTitle(costMetricKey),
                            productionLabel: getUtilReportBuilderMetricTitle('production'),
                            axisXLabel: '월',
                            axisYLabel: `${getUtilReportBuilderMetricUnit(usageMetricKey)} · ${getUtilReportBuilderMetricUnit(costMetricKey)}`,
                            secondaryAxisLabel: getUtilReportBuilderMetricTitle('production')
                        })
                    );
                }
            }

            const singleMetricKeys = useComposite
                ? metricKeys.filter(metricKey => !compositeKeys.includes(metricKey))
                : metricKeys.slice();
            singleMetricKeys.forEach(metricKey => {
                const points = buildUtilReportMetricPoints(result, metricKey, UtilReportState.unitKey);
                const hasValue = points.some(point => Number.isFinite(point?.value));
                if (!hasValue) return;
                const chartType = String(metricKey || '').includes('_usage') ? 'bar' : 'line';
                chartBlocks.push(
                    renderUtilTrendChart(points, getUtilReportBuilderMetricUnit(metricKey), {
                        mode: 'modal',
                        chartType,
                        showTypeSelect: false,
                        showLabelToggle: false,
                        showLabels,
                        decimals: UtilReportState.decimals,
                        minWidth: 0,
                        forceWidth: fitChartWidth || undefined,
                        pointSpacing: 54,
                        height: 280,
                        topCenterTitle: getUtilReportBuilderMetricTitle(metricKey),
                        axisXLabel: '월',
                        axisYLabel: getUtilReportBuilderMetricTitle(metricKey),
                        axisXIcon: '📅',
                        axisYIcon: '📊'
                    })
                );
            });

            if (['electric', 'gas', 'waste'].includes(itemKey)) {
                const ratioConfig = resolveUtilReportBuilderVizRatioConfig(itemKey);
                const ratioMeta = buildUtilReportBuilderVizRatioMeta(
                    itemKey,
                    ratioConfig.numeratorMetric,
                    ratioConfig.denominatorMetric,
                    ratioConfig.useDenominator
                );
                const ratioPoints = Array.isArray(result?.rows)
                    ? result.rows.map(row => {
                        const numeratorRaw = Number(getUtilReportMetricValue(row, ratioConfig.numeratorMetric));
                        const denominatorRaw = Number(getUtilReportMetricValue(row, ratioConfig.denominatorMetric));
                        const numeratorScale = getUtilReportMetricScale(
                            ratioConfig.numeratorMetric,
                            UtilReportState.unitKey,
                            UtilReportState.productionUnitKey
                        );
                        const denominatorScale = getUtilReportMetricScale(
                            ratioConfig.denominatorMetric,
                            UtilReportState.unitKey,
                            UtilReportState.productionUnitKey
                        );
                        const numerator = Number.isFinite(numeratorRaw) ? (numeratorRaw / numeratorScale) : NaN;
                        const denominator = Number.isFinite(denominatorRaw) ? (denominatorRaw / denominatorScale) : NaN;
                        const value = ratioConfig.useDenominator === true
                            ? ((Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0)
                                ? (numerator / denominator)
                                : NaN)
                            : numerator;
                        return {
                            key: row?.monthKey,
                            label: formatUtilReportMonthShort(row?.monthKey),
                            value,
                            numerator,
                            denominator
                        };
                    })
                    : [];
                const hasRatio = ratioPoints.some(point => Number.isFinite(point?.value));
                if (hasRatio) {
                    chartBlocks.push(
                        renderUtilTrendChart(ratioPoints, ratioMeta.unitLabel, {
                            mode: 'modal',
                            chartType: 'line',
                            showTypeSelect: false,
                            showLabelToggle: false,
                            showLabels: true,
                            decimals: 3,
                            minWidth: 0,
                            forceWidth: fitChartWidth || undefined,
                            pointSpacing: 54,
                            height: 250,
                            topCenterTitle: formatUtilLabelWithUnit(ratioMeta.title, ratioMeta.unitLabel),
                            axisXLabel: '월',
                            axisYLabel: ratioMeta.axisLabel,
                            axisXIcon: '📅',
                            axisYIcon: '⚡'
                        })
                    );
                }
            }

            if (!chartBlocks.length) {
                return '<div class="util-analytics-chart util-analytics-chart-empty is-modal"><div class="util-analytics-chart-empty-text">선택한 값의 그래프 데이터가 없습니다.</div></div>';
            }
            return `<div class="util-report-custom-chart-stack">${chartBlocks.join('')}</div>`;
        }

        function renderUtilReportBuilderValueChecks(modal, itemKey, selectedValueKeys = []) {
            if (!modal) return;
            const wrap = modal.querySelector('[data-role="util-report-builder-value-wrap"]');
            if (!wrap) return;
            const options = getUtilReportBuilderValueOptions(itemKey);
            const normalizedValues = normalizeUtilReportBuilderValueKeys(itemKey, selectedValueKeys);
            wrap.innerHTML = options.map(option => {
                const checked = normalizedValues.includes(option.key) ? 'checked' : '';
                return `
                    <label class="util-report-builder-check">
                        <input type="checkbox" data-role="util-report-builder-value-check" value="${escapeHtml(option.key)}" ${checked} />
                        <span>${escapeHtml(option.label)}</span>
                    </label>
                `;
            }).join('');
        }

        function syncUtilReportBuilderStateFromReportState() {
            ensureUtilReportStateRange();
            const range = normalizeMonthRange(UtilReportState.from, UtilReportState.to);
            UtilReportBuilderState.from = range.start;
            UtilReportBuilderState.to = range.end;

            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportState.builderItemKey || UtilReportState.scopeKey);
            const scopedTeam = getUtilReportScopeTeamFilterByItem(itemKey, UtilReportState);
            const preferredTeam = scopedTeam && scopedTeam !== 'all'
                ? scopedTeam
                : (UtilReportBuilderState.team || '전체');
            UtilReportBuilderState.itemKey = itemKey;
            UtilReportBuilderState.team = normalizeUtilReportBuilderTeam(preferredTeam, itemKey);
            UtilReportBuilderState.valueKeys = normalizeUtilReportBuilderValueKeys(
                itemKey,
                UtilReportState.builderValueKeys
            );
        }

        function renderUtilReportBuilderTeamChecks(modal, itemKey, selectedTeam = '전체') {
            if (!modal) return;
            const wrap = modal.querySelector('[data-role="util-report-builder-team-wrap"]');
            if (!wrap) return;
            const normalizedItemKey = normalizeUtilReportBuilderItemKey(itemKey);
            const teamValue = normalizeUtilReportBuilderTeam(selectedTeam, normalizedItemKey);
            wrap.innerHTML = buildUtilReportBuilderTeamOptions(normalizedItemKey).map(team => {
                const checked = team === teamValue ? 'checked' : '';
                return `
                    <label class="util-report-builder-check">
                        <input type="checkbox" data-role="util-report-builder-team-check" value="${escapeHtml(team)}" ${checked} />
                        <span>${escapeHtml(team)}</span>
                    </label>
                `;
            }).join('');
        }

        function syncUtilReportBuilderModalControls(modal) {
            if (!modal) return;
            syncUtilReportBuilderStateFromReportState();
            const monthOptions = ensureUtilReportStateRange();
            const fromSelect = modal.querySelector('[data-role="util-report-builder-from"]');
            const toSelect = modal.querySelector('[data-role="util-report-builder-to"]');
            const monthHtml = monthOptions.map(item => `<option value="${item.value}">${item.label}</option>`).join('');
            if (fromSelect) {
                fromSelect.innerHTML = monthHtml;
                fromSelect.value = UtilReportBuilderState.from;
            }
            if (toSelect) {
                toSelect.innerHTML = monthHtml;
                toSelect.value = UtilReportBuilderState.to;
            }

            const itemKey = normalizeUtilReportBuilderItemKey(UtilReportBuilderState.itemKey);
            renderUtilReportBuilderTeamChecks(modal, itemKey, UtilReportBuilderState.team);
            modal.querySelectorAll('[data-role="util-report-builder-item-check"]').forEach(input => {
                input.checked = String(input.value || '').trim() === itemKey;
            });
            renderUtilReportBuilderValueChecks(modal, itemKey, UtilReportBuilderState.valueKeys);
        }
