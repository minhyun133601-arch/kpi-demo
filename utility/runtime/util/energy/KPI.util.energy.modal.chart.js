        const UtilChartDetachedState = {
            win: null,
            detached: false
        };

        function downloadUtilChartImage() {
            const modal = document.getElementById('util-chart-modal');
            if (!modal) return;
            const chartSvgs = Array.from(modal.querySelectorAll('[data-role="chart"] svg'));
            if (!chartSvgs.length) return;
            const styleText = `
                .util-analytics-chart-grid{stroke:#e5e7eb;stroke-dasharray:0;}
                .util-analytics-chart-axis{stroke:#9ca3af;stroke-width:1.2;}
                .util-analytics-chart-line{stroke:#111827;stroke-width:2.6;fill:none;}
                .util-analytics-chart-area{fill:rgba(17,24,39,0.08);}
                .util-analytics-chart-band{fill:transparent;}
                .util-analytics-chart-point{fill:#111827;stroke:#ffffff;stroke-width:1.2;}
                .util-analytics-chart-label{fill:#6b7280;font-size:12px;font-weight:600;font-family:Segoe UI, Arial, sans-serif;}
                .util-analytics-chart-year{fill:#111827;font-size:12px;font-weight:800;font-family:Segoe UI, Arial, sans-serif;}
                .util-analytics-chart-year-sep{stroke:#9ca3af;stroke-width:1.2;}
                .util-analytics-chart-value{fill:#111827;font-size:11px;font-weight:700;font-family:Segoe UI, Arial, sans-serif;}
            `;
            const svgPayloads = chartSvgs.map(svgEl => {
                const svgClone = svgEl.cloneNode(true);
                const viewBox = svgClone.getAttribute('viewBox');
                let width = 0;
                let height = 0;
                if (viewBox) {
                    const parts = viewBox.split(' ').map(Number);
                    if (parts.length === 4) {
                        width = parts[2];
                        height = parts[3];
                        svgClone.setAttribute('width', width);
                        svgClone.setAttribute('height', height);
                    }
                }
                const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
                styleEl.textContent = styleText;
                svgClone.insertBefore(styleEl, svgClone.firstChild);
                const serializer = new XMLSerializer();
                const svgText = serializer.serializeToString(svgClone);
                const svgBlob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);
                return { url, width, height };
            });
            Promise.all(svgPayloads.map(payload => new Promise(resolve => {
                const img = new Image();
                img.onload = () => resolve({ img, width: payload.width || img.width, height: payload.height || img.height, url: payload.url });
                img.src = payload.url;
            }))).then(images => {
                const gap = 24;
                const totalWidth = Math.max(...images.map(item => item.width));
                const totalHeight = images.reduce((acc, item) => acc + item.height, 0) + gap * (images.length - 1);
                const canvas = document.createElement('canvas');
                canvas.width = totalWidth;
                canvas.height = totalHeight;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                let offsetY = 0;
                images.forEach(item => {
                    ctx.drawImage(item.img, 0, offsetY, item.width, item.height);
                    offsetY += item.height + gap;
                    URL.revokeObjectURL(item.url);
                });
                const pngUrl = canvas.toDataURL('image/png');
                const link = document.createElement('a');
                const nameBase = modal._chartData?.datasetLabel || 'util';
                link.download = `${nameBase}.png`;
                link.href = pngUrl;
                link.click();
            });
        }

        function normalizeUtilChartDataList(chartData) {
            const list = Array.isArray(chartData) ? chartData : [chartData];
            return list.filter(Boolean);
        }

        function buildUtilChartMetaHtml(dataList) {
            if (dataList.length > 1) {
                return `<span>겹침 그래프: ${dataList.length}개</span>`;
            }
            const single = dataList[0] || {};
            return `
                <span>${escapeHtml(single.datasetLabel || '')}</span>
                <span>${escapeHtml(single.teamLabel || '')}</span>
                <span>${escapeHtml(single.metricLabel || '')}</span>
                <span>${escapeHtml(single.from || '')} ~ ${escapeHtml(single.to || '')}</span>
            `;
        }

        function getUtilChartDetachedWindow() {
            const popup = UtilChartDetachedState.win;
            if (popup && !popup.closed) return popup;
            UtilChartDetachedState.win = null;
            return null;
        }

        function closeUtilChartLinkedDetachedTables() {
            if (typeof closeUtilEnergyDetachedTableWindow === 'function') {
                closeUtilEnergyDetachedTableWindow();
            }
            if (typeof closeUtilReportDetachedTableWindow === 'function') {
                closeUtilReportDetachedTableWindow();
            }
        }

        function syncUtilChartDetachButtonState(root = document) {
            const buttons = Array.from(root?.querySelectorAll?.('[data-chart-action="detach"]') || []);
            buttons.forEach(button => {
                button.textContent = UtilChartDetachedState.detached ? '그래프 복귀' : '그래프 팝업';
                button.setAttribute('aria-pressed', UtilChartDetachedState.detached ? 'true' : 'false');
                button.setAttribute('title', UtilChartDetachedState.detached ? '그래프 팝업 닫기' : '그래프 팝업 열기');
            });
        }

        function getUtilChartDetachedHeadAssetsHtml() {
            return Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
                .map(node => node.outerHTML)
                .join('');
        }

        function buildUtilChartDetachedShellHtml() {
            return `
                <!doctype html>
                <html lang="ko">
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <title>유틸리티 그래프</title>
                    ${getUtilChartDetachedHeadAssetsHtml()}
                    <style>
                        body { margin: 0; background: #dbe4f3; color: #0f172a; }
                        .util-chart-detached-shell { min-height: 100vh; background: #dbe4f3; }
                        .util-chart-detached-shell .util-chart-modal { position: static; inset: auto; display: block; padding: 0; background: none; }
                        .util-chart-detached-shell .util-chart-modal-card { width: 100%; min-height: 100vh; border-radius: 0; box-shadow: none; }
                        .util-chart-detached-shell .util-chart-modal-header { position: sticky; top: 0; z-index: 5; cursor: grab; user-select: none; }
                        .util-chart-detached-shell .util-chart-modal-header.is-window-dragging { cursor: grabbing; }
                        .util-chart-detached-shell .util-chart-modal-body { min-height: calc(100vh - 70px); }
                        .util-chart-detached-shell .util-chart-modal-scroll { min-height: calc(100vh - 128px); }
                    </style>
                </head>
                <body>
                    <div class="util-chart-detached-shell" data-role="util-chart-detached-root"></div>
                </body>
                </html>
            `;
        }

        function bindUtilChartDetachedWindowDrag(popup) {
            if (!popup || popup.__utilChartDetachedDragBound) return;
            popup.__utilChartDetachedDragBound = true;

            let activePointerId = null;
            let startScreenX = 0;
            let startScreenY = 0;
            let headEl = null;

            const isInteractiveTarget = target => !!target?.closest?.('button, input, select, textarea, label, a, summary, details, [contenteditable]');
            const finishDrag = () => {
                if (headEl) headEl.classList.remove('is-window-dragging');
                activePointerId = null;
                headEl = null;
            };

            popup.document.addEventListener('pointerdown', event => {
                const nextHead = event.target?.closest?.('.util-chart-modal-header');
                if (!nextHead) return;
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                activePointerId = event.pointerId;
                startScreenX = event.screenX;
                startScreenY = event.screenY;
                headEl = nextHead;
                headEl.classList.add('is-window-dragging');
                if (typeof headEl.setPointerCapture === 'function') {
                    try { headEl.setPointerCapture(activePointerId); } catch (error) {}
                }
                event.preventDefault();
            });

            popup.document.addEventListener('pointermove', event => {
                if (activePointerId === null || event.pointerId !== activePointerId) return;
                const diffX = event.screenX - startScreenX;
                const diffY = event.screenY - startScreenY;
                startScreenX = event.screenX;
                startScreenY = event.screenY;
                if (!diffX && !diffY) return;
                try {
                    popup.moveBy(diffX, diffY);
                } catch (error) {}
                event.preventDefault();
            });

            popup.document.addEventListener('pointerup', event => {
                if (event.pointerId !== activePointerId) return;
                finishDrag();
            });
            popup.document.addEventListener('pointercancel', event => {
                if (event.pointerId !== activePointerId) return;
                finishDrag();
            });
            popup.document.addEventListener('lostpointercapture', finishDrag, true);
            popup.addEventListener('blur', finishDrag);
        }

        function buildUtilChartDetachedCardHtml(dataList, showLabels) {
            const list = normalizeUtilChartDataList(dataList);
            const chartHtml = !list.length
                ? `
                    <div class="util-analytics-chart util-analytics-chart-empty is-modal">
                        <div class="util-analytics-chart-empty-text">표시할 그래프 데이터가 없습니다.</div>
                    </div>
                `
                : (list.length === 1
                    ? renderUtilTrendChart(list[0].points || [], list[0].metricLabel, {
                        mode: 'modal',
                        decimals: list[0].decimals,
                        chartType: list[0].chartType || 'line',
                        showTypeSelect: false,
                        showLabelToggle: true,
                        showLabels
                    })
                    : (() => {
                        const combined = buildUtilCombinedSeries(list);
                        return renderUtilMultiSeriesChart(combined.series, {
                            mode: 'modal',
                            decimals: combined.decimals,
                            showLabelToggle: true,
                            showLabels
                        });
                    })());
            return `
                <div class="util-chart-modal is-open" data-role="util-chart-detached-modal">
                    <div class="util-chart-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 그래프">
                        <div class="util-chart-modal-header">
                            <div class="util-chart-modal-title">유틸리티 그래프</div>
                            <div class="util-chart-modal-actions">
                                <button type="button" class="util-chart-modal-close" data-role="util-chart-detached-close">닫기</button>
                            </div>
                        </div>
                        <div class="util-chart-modal-body">
                            <div class="util-chart-modal-meta">${buildUtilChartMetaHtml(list)}</div>
                            <div class="util-chart-modal-scroll">
                                <div data-role="util-chart-detached-chart">${chartHtml}</div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }

        function syncUtilChartDetachedWindow() {
            const popup = getUtilChartDetachedWindow();
            if (!popup) return;
            const modal = ensureUtilChartModal();
            const list = normalizeUtilChartDataList(modal._chartDataList || modal._chartData || []);
            const showLabels = modal.dataset.showLabels !== 'false';
            const root = popup.document.querySelector('[data-role="util-chart-detached-root"]');
            if (!root) return;
            root.innerHTML = buildUtilChartDetachedCardHtml(list, showLabels);
            const closeBtn = popup.document.querySelector('[data-role="util-chart-detached-close"]');
            if (closeBtn) {
                closeBtn.onclick = () => closeUtilChartDetachedWindow();
            }
            const labelToggle = popup.document.querySelector('[data-chart-label-toggle]');
            if (labelToggle) {
                labelToggle.checked = showLabels;
                labelToggle.onchange = () => {
                    modal.dataset.showLabels = labelToggle.checked ? 'true' : 'false';
                    renderUtilChartModal();
                };
            }
        }

        function closeUtilChartDetachedWindow(options = {}) {
            const popup = getUtilChartDetachedWindow();
            UtilChartDetachedState.win = null;
            const wasDetached = UtilChartDetachedState.detached === true;
            UtilChartDetachedState.detached = false;
            if (popup && !popup.closed) {
                popup.close();
            }
            syncUtilChartDetachButtonState(document);
            if (wasDetached && options.closeLinkedTables !== false) {
                closeUtilChartLinkedDetachedTables();
            }
        }

        function openUtilChartDetachedWindow(chartData = null) {
            const modal = ensureUtilChartModal();
            const dataList = normalizeUtilChartDataList(chartData || modal._chartDataList || modal._chartData || []);
            if (!dataList.length) return false;
            modal._chartDataList = dataList;
            modal._chartData = dataList[0] || null;
            if (!modal.dataset.showLabels) {
                modal.dataset.showLabels = 'true';
            }
            let popup = getUtilChartDetachedWindow();
            if (!popup) {
                popup = window.open('', 'util-chart-detached-window', 'popup=yes,width=1480,height=920,resizable=yes,scrollbars=yes');
                if (!popup) {
                    UtilChartDetachedState.detached = false;
                    syncUtilChartDetachButtonState(document);
                    return false;
                }
                popup.document.open();
                popup.document.write(buildUtilChartDetachedShellHtml());
                popup.document.close();
                bindUtilChartDetachedWindowDrag(popup);
                UtilChartDetachedState.win = popup;
                popup.addEventListener('beforeunload', () => {
                    if (UtilChartDetachedState.win !== popup) return;
                    UtilChartDetachedState.win = null;
                    if (UtilChartDetachedState.detached) {
                        UtilChartDetachedState.detached = false;
                        syncUtilChartDetachButtonState(document);
                        closeUtilChartLinkedDetachedTables();
                    }
                });
            }
            UtilChartDetachedState.detached = true;
            syncUtilChartDetachButtonState(document);
            syncUtilChartDetachedWindow();
            if (popup.focus) popup.focus();
            return true;
        }

        function openUtilChartModal(chartData) {
            const modal = ensureUtilChartModal();
            const metaEl = modal.querySelector('[data-role="meta"]');
            if (!metaEl) return;
            const dataList = normalizeUtilChartDataList(chartData);
            if (!dataList.length) return;
            metaEl.innerHTML = buildUtilChartMetaHtml(dataList);
            modal._chartDataList = dataList;
            modal._chartData = dataList[0] || null;
            if (!modal.dataset.showLabels) {
                modal.dataset.showLabels = 'true';
            }
            renderUtilChartModal();
            syncUtilChartDetachButtonState(modal);
            if (UtilChartDetachedState.detached) {
                syncUtilChartDetachedWindow();
                return;
            }
            modal.classList.add('is-open');
        }

        function closeUtilChartModal(options = {}) {
            const modal = document.getElementById('util-chart-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
            syncUtilChartDetachButtonState(modal);
            if (options.keepDetachedWindow !== true && UtilChartDetachedState.detached) {
                closeUtilChartDetachedWindow({ closeLinkedTables: options.closeLinkedTables !== false });
            }
            const energyOpen = document.getElementById('util-energy-modal')?.classList.contains('is-open');
            const reportOpen = document.getElementById('util-report-modal')?.classList.contains('is-open');
            const reportGraphOpen = document.getElementById('util-report-graph-modal')?.classList.contains('is-open');
            const reportYoYOpen = document.getElementById('util-report-yoy-modal')?.classList.contains('is-open');
            if (!energyOpen && !reportOpen && !reportGraphOpen && !reportYoYOpen) {
                document.body.style.overflow = '';
            }
        }

        function ensureUtilEnergyModal() {
            let modal = document.getElementById('util-energy-modal');
            if (modal) return modal;

            modal = document.createElement('div');
            modal.id = 'util-energy-modal';
            modal.className = 'util-energy-modal';
            modal.innerHTML = `
                <div class="util-energy-modal-card" role="dialog" aria-modal="true" aria-label="환산열량 분석">
                    <div class="util-energy-modal-head">
                        <div class="util-energy-modal-header">
                            <div>
                                <div class="util-energy-modal-title">환산열량 분석</div>
                                <div class="util-energy-modal-sub" data-role="util-energy-modal-sub">기간: -</div>
                            </div>
                            <div class="util-energy-modal-actions">
                                <label class="util-energy-modal-switch">
                                    <input type="checkbox" data-role="util-energy-modal-enable-chart-popup">
                                    <span>차트 팝업 사용</span>
                                </label>
                                <button type="button" class="util-report-modal-btn" data-role="util-energy-modal-print">인쇄</button>
                                <button type="button" class="util-report-modal-close" data-role="util-energy-modal-close">닫기</button>
                            </div>
                        </div>
                    </div>
                    <div class="util-energy-modal-body">
                        <div class="util-tabs-wrap util-energy-wrap util-energy-dashboard util-energy-modal-shell" data-util-tabs="energy-converter">
                            <div class="util-energy-topbar">
                                <div class="util-energy-topbar-title"><i class="fa-solid fa-calculator"></i><span>전기·가스 열량 환산</span></div>
                                <div class="util-energy-topbar-sub">자동 연동/수동 입력 계산과 월별 추세를 탭으로 확인합니다.</div>
                            </div>
                            <div class="util-tabs util-energy-main-tabs">
                                <button type="button" class="util-tab-btn" data-tab="energy-converter"><i class="fa-solid fa-sliders"></i> 환산 계산</button>
                                <button type="button" class="util-tab-btn" data-tab="energy-trend"><i class="fa-solid fa-chart-line"></i> 추세 그래프</button>
                            </div>
                            <div class="util-tab-panels">
                                <div class="util-tab-panel" data-panel="energy-converter">
                                    <div class="util-analytics util-energy-converter-shell" data-util-energy data-util-tabs="energy">
                                        <div class="util-analytics-header">
                                            <div class="util-analytics-header-title"><i class="fa-solid fa-fire-flame-curved"></i><span>환산 계산</span></div>
                                        </div>
                                        <div class="util-analytics-desc">자동 연동 또는 수동 입력으로 MJ/GJ/TOE와 원단위를 계산합니다.</div>
                                        <div class="util-analytics-form" data-role="energy-link-form">
                                            <div class="util-analytics-field"><span class="util-analytics-label">데이터 연동</span><label class="util-dual-control"><input type="checkbox" data-role="energy-link-toggle" checked> 전기/가스 데이터 자동 합산</label></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 팀</span><select class="util-analytics-select" data-role="energy-link-electric-team"></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">가스 팀</span><select class="util-analytics-select" data-role="energy-link-gas-team"></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">가스 합산 방식</span><select class="util-analytics-select" data-role="energy-link-gas-mode"><option value="mj">열량(MJ) 합산</option><option value="raw">원단위 합산</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">기간</span><div class="util-analytics-range"><select class="util-analytics-select" data-role="energy-link-from"></select><span class="util-analytics-divider">~</span><select class="util-analytics-select" data-role="energy-link-to"></select></div></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">소수 표시</span><select class="util-analytics-select" data-role="energy-display-decimals"><option value="0">0자리</option><option value="1">1자리</option><option value="2">2자리</option><option value="3">3자리</option><option value="4">4자리</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">LNG 계수 (MJ/m³)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-link-lng-factor" data-format-decimals="3"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">LPG 계수 (MJ/kg)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-link-lpg-factor" data-format-decimals="3"></div>
                                            <div class="util-analytics-field"><div class="util-energy-note" data-role="energy-link-warning" style="display:none;"></div></div>
                                        </div>
                                        <div class="util-analytics-form">
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 사용량 (kWh)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="electric-kwh" data-format-decimals="0" placeholder="0"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 기준</span><select class="util-analytics-select" data-role="electric-basis"><option value="3.6">최종에너지 (3.6 MJ/kWh)</option><option value="9.59">1차에너지 (9.59 MJ/kWh)</option><option value="custom">직접 입력</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 환산계수 (MJ/kWh)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="electric-factor" data-format-decimals="2" value="3.6"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label" data-role="gas-amount-label">가스 사용량 (LNG m³)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="gas-amount" data-format-decimals="0" placeholder="0"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">가스 단위</span><select class="util-analytics-select" data-role="gas-unit"><option value="lng">LNG m³</option><option value="lpg">LPG kg</option><option value="mj">고지서 MJ</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label" data-role="gas-factor-label">가스 열량계수 (MJ/m³)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="gas-factor" data-format-decimals="3" value="42.705"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기요금 (원)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="electric-cost" data-format-decimals="0" placeholder="0"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">가스요금 (원)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="gas-cost" data-format-decimals="0" placeholder="0"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">TOE 기준 (MJ)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="toe-factor" data-format-decimals="0" value="41868"></div>
                                        </div>
                                        <div class="util-tabs">
                                            <button type="button" class="util-tab-btn" data-tab="energy"><i class="fa-solid fa-fire-flame-curved"></i> 열량</button>
                                            <button type="button" class="util-tab-btn" data-tab="toe"><i class="fa-solid fa-oil-can"></i> TOE</button>
                                        </div>
                                        <div class="util-tab-panels">
                                            <div class="util-tab-panel" data-panel="energy">
                                                <div class="util-analytics-result">
                                                    <div class="util-analytics-summary">
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-bolt"></i>전기 MJ</span><span class="util-analytics-value" data-role="energy-electric-mj">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-fire-flame-curved"></i>가스 MJ</span><span class="util-analytics-value" data-role="energy-gas-mj">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-layer-group"></i>합계 MJ</span><span class="util-analytics-value" data-role="energy-total-mj">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-chart-pie"></i>합계 GJ</span><span class="util-analytics-value" data-role="energy-total-gj">-</span>
                                                    </div>
                                                    <div class="util-analytics-summary">
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-won-sign"></i>전기 원/MJ</span><span class="util-analytics-value" data-role="cost-electric">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-won-sign"></i>가스 원/MJ</span><span class="util-analytics-value" data-role="cost-gas">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-won-sign"></i>통합 원/MJ</span><span class="util-analytics-value" data-role="cost-total">-</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="util-tab-panel" data-panel="toe">
                                                <div class="util-analytics-result">
                                                    <div class="util-analytics-summary">
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-bolt"></i>전기 toe</span><span class="util-analytics-value" data-role="toe-electric">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-fire-flame-curved"></i>가스 toe</span><span class="util-analytics-value" data-role="toe-gas">-</span>
                                                        <span class="util-analytics-tag"><i class="fa-solid fa-oil-can"></i>합계 toe</span><span class="util-analytics-value" data-role="toe-total">-</span>
                                                        <span class="util-analytics-tag">기준(MJ)</span><span class="util-analytics-value" data-role="toe-factor-display">41,868</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="util-energy-note"><strong>메모:</strong> 가스 열량계수는 고지서 MJ/단위를 우선 사용하세요.</div>
                                    </div>
                                </div>
                                <div class="util-tab-panel" data-panel="energy-trend">
                                    <div class="util-analytics util-energy-trend-shell util-energy-chart" data-util-energy-chart>
                                        <div class="util-analytics-header"><div class="util-analytics-header-title"><i class="fa-solid fa-chart-line"></i><span>열량/TOE 추세</span></div></div>
                                        <div class="util-analytics-desc">기간·팀·계수 기준으로 월별 열량 추세를 확인합니다.</div>
                                        <div class="util-analytics-form">
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 팀</span><select class="util-analytics-select" data-role="energy-chart-electric-team"></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">가스 팀</span><select class="util-analytics-select" data-role="energy-chart-gas-team"></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">기간</span><div class="util-analytics-range"><select class="util-analytics-select" data-role="energy-chart-from"></select><span class="util-analytics-divider">~</span><select class="util-analytics-select" data-role="energy-chart-to"></select></div></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">지표</span><select class="util-analytics-select" data-role="energy-chart-metric"><option value="total_mj">총열량 (MJ)</option><option value="total_gj">총열량 (GJ)</option><option value="total_toe">총열량 (TOE)</option><option value="electric_mj">전기 (MJ)</option><option value="gas_mj">가스 (MJ)</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">소수 표시</span><select class="util-analytics-select" data-role="energy-chart-display-decimals"><option value="0">0자리</option><option value="1">1자리</option><option value="2">2자리</option><option value="3">3자리</option><option value="4">4자리</option></select></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">전기 계수 (MJ/kWh)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-chart-electric-factor" data-format-decimals="2"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">LNG 계수 (MJ/m³)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-chart-lng-factor" data-format-decimals="3"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">LPG 계수 (MJ/kg)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-chart-lpg-factor" data-format-decimals="3"></div>
                                            <div class="util-analytics-field"><span class="util-analytics-label">TOE 기준 (MJ)</span><input type="text" inputmode="decimal" class="util-analytics-select" data-role="energy-chart-toe-factor" data-format-decimals="0"></div>
                                        </div>
                                        <div class="util-analytics-result">
                                            <div class="util-analytics-summary">
                                                <span class="util-analytics-tag"><i class="fa-solid fa-calendar-days"></i>기간</span><span class="util-analytics-value" data-role="energy-chart-range">-</span>
                                                <span class="util-analytics-tag"><i class="fa-solid fa-layer-group"></i>합계</span><span class="util-analytics-value" data-role="energy-chart-total">-</span>
                                                <span class="util-analytics-tag"><i class="fa-solid fa-chart-line"></i>월평균</span><span class="util-analytics-value" data-role="energy-chart-avg">-</span>
                                                <span class="util-analytics-tag"><i class="fa-solid fa-list"></i>월수</span><span class="util-analytics-value" data-role="energy-chart-count">-</span>
                                                <button type="button" class="util-analytics-toggle" data-role="energy-chart-open">그래프 크게 보기</button>
                                            </div>
                                            <div class="util-analytics-chart-shell"><div data-role="energy-chart"></div></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);
            initUtilTabs(modal);
            initUtilEnergyConverter(modal);
            initUtilEnergyChart(modal);

            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeUtilEnergyModal();
                    return;
                }
                const closeBtn = event.target.closest('[data-role="util-energy-modal-close"]');
                if (closeBtn) {
                    closeUtilEnergyModal();
                    return;
                }
                const printBtn = event.target.closest('[data-role="util-energy-modal-print"]');
                if (printBtn) {
                    window.print();
                }
            });

            const popupToggle = modal.querySelector('[data-role="util-energy-modal-enable-chart-popup"]');
            if (popupToggle) {
                popupToggle.addEventListener('change', () => {
                    UtilEnergyState.chartPopupEnabled = !!popupToggle.checked;
                    syncUtilEnergyChartPopupControls(modal);
                    modal.querySelectorAll('[data-util-energy-chart]').forEach(panel => {
                        renderUtilEnergyChart(panel);
                    });
                });
            }

            if (!window.__utilEnergyModalEscapeBound) {
                window.__utilEnergyModalEscapeBound = true;
                window.addEventListener('keydown', event => {
                    if (event.key !== 'Escape') return;
                    const opened = document.getElementById('util-energy-modal');
                    if (!opened || !opened.classList.contains('is-open')) return;
                    closeUtilEnergyModal();
                });
            }

            return modal;
        }

        function ensureUtilEnergyReportStateRange() {
            const months = buildUtilEnergyMonthOptions();
            if (!months.length) return [];
            const monthSet = new Set(months.map(item => item.value));
            const firstValue = months[0].value;
            const lastValue = months[months.length - 1].value;
            if (!monthSet.has(UtilEnergyReportState.from)) UtilEnergyReportState.from = firstValue;
            if (!monthSet.has(UtilEnergyReportState.to)) UtilEnergyReportState.to = lastValue;
            const range = normalizeMonthRange(UtilEnergyReportState.from, UtilEnergyReportState.to);
            UtilEnergyReportState.from = monthSet.has(range.start) ? range.start : firstValue;
            UtilEnergyReportState.to = monthSet.has(range.end) ? range.end : lastValue;
            return months;
        }

        function getUtilEnergyReportSiteColor(siteKey) {
            return siteKey === 'Plant B' ? '#f97316' : '#2563eb';
        }

        function getUtilEnergyReportSourceColor(siteKey, sourceKey) {
            if (sourceKey === 'gas') {
                return siteKey === 'Plant B' ? '#ea580c' : '#dc2626';
            }
            return siteKey === 'Plant B' ? '#fb923c' : '#2563eb';
        }

        function getUtilEnergyReportTeamLabel(teamName, siteKey = '') {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (canonical === 'LineAlpha') return 'Line Alpha';
            if (canonical === 'LineBeta') return 'Line Beta';
            if (canonical === 'LineGamma') return 'Line Gamma';
            if (canonical === 'LineDelta') return 'Line Delta';
            if (canonical === 'Plant B') return 'Line Alpha';
            if (canonical === 'Plant A') return siteKey === 'Plant A' ? 'Plant A' : 'Plant A';
            const stripped = String(teamName || '').replace(/\s+(?:LNG|LPG)\s*$/iu, '').trim();
            return stripped || (siteKey === 'Plant B' ? 'Line Alpha' : (siteKey === 'Plant A' ? 'Plant A' : '미지정'));
        }

        function createUtilEnergyReportSiteBucket() {
            return {
                total: 0,
                electric: 0,
                gas: 0,
                electricUsage: 0,
                gasLngUsage: 0,
                gasLpgUsage: 0,
                teams: {}
            };
        }

        function createUtilEnergyReportTeamBucket() {
            return {
                total: 0,
                electric: 0,
                gas: 0,
                gasLng: 0,
                gasLpg: 0,
                electricUsage: 0,
                gasLngUsage: 0,
                gasLpgUsage: 0
            };
        }

        function accumulateUtilEnergyReportTeamBucket(targetBucket, sourceBucket) {
            if (!targetBucket || !sourceBucket) return targetBucket;
            targetBucket.electric += Number(sourceBucket.electric) || 0;
            targetBucket.gas += Number(sourceBucket.gas) || 0;
            targetBucket.gasLng += Number(sourceBucket.gasLng) || 0;
            targetBucket.gasLpg += Number(sourceBucket.gasLpg) || 0;
            targetBucket.electricUsage += Number(sourceBucket.electricUsage) || 0;
            targetBucket.gasLngUsage += Number(sourceBucket.gasLngUsage) || 0;
            targetBucket.gasLpgUsage += Number(sourceBucket.gasLpgUsage) || 0;
            targetBucket.total = (Number(targetBucket.electric) || 0) + (Number(targetBucket.gas) || 0);
            return targetBucket;
        }

        function buildUtilEnergyReportAggregateTeamMap(sites) {
            const teamMap = new Map();
            ['Plant A', 'Plant B'].forEach(siteKey => {
                Object.entries(sites?.[siteKey]?.teams || {}).forEach(([teamName, teamBucket]) => {
                    if (!teamMap.has(teamName)) {
                        teamMap.set(teamName, createUtilEnergyReportTeamBucket());
                    }
                    accumulateUtilEnergyReportTeamBucket(teamMap.get(teamName), teamBucket);
                });
            });
            return teamMap;
        }

        function getUtilEnergyReportElectricTeamOrderRank(teamName) {
            const canonical = canonicalizeUtilTeamName(teamName);
            if (canonical === 'Plant A') return 0;
            if (canonical === 'LineAlpha') return 1;
            if (canonical === 'LineBeta') return 2;
            if (canonical === 'LineGamma') return 3;
            if (canonical === 'LineDelta') return 4;
            return 50;
        }

        function getUtilEnergyReportGasTeamOrderRank(teamName, fuelKey = '', isCombined = false) {
            const canonical = canonicalizeUtilTeamName(teamName);
            let baseRank = 50;
            if (canonical === 'Plant A') baseRank = 0;
            else if (canonical === 'LineAlpha') baseRank = 10;
            else if (canonical === 'LineBeta') baseRank = 20;
            else if (canonical === 'LineDelta') baseRank = 30;
            const normalizedFuel = String(fuelKey || '').trim().toLowerCase();
            const fuelRank = isCombined ? 0 : (normalizedFuel === 'lng' ? 1 : (normalizedFuel === 'lpg' ? 2 : 0));
            return baseRank + fuelRank;
        }

        function getOrCreateUtilEnergyReportSiteBucket(container, siteKey) {
            const key = normalizeUtilReportSiteKey(siteKey);
            if (key === 'all') return null;
            if (!container[key]) {
                container[key] = createUtilEnergyReportSiteBucket();
            }
            return container[key];
        }

        function getOrCreateUtilEnergyReportTeamBucket(siteBucket, teamName) {
            const key = String(teamName || '').trim() || '미지정';
            if (!siteBucket.teams[key]) {
                siteBucket.teams[key] = createUtilEnergyReportTeamBucket();
            }
            return siteBucket.teams[key];
        }

        function finalizeUtilEnergyReportSiteBucket(siteBucket) {
            if (!siteBucket) return;
            Object.values(siteBucket.teams || {}).forEach(teamBucket => {
                teamBucket.total = (Number(teamBucket.electric) || 0) + (Number(teamBucket.gas) || 0);
            });
            siteBucket.total = (Number(siteBucket.electric) || 0) + (Number(siteBucket.gas) || 0);
        }

        function buildEmptyUtilEnergyReportSummary() {
            return {
                totalEnergy: 0,
                electricEnergy: 0,
                gasEnergy: 0,
                sites: {
                    'Plant B': createUtilEnergyReportSiteBucket(),
                    'Plant A': createUtilEnergyReportSiteBucket()
                }
            };
        }

        function buildUtilEnergyReportSiteMetricKey(siteKey = 'all') {
            return `energy-site::${normalizeUtilReportSiteKey(siteKey)}`;
        }

        function parseUtilEnergyReportSiteMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            const prefix = 'energy-site::';
            if (!raw.startsWith(prefix)) {
                return { raw, siteKey: 'all' };
            }
            return {
                raw,
                siteKey: normalizeUtilReportSiteKey(raw.slice(prefix.length).trim())
            };
        }

        function buildUtilEnergyReportSourceMetricKey(siteKey = 'all', sourceKey = '') {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const normalizedSource = String(sourceKey || '').trim() === 'gas' ? 'gas' : (String(sourceKey || '').trim() === 'electric' ? 'electric' : '');
            if (!normalizedSource) return 'energy-source::all';
            return `energy-source::${normalizedSite}::${normalizedSource}`;
        }

        function parseUtilEnergyReportSourceMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            if (raw === 'energy-source::all') {
                return { raw, siteKey: 'all', sourceKey: '' };
            }
            const prefix = 'energy-source::';
            if (!raw.startsWith(prefix)) {
                return { raw, siteKey: 'all', sourceKey: '' };
            }
            const parts = raw.slice(prefix.length).split('::');
            const siteKey = normalizeUtilReportSiteKey(parts[0]);
            const sourceKey = String(parts[1] || '').trim() === 'gas' ? 'gas' : (String(parts[1] || '').trim() === 'electric' ? 'electric' : '');
            return { raw, siteKey, sourceKey };
        }

        function buildUtilEnergyReportDetailMetricKey(siteKey, sourceKey, teamName) {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const normalizedSource = String(sourceKey || '').trim() === 'gas' ? 'gas' : 'electric';
            return `energy-detail::${normalizedSite}::${normalizedSource}::${String(teamName || '').trim()}`;
        }

        function buildUtilEnergyReportDetailFuelMetricKey(siteKey, teamName, fuelKey) {
            const normalizedSite = normalizeUtilReportSiteKey(siteKey);
            const normalizedFuel = String(fuelKey || '').trim().toLowerCase() === 'lpg' ? 'lpg' : 'lng';
            return `energy-detail-fuel::${normalizedSite}::${String(teamName || '').trim()}::${normalizedFuel}`;
        }

        function parseUtilEnergyReportDetailMetric(metricValue) {
            const raw = String(metricValue || '').trim();
            if (raw.startsWith('energy-detail-fuel::')) {
                const parts = raw.slice('energy-detail-fuel::'.length).split('::');
                return {
                    raw,
                    kind: 'gas-fuel',
                    siteKey: normalizeUtilReportSiteKey(parts[0]),
                    sourceKey: 'gas',
                    teamName: String(parts[1] || '').trim(),
                    fuelKey: String(parts[2] || '').trim().toLowerCase() === 'lpg' ? 'lpg' : 'lng'
                };
            }
            if (raw.startsWith('energy-detail::')) {
                const parts = raw.slice('energy-detail::'.length).split('::');
                return {
                    raw,
                    kind: String(parts[1] || '').trim() === 'gas' ? 'gas-team' : 'electric-team',
                    siteKey: normalizeUtilReportSiteKey(parts[0]),
                    sourceKey: String(parts[1] || '').trim() === 'gas' ? 'gas' : 'electric',
                    teamName: String(parts[2] || '').trim(),
                    fuelKey: ''
                };
            }
            return {
                raw,
                kind: '',
                siteKey: 'all',
                sourceKey: '',
                teamName: '',
                fuelKey: ''
            };
        }

        function buildUtilEnergyReportSourceComposition(result) {
            const summary = result?.summary;
            const order = [
                { siteKey: 'Plant A', sourceKey: 'electric', label: 'Plant A 전기' },
                { siteKey: 'Plant A', sourceKey: 'gas', label: 'Plant A 가스' },
                { siteKey: 'Plant B', sourceKey: 'electric', label: 'Plant B 전기' },
                { siteKey: 'Plant B', sourceKey: 'gas', label: 'Plant B 가스' }
            ];
            const items = order
                .map(item => {
                    const siteBucket = summary?.sites?.[item.siteKey];
                    const value = Number(siteBucket?.[item.sourceKey]) || 0;
                    return {
                        key: buildUtilEnergyReportSourceMetricKey(item.siteKey, item.sourceKey),
                        label: item.label,
                        siteKey: item.siteKey,
                        sourceKey: item.sourceKey,
                        value,
                        color: getUtilEnergyReportSourceColor(item.siteKey, item.sourceKey)
                    };
                })
                .filter(item => item.value > 0);
            return {
                title: '공장별 전기/가스 열량 구성비',
                total: items.reduce((acc, item) => acc + item.value, 0),
                items,
                valueType: 'energy',
                totalKey: 'energy-source::all'
            };
        }

        function buildUtilEnergyReportSiteComposition(result) {
            const summary = result?.summary;
            const items = ['Plant A', 'Plant B']
                .map(siteKey => ({
                    key: buildUtilEnergyReportSiteMetricKey(siteKey),
                    label: siteKey,
                    siteKey,
                    value: Number(summary?.sites?.[siteKey]?.total) || 0,
                    color: getUtilEnergyReportSiteColor(siteKey)
                }))
                .filter(item => item.value > 0);
            return {
                title: '총 열량 공장별 구성비 (Plant A/Plant B)',
                total: items.reduce((acc, item) => acc + item.value, 0),
                items,
                valueType: 'energy',
                totalKey: buildUtilEnergyReportSiteMetricKey('all')
            };
        }

        function buildUtilEnergyReportOverviewComposition(result) {
            const summary = result?.summary;
            const order = ['Plant A', 'Plant B'];
            const items = [];
            order.forEach(siteKey => {
                const siteBucket = summary?.sites?.[siteKey];
                const totalValue = Number(siteBucket?.total) || 0;
                if (totalValue > 0) {
                    items.push({
                        key: buildUtilEnergyReportSiteMetricKey(siteKey),
                        label: siteKey,
                        siteKey,
                        value: totalValue,
                        color: getUtilEnergyReportSiteColor(siteKey),
                        excludeFromDonut: true
                    });
                }
                ['electric', 'gas'].forEach(sourceKey => {
                    const value = Number(siteBucket?.[sourceKey]) || 0;
                    if (value <= 0) return;
                    items.push({
                        key: buildUtilEnergyReportSourceMetricKey(siteKey, sourceKey),
                        label: `${siteKey} ${sourceKey === 'gas' ? '가스' : '전기'}`,
                        siteKey,
                        sourceKey,
                        value,
                        color: getUtilEnergyReportSourceColor(siteKey, sourceKey)
                    });
                });
            });
            return {
                title: '공장별 열량 구성비',
                total: Number(summary?.totalEnergy) || 0,
                items,
                valueType: 'energy',
                totalKey: 'energy-overview::all'
            };
        }

        function buildUtilEnergyReportElectricTeamComposition(result) {
            const teamMap = buildUtilEnergyReportAggregateTeamMap(result?.summary?.sites || {});
            const palette = ['#2563eb', '#f97316', '#dc2626', '#0ea5e9', '#16a34a', '#db2777', '#7c3aed', '#ca8a04'];
            const items = Array.from(teamMap.entries())
                .map(([teamName, teamBucket], index) => ({
                    key: buildUtilEnergyReportDetailMetricKey('all', 'electric', teamName),
                    label: `${teamName} 전기`,
                    teamName,
                    siteKey: 'all',
                    sourceKey: 'electric',
                    value: Number(teamBucket?.electric) || 0,
                    color: palette[index % palette.length]
                }))
                .filter(item => item.value > 0)
                .sort((a, b) => {
                    const rankA = getUtilEnergyReportElectricTeamOrderRank(a.teamName);
                    const rankB = getUtilEnergyReportElectricTeamOrderRank(b.teamName);
                    if (rankA !== rankB) return rankA - rankB;
                    return String(a.teamName || '').localeCompare(String(b.teamName || ''), 'ko');
                });
            items.forEach((item, index) => { item.color = palette[index % palette.length]; });
            return {
                title: '팀별 전기 열량 구성비',
                total: items.reduce((acc, item) => acc + item.value, 0),
                items,
                valueType: 'energy',
                totalKey: 'energy-detail-total::all::electric'
            };
        }

        function buildUtilEnergyReportGasTeamComposition(result) {
            const teamMap = buildUtilEnergyReportAggregateTeamMap(result?.summary?.sites || {});
            const palette = ['#dc2626', '#f97316', '#ea580c', '#f59e0b', '#db2777', '#7c3aed', '#0ea5e9', '#16a34a'];
            const items = [];
            Array.from(teamMap.entries()).forEach(([teamName, teamBucket]) => {
                const gasTotal = Number(teamBucket?.gas) || 0;
                if (gasTotal <= 0) return;
                const gasLng = Number(teamBucket?.gasLng) || 0;
                const gasLpg = Number(teamBucket?.gasLpg) || 0;
                if (gasLng > 0 && gasLpg > 0) {
                    items.push({
                        key: buildUtilEnergyReportDetailMetricKey('all', 'gas', teamName),
                        label: `${teamName} 총 가스`,
                        teamName,
                        siteKey: 'all',
                        sourceKey: 'gas',
                        fuelKey: '',
                        value: gasTotal,
                        excludeFromDonut: true
                    });
                    items.push({
                        key: buildUtilEnergyReportDetailFuelMetricKey('all', teamName, 'lng'),
                        label: `${teamName} LNG`,
                        teamName,
                        siteKey: 'all',
                        sourceKey: 'gas',
                        fuelKey: 'lng',
                        value: gasLng
                    });
                    items.push({
                        key: buildUtilEnergyReportDetailFuelMetricKey('all', teamName, 'lpg'),
                        label: `${teamName} LPG`,
                        teamName,
                        siteKey: 'all',
                        sourceKey: 'gas',
                        fuelKey: 'lpg',
                        value: gasLpg
                    });
                    return;
                }
                items.push({
                    key: buildUtilEnergyReportDetailMetricKey('all', 'gas', teamName),
                    label: `${teamName} 가스`,
                    teamName,
                    siteKey: 'all',
                    sourceKey: 'gas',
                    fuelKey: '',
                    value: gasTotal
                });
            });
            const sortedItems = items
                .filter(item => item.value > 0)
                .sort((a, b) => {
                    const rankA = getUtilEnergyReportGasTeamOrderRank(a.teamName, a.fuelKey, a.excludeFromDonut === true);
                    const rankB = getUtilEnergyReportGasTeamOrderRank(b.teamName, b.fuelKey, b.excludeFromDonut === true);
                    if (rankA !== rankB) return rankA - rankB;
                    return String(a.label || '').localeCompare(String(b.label || ''), 'ko');
                })
                .map((item, index) => ({
                    ...item,
                    color: palette[index % palette.length]
                }));
            return {
                title: '팀별 가스 열량 구성비',
                total: sortedItems.reduce((acc, item) => acc + (item.excludeFromDonut ? 0 : item.value), 0),
                items: sortedItems,
                valueType: 'energy',
                totalKey: 'energy-detail-total::all::gas',
                note: 'Line Beta는 LNG/LPG와 총 가스를 함께 표시합니다.'
            };
        }

        function resolveUtilEnergyReportEffectiveSource(result) {
            const sourceComposition = buildUtilEnergyReportSourceComposition(result);
            const active = parseUtilEnergyReportSourceMetric(UtilEnergyReportState.activeSourceKey);
            const activeItem = sourceComposition.items.find(item => item.key === active.raw);
            if (activeItem) return activeItem;
            const preferredSite = normalizeUtilReportSiteKey(UtilEnergyReportState.activeSiteKey);
            const preferredItems = preferredSite === 'all'
                ? sourceComposition.items.slice()
                : sourceComposition.items.filter(item => item.siteKey === preferredSite);
            const candidates = preferredItems.length ? preferredItems : sourceComposition.items.slice();
            if (!candidates.length) return null;
            return candidates.sort((a, b) => Number(b.value) - Number(a.value))[0];
        }
