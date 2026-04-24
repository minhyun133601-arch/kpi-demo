(function registerUtilReportSheetPanelRuntime(globalScope) {
    if (globalScope.KPIUtilReportSheetPanelRuntime) {
        return;
    }

    const utilReportSheetConfig = globalScope.KPIUtilReportSheetConfig;
    if (!utilReportSheetConfig) {
        throw new Error('KPIUtilReportSheetConfig must load before KPI.util.report.sheet.panel.runtime.js');
    }

    const {
        UTIL_SHEET_DATASET_SPECS,
        UTIL_SHEET_TYPE_SPECS,
        UtilSheetReportState,
        UtilSheetReportMonthState,
        UtilSheetCompareState
    } = utilReportSheetConfig;

    const runtime = {
        escapeUtilSheetHtml: null,
        renderUtilSheetPanel: null,
        openUtilSheetReportModal: null,
        closeUtilActionMenus: null
    };

    function setRuntimeAdapters(adapters = {}) {
        Object.assign(runtime, adapters || {});
        return globalScope.KPIUtilReportSheetPanelRuntime;
    }

    function escapeHtml(value) {
        if (typeof runtime.escapeUtilSheetHtml === 'function') {
            return runtime.escapeUtilSheetHtml(value);
        }
        return String(value ?? '');
    }

    function normalizeUtilSheetCompareKey(compareKey) {
        return String(compareKey || '').trim() === 'year' ? 'year' : 'month';
    }

    function normalizeUtilSheetType(sheetType) {
        return String(sheetType || '').trim() === 'analysis' ? 'analysis' : 'meter';
    }

    function getUtilSheetAlternateType(sheetType) {
        return normalizeUtilSheetType(sheetType) === 'analysis' ? 'meter' : 'analysis';
    }

    function getUtilSheetCompareLabel(compareKey) {
        return normalizeUtilSheetCompareKey(compareKey) === 'year' ? '전년대비' : '전월대비';
    }

    function buildUtilSheetDetachedCompareToggleHtml(compareKey = 'month') {
        const normalizedCompareKey = normalizeUtilSheetCompareKey(compareKey);
        return `
            <div class="util-sheet-segment" data-role="util-sheet-report-detached-compare-toggle" aria-label="비교 기준 선택">
                <button type="button" class="util-sheet-segment-btn${normalizedCompareKey === 'month' ? ' is-active' : ''}" data-role="util-sheet-report-detached-compare-select" data-compare-key="month" aria-pressed="${normalizedCompareKey === 'month' ? 'true' : 'false'}">${getUtilSheetCompareLabel('month')}</button>
                <button type="button" class="util-sheet-segment-btn${normalizedCompareKey === 'year' ? ' is-active' : ''}" data-role="util-sheet-report-detached-compare-select" data-compare-key="year" aria-pressed="${normalizedCompareKey === 'year' ? 'true' : 'false'}">${getUtilSheetCompareLabel('year')}</button>
            </div>
        `;
    }

    function syncUtilSheetCompareButtons(root, selector, compareKey) {
        if (!root) return;
        const normalizedCompareKey = normalizeUtilSheetCompareKey(compareKey);
        root.querySelectorAll(selector).forEach(button => {
            const isActive = String(button.dataset.compareKey || '').trim() === normalizedCompareKey;
            button.classList.toggle('is-active', isActive);
            button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function normalizeUtilSheetDatasetKey(datasetKey) {
        return String(datasetKey || '').trim() === 'electric' ? 'electric' : 'gas';
    }

    function getUtilSheetAllowedDatasetKeys(sheetType) {
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        if (normalizedSheetType === 'meter' || normalizedSheetType === 'analysis') {
            return ['gas', 'electric'];
        }
        return ['gas', 'electric'];
    }

    function resolveUtilSheetReportDatasetKey(sheetType, datasetKey) {
        const allowedDatasetKeys = getUtilSheetAllowedDatasetKeys(sheetType);
        const normalizedDatasetKey = normalizeUtilSheetDatasetKey(datasetKey);
        return allowedDatasetKeys.includes(normalizedDatasetKey)
            ? normalizedDatasetKey
            : (allowedDatasetKeys[0] || 'gas');
    }

    function getUtilSheetAlternateDatasetKey(datasetKey, sheetType = 'meter') {
        const allowedDatasetKeys = getUtilSheetAllowedDatasetKeys(sheetType);
        const resolvedDatasetKey = resolveUtilSheetReportDatasetKey(sheetType, datasetKey);
        if (allowedDatasetKeys.length < 2) return resolvedDatasetKey;
        const currentIndex = allowedDatasetKeys.indexOf(resolvedDatasetKey);
        const nextIndex = currentIndex >= 0
            ? (currentIndex + 1) % allowedDatasetKeys.length
            : 0;
        return allowedDatasetKeys[nextIndex] || allowedDatasetKeys[0] || 'gas';
    }

    function pruneUtilSheetDatasetToggles(root) {
        if (!root) return;
        root.querySelectorAll('[data-role="util-sheet-dataset-toggle"], [data-role="util-sheet-modal-dataset-toggle"]').forEach(node => {
            node.remove();
        });
    }

    function getUtilSheetPresentation(sheetType, datasetKey = 'gas') {
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const normalizedDatasetKey = normalizeUtilSheetDatasetKey(datasetKey);
        const datasetSpec = UTIL_SHEET_DATASET_SPECS[normalizedDatasetKey] || UTIL_SHEET_DATASET_SPECS.gas || {};
        const datasetLabel = String(datasetSpec.label || (normalizedDatasetKey === 'electric' ? '전기비' : '가스비'));
        const iconClass = normalizedDatasetKey === 'electric' ? 'fa-bolt' : 'fa-fire-flame-curved';
        const kicker = normalizedDatasetKey === 'electric' ? 'ELECTRIC REPORT' : 'GAS REPORT';

        if (normalizedSheetType === 'analysis') {
            return {
                title: `${datasetLabel} 분석표`,
                description: `${datasetLabel} 사용량, 금액, 생산량 추이를 한 화면에서 확인합니다.`,
                iconClass,
                kicker
            };
        }

        return {
            title: `${datasetLabel} 검침표`,
            description: `${datasetLabel} 검침값과 사용량, 금액을 한 화면에서 확인합니다.`,
            iconClass,
            kicker
        };
    }

    function syncUtilSheetTypeButtons(root, selector, sheetType) {
        if (!root) return;
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const nextSheetType = getUtilSheetAlternateType(normalizedSheetType);
        const currentSpec = UTIL_SHEET_TYPE_SPECS[normalizedSheetType] || UTIL_SHEET_TYPE_SPECS.meter || {};
        const nextSpec = UTIL_SHEET_TYPE_SPECS[nextSheetType] || UTIL_SHEET_TYPE_SPECS.meter || {};
        const iconClass = normalizedSheetType === 'analysis' ? 'fa-chart-column' : 'fa-file-lines';

        root.querySelectorAll(selector).forEach(button => {
            button.dataset.sheetType = normalizedSheetType;
            button.setAttribute('aria-label', `${currentSpec.title || ''} 선택 중. 클릭하면 ${nextSpec.title || ''}로 전환`);
            button.setAttribute('title', `${nextSpec.title || ''}로 전환`);
            button.innerHTML = `
                <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
                <span>${escapeHtml(currentSpec.title || '')}</span>
            `;
        });
    }

    function syncUtilSheetDatasetButtons(root, selector, datasetKey, sheetType = 'meter') {
        if (!root) return;
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const allowedDatasetKeys = getUtilSheetAllowedDatasetKeys(normalizedSheetType);
        const normalizedDatasetKey = resolveUtilSheetReportDatasetKey(normalizedSheetType, datasetKey);
        const nextDatasetKey = getUtilSheetAlternateDatasetKey(normalizedDatasetKey, normalizedSheetType);
        const currentSpec = UTIL_SHEET_DATASET_SPECS[normalizedDatasetKey] || UTIL_SHEET_DATASET_SPECS.gas || {};
        const nextSpec = UTIL_SHEET_DATASET_SPECS[nextDatasetKey] || UTIL_SHEET_DATASET_SPECS.gas || {};
        const iconClass = normalizedDatasetKey === 'electric' ? 'fa-bolt' : 'fa-fire-flame-curved';
        const showToggle = allowedDatasetKeys.length > 1;

        root.querySelectorAll(selector).forEach(button => {
            const toggleWrap = button.closest('[data-role="util-sheet-dataset-toggle"], [data-role="util-sheet-modal-dataset-toggle"]');
            if (toggleWrap) toggleWrap.hidden = !showToggle;
            button.hidden = !showToggle;
            button.disabled = !showToggle;
            button.tabIndex = showToggle ? 0 : -1;
            if (!showToggle) return;

            button.dataset.datasetKey = normalizedDatasetKey;
            button.setAttribute('aria-label', `${currentSpec.label || ''} 선택 중. 클릭하면 ${nextSpec.label || ''}로 전환`);
            button.setAttribute('title', `${nextSpec.label || ''}로 전환`);
            button.innerHTML = `
                <i class="fa-solid ${iconClass}" aria-hidden="true"></i>
                <span>${escapeHtml(currentSpec.label || '')}</span>
            `;
        });
    }

    function syncUtilSheetPanelChromeLegacy(panel, sheetType) {
        if (!panel) return;
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const sheetSpec = UTIL_SHEET_TYPE_SPECS[normalizedSheetType] || UTIL_SHEET_TYPE_SPECS.meter || {};
        const titleEl = panel.querySelector('[data-role="util-sheet-panel-title"]');
        const descEl = panel.querySelector('[data-role="util-sheet-panel-desc"]');
        const iconEl = panel.querySelector('[data-role="util-sheet-panel-icon"]');
        const iconClass = normalizedSheetType === 'analysis' ? 'fa-chart-column' : 'fa-file-lines';

        panel.classList.toggle('is-meter', normalizedSheetType === 'meter');
        panel.classList.toggle('is-analysis', normalizedSheetType === 'analysis');
        if (titleEl) titleEl.textContent = sheetSpec.title || '';
        if (descEl) {
            descEl.textContent = `${sheetSpec.description || ''} 이동 및 모달 안에서 검침표·분석표·가스·전기를 바로 바꿀 수 있습니다.`;
        }
        if (iconEl) {
            iconEl.className = `util-sheet-title-icon is-${normalizedSheetType}`;
            iconEl.innerHTML = `<i class="fa-solid ${iconClass}" aria-hidden="true"></i>`;
        }
    }

    function syncUtilSheetPanelChrome(panel, sheetType, datasetKey = 'gas') {
        if (!panel) return;
        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const presentation = getUtilSheetPresentation(normalizedSheetType, datasetKey);
        const titleEl = panel.querySelector('[data-role="util-sheet-panel-title"]');
        const descEl = panel.querySelector('[data-role="util-sheet-panel-desc"]');
        const iconEl = panel.querySelector('[data-role="util-sheet-panel-icon"]');

        panel.classList.toggle('is-meter', normalizedSheetType === 'meter');
        panel.classList.toggle('is-analysis', normalizedSheetType === 'analysis');
        if (titleEl) titleEl.textContent = presentation.title;
        if (descEl) descEl.textContent = presentation.description;
        if (iconEl) {
            iconEl.className = `util-sheet-title-icon is-${normalizedSheetType}`;
            iconEl.innerHTML = `<i class="fa-solid ${presentation.iconClass}" aria-hidden="true"></i>`;
        }
    }

    function syncUtilSheetPanelSelection(sheetType, datasetKey = '') {
        const doc = globalScope.document;
        if (!doc?.querySelectorAll) return;

        const normalizedSheetType = normalizeUtilSheetType(sheetType);
        const normalizedDatasetKey = resolveUtilSheetReportDatasetKey(
            normalizedSheetType,
            datasetKey || UtilSheetReportState[normalizedSheetType] || 'gas'
        );

        UtilSheetReportState[normalizedSheetType] = normalizedDatasetKey;
        doc.querySelectorAll('[data-role="util-sheet-panel"]').forEach(panel => {
            const panelSheetType = normalizeUtilSheetType(panel.dataset.sheetType);
            const panelDatasetKey = resolveUtilSheetReportDatasetKey(
                panelSheetType,
                panel.dataset.datasetKey || UtilSheetReportState[panelSheetType] || 'gas'
            );
            if (panelSheetType !== normalizedSheetType || panelDatasetKey !== normalizedDatasetKey) return;

            panel.dataset.sheetType = normalizedSheetType;
            panel.dataset.datasetKey = normalizedDatasetKey;
            panel.dataset.monthKey = String(UtilSheetReportMonthState[normalizedSheetType] || panel.dataset.monthKey || '').trim();
            panel.dataset.compareKey = normalizeUtilSheetCompareKey(UtilSheetCompareState[normalizedSheetType] || panel.dataset.compareKey || 'month');
            if (typeof runtime.renderUtilSheetPanel === 'function') {
                runtime.renderUtilSheetPanel(panel);
            }
        });
    }

    function relocateUtilGasGuidanceNote(container) {
        if (!container) return;
        const layout = container.querySelector('.util-sheet-gas-layout');
        const stack = layout?.querySelector('.util-sheet-meter-table-stack');
        const guidance = container.querySelector('.util-sheet-gas-guidance');
        if (!stack || !guidance || guidance.parentElement === stack) return;
        stack.appendChild(guidance);
    }

    function initUtilSheetReports(scope) {
        const root = scope || globalScope.document;
        if (!root?.querySelectorAll) return;

        root.querySelectorAll('[data-role="util-sheet-panel"]').forEach(panel => {
            const sheetType = normalizeUtilSheetType(panel.dataset.sheetType);
            panel.dataset.sheetType = sheetType;
            const defaultDatasetKey = resolveUtilSheetReportDatasetKey(
                sheetType,
                panel.dataset.datasetKey || UtilSheetReportState[sheetType] || 'gas'
            );
            panel.dataset.datasetKey = defaultDatasetKey;
            panel.dataset.monthKey = String(panel.dataset.monthKey || UtilSheetReportMonthState[sheetType] || '').trim();
            panel.dataset.compareKey = normalizeUtilSheetCompareKey(panel.dataset.compareKey || UtilSheetCompareState[sheetType] || 'month');
            pruneUtilSheetDatasetToggles(panel);

            panel.querySelectorAll('[data-role="util-sheet-type-select"]').forEach(button => {
                if (button.dataset.bound === 'true') return;
                button.dataset.bound = 'true';
                button.addEventListener('click', () => {
                    const nextSheetType = getUtilSheetAlternateType(panel.dataset.sheetType);
                    panel.dataset.sheetType = nextSheetType;
                    panel.dataset.datasetKey = resolveUtilSheetReportDatasetKey(
                        nextSheetType,
                        panel.dataset.datasetKey || UtilSheetReportState[nextSheetType]
                    );
                    panel.dataset.monthKey = String(UtilSheetReportMonthState[nextSheetType] || panel.dataset.monthKey || '').trim();
                    panel.dataset.compareKey = normalizeUtilSheetCompareKey(UtilSheetCompareState[nextSheetType] || panel.dataset.compareKey || 'month');
                    if (typeof runtime.renderUtilSheetPanel === 'function') {
                        runtime.renderUtilSheetPanel(panel);
                    }
                });
            });

            panel.querySelectorAll('[data-role="util-sheet-select"]').forEach(button => {
                if (button.dataset.bound === 'true') return;
                button.dataset.bound = 'true';
                button.addEventListener('click', () => {
                    const activeSheetType = normalizeUtilSheetType(panel.dataset.sheetType);
                    const datasetKey = getUtilSheetAlternateDatasetKey(panel.dataset.datasetKey, activeSheetType);
                    panel.dataset.datasetKey = datasetKey;
                    UtilSheetReportState[activeSheetType] = datasetKey;
                    if (typeof runtime.renderUtilSheetPanel === 'function') {
                        runtime.renderUtilSheetPanel(panel);
                    }
                });
            });

            const monthSelect = panel.querySelector('[data-role="util-sheet-month"]');
            if (monthSelect && monthSelect.dataset.bound !== 'true') {
                monthSelect.dataset.bound = 'true';
                monthSelect.addEventListener('change', () => {
                    const activeSheetType = normalizeUtilSheetType(panel.dataset.sheetType);
                    const monthKey = String(monthSelect.value || '').trim();
                    panel.dataset.monthKey = monthKey;
                    UtilSheetReportMonthState[activeSheetType] = monthKey;
                    if (typeof runtime.renderUtilSheetPanel === 'function') {
                        runtime.renderUtilSheetPanel(panel);
                    }
                });
            }

            const openButton = panel.querySelector('[data-role="util-sheet-open"]');
            if (openButton && openButton.dataset.bound !== 'true') {
                openButton.dataset.bound = 'true';
                openButton.addEventListener('click', () => {
                    if (typeof runtime.closeUtilActionMenus === 'function' && globalScope.document) {
                        runtime.closeUtilActionMenus(globalScope.document);
                    }
                    if (typeof runtime.openUtilSheetReportModal === 'function') {
                        runtime.openUtilSheetReportModal(panel.dataset.sheetType, panel.dataset.datasetKey, panel.dataset.monthKey, panel.dataset.compareKey);
                    }
                });
            }

            if (typeof runtime.renderUtilSheetPanel === 'function') {
                runtime.renderUtilSheetPanel(panel);
            }
        });
    }

    globalScope.KPIUtilReportSheetPanelRuntime = {
        setRuntimeAdapters,
        normalizeUtilSheetCompareKey,
        normalizeUtilSheetType,
        getUtilSheetAlternateType,
        getUtilSheetCompareLabel,
        buildUtilSheetDetachedCompareToggleHtml,
        syncUtilSheetCompareButtons,
        normalizeUtilSheetDatasetKey,
        getUtilSheetAllowedDatasetKeys,
        resolveUtilSheetReportDatasetKey,
        getUtilSheetAlternateDatasetKey,
        pruneUtilSheetDatasetToggles,
        getUtilSheetPresentation,
        syncUtilSheetTypeButtons,
        syncUtilSheetDatasetButtons,
        syncUtilSheetPanelChromeLegacy,
        syncUtilSheetPanelChrome,
        syncUtilSheetPanelSelection,
        relocateUtilGasGuidanceNote,
        initUtilSheetReports
    };
})(globalThis);
