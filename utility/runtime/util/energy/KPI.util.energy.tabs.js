        function renderUtilDualTabs(scope) {
            const root = scope || document;
            root.querySelectorAll('[data-util-dual]').forEach(wrapper => {
                const key = wrapper.dataset.utilDual;
                const config = UTIL_DUAL_CONFIG[key];
                if (!config) return;
                const data = config.data || [];
                const tabs = wrapper.querySelector('[data-util-dual-tabs]');
                const combinedSection = wrapper.querySelector('[data-util-dual-section="combined"]');
                const combinedContent = wrapper.querySelector('[data-util-dual-content="combined"]');
                const controls = combinedSection?.querySelector('[data-util-dual-controls]');
                const isGas = key === 'gas';
                if (!tabs || !combinedSection || !combinedContent) return;

                tabs.innerHTML = data.map((team, index) => `
                    <button class="util-team-tab ${index === 0 ? 'active' : ''}" data-team="${team.name}">${team.name}</button>
                `).join('');

                const renderTeam = (teamName) => {
                    const team = data.find(item => item.name === teamName) || data[0];
                    if (!team || !team.years || !team.years.length) {
                        combinedContent.innerHTML = `<p class="text-slate-500">${config.emptyText || '현재 등록된 데이터가 없습니다. 담당 부서에서 확인 후 정식 데이터를 등록해 주세요.'}</p>`;
                        return;
                    }
                    const visibleYears = (team.years || []).filter(year => {
                        const yearValue = parseUtilYearLabel(year?.label);
                        if (!Number.isFinite(yearValue)) return false;
                        return (year?.rows || []).some(row => {
                            if (row?.label === '계' || row?.label === '평균') return false;
                            const month = parseUtilMonthLabel(row?.label);
                            if (!month) return false;
                            return isUtilYearMonthWithinToday(yearValue, month);
                        });
                    });
                    if (!visibleYears.length) {
                        combinedContent.innerHTML = `<p class="text-slate-500">${config.emptyText || '현재 등록된 데이터가 없습니다. 담당 부서에서 확인 후 정식 데이터를 등록해 주세요.'}</p>`;
                        return;
                    }
                    tabs.querySelectorAll('.util-team-tab').forEach(tab => {
                        tab.classList.toggle('active', tab.dataset.team === team.name);
                    });
                    combinedSection.dataset.activeTeam = team.name || '';
                    combinedSection.dataset.datasetKey = key;
                    if (!combinedSection.dataset.usageUnitKey) combinedSection.dataset.usageUnitKey = normalizeUtilDualUsageUnitKey('', key);
                    if (!combinedSection.dataset.costUnitKey) combinedSection.dataset.costUnitKey = 'krw';
                    if (!combinedSection.dataset.productionUnitKey) combinedSection.dataset.productionUnitKey = 'kg';
                    if (!combinedSection.dataset.usageDecimals) combinedSection.dataset.usageDecimals = '0';
                    if (!combinedSection.dataset.costDecimals) combinedSection.dataset.costDecimals = '0';
                    if (!combinedSection.dataset.productionDecimals) combinedSection.dataset.productionDecimals = '0';
                    if (!combinedSection.dataset.ratioNumerator) combinedSection.dataset.ratioNumerator = 'usage';
                    if (!combinedSection.dataset.ratioDenominator) combinedSection.dataset.ratioDenominator = 'production';
                    if (!combinedSection.dataset.ratioDecimals) combinedSection.dataset.ratioDecimals = '3';
                    if (isGas && !combinedSection.dataset.gasConvert) combinedSection.dataset.gasConvert = 'off';
                    const teamCostModes = config.costModesByTeam
                        ? (config.costModesByTeam(team.name) || [])
                        : (config.costModes || []);
                    const defaultCostMode = config.costModeKey || teamCostModes[0]?.key || 'total';
                    if (teamCostModes.length) {
                        const currentMode = combinedSection.dataset.costMode;
                        if (!currentMode || !teamCostModes.some(mode => mode.key === currentMode)) {
                            combinedSection.dataset.costMode = defaultCostMode;
                        }
                    }
                    const gasConvertMode = isGas ? (combinedSection.dataset.gasConvert || 'off') : 'off';
                    if (!combinedSection._yearOpenStateByTeam) combinedSection._yearOpenStateByTeam = {};
                    const teamStateKey = String(team.name || '__default__');
                    if (!combinedSection._yearOpenStateByTeam[teamStateKey]) {
                        combinedSection._yearOpenStateByTeam[teamStateKey] = {};
                    }
                    const yearOpenState = combinedSection._yearOpenStateByTeam[teamStateKey];
                    const yearMeta = visibleYears.map((year, index) => {
                        const yearKey = makeUtilYearKey(year?.label, index);
                        if (yearOpenState[yearKey] === undefined) yearOpenState[yearKey] = true;
                        return {
                            year,
                            yearKey,
                            isOpen: yearOpenState[yearKey] !== false
                        };
                    });
                    const yearTabsHtml = yearMeta.map(meta => {
                        const rawLabel = String(meta.year?.label || '').trim();
                        const yearLabel = rawLabel.endsWith('년') ? rawLabel : `${rawLabel}년`;
                        return `
                            <div class="util-year-tab-group">
                                <button type="button" class="util-year-tab-btn ${meta.isOpen ? 'active' : ''}" data-year-tab="${meta.yearKey}">${escapeHtml(yearLabel)}</button>
                            </div>
                        `;
                    }).join('');
                    const reportShortcutHtml = `
                        <div class="util-year-tab-group is-report">
                            <button type="button" class="util-year-tab-btn is-report" data-util-report-inline-open="${escapeHtml(key)}">그래프</button>
                        </div>
                    `;
                    const yearTablesHtml = yearMeta
                        .map(meta => renderUtilDualTable(meta.year, config, team.name, {
                            datasetKey: key,
                            gasConvert: gasConvertMode,
                            yearKey: meta.yearKey,
                            isYearOpen: meta.isOpen
                        }))
                        .join('');
                    combinedContent.innerHTML = `
                        <div class="util-year-tabs">${yearTabsHtml}${reportShortcutHtml}</div>
                        ${yearTablesHtml}
                    `;
                    syncUtilDualSelects(combinedSection);
                    applyUtilCostMode(combinedSection);
                    applyUtilDualConversion(combinedSection);
                    combinedContent.querySelectorAll('[data-unit]').forEach(select => {
                        select.addEventListener('change', () => {
                            const type = select.dataset.unit;
                            if (type === 'usage') combinedSection.dataset.usageUnitKey = normalizeUtilDualUsageUnitKey(select.value, key);
                            if (type === 'cost') combinedSection.dataset.costUnitKey = normalizeUtilReportCostUnitKey(select.value);
                            if (type === 'production') combinedSection.dataset.productionUnitKey = normalizeUtilReportProductionUnitKey(select.value);
                            syncUtilDualSelects(combinedSection);
                            applyUtilCostMode(combinedSection);
                            applyUtilDualConversion(combinedSection);
                        });
                    });
                    combinedSection.querySelectorAll('[data-cost-mode]').forEach(select => {
                        select.addEventListener('change', () => {
                            combinedSection.dataset.costMode = select.value;
                            syncUtilDualSelects(combinedSection);
                            applyUtilCostMode(combinedSection);
                            applyUtilDualConversion(combinedSection);
                        });
                    });
                    combinedContent.querySelectorAll('[data-decimals]').forEach(select => {
                        select.addEventListener('change', () => {
                            const type = select.dataset.decimals;
                            if (type === 'usage') combinedSection.dataset.usageDecimals = select.value;
                            if (type === 'cost') combinedSection.dataset.costDecimals = select.value;
                            if (type === 'production') combinedSection.dataset.productionDecimals = select.value;
                            if (type === 'ratio') combinedSection.dataset.ratioDecimals = select.value;
                            combinedSection.dataset.reportDecimals = select.value;
                            syncUtilDualSelects(combinedSection);
                            applyUtilCostMode(combinedSection);
                            applyUtilDualConversion(combinedSection);
                        });
                    });
                    combinedSection.querySelectorAll('[data-ratio-part]').forEach(select => {
                        select.addEventListener('change', () => {
                            const part = select.dataset.ratioPart === 'denominator' ? 'ratioDenominator' : 'ratioNumerator';
                            combinedSection.dataset[part] = normalizeUtilDualRatioMetricKey(select.value);
                            syncUtilDualSelects(combinedSection);
                            applyUtilCostMode(combinedSection);
                            applyUtilDualConversion(combinedSection);
                        });
                    });
                    combinedContent.querySelectorAll('[data-decimals-toggle]').forEach(button => {
                        button.addEventListener('click', event => {
                            event.stopPropagation();
                            const popover = button.parentElement?.querySelector('[data-decimals-popover]');
                            if (!popover) return;
                            const shouldOpen = popover.hidden;
                            closeUtilDualDecimalsPopovers(combinedContent);
                            popover.hidden = !shouldOpen;
                            button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                        });
                    });
                    combinedContent.querySelectorAll('[data-decimals-popover]').forEach(popover => {
                        popover.addEventListener('click', event => {
                            event.stopPropagation();
                        });
                    });
                    combinedContent.addEventListener('click', () => {
                        closeUtilDualDecimalsPopovers(combinedContent);
                    });
                    combinedContent.querySelectorAll('[data-year-toggle]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const yearKey = btn.dataset.yearToggle;
                            if (!yearKey) return;
                            yearOpenState[yearKey] = !(yearOpenState[yearKey] !== false);
                            renderTeam(combinedSection.dataset.activeTeam || data[0]?.name);
                        });
                    });
                    combinedContent.querySelectorAll('[data-year-tab]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const yearKey = btn.dataset.yearTab;
                            if (!yearKey) return;
                            if (yearOpenState[yearKey] === false) {
                                yearOpenState[yearKey] = true;
                                renderTeam(combinedSection.dataset.activeTeam || data[0]?.name);
                                return;
                            }
                            const target = combinedContent.querySelector(`[data-util-year-card="${yearKey}"]`);
                            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    });
                    const reportShortcutButton = combinedContent.querySelector('[data-util-report-inline-open]');
                    if (reportShortcutButton) {
                        reportShortcutButton.addEventListener('click', event => {
                            event.preventDefault();
                            event.stopPropagation();
                            syncUtilReportBuilderVizStateFromDualSection(combinedSection, key);
                            toggleUtilInlineReport(key, combinedSection.dataset.activeTeam || data[0]?.name || '');
                        });
                    }
                    combinedContent.querySelectorAll('[data-year-action]').forEach(button => {
                        button.addEventListener('click', () => {
                            const action = String(button.dataset.yearAction || '').trim();
                            const datasetKey = String(button.dataset.datasetKey || '').trim();
                            const yearValue = Number(button.dataset.year);
                            const teamName = decodeURIComponent(String(button.dataset.team || ''));
                            if (action !== 'delete' || !datasetKey || !Number.isFinite(yearValue) || !teamName) return;
                            openUtilSelectiveDeleteModal({
                                datasetKey,
                                teamName,
                                fromYm: `${yearValue}-01`,
                                toYm: `${yearValue}-12`,
                                onApplied: result => {
                                    if (typeof setLastModified === 'function') {
                                        setLastModified('유틸리티 관리');
                                    }
                                    const activeTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                                    renderTeam(activeTeam);
                                    syncProductionControlState();
                                    refreshUtilViewsAfterDataMutation(root);
                                    if (result?.removedProductionCount > 0) {
                                        alert(`생산량 ${result.removedProductionCount.toLocaleString('ko-KR')}건을 삭제했습니다.`);
                                    } else {
                                        alert('선택한 항목을 삭제했습니다.');
                                    }
                                }
                            });
                        });
                    });
                    combinedContent.querySelectorAll('[data-cell-clear]').forEach(button => {
                        button.addEventListener('click', event => {
                            event.preventDefault();
                            event.stopPropagation();
                            const metricKey = String(button.dataset.cellClear || '').trim();
                            const costSubKey = String(button.dataset.costSubKey || '').trim();
                            const datasetKey = String(button.dataset.datasetKey || '').trim();
                            const yearValue = Number(button.dataset.year);
                            const monthValue = Number(button.dataset.month);
                            const teamName = decodeURIComponent(String(button.dataset.team || ''));
                            if (!metricKey || !datasetKey || !Number.isFinite(yearValue) || !Number.isFinite(monthValue) || !teamName) return;
                            const metricLabelMap = { usage: '사용량', cost: '비용', production: '생산량' };
                            const metricLabel = metricLabelMap[metricKey] || '값';
                            const ok = confirm(`${teamName} ${yearValue}년 ${monthValue}월 ${metricLabel}을(를) 삭제할까요?`);
                            if (!ok) return;
                            const result = clearUtilMonthMetricValue({
                                datasetKey,
                                teamName,
                                yearValue,
                                monthValue,
                                metricKey,
                                costSubKeys: metricKey === 'cost' && costSubKey ? [costSubKey] : []
                            });
                            if (!result.changed) {
                                alert('삭제할 데이터가 없습니다.');
                                return;
                            }
                            if (typeof setLastModified === 'function') {
                                setLastModified('유틸리티 관리');
                            }
                            const activeTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                            renderTeam(activeTeam);
                            syncProductionControlState();
                            refreshUtilViewsAfterDataMutation(root);
                            if (metricKey === 'production' && result.removedProductionCount > 0) {
                                alert(`생산량 ${result.removedProductionCount.toLocaleString('ko-KR')}건을 삭제했습니다.`);
                            }
                        });
                    });
                };

                const syncProductionControlState = () => {
                    if (!controls) return;
                    const fixedStartDay = DEFAULT_UTIL_PRODUCTION_PERIOD.startDay;
                    const startDayChanged = UtilProductionState.startDay !== fixedStartDay;
                    UtilProductionState.startDay = fixedStartDay;
                    if (startDayChanged) persistUtilProductionDailyState();
                };

                if (!combinedSection.dataset.productionDataUpdatedBound) {
                    combinedSection.dataset.productionDataUpdatedBound = 'true';
                    window.addEventListener('util-production-data-updated', () => {
                        const activeTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                        renderTeam(activeTeam);
                        syncProductionControlState();
                    });
                }

                if (controls) {
                    if (!controls.dataset.ready) {
                        controls.dataset.ready = 'true';
                        const productionControlHtml = `
                            <details class="util-action-menu" data-util-action-menu>
                                <summary class="util-detail-btn">데이터 관리</summary>
                                <div class="util-action-menu-list">
                                    <button type="button" class="util-action-menu-item" data-production-upload-open>생산량 기입</button>
                                    <button type="button" class="util-action-menu-item" data-util-delete-open>삭제</button>
                                    <button type="button" class="util-action-menu-item" data-util-export-open>추출</button>
                                </div>
                            </details>
                            ${buildUtilDualUnitControlHtml(key)}
                            <input type="file" data-production-upload-input accept=".xlsx,.xls" multiple style="display:none;">
                        `;
                        const gasControlHtml = isGas ? `
                            <label class="util-dual-control">
                                LNG/LPG 환산
                                <select class="util-table-select util-table-select-sm" data-gas-convert>
                                    <option value="off">끄기</option>
                                    <option value="on">켜기</option>
                                </select>
                            </label>
                            <details class="util-help">
                                <summary>?</summary>
                                <div class="util-help-panel">
                                    <div><strong>환산 기준(순발열량)</strong></div>
                                    <ul>
                                        <li>LPG(kg) × 1.201 = LNG(m³)</li>
                                        <li>LNG(m³) ÷ 1.201 = LPG(kg)</li>
                                    </ul>
                                    <div>환산 적용 시 사용량/비용/생산량이 동일 비율로 변환됩니다.</div>
                                </div>
                            </details>
                        ` : '';
                        controls.innerHTML = `
                            ${productionControlHtml}
                            ${gasControlHtml}
                        `;
                        const actionMenu = controls.querySelector('[data-util-action-menu]');
                        const closeActionMenu = () => {
                            if (actionMenu) actionMenu.open = false;
                        };
                        controls.querySelectorAll('[data-unit]').forEach(select => {
                            select.addEventListener('change', () => {
                                const type = select.dataset.unit;
                                if (type === 'usage') combinedSection.dataset.usageUnitKey = normalizeUtilDualUsageUnitKey(select.value, key);
                                if (type === 'cost') combinedSection.dataset.costUnitKey = normalizeUtilReportCostUnitKey(select.value);
                                if (type === 'production') combinedSection.dataset.productionUnitKey = normalizeUtilReportProductionUnitKey(select.value);
                                syncUtilDualSelects(combinedSection);
                                applyUtilCostMode(combinedSection);
                                applyUtilDualConversion(combinedSection);
                            });
                        });
                        controls.querySelectorAll('[data-decimals]').forEach(select => {
                            select.addEventListener('change', () => {
                                const type = select.dataset.decimals;
                                if (type === 'usage') combinedSection.dataset.usageDecimals = select.value;
                                if (type === 'cost') combinedSection.dataset.costDecimals = select.value;
                                if (type === 'production') combinedSection.dataset.productionDecimals = select.value;
                                if (type === 'ratio') combinedSection.dataset.ratioDecimals = select.value;
                                combinedSection.dataset.reportDecimals = select.value;
                                syncUtilDualSelects(combinedSection);
                                applyUtilCostMode(combinedSection);
                                applyUtilDualConversion(combinedSection);
                            });
                        });
                        controls.querySelectorAll('[data-decimals-toggle]').forEach(button => {
                            button.addEventListener('click', event => {
                                event.stopPropagation();
                                const popover = button.parentElement?.querySelector('[data-decimals-popover]');
                                if (!popover) return;
                                const shouldOpen = popover.hidden;
                                closeUtilDualDecimalsPopovers(controls);
                                popover.hidden = !shouldOpen;
                                button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
                            });
                        });
                        controls.querySelectorAll('[data-decimals-popover]').forEach(popover => {
                            popover.addEventListener('click', event => {
                                event.stopPropagation();
                            });
                        });
                        const exportOpenButton = controls.querySelector('[data-util-export-open]');
                        if (exportOpenButton) {
                            exportOpenButton.addEventListener('click', () => {
                                closeActionMenu();
                                openUtilMetricExportModal({ datasetKey: key });
                            });
                        }
                        const productionUploadInput = controls.querySelector('[data-production-upload-input]');
                        const productionUploadButton = controls.querySelector('[data-production-upload-open]');
                        const deleteOpenButton = controls.querySelector('[data-util-delete-open]');
                        if (productionUploadButton && productionUploadInput) {
                            productionUploadButton.addEventListener('click', () => {
                                closeActionMenu();
                                if (!window.XLSX) {
                                    alert('엑셀 라이브러리 로드 실패: 네트워크 상태를 확인해주세요.');
                                    return;
                                }
                                productionUploadInput.click();
                            });
                            productionUploadInput.addEventListener('change', async () => {
                                const files = Array.from(productionUploadInput.files || []);
                                if (!files.length) return;
                                try {
                                    productionUploadButton.disabled = true;
                                    productionUploadInput.disabled = true;
                                    const activeTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                                    const parsed = await parseUtilProductionExcelFiles(files, activeTeam);
                                    const result = mergeUtilProductionExtractorRows(parsed.rows, {
                                        fallbackTeam: activeTeam
                                    });
                                    const addedTeams = Array.isArray(result.addedTeams) ? result.addedTeams.filter(Boolean) : [];
                                    const failedFileNames = Array.isArray(parsed.failedFiles)
                                        ? parsed.failedFiles.map(item => String(item?.fileName || '').trim()).filter(Boolean)
                                        : [];
                                    const nextTeam = (addedTeams.length && !addedTeams.includes(activeTeam))
                                        ? addedTeams[0]
                                        : activeTeam;
                                    if ((result.addedCount > 0 || result.patchedCount > 0) && typeof setLastModified === 'function') {
                                        setLastModified('유틸리티 관리');
                                    }
                                    renderTeam(nextTeam || data[0]?.name);
                                    syncProductionControlState();
                                    const failedNotice = failedFileNames.length
                                        ? `\n형식 오류 제외 ${failedFileNames.length.toLocaleString('ko-KR')}개: ${failedFileNames.join(', ')}`
                                        : '';
                                    const patchedNotice = result.patchedCount > 0
                                        ? `\n수율/CAPA/가동률 보완 ${result.patchedCount.toLocaleString('ko-KR')}건`
                                        : '';
                                    alert(`기입 완료: 기존 생산량 비우고 ${result.addedCount.toLocaleString('ko-KR')}건 기입, 중복 제외 ${result.skippedCount.toLocaleString('ko-KR')}건${patchedNotice}${failedNotice}`);
                                } catch (error) {
                                    alert(`기입 실패: ${error?.message || '알 수 없는 오류'}`);
                                } finally {
                                    productionUploadInput.value = '';
                                    productionUploadButton.disabled = false;
                                    productionUploadInput.disabled = false;
                                }
                            });
                        }
                        if (deleteOpenButton) {
                            deleteOpenButton.addEventListener('click', () => {
                                closeActionMenu();
                                const activeTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                                const defaultRange = getUtilDeleteDefaultRange();
                                openUtilSelectiveDeleteModal({
                                    datasetKey: key,
                                    teamName: activeTeam,
                                    fromYm: defaultRange.fromYm,
                                    toYm: defaultRange.toYm,
                                    onApplied: result => {
                                        if (typeof setLastModified === 'function') {
                                            setLastModified('유틸리티 관리');
                                        }
                                        const nextTeam = combinedSection.dataset.activeTeam || data[0]?.name || '';
                                        renderTeam(nextTeam);
                                        syncProductionControlState();
                                        refreshUtilViewsAfterDataMutation(root);
                                        if (result?.removedProductionCount > 0) {
                                            alert(`생산량 ${result.removedProductionCount.toLocaleString('ko-KR')}건을 삭제했습니다.`);
                                        } else {
                                            alert('선택한 항목을 삭제했습니다.');
                                        }
                                    }
                                });
                            });
                        }
                        syncUtilDualSelects(combinedSection);
                        applyUtilCostMode(combinedSection);
                        applyUtilDualConversion(combinedSection);
                        const gasSelect = controls.querySelector('[data-gas-convert]');
                        if (gasSelect) {
                            gasSelect.addEventListener('change', () => {
                                combinedSection.dataset.gasConvert = gasSelect.value;
                                renderTeam(combinedSection.dataset.activeTeam || data[0]?.name);
                            });
                        }
                    }
                    const gasSelect = controls.querySelector('[data-gas-convert]');
                    if (gasSelect) gasSelect.value = combinedSection.dataset.gasConvert || 'off';
                    syncProductionControlState();
                }

                renderTeam(data[0]?.name);
                tabs.querySelectorAll('.util-team-tab').forEach(btn => {
                    btn.addEventListener('click', () => {
                        tabs.querySelectorAll('.util-team-tab').forEach(tab => tab.classList.remove('active'));
                        btn.classList.add('active');
                        renderTeam(btn.dataset.team);
                    });
                });
            });
        }

        function buildUtilMonthOptions(entries) {
            const monthSet = new Set();
            entries.forEach(entry => {
                if (!Number.isFinite(entry.year) || !Number.isFinite(entry.month)) return;
                if (!isUtilYearMonthWithinToday(entry.year, entry.month)) return;
                if (!hasUtilEntryPayload(entry)) return;
                monthSet.add(entry.year * 12 + entry.month);
            });
            const months = Array.from(monthSet).sort((a, b) => a - b).map(value => {
                const year = Math.floor((value - 1) / 12);
                const month = value - year * 12;
                const label = `${year}-${String(month).padStart(2, '0')}`;
                return { value: `${year}-${String(month).padStart(2, '0')}`, year, month, label };
            });
            return months;
        }

        function buildUtilTeamOptions(entries) {
            const teamSet = new Set();
            entries.forEach(entry => {
                if (entry.team) teamSet.add(entry.team);
            });
            return Array.from(teamSet);
        }

        function parseUtilMonthValue(value) {
            const [yearStr, monthStr] = String(value || '').split('-');
            const year = Number(yearStr);
            const month = Number(monthStr);
            if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
            return { year, month };
        }

        function buildUtilDatasetOptions() {
            return Object.keys(UTIL_ANALYTICS_UNIFIED).map(key => {
                const dataset = UTIL_ANALYTICS_UNIFIED[key];
                return { key, label: dataset.label };
            });
        }

        function buildUtilMetricOptions(datasetKey) {
            const dataset = UTIL_ANALYTICS_UNIFIED[datasetKey];
            return dataset ? (dataset.metrics || []) : [];
        }

        function buildUtilCostOptions(datasetKey, teamVal) {
            if (datasetKey !== 'waste') return [];
            const dataset = UTIL_ANALYTICS_UNIFIED.waste;
            if (!dataset || !dataset.costModesByTeam) return [];
            if (!teamVal || teamVal === 'all') return UTIL_WASTE_COST_BASE;
            return dataset.costModesByTeam(teamVal);
        }

        function buildUnifiedMonthOptions(datasetKey) {
            const dataset = UTIL_ANALYTICS_UNIFIED[datasetKey];
            return dataset ? buildUtilMonthOptions(dataset.entries || []) : [];
        }

        function buildUnifiedTeamOptions(datasetKey) {
            const dataset = UTIL_ANALYTICS_UNIFIED[datasetKey];
            return dataset ? buildUtilTeamOptions(dataset.entries || []) : [];
        }

        function getUtilNiceMax(value) {
            const num = Number(value);
            if (!Number.isFinite(num) || num <= 0) return 1;
            const exp = Math.floor(Math.log10(num));
            const base = Math.pow(10, exp);
            const fraction = num / base;
            let nice;
            if (fraction <= 1) nice = 1;
            else if (fraction <= 2) nice = 2;
            else if (fraction <= 5) nice = 5;
            else nice = 10;
            return nice * base;
        }

        function buildUtilTrendSeries(entries, minKey, maxKey, scaleVal) {
            const totals = {};
            const scale = Number.isFinite(scaleVal) && scaleVal ? scaleVal : 1;
            entries.forEach(entry => {
                const key = entry.year * 12 + entry.month;
                if (key < minKey || key > maxKey) return;
                const val = Number(entry.value);
                if (!Number.isFinite(val)) return;
                totals[key] = (totals[key] || 0) + (val / scale);
            });
            const points = [];
            for (let key = minKey; key <= maxKey; key += 1) {
                const year = Math.floor((key - 1) / 12);
                const month = key - year * 12;
                const label = `${year}-${String(month).padStart(2, '0')}`;
                points.push({
                    key,
                    label,
                    value: Object.prototype.hasOwnProperty.call(totals, key) ? totals[key] : null
                });
            }
            return points;
        }

        function buildUtilRatioSeries(entries, minKey, maxKey, scaleVal) {
            const numTotals = {};
            const denTotals = {};
            const scale = Number.isFinite(scaleVal) && scaleVal ? scaleVal : 1;
            entries.forEach(entry => {
                const key = entry.year * 12 + entry.month;
                if (key < minKey || key > maxKey) return;
                const num = Number(entry.numerator);
                const den = Number(entry.denominator);
                if (Number.isFinite(num)) numTotals[key] = (numTotals[key] || 0) + num;
                if (Number.isFinite(den)) denTotals[key] = (denTotals[key] || 0) + den;
            });
            const points = [];
            for (let key = minKey; key <= maxKey; key += 1) {
                const year = Math.floor((key - 1) / 12);
                const month = key - year * 12;
                const label = `${year}-${String(month).padStart(2, '0')}`;
                const num = numTotals[key];
                const den = denTotals[key];
                let value = null;
                if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
                    value = (num / den) / scale;
                }
                points.push({ key, label, value });
            }
            return points;
        }

        function getUtilChartAxisBounds(values, options = {}) {
            const validValues = (values || []).filter(Number.isFinite);
            if (!validValues.length) return { min: 0, max: 1 };
            const rawMin = Math.min(...validValues);
            const rawMax = Math.max(...validValues);
            const hasFixedMin = Number.isFinite(Number(options.min));
            const hasFixedMax = Number.isFinite(Number(options.max));
            const fixedMin = hasFixedMin ? Number(options.min) : NaN;
            const fixedMax = hasFixedMax ? Number(options.max) : NaN;
            if (hasFixedMin && hasFixedMax && fixedMax > fixedMin) {
                return { min: fixedMin, max: fixedMax };
            }

            const useTightRange = options.tightRange === true;
            let min;
            let max;
            if (!useTightRange) {
                min = Math.min(0, rawMin);
                max = getUtilNiceMax(Math.max(rawMax, 0));
            } else if (rawMin === rawMax) {
                const delta = Math.abs(rawMax || 1) * 0.2;
                min = rawMin - delta;
                max = rawMax + delta;
            } else {
                const paddingRatio = Number.isFinite(options.tightPadding) ? options.tightPadding : 0.16;
                const margin = (rawMax - rawMin) * paddingRatio;
                min = rawMin - margin;
                max = rawMax + margin;
            }

            if (hasFixedMin) min = fixedMin;
            if (hasFixedMax) max = fixedMax;
            if (!Number.isFinite(min) || !Number.isFinite(max)) {
                min = rawMin;
                max = rawMax + 1;
            }
            if (max <= min) {
                const delta = Math.max(1, Math.abs((max || min || 1) * 0.2));
                if (hasFixedMax && !hasFixedMin) min = max - delta;
                else max = min + delta;
            }
            return { min, max };
        }

        function getUtilChartLeftPad(minVal, maxVal, decimals, options = {}) {
            const fallback = Number.isFinite(options.fallback) ? options.fallback : 72;
            const fontSize = Number.isFinite(options.fontSize) ? options.fontSize : 12;
            const anchorOffset = Number.isFinite(options.anchorOffset) ? options.anchorOffset : 12;
            const extra = Number.isFinite(options.extra) ? options.extra : 12;
            const minPad = Number.isFinite(options.minPad) ? options.minPad : fallback;
            const sampleValues = [minVal, maxVal, (minVal + maxVal) / 2].filter(Number.isFinite);
            if (!sampleValues.length) return fallback;
            const maxLen = sampleValues.reduce((acc, value) => (
                Math.max(acc, formatUtilNumber(value, decimals).length)
            ), 0);
            const charWidth = fontSize * 0.64;
            const estimated = Math.ceil((maxLen * charWidth) + anchorOffset + extra);
            return Math.max(fallback, minPad, estimated);
        }
