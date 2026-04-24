        function renderUtilTrendChart(points, metricLabel, options = {}) {
            const decimals = Number.isFinite(options.decimals) ? options.decimals : null;
            const showLabels = options.showLabels !== false && options.tooltipOnly !== true;
            const isModal = options.mode === 'modal';
            const frameExtraHeight = Number.isFinite(options.frameExtraHeight) ? Number(options.frameExtraHeight) : (isModal ? 148 : 64);
            const hideHeader = options.hideHeader === true;
            const hideUnit = options.hideUnit === true;
            const axisXLabel = String(options.axisXLabel || '').trim();
            const axisYLabel = String(options.axisYLabel || '').trim();
            const axisXIcon = String(options.axisXIcon || '').trim();
            const axisYIcon = String(options.axisYIcon || '').trim();
            const chartTitle = options.chartTitle || '월별 추이';
            const focusMonthKey = normalizeUtilReportMonthKey(options.focusMonthKey);
            const topCenterTitle = options.topCenterTitle
                ? `<div class="util-analytics-chart-top-title">${escapeHtml(options.topCenterTitle)}</div>`
                : '';
            const periodLabel = String(options.periodLabel || '').trim();
            const periodRow = periodLabel
                ? `<div class="util-analytics-chart-meta-row"><span class="util-analytics-chart-period">${escapeHtml(periodLabel)}</span></div>`
                : '';
            const valid = points.filter(point => Number.isFinite(point.value));
            if (!valid.length) {
                return `
                    <div class="util-analytics-chart util-analytics-chart-single util-analytics-chart-empty ${isModal ? 'is-modal' : ''}">
                        ${hideHeader ? '' : `
                        <div class="util-analytics-chart-head">
                            <span><i class="fa-solid fa-chart-line"></i> ${escapeHtml(chartTitle)}</span>
                            ${hideUnit ? '' : `<span class="util-analytics-chart-unit">${escapeHtml(metricLabel || '')}</span>`}
                        </div>`}
                        ${topCenterTitle}
                        ${periodRow}
                        <div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div>
                    </div>
                `;
            }

            const pointSpacing = options.pointSpacing || 80;
            const minWidth = Number.isFinite(options.minWidth) ? options.minWidth : 1200;
            const forcedWidth = Number(options.forceWidth);
            const width = Number.isFinite(forcedWidth) && forcedWidth > 0
                ? Math.floor(forcedWidth)
                : (isModal ? Math.max(minWidth, points.length * pointSpacing) : 900);
            const height = isModal ? (options.height || 520) : 320;
            const bounds = getUtilChartAxisBounds(valid.map(point => Number(point.value)), options);
            const minVal = bounds.min;
            const maxVal = bounds.max;
            const axisFontSize = Number.isFinite(options.axisFontSize) ? options.axisFontSize : (isModal ? 13 : 12);
            const yLabelOffset = Number.isFinite(options.yLabelOffset) ? options.yLabelOffset : 14;
            const leftPad = getUtilChartLeftPad(minVal, maxVal, decimals, {
                fallback: isModal ? 170 : 74,
                minPad: isModal ? 190 : 78,
                fontSize: axisFontSize,
                anchorOffset: yLabelOffset,
                extra: isModal ? 40 : 12
            });
            const bottomPad = axisXLabel ? (isModal ? 126 : 68) : (isModal ? 84 : 52);
            const rightPad = Number.isFinite(options.rightPad) ? Number(options.rightPad) : (isModal ? 68 : 24);
            const pad = { left: leftPad, right: rightPad, top: isModal ? 30 : 30, bottom: bottomPad };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const valueRange = maxVal - minVal || 1;
            const xStep = points.length > 1 ? plotW / (points.length - 1) : 0;
            const mapX = (index) => pad.left + (points.length > 1 ? xStep * index : plotW / 2);
            const mapY = (value) => pad.top + ((maxVal - value) / valueRange) * plotH;
            const baselineValue = (minVal <= 0 && maxVal >= 0) ? 0 : minVal;
            const baseY = mapY(baselineValue);

            let linePath = '';
            let hasGap = false;
            let startNew = true;
            points.forEach((point, index) => {
                if (!Number.isFinite(point.value)) {
                    hasGap = true;
                    startNew = true;
                    return;
                }
                const x = mapX(index);
                const y = mapY(point.value);
                if (startNew) {
                    linePath += `M ${x} ${y}`;
                    startNew = false;
                } else {
                    linePath += ` L ${x} ${y}`;
                }
            });

            let areaPath = '';
            if (!hasGap && valid.length > 1) {
                const startX = mapX(0);
                const endX = mapX(points.length - 1);
                areaPath = `${linePath} L ${endX} ${baseY} L ${startX} ${baseY} Z`;
            }

            const tickCount = Number.isFinite(options.tickCount) ? Math.max(2, Math.floor(options.tickCount)) : (isModal ? 3 : 4);
            const gridLines = Array.from({ length: tickCount + 1 }).map((_, index) => {
                const value = maxVal - (valueRange * (index / tickCount));
                const y = mapY(value);
                return `
                    <line class="util-analytics-chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />
                    <text class="util-analytics-chart-label" x="${pad.left - yLabelOffset}" y="${y + 4}" text-anchor="end">${formatUtilNumber(value, decimals)}</text>
                `;
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

            const showYearBands = options.showYearBands !== false;
            const yearBands = showYearBands ? yearGroups.map((group, index) => {
                const left = group.start === 0
                    ? pad.left
                    : (mapX(group.start - 1) + mapX(group.start)) / 2;
                const right = group.end === points.length - 1
                    ? width - pad.right
                    : (mapX(group.end) + mapX(group.end + 1)) / 2;
                const band = '';
                const yearLabelX = (left + right) / 2;
                const yearLabel = group.year
                    ? `<text class="util-analytics-chart-year" x="${yearLabelX}" y="${pad.top + 16}" text-anchor="middle">${escapeHtml(group.year)}</text>`
                    : '';
                const sepLine = group.start === 0
                    ? ''
                    : `<line class="util-analytics-chart-year-sep" x1="${left}" y1="${pad.top}" x2="${left}" y2="${baseY}" />`;
                return `${band}${sepLine}${yearLabel}`;
            }).join('') : '';
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
                        <line x1="${x}" y1="${pad.top}" x2="${x}" y2="${baseY}" stroke="rgba(37, 99, 235, 0.4)" stroke-width="1.3" stroke-dasharray="4 4"></line>
                    `;
                })();

            const maxXAxisLabels = Number.isFinite(options.maxXAxisLabels)
                ? Math.max(2, Math.floor(options.maxXAxisLabels))
                : (isModal ? 12 : 6);
            const labelEvery = Math.max(1, Math.ceil(points.length / maxXAxisLabels));
            const xAxisLabelY = height - (isModal ? 48 : 20);
            const axisTitleY = height - (isModal ? 22 : 8);
            const xLabels = points.map((point, index) => {
                if (index !== 0 && index !== points.length - 1 && index % labelEvery !== 0) return '';
                const xBase = mapX(index);
                const isFirst = index === 0;
                const isLast = index === points.length - 1;
                const edgeOffset = isModal ? 10 : 6;
                const x = isFirst ? (xBase + edgeOffset) : (isLast ? (xBase - edgeOffset) : xBase);
                const anchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
                const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                return `<text class="util-analytics-chart-label" x="${x}" y="${xAxisLabelY}" text-anchor="${anchor}"${monthAttr}>${escapeHtml(point.label)}</text>`;
            }).join('');

            const circles = points.map((point, index) => {
                if (!Number.isFinite(point.value)) return '';
                const x = mapX(index);
                const y = mapY(point.value);
                const isLast = index === points.length - 1;
                const label = `${point.label} · ${formatUtilNumber(point.value, decimals)}`;
                const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `
                    <circle class="util-analytics-chart-point" cx="${x}" cy="${y}" r="${isFocusMonth ? 5 : (isLast ? 4 : 3)}" stroke="${isFocusMonth ? '#1d4ed8' : '#ffffff'}" stroke-width="${isFocusMonth ? 2 : 1}"${monthAttr}>
                        <title>${escapeHtml(label)}</title>
                    </circle>
                `;
            }).join('');

            const valueLabels = showLabels ? points.map((point, index) => {
                if (!Number.isFinite(point.value)) return '';
                const x = mapX(index);
                let y = mapY(point.value) - 10;
                if (index % 2 === 1) y -= 12;
                if (y < pad.top + 10) y = pad.top + 12;
                const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                return `<text class="util-analytics-chart-value" x="${x}" y="${y}" text-anchor="middle"${monthAttr}>${formatUtilNumber(point.value, decimals)}</text>`;
            }).join('') : '';

            const barRects = points.map((point, index) => {
                if (!Number.isFinite(point.value)) return '';
                const xCenter = mapX(index);
                const barWidth = Math.min(36, xStep * 0.6);
                const left = xCenter - barWidth / 2;
                const y = mapY(point.value);
                const rectTop = Math.min(baseY, y);
                const heightVal = Math.abs(baseY - y);
                if (heightVal <= 0.5) return '';
                const tooltipLabel = `${point.label} · ${formatUtilNumber(point.value, decimals)}`;
                const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                const isFocusMonth = focusMonthKey && getUtilChartPointMonthKey(point, point.label) === focusMonthKey;
                return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${heightVal}" rx="6" ry="6" fill="var(--util-chart-bar, #9ca3af)" opacity="${isFocusMonth ? 0.98 : 0.86}" stroke="${isFocusMonth ? '#1d4ed8' : 'rgba(15, 23, 42, 0.12)'}" stroke-width="${isFocusMonth ? 1.6 : 0.8}"${monthAttr}><title>${escapeHtml(tooltipLabel)}</title></rect>`;
            }).join('');
            const monthHitZones = options.chartType === 'bar'
                ? ''
                : points.map((point, index) => {
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label);
                    if (!monthAttr) return '';
                    const left = index === 0
                        ? pad.left
                        : (mapX(index - 1) + mapX(index)) / 2;
                    const right = index === points.length - 1
                        ? width - pad.right
                        : (mapX(index) + mapX(index + 1)) / 2;
                    const rectWidth = Math.max(0, right - left);
                    const rectHeight = Math.max(0, baseY - pad.top);
                    if (rectWidth <= 0.5 || rectHeight <= 0.5) return '';
                    return `<rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${rectHeight}" fill="rgba(0, 0, 0, 0.001)"${monthAttr}></rect>`;
                }).join('');
            const axisTitleXBody = axisXIcon
                ? `<tspan class="util-analytics-chart-axis-title-icon">${escapeHtml(axisXIcon)}</tspan><tspan dx="4">${escapeHtml(axisXLabel)}</tspan>`
                : escapeHtml(axisXLabel);
            const axisTitleYBody = axisYIcon
                ? `<tspan class="util-analytics-chart-axis-title-icon">${escapeHtml(axisYIcon)}</tspan><tspan dx="4">${escapeHtml(axisYLabel)}</tspan>`
                : escapeHtml(axisYLabel);
            const axisTitleXPos = Math.max(10, pad.left - 120);
            const axisTitleXText = axisXLabel
                ? `<text class="util-analytics-chart-axis-title" x="${axisTitleXPos}" y="${axisTitleY}" text-anchor="start">${axisTitleXBody}</text>`
                : '';
            const axisTitleYText = axisYLabel
                ? `<text class="util-analytics-chart-axis-title" x="18" y="${pad.top + (plotH / 2)}" text-anchor="middle" transform="rotate(-90 18 ${pad.top + (plotH / 2)})">${axisTitleYBody}</text>`
                : '';

            return `
                <div class="util-analytics-chart util-analytics-chart-single ${isModal ? 'is-modal' : ''}" style="--chart-width:${width}px; --chart-height:${height}px; min-height:${height + frameExtraHeight}px;">
                    ${hideHeader ? '' : `
                    <div class="util-analytics-chart-head">
                        <div class="util-analytics-chart-head-left">
                            <span class="util-analytics-chart-title"><i class="fa-solid fa-chart-line"></i> ${escapeHtml(chartTitle)}</span>
                            <div class="util-analytics-chart-controls">
                                ${options.showTypeSelect ? `
                                    <select class="util-analytics-chart-select" data-chart-type-select ${options.lockType ? 'disabled' : ''}>
                                        <option value="line" ${options.chartType === 'bar' ? '' : 'selected'}>꺾은선</option>
                                        <option value="bar" ${options.chartType === 'bar' ? 'selected' : ''}>막대</option>
                                    </select>
                                ` : ''}
                                ${options.showLabelToggle ? `
                                    <label class="util-analytics-chart-checkbox">
                                        <input type="checkbox" data-chart-label-toggle ${showLabels ? 'checked' : ''} />
                                        레이블
                                    </label>
                                ` : ''}
                            </div>
                        </div>
                        ${hideUnit ? '' : `<span class="util-analytics-chart-unit">${escapeHtml(metricLabel || '')}</span>`}
                    </div>`}
                    ${topCenterTitle}
                    ${periodRow}
                    <div class="util-analytics-chart-canvas">
                        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:block;overflow:visible;" role="img" aria-label="월별 추이 그래프">
                            <defs>
                                <linearGradient id="utilTrendFill" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stop-color="var(--util-chart-accent, #38bdf8)" stop-opacity="0.35"></stop>
                                    <stop offset="100%" stop-color="var(--util-chart-accent, #38bdf8)" stop-opacity="0.06"></stop>
                                </linearGradient>
                            </defs>
                            ${yearBands}
                            ${focusMonthOverlay}
                            ${gridLines}
                            <line class="util-analytics-chart-axis" x1="${pad.left}" y1="${baseY}" x2="${width - pad.right}" y2="${baseY}" />
                            ${areaPath ? `<path class="util-analytics-chart-area" d="${areaPath}" />` : ''}
                            ${options.chartType === 'bar' ? barRects : `<path class="util-analytics-chart-line" d="${linePath}" />`}
                            ${options.chartType === 'bar' ? '' : circles}
                            ${valueLabels}
                            ${xLabels}
                            ${monthHitZones}
                            ${axisTitleXText}
                            ${axisTitleYText}
                        </svg>
                    </div>
                </div>
            `;
        }

        function renderUtilMultiSeriesSegmentedChart(series, options = {}, shared = {}) {
            const decimals = Number.isFinite(shared.decimals) ? shared.decimals : null;
            const isModal = shared.isModal === true;
            const frameExtraHeight = Number.isFinite(shared.frameExtraHeight) ? Number(shared.frameExtraHeight) : (isModal ? 152 : 68);
            const showLabels = shared.showLabels === true;
            const hideHeader = shared.hideHeader === true;
            const hideUnit = shared.hideUnit === true;
            const axisXLabel = String(shared.axisXLabel || '').trim();
            const chartTitle = shared.chartTitle || '멀티 그래프';
            const topCenterTitle = shared.topCenterTitle || '';
            const periodLabel = String(shared.periodLabel || '').trim();
            const inlinePeriodLegend = shared.inlinePeriodLegend === true;
            const labels = Array.isArray(shared.labels) ? shared.labels : [];
            const width = Number(shared.width) || 900;
            const height = Number(shared.height) || 320;
            const pointSpacing = options.pointSpacing || 80;
            const segmentGap = Number.isFinite(options.segmentGap) ? Math.max(10, Number(options.segmentGap)) : (isModal ? 20 : 16);
            const axisFontSize = Number.isFinite(options.axisFontSize) ? options.axisFontSize : (isModal ? 13 : 11.5);
            const yLabelOffset = Number.isFinite(options.yLabelOffset) ? options.yLabelOffset : 14;
            const leftPad = Number.isFinite(options.leftPad) ? Number(options.leftPad) : (isModal ? 210 : 172);
            const bottomPad = axisXLabel ? (isModal ? 128 : 68) : (isModal ? 86 : 54);
            const rightPad = Number.isFinite(options.rightPad) ? Number(options.rightPad) : (isModal ? 72 : 24);
            const pad = { left: leftPad, right: rightPad, top: isModal ? 34 : 32, bottom: bottomPad };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const plotBottom = pad.top + plotH;
            const xStep = labels.length > 1 ? plotW / (labels.length - 1) : 0;
            const mapX = (index) => pad.left + (labels.length > 1 ? xStep * index : plotW / 2);
            const segmentCount = Math.max(1, series.length);
            const segmentHeight = Math.max(24, (plotH - (segmentGap * (segmentCount - 1))) / segmentCount);

            const segmentDefs = series.map((item, index) => {
                const values = item.points
                    .map(point => Number(point?.value))
                    .filter(value => Number.isFinite(value));
                const bounds = values.length ? getUtilChartAxisBounds(values, options) : { min: 0, max: 1 };
                const minVal = Number.isFinite(bounds?.min) ? bounds.min : 0;
                const maxVal = Number.isFinite(bounds?.max) ? bounds.max : 1;
                const valueRange = maxVal - minVal || 1;
                const top = pad.top + index * (segmentHeight + segmentGap);
                const bottom = top + segmentHeight;
                const baselineValue = (minVal <= 0 && maxVal >= 0) ? 0 : minVal;
                const itemDecimals = Number.isFinite(item?.decimals) ? item.decimals : decimals;
                return {
                    ...item,
                    minVal,
                    maxVal,
                    valueRange,
                    top,
                    bottom,
                    baseY: top + ((maxVal - baselineValue) / valueRange) * segmentHeight,
                    decimals: itemDecimals,
                    mapY(value) {
                        return top + ((maxVal - value) / valueRange) * segmentHeight;
                    }
                };
            });

            const showYearBands = options.showYearBands !== false;
            const yearGroups = [];
            let currentYear = null;
            let yearStart = 0;
            labels.forEach((label, index) => {
                const point = series[0]?.points?.[index] || null;
                const year = getUtilChartPointYear(point, label);
                if (year !== currentYear) {
                    if (currentYear !== null) yearGroups.push({ year: currentYear, start: yearStart, end: index - 1 });
                    currentYear = year;
                    yearStart = index;
                }
            });
            if (currentYear !== null) yearGroups.push({ year: currentYear, start: yearStart, end: labels.length - 1 });
            const yearBands = showYearBands ? yearGroups.map(group => {
                const left = group.start === 0 ? pad.left : (mapX(group.start - 1) + mapX(group.start)) / 2;
                const right = group.end === labels.length - 1 ? width - pad.right : (mapX(group.end) + mapX(group.end + 1)) / 2;
                const yearLabelX = (left + right) / 2;
                const yearLabel = group.year
                    ? `<text class="util-analytics-chart-year" x="${yearLabelX}" y="${pad.top + 14}" text-anchor="middle">${escapeHtml(group.year)}</text>`
                    : '';
                const sepLine = group.start === 0
                    ? ''
                    : `<line class="util-analytics-chart-year-sep" x1="${left}" y1="${pad.top}" x2="${left}" y2="${plotBottom}" />`;
                return `${sepLine}${yearLabel}`;
            }).join('') : '';

            const segmentDecor = segmentDefs.map(item => {
                const titleX = pad.left - 10;
                const titleY = item.top + 14;
                const tickLabelX = pad.left - yLabelOffset;
                const tickFractions = [0, 0.5, 1];
                const bandFill = typeof item.color === 'string' ? item.color : '#cbd5e1';
                const gridLines = tickFractions.map((fraction, tickIndex) => {
                    const value = item.maxVal - (item.valueRange * fraction);
                    const y = item.mapY(value);
                    const tickLabel = tickIndex === 1
                        ? ''
                        : `<text class="util-analytics-chart-label" x="${tickLabelX}" y="${y + 4}" text-anchor="end">${formatUtilNumber(value, item.decimals)}</text>`;
                    return `
                        <line class="util-analytics-chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />
                        ${tickLabel}
                    `;
                }).join('');
                return `
                    <rect x="${pad.left}" y="${item.top}" width="${plotW}" height="${segmentHeight}" rx="10" ry="10" fill="${bandFill}" opacity="0.06"></rect>
                    <text class="util-analytics-chart-segment-label" x="${titleX}" y="${titleY}" text-anchor="end" style="fill:${bandFill}">${escapeHtml(item.label)}</text>
                    ${gridLines}
                `;
            }).join('');

            const barRects = segmentDefs.map(item => {
                if (item.type !== 'bar') return '';
                const barWidth = Math.min(40, Math.max(16, xStep * 0.54 || 28));
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const xCenter = mapX(index);
                    const left = xCenter - (barWidth / 2);
                    const y = item.mapY(point.value);
                    const rectTop = Math.min(item.baseY, y);
                    const rectHeight = Math.abs(item.baseY - y);
                    if (rectHeight <= 0.5) return '';
                    const tooltipLabel = `${item.label} ${point.label} · ${formatUtilNumber(point.value, item.decimals)}`;
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${rectHeight}" rx="6" ry="6" fill="${item.color}" opacity="0.86" stroke="rgba(15, 23, 42, 0.12)" stroke-width="0.8"${monthAttr}><title>${escapeHtml(tooltipLabel)}</title></rect>`;
                }).join('');
            }).join('');

            const linePaths = segmentDefs.map(item => {
                if (item.type !== 'line') return '';
                let path = '';
                let startNew = true;
                item.points.forEach((point, index) => {
                    if (!Number.isFinite(point.value)) {
                        startNew = true;
                        return;
                    }
                    const x = mapX(index);
                    const y = item.mapY(point.value);
                    if (startNew) {
                        path += `M ${x} ${y}`;
                        startNew = false;
                    } else {
                        path += ` L ${x} ${y}`;
                    }
                });
                const lineClass = `util-analytics-chart-line${item.lineClass ? ` ${item.lineClass}` : ''}`;
                const lineWidth = Number.isFinite(item.lineWidth) ? item.lineWidth : 3;
                const lineDash = item.lineDash ? ` stroke-dasharray="${item.lineDash}"` : '';
                return `<path class="${lineClass}" d="${path}" stroke="${item.color}" stroke-width="${lineWidth}" fill="none"${lineDash}></path>`;
            }).join('');

            const linePoints = segmentDefs.map(item => {
                if (item.type !== 'line') return '';
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const x = mapX(index);
                    const y = item.mapY(point.value);
                    const pointClass = `util-analytics-chart-point${item.pointClass ? ` ${item.pointClass}` : ''}`;
                    const tooltipLabel = `${item.label} ${point.label} · ${formatUtilNumber(point.value, item.decimals)}`;
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `
                        <circle class="${pointClass}" cx="${x}" cy="${y}" r="3" style="fill:${item.color}"${monthAttr}>
                            <title>${escapeHtml(tooltipLabel)}</title>
                        </circle>
                    `;
                }).join('');
            }).join('');

            const lineLabels = showLabels ? segmentDefs.map((item, sIndex) => {
                if (item.type !== 'line') return '';
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const x = mapX(index);
                    const y = item.mapY(point.value);
                    const offset = sIndex % 2 === 0 ? -10 : 14;
                    const labelY = Math.max(item.top + 12, Math.min(item.bottom - 6, y + offset));
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle"${monthAttr}>${formatUtilNumber(point.value, item.decimals)}</text>`;
                }).join('');
            }).join('') : '';

            const barLabels = showLabels ? segmentDefs.map(item => {
                if (item.type !== 'bar') return '';
                const barWidth = Math.min(40, Math.max(16, xStep * 0.54 || 28));
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const x = mapX(index);
                    const y = item.mapY(point.value) - 6;
                    const labelY = Math.max(item.top + 12, Math.min(item.bottom - 6, y));
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle"${monthAttr}>${formatUtilNumber(point.value, item.decimals)}</text>`;
                }).join('');
            }).join('') : '';

            const maxXAxisLabels = Number.isFinite(options.maxXAxisLabels)
                ? Math.max(2, Math.floor(options.maxXAxisLabels))
                : (isModal ? 12 : 6);
            const labelEvery = Math.max(1, Math.ceil(labels.length / maxXAxisLabels));
            const xAxisLabelY = height - (isModal ? 48 : 20);
            const axisTitleY = height - (isModal ? 22 : 8);
            const xLabels = labels.map((label, index) => {
                if (index !== 0 && index !== labels.length - 1 && index % labelEvery !== 0) return '';
                const xBase = mapX(index);
                const isFirst = index === 0;
                const isLast = index === labels.length - 1;
                const edgeOffset = isModal ? 10 : 6;
                const x = isFirst ? (xBase + edgeOffset) : (isLast ? (xBase - edgeOffset) : xBase);
                const anchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
                const samplePoint = series[0]?.points?.[index] || null;
                const monthAttr = buildUtilChartPointDataAttrs(samplePoint, label);
                return `<text class="util-analytics-chart-label" x="${x}" y="${xAxisLabelY}" text-anchor="${anchor}"${monthAttr}>${escapeHtml(label)}</text>`;
            }).join('');

            const monthHitZones = labels.map((label, index) => {
                const sampleSeries = series[series.length - 1] || null;
                const samplePoint = sampleSeries?.points?.[index] || null;
                const monthAttr = buildUtilChartPointDataAttrs(samplePoint, label, { seriesKey: sampleSeries?.seriesKey });
                if (!monthAttr) return '';
                const left = index === 0 ? pad.left : (mapX(index - 1) + mapX(index)) / 2;
                const right = index === labels.length - 1 ? width - pad.right : (mapX(index) + mapX(index + 1)) / 2;
                const rectWidth = Math.max(0, right - left);
                if (rectWidth <= 0.5 || plotH <= 0.5) return '';
                return `<rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${plotH}" fill="rgba(0, 0, 0, 0.001)"${monthAttr}></rect>`;
            }).join('');

            const axisTitleXPos = Math.max(10, pad.left - 120);
            const axisTitleXText = axisXLabel
                ? `<text class="util-analytics-chart-axis-title" x="${axisTitleXPos}" y="${axisTitleY}" text-anchor="start">${escapeHtml(axisXLabel)}</text>`
                : '';
            const legend = series.map(item => (
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

            return `
                <div class="util-analytics-chart ${isModal ? 'is-modal' : ''}" style="--chart-width:${width}px; --chart-height:${height}px; min-height:${height + frameExtraHeight}px;">
                    ${hideHeader ? '' : `
                    <div class="util-analytics-chart-head">
                        <div class="util-analytics-chart-head-left">
                            <span class="util-analytics-chart-title"><i class="fa-solid fa-chart-line"></i> ${escapeHtml(chartTitle)}</span>
                            ${options.showLabelToggle ? `
                                <div class="util-analytics-chart-controls">
                                    <label class="util-analytics-chart-checkbox">
                                        <input type="checkbox" data-chart-label-toggle ${showLabels ? 'checked' : ''} />
                                        레이블
                                    </label>
                                </div>
                            ` : ''}
                        </div>
                        ${hideUnit ? '' : `<span class="util-analytics-chart-unit">${escapeHtml(options.unitLabel || '')}</span>`}
                    </div>`}
                    ${topCenterTitle}
                    ${chartMeta}
                    <div class="util-analytics-chart-canvas">
                        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:block;overflow:visible;" role="img" aria-label="다중 그래프">
                            ${yearBands}
                            ${segmentDecor}
                            ${barRects}
                            ${barLabels}
                            ${linePaths}
                            ${linePoints}
                            ${lineLabels}
                            ${xLabels}
                            ${monthHitZones}
                            ${axisTitleXText}
                        </svg>
                    </div>
                </div>
            `;
        }

        function renderUtilMultiSeriesChart(seriesList, options = {}) {
            const decimals = Number.isFinite(options.decimals) ? options.decimals : null;
            const isModal = options.mode === 'modal';
            const frameExtraHeight = Number.isFinite(options.frameExtraHeight) ? Number(options.frameExtraHeight) : (isModal ? 152 : 68);
            const showLabels = options.showLabels !== false && options.tooltipOnly !== true;
            const hideHeader = options.hideHeader === true;
            const hideUnit = options.hideUnit === true;
            const axisXLabel = String(options.axisXLabel || '').trim();
            const axisYLabel = String(options.axisYLabel || '').trim();
            const axisXIcon = String(options.axisXIcon || '').trim();
            const axisYIcon = String(options.axisYIcon || '').trim();
            const chartTitle = options.chartTitle || '겹침 그래프';
            const topCenterTitle = options.topCenterTitle
                ? `<div class="util-analytics-chart-top-title">${escapeHtml(options.topCenterTitle)}</div>`
                : '';
            const periodLabel = String(options.periodLabel || '').trim();
            const inlinePeriodLegend = options.inlinePeriodLegend === true;
            const series = seriesList.filter(item => item && item.points && item.points.length);
            if (!series.length) {
                return renderUtilTrendChart([], '', options);
            }

            const labels = series[0].points.map(point => point.label);
            const allValues = [];
            series.forEach(item => {
                item.points.forEach(point => {
                    if (Number.isFinite(point.value)) allValues.push(point.value);
                });
            });
            if (!allValues.length) {
                return renderUtilTrendChart(series[0].points, series[0].label, options);
            }

            const pointSpacing = options.pointSpacing || 80;
            const minWidth = Number.isFinite(options.minWidth) ? options.minWidth : 1200;
            const forcedWidth = Number(options.forceWidth);
            const width = Number.isFinite(forcedWidth) && forcedWidth > 0
                ? Math.floor(forcedWidth)
                : (isModal ? Math.max(minWidth, labels.length * pointSpacing) : 900);
            const height = isModal ? (options.height || 520) : 320;
            if (options.segmentedSeriesAxes === true && series.length > 1) {
                return renderUtilMultiSeriesSegmentedChart(series, options, {
                    decimals,
                    isModal,
                    frameExtraHeight,
                    showLabels,
                    hideHeader,
                    hideUnit,
                    axisXLabel,
                    chartTitle,
                    topCenterTitle,
                    periodLabel,
                    inlinePeriodLegend,
                    labels,
                    width,
                    height
                });
            }
            const bounds = getUtilChartAxisBounds(allValues, options);
            const minVal = bounds.min;
            const maxVal = bounds.max;
            const axisFontSize = Number.isFinite(options.axisFontSize) ? options.axisFontSize : (isModal ? 14 : 12);
            const yLabelOffset = Number.isFinite(options.yLabelOffset) ? options.yLabelOffset : 16;
            const leftPad = getUtilChartLeftPad(minVal, maxVal, decimals, {
                fallback: isModal ? 174 : 84,
                minPad: isModal ? 194 : 88,
                fontSize: axisFontSize,
                anchorOffset: yLabelOffset,
                extra: isModal ? 40 : 14
            });
            const bottomPad = axisXLabel ? (isModal ? 128 : 68) : (isModal ? 86 : 54);
            const rightPad = Number.isFinite(options.rightPad) ? Number(options.rightPad) : (isModal ? 72 : 24);
            const pad = { left: leftPad, right: rightPad, top: isModal ? 30 : 32, bottom: bottomPad };
            const plotW = width - pad.left - pad.right;
            const plotH = height - pad.top - pad.bottom;
            const valueRange = maxVal - minVal || 1;
            const xStep = labels.length > 1 ? plotW / (labels.length - 1) : 0;
            const baselineValue = (minVal <= 0 && maxVal >= 0) ? 0 : minVal;
            const baseY = pad.top + ((maxVal - baselineValue) / valueRange) * plotH;
            const mapX = (index) => pad.left + (labels.length > 1 ? xStep * index : plotW / 2);
            const mapY = (value) => pad.top + ((maxVal - value) / valueRange) * plotH;

            const tickCount = Number.isFinite(options.tickCount) ? Math.max(2, Math.floor(options.tickCount)) : (isModal ? 3 : 4);
            const gridLines = Array.from({ length: tickCount + 1 }).map((_, index) => {
                const value = maxVal - (valueRange * (index / tickCount));
                const y = mapY(value);
                return `
                    <line class="util-analytics-chart-grid" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" />
                    <text class="util-analytics-chart-label" x="${pad.left - yLabelOffset}" y="${y + 4}" text-anchor="end">${formatUtilNumber(value, decimals)}</text>
                `;
            }).join('');

            const yearGroups = [];
            let currentYear = null;
            let yearStart = 0;
            labels.forEach((label, index) => {
                const point = series[0]?.points?.[index] || null;
                const year = getUtilChartPointYear(point, label);
                if (year !== currentYear) {
                    if (currentYear !== null) {
                        yearGroups.push({ year: currentYear, start: yearStart, end: index - 1 });
                    }
                    currentYear = year;
                    yearStart = index;
                }
            });
            if (currentYear !== null) {
                yearGroups.push({ year: currentYear, start: yearStart, end: labels.length - 1 });
            }

            const showYearBands = options.showYearBands !== false;
            const yearBands = showYearBands ? yearGroups.map((group, index) => {
                const left = group.start === 0
                    ? pad.left
                    : (mapX(group.start - 1) + mapX(group.start)) / 2;
                const right = group.end === labels.length - 1
                    ? width - pad.right
                    : (mapX(group.end) + mapX(group.end + 1)) / 2;
                const band = '';
                const yearLabelX = (left + right) / 2;
                const yearLabel = group.year
                    ? `<text class="util-analytics-chart-year" x="${yearLabelX}" y="${pad.top + 16}" text-anchor="middle">${escapeHtml(group.year)}</text>`
                    : '';
                const sepLine = group.start === 0
                    ? ''
                    : `<line class="util-analytics-chart-year-sep" x1="${left}" y1="${pad.top}" x2="${left}" y2="${baseY}" />`;
                return `${band}${sepLine}${yearLabel}`;
            }).join('') : '';

            const maxXAxisLabels = Number.isFinite(options.maxXAxisLabels)
                ? Math.max(2, Math.floor(options.maxXAxisLabels))
                : (isModal ? 12 : 6);
            const labelEvery = Math.max(1, Math.ceil(labels.length / maxXAxisLabels));
            const xAxisLabelY = height - (isModal ? 48 : 20);
            const axisTitleY = height - (isModal ? 22 : 8);
            const xLabels = labels.map((label, index) => {
                if (index !== 0 && index !== labels.length - 1 && index % labelEvery !== 0) return '';
                const xBase = mapX(index);
                const isFirst = index === 0;
                const isLast = index === labels.length - 1;
                const edgeOffset = isModal ? 10 : 6;
                const x = isFirst ? (xBase + edgeOffset) : (isLast ? (xBase - edgeOffset) : xBase);
                const anchor = isFirst ? 'start' : (isLast ? 'end' : 'middle');
                const samplePoint = series[0]?.points?.[index] || null;
                const monthAttr = buildUtilChartPointDataAttrs(samplePoint, label);
                return `<text class="util-analytics-chart-label" x="${x}" y="${xAxisLabelY}" text-anchor="${anchor}"${monthAttr}>${escapeHtml(label)}</text>`;
            }).join('');

            const barSeries = series.filter(item => item.type === 'bar');
            const lineSeries = series.filter(item => item.type === 'line');
            const barCount = barSeries.length;
            const maxBarWidth = Math.min(56, xStep * 0.6);
            const barWidth = barCount ? maxBarWidth / barCount : 0;

            const barRects = barSeries.map((item, sIndex) => {
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const xCenter = mapX(index);
                    const left = xCenter - (maxBarWidth / 2) + sIndex * barWidth;
                    const y = mapY(point.value);
                    const rectTop = Math.min(baseY, y);
                    const heightVal = Math.abs(baseY - y);
                    if (heightVal <= 0.5) return '';
                    const tooltipLabel = `${item.label} ${point.label} · ${formatUtilNumber(point.value, decimals)}`;
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<rect x="${left}" y="${rectTop}" width="${barWidth}" height="${heightVal}" rx="6" ry="6" fill="${item.color}" opacity="0.86" stroke="rgba(15, 23, 42, 0.12)" stroke-width="0.8"${monthAttr}><title>${escapeHtml(tooltipLabel)}</title></rect>`;
                }).join('');
            }).join('');

            const linePaths = lineSeries.map((item) => {
                let path = '';
                let startNew = true;
                item.points.forEach((point, index) => {
                    if (!Number.isFinite(point.value)) {
                        startNew = true;
                        return;
                    }
                    const x = mapX(index);
                    const y = mapY(point.value);
                    if (startNew) {
                        path += `M ${x} ${y}`;
                        startNew = false;
                    } else {
                        path += ` L ${x} ${y}`;
                    }
                });
                const lineClass = `util-analytics-chart-line${item.lineClass ? ` ${item.lineClass}` : ''}`;
                const lineWidth = Number.isFinite(item.lineWidth) ? item.lineWidth : 3;
                const lineDash = item.lineDash ? ` stroke-dasharray="${item.lineDash}"` : '';
                return `<path class="${lineClass}" d="${path}" stroke="${item.color}" stroke-width="${lineWidth}" fill="none"${lineDash}></path>`;
            }).join('');

            const linePoints = lineSeries.map((item) => {
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const x = mapX(index);
                    const y = mapY(point.value);
                    const pointClass = `util-analytics-chart-point${item.pointClass ? ` ${item.pointClass}` : ''}`;
                    const tooltipLabel = `${item.label} ${point.label} · ${formatUtilNumber(point.value, decimals)}`;
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `
                        <circle class="${pointClass}" cx="${x}" cy="${y}" r="3" style="fill:${item.color}"${monthAttr}>
                            <title>${escapeHtml(tooltipLabel)}</title>
                        </circle>
                    `;
                }).join('');

            }).join('');

            const lineLabels = showLabels ? lineSeries.map((item, sIndex) => {
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const x = mapX(index);
                    const y = mapY(point.value);
                    const offset = sIndex % 2 === 0 ? -10 : 16;
                    const labelY = Math.max(pad.top + 12, Math.min(baseY - 6, y + offset));
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle"${monthAttr}>${formatUtilNumber(point.value, decimals)}</text>`;
                }).join('');
            }).join('') : '';

            const barLabels = showLabels ? barSeries.map((item, sIndex) => {
                return item.points.map((point, index) => {
                    if (!Number.isFinite(point.value)) return '';
                    const xCenter = mapX(index);
                    const left = xCenter - (maxBarWidth / 2) + sIndex * barWidth;
                    const x = left + barWidth / 2;
                    const y = mapY(point.value) - 6;
                    const labelY = Math.max(pad.top + 12, y);
                    const monthAttr = buildUtilChartPointDataAttrs(point, point.label, { seriesKey: item.seriesKey });
                    return `<text class="util-analytics-chart-value" x="${x}" y="${labelY}" text-anchor="middle"${monthAttr}>${formatUtilNumber(point.value, decimals)}</text>`;
                }).join('');
            }).join('') : '';
            const monthHitZones = labels.map((label, index) => {
                const sampleSeries = series[series.length - 1]
                    || lineSeries[0]
                    || barSeries[barSeries.length - 1]
                    || null;
                const samplePoint = lineSeries[0]?.points?.[index]
                    || barSeries[barSeries.length - 1]?.points?.[index]
                    || sampleSeries?.points?.[index]
                    || null;
                const monthAttr = buildUtilChartPointDataAttrs(samplePoint, label, { seriesKey: sampleSeries?.seriesKey });
                if (!monthAttr) return '';
                const left = index === 0
                    ? pad.left
                    : (mapX(index - 1) + mapX(index)) / 2;
                const right = index === labels.length - 1
                    ? width - pad.right
                    : (mapX(index) + mapX(index + 1)) / 2;
                const rectWidth = Math.max(0, right - left);
                const rectHeight = Math.max(0, plotH);
                if (rectWidth <= 0.5 || rectHeight <= 0.5) return '';
                return `<rect x="${left}" y="${pad.top}" width="${rectWidth}" height="${rectHeight}" fill="rgba(0, 0, 0, 0.001)"${monthAttr}></rect>`;
            }).join('');
            const axisTitleXBody = axisXIcon
                ? `<tspan class="util-analytics-chart-axis-title-icon">${escapeHtml(axisXIcon)}</tspan><tspan dx="4">${escapeHtml(axisXLabel)}</tspan>`
                : escapeHtml(axisXLabel);
            const axisTitleYBody = axisYIcon
                ? `<tspan class="util-analytics-chart-axis-title-icon">${escapeHtml(axisYIcon)}</tspan><tspan dx="4">${escapeHtml(axisYLabel)}</tspan>`
                : escapeHtml(axisYLabel);
            const axisTitleXPos = Math.max(10, pad.left - 120);
            const axisTitleXText = axisXLabel
                ? `<text class="util-analytics-chart-axis-title" x="${axisTitleXPos}" y="${axisTitleY}" text-anchor="start">${axisTitleXBody}</text>`
                : '';
            const axisTitleYText = axisYLabel
                ? `<text class="util-analytics-chart-axis-title" x="18" y="${pad.top + (plotH / 2)}" text-anchor="middle" transform="rotate(-90 18 ${pad.top + (plotH / 2)})">${axisTitleYBody}</text>`
                : '';

            const legend = series.map(item => (
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

            return `
                <div class="util-analytics-chart ${isModal ? 'is-modal' : ''}" style="--chart-width:${width}px; --chart-height:${height}px; min-height:${height + frameExtraHeight}px;">
                    ${hideHeader ? '' : `
                    <div class="util-analytics-chart-head">
                        <div class="util-analytics-chart-head-left">
                            <span class="util-analytics-chart-title"><i class="fa-solid fa-chart-line"></i> ${escapeHtml(chartTitle)}</span>
                            ${options.showLabelToggle ? `
                                <div class="util-analytics-chart-controls">
                                    <label class="util-analytics-chart-checkbox">
                                        <input type="checkbox" data-chart-label-toggle ${showLabels ? 'checked' : ''} />
                                        레이블
                                    </label>
                                </div>
                            ` : ''}
                        </div>
                        ${hideUnit ? '' : `<span class="util-analytics-chart-unit">${escapeHtml(options.unitLabel || '')}</span>`}
                    </div>`}
                    ${topCenterTitle}
                    ${chartMeta}
                    <div class="util-analytics-chart-canvas">
                        <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" style="width:${width}px;height:${height}px;display:block;overflow:visible;" role="img" aria-label="다중 그래프">
                            ${yearBands}
                            ${gridLines}
                            <line class="util-analytics-chart-axis" x1="${pad.left}" y1="${baseY}" x2="${width - pad.right}" y2="${baseY}" />
                            ${barRects}
                            ${barLabels}
                            ${linePaths}
                            ${linePoints}
                            ${lineLabels}
                            ${xLabels}
                            ${monthHitZones}
                            ${axisTitleXText}
                            ${axisTitleYText}
                        </svg>
                    </div>
                </div>
            `;
        }

        function buildUtilSeriesLabel(chartData, index) {
            const explicitLabel = String(chartData?.legendLabel || '').trim();
            if (explicitLabel) return explicitLabel;
            const parts = [
                chartData.datasetLabel,
                chartData.teamLabel,
                chartData.metricLabel
            ].filter(Boolean);
            if (!parts.length) return `그래프 ${index + 1}`;
            return parts.join(' · ');
        }

        function buildUtilCombinedSeries(chartDataList) {
            const pointLabelMap = new Map();
            chartDataList.forEach(item => {
                (item.points || []).forEach(point => {
                    const pointKey = String(point?.key || point?.monthKey || point?.label || '').trim();
                    if (!pointKey) return;
                    if (!pointLabelMap.has(pointKey)) {
                        pointLabelMap.set(pointKey, String(point?.label || pointKey));
                    }
                });
            });
            const pointKeys = Array.from(pointLabelMap.keys()).sort((a, b) => {
                if (typeof compareUtilReportMonthKeys === 'function') {
                    const monthCompare = compareUtilReportMonthKeys(a, b);
                    if (monthCompare !== 0) return monthCompare;
                }
                return String(a).localeCompare(String(b));
            });
            const decimals = chartDataList.reduce((acc, item) => {
                return Number.isFinite(item.decimals) ? Math.max(acc, item.decimals) : acc;
            }, 0);
            const series = chartDataList.map((item, index) => {
                const valueMap = new Map((item.points || []).map(point => [
                    String(point?.key || point?.monthKey || point?.label || '').trim(),
                    point
                ]));
                return {
                    label: buildUtilSeriesLabel(item, index),
                    color: item.color || UTIL_CHART_COLORS[index % UTIL_CHART_COLORS.length],
                    type: item.chartType || item.type || 'line',
                    lineWidth: item.lineWidth,
                    lineDash: item.lineDash,
                    pointClass: item.pointClass,
                    lineClass: item.lineClass,
                    seriesKey: item.seriesKey,
                    points: pointKeys.map(pointKey => {
                        const point = valueMap.get(pointKey);
                        return {
                            key: pointKey,
                            monthKey: pointKey,
                            label: point?.label || pointLabelMap.get(pointKey) || pointKey,
                            value: point && Number.isFinite(point.value) ? point.value : NaN
                        };
                    })
                };
            });
            return { series, decimals };
        }

        function toggleUtilChartView(button) {
            const block = button?.closest('[data-util-analytics-unified]');
            if (!block) return;
            const list = block.closest('[data-role="util-analytics-list"]') || block;
            const chartDataList = Array.from(list.querySelectorAll('[data-util-analytics-unified]'))
                .map(item => item._utilChartData)
                .filter(Boolean)
                .filter(data => data.points && data.points.some(point => Number.isFinite(point.value)));
            if (!chartDataList.length) return;
            openUtilChartModal(chartDataList);
        }

        function updateUtilGraphToggleVisibility(list) {
            if (!list) return;
            const buttons = Array.from(list.querySelectorAll('.util-analytics-toggle'));
            if (!buttons.length) return;
            buttons.forEach(btn => btn.classList.add('is-hidden'));
            buttons[buttons.length - 1].classList.remove('is-hidden');
        }

        function updateUtilAnalyticsAddState(list) {
            if (!list) return;
            const stack = list.closest('.util-graph-stack');
            const addBtn = stack?.querySelector('[data-role="add-analytics"]');
            if (!addBtn) return;
            const count = list.querySelectorAll('[data-util-analytics-unified]').length;
            addBtn.disabled = count >= 4;
        }

        function ensureUtilChartModal() {
            let modal = document.getElementById('util-chart-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-chart-modal';
            modal.className = 'util-chart-modal';
            modal.innerHTML = `
                <div class="util-chart-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 그래프">
                    <div class="util-chart-modal-header">
                        <div class="util-chart-modal-title">유틸리티 그래프</div>
                        <div class="util-chart-modal-actions">
                            <button type="button" class="util-chart-modal-btn" data-chart-action="detach">그래프 팝업</button>
                            <button type="button" class="util-chart-modal-btn" data-chart-action="download">이미지 저장</button>
                            <button type="button" class="util-chart-modal-close">닫기</button>
                        </div>
                    </div>
                    <div class="util-chart-modal-body">
                        <div class="util-chart-modal-meta" data-role="meta"></div>
                        <div class="util-chart-modal-scroll">
                            <div data-role="chart"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (event) => {
                if (event.target === modal) closeUtilChartModal();
            });
            modal.querySelector('.util-chart-modal-close')?.addEventListener('click', closeUtilChartModal);
            modal.querySelector('[data-chart-action="download"]')?.addEventListener('click', downloadUtilChartImage);
            modal.querySelector('[data-chart-action="detach"]')?.addEventListener('click', () => {
                const list = modal._chartDataList || (modal._chartData ? [modal._chartData] : []);
                if (UtilChartDetachedState.detached) {
                    closeUtilChartDetachedWindow();
                    return;
                }
                if (openUtilChartDetachedWindow(list)) {
                    closeUtilChartModal({ keepDetachedWindow: true, closeLinkedTables: false });
                }
            });
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') closeUtilChartModal();
            });
            if (typeof syncUtilChartDetachButtonState === 'function') {
                syncUtilChartDetachButtonState(modal);
            }
            return modal;
        }

        function renderUtilChartModal() {
            const modal = document.getElementById('util-chart-modal');
            if (!modal) return;
            const chartEl = modal.querySelector('[data-role="chart"]');
            if (!chartEl) return;
            const list = modal._chartDataList || (modal._chartData ? [modal._chartData] : []);
            if (!list.length) return;
            const showLabels = modal.dataset.showLabels !== 'false';
            if (list.length === 1) {
                const data = list[0];
                chartEl.innerHTML = renderUtilTrendChart(data.points, data.metricLabel, {
                    mode: 'modal',
                    decimals: data.decimals,
                    chartType: data.chartType || 'line',
                    showTypeSelect: false,
                    showLabelToggle: true,
                    showLabels
                });
            } else {
                const combined = buildUtilCombinedSeries(list);
                chartEl.innerHTML = renderUtilMultiSeriesChart(combined.series, {
                    mode: 'modal',
                    decimals: combined.decimals,
                    showLabelToggle: true,
                    showLabels
                });
            }
            const labelToggle = chartEl.querySelector('[data-chart-label-toggle]');
            if (labelToggle) {
                labelToggle.checked = showLabels;
                labelToggle.addEventListener('change', () => {
                    modal.dataset.showLabels = labelToggle.checked ? 'true' : 'false';
                    renderUtilChartModal();
                });
            }
            if (typeof syncUtilChartDetachButtonState === 'function') {
                syncUtilChartDetachButtonState(modal);
            }
            if (typeof syncUtilChartDetachedWindow === 'function') {
                syncUtilChartDetachedWindow();
            }
        }
