        function sumUtilDatasetMetricForExport(datasetKey, teamName, yearValue, monthValue, metricKey) {
            const dataset = UTIL_ANALYTICS_UNIFIED[String(datasetKey || '').trim()];
            const entries = Array.isArray(dataset?.entries) ? dataset.entries : [];
            if (!entries.length) return null;
            let sum = 0;
            let hasValue = false;
            entries.forEach(entry => {
                if (Number(entry?.year) !== Number(yearValue) || Number(entry?.month) !== Number(monthValue)) return;
                if (!matchesUtilExportTeamSelection(datasetKey, teamName, entry?.team)) return;
                const rawValue = metricKey === 'cost'
                    ? entry?.cost
                    : entry?.[metricKey];
                const numeric = parseUtilAmount(rawValue);
                if (!Number.isFinite(numeric)) return;
                sum += numeric;
                hasValue = true;
            });
            return hasValue ? sum : null;
        }

        function sumUtilWasteCostDetailsForExport(teamName, yearValue, monthValue) {
            const totals = {};
            let hasValue = false;
            (UTIL_WASTE_ENTRIES || []).forEach(entry => {
                if (Number(entry?.year) !== Number(yearValue) || Number(entry?.month) !== Number(monthValue)) return;
                if (!matchesUtilExportTeamSelection('waste', teamName, entry?.team)) return;
                const costs = entry?.costs && typeof entry.costs === 'object'
                    ? entry.costs
                    : null;
                if (costs) {
                    let hasDetailValue = false;
                    Object.keys(costs).forEach(key => {
                        const numeric = parseUtilAmount(costs[key]);
                        if (!Number.isFinite(numeric)) return;
                        totals[key] = (Number(totals[key]) || 0) + numeric;
                        hasValue = true;
                        hasDetailValue = true;
                    });
                    if (hasDetailValue) return;
                }
                const totalNumeric = parseUtilAmount(entry?.cost);
                if (!Number.isFinite(totalNumeric)) return;
                totals.total = (Number(totals.total) || 0) + totalNumeric;
                hasValue = true;
            });
            return hasValue ? totals : null;
        }

        function resolveUtilExportProductionValue(teamName, yearValue, monthValue) {
            const metric = getUtilDailyMetricValue(teamName, yearValue, monthValue, 'amount');
            const value = Number(metric?.value);
            return Number.isFinite(value) ? value : null;
        }

        function buildUtilMetricExportRows(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            const fromYm = String(options.fromYm || '').trim();
            const toYm = String(options.toYm || '').trim();
            const teamName = String(options.teamName || '').trim();
            const selectedItemKeys = normalizeUtilMetricSelectionKeys(
                Array.isArray(options.itemKeys) ? options.itemKeys : (options.itemKey || 'none'),
                []
            );
            const metricKeys = expandUtilMetricSelectionKeys(selectedItemKeys, []);
            if (!datasetKey || !fromYm || !toYm || !teamName || !metricKeys.length) return [];
            const range = buildUtilYearMonthRange(fromYm, toYm);
            if (!range.length) return [];
            const rows = [];
            const wasteCostModes = datasetKey === 'waste'
                ? getWasteCostModesByTeam(teamName).filter(mode => String(mode?.key || '').trim())
                : [];
            range.forEach(point => {
                metricKeys.forEach(targetItemKey => {
                    if (datasetKey === 'waste' && targetItemKey === 'cost') {
                        const detailValues = sumUtilWasteCostDetailsForExport(teamName, point.year, point.month);
                        const totalValue = parseUtilAmount(detailValues?.total);
                        if (Number.isFinite(totalValue)) {
                            rows.push({
                                period: point.key,
                                team: teamName,
                                itemKey: 'cost',
                                value: totalValue
                            });
                        } else {
                            const fallbackTotal = sumUtilDatasetMetricForExport(datasetKey, teamName, point.year, point.month, 'cost');
                            if (Number.isFinite(fallbackTotal)) {
                                rows.push({
                                    period: point.key,
                                    team: teamName,
                                    itemKey: 'cost',
                                    value: fallbackTotal
                                });
                            }
                        }
                        wasteCostModes.forEach(mode => {
                            const subKey = String(mode?.key || '').trim();
                            if (!subKey || subKey === 'total') return;
                            const numeric = parseUtilAmount(detailValues?.[subKey]);
                            if (!Number.isFinite(numeric)) return;
                            rows.push({
                                period: point.key,
                                team: teamName,
                                itemKey: `cost:${subKey}`,
                                value: numeric
                            });
                        });
                        return;
                    }
                    const value = targetItemKey === 'production'
                        ? resolveUtilExportProductionValue(teamName, point.year, point.month)
                        : sumUtilDatasetMetricForExport(datasetKey, teamName, point.year, point.month, targetItemKey);
                    if (!Number.isFinite(value)) return;
                    rows.push({
                        period: point.key,
                        team: teamName,
                        itemKey: targetItemKey,
                        value
                    });
                });
            });
            return rows;
        }

        function sanitizeUtilExportFileToken(value, fallback = '전체') {
            const text = String(value || '').trim() || fallback;
            return text.replace(/[\\/:*?"<>|]/g, '_');
        }

        function downloadUtilMetricExportXlsx(rows, options = {}) {
            if (!window.XLSX) throw new Error('엑셀 라이브러리 로드 실패');
            const datasetKey = String(options.datasetKey || '').trim();
            const datasetLabel = getUtilDatasetLabel(datasetKey);
            const selectedItemKeys = normalizeUtilMetricSelectionKeys(
                Array.isArray(options.itemKeys) ? options.itemKeys : (options.itemKey || 'none'),
                []
            );
            const metricKeys = expandUtilMetricSelectionKeys(selectedItemKeys, []);
            const itemLabel = getUtilMetricSelectionFileLabel(selectedItemKeys);
            const formatExportMetricValue = (metricKey, rawValue) => {
                const numeric = parseUtilAmount(rawValue);
                if (!Number.isFinite(numeric)) return '';
                if (metricKey === 'cost') return formatUtilNumber(numeric, 0);
                if (metricKey === 'usage') return formatUtilNumber(numeric, 3);
                if (metricKey === 'production') return formatUtilNumber(numeric, 3);
                return formatUtilNumber(numeric, 3);
            };
            const teamName = String(options.teamName || '').trim();
            const fromYm = String(options.fromYm || '').trim();
            const toYm = String(options.toYm || '').trim();
            const sortedRows = (Array.isArray(rows) ? rows : [])
                .slice()
                .sort((a, b) => {
                    const periodDiff = String(a?.period || '').localeCompare(String(b?.period || ''), 'ko');
                    if (periodDiff !== 0) return periodDiff;
                    const teamDiff = String(a?.team || '').localeCompare(String(b?.team || ''), 'ko');
                    if (teamDiff !== 0) return teamDiff;
                    const orderMap = { usage: 1, cost: 2, production: 3 };
                    const aOrder = orderMap[String(a?.itemKey || '')] || 99;
                    const bOrder = orderMap[String(b?.itemKey || '')] || 99;
                    return aOrder - bOrder;
                });
            const includeUsage = metricKeys.includes('usage');
            const includeCost = metricKeys.includes('cost');
            const includeProduction = metricKeys.includes('production');
            const isWasteDetailedCostExport = datasetKey === 'waste'
                && includeCost
                && sortedRows.some(row => String(row?.itemKey || '').startsWith('cost:'));
            const wasteCostModes = isWasteDetailedCostExport
                ? getWasteCostModesByTeam(teamName).filter(mode => String(mode?.key || '').trim())
                : [];
            const wasteCostDetailModes = wasteCostModes.filter(mode => String(mode?.key || '').trim() !== 'total');
            const buildGroupedExportRows = () => {
                const grouped = new Map();
                sortedRows.forEach(row => {
                    const period = String(row?.period || '');
                    const team = String(row?.team || '');
                    const key = `${period}||${team}`;
                    if (!grouped.has(key)) {
                        grouped.set(key, {
                            period,
                            team,
                            usage: null,
                            cost: null,
                            production: null,
                            costDetails: {}
                        });
                    }
                    const target = grouped.get(key);
                    const metricKey = String(row?.itemKey || '').trim();
                    const metricValue = parseUtilAmount(row?.value);
                    if (!Number.isFinite(metricValue)) return;
                    if (metricKey === 'usage') {
                        target.usage = metricValue;
                        return;
                    }
                    if (metricKey === 'cost') {
                        target.cost = metricValue;
                        return;
                    }
                    if (metricKey === 'production') {
                        target.production = metricValue;
                        return;
                    }
                    if (metricKey.startsWith('cost:')) {
                        target.costDetails[metricKey.slice(5)] = metricValue;
                    }
                });
                return Array.from(grouped.values()).sort((a, b) => {
                    const periodDiff = String(a.period || '').localeCompare(String(b.period || ''), 'ko');
                    if (periodDiff !== 0) return periodDiff;
                    return String(a.team || '').localeCompare(String(b.team || ''), 'ko');
                });
            };

            const sheetRows = [];
            let dataSheetCols = [];
            let usageTotal = 0;
            let costTotal = 0;
            let productionTotal = 0;
            const wasteDetailTotals = {};
            const groupedRows = buildGroupedExportRows();
            const headerRow = ['기간', '팀'];
            if (includeUsage) headerRow.push('사용량');
            if (includeCost) {
                headerRow.push('비용');
                if (isWasteDetailedCostExport) {
                    headerRow.push(...wasteCostDetailModes.map(mode => stripUtilLabelUnitSuffix(mode?.label || mode?.key || '')));
                }
            }
            if (includeProduction) headerRow.push('생산량');
            sheetRows.push(headerRow);

            groupedRows.forEach(row => {
                const line = [row.period, row.team];
                const usageValue = Number(row.usage);
                const costValue = Number(row.cost);
                const productionValue = Number(row.production);
                if (includeUsage) {
                    if (Number.isFinite(usageValue)) usageTotal += usageValue;
                    line.push(formatExportMetricValue('usage', row.usage));
                }
                if (includeCost) {
                    if (Number.isFinite(costValue)) costTotal += costValue;
                    line.push(formatExportMetricValue('cost', row.cost));
                    if (isWasteDetailedCostExport) {
                        wasteCostDetailModes.forEach(mode => {
                            const key = String(mode?.key || '').trim();
                            const detailValue = Number(row.costDetails?.[key]);
                            if (Number.isFinite(detailValue)) {
                                wasteDetailTotals[key] = (Number(wasteDetailTotals[key]) || 0) + detailValue;
                            }
                            line.push(formatExportMetricValue('cost', row.costDetails?.[key]));
                        });
                    }
                }
                if (includeProduction) {
                    if (Number.isFinite(productionValue)) productionTotal += productionValue;
                    line.push(formatExportMetricValue('production', row.production));
                }
                sheetRows.push(line);
            });

            dataSheetCols = [
                { wch: 10 },
                { wch: 12 },
                ...(includeUsage ? [{ wch: 14 }] : []),
                ...(includeCost ? [{ wch: 16 }] : []),
                ...(includeCost && isWasteDetailedCostExport ? wasteCostDetailModes.map(() => ({ wch: 18 })) : []),
                ...(includeProduction ? [{ wch: 14 }] : [])
            ];
            const dataSheet = XLSX.utils.aoa_to_sheet(sheetRows);
            dataSheet['!cols'] = dataSheetCols;

            const summaryRows = [
                ['생성일시', new Date().toLocaleString('ko-KR')],
                ['구분', datasetLabel],
                ['기간', `${fromYm} ~ ${toYm}`],
                ['팀', teamName],
                ['품목', itemLabel],
                ['데이터 행수', formatUtilNumber(Math.max(0, sheetRows.length - 1), 0)]
            ];
            if (includeUsage) {
                summaryRows.push(['사용량 합계', formatExportMetricValue('usage', usageTotal)]);
            }
            if (includeCost) {
                summaryRows.push(['비용 합계', formatExportMetricValue('cost', costTotal)]);
                if (isWasteDetailedCostExport) {
                    wasteCostDetailModes.forEach(mode => {
                        const key = String(mode?.key || '').trim();
                        summaryRows.push([`${stripUtilLabelUnitSuffix(mode?.label || key)} 합계`, formatExportMetricValue('cost', wasteDetailTotals[key])]);
                    });
                }
            }
            if (includeProduction) {
                summaryRows.push(['생산량 합계', formatExportMetricValue('production', productionTotal)]);
            }
            const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, dataSheet, '추출데이터');
            XLSX.utils.book_append_sheet(workbook, summarySheet, '요약');
            const periodToken = `${sanitizeUtilExportFileToken(fromYm)}-${sanitizeUtilExportFileToken(toYm)}`;
            const fileName = `유틸리티추출_${periodToken}_${sanitizeUtilExportFileToken(teamName)}_${sanitizeUtilExportFileToken(itemLabel)}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            return fileName;
        }

        function ensureUtilMetricExportModal() {
            let modal = document.getElementById('util-metric-export-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-metric-export-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card" role="dialog" aria-modal="true" aria-label="유틸리티 엑셀 추출">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title">유틸리티 엑셀 추출</div>
                        <div class="util-production-modal-header-actions">
                            <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                        </div>
                    </div>
                    <div class="util-production-modal-body">
                        <div class="util-production-modal-meta">
                            <span data-role="dataset"></span>
                            <span data-role="summary">기간 / 팀 / 품목 선택 후 추출</span>
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:0.5rem;">
                            <label class="util-dual-control">
                                시작
                                <select class="util-table-select util-table-select-sm" data-role="start"></select>
                            </label>
                            <label class="util-dual-control">
                                종료
                                <select class="util-table-select util-table-select-sm" data-role="end"></select>
                            </label>
                            <label class="util-dual-control">
                                팀
                                <select class="util-table-select util-table-select-sm" data-role="team"></select>
                            </label>
                        </div>
                        <div style="display:grid; gap:0.32rem;">
                            <div style="font-size:0.72rem; font-weight:800; color:#475569;">품목</div>
                            ${buildUtilMetricToggleButtonsHtml(['all'], 'export-item-toggle')}
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:0.4rem;">
                            <button type="button" class="util-detail-btn" data-role="download">엑셀 추출</button>
                        </div>
                    </div>
                </div>
            `;
            modal.addEventListener('click', event => {
                if (event.target === modal) closeUtilMetricExportModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) closeBtn.addEventListener('click', () => closeUtilMetricExportModal());
            document.body.appendChild(modal);
            return modal;
        }

        function closeUtilMetricExportModal() {
            const modal = document.getElementById('util-metric-export-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

        function openUtilMetricExportModal(options = {}) {
            const datasetKey = String(options.datasetKey || '').trim();
            if (!datasetKey) return;
            const monthOptions = listUtilDatasetYearMonths(datasetKey);
            if (!monthOptions.length) {
                alert('추출 가능한 기간 데이터가 없습니다.');
                return;
            }
            const modal = ensureUtilMetricExportModal();
            modal.dataset.datasetKey = datasetKey;
            const datasetBadge = modal.querySelector('[data-role="dataset"]');
            const summaryEl = modal.querySelector('[data-role="summary"]');
            if (datasetBadge) datasetBadge.textContent = `구분: ${getUtilDatasetLabel(datasetKey)}`;
            const startSelect = modal.querySelector('[data-role="start"]');
            const endSelect = modal.querySelector('[data-role="end"]');
            const teamSelect = modal.querySelector('[data-role="team"]');
            if (startSelect) {
                startSelect.innerHTML = monthOptions.map(month => `<option value="${month}">${month}</option>`).join('');
                startSelect.value = monthOptions[0];
            }
            if (endSelect) {
                endSelect.innerHTML = monthOptions.map(month => `<option value="${month}">${month}</option>`).join('');
                endSelect.value = monthOptions[monthOptions.length - 1];
            }
            if (teamSelect) {
                const teamOptions = buildUtilExportTeamOptions(datasetKey);
                teamSelect.innerHTML = teamOptions.map(team => `<option value="${team}">${team}</option>`).join('');
                teamSelect.value = teamOptions[0] || '';
            }
            modal.dataset.selectedItemKeys = serializeUtilMetricSelectionKeys(['all'], ['all']);
            syncUtilMetricToggleButtons(modal, ['all'], 'export-item-toggle');
            const syncExportSummary = () => {
                const selectedItemKeys = normalizeUtilMetricSelectionKeys(modal.dataset.selectedItemKeys || 'none', []);
                syncUtilMetricToggleButtons(modal, selectedItemKeys, 'export-item-toggle');
                if (summaryEl) {
                    const fromYm = String(startSelect?.value || '').trim() || '-';
                    const toYm = String(endSelect?.value || '').trim() || '-';
                    const teamName = String(teamSelect?.value || '').trim() || '-';
                    const itemSummary = getUtilMetricSelectionLabels(selectedItemKeys).join(', ');
                    summaryEl.textContent = `${teamName} · ${itemSummary || '-'} · ${fromYm} ~ ${toYm}`;
                }
            };
            if (startSelect) {
                startSelect.onchange = () => {
                    if (endSelect && startSelect.value && endSelect.value && startSelect.value > endSelect.value) {
                        endSelect.value = startSelect.value;
                    }
                    syncExportSummary();
                };
            }
            if (endSelect) {
                endSelect.onchange = () => {
                    if (startSelect && startSelect.value && endSelect.value && startSelect.value > endSelect.value) {
                        startSelect.value = endSelect.value;
                    }
                    syncExportSummary();
                };
            }
            if (teamSelect) {
                teamSelect.onchange = () => {
                    syncExportSummary();
                };
            }
            modal.querySelectorAll('[data-role="export-item-toggle"]').forEach(button => {
                button.onclick = () => {
                    const current = String(modal.dataset.selectedItemKeys || '').trim();
                    const next = toggleUtilMetricSelectionKeys(current, button.dataset.itemKey || '');
                    modal.dataset.selectedItemKeys = serializeUtilMetricSelectionKeys(next);
                    syncExportSummary();
                };
            });
            syncExportSummary();
            const downloadBtn = modal.querySelector('[data-role="download"]');
            if (downloadBtn) {
                downloadBtn.onclick = () => {
                    if (!window.XLSX) {
                        alert('엑셀 라이브러리 로드 실패: 네트워크 상태를 확인해주세요.');
                        return;
                    }
                    const fromYm = String(startSelect?.value || '').trim();
                    const toYm = String(endSelect?.value || '').trim();
                    const teamName = String(teamSelect?.value || '').trim();
                    const selectedItemKeys = normalizeUtilMetricSelectionKeys(modal.dataset.selectedItemKeys || 'none', []);
                    if (!fromYm || !toYm || !teamName || !selectedItemKeys.length) {
                        alert('시작/종료/팀/품목을 선택해주세요.');
                        return;
                    }
                    if (fromYm > toYm) {
                        alert('시작 기간은 종료 기간보다 늦을 수 없습니다.');
                        return;
                    }
                    const rows = buildUtilMetricExportRows({
                        datasetKey,
                        fromYm,
                        toYm,
                        teamName,
                        itemKeys: selectedItemKeys
                    });
                    if (!rows.length) {
                        alert('선택한 조건에 맞는 데이터가 없습니다.');
                        return;
                    }
                    try {
                        const fileName = downloadUtilMetricExportXlsx(rows, {
                            datasetKey,
                            fromYm,
                            toYm,
                            teamName,
                            itemKeys: selectedItemKeys
                        });
                        alert(`엑셀 추출 완료: ${fileName}`);
                        closeUtilMetricExportModal();
                    } catch (error) {
                        alert(`엑셀 추출 실패: ${error?.message || '알 수 없는 오류'}`);
                    }
                };
            }
            modal.classList.add('is-open');
        }
