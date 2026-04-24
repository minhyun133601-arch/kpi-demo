        const AppData = {};
        let activeSectionId = null;

        const KpiRuntimeState = {
            sectionRenderers: Object.create(null),
            sectionInitializers: Object.create(null),
            defaultContentDecorators: Object.create(null),
            shortcutClosers: Object.create(null),
            bootTasks: Object.create(null),
            defaultOpenOptions: Object.create(null),
            viewChangeHandlers: Object.create(null),
            saveProviders: Object.create(null),
            saveHistory: []
        };

        function normalizeKpiRuntimeKey(value) {
            return String(value || '').trim();
        }

        function registerSectionRenderer(sectionId, renderer) {
            const key = normalizeKpiRuntimeKey(sectionId);
            if (!key || typeof renderer !== 'function') return;
            KpiRuntimeState.sectionRenderers[key] = renderer;
        }

        function getSectionRenderer(sectionId) {
            const key = normalizeKpiRuntimeKey(sectionId);
            return key ? KpiRuntimeState.sectionRenderers[key] || null : null;
        }

        function registerSectionInitializer(sectionId, initializer) {
            const key = normalizeKpiRuntimeKey(sectionId);
            if (!key || typeof initializer !== 'function') return;
            if (!Array.isArray(KpiRuntimeState.sectionInitializers[key])) {
                KpiRuntimeState.sectionInitializers[key] = [];
            }
            KpiRuntimeState.sectionInitializers[key].push(initializer);
        }

        function runSectionInitializers(sectionId, context = {}) {
            const key = normalizeKpiRuntimeKey(sectionId);
            const handlers = key ? KpiRuntimeState.sectionInitializers[key] || [] : [];
            handlers.forEach(handler => {
                try {
                    handler(context);
                } catch (error) {
                    console.error(`KpiRuntime section initializer failed: ${key}`, error);
                }
            });
        }

        function registerDefaultContentDecorator(sectionId, decorator) {
            const key = normalizeKpiRuntimeKey(sectionId);
            if (!key || typeof decorator !== 'function') return;
            KpiRuntimeState.defaultContentDecorators[key] = decorator;
        }

        function getDefaultContentDecorator(sectionId) {
            const key = normalizeKpiRuntimeKey(sectionId);
            return key ? KpiRuntimeState.defaultContentDecorators[key] || null : null;
        }

        function registerShortcutCloser(key, closer) {
            const normalizedKey = normalizeKpiRuntimeKey(key);
            if (!normalizedKey || typeof closer !== 'function') return;
            KpiRuntimeState.shortcutClosers[normalizedKey] = closer;
        }

        function closeShortcutLayers() {
            Object.entries(KpiRuntimeState.shortcutClosers).forEach(([key, closer]) => {
                try {
                    closer();
                } catch (error) {
                    console.error(`KpiRuntime shortcut closer failed: ${key}`, error);
                }
            });
        }

        function registerBootTask(key, task) {
            const normalizedKey = normalizeKpiRuntimeKey(key);
            if (!normalizedKey || typeof task !== 'function') return;
            KpiRuntimeState.bootTasks[normalizedKey] = task;
        }

        function runBootTasks() {
            Object.entries(KpiRuntimeState.bootTasks).forEach(([key, task]) => {
                try {
                    task();
                } catch (error) {
                    console.error(`KpiRuntime boot task failed: ${key}`, error);
                }
            });
        }

        function registerDefaultOpenOptions(sectionId, options) {
            const key = normalizeKpiRuntimeKey(sectionId);
            if (!key) return;
            if (typeof options === 'function' || (options && typeof options === 'object')) {
                KpiRuntimeState.defaultOpenOptions[key] = options;
            }
        }

        function getDefaultOpenOptions(sectionId, context = {}) {
            const key = normalizeKpiRuntimeKey(sectionId);
            if (!key) return {};
            const source = KpiRuntimeState.defaultOpenOptions[key];
            if (typeof source === 'function') {
                const resolved = source(context);
                return resolved && typeof resolved === 'object' ? { ...resolved } : {};
            }
            return source && typeof source === 'object' ? { ...source } : {};
        }

        function registerViewChangeHandler(key, handler) {
            const normalizedKey = normalizeKpiRuntimeKey(key);
            if (!normalizedKey || typeof handler !== 'function') return;
            KpiRuntimeState.viewChangeHandlers[normalizedKey] = handler;
        }

        function runViewChangeHandlers(context = {}) {
            Object.entries(KpiRuntimeState.viewChangeHandlers).forEach(([key, handler]) => {
                try {
                    handler(context);
                } catch (error) {
                    console.error(`KpiRuntime view change handler failed: ${key}`, error);
                }
            });
        }

        function registerSaveProvider(key, provider) {
            const normalizedKey = normalizeKpiRuntimeKey(key);
            if (!normalizedKey || typeof provider !== 'function') return;
            KpiRuntimeState.saveProviders[normalizedKey] = provider;
        }

        function resolveSaveAction(context = {}) {
            const matches = [];
            Object.entries(KpiRuntimeState.saveProviders).forEach(([key, provider]) => {
                try {
                    const resolved = provider(context);
                    if (!resolved || typeof resolved !== 'object') return;
                    matches.push({
                        ...resolved,
                        providerKey: key,
                        priority: Number.isFinite(Number(resolved.priority)) ? Number(resolved.priority) : 0
                    });
                } catch (error) {
                    console.error(`KpiRuntime save provider failed: ${key}`, error);
                }
            });
            matches.sort((a, b) => b.priority - a.priority);
            return matches[0] || null;
        }

        function recordSaveHistory(entry = {}) {
            const normalized = {
                savedAt: entry.savedAt || new Date().toISOString(),
                providerKey: normalizeKpiRuntimeKey(entry.providerKey),
                sectionId: normalizeKpiRuntimeKey(entry.sectionId),
                categoryTitle: String(entry.categoryTitle || '').trim(),
                label: String(entry.label || '').trim(),
                trigger: String(entry.trigger || '').trim()
            };
            KpiRuntimeState.saveHistory = [
                normalized,
                ...KpiRuntimeState.saveHistory
            ].slice(0, 20);
            return normalized;
        }

        function getSaveHistory() {
            return KpiRuntimeState.saveHistory.slice();
        }

        function getServerRuntimeConfig() {
            const runtimeConfig = window.__KPI_SERVER_RUNTIME_CONFIG__;
            if (!runtimeConfig || typeof runtimeConfig !== 'object') return null;
            return runtimeConfig;
        }

        function hasServerAuthority() {
            const runtimeConfig = getServerRuntimeConfig();
            return !!(
                runtimeConfig
                && runtimeConfig.enabled === true
                && String(runtimeConfig.source || '').trim() === 'internal_server'
                && /^(http:|https:)$/.test(window.location.protocol || '')
            );
        }

        function canUseServerWrite(writeEnabled) {
            return hasServerAuthority() && writeEnabled === true && typeof window.fetch === 'function';
        }

        window.KpiRuntime = Object.freeze({
            registerSectionRenderer,
            getSectionRenderer,
            registerSectionInitializer,
            runSectionInitializers,
            registerDefaultContentDecorator,
            getDefaultContentDecorator,
            registerShortcutCloser,
            closeShortcutLayers,
            registerBootTask,
            runBootTasks,
            registerDefaultOpenOptions,
            getDefaultOpenOptions,
            registerViewChangeHandler,
            runViewChangeHandlers,
            registerSaveProvider,
            resolveSaveAction,
            recordSaveHistory,
            getSaveHistory,
            getServerRuntimeConfig,
            hasServerAuthority,
            canUseServerWrite
        });

        window.KpiSectionRegistry.registerSections(AppData);
