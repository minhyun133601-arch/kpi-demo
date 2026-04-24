        function setUtilProductionExtractorStatus(message, isError = false) {
            const modal = document.getElementById('util-production-extractor-modal');
            if (!modal) return;
            const status = modal.querySelector('[data-role="status"]');
            if (!status) return;
            status.textContent = message;
            status.classList.toggle('is-error', !!isError);
        }

        function ensureUtilProductionExtractorModal() {
            let modal = document.getElementById('util-production-extractor-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-production-extractor-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card util-production-extractor-card" role="dialog" aria-modal="true" aria-label="유틸리티 기입">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title">유틸리티 기입</div>
                        <div class="util-production-modal-header-actions">
                            <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                        </div>
                    </div>
                    <div class="util-production-modal-body util-production-extractor-body">
                        <div class="util-production-extractor-tip">추출 완료 후 <strong>유틸리티 기입</strong> 버튼을 누르면 기존 생산량을 모두 비우고 새 파일 기준으로 다시 기입합니다.</div>
                        <iframe class="util-production-extractor-frame" data-role="frame" src="utility/apps/production-extractor/production-extractor.html?embed=1&v=16" title="유틸리티 기입" loading="lazy"></iframe>
                        <div class="util-production-extractor-status" data-role="status">대기 중: 추출 실행 후 유틸리티 기입 버튼을 누르면 기존 생산량이 새 파일 기준으로 교체됩니다.</div>
                    </div>
                </div>
            `;
            modal.addEventListener('click', evt => {
                if (evt.target === modal) closeUtilProductionExtractorModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) closeBtn.addEventListener('click', () => closeUtilProductionExtractorModal());
            document.body.appendChild(modal);
            if (!window.__utilProductionExtractorEscBound) {
                window.__utilProductionExtractorEscBound = true;
                document.addEventListener('keydown', evt => {
                    if (evt.key !== 'Escape') return;
                    closeUtilProductionExtractorModal();
                });
            }
            return modal;
        }

        function closeUtilProductionExtractorModal() {
            const modal = document.getElementById('util-production-extractor-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

        function openUtilProductionExtractorModal(teamName, onApplied) {
            const modal = ensureUtilProductionExtractorModal();
            UtilProductionBridgeState.activeTeam = String(teamName || '').trim();
            UtilProductionBridgeState.onApplied = typeof onApplied === 'function' ? onApplied : null;
            setUtilProductionExtractorStatus('대기 중: 추출 실행 후 유틸리티 기입 버튼을 누르면 기존 생산량이 새 파일 기준으로 교체됩니다.');
            modal.classList.add('is-open');
        }

        if (!window.__utilProductionBridgeBound) {
            window.__utilProductionBridgeBound = true;
            window.addEventListener('message', async event => {
                const data = event?.data;
                const modal = document.getElementById('util-production-extractor-modal');
                if (!modal) return;
                const frame = modal.querySelector('[data-role="frame"]');
                if (frame && event.source !== frame.contentWindow) return;
                if (!data) return;
                if (data.type === 'kpi-production-close') {
                    closeUtilProductionExtractorModal();
                    return;
                }
                if (data.type === 'kpi-production-stored-data-request') {
                    const requestId = String(data.requestId || '').trim();
                    if (!event.source || typeof event.source.postMessage !== 'function') return;
                    try {
                        const teamSet = new Set();
                        const rowMap = new Map();
                        (UTIL_PRODUCTION_DAILY_DATA || []).forEach(team => {
                            const fallbackTeam = String(team?.name || '').trim();
                            if (fallbackTeam) teamSet.add(fallbackTeam);
                            (team?.entries || []).forEach(entry => {
                                const parsedDate = parseUtilDateKey(entry?.date);
                                const amount = parseUtilAmount(entry?.amount ?? entry?.production ?? entry?.value);
                                const lineName = String(entry?.lineName ?? entry?.line ?? '').trim();
                                const productName = String(entry?.productName ?? entry?.product ?? entry?.itemName ?? '').trim();
                                const teamName = String(entry?.team ?? fallbackTeam).trim();
                                if (!parsedDate || !Number.isFinite(amount) || !teamName) return;
                                const normalizedRow = {
                                    date: formatUtilDailyDateKey(parsedDate),
                                    team: teamName,
                                    lineName,
                                    productName,
                                    amount
                                };
                                const key = buildUtilProductionDailyEntryKey(normalizedRow);
                                if (!key || rowMap.has(key)) return;
                                rowMap.set(key, normalizedRow);
                                teamSet.add(teamName);
                            });
                        });
                        const rows = Array.from(rowMap.values()).sort((a, b) => {
                            const dateDiff = String(a.date || '').localeCompare(String(b.date || ''), 'ko');
                            if (dateDiff !== 0) return dateDiff;
                            const teamDiff = String(a.team || '').localeCompare(String(b.team || ''), 'ko');
                            if (teamDiff !== 0) return teamDiff;
                            const lineDiff = String(a.lineName || '').localeCompare(String(b.lineName || ''), 'ko');
                            if (lineDiff !== 0) return lineDiff;
                            return String(a.productName || '').localeCompare(String(b.productName || ''), 'ko');
                        });
                        const teams = Array.from(teamSet).filter(Boolean).sort((a, b) => a.localeCompare(b, 'ko'));
                        event.source.postMessage({
                            type: 'kpi-production-stored-data-response',
                            requestId,
                            ok: true,
                            rows,
                            teams
                        }, window.location.origin || `${window.location.protocol}//${window.location.host}`);
                    } catch (error) {
                        event.source.postMessage({
                            type: 'kpi-production-stored-data-response',
                            requestId,
                            ok: false,
                            rows: [],
                            teams: [],
                            message: String(error?.message || '기입 데이터 조회 실패')
                        }, window.location.origin || `${window.location.protocol}//${window.location.host}`);
                    }
                    return;
                }
                if (data.type !== 'kpi-production-extracted') return;
                try {
                    const rows = Array.isArray(data.rows) ? data.rows : [];
                    const rawFailedFiles = Array.isArray(data?.meta?.failedFiles) ? data.meta.failedFiles : [];
                    const failedFiles = rawFailedFiles
                        .map(item => {
                            if (typeof item === 'string') return { fileName: item, message: '' };
                            return {
                                fileName: String(item?.fileName || '').trim(),
                                message: String(item?.message || '').trim()
                            };
                        })
                        .filter(item => item.fileName);
                    const failedFileNames = failedFiles.map(item => item.fileName);
                    const previousStartDay = UtilProductionState.startDay;
                    UtilProductionState.startDay = DEFAULT_UTIL_PRODUCTION_PERIOD.startDay;
                    const startDayChanged = previousStartDay !== UtilProductionState.startDay;
                    const result = mergeUtilProductionExtractorRows(rows, {
                        fallbackTeam: UtilProductionBridgeState.activeTeam
                    });
                    const archiveResult = { savedCount: 0, failedCount: 0, unsupported: false };
                    if (startDayChanged && result.addedCount === 0 && result.patchedCount === 0) {
                        persistUtilProductionDailyState();
                    }
                    const failedNotice = failedFileNames.length
                        ? `, 형식 오류 제외 ${failedFileNames.length.toLocaleString('ko-KR')}개 (${failedFileNames.join(', ')})`
                        : '';
                    const patchedNotice = result.patchedCount > 0
                        ? `, 수율/CAPA/가동률 보완 ${result.patchedCount.toLocaleString('ko-KR')}건`
                        : '';
                    const statusText = `기입 완료: 기존 생산량 비우고 ${result.addedCount.toLocaleString('ko-KR')}건 기입, 중복 제외 ${result.skippedCount.toLocaleString('ko-KR')}건${patchedNotice}${failedNotice}`;
                    setUtilProductionExtractorStatus(statusText, result.addedCount === 0 && result.patchedCount === 0);
                    if (typeof UtilProductionBridgeState.onApplied === 'function') {
                        UtilProductionBridgeState.onApplied({
                            ...result,
                            failedFiles,
                            archiveResult,
                            unlinkedExcludedCount: 0
                        });
                    }
                    if (typeof setLastModified === 'function' && (result.addedCount > 0 || startDayChanged)) {
                        setLastModified('유틸리티 관리');
                    }
                    if (event.source && typeof event.source.postMessage === 'function') {
                        event.source.postMessage({
                            type: 'kpi-production-import-result',
                            ok: true,
                            addedCount: result.addedCount,
                            skippedCount: result.skippedCount,
                            failedFiles,
                            archivedCount: 0,
                            archiveFailedCount: 0,
                            archiveUnsupported: false,
                            unlinkedExcludedCount: 0
                        }, window.location.origin || `${window.location.protocol}//${window.location.host}`);
                    }
                } catch (error) {
                    const message = `기입 실패: ${error?.message || '알 수 없는 오류'}`;
                    setUtilProductionExtractorStatus(message, true);
                    if (event.source && typeof event.source.postMessage === 'function') {
                        event.source.postMessage({
                            type: 'kpi-production-import-result',
                            ok: false,
                            message
                        }, window.location.origin || `${window.location.protocol}//${window.location.host}`);
                    }
                }
            });
        }

        function resolveUtilProductionPeriodStartDay(options = {}) {
            void options;
            return DEFAULT_UTIL_PRODUCTION_PERIOD.startDay;
        }

        function listUtilDailyEntriesByMetric(teamName, year, month, metricKey, options = {}) {
            const period = getUtilProductionPeriod(year, month, resolveUtilProductionPeriodStartDay(options));
            if (!period) return { period: null, entries: [] };
            const teamKey = normalizeUtilTeamName(teamName);
            const entries = UTIL_PRODUCTION_DAILY_INDEX[teamKey];
            if (!Array.isArray(entries) || !entries.length) return { period, entries: [] };
            const startTime = period.startDate.getTime();
            const endTime = period.endDate.getTime() + (24 * 60 * 60 * 1000) - 1;
            const selected = [];
            entries.forEach(entry => {
                if (entry.time < startTime || entry.time > endTime) return;
                const value = entry?.[metricKey];
                if (value === null || value === undefined) return;
                if (typeof value === 'string' && value.trim() === '') return;
                if (!Number.isFinite(Number(value))) return;
                selected.push(entry);
            });
            return { period, entries: selected };
        }

        function resolveUtilProductionSourceTeams(teamName, options = {}) {
            const normalized = normalizeUtilTeamName(teamName).toLowerCase();
            if (!normalized) return [String(teamName || '').trim()].filter(Boolean);
            if (options.gasContext && normalized.includes('lpg')) return ['Line Beta'];
            if (normalized.includes('전체') || normalized.includes('통합')) return options.gasContext ? ['Line Alpha', 'Line Beta', 'Line Delta'] : ['Line Alpha', 'Line Beta', 'Line Gamma', 'Line Delta'];
            if (normalized.includes('plantb')) return ['Line Alpha'];
            if (normalized.includes('planta')) return options.gasContext ? ['Line Beta', 'Line Delta'] : ['Line Beta', 'Line Gamma', 'Line Delta'];
            if (normalized.includes('processalpha') || normalized.includes('dry')) return ['Line Alpha', 'Line Beta'];
            if (
                normalized.includes('processbeta')
                || normalized.includes('stick')
                || normalized.includes('pouch')
            ) {
                return ['Line Gamma'];
            }
            if (normalized.includes('processgamma') || normalized.includes('liquid')) return ['Line Delta'];
            if (normalized.includes('linealpha')) return ['Line Alpha'];
            if (normalized.includes('linebeta')) return ['Line Beta'];
            if (normalized.includes('linegamma')) return ['Line Gamma'];
            if (normalized.includes('linedelta')) return ['Line Delta'];
            return [String(teamName || '').trim()].filter(Boolean);
        }

        function getUtilDailyMetricValue(teamName, year, month, metricKey, options = {}) {
            const sourceTeams = resolveUtilProductionSourceTeams(teamName, options);
            let period = null;
            const entries = [];
            sourceTeams.forEach(sourceTeam => {
                const listed = listUtilDailyEntriesByMetric(sourceTeam, year, month, metricKey, options);
                if (!period && listed?.period) period = listed.period;
                if (Array.isArray(listed?.entries) && listed.entries.length) {
                    entries.push(...listed.entries);
                }
            });
            if (!period || !entries.length) return null;
            let sum = 0;
            entries.forEach(entry => {
                const rawValue = entry?.[metricKey];
                if (rawValue === null || rawValue === undefined) return;
                if (typeof rawValue === 'string' && rawValue.trim() === '') return;
                const value = Number(rawValue);
                if (!Number.isFinite(value)) return;
                sum += value;
            });
            return {
                value: sum,
                source: 'daily',
                periodLabel: `${formatUtilDateLabel(period.startDate)} ~ ${formatUtilDateLabel(period.endDate)}`,
                count: entries.length,
                details: entries
            };
        }

        function getUtilDailyProductionValue(teamName, year, month, options = {}) {
            return getUtilDailyMetricValue(teamName, year, month, 'amount', options);
        }

        function resolveUtilProductionCell(teamName, year, row, options = {}) {
            const month = parseUtilMonthLabel(row?.label);
            if (!Number.isFinite(year) || !month) {
                return { value: null, source: 'none', periodLabel: '', count: 0 };
            }
            const daily = getUtilDailyProductionValue(teamName, year, month, options);
            if (daily) return daily;
            return { value: null, source: 'none', periodLabel: '', count: 0 };
        }

        const UTIL_DAILY_DETAIL_CONFIG = {
            production: {
                key: 'production',
                title: '생산량 일별 상세',
                metricKey: 'amount',
                metricLabel: '생산량 (kg)',
                unit: 'kg',
                emptyText: '해당 월에 등록된 일별 생산량 데이터가 없습니다.'
            }
        };

        function resolveUtilDailyDetailConfig(detailType) {
            const key = String(detailType || '').trim();
            return UTIL_DAILY_DETAIL_CONFIG[key] || UTIL_DAILY_DETAIL_CONFIG.production;
        }

        function getUtilProductionDetailPayload(teamName, year, month, detailType = 'production') {
            const safeYear = Number(year);
            const safeMonth = Number(month);
            if (!Number.isFinite(safeYear) || !Number.isFinite(safeMonth)) return null;
            const detailConfig = resolveUtilDailyDetailConfig(detailType);
            const periodLabel = getUtilProductionPeriodLabel(safeYear, safeMonth, UtilProductionState.startDay);
            const daily = getUtilDailyProductionValue(teamName, safeYear, safeMonth);
            const rows = (daily?.details || []).map(item => ({
                dateLabel: item.dateLabel,
                teamName: item.teamName || teamName || '',
                lineName: item.lineName || '',
                productName: item.productName || '',
                metricValue: item?.[detailConfig.metricKey],
                moistureExcludedYield: Number.isFinite(parseUtilPercentAmount(item?.moistureExcludedYield)) ? parseUtilPercentAmount(item?.moistureExcludedYield) : null,
                equipmentCapa: Number.isFinite(parseUtilAmount(item?.equipmentCapa)) ? parseUtilAmount(item?.equipmentCapa) : null,
                equipmentUtilization: Number.isFinite(parseUtilPercentAmount(item?.equipmentUtilization)) ? parseUtilPercentAmount(item?.equipmentUtilization) : null,
                entryKey: String(item?.entryKey || '').trim()
            }));
            const entryKeys = Array.from(new Set(rows.map(item => item.entryKey).filter(Boolean)));
            const total = rows.reduce((acc, item) => acc + (Number(item.metricValue) || 0), 0);
            return {
                detailType: detailConfig.key,
                title: detailConfig.title,
                metricLabel: detailConfig.metricLabel,
                unit: detailConfig.unit,
                emptyText: detailConfig.emptyText,
                teamName: teamName || '',
                year: safeYear,
                month: safeMonth,
                periodLabel,
                rows,
                entryKeys,
                total
            };
        }

        function ensureUtilProductionDetailModal() {
            let modal = document.getElementById('util-production-detail-modal');
            if (modal) return modal;
            modal = document.createElement('div');
            modal.id = 'util-production-detail-modal';
            modal.className = 'util-production-modal';
            modal.innerHTML = `
                <div class="util-production-modal-card" role="dialog" aria-modal="true" aria-label="데이터 일별 상세">
                    <div class="util-production-modal-header">
                        <div class="util-production-modal-title" data-role="title">데이터 일별 상세</div>
                        <button type="button" class="util-production-modal-close" data-role="close">닫기</button>
                    </div>
                    <div class="util-production-modal-body" data-role="body"></div>
                </div>
            `;
            modal.addEventListener('click', evt => {
                if (evt.target === modal) closeUtilProductionDetailModal();
            });
            const closeBtn = modal.querySelector('[data-role="close"]');
            if (closeBtn) {
                closeBtn.addEventListener('click', () => closeUtilProductionDetailModal());
            }
            document.body.appendChild(modal);
            if (!window.__utilProductionDetailEscBound) {
                window.__utilProductionDetailEscBound = true;
                document.addEventListener('keydown', evt => {
                    if (evt.key !== 'Escape') return;
                    closeUtilProductionDetailModal();
                });
            }
            return modal;
        }

        function closeUtilProductionDetailModal() {
            const modal = document.getElementById('util-production-detail-modal');
            if (!modal) return;
            modal.classList.remove('is-open');
        }

        function openUtilProductionDailyDetail(teamEncoded, year, month, detailType = 'production') {
            const teamName = decodeURIComponent(String(teamEncoded || ''));
            const detail = getUtilProductionDetailPayload(teamName, year, month, detailType);
            if (!detail) return;
            const modal = ensureUtilProductionDetailModal();
            const title = modal.querySelector('[data-role="title"]');
            const body = modal.querySelector('[data-role="body"]');
            if (!title || !body) return;
            title.textContent = `${detail.title} · ${detail.year}년 ${detail.month}월`;
            const totalSuffix = detail.unit ? ` ${detail.unit}` : '';
            const metaHtml = `
                <div class="util-production-modal-meta">
                    <span>팀: ${escapeHtml(detail.teamName || '-')}</span>
                    <span>집계기간: ${escapeHtml(detail.periodLabel || '-')}</span>
                    <span>건수: ${detail.rows.length.toLocaleString('ko-KR')}건</span>
                    <span>합계: ${formatUtilNumber(detail.total)}${totalSuffix}</span>
                </div>
            `;
            const actionHtml = `
                <div style="display:flex;justify-content:flex-end;align-items:center;margin:-2px 0 2px;">
                    <button type="button" class="util-detail-btn" data-role="delete-team-month">해당 팀·월 생산량 전체삭제</button>
                </div>
            `;
            if (!detail.rows.length) {
                body.innerHTML = `
                    ${metaHtml}
                    <div class="util-production-modal-empty">${escapeHtml(detail.emptyText)}</div>
                `;
                modal.classList.add('is-open');
                return;
            }
            const rowHtml = detail.rows.map(item => `
                <tr>
                    <td>${escapeHtml(item.dateLabel)}</td>
                    <td>${escapeHtml(item.teamName || detail.teamName || '-')}</td>
                    <td>${escapeHtml(item.lineName || '-')}</td>
                    <td>${escapeHtml(item.productName || '-')}</td>
                    <td>${formatUtilNumber(item.metricValue)}</td>
                </tr>
            `).join('');
            body.innerHTML = `
                ${metaHtml}
                ${actionHtml}
                <table class="util-production-modal-table">
                    <thead>
                        <tr>
                            <th>생산일자</th>
                            <th>팀</th>
                            <th>라인명</th>
                            <th>품명</th>
                            <th>${escapeHtml(detail.metricLabel)}</th>
                        </tr>
                    </thead>
                    <tbody>${rowHtml}</tbody>
                </table>
            `;
            const deleteButton = body.querySelector('[data-role="delete-team-month"]');
            if (deleteButton) {
                deleteButton.addEventListener('click', () => {
                    const keySet = new Set(Array.isArray(detail.entryKeys) ? detail.entryKeys.filter(Boolean) : []);
                    if (!keySet.size) {
                        alert('삭제할 생산량 데이터가 없습니다.');
                        return;
                    }
                    const ok = confirm(`${detail.year}년 ${detail.month}월(${detail.teamName || '-'}) 생산량 데이터를 모두 삭제할까요?`);
                    if (!ok) return;
                    const removedCount = removeUtilProductionEntriesByKeySet(keySet);
                    if (removedCount > 0 && typeof setLastModified === 'function') {
                        setLastModified('유틸리티 관리');
                    }
                    alert(removedCount > 0
                        ? `생산량 ${removedCount.toLocaleString('ko-KR')}건을 삭제했습니다.`
                        : '삭제할 생산량 데이터가 없습니다.');
                    openUtilProductionDailyDetail(teamEncoded, year, month, detailType);
                });
            }
            modal.classList.add('is-open');
        }
