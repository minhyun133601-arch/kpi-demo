        function getDeepActiveElement(root = document) {
            let active = root?.activeElement || null;
            while (active?.shadowRoot?.activeElement) {
                active = active.shadowRoot.activeElement;
            }
            return active;
        }

        function isEditableTarget(target) {
            const candidate = target || getDeepActiveElement(document);
            if (!candidate) return false;
            const tag = (candidate.tagName || '').toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
            if (candidate.isContentEditable) return true;
            if (typeof candidate.closest === 'function' && candidate.closest('[contenteditable=\"true\"]')) return true;
            const deepActive = getDeepActiveElement(document);
            if (deepActive && deepActive !== candidate) {
                return isEditableTarget(deepActive);
            }
            return false;
        }

        function getGlobalSaveElements() {
            const dock = document.getElementById('global-save-dock');
            const button = document.getElementById('global-save-button');
            return {
                dock,
                status: dock?.querySelector?.('#global-save-status') || null,
                recentChip: dock?.querySelector?.('#global-save-recent-chip') || null,
                recentValue: dock?.querySelector?.('#global-save-recent-value') || null,
                dateChip: dock?.querySelector?.('#global-save-date-chip') || null,
                dateValue: dock?.querySelector?.('#global-save-date-value') || null,
                button,
                buttonLabel: button?.querySelector?.('#global-save-button-label') || dock?.querySelector?.('#global-save-button-label') || null
            };
        }

        function formatViewerHeaderDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const date = String(today.getDate()).padStart(2, '0');
            return `${year}.${month}.${date}`;
        }

        function shouldShowGlobalSaveDateChip() {
            return true;
        }

        function getDashboardHiddenState() {
            return document.getElementById('dashboard')?.classList.contains('hidden-view') === true;
        }

        function getDefaultGlobalSaveStatus(action) {
            if (!getDashboardHiddenState()) {
                return '\uB300\uC2DC\uBCF4\uB4DC\uC5D0\uC11C\uB294 \uC800\uC7A5 \uC791\uC5C5\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.';
            }
            if (!action) {
                return '\uD604\uC7AC \uD654\uBA74\uC740 \uC800\uC7A5 \uB300\uC0C1\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.';
            }
            return action.statusText || '\uD604\uC7AC \uD654\uBA74 \uB370\uC774\uD130\uB97C \uC911\uC559 \uC11C\uBC84\uC5D0 \uC800\uC7A5\uD569\uB2C8\uB2E4.';
        }

        function getDefaultGlobalSaveButtonLabel(action) {
            return action?.buttonLabel || '\uC800\uC7A5';
        }

        function resolveGlobalSaveAction() {
            if (!getDashboardHiddenState()) return null;
            return KpiRuntime?.resolveSaveAction?.(activeRenderContext || {}) || null;
        }

        function renderGlobalSaveUi(options = {}) {
            const { dock, status, button, buttonLabel, recentValue, dateChip, dateValue } = getGlobalSaveElements();
            if (!dock || !status || !button || !buttonLabel) return;
            const action = resolveGlobalSaveAction();
            const providerChanged = String(action?.providerKey || '') !== String(GlobalSaveUiState.providerKey || '');
            GlobalSaveUiState.activeAction = action;
            if (options.forceDefault === true || providerChanged) {
                GlobalSaveUiState.providerKey = String(action?.providerKey || '');
                GlobalSaveUiState.message = getDefaultGlobalSaveStatus(action);
                GlobalSaveUiState.tone = '';
            }

            const canSave = !!(action && action.canSave !== false && typeof action.perform === 'function');
            button.disabled = GlobalSaveUiState.busy || !canSave;
            button.classList.toggle('is-saving', GlobalSaveUiState.busy);
            button.classList.toggle('is-success', !GlobalSaveUiState.busy && GlobalSaveUiState.tone === 'success');
            button.classList.toggle('is-error', !GlobalSaveUiState.busy && GlobalSaveUiState.tone === 'error');
            button.setAttribute('aria-disabled', button.disabled ? 'true' : 'false');
            buttonLabel.textContent = GlobalSaveUiState.busy
                ? '\uC800\uC7A5 \uC911...'
                : getDefaultGlobalSaveButtonLabel(action);
            button.title = action?.title || GlobalSaveUiState.message || '\uC800\uC7A5';
            status.textContent = GlobalSaveUiState.message;
            status.classList.toggle('is-success', GlobalSaveUiState.tone === 'success');
            status.classList.toggle('is-error', GlobalSaveUiState.tone === 'error');
            if (recentValue) {
                recentValue.textContent = formatDashboardDateTime(getLatestRecentUpdateValue());
            }
            if (dateChip && dateValue) {
                const shouldShowDateChip = shouldShowGlobalSaveDateChip();
                dateChip.classList.toggle('is-hidden', !shouldShowDateChip);
                if (shouldShowDateChip) {
                    dateValue.textContent = formatViewerHeaderDate();
                }
            }
        }

        function resetGlobalSaveUiToDefault() {
            const action = resolveGlobalSaveAction();
            GlobalSaveUiState.activeAction = action;
            GlobalSaveUiState.providerKey = String(action?.providerKey || '');
            GlobalSaveUiState.message = getDefaultGlobalSaveStatus(action);
            GlobalSaveUiState.tone = '';
            renderGlobalSaveUi();
        }

        function scheduleGlobalSaveUiRefresh(options = {}) {
            if (globalSaveRefreshTimer) {
                clearTimeout(globalSaveRefreshTimer);
            }
            globalSaveRefreshTimer = setTimeout(() => {
                globalSaveRefreshTimer = null;
                renderGlobalSaveUi(options);
            }, 0);
        }

        async function triggerGlobalSave(options = {}) {
            const action = resolveGlobalSaveAction();
            if (!action || action.canSave === false || typeof action.perform !== 'function') {
                GlobalSaveUiState.activeAction = null;
                GlobalSaveUiState.providerKey = '';
                GlobalSaveUiState.message = getDefaultGlobalSaveStatus(null);
                GlobalSaveUiState.tone = 'error';
                renderGlobalSaveUi();
                return false;
            }

            GlobalSaveUiState.busy = true;
            GlobalSaveUiState.activeAction = action;
            GlobalSaveUiState.providerKey = String(action.providerKey || '');
            GlobalSaveUiState.message = '\uC911\uC559 \uC11C\uBC84\uC5D0 \uC800\uC7A5 \uC911\uC785\uB2C8\uB2E4...';
            GlobalSaveUiState.tone = '';
            renderGlobalSaveUi();

            let successAlertMessage = '';
            try {
                const result = await action.perform({
                    trigger: options.trigger || 'manual',
                    context: activeRenderContext || {},
                    action
                });
                if (result === false) {
                    throw new Error('save_rejected');
                }
                const savedRecord = KpiRuntime?.recordSaveHistory?.({
                    providerKey: action.providerKey,
                    sectionId: activeSectionId,
                    categoryTitle: activeRenderContext?.category?.title || '',
                    label: action.historyLabel || action.buttonLabel || action.label || '\uC800\uC7A5',
                    trigger: options.trigger || 'manual'
                });
                persistGlobalRecentUpdateRecord(savedRecord);
                const savedTime = savedRecord?.savedAt
                    ? new Date(savedRecord.savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
                    : '';
                GlobalSaveUiState.message = savedTime
                    ? `\uC800\uC7A5\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4. ${savedTime}`
                    : '\uC800\uC7A5\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.';
                GlobalSaveUiState.tone = '';
                successAlertMessage = '\uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.';
                return true;
            } catch (error) {
                console.error('KPI global save failed.', error);
                GlobalSaveUiState.message = action.errorMessage || '\uC800\uC7A5\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.';
                GlobalSaveUiState.tone = 'error';
                return false;
            } finally {
                GlobalSaveUiState.busy = false;
                if (successAlertMessage) {
                    resetGlobalSaveUiToDefault();
                    if (typeof window.alert === 'function') {
                        window.alert(successAlertMessage);
                    }
                } else {
                    renderGlobalSaveUi();
                }
            }
        }

        function bindGlobalSaveButton() {
            if (window.__globalSaveButtonListener) return;
            window.__globalSaveButtonListener = true;
            const { button } = getGlobalSaveElements();
            button?.addEventListener('click', () => {
                void triggerGlobalSave({ trigger: 'button' });
            });
        }

        function bindGlobalSaveHotkey() {
            if (window.__globalSaveHotkeyListener) return;
            window.__globalSaveHotkeyListener = true;
            window.addEventListener('keydown', evt => {
                if (evt.defaultPrevented) return;
                if (evt.altKey || evt.shiftKey) return;
                if (!(evt.ctrlKey || evt.metaKey)) return;
                if (String(evt.key || '').toLowerCase() !== 's') return;
                evt.preventDefault();
                evt.stopPropagation();
                void triggerGlobalSave({ trigger: 'shortcut' });
            }, true);
        }

        function bindGlobalSaveRefreshHooks() {
            if (window.__globalSaveRefreshHooks) return;
            window.__globalSaveRefreshHooks = true;
            const schedule = () => scheduleGlobalSaveUiRefresh();
            document.addEventListener('click', schedule, true);
            document.addEventListener('input', schedule, true);
            document.addEventListener('change', schedule, true);
            document.addEventListener('focusin', schedule, true);
            window.addEventListener('kpi:metering-store-updated', schedule);
            window.addEventListener('util-production-data-updated', schedule);
            window.addEventListener('storage', event => {
                if (String(event?.key || '') !== GLOBAL_RECENT_UPDATE_STORAGE_KEY) return;
                schedule();
            });
        }

        function bindBackspaceGoHomeHotkey() {
            if (window.__backspaceGoHomeListener) return;
            window.__backspaceGoHomeListener = true;
            document.addEventListener('keydown', evt => {
                if (evt.key !== 'Backspace') return;
                if (evt.defaultPrevented) return;
                if (isEditableTarget(evt.target)) return;
                const dashboard = document.getElementById('dashboard');
                if (!dashboard || !dashboard.classList.contains('hidden-view')) return;
                if (hasOpenModalLayer()) {
                    closeGlobalSectionShortcutLayers();
                    evt.preventDefault();
                    return;
                }
                goHome();
                evt.preventDefault();
            });
        }

        function closeGlobalSectionShortcutLayers() {
            KpiRuntime?.closeShortcutLayers?.();
            document.querySelectorAll('[id$="-modal"].is-open').forEach(modal => {
                modal.classList.remove('is-open');
                modal.classList.remove('is-chart-fullscreen');
            });
            document.body.style.overflow = '';
        }

        function hasOpenModalLayer() {
            return Boolean(document.querySelector('[id$="-modal"].is-open'));
        }
