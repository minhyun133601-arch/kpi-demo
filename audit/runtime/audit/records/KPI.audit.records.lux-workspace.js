        const auditLuxWorkspaceJumpTimers = new Map();

        function getAuditLuxWorkspaceTeams(dataKey) {
            const preferredTeams = ['Line Gamma', 'Line Delta'];
            const availableTeams = getAuditFilterTeams(dataKey);
            const filtered = preferredTeams.filter(team => availableTeams.includes(team));
            return filtered.length ? filtered : availableTeams;
        }

        function getAuditLuxWorkspaceState(dataKey) {
            const entryForm = getAuditEntryFormState(dataKey);
            const now = typeof getAuditCurrentQuarterInfo === 'function'
                ? getAuditCurrentQuarterInfo()
                : getQuarterInfo(new Date());
            const yearStart = typeof AUDIT_LUX_BASE_YEAR === 'number' ? AUDIT_LUX_BASE_YEAR : 2023;
            if (!entryForm.year || entryForm.year < yearStart || entryForm.year > now.year) {
                entryForm.year = now.year;
            }
            if (!entryForm.quarter || entryForm.quarter < 1 || entryForm.quarter > 4) {
                entryForm.quarter = now.quarter;
            }
            const teams = getAuditLuxWorkspaceTeams(dataKey);
            if (!teams.includes(entryForm.team)) {
                entryForm.team = teams[0] || '';
            }
            return { entryForm, now, teams, yearStart };
        }

        function cycleAuditLuxWorkspaceTeam(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const { entryForm, teams } = getAuditLuxWorkspaceState(dataKey);
            if (!teams.length) return;
            const currentIndex = teams.indexOf(String(entryForm.team || '').trim());
            const nextIndex = currentIndex >= 0
                ? (currentIndex + 1) % teams.length
                : 0;
            entryForm.team = teams[nextIndex];
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function setAuditLuxWorkspaceYear(dataKey, value) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const { entryForm, yearStart, now } = getAuditLuxWorkspaceState(dataKey);
            const nextYear = Number.parseInt(value, 10);
            if (!Number.isFinite(nextYear)) return;
            entryForm.year = Math.min(Math.max(nextYear, yearStart), now.year);
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            if (category) renderAuditContent(category);
        }

        function normalizeAuditLuxNumericValue(value) {
            const raw = String(value ?? '').trim();
            if (!raw) return '';
            const cleaned = raw.replace(/[^0-9.]/g, '');
            if (!cleaned) return '';
            const firstDotIndex = cleaned.indexOf('.');
            if (firstDotIndex < 0) {
                return cleaned;
            }
            const integerPart = cleaned.slice(0, firstDotIndex);
            const decimalPart = cleaned.slice(firstDotIndex + 1).replace(/\./g, '');
            return `${integerPart}.${decimalPart}`;
        }

        function getAuditLuxNumericDisplayValue(value) {
            return normalizeAuditLuxNumericValue(value);
        }

        function inspectAuditLuxWorkspaceRow(row) {
            const standardValue = parseFloat(normalizeAuditLuxNumericValue(row?.standard || row?.baseStandard || ''));
            let measuredCount = 0;
            const failedQuarters = [];
            [1, 2, 3, 4].forEach((quarter) => {
                const numericText = normalizeAuditLuxNumericValue(row?.values?.[quarter] || '');
                const numericValue = parseFloat(numericText);
                if (numericText === '' || !Number.isFinite(numericValue)) return;
                measuredCount += 1;
                if (Number.isFinite(standardValue) && numericValue < standardValue) {
                    failedQuarters.push(quarter);
                }
            });
            return { measuredCount, failedQuarters };
        }

        function hasAuditLuxWorkspaceRowFailure(row) {
            return inspectAuditLuxWorkspaceRow(row).failedQuarters.length > 0;
        }

        function getAuditLuxWorkspaceFailRowKeys(rows) {
            return (Array.isArray(rows) ? rows : [])
                .filter(hasAuditLuxWorkspaceRowFailure)
                .map((row) => String(row?.rowKey || '').trim())
                .filter(Boolean);
        }

        function getAuditLuxStandardInputByRow(dataKey, rowKey) {
            return Array.from(document.querySelectorAll(`[data-audit-lux-standard-input="${dataKey}"]`)).find((input) => (
                String(input.dataset.rowKey || '').trim() === String(rowKey || '').trim()
            )) || null;
        }

        function syncAuditLuxQuarterFieldState(input) {
            if (!(input instanceof HTMLElement)) return;
            const dataKey = String(input.dataset.auditLuxQuarterInput || '').trim();
            const rowKey = String(input.dataset.rowKey || '').trim();
            const standardInput = getAuditLuxStandardInputByRow(dataKey, rowKey);
            const standardValue = parseFloat(normalizeAuditLuxNumericValue(standardInput?.value || standardInput?.dataset.originalStandard || ''));
            const numericText = normalizeAuditLuxNumericValue(input.value);
            const numericValue = parseFloat(numericText);
            const isBelowStandard = numericText !== ''
                && Number.isFinite(standardValue)
                && Number.isFinite(numericValue)
                && numericValue < standardValue;
            const field = input.closest('.audit-lux-quarter-field');
            const cell = input.closest('.audit-lux-sheet-quarter');
            const feedback = field?.querySelector('.audit-lux-sheet-feedback');
            input.classList.toggle('is-fail', isBelowStandard);
            field?.classList.toggle('is-fail', isBelowStandard);
            cell?.classList.toggle('is-fail', isBelowStandard);
            if (feedback && !input.disabled) {
                feedback.classList.toggle('is-fail', isBelowStandard);
                feedback.classList.remove('is-muted');
                feedback.innerHTML = isBelowStandard ? '\uAE30\uC900 \uBBF8\uB2EC' : '&nbsp;';
            }
        }

        function syncAuditLuxQuarterStatesForRow(dataKey, rowKey) {
            Array.from(document.querySelectorAll(`[data-audit-lux-quarter-input="${dataKey}"]`)).forEach((input) => {
                if (String(input.dataset.rowKey || '').trim() !== String(rowKey || '').trim()) return;
                syncAuditLuxQuarterFieldState(input);
            });
        }

        function createAuditLuxWorkspaceAlertSummary() {
            return { failCount: 0, measuredCount: 0, failLocations: [] };
        }

        function appendAuditLuxWorkspaceAlertRows(summary, rows, context = {}) {
            const nextSummary = summary && typeof summary === 'object'
                ? summary
                : createAuditLuxWorkspaceAlertSummary();
            const targetYear = Number(context.year);
            const targetTeam = String(context.team || '').trim();
            (Array.isArray(rows) ? rows : []).forEach((row) => {
                const rowStatus = inspectAuditLuxWorkspaceRow(row);
                const failedQuarters = rowStatus.failedQuarters;
                nextSummary.measuredCount += rowStatus.measuredCount;
                nextSummary.failCount += failedQuarters.length;
                if (!failedQuarters.length) return;
                nextSummary.failLocations.push({
                    team: targetTeam || String(row?.team || '').trim(),
                    year: Number.isFinite(targetYear) ? targetYear : Number(row?.year),
                    room: String(row?.room || '').trim(),
                    type: String(row?.type || row?.zone || '').trim(),
                    quarters: failedQuarters
                });
            });
            return nextSummary;
        }

        function getAuditLuxWorkspaceLiveRows(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return [];
            const { entryForm } = getAuditLuxWorkspaceState(dataKey);
            const selectedYear = Number(entryForm.year);
            const selectedTeam = String(entryForm.team || '').trim();
            if (!Number.isFinite(selectedYear) || !selectedTeam) return [];
            const rowMap = new Map();
            Array.from(document.querySelectorAll(`[data-audit-lux-standard-input="${dataKey}"]`)).forEach((input) => {
                const rowKey = String(input.dataset.rowKey || '').trim();
                if (!rowKey) return;
                rowMap.set(rowKey, {
                    order: rowMap.size + 1,
                    rowKey,
                    team: selectedTeam,
                    year: selectedYear,
                    room: String(input.dataset.room || '').trim(),
                    type: String(input.dataset.type || '').trim(),
                    standard: normalizeAuditLuxNumericValue(input.value || input.dataset.originalStandard || ''),
                    baseStandard: normalizeAuditLuxNumericValue(input.dataset.originalStandard || ''),
                    values: { 1: '', 2: '', 3: '', 4: '' }
                });
            });
            Array.from(document.querySelectorAll(`[data-audit-lux-quarter-input="${dataKey}"]`)).forEach((input) => {
                const rowKey = String(input.dataset.rowKey || '').trim();
                const quarter = Number(input.dataset.quarter);
                const row = rowMap.get(rowKey);
                if (!row || !Number.isFinite(quarter) || quarter < 1 || quarter > 4) return;
                row.values[quarter] = normalizeAuditLuxNumericValue(input.value);
            });
            return Array.from(rowMap.values());
        }

        function compareAuditLuxAlertLocations(a, b) {
            const yearDiff = Number(b?.year || 0) - Number(a?.year || 0);
            if (yearDiff !== 0) return yearDiff;
            const teamCompare = String(a?.team || '').localeCompare(String(b?.team || ''), 'ko');
            if (teamCompare !== 0) return teamCompare;
            const roomCompare = String(a?.room || '').localeCompare(String(b?.room || ''), 'ko');
            if (roomCompare !== 0) return roomCompare;
            return String(a?.type || '').localeCompare(String(b?.type || ''), 'ko');
        }

        function getAuditLuxWorkspaceAlertSummary(dataKey, options = {}) {
            if (!isAuditLuxDataKey(dataKey)) return createAuditLuxWorkspaceAlertSummary();
            const { entryForm, now, yearStart } = getAuditLuxWorkspaceState(dataKey);
            const selectedYear = Number(entryForm.year);
            const selectedTeam = String(entryForm.team || '').trim();
            const includeLiveRows = options.useLiveRows !== false;
            const liveRows = includeLiveRows ? getAuditLuxWorkspaceLiveRows(dataKey) : [];
            const teams = getAuditLuxWorkspaceTeams(dataKey);
            const summary = createAuditLuxWorkspaceAlertSummary();
            for (let year = Number(now.year); year >= Number(yearStart); year -= 1) {
                teams.forEach((team) => {
                    const rows = includeLiveRows
                        && liveRows.length
                        && year === selectedYear
                        && team === selectedTeam
                        ? liveRows
                        : (typeof getAuditLuxWorkspaceRows === 'function'
                            ? getAuditLuxWorkspaceRows(dataKey, year, team)
                            : []);
                    appendAuditLuxWorkspaceAlertRows(summary, rows, { year, team });
                });
            }
            summary.failLocations.sort(compareAuditLuxAlertLocations);
            return summary;
        }

        function getAuditLuxWorkspaceAlertCountLabel(summary) {
            if (summary?.failCount > 0) {
                return `전체 기준 미달 ${summary.failCount}건`;
            }
            if (summary?.measuredCount > 0) {
                return '전체 기준 미달 없음';
            }
            return '전체 측정값 없음';
        }

        function getAuditLuxWorkspaceAlertLocationLabel(location) {
            const year = Number(location?.year);
            const team = String(location?.team || '').trim();
            if (Number.isFinite(year) && team) return `${year}년 ${team}`;
            if (Number.isFinite(year)) return `${year}년`;
            return team;
        }

        function getAuditLuxWorkspaceAlertLocationSummary(summary, limit = 3) {
            const labels = [];
            const labelSet = new Set();
            (Array.isArray(summary?.failLocations) ? summary.failLocations : []).forEach((location) => {
                const label = getAuditLuxWorkspaceAlertLocationLabel(location);
                if (!label || labelSet.has(label)) return;
                labelSet.add(label);
                labels.push(label);
            });
            if (!labels.length) return '';
            if (!Number.isFinite(limit) || limit < 1 || labels.length <= limit) {
                return labels.join(', ');
            }
            return `${labels.slice(0, limit).join(', ')} 외 ${labels.length - limit}개`;
        }

        function getAuditLuxWorkspaceAlertGuide(summary) {
            if (summary?.failCount > 0) {
                const locationText = getAuditLuxWorkspaceAlertLocationSummary(summary, 3);
                return locationText || '전체 조도 데이터에서 기준 미달 연도·팀을 확인하세요.';
            }
            if (summary?.measuredCount > 0) {
                return '전체 조도 데이터에는 기준치 미달 항목이 없습니다.';
            }
            return '전체 조도 데이터에 측정값을 입력하면 기준 미달 위치가 이곳에 표시됩니다.';
        }

        function getAuditLuxWorkspaceAlertTitle(summary) {
            if (summary?.failCount > 0) {
                const locationSummary = getAuditLuxWorkspaceAlertLocationSummary(summary, Number.POSITIVE_INFINITY);
                return locationSummary
                    ? `${getAuditLuxWorkspaceAlertCountLabel(summary)} | ${locationSummary}`
                    : getAuditLuxWorkspaceAlertCountLabel(summary);
            }
            return getAuditLuxWorkspaceAlertGuide(summary);
        }

        function applyAuditLuxWorkspaceAlertSummary(dataKey, summary) {
            const alertPanel = document.querySelector(`[data-audit-lux-alert="${dataKey}"]`);
            if (!(alertPanel instanceof HTMLElement)) return;
            const isSafe = !(summary?.failCount > 0);
            const countLabel = getAuditLuxWorkspaceAlertCountLabel(summary);
            const guideLabel = getAuditLuxWorkspaceAlertGuide(summary);
            const titleLabel = getAuditLuxWorkspaceAlertTitle(summary);
            alertPanel.classList.toggle('is-safe', isSafe);
            alertPanel.setAttribute('title', titleLabel);
            const alertChip = alertPanel.querySelector(`[data-audit-lux-alert-chip="${dataKey}"]`);
            if (alertChip instanceof HTMLElement) {
                alertChip.classList.toggle('is-safe', isSafe);
                alertChip.setAttribute('title', titleLabel);
            }
            const countEl = alertPanel.querySelector(`[data-audit-lux-alert-count="${dataKey}"]`);
            if (countEl instanceof HTMLElement) {
                countEl.textContent = countLabel;
                countEl.setAttribute('title', titleLabel);
            }
            const guideEl = alertPanel.querySelector(`[data-audit-lux-alert-guide="${dataKey}"]`);
            if (guideEl instanceof HTMLElement) {
                guideEl.textContent = guideLabel;
                guideEl.setAttribute('title', titleLabel);
            }
        }

        function syncAuditLuxWorkspaceFailShortcut(dataKey) {
            const shortcut = document.querySelector(`[data-audit-lux-jump="${dataKey}"]`);
            if (!(shortcut instanceof HTMLButtonElement)) return;
            const { entryForm } = getAuditLuxWorkspaceState(dataKey);
            const selectedYear = Number(entryForm.year);
            const selectedTeam = String(entryForm.team || '').trim();
            const failRowKeys = getAuditLuxWorkspaceFailRowKeys(getAuditLuxWorkspaceLiveRows(dataKey));
            const hasFailures = failRowKeys.length > 0;
            const targetLabel = Number.isFinite(selectedYear) && selectedTeam
                ? `${selectedYear}년 ${selectedTeam}`
                : '현재 선택';
            shortcut.hidden = !hasFailures;
            shortcut.disabled = !hasFailures;
            shortcut.title = hasFailures
                ? `${targetLabel} 기준 미달 항목으로 이동`
                : `${targetLabel} 기준 미달 없음`;
        }

        function jumpToAuditLuxWorkspaceFailRow(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return false;
            const failRowKeys = getAuditLuxWorkspaceFailRowKeys(getAuditLuxWorkspaceLiveRows(dataKey));
            if (!failRowKeys.length) return false;
            const rowElements = Array.from(document.querySelectorAll(`[data-audit-lux-row="${dataKey}"]`));
            const targetRow = rowElements.find((row) => (
                String(row?.dataset?.rowKey || '').trim() === failRowKeys[0]
            ));
            if (!(targetRow instanceof HTMLElement)) return false;
            const currentTimer = auditLuxWorkspaceJumpTimers.get(dataKey);
            if (currentTimer) clearTimeout(currentTimer);
            rowElements.forEach((row) => row.classList.remove('is-jump-target'));
            targetRow.classList.add('is-jump-target');
            const failInput = targetRow.querySelector('.audit-lux-quarter-input.is-fail');
            if (failInput instanceof HTMLElement) {
                try {
                    failInput.focus({ preventScroll: true });
                } catch (_error) {
                    failInput.focus();
                }
            }
            targetRow.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
            const timer = setTimeout(() => {
                targetRow.classList.remove('is-jump-target');
                auditLuxWorkspaceJumpTimers.delete(dataKey);
            }, 2200);
            auditLuxWorkspaceJumpTimers.set(dataKey, timer);
            return true;
        }

        function syncAuditLuxWorkspaceAlert(dataKey) {
            const summary = getAuditLuxWorkspaceAlertSummary(dataKey, { useLiveRows: true });
            applyAuditLuxWorkspaceAlertSummary(dataKey, summary);
            syncAuditLuxWorkspaceFailShortcut(dataKey);
        }

        function handleAuditLuxStandardInput(input) {
            if (!(input instanceof HTMLInputElement)) return;
            input.value = normalizeAuditLuxNumericValue(input.value);
            const dataKey = String(input.dataset.auditLuxStandardInput || '').trim();
            const rowKey = String(input.dataset.rowKey || '').trim();
            syncAuditLuxQuarterStatesForRow(dataKey, rowKey);
            syncAuditLuxWorkspaceAlert(dataKey);
        }

        function handleAuditLuxQuarterInput(input) {
            if (!(input instanceof HTMLInputElement)) return;
            input.value = normalizeAuditLuxNumericValue(input.value);
            syncAuditLuxQuarterFieldState(input);
            const dataKey = String(input.dataset.auditLuxQuarterInput || '').trim();
            syncAuditLuxWorkspaceAlert(dataKey);
        }

        function focusAuditLuxNextInputDown(currentInput) {
            if (!(currentInput instanceof HTMLElement)) return;
            const dataKey = String(
                currentInput.dataset.auditLuxQuarterInput
                || currentInput.dataset.auditLuxStandardInput
                || ''
            ).trim();
            if (!dataKey) return;
            let selector = '';
            if (currentInput.dataset.auditLuxQuarterInput) {
                const quarter = String(currentInput.dataset.quarter || '').trim();
                selector = `[data-audit-lux-quarter-input="${dataKey}"][data-quarter="${quarter}"]:not([disabled])`;
            } else if (currentInput.dataset.auditLuxStandardInput) {
                selector = `[data-audit-lux-standard-input="${dataKey}"]`;
            }
            if (!selector) return;
            const inputs = Array.from(document.querySelectorAll(selector));
            const currentIndex = inputs.indexOf(currentInput);
            if (currentIndex < 0) return;
            const nextInput = inputs[currentIndex + 1];
            if (!(nextInput instanceof HTMLInputElement)) return;
            nextInput.focus();
            nextInput.select?.();
            nextInput.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }

        function handleAuditLuxInputKeydown(event, input) {
            if (!event || event.key !== 'Enter') return;
            event.preventDefault();
            focusAuditLuxNextInputDown(input);
        }

        function getAuditLuxFullscreenTarget() {
            return document.getElementById('content-container');
        }

        function isAuditLuxWorkspaceFullscreen(target = getAuditLuxFullscreenTarget()) {
            return !!target && document.fullscreenElement === target;
        }

        function getAuditLuxFullscreenLabel(isActive = isAuditLuxWorkspaceFullscreen()) {
            return isActive ? '\uC804\uCCB4\uD654\uBA74 \uD574\uC81C' : '\uC804\uCCB4\uD654\uBA74';
        }

        function getAuditLuxFullscreenIconClass(isActive = isAuditLuxWorkspaceFullscreen()) {
            return isActive ? 'fa-compress' : 'fa-expand';
        }

        function getAuditLuxWorkspaceFullscreenButtonHtml() {
            const isActive = isAuditLuxWorkspaceFullscreen();
            const label = getAuditLuxFullscreenLabel(isActive);
            return `
                <button
                    type="button"
                    class="work-btn audit-lux-fullscreen-toggle ${isActive ? 'is-active' : ''}"
                    data-action="audit-lux-toggle-fullscreen"
                    aria-pressed="${isActive ? 'true' : 'false'}"
                    aria-label="${label}"
                    title="${label}"
                    onclick="toggleAuditLuxWorkspaceFullscreen()"
                >
                    <span class="audit-lux-fullscreen-toggle-icon" data-audit-lux-fullscreen-icon>
                        <i class="fa-solid ${getAuditLuxFullscreenIconClass(isActive)}"></i>
                    </span>
                </button>
            `;
        }

        function syncAuditLuxWorkspaceFullscreenUi() {
            const host = getAuditLuxFullscreenTarget();
            const isActive = isAuditLuxWorkspaceFullscreen(host);
            if (host) {
                host.classList.toggle('is-audit-lux-browser-fullscreen', isActive);
            }
            document.querySelectorAll('[data-action="audit-lux-toggle-fullscreen"]').forEach((button) => {
                const label = getAuditLuxFullscreenLabel(isActive);
                button.classList.toggle('is-active', isActive);
                button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
                button.setAttribute('aria-label', label);
                button.setAttribute('title', label);
                const icon = button.querySelector('[data-audit-lux-fullscreen-icon] i');
                if (icon) {
                    icon.className = `fa-solid ${getAuditLuxFullscreenIconClass(isActive)}`;
                }
            });
        }

        async function exitAuditLuxWorkspaceFullscreen() {
            if (!isAuditLuxWorkspaceFullscreen()) return;
            try {
                await document.exitFullscreen?.();
            } catch (error) {
                console.warn('[KPI audit lux] fullscreen exit failed', error);
            } finally {
                syncAuditLuxWorkspaceFullscreenUi();
            }
        }

        async function toggleAuditLuxWorkspaceFullscreen() {
            const target = getAuditLuxFullscreenTarget();
            if (!target) return;
            if (isAuditLuxWorkspaceFullscreen(target)) {
                await exitAuditLuxWorkspaceFullscreen();
                return;
            }
            if (typeof target.requestFullscreen !== 'function') {
                showToast('\uC774 \uBE0C\uB77C\uC6B0\uC800\uC5D0\uC11C\uB294 \uC804\uCCB4\uD654\uBA74 \uAE30\uB2A5\uC744 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.');
                return;
            }
            try {
                if (document.fullscreenElement && document.fullscreenElement !== target) {
                    await document.exitFullscreen?.();
                }
                await target.requestFullscreen();
            } catch (error) {
                console.warn('[KPI audit lux] fullscreen toggle failed', error);
                showToast('\uC804\uCCB4\uD654\uBA74 \uC804\uD658\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.');
            } finally {
                syncAuditLuxWorkspaceFullscreenUi();
            }
        }

        if (!window.__auditLuxFullscreenBound) {
            window.__auditLuxFullscreenBound = true;
            document.addEventListener('fullscreenchange', syncAuditLuxWorkspaceFullscreenUi);
        }

        function getAuditLuxDetachedPreviewState() {
            if (!window.__auditLuxDetachedPreviewState) {
                window.__auditLuxDetachedPreviewState = {
                    popup: null,
                    dataKey: '',
                    year: null,
                    team: ''
                };
            }
            return window.__auditLuxDetachedPreviewState;
        }

        function buildAuditLuxDetachedPreviewHtml({ title, meta, fileLabel, viewUrl, downloadUrl, isPdf, rotation }) {
            const safeTitle = escapeHtml(title || '조도 스캔본 원본');
            const safeMeta = escapeHtml(meta || '');
            const safeFileLabel = escapeHtml(fileLabel || '첨부 파일');
            const safeViewUrl = escapeHtml(viewUrl || '');
            const safeDownloadUrl = escapeHtml(downloadUrl || viewUrl || '#');
            const mediaHtml = safeViewUrl
                ? (isPdf
                    ? `<iframe class="audit-lux-popout-frame" src="${safeViewUrl}" title="${safeTitle}"></iframe>`
                    : `<img class="audit-lux-popout-image" src="${safeViewUrl}" alt="${safeTitle}" style="transform: rotate(${Number(rotation || 0)}deg);" />`)
                : '<div class="audit-lux-popout-empty">선택한 연도에 등록된 스캔본이 없습니다.</div>';
            return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <style>
    :root {
      color-scheme: light;
      font-family: "Noto Sans KR", sans-serif;
    }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      background: linear-gradient(180deg, #f8fbff 0%, #edf4ff 100%);
      color: #0f172a;
    }
    .audit-lux-popout-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 18px;
      border-bottom: 1px solid #dbeafe;
      background: rgba(255, 255, 255, 0.92);
      backdrop-filter: blur(10px);
    }
    .audit-lux-popout-copy {
      display: grid;
      gap: 4px;
      min-width: 0;
    }
    .audit-lux-popout-title {
      font-size: 1rem;
      font-weight: 900;
    }
    .audit-lux-popout-meta {
      font-size: 0.8rem;
      color: #475569;
      font-weight: 700;
    }
    .audit-lux-popout-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .audit-lux-popout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 10px;
      border: 1px solid #bfdbfe;
      background: #ffffff;
      color: #1d4ed8;
      font: inherit;
      font-size: 0.8rem;
      font-weight: 800;
      text-decoration: none;
      cursor: pointer;
    }
    .audit-lux-popout-stage {
      min-height: 0;
      margin: 18px;
      border-radius: 18px;
      border: 1px solid #dbeafe;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: auto;
      box-shadow: 0 20px 44px rgba(15, 23, 42, 0.12);
    }
    .audit-lux-popout-image {
      max-width: 100%;
      max-height: calc(100vh - 180px);
      object-fit: contain;
      transform-origin: center center;
    }
    .audit-lux-popout-frame {
      width: 100%;
      min-height: calc(100vh - 180px);
      border: 0;
      background: #ffffff;
    }
    .audit-lux-popout-empty {
      padding: 24px;
      text-align: center;
      color: #64748b;
      font-size: 0.86rem;
      font-weight: 700;
    }
    .audit-lux-popout-foot {
      display: grid;
      gap: 4px;
      padding: 0 18px 18px;
      color: #64748b;
      font-size: 0.78rem;
      line-height: 1.45;
    }
  </style>
</head>
<body>
  <div class="audit-lux-popout-head">
    <div class="audit-lux-popout-copy">
      <div class="audit-lux-popout-title">스캔본 원본</div>
      <div class="audit-lux-popout-meta">${safeMeta}</div>
    </div>
    <div class="audit-lux-popout-actions">
      <a class="audit-lux-popout-btn" href="${safeDownloadUrl}" target="_blank" rel="noopener">원본 열기</a>
      <button type="button" class="audit-lux-popout-btn" onclick="window.close()">닫기</button>
    </div>
  </div>
  <div class="audit-lux-popout-stage">${mediaHtml}</div>
  <div class="audit-lux-popout-foot">
    <span>창 상단을 잡고 다른 모니터로 이동해 원본을 펼쳐둔 채 검침할 수 있습니다.</span>
    <span>${safeFileLabel}</span>
  </div>
</body>
</html>`;
        }

        function syncAuditLuxDetachedPreview(dataKey, year, team) {
            const state = getAuditLuxDetachedPreviewState();
            const popup = state.popup;
            if (!popup || popup.closed) {
                state.popup = null;
                return;
            }
            if (!isAuditLuxDataKey(dataKey)) return;
            const attachmentItem = typeof getAuditLuxYearEvidenceItem === 'function'
                ? getAuditLuxYearEvidenceItem(dataKey, year, team)
                : null;
            const viewUrl = typeof getAuditEvidenceViewUrl === 'function'
                ? getAuditEvidenceViewUrl(attachmentItem)
                : '';
            const downloadUrl = typeof getAuditEvidenceDownloadUrl === 'function'
                ? getAuditEvidenceDownloadUrl(attachmentItem)
                : viewUrl;
            const fileLabel = typeof getAuditEvidenceFileLabel === 'function'
                ? getAuditEvidenceFileLabel(attachmentItem)
                : '';
            const isPdf = typeof isAuditEvidencePdf === 'function'
                ? isAuditEvidencePdf(attachmentItem)
                : false;
            const rotation = Number.isFinite(parseFloat(attachmentItem?.rotate))
                ? parseFloat(attachmentItem.rotate)
                : 0;
            const title = `${String(team || '').trim()} ${String(year || '').trim()}년 조도 스캔본`;
            const html = buildAuditLuxDetachedPreviewHtml({
                title,
                meta: `${String(team || '').trim()} ${String(year || '').trim()}년`,
                fileLabel,
                viewUrl,
                downloadUrl,
                isPdf,
                rotation
            });
            popup.document.open();
            popup.document.write(html);
            popup.document.close();
            state.dataKey = dataKey;
            state.year = year;
            state.team = team;
        }

        function openAuditLuxDetachedPreview(dataKey) {
            if (!isAuditLuxDataKey(dataKey)) return;
            const { entryForm } = getAuditLuxWorkspaceState(dataKey);
            const year = Number(entryForm.year);
            const team = String(entryForm.team || '').trim();
            const state = getAuditLuxDetachedPreviewState();
            let popup = state.popup;
            if (!popup || popup.closed) {
                popup = window.open('', 'kpi_audit_lux_detached_preview', 'popup=yes,width=1280,height=920,left=120,top=80,resizable=yes,scrollbars=yes');
                if (!popup) {
                    showToast('원본 창을 열지 못했습니다. 팝업 차단을 확인해 주세요.');
                    const attachmentItem = typeof getAuditLuxYearEvidenceItem === 'function'
                        ? getAuditLuxYearEvidenceItem(dataKey, year, team)
                        : null;
                    const fallbackUrl = typeof getAuditEvidenceViewUrl === 'function'
                        ? getAuditEvidenceViewUrl(attachmentItem)
                        : '';
                    if (fallbackUrl) {
                        window.open(fallbackUrl, '_blank', 'noopener');
                    }
                    return;
                }
                state.popup = popup;
            }
            syncAuditLuxDetachedPreview(dataKey, year, team);
            try {
                popup.focus();
            } catch (error) {
                console.warn('[KPI audit lux] detached preview focus failed', error);
            }
        }

        function isAuditLuxQuarterEditable(year, quarter) {
            const targetYear = Number(year);
            const targetQuarter = Number(quarter);
            if (!Number.isFinite(targetYear) || !Number.isFinite(targetQuarter)) return false;
            const now = typeof getAuditCurrentQuarterInfo === 'function'
                ? getAuditCurrentQuarterInfo()
                : getQuarterInfo(new Date());
            if (targetYear < now.year) return true;
            if (targetYear > now.year) return false;
            return targetQuarter <= now.quarter;
        }

        function buildAuditLuxQuarterCell(row, year, quarter, dataKey) {
            const value = getAuditLuxNumericDisplayValue(row?.values?.[quarter]);
            const standardValue = parseFloat(row?.standard);
            const numericValue = parseFloat(value);
            const editable = isAuditLuxQuarterEditable(year, quarter);
            const isBelowStandard = value !== ''
                && Number.isFinite(standardValue)
                && Number.isFinite(numericValue)
                && numericValue < standardValue;
            const feedback = !editable
                ? '<span class="audit-lux-sheet-feedback is-muted">입력 대기</span>'
                : (isBelowStandard ? '<span class="audit-lux-sheet-feedback is-fail">기준 미달</span>' : '<span class="audit-lux-sheet-feedback">&nbsp;</span>');
            return `
                <td class="audit-lux-sheet-quarter ${editable ? '' : 'is-locked'} ${isBelowStandard ? 'is-fail' : ''}">
                    <div class="audit-lux-quarter-field ${editable ? '' : 'is-locked'} ${isBelowStandard ? 'is-fail' : ''}">
                        <span class="audit-lux-cell-caption audit-lux-quarter-caption">\uCE21\uC815\uAC12</span>
                        <input
                            type="text"
                            inputmode="decimal"
                        class="audit-input audit-lux-quarter-input ${isBelowStandard ? 'is-fail' : ''}"
                        data-audit-lux-quarter-input="${dataKey}"
                        data-row-key="${escapeHtml(row.rowKey)}"
                        data-quarter="${quarter}"
                        value="${escapeHtml(value)}"
                        oninput="handleAuditLuxQuarterInput(this)"
                        onkeydown="handleAuditLuxInputKeydown(event, this)"
                        ${editable ? '' : 'disabled'}
                    />
                        ${feedback}
                    </div>
                </td>
            `;
        }

        function getAuditLuxWorkspaceRoomGroups(rows) {
            const groups = [];
            (Array.isArray(rows) ? rows : []).forEach((row) => {
                const room = String(row?.room || '').trim();
                const lastGroup = groups[groups.length - 1];
                if (!lastGroup || lastGroup.room !== room) {
                    groups.push({ room, rows: [row] });
                    return;
                }
                lastGroup.rows.push(row);
            });
            return groups;
        }

        function renderAuditLuxWorkspacePreview(dataKey, year, team) {
            const attachmentItem = typeof getAuditLuxYearEvidenceItem === 'function'
                ? getAuditLuxYearEvidenceItem(dataKey, year, team)
                : null;
            if (!attachmentItem) {
                return `
                    <div class="audit-lux-preview-card">
                        <div class="audit-lux-preview-head">
                            <div class="audit-lux-preview-copy">
                                <div class="audit-lux-preview-title">스캔본 원본</div>
                                <div class="audit-lux-preview-meta">${escapeHtml(team || '')} ${escapeHtml(String(year || ''))}년</div>
                            </div>
                        </div>
                        <div class="audit-lux-preview-empty">선택한 년도에 등록된 조도 스캔본이 없습니다.</div>
                    </div>
                `;
            }
            const viewUrl = typeof getAuditEvidenceViewUrl === 'function'
                ? getAuditEvidenceViewUrl(attachmentItem)
                : '';
            const downloadUrl = typeof getAuditEvidenceDownloadUrl === 'function'
                ? getAuditEvidenceDownloadUrl(attachmentItem)
                : viewUrl;
            const fileLabel = typeof getAuditEvidenceFileLabel === 'function'
                ? getAuditEvidenceFileLabel(attachmentItem)
                : '';
            const isPdf = typeof isAuditEvidencePdf === 'function'
                ? isAuditEvidencePdf(attachmentItem)
                : false;
            const rotation = Number.isFinite(parseFloat(attachmentItem?.rotate))
                ? parseFloat(attachmentItem.rotate)
                : 0;
            const previewStage = viewUrl
                ? (isPdf
                    ? `<iframe class="audit-lux-preview-frame" src="${escapeHtml(viewUrl)}" title="조도 스캔본 미리보기"></iframe>`
                    : `<img class="audit-lux-preview-image" src="${escapeHtml(viewUrl)}" alt="${escapeHtml(`${team} ${year}년 조도 스캔본`)}" loading="lazy" decoding="async" style="transform: rotate(${rotation}deg);" />`)
                : '<div class="audit-lux-preview-empty">첨부 미리보기를 불러올 수 없습니다.</div>';
            return `
                <div class="audit-lux-preview-card">
                    <div class="audit-lux-preview-head">
                        <div class="audit-lux-preview-copy">
                            <div class="audit-lux-preview-title">스캔본 원본</div>
                            <div class="audit-lux-preview-meta">${escapeHtml(team || '')} ${escapeHtml(String(year || ''))}년</div>
                        </div>
                        <div class="audit-filter-actions">
                            <button type="button" class="work-btn" onclick="openAuditLuxDetachedPreview('${escapeJs(dataKey)}')">분리 보기</button>
                            <a class="work-btn audit-ref-open" href="${escapeHtml(viewUrl || downloadUrl || '#')}" target="_blank" rel="noopener">원본 열기</a>
                        </div>
                    </div>
                    <div class="audit-lux-preview-stage ${isPdf ? 'is-pdf' : ''}">
                        ${previewStage}
                    </div>
                    <div class="audit-lux-preview-foot">
                        <span class="audit-lux-preview-origin">${escapeHtml(fileLabel || '첨부 파일')}</span>
                    </div>
                </div>
            `;
        }

        function renderAuditLuxWorkspace(category, data) {
            const dataKey = category.dataKey;
            const { entryForm, now, teams, yearStart } = getAuditLuxWorkspaceState(dataKey);
            const selectedYear = Number(entryForm.year);
            const selectedTeam = String(entryForm.team || '').trim();
            const yearOptions = getYearOptionsDesc(yearStart, now.year, selectedYear, '년도');
            const rows = typeof getAuditLuxWorkspaceRows === 'function'
                ? getAuditLuxWorkspaceRows(dataKey, selectedYear, selectedTeam)
                : [];
            const alertSummary = getAuditLuxWorkspaceAlertSummary(dataKey, { useLiveRows: false });
            const alertGuide = getAuditLuxWorkspaceAlertGuide(alertSummary);
            const alertTitle = getAuditLuxWorkspaceAlertTitle(alertSummary);
            const noteValue = typeof getAuditLuxYearNote === 'function'
                ? getAuditLuxYearNote(dataKey, selectedYear, selectedTeam)
                : '';
            const attachmentItem = typeof getAuditLuxYearEvidenceItem === 'function'
                ? getAuditLuxYearEvidenceItem(dataKey, selectedYear, selectedTeam)
                : null;
            const yearGuide = selectedYear < now.year
                ? `${selectedYear}년은 1~4분기 모두 입력할 수 있습니다.`
                : `${now.year}년은 현재 ${now.quarter}분기까지 입력할 수 있습니다.`;
            const roomGroups = getAuditLuxWorkspaceRoomGroups(rows);
            const failRowKeys = getAuditLuxWorkspaceFailRowKeys(rows);
            const hasFailShortcut = failRowKeys.length > 0;
            const failShortcutTitle = Number.isFinite(selectedYear) && selectedTeam
                ? `${selectedYear}년 ${selectedTeam} 기준 미달 항목으로 이동`
                : '기준 미달 항목으로 이동';
            const rowsHtml = roomGroups.length
                ? roomGroups.map((group) => (
                    group.rows.map((row, rowIndex) => {
                        const hasRowFailure = hasAuditLuxWorkspaceRowFailure(row);
                        return `
                        <tr class="audit-lux-sheet-row ${hasRowFailure ? 'is-fail' : ''}" data-audit-lux-row="${escapeHtml(dataKey)}" data-row-key="${escapeHtml(row.rowKey)}">
                            ${rowIndex === 0 ? `<th scope="rowgroup" rowspan="${group.rows.length}" class="audit-lux-sheet-room"><div class="audit-lux-room-box">${escapeHtml(group.room || '')}</div></th>` : ''}
                            <td class="audit-lux-sheet-type"><div class="audit-lux-type-box">${escapeHtml(row.type || '')}</div></td>
                            <td class="audit-lux-sheet-standard-cell">
                                <div class="audit-lux-standard-field">
                                    <span class="audit-lux-cell-caption audit-lux-standard-caption">\uAE30\uC900 \uC870\uB3C4</span>
                                    <div class="audit-lux-standard-input-wrap">
                                        <input
                                            type="text"
                                            inputmode="decimal"
                                            class="audit-input audit-lux-standard-input"
                                            data-audit-lux-standard-input="${dataKey}"
                                            data-row-key="${escapeHtml(row.rowKey)}"
                                            data-room="${escapeHtml(row.room || '')}"
                                            data-type="${escapeHtml(row.type || '')}"
                                            data-original-standard="${escapeHtml(getAuditLuxNumericDisplayValue(row.baseStandard || row.standard || ''))}"
                                            value="${escapeHtml(getAuditLuxNumericDisplayValue(row.standard || ''))}"
                                            oninput="handleAuditLuxStandardInput(this)"
                                            onkeydown="handleAuditLuxInputKeydown(event, this)"
                                        />
                                        <span class="audit-lux-standard-suffix">\uC774\uC0C1</span>
                                    </div>
                                </div>
                            </td>
                            ${[1, 2, 3, 4].map((quarter) => buildAuditLuxQuarterCell(row, selectedYear, quarter, dataKey)).join('')}
                        </tr>
                    `;
                    }).join('')
                )).join('')
                : '<tr><td colspan="7" class="audit-lux-sheet-empty">선택한 팀의 조도 기준이 아직 등록되지 않았습니다.</td></tr>';
            const contentContainer = document.getElementById('content-container');
            contentContainer.innerHTML = `
                <div class="audit-lux-shell" data-audit-lux-workspace="${dataKey}">
                    <div class="audit-lux-window">
                        <div class="audit-lux-window-header">
                            <div class="audit-lux-window-copy">
                                <span class="audit-lux-window-kicker">조도 입력</span>
                                <h2 class="audit-lux-window-title">${escapeHtml(category.title || '조도 (Lux)')}</h2>
                                <p class="audit-lux-window-desc">좌측 스캔본을 그대로 보면서 우측 양식에 연도별 조도값을 입력합니다. 기준 수정은 선택한 연도부터 이후 연도에 적용됩니다.</p>
                            </div>
                            <div class="audit-lux-window-actions">
                                <div class="audit-team-toggle-group" role="group" aria-label="조도 팀 전환">
                                    <button
                                        type="button"
                                        class="audit-team-toggle ${teams.length ? 'is-active' : ''}"
                                        onclick="cycleAuditLuxWorkspaceTeam('${dataKey}')"
                                        ${teams.length > 1 ? '' : 'disabled'}
                                        title="${teams.length > 1 ? '클릭할 때마다 Line Gamma과 Line Delta이 전환됩니다.' : ''}"
                                    >${escapeHtml(selectedTeam || '팀 없음')}</button>
                                </div>
                                <select class="audit-select audit-lux-year-select" onchange="setAuditLuxWorkspaceYear('${dataKey}', this.value)">${yearOptions}</select>
                                ${getAuditLuxWorkspaceFullscreenButtonHtml()}
                                <button type="button" class="work-btn" onclick="openAuditLuxAttachmentPicker('${dataKey}')">${attachmentItem ? '첨부 교체' : '첨부'}</button>
                                <input type="file" id="audit-lux-attachment-input-${dataKey}" class="audit-hidden-input" accept="image/*,application/pdf" onchange="handleAuditLuxAttachmentChange('${dataKey}', this)" />
                                <button
                                    type="button"
                                    class="audit-help-toggle"
                                    id="audit-notice-toggle-${dataKey}"
                                    aria-expanded="false"
                                    aria-controls="audit-notice-modal-${dataKey}"
                                    onclick="toggleAuditNotice('${dataKey}')"
                                    title="주의사항 보기"
                                >?</button>
                            </div>
                        </div>
                        <div class="audit-lux-workspace">
                            <div class="audit-lux-preview-pane">
                                ${renderAuditLuxWorkspacePreview(dataKey, selectedYear, selectedTeam)}
                            </div>
                            <div class="audit-lux-sheet-pane">
                                <div class="audit-lux-sheet-head audit-lux-sheet-head-document">
                                    <div class="audit-lux-sheet-docmeta">
                                        <span>팀 ${escapeHtml(selectedTeam || '')}</span>
                                        <span>${selectedYear}년</span>
                                        <button
                                            type="button"
                                            class="audit-lux-sheet-jump"
                                            data-audit-lux-jump="${escapeHtml(dataKey)}"
                                            onclick="jumpToAuditLuxWorkspaceFailRow('${escapeJs(dataKey)}')"
                                            title="${escapeHtml(failShortcutTitle)}"
                                            ${hasFailShortcut ? '' : 'hidden disabled'}
                                        ><i class="fa-solid fa-arrow-turn-down"></i><span>미달 바로 가기</span></button>
                                        <span>${escapeHtml(yearGuide)}</span>
                                    </div>
                                    <div class="audit-lux-sheet-doctitle">조도 측정 기록표</div>
                                    <div class="audit-lux-sheet-docsub">기준 수정은 선택한 연도부터 이후 연도에만 반영됩니다.</div>
                                    <div class="audit-lux-sheet-alert ${alertSummary.failCount > 0 ? '' : 'is-safe'}" data-audit-lux-alert="${dataKey}" title="${escapeHtml(alertTitle)}">
                                        <span class="audit-lux-sheet-alert-chip ${alertSummary.failCount > 0 ? '' : 'is-safe'}" data-audit-lux-alert-chip="${dataKey}" title="${escapeHtml(alertTitle)}">
                                            <i class="fa-solid fa-bell"></i>
                                            <span data-audit-lux-alert-count="${dataKey}" title="${escapeHtml(alertTitle)}">${escapeHtml(getAuditLuxWorkspaceAlertCountLabel(alertSummary))}</span>
                                        </span>
                                        <span class="audit-lux-sheet-alert-text" data-audit-lux-alert-guide="${dataKey}" title="${escapeHtml(alertTitle)}">${escapeHtml(alertGuide)}</span>
                                    </div>
                                </div>
                                <div class="audit-lux-sheet-table-wrap">
                                    <table class="audit-lux-sheet-table">
                                        <thead>
                                            <tr>
                                                <th class="audit-lux-col-room">실 / 구역</th>
                                                <th class="audit-lux-col-type">측정 위치 / 설비</th>
                                                <th class="audit-lux-col-standard">기준 조도 (Lux)</th>
                                                <th class="audit-lux-col-quarter">1분기</th>
                                                <th class="audit-lux-col-quarter">2분기</th>
                                                <th class="audit-lux-col-quarter">3분기</th>
                                                <th class="audit-lux-col-quarter">4분기</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rowsHtml}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="audit-lux-window-footer">
                            <label class="audit-lux-note-field" for="audit-lux-note-${dataKey}">
                                <span class="audit-lux-note-label">특이사항</span>
                                <textarea class="audit-input audit-note-area audit-lux-note-area" id="audit-lux-note-${dataKey}" placeholder="해당 연도 조도 측정의 특이사항을 입력하세요.">${escapeHtml(noteValue || '')}</textarea>
                            </label>
                            <div class="audit-filter-actions">
                                <button type="button" class="work-btn primary" onclick="saveAuditLuxWorkspace('${dataKey}')">저장</button>
                            </div>
                        </div>
                    </div>
                    <div class="audit-notice-modal" id="audit-notice-modal-${dataKey}" aria-hidden="true">
                        <button type="button" class="audit-notice-modal-backdrop" onclick="toggleAuditNotice('${dataKey}')" aria-label="주의사항 닫기"></button>
                        <div class="audit-notice-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="audit-notice-title-${dataKey}">
                            <div class="audit-notice-modal-head">
                                <div class="audit-notice-header">
                                    <span class="audit-notice-icon"><i class="fa-solid fa-circle-dot"></i></span>
                                    <div>
                                        <div class="audit-notice-title" id="audit-notice-title-${dataKey}">조도 측정 주의사항</div>
                                        <div class="audit-notice-sub">측정 기준을 동일하게 유지하세요.</div>
                                    </div>
                                </div>
                                <button type="button" class="audit-help-close" onclick="toggleAuditNotice('${dataKey}')">닫기</button>
                            </div>
                            <div class="audit-notice-list">
                                <div class="audit-notice-item">
                                    <span class="audit-notice-chip"><i class="fa-solid fa-bullseye"></i></span>
                                    <div>
                                        <div class="audit-notice-label">조도계 사용</div>
                                        <div class="audit-notice-desc">측정 시 조도계 센서를 정확히 고정합니다.</div>
                                    </div>
                                </div>
                                <div class="audit-notice-item">
                                    <span class="audit-notice-chip" style="background:#fef3c7;color:#b45309;"><i class="fa-solid fa-ruler-vertical"></i></span>
                                    <div>
                                        <div class="audit-notice-label">측정 높이 기준</div>
                                        <div class="audit-notice-desc">바닥으로부터 0.6 ~ 1.0 m 범위에서 측정합니다.</div>
                                    </div>
                                </div>
                                <div class="audit-notice-item">
                                    <span class="audit-notice-chip" style="background:#dcfce7;color:#166534;"><i class="fa-solid fa-calendar-check"></i></span>
                                    <div>
                                        <div class="audit-notice-label">정기 검교정</div>
                                        <div class="audit-notice-desc">조도계 연 1회 검교정을 실시합니다.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            syncAuditLuxDetachedPreview(dataKey, selectedYear, selectedTeam);
            syncAuditLuxWorkspaceFullscreenUi();
            syncAuditLuxWorkspaceAlert(dataKey);
            const teamMetaEl = contentContainer.querySelector('.audit-lux-sheet-docmeta span:first-child');
            if (teamMetaEl) {
                teamMetaEl.textContent = selectedTeam || '';
            }
        }

        async function saveAuditLuxWorkspace(dataKey, options = {}) {
            if (!isAuditLuxDataKey(dataKey)) return false;
            const { entryForm } = getAuditLuxWorkspaceState(dataKey);
            const year = Number(entryForm.year);
            const team = String(entryForm.team || '').trim();
            if (!Number.isFinite(year) || !team) return false;
            const standardInputs = Array.from(document.querySelectorAll(`[data-audit-lux-standard-input="${dataKey}"]`));
            if (!standardInputs.length) return false;
            const rowMap = new Map();
            standardInputs.forEach((input) => {
                const rowKey = String(input.dataset.rowKey || '').trim();
                if (!rowKey) return;
                rowMap.set(rowKey, {
                    rowKey,
                    room: String(input.dataset.room || '').trim(),
                    type: String(input.dataset.type || '').trim(),
                    standard: normalizeAuditLuxNumericValue(input.value) || normalizeAuditLuxNumericValue(input.dataset.originalStandard || ''),
                    originalStandard: normalizeAuditLuxNumericValue(input.dataset.originalStandard || ''),
                    values: { 1: '', 2: '', 3: '', 4: '' }
                });
            });
            Array.from(document.querySelectorAll(`[data-audit-lux-quarter-input="${dataKey}"]`)).forEach((input) => {
                const rowKey = String(input.dataset.rowKey || '').trim();
                const quarter = Number(input.dataset.quarter);
                const row = rowMap.get(rowKey);
                if (!row || !Number.isFinite(quarter)) return;
                row.values[quarter] = normalizeAuditLuxNumericValue(input.value);
            });
            const noteEl = document.getElementById(`audit-lux-note-${dataKey}`);
            const note = String(noteEl?.value || '').trim();
            const data = getAuditData(dataKey, dataKey);
            const targetRowKeys = new Set(rowMap.keys());
            const normalizedTeam = normalizeAuditZone(team);
            const preservedEntries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => {
                if (Number(entry?.year) !== year) return true;
                if (normalizeAuditZone(entry?.team || '') !== normalizedTeam) return true;
                return !targetRowKeys.has(makeAuditLuxSheetRowKey(entry?.team, entry?.room, entry?.type));
            });
            const nextEntries = [];
            rowMap.forEach((row) => {
                const rowKey = makeAuditLuxSheetRowKey(team, row.room, row.type);
                const standardItem = (Array.isArray(data.standards) ? data.standards : []).find((item) => (
                    makeAuditLuxSheetRowKey(item?.team, item?.room, item?.type) === rowKey
                ));
                const resolvedStandard = row.standard || row.originalStandard;
                const currentStandard = standardItem
                    ? normalizeAuditLuxNumericValue(resolveAuditLuxStandardForYear(standardItem, year) || String(standardItem?.standard || '').trim())
                    : '';
                if (standardItem && resolvedStandard && resolvedStandard !== currentStandard) {
                    setAuditLuxStandardForYear(standardItem, year, resolvedStandard);
                }
                [1, 2, 3, 4].forEach((quarter) => {
                    const value = String(row.values[quarter] || '').trim();
                    if (!value) return;
                    nextEntries.push({
                        year,
                        quarter,
                        team,
                        room: row.room,
                        type: row.type,
                        value,
                        note
                    });
                });
            });
            data.entries = preservedEntries.concat(nextEntries);
            if (typeof setAuditLuxYearNote === 'function') {
                setAuditLuxYearNote(data, year, team, note);
            }
            const saved = await Promise.resolve(saveAuditData(dataKey, data));
            if (saved === false) {
                if (options?.silent !== true) {
                    alert('조도 데이터는 서버 저장이 가능한 환경에서만 저장할 수 있습니다.');
                }
                return false;
            }
            const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
            setLastModified(category?.title || 'Audit');
            if (category) renderAuditContent(category);
            return true;
        }

        function openAuditLuxAttachmentPicker(dataKey) {
            const input = document.getElementById(`audit-lux-attachment-input-${dataKey}`);
            if (input) input.click();
        }

        async function handleAuditLuxAttachmentChange(dataKey, input) {
            const file = input?.files?.[0];
            if (!file) return;
            const { entryForm } = getAuditLuxWorkspaceState(dataKey);
            const year = Number(entryForm.year);
            const team = String(entryForm.team || '').trim();
            try {
                await replaceAuditLuxEvidenceForYear(dataKey, year, team, file);
                const category = AppData?.audit?.categories?.find(cat => cat.dataKey === dataKey);
                setLastModified(category?.title || 'Audit');
                if (category) renderAuditContent(category);
            } catch (error) {
                console.error('[kpi] audit lux attachment replace failed', error);
                const errorKey = String(error?.message || '').trim();
                let message = '조도 첨부를 저장하지 못했습니다.';
                if (errorKey === 'unsupported_type') message = '이미지 또는 PDF 파일만 첨부할 수 있습니다.';
                else if (errorKey === 'file_too_large') message = '첨부 파일은 25MB 이하만 업로드할 수 있습니다.';
                else if (errorKey === 'server_write_unavailable') message = '현재는 서버 저장이 가능한 환경에서만 첨부를 교체할 수 있습니다.';
                alert(message);
            } finally {
                if (input) input.value = '';
            }
        }
